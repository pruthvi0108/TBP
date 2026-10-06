from pydantic import BaseModel, Field
from typing import Literal, Optional

class SensorDataInput(BaseModel):
    temperature: float = Field(..., description="Water temperature in °C", ge=-10.0, le=60.0)
    turbidity: float = Field(..., description="Turbidity in NTU", ge=0.0, le=1000.0)

class AeratorModeInput(BaseModel):
    mode: Literal["AUTO", "MANUAL"]

class AeratorCommandInput(BaseModel):
    state: Literal["ON", "OFF"]

class SystemStatusResponse(BaseModel):
    temperature: float
    turbidity: float
    predicted_do: float
    water_quality_status: Literal["NORMAL", "WARNING", "CRITICAL"]
    aerator_state: Literal["ON", "OFF"]
    mode: Literal["AUTO", "MANUAL"]
    esp32_connected: bool
    last_update: str
    message: Optional[str] = None

class TestSensorDataInput(SensorDataInput):
    simulate_esp32_connection: bool = True
