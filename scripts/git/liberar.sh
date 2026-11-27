#!/usr/bin/env bash
# PASO 3 (al final de cada semana o en la entrega).
# Une develop en main y crea una etiqueta de versión. Render despliega main automáticamente.
#
# Uso (dentro del repositorio clonado):
#   bash scripts/git/liberar.sh v1.0.0 "Entrega final"
set -euo pipefail

VERSION=${1:-}
DESC=${2:-"Versión $VERSION"}
if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo 'Uso: bash scripts/git/liberar.sh v1.0.0 "Descripción"' >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "Tienes cambios sin guardar." >&2
  exit 1
fi

git fetch -q origin
git switch -q develop && git pull -q --ff-only origin develop
git switch -q main && git pull -q --ff-only origin main
git merge --no-ff develop -m "release: $VERSION"
git tag -a "$VERSION" -m "$DESC"
git push origin main "$VERSION"
git switch -q develop

echo "✓ $VERSION publicada en main. Crea el Release en GitHub → Releases → Draft a new release."
