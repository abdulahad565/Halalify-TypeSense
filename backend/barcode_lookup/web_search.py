import os
import json
import time
import uuid
import httpx
from log.logger import log
from agents.langgraph_agent.models.models import OutputSchema
from agents.langgraph_agent.utils.web_search import (
    WEB_OUTPUT_SCHEMA,
    WEB_SYSTEM_PROMPT,
    _EXA_SEARCH_URL,
    _NUM_RESULTS,
    _MAX_ATTEMPTS,
    _is_retryable,
    _backoff_delay,
)
from agents.langgraph_agent.tools.tools import _is_meaningful, _grounding_for

_ALLOWED_OUT = set(OutputSchema.model_fields)

# This answers a mobile client, so it is stricter than the chat agent's search:
# a tighter per-read timeout, and no further retry once this much time has passed.
_TIMEOUT = 20
_DEADLINE = 30


class ExaBusyError(Exception):
    """Exa kept failing with a retryable error (429/5xx/transport) after every retry."""


def build_web_query(barcode: str) -> str:
    # Chosen by live testing: Exa finds the right source page for every wording,
    # but its product synthesis is flaky with "barcode <n>" (Pepsi 6009803227014
    # came back empty), while "EAN <n> product" returned the product every time.
    return f"EAN {barcode} product"


def _fetch_done_frame(query: str) -> dict | None:
    """POST the search to Exa and return its final "done" frame (products +
    grounding), or None if the stream ended without one. Unlike the chat agent's
    stream_web_search, failures are NOT swallowed: a missing key or a terminal
    HTTP error raises, and a retryable failure that outlasts the retries raises
    ExaBusyError, so the endpoint can tell "busy"/"broken" apart from "no result".
    Nothing is streamed to a caller, so a retry can safely restart from scratch."""
    api_key = os.getenv("EXA_API_KEY")
    if not api_key:
        raise RuntimeError("EXA_API_KEY is not set")

    payload = {
        "query": query,
        "numResults": _NUM_RESULTS,
        "type": "auto",
        "stream": True,
        "outputSchema": WEB_OUTPUT_SCHEMA,
        "systemPrompt": WEB_SYSTEM_PROMPT,
        "contents": {"highlights": True},
    }
    headers = {"x-api-key": api_key, "Content-Type": "application/json"}

    started = time.monotonic()
    for attempt in range(_MAX_ATTEMPTS):
        try:
            done = None
            with httpx.Client(timeout=_TIMEOUT) as client:
                with client.stream(
                    "POST", _EXA_SEARCH_URL, headers=headers, json=payload
                ) as resp:
                    resp.raise_for_status()
                    for line in resp.iter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        raw = line[len("data:"):].strip()
                        if not raw or raw == "[DONE]":
                            continue
                        try:
                            frame = json.loads(raw)
                        except json.JSONDecodeError:
                            continue
                        if frame.get("type") == "done":
                            done = frame
            return done
        except httpx.HTTPError as e:
            retryable = _is_retryable(e)
            has_retry_left = attempt < _MAX_ATTEMPTS - 1
            delay = _backoff_delay(e, attempt) if retryable and has_retry_left else 0.0
            if retryable and has_retry_left and time.monotonic() - started + delay <= _DEADLINE:
                log.warning(
                    "barcode_lookup.web.retrying",
                    attempt=attempt + 1,
                    delay=round(delay, 2),
                    error=str(e),
                    error_type=type(e).__name__,
                )
                time.sleep(delay)
                continue
            if retryable:
                raise ExaBusyError(str(e)) from e
            raise


def _flatten_grounding(entries: list[dict]) -> list[dict]:
    """Exa gives {field, citations: [{url, title}], confidence}; the app's product
    shape wants one flat {field, url, title} entry per citation."""
    flat = []
    for g in entries:
        for c in g.get("citations") or []:
            flat.append({"field": g.get("field"), "url": c.get("url"), "title": c.get("title")})
    return flat


def search_web_for_barcode(barcode: str) -> dict | None:
    """Last-resort web lookup for a barcode via Exa. Returns the first product
    that clears the same junk filter the chat agent uses (stamped unverified, with
    flattened grounding), or None when the web has nothing useful. Raises
    ExaBusyError / other exceptions on failure — see _fetch_done_frame."""
    query = build_web_query(barcode)
    frame = _fetch_done_frame(query)
    if frame is None:
        log.info("barcode_lookup.web.no_done_frame", query=query)
        return None

    output = frame.get("output") or {}
    products = (output.get("content") or {}).get("products") or []
    grounding = output.get("grounding") or []
    log.info(
        "barcode_lookup.web.done",
        query=query,
        products=len(products),
        search_time=frame.get("searchTime"),
        cost=frame.get("costDollars"),
    )

    # Enumerate over the raw list so `i` stays aligned with Exa's products[i]
    # grounding paths even when a malformed product is skipped.
    for i, product in enumerate(products):
        if not isinstance(product, dict):
            continue
        keep, reason = _is_meaningful(product)
        if not keep:
            log.info(
                "barcode_lookup.web.discarded",
                reason=reason,
                name=str(product.get("norm_name") or "")[:80],
                query=query,
            )
            continue
        product = dict(product)
        product["canonical_id"] = f"halal_{uuid.uuid4().hex[:8]}"
        product["verified"] = False
        product["grounding"] = _flatten_grounding(_grounding_for(grounding, i))
        return product
    return None


def project_web_product(product: dict) -> dict:
    """Project a web-sourced product to the client-facing shape, always unverified."""
    proj = {k: v for k, v in product.items() if k in _ALLOWED_OUT}
    proj["verified"] = False
    return proj
