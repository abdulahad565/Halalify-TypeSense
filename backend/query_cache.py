"""Global query-result cache backed by Valkey.

Different users asking about the same product in different words share one
entry. The wording problem is solved upstream: search_node's LLM turns any
phrasing (and any follow-up, since it sees the chat history) into structured
KeywordFilterSearch args. The key is built from those args, not the raw text:

    "Is Nestle KitKat halal in UK?"          ┐
    "kitkat by nestlé — halal? I'm in the UK" ┴─> {norm_name: kitkat, companies: [nestle], sold_in: [UK]}
                                                   └─> qcache:v3:kw:<hash>

Only the products the user sees (matched/relevant, already projected and capped)
are stored, so a hit skips the Typesense search and the judge LLM entirely.

Rules for what is cacheable live with the callers (nodes.py): keyword-first
searches only, never when WebSearch ran, never for image-derived prompts.

Every op fails OPEN: if Valkey is unreachable the agent just runs normally.

Rollout: QCACHE_SHADOW=true (default) looks up and saves but never serves a
hit — it only logs whether the cached answer would have agreed with the fresh
one. Flip it to false once the logs look right.
"""
import os
import sys
import json
import hashlib
import unicodedata
from datetime import datetime, timezone

from log.logger import log
from config.valkey_client import get_valkey_sync

# `!= "false"` so the feature is on unless explicitly disabled.
ENABLED = os.getenv("QCACHE_ENABLED", "true").lower() != "false"
SHADOW = os.getenv("QCACHE_SHADOW", "false").lower() != "false"
TTL_S = int(os.getenv("QCACHE_TTL_S", str(14 * 24 * 3600)))  # 14 days

_VERSION_KEY = "qcache:version"


def _norm_text(value) -> str:
    """Normalise a text-matched value the way Typesense's text search already
    treats it: case-, accent- and punctuation-insensitive. Hyphens/apostrophes
    are dropped (so "Kit-Kat" == "KitKat"), other punctuation becomes a space."""
    s = unicodedata.normalize("NFKD", str(value))
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = s.replace("-", "").replace("'", "").replace("’", "")
    s = "".join(c if c.isalnum() else " " for c in s)
    return " ".join(s.split())


def _norm_filter(value):
    """Filters are exact matches (`:=`) in Typesense, which is case-sensitive, so
    only trim and order them — lowercasing here could make a query that returns
    nothing ("halal") share a key with one that returns products ("Halal")."""
    if isinstance(value, list):
        return sorted({str(v).strip() for v in value if str(v).strip()})
    return str(value).strip()


def _as_dict(obj) -> dict:
    """Tool-call args arrive as plain dicts, but tolerate pydantic models too."""
    if not obj:
        return {}
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    return dict(obj)


def canonical_args(keyword_args, filter_args) -> dict | None:
    """The wording-independent fingerprint of a KeywordFilterSearch call, or None
    if the call has nothing to key on."""
    kw = _as_dict(keyword_args)
    fl = _as_dict(filter_args)

    out: dict = {}
    name = _norm_text(kw.get("norm_name") or "")
    if name:
        out["norm_name"] = name
    companies = sorted({_norm_text(c) for c in (kw.get("companies") or []) if _norm_text(c)})
    if companies:
        out["companies"] = companies

    filters = {}
    for k, v in fl.items():
        nv = _norm_filter(v) if v else None
        if nv:
            filters[k] = nv
    if filters:
        out["filters"] = filters

    return out or None


def _redis():
    return get_valkey_sync()


def current_version() -> str:
    """The cache generation. Bumped after product data changes, which orphans
    every older key (they then expire on their own — nothing is scanned/deleted)."""
    # "0" (not "1") when unset: INCR on a missing key yields 1, so the first bump
    # must land on a different generation than the default.
    return _redis().get(_VERSION_KEY) or "0"


def build_key(keyword_args, filter_args) -> str | None:
    """Full Valkey key for a KeywordFilterSearch call, or None if it can't be
    keyed or Valkey is unreachable."""
    if not ENABLED:
        return None
    canon = canonical_args(keyword_args, filter_args)
    if canon is None:
        return None
    payload = json.dumps(canon, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:32]
    try:
        version = current_version()
    except Exception as e:
        log.warning("qcache.version.failed", error=str(e), error_type=type(e).__name__)
        return None
    key = f"qcache:v{version}:kw:{digest}"
    log.info("qcache.key", key=key, canonical=payload)
    return key


def get(key: str) -> dict | None:
    """Cached {matched, relevant} for a key, or None on a miss/error."""
    try:
        raw = _redis().get(key)
        return json.loads(raw) if raw else None
    except Exception as e:
        log.warning("qcache.get.failed", error=str(e), error_type=type(e).__name__)
        return None


def put(key: str, matched: list, relevant: list) -> None:
    """Store the products the user was shown, and index every card by its hard
    identifiers so identifier-only questions can find it later. Best-effort."""
    value = {
        "matched": matched,
        "relevant": relevant,
        "cached_at": datetime.now(timezone.utc).isoformat(),
    }
    version = key.split(":")[1]  # "qcache:v3:kw:..." -> "v3"
    try:
        pipe = _redis().pipeline(transaction=False)
        pipe.set(key, json.dumps(value, ensure_ascii=False), ex=TTL_S)
        indexed = _index_identifiers(pipe, version, matched + relevant)
        pipe.execute()
        log.info("qcache.saved", key=key, matched=len(matched), relevant=len(relevant), identifiers_indexed=indexed)
    except Exception as e:
        log.warning("qcache.put.failed", error=str(e), error_type=type(e).__name__)


# ---- identifier index ----
# Questions made only of hard identifiers ("barcode: 21515") are answered from the
# product CARDS already in the cache, whatever question originally saved them —
# e.g. a KitKat saved for "is nestle kitkat halal?" answers a later barcode-only
# question. Scanning every cached card would slow down as the cache grows, so each
# card is indexed by its identifiers at save time instead:
#
#   qcache:v3:id:barcodes:21515  ->  HASH { canonical_id: card JSON, ... }
#
# A HASH because one identifier can belong to several products (variants).
# Version-prefixed and TTL'd like the main entries, so a bump invalidates both.
IDENTIFIER_FIELDS = ("barcodes", "fda_numbers", "cert_numbers")


def _norm_identifier(value) -> str:
    """Case-, hyphen- and space-insensitive, so "01-2345", "012345" and
    "01 2345" are the same identifier (matches the loose web-result check)."""
    return "".join(str(value).split()).replace("-", "").lower()


def _identifier_key(version: str, field: str, value: str) -> str:
    return f"qcache:{version}:id:{field}:{value}"


def _index_identifiers(pipe, version: str, products: list) -> int:
    """Queue HSETs indexing each card under each of its identifier values."""
    count = 0
    for card in products:
        pid = card.get("canonical_id")
        if not pid:
            continue
        blob = json.dumps(card, ensure_ascii=False)
        for field in IDENTIFIER_FIELDS:
            raw = card.get(field) or []
            for value in {_norm_identifier(v) for v in (raw if isinstance(raw, list) else [raw])}:
                if not value:
                    continue
                k = _identifier_key(version, field, value)
                pipe.hset(k, pid, blob)
                pipe.expire(k, TTL_S)
                count += 1
    return count


def identifier_only_query(keyword_args, filter_args) -> dict | None:
    """{field: [normalised values]} if the search is ONLY identifiers (no product
    name, no brand, no other filter), else None."""
    kw = _as_dict(keyword_args)
    if kw.get("norm_name") or kw.get("companies"):
        return None
    active = {k: v for k, v in _as_dict(filter_args).items() if v}
    if not active or any(k not in IDENTIFIER_FIELDS for k in active):
        return None
    out = {}
    for field, raw in active.items():
        values = {_norm_identifier(v) for v in (raw if isinstance(raw, list) else [raw])}
        values.discard("")
        if values:
            out[field] = sorted(values)
    return out or None


def find_by_identifiers(identifiers: dict) -> list | None:
    """Cached cards matching an identifier-only search, or None.

    Mirrors the DB filter semantics: values within one field are OR (any of the
    barcodes), different fields are AND (barcode AND fda number). Returns None
    unless EVERY requested value is known to the cache — if one is missing, the
    DB may hold a product the cache has never seen, so the answer can't be
    trusted to be complete.
    """
    try:
        version = f"v{current_version()}"
        pipe = _redis().pipeline(transaction=False)
        order = []
        for field, values in identifiers.items():
            for value in values:
                pipe.hgetall(_identifier_key(version, field, value))
                order.append(field)
        results = pipe.execute()
    except Exception as e:
        log.warning("qcache.identifier_lookup.failed", error=str(e), error_type=type(e).__name__)
        return None

    per_field: dict = {}
    for field, found in zip(order, results):
        if not found:
            return None
        per_field.setdefault(field, {}).update({pid: json.loads(card) for pid, card in found.items()})

    common = set.intersection(*(set(cards) for cards in per_field.values()))
    if not common:
        return None
    first = next(iter(per_field.values()))
    return [card for pid, card in first.items() if pid in common]


def ids(products: list) -> list:
    return [p.get("canonical_id") for p in products or []]


def bump_version() -> int:
    """Invalidate the whole cache. Call after inserting/updating products."""
    new = _redis().incr(_VERSION_KEY)
    log.info("qcache.version.bumped", version=new)
    return new


if __name__ == "__main__":
    # Manual invalidation after a product data change:
    #   python query_cache.py bump
    if sys.argv[1:] == ["bump"]:
        print(f"query cache version is now {bump_version()}")
    else:
        print("usage: python query_cache.py bump")
