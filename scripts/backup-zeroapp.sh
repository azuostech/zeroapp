#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
mkdir -p "${BACKUP_DIR}"

DATABASE_URL="${DATABASE_URL:-}"
if [[ -z "${DATABASE_URL}" ]]; then
  # Carrega variáveis locais de ambiente se existirem.
  for ENV_FILE in "${PROJECT_ROOT}/.env" "${PROJECT_ROOT}/.env.local"; do
    if [[ -f "${ENV_FILE}" ]]; then
      set -a
      # shellcheck disable=SC1090
      source "${ENV_FILE}"
      set +a
    fi
  done
  DATABASE_URL="${DATABASE_URL:-}"
fi

if [[ -z "${DATABASE_URL}" ]]; then
  cat >&2 <<'EOF'
Erro: variável DATABASE_URL não definida.

Como resolver:
1) No Supabase Dashboard, clique em Connect e copie a connection string (Direct ou Session pooler).
2) Execute novamente informando a variável, por exemplo:
   DATABASE_URL='postgresql://usuario:senha@host:porta/postgres' ./scripts/backup-zeroapp.sh
EOF
  exit 1
fi

AT_COUNT="$(printf '%s' "${DATABASE_URL#*://}" | awk -F'@' '{print NF-1}')"
if (( AT_COUNT > 1 )); then
  cat >&2 <<'EOF'
Erro: DATABASE_URL parece inválida (há mais de um '@').
Isso normalmente acontece quando a senha contém '@' e não está URL-encoded.
Exemplo: '@' -> '%40' e '#' -> '%23'
EOF
  exit 1
fi

LATEST_FILE="${PROJECT_ROOT}/backup_zeroapp.sql"
TIMESTAMP_FILE="${BACKUP_DIR}/backup_zeroapp_$(date +%Y%m%d_%H%M%S).sql"

PG_DUMP_ERR="$(mktemp)"
trap 'rm -f "${PG_DUMP_ERR}"' EXIT

if ! pg_dump "${DATABASE_URL}" \
  --clean --if-exists --no-owner --no-privileges \
  -f "${LATEST_FILE}" 2>"${PG_DUMP_ERR}"; then
  cat "${PG_DUMP_ERR}" >&2

  if grep -Eq "could not translate host name" "${PG_DUMP_ERR}"; then
    cat >&2 <<'EOF'

Dica: em projetos Supabase, esse erro geralmente indica:
1) host direto `db.<project-ref>.supabase.co` em rede sem IPv6
2) `project_ref` desatualizado

Use a connection string de Session pooler no botão `Connect` do Supabase
(host `aws-0-<region>.pooler.supabase.com`, porta 5432).
EOF
  elif grep -Eq "tenant/user .* not found|Tenant or user not found|no tenant identifier provided" "${PG_DUMP_ERR}"; then
    cat >&2 <<'EOF'

Dica: pooler alcançado, mas tenant/usuário inválido.
Revise no Supabase `Connect`:
- host/região do pooler
- usuário (ex.: `postgres.<project_ref>`)
- senha com URL encoding (`@` -> `%40`, `#` -> `%23`)
EOF
  fi

  exit 1
fi

cp "${LATEST_FILE}" "${TIMESTAMP_FILE}"

echo "Backup concluído: ${LATEST_FILE}"
echo "Backup histórico: ${TIMESTAMP_FILE}"
