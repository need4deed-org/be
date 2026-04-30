#!/bin/bash

set -e

echo "Importing database dump..."
PGPASSWORD="${DB_PASSWORD}" psql -q -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f /app/dev.dump.sql

if [ $? -eq 0 ]; then
    echo "Database import completed successfully"
  
else
    echo "Import failed"
    exit 1
fi
# Clean up
unset PGPASSWORD

echo ""
echo "Connection details for verification:"
echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
exit 0