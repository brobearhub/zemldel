import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { SERVICES_SEED } from './seed-data/services';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function seedServices() {
  console.log('Seeding services...\n');

  try {
    const defaultProvider = await prisma.provider.upsert({
      where: { slug: 'platform-services' },
      update: {
        name: 'Platform Services',
        type: 'COMPANY',
      },
      create: {
        name: 'Platform Services',
        slug: 'platform-services',
        type: 'COMPANY',
      },
      select: { id: true },
    });

    const mainCategory = await prisma.serviceCategory.upsert({
      where: { slug: 'main' },
      update: { name: 'Основные услуги', sortOrder: 1 },
      create: {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Основные услуги',
        slug: 'main',
        sortOrder: 1,
      },
      select: { id: true },
    });

    const legalCategory = await prisma.serviceCategory.upsert({
      where: { slug: 'legal' },
      update: { name: 'Юридические услуги', sortOrder: 2 },
      create: {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Юридические услуги',
        slug: 'legal',
        sortOrder: 2,
      },
      select: { id: true },
    });

    await prisma.service.deleteMany();

    for (const service of SERVICES_SEED) {
      const { category, ...rest } = service;
      await prisma.service.create({
        data: {
          ...rest,
          categoryId: category === 'legal' ? legalCategory.id : mainCategory.id,
          providerId: defaultProvider.id,
        },
      });
    }

    console.log(`Done. Inserted ${SERVICES_SEED.length} service(s).\n`);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void seedServices();
