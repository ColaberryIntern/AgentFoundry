#!/usr/bin/env bash
###############################################################################
# Blue-Green Deployment Script
#
# Deploys a new version as the "green" color, verifies health, switches
# traffic, then scales down the old "blue" deployment.
#
# Usage:
#   ./scripts/blue-green-deploy.sh <service> <new-image-tag> [namespace]
#
# Example:
#   ./scripts/blue-green-deploy.sh api-gateway v1.2.3 agent-foundry-production
#
# Requirements:
#   - kubectl configured with cluster access
#   - jq installed
###############################################################################
set -euo pipefail

SERVICE="${1:?Usage: $0 <service> <new-image-tag> [namespace]}"
NEW_TAG="${2:?Usage: $0 <service> <new-image-tag> [namespace]}"
NAMESPACE="${3:-agent-foundry-production}"

BLUE_DEPLOY="${SERVICE}-blue"
GREEN_DEPLOY="${SERVICE}-green"
BG_SERVICE="${SERVICE}-bg"

# Port mapping
declare -A SERVICE_PORTS=(
  ["api-gateway"]=3000
  ["user-service"]=3001
  ["compliance-monitor-service"]=3002
  ["reporting-service"]=3003
  ["ai-recommendation-service"]=3004
  ["notification-service"]=3005
  ["client"]=80
)
PORT="${SERVICE_PORTS[${SERVICE}]:-3000}"

echo "=============================================="
echo "  Blue-Green Deployment"
echo "=============================================="
echo "  Service   : ${SERVICE}"
echo "  New tag   : ${NEW_TAG}"
echo "  Namespace : ${NAMESPACE}"
echo "  Port      : ${PORT}"
echo "=============================================="
echo ""

# ── Step 1: Determine current active color ────────────────
CURRENT_COLOR=$(kubectl get svc "${BG_SERVICE}" -n "${NAMESPACE}" \
  -o jsonpath='{.spec.selector.deployment-color}' 2>/dev/null || echo "blue")
if [ "${CURRENT_COLOR}" = "blue" ]; then
  NEW_COLOR="green"
  OLD_DEPLOY="${BLUE_DEPLOY}"
  NEW_DEPLOY="${GREEN_DEPLOY}"
else
  NEW_COLOR="blue"
  OLD_DEPLOY="${GREEN_DEPLOY}"
  NEW_DEPLOY="${BLUE_DEPLOY}"
fi

echo "[1/6] Current active color: ${CURRENT_COLOR}"
echo "      New deployment color: ${NEW_COLOR}"
echo ""

# ── Step 2: Get current deployment spec as template ───────
echo "[2/6] Creating ${NEW_COLOR} deployment..."

# Check if the base deployment exists to use as template
if kubectl get deployment "${SERVICE}" -n "${NAMESPACE}" > /dev/null 2>&1; then
  TEMPLATE_DEPLOY="${SERVICE}"
elif kubectl get deployment "${OLD_DEPLOY}" -n "${NAMESPACE}" > /dev/null 2>&1; then
  TEMPLATE_DEPLOY="${OLD_DEPLOY}"
else
  echo "ERROR: No existing deployment found for ${SERVICE}"
  exit 1
fi

# Export current deployment, modify it for the new color
kubectl get deployment "${TEMPLATE_DEPLOY}" -n "${NAMESPACE}" -o json | \
  jq --arg name "${NEW_DEPLOY}" \
     --arg color "${NEW_COLOR}" \
     --arg tag "${NEW_TAG}" \
     --arg service "${SERVICE}" \
     '
     .metadata.name = $name |
     del(.metadata.resourceVersion, .metadata.uid, .metadata.creationTimestamp, .status) |
     .spec.template.metadata.labels["deployment-color"] = $color |
     .spec.selector.matchLabels["deployment-color"] = $color |
     .metadata.labels["deployment-color"] = $color |
     (.spec.template.spec.containers[] | select(.name == $service) | .image) |= (split(":")[0] + ":" + $tag)
     ' | kubectl apply -n "${NAMESPACE}" -f -

echo ""

# ── Step 3: Wait for rollout ─────────────────────────────
echo "[3/6] Waiting for ${NEW_COLOR} deployment rollout..."
kubectl rollout status deployment/"${NEW_DEPLOY}" -n "${NAMESPACE}" --timeout=300s
echo ""

# ── Step 4: Health check ─────────────────────────────────
echo "[4/6] Running health checks on ${NEW_COLOR} pods..."
HEALTH_OK=true
GREEN_PODS=$(kubectl get pods -n "${NAMESPACE}" -l "app.kubernetes.io/name=${SERVICE},deployment-color=${NEW_COLOR}" -o jsonpath='{.items[*].metadata.name}')

for pod in ${GREEN_PODS}; do
  # Use kubectl exec to curl the health endpoint inside the pod
  HEALTH_STATUS=$(kubectl exec "${pod}" -n "${NAMESPACE}" -- wget -q -O - "http://localhost:${PORT}/health" 2>/dev/null || echo "FAILED")
  if echo "${HEALTH_STATUS}" | grep -qi "ok\|healthy\|{"; then
    echo "  ${pod}: HEALTHY"
  else
    echo "  ${pod}: UNHEALTHY (${HEALTH_STATUS})"
    HEALTH_OK=false
  fi
done

if [ "${HEALTH_OK}" != "true" ]; then
  echo ""
  echo "ERROR: Health checks failed. Aborting. Rolling back ${NEW_COLOR} deployment."
  kubectl delete deployment "${NEW_DEPLOY}" -n "${NAMESPACE}" --ignore-not-found
  exit 1
fi
echo ""

# ── Step 5: Switch traffic ───────────────────────────────
echo "[5/6] Switching ${BG_SERVICE} selector to ${NEW_COLOR}..."
kubectl patch svc "${BG_SERVICE}" -n "${NAMESPACE}" \
  -p "{\"spec\":{\"selector\":{\"deployment-color\":\"${NEW_COLOR}\"}}}"
echo "      Traffic is now routed to ${NEW_COLOR}."
echo ""

# ── Step 6: Scale down old deployment ────────────────────
echo "[6/6] Scaling down old ${CURRENT_COLOR} deployment..."
if kubectl get deployment "${OLD_DEPLOY}" -n "${NAMESPACE}" > /dev/null 2>&1; then
  kubectl scale deployment "${OLD_DEPLOY}" -n "${NAMESPACE}" --replicas=0
  echo "      ${OLD_DEPLOY} scaled to 0."
else
  echo "      No old deployment to scale down."
fi
echo ""

echo "=============================================="
echo "  Blue-Green deployment complete!"
echo "  Active: ${NEW_COLOR}"
echo "  Service: ${BG_SERVICE} -> ${NEW_DEPLOY}"
echo "=============================================="
