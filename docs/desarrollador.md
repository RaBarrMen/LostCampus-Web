# Manual de desarrollador

## Estructura del repositorio

```
lostcampus/
├── web/                      Frontend (Next.js + Tailwind)
│   ├── app/                  Páginas (App Router). (app)/ = rutas que requieren sesión
│   ├── components/           Componentes reutilizables
│   └── lib/                  Cliente de API, Supabase, utilidades
├── services/
│   ├── api-gateway/          Entrada única: auth, CORS, rate limit, proxy
│   ├── items-service/        Reportes, categorías, perfil, estadísticas
│   ├── matching-service/     Algoritmo de coincidencias (src/scoring.js)
│   ├── claims-service/       Reclamos, chat, QR (src/qr.js)
│   └── notify-service/       Notificaciones y correo
├── packages/common/          Código compartido por todos los servicios
├── infra/supabase/           Migraciones SQL, RLS, storage y datos iniciales
├── tests/                    db (RLS), postman, load (k6), e2e (Playwright)
├── docs/                     Documentación y OpenAPI
├── render.yaml               Despliegue en Render
└── .github/                  CI, Dependabot y plantilla de PR
```

Cada servicio tiene la misma forma:

```
services/<nombre>/
├── src/index.js     Carga variables de entorno y arranca el servidor
├── src/app.js       Rutas (exporta createApp para poder probarlo)
├── test/            Pruebas con Jest y Supertest
└── .env.example
```

## Cómo viaja una petición

1. El navegador inicia sesión con Supabase Auth y obtiene un JWT.
2. Llama al gateway con `Authorization: Bearer <jwt>`.
3. El gateway valida el JWT con Supabase, consulta el rol del usuario y **borra** cualquier encabezado de identidad que haya mandado el cliente.
4. Reenvía al servicio con `x-internal-key`, `x-user-id`, `x-user-role` y el JWT.
5. El servicio rechaza todo lo que no traiga la clave interna (`requireInternal`), valida el cuerpo con Zod y consulta Supabase **con el JWT del usuario**, así las políticas RLS también se aplican.
6. Los servicios se comunican entre sí con `callService()` de `packages/common` (con clave interna y timeout).

## Convenciones

- JavaScript (CommonJS) en servicios, React con App Router en el frontend.
- Nombres de código en inglés, textos de la interfaz y mensajes de error en español.
- Validación con Zod en todas las rutas que reciben datos.
- Nunca se suben archivos `.env` (están en `.gitignore`).
- Formato con Prettier (`.prettierrc`).

## Control de versiones

El reparto de partes entre los integrantes y los scripts para subirlas están en [equipo.md](equipo.md).

### Ramas

| Rama | Uso |
| --- | --- |
| `main` | Versión estable en producción. Render despliega cada push. Solo recibe merges desde `develop`. |
| `develop` | Integración. Aquí se juntan los cambios antes de pasar a `main`. |
| `feature/<tema>` | Funcionalidad nueva. Ej. `feature/filtro-zona` |
| `tech/<tecnologia>` | Integrar una tecnología nueva del curso. Ej. `tech/docker` |
| `fix/<tema>` | Corrección de errores. Ej. `fix/qr-expirado` |
| `docs/<tema>` | Documentación |

### Flujo de trabajo

```bash
git switch develop && git pull
git switch -c feature/filtro-zona
# ... cambios ...
git add . && git commit -m "feat(items): filtro por zona en el feed"
git push -u origin feature/filtro-zona
# Abrir Pull Request hacia develop; lo revisa el otro integrante
```

Al terminar cada semana:

```bash
git switch main && git pull
git merge --no-ff develop -m "release: v0.4.0"
git tag -a v0.4.0 -m "Semana 4: reclamos, chat y QR"
git push origin main --tags
```

### Mensajes de commit (Conventional Commits)

```
feat(items): agregar filtro por categoría
fix(claims): validar expiración del QR
tech(docker): agregar docker-compose
test(matching): casos del algoritmo de puntuación
docs: actualizar manual de despliegue
chore: actualizar dependencias
```

### Protección de ramas (en GitHub)

Settings → Branches → Add rule para `main` y `develop`:
- Require a pull request before merging (1 aprobación)
- Require status checks to pass (`Pruebas de servicios`, `Build del frontend`)

## Cómo agregar una tecnología nueva sin tocar el núcleo

La arquitectura está pensada para que cada tecnología del curso entre como una pieza aparte.

1. Crea la rama: `git switch -c tech/<tecnologia> develop`.
2. Elige dónde vive:
   - **Un servicio nuevo** (ej. GraphQL, WebSockets propios, un servicio en Laravel o Python): crea `services/<nombre>/` con `/health` y `requireInternal`, y agrégalo en `services/api-gateway/src/routes.js` con su variable `*_SERVICE_URL`. Ningún otro servicio cambia.
   - **Infraestructura** (Docker, Prometheus, Grafana, Nginx): carpeta en `infra/<tecnologia>/`.
   - **Algo compartido** (un logger, una librería de caché): agrégalo a `packages/common/`.
   - **Un proveedor de login** (OAuth GitHub/Google): se activa en Supabase Auth y se agrega un botón en `web/app/login`.
3. Si es opcional, actívala con una variable (`ENABLE_<TECNOLOGIA>=true`).
4. Documenta en `docs/tecnologias/<tecnologia>.md` qué es, cómo se instala y cómo se probó.
5. Pull Request a `develop`, y al cerrar la semana una etiqueta de versión.

Ideas de integración ya preparadas:

| Tecnología | Dónde |
| --- | --- |
| Docker / docker-compose | `infra/docker/`, un `Dockerfile` por servicio |
| Prometheus + Grafana | Cada servicio ya expone `/metrics` (protegido con `METRICS_TOKEN`) |
| OAuth (GitHub/Google) | Supabase → Authentication → Providers |
| GraphQL | `services/graphql-gateway/` que consume los servicios existentes |
| IA para etiquetar fotos | Nuevo `services/vision-service/` llamado desde items-service |

## Pruebas

```bash
npm test             # Jest + Supertest de cada servicio
npm run test:db      # Migraciones + RLS en PostgreSQL en memoria
npm run test:e2e     # Playwright (requiere la app corriendo)
npm run test:load    # k6 (requiere instalar k6)
```

La colección de Postman está en `tests/postman/`. Importa el archivo, define `baseUrl` y `token` (el `access_token` de la sesión, lo ves en el navegador en DevTools → Application → Local Storage).

## Algoritmo de coincidencias

`services/matching-service/src/scoring.js` da una puntuación de 0 a 100:

| Criterio | Puntos |
| --- | --- |
| Misma categoría | 40 |
| Mismo color (10 si uno es multicolor) | 20 |
| Misma zona (7 si están a menos de 150 m) | 15 |
| Cercanía de fechas (pierde 1 punto por día) | 15 |
| Palabras en común en título y descripción | 10 |

Se sugiere la coincidencia si la puntuación es de 60 o más. Un objeto encontrado antes de la fecha de pérdida (más de 1 día) da 0.
