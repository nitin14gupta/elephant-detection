import cv2
import time
import os
import sys
import threading
import warnings

# ── Suppress NNPACK / C++ hardware warnings before torch is imported ──────────
os.environ["NNPACK_LOG_LEVEL"] = "0"
os.environ["TORCH_CPP_LOG_LEVEL"] = "ERROR"
warnings.filterwarnings("ignore")

# Filter NNPACK lines that come through Python's stderr
class _NNPACKFilter:
    def __init__(self, stream):
        self._s = stream
    def write(self, msg):
        if "NNPACK" not in msg and "Unsupported hardware" not in msg:
            self._s.write(msg)
    def flush(self):        self._s.flush()
    def fileno(self):       return self._s.fileno()

sys.stderr = _NNPACKFilter(sys.stderr)
# ─────────────────────────────────────────────────────────────────────────────

# ── Local DB (bind-mounted into Docker at /app/data) ─────────────────────────
# docker-compose mounts ./server/data:/app/data, so this file is shared between
# the running container and any local scripts — all writes go to the same place.
_db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "elephant.db")
os.makedirs(os.path.dirname(_db_path), exist_ok=True)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_db_path}")

from services.detector import ElephantDetector
from services.gemini_service import GeminiVerificationService
from services.webcam_detector import process_camera_stream
from db.config import SessionLocal, init_db
from db.models import Alert, Encounter, Recording


# ─────────────────────────────────────────────
# STEP 1: YOLO Detection (unit test)
# ─────────────────────────────────────────────
def test_yolo_detection(detector, frame):
    print("\n[STEP 1] Testing YOLO detection...")
    detections = detector.detect(frame)
    if detections:
        print(f"  ✅ YOLO detected {len(detections)} object(s)")
        for d in detections:
            print(f"     center=({d[0]:.0f},{d[1]:.0f}) conf={d[6]:.2f}")
    else:
        print("  ⚠️  YOLO found no detections in sample frame")
    return detections


# ─────────────────────────────────────────────
# STEP 2: Gemini Vision Verification (unit test)
# ─────────────────────────────────────────────
def test_gemini_verification(snapshot_path: str):
    print("\n[STEP 2] Testing Gemini Vision verification...")
    if not os.path.exists(snapshot_path):
        print(f"  ⚠️  Snapshot not found at {snapshot_path} — skipping Gemini unit test")
        return

    result = GeminiVerificationService.verify_elephant(snapshot_path)
    status = "✅ CONFIRMED" if result["verified"] else "🚫 REJECTED"
    print(f"  {status}")
    print(f"  Reason : {result['reason']}")
    print(f"  Raw    : {result['raw_response'][:120]}")
    return result


# ─────────────────────────────────────────────
# STEP 3: Full pipeline (integration test)
# ─────────────────────────────────────────────
def test_full_pipeline():
    print("\n[STEP 3] Running full pipeline integration test (YOLO → Gemini → Alert → Telegram)...")

    detector = ElephantDetector()

    test_cams = [
        {
            "id": 35,
            "name": "Nayek Kata",
            "location": "Nayek Kata",
            "live_link": "video/elephant1.webm",   # ← replace with actual stream URL
        }
    ]

    threads = []
    stop_events = {}

    for cam in test_cams:
        stop_event = threading.Event()
        stop_events[cam["id"]] = stop_event
        t = threading.Thread(target=process_camera_stream, args=(detector, cam, stop_event))
        t.start()
        threads.append(t)
        print(f"  ▶ Spawned thread for {cam['name']} → {cam['live_link']}")
        time.sleep(2)

    print("  ⏳ Running pipeline for 80 seconds...")
    try:
        time.sleep(80)
    except KeyboardInterrupt:
        pass

    print("  🛑 Stopping threads...")
    for eid in stop_events:
        stop_events[eid].set()
    for t in threads:
        t.join(timeout=2)


# ─────────────────────────────────────────────
# STEP 4: DB verification
# ─────────────────────────────────────────────
def test_db_results():
    print("\n[STEP 4] Checking database for results...")
    db = SessionLocal()
    try:
        alerts = db.query(Alert).order_by(Alert.id.desc()).limit(5).all()
        encounters = db.query(Encounter).order_by(Encounter.id.desc()).limit(5).all()
        recordings = db.query(Recording).order_by(Recording.id.desc()).limit(5).all()

        print(f"  📋 Latest Alerts     : {len(alerts)}")
        for a in alerts:
            print(f"     id={a.id} cam={a.cam_id} count={a.count} dir={a.direction} severity={a.severity}")

        print(f"  📋 Latest Encounters : {len(encounters)}")
        for e in encounters:
            print(f"     id={e.id} cam={e.cam_id} count={e.count} dir={e.direction}")

        print(f"  📋 Latest Recordings : {len(recordings)}")
        for r in recordings:
            print(f"     id={r.id} file={r.file_name} dur={r.duration_secs}s size={r.file_size}")
    finally:
        db.close()


# ─────────────────────────────────────────────
# STEP 5: Snapshot / recording files
# ─────────────────────────────────────────────
def test_file_outputs():
    print("\n[STEP 5] Checking recording files on disk...")
    date_str = time.strftime("%d-%m-%Y")

    rec_path = f"recordings/{date_str}"
    if os.path.exists(rec_path):
        files = os.listdir(rec_path)
        print(f"  📁 recordings/{date_str}/ → {len(files)} file(s)")
        for f in files:
            fp = os.path.join(rec_path, f)
            size = os.path.getsize(fp)
            print(f"     {f}  ({size} bytes)")
    else:
        print(f"  ⚠️  No recordings folder for today: {rec_path}")

    snap_path = f"recordings/snapshots/{date_str}"
    if os.path.exists(snap_path):
        snaps = os.listdir(snap_path)
        print(f"  📸 snapshots/{date_str}/ → {len(snaps)} snapshot(s)")
        for s in snaps:
            fp = os.path.join(snap_path, s)
            size = os.path.getsize(fp)
            print(f"     {s}  ({size} bytes)")
    else:
        print(f"  ⚠️  No snapshots folder for today: {snap_path}")


# ─────────────────────────────────────────────
# Main runner
# ─────────────────────────────────────────────
def run_test():
    print("=" * 60)
    print("🚀 E2E TEST: YOLO → Gemini Verification → Alert → DB")
    print("=" * 60)

    # Ensure DB tables exist for this run
    init_db()
    print(f"  DB: {os.environ['DATABASE_URL']}")

    # Unit test: YOLO on a sample frame
    sample_video = "video/elephant1.webm"
    detector = ElephantDetector()
    sample_frame = None

    if os.path.exists(sample_video):
        cap = cv2.VideoCapture(sample_video)
        ret, sample_frame = cap.read()
        cap.release()
        if ret and sample_frame is not None:
            detections = test_yolo_detection(detector, sample_frame)

            # Save a snapshot for Gemini unit test
            os.makedirs("recordings/snapshots/test", exist_ok=True)
            test_snapshot = "recordings/snapshots/test/unit_test_frame.jpg"
            cv2.imwrite(test_snapshot, sample_frame)
            test_gemini_verification(test_snapshot)
        else:
            print("[STEP 1+2] ⚠️  Could not read a frame from sample video — skipping unit tests")
    else:
        print(f"[STEP 1+2] ⚠️  Sample video not found at '{sample_video}' — skipping unit tests")

    # Full pipeline integration test
    test_full_pipeline()

    # DB + file checks
    test_db_results()
    test_file_outputs()

    print("\n" + "=" * 60)
    print("✅ E2E test complete.")
    print("   Check alerts/encounters/recordings tables and the")
    print("   recordings/ folder to verify end-to-end flow.")
    print("=" * 60)


if __name__ == "__main__":
    run_test()
