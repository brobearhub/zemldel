import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ProviderType, ServiceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

type Rng = () => number; // [0,1)

function mulberry32(seed: number): Rng {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickOne<T>(arr: readonly T[], rng: Rng): T {
  if (!arr.length) throw new Error("pickOne: empty array");
  return arr[Math.floor(rng() * arr.length)]!;
}

function uniqBy<T, K extends string | number>(items: readonly T[], key: (i: T) => K): T[] {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const it of items) {
    const k = key(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function makePriceRub(rng: Rng): string {
  const base = [5500, 15000, 18000, 22000, 25000, 28000, 30000, 32000, 35000, 38000, 40000, 45000, 50000];
  const v = pickOne(base, rng);
  return `от ${v.toLocaleString("ru-RU")} ₽`;
}

function assertDemoSeedAllowed() {
  const isProd = process.env.NODE_ENV === "production";
  const allow = process.env.ALLOW_DEMO_SEED === "1";
  if (isProd && !allow) {
    throw new Error("Refusing to run demo seed in production. Set ALLOW_DEMO_SEED=1 to override.");
  }
}

async function getActiveCitiesSample() {
  const cities = await prisma.city.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, regionCode: true, regionName: true },
    orderBy: [{ name: "asc" }],
    take: 300,
  });
  if (!cities.length) throw new Error("City table is empty. Please import/restore cities first.");
  return cities;
}

async function getEkbCity() {
  const rows = await prisma.city.findMany({
    where: { status: "ACTIVE", name: "Екатеринбург" },
    select: { id: true, name: true, typeName: true, level: true },
    take: 50,
  });
  if (!rows.length) throw new Error('ACTIVE city "Екатеринбург" was not found in DB.');

  // Align with CitiesService suggestion ranking: prefer "г" level 5.
  const rank = (row: { typeName: string; level: number }) => {
    if (row.typeName === "г" && row.level === 5) return 0;
    if (row.typeName === "г" && row.level === 1) return 1;
    if (row.level === 6) return 2;
    if (row.level === 4) return 3;
    if (row.level === 3) return 4;
    if (row.level === 2) return 5;
    return 99;
  };

  const best = [...rows].sort((a, b) => rank(a) - rank(b))[0]!;
  return { id: best.id, name: best.name };
}

async function getLeafCategories() {
  // Этап 1: дерево 2 уровня, поэтому leaf = parentId != null
  const leaf = await prisma.serviceCategory.findMany({
    where: { parentId: { not: null } },
    select: { id: true, slug: true, name: true, parentId: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  if (!leaf.length) throw new Error("No leaf service categories found. Run `npm run db:seed` first.");
  return leaf;
}

async function seedDemoServices() {
  console.log("Seeding demo providers + services...\n");

  try {
    assertDemoSeedAllowed();

    // Clean up previous demo providers (cascades to services/memberships)
    await prisma.provider.deleteMany({ where: { slug: { startsWith: "demo-provider-" } } });

    const cities = await getActiveCitiesSample();
    const ekb = await getEkbCity();

    const leafCategories = await getLeafCategories();
    const prochee = leafCategories.find((c) => c.slug === "prochee") ?? null;
    const templateLeaves = leafCategories.filter((c) => c.slug !== "prochee");

    const now = Date.now();
    const passwordSaltRounds = 10;

    for (let i = 1; i <= 10; i++) {
      const rng = mulberry32(123456 + i);
      const email = `provider${i}@mail.ru`;
      const password = `provider${i}`;
      const providerSlug = `demo-provider-${i}`;
      const providerName = `Провайдер ${i}`;

      const passwordHash = bcrypt.hashSync(password, passwordSaltRounds);

      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name: providerName,
          passwordHash,
          systemRole: "CUSTOMER",
        },
        create: {
          email,
          name: providerName,
          passwordHash,
          systemRole: "CUSTOMER",
        },
        select: { id: true },
      });

      const providerCityId =
        i === 1
          ? ekb.id
          : pickOne(
              uniqBy(
                cities.filter((c) => c.id !== ekb.id),
                (c) => c.id
              ),
              rng
            ).id;

      const providerType = pickOne<ProviderType>(["SELF_EMPLOYED", "COMPANY"], rng);

      const provider = await prisma.provider.upsert({
        where: { slug: providerSlug },
        update: {
          name: providerName,
          type: providerType,
          ownerUserId: user.id,
          cityId: providerCityId,
        },
        create: {
          name: providerName,
          slug: providerSlug,
          type: providerType,
          ownerUserId: user.id,
          cityId: providerCityId,
        },
        select: { id: true },
      });

      await prisma.providerMember.upsert({
        where: { providerId_userId: { providerId: provider.id, userId: user.id } },
        update: { role: "OWNER", status: "ACTIVE" },
        create: { providerId: provider.id, userId: user.id, role: "OWNER", status: "ACTIVE" },
        select: { id: true },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { activeProviderId: provider.id },
      });

      // Services distribution (deterministic)
      const shouldHaveAllTemplates = i <= 7;
      const templateCoverage = i <= 4 ? 1 : i <= 7 ? 1 : 0.45; // 100% or partial

      const pickedTemplates = shouldHaveAllTemplates
        ? templateLeaves
        : templateLeaves.filter(() => rng() < templateCoverage);

      // Ensure non-empty for partial providers
      const ensuredTemplates = pickedTemplates.length ? pickedTemplates : templateLeaves.slice(0, 3);

      const baseTitles = ensuredTemplates.map((c) => ({ categoryId: c.id, title: c.name }));

      const customCount = i >= 5 && i <= 7 ? Math.floor(rng() * 3) + 1 : i >= 8 ? Math.floor(rng() * 2) : 0;
      const customServices = Array.from({ length: customCount }).map(() => {
        const c = pickOne(templateLeaves, rng);
        return {
          categoryId: c.id,
          title: `${c.name} — индивидуально`,
        };
      });

      const otherServices =
        prochee && (i >= 5 || rng() < 0.3)
          ? [
              {
                categoryId: prochee.id,
                title: `Другая услуга #${i}`,
              },
            ]
          : [];

      const servicesToCreate = [...baseTitles, ...customServices, ...otherServices];

      // Create all provider services
      for (let s = 0; s < servicesToCreate.length; s++) {
        const svc = servicesToCreate[s]!;
        const publishedAt = new Date(now - (i * 10 + s) * 24 * 60 * 60 * 1000);

        await prisma.service.create({
          data: {
            categoryId: svc.categoryId,
            providerId: provider.id,
            status: ServiceStatus.PUBLISHED,
            publishedAt,
            title: svc.title,
            price: makePriceRub(rng),
            ctaText: pickOne(["Записаться", "Узнать стоимость", "Консультация"], rng),
            ctaHref: rng() < 0.5 ? "#contacts" : null,
            image: rng() < 0.5 ? "/hero-bg-house_static_day.jpg" : "/hero-bg-house_static.jpg",
            stockBadge: rng() < 0.2 ? "Популярно" : null,
            rating: null,
            reviewCount: 0,
            ratingSortScore: null,
            createdByUserId: user.id,
            updatedByUserId: user.id,
          },
        });
      }
    }

    console.log("Done. Seeded 10 demo providers.\n");
  } catch (error) {
    console.error("Seeding error:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void seedDemoServices();

