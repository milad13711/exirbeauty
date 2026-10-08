#!/usr/bin/env bash
# Calls every scheduled endpoint once. Run it every ~10 minutes from any scheduler (cron, systemd timer, a hosting provider's cron).
#   APP_URL=https://your-domain CRON_SECRET=... ./scripts/cron.sh
set -euo pipefail
: "${APP_URL:?set APP_URL}" "${CRON_SECRET:?set CRON_SECRET}"
for path in sms/cron/run campaigns/cron/run shop/cron/run; do
  printf '%s ' "$path"
  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" "$APP_URL/api/v1/$path" && echo
done
