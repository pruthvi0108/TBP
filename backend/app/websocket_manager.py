import json
import logging
from typing import List
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("aquaculture.websocket")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"[WEBSOCKET] Client connected. Total active clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"[WEBSOCKET] Client disconnected. Remaining clients: {len(self.active_connections)}")

    async def broadcast(self, data: dict):
        if not self.active_connections:
            return
        
        message = json.dumps(data)
        logger.info(f"[WEBSOCKET] State broadcast to {len(self.active_connections)} client(s)")
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"[WEBSOCKET] Error sending data to client: {e}")
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)

ws_manager = ConnectionManager()
