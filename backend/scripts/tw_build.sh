#!/bin/sh
set -eu

backend_root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$backend_root"

echo '[tw:build] Installing dependencies'
npm ci --include=dev
echo '[tw:build] Generating Prisma Client (no database connection required)'
npm run db:generate
echo '[tw:build] Building backend'
npm run build
test -f dist/src/main.js
echo '[tw:build] Ready: dist/src/main.js'
