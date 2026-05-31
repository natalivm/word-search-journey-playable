#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/dist"
OUT_FILE="$OUT_DIR/word-search-journey-playable.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT_FILE"

cd "$ROOT_DIR/playable-ad"
zip -q -9 -r "$OUT_FILE" index.html

BYTES="$(wc -c < "$OUT_FILE" | tr -d ' ')"
KB="$(( (BYTES + 1023) / 1024 ))"

printf 'Created %s (%s KB)\n' "$OUT_FILE" "$KB"
