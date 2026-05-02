#!/usr/bin/env bash
# AENTRO Restaurant OS — Lighthouse audit for the three PWA apps.
#
# Usage:
#   BASE_URL=https://restaurants.example.com bash scripts/lighthouse.sh
#   bash scripts/lighthouse.sh                     # defaults to http://localhost:3000
#
# Requires: npx (lighthouse is fetched on demand). Headless Chrome is auto-started.
# Output:   ./lighthouse-reports/<role>-<ts>.html|.json
#
# CI thresholds (override via env):
#   PWA_MIN=90  A11Y_MIN=95  PERF_MIN=70  BP_MIN=85  SEO_MIN=85
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
PWA_MIN="${PWA_MIN:-90}"
A11Y_MIN="${A11Y_MIN:-95}"
PERF_MIN="${PERF_MIN:-70}"
BP_MIN="${BP_MIN:-85}"
SEO_MIN="${SEO_MIN:-85}"

OUT_DIR="${OUT_DIR:-./lighthouse-reports}"
mkdir -p "$OUT_DIR"
TS="$(date +%Y%m%d-%H%M%S)"

ROLES=("staff" "manager" "sv")
FAIL=0

for role in "${ROLES[@]}"; do
  url="${BASE_URL}/${role}"
  out_html="${OUT_DIR}/${role}-${TS}.html"
  out_json="${OUT_DIR}/${role}-${TS}.json"
  echo ">> Auditing ${url}"

  npx --yes lighthouse "$url" \
    --quiet \
    --chrome-flags="--headless=new --no-sandbox" \
    --preset=desktop \
    --output=html --output=json \
    --output-path="${OUT_DIR}/${role}-${TS}" \
    --only-categories=performance,accessibility,best-practices,seo,pwa \
    || { echo "lighthouse failed for ${role}"; FAIL=1; continue; }

  # Parse top-level scores
  perf=$(node -e "console.log(Math.round(require('${out_json}').categories.performance.score*100))")
  a11y=$(node -e "console.log(Math.round(require('${out_json}').categories.accessibility.score*100))")
  bp=$(node -e "console.log(Math.round(require('${out_json}').categories['best-practices'].score*100))")
  seo=$(node -e "console.log(Math.round(require('${out_json}').categories.seo.score*100))")
  pwa=$(node -e "const c=require('${out_json}').categories.pwa; console.log(c?Math.round(c.score*100):0)")

  printf "   %-8s perf=%s  a11y=%s  bp=%s  seo=%s  pwa=%s\n" "$role" "$perf" "$a11y" "$bp" "$seo" "$pwa"

  [ "$perf" -lt "$PERF_MIN" ] && { echo "   FAIL perf<${PERF_MIN}"; FAIL=1; }
  [ "$a11y" -lt "$A11Y_MIN" ] && { echo "   FAIL a11y<${A11Y_MIN}"; FAIL=1; }
  [ "$bp"   -lt "$BP_MIN"   ] && { echo "   FAIL bp<${BP_MIN}"; FAIL=1; }
  [ "$seo"  -lt "$SEO_MIN"  ] && { echo "   FAIL seo<${SEO_MIN}"; FAIL=1; }
  [ "$pwa"  -lt "$PWA_MIN"  ] && { echo "   FAIL pwa<${PWA_MIN}"; FAIL=1; }
done

if [ "$FAIL" -ne 0 ]; then
  echo "Lighthouse: at least one threshold failed. Reports in ${OUT_DIR}/"
  exit 1
fi
echo "Lighthouse: all thresholds met."
