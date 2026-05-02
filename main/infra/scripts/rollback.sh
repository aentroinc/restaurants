#!/usr/bin/env bash
# rollback.sh — roll an ECS service back to a previous task definition revision.
#
# Usage:
#   ./rollback.sh <env> <target_sha>
#   DRYRUN=1 ./rollback.sh prod abc123
#
# Strategy:
#   - Find the most recent ACTIVE task definition revision in family
#     `aentro-<env>-<service>` whose container image tag equals <target_sha>.
#   - If found, update-service to that revision.
#   - If not found, fall back to PREVIOUS revision (currentRevision-1).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_aws_wrap.sh
source "$SCRIPT_DIR/_aws_wrap.sh"

ENV="${1:-}"
TARGET_SHA="${2:-}"
require ENV
require TARGET_SHA

AWS_REGION="${AWS_REGION:-ap-northeast-1}"
CLUSTER="aentro-${ENV}"

for service in backend frontend; do
  FAMILY="aentro-${ENV}-${service}"
  log "rollback ${service} in ${ENV} -> ${TARGET_SHA}"

  if [[ "${DRYRUN:-0}" == "1" ]]; then
    aws_run ecs list-task-definitions \
      --family-prefix "${FAMILY}" \
      --status ACTIVE \
      --sort DESC \
      --region "${AWS_REGION}"
    aws_run ecs update-service \
      --cluster "${CLUSTER}" \
      --service "aentro-${ENV}-${service}" \
      --task-definition "${FAMILY}:<rev-with-${TARGET_SHA}>" \
      --region "${AWS_REGION}"
    continue
  fi

  REVS_JSON="$(aws ecs list-task-definitions \
    --family-prefix "${FAMILY}" \
    --status ACTIVE \
    --sort DESC \
    --region "${AWS_REGION}" \
    --output json)"

  TARGET_TD=""
  for arn in $(echo "${REVS_JSON}" | jq -r '.taskDefinitionArns[]' | head -n 25); do
    IMAGE="$(aws ecs describe-task-definition \
      --task-definition "${arn}" \
      --region "${AWS_REGION}" \
      --query 'taskDefinition.containerDefinitions[0].image' \
      --output text 2>/dev/null || echo "")"
    if [[ "${IMAGE}" == *":${TARGET_SHA}" || "${IMAGE}" == *":${TARGET_SHA}-"* ]]; then
      TARGET_TD="${arn}"
      break
    fi
  done

  if [[ -z "${TARGET_TD}" ]]; then
    # Fallback: previous revision (index 1).
    TARGET_TD="$(echo "${REVS_JSON}" | jq -r '.taskDefinitionArns[1] // empty')"
    log "WARN: no exact match for ${TARGET_SHA}; falling back to previous revision: ${TARGET_TD:-<none>}"
  fi

  if [[ -z "${TARGET_TD}" ]]; then
    log "ERROR: could not determine rollback target for ${service}"
    exit 3
  fi

  aws_run ecs update-service \
    --cluster "${CLUSTER}" \
    --service "aentro-${ENV}-${service}" \
    --task-definition "${TARGET_TD}" \
    --region "${AWS_REGION}"
done

log "rollback complete: ${ENV} -> ${TARGET_SHA}"
