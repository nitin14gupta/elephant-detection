from sqlalchemy import Column, Integer, String, Boolean, Float, BigInteger, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from db.config import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    location = Column(String)
    lat = Column(Float)
    long = Column(Float)
    live_link = Column(String)
    is_active = Column(Boolean, default=True)
    last_active_at = Column(DateTime)
    last_inactive_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class Encounter(Base):
    __tablename__ = "encounters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cam_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"))
    count = Column(Integer, default=0)
    direction = Column(String)
    alert_id = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cam_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"))
    type = Column(String, default="Elephant Detection")
    severity = Column(String, default="CRITICAL")
    is_active = Column(Boolean, default=True)
    count = Column(Integer, default=1)
    direction = Column(String, default="unknown")
    url = Column(String)
    gemini_verified = Column(Boolean, nullable=True)   # None = skipped, True = confirmed, False = unconfirmed
    gemini_reason = Column(String, nullable=True)
    snapshot_path = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    camera = relationship("Camera", foreign_keys=[cam_id])


class Recording(Base):
    __tablename__ = "recordings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"))
    cam_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"))
    file_path = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_size = Column(BigInteger)
    duration_secs = Column(Integer)
    count = Column(Integer)
    direction = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

    camera = relationship("Camera", foreign_keys=[cam_id])
