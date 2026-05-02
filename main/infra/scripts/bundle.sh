#!/usr/bin/env bash
# bundle.sh — generate release bundle metadata.
#
# Usage:
#   SHA=<git-sha> ECR_REGISTRY=<registry> ./bundle.sh [output_path]
#
# Output JSON contains:
#   - sha
#   - built_at (ISO8601 UTC)
#   - images.{backend,frontend}
#   - helm.{values_file, values_sha256}
#   - migrations: list of alembic revisions present in repo
#
# Defaults:
#   output_path = artifacts/aentro-bundle-${SHA}.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=_aws_wrap.sh
source "$SCRIPT_DIR/_aws_wrap.sh"

SHA="${SHA:-$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)}"
ECR_REGISTRY="${ECR_REGISTRY:-aentro.dkr.ecr.ap-northeast-1.amazonaws.com}"
OUT="${1:-$REPO_ROOT/artifacts/aentro-bundle-${SHA}.json}"

mkdir -p "$(dirname "$OUT")"

BACKEND_IMAGE="${ECR_REGISTRY}/aentro-backend:${SHA}"
FRONTEND_IMAGE="${ECR_REGISTRY}/aentro-frontend:${SHA}"

VALUES_FILE="${VALUES_FILE:-charts/aentro/values.yaml}"
VALUES_PATH="$REPO_ROOT/$VALUES_FILE"
if [[ -f "$VALUES_PATH" ]]; then
  if command -v sha256sum >/dev/null 2>&1; then
    VALUES_SHA="$(sha256sum "$VALUES_PATH" | awk '{print $1}')"
  else
    VALUES_SHA="$(shasum -a 256 "$VALUES_PATH" | awk '{print $1}')"
  fi
else
  VALUES_SHA="missing"
fi

# Collect alembic migration revisions if present.
MIG_DIR="$REPO_ROOT/backend/alembic/versions"
MIGRATIONS_JSON="[]"
if [[ -d "$MIG_DIR" ]]; then
  MIGRATIONS_JSON="$(
    ls -1 "$MIG_DIR" 2>/dev/null \
      | grep -E '\.py$' \
      | sed 's/\.py$//' \
      | awk 'BEGIN{printf "["} {printf "%s\"%s\"", (NR>1?",":""), $0} END{printf "]"}'
  )"
  [[ -z "$MIGRATIONS_JSON" || "$MIGRATIONS_JSON" == "[" ]] && MIGRATIONS_JSON="[]"
fi

BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

cat > "$OUT" <<EOF
{
  "name": "aentro-bundle-${SHA}",
  "sha": "${SHA}",
  "built_at": "${BUILT_AT}",
  "images": {
    "backend": "${BACKEND_IMAGE}",
    "frontend": "${FRONTEND_IMAGE}"
  },
  "helm": {
    "values_file": "${VALUES_FILE}",
    "values_sha256": "${VALUES_SHA}"
  },
  "migrations": ${MIGRATIONS_JSON}
}
EOF

log "wrote bundle metadata: $OUT"
echo "$OUT"
