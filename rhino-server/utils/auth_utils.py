import os
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password: str, hashed_password: str):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        return email
    except JWTError:
        raise credentials_exception
