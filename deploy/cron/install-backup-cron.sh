#!/bin/bash
# Install daily rotating SQLite backup cron for bill_mental.
set -e

APP_DIR="${APP_DIR:-/opt/bill_mental}"
BACKUP_SCRIPT="${APP_DIR}/deploy/cron/backup.sh"
CRON_LINE="0 3 * * * APP_DIR=${APP_DIR} ${BACKUP_SCRIPT} >> ${APP_DIR}/backup.log 2>&1"

if [ ! -x "${BACKUP_SCRIPT}" ]; then
  chmod +x "${BACKUP_SCRIPT}"
fi

(crontab -l 2>/dev/null | grep -v "${BACKUP_SCRIPT}" || true; echo "${CRON_LINE}") | crontab -

echo "已安装每日 03:00 自动备份:"
echo "${CRON_LINE}"
