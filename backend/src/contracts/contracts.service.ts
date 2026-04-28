import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { EXCLUSIVE_PROVIDER_STATUSES } from '../requests/dto/request.dto';

type ProviderContext = {
  actorUserId: string;
  providerId: string;
};

function sha256(input: string) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function normalizeTitle(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeMarkdown(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\r\n/g, '\n');
  return trimmed;
}

function normalizeOptionalString(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeCommentBody(value: unknown) {
  if (typeof value !== 'string') return null;
  const body = value.trim();
  return body.length >= 3 ? body : null;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

type NormalizedEditorContent = {
  content: Prisma.InputJsonValue;
  editorFormat: string;
  editorVersion: number;
};

function normalizeEditorContent(input: {
  markdown?: unknown;
  document?: unknown;
  content?: unknown;
}): NormalizedEditorContent | null {
  if (isJsonObject(input.content)) {
    const format =
      typeof input.content.format === 'string'
        ? input.content.format
        : 'tiptap';
    const version =
      typeof input.content.version === 'number' ? input.content.version : 1;
    return {
      content: input.content as Prisma.InputJsonValue,
      editorFormat: format,
      editorVersion: version,
    };
  }

  if (isJsonObject(input.document)) {
    return {
      content: {
        format: 'tiptap',
        version: 1,
        document: input.document as Prisma.InputJsonValue,
      } as Prisma.InputJsonObject,
      editorFormat: 'tiptap',
      editorVersion: 1,
    };
  }

  const markdown = normalizeMarkdown(input.markdown);
  if (markdown === null) return null;
  return {
    content: { format: 'markdown', markdown } as Prisma.InputJsonObject,
    editorFormat: 'markdown',
    editorVersion: 1,
  };
}

function pickLegalProfileData(input: Record<string, unknown>) {
  return {
    legalName: normalizeOptionalString(input.legalName),
    inn: normalizeOptionalString(input.inn),
    kpp: normalizeOptionalString(input.kpp),
    ogrn: normalizeOptionalString(input.ogrn),
    legalAddress: normalizeOptionalString(input.legalAddress),
    postalAddress: normalizeOptionalString(input.postalAddress),
    bankName: normalizeOptionalString(input.bankName),
    bankBik: normalizeOptionalString(input.bankBik),
    bankAccount: normalizeOptionalString(input.bankAccount),
    correspondentAccount: normalizeOptionalString(input.correspondentAccount),
    signerName: normalizeOptionalString(input.signerName),
    signerTitle: normalizeOptionalString(input.signerTitle),
    signerBasis: normalizeOptionalString(input.signerBasis),
    phone: normalizeOptionalString(input.phone),
    email: normalizeOptionalString(input.email),
  };
}

function pickCustomerLegalProfileData(input: Record<string, unknown>) {
  return {
    fullName: normalizeOptionalString(input.fullName),
    inn: normalizeOptionalString(input.inn),
    registrationAddress: normalizeOptionalString(input.registrationAddress),
    postalAddress: normalizeOptionalString(input.postalAddress),
    phone: normalizeOptionalString(input.phone),
    email: normalizeOptionalString(input.email),
  };
}

function providerLegalSnapshot(
  legal:
    | {
        legalName: string | null;
        inn: string | null;
        kpp: string | null;
        ogrn: string | null;
        legalAddress: string | null;
        postalAddress: string | null;
        bankName: string | null;
        bankBik: string | null;
        bankAccount: string | null;
        correspondentAccount: string | null;
        signerName: string | null;
        signerTitle: string | null;
        signerBasis: string | null;
        phone: string | null;
        email: string | null;
      }
    | null
    | undefined,
) {
  if (!legal) return null;
  return {
    legalName: legal.legalName,
    inn: legal.inn,
    kpp: legal.kpp,
    ogrn: legal.ogrn,
    legalAddress: legal.legalAddress,
    postalAddress: legal.postalAddress,
    bankName: legal.bankName,
    bankBik: legal.bankBik,
    bankAccount: legal.bankAccount,
    correspondentAccount: legal.correspondentAccount,
    signerName: legal.signerName,
    signerTitle: legal.signerTitle,
    signerBasis: legal.signerBasis,
    phone: legal.phone,
    email: legal.email,
  };
}

function customerLegalSnapshot(
  legal:
    | {
        fullName: string | null;
        inn: string | null;
        registrationAddress: string | null;
        postalAddress: string | null;
        phone: string | null;
        email: string | null;
      }
    | null
    | undefined,
) {
  if (!legal) return null;
  return {
    fullName: legal.fullName,
    inn: legal.inn,
    registrationAddress: legal.registrationAddress,
    postalAddress: legal.postalAddress,
    phone: legal.phone,
    email: legal.email,
  };
}

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async requireProviderContext(actorUserId: string): Promise<ProviderContext> {
    const ctx = await this.authService.getServiceManagementContext(
      actorUserId,
      'read',
    );
    if (ctx.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!ctx.providerId) {
      throw new NotFoundException('Active provider is required');
    }
    return { actorUserId, providerId: ctx.providerId };
  }

  async requirePlatformAdmin(actorUserId: string) {
    const ctx = await this.authService.getServiceManagementContext(
      actorUserId,
      'read',
    );
    if (!ctx.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return { actorUserId };
  }

  async listTemplates(actorUserId: string) {
    const ctx = await this.requireProviderContext(actorUserId);
    return this.prisma.contractTemplate.findMany({
      where: { providerId: ctx.providerId },
      select: {
        id: true,
        title: true,
        version: true,
        parentTemplateId: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 200,
    });
  }

  async getTemplateById(actorUserId: string, id: string) {
    const ctx = await this.requireProviderContext(actorUserId);
    const row = await this.prisma.contractTemplate.findFirst({
      where: { id, providerId: ctx.providerId },
      select: {
        id: true,
        title: true,
        content: true,
        version: true,
        parentTemplateId: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    if (!row) throw new NotFoundException('Template not found');
    return row;
  }

  async createTemplate(
    actorUserId: string,
    input: {
      title: unknown;
      markdown?: unknown;
      document?: unknown;
      content?: unknown;
    },
  ) {
    const ctx = await this.requireProviderContext(actorUserId);
    const title = normalizeTitle(input.title);
    const editor = normalizeEditorContent(input);
    if (!title) throw new BadRequestException('title is required');
    if (!editor) throw new BadRequestException('content is required');

    return this.prisma.contractTemplate.create({
      data: {
        providerId: ctx.providerId,
        title,
        content: editor.content,
        editorFormat: editor.editorFormat,
        editorVersion: editor.editorVersion,
        version: 1,
        parentTemplateId: null,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      select: { id: true },
    });
  }

  async updateTemplate(
    actorUserId: string,
    id: string,
    input: {
      title?: unknown;
      markdown?: unknown;
      document?: unknown;
      content?: unknown;
    },
  ) {
    const ctx = await this.requireProviderContext(actorUserId);
    const current = await this.prisma.contractTemplate.findFirst({
      where: { id, providerId: ctx.providerId },
      select: { id: true, content: true, version: true },
    });
    if (!current) throw new NotFoundException('Template not found');

    const title =
      input.title === undefined
        ? undefined
        : (normalizeTitle(input.title) ?? undefined);
    if (input.title !== undefined && title === undefined) {
      throw new BadRequestException('title is required');
    }

    const hasContentInput =
      input.markdown !== undefined ||
      input.document !== undefined ||
      input.content !== undefined;
    const editor = hasContentInput ? normalizeEditorContent(input) : undefined;
    if (hasContentInput && !editor)
      throw new BadRequestException('content is required');
    const nextEditor = editor ?? undefined;

    const nextContent =
      nextEditor === undefined ? (current.content as any) : nextEditor.content;

    return this.prisma.contractTemplate.update({
      where: { id: current.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        content: nextContent as Prisma.InputJsonValue,
        ...(nextEditor !== undefined
          ? {
              editorFormat: nextEditor.editorFormat,
              editorVersion: nextEditor.editorVersion,
            }
          : {}),
        version: current.version + 1,
        lastRevisionAt: new Date(),
        updatedByUserId: actorUserId,
      },
      select: { id: true },
    });
  }

  async forkTemplate(
    actorUserId: string,
    id: string,
    input?: { title?: unknown },
  ) {
    const ctx = await this.requireProviderContext(actorUserId);
    const current = await this.prisma.contractTemplate.findFirst({
      where: { id, providerId: ctx.providerId },
      select: { id: true, title: true, content: true },
    });
    if (!current) throw new NotFoundException('Template not found');

    const title =
      input?.title === undefined
        ? `Копия: ${current.title}`
        : (normalizeTitle(input.title) ?? undefined);
    if (!title) throw new BadRequestException('title is required');

    return this.prisma.contractTemplate.create({
      data: {
        providerId: ctx.providerId,
        title,
        content: current.content as Prisma.InputJsonValue,
        version: 1,
        parentTemplateId: current.id,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      select: { id: true },
    });
  }

  async deleteTemplate(actorUserId: string, id: string) {
    const ctx = await this.requireProviderContext(actorUserId);
    const current = await this.prisma.contractTemplate.findFirst({
      where: { id, providerId: ctx.providerId },
      select: { id: true },
    });
    if (!current) throw new NotFoundException('Template not found');

    await this.prisma.contractTemplate.delete({ where: { id: current.id } });
    return { ok: true };
  }

  private async buildVariableSnapshot(input: {
    providerId: string;
    requestId: string;
    customerUserId: string;
  }) {
    const [provider, request, customer] = await Promise.all([
      this.prisma.provider.findUnique({
        where: { id: input.providerId },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          city: { select: { name: true, regionName: true } },
          legalProfile: true,
        },
      }),
      this.prisma.request.findUnique({
        where: { id: input.requestId },
        select: {
          id: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          location: true,
          dealTerms: true,
          requestCity: { select: { name: true, regionName: true } },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: input.customerUserId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          customerCity: { select: { name: true, regionName: true } },
          customerLegalProfile: true,
          passportDocument: { select: { id: true, updatedAt: true } },
        },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      provider: {
        id: provider?.id ?? input.providerId,
        name: provider?.name ?? null,
        slug: provider?.slug ?? null,
        type: provider?.type ?? null,
        city: provider?.city ?? null,
        legal: providerLegalSnapshot(provider?.legalProfile),
      },
      customer: {
        id: customer?.id ?? input.customerUserId,
        name:
          customer?.customerLegalProfile?.fullName ??
          customer?.name ??
          request?.customerName ??
          null,
        email:
          customer?.customerLegalProfile?.email ??
          customer?.email ??
          request?.customerEmail ??
          null,
        phone:
          customer?.customerLegalProfile?.phone ??
          customer?.phone ??
          request?.customerPhone ??
          null,
        city: customer?.customerCity ?? request?.requestCity ?? null,
        legal: customerLegalSnapshot(customer?.customerLegalProfile),
        passport: customer?.passportDocument
          ? {
              saved: true,
              updatedAt: customer.passportDocument.updatedAt.toISOString(),
            }
          : { saved: false },
      },
      request: {
        id: request?.id ?? input.requestId,
        location: request?.location ?? null,
        dealTerms: request?.dealTerms ?? null,
      },
    };
  }

  async createInstance(
    actorUserId: string,
    input: { templateId: unknown; requestId: unknown; title?: unknown },
  ) {
    const ctx = await this.requireProviderContext(actorUserId);
    const templateId =
      typeof input.templateId === 'string' ? input.templateId : null;
    const requestId =
      typeof input.requestId === 'string' ? input.requestId : null;
    const title =
      input.title === undefined ? null : normalizeTitle(input.title);

    if (!templateId) throw new BadRequestException('templateId is required');
    if (!requestId) throw new BadRequestException('requestId is required');

    const [template, request] = await Promise.all([
      this.prisma.contractTemplate.findFirst({
        where: { id: templateId, providerId: ctx.providerId },
        select: {
          id: true,
          title: true,
          content: true,
          editorFormat: true,
          editorVersion: true,
        },
      }),
      this.prisma.request.findFirst({
        where: { id: requestId },
        select: {
          id: true,
          status: true,
          providerId: true,
          customerUserId: true,
        },
      }),
    ]);

    if (!template) throw new NotFoundException('Template not found');
    if (!request) throw new NotFoundException('Request not found');
    if (!request.customerUserId) {
      throw new BadRequestException('Customer is required');
    }

    const canCreateForExclusiveRequest =
      request.providerId === ctx.providerId &&
      (EXCLUSIVE_PROVIDER_STATUSES as readonly string[]).includes(
        request.status,
      );

    const canCreateForPreSelection =
      request.providerId === null &&
      (request.status === 'NEW' ||
        request.status === 'DISCUSSING' ||
        request.status === 'TERMS_AGREED') &&
      (await this.prisma.requestProviderOffer.findFirst({
        where: {
          requestId: request.id,
          providerId: ctx.providerId,
          status: 'SELECTED',
        },
        select: { id: true },
      }));

    if (!canCreateForExclusiveRequest && !canCreateForPreSelection) {
      throw new ForbiddenException('Forbidden');
    }

    const resolvedTitle = title ?? template.title;
    const content = template.content as Prisma.InputJsonValue;
    const variableSnapshot = await this.buildVariableSnapshot({
      providerId: ctx.providerId,
      requestId: request.id,
      customerUserId: request.customerUserId,
    });
    const docHash = sha256(JSON.stringify(content));

    return this.prisma.contractInstance.create({
      data: {
        providerId: ctx.providerId,
        requestId: request.id,
        customerUserId: request.customerUserId,
        templateId: template.id,
        title: resolvedTitle,
        content,
        editorFormat: template.editorFormat,
        editorVersion: template.editorVersion,
        variableSnapshot: variableSnapshot as Prisma.InputJsonValue,
        status: 'DRAFT',
        pdfHash: docHash,
      },
      select: { id: true },
    });
  }

  private async assertProviderCanPrepareContractForRequest(input: {
    providerId: string;
    requestId: string;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId },
      select: {
        id: true,
        status: true,
        providerId: true,
        customerUserId: true,
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.customerUserId) {
      throw new BadRequestException('Customer is required');
    }

    const canUseExclusiveRequest =
      request.providerId === input.providerId &&
      (EXCLUSIVE_PROVIDER_STATUSES as readonly string[]).includes(
        request.status,
      );

    const canUsePreSelection =
      request.providerId === null &&
      (request.status === 'NEW' ||
        request.status === 'DISCUSSING' ||
        request.status === 'TERMS_AGREED') &&
      (await this.prisma.requestProviderOffer.findFirst({
        where: {
          requestId: request.id,
          providerId: input.providerId,
          status: 'SELECTED',
        },
        select: { id: true },
      }));

    if (!canUseExclusiveRequest && !canUsePreSelection) {
      throw new ForbiddenException('Forbidden');
    }

    return request;
  }

  async attachDraftToRequestByProvider(
    actorUserId: string,
    input: { contractId: unknown; requestId: unknown },
  ) {
    const ctx = await this.requireProviderContext(actorUserId);
    const contractId =
      typeof input.contractId === 'string' ? input.contractId : null;
    const requestId =
      typeof input.requestId === 'string' ? input.requestId : null;
    if (!contractId) throw new BadRequestException('contractId is required');
    if (!requestId) throw new BadRequestException('requestId is required');

    const [contract, request] = await Promise.all([
      this.prisma.contractInstance.findFirst({
        where: { id: contractId, providerId: ctx.providerId },
        select: {
          id: true,
          status: true,
          requestId: true,
        },
      }),
      this.assertProviderCanPrepareContractForRequest({
        providerId: ctx.providerId,
        requestId,
      }),
    ]);

    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.status !== 'DRAFT') {
      throw new ForbiddenException('Only draft contracts can be attached');
    }
    if (contract.requestId && contract.requestId !== request.id) {
      throw new ForbiddenException('Contract is attached to another request');
    }
    if (contract.requestId === request.id) {
      return { id: contract.id };
    }

    const customerUserId = request.customerUserId;
    if (!customerUserId) {
      throw new BadRequestException('Customer is required');
    }
    const variableSnapshot = await this.buildVariableSnapshot({
      providerId: ctx.providerId,
      requestId: request.id,
      customerUserId,
    });

    return this.prisma.contractInstance.update({
      where: { id: contract.id },
      data: {
        requestId: request.id,
        customerUserId,
        variableSnapshot: variableSnapshot as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
  }

  async listInstancesForCustomerByRequest(
    actorUserId: string,
    requestId: string,
  ) {
    const req = await this.prisma.request.findFirst({
      where: { id: requestId, customerUserId: actorUserId },
      select: { id: true, status: true, providerId: true },
    });
    if (!req) throw new NotFoundException('Request not found');

    const isExclusive =
      Boolean(req.providerId) &&
      (EXCLUSIVE_PROVIDER_STATUSES as readonly string[]).includes(req.status);

    return this.prisma.contractInstance.findMany({
      where: {
        requestId,
        customerUserId: actorUserId,
        ...(isExclusive && req.providerId
          ? { providerId: req.providerId }
          : {}),
        status: { in: ['SENT', 'SIGNED', 'CANCELLED'] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        requestId: true,
        providerId: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 50,
    });
  }

  async listInstancesForProvider(actorUserId: string) {
    const ctx = await this.requireProviderContext(actorUserId);
    return this.prisma.contractInstance.findMany({
      where: { providerId: ctx.providerId },
      select: {
        id: true,
        title: true,
        status: true,
        requestId: true,
        customerUserId: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 200,
    });
  }

  async getInstanceForProvider(actorUserId: string, id: string) {
    const ctx = await this.requireProviderContext(actorUserId);
    const row = await this.prisma.contractInstance.findFirst({
      where: { id, providerId: ctx.providerId },
      select: {
        id: true,
        title: true,
        status: true,
        content: true,
        editorFormat: true,
        editorVersion: true,
        variableSnapshot: true,
        revision: true,
        requestId: true,
        customerUserId: true,
        pdfHash: true,
        signatures: {
          select: {
            signerRole: true,
            method: true,
            signedAt: true,
            docHash: true,
          },
        },
        feedback: {
          select: {
            id: true,
            authorRole: true,
            authorUserId: true,
            body: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: 'asc' }],
        },
        commentThreads: {
          select: {
            id: true,
            anchor: true,
            quote: true,
            status: true,
            createdByRole: true,
            createdByUserId: true,
            resolvedAt: true,
            comments: {
              select: {
                id: true,
                authorRole: true,
                authorUserId: true,
                body: true,
                createdAt: true,
              },
              orderBy: [{ createdAt: 'asc' }],
            },
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ createdAt: 'asc' }],
        },
        updatedAt: true,
        createdAt: true,
      },
    });
    if (!row) throw new NotFoundException('Contract not found');
    return row;
  }

  async getInstanceForCustomer(actorUserId: string, id: string) {
    const row = await this.prisma.contractInstance.findFirst({
      where: { id, customerUserId: actorUserId },
      select: {
        id: true,
        title: true,
        status: true,
        content: true,
        editorFormat: true,
        editorVersion: true,
        variableSnapshot: true,
        revision: true,
        requestId: true,
        providerId: true,
        pdfHash: true,
        signatures: {
          select: {
            signerRole: true,
            method: true,
            signedAt: true,
            docHash: true,
          },
        },
        feedback: {
          select: {
            id: true,
            authorRole: true,
            authorUserId: true,
            body: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: 'asc' }],
        },
        commentThreads: {
          select: {
            id: true,
            anchor: true,
            quote: true,
            status: true,
            createdByRole: true,
            createdByUserId: true,
            resolvedAt: true,
            comments: {
              select: {
                id: true,
                authorRole: true,
                authorUserId: true,
                body: true,
                createdAt: true,
              },
              orderBy: [{ createdAt: 'asc' }],
            },
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ createdAt: 'asc' }],
        },
        updatedAt: true,
        createdAt: true,
      },
    });
    if (!row) throw new NotFoundException('Contract not found');
    if (row.status === 'DRAFT') {
      throw new ForbiddenException('Contract is not sent');
    }

    if (row.requestId) {
      const req = await this.prisma.request.findFirst({
        where: { id: row.requestId, customerUserId: actorUserId },
        select: { status: true, providerId: true },
      });
      if (!req) throw new NotFoundException('Request not found');
      const isExclusive =
        Boolean(req.providerId) &&
        (EXCLUSIVE_PROVIDER_STATUSES as readonly string[]).includes(req.status);
      if (isExclusive && req.providerId && row.providerId !== req.providerId) {
        throw new ForbiddenException('Forbidden');
      }
    }
    return row;
  }

  async updateInstanceDraftByProvider(
    actorUserId: string,
    id: string,
    input: {
      title?: unknown;
      markdown?: unknown;
      document?: unknown;
      content?: unknown;
    },
  ) {
    const ctx = await this.requireProviderContext(actorUserId);
    const title =
      input.title === undefined
        ? undefined
        : (normalizeTitle(input.title) ?? undefined);
    if (input.title !== undefined && title === undefined) {
      throw new BadRequestException('title is required');
    }
    const hasContentInput =
      input.markdown !== undefined ||
      input.document !== undefined ||
      input.content !== undefined;
    const editor = hasContentInput ? normalizeEditorContent(input) : undefined;
    if (hasContentInput && !editor)
      throw new BadRequestException('content is required');
    const nextEditor = editor ?? undefined;

    const current = await this.prisma.contractInstance.findFirst({
      where: { id, providerId: ctx.providerId },
      select: { id: true, status: true, content: true, revision: true },
    });
    if (!current) throw new NotFoundException('Contract not found');
    if (current.status === 'CANCELLED') {
      throw new ForbiddenException('Contract is cancelled');
    }
    if (current.status === 'SIGNED') {
      throw new ForbiddenException('Contract is already signed');
    }

    const nextContent =
      nextEditor === undefined
        ? (current.content as Prisma.InputJsonValue)
        : nextEditor.content;
    const nextHash = sha256(JSON.stringify(nextContent));

    await this.prisma.$transaction(async (tx) => {
      await tx.contractSignature.deleteMany({
        where: { contractId: current.id },
      });
      await tx.contractInstance.update({
        where: { id: current.id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(nextEditor !== undefined
            ? {
                content: nextContent,
                editorFormat: nextEditor.editorFormat,
                editorVersion: nextEditor.editorVersion,
                revision: current.revision + 1,
              }
            : {}),
          status: 'DRAFT',
          pdfHash: nextHash,
        },
        select: { id: true },
      });
    });

    return { ok: true };
  }

  async sendInstanceToCustomerByProvider(actorUserId: string, id: string) {
    const ctx = await this.requireProviderContext(actorUserId);
    const current = await this.prisma.contractInstance.findFirst({
      where: { id, providerId: ctx.providerId },
      select: { id: true, status: true, customerUserId: true },
    });
    if (!current) throw new NotFoundException('Contract not found');
    if (!current.customerUserId) {
      throw new BadRequestException('Customer is required');
    }
    if (current.status === 'CANCELLED') {
      throw new ForbiddenException('Contract is cancelled');
    }
    if (current.status === 'SIGNED') {
      throw new ForbiddenException('Contract is already signed');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.contractSignature.deleteMany({
        where: { contractId: current.id },
      });
      await tx.contractInstance.update({
        where: { id: current.id },
        data: { status: 'SENT' },
        select: { id: true },
      });
    });
    return { ok: true };
  }

  async addFeedbackByCustomer(input: {
    actorUserId: string;
    contractId: string;
    body: unknown;
  }) {
    const body = typeof input.body === 'string' ? input.body.trim() : '';
    if (body.length < 3) {
      throw new BadRequestException('Feedback body is required');
    }

    const contract = await this.prisma.contractInstance.findFirst({
      where: { id: input.contractId, customerUserId: input.actorUserId },
      select: { id: true, status: true, requestId: true, providerId: true },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.status === 'CANCELLED') {
      throw new ForbiddenException('Contract is cancelled');
    }
    if (contract.status === 'SIGNED') {
      throw new ForbiddenException('Contract is already signed');
    }
    if (contract.status !== 'SENT') {
      throw new ForbiddenException('Contract is not sent');
    }

    if (contract.requestId) {
      const req = await this.prisma.request.findFirst({
        where: { id: contract.requestId, customerUserId: input.actorUserId },
        select: { status: true, providerId: true },
      });
      if (!req) throw new NotFoundException('Request not found');
      const isExclusive =
        Boolean(req.providerId) &&
        (EXCLUSIVE_PROVIDER_STATUSES as readonly string[]).includes(req.status);
      if (
        isExclusive &&
        req.providerId &&
        contract.providerId !== req.providerId
      ) {
        throw new ForbiddenException('Forbidden');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.contractFeedback.create({
        data: {
          contractId: contract.id,
          authorRole: 'CUSTOMER',
          authorUserId: input.actorUserId,
          body,
        },
        select: { id: true },
      });
      await tx.contractSignature.deleteMany({
        where: { contractId: contract.id },
      });
      await tx.contractInstance.update({
        where: { id: contract.id },
        data: { status: 'DRAFT' },
        select: { id: true },
      });
    });
    return { ok: true };
  }

  private normalizeCommentAnchor(anchor: unknown) {
    if (!isJsonObject(anchor)) {
      return { type: 'document' } satisfies Prisma.InputJsonObject;
    }
    return anchor as Prisma.InputJsonObject;
  }

  async addCommentByCustomer(input: {
    actorUserId: string;
    contractId: string;
    anchor: unknown;
    quote?: unknown;
    body: unknown;
  }) {
    const body = normalizeCommentBody(input.body);
    if (!body) throw new BadRequestException('Comment body is required');
    const quote = normalizeOptionalString(input.quote);

    const contract = await this.prisma.contractInstance.findFirst({
      where: { id: input.contractId, customerUserId: input.actorUserId },
      select: { id: true, status: true, requestId: true, providerId: true },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.status === 'CANCELLED') {
      throw new ForbiddenException('Contract is cancelled');
    }
    if (contract.status === 'SIGNED') {
      throw new ForbiddenException('Contract is already signed');
    }
    if (contract.status !== 'SENT') {
      throw new ForbiddenException('Contract is not sent');
    }

    if (contract.requestId) {
      const req = await this.prisma.request.findFirst({
        where: { id: contract.requestId, customerUserId: input.actorUserId },
        select: { status: true, providerId: true },
      });
      if (!req) throw new NotFoundException('Request not found');
      const isExclusive =
        Boolean(req.providerId) &&
        (EXCLUSIVE_PROVIDER_STATUSES as readonly string[]).includes(req.status);
      if (
        isExclusive &&
        req.providerId &&
        contract.providerId !== req.providerId
      ) {
        throw new ForbiddenException('Forbidden');
      }
    }

    const thread = await this.prisma.contractCommentThread.create({
      data: {
        contractId: contract.id,
        anchor: this.normalizeCommentAnchor(input.anchor),
        quote: quote ?? null,
        createdByRole: 'CUSTOMER',
        createdByUserId: input.actorUserId,
        comments: {
          create: {
            authorRole: 'CUSTOMER',
            authorUserId: input.actorUserId,
            body,
          },
        },
      },
      select: { id: true },
    });
    return thread;
  }

  async replyToCommentByProvider(input: {
    actorUserId: string;
    contractId: string;
    threadId: string;
    body: unknown;
  }) {
    const ctx = await this.requireProviderContext(input.actorUserId);
    const body = normalizeCommentBody(input.body);
    if (!body) throw new BadRequestException('Comment body is required');

    const thread = await this.prisma.contractCommentThread.findFirst({
      where: {
        id: input.threadId,
        contractId: input.contractId,
        contract: { providerId: ctx.providerId },
      },
      select: { id: true, status: true },
    });
    if (!thread) throw new NotFoundException('Comment thread not found');
    if (thread.status === 'RESOLVED') {
      throw new ForbiddenException('Comment thread is resolved');
    }

    await this.prisma.contractComment.create({
      data: {
        threadId: thread.id,
        authorRole: 'PROVIDER',
        authorUserId: input.actorUserId,
        body,
      },
      select: { id: true },
    });
    return { ok: true };
  }

  async resolveCommentByProvider(input: {
    actorUserId: string;
    contractId: string;
    threadId: string;
  }) {
    const ctx = await this.requireProviderContext(input.actorUserId);
    const thread = await this.prisma.contractCommentThread.findFirst({
      where: {
        id: input.threadId,
        contractId: input.contractId,
        contract: { providerId: ctx.providerId },
      },
      select: { id: true },
    });
    if (!thread) throw new NotFoundException('Comment thread not found');

    await this.prisma.contractCommentThread.update({
      where: { id: thread.id },
      data: {
        status: 'RESOLVED',
        resolvedByUserId: input.actorUserId,
        resolvedAt: new Date(),
      },
      select: { id: true },
    });
    return { ok: true };
  }

  async getProviderLegalProfile(actorUserId: string) {
    const ctx = await this.requireProviderContext(actorUserId);
    return (
      (await this.prisma.providerLegalProfile.findUnique({
        where: { providerId: ctx.providerId },
      })) ?? { providerId: ctx.providerId }
    );
  }

  async upsertProviderLegalProfile(actorUserId: string, body: unknown) {
    const ctx = await this.requireProviderContext(actorUserId);
    if (!isJsonObject(body)) throw new BadRequestException('Invalid profile');
    const data = pickLegalProfileData(body);
    return this.prisma.providerLegalProfile.upsert({
      where: { providerId: ctx.providerId },
      create: { providerId: ctx.providerId, ...data },
      update: data,
    });
  }

  async getCustomerLegalProfile(actorUserId: string) {
    return (
      (await this.prisma.customerLegalProfile.findUnique({
        where: { userId: actorUserId },
      })) ?? { userId: actorUserId }
    );
  }

  async upsertCustomerLegalProfile(actorUserId: string, body: unknown) {
    if (!isJsonObject(body)) throw new BadRequestException('Invalid profile');
    const data = pickCustomerLegalProfileData(body);
    return this.prisma.customerLegalProfile.upsert({
      where: { userId: actorUserId },
      create: { userId: actorUserId, ...data },
      update: data,
    });
  }

  async listPublishedBlocks(actorUserId: string) {
    await this.requireProviderContext(actorUserId);
    return this.prisma.contractBlock.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        status: true,
        content: true,
        version: true,
        updatedAt: true,
      },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
      take: 200,
    });
  }

  async listBlocksAdmin(actorUserId: string) {
    await this.requirePlatformAdmin(actorUserId);
    return this.prisma.contractBlock.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        status: true,
        content: true,
        version: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 200,
    });
  }

  async createBlockAdmin(actorUserId: string, body: unknown) {
    await this.requirePlatformAdmin(actorUserId);
    if (!isJsonObject(body)) throw new BadRequestException('Invalid block');
    const title = normalizeTitle(body.title);
    const editor = normalizeEditorContent(body);
    if (!title) throw new BadRequestException('title is required');
    if (!editor) throw new BadRequestException('content is required');
    const description = normalizeOptionalString(body.description);
    const category = normalizeOptionalString(body.category);

    return this.prisma.contractBlock.create({
      data: {
        title,
        description: description ?? null,
        category: category ?? null,
        content: editor.content,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        versions: {
          create: {
            version: 1,
            title,
            description: description ?? null,
            category: category ?? null,
            content: editor.content,
            createdByUserId: actorUserId,
          },
        },
      },
      select: { id: true },
    });
  }

  async updateBlockAdmin(actorUserId: string, id: string, body: unknown) {
    await this.requirePlatformAdmin(actorUserId);
    if (!isJsonObject(body)) throw new BadRequestException('Invalid block');
    const current = await this.prisma.contractBlock.findUnique({
      where: { id },
      select: {
        id: true,
        version: true,
        title: true,
        description: true,
        category: true,
        content: true,
      },
    });
    if (!current) throw new NotFoundException('Contract block not found');

    const title =
      body.title === undefined ? current.title : normalizeTitle(body.title);
    if (!title) throw new BadRequestException('title is required');
    const description =
      body.description === undefined
        ? current.description
        : normalizeOptionalString(body.description);
    const category =
      body.category === undefined
        ? current.category
        : normalizeOptionalString(body.category);
    const editor =
      body.markdown !== undefined ||
      body.document !== undefined ||
      body.content !== undefined
        ? normalizeEditorContent(body)
        : undefined;
    if (
      (body.markdown !== undefined ||
        body.document !== undefined ||
        body.content !== undefined) &&
      !editor
    ) {
      throw new BadRequestException('content is required');
    }
    const content =
      editor?.content ?? (current.content as Prisma.InputJsonValue);
    const nextVersion = current.version + 1;

    return this.prisma.contractBlock.update({
      where: { id },
      data: {
        title,
        description: description ?? null,
        category: category ?? null,
        content,
        version: nextVersion,
        updatedByUserId: actorUserId,
        versions: {
          create: {
            version: nextVersion,
            title,
            description: description ?? null,
            category: category ?? null,
            content,
            createdByUserId: actorUserId,
          },
        },
      },
      select: { id: true },
    });
  }

  async setBlockStatusAdmin(actorUserId: string, id: string, status: unknown) {
    await this.requirePlatformAdmin(actorUserId);
    if (status !== 'DRAFT' && status !== 'PUBLISHED' && status !== 'ARCHIVED') {
      throw new BadRequestException('Invalid status');
    }
    await this.prisma.contractBlock.update({
      where: { id },
      data: { status, updatedByUserId: actorUserId },
      select: { id: true },
    });
    return { ok: true };
  }

  private async signContract(input: {
    contractId: string;
    signerRole: 'CUSTOMER' | 'PROVIDER';
    signerUserId: string;
    providerIdScope?: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const contract = await this.prisma.contractInstance.findFirst({
      where:
        input.providerIdScope && input.signerRole === 'PROVIDER'
          ? { id: input.contractId, providerId: input.providerIdScope }
          : input.signerRole === 'CUSTOMER'
            ? { id: input.contractId, customerUserId: input.signerUserId }
            : { id: input.contractId },
      select: {
        id: true,
        status: true,
        content: true,
        requestId: true,
        providerId: true,
        customerUserId: true,
        signatures: { select: { signerRole: true, docHash: true } },
      },
    });
    if (!contract) throw new NotFoundException('Contract not found');

    if (
      input.signerRole === 'CUSTOMER' &&
      contract.customerUserId !== input.signerUserId
    ) {
      throw new ForbiddenException('Forbidden');
    }
    if (
      input.signerRole === 'PROVIDER' &&
      input.providerIdScope &&
      contract.providerId !== input.providerIdScope
    ) {
      throw new ForbiddenException('Forbidden');
    }

    if (contract.status === 'CANCELLED') {
      throw new ForbiddenException('Contract is cancelled');
    }
    if (contract.status !== 'SENT') {
      throw new ForbiddenException('Contract is not sent');
    }

    const openThreads = await this.prisma.contractCommentThread.count({
      where: { contractId: contract.id, status: 'OPEN' },
    });
    if (openThreads > 0) {
      throw new ForbiddenException('Resolve contract comments before signing');
    }

    const docHash = sha256(JSON.stringify(contract.content));
    const validExistingRoles = new Set(
      contract.signatures
        .filter((s) => s.docHash === docHash)
        .map((s) => s.signerRole),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.contractSignature.upsert({
        where: {
          contractId_signerRole: {
            contractId: contract.id,
            signerRole: input.signerRole,
          },
        },
        create: {
          contractId: contract.id,
          signerRole: input.signerRole,
          signerUserId: input.signerUserId,
          method: 'PEP',
          docHash,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        },
        update: {
          signerUserId: input.signerUserId,
          method: 'PEP',
          docHash,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          signedAt: new Date(),
        },
        select: { id: true },
      });

      const nowSignedRoles = new Set([...validExistingRoles, input.signerRole]);
      const isAcceptedByCustomer = nowSignedRoles.has('CUSTOMER');

      await tx.contractInstance.update({
        where: { id: contract.id },
        data: { status: isAcceptedByCustomer ? 'SIGNED' : 'SENT' },
        select: { id: true },
      });

      if (isAcceptedByCustomer) {
        const now = new Date();
        if (contract.requestId) {
          await tx.request.updateMany({
            where: { id: contract.requestId, status: 'PROVIDER_SELECTED' },
            data: {
              status: 'CONTRACT_ACCEPTED',
              contractAcceptedAt: now,
              contractAcceptedByUserId: contract.customerUserId,
            },
          });
        }
      }
    });

    return { ok: true };
  }

  async signByCustomer(input: {
    actorUserId: string;
    contractId: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    return this.signContract({
      contractId: input.contractId,
      signerRole: 'CUSTOMER',
      signerUserId: input.actorUserId,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });
  }

  async signByProvider(input: {
    actorUserId: string;
    contractId: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const ctx = await this.requireProviderContext(input.actorUserId);
    return this.signContract({
      contractId: input.contractId,
      signerRole: 'PROVIDER',
      signerUserId: input.actorUserId,
      providerIdScope: ctx.providerId,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });
  }
}
