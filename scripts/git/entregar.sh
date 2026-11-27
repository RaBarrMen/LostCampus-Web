#!/usr/bin/env bash
# PASO 2 (cada integrante, con SU cuenta y desde SU computadora).
# Copia los archivos de una parte desde la carpeta del zip al repositorio clonado,
# los sube en commits en una rama feature/* y la publica para abrir un Pull Request.
#
# Uso (dentro del repositorio clonado):
#   bash /ruta/al/proyecto/lostcampus/scripts/git/entregar.sh <parte>
#   bash /ruta/al/proyecto/lostcampus/scripts/git/entregar.sh --lista
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=partes.sh
source "$SRC/scripts/git/partes.sh"

listar() {
  local en_repo=0
  if git rev-parse --git-dir >/dev/null 2>&1; then en_repo=1; git fetch -q origin 2>/dev/null || true; fi
  echo "Partes (en el orden recomendado):"
  for p in "${ORDEN[@]}"; do
    estado="pendiente"
    local var="COMMITS_${p//-/_}[0]" primera
    primera="${!var#*::}"; primera="${primera%%;*}"
    if [ "$en_repo" = 1 ] && git cat-file -e "origin/develop:$primera" 2>/dev/null; then
      estado="ya está en develop"
    elif [ "$en_repo" = 1 ] && git ls-remote --exit-code --heads origin "${RAMA[$p]}" >/dev/null 2>&1; then
      estado="rama publicada (falta aprobar el Pull Request)"
    fi
    printf "  %-12s %-8s %-28s %s\n" "$p" "${DUENO[$p]}" "${RAMA[$p]}" "$estado"
  done
}

PARTE=${1:-}
if [ -z "$PARTE" ] || [ "$PARTE" = "--lista" ]; then
  listar
  exit 0
fi
if [ -z "${RAMA[$PARTE]:-}" ]; then
  echo "Parte desconocida: $PARTE" >&2
  listar
  exit 1
fi
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Ejecuta este script dentro del repositorio clonado (git clone ...)." >&2
  exit 1
fi
if [ "$(git rev-parse --show-toplevel)" = "$SRC" ]; then
  echo "Ejecútalo dentro del repositorio clonado, no en la carpeta del zip." >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "Tienes cambios sin guardar. Haz commit o descártalos antes de continuar." >&2
  git status --short
  exit 1
fi

AUTOR="$(git config user.name)"
echo "→ Parte: $PARTE   Responsable: ${DUENO[$PARTE]}   Tu identidad: $AUTOR <$(git config user.email)>"
if [[ "${AUTOR,,}" != *"${DUENO[$PARTE],,}"* ]]; then
  read -r -p "  Esta parte le corresponde a ${DUENO[$PARTE]}. ¿Continuar de todos modos? (s/N) " r
  [[ "$r" =~ ^[sS]$ ]] || exit 1
fi

git fetch -q origin
git switch -q develop
git pull -q --ff-only origin develop
git switch -q -c "${RAMA[$PARTE]}"

VAR="COMMITS_${PARTE//-/_}[@]"
for entrada in "${!VAR}"; do
  mensaje="${entrada%%::*}"
  IFS=';' read -r -a rutas <<< "${entrada#*::}"
  for ruta in "${rutas[@]}"; do
    if [ ! -e "$SRC/$ruta" ]; then
      echo "  No existe $SRC/$ruta" >&2
      exit 1
    fi
    mkdir -p "$(dirname "$ruta")"
    cp -R "$SRC/$ruta" "$(dirname "$ruta")/"
    git add -- "$ruta"
  done
  if git diff --cached --quiet; then
    echo "  (sin cambios para: $mensaje)"
    continue
  fi
  git commit -q -m "$mensaje"
  echo "  ✓ $mensaje"
done

git push -q -u origin "${RAMA[$PARTE]}"

URL="$(git remote get-url origin | sed -E 's#git@github.com:#https://github.com/#; s#\.git$##')"
echo
echo "✓ Rama ${RAMA[$PARTE]} publicada."
echo "  Abre el Pull Request hacia develop y pide a tu compañero que lo revise:"
echo "  $URL/compare/develop...${RAMA[$PARTE]}?expand=1"
