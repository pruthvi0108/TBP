import logging
from typing import Literal
from app.config import settings
from app.services.esp32_service import esp32_service

logger = logging.getLogger("aquaculture.aerator")

class AeratorService:
    def __init__(self):
        self.aerator_state: Literal["ON", "OFF"] = "OFF"
        self.mode: Literal["AUTO", "MANUAL"] = "AUTO"
        self.low_threshold: float = settings.DO_LOW_THRESHOLD
        self.recovery_threshold: float = settings.DO_RECOVERY_THRESHOLD

    def get_water_quality_status(self, predicted_do: float) -> Literal["NORMAL", "WARNING", "CRITICAL"]:
        """Calculates water quality alert level based on predicted DO."""
        if predicted_do < self.low_threshold:
            return "CRITICAL"
        elif predicted_do < self.recovery_threshold:
            return "WARNING"
        return "NORMAL"

    async def evaluate_automatic_control(self, predicted_do: float) -> str:
        """
        Runs automatic aerator control with hysteresis.
        Returns the decided aerator state ("ON" or "OFF").
        """
        if self.mode != "AUTO":
            logger.info(f"[AERATOR] Mode is {self.mode}. Automatic control skipped.")
            return self.aerator_state

        previous_state = self.aerator_state
        new_state = previous_state

        if predicted_do < self.low_threshold:
            new_state = "ON"
        elif predicted_do > self.recovery_threshold:
            new_state = "OFF"
        # If between low_threshold and recovery_threshold, hysteresis maintains previous_state

        logger.info(f"[AERATOR] Automatic decision: {new_state} (Current DO: {predicted_do} mg/L, Prev: {previous_state})")

        if new_state != previous_state:
            self.aerator_state = new_state
            # Trigger ESP32 physical command
            await esp32_service.send_aerator_command(new_state)

        return self.aerator_state

    async def set_manual_state(self, state: Literal["ON", "OFF"]) -> str:
        """Sets aerator state in manual mode and sends command to ESP32."""
        self.aerator_state = state
        logger.info(f"[AERATOR] Manual override state set to: {state}")
        await esp32_service.send_aerator_command(state)
        return self.aerator_state

    def set_mode(self, mode: Literal["AUTO", "MANUAL"]) -> str:
        """Switches between AUTO and MANUAL mode."""
        self.mode = mode
        logger.info(f"[AERATOR] Control mode changed to: {mode}")
        return self.mode

aerator_service = AeratorService()
