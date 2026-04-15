import os
import sys
import bcrypt
from dotenv import load_dotenv

load_dotenv()

# Ensure the server directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.config import init_db, SessionLocal
from db.models import User


def create_user(email, password):
    init_db()
    db = SessionLocal()
    try:
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt(rounds=12)
        hashed_password = bcrypt.hashpw(password_bytes, salt).decode('utf-8')

        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"User {email} already exists. Updating password...")
            existing.password_hash = hashed_password
        else:
            print(f"Creating new user {email}...")
            db.add(User(email=email, password_hash=hashed_password))

        db.commit()
        print("Done!")
        print(f"Email: {email}")
        print(f"Password: {password}")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_user("admin@justtouchsolutions.in", "Admin@1234")
