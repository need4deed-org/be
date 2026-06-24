#!/bin/bash

set -e

# Idempotent: skip if the base schema is already loaded.
TABLE_EXISTS=$(PGPASSWORD="${DB_PASSWORD}" psql -q -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -tAc \
  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='language')")

if [ "$TABLE_EXISTS" = "t" ]; then
  echo "Database already bootstrapped, skipping."
  exit 0
fi

echo "Importing database dump..."
PGPASSWORD="${DB_PASSWORD}" psql -q -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f /app/dev.dump.sql
echo "Database import completed successfully"

unset PGPASSWORD
echo "Connection details for verification:"
echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
exit 0