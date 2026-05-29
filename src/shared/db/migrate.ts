
import fs   from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export async function runMigrations() {
  const client = await pool.connect();

  try {
    // Create tracking table if it doesn't exist yet
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Read all .sql files, sort alphabetically (001, 002, 003...)
    const files = (await fs.readdir(MIGRATIONS_DIR))
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      // Has this migration already been applied?
      const { rowCount } = await client.query(
        'SELECT 1 FROM _migrations WHERE filename = $1',
        [file]
      );

      if (rowCount && rowCount > 0) {
        console.log(`[migrate] skipping ${file} (already applied)`);
        continue;
      }

      // Run the migration inside a transaction
      // If the SQL fails, the whole migration rolls back — no partial state
      const sql = await fs.readFile(
        path.join(MIGRATIONS_DIR, file), 'utf-8'
      );

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[migrate] applied ${file} ✓`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`[migrate] FAILED on ${file}: ${String(err)}`);
      }
    }

    console.log('[migrate] all migrations up to date ✓');
  } finally {
    client.release();
  }
}
