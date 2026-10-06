import time
import httpx
import logging
from app.config import settings

logger = logging.getLogger("aquaculture.esp32")

class ESP32Service:
    def __init__(self):
        self.last_seen_timestamp: float = 0.0
        self.override_connected_state: bool | None = None

    def record_heartbeat(self):
        """Called whenever sensor data is received from physical ESP32 or test route."""
        self.last_seen_timestamp = time.time()
        logger.info("[ESP32] Sensor data received")

    def is_connected(self) -> bool:
        """Returns True if sensor reading was received within ESP32_TIMEOUT_SECONDS."""
        if self.override_connected_state is not None:
            return self.override_connected_state
        if self.last_seen_timestamp == 0.0:
            return False
        return (time.time() - self.last_seen_timestamp) <= settings.ESP32_TIMEOUT_SECONDS

    async def send_aerator_command(self, state: str) -> bool:
        """
        Sends HTTP POST to physical ESP32 endpoint to command relay state.
        Returns True if successful, False if offline/timed out.
        """
        url = f"{settings.ESP32_BASE_URL.rstrip('/')}/aerator"
        logger.info(f"[ESP32] Sending command: {state} to {url}")
        
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.post(url, json={"state": state})
                if response.status_code in (200, 201, 204):
                    logger.info(f"[ESP32] Command sent successfully: {state}")
                    return True
                else:
                    logger.warning(f"[ESP32] ESP32 returned status code {response.status_code}")
                    return False
        except httpx.ConnectError:
            logger.warning(f"[ESP32] Could not connect to ESP32 at {settings.ESP32_BASE_URL} (offline or unreachable)")
            return False
        except httpx.TimeoutException:
            logger.warning(f"[ESP32] Timeout while connecting to ESP32 at {settings.ESP32_BASE_URL}")
            return False
        except Exception as e:
            logger.error(f"[ESP32] Unexpected error sending command to ESP32: {e}")
            return False

esp32_service = ESP32Service()
