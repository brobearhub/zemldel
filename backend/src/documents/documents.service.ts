import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { ORDER_EXECUTION_STATUSES } from '../requests/dto/request.dto';
import { DocumentsCryptoService } from './documents-crypto.service';
import type { PassportDto } from './dto/passport.dto';

const PROVIDER_ALLOWED_STATUSES = ORDER_EXECUTION_STATUSES;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly crypto: DocumentsCryptoService,
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

  async getMyPassport(actorUserId: string): Promise<PassportDto | null> {
    const row = await this.prisma.passportDocument.findUnique({
      where: { userId: actorUserId },
      select: {
        alg: true,
        keyVersion: true,
        iv: true,
        tag: true,
        ciphertext: true,
      },
    });
    if (!row) return null;
    return this.crypto.decryptJson({
      alg: row.alg as any,
      keyVersion: row.keyVersion,
      iv: Buffer.from(row.iv),
      tag: Buffer.from(row.tag),
      ciphertext: Buffer.from(row.ciphertext),
    }) as PassportDto;
  }

  async upsertMyPassport(input: {
    actorUserId: string;
    passport: PassportDto;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const encrypted = this.crypto.encryptJson(input.passport);
    const iv = Uint8Array.from(encrypted.iv);
    const tag = Uint8Array.from(encrypted.tag);
    const ciphertext = Uint8Array.from(encrypted.ciphertext);

    await this.prisma.$transaction(async (tx) => {
      await tx.passportDocument.upsert({
        where: { userId: input.actorUserId },
        create: {
          userId: input.actorUserId,
          alg: encrypted.alg,
          keyVersion: encrypted.keyVersion,
          iv,
          tag,
          ciphertext,
        },
        update: {
          alg: encrypted.alg,
          keyVersion: encrypted.keyVersion,
          iv,
          tag,
          ciphertext,
        },
        select: { id: true },
      });

      await this.audit(tx, {
        passportUserId: input.actorUserId,
        action: 'CUSTOMER_WRITE',
        actorUserId: input.actorUserId,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      });
    });

    return { ok: true };
  }

  async deleteMyPassport(input: {
    actorUserId: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    await this.prisma.$transaction(async (tx) => {
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
    });
    return { ok: true };
  }

  async getPassportForProviderByOrder(input: {
    actorUserId: string;
    requestId: string;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<PassportDto> {
    const ctx = await this.authService.getOrderManagementContext(
      input.actorUserId,
      'read',
    );
    if (ctx.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!ctx.providerId) {
      throw new NotFoundException('Active provider is required');
    }

    const order = await this.prisma.request.findFirst({
      where: {
        id: input.requestId,
        providerId: ctx.providerId,
        status: { in: [...PROVIDER_ALLOWED_STATUSES] as any },
      },
      select: { id: true, customerUserId: true, status: true },
    });
    if (!order?.customerUserId) {
      throw new NotFoundException('Order not found');
    }

    const passportRow = await this.prisma.passportDocument.findUnique({
      where: { userId: order.customerUserId },
      select: {
        userId: true,
        alg: true,
        keyVersion: true,
        iv: true,
        tag: true,
        ciphertext: true,
      },
    });
    if (!passportRow) {
      throw new NotFoundException('Passport is not provided');
    }

    const decrypted = this.crypto.decryptJson({
      alg: passportRow.alg as any,
      keyVersion: passportRow.keyVersion,
      iv: Buffer.from(passportRow.iv),
      tag: Buffer.from(passportRow.tag),
      ciphertext: Buffer.from(passportRow.ciphertext),
    }) as PassportDto;

    await this.prisma.$transaction(async (tx) => {
      await this.audit(tx, {
        passportUserId: passportRow.userId,
        action: 'PROVIDER_READ',
        actorUserId: input.actorUserId,
        actorProviderId: ctx.providerId,
        requestId: order.id,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      });
    });

    return decrypted;
  }
}
