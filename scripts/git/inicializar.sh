#!/usr/bin/env bash
# PASO 1 (lo hace Uriel una sola vez).
# Sube la base del monorepo a un repositorio VACÍO de GitHub y crea la rama develop.
#
# Uso:
#   mkdir ~/lostcampus-repo && cd ~/lostcampus-repo
#   bash /ruta/al/proyecto/lostcampus/scripts/git/inicializar.sh https://github.com/<usuario>/lostcampus.git
set -euo pipefail

REMOTE=${1:-}
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ -z "$REMOTE" ]; then
  echo "Uso: bash inicializar.sh <url-del-repositorio-vacío>" >&2
  exit 1
fi
if [ -d .git ]; then
  echo "Esta carpeta ya tiene un repositorio Git." >&2
  exit 1
fi
if [ "$(pwd)" = "$SRC" ]; then
  echo "Ejecútalo desde una carpeta NUEVA y vacía, no desde la carpeta del zip." >&2
  exit 1
fi
git config user.name >/dev/null && git config user.email >/dev/null || {
  echo 'Configura tu identidad: git config --global user.name "..." && git config --global user.email "..."' >&2
  exit 1
}

echo "→ Inicializando como: $(git config user.name) <$(git config user.email)>"
git init -q -b main
for f in package.json package-lock.json .gitignore .editorconfig .prettierrc .nvmrc README.md; do
  cp "$SRC/$f" .
done
git add .
git commit -q -m "chore: estructura inicial del monorepo"

git remote add origin "$REMOTE"
git push -u origin main
git switch -q -c develop
git push -u origin develop

echo
echo "✓ Repositorio listo con las ramas main y develop."
echo "  Siguiente: en GitHub agrega a tu compañero como colaborador (Settings → Collaborators)."
