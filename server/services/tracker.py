import math

class CentroidTracker:
    def __init__(self, max_disappeared=50, distance_threshold=100):
        self.next_id = 0
        self.objects = {}  # id -> (cx, cy)
        self.bboxes = {}   # id -> (x1, y1, x2, y2)
        self.confidence = {}  # id -> confidence_score
        self.disappeared = {}  # id -> frames disappeared
        self.max_disappeared = max_disappeared
        self.distance_threshold = distance_threshold

    def update(self, detections):
        """
        detections: list of tuples (cx, cy, x1, y1, x2, y2, conf)
        returns: (objects_dict, newly_created_ids)
        """
        new_objects = {}
        newly_created_ids = []

        if len(detections) == 0:
            for obj_id in list(self.objects.keys()):
                self.disappeared[obj_id] += 1
                if self.disappeared[obj_id] <= self.max_disappeared:
                    new_objects[obj_id] = self.objects[obj_id]
                else:
                    self.disappeared.pop(obj_id, None)
                    self.bboxes.pop(obj_id, None)
                    self.confidence.pop(obj_id, None)
            self.objects = new_objects
            return self.objects, newly_created_ids

        det_centers = [(d[0], d[1]) for d in detections]
        det_bboxes = [(d[2], d[3], d[4], d[5]) for d in detections]
        det_confs = [d[6] for d in detections]

        if len(self.objects) == 0:
            for i, (cx, cy) in enumerate(det_centers):
                tid = self.next_id
                self.objects[tid] = (cx, cy)
                self.bboxes[tid] = det_bboxes[i]
                self.confidence[tid] = det_confs[i]
                self.disappeared[tid] = 0
                newly_created_ids.append(tid)
                self.next_id += 1
            return self.objects, newly_created_ids

        distances = []
        for obj_id, (ox, oy) in self.objects.items():
            for det_idx, (dx, dy) in enumerate(det_centers):
                dist = math.sqrt((ox - dx)**2 + (oy - dy)**2)
                distances.append((dist, obj_id, det_idx))

        distances.sort(key=lambda x: x[0])

        assigned_objs = set()
        assigned_dets = set()

        for dist, obj_id, det_idx in distances:
            if obj_id in assigned_objs or det_idx in assigned_dets:
                continue
            if dist > self.distance_threshold:
                continue

            assigned_objs.add(obj_id)
            assigned_dets.add(det_idx)
            new_objects[obj_id] = det_centers[det_idx]
            self.bboxes[obj_id] = det_bboxes[det_idx]
            self.confidence[obj_id] = det_confs[det_idx]
            self.disappeared[obj_id] = 0

        for obj_id in list(self.objects.keys()):
            if obj_id not in new_objects:
                self.disappeared[obj_id] += 1
                if self.disappeared[obj_id] <= self.max_disappeared:
                    new_objects[obj_id] = self.objects[obj_id]
                else:
                    self.disappeared.pop(obj_id, None)
                    self.bboxes.pop(obj_id, None)
                    self.confidence.pop(obj_id, None)

        for det_idx, (cx, cy) in enumerate(det_centers):
            if det_idx not in assigned_dets:
                tid = self.next_id
                new_objects[tid] = (cx, cy)
                self.bboxes[tid] = det_bboxes[det_idx]
                self.confidence[tid] = det_confs[det_idx]
                self.disappeared[tid] = 0
                newly_created_ids.append(tid)
                self.next_id += 1

        self.objects = new_objects
        return self.objects, newly_created_ids
