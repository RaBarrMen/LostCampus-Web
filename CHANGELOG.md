# Historial de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado semántico.

## [1.0.0] - 2026-11-27

### Agregado

- Frontend en Next.js: inicio, registro, login, feed con filtros, mapa del campus, formulario de reporte por pasos, detalle con coincidencias, reclamos con chat, QR de entrega, escáner, panel de administración y perfil.
- api-gateway con autenticación JWT, CORS, rate limit, proxy y documentación Swagger.
- items-service: reportes, categorías, perfil y estadísticas.
- matching-service: algoritmo de coincidencias por categoría, color, zona, fecha y palabras clave.
- claims-service: reclamos con pregunta de verificación, chat y QR firmado de un solo uso.
- notify-service: notificaciones en tiempo real y por correo (Resend).
- Base de datos con RLS en todas las tablas, triggers de protección y bucket privado de imágenes.
- Pruebas: Jest + Supertest, pruebas de RLS con PGlite, Playwright, k6 y colección de Postman.
- Despliegue en Render (`render.yaml`) y CI en GitHub Actions.
