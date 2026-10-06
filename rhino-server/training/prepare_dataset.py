"""
Build the rhino YOLO dataset in training/data/merged from:
  * Roboflow Universe rhino datasets   (training/data/raw/*)
  * Open Images V7 rhinoceros boxes    (training/data/oi/*_rhino.csv, images fetched from the public S3 bucket)
  * negatives: Open Images other animals (cattle, elephant, deer, horse, dog, bear, hippo) and human night frames
    from video.mp4, saved with empty label files so the model learns "not a rhino"
Night/IR cameras: every training image also gets a grayscale + darkened + noisy copy.
Run:  training\\venv\\Scripts\\python.exe training\\prepare_dataset.py
"""
import csv
import glob
import os
import random
import shutil
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np

random.seed(0)
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
OI = os.path.join(DATA, "oi")
OUT = os.path.join(DATA, "merged")
OI_IMG = os.path.join(OI, "images")
os.makedirs(OI_IMG, exist_ok=True)

RHINO_MID = "/m/03d443"
NEG_CLASSES = ["Cattle", "Elephant", "Deer", "Horse", "Dog", "Bear", "Hippopotamus", "Antelope", "Sheep"]


def fetch(args):
    image_id, split = args
    dest = os.path.join(OI_IMG, f"{image_id}.jpg")
    if os.path.exists(dest):
        return dest
    for sp in (split, "train", "validation", "test"):
        try:
            urllib.request.urlretrieve(f"https://s3.amazonaws.com/open-images-dataset/{sp}/{image_id}.jpg", dest)
            return dest
        except Exception:
            continue
    return None


def read_rhino_boxes():
    boxes, split_of = {}, {}
    for name, split in (("train_rhino.csv", "train"), ("val_rhino.csv", "validation"), ("test_rhino.csv", "test")):
        with open(os.path.join(OI, name), newline="") as f:
            for r in csv.reader(f):
                image_id, xmin, xmax, ymin, ymax, depiction = r[0], float(r[4]), float(r[5]), float(r[6]), float(r[7]), r[11]
                if depiction == "1":        # drawings / cartoons
                    continue
                boxes.setdefault(image_id, []).append(((xmin + xmax) / 2, (ymin + ymax) / 2, xmax - xmin, ymax - ymin))
                split_of[image_id] = split
    return boxes, split_of


def read_negative_ids(limit=350):
    mids = {}
    with open(os.path.join(OI, "oidv7-class-descriptions-boxable.csv"), newline="") as f:
        for mid, name in csv.reader(f):
            if name in NEG_CLASSES:
                mids[mid] = name
    ids, rhino_ids = {}, set()
    for fname, split in (("validation-annotations-bbox.csv", "validation"), ("test-annotations-bbox.csv", "test")):
        with open(os.path.join(OI, fname), newline="") as f:
            for r in csv.reader(f):
                if r[2] == RHINO_MID:
                    rhino_ids.add(r[0])
                elif r[2] in mids and r[0] not in ids:
                    ids[r[0]] = split
    items = [(i, s) for i, s in ids.items() if i not in rhino_ids]
    random.shuffle(items)
    return items[:limit]


def night_variants(img):
    """grayscale / dark / noisy copy that mimics IR night cameras."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.convertScaleAbs(gray, alpha=random.uniform(0.5, 0.9), beta=random.uniform(-25, 10))
    noise = np.random.normal(0, random.uniform(4, 12), gray.shape)
    gray = np.clip(gray.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)


def main():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    for sp in ("train", "val"):
        os.makedirs(os.path.join(OUT, "images", sp))
        os.makedirs(os.path.join(OUT, "labels", sp))

    items = []   # (image_path, [yolo boxes], is_negative)

    # Roboflow datasets
    for d in glob.glob(os.path.join(DATA, "raw", "*")):
        for sp in ("train", "valid", "test"):
            for img in glob.glob(os.path.join(d, sp, "images", "*")):
                lbl = os.path.join(d, sp, "labels", os.path.splitext(os.path.basename(img))[0] + ".txt")
                boxes = []
                if os.path.exists(lbl):
                    for line in open(lbl):
                        p = line.split()
                        if len(p) == 5:
                            boxes.append(tuple(map(float, p[1:])))
                        elif len(p) > 5:         # polygon -> bbox
                            xs, ys = list(map(float, p[1::2])), list(map(float, p[2::2]))
                            boxes.append(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, max(xs) - min(xs), max(ys) - min(ys)))
                if boxes:
                    items.append((img, boxes, False))
    n_rf = len(items)

    # Open Images rhinos
    oi_boxes, oi_split = read_rhino_boxes()
    with ThreadPoolExecutor(16) as ex:
        paths = list(ex.map(fetch, [(i, oi_split[i]) for i in oi_boxes]))
    for (image_id, boxes), path in zip(oi_boxes.items(), paths):
        if path:
            items.append((path, boxes, False))
    n_oi = len(items) - n_rf

    # negatives
    neg = read_negative_ids()
    with ThreadPoolExecutor(16) as ex:
        neg_paths = list(ex.map(fetch, neg))
    n_neg0 = len(items)
    for p in neg_paths:
        if p:
            items.append((p, [], True))
    vid = os.path.join(HERE, "..", "video.mp4")      # humans at night = hard negatives
    if os.path.exists(vid):
        cap, i = cv2.VideoCapture(vid), 0
        while True:
            ok, f = cap.read()
            if not ok:
                break
            if i % 20 == 0:
                p = os.path.join(DATA, f"human_neg_{i}.jpg")
                cv2.imwrite(p, f)
                items.append((p, [], True))
            i += 1
    n_neg = len(items) - n_neg0

    random.shuffle(items)
    n_val = int(len(items) * 0.12)
    written = {"train": 0, "val": 0}
    for idx, (path, boxes, _) in enumerate(items):
        sp = "val" if idx < n_val else "train"
        img = cv2.imread(path)
        if img is None:
            continue
        variants = [("", img)]
        if sp == "train":
            variants.append(("_night", night_variants(img)))
            if random.random() < 0.5:
                variants.append(("_night2", night_variants(img)))
        for suffix, im in variants:
            name = f"{idx:05d}{suffix}"
            cv2.imwrite(os.path.join(OUT, "images", sp, name + ".jpg"), im)
            with open(os.path.join(OUT, "labels", sp, name + ".txt"), "w") as f:
                for cx, cy, w, h in boxes:
                    f.write(f"0 {min(max(cx,0),1):.6f} {min(max(cy,0),1):.6f} {min(max(w,0),1):.6f} {min(max(h,0),1):.6f}\n")
            written[sp] += 1

    with open(os.path.join(OUT, "data.yaml"), "w") as f:
        f.write(f"path: {OUT.replace(os.sep, '/')}\ntrain: images/train\nval: images/val\nnames:\n  0: rhino\n")
    print(f"sources: roboflow={n_rf}  open-images rhinos={n_oi}  negatives={n_neg}")
    print(f"written: train={written['train']}  val={written['val']}  -> {OUT}")


if __name__ == "__main__":
    main()
