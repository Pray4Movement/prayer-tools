#!/bin/sh
# Starts the process named by PT_PROCESS (admin | public | worker).
set -e
case "${PT_PROCESS:-admin}" in
  # Bun: the boot migrations import the layers' .ts migration files.
  admin) exec bun apps/admin/.output/server/index.mjs ;;
  public) exec node apps/public/.output/server/index.mjs ;;
  worker) cd apps/worker && exec bun src/index.ts ;;
  *) echo "Unknown PT_PROCESS: $PT_PROCESS" >&2; exit 1 ;;
esac
