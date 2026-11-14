import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { entitlementPlan, PLAN_LIMITS } from './plan-policy';

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  async access(providerId: string, tx: Prisma.TransactionClient = this.prisma) {
    const account = await tx.billingAccount.findUnique({
      where: { providerId },
    });
    const plan = entitlementPlan(account);
    return { plan, limits: PLAN_LIMITS[plan], account };
  }

  async member(userId: string, providerId: string, owner = false) {
    const row = await this.prisma.providerMember.findUnique({
      where: { providerId_userId: { providerId, userId } },
    });
    if (
      !row ||
      row.status !== 'ACTIVE' ||
      row.role === 'EMPLOYEE' ||
      (owner && row.role !== 'OWNER')
    )
      throw new ForbiddenException('Нет доступа к профилю');
    return row;
  }

  async requireFeature(
    providerId: string,
    feature: 'templates' | 'sharedTemplates' | 'team',
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const { limits } = await this.access(providerId, tx);
    if (!limits[feature])
      throw new ForbiddenException({
        code: 'PLAN_REQUIRED',
        message: 'Эта возможность недоступна на текущем тарифе',
        billingUrl: '/pro/settings/tariff',
      });
  }

  async validateService(
    providerId: string,
    input: {
      stockBadge?: string | null;
      paletteColor?: string | null;
      allRussia?: boolean;
      regionCodes?: string[];
    },
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const { plan, limits } = await this.access(providerId, tx);
    if (input.stockBadge && plan === 'STANDARD')
      throw new ForbiddenException('Метка доступна на тарифах Лайт и Бизнес');
    if (
      input.paletteColor &&
      (plan === 'STANDARD' ||
        (plan === 'LITE' && input.paletteColor !== 'primary'))
    )
      throw new ForbiddenException(
        'Этот цвет метки недоступен на текущем тарифе',
      );
    return limits;
  }
}
