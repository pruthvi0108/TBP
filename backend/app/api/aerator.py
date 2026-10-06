from datetime import datetime
from fastapi import APIRouter
from app.models.schemas import AeratorModeInput, SystemStatusResponse
from app.services.aerator_service import aerator_service
from app.services.esp32_service import esp32_service
from app.websocket_manager import ws_manager
from app.api.sensor import current_system_state

router = APIRouter(prefix="/api/aerator", tags=["Aerator Control"])

async def broadcast_updated_state():
    current_system_state["aerator_state"] = aerator_service.aerator_state
    current_system_state["mode"] = aerator_service.mode
    current_system_state["last_update"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    await ws_manager.broadcast(current_system_state)

@router.post("/on", response_model=SystemStatusResponse)
async def turn_aerator_on():
    """Manually commands aerator to turn ON."""
    await aerator_service.set_manual_state("ON")
    await broadcast_updated_state()
    return SystemStatusResponse(**current_system_state)

@router.post("/off", response_model=SystemStatusResponse)
async def turn_aerator_off():
    """Manually commands aerator to turn OFF."""
    await aerator_service.set_manual_state("OFF")
    await broadcast_updated_state()
    return SystemStatusResponse(**current_system_state)

@router.post("/mode", response_model=SystemStatusResponse)
async def set_aerator_mode(payload: AeratorModeInput):
    """Switches control mode between AUTOMATIC and MANUAL."""
    aerator_service.set_mode(payload.mode)
    
    # If switching back to AUTO, trigger immediate evaluation against latest DO
    if payload.mode == "AUTO":
        current_do = current_system_state.get("predicted_do", 6.0)
        await aerator_service.evaluate_automatic_control(current_do)
        
    await broadcast_updated_state()
    return SystemStatusResponse(**current_system_state)
