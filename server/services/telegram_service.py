import os
import requests
import logging
import time
import threading
from typing import List, Optional, Dict
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TelegramService:
    """
    Production-grade Telegram Alert Service with retry logic and rich formatting.
    """
    
    BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
    RECIPIENTS = [int(x.strip()) for x in os.getenv("TELEGRAM_RECIPIENTS", "").split(",") if x.strip()]
    API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"
    
    MAX_RETRIES = 3
    RETRY_DELAY = 2  # Seconds

    @staticmethod
    def format_alert_message(camera_name: str, location: str, confidence: float, count: int, direction: str, gemini_verified=None, gemini_reason: str = None) -> str:
        """
        Format the alert message with detection details and professional styling.
        """
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

        if gemini_verified is True:
            gemini_line = "✅ CONFIRMED"
        elif gemini_verified is False:
            gemini_line = "⚠️ UNCONFIRMED (verify manually)"
        else:
            gemini_line = "⚠️ UNAVAILABLE (YOLO only)"

        reason_line = f"\n<b>Gemini Note:</b> {gemini_reason}" if gemini_reason else ""

        message = f"""
<b>🚨 ELEPHANT DETECTED 🚨</b>

<b>Detected:</b> {count} {'Elephant' if count == 1 else 'Elephants'}
<b>Movement:</b> {direction.upper()}
<b>Confidence:</b> {confidence:.2f}%
<b>Timestamp:</b> {timestamp}

<b>Camera Details:</b>
━━━━━━━━━━━━━━━━━━━━━━━
<b>Name:</b> {camera_name}
<b>Zone:</b> {location}
<b>Status:</b> <code>CRITICAL ALERT</code>

<b>Gemini Verification:</b> {gemini_line}{reason_line}
━━━━━━━━━━━━━━━━━━━━━━━
Check the dashboard for the full HD recording!
"""
        return message.strip()

    @classmethod
    def send_message_with_retry(cls, chat_id: int, message: str, image_path: Optional[str] = None, live_url: Optional[str] = None) -> bool:
        """
        Sends a message or photo to a specific chat with retry logic.
        """
        # Prepare Inline Keyboard if URL is provided and valid
        reply_markup = None
        if live_url and (live_url.startswith('http://') or live_url.startswith('https://')):
            reply_markup = {
                "inline_keyboard": [[
                    {"text": "📺 Open Live Feed", "url": live_url}
                ]]
            }

        for attempt in range(cls.MAX_RETRIES):
            try:
                if image_path and os.path.exists(image_path):
                    payload = {
                        'chat_id': chat_id,
                        'caption': message,
                        'parse_mode': 'HTML'
                    }
                    if reply_markup:
                        import json
                        payload['reply_markup'] = json.dumps(reply_markup)
                        
                    with open(image_path, 'rb') as photo:
                        response = requests.post(
                            f"{cls.API_URL}/sendPhoto",
                            data=payload,
                            files={'photo': photo},
                            timeout=10
                        )
                else:
                    payload = {
                        'chat_id': chat_id,
                        'text': message,
                        'parse_mode': 'HTML'
                    }
                    if reply_markup:
                        import json
                        payload['reply_markup'] = json.dumps(reply_markup)
                        
                    response = requests.post(f"{cls.API_URL}/sendMessage", json=payload, timeout=10)
                
                if response.status_code == 200:
                    logger.info(f"✓ Alert sent to Telegram chat {chat_id}")
                    return True
                else:
                    logger.error(f"✗ Failed (Attempt {attempt+1}/{cls.MAX_RETRIES}) for {chat_id}: {response.text}")
                    
            except Exception as e:
                logger.error(f"✗ Error (Attempt {attempt+1}/{cls.MAX_RETRIES}) for {chat_id}: {str(e)}")
            
            if attempt < cls.MAX_RETRIES - 1:
                time.sleep(cls.RETRY_DELAY)
        
        return False

    @classmethod
    def send_alert_sync(cls, camera_name: str, location: str, confidence: float, count: int, direction: str, cam_url: Optional[str] = None, image_path: Optional[str] = None, gemini_verified=None, gemini_reason: Optional[str] = None):
        """
        Synchronous method to iterate through recipients.
        """
        if not cls.BOT_TOKEN or not cls.RECIPIENTS:
            logger.error("Telegram Bot Token or Recipients not configured properly.")
            return

        message = cls.format_alert_message(camera_name, location, confidence * 100, count, direction, gemini_verified, gemini_reason)

        for chat_id in cls.RECIPIENTS:
            cls.send_message_with_retry(chat_id, message, image_path, cam_url)

    @classmethod
    def send_alert(cls, camera_name: str, location: str, confidence: float, count: int, direction: str, cam_url: Optional[str] = None, image_path: Optional[str] = None, gemini_verified=None, gemini_reason: Optional[str] = None):
        """
        Non-blocking asynchronous method to send alerts.
        """
        thread = threading.Thread(
            target=cls.send_alert_sync,
            args=(camera_name, location, confidence, count, direction, cam_url, image_path, gemini_verified, gemini_reason),
            daemon=True
        )
        thread.start()
        logger.info(f"Background alert thread started for {camera_name}")
