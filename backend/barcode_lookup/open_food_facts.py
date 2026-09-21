from psycopg2.extras import RealDictCursor
from config.off_postgres_client import get_connection
from .primary_db import barcode_variants
from agents.langgraph_agent.models.models import OutputSchema

_ALLOWED_OUT = set(OutputSchema.model_fields)

_SELECT = """
    SELECT barcode, name_of_product, brand_company, categories,
           countries_sold, halal_status
    FROM products
    WHERE barcode = ANY(%s)
"""


def query_off_db(barcode: str) -> dict | None:
    """Exact (variant-aware) lookup of `barcode` in the Open Food
    Facts-derived Postgres mirror. Exceptions propagate — a connection/query
    failure is NOT the same as a genuine miss, and the caller must surface it
    as state=error, not not_found."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(_SELECT, (barcode_variants(barcode),))
            row = cur.fetchone()
    finally:
        conn.close()
    return dict(row) if row else None


def project_off_product(row: dict) -> dict:
    """Project an OFF-mirror row into the same client-facing product shape
    used for primary_db hits, so the API response stays unchanged regardless
    of which source answered."""
    categories = row.get("categories") or []
    raw = {
        "barcodes": [row["barcode"]],
        "norm_name": row.get("name_of_product"),
        "companies": row.get("brand_company"),
        "category_l1": categories[0] if len(categories) > 0 else None,
        "category_l2": categories[1] if len(categories) > 1 else None,
        "sold_in": row.get("countries_sold"),
        "halal_status": row.get("halal_status"),
    }
    proj = {k: v for k, v in raw.items() if k in _ALLOWED_OUT}
    proj["verified"] = False
    proj["grounding"] = []
    return proj
