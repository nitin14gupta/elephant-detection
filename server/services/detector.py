import cv2
from ultralytics import YOLO
import os
import numpy as np
import threading

class ElephantDetector:
    def __init__(self, model_path="models/yolo11m.pt", conf_thresh=0.7):
        self.model = YOLO(model_path)
        self.conf_thresh = conf_thresh
        self.elephant_class_id = 20  # COCO dataset elephant class ID
        self.lock = threading.Lock()
        
        # Warm-up the model (triggers fusion which is not thread-safe)
        print("🔥 Warming up YOLO model for multi-thread safety...")
        dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)
        self.model(dummy_frame, verbose=False)
        print("✅ YOLO model fusion complete and ready.")

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
            if cls_id == self.elephant_class_id and conf > self.conf_thresh:
                x1, y1, x2, y2 = map(int, r.xyxy[0])
                cx, cy = (x1 + x2)//2, (y1 + y2)//2
                detections.append((cx, cy, x1, y1, x2, y2, conf))
        return detections
