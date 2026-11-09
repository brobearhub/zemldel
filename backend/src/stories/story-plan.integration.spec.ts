import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StoriesService } from './stories.service';

const url = process.env.BILLING_TEST_DATABASE_URL;
const allowed =
  url &&
  ['localhost', '127.0.0.1'].includes(new URL(url).hostname) &&
  new URL(url).pathname === '/billing_qa';
describe.skipIf(!allowed)('story quotas with PostgreSQL', () => {
  let prisma: PrismaService;
  let service: StoriesService;
  const owner = randomUUID(),
    manager = randomUUID(),
    providerId = randomUUID();
  beforeAll(async () => {
    vi.stubEnv('DATABASE_URL', url);
    vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '1');
    prisma = new PrismaService();
    service = new StoriesService(prisma, {} as never);
    await prisma.user.createMany({
      data: [owner, manager].map((id) => ({ id, email: `${id}@example.test` })),
    });
    await prisma.provider.create({
      data: {
        id: providerId,
        name: 'Story QA',
        slug: providerId,
        type: 'INDIVIDUAL',
        ownerUserId: owner,
        members: {
          create: [
            { userId: owner, role: 'OWNER' },
            { userId: manager, role: 'MANAGER' },
          ],
        },
      },
    });
    await prisma.user.updateMany({
      where: { id: { in: [owner, manager] } },
      data: { activeProviderId: providerId },
    });
  });
  afterAll(async () => {
    await prisma.story.deleteMany({ where: { providerId } });
    await prisma.billingAccount.deleteMany({ where: { providerId } });
    await prisma.user.updateMany({
      where: { id: { in: [owner, manager] } },
      data: { activeProviderId: null },
    });
    await prisma.providerMember.deleteMany({ where: { providerId } });
    await prisma.provider.delete({ where: { id: providerId } });
    await prisma.user.deleteMany({ where: { id: { in: [owner, manager] } } });
    await prisma.$disconnect();
    vi.unstubAllEnvs();
  });
  const publish = (actorUserId = owner, text = 'История', durationHours = 24) =>
    service.create({ actorUserId, scope: 'provider', text, durationHours });
  it('allows only one concurrent publication, shared by the whole team', async () => {
    const outcomes = await Promise.allSettled([
      publish(owner),
      publish(manager),
      publish(owner),
    ]);
    expect(
      outcomes.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      outcomes.filter((result) => result.status === 'rejected'),
    ).toHaveLength(2);
    const limits = await service.limits({
      actorUserId: manager,
      scope: 'provider',
    });
    expect(limits).toMatchObject({ plan: 'STANDARD', dailyLimit: 1, used: 1 });
  });
  it('withdrawal never refunds quota, while a new calendar day does', async () => {
    const row = await prisma.story.findFirstOrThrow({ where: { providerId } });
    await service.remove({ actorUserId: manager, storyId: row.id });
    await expect(publish()).rejects.toThrow('лимит');
    await prisma.story.update({
      where: { id: row.id },
      data: { publishedAt: new Date(Date.now() - 48 * 3600000) },
    });
    await expect(publish()).resolves.toMatchObject({ textFormat: 'PLAIN' });
  });
  it('applies annual Lite limits, and rechecks expiration on every publication', async () => {
    await prisma.billingAccount.create({
      data: {
        providerId,
        plan: 'LITE',
        billingPeriod: 'YEAR',
        planExpiresAt: new Date('2099-01-01'),
      },
    });
    await expect(publish(owner, 'я'.repeat(1000), 48)).resolves.toMatchObject({
      textFormat: 'BASIC',
      durationHours: 48,
    });
    await expect(publish(owner, 'я'.repeat(1001), 48)).rejects.toThrow('1000');
    await prisma.billingAccount.update({
      where: { providerId },
      data: { planExpiresAt: new Date(0) },
    });
    await expect(publish(owner, 'После истечения', 48)).rejects.toThrow('срок');
    expect(
      await service.limits({ actorUserId: owner, scope: 'provider' }),
    ).toMatchObject({ plan: 'STANDARD', used: 2 });
  });
  it('Business grants long text, all durations and links on monthly and annual plans', async () => {
    for (const billingPeriod of ['MONTH', 'YEAR']) {
      await prisma.billingAccount.update({
        where: { providerId },
        data: {
          plan: 'BUSINESS',
          billingPeriod,
          planExpiresAt: new Date('2099-01-01'),
        },
      });
      await expect(publish(owner, 'я'.repeat(2048), 6)).resolves.toMatchObject({
        textFormat: 'LINKS',
        durationHours: 6,
      });
      expect(
        await service.limits({ actorUserId: owner, scope: 'provider' }),
      ).toMatchObject({ dailyLimit: 20, video: true });
    }
  });
});
