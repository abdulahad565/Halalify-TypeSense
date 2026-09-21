"""TEMPORARY diagnostic: log the creation stack of every aiohttp ClientSession.

Enable by importing this at the very top of run.py (before uvicorn.run):
    import _aiohttp_trace   # noqa: F401  (remove after debugging)

Then run the app, reproduce the "Unclosed client session" spam for ~15s, and read
the "aiohttp.session.created" log lines — the `origin` field shows the last few
non-stdlib frames that created each session, i.e. exactly what's leaking. Delete
this file and the import once identified.
"""
import traceback

import aiohttp
from log.logger import log

_orig_init = aiohttp.client.ClientSession.__init__


def _basename(path: str) -> str:
    return path.replace("\\", "/").split("/")[-1]


def _traced_init(self, *args, **kwargs):
    # Last ~10 frames, newest last: shows the library (fireworks/aiohttp/exa/supabase)
    # AND the app call site that triggered it.
    frames = traceback.extract_stack()[:-1][-10:]
    origin = " -> ".join(f"{_basename(fs.filename)}:{fs.lineno}:{fs.name}" for fs in frames)
    log.info("aiohttp.session.created", origin=origin)
    return _orig_init(self, *args, **kwargs)


aiohttp.client.ClientSession.__init__ = _traced_init
log.info("aiohttp.trace.enabled")