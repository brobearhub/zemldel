import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  RUSSIAN_CAPITALS,
  capitalIdsToInsert,
  missingRegionalCapitals,
  pickRegionalCapitalCities,
  regionalCapitalSearchNames,
} from "../src/cities/russian-capitals";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function seedRegionalCapitals() {
  console.log("Seeding regional capitals...\n");

  try {
    const rows = await prisma.city.findMany({
      where: {
        status: "ACTIVE",
        OR: RUSSIAN_CAPITALS.flatMap((capital) => {
          const names = regionalCapitalSearchNames(capital);
          const regionCodes = [
            ...new Set([capital.regionCode, String(Number(capital.regionCode))]),
          ];
          return names.flatMap((name) =>
            regionCodes.map((regionCode) => ({
              name: { equals: name, mode: "insensitive" as const },
              regionCode,
            })),
          );
        }),
      },
      select: {
        id: true,
        name: true,
        typeName: true,
        level: true,
        regionCode: true,
        regionName: true,
      },
    });
    const picked = pickRegionalCapitalCities(rows);
    const existing = await prisma.regionalCapital.findMany({
      select: { cityId: true },
    });
    const toInsert = capitalIdsToInsert(
      picked.map((row) => row.id),
      existing.map((row) => row.cityId),
    );

    if (toInsert.length > 0) {
      await prisma.regionalCapital.createMany({
        data: toInsert.map((cityId) => ({ cityId })),
      });
    }

    const unresolved = missingRegionalCapitals(rows);

    console.log(
      `Done. Added ${toInsert.length}, already present ${picked.length - toInsert.length}, unresolved ${unresolved.length}.`,
    );
    if (unresolved.length > 0) {
      console.log(
        `Not in City: ${unresolved.map((item) => `${item.name} (${item.regionCode})`).join(", ")}`,
      );
    }
  } catch (error) {
    console.error("Seeding error:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void seedRegionalCapitals();
