export type SystemStatus = {
  temperature: number
  turbidity: number
  predicted_do: number
  water_quality_status: 'NORMAL' | 'WARNING' | 'CRITICAL'
  aerator_state: 'ON' | 'OFF'
  mode: 'AUTO' | 'MANUAL'
  esp32_connected: boolean
  last_update: string
  message?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const response = await fetch(`${API_BASE_URL}/api/status`, {
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`API status failed with code ${response.status}`)
  }
  return response.json()
}

export async function sendTestSensorData(
  temperature: number,
  turbidity: number
): Promise<SystemStatus> {
  const response = await fetch(`${API_BASE_URL}/api/test/sensor-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temperature, turbidity }),
  })
  if (!response.ok) {
    throw new Error(`Test sensor data failed with code ${response.status}`)
  }
  return response.json()
}

export async function setAeratorState(state: 'ON' | 'OFF'): Promise<SystemStatus> {
  const endpoint = state === 'ON' ? '/api/aerator/on' : '/api/aerator/off'
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Failed to set aerator state to ${state}`)
  }
  return response.json()
}

export async function setAeratorMode(mode: 'AUTO' | 'MANUAL'): Promise<SystemStatus> {
  const response = await fetch(`${API_BASE_URL}/api/aerator/mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  })
  if (!response.ok) {
    throw new Error(`Failed to set aerator mode to ${mode}`)
  }
  return response.json()
}
