#!/bin/bash
# =====================================================
# 每日备份 SQLite → S3（循环覆盖 7 天）
# crontab: 0 3 * * * /opt/bill/deploy/cron/backup.sh
# =====================================================
set -e
cd /opt/bill
source .env 2>/dev/null || true

DB="${DB_PATH:-/opt/bill/bill.db}"
SLOT=$(( $(date +%u) ))
TMP="/tmp/bill-backup-${SLOT}.db"
KEY="backups/bill-${SLOT}.db"

echo "[$(date '+%F %T')] 备份: ${DB} → s3://${S3_BUCKET}/${KEY}"

cp "${DB}" "${TMP}"
./bill backup "${TMP}" "${KEY}"
rm -f "${TMP}"

echo "[$(date '+%F %T')] 完成"
