# Despliegue: Supabase + Render

## 1. Supabase

1. Crea un proyecto en https://supabase.com (región más cercana, ej. `us-east-1`).
2. **SQL Editor** → ejecuta en este orden:
   1. `infra/supabase/migrations/001_schema.sql`
   2. `infra/supabase/migrations/002_rls.sql`
   3. `infra/supabase/migrations/003_storage.sql`
   4. `infra/supabase/seed.sql`
3. **Authentication → Sign In / Providers → Email**:
   - Activa *Confirm email*.
   - *Minimum password length*: 8. *Password requirements*: letras, números y mayúsculas.
4. **Authentication → URL Configuration**:
   - *Site URL*: `https://lostcampus-web.onrender.com` (o `http://localhost:3000` en desarrollo).
   - *Redirect URLs*: agrega ambas.
5. **Authentication → Rate Limits**: deja los valores por defecto (protegen contra fuerza bruta).
6. **Project Settings → API**: copia `Project URL`, `anon public` y `service_role`.
   > La clave `service_role` salta todas las reglas de seguridad. Solo va en las variables de entorno de los servicios, **nunca** en el frontend ni en GitHub.

### Dar rol de administrador o resguardo

Después de que la persona se registre, en SQL Editor:

```sql
update public.profiles set rol = 'admin'
where id = (select id from auth.users where email = 'correo@celaya.tecnm.mx');
```

### Probar con un correo que no es del Tec

Durante el desarrollo puedes permitir otro dominio:

```sql
insert into public.allowed_domains (domain) values ('gmail.com');
-- y antes de entregar:
delete from public.allowed_domains where domain = 'gmail.com';
```

## 2. Desarrollo local

```bash
npm install
bash scripts/configurar-env.sh   # pide las 3 claves de Supabase y genera los secretos
npm run dev
```

Si prefieres hacerlo a mano, copia cada `.env.example` a `.env`. `INTERNAL_API_KEY` debe ser la misma en todos los servicios y `QR_SECRET` debe tener al menos 32 caracteres.

## 3. Render

1. Sube el repositorio a GitHub (rama `main`).
2. En https://render.com → **New → Blueprint** → elige el repositorio. Render lee `render.yaml` y crea:
   - `lostcampus-web`, `lostcampus-gateway`, `lostcampus-items`, `lostcampus-matching`, `lostcampus-claims`, `lostcampus-notify`
3. Render te pedirá las variables marcadas como `sync: false`:

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | De Supabase |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | De Supabase (solo la anon) |
| `NEXT_PUBLIC_API_URL` | `https://lostcampus-gateway.onrender.com` |
| `CORS_ORIGINS` | `https://lostcampus-web.onrender.com` |
| `ITEMS_SERVICE_URL` | `https://lostcampus-items.onrender.com` |
| `MATCHING_SERVICE_URL` | `https://lostcampus-matching.onrender.com` |
| `CLAIMS_SERVICE_URL` | `https://lostcampus-claims.onrender.com` |
| `NOTIFY_SERVICE_URL` | `https://lostcampus-notify.onrender.com` |
| `APP_URL` | `https://lostcampus-web.onrender.com` |
| `RESEND_API_KEY` | Opcional, para correos |

   `INTERNAL_API_KEY`, `METRICS_TOKEN` y `QR_SECRET` los genera Render automáticamente.
   Si Render agrega un sufijo al nombre (porque ya existe), usa la URL que te muestre.

4. Cuando todo esté *Live*, actualiza en Supabase la *Site URL* con la URL de `lostcampus-web`.

### Notas del plan gratuito

- Los servicios se duermen tras 15 minutos sin uso; la primera petición tarda ~50 s en despertar. Antes de presentar, abre la app un minuto antes o configura UptimeRobot para que haga ping a `/health` de cada servicio cada 10 minutos.
- Cada push a `main` vuelve a desplegar solo los servicios cuyos archivos cambiaron (`buildFilter`).

### Revertir una versión

En Render → servicio → **Events** → elige el despliegue anterior → *Rollback*. O en Git:

```bash
git switch main && git revert -m 1 <commit-del-merge> && git push
```

## 4. Verificación después de desplegar

- `https://lostcampus-gateway.onrender.com/api/v1/health` responde `{"status":"ok"}`.
- `https://lostcampus-items.onrender.com/items` responde **401** (acceso directo bloqueado).
- Registro → correo de confirmación → login → crear reporte → aparece en el mapa.
- Corre la colección de Postman contra producción.
