import os
import bcrypt
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Configuration from .env
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env file")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_user(email, password):
    # Hash the password correctly using bcrypt
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    hashed_password = bcrypt.hashpw(password_bytes, salt).decode('utf-8')

    # Prepare user data
    user_data = {
        "email": email,
        "password_hash": hashed_password
    }

    try:
        # Check if user exists first to decide whether to update or insert
        check = supabase.table("users").select("email").eq("email", email).execute()
        
        if check.data:
            print(f"User {email} already exists. Updating password...")
            response = supabase.table("users").update({"password_hash": hashed_password}).eq("email", email).execute()
        else:
            print(f"Creating new user {email}...")
            response = supabase.table("users").insert(user_data).execute()

        print("Successfully registered user in Supabase!")
        print(f"Email: {email}")
        print(f"Hashed Password: {hashed_password}")
        
    except Exception as e:
        print(f"Error creating user: {e}")

if __name__ == "__main__":
    # The pre-defined user you requested
    create_user("nitin@gmail.com", "nitin@1234")
