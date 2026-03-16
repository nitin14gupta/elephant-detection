from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from utils.auth_utils import get_current_user
from supabase import create_client, Client
import os

router = APIRouter(tags=["cameras"])

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Models
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

# Routes
@router.get("/api/stats")
async def get_stats(current_user: str = Depends(get_current_user)):
    detections = supabase.table("encounters").select("id", count='exact').execute()
    cameras = supabase.table("cameras").select("is_active").execute()
    
    active_count = sum(1 for c in cameras.data if c['is_active'])
    inactive_count = len(cameras.data) - active_count
    
    return {
        "total_detections": detections.count or 0,
        "active_cameras": active_count,
        "inactive_cameras": inactive_count,
        "total_cameras": len(cameras.data),
        "system_health": "Optimal"
    }

@router.get("/api/cameras")
async def get_cameras(current_user: str = Depends(get_current_user)):
    response = supabase.table("cameras").select("*").order("id").execute()
    return response.data

@router.post("/api/cameras", status_code=status.HTTP_201_CREATED)
async def create_camera(camera: CameraCreate, current_user: str = Depends(get_current_user)):
    try:
        response = supabase.table("cameras").insert(camera.dict()).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/api/cameras/{cam_id}")
async def update_camera(cam_id: int, update: CameraUpdate, current_user: str = Depends(get_current_user)):
    now = datetime.utcnow().isoformat()
    update_data = {"is_active": update.is_active}
    if update.is_active:
        update_data["last_active_at"] = now
    else:
        update_data["last_inactive_at"] = now
        
    response = supabase.table("cameras").update(update_data).eq("id", cam_id).execute()
    return response.data

@router.post("/api/detect")
async def log_detection(detection: Detection):
    data = {
        "cam_id": detection.cam_id,
        "count": detection.count,
        "direction": detection.direction
    }
    supabase.table("encounters").insert(data).execute()
    return {"status": "success"}

@router.get("/api/alerts")
async def get_alerts(current_user: str = Depends(get_current_user)):
    try:
        # Fetch alerts joined with camera details
        response = supabase.table("alerts").select("*, cameras(name, location)").order("timestamp", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/analytics")
async def get_analytics(range: str = "week", current_user: str = Depends(get_current_user)):
    try:
        from datetime import timedelta, timezone
        now = datetime.now(timezone.utc)
        
        query = supabase.table("encounters").select("timestamp, cam_id")
        
        if range == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            query = query.gte("timestamp", start_date.isoformat())
        elif range == "week":
            start_date = now - timedelta(days=7)
            query = query.gte("timestamp", start_date.isoformat())
        elif range == "month":
            start_date = now - timedelta(days=30)
            query = query.gte("timestamp", start_date.isoformat())
        # "all" is implicitly handled by not adding a filter
            
        encounters_resp = query.execute()
        cameras_resp = supabase.table("cameras").select("id, name").execute()
        
        encounters = encounters_resp.data
        cameras = {c['id']: c['name'] for c in cameras_resp.data}
        
        # 1. Hourly Distribution (Rush Hour) in IST
        hourly_data = [0] * 24
        ist_offset = timedelta(hours=5, minutes=30)
        
        for e in encounters:
            # Parse UTC and convert to IST
            utc_ts = datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00'))
            ist_ts = utc_ts + ist_offset
            hourly_data[ist_ts.hour] += 1
            
        rush_hour = [{"hour": f"{i:02d}:00", "count": count} for i, count in enumerate(hourly_data)]
        
        # 2. Camera Distribution (Hot Zones)
        cam_counts = {}
        for e in encounters:
            cam_name = cameras.get(e['cam_id'], f"Unknown ({e['cam_id']})")
            cam_counts[cam_name] = cam_counts.get(cam_name, 0) + 1
            
        hot_zones = [{"name": name, "count": count} for name, count in cam_counts.items()]
        hot_zones = sorted(hot_zones, key=lambda x: x['count'], reverse=True)
        
        # 3. Daily Trend (in IST)
        daily_counts = {}
        for e in encounters:
            utc_ts = datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00'))
            ist_ts = utc_ts + ist_offset
            date_str = ist_ts.strftime('%Y-%m-%d')
            daily_counts[date_str] = daily_counts.get(date_str, 0) + 1
            
        daily_trend = [{"date": d, "count": c} for d, c in sorted(daily_counts.items())]

        return {
            "rush_hour": rush_hour,
            "hot_zones": hot_zones,
            "daily_trend": daily_trend
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/recordings")
async def get_recordings(current_user: str = Depends(get_current_user)):
    try:
        response = supabase.table("recordings").select("*, cameras(name, location)").order("timestamp", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
