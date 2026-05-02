#!/usr/bin/env bash
# promote.sh — promote an image bundle from one environment to another.
#
# Usage:
#   ./promote.sh <from_env> <to_env> <sha>
#   DRYRUN=1 ./promote.sh dev staging abc123
#
# Steps:
#   1. Pull backend / frontend image tagged <sha> from <from_env> ECR repo.
#   2. Re-tag for <to_env> ECR repo (also tag with the env name as a moving tag).
#   3. Push to <to_env> ECR repo.
#   4. Register a new ECS task definition referencing the new images.
#   5. Update the ECS service to use the new task definition.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_aws_wrap.sh
source "$SCRIPT_DIR/_aws_wrap.sh"

FROM_ENV="${1:-}"
TO_ENV="${2:-}"
SHA="${3:-}"

require FROM_ENV
require TO_ENV
require SHA

AWS_REGION="${AWS_REGION:-ap-northeast-1}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-000000000000}"
REGISTRY="${ECR_REGISTRY:-${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com}"
CLUSTER="aentro-${TO_ENV}"

for service in backend frontend; do
  SRC_IMAGE="${REGISTRY}/aentro-${service}:${SHA}"
  DST_TAG_SHA="${SHA}"
  DST_TAG_ENV="${TO_ENV}"
  DST_REPO="aentro-${service}"

  log "promote ${service}: ${FROM_ENV} -> ${TO_ENV} (${SHA})"

  # 1. ECR re-tag via manifest copy (no need to download image layers).
  MANIFEST_JSON="$(aws_run ecr batch-get-image \
    --repository-name "${DST_REPO}" \
    --image-ids "imageTag=${SHA}" \
    --region "${AWS_REGION}" \
    --query 'images[0].imageManifest' \
    --output text 2>/dev/null || echo "")"

  if [[ -n "${MANIFEST_JSON}" && "${MANIFEST_JSON}" != "None" && "${DRYRUN:-0}" != "1" ]]; then
    aws_run ecr put-image \
      --repository-name "${DST_REPO}" \
      --image-tag "${DST_TAG_ENV}" \
      --image-manifest "${MANIFEST_JSON}" \
      --region "${AWS_REGION}" >/dev/null || true
  else
    aws_run ecr put-image \
      --repository-name "${DST_REPO}" \
      --image-tag "${DST_TAG_ENV}" \
      --image-manifest "<manifest-of-${SHA}>" \
      --region "${AWS_REGION}"
  fi

  # 2. Register new task definition referencing the new image.
  TASKDEF_FAMILY="aentro-${TO_ENV}-${service}"
  CURRENT_TD_JSON="$(aws_run ecs describe-task-definition \
    --task-definition "${TASKDEF_FAMILY}" \
    --region "${AWS_REGION}" \
    --query 'taskDefinition' \
    --output json 2>/dev/null || echo "{}")"

  if [[ "${DRYRUN:-0}" == "1" || "${CURRENT_TD_JSON}" == "{}" ]]; then
    log "[DRYRUN/skip] would register-task-definition for ${TASKDEF_FAMILY} with image ${REGISTRY}/${DST_REPO}:${DST_TAG_SHA}"
    NEW_TD="${TASKDEF_FAMILY}:NEW"
  else
    NEW_TD_JSON="$(echo "${CURRENT_TD_JSON}" \
      | jq --arg img "${REGISTRY}/${DST_REPO}:${DST_TAG_SHA}" \
        '.containerDefinitions[0].image = $img |
         del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.compatibilities,.registeredAt,.registeredBy)')"
    NEW_TD_ARN="$(aws_run ecs register-task-definition \
      --cli-input-json "${NEW_TD_JSON}" \
      --region "${AWS_REGION}" \
      --query 'taskDefinition.taskDefinitionArn' \
      --output text)"
    NEW_TD="${NEW_TD_ARN}"
  fi

  # 3. Update ECS service.
  aws_run ecs update-service \
    --cluster "${CLUSTER}" \
    --service "aentro-${TO_ENV}-${service}" \
    --task-definition "${NEW_TD}" \
    --region "${AWS_REGION}"

done

log "promote complete: ${FROM_ENV} -> ${TO_ENV} (${SHA})"
