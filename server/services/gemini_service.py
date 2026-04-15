import os
import base64
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

try:
    from google import genai
    from google.genai import types
    _genai_available = True
except ImportError:
    _genai_available = False
    logger.warning("google-genai not installed. Gemini verification disabled.")


class GeminiVerificationService:
    """
    Uses Gemini Vision to verify whether a detected object is truly an elephant.
    Acts as a second-opinion advisory layer after YOLO detection.
    """

    MODEL_NAME = "gemini-2.5-flash-lite"
    PROMPT = (
        "You are a wildlife monitoring AI. Analyze this camera image carefully.\n"
        "Is there an elephant visible in this image?\n"
        "Respond in exactly this format:\n"
        "VERIFIED: YES or NO\n"
        "REASON: one brief sentence\n"
    )

    _client = None

    @classmethod
    def _get_client(cls):
        if cls._client is None:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY not set in environment")
            cls._client = genai.Client(api_key=api_key)
        return cls._client

    @classmethod
    def verify_elephant(cls, image_path: str) -> dict:
        """
        Send a snapshot to Gemini Vision and verify if an elephant is present.

        Returns:
            {
                "verified": bool | None,   # None = skipped/unavailable
                "reason": str,
                "raw_response": str
            }
        """
        if not _genai_available:
            logger.warning("Gemini unavailable — skipping verification")
            return {"verified": None, "reason": "Gemini library not installed", "raw_response": ""}

        if not image_path or not os.path.exists(image_path):
            logger.warning(f"Snapshot not found at {image_path} — skipping verification")
            return {"verified": None, "reason": "No snapshot available", "raw_response": ""}

        try:
            client = cls._get_client()

            with open(image_path, "rb") as f:
                image_bytes = f.read()

            response = client.models.generate_content(
                model=cls.MODEL_NAME,
                contents=[
                    cls.PROMPT,
                    types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                ],
            )

            raw = response.text.strip()
            logger.info(f"Gemini response: {raw}")

            verified = "VERIFIED: YES" in raw.upper()
            reason_line = next(
                (line for line in raw.splitlines() if line.upper().startswith("REASON:")),
                "REASON: No reason provided",
            )
            reason = reason_line.split(":", 1)[-1].strip()

            return {"verified": verified, "reason": reason, "raw_response": raw}

        except Exception as e:
            logger.error(f"Gemini verification failed: {e}")
            return {"verified": None, "reason": f"Gemini error: {e}", "raw_response": ""}
