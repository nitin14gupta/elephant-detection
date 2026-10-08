r"""
Send ONE test WhatsApp alert, no camera or model needed.

  venv\Scripts\python.exe test_whatsapp.py 919876543210            # text template
  venv\Scripts\python.exe test_whatsapp.py 919876543210 --image test_output_clips\x.jpg   # media template (needs PUBLIC_BASE_URL reachable)

Number = recipient with country code (the number must be able to receive WhatsApp; it cannot be the sender number).
"""
import argparse
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from services.whatsapp_service import WhatsAppService as W, _ca_bundle

ap = argparse.ArgumentParser()
ap.add_argument("numbers", nargs="+")
ap.add_argument("--label", default="rhino", choices=["rhino", "human"])
ap.add_argument("--image", default=None)
a = ap.parse_args()

payloads = W.build_payloads(a.numbers, a.label, "Test Camera 19", "Jualvanga", 2, "left", True,
                            "Two animals walking on the road (test alert)", a.image)
if not payloads:
    raise SystemExit("No template id set (WHATSAPP_WID_MEDIA / WHATSAPP_WID_TEXT in .env)")
print("template type:", payloads[0]["type"], "wid:", payloads[0]["wid"])
import requests
for p in payloads:
    r = requests.post(W.API_URL, json=p, headers={"Authorization": f"Basic {os.getenv('WHATSAPP_AUTHKEY')}", "Content-Type": "application/json"}, timeout=20, verify=_ca_bundle())
    print(p["mobile"], r.status_code, r.text[:400])
