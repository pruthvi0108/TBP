import os

class Settings:
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # ESP32 Communication
    ESP32_BASE_URL: str = os.getenv("ESP32_BASE_URL", "http://192.168.1.50")
    ESP32_TIMEOUT_SECONDS: float = float(os.getenv("ESP32_TIMEOUT_SECONDS", "15.0"))
    
    # Aerator & Thresholds (DO in mg/L)
    DO_LOW_THRESHOLD: float = float(os.getenv("DO_LOW_THRESHOLD", "5.0"))
    DO_RECOVERY_THRESHOLD: float = float(os.getenv("DO_RECOVERY_THRESHOLD", "6.0"))
    
    # ML Model
    MODEL_PATH: str = os.getenv("MODEL_PATH", "model.pkl")

settings = Settings()
