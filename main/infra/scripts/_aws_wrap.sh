#!/usr/bin/env bash
# Common helper sourced by other scripts. Provides `aws_run` which respects DRYRUN=1.
# When DRYRUN=1 (or "true") is set, every aws CLI call is echoed instead of executed.

set -euo pipefail

DRYRUN="${DRYRUN:-0}"

aws_run() {
  if [[ "${DRYRUN}" == "1" || "${DRYRUN}" == "true" ]]; then
    echo "[DRYRUN] aws $*"
  else
    aws "$@"
  fi
}

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >&2
}

require() {
  local var="$1"
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: required env/arg '$var' is empty" >&2
    exit 2
  fi
}
