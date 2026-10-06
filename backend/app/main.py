import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.ml_service import ml_service
from app.websocket_manager import ws_manager
from app.api import sensor, aerator, status

# Configure clean structured logging with tags
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("aquaculture.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load ML model ONCE
    logger.info("[ML] Initializing ML service and loading Dissolved Oxygen model...")
    ml_service.load_model(settings.MODEL_PATH)
    logger.info("[FASTAPI] Aquaculture Monitoring Server started ready on http://0.0.0.0:8000")
    yield
    # Shutdown
    logger.info("[FASTAPI] Shutting down Aquaculture Monitoring Server...")

app = FastAPI(
    title="AquaSense — Aquaculture Water Quality & Aerator Control API",
    description="FastAPI backend with ML inference for Dissolved Oxygen prediction and ESP32 aerator control",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(sensor.router)
app.include_router(aerator.router)
app.include_router(status.router)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time frontend streaming updates.
    """
    await ws_manager.connect(websocket)
    try:
        # Immediately send current state upon connection
        from app.api.sensor import current_system_state
        await websocket.send_json(current_system_state)
        
        while True:
            # Keep connection alive; accept client pings or messages
            data = await websocket.receive_text()
            logger.info(f"[WEBSOCKET] Client message received: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"[WEBSOCKET] WebSocket exception: {e}")
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
