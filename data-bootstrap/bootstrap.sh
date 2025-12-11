#!/bin/bash

set -e

# Check if database is already bootstrapped by checking for a marker table
echo "Checking if database is already bootstrapped..."
BOOTSTRAPPED=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -tAc "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='config');")

if [ "$BOOTSTRAPPED" = "t" ]; then
    echo "Database schema already imported, skipping..."
else
    echo "Importing database schema..."
    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f /app/schema.sql

    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -tAc "INSERT INTO public.config (config_key, config_value) VALUES ('schema', 'true');"

    if [ $? -eq 0 ]; then
        echo "Database import completed successfully"
    
    else
        echo "Import failed"
        exit 1
    fi
fi

echo "Importing reference data dump..."
REFERENCE_LOADED=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -tAc "SELECT EXISTS(SELECT 1 FROM config WHERE config_key='reference_data');")

if [ "$REFERENCE_LOADED" = "t" ]; then
    echo "Reference data already imported, skipping..."
    unset PGPASSWORD
    exit 0
fi

PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f /app/data.sql

if [ $? -eq 0 ]; then
    echo "Database import completed successfully"
    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -tAc "INSERT INTO public.config (config_key, config_value) VALUES ('reference_data', 'true');"
  
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