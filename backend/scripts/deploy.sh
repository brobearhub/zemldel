#!/bin/sh
set -eu

# Команда сборки Onreza: схема, миграции, сиды и dist вместе с legal/.
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$root"

npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run db:seed:capitals
npm run build
