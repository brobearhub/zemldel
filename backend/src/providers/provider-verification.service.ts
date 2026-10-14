import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ProviderType } from '../auth/authorization';
import { formatProviderName, formatUserName } from './provider-display-name';
import {
  collectVerificationFieldErrors,
  VERIFICATION_SUPPORT_HINT,
} from './provider-requisites';

export type SubmitVerificationInput = {
  lastName?: string;
  firstName?: string;
  middleName?: string;
  legalName?: string;
  inn?: string;
  ogrn?: string;
};

@Injectable()
export class ProviderVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getVerification(userId: string, providerId: string) {
    await this.assertActiveMember(userId, providerId);
    const provider = await this.loadProvider(providerId);
    const latest = provider.verificationRequests[0] ?? null;

    return {
      providerType: provider.type,
      status: provider.verificationStatus,
      verifiedAt: provider.verifiedAt?.toISOString() ?? null,
      rejectReason: provider.verificationRejectReason,
      submittedAt: latest?.submittedAt.toISOString() ?? null,
      available: provider.type !== 'INDIVIDUAL',
      prefill: {
        lastName: provider.legalProfile?.lastName ?? '',
        firstName: provider.legalProfile?.firstName ?? '',
        middleName: provider.legalProfile?.middleName ?? '',
        legalName: provider.legalProfile?.legalName ?? '',
        inn: provider.legalProfile?.inn ?? '',
        ogrn: provider.legalProfile?.ogrn ?? '',
      },
    };
  }

  async submitVerification(
    userId: string,
    providerId: string,
    body: SubmitVerificationInput,
  ) {
    await this.assertOwner(userId, providerId);
    const provider = await this.loadProvider(providerId);
    const fieldErrors = collectVerificationFieldErrors({
      type: provider.type,
      ...body,
    });
    if (Object.keys(fieldErrors).length > 0) {
      throw new BadRequestException({ fieldErrors });
    }
    if (provider.verificationStatus === 'PENDING') {
      throw new ConflictException('Заявка уже на проверке');
    }

    const inn = (body.inn ?? '').trim();
    const ogrn =
      provider.type === 'SELF_EMPLOYED' ? null : (body.ogrn ?? '').trim();
    const taken = await this.prisma.provider.findFirst({
      where: { verifiedInn: inn, NOT: { id: providerId } },
      select: { id: true },
    });
    if (taken) {
      throw new BadRequestException({
        fieldErrors: { inn: VERIFICATION_SUPPORT_HINT },
      });
    }

    const person =
      provider.type === 'COMPANY'
        ? null
        : {
            lastName: (body.lastName ?? '').trim(),
            firstName: (body.firstName ?? '').trim(),
            middleName: body.middleName?.trim() || null,
          };
    const legalName =
      provider.type === 'COMPANY' ? (body.legalName ?? '').trim() : null;
    const name = formatProviderName({
      type: provider.type,
      firstName: person?.firstName,
      lastName: person?.lastName,
      middleName: person?.middleName ?? undefined,
      legalName: legalName ?? undefined,
    });
    const snapshot = {
      lastName: person?.lastName ?? null,
      firstName: person?.firstName ?? null,
      middleName: person?.middleName ?? null,
      legalName,
      inn,
      ogrn,
    };

    const submittedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.provider.update({
        where: { id: providerId },
        data: {
          name,
          verificationStatus: 'PENDING',
          verifiedAt: null,
          verifiedInn: null,
          verificationRejectReason: null,
        },
      });
      await tx.providerLegalProfile.update({
        where: { providerId },
        data: person
          ? {
              lastName: person.lastName,
              firstName: person.firstName,
              middleName: person.middleName,
              legalName: null,
              inn,
              ogrn,
            }
          : { legalName, inn, ogrn },
      });
      if (person) {
        await tx.user.update({
          where: { id: userId },
          data: {
            lastName: person.lastName,
            firstName: person.firstName,
            middleName: person.middleName,
            name: formatUserName(person.firstName, person.lastName),
          },
        });
      }
      await tx.providerVerificationRequest.create({
        data: {
          providerId,
          type: provider.type,
          displayName: name,
          inn,
          ogrn,
          submittedSnapshot: snapshot,
          status: 'PENDING',
          submittedAt,
        },
      });
    });

    return {
      status: 'PENDING' as const,
      submittedAt: submittedAt.toISOString(),
    };
  }

  private async assertActiveMember(userId: string, providerId: string) {
    const membership = await this.membership(userId, providerId);
    if (!membership) throw new ForbiddenException('Provider access denied');
    return membership;
  }

  private async assertOwner(userId: string, providerId: string) {
    const membership = await this.assertActiveMember(userId, providerId);
    if (membership.role !== 'OWNER') {
      throw new ForbiddenException('Provider access denied');
    }
  }

  private async membership(userId: string, providerId: string) {
    return this.prisma.providerMember
      .findUnique({
        where: { providerId_userId: { providerId, userId } },
        select: { role: true, status: true },
      })
      .then((row) => (row?.status === 'ACTIVE' ? row : null));
  }

  private async loadProvider(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        type: true,
        verificationStatus: true,
        verifiedAt: true,
        verificationRejectReason: true,
        legalProfile: {
          select: {
            lastName: true,
            firstName: true,
            middleName: true,
            legalName: true,
            inn: true,
            ogrn: true,
          },
        },
        verificationRequests: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
          select: { submittedAt: true },
        },
      },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return provider as typeof provider & { type: ProviderType };
  }
}
