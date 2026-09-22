"""Programmatic uvicorn entrypoint.

Derives ws_max_size from RL_MAX_MESSAGE_BYTES so the protocol WebSocket cap always
stays >= the app's own inbound cap (otherwise a large image is 1009-closed at the
socket before main.py can reply with its graceful "too large" message).
--reload is enabled only when APP_ENV=development.

Run with:  python run.py
"""
import os
import uvicorn
from dotenv import load_dotenv

# Load .env before reading anything (main.py loads it again on import — harmless).
load_dotenv(override=True)

# Keep the protocol WS cap just above the app's own inbound cap so the app's graceful
# oversize path runs instead of the transport closing the connection first.
RL_MAX_MESSAGE_BYTES = int(os.getenv("RL_MAX_MESSAGE_BYTES", "16000000"))
WS_MAX_SIZE = RL_MAX_MESSAGE_BYTES + 100_000  # headroom for WS framing overhead

# Hot-reload in development only; never in production.
RELOAD = os.getenv("APP_ENV", "").lower() == "development"

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000")),
        ws_max_size=WS_MAX_SIZE,
        reload=RELOAD,
    )
