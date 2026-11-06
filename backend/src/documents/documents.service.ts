import {
  Injectable,
  Logger,
  BadGatewayException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { PassportDocument, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PassportAccessService,
  revokePassportGrants,
} from './passport-access.service';
import { DocumentsCryptoService } from './documents-crypto.service';
import type { PassportDto } from './dto/passport.dto';
import { PassportFormStorageService } from './passport-form-storage.service';
import {
  PassportStorageCleanupService,
  lockPassport,
} from './passport-storage-cleanup.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PassportAccessService,
    private readonly crypto: DocumentsCryptoService,
    private readonly storage: PassportFormStorageService,
    private readonly cleanup: PassportStorageCleanupService,
  ) {}

  private async audit(
    tx: Prisma.TransactionClient,
    input: {
      passportUserId: string;
      action: string;
      actorUserId?: string | null;
      actorProviderId?: string | null;
      requestId?: string | null;
      ip?: string | null;
      userAgent?: string | null;
    },
  ) {
    await tx.passportAccessAudit.create({
      data: {
        passportUserId: input.passportUserId,
        action: input.action,
        actorUserId: input.actorUserId ?? null,
        actorProviderId: input.actorProviderId ?? null,
        requestId: input.requestId ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
      select: { id: true },
    });
  }

  private async readPassport(row: PassportDocument): Promise<PassportDto> {
    if (row.storageKey) {
      if (!row.sha256)
        throw new BadGatewayException('Passport storage metadata unavailable');
      return this.storage.read(row.storageKey, row.sha256);
    }
    // Read-only compatibility for encrypted database rows created before S3.
    if (
      row.alg !== 'AES-256-GCM' ||
      row.keyVersion === null ||
      !row.iv ||
      !row.tag ||
      !row.ciphertext
    ) {
      throw new BadGatewayException('Passport storage metadata unavailable');
    }
    return this.crypto.decryptJson({
      alg: row.alg,
      keyVersion: row.keyVersion,
      iv: Buffer.from(row.iv),
      tag: Buffer.from(row.tag),
      ciphertext: Buffer.from(row.ciphertext),
    }) as PassportDto;
  }

  async getMyPassport(actorUserId: string): Promise<PassportDto | null> {
    return this.prisma.$transaction(
      async (tx) => {
        await lockPassport(tx, actorUserId);
        const row = await tx.passportDocument.findUnique({
          where: { userId: actorUserId },
        });
        return row ? this.readPassport(row) : null;
      },
      { timeout: 90_000, maxWait: 10_000 },
    );
  }

  async upsertMyPassport(input: {
    actorUserId: string;
    passport: PassportDto;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const key = this.storage.createKey(input.actorUserId);
    // Register before PUT. A failed or interrupted write remains discoverable.
    // The grace period exceeds SDK timeouts and avoids deleting a late PUT.
    await this.prisma.passportObjectCleanup.create({
      data: {
        objectKey: key,
        userId: input.actorUserId,
        reason: 'UNCOMMITTED_UPLOAD',
        notBefore: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const sha256 = await this.storage.put(key, input.passport);
    await this.prisma.$transaction(
      async (tx) => {
        await lockPassport(tx, input.actorUserId);
        const pending = await tx.passportObjectCleanup.findUnique({
          where: { objectKey: key },
        });
        if (!pending || pending.reason !== 'UNCOMMITTED_UPLOAD') {
          throw new ConflictException('Passport upload expired; please retry');
        }
        const data = {
          storageKey: key,
          sha256,
          alg: null,
          keyVersion: null,
          iv: null,
          tag: null,
          ciphertext: null,
        };
        await tx.passportDocument.upsert({
          where: { userId: input.actorUserId },
          create: { userId: input.actorUserId, ...data },
          update: data,
          select: { id: true },
        });
        // The database trigger queues the previous object in the same transaction.
        await tx.passportObjectCleanup.delete({ where: { objectKey: key } });
        await this.audit(tx, {
          passportUserId: input.actorUserId,
          action: 'CUSTOMER_WRITE',
          actorUserId: input.actorUserId,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        });
      },
      { timeout: 15_000, maxWait: 10_000 },
    );
    try {
      await this.cleanup.flushUser(input.actorUserId);
    } catch {
      this.logger.warn(
        'Passport saved; previous object cleanup queued for retry',
      );
    }
    return { ok: true };
  }

  async deleteMyPassport(input: {
    actorUserId: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    await this.prisma.$transaction(
      async (tx) => {
        await lockPassport(tx, input.actorUserId);
        await revokePassportGrants(tx, input.actorUserId, 'FORM');
        // Trigger retains the object reference for erasure, including crash recovery.
        await tx.passportDocument.deleteMany({
          where: { userId: input.actorUserId },
        });
        await this.audit(tx, {
          passportUserId: input.actorUserId,
          action: 'CUSTOMER_DELETE',
          actorUserId: input.actorUserId,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        });
      },
      { timeout: 15_000, maxWait: 10_000 },
    );
    await this.cleanup.flushUser(input.actorUserId);
    return { ok: true };
  }

  async getPassportForProviderByOrder(input: {
    actorUserId: string;
    requestId: string;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<PassportDto> {
    return this.access.withProviderAccess(
      input.actorUserId,
      input.requestId,
      'FORM',
      async (tx, userId, providerId) => {
        const passportRow = await tx.passportDocument.findUnique({
          where: { userId },
        });
        if (!passportRow) throw new NotFoundException('Анкета не сохранена');
        const passport = await this.readPassport(passportRow);
        await this.audit(tx, {
          passportUserId: userId,
          action: 'PROVIDER_FORM_READ',
          actorUserId: input.actorUserId,
          actorProviderId: providerId,
          requestId: input.requestId,
          ip: input.ip,
          userAgent: input.userAgent,
        });
        return passport;
      },
    );
  }
}
