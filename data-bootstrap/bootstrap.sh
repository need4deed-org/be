#!/bin/bash

set -e

# Check if database is already bootstrapped by checking for a marker table
echo "Checking if database is already bootstrapped..."
BOOTSTRAPPED=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -tAc "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='person')")

if [ "$BOOTSTRAPPED" = "t" ]; then
    echo "Database already bootstrapped, skipping import..."
    exit 0
fi

echo "Importing database schema..."
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f /app/schema.sql

if [ $? -eq 0 ]; then
    echo "Database import completed successfully"
  
else
    echo "Import failed"
    exit 1
fi

echo "Importing database dump..."
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f /app/data.sql

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