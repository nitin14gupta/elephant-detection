import os
import numpy as np
import threading
from ultralytics import YOLO, YOLOWorld

# What each camera can be set to detect. "both" runs the rhino and human detectors.
DETECT_TYPES = ("rhino", "human", "both")

# label -> (weights file, class ids to keep, confidence threshold)
# Rhino has no COCO class, so it uses YOLO-World (open-vocabulary, prompt-based) locally.
# To switch to custom trained weights later, set model_path to your .pt and drop "world_classes".
# class_ids=None means "keep every class the model outputs".
DETECTOR_CONFIG = {
    # Rhino: runs fully locally with YOLO-World (open-vocabulary, prompt "rhinoceros"). No internet needed.
    # Open-vocab confidences are low, hence the low threshold. For better accuracy, train a rhino YOLO .pt
    # and replace this entry (drop "world_classes").
    "rhino": {"model_path": "models/yolov8x-worldv2.pt", "world_classes": ["rhinoceros"], "class_ids": None, "conf_thresh": 0.15},
    "human": {"model_path": "models/yolo11m.pt", "class_ids": [0], "conf_thresh": 0.7},  # COCO 0 = person
}


def labels_for(detect_type):
    """Detector labels a camera's detect_type needs."""
    if detect_type == "both":
        return ["rhino", "human"]
    return [detect_type if detect_type in DETECTOR_CONFIG else "rhino"]


class ObjectDetector:
    def __init__(self, label, model_path, class_ids=None, conf_thresh=0.7, world_classes=None):
        self.label = label
        if world_classes:
            self.model = YOLOWorld(model_path)
            self.model.set_classes(world_classes)
        else:
            self.model = YOLO(model_path)
        self.class_ids = set(class_ids) if class_ids is not None else None
        self.conf_thresh = conf_thresh
        self.lock = threading.Lock()

        # Warm-up the model (triggers fusion which is not thread-safe)
        print(f"🔥 Warming up {label} model for multi-thread safety...")
        dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)
        self.model(dummy_frame, verbose=False)
        print(f"✅ {label} model ready.")

    def detect(self, frame):
        """
        Returns a list of detections (cx, cy, x1, y1, x2, y2, confidence)
        """
        with self.lock:
            results = self.model(frame, verbose=False)
        detections = []
        for r in results[0].boxes:
            cls_id = int(r.cls[0])
            conf = float(r.conf[0])
            if (self.class_ids is None or cls_id in self.class_ids) and conf > self.conf_thresh:
                x1, y1, x2, y2 = map(int, r.xyxy[0])
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                detections.append((cx, cy, x1, y1, x2, y2, conf))
        return detections


def load_detectors():
    """Load every detector whose weights exist. Missing weights are skipped with a warning."""
    detectors = {}
    for label, cfg in DETECTOR_CONFIG.items():
        if not os.path.exists(cfg["model_path"]):
            print(f"⚠️ {label} detector disabled: {cfg['model_path']} not found")
            continue
        detectors[label] = ObjectDetector(label, **cfg)
    return detectors
