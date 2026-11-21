import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  requestFeedPageQuery,
  type RequestFeedPageIndex,
} from './request-list-page';
import {
  encodeRequestFeedCursor,
  parseRequestListFeedQuery,
} from './request-list-query';

const provider = randomUUID();
const otherProvider = randomUUID();
const service = randomUUID();
const customer = randomUUID();
const category = randomUUID();
const city = randomUUID();
const otherCity = randomUUID();

describe.skipIf(!process.env.DATABASE_URL)(
  'request feed pagination in PostgreSQL',
  () => {
    let db: Client;
    beforeAll(async () => {
      db = new Client({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5000,
        statement_timeout: 15000,
      });
      await db.connect();
      // Temporary tables shadow the application tables only on this test connection.
      await db.query(`
      CREATE TEMP TABLE "City" (id uuid PRIMARY KEY, "regionCode" text);
      CREATE TEMP TABLE "User" (id uuid PRIMARY KEY, name text, "customerCityId" uuid);
      CREATE TEMP TABLE "Request" (id uuid PRIMARY KEY, number int, status text, "serviceId" uuid, "categoryId" uuid,
        "providerId" uuid, "customerUserId" uuid, "requestCityId" uuid, "customerName" text, "lockedAt" timestamp, "createdAt" timestamp, "providerWorkStatus" text);
      CREATE TEMP TABLE "Conversation" (id uuid PRIMARY KEY, "requestId" uuid, "providerId" uuid, "customerUserId" uuid);
      CREATE TEMP TABLE "Message" ("conversationId" uuid, "senderUserId" uuid, body text, kind text, "createdAt" timestamp);
    `);
    });
    afterAll(async () => {
      await db?.end();
    });
    beforeEach(async () => {
      await db.query(
        'TRUNCATE pg_temp."Message", pg_temp."Conversation", pg_temp."Request", pg_temp."User", pg_temp."City"',
      );
      await db.query('INSERT INTO pg_temp."City" VALUES ($1, $3), ($2, $4)', [
        city,
        otherCity,
        '66',
        '77',
      ]);
      await db.query('INSERT INTO pg_temp."User" VALUES ($1, $2, $3)', [
        customer,
        'Артём Соколов',
        city,
      ]);
    });

    async function seed(count: number, free = false) {
      const ids = Array.from({ length: count }, () => randomUUID());
      for (const [index, id] of ids.entries()) {
        await db.query(
          `INSERT INTO pg_temp."Request" (id, number, status, "serviceId", "providerId", "customerUserId", "createdAt")
        VALUES ($1, $2, 'NEW', $3, $4, $5, $6)`,
          [
            id,
            index + 101,
            free ? null : service,
            free ? null : provider,
            customer,
            new Date(Date.UTC(2026, 0, 1, 0, 0, count - index)),
          ],
        );
      }
      return ids;
    }

    async function page(
      options: {
        cursor?: string;
        limit?: string;
        search?: string;
        scope?: string;
      } = {},
    ) {
      const parsed = parseRequestListFeedQuery(
        options.scope ? options : { serviceId: service, ...options },
      );
      if (!parsed.ok) throw new Error(parsed.message);
      const sql = requestFeedPageQuery(provider, parsed, '66', [category]);
      const { rows } = await db.query<RequestFeedPageIndex>(
        sql.text,
        sql.values,
      );
      const index = rows[0];
      const items = index.rows.slice(0, parsed.limit);
      const hasMore = index.rows.length > parsed.limit;
      return {
        ...index,
        items,
        hasMore,
        nextCursor: hasMore
          ? encodeRequestFeedCursor(items.at(-1)!)
          : undefined,
      };
    }

    it.each([false, true])(
      'loads 3 + 5 + 5 + 2, excludes terminal statuses and has no duplicates (free=%s)',
      async (free) => {
        const ids = await seed(18, free);
        for (const [index, status] of [
          'COMPLETED',
          'CLOSED',
          'CANCELLED',
        ].entries()) {
          await db.query(
            'UPDATE pg_temp."Request" SET status = $2 WHERE id = $1',
            [ids[index], status],
          );
        }
        const scope = free ? { scope: 'free' } : {};
        let result = await page(scope);
        expect(result.total).toBe(15);
        expect(result.items).toHaveLength(3);
        const seen = result.items.map((row) => row.id);
        for (const size of [5, 5, 2]) {
          expect(result.hasMore).toBe(true);
          result = await page({
            ...scope,
            cursor: result.nextCursor,
            limit: '5',
          });
          expect(result.items).toHaveLength(size);
          seen.push(...result.items.map((row) => row.id));
        }
        expect(result.hasMore).toBe(false);
        expect(new Set(seen).size).toBe(15);
        expect(seen).toEqual(ids.slice(3));
      },
    );

    it('finds number substrings and name parts beyond the first page, using the displayed name', async () => {
      const ids = await seed(25);
      await db.query(
        'UPDATE pg_temp."Request" SET "customerName" = $2 WHERE id <> $1',
        [ids[24], 'Иван Иванов'],
      );
      for (const search of [
        '25',
        '№ 125',
        'артем',
        'СОКОЛ',
        '  соколов   артём  ',
      ]) {
        const result = await page({ search });
        expect(result.items.map((row) => row.id)).toEqual([ids[24]]);
        expect(result.total).toBe(1);
      }
      expect((await page({ search: 'несуществующий' })).total).toBe(0);
    });

    it('keeps region/category/ownership rules and does not search locked customer names', async () => {
      const ids = await seed(8, true);
      await db.query(
        'UPDATE pg_temp."Request" SET "providerId" = $2, status = $3, "providerWorkStatus" = $4, "lockedAt" = now() WHERE id = $1',
        [ids[7], otherProvider, 'ACTIVE', 'IN_PROGRESS'],
      );
      await db.query(
        'UPDATE pg_temp."Request" SET "requestCityId" = $2 WHERE id = $1',
        [ids[1], otherCity],
      );
      await db.query(
        'UPDATE pg_temp."Request" SET "categoryId" = $2 WHERE id = $1',
        [ids[2], randomUUID()],
      );
      await db.query(
        'UPDATE pg_temp."Request" SET "providerId" = $2 WHERE id = $1',
        [ids[3], otherProvider],
      );
      await db.query(
        'UPDATE pg_temp."Request" SET "providerId" = $2, status = $3, "lockedAt" = now() WHERE id = $1',
        [ids[4], otherProvider, 'ACTIVE'],
      );
      await db.query(
        'UPDATE pg_temp."Request" SET "providerId" = $2, "requestCityId" = $3 WHERE id = $1',
        [ids[5], provider, otherCity],
      );
      await db.query(
        'UPDATE pg_temp."Request" SET "categoryId" = $2 WHERE id = $1',
        [ids[6], category],
      );
      const result = await page({ scope: 'free', limit: '5' });
      expect(new Set(result.items.map((row) => row.id))).toEqual(
        new Set([ids[0], ids[4], ids[5], ids[6]]),
      );
      expect(
        (
          await page({ scope: 'free', limit: '5', search: 'соколов' })
        ).items.map((row) => row.id),
      ).not.toContain(ids[4]);
      expect((await page()).total).toBe(0);
    });

    it('uses a stable tie-breaker and keeps unanswered requests first', async () => {
      const ids = await seed(5);
      await db.query('UPDATE pg_temp."Request" SET "createdAt" = $1', [
        new Date('2026-01-01T00:00:00.123Z'),
      ]);
      const conversation = randomUUID();
      await db.query(
        'INSERT INTO pg_temp."Conversation" VALUES ($1, $2, $3, $4)',
        [conversation, ids[0], provider, customer],
      );
      await db.query(
        `INSERT INTO pg_temp."Message" VALUES ($1, $2, 'Вопрос', 'USER', '2026-01-02'), ($1, $3, 'Ответ', 'USER', '2026-01-03')`,
        [conversation, customer, randomUUID()],
      );
      const first = await page();
      expect(first.needsReply).toBe(4);
      expect(first.items.map((row) => row.id)).not.toContain(ids[0]);
      const next = await page({ cursor: first.nextCursor, limit: '5' });
      expect(next.items.at(-1)?.id).toBe(ids[0]);
      expect(
        new Set([...first.items, ...next.items].map((row) => row.id)).size,
      ).toBe(5);
    });
  },
);
