from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
from utils.auth_utils import get_current_user
from db.config import get_db
from db.models import Camera, Encounter, Alert, Recording
from sqlalchemy.orm import Session

router = APIRouter(tags=["cameras"])


class CameraUpdate(BaseModel):
    is_active: bool


class CameraCreate(BaseModel):
    name: str
    location: Optional[str] = None
    live_link: str
    lat: Optional[float] = None
    long: Optional[float] = None


class Detection(BaseModel):
    cam_id: int
    count: int
    direction: Optional[str] = "unknown"


@router.get("/api/stats")
async def get_stats(current_user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    total_detections = db.query(Encounter).count()
    cameras = db.query(Camera).all()
    active_count = sum(1 for c in cameras if c.is_active)

    return {
        "total_detections": total_detections,
        "active_cameras": active_count,
        "inactive_cameras": len(cameras) - active_count,
        "total_cameras": len(cameras),
        "system_health": "Optimal"
    }


@router.get("/api/cameras")
async def get_cameras(current_user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    cameras = db.query(Camera).order_by(Camera.id).all()
    return [
        {
            "id": c.id, "name": c.name, "location": c.location,
            "lat": c.lat, "long": c.long, "live_link": c.live_link,
            "is_active": c.is_active, "last_active_at": c.last_active_at,
            "last_inactive_at": c.last_inactive_at, "created_at": c.created_at
        }
        for c in cameras
    ]


@router.post("/api/cameras", status_code=status.HTTP_201_CREATED)
async def create_camera(camera: CameraCreate, current_user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        new_cam = Camera(**camera.dict())
        db.add(new_cam)
        db.commit()
        db.refresh(new_cam)
        return {"id": new_cam.id, "name": new_cam.name, "location": new_cam.location,
                "live_link": new_cam.live_link, "is_active": new_cam.is_active}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/cameras/{cam_id}")
async def update_camera(cam_id: int, update: CameraUpdate, current_user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    cam = db.query(Camera).filter(Camera.id == cam_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    cam.is_active = update.is_active
    now = datetime.utcnow()
    if update.is_active:
        cam.last_active_at = now
    else:
        cam.last_inactive_at = now

    db.commit()
    db.refresh(cam)
    return {"id": cam.id, "is_active": cam.is_active}


@router.post("/api/detect")
async def log_detection(detection: Detection, db: Session = Depends(get_db)):
    enc = Encounter(cam_id=detection.cam_id, count=detection.count, direction=detection.direction)
    db.add(enc)
    db.commit()
    return {"status": "success"}


@router.get("/api/alerts")
async def get_alerts(current_user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        alerts = db.query(Alert).order_by(Alert.timestamp.desc()).all()
        result = []
        for a in alerts:
            cam = db.query(Camera).filter(Camera.id == a.cam_id).first()
            result.append({
                "id": a.id, "cam_id": a.cam_id, "type": a.type,
                "severity": a.severity, "is_active": a.is_active,
                "count": a.count, "direction": a.direction,
                "url": a.url, "snapshot_path": a.snapshot_path,
                "gemini_verified": a.gemini_verified, "gemini_reason": a.gemini_reason,
                "timestamp": a.timestamp.isoformat() + "Z" if a.timestamp else None,
                "cameras": {"name": cam.name, "location": cam.location} if cam else None
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/analytics")
async def get_analytics(range: str = "week", current_user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        now = datetime.now(timezone.utc)
        query = db.query(Encounter)

        if range == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            query = query.filter(Encounter.timestamp >= start_date.replace(tzinfo=None))
        elif range == "week":
            query = query.filter(Encounter.timestamp >= (now - timedelta(days=7)).replace(tzinfo=None))
        elif range == "month":
            query = query.filter(Encounter.timestamp >= (now - timedelta(days=30)).replace(tzinfo=None))

        encounters = query.all()
        cameras = {c.id: c.name for c in db.query(Camera).all()}

        ist_offset = timedelta(hours=5, minutes=30)
        hourly_data = [0] * 24
        cam_counts = {}
        daily_counts = {}

        for e in encounters:
            ts = e.timestamp if e.timestamp else datetime.utcnow()
            ist_ts = ts + ist_offset
            hourly_data[ist_ts.hour] += 1

            cam_name = cameras.get(e.cam_id, f"Unknown ({e.cam_id})")
            cam_counts[cam_name] = cam_counts.get(cam_name, 0) + 1

            date_str = ist_ts.strftime('%Y-%m-%d')
            daily_counts[date_str] = daily_counts.get(date_str, 0) + 1

        return {
            "rush_hour": [{"hour": f"{i:02d}:00", "count": c} for i, c in enumerate(hourly_data)],
            "hot_zones": sorted([{"name": n, "count": c} for n, c in cam_counts.items()], key=lambda x: x['count'], reverse=True),
            "daily_trend": [{"date": d, "count": c} for d, c in sorted(daily_counts.items())]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/recordings")
async def get_recordings(current_user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        recordings = db.query(Recording).order_by(Recording.timestamp.desc()).all()
        result = []
        for r in recordings:
            cam = db.query(Camera).filter(Camera.id == r.cam_id).first()
            result.append({
                "id": r.id, "alert_id": r.alert_id, "cam_id": r.cam_id,
                "file_path": r.file_path, "file_name": r.file_name,
                "file_size": r.file_size, "duration_secs": r.duration_secs,
                "count": r.count, "direction": r.direction, "timestamp": r.timestamp.isoformat() + "Z" if r.timestamp else None,
                "snapshot_path": db.query(Alert).filter(Alert.id == r.alert_id).first().snapshot_path if r.alert_id else None,
                "cameras": {"name": cam.name, "location": cam.location} if cam else None
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
