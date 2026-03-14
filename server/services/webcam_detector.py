import cv2
import numpy as np
import threading
import time
import os
from tensorflow.keras.models import load_model
from supabase import create_client, Client
from dotenv import load_dotenv

from services.telegram_service import TelegramService

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

is_running = False

def process_camera_stream(model, class_names, cam):
    cam_id = cam["id"]
    cam_name = cam["name"]
    location = cam.get("location", "Unknown Sector")
    live_link = cam["live_link"]

    # Open the HLS stream
    cap = cv2.VideoCapture(live_link)
    
    if not cap.isOpened():
        print(f"⚠️ Failed to open stream for Camera {cam_id}: {live_link}")
        return

    # Grab exactly 1 frame for inference
    ret, image = cap.read()
    cap.release()

    if not ret or image is None:
        print(f"⚠️ Failed to read frame from Camera {cam_id}")
        return

    # Preprocessing
    image_resized = cv2.resize(image, (224, 224), interpolation=cv2.INTER_AREA)
    image_norm = (image_resized / 255.0).reshape(1, 224, 224, 3)

    # Inference
    prediction = model.predict(image_norm, verbose=0)
    index = np.argmax(prediction)
    class_name = class_names[index].strip()
    confidence_score = float(prediction[0][index])

    # Log to DB if it's an elephant and confidence is high
    if class_name == "0 ELEPHANT" and confidence_score > 0.8:
        print(f"🐘 ELEPHANT DETECTED on Camera {cam_id}! Confidence: {confidence_score:.2f}")
        try:
            # 1. Log Encounter
            encounter_data = {"cam_id": cam_id, "count": 1, "direction": "unknown"}
            supabase.table("encounters").insert(encounter_data).execute()
            
            # 2. Log Alert in DB
            alert_data = {
                "cam_id": cam_id,
                "type": "Elephant Detection",
                "severity": "CRITICAL",
                "is_active": True
            }
            supabase.table("alerts").insert(alert_data).execute()
            
            # 3. Send Telegram Notification
            TelegramService.send_alert(cam_name, location, confidence_score)
            
            print(f"✅ Successfully logged encounter, alert and triggered Telegram for Camera {cam_id}")
        except Exception as e:
            print(f"❌ Failed to process detection for camera {cam_id}:", e)
    else:
        print(f"Camera {cam_id} clear. (Saw: {class_name} | Conf: {confidence_score:.2f})")


def detection_loop():
    global is_running
    is_running = True
    
    print("Initializing Multi-Stream ML Model...")
    model_path = os.path.join("models", "keras_model.h5")
    labels_path = os.path.join("models", "labels.txt")
    
    if not os.path.exists(model_path) or not os.path.exists(labels_path):
        print(f"Error: Model files not found at {model_path} or {labels_path}")
        is_running = False
        return
        
    model = load_model(model_path, compile=False)
    
    with open(labels_path, "r") as f:
        class_names = f.readlines()
        
    print("Model loaded. Starting HLS stream rotation...")
    
    # Wait time between full surveillance sweeps
    SCAN_INTERVAL = 15

    while is_running:
        try:
            # Fetch currently active cameras from DB
            response = supabase.table("cameras").select("*").eq("is_active", True).execute()
            active_cameras = response.data
            
            if not active_cameras:
                print("No active cameras found. Waiting...")
            else:
                for cam in active_cameras:
                    if not is_running:
                        break
                    process_camera_stream(model, class_names, cam)
                    
        except Exception as e:
            print("Error in detection loop:", e)
            
        # Cooldown before the next full rotation
        time.sleep(SCAN_INTERVAL)

def start_webcam_detection():
    thread = threading.Thread(target=detection_loop, daemon=True)
    thread.start()
