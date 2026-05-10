#!/usr/bin/env bash
set -euo pipefail

export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-5432}"
export PGDATABASE="${PGDATABASE:-batchsphere_db}"
export PGUSER="${PGUSER:-batchsphere_user}"
export PGPASSWORD="${PGPASSWORD:-StrongPassword123}"

psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  table_list text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO table_list
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT IN ('flyway_schema_history', 'app_user');

  IF table_list IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;

DELETE FROM app_user
WHERE username LIKE 'e2e-user-%';
SQL

echo "BatchSphere E2E database data reset complete."
