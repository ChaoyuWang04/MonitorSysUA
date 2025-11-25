# Atlas Configuration for MonitorSysUA
# Uses Drizzle schema as source of truth via drizzle-kit export
# Documentation: https://atlasgo.io/guides/orms/drizzle

# External data source for Drizzle schema
data "external_schema" "drizzle" {
  program = [
    "npx",
    "drizzle-kit",
    "export",
  ]
}

# Environment: Development (Local)
env "local" {
  # Source of truth: Drizzle schema via external data source
  src = data.external_schema.drizzle.url

  # Database connection (local dev only - port 5433)
  url = "postgresql://postgres:postgres@localhost:5433/monitor_sys_ua?sslmode=disable"

  # Migration directory
  migration {
    dir = "file://atlas/migrations"
  }

  # Development database for diff operations (uses Docker)
  dev = "docker://postgres/16/dev?search_path=public"

  # Exclude legacy Drizzle migrations folder from schema comparison
  exclude = ["drizzle"]
}

# Environment: Production (configure via env vars)
env "prod" {
  src = data.external_schema.drizzle.url
  url = getenv("DATABASE_URL")

  migration {
    dir = "file://atlas/migrations"
  }
}

# Environment: CI (for automated testing)
env "ci" {
  src = data.external_schema.drizzle.url
  url = getenv("DATABASE_URL")

  migration {
    dir = "file://atlas/migrations"
  }

  # Use ephemeral database for CI
  dev = "docker://postgres/16/dev?search_path=public"
}

# Lint configuration - catch destructive changes
lint {
  # Prevent destructive changes without explicit approval
  destructive {
    error = true
  }

  # Warn about data-dependent changes
  data_depend {
    error = true
  }
}
