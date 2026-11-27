# Reparto del trabajo de LostCampus.
# Cada parte es una rama feature/* con uno o varios commits.
# Formato de cada commit:  "mensaje del commit::ruta1;ruta2;ruta3"
#
#   Uriel  → base del monorepo, base de datos, common, gateway, matching, claims, despliegue
#   Rafael → items, notify, frontend (web), documentación y pruebas de API/carga/e2e

declare -A DUENO RAMA

# ---------------------------------------------------------------- Uriel
DUENO[base-datos]="Uriel"
RAMA[base-datos]="feature/base-datos"
COMMITS_base_datos=(
  "feat(db): esquema de tablas, tipos y triggers::infra/supabase/migrations/001_schema.sql"
  "feat(db): políticas RLS y realtime::infra/supabase/migrations/002_rls.sql"
  "feat(db): bucket privado de imágenes y datos iniciales::infra/supabase/migrations/003_storage.sql;infra/supabase/seed.sql"
  "test(db): pruebas de seguridad de RLS con PGlite::tests/db"
)

DUENO[common]="Uriel"
RAMA[common]="feature/common"
COMMITS_common=(
  "feat(common): configuración, errores y clientes de Supabase::packages/common/package.json;packages/common/src/config.js;packages/common/src/errors.js;packages/common/src/supabase.js;packages/common/src/campus.js"
  "feat(common): seguridad entre servicios y validación::packages/common/src/internal.js;packages/common/src/validate.js;packages/common/src/http.js;packages/common/src/images.js"
  "feat(common): app base con helmet, logs y métricas::packages/common/src/app.js;packages/common/src/metrics.js;packages/common/src/index.js"
  "test(common): pruebas de clave interna y roles::packages/common/test"
)

DUENO[api-gateway]="Uriel"
RAMA[api-gateway]="feature/api-gateway"
COMMITS_api_gateway=(
  "feat(gateway): verificación de JWT y caché de sesiones::services/api-gateway/package.json;services/api-gateway/.env.example;services/api-gateway/src/auth.js"
  "feat(gateway): proxy, CORS, rate limit y Swagger::services/api-gateway/src/app.js;services/api-gateway/src/routes.js;services/api-gateway/src/index.js;docs/openapi.yaml"
  "test(gateway): pruebas de autenticación, CORS y encabezados::services/api-gateway/test"
)

DUENO[matching]="Uriel"
RAMA[matching]="feature/matching-service"
COMMITS_matching=(
  "feat(matching): algoritmo de puntuación de coincidencias::services/matching-service/package.json;services/matching-service/.env.example;services/matching-service/src/scoring.js"
  "test(matching): casos del algoritmo::services/matching-service/test"
  "feat(matching): rutas y ejecución del matching::services/matching-service/src/app.js;services/matching-service/src/index.js"
)

DUENO[claims]="Uriel"
RAMA[claims]="feature/claims-service"
COMMITS_claims=(
  "feat(claims): QR firmado de un solo uso::services/claims-service/package.json;services/claims-service/.env.example;services/claims-service/src/qr.js"
  "feat(claims): reclamos, aprobación, chat y entrega::services/claims-service/src/app.js;services/claims-service/src/index.js"
  "test(claims): pruebas del QR y validaciones::services/claims-service/test"
)

DUENO[despliegue]="Uriel"
RAMA[despliegue]="chore/despliegue"
COMMITS_despliegue=(
  "chore: blueprint de Render::render.yaml"
  "ci: pruebas y build en GitHub Actions, Dependabot y plantilla de PR::.github"
  "chore: scripts de configuración y de Git::scripts"
)

# ---------------------------------------------------------------- Rafael
DUENO[items]="Rafael"
RAMA[items]="feature/items-service"
COMMITS_items=(
  "feat(items): esquemas de validación de reportes::services/items-service/package.json;services/items-service/.env.example;services/items-service/src/schemas.js"
  "feat(items): CRUD de reportes, perfil y estadísticas::services/items-service/src/app.js;services/items-service/src/index.js"
  "test(items): validaciones y seguridad HTTP::services/items-service/test"
)

DUENO[notify]="Rafael"
RAMA[notify]="feature/notify-service"
COMMITS_notify=(
  "feat(notify): notificaciones en la app::services/notify-service/package.json;services/notify-service/.env.example;services/notify-service/src/app.js;services/notify-service/src/index.js"
  "feat(notify): correos con Resend::services/notify-service/src/email.js"
  "test(notify): validación de enlaces y escape de HTML::services/notify-service/test"
)

DUENO[web-base]="Rafael"
RAMA[web-base]="feature/web-base"
COMMITS_web_base=(
  "feat(web): configuración de Next.js, Tailwind y cabeceras de seguridad::web/package.json;web/next.config.mjs;web/postcss.config.mjs;web/jsconfig.json;web/.env.example;web/app/globals.css;web/app/layout.js"
  "feat(web): cliente de API, Supabase y utilidades::web/lib"
  "feat(web): componentes base, sesión y tema::web/components/AuthProvider.js;web/components/ThemeToggle.js;web/components/ui.js;web/components/AuthShell.js"
  "feat(web): página de inicio, login y registro::web/app/page.js;web/app/login;web/app/registro;web/app/not-found.js"
)

DUENO[web-app]="Rafael"
RAMA[web-app]="feature/web-app"
COMMITS_web_app=(
  "feat(web): layout de la app y notificaciones en vivo::web/app/(app)/layout.js;web/components/NotificationBell.js"
  "feat(web): feed con filtros y tarjetas de objetos::web/app/(app)/inicio;web/components/ItemCard.js;web/components/useCategories.js"
  "feat(web): mapa del campus con Leaflet::web/components/CampusMap.js;web/components/MapLoader.js;web/app/(app)/mapa"
  "feat(web): formulario de reporte por pasos::web/app/(app)/reportar"
  "feat(web): detalle del objeto, coincidencias y mis reportes::web/app/(app)/objeto;web/app/(app)/mis-reportes"
  "feat(web): reclamos, chat y código QR::web/app/(app)/reclamos;web/app/(app)/escanear"
  "feat(web): panel de administración y perfil::web/app/(app)/admin;web/app/(app)/perfil"
)

DUENO[docs]="Rafael"
RAMA[docs]="docs/documentacion"
COMMITS_docs=(
  "docs: manual de usuario y de desarrollador::docs/manual-usuario.md;docs/desarrollador.md;docs/equipo.md;docs/tecnologias"
  "docs: guía de despliegue y medidas de seguridad::docs/despliegue.md;docs/seguridad.md"
  "test: colección de Postman, prueba de carga y pruebas e2e::tests/postman;tests/load;tests/e2e"
  "docs: historial de cambios::CHANGELOG.md"
)

# Orden recomendado (alternando para que el historial muestre trabajo de ambos)
ORDEN=(base-datos items common notify api-gateway web-base matching web-app claims docs despliegue)
