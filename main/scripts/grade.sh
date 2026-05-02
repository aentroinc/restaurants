#!/usr/bin/env bash
set -uo pipefail
PASS=0; FAIL=0

check() {
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "✓ $desc"; PASS=$((PASS + 1))
  else
    echo "✗ $desc"; FAIL=$((FAIL + 1))
  fi
}

# resolve repo root relative to this script
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== S0 Grade ==="

# Check no broken paths
check "No broken /api/v1/recipes path" \
  bash -c '! grep -r "/api/v1/recipes\"" '"$ROOT"'/frontend/src/app/recipes/'
check "No broken /api/v1/labor/ path" \
  bash -c '! grep -rE "/api/v1/labor/(shifts|compliance)" '"$ROOT"'/frontend/src/app/labor/'
check "No broken /api/v1/qsc/ path" \
  bash -c '! grep -r "/api/v1/qsc/" '"$ROOT"'/frontend/src/app/qsc/'
check "No broken /api/v1/haccp/ path" \
  bash -c '! grep -r "/api/v1/haccp/" '"$ROOT"'/frontend/src/app/haccp/'
check "No broken /api/v1/franchise/ path" \
  bash -c '! grep -r "/api/v1/franchise/" '"$ROOT"'/frontend/src/app/franchise/'
check "No broken /api/v1/admin/roles path" \
  bash -c '! grep -r "/api/v1/admin/roles" '"$ROOT"'/frontend/src/app/admin/roles/'

# Check AI chat SSE (streamChat imported from ai-stream which hits /ai/chat)
check "AI chat uses streamChat SSE" \
  grep -r "streamChat" "$ROOT/frontend/src/app/ai-analyst/"

# Check ai-stream.ts exists
check "ai-stream.ts exists" \
  test -f "$ROOT/frontend/src/lib/ai-stream.ts"

# Check prompt caching blocks
check "system_prompt has build_system_blocks" \
  grep -q "build_system_blocks" "$ROOT/backend/app/services/ai/system_prompt.py"

# Check model tier
check "client.py has MODEL_MAP" \
  grep -q "MODEL_MAP" "$ROOT/backend/app/services/ai/client.py"
check "ai_chat.py has model_tier" \
  grep -q "model_tier" "$ROOT/backend/app/api/v1/ai_chat.py"

# Check endpoints return 200 (only if server is running)
if curl -sf --max-time 3 http://localhost:8000/health >/dev/null 2>&1; then
  for ep in /api/v1/vertical/recipes /api/v1/vertical/labor/compliance-report /api/v1/vertical/qsc/summary /api/v1/rbac/roles; do
    check "API $ep returns 200" \
      bash -c "curl -sf --max-time 5 http://localhost:8000$ep >/dev/null"
  done
else
  echo "(skipping live API checks — server not running)"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
