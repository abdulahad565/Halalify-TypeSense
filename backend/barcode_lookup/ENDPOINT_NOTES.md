# POST /api/v1/barcode/lookup

## Request
```
POST /api/v1/barcode/lookup
Authorization: Bearer <supabase-user-token>
Content-Type: application/json

{ "barcode": "0011225127397" }
```
Send the raw scan as-is — no need to clean it up client-side, the backend normalizes and validates it. Requires the same Supabase auth token used everywhere else in the app.

## Response
Always 200 with the same envelope, whatever the outcome:
```json
{
  "state": "found | invalid_barcode | not_found | error",
  "source": "primary_db | open_food_facts | null",
  "message": "short human-readable text you can show as-is",
  "barcode": "0011225127397",
  "product": { ... } | null
}
```
Non-200 only happens for auth (`401`, bad/missing token) or rate limiting (`429`).

`"busy"` is in the contract for later but not reachable yet — there's no live third-party call in this version, so nothing currently produces it.

## `state` meanings
- **found** — `product` is populated. Check `source` to know which catalogue answered.
- **invalid_barcode** — not a usable barcode (wrong length / non-digits). Nothing was looked up. Show the message, ask the user to rescan or type it in.
- **not_found** — valid barcode, looked up everywhere we currently check, no match. Normal outcome, not an error.
- **error** — something failed on our side (e.g. a DB connection issue). Show a generic retry message.

## `product.verified` — the important bit for UI
- `source: "primary_db"` → `verified: true`. This is our curated, certified catalogue.
- `source: "open_food_facts"` → `verified: false`. This is community-sourced data mirrored from Open Food Facts, **not verified by us**. Please show this with a distinct "unverified / web-sourced" badge, same treatment as other unverified results elsewhere in the app — don't present it with the same confidence as a verified catalogue hit.

## `product` shape — fields are NOT guaranteed present
`product` fields differ depending on `source`, because the two catalogues carry different data:

- **primary_db** hits carry the full field set: `canonical_id`, `norm_name`, `companies`, `cert_bodies`, `cert_numbers`, `typical_uses`, `marketplace`, `category_l1`, `category_l2`, `halal_status`, `sold_in`, `health_info`, `fda_numbers`, `barcodes`, `source_ids`, `source_files`, `verified`, `grounding`.
- **open_food_facts** hits currently only carry: `barcodes`, `norm_name`, `companies`, `category_l1`, `category_l2`, `sold_in`, `halal_status`, `verified`, `grounding`. Fields like `cert_bodies`, `cert_numbers`, `marketplace`, `fda_numbers`, `canonical_id` etc. are simply **absent from the JSON** for this source — don't treat a missing key as an error, treat it the same as `null`/empty.
- `category_l1`/`category_l2` can be `null` for OFF hits if that product had no category data.
- `grounding` is always `[]` right now (not populated by either source yet).

## ⚠️ `halal_status` spelling differs by source — please normalize/handle both
- `primary_db` uses: `"Halal"`, `"Haraam"` (double-a), `"Mushbooh"`.
- `open_food_facts` uses: `"Haram"` (single-a) or `"Unknown"`.

So the same real-world meaning ("this contains pork/alcohol") shows up as **`"Haraam"` from one source and `"Haram"` from the other** — these are not the same string. Please don't do exact string matching against only one spelling; either handle both spellings explicitly, or ask backend to normalize before you build UI logic around it (flagged on our side too, not fixed yet — happy to normalize server-side if that's easier for you, just say so).

`"Unknown"` (OFF only) means *we don't know* — it is **not** a halal claim, treat it like an absent/unverified status, not as "safe."

## Example responses (all live-tested)

**Found, our catalogue:**
```json
{
  "state": "found", "source": "primary_db",
  "message": "Product found.",
  "barcode": "8854599005203",
  "product": { "canonical_id": "halal_001825", "norm_name": "honey syrup",
    "category_l1": "Food", "category_l2": "Condiment & Spice",
    "halal_status": "Halal", "verified": true, "grounding": [], ... }
}
```

**Found, Open Food Facts (unverified):**
```json
{
  "state": "found", "source": "open_food_facts",
  "message": "Found on Open Food Facts (unverified).",
  "barcode": "0011225127397",
  "product": { "norm_name": "Vienna Sausage", "halal_status": "Haram",
    "verified": false, "grounding": [], "category_l1": null, "category_l2": null }
}
```

**Not found:**
```json
{ "state": "not_found", "source": null, "message": "We couldn't find a product for this barcode.", "barcode": "001122512739", "product": null }
```

## Current coverage (heads up, still growing)
- Our catalogue (`primary_db`): ~200k+ products.
- Open Food Facts mirror (`open_food_facts`): only **20,000 products loaded so far** (being expanded in batches), so a lot of real-world barcodes will still come back `not_found` for now — that's expected, not a bug.
