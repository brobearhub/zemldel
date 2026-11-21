import { Prisma } from '@prisma/client';
import {
  REQUEST_FEED_EXCLUDED_STATUSES,
  type ParsedRequestListFeed,
  type RequestFeedCursor,
} from './request-list-query';

export type RequestFeedPageIndex = {
  total: number;
  needsReply: number;
  rows: RequestFeedCursor[];
};

/** Select only page IDs and counters; fetch full cards for these IDs afterwards. */
export function requestFeedPageQuery(
  providerId: string,
  query: Extract<ParsedRequestListFeed, { ok: true }>,
  regionCode: string | null,
  categoryIds: readonly string[],
): Prisma.Sql {
  const scope =
    query.scope.kind === 'service'
      ? Prisma.sql`r."serviceId" = ${query.scope.serviceId}::uuid AND r."providerId" = ${providerId}::uuid`
      : Prisma.sql`r."serviceId" IS NULL AND (
        r."providerId" = ${providerId}::uuid OR (
          r."providerWorkStatus" IS NULL AND ${regionCode !== null} AND city."regionCode" = ${regionCode}
          AND (r."categoryId" IS NULL OR r."categoryId" = ANY(${categoryIds}::uuid[]))
          AND ((r."providerId" IS NULL AND r.status IN ('NEW', 'DISCUSSING'))
            OR (r."providerId" IS NOT NULL AND r.status = 'ACTIVE'))
        )
      )`;
  // Match only the name exposed by the DTO, never a locked customer's hidden name.
  const name = Prisma.sql`CASE
    WHEN r."lockedAt" IS NOT NULL AND r."providerId" IS NOT NULL AND r."providerId" <> ${providerId}::uuid THEN ''
    ELSE COALESCE(NULLIF(BTRIM(r."customerName"), ''), NULLIF(BTRIM(u.name), ''), '') END`;
  const words = query.search.split(' ').filter(Boolean);
  const search = words.length
    ? Prisma.join(
        words.map(
          (word) =>
            Prisma.sql`POSITION(${word} IN REPLACE(LOWER(CONCAT(COALESCE(r.number::text, ''), ' ', ${name})), 'ё', 'е')) > 0`,
        ),
        ' AND ',
      )
    : Prisma.sql`TRUE`;
  const cursor = query.cursor;
  const after = cursor
    ? Prisma.sql`(priority > ${cursor.priority} OR (priority = ${cursor.priority} AND
        ("createdAt" < ${cursor.createdAt}::timestamp OR ("createdAt" = ${cursor.createdAt}::timestamp AND id < ${cursor.id}::uuid))))`
    : Prisma.sql`TRUE`;

  return Prisma.sql`
    WITH eligible AS (
      SELECT r.id, r."createdAt", r.status,
        COALESCE(reply."providerAt" > reply."customerAt", FALSE) AS waiting
      FROM "Request" r
      LEFT JOIN "User" u ON u.id = r."customerUserId"
      LEFT JOIN "City" city ON city.id = COALESCE(r."requestCityId", u."customerCityId")
      LEFT JOIN LATERAL (
        SELECT
          MAX(m."createdAt") FILTER (WHERE m."senderUserId" = c."customerUserId" AND m.body ~ '[^[:space:]]') AS "customerAt",
          MAX(m."createdAt") FILTER (WHERE m."senderUserId" <> c."customerUserId") AS "providerAt"
        FROM "Conversation" c JOIN "Message" m ON m."conversationId" = c.id
        WHERE c."requestId" = r.id AND c."providerId" = ${providerId}::uuid AND m.kind = 'USER'
      ) reply ON TRUE
      WHERE r.status::text NOT IN (${Prisma.join(REQUEST_FEED_EXCLUDED_STATUSES)})
        AND (${scope}) AND (${search})
    ), ranked AS (
      SELECT id, "createdAt", waiting,
        (CASE WHEN waiting THEN 2 ELSE 0 END + CASE WHEN status = 'NEW' THEN 0 ELSE 1 END) AS priority
      FROM eligible
    ), page AS (
      SELECT id, "createdAt", priority FROM ranked WHERE ${after}
      ORDER BY priority, "createdAt" DESC, id DESC LIMIT ${query.limit + 1}
    )
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE NOT waiting)::int AS "needsReply",
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'priority', priority,
        'createdAt', to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      ) ORDER BY priority, "createdAt" DESC, id DESC) FROM page), '[]'::jsonb) AS rows
    FROM ranked
  `;
}
