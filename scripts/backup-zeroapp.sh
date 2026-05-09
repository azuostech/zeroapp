#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
mkdir -p "${BACKUP_DIR}"

# Senha com caracteres especiais (@ e #) precisa estar URL-encoded no URI.
DEFAULT_DATABASE_URL='postgresql://postgres:26072014%40Acms%23@db.nmjptuaukoyfurnbbczc.supabase.co:5432/postgres'
DATABASE_URL="${DATABASE_URL:-${DEFAULT_DATABASE_URL}}"

LATEST_FILE="${PROJECT_ROOT}/backup_zeroapp.sql"
TIMESTAMP_FILE="${BACKUP_DIR}/backup_zeroapp_$(date +%Y%m%d_%H%M%S).sql"

pg_dump "${DATABASE_URL}" \
  --clean --if-exists --no-owner --no-privileges \
  -f "${LATEST_FILE}"

cp "${LATEST_FILE}" "${TIMESTAMP_FILE}"

echo "Backup concluído: ${LATEST_FILE}"
echo "Backup histórico: ${TIMESTAMP_FILE}"
