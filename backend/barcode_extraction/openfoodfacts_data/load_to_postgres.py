import json
import os
import re
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

FILE = Path(__file__).resolve().parent / "products_10000.jsonl"
BATCH = 500

DB = dict(
    host="localhost",
    port=5433,                       # the tunnel
    dbname="halalone",
    user="halalone_user",
    password=os.environ.get("DB_PASSWORD"),
)

HARAM_RE = re.compile(r"\bpork\b|(?<!non )\balcoholic beverages\b|\bbeers?\b")
NOT_ALCOHOL_RE = re.compile(r"\b(root|ginger) beers?\b")
LANG_PREFIX = re.compile(r"^[a-z]{2,3}:")


def clean_text(v):
    if not isinstance(v, str):
        return None
    v = v.replace("\x00", "").strip()
    return v or None


def clean_tags(tags):
    if not tags:
        return None
    seen, out = set(), []
    for t in tags:
        if not isinstance(t, str):
            continue
        t = LANG_PREFIX.sub("", t.strip())
        t = t.replace("-", " ").replace("_", " ").strip()
        if not t or t.lower() == "undefined":
            continue
        t = " ".join(w.capitalize() for w in t.split())
        if t not in seen:
            seen.add(t)
            out.append(t)
    return out or None


def halal_status(name, categories, ingredients):
    text = " ".join([
        name or "",
        " ".join(categories or []),
        ingredients or "",
    ]).lower()
    text = NOT_ALCOHOL_RE.sub(" ", text)
    return "Haram" if HARAM_RE.search(text) else "Unknown"


def to_row(p):
    barcode = clean_text(p.get("code"))
    if not barcode:
        return None
    name = clean_text(p.get("product_name"))
    brands = clean_tags(p.get("brands_tags"))
    cats = clean_tags(p.get("categories_tags"))
    countries = clean_tags(p.get("countries_tags"))
    made = clean_tags(p.get("manufacturing_places_tags"))
    ingredients = clean_text(p.get("ingredients_text_en"))
    link = clean_text(p.get("link"))
    return (barcode, name, brands, cats, countries, made, ingredients, link,
            halal_status(name, cats, ingredients))


SQL = """
INSERT INTO products
  (barcode, name_of_product, brand_company, categories, countries_sold,
   manufactured, ingredients, product_link, halal_status)
VALUES %s
ON CONFLICT (barcode) DO NOTHING
"""


def main():
    if not DB["password"]:
        sys.exit("Set the password first:  export DB_PASSWORD='your_password'")

    conn = psycopg2.connect(**DB)
    cur = conn.cursor()
    batch, total = [], 0

    with open(FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = to_row(json.loads(line))
            if row:
                batch.append(row)
            if len(batch) >= BATCH:
                execute_values(cur, SQL, batch)
                conn.commit()
                total += len(batch)
                batch = []
                print(f"\r{total} processed", end="", flush=True)

    if batch:
        execute_values(cur, SQL, batch)
        conn.commit()
        total += len(batch)

    print(f"\nDone: {total} processed")
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()