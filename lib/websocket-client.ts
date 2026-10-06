import { SystemStatus } from './api-client'

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'

export function subscribeToStatusUpdates(
  onUpdate: (status: SystemStatus) => void,
  onError?: (err: Event) => void
) {
  let ws: WebSocket | null = null
  let isClosedIntentionally = false
  let reconnectTimer: NodeJS.Timeout | null = null

  const connect = () => {
    try {
      ws = new WebSocket(WS_BASE_URL)

      ws.onmessage = (event) => {
        try {
          const data: SystemStatus = JSON.parse(event.data)
          onUpdate(data)
        } catch (e) {
          console.error('[WebSocket] Error parsing message', e)
        }
      }

      ws.onerror = (event) => {
        console.warn('[WebSocket] Connection error:', event)
        if (onError) onError(event)
      }

      ws.onclose = () => {
        if (!isClosedIntentionally) {
          reconnectTimer = setTimeout(() => {
            connect()
          }, 3000)
        }
      }
    } catch (err) {
      console.warn('[WebSocket] Failed to instantiate socket', err)
    }
  }

  connect()

  return () => {
    isClosedIntentionally = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (ws) ws.close()
  }
}
