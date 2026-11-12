import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.DATABASE_URL;
const migrationPath = resolve(
  process.cwd(),
  'prisma/migrations/20261112200000_request_numbers/migration.sql',
);

describe.skipIf(!databaseUrl)('request numbering on PostgreSQL', () => {
  let pool: Pool;
  let migration: string;
  const schemas: string[] = [];

  beforeAll(async () => {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 12,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 15_000,
    });
    migration = await readFile(migrationPath, 'utf8');
  });

  afterEach(async () => {
    for (const schema of schemas.splice(0)) {
      await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
    }
  });

  afterAll(async () => {
    await pool?.end();
  });

  async function database(seed?: (client: PoolClient) => Promise<void>) {
    const schema = `request_numbers_${randomUUID().replaceAll('-', '')}`;
    await pool.query(`CREATE SCHEMA "${schema}"`);
    schemas.push(schema);

    async function withClient<T>(run: (client: PoolClient) => Promise<T>) {
      const client = await pool.connect();
      try {
        await client.query(`SET search_path TO "${schema}", public`);
        return await run(client);
      } finally {
        await client.query('ROLLBACK');
        await client.query('RESET search_path');
        client.release();
      }
    }

    await withClient(async (client) => {
      await client.query(`
        CREATE TABLE "Request" (
          "id" UUID PRIMARY KEY,
          "serviceId" UUID,
          "categoryId" UUID,
          "providerId" UUID,
          "lockedAt" TIMESTAMPTZ,
          "contractAcceptedAt" TIMESTAMPTZ,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      if (seed) await seed(client);
      await client.query(migration);
    });

    return {
      withClient,
      query: (sql: string, values: unknown[] = []) =>
        withClient((client) => client.query(sql, values)),
    };
  }

  it('backfills existing numbers by creation or contract acceptance and continues the counter', async () => {
    const ids = Array.from({ length: 5 }, () => randomUUID());
    const db = await database(async (client) => {
      await client.query(
        `
        INSERT INTO "Request" ("id", "serviceId", "categoryId", "createdAt", "contractAcceptedAt") VALUES
          ($1, $6, NULL, '2026-01-01', NULL),
          ($2, NULL, NULL, '2025-12-01', '2026-01-03'),
          ($3, $6, NULL, '2026-01-02', NULL),
          ($4, NULL, $7, '2025-12-02', '2026-01-04'),
          ($5, NULL, NULL, '2025-11-01', NULL)
      `,
        [...ids, randomUUID(), randomUUID()],
      );
    });
    const rows = await db.query('SELECT "id", "number" FROM "Request"');
    const numbers = new Map(rows.rows.map((row) => [row.id, row.number]));
    expect(ids.map((id) => numbers.get(id))).toEqual([1, 3, 2, 4, null]);
    const next = await db.query(
      'INSERT INTO "Request" ("id", "serviceId") VALUES ($1, $2) RETURNING "number"',
      [randomUUID(), randomUUID()],
    );
    expect(next.rows[0].number).toBe(5);
  });

  it('numbers service requests immediately and free/category requests only on contract acceptance', async () => {
    const db = await database();
    const service = randomUUID();
    const free = randomUUID();
    const category = randomUUID();
    const created = await db.query(
      `
      INSERT INTO "Request" ("id", "serviceId", "categoryId") VALUES
        ($1, $4, NULL), ($2, NULL, NULL), ($3, NULL, $5)
      RETURNING "id", "number"
    `,
      [service, free, category, randomUUID(), randomUUID()],
    );
    expect(created.rows.map((row) => row.number)).toEqual([1, null, null]);
    const selected = await db.query(
      'UPDATE "Request" SET "providerId" = $2, "lockedAt" = now() WHERE "id" = $1 RETURNING "number"',
      [free, randomUUID()],
    );
    expect(selected.rows[0].number).toBeNull();
    const accepted = await db.query(
      'UPDATE "Request" SET "contractAcceptedAt" = now() WHERE "id" IN ($1, $2) RETURNING "number"',
      [free, category],
    );
    expect(accepted.rows.map((row) => row.number).sort()).toEqual([2, 3]);
  });

  it('allocates one shared consecutive range across concurrent creations and acceptances', async () => {
    const db = await database();
    const freeIds = Array.from({ length: 6 }, () => randomUUID());
    for (const id of freeIds) {
      await db.query('INSERT INTO "Request" ("id") VALUES ($1)', [id]);
    }
    const results = await Promise.all([
      ...freeIds.map((id) =>
        db.query(
          'UPDATE "Request" SET "contractAcceptedAt" = now() WHERE "id" = $1 RETURNING "number"',
          [id],
        ),
      ),
      ...Array.from({ length: 6 }, () =>
        db.query(
          'INSERT INTO "Request" ("id", "serviceId") VALUES ($1, $2) RETURNING "number"',
          [randomUUID(), randomUUID()],
        ),
      ),
    ]);
    expect(
      results.map((result) => result.rows[0].number).sort((a, b) => a - b),
    ).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
  });

  it('rolls allocations back with the request transaction', async () => {
    const db = await database();
    await expect(
      db.withClient(async (client) => {
        await client.query('BEGIN');
        const result = await client.query(
          'INSERT INTO "Request" ("id", "serviceId") VALUES ($1, $2) RETURNING "number"',
          [randomUUID(), randomUUID()],
        );
        expect(result.rows[0].number).toBe(1);
        throw new Error('Contract or request transaction failed');
      }),
    ).rejects.toThrow('transaction failed');
    const next = await db.query(
      'INSERT INTO "Request" ("id", "serviceId") VALUES ($1, $2) RETURNING "number"',
      [randomUUID(), randomUUID()],
    );
    expect(next.rows[0].number).toBe(1);
  });

  it('keeps numbers immutable and does not reuse numbers after deletion or repeated writes', async () => {
    const db = await database();
    const id = randomUUID();
    await db.query(
      'INSERT INTO "Request" ("id", "serviceId") VALUES ($1, $2)',
      [id, randomUUID()],
    );
    await db.query(
      'INSERT INTO "Request" ("id", "serviceId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, randomUUID()],
    );
    await db.query(
      'UPDATE "Request" SET "serviceId" = NULL, "contractAcceptedAt" = now() WHERE "id" = $1',
      [id],
    );
    await expect(
      db.query('UPDATE "Request" SET "number" = 99 WHERE "id" = $1', [id]),
    ).rejects.toThrow('cannot be changed');
    await expect(
      db.query('INSERT INTO "Request" ("id", "number") VALUES ($1, 99)', [
        randomUUID(),
      ]),
    ).rejects.toThrow('assigned automatically');
    await db.query('DELETE FROM "Request" WHERE "id" = $1', [id]);
    const next = await db.query(
      'INSERT INTO "Request" ("id", "serviceId") VALUES ($1, $2) RETURNING "number"',
      [randomUUID(), randomUUID()],
    );
    expect(next.rows[0].number).toBe(2);
  });

  it('assigns a single number when contract acceptance is retried concurrently', async () => {
    const db = await database();
    const id = randomUUID();
    await db.query('INSERT INTO "Request" ("id") VALUES ($1)', [id]);
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        db.query(
          'UPDATE "Request" SET "contractAcceptedAt" = now() WHERE "id" = $1 RETURNING "number"',
          [id],
        ),
      ),
    );
    expect(results.map((result) => result.rows[0].number)).toEqual(
      Array(8).fill(1),
    );
    const counter = await db.query(
      'SELECT "lastNumber" FROM "RequestNumberCounter"',
    );
    expect(counter.rows[0].lastNumber).toBe(1);
  });
});
