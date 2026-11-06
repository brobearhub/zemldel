import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PassportFormStorageService } from './passport-form-storage.service';

export async function lockPassport(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('passport-storage'), hashtext(${userId}))`;
}

@Injectable()
export class PassportStorageCleanupService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PassportStorageCleanupService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PassportFormStorageService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => this.startRun(), 60_000);
    this.timer.unref();
    this.startRun();
  }

  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.running;
  }

  private startRun() {
    if (!this.running) {
      this.running = this.runDue()
        .catch(() => {
          this.logger.warn('Passport cleanup postponed; retry scheduled');
        })
        .finally(() => {
          this.running = undefined;
        });
    }
  }

  async runDue(userId?: string) {
    const jobs = await this.prisma.passportObjectCleanup.findMany({
      where: { notBefore: { lte: new Date() }, ...(userId ? { userId } : {}) },
      orderBy: { notBefore: 'asc' },
      take: 20,
    });
    for (const job of jobs) {
      try {
        await this.eraseJob(job.objectKey, job.userId);
      } catch {
        await this.prisma.passportObjectCleanup.updateMany({
          where: { objectKey: job.objectKey },
          data: { notBefore: new Date(Date.now() + 60_000) },
        });
        this.logger.warn('Passport cleanup postponed; retry scheduled');
      }
    }
  }

  async flushUser(userId: string) {
    const jobs = await this.prisma.passportObjectCleanup.findMany({
      where: { userId, reason: 'DELETE' },
    });
    for (const job of jobs) await this.eraseJob(job.objectKey, userId, true);
  }

  private async eraseJob(objectKey: string, userId: string, force = false) {
    await this.prisma.$transaction(
      async (tx) => {
        await lockPassport(tx, userId);
        const job = await tx.passportObjectCleanup.findUnique({
          where: { objectKey },
        });
        if (!job || (!force && job.notBefore > new Date())) return;
        const current = await tx.passportDocument.findUnique({
          where: { userId },
          select: { storageKey: true },
        });
        const photo = await tx.passportPhoto.findFirst({
          where: { userId, storageKey: objectKey },
          select: { id: true },
        });
        if (current?.storageKey !== objectKey && !photo)
          await this.storage.erase(objectKey);
        await tx.passportObjectCleanup.delete({ where: { objectKey } });
      },
      { timeout: 90_000, maxWait: 10_000 },
    );
  }
}
