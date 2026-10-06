# AquaSense — AI Aquaculture Water-Quality Monitoring & Aerator-Control System

AquaSense is an AI-powered real-time aquaculture water-quality monitoring and aerator-control application. It connects low-cost physical IoT sensors (Water Temperature & Turbidity on an ESP32) over Wi-Fi to a FastAPI backend running a Machine Learning regression model to predict Dissolved Oxygen (DO) and automate pond aerator control with hysteresis.

---

## 🏗️ Architecture

```
                 +-----------------------+
                 |      WEB BROWSER      |
                 | Next.js / React / CSS |
                 +-----------+-----------+
                             |
                      HTTP / WebSocket (/ws)
                             |
                             v
                 +-----------------------+
                 |    FASTAPI SERVER     |
                 |  (Running on Laptop)  |
                 +----+-------------+----+
                      |             |
           ML Inference             Control Logic
          (predict_do)             (Hysteresis AUTO/MANUAL)
                      |             |
                      +------+------+
                             |
                         Wi-Fi / LAN
                             |
                             v
                     +---------------+
                     |     ESP32     |
                     +---+-------+---+
                         |       |
              Temperature        Turbidity
                         |       |
                         +---+---+
                             |
                           Relay
                             |
                             v
                          Aerator
```

---

## 🚀 Quick Start

### 1. Backend Setup (FastAPI & ML)

Navigating to the `backend` directory and setting up the Python environment:

```bash
cd backend

# Create virtual environment using uv or python venv
uv venv .venv
source .venv/bin/activate

# Install dependencies
uv pip install -r requirements.txt

# (Optional) Train the ML model
python ml/train_model.py

# Create environment configuration
cp .env.example .env

# Run FastAPI server
PYTHONPATH=. .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The FastAPI backend will run on `http://localhost:8000`. Documentation will be available at `http://localhost:8000/docs`.

---

### 2. Frontend Setup (Next.js)

```bash
# Install Node dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:3000` in your web browser.

---

## 🤖 Machine Learning Model

- **Inputs**:
  1. `water_temperature` (°C)
  2. `turbidity` (NTU)
- **Output**: `predicted_do` (Dissolved Oxygen in mg/L)
- **Model File**: `backend/ml/dissolved_oxygen_model.pkl`
- **Loading**: Loaded **ONCE** at FastAPI startup in `ml_service.py` with physical fallback formula support.

---

## ⚙️ Aerator Control & Hysteresis

The system supports **AUTOMATIC** and **MANUAL** aerator control modes:

### AUTOMATIC Mode:
- **Low DO Threshold**: `5.0 mg/L` (Configurable via `DO_LOW_THRESHOLD`)
- **Recovery Threshold**: `6.0 mg/L` (Configurable via `DO_RECOVERY_THRESHOLD`)
- **Logic**:
  - If `DO < 5.0 mg/L` ➔ Aerator **ON**
  - If `DO > 6.0 mg/L` ➔ Aerator **OFF**
  - If `5.0 <= DO <= 6.0 mg/L` ➔ Retains current state (Hysteresis prevents relay chattering)

### MANUAL Mode:
- User can toggle **TURN ON AERATOR** or **TURN OFF AERATOR** from the web interface.
- Frontend issues requests to `POST /api/aerator/on` or `POST /api/aerator/off`.
- FastAPI confirms relay command with ESP32 before updating state.

---

## 📡 API Endpoints & WebSockets

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Returns latest system readings, predicted DO, aerator state, and ESP32 status. |
| `POST` | `/api/sensor-data` | ESP32 posts `{ "temperature": 28.4, "turbidity": 42.7 }`. |
| `POST` | `/api/test/sensor-data` | Simulation endpoint for testing without physical hardware. |
| `POST` | `/api/aerator/on` | Manually turns aerator ON. |
| `POST` | `/api/aerator/off` | Manually turns aerator OFF. |
| `POST` | `/api/aerator/mode` | Switches mode between `{ "mode": "AUTO" }` and `{ "mode": "MANUAL" }`. |
| `WS` | `/ws` | Real-time WebSocket connection for streaming frontend updates. |

---

## 🧪 Simulation / Hardware-Free Testing

To test the system without an ESP32:

1. Use the **FastAPI Simulation Controls** at the top bar of the Web Application.
2. Or issue a `POST` request directly:

```bash
curl -X POST http://localhost:8000/api/test/sensor-data \
  -H "Content-Type: application/json" \
  -d '{"temperature": 32.5, "turbidity": 95.0}'
```

---

## 🛠️ ESP32 Firmware Integration

Program your ESP32 to HTTP POST sensor measurements to your laptop's local IP address:

```cpp
// ESP32 Arduino snippet
#include <HTTPClient.h>
#include <ArduinoJson.h>

void sendSensorData(float temp, float turb) {
  HTTPClient http;
  http.begin("http://<LAPTOP_IP>:8000/api/sensor-data");
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["temperature"] = temp;
  doc["turbidity"] = turb;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpResponseCode = http.POST(requestBody);
  http.end();
}
```

The ESP32 should also expose a simple HTTP endpoint `POST http://<ESP32_IP>/aerator` accepting `{"state": "ON"}` or `{"state": "OFF"}` to handle relay switching.
