/**
 * Database Snapshot Script
 * Exports all tables to JSON format with schema information
 *
 * Usage: npx tsx scripts/db-snapshot.ts --limit 10000
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { sql } from 'drizzle-orm'
import * as fs from 'fs'
import * as path from 'path'

// Parse command line arguments
const args = process.argv.slice(2)
const limitIndex = args.indexOf('--limit')
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 10000

// Database connection
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

async function getTableCount(tableName: string): Promise<number> {
  const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`))
  return parseInt((result.rows[0] as { count: string }).count, 10)
}

async function getTableData(tableName: string, rowLimit: number): Promise<unknown[]> {
  const query = rowLimit > 0
    ? sql.raw(`SELECT * FROM ${tableName} ORDER BY id LIMIT ${rowLimit}`)
    : sql.raw(`SELECT * FROM ${tableName} ORDER BY id`)

  try {
    const result = await db.execute(query)
    return result.rows as unknown[]
  } catch {
    // Table might not have 'id' column, try without ORDER BY
    const fallbackQuery = rowLimit > 0
      ? sql.raw(`SELECT * FROM ${tableName} LIMIT ${rowLimit}`)
      : sql.raw(`SELECT * FROM ${tableName}`)
    const result = await db.execute(fallbackQuery)
    return result.rows as unknown[]
  }
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
    tables: {},
  }

  const schemaInfo: Record<string, TableSchema> = {}

  // Export each table
  for (const table of tables) {
    process.stdout.write(`Exporting ${table.name}... `)

    try {
      // Get total count
      const totalInDb = await getTableCount(table.name)

      // Get schema
      schemaInfo[table.name] = await getTableSchema(table.name)

      // Get data with limit
      const data = await getTableData(table.name, limit)
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

      fs.writeFileSync(
        path.join(snapshotDir, `${table.name}.json`),
        JSON.stringify(tableData, null, 2)
      )

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
