#!/bin/sh
set -eu

backend_root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$backend_root"

if [ ! -f dist/src/main.js ]; then
  echo '[tw:start] Missing dist/src/main.js; run npm run tw:build first' >&2
  exit 1
fi

# migrate deploy already checks for pending migrations. No pending work is success.
# Do not retry here or start the application if the database migration fails.
echo '[tw:start] Checking and applying pending migrations'
if npm run db:migrate:deploy; then
  echo '[tw:start] Migrations complete; starting backend'
else
  migration_status=$?
  echo "[tw:start] Migration failed (exit $migration_status); backend not started" >&2
  exit "$migration_status"
fi

# Replace this shell so the long-running process receives termination signals.
exec node dist/src/main.js
