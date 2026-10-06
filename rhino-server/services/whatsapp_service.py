import os
import logging
import threading
import time
from typing import List, Optional

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class WhatsAppService:
    """
    WhatsApp alerts through the panel.aditeksys.com REST API (template messages).

    Env vars:
      WHATSAPP_AUTHKEY          authkey from the panel (My Account > Profile)
      WHATSAPP_WID_MEDIA        approved template id with an IMAGE header (used when a public snapshot URL exists)
      WHATSAPP_WID_TEXT         approved text-only template id (fallback when there is no snapshot URL)
      WHATSAPP_RECIPIENTS       comma separated numbers incl. country code, e.g. 919876543210,919123456780
      WHATSAPP_COUNTRY_CODE     default "91" (used when a recipient is given without country code)
      PUBLIC_BASE_URL           public URL of this server, e.g. https://rhino.example.com
                                (WhatsApp fetches the snapshot from it: /recordings/<id>/snapshot_x.jpg)

    Both templates take the same 7 body variables:
      {{1}} label (RHINO / HUMAN)   {{2}} count   {{3}} movement   {{4}} camera name
      {{5}} zone                    {{6}} time    {{7}} Gemini verification
    """

    API_URL = "https://panel.aditeksys.com/restapi/requestjson.php"
    MAX_RETRIES = 3
    RETRY_DELAY = 2  # seconds

    @staticmethod
    def _recipients() -> List[str]:
        return [x.strip() for x in os.getenv("WHATSAPP_RECIPIENTS", "").split(",") if x.strip()]

    @classmethod
    def _split_number(cls, number: str):
        digits = "".join(ch for ch in number if ch.isdigit())
        default_cc = os.getenv("WHATSAPP_COUNTRY_CODE", "91")
        if len(digits) > 10:                       # already has country code
            return digits[:-10], digits[-10:]
        return default_cc, digits

    @staticmethod
    def _gemini_text(gemini_verified, gemini_reason) -> str:
        if gemini_verified is True:
            text = "CONFIRMED"
        elif gemini_verified is False:
            text = "UNCONFIRMED (verify manually)"
        else:
            text = "UNAVAILABLE (YOLO only)"
        if gemini_reason:
            text += f" - {gemini_reason}"
        return " ".join(text.split())              # WhatsApp variables cannot contain newlines

    @classmethod
    def snapshot_url(cls, image_path: Optional[str]) -> Optional[str]:
        base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
        if not base or not image_path or not os.path.exists(image_path):
            return None
        return f"{base}/{image_path.replace(os.sep, '/').lstrip('/')}"

    @classmethod
    def build_payloads(cls, recipients, label, camera_name, location, count, direction,
                       gemini_verified=None, gemini_reason=None, image_path=None):
        """Returns a list of JSON bodies (one per country code) for the requestjson.php API."""
        body_values = {
            "1": label.upper(),
            "2": f"{count} {label.capitalize() if count == 1 else label.capitalize() + 's'}",
            "3": (direction or "unknown").upper(),
            "4": camera_name or "-",
            "5": location or "-",
            "6": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
            "7": cls._gemini_text(gemini_verified, gemini_reason),
        }
        img_url = cls.snapshot_url(image_path)
        wid_media = os.getenv("WHATSAPP_WID_MEDIA")
        wid_text = os.getenv("WHATSAPP_WID_TEXT")
        use_media = bool(img_url and wid_media)
        wid = wid_media if use_media else wid_text
        if not wid:
            return []

        by_cc = {}
        for number in recipients:
            cc, mobile = cls._split_number(number)
            entry = {"mobile": mobile, "bodyValues": body_values}
            if use_media:
                entry["headerValues"] = {"headerData": img_url}
            by_cc.setdefault(cc, []).append(entry)

        return [
            {"version": "2.0", "country_code": cc, "wid": wid,
             "type": "media" if use_media else "text", "data": entries}
            for cc, entries in by_cc.items()
        ]

    @classmethod
    def _post_with_retry(cls, payload: dict) -> bool:
        headers = {"Authorization": f"Basic {os.getenv('WHATSAPP_AUTHKEY')}", "Content-Type": "application/json"}
        for attempt in range(cls.MAX_RETRIES):
            try:
                response = requests.post(cls.API_URL, json=payload, headers=headers, timeout=15)
                if response.status_code == 200:
                    logger.info(f"WhatsApp API response: {response.text[:300]}")
                    return True
                logger.error(f"WhatsApp send failed (attempt {attempt + 1}/{cls.MAX_RETRIES}): {response.status_code} {response.text[:300]}")
            except Exception as e:
                logger.error(f"WhatsApp send error (attempt {attempt + 1}/{cls.MAX_RETRIES}): {e}")
            if attempt < cls.MAX_RETRIES - 1:
                time.sleep(cls.RETRY_DELAY)
        return False

    @classmethod
    def send_alert_sync(cls, camera_name, location, confidence, count, direction, cam_url=None,
                        image_path=None, gemini_verified=None, gemini_reason=None, label="rhino"):
        recipients = cls._recipients()
        if not os.getenv("WHATSAPP_AUTHKEY") or not recipients:
            logger.error("WhatsApp authkey or recipients not configured.")
            return False
        payloads = cls.build_payloads(recipients, label, camera_name, location, count, direction,
                                      gemini_verified, gemini_reason, image_path)
        if not payloads:
            logger.error("WhatsApp template id (WHATSAPP_WID_MEDIA / WHATSAPP_WID_TEXT) not configured.")
            return False
        return all([cls._post_with_retry(p) for p in payloads])

    @classmethod
    def send_alert(cls, camera_name, location, confidence, count, direction, cam_url=None,
                   image_path=None, gemini_verified=None, gemini_reason=None, label="rhino"):
        """Non-blocking: sends in a background thread (same signature the detector used for Telegram)."""
        thread = threading.Thread(
            target=cls.send_alert_sync,
            args=(camera_name, location, confidence, count, direction, cam_url, image_path,
                  gemini_verified, gemini_reason, label),
            daemon=True,
        )
        thread.start()
        logger.info(f"Background WhatsApp alert thread started for {camera_name}")
