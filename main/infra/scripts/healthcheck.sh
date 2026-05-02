#!/usr/bin/env bash
# healthcheck.sh — poll the admin health endpoint after a deploy.
#
# Usage:
#   ./healthcheck.sh <base_url> [max_attempts] [sleep_sec]
#
# Returns 0 once /api/v1/admin/health responds 200, else non-zero after retries.

set -euo pipefail

BASE_URL="${1:-${HEALTHCHECK_URL:-}}"
MAX_ATTEMPTS="${2:-30}"
SLEEP_SEC="${3:-10}"

if [[ -z "${BASE_URL}" ]]; then
  echo "ERROR: base url required (arg 1 or HEALTHCHECK_URL)" >&2
  exit 2
fi

URL="${BASE_URL%/}/api/v1/admin/health"

if [[ "${DRYRUN:-0}" == "1" ]]; then
  echo "[DRYRUN] curl -fsS ${URL} (max ${MAX_ATTEMPTS} attempts, every ${SLEEP_SEC}s)"
  exit 0
fi

attempt=0
until [[ ${attempt} -ge ${MAX_ATTEMPTS} ]]; do
  attempt=$((attempt + 1))
  status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${URL}" || echo "000")"
  if [[ "${status}" == "200" ]]; then
    echo "healthcheck OK (attempt ${attempt}): ${URL}"
    exit 0
  fi
  echo "healthcheck FAIL (attempt ${attempt}/${MAX_ATTEMPTS}, status=${status}); retry in ${SLEEP_SEC}s"
  sleep "${SLEEP_SEC}"
done

echo "ERROR: healthcheck did not pass within ${MAX_ATTEMPTS} attempts" >&2
exit 1
