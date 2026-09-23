"""Offline tests for the barcode endpoint's web-search tier (Exa) and the
tier-resolution rules around it. No network: httpx and every tier are faked."""

import httpx
import pytest

import main
from barcode_lookup import web_search as ws
from barcode_lookup import has_valid_check_digit


# ---- check digit -----------------------------------------------------------

@pytest.mark.parametrize("code", ["3017620422003", "012000001086", "96385074", "0079400066008"])
def test_valid_check_digits(code):
    assert has_valid_check_digit(code)


@pytest.mark.parametrize("code", ["3017620422004", "012000001087", "96385075", "0079400066009"])
def test_single_digit_corruption_is_rejected(code):
    assert not has_valid_check_digit(code)


# ---- search_web_for_barcode post-processing ---------------------------------

def _done(products, grounding=None):
    return {"type": "done", "output": {"content": {"products": products}, "grounding": grounding or []}}


def test_found_product_is_stamped_unverified_with_flat_grounding(monkeypatch):
    frame = _done(
        [{"norm_name": "Nutella 400g", "companies": ["Ferrero"]}],
        [{"field": "products[0].companies", "confidence": "high",
          "citations": [{"url": "https://a.example", "title": "A"}, {"url": "https://b.example", "title": "B"}]}],
    )
    monkeypatch.setattr(ws, "_fetch_done_frame", lambda q: frame)
    p = ws.search_web_for_barcode("3017620422003")
    assert p["verified"] is False and p["canonical_id"].startswith("halal_")
    assert p["grounding"] == [
        {"field": "companies", "url": "https://a.example", "title": "A"},
        {"field": "companies", "url": "https://b.example", "title": "B"},
    ]


def test_placeholder_products_are_discarded(monkeypatch):
    monkeypatch.setattr(ws, "_fetch_done_frame", lambda q: _done([{"norm_name": "Unknown product", "companies": ["X"]}]))
    assert ws.search_web_for_barcode("3017620422003") is None


def test_grounding_stays_aligned_when_an_earlier_product_is_skipped(monkeypatch):
    frame = _done(
        [{"norm_name": "N/A"}, {"norm_name": "Real Snack", "companies": ["Acme"]}],
        [{"field": "products[1].companies", "citations": [{"url": "https://real.example", "title": "R"}]}],
    )
    monkeypatch.setattr(ws, "_fetch_done_frame", lambda q: frame)
    p = ws.search_web_for_barcode("3017620422003")
    assert p["norm_name"] == "Real Snack"
    assert p["grounding"] == [{"field": "companies", "url": "https://real.example", "title": "R"}]


def test_no_done_frame_or_empty_products_is_none(monkeypatch):
    monkeypatch.setattr(ws, "_fetch_done_frame", lambda q: None)
    assert ws.search_web_for_barcode("3017620422003") is None
    monkeypatch.setattr(ws, "_fetch_done_frame", lambda q: _done([]))
    assert ws.search_web_for_barcode("3017620422003") is None


# ---- _fetch_done_frame failure classification -------------------------------

class _FailingClient:
    """httpx.Client stand-in whose stream() always answers with `status`."""
    calls = 0

    def __init__(self, status):
        self.status = status

    def __call__(self, *a, **k):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def stream(self, method, url, **kw):
        type(self).calls += 1
        request = httpx.Request(method, url)
        response = httpx.Response(self.status, request=request)
        raise httpx.HTTPStatusError("boom", request=request, response=response)


@pytest.fixture
def exa_key(monkeypatch):
    monkeypatch.setenv("EXA_API_KEY", "test-key")
    monkeypatch.setattr(ws.time, "sleep", lambda s: None)


def test_missing_key_raises(monkeypatch):
    monkeypatch.delenv("EXA_API_KEY", raising=False)
    with pytest.raises(RuntimeError):
        ws._fetch_done_frame("barcode 1")


@pytest.mark.parametrize("status", [429, 503])
def test_retryable_failure_after_all_retries_is_busy(monkeypatch, exa_key, status):
    _FailingClient.calls = 0
    monkeypatch.setattr(ws.httpx, "Client", _FailingClient(status))
    with pytest.raises(ws.ExaBusyError):
        ws._fetch_done_frame("barcode 1")
    assert _FailingClient.calls == ws._MAX_ATTEMPTS


def test_non_retryable_failure_is_not_busy_and_not_retried(monkeypatch, exa_key):
    _FailingClient.calls = 0
    monkeypatch.setattr(ws.httpx, "Client", _FailingClient(401))
    with pytest.raises(httpx.HTTPStatusError):
        ws._fetch_done_frame("barcode 1")
    assert _FailingClient.calls == 1


# ---- endpoint tier resolution ------------------------------------------------

class _User:
    id = "u1"


class _Auth:
    async def get_user(self, token):
        class R:
            user = _User()
        return R()


class _Sb:
    auth = _Auth()


VALID = "3017620422003"      # valid check digit
BAD_CD = "3017620422004"     # well-formed, wrong check digit


@pytest.fixture
def endpoint(monkeypatch):
    """Returns call(barcode, primary=..., off=..., web=...): each tier is a value
    (result), or an Exception (raised). Records whether Exa was called."""
    async def _sb():
        return _Sb()

    async def _allow(*a, **k):
        return True

    monkeypatch.setattr(main, "get_supabase", _sb)
    monkeypatch.setattr(main, "allow_user", _allow)

    async def call(barcode, primary=None, off=None, web=None):
        seen = {"web_called": False}

        def _tier(v, mark=None):
            def f(_b):
                if mark:
                    seen[mark] = True
                if isinstance(v, Exception):
                    raise v
                return v
            return f

        monkeypatch.setattr(main, "query_primary_db", _tier(primary))
        monkeypatch.setattr(main, "query_off_db", _tier(off))
        monkeypatch.setattr(main, "search_web_for_barcode", _tier(web, "web_called"))
        monkeypatch.setattr(main, "project_product", lambda d: d)
        monkeypatch.setattr(main, "project_off_product", lambda d: d)
        monkeypatch.setattr(main, "project_web_product", lambda d: d)
        req = main.BarcodeLookupRequest(barcode=barcode)
        res = await main.barcode_lookup_endpoint(req, authorization="Bearer t")
        return res, seen["web_called"]

    return call


async def test_db_hit_never_calls_exa(endpoint):
    res, web_called = await endpoint(VALID, primary={"n": 1})
    assert res["source"] == "primary_db" and not web_called
    res, web_called = await endpoint(VALID, off={"n": 1})
    assert res["source"] == "open_food_facts" and not web_called


async def test_web_hit(endpoint):
    res, web_called = await endpoint(VALID, web={"norm_name": "X"})
    assert (res["state"], res["source"]) == ("found", "web_search") and web_called


async def test_web_miss_is_a_clean_not_found(endpoint):
    res, web_called = await endpoint(VALID, web=None)
    assert res["state"] == "not_found" and res["product"] is None and web_called
    assert res["message"] == "We couldn't find a product for this barcode."


async def test_bad_check_digit_skips_exa(endpoint):
    res, web_called = await endpoint(BAD_CD)
    assert res["state"] == "not_found" and not web_called


async def test_malformed_barcode_never_reaches_any_tier(endpoint):
    for bad in ("12345", "abc", "3017620422003x"):
        res, web_called = await endpoint(bad)
        assert res["state"] == "invalid_barcode" and not web_called


async def test_exa_busy(endpoint):
    res, _ = await endpoint(VALID, web=ws.ExaBusyError("429"))
    assert res["state"] == "busy" and "busy" in res["message"].lower()


async def test_exa_hard_failure_with_clean_db_misses_is_not_found(endpoint):
    res, _ = await endpoint(VALID, web=RuntimeError("bad key"))
    assert res["state"] == "not_found"


async def test_all_three_tiers_failing_is_error(endpoint):
    res, _ = await endpoint(VALID, primary=RuntimeError("ts"), off=RuntimeError("pg"), web=RuntimeError("exa"))
    assert res["state"] == "error"


async def test_both_dbs_failing_with_exa_clean_miss_is_not_found(endpoint):
    res, _ = await endpoint(VALID, primary=RuntimeError("ts"), off=RuntimeError("pg"), web=None)
    assert res["state"] == "not_found"


async def test_both_dbs_failing_and_check_digit_skip_is_error(endpoint):
    res, _ = await endpoint(BAD_CD, primary=RuntimeError("ts"), off=RuntimeError("pg"))
    assert res["state"] == "error"
