import gzip
import itertools
import json
import os
import time
from pathlib import Path

SRC = Path("/mnt/c/Users/HP/Documents/projects/openfoodfacts-products.jsonl.gz")

OUT_DIR = Path(__file__).resolve().parent
WORK = OUT_DIR / "products_10000.jsonl"              # safe working file
CHECKPOINT = OUT_DIR / "products_10000.checkpoint.json"
FINAL = OUT_DIR / "products_10000.json"              # final single JSON array

TOTAL = 20000        # number of source products to process
BATCH_SIZE = 100     # change to 50 if you prefer


def slim(p):
    return {
        "code": p.get("code"),
        "product_name": p.get("product_name") or p.get("product_name_en"),
        "brands_tags": p.get("brands_tags"),
        "categories_tags": p.get("categories_tags"),
        "countries_tags": p.get("countries_tags"),
        "manufacturing_places_tags": p.get("manufacturing_places_tags"),
        "ingredients_text_en": p.get("ingredients_text_en"),
        "link": p.get("link"),
    }


def load_checkpoint():
    if CHECKPOINT.exists() and WORK.exists():
        try:
            cp = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
            return cp["src_lines"], cp["out_bytes"]
        except (json.JSONDecodeError, KeyError):
            pass
    return 0, 0


def save_checkpoint(src_lines, out_bytes):
    tmp = CHECKPOINT.with_suffix(".tmp")
    tmp.write_text(json.dumps({"src_lines": src_lines, "out_bytes": out_bytes}),
                   encoding="utf-8")
    os.replace(tmp, CHECKPOINT)  # atomic


def build_final_json():
    """Turn the JSONL working file into one JSON array (streamed, low memory)."""
    tmp = FINAL.with_suffix(".tmp")
    first = True
    with open(WORK, "r", encoding="utf-8") as fin, \
         open(tmp, "w", encoding="utf-8") as fout:
        fout.write("[\n")
        for line in fin:
            line = line.strip()
            if not line:
                continue
            if not first:
                fout.write(",\n")
            fout.write(line)
            first = False
        fout.write("\n]\n")
    os.replace(tmp, FINAL)


def main():
    if not SRC.exists():
        raise SystemExit(f"Source file not found: {SRC}")

    src_lines, out_bytes = load_checkpoint()
    resuming = src_lines > 0
    if resuming:
        print(f"Resuming from product {src_lines}/{TOTAL}")

    start = time.time()

    with gzip.open(SRC, "rt", encoding="utf-8") as src, \
         open(WORK, "r+b" if resuming else "wb") as out:

        if resuming:
            out.truncate(out_bytes)   # drop anything written after last checkpoint
            out.seek(0, os.SEEK_END)
            for _ in itertools.islice(src, src_lines):  # skip already-done lines
                pass

        while src_lines < TOTAL:
            want = min(BATCH_SIZE, TOTAL - src_lines)
            lines = list(itertools.islice(src, want))
            if not lines:
                break  # reached end of file

            chunks = []
            for line in lines:
                try:
                    p = slim(json.loads(line))
                except json.JSONDecodeError:
                    continue  # skip broken/truncated line
                chunks.append(json.dumps(p, ensure_ascii=False) + "\n")

            data = "".join(chunks).encode("utf-8")
            out.write(data)
            out.flush()
            os.fsync(out.fileno())

            src_lines += len(lines)
            out_bytes += len(data)
            save_checkpoint(src_lines, out_bytes)

            pct = src_lines / TOTAL * 100
            print(f"\r{src_lines}/{TOTAL} ({pct:.1f}%)  {time.time() - start:.1f}s",
                  end="", flush=True)

    print("\nBuilding final JSON file...")
    build_final_json()
    print(f"Done -> {FINAL}")


if __name__ == "__main__":
    main()