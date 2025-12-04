/**
 * Database Snapshot Script
 * Exports all tables with schema information (CSV for preview, JSON kept for restore)
 *
 * Usage: npx tsx scripts/db-snapshot.ts --limit 100 --format csv
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { sql } from 'drizzle-orm'
import * as fs from 'fs'
import * as path from 'path'

type OutputFormat = 'csv' | 'json' | 'both'

// Defaults
const DEFAULT_LIMIT = 100
const DEFAULT_FORMAT: OutputFormat = 'csv'

// Parse command line arguments
function parseArgs(argv: string[]): { limit: number; format: OutputFormat } {
  let parsedLimit = DEFAULT_LIMIT
  let parsedFormat: OutputFormat = DEFAULT_FORMAT

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--limit') {
      const raw = argv[i + 1]
      parsedLimit = raw ? parseInt(raw, 10) : DEFAULT_LIMIT
      i += 1
    }
    if (arg === '--format') {
      const raw = (argv[i + 1] || '').toLowerCase()
      if (raw === 'csv' || raw === 'json' || raw === 'both') {
        parsedFormat = raw
      }
      i += 1
    }
  }

  if (Number.isNaN(parsedLimit) || parsedLimit < 0) {
    parsedLimit = DEFAULT_LIMIT
  }

  return { limit: parsedLimit, format: parsedFormat }
}

const { limit, format } = parseArgs(process.argv.slice(2))

// Database connection
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Aborting snapshot.')
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const db = drizzle(pool)

// Table definitions with their dependencies (for restore order)
const tables = [
  { name: 'accounts', deps: [] },
  { name: 'safety_baseline', deps: [] },
  { name: 'baseline_settings', deps: [] },
  { name: 'creative_test_baseline', deps: [] },
  { name: 'change_events', deps: ['accounts'] },
  { name: 'campaigns', deps: ['accounts'] },
  { name: 'ad_groups', deps: ['accounts'] },
  { name: 'ads', deps: ['accounts'] },
  { name: 'campaign_evaluation', deps: [] },
  { name: 'creative_evaluation', deps: [] },
  { name: 'operation_score', deps: ['change_events'] },
  { name: 'action_recommendation', deps: ['campaign_evaluation'] },
  { name: 'optimizer_leaderboard', deps: [] },
  // NOTE: mock_campaign_performance has been removed (Phase 8). Use AppsFlyer data.
  { name: 'mock_creative_performance', deps: [] },
  { name: 'af_sync_log', deps: [] },
  { name: 'af_events', deps: [] },
  { name: 'af_cohort_kpi_daily', deps: [] },
]

interface TableInfo {
  rowCount: number
  totalInDb: number
  truncated: boolean
}

interface Metadata {
  snapshotId: string
  createdAt: string
  database: string
  limit: number
  format: OutputFormat
  tables: Record<string, TableInfo>
}

interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  defaultValue: string | null
  primaryKey: boolean
}

interface TableSchema {
  columns: ColumnInfo[]
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function writeCsv(tableName: string, rows: Record<string, unknown>[], columns: ColumnInfo[], dir: string) {
  const headers = columns.map((c) => c.name)
  const lines = [headers.join(',')]

  for (const row of rows) {
    const values = headers.map((key) => escapeCsv(row[key]))
    lines.push(values.join(','))
  }

  const csvPath = path.join(dir, `${tableName}.csv`)
  fs.writeFileSync(csvPath, lines.join('\n'))
}

async function hasColumn(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.execute(sql.raw(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = '${tableName}' AND column_name = '${columnName}'
    LIMIT 1
  `))

  return (result.rowCount ?? 0) > 0
}

async function getTableCount(tableName: string, whereClause: string): Promise<number> {
  const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}${whereClause}`))
  return parseInt((result.rows[0] as { count: string }).count, 10)
}

async function getTableData(tableName: string, rowLimit: number, whereClause: string): Promise<unknown[]> {
  // Random sample to avoid bias; default to random() since limit is small (<=100)
  const baseWhere = whereClause || ''

  if (rowLimit > 0) {
    const query = sql.raw(`SELECT * FROM ${tableName}${baseWhere} ORDER BY random() LIMIT ${rowLimit}`)
    const result = await db.execute(query)
    return result.rows as unknown[]
  }

  // Unlimited export
  const query = sql.raw(`SELECT * FROM ${tableName}${baseWhere}`)
  const result = await db.execute(query)
  return result.rows as unknown[]
}

async function getTableSchema(tableName: string): Promise<TableSchema> {
  const result = await db.execute(sql.raw(`
    SELECT
      c.column_name as name,
      c.data_type as type,
      c.is_nullable = 'YES' as nullable,
      c.column_default as default_value,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as primary_key
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = '${tableName}'
    ) pk ON c.column_name = pk.column_name
    WHERE c.table_name = '${tableName}'
    ORDER BY c.ordinal_position
  `))

  return {
    columns: result.rows.map((row) => {
      const r = row as { name: string; type: string; nullable: boolean; default_value: string | null; primary_key: boolean }
      return {
        name: r.name,
        type: r.type,
        nullable: r.nullable,
        defaultValue: r.default_value,
        primaryKey: r.primary_key,
      }
    }),
  }
}

async function main() {
  console.log('Starting database snapshot...')
  console.log(`Row limit per table: ${limit === 0 ? 'unlimited' : limit}`)
  console.log(`Preview format: ${format}`)

  // Create snapshot directory with timestamp
  const now = new Date()
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15)
  const snapshotId = `snapshot_${timestamp}`
  const snapshotDir = path.join(process.cwd(), 'context', 'db-snapshot', snapshotId)

  fs.mkdirSync(snapshotDir, { recursive: true })
  console.log(`Snapshot directory: ${snapshotDir}`)

  const metadata: Metadata = {
    snapshotId,
    createdAt: now.toISOString(),
    database: 'monitor_sys_ua',
    limit,
    format,
    tables: {},
  }

  const schemaInfo: Record<string, TableSchema> = {}

  // Export each table
  for (const table of tables) {
    process.stdout.write(`Exporting ${table.name}... `)

    try {
      // Get schema (also used for CSV header and is_deleted detection)
      const schema = await getTableSchema(table.name)
      schemaInfo[table.name] = schema

      const whereClause = (await hasColumn(table.name, 'is_deleted')) ? ' WHERE is_deleted = false' : ''

      // Get total count (respecting soft-delete filter if present)
      const totalInDb = await getTableCount(table.name, whereClause)

      // Get data with limit
      const data = await getTableData(table.name, limit, whereClause)
      const rowCount = data.length
      const truncated = limit > 0 && totalInDb > limit

      // Update metadata
      metadata.tables[table.name] = {
        rowCount,
        totalInDb,
        truncated,
      }

      // Write table data
      const tableData = {
        tableName: table.name,
        rowCount,
        totalInDb,
        truncated,
        data,
      }

      // JSON is always written to keep db-restore compatible
      fs.writeFileSync(
        path.join(snapshotDir, `${table.name}.json`),
        JSON.stringify(tableData, null, 2)
      )

      if (format === 'csv' || format === 'both') {
        writeCsv(table.name, data as Record<string, unknown>[], schema.columns, snapshotDir)
      }

      console.log(`${rowCount}/${totalInDb} rows${truncated ? ' (truncated)' : ''}`)
    } catch (error) {
      console.log(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`)
      metadata.tables[table.name] = {
        rowCount: 0,
        totalInDb: 0,
        truncated: false,
      }
    }
  }

  // Write metadata
  fs.writeFileSync(
    path.join(snapshotDir, '_metadata.json'),
    JSON.stringify(metadata, null, 2)
  )

  // Write schema
  fs.writeFileSync(
    path.join(snapshotDir, '_schema.json'),
    JSON.stringify(schemaInfo, null, 2)
  )

  console.log('\nSnapshot complete!')
  console.log(`Location: ${snapshotDir}`)

  // Summary
  const totalRows = Object.values(metadata.tables).reduce((sum, t) => sum + t.rowCount, 0)
  const truncatedTables = Object.entries(metadata.tables)
    .filter(([, t]) => t.truncated)
    .map(([name]) => name)

  console.log(`Total rows exported: ${totalRows}`)
  if (truncatedTables.length > 0) {
    console.log(`Truncated tables: ${truncatedTables.join(', ')}`)
  }

  await pool.end()
}

main().catch((error) => {
  console.error('Snapshot failed:', error)
  process.exit(1)
})
