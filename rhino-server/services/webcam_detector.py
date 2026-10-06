import cv2
import numpy as np
import threading
import time
import os
import subprocess
import uuid
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from services.whatsapp_service import WhatsAppService
from services.gemini_service import GeminiVerificationService
from services.detector import load_detectors, labels_for
from services.tracker import CentroidTracker
from services.logic_utils import compute_direction_from_histories

from db.config import SessionLocal
from db.models import Alert, Camera, Encounter, Recording

is_running = False

# Configuration for Batch Monitoring Approach
MIN_STAY_TIME = 5      # Seconds a rhino must stay visible to trigger alert
FPS_LIMIT = 5          # Target frames per second for processing
BATCH_SIZE = 2        # Number of cameras to process at the exact same time
BATCH_DURATION = 5    # Seconds to check a camera before moving to the next batch

# Track active camera threads {cam_id: thread}
active_cam_threads = {}
cam_stop_events = {}

def _camera_get(cam, field, default=None):
    if isinstance(cam, dict):
        return cam.get(field, default)
    return getattr(cam, field, default)

class _LabelState:
    """Per-label (rhino / human) tracking state for one camera session."""
    def __init__(self):
        self.tracker = CentroidTracker()
        self.trajectories = {}
        self.entry_time = {}
        self.seen_ids = set()
        self.alert_triggered = False
        self.alert_db_id = None
        self.alert_count = 0     # final count used for the alert (Gemini-corrected when available)


def process_camera_stream(detectors, cam, stop_event):
    cam_id = _camera_get(cam, "id")
    cam_name = _camera_get(cam, "name")
    location = _camera_get(cam, "location", "Unknown Sector") or "Unknown Sector"
    live_link = _camera_get(cam, "live_link")
    detect_type = _camera_get(cam, "detect_type", "rhino") or "rhino"

    # Only the detectors this camera is configured for (and whose weights are loaded)
    active_labels = [l for l in labels_for(detect_type) if l in detectors]
    if not active_labels:
        print(f"⚠️ Camera {cam_id} ({cam_name}) set to '{detect_type}' but no matching model is loaded. Skipping.")
        return
    states = {label: _LabelState() for label in active_labels}

    print(f"🎬 Starting batch monitoring for Camera {cam_id} ({cam_name}) [{detect_type}]...")

    # Recording management (one recording per session, shared by all labels)
    video_writer = None
    is_recording = False
    recording_file = ""
    recordings_dir = ""
    recording_start_time = 0
    start_time = time.time()

    cap = cv2.VideoCapture(live_link)
    if not cap.isOpened():
        print(f"⚠️ Failed to open stream for Camera {cam_id}: {live_link}. Skipping this batch.")
        return

    # Get frame dimensions for VideoWriter
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if frame_width == 0: frame_width = 1280
    if frame_height == 0: frame_height = 720

    last_process_time = 0
    last_seen_time = time.time()

    def log_session_recordings(duration):
        for st in states.values():
            if st.alert_triggered and st.alert_db_id:
                log_recording(st.alert_db_id, cam_id, recording_file, st.alert_count or len(st.seen_ids),
                              compute_direction_from_histories(st.trajectories), duration)

    while not stop_event.is_set():
        # Grab latest frame to clear buffer (crucial for real-time)
        ret = cap.grab()
        if not ret:
            print(f"📡 Stream connection lost for Camera {cam_id}. Skipping this batch.")
            break

        now = time.time()
        # Only process at the target FPS
        if (now - last_process_time) < (1.0 / FPS_LIMIT):
            continue

        last_process_time = now
        ret, frame = cap.retrieve()
        if not ret or frame is None:
            continue

        # Detection and tracking, per label
        tracked_by_label = {}
        new_ids_by_label = {}
        for label, st in states.items():
            detections = detectors[label].detect(frame)
            tracked_by_label[label], new_ids_by_label[label] = st.tracker.update(detections)
        any_tracked = any(len(t) > 0 for t in tracked_by_label.values())

        # Recording Logic: Start recording if anything is detected
        if any_tracked:
            if not is_recording:
                # Initialize recording
                is_recording = True
                recording_start_time = now
                session_id = str(uuid.uuid4())
                recordings_dir = f"recordings/{session_id}"
                os.makedirs(recordings_dir, exist_ok=True)

                filename = f"cam{cam_id}.mp4"
                recording_file = f"{recordings_dir}/{filename}"

                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                video_writer = cv2.VideoWriter(recording_file, fourcc, FPS_LIMIT, (frame_width, frame_height))

                print(f"📹 Recording started: {recording_file}")

        # Write to video if recording
        if is_recording and video_writer:
            video_writer.write(frame)

        # Check if everything left (stop recording with a small buffer)
        if not any_tracked and is_recording:
            # Wait 2 seconds of emptiness before stopping to capture the exit
            if (now - last_seen_time) > 2.0:
                video_writer.release()
                reencode_h264(recording_file)

                # Log recording in DB for every alert triggered in this session
                log_session_recordings(int(now - recording_start_time))

                video_writer = None
                is_recording = False
                print(f"💾 Recording saved: {recording_file}")

        if any_tracked:
            last_seen_time = now

        for label, st in states.items():
            tracked = tracked_by_label[label]
            if len(tracked) == 0:
                continue
            for nid in new_ids_by_label[label]:
                st.seen_ids.add(nid)
                st.trajectories.setdefault(nid, [])

            for obj_id, (cx, cy) in tracked.items():
                st.trajectories.setdefault(obj_id, []).append((cx, cy))

                # Check stay time
                if obj_id not in st.entry_time:
                    st.entry_time[obj_id] = now
                elif not st.alert_triggered and (now - st.entry_time[obj_id]) > MIN_STAY_TIME:
                    avg_conf = st.tracker.confidence.get(obj_id, 0.8)
                    current_count = len(st.seen_ids)
                    current_dir = compute_direction_from_histories(st.trajectories)
                    print(f"🎯 YOLO detected {label} on Camera {cam_id}! Count: {current_count}, Direction: {current_dir}")

                    # Capture a snapshot for Gemini verification and WhatsApp
                    snapshot_path = None
                    try:
                        snapshot_path = f"{recordings_dir}/snapshot_{label}.jpg"
                        cv2.imwrite(snapshot_path, frame)
                    except Exception as e:
                        print(f"⚠️ Failed to save snapshot: {e}")

                    # --- Gemini Vision Verification + Count ---
                    print(f"🔍 Sending frame to Gemini for verification (Camera {cam_id}, {label})...")
                    try:
                        gemini_result = GeminiVerificationService.verify(snapshot_path, label)
                    except Exception as gemini_ex:
                        print(f"⚠️ Gemini call raised unexpectedly: {gemini_ex} — alert will fire from YOLO")
                        gemini_result = {"verified": None, "count": None, "reason": f"Gemini error: {gemini_ex}", "raw_response": ""}
                    print(f"🔍 Gemini: {'CONFIRMED ✅' if gemini_result['verified'] else ('UNCONFIRMED ⚠️' if gemini_result['verified'] is False else 'UNAVAILABLE ⚠️')} — count={gemini_result.get('count')} — {gemini_result['reason']}")

                    # Use Gemini's count when available (more accurate than YOLO tracker IDs).
                    # Fall back to YOLO count if Gemini didn't return one or returned 0 while YOLO sees objects.
                    gemini_count = gemini_result.get("count")
                    if isinstance(gemini_count, int) and gemini_count > 0:
                        st.alert_count = gemini_count
                    else:
                        st.alert_count = current_count

                    # Always fire alert — Gemini result is advisory context only
                    st.alert_db_id = trigger_production_alert(
                        cam_id,
                        cam_name,
                        location,
                        avg_conf,
                        st.alert_count,
                        current_dir,
                        label=label,
                        cam_url=live_link,
                        image_path=snapshot_path,
                        gemini_verified=gemini_result["verified"],
                        gemini_reason=gemini_result["reason"],
                    )
                    st.alert_triggered = True

        # CPU Throttling
        time.sleep(1/FPS_LIMIT)

        # Batch timeout check: If nothing seen in this batch duration, rotate cameras
        if (time.time() - start_time) > BATCH_DURATION and not any_tracked and not is_recording:
            print(f"⏩ [CAM-{cam_id}] Nothing seen in {BATCH_DURATION}s → Rotating to next batch.")
            break

    if video_writer:
        video_writer.release()
        reencode_h264(recording_file)

        # Final attempt to log if interrupted
        if is_recording:
            log_session_recordings(int(time.time() - recording_start_time))

        video_writer = None
        is_recording = False

    cap.release()

    # Log encounter results per label — prefer Gemini-corrected count when an alert fired
    for st in states.values():
        if st.seen_ids:
            direction = compute_direction_from_histories(st.trajectories)
            log_encounter(cam_id, st.alert_count or len(st.seen_ids), direction)

def trigger_production_alert(cam_id, cam_name, location, confidence, count, direction, label="rhino", cam_url=None, image_path=None, gemini_verified=None, gemini_reason=None):
    alert_id = None
    db = SessionLocal()
    try:
        alert = Alert(
            cam_id=cam_id,
            type=f"{label.capitalize()} Detection",
            severity="CRITICAL",
            is_active=True,
            count=count,
            direction=direction,
            url=cam_url,
            gemini_verified=gemini_verified,
            gemini_reason=gemini_reason,
            snapshot_path=image_path,
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        alert_id = alert.id
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to trigger production alert for camera {cam_id}:", e)
    finally:
        db.close()

    try:
        WhatsAppService.send_alert(
            camera_name=cam_name,
            location=location,
            confidence=confidence,
            count=count,
            direction=direction,
            label=label,
            cam_url=cam_url,
            image_path=image_path,
            gemini_verified=gemini_verified,
            gemini_reason=gemini_reason,
        )
    except Exception as e:
        print(f"❌ Failed to send WhatsApp alert for camera {cam_id}:", e)

    return alert_id

def reencode_h264(src_path: str) -> str:
    """Re-encode mp4v recording to H.264 for browser playback. Returns final path."""
    try:
        tmp_path = src_path.replace(".mp4", "_h264.mp4")
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", src_path,
             "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
             "-movflags", "+faststart",
             tmp_path],
            capture_output=True, timeout=60
        )
        if result.returncode == 0 and os.path.exists(tmp_path):
            os.replace(tmp_path, src_path)   # overwrite original
        else:
            print(f"⚠️ ffmpeg re-encode failed: {result.stderr.decode()[-200:]}")
    except Exception as e:
        print(f"⚠️ H.264 re-encode error: {e}")
    return src_path

def log_recording(alert_id, cam_id, file_path, count, direction, duration):
    db = SessionLocal()
    try:
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else None
        recording = Recording(
            alert_id=alert_id,
            cam_id=cam_id,
            file_path=file_path,
            file_name=os.path.basename(file_path),
            file_size=file_size,
            count=count,
            direction=direction,
            duration_secs=duration,
        )
        db.add(recording)
        db.commit()
        print(f"✅ Recording indexed in database: {os.path.basename(file_path)}")
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to log recording to DB:", e)
    finally:
        db.close()

def log_encounter(cam_id, count, direction):
    db = SessionLocal()
    try:
        encounter = Encounter(
            cam_id=cam_id,
            count=count,
            direction=direction,
            timestamp=datetime.utcnow(),
        )
        db.add(encounter)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to log encounter for camera {cam_id}:", e)
    finally:
        db.close()

def detection_loop():
    global is_running
    is_running = True
    
    print("🚀 Initializing Production Parallel Detection Engine...")
    detectors = load_detectors()
    
    # Check for camera updates every 10 seconds
    CHECK_INTERVAL = 10 

    while is_running:
        db = SessionLocal()
        try:
            # Fetch currently active cameras from DB
            active_cameras = db.query(Camera).filter(Camera.is_active.is_(True)).all()
            active_ids = {c.id for c in active_cameras}
            
            # 1. Start threads for new cameras
            for cam in active_cameras:
                cam_id = cam.id
                if cam_id not in active_cam_threads or not active_cam_threads[cam_id].is_alive():
                    stop_event = threading.Event()
                    thread = threading.Thread(
                        target=process_camera_stream, 
                        args=(detectors, cam, stop_event),
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
        finally:
            db.close()
            
        time.sleep(CHECK_INTERVAL)

    # Shutdown all threads on exit
    for eid in cam_stop_events:
        cam_stop_events[eid].set()

def start_webcam_detection():
    thread = threading.Thread(target=detection_loop, daemon=True)
    thread.start()
