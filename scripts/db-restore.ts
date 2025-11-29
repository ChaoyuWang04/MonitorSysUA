/**
 * Database Restore Script
 * Restores database from a JSON snapshot
 *
 * Usage: npx tsx scripts/db-restore.ts [snapshot_name]
 *        If snapshot_name is omitted, restores from the latest snapshot
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { sql } from 'drizzle-orm'
import * as fs from 'fs'
import * as path from 'path'

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const db = drizzle(pool)

// Tables in restore order (respecting foreign key dependencies)
const restoreOrder = [
  'accounts',
  'safety_baseline',
  'creative_test_baseline',
  'campaign_evaluation',
  'optimizer_leaderboard',
  'mock_campaign_performance',
  'mock_creative_performance',
  'af_sync_log',
  'af_events',
  'af_cohort_kpi_daily',
  'change_events',
  'creative_evaluation',
  'operation_score',
  'action_recommendation',
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

interface TableData {
  tableName: string
  rowCount: number
  data: Record<string, unknown>[]
}

function getLatestSnapshot(baseDir: string): string | null {
  if (!fs.existsSync(baseDir)) {
    return null
  }

  const snapshots = fs.readdirSync(baseDir)
    .filter((name) => name.startsWith('snapshot_'))
    .sort()
    .reverse()

  return snapshots.length > 0 ? snapshots[0] : null
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'object') {
    // JSON objects
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`
  }
  // String - escape single quotes
  return `'${String(value).replace(/'/g, "''")}'`
}

async function truncateTable(tableName: string): Promise<void> {
  await db.execute(sql.raw(`TRUNCATE TABLE ${tableName} CASCADE`))
}

async function insertData(tableName: string, data: Record<string, unknown>[]): Promise<number> {
  if (data.length === 0) {
    return 0
  }

  let insertedCount = 0

  // Insert in batches of 100
  const batchSize = 100
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)

    for (const row of batch) {
      const columns = Object.keys(row)
      const values = columns.map((col) => formatValue(row[col]))

      const insertSql = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${values.join(', ')})
        ON CONFLICT DO NOTHING
      `

      try {
        await db.execute(sql.raw(insertSql))
        insertedCount++
      } catch (error) {
        console.error(`  Error inserting row: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  return insertedCount
}

async function resetSequence(tableName: string): Promise<void> {
  // Reset the sequence to max(id) + 1 for tables with serial primary keys
  try {
    await db.execute(sql.raw(`
      SELECT setval(
        pg_get_serial_sequence('${tableName}', 'id'),
        COALESCE((SELECT MAX(id) FROM ${tableName}), 0) + 1,
        false
      )
    `))
  } catch {
    // Table might not have a sequence, ignore
  }
}

async function main() {
  const args = process.argv.slice(2)
  const snapshotName = args[0] || ''

  const baseDir = path.join(process.cwd(), 'context', 'db-snapshot')
  let snapshotDir: string

  if (snapshotName) {
    snapshotDir = path.join(baseDir, snapshotName)
    if (!fs.existsSync(snapshotDir)) {
      console.error(`Snapshot not found: ${snapshotName}`)
      console.error(`Available snapshots:`)
      const snapshots = fs.existsSync(baseDir)
        ? fs.readdirSync(baseDir).filter((n) => n.startsWith('snapshot_'))
        : []
      snapshots.forEach((s) => console.error(`  - ${s}`))
      process.exit(1)
    }
  } else {
    const latest = getLatestSnapshot(baseDir)
    if (!latest) {
      console.error('No snapshots found in context/db-snapshot/')
      process.exit(1)
    }
    snapshotDir = path.join(baseDir, latest)
    console.log(`Using latest snapshot: ${latest}`)
  }

  // Read metadata
  const metadataPath = path.join(snapshotDir, '_metadata.json')
  if (!fs.existsSync(metadataPath)) {
    console.error('Invalid snapshot: _metadata.json not found')
    process.exit(1)
  }

  const metadata: Metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))

  console.log('\n=== Snapshot Info ===')
  console.log(`Snapshot ID: ${metadata.snapshotId}`)
  console.log(`Created: ${metadata.createdAt}`)
  console.log(`Row limit: ${metadata.limit === 0 ? 'unlimited' : metadata.limit}`)

  // Check for truncated tables
  const truncatedTables = Object.entries(metadata.tables)
    .filter(([, info]) => info.truncated)
    .map(([name, info]) => `${name} (${info.rowCount}/${info.totalInDb})`)

  if (truncatedTables.length > 0) {
    console.log('\nWARNING: The following tables were truncated during snapshot:')
    truncatedTables.forEach((t) => console.log(`  - ${t}`))
    console.log('Restoring will result in incomplete data for these tables.')
  }

  console.log('\n=== Starting Restore ===')

  // Restore tables in order
  for (const tableName of restoreOrder) {
    const tableFile = path.join(snapshotDir, `${tableName}.json`)

    if (!fs.existsSync(tableFile)) {
      console.log(`Skipping ${tableName}: no data file`)
      continue
    }

    process.stdout.write(`Restoring ${tableName}... `)

    try {
      const tableData: TableData = JSON.parse(fs.readFileSync(tableFile, 'utf-8'))

      // Truncate existing data
      await truncateTable(tableName)

      // Insert new data
      const inserted = await insertData(tableName, tableData.data)

      // Reset sequence
      await resetSequence(tableName)

      console.log(`${inserted}/${tableData.rowCount} rows`)
    } catch (error) {
      console.log(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  console.log('\nRestore complete!')

  await pool.end()
}

main().catch((error) => {
  console.error('Restore failed:', error)
  process.exit(1)
})
