import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PassportAccessKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { lockPassport } from './passport-storage-cleanup.service';

const CLOSED = ['COMPLETED', 'CANCELLED', 'CLOSED'];

// Called while holding the passport owner's lock, including source-data deletion.
export async function revokePassportGrants(
  tx: Prisma.TransactionClient,
  userId: string,
  kind: PassportAccessKind,
  requestId?: string,
) {
  const where = {
    passportUserId: userId,
    kind,
    ...(requestId ? { requestId } : {}),
  };
  const grants = await tx.passportAccessGrant.findMany({ where });
  for (const grant of grants) {
    await tx.passportAccessAudit.create({
      data: {
        passportUserId: userId,
        actorUserId: userId,
        actorProviderId: grant.providerId,
        requestId: grant.requestId,
        action: `REVOKE_${kind}`,
      },
    });
  }
  await tx.passportAccessGrant.deleteMany({ where });
}

@Injectable()
export class PassportAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async mine(userId: string) {
    const [grants, audit, form, photos] = await Promise.all([
      this.prisma.passportAccessGrant.findMany({
        where: { passportUserId: userId },
        orderBy: { grantedAt: 'desc' },
        include: {
          provider: { select: { name: true } },
          request: {
            select: {
              status: true,
              providerId: true,
              customerUserId: true,
              service: { select: { title: true } },
              category: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.passportAccessAudit.findMany({
        where: {
          passportUserId: userId,
          OR: [
            { action: { startsWith: 'GRANT_' } },
            { action: { contains: 'REVOKE_' } },
            { action: { startsWith: 'PROVIDER_' } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 50,
        select: {
          id: true,
          action: true,
          actorProviderId: true,
          actorUserId: true,
          requestId: true,
          createdAt: true,
        },
      }),
      this.prisma.passportDocument.count({ where: { userId } }),
      this.prisma.passportPhoto.count({ where: { userId } }),
    ]);
    return {
      hasForm: form > 0,
      photoCount: photos,
      grants: grants.map(({ request, provider, ...grant }) => ({
        ...grant,
        providerName: provider.name,
        requestTitle:
          request.service?.title ?? request.category?.name ?? 'Заявка',
        active:
          grant.expiresAt > new Date() &&
          !CLOSED.includes(request.status) &&
          request.providerId === grant.providerId &&
          request.customerUserId === userId,
      })),
      audit,
    };
  }

  async save(
    userId: string,
    requestId: string,
    input: { form: boolean; photo: boolean; durationDays: number },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await lockPassport(tx, userId);
      await tx.$queryRaw`SELECT id FROM "Request" WHERE id = ${requestId}::uuid FOR SHARE`;
      const request = await tx.request.findFirst({
        where: { id: requestId, customerUserId: userId },
        select: { providerId: true, status: true },
      });
      if (!request) throw new NotFoundException('Заявка не найдена');
      if (!request.providerId || CLOSED.includes(request.status))
        throw new BadRequestException(
          'Нужна текущая заявка с выбранным исполнителем',
        );
      if (
        input.form &&
        !(await tx.passportDocument.count({ where: { userId } }))
      )
        throw new BadRequestException('Сначала сохраните анкету');
      if (input.photo && !(await tx.passportPhoto.count({ where: { userId } })))
        throw new BadRequestException('Сначала загрузите фотографии');
      const expiresAt = new Date(Date.now() + input.durationDays * 86400_000);
      for (const kind of ['FORM', 'PHOTO'] as const) {
        const selected = kind === 'FORM' ? input.form : input.photo;
        if (!selected) {
          await revokePassportGrants(tx, userId, kind, requestId);
          continue;
        }
        const data = {
          passportUserId: userId,
          providerId: request.providerId,
          expiresAt,
          grantedAt: new Date(),
        };
        await tx.passportAccessGrant.upsert({
          where: { requestId_kind: { requestId, kind } },
          create: { requestId, kind, ...data },
          update: data,
        });
        await tx.passportAccessAudit.create({
          data: {
            passportUserId: userId,
            actorUserId: userId,
            actorProviderId: request.providerId,
            requestId,
            action: `GRANT_${kind}`,
          },
        });
      }
      return { ok: true };
    });
  }

  async revoke(userId: string, requestId: string, kind: PassportAccessKind) {
    await this.prisma.$transaction(async (tx) => {
      await lockPassport(tx, userId);
      await revokePassportGrants(tx, userId, kind, requestId);
    });
    return { ok: true };
  }

  async withProviderAccess<T>(
    actorUserId: string,
    requestId: string,
    kind: PassportAccessKind,
    read: (
      tx: Prisma.TransactionClient,
      userId: string,
      providerId: string,
    ) => Promise<T>,
  ): Promise<T> {
    const ctx = await this.auth.getOrderManagementContext(actorUserId, 'read');
    if (ctx.isPlatformAdmin || !ctx.providerId)
      throw new ForbiddenException('Доступ к паспорту не предоставлен');
    const providerId = ctx.providerId;
    const initial = await this.prisma.request.findFirst({
      where: { id: requestId, providerId },
      select: { customerUserId: true },
    });
    if (!initial?.customerUserId)
      throw new NotFoundException('Заявка не найдена');
    const userId = initial.customerUserId;
    return this.prisma.$transaction(
      async (tx) => {
        // Same lock as grant/revoke/delete: after revocation commits no new read can pass.
        await lockPassport(tx, userId);
        await tx.$queryRaw`SELECT id FROM "Request" WHERE id = ${requestId}::uuid FOR SHARE`;
        const request = await tx.request.findFirst({
          where: { id: requestId, customerUserId: userId, providerId },
          select: { status: true },
        });
        if (!request || CLOSED.includes(request.status))
          throw new ForbiddenException('Доступ к паспорту закрыт');
        const grant = await tx.passportAccessGrant.findUnique({
          where: { requestId_kind: { requestId, kind } },
        });
        if (
          !grant ||
          grant.passportUserId !== userId ||
          grant.providerId !== providerId ||
          grant.expiresAt <= new Date()
        )
          throw new ForbiddenException(
            'Клиент не предоставил доступ или срок доступа истёк',
          );
        return read(tx, userId, providerId);
      },
      { timeout: 90_000, maxWait: 10_000 },
    );
  }
}
