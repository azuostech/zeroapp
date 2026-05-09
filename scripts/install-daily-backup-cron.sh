#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="${PROJECT_ROOT}/scripts/backup-zeroapp.sh"
LOG_FILE="${PROJECT_ROOT}/backups/backup-cron.log"

CRON_SCHEDULE="${CRON_SCHEDULE:-0 12 * * *}"
CRON_MARKER="# zeroapp-daily-backup"
CRON_ENTRY="${CRON_SCHEDULE} /bin/bash '${BACKUP_SCRIPT}' >> '${LOG_FILE}' 2>&1 ${CRON_MARKER}"

TMP_FILE="$(mktemp)"
trap 'rm -f "${TMP_FILE}"' EXIT

crontab -l 2>/dev/null | grep -v "${CRON_MARKER}" > "${TMP_FILE}" || true
echo "${CRON_ENTRY}" >> "${TMP_FILE}"
crontab "${TMP_FILE}"

echo "Rotina diária instalada com sucesso."
echo "Agendamento atual: ${CRON_SCHEDULE}"
echo "Script: ${BACKUP_SCRIPT}"
echo "Log: ${LOG_FILE}"
