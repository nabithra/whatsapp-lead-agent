import { Pool, QueryResultRow } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  try {
    const result = await pool.query<T>(sql, params);
    return result.rows;
  } catch (err) {
    console.error('[db] Query error:', { sql, params, error: err });
    throw err;
  }
}
