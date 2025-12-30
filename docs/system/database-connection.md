# Database Connection Guide (Host Machine)

## Purpose
This guide explains how another project running on the host machine can connect to the PostgreSQL container started by this repository.

## Prerequisites
- The database container is running:
  - `just docker-up` (recommended)
  - Or: `docker compose up -d postgres`

## Connection Details (Local Host)
Use these values directly in your other project:

- Host: `localhost`
- Port: `5433`
- Database: `monitor_sys_ua`
- Username: `postgres`
- Password: `postgres`
- SSL: `disable`

## Connection Strings
- Standard URL:
  - `postgresql://postgres:postgres@localhost:5433/monitor_sys_ua`
- URL with SSL disabled (some clients require this flag):
  - `postgresql://postgres:postgres@localhost:5433/monitor_sys_ua?sslmode=disable`

## Environment Variables (Example)
```
PGHOST=localhost
PGPORT=5433
PGDATABASE=monitor_sys_ua
PGUSER=postgres
PGPASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/monitor_sys_ua
```

## Quick Verification
- Confirm the container is running:
  - `docker ps | rg monitorsysua-postgres`
- Check connectivity (if `psql` is installed):
  - `psql "postgresql://postgres:postgres@localhost:5433/monitor_sys_ua"`
- Or check the port:
  - `nc -zv localhost 5433`

## Notes
- The host port is `5433` to avoid conflicts with local PostgreSQL on `5432`.
- If you change the port mapping in `docker-compose.yml`, update your connection string accordingly.
- These credentials are for local development. If you need production-like security, change the password and store it in `.env`.
