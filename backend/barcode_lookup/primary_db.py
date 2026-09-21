from config.typesense_client import TS_CLIENT
from agents.langgraph_agent.models.models import OutputSchema

# Common retail barcode formats: EAN-8, UPC-A, EAN-13, GTIN-14.
VALID_BARCODE_LENGTHS = {8, 12, 13, 14}

_ALLOWED_OUT = set(OutputSchema.model_fields)


def normalize_barcode(raw: str) -> str | None:
    """Strip whitespace/hyphens and validate as a well-formed barcode. Purely
    local, no network/DB calls. Returns the cleaned digit string, or None if
    the input isn't a usable barcode."""
    cleaned = "".join(str(raw).split()).replace("-", "")
    if not cleaned.isdigit():
        return None
    if len(cleaned) not in VALID_BARCODE_LENGTHS:
        return None
    return cleaned


def barcode_variants(barcode: str) -> list[str]:
    """All zero-padded forms of `barcode` worth matching against, since the
    same product may be stored as UPC-A, EAN-13, or GTIN-14 depending on
    source (a 12-digit UPC-A is the same product as its 13-digit EAN-13 form
    with a leading zero, etc). Order preserved, de-duplicated."""
    variants = [barcode, barcode.zfill(13), barcode.zfill(14)]
    seen, out = set(), []
    for v in variants:
        if v not in seen:
            seen.add(v)
            out.append(v)
    return out


def query_primary_db(barcode: str) -> dict | None:
    """Exact (variant-aware) lookup of `barcode` in the halal_products
    catalogue. Unlike search_collection(), exceptions are NOT swallowed here —
    they propagate so the caller can tell a real DB error apart from a
    genuine miss."""
    quoted = ",".join(f'"{v}"' for v in barcode_variants(barcode))
    search_parameters = {
        "q": "*",
        "query_by": "norm_name",
        "filter_by": f"barcodes:=[{quoted}]",
        "exclude_fields": "embedding",
        "limit": 1,
    }
    hits = TS_CLIENT.collections["halal_products"].documents.search(search_parameters)["hits"]
    if not hits:
        return None
    return hits[0]["document"]


def project_product(doc: dict) -> dict:
    """Project a raw Typesense document to the client-facing product shape,
    marked verified since it comes from our own catalogue."""
    proj = {k: v for k, v in doc.items() if k in _ALLOWED_OUT}
    proj["verified"] = True
    proj["grounding"] = []
    return proj
