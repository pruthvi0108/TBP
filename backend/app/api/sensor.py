from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import SensorDataInput, TestSensorDataInput, SystemStatusResponse
from app.services.ml_service import ml_service
from app.services.esp32_service import esp32_service
from app.services.aerator_service import aerator_service
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/api", tags=["Sensor"])

# Shared state store for current system state
current_system_state = {
    "temperature": 28.4,
    "turbidity": 42.7,
    "predicted_do": 5.82,
    "water_quality_status": "NORMAL",
    "aerator_state": "OFF",
    "mode": "AUTO",
    "esp32_connected": False,
    "last_update": datetime.now().isoformat()
}

async def process_sensor_readings(temp: float, turb: float, is_physical_esp32: bool = True) -> SystemStatusResponse:
    # 1. Heartbeat
    if is_physical_esp32:
        esp32_service.record_heartbeat()
    
    # 2. Run ML inference
    predicted_do = ml_service.predict_dissolved_oxygen(temp, turb)
    
    # 3. Water Quality Status
    status_level = aerator_service.get_water_quality_status(predicted_do)
    
    # 4. Run automatic control logic if AUTO mode
    aerator_state = await aerator_service.evaluate_automatic_control(predicted_do)
    
    # 5. Build state object
    last_update_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    connected = esp32_service.is_connected() if is_physical_esp32 else True
    
    current_system_state.update({
        "temperature": round(temp, 1),
        "turbidity": round(turb, 1),
        "predicted_do": predicted_do,
        "water_quality_status": status_level,
        "aerator_state": aerator_state,
        "mode": aerator_service.mode,
        "esp32_connected": connected,
        "last_update": last_update_str
    })
    
    # 6. Broadcast over WebSocket
    await ws_manager.broadcast(current_system_state)
    
    return SystemStatusResponse(**current_system_state)

@router.post("/sensor-data", response_model=SystemStatusResponse)
async def receive_sensor_data(data: SensorDataInput):
    """
    Receives temperature and turbidity measurements from ESP32.
    """
    if data.temperature < -10.0 or data.temperature > 60.0:
        raise HTTPException(status_code=400, detail="Invalid temperature value out of physical range")
    if data.turbidity < 0.0 or data.turbidity > 1000.0:
        raise HTTPException(status_code=400, detail="Invalid turbidity value out of physical range")
        
    return await process_sensor_readings(data.temperature, data.turbidity, is_physical_esp32=True)

@router.post("/test/sensor-data", response_model=SystemStatusResponse)
async def receive_test_sensor_data(data: TestSensorDataInput):
    """
    Development & simulation route for sending test sensor readings without physical hardware.
    """
    if data.simulate_esp32_connection:
        esp32_service.record_heartbeat()
    return await process_sensor_readings(data.temperature, data.turbidity, is_physical_esp32=False)
