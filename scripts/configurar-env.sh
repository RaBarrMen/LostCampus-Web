#!/usr/bin/env bash
# Crea los archivos .env de todos los servicios y del frontend a partir de
# las 3 claves de Supabase. Genera automáticamente los secretos internos.
#
# Uso (desde la raíz del proyecto):
#   bash scripts/configurar-env.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

secret() { node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"; }

echo "Configuración de LostCampus (Supabase → Project Settings → API)"
[ -n "${SUPABASE_URL:-}" ] || read -r -p "  Project URL (https://xxxx.supabase.co): " SUPABASE_URL
[ -n "${SUPABASE_ANON_KEY:-}" ] || read -r -p "  anon / publishable key: " SUPABASE_ANON_KEY
[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] || read -r -s -p "  service_role / secret key (no se muestra): " SUPABASE_SERVICE_ROLE_KEY
echo

SUPABASE_URL="${SUPABASE_URL%/}"
if [[ ! "$SUPABASE_URL" =~ ^https://.+\.supabase\.co$ ]]; then
  echo "La URL no parece de Supabase: $SUPABASE_URL" >&2
  exit 1
fi

for f in web/.env services/*/.env; do
  if [ -f "$f" ]; then
    read -r -p "Ya existen archivos .env. ¿Sobrescribirlos? (s/N) " r
    [[ "$r" =~ ^[sS]$ ]] || exit 0
    break
  fi
done

INTERNAL_API_KEY=$(secret)
QR_SECRET=$(secret)
METRICS_TOKEN=$(secret)

comunes="NODE_ENV=development
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
INTERNAL_API_KEY=$INTERNAL_API_KEY
METRICS_TOKEN=$METRICS_TOKEN"

cat > services/api-gateway/.env <<EOF
PORT=4000
$comunes
CORS_ORIGINS=http://localhost:3000
ITEMS_SERVICE_URL=http://localhost:4001
MATCHING_SERVICE_URL=http://localhost:4002
CLAIMS_SERVICE_URL=http://localhost:4003
NOTIFY_SERVICE_URL=http://localhost:4004
RATE_LIMIT_PER_MIN=300
WRITE_LIMIT_PER_MIN=60
EOF

cat > services/items-service/.env <<EOF
PORT=4001
$comunes
MATCHING_SERVICE_URL=http://localhost:4002
EOF

cat > services/matching-service/.env <<EOF
PORT=4002
$comunes
NOTIFY_SERVICE_URL=http://localhost:4004
EOF

cat > services/claims-service/.env <<EOF
PORT=4003
$comunes
NOTIFY_SERVICE_URL=http://localhost:4004
QR_SECRET=$QR_SECRET
EOF

cat > services/notify-service/.env <<EOF
PORT=4004
$comunes
RESEND_API_KEY=
EMAIL_FROM=LostCampus <onboarding@resend.dev>
APP_URL=http://localhost:3000
EOF

cat > web/.env <<EOF
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
NEXT_PUBLIC_ALLOWED_DOMAINS=celaya.tecnm.mx
EOF

chmod 600 web/.env services/*/.env
echo "✓ Se crearon 6 archivos .env (ignorados por Git). Ahora ejecuta: npm run dev"
