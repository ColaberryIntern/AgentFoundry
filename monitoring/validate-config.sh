#!/usr/bin/env bash
###############################################################################
# validate-config.sh — Validate monitoring configuration files
#
# Checks:
#   1. prometheus.yml is valid YAML
#   2. alerts.yml is valid YAML
#   3. All Grafana dashboard JSON files are valid JSON
#
# Exit code 0 = all checks pass, non-zero = at least one failure.
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PASS=0
FAIL=0

# --------------------------------------------------------------------------
# Helper: validate YAML (uses python as a portable YAML parser)
# --------------------------------------------------------------------------
validate_yaml() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "FAIL  $file (file not found)"
    FAIL=$((FAIL + 1))
    return
  fi

  if python3 -c "import yaml, sys; yaml.safe_load(open(sys.argv[1]))" "$file" 2>/dev/null; then
    echo "PASS  $file"
    PASS=$((PASS + 1))
  elif python -c "import yaml, sys; yaml.safe_load(open(sys.argv[1]))" "$file" 2>/dev/null; then
    echo "PASS  $file"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $file (invalid YAML)"
    FAIL=$((FAIL + 1))
  fi
}

# --------------------------------------------------------------------------
# Helper: validate JSON
# --------------------------------------------------------------------------
validate_json() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "FAIL  $file (file not found)"
    FAIL=$((FAIL + 1))
    return
  fi

  if python3 -c "import json, sys; json.load(open(sys.argv[1]))" "$file" 2>/dev/null; then
    echo "PASS  $file"
    PASS=$((PASS + 1))
  elif python -c "import json, sys; json.load(open(sys.argv[1]))" "$file" 2>/dev/null; then
    echo "PASS  $file"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $file (invalid JSON)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=========================================="
echo "Agent Foundry — Monitoring Config Validator"
echo "=========================================="
echo ""

# Prometheus config
echo "--- Prometheus ---"
validate_yaml "$SCRIPT_DIR/prometheus/prometheus.yml"
validate_yaml "$SCRIPT_DIR/prometheus/alerts.yml"

# AlertManager config
echo ""
echo "--- AlertManager ---"
validate_yaml "$SCRIPT_DIR/alertmanager/alertmanager.yml"

# Grafana provisioning
echo ""
echo "--- Grafana Provisioning ---"
validate_yaml "$SCRIPT_DIR/grafana/provisioning/datasources/prometheus.yml"
validate_yaml "$SCRIPT_DIR/grafana/provisioning/dashboards/dashboards.yml"

# Grafana dashboards (JSON)
echo ""
echo "--- Grafana Dashboards ---"
for dashboard in "$SCRIPT_DIR"/grafana/dashboards/*.json; do
  validate_json "$dashboard"
done

echo ""
echo "=========================================="
echo "Results: $PASS passed, $FAIL failed"
echo "=========================================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
