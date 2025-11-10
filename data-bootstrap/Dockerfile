FROM postgres:17.2

# Install postgresql-client for pg_restore/psql commands

# Set environment variables for external database connection
ENV PGHOST=localhost
ENV PGPORT=5432
ENV PGDATABASE=mydb
ENV PGUSER=postgres
ENV PGPASSWORD=password

# Copy the SQL dump file
COPY dump.sql /app/

# Create script to restore dump to external database
COPY bootstrap.sh /app/
RUN chmod +x /app/bootstrap.sh

WORKDIR /app

# Run the restore script
CMD ["/app/bootstrap.sh"]