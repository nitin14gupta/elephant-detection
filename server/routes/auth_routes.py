from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import timedelta
from utils.auth_utils import verify_password, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from db.config import get_db
from db.models import User
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/auth", tags=["auth"])


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    email: str


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()

    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    try:
        if not verify_password(user_data.password, user.password_hash):
            raise HTTPException(status_code=400, detail="Incorrect email or password")
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: str = Depends(get_current_user)):
    return {"email": current_user}
