from fastapi import APIRouter
from app.models.schemas import SystemStatusResponse
from app.services.esp32_service import esp32_service
from app.api.sensor import current_system_state

router = APIRouter(prefix="/api", tags=["Status"])

@router.get("/status", response_model=SystemStatusResponse)
async def get_system_status():
    """
    Returns the latest aquaculture system status, sensor readings, predicted DO, aerator state, and ESP32 connectivity.
    """
    # Dynamically evaluate ESP32 heartbeat connection
    current_system_state["esp32_connected"] = esp32_service.is_connected()
    return SystemStatusResponse(**current_system_state)
