# Medidas de seguridad

Resumen de las protecciones de LostCampus y dónde están implementadas.

## Autenticación y cuentas

| Medida | Dónde |
| --- | --- |
| Solo correos institucionales (lista `allowed_domains`, validada en la base de datos) | `001_schema.sql` → `handle_new_user()` |
| Confirmación de correo y contraseñas de 8+ caracteres con letras, números y mayúscula | Supabase Auth + `web/app/registro` |
| Mensaje genérico al fallar el login (no revela si el correo existe) | `web/app/login` |
| JWT validado en cada petición por el gateway | `api-gateway/src/auth.js` |
| Un usuario no puede cambiarse el rol | Trigger `protect_profile_role` |
| Redirecciones solo a rutas internas (sin *open redirect*) | `safeNext()` en login, validación de `link` en notificaciones |

## Arquitectura de servicios

| Medida | Dónde |
| --- | --- |
| Los servicios internos rechazan peticiones sin `INTERNAL_API_KEY` (comparación en tiempo constante) | `packages/common/src/internal.js` |
| El gateway borra los encabezados de identidad que mande el cliente | `api-gateway/src/app.js` |
| Rate limit: 100 peticiones/min por IP y 30 escrituras/min | `api-gateway/src/app.js` |
| CORS limitado al dominio del frontend | `CORS_ORIGINS` |
| Cabeceras de seguridad con Helmet (HSTS, nosniff, etc.) y sin `X-Powered-By` | `packages/common/src/app.js` |
| Cuerpo de peticiones limitado a 100 KB | `express.json({ limit })` |
| Timeouts en llamadas entre servicios | `callService()` |
| Errores sin stack traces ni detalles internos de la base de datos | `errorHandler`, `fromSupabase` |
| Logs sin tokens ni claves (`redact`) | `createLogger` |
| `/metrics` protegido con token | `metrics.js` |

## Datos y base de datos

| Medida | Dónde |
| --- | --- |
| RLS activado en **todas** las tablas | `002_rls.sql` |
| Los servicios consultan con el JWT del usuario, así RLS aplica también en el backend | `userClient()` |
| Validación estricta con Zod (tipos, longitudes, enums, fechas, coordenadas dentro del campus) | `schemas.js` de cada servicio |
| `.strict()` rechaza campos extra (evita asignación masiva como mandar `user_id` o `estado`) | `createItem`, `updateItem` |
| Búsqueda limpia de caracteres especiales (evita inyectar filtros de PostgREST) | `limpiarBusqueda()` |
| Restricciones `check` en la base de datos como segunda línea de defensa | `001_schema.sql` |
| Los usuarios no pueden marcar reportes como devueltos ni cambiar su dueño | Trigger `protect_item_fields` |
| Notificaciones: el cliente solo puede modificar la columna `leida` | `grant update (leida)` |
| La pregunta de verificación no se envía en los listados | `publicItem()` |

## Imágenes

| Medida | Dónde |
| --- | --- |
| Bucket privado, máximo 5 MB, solo JPG/PNG/WebP | `003_storage.sql` |
| Cada usuario solo sube a su carpeta | Política de storage |
| Se entregan con URLs firmadas que expiran en 1 hora | `signImages()` |
| La imagen se reduce y convierte a WebP en el navegador, lo que elimina los metadatos EXIF (incluida la ubicación GPS) | `compressImage()` |

## Reclamos y entrega

| Medida | Dónde |
| --- | --- |
| Pregunta de verificación que solo el dueño puede contestar | `claims-service` |
| Máximo 2 intentos de reclamo por objeto y usuario | `MAX_ATTEMPTS` |
| QR firmado (HS256) con expiración de 24 h, emisor y audiencia | `claims-service/src/qr.js` |
| QR de un solo uso: solo se guarda el hash del identificador y se borra al entregar | `verify-qr` |
| Actualizaciones atómicas por estado (evitan condiciones de carrera) | `update()` en claims |

## Frontend

| Medida | Dónde |
| --- | --- |
| Content Security Policy, `frame-ancestors 'none'`, `X-Frame-Options: DENY` | `web/next.config.mjs` |
| Permissions-Policy (cámara solo en el sitio, sin micrófono) | `web/next.config.mjs` |
| Solo se usa la clave pública (anon) de Supabase | `web/lib/supabase.js` |
| React escapa todo el contenido; no se usa `dangerouslySetInnerHTML` con datos de usuarios | — |
| Fuentes alojadas en el propio sitio (sin peticiones a terceros) | `@fontsource` |

## Dependencias y monitoreo

- `npm audit` en cada Pull Request (CI) y Dependabot mensual.
- Pruebas automáticas de seguridad: `npm test` (gateway, validaciones, QR) y `npm run test:db` (RLS).
- Métricas de cada servicio en `/metrics` para Prometheus/Grafana.
