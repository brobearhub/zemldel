import { PrismaClient } from '@prisma/client';

export const GAR_SNAPSHOT_TABLE = '_GarCitySnapshot';
export const GAR_ADDED_TABLE = '_GarCityAdded';
export const GAR_REACTIVATED_TABLE = '_GarCityReactivated';
export const GAR_DEACTIVATED_TABLE = '_GarCityDeactivated';

export type GarCitySnapshotRow = {
  garObjectId: bigint;
  objectGuid: string;
  name: string;
  typeName: string;
  level: number;
  regionCode: string;
  regionName: string;
};

export type ReconcileOptions = {
  mode: string;
  sourceLabel: string | null;
};

export type ReconcileStats = {
  runId: string;
  snapshotCount: number;
  addedCount: number;
  updatedCount: number;
  deactivatedCount: number;
  reactivatedCount: number;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function buildSnapshotInsertSql(rows: GarCitySnapshotRow[]): string {
  const values = rows
    .map(
      (row) =>
        `(${row.garObjectId}, ${sqlString(row.objectGuid)}::uuid, ${sqlString(row.name)}, ${sqlString(row.typeName)}, ${row.level}, ${sqlString(row.regionCode)}, ${sqlString(row.regionName)})`,
    )
    .join(',\n');
  return `
    INSERT INTO "${GAR_SNAPSHOT_TABLE}" (
      "garObjectId", "objectGuid", name, "typeName", level, "regionCode", "regionName"
    ) VALUES
    ${values}
  `;
}

async function createSnapshotTable(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${GAR_SNAPSHOT_TABLE}"`);
  await prisma.$executeRawUnsafe(`
    CREATE TEMP TABLE "${GAR_SNAPSHOT_TABLE}" (
      "garObjectId" bigint PRIMARY KEY,
      "objectGuid" uuid NOT NULL,
      name text NOT NULL,
      "typeName" text NOT NULL,
      level integer NOT NULL,
      "regionCode" text NOT NULL,
      "regionName" text NOT NULL
    ) ON COMMIT DROP
  `);
}

async function createDiffTables(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TEMP TABLE "${GAR_ADDED_TABLE}" (
      "garObjectId" bigint PRIMARY KEY
    ) ON COMMIT DROP
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TEMP TABLE "${GAR_REACTIVATED_TABLE}" (
      "garObjectId" bigint PRIMARY KEY
    ) ON COMMIT DROP
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TEMP TABLE "${GAR_DEACTIVATED_TABLE}" (
      "garObjectId" bigint PRIMARY KEY
    ) ON COMMIT DROP
  `);
}

async function loadSnapshot(
  prisma: PrismaClient,
  cities: GarCitySnapshotRow[],
  batchSize: number,
): Promise<void> {
  for (const [index, batch] of chunk(cities, batchSize).entries()) {
    await prisma.$executeRawUnsafe(buildSnapshotInsertSql(batch));
    if ((index + 1) % 20 === 0 || index === 0) {
      console.log(
        `Snapshot loaded: ${Math.min((index + 1) * batchSize, cities.length)}/${cities.length}`,
      );
    }
  }
}

async function countRows(prisma: PrismaClient, sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(sql);
  return rows[0]?.count ?? 0;
}

export async function reconcileGarCities(
  prisma: PrismaClient,
  cities: GarCitySnapshotRow[],
  opts: ReconcileOptions,
  batchSize = 1000,
): Promise<ReconcileStats> {
  return prisma.$transaction(
    async (tx) => reconcileGarCitiesInTransaction(tx as unknown as PrismaClient, cities, opts, batchSize),
    { maxWait: 60_000, timeout: 600_000 },
  );
}

async function reconcileGarCitiesInTransaction(
  prisma: PrismaClient,
  cities: GarCitySnapshotRow[],
  opts: ReconcileOptions,
  batchSize: number,
): Promise<ReconcileStats> {
  const run = await prisma.cityImportRun.create({
    data: {
      mode: opts.mode,
      sourceLabel: opts.sourceLabel,
      snapshotCount: cities.length,
    },
  });

  const runId = run.id;

  await createSnapshotTable(prisma);
    await createDiffTables(prisma);
    await loadSnapshot(prisma, cities, batchSize);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "${GAR_ADDED_TABLE}" ("garObjectId")
      SELECT s."garObjectId"
      FROM "${GAR_SNAPSHOT_TABLE}" s
      WHERE NOT EXISTS (
        SELECT 1 FROM "City" c WHERE c."garObjectId" = s."garObjectId"
      )
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "${GAR_REACTIVATED_TABLE}" ("garObjectId")
      SELECT c."garObjectId"
      FROM "City" c
      INNER JOIN "${GAR_SNAPSHOT_TABLE}" s ON c."garObjectId" = s."garObjectId"
      WHERE c.status = 'INACTIVE'::"CityStatus"
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "${GAR_DEACTIVATED_TABLE}" ("garObjectId")
      SELECT c."garObjectId"
      FROM "City" c
      WHERE c.status = 'ACTIVE'::"CityStatus"
        AND NOT EXISTS (
          SELECT 1 FROM "${GAR_SNAPSHOT_TABLE}" s WHERE s."garObjectId" = c."garObjectId"
        )
    `);

    const addedCount = await countRows(
      prisma,
      `SELECT COUNT(*)::int AS count FROM "${GAR_ADDED_TABLE}"`,
    );
    const reactivatedCount = await countRows(
      prisma,
      `SELECT COUNT(*)::int AS count FROM "${GAR_REACTIVATED_TABLE}"`,
    );
    const deactivatedCount = await countRows(
      prisma,
      `SELECT COUNT(*)::int AS count FROM "${GAR_DEACTIVATED_TABLE}"`,
    );
    const updatedCount = await countRows(
      prisma,
      `
        SELECT COUNT(*)::int AS count
        FROM "City" c
        INNER JOIN "${GAR_SNAPSHOT_TABLE}" s ON c."garObjectId" = s."garObjectId"
        WHERE c.status = 'ACTIVE'::"CityStatus"
          AND NOT EXISTS (
            SELECT 1 FROM "${GAR_ADDED_TABLE}" a WHERE a."garObjectId" = c."garObjectId"
          )
          AND (
            c."objectGuid" IS DISTINCT FROM s."objectGuid"
            OR c.name IS DISTINCT FROM s.name
            OR c."typeName" IS DISTINCT FROM s."typeName"
            OR c.level IS DISTINCT FROM s.level
            OR c."regionCode" IS DISTINCT FROM s."regionCode"
            OR c."regionName" IS DISTINCT FROM s."regionName"
          )
      `,
    );

    await prisma.$executeRawUnsafe(`
      INSERT INTO "City" (
        id,
        "garObjectId",
        "objectGuid",
        name,
        "typeName",
        level,
        "regionCode",
        "regionName",
        status,
        "deactivatedAt",
        "createdAt",
        "updatedAt"
      )
      SELECT
        gen_random_uuid(),
        s."garObjectId",
        s."objectGuid",
        s.name,
        s."typeName",
        s.level,
        s."regionCode",
        s."regionName",
        'ACTIVE'::"CityStatus",
        NULL,
        NOW(),
        NOW()
      FROM "${GAR_SNAPSHOT_TABLE}" s
      INNER JOIN "${GAR_ADDED_TABLE}" a ON a."garObjectId" = s."garObjectId"
    `);

    await prisma.$executeRawUnsafe(`
      UPDATE "City" c
      SET
        "objectGuid" = s."objectGuid",
        name = s.name,
        "typeName" = s."typeName",
        level = s.level,
        "regionCode" = s."regionCode",
        "regionName" = s."regionName",
        status = 'ACTIVE'::"CityStatus",
        "deactivatedAt" = NULL,
        "updatedAt" = NOW()
      FROM "${GAR_SNAPSHOT_TABLE}" s
      WHERE c."garObjectId" = s."garObjectId"
        AND NOT EXISTS (
          SELECT 1 FROM "${GAR_ADDED_TABLE}" a WHERE a."garObjectId" = c."garObjectId"
        )
    `);

    await prisma.$executeRawUnsafe(`
      UPDATE "City" c
      SET
        status = 'INACTIVE'::"CityStatus",
        "deactivatedAt" = NOW(),
        "updatedAt" = NOW()
      FROM "${GAR_DEACTIVATED_TABLE}" d
      WHERE c."garObjectId" = d."garObjectId"
    `);

    const runIdSql = sqlString(runId);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "CityImportEvent" (
        id, "runId", "cityId", "garObjectId", "eventType",
        name, "regionCode", "regionName", "previousStatus", "newStatus"
      )
      SELECT
        gen_random_uuid(),
        ${runIdSql}::uuid,
        c.id,
        c."garObjectId",
        'ADDED'::"CityImportEventType",
        c.name,
        c."regionCode",
        c."regionName",
        NULL,
        'ACTIVE'::"CityStatus"
      FROM "City" c
      INNER JOIN "${GAR_ADDED_TABLE}" a ON a."garObjectId" = c."garObjectId"
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "CityImportEvent" (
        id, "runId", "cityId", "garObjectId", "eventType",
        name, "regionCode", "regionName", "previousStatus", "newStatus"
      )
      SELECT
        gen_random_uuid(),
        ${runIdSql}::uuid,
        c.id,
        c."garObjectId",
        'REACTIVATED'::"CityImportEventType",
        c.name,
        c."regionCode",
        c."regionName",
        'INACTIVE'::"CityStatus",
        'ACTIVE'::"CityStatus"
      FROM "City" c
      INNER JOIN "${GAR_REACTIVATED_TABLE}" r ON r."garObjectId" = c."garObjectId"
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "CityImportEvent" (
        id, "runId", "cityId", "garObjectId", "eventType",
        name, "regionCode", "regionName", "previousStatus", "newStatus"
      )
      SELECT
        gen_random_uuid(),
        ${runIdSql}::uuid,
        c.id,
        c."garObjectId",
        'DEACTIVATED'::"CityImportEventType",
        c.name,
        c."regionCode",
        c."regionName",
        'ACTIVE'::"CityStatus",
        'INACTIVE'::"CityStatus"
      FROM "City" c
      INNER JOIN "${GAR_DEACTIVATED_TABLE}" d ON d."garObjectId" = c."garObjectId"
    `);

    await prisma.cityImportRun.update({
      where: { id: runId },
      data: {
        finishedAt: new Date(),
        addedCount,
        updatedCount,
        deactivatedCount,
        reactivatedCount,
      },
    });

    return {
      runId,
      snapshotCount: cities.length,
      addedCount,
      updatedCount,
      deactivatedCount,
      reactivatedCount,
    };
}
