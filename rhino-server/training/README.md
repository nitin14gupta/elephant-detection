# Rhino model training

`models/rhino.pt` was trained here (YOLO11s, 40 epochs, 1,206 images + night/IR copies; val mAP50 0.95 on rhino photos).

Retrain (e.g. after adding real camera footage):
1. `python -m venv venv` and install `torch==2.5.1 torchvision==0.20.1` (CUDA 12.1 index), `ultralytics`, `roboflow`, `opencv-python`.
2. Put Roboflow YOLOv8 exports in `data/raw/<name>/` and Open Images rhino rows in `data/oi/` (see the header of `prepare_dataset.py`).
   For real footage: extract frames, label them (one class `rhino`), drop them in `data/raw/<name>/train/{images,labels}`.
3. `venv\Scripts\python.exe prepare_dataset.py`
4. `YOLO('yolo11s.pt').train(data='data/merged/data.yaml', epochs=40, imgsz=640, batch=16, device=0)`
5. Copy `weights/best.pt` to `../models/rhino.pt`.

`data/`, `runs/` and `venv/` are git-ignored.
