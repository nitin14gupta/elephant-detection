import os
import requests
import logging
import time
import threading
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TelegramService:
    """
    Service to send Telegram alerts to configured recipients.
    """
    
    BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
    # Parse comma-separated list of IDs from env
    RECIPIENTS = [int(x.strip()) for x in os.getenv("TELEGRAM_RECIPIENTS", "").split(",") if x.strip()]
    API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"

    @staticmethod
    def format_alert_message(camera_name: str, location: str, confidence: float) -> str:
        """
        Format the alert message with detection details.
        """
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        
        message = f"""
<b>🚨 ELEPHANT DETECTED 🚨</b>

<b>Confidence:</b> {confidence:.2f}%
<b>Timestamp:</b> {timestamp}

<b>Camera Details:</b>
━━━━━━━━━━━━━━━━━━━━━━━
<b>Name:</b> {camera_name}
<b>Zone:</b> {location}
<b>Status:</b> <code>CRITICAL ALERT</code>

━━━━━━━━━━━━━━━━━━━━━━━
Please check the live monitoring dashboard immediately!
"""
        return message.strip()

    @classmethod
    def send_alert_sync(cls, camera_name: str, location: str, confidence: float, image_path: Optional[str] = None):
        """
        Synchronous method to send alert (internal use).
        """
        if not cls.BOT_TOKEN or not cls.RECIPIENTS:
            logger.error("Telegram Bot Token or Recipients not configured properly.")
            return

        message = cls.format_alert_message(camera_name, location, confidence * 100)
        
        for chat_id in cls.RECIPIENTS:
            try:
                if image_path and os.path.exists(image_path):
                    with open(image_path, 'rb') as photo:
                        response = requests.post(
                            f"{cls.API_URL}/sendPhoto",
                            data={
                                'chat_id': chat_id,
                                'caption': message,
                                'parse_mode': 'HTML'
                            },
                            files={'photo': photo},
                            timeout=10
                        )
                else:
                    response = requests.post(
                        f"{cls.API_URL}/sendMessage",
                        json={
                            'chat_id': chat_id,
                            'text': message,
                            'parse_mode': 'HTML'
                        },
                        timeout=10
                    )
                
                if response.status_code == 200:
                    logger.info(f"✓ Alert sent to Telegram chat {chat_id}")
                else:
                    logger.error(f"✗ Failed to send Telegram alert to {chat_id}: {response.text}")
                    
            except Exception as e:
                logger.error(f"✗ Error sending Telegram alert to {chat_id}: {str(e)}")

    @classmethod
    def send_alert(cls, camera_name: str, location: str, confidence: float, image_path: Optional[str] = None):
        """
        Non-blocking asynchronous method to send alerts.
        """
        thread = threading.Thread(
            target=cls.send_alert_sync,
            args=(camera_name, location, confidence, image_path),
            daemon=True
        )
        thread.start()
        logger.info("Background thread started for Telegram alert processing.")
