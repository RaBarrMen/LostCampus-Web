# LostCampus

Plataforma web basada en servicios para reportar, encontrar y recuperar objetos perdidos dentro del Tecnológico de Celaya.

Proyecto de la materia de Programación Web, elaborado por **Rafael Barranco Mendoza** y **Uriel Alejandro Martínez Martínez**.

## Funcionalidades

- Registro e inicio de sesión solo con correo institucional (`@celaya.tecnm.mx`).
- Reportes de objetos perdidos y encontrados con foto, categoría, color, zona y punto en el mapa.
- Mapa del campus con pines de cada reporte.
- Coincidencias automáticas entre objetos perdidos y encontrados (categoría, color, zona, fecha y palabras clave).
- Reclamos con pregunta de verificación y chat en tiempo real.
- Entrega con código QR firmado de un solo uso.
- Notificaciones en vivo y por correo (opcional).
- Panel de administración con estadísticas y moderación.
- Modo claro y oscuro, diseño adaptable a celular.

## Arquitectura

```
                  ┌──────────────────────┐
                  │  web (Next.js)        │  Render
                  └──────────┬───────────┘
          Auth y Realtime    │ HTTPS + JWT
         ┌───────────────────┤
         │        ┌──────────▼───────────┐
         │        │  api-gateway         │  JWT, CORS, rate limit, enrutamiento
         │        └──┬──────┬──────┬─────┘
         │   ┌───────▼┐ ┌───▼────┐ ┌▼───────┐ ┌────────┐
         │   │ items  │ │matching│ │ claims │ │ notify │   (requieren INTERNAL_API_KEY)
         │   └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
         │       └──────────┴────┬─────┴──────────┘
         └──────────────► Supabase (PostgreSQL + RLS, Auth, Storage, Realtime)
```

| Componente | Puerto local | Responsabilidad |
| --- | --- | --- |
| `web` | 3000 | Interfaz en Next.js |
| `services/api-gateway` | 4000 | Entrada única, autenticación, CORS, rate limit, Swagger en `/docs` |
| `services/items-service` | 4001 | Reportes, categorías, perfil, estadísticas |
| `services/matching-service` | 4002 | Algoritmo de coincidencias |
| `services/claims-service` | 4003 | Reclamos, chat y QR de entrega |
| `services/notify-service` | 4004 | Notificaciones en app y correo |
| `packages/common` | — | Código compartido (seguridad, errores, Supabase, métricas) |

## Inicio rápido

Requisitos: Node.js 22 (`nvm use`), una cuenta gratuita de Supabase.

```bash
# 1. Instalar dependencias
npm install

# 2. Crear la base de datos: en Supabase > SQL Editor ejecuta en orden
#    infra/supabase/migrations/001_schema.sql
#    infra/supabase/migrations/002_rls.sql
#    infra/supabase/migrations/003_storage.sql
#    infra/supabase/seed.sql

# 3. Variables de entorno (pide las 3 claves de Supabase y genera lo demás)
bash scripts/configurar-env.sh

# 4. Levantar todo (frontend + 5 servicios)
npm run dev
```

Abre http://localhost:3000. La documentación de la API está en http://localhost:4000/docs.

La guía completa está en [docs/despliegue.md](docs/despliegue.md).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Levanta frontend y servicios en modo desarrollo |
| `npm run dev:services` | Solo los servicios |
| `npm test` | Pruebas unitarias e integración (Jest + Supertest) |
| `npm run test:db` | Pruebas de la base de datos y políticas RLS |
| `npm run test:e2e` | Pruebas en navegador (Playwright) |
| `npm run test:load` | Prueba de carga (k6) |
| `npm run audit` | Revisa vulnerabilidades en dependencias |

## Equipo

| Integrante | Responsabilidad |
| --- | --- |
| Uriel Alejandro Martínez Martínez | Backend: base de datos, gateway, matching, claims, despliegue |
| Rafael Barranco Mendoza | Frontend, items, notificaciones, documentación y pruebas |

El reparto completo y el flujo de Git están en [docs/equipo.md](docs/equipo.md).

## Documentación

- [Manual de usuario](docs/manual-usuario.md)
- [Manual de desarrollador](docs/desarrollador.md) (estructura, flujo de Git, cómo agregar tecnologías)
- [Despliegue en Supabase y Render](docs/despliegue.md)
- [Medidas de seguridad](docs/seguridad.md)
- [API (OpenAPI)](docs/openapi.yaml) y [colección de Postman](tests/postman/LostCampus.postman_collection.json)
- [Historial de cambios](CHANGELOG.md)
