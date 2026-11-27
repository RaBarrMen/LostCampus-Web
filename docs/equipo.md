# Equipo y reparto del trabajo

| Integrante | Rol Scrum | Responsabilidad |
| --- | --- | --- |
| Uriel Alejandro Martínez Martínez | Scrum Master + Developer | Backend: base del monorepo, base de datos y RLS, paquete común, api-gateway, matching-service, claims-service, despliegue y CI |
| Rafael Barranco Mendoza | Product Owner + Developer | Frontend y servicios de soporte: items-service, notify-service, interfaz en Next.js, documentación y pruebas de API, carga y e2e |

## Partes

| Parte | Responsable | Rama | Contenido |
| --- | --- | --- | --- |
| `base-datos` | Uriel | `feature/base-datos` | Migraciones SQL, RLS, storage, pruebas de base de datos |
| `items` | Rafael | `feature/items-service` | Reportes, categorías, perfil, estadísticas |
| `common` | Uriel | `feature/common` | Seguridad entre servicios, errores, métricas |
| `notify` | Rafael | `feature/notify-service` | Notificaciones y correos |
| `api-gateway` | Uriel | `feature/api-gateway` | JWT, CORS, rate limit, proxy, OpenAPI |
| `web-base` | Rafael | `feature/web-base` | Configuración de Next.js, login, registro, página de inicio |
| `matching` | Uriel | `feature/matching-service` | Algoritmo de coincidencias |
| `web-app` | Rafael | `feature/web-app` | Feed, mapa, reportes, reclamos, QR, panel |
| `claims` | Uriel | `feature/claims-service` | Reclamos, chat, QR de entrega |
| `docs` | Rafael | `docs/documentacion` | Manuales, Postman, k6, Playwright |
| `despliegue` | Uriel | `chore/despliegue` | Render, GitHub Actions, scripts |

El orden alterna entre ambos para que el historial refleje el trabajo de los dos. La lista completa de commits de cada parte está en `scripts/git/partes.sh`.

## Flujo para subir cada parte

Cada quien trabaja **desde su propia computadora y con su propia cuenta de GitHub**, así los commits, las ramas y las revisiones quedan a nombre de quien los hizo.

1. **Uriel** crea el repositorio y la rama `develop` (una sola vez):

   ```bash
   mkdir ~/lostcampus-repo && cd ~/lostcampus-repo
   bash ~/lostcampus/scripts/git/inicializar.sh https://github.com/<usuario>/lostcampus.git
   ```

   En GitHub: *Settings → Collaborators* → agregar a Rafael.
   *Settings → Branches* → regla para `develop` y `main`: *Require a pull request before merging* con 1 aprobación.

2. **Cada quien** clona el repositorio una vez:

   ```bash
   git clone https://github.com/<usuario>/lostcampus.git ~/lostcampus-repo
   ```

3. Para subir una parte (dentro del repositorio clonado):

   ```bash
   cd ~/lostcampus-repo
   bash ~/lostcampus/scripts/git/entregar.sh --lista     # ver partes y cuáles ya están en develop
   bash ~/lostcampus/scripts/git/entregar.sh base-datos  # sube la parte en su rama
   ```

   El script imprime el enlace para abrir el Pull Request hacia `develop`.

4. **El otro integrante revisa y aprueba** el Pull Request en GitHub (*Files changed → Review changes → Approve*) y lo fusiona con *Create a merge commit*.

5. Repetir con la siguiente parte del orden.

6. Al terminar todas las partes, cualquiera de los dos publica la versión:

   ```bash
   bash scripts/git/liberar.sh v1.0.0 "Entrega final"
   ```

> `~/lostcampus` es la carpeta donde descomprimieron el zip y `~/lostcampus-repo` es el repositorio clonado. Son carpetas distintas.

## Después de la entrega inicial

Los cambios nuevos (correcciones, tecnologías del curso) se hacen normal:

```bash
git switch develop && git pull
git switch -c tech/docker
# ... cambios ...
git add . && git commit -m "tech(docker): dockerfile por servicio"
git push -u origin tech/docker
# Pull Request → revisión del compañero → merge
```
