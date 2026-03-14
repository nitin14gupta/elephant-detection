from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth_routes, camera_routes
from services.webcam_detector import start_webcam_detection
from dotenv import load_dotenv
import contextlib
import uvicorn

load_dotenv()

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the webcam thread on startup
    print("Starting ML webcam detection thread...")
    start_webcam_detection()
    yield
    print("Shutting down ML features...")

app = FastAPI(title="Elephant Detection API", version="3.0.0", lifespan=lifespan)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth_routes.router)
app.include_router(camera_routes.router)

@app.get("/")
async def root():
    return {"status": "online", "message": "Elephant Detection Server is running v3.0 (Refactored)"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
