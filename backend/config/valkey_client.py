import os
import asyncio
import threading
import valkey as valkey_sync
import valkey.asyncio as valkey
from dotenv import load_dotenv

load_dotenv()

_client: "valkey.Valkey | None" = None
_lock = asyncio.Lock()

_sync_client: "valkey_sync.Valkey | None" = None
_sync_lock = threading.Lock()

# The sync client sits on the agent's hot path (graph nodes are sync and run in
# worker threads), so a dead endpoint must cost a fraction of a second, not the
# library's default of waiting indefinitely.
SYNC_SOCKET_TIMEOUT_S = 0.5


def _valkey_url() -> str:
    # `or` (not getenv's default): VALKEY_URL is present-but-empty in local .env
    # files, and from_url("") raises.
    raw = os.getenv("VALKEY_URL") or "redis://localhost:6379/0"
    return raw.replace("redis://", "valkey://", 1).replace("rediss://", "valkeys://", 1)


async def get_valkey() -> "valkey.Valkey":
    """Return a lazily-initialised async Valkey client (pooled, str-decoded).

    `from_url` builds a connection pool for us; the client is created once and
    reused on the running event loop. Pinged on creation so a bad endpoint fails
    fast rather than deep inside the first request.
    """
    global _client
    if _client is None:
        async with _lock:
            if _client is None:
                client = valkey.Valkey.from_url(_valkey_url(), decode_responses=True)
                await client.ping()
                _client = client
    return _client


def get_valkey_sync() -> "valkey_sync.Valkey":
    """Return a lazily-initialised sync Valkey client (pooled, str-decoded).

    For code that can't await — the LangGraph nodes are sync. Not pinged on
    creation: callers fail open per operation, and the short socket timeouts
    bound how long an unreachable endpoint can stall a node.
    """
    global _sync_client
    if _sync_client is None:
        with _sync_lock:
            if _sync_client is None:
                _sync_client = valkey_sync.Valkey.from_url(
                    _valkey_url(),
                    decode_responses=True,
                    socket_timeout=SYNC_SOCKET_TIMEOUT_S,
                    socket_connect_timeout=SYNC_SOCKET_TIMEOUT_S,
                )
    return _sync_client


async def close_valkey() -> None:
    """Close the clients and their pools (called on app shutdown)."""
    global _client, _sync_client
    if _client is not None:
        await _client.aclose()
        _client = None
    if _sync_client is not None:
        _sync_client.close()
        _sync_client = None
