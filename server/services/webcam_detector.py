import cv2
import numpy as np
import threading
import time
import os
from supabase import create_client, Client
from dotenv import load_dotenv

from services.telegram_service import TelegramService
from services.detector import ElephantDetector
from services.tracker import CentroidTracker
from services.logic_utils import compute_direction_from_histories

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

is_running = False

# Configuration for continuous monitoring
MIN_STAY_TIME = 5      # Seconds an elephant must stay visible to trigger alert
FPS_LIMIT = 5          # Target frames per second for processing

# Track active camera threads {cam_id: thread}
active_cam_threads = {}
cam_stop_events = {}

def process_camera_stream(detector, cam, stop_event):
    cam_id = cam["id"]
    cam_name = cam["name"]
    location = cam.get("location", "Unknown Sector")
    live_link = cam["live_link"]

    print(f"🎬 Starting continuous monitoring for Camera {cam_id} ({cam_name})...")
    
    # Recording management
    video_writer = None
    is_recording = False
    recording_file = ""
    recording_start_time = 0
    
    while not stop_event.is_set():
        cap = cv2.VideoCapture(live_link)
        if not cap.isOpened():
            print(f"⚠️ Failed to open stream for Camera {cam_id}: {live_link}. Retrying in 10s...")
            time.sleep(10)
            continue

        # Get frame dimensions for VideoWriter
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        if frame_width == 0: frame_width = 1280
        if frame_height == 0: frame_height = 720

        tracker = CentroidTracker()
        trajectories = {}
        entry_time = {}
        seen_ids = set()
        alert_triggered = False
        alert_db_id = None
        last_process_time = 0
        last_seen_time = time.time()
        
        while not stop_event.is_set():
            # Grab latest frame to clear buffer (crucial for real-time)
            ret = cap.grab()
            if not ret:
                print(f"📡 Stream connection lost for Camera {cam_id}. Reconnecting...")
                break

            now = time.time()
            # Only process at the target FPS
            if (now - last_process_time) < (1.0 / FPS_LIMIT):
                continue

            last_process_time = now
            ret, frame = cap.retrieve()
            if not ret or frame is None:
                continue

            # Detection and tracking
            detections = detector.detect(frame)
            tracked, new_ids = tracker.update(detections)

            # Recording Logic: Start recording if any elephant is detected
            if len(tracked) > 0:
                if not is_recording:
                    # Initialize recording
                    is_recording = True
                    recording_start_time = now
                    date_str = time.strftime("%d-%m-%Y")
                    recordings_dir = f"recordings/{date_str}"
                    os.makedirs(recordings_dir, exist_ok=True)
                    
                    filename = f"cam{cam_id}_{int(now)}.mp4"
                    recording_file = f"{recordings_dir}/{filename}"
                    
                    # Try avc1 (H.264) for browser support, fallback to mp4v if not available
                    fourcc = cv2.VideoWriter_fourcc(*'avc1')
                    video_writer = cv2.VideoWriter(recording_file, fourcc, FPS_LIMIT, (frame_width, frame_height))
                    
                    if not video_writer.isOpened():
                        print(f"⚠️ avc1 codec failed, falling back to mp4v...")
                        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                        video_writer = cv2.VideoWriter(recording_file, fourcc, FPS_LIMIT, (frame_width, frame_height))
                        
                    print(f"📹 Recording started: {recording_file}")

            # Write to video if recording
            if is_recording and video_writer:
                video_writer.write(frame)

            # Check if all elephants left (stop recording with a small buffer)
            if len(tracked) == 0 and is_recording:
                # Wait 2 seconds of emptiness before stopping to capture the exit
                if (now - last_seen_time) > 2.0:
                    video_writer.release()
                    
                    # Log recording in DB if an alert was triggered
                    if alert_triggered and alert_db_id:
                        duration = int(now - recording_start_time)
                        log_recording(alert_db_id, cam_id, recording_file, len(seen_ids), compute_direction_from_histories(trajectories), duration)
                    
                    video_writer = None
                    is_recording = False
                    print(f"💾 Recording saved: {recording_file}")
            
            if len(tracked) > 0:
                last_seen_time = now
                for nid in new_ids:
                    seen_ids.add(nid)
                    trajectories.setdefault(nid, [])
                    
                for obj_id, (cx, cy) in tracked.items():
                    trajectories.setdefault(obj_id, []).append((cx, cy))
                    
                    # Check stay time
                    if obj_id not in entry_time:
                        entry_time[obj_id] = now
                    elif not alert_triggered and (now - entry_time[obj_id]) > MIN_STAY_TIME:
                        avg_conf = tracker.confidence.get(obj_id, 0.8)
                        current_count = len(seen_ids)
                        current_dir = compute_direction_from_histories(trajectories)
                        print(f"🐘 ELEPHANT DETECTED on Camera {cam_id}! Count: {current_count}, Direction: {current_dir}")
                        alert_db_id = trigger_production_alert(cam_id, cam_name, location, avg_conf, current_count, current_dir)
                        alert_triggered = True

            # CPU Throttling
            time.sleep(1/FPS_LIMIT)

        if video_writer:
            video_writer.release()
            
            # Final attempt to log if interrupted
            if is_recording and alert_triggered and alert_db_id:
                 duration = int(time.time() - recording_start_time)
                 log_recording(alert_db_id, cam_id, recording_file, len(seen_ids), compute_direction_from_histories(trajectories), duration)
            
            video_writer = None
            is_recording = False
            
        cap.release()
        
        # Log encounter results
        if seen_ids:
            direction = compute_direction_from_histories(trajectories)
            log_encounter(cam_id, len(seen_ids), direction)

def trigger_production_alert(cam_id, cam_name, location, confidence, count, direction):
    try:
        # 1. Log Alert in DB
        alert_data = {
            "cam_id": cam_id,
            "type": "Elephant Detection",
            "severity": "CRITICAL",
            "is_active": True,
            "count": count,
            "direction": direction
        }
        res = supabase.table("alerts").insert(alert_data).execute()
        alert_id = res.data[0]['id'] if res.data else None
        
        # 2. Send Telegram Notification
        TelegramService.send_alert(cam_name, location, confidence)
        return alert_id
    except Exception as e:
        print(f"❌ Failed to trigger production alert for camera {cam_id}:", e)
        return None

def log_recording(alert_id, cam_id, file_path, count, direction, duration):
    try:
        recording_data = {
            "alert_id": alert_id,
            "cam_id": cam_id,
            "file_path": file_path,
            "file_name": os.path.basename(file_path),
            "count": count,
            "direction": direction,
            "duration_secs": duration
        }
        supabase.table("recordings").insert(recording_data).execute()
        print(f"✅ Recording indexed in database: {os.path.basename(file_path)}")
    except Exception as e:
        print(f"❌ Failed to log recording to DB:", e)

def log_encounter(cam_id, count, direction):
    try:
        encounter_data = {
            "cam_id": cam_id, 
            "count": count, 
            "direction": direction,
            "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        supabase.table("encounters").insert(encounter_data).execute()
    except Exception as e:
        print(f"❌ Failed to log encounter for camera {cam_id}:", e)

def detection_loop():
    global is_running
    is_running = True
    
    print("🚀 Initializing Production Parallel Detection Engine...")
    detector = ElephantDetector()
    
    # Check for camera updates every 10 seconds
    CHECK_INTERVAL = 10 

    while is_running:
        try:
            # Fetch currently active cameras from DB
            response = supabase.table("cameras").select("*").eq("is_active", True).execute()
            active_cameras = response.data
            active_ids = {c['id'] for c in active_cameras}
            
            # 1. Start threads for new cameras
            for cam in active_cameras:
                cam_id = cam['id']
                if cam_id not in active_cam_threads or not active_cam_threads[cam_id].is_alive():
                    stop_event = threading.Event()
                    thread = threading.Thread(
                        target=process_camera_stream, 
                        args=(detector, cam, stop_event),
                        daemon=True
                    )
                    thread.start()
                    active_cam_threads[cam_id] = thread
                    cam_stop_events[cam_id] = stop_event
                    print(f"✅ Spawned monitoring thread for Camera {cam_id}")

            # 2. Stop threads for deactivated cameras
            current_running_ids = list(active_cam_threads.keys())
            for rid in current_running_ids:
                if rid not in active_ids:
                    print(f"🛑 Stopping monitoring thread for Camera {rid} (Deactivated)")
                    cam_stop_events[rid].set()
                    active_cam_threads[rid].join(timeout=1)
                    del active_cam_threads[rid]
                    del cam_stop_events[rid]
                    
        except Exception as e:
            print("❌ Error in detection manager:", e)
            
        time.sleep(CHECK_INTERVAL)

    # Shutdown all threads on exit
    for eid in cam_stop_events:
        cam_stop_events[eid].set()

def start_webcam_detection():
    thread = threading.Thread(target=detection_loop, daemon=True)
    thread.start()
