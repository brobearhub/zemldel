import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { SERVICE_CATEGORIES_SEED, type ServiceCategorySeed } from "./seed-data/service-categories";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

function getSortOrder(seed: ServiceCategorySeed, index: number): number | null {
  if (seed.sortOrder === null) return null;
  if (typeof seed.sortOrder === "number") return seed.sortOrder;
  return index + 1;
}

async function upsertRootCategory(seed: ServiceCategorySeed, index: number) {
  return prisma.serviceCategory.upsert({
    where: { slug: seed.slug },
    update: {
      name: seed.name,
      parentId: null,
      sortOrder: getSortOrder(seed, index),
    },
    create: {
      name: seed.name,
      slug: seed.slug,
      parentId: null,
      sortOrder: getSortOrder(seed, index),
    },
    select: { id: true, slug: true },
  });
}

async function upsertChildCategory(parentId: string, seed: ServiceCategorySeed, index: number) {
  return prisma.serviceCategory.upsert({
    where: { slug: seed.slug },
    update: {
      name: seed.name,
      parentId,
      sortOrder: getSortOrder(seed, index),
    },
    create: {
      name: seed.name,
      slug: seed.slug,
      parentId,
      sortOrder: getSortOrder(seed, index),
    },
    select: { id: true, slug: true },
  });
}

async function seedServiceCategories() {
  console.log("Seeding service categories tree...\n");

  try {
    for (let i = 0; i < SERVICE_CATEGORIES_SEED.length; i++) {
      const root = SERVICE_CATEGORIES_SEED[i]!;
      const rootRow = await upsertRootCategory(root, i);

      const children = root.children ?? [];
      for (let j = 0; j < children.length; j++) {
        const child = children[j]!;
        await upsertChildCategory(rootRow.id, child, j);
      }
    }

    console.log(`Done. Upserted ${SERVICE_CATEGORIES_SEED.length} root category(ies).\n`);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void seedServiceCategories();

