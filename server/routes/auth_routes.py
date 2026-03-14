from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from datetime import timedelta
from utils.auth_utils import verify_password, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from supabase import create_client, Client
import os

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    email: str

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    response = supabase.table("users").select("*").eq("email", user_data.email).execute()
    
    if not response.data:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    user = response.data[0]
    
    try:
        if not verify_password(user_data.password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Incorrect email or password")
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: str = Depends(get_current_user)):
    return {"email": current_user}
