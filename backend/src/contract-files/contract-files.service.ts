import {
  BadRequestException,
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createHash, randomUUID } from 'node:crypto';
import fssync from 'node:fs';
import path from 'node:path';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  hasRequestLock,
  isExclusiveForActorProvider,
  isOrderExecutionStatus,
} from '../requests/dto/request.dto';
import { S3Service } from '../storage/s3.service';

const ALLOWED_EXT = new Set(['.pdf', '.docx']);
const ALLOWED_SIG_EXT = new Set(['.sig', '.sgn', '.p7s']);

function normalizeExt(fileName: string, mimeType: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ALLOWED_EXT.has(ext)) return ext;
  if (mimeType === 'application/pdf') return '.pdf';
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return '.docx';
  }
  return '';
}

function normalizeSigExt(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return ALLOWED_SIG_EXT.has(ext) ? ext : '';
}

function sha256Buffer(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

function trimMessage(value: unknown) {
  if (typeof value !== 'string') return null;
  const msg = value.trim();
  return msg.length >= 3 ? msg : null;
}

function countCyrillicChars(value: string) {
  const matches = value.match(/[\u0400-\u04FF]/g);
  return matches ? matches.length : 0;
}

function decodePossiblyMisencodedFileName(value: string) {
  const decoded = Buffer.from(value, 'latin1').toString('utf8').normalize('NFC');
  if (decoded.includes('\uFFFD')) return value;

  const originalCyrillic = countCyrillicChars(value);
  const decodedCyrillic = countCyrillicChars(decoded);
  const looksLikeMojibake = /[ÐÑÃ]/.test(value);

  if (looksLikeMojibake && decodedCyrillic > originalCyrillic) {
    return decoded;
  }

  return value;
}

function contractFilesBaseDir() {
  // Default: backend/storage/contracts (inside repo) for local MVP.
  return process.env.CONTRACT_FILES_DIR
    ? path.resolve(process.env.CONTRACT_FILES_DIR)
    : path.resolve(process.cwd(), 'storage', 'contracts');
}

function safeJoin(base: string, rel: string) {
  const abs = path.resolve(base, rel);
  const relFromBase = path.relative(base, abs);
  if (relFromBase.startsWith('..') || path.isAbsolute(relFromBase)) {
    throw new BadRequestException('Invalid file path');
  }
  return abs;
}

@Injectable()
export class ContractFilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly s3: S3Service,
  ) {}

  private async requireProviderId(actorUserId: string) {
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
    return ctx.providerId;
  }

  private async assertProviderCanManageFiles(input: {
    providerId: string;
    requestId: string;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId },
      select: {
        id: true,
        status: true,
        providerId: true,
        lockedAt: true,
        customerUserId: true,
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.customerUserId) {
      throw new BadRequestException('Customer is required');
    }

    const isExclusiveForProvider = isExclusiveForActorProvider(
      request,
      input.providerId,
    );

    const isPreSelectionAllowed =
      !hasRequestLock(request) &&
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

    if (!isExclusiveForProvider && !isPreSelectionAllowed) {
      throw new ForbiddenException('Forbidden');
    }

    return request;
  }

  async listForProvider(input: { actorUserId: string; requestId: string }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    await this.assertProviderCanManageFiles({ providerId, requestId: input.requestId });

    const rows = await this.prisma.requestContractFile.findMany({
      where: {
        requestId: input.requestId,
        providerId,
        role: 'CONTRACT_DOCUMENT',
      },
      select: {
        id: true,
        status: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        revisionMessage: true,
        decidedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 50,
    });

    return rows.map((row) => ({
      ...row,
      originalName: decodePossiblyMisencodedFileName(row.originalName),
    }));
  }

  async listBundlesForProvider(input: { actorUserId: string; requestId: string }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    await this.assertProviderCanManageFiles({
      providerId,
      requestId: input.requestId,
    });

    const rows = await this.prisma.requestContractFile.findMany({
      where: {
        requestId: input.requestId,
        providerId,
        role: { in: ['CONTRACT_DOCUMENT', 'CONTRACT_SIGNATURE'] },
        bundleId: { not: null },
      },
      select: {
        id: true,
        bundleId: true,
        role: true,
        status: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        revisionMessage: true,
        decidedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 200,
    });

    const map = new Map<
      string,
      {
        bundleId: string;
        status: 'PENDING_CUSTOMER' | 'APPROVED' | 'REVISION_REQUESTED';
        revisionMessage: string | null;
        decidedAt: Date | null;
        document: any | null;
        signature: any | null;
        createdAt: Date;
        updatedAt: Date;
      }
    >();

    for (const row of rows) {
      if (!row.bundleId) continue;
      const bundleId = row.bundleId;
      const prev =
        map.get(bundleId) ??
        ({
          bundleId,
          status: row.status as any,
          revisionMessage: row.revisionMessage ?? null,
          decidedAt: row.decidedAt ?? null,
          document: null,
          signature: null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        } as const);

      const fileDto = {
        id: row.id,
        originalName: decodePossiblyMisencodedFileName(row.originalName),
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        sha256: row.sha256,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };

      const next = { ...prev } as any;
      if (row.role === 'CONTRACT_DOCUMENT') {
        next.status = row.status as any;
        next.revisionMessage = row.revisionMessage ?? null;
        next.decidedAt = row.decidedAt ?? null;
        next.document = fileDto;
      } else if (row.role === 'CONTRACT_SIGNATURE') {
        next.signature = fileDto;
      }
      if (row.updatedAt.getTime() > next.updatedAt.getTime()) next.updatedAt = row.updatedAt;
      if (row.createdAt.getTime() < next.createdAt.getTime()) next.createdAt = row.createdAt;
      map.set(bundleId, next);
    }

    return Array.from(map.values())
      .filter((b) => Boolean((b as any).document))
      .map((b: any) => ({
        bundleId: b.bundleId,
        status: b.status,
        revisionMessage: b.revisionMessage,
        decidedAt: b.decidedAt ? b.decidedAt.toISOString() : null,
        document: b.document,
        signature: b.signature ?? null,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      }));
  }

  async listMiscForProvider(input: { actorUserId: string; requestId: string }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    await this.assertProviderCanManageFiles({
      providerId,
      requestId: input.requestId,
    });

    const rows = await this.prisma.requestContractFile.findMany({
      where: {
        requestId: input.requestId,
        providerId,
        role: 'PROVIDER_MISC',
      },
      select: {
        id: true,
        status: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        revisionMessage: true,
        decidedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 200,
    });

    return rows.map((row) => ({
      ...row,
      originalName: decodePossiblyMisencodedFileName(row.originalName),
    }));
  }

  async uploadForProvider(input: {
    actorUserId: string;
    requestId: string;
    files: Express.Multer.File[];
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    await this.assertProviderCanManageFiles({ providerId, requestId: input.requestId });

    const out: Array<{ id: string }> = [];
    for (const file of input.files) {
      const ext = normalizeExt(file.originalname, file.mimetype);
      if (!ext) {
        throw new BadRequestException('Unsupported file type');
      }
      if (!file.buffer || file.buffer.length === 0) {
        throw new BadRequestException('Empty file');
      }

      const id = randomUUID();
      const key = `${this.s3.privatePrefix}requests/${input.requestId}/contract-files/${id}${ext}`;
      const originalName = decodePossiblyMisencodedFileName(file.originalname);
      const hash = sha256Buffer(file.buffer);

      await this.s3.client.send(
        new PutObjectCommand({
          Bucket: this.s3.privateBucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'private, no-store',
        }),
      );

      try {
        await this.prisma.requestContractFile.create({
          data: {
            id,
            request: { connect: { id: input.requestId } },
            provider: { connect: { id: providerId } },
            uploadedByUser: { connect: { id: input.actorUserId } },
            status: 'APPROVED',
            role: 'PROVIDER_MISC',
            bundleId: null,
            originalName,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            sha256: hash,
            storageRelPath: key,
          } satisfies Prisma.RequestContractFileCreateInput,
          select: { id: true },
        });
      } catch (e) {
        await this.s3.client.send(
          new DeleteObjectCommand({ Bucket: this.s3.privateBucket, Key: key }),
        ).catch(() => null);
        throw e;
      }

      out.push({ id });
    }

    return { created: out };
  }

  async uploadBundleForProvider(input: {
    actorUserId: string;
    requestId: string;
    document: Express.Multer.File;
    signature: Express.Multer.File;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    await this.assertProviderCanManageFiles({
      providerId,
      requestId: input.requestId,
    });

    const docExt = normalizeExt(input.document.originalname, input.document.mimetype);
    if (!docExt) throw new BadRequestException('Unsupported document type');
    const sigExt = normalizeSigExt(input.signature.originalname);
    if (!sigExt) throw new BadRequestException('Unsupported signature type');

    if (!input.document.buffer || input.document.buffer.length === 0) {
      throw new BadRequestException('Empty document');
    }
    if (!input.signature.buffer || input.signature.buffer.length === 0) {
      throw new BadRequestException('Empty signature');
    }

    const bundleId = randomUUID();
    const documentId = randomUUID();
    const signatureId = randomUUID();

    const docKey = `${this.s3.privatePrefix}requests/${input.requestId}/contract-bundles/${bundleId}/${documentId}${docExt}`;
    const sigKey = `${this.s3.privatePrefix}requests/${input.requestId}/contract-bundles/${bundleId}/${signatureId}${sigExt}`;

    const docOriginalName = decodePossiblyMisencodedFileName(input.document.originalname);
    const sigOriginalName = decodePossiblyMisencodedFileName(input.signature.originalname);
    const docHash = sha256Buffer(input.document.buffer);
    const sigHash = sha256Buffer(input.signature.buffer);

    await this.s3.client.send(
      new PutObjectCommand({
        Bucket: this.s3.privateBucket,
        Key: docKey,
        Body: input.document.buffer,
        ContentType: input.document.mimetype,
        CacheControl: 'private, no-store',
      }),
    );
    await this.s3.client.send(
      new PutObjectCommand({
        Bucket: this.s3.privateBucket,
        Key: sigKey,
        Body: input.signature.buffer,
        ContentType: input.signature.mimetype || 'application/octet-stream',
        CacheControl: 'private, no-store',
      }),
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.requestContractFile.create({
          data: {
            id: documentId,
            request: { connect: { id: input.requestId } },
            provider: { connect: { id: providerId } },
            uploadedByUser: { connect: { id: input.actorUserId } },
            status: 'PENDING_CUSTOMER',
            role: 'CONTRACT_DOCUMENT',
            bundleId,
            originalName: docOriginalName,
            mimeType: input.document.mimetype,
            sizeBytes: input.document.size,
            sha256: docHash,
            storageRelPath: docKey,
          } satisfies Prisma.RequestContractFileCreateInput,
          select: { id: true },
        });

        await tx.requestContractFile.create({
          data: {
            id: signatureId,
            request: { connect: { id: input.requestId } },
            provider: { connect: { id: providerId } },
            uploadedByUser: { connect: { id: input.actorUserId } },
            status: 'PENDING_CUSTOMER',
            role: 'CONTRACT_SIGNATURE',
            bundleId,
            originalName: sigOriginalName,
            mimeType: input.signature.mimetype || 'application/octet-stream',
            sizeBytes: input.signature.size,
            sha256: sigHash,
            storageRelPath: sigKey,
          } satisfies Prisma.RequestContractFileCreateInput,
          select: { id: true },
        });
      });
    } catch (e) {
      await this.s3.client
        .send(new DeleteObjectCommand({ Bucket: this.s3.privateBucket, Key: docKey }))
        .catch(() => null);
      await this.s3.client
        .send(new DeleteObjectCommand({ Bucket: this.s3.privateBucket, Key: sigKey }))
        .catch(() => null);
      throw e;
    }

    return { bundleId };
  }

  async listBundlesForCustomer(input: { actorUserId: string; requestId: string }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { id: true, status: true, providerId: true, lockedAt: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) return [];

    if (!hasRequestLock(request)) {
      return [];
    }

    const rows = await this.prisma.requestContractFile.findMany({
      where: {
        requestId: request.id,
        providerId: request.providerId,
        role: { in: ['CONTRACT_DOCUMENT', 'CONTRACT_SIGNATURE'] },
        bundleId: { not: null },
      },
      select: {
        id: true,
        bundleId: true,
        role: true,
        status: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        revisionMessage: true,
        decidedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 200,
    });

    // reuse provider grouping logic by mapping shape
    const map = new Map<string, any>();
    for (const row of rows) {
      if (!row.bundleId) continue;
      const bundleId = row.bundleId;
      const prev =
        map.get(bundleId) ??
        ({
          bundleId,
          status: row.status as any,
          revisionMessage: row.revisionMessage ?? null,
          decidedAt: row.decidedAt ?? null,
          document: null,
          signature: null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        } as const);

      const fileDto = {
        id: row.id,
        originalName: decodePossiblyMisencodedFileName(row.originalName),
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        sha256: row.sha256,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };

      const next = { ...prev } as any;
      if (row.role === 'CONTRACT_DOCUMENT') {
        next.status = row.status as any;
        next.revisionMessage = row.revisionMessage ?? null;
        next.decidedAt = row.decidedAt ?? null;
        next.document = fileDto;
      } else if (row.role === 'CONTRACT_SIGNATURE') {
        next.signature = fileDto;
      }
      if (row.updatedAt.getTime() > next.updatedAt.getTime()) next.updatedAt = row.updatedAt;
      if (row.createdAt.getTime() < next.createdAt.getTime()) next.createdAt = row.createdAt;
      map.set(bundleId, next);
    }

    return Array.from(map.values())
      .filter((b) => Boolean(b.document))
      .map((b) => ({
        bundleId: b.bundleId,
        status: b.status,
        revisionMessage: b.revisionMessage,
        decidedAt: b.decidedAt ? b.decidedAt.toISOString() : null,
        document: b.document,
        signature: b.signature ?? null,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      }));
  }

  async listForCustomer(input: { actorUserId: string; requestId: string }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { id: true, status: true, providerId: true, lockedAt: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) return [];

    // Only show files in the exclusive phase (after provider selection).
    if (!hasRequestLock(request)) {
      return [];
    }

    const rows = await this.prisma.requestContractFile.findMany({
      where: {
        requestId: request.id,
        providerId: request.providerId,
        role: 'CONTRACT_DOCUMENT',
      },
      select: {
        id: true,
        status: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        revisionMessage: true,
        decidedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 50,
    });

    return rows.map((row) => ({
      ...row,
      originalName: decodePossiblyMisencodedFileName(row.originalName),
    }));
  }

  async approveBundleByCustomer(input: {
    actorUserId: string;
    requestId: string;
    bundleId: string;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { id: true, providerId: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) throw new BadRequestException('Provider is required');

    const file = await this.prisma.requestContractFile.findFirst({
      where: {
        requestId: request.id,
        providerId: request.providerId,
        bundleId: input.bundleId,
        role: 'CONTRACT_DOCUMENT',
      },
      select: { id: true },
    });
    if (!file) throw new NotFoundException('File not found');

    await this.prisma.requestContractFile.update({
      where: { id: file.id },
      data: {
        status: 'APPROVED',
        revisionMessage: null,
        decidedAt: new Date(),
        decidedByUserId: input.actorUserId,
      },
      select: { id: true },
    });
    return { ok: true };
  }

  async requestBundleRevisionByCustomer(input: {
    actorUserId: string;
    requestId: string;
    bundleId: string;
    message: unknown;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { id: true, providerId: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) throw new BadRequestException('Provider is required');

    const message = trimMessage(input.message);
    if (!message) throw new BadRequestException('message is required');

    const file = await this.prisma.requestContractFile.findFirst({
      where: {
        requestId: request.id,
        providerId: request.providerId,
        bundleId: input.bundleId,
        role: 'CONTRACT_DOCUMENT',
      },
      select: { id: true },
    });
    if (!file) throw new NotFoundException('File not found');

    await this.prisma.requestContractFile.update({
      where: { id: file.id },
      data: {
        status: 'REVISION_REQUESTED',
        revisionMessage: message,
        decidedAt: new Date(),
        decidedByUserId: input.actorUserId,
      },
      select: { id: true },
    });
    return { ok: true };
  }

  async deleteBundleForProvider(input: {
    actorUserId: string;
    requestId: string;
    bundleId: string;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.assertProviderCanManageFiles({
      providerId,
      requestId: input.requestId,
    });
    if (isOrderExecutionStatus(request.status)) {
      throw new ForbiddenException('Cannot delete files after contract accepted');
    }

    const rows = await this.prisma.requestContractFile.findMany({
      where: {
        requestId: input.requestId,
        providerId,
        bundleId: input.bundleId,
        role: { in: ['CONTRACT_DOCUMENT', 'CONTRACT_SIGNATURE'] },
      },
      select: { id: true, uploadedByUserId: true, storageRelPath: true },
      take: 10,
    });
    if (rows.length === 0) throw new NotFoundException('File not found');
    if (rows.some((r) => r.uploadedByUserId !== input.actorUserId)) {
      throw new ForbiddenException('Forbidden');
    }

    for (const row of rows) {
      try {
        await this.s3.client.send(
          new DeleteObjectCommand({
            Bucket: this.s3.privateBucket,
            Key: row.storageRelPath,
          }),
        );
      } catch (_e) {
        const e = _e as any;
        const isNotFound =
          e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;
        if (!isNotFound) {
          throw new BadGatewayException('File storage unavailable');
        }
      }
    }

    await this.prisma.requestContractFile.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });

    return { ok: true };
  }

  async approveByCustomer(input: {
    actorUserId: string;
    requestId: string;
    fileId: string;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { id: true, providerId: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) throw new BadRequestException('Provider is required');

    const file = await this.prisma.requestContractFile.findFirst({
      where: {
        id: input.fileId,
        requestId: request.id,
        providerId: request.providerId,
        role: 'CONTRACT_DOCUMENT',
      },
      select: { id: true },
    });
    if (!file) throw new NotFoundException('File not found');

    await this.prisma.requestContractFile.update({
      where: { id: file.id },
      data: {
        status: 'APPROVED',
        revisionMessage: null,
        decidedAt: new Date(),
        decidedByUserId: input.actorUserId,
      },
      select: { id: true },
    });
    return { ok: true };
  }

  async requestRevisionByCustomer(input: {
    actorUserId: string;
    requestId: string;
    fileId: string;
    message: unknown;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { id: true, providerId: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) throw new BadRequestException('Provider is required');

    const message = trimMessage(input.message);
    if (!message) throw new BadRequestException('message is required');

    const file = await this.prisma.requestContractFile.findFirst({
      where: {
        id: input.fileId,
        requestId: request.id,
        providerId: request.providerId,
        role: 'CONTRACT_DOCUMENT',
      },
      select: { id: true },
    });
    if (!file) throw new NotFoundException('File not found');

    await this.prisma.requestContractFile.update({
      where: { id: file.id },
      data: {
        status: 'REVISION_REQUESTED',
        revisionMessage: message,
        decidedAt: new Date(),
        decidedByUserId: input.actorUserId,
      },
      select: { id: true },
    });
    return { ok: true };
  }

  async getDownloadStreamForProvider(input: {
    actorUserId: string;
    fileId: string;
    inline: boolean;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const file = await this.prisma.requestContractFile.findFirst({
      where: { id: input.fileId, providerId },
      select: { id: true, originalName: true, mimeType: true, storageRelPath: true, requestId: true },
    });
    if (!file) throw new NotFoundException('File not found');

    // Ensure provider can manage the request (prevents leaking across requests).
    await this.assertProviderCanManageFiles({ providerId, requestId: file.requestId });

    const fileName = decodePossiblyMisencodedFileName(file.originalName);
    const disposition =
      input.inline && file.mimeType === 'application/pdf' ? 'inline' : 'attachment';

    try {
      const obj = await this.s3.client.send(
        new GetObjectCommand({
          Bucket: this.s3.privateBucket,
          Key: file.storageRelPath,
        }),
      );
      const body = obj.Body as unknown;
      if (!body || typeof (body as any).pipe !== 'function') {
        throw new NotFoundException('File not found');
      }
      return {
        stream: body as NodeJS.ReadableStream,
        fileName,
        mimeType: file.mimeType,
        disposition,
      };
    } catch (_e) {
      const e = _e as any;
      const isNotFound =
        e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;

      if (!isNotFound) {
        throw new BadGatewayException('File storage unavailable');
      }

      // Fallback for legacy local files during migration.
      const base = contractFilesBaseDir();
      const absPath = safeJoin(base, file.storageRelPath);
      if (!fssync.existsSync(absPath)) {
        throw new NotFoundException('File not found');
      }
      return {
        stream: fssync.createReadStream(absPath),
        fileName,
        mimeType: file.mimeType,
        disposition,
      };
    }
  }

  async getDownloadStreamForCustomer(input: {
    actorUserId: string;
    requestId: string;
    fileId: string;
    inline: boolean;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { id: true, providerId: true, status: true, lockedAt: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) throw new BadRequestException('Provider is required');

    if (!hasRequestLock(request)) {
      throw new ForbiddenException('Forbidden');
    }

    const file = await this.prisma.requestContractFile.findFirst({
      where: {
        id: input.fileId,
        requestId: request.id,
        providerId: request.providerId,
      },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        storageRelPath: true,
      },
    });
    if (!file) throw new NotFoundException('File not found');

    const fileName = decodePossiblyMisencodedFileName(file.originalName);
    const disposition =
      input.inline && file.mimeType === 'application/pdf' ? 'inline' : 'attachment';

    try {
      const obj = await this.s3.client.send(
        new GetObjectCommand({
          Bucket: this.s3.privateBucket,
          Key: file.storageRelPath,
        }),
      );
      const body = obj.Body as unknown;
      if (!body || typeof (body as any).pipe !== 'function') {
        throw new NotFoundException('File not found');
      }
      return {
        stream: body as NodeJS.ReadableStream,
        fileName,
        mimeType: file.mimeType,
        disposition,
      };
    } catch (_e) {
      const e = _e as any;
      const isNotFound =
        e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;

      if (!isNotFound) {
        throw new BadGatewayException('File storage unavailable');
      }

      // Fallback for legacy local files during migration.
      const base = contractFilesBaseDir();
      const absPath = safeJoin(base, file.storageRelPath);
      if (!fssync.existsSync(absPath)) {
        throw new NotFoundException('File not found');
      }
      return {
        stream: fssync.createReadStream(absPath),
        fileName,
        mimeType: file.mimeType,
        disposition,
      };
    }
  }

  async deleteForProvider(input: { actorUserId: string; fileId: string }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const file = await this.prisma.requestContractFile.findFirst({
      where: { id: input.fileId, providerId },
      select: {
        id: true,
        requestId: true,
        uploadedByUserId: true,
        storageRelPath: true,
      },
    });
    if (!file) throw new NotFoundException('File not found');

    if (!file.uploadedByUserId || file.uploadedByUserId !== input.actorUserId) {
      throw new ForbiddenException('Forbidden');
    }

    const request = await this.assertProviderCanManageFiles({
      providerId,
      requestId: file.requestId,
    });
    if (isOrderExecutionStatus(request.status)) {
      throw new ForbiddenException('Cannot delete files after contract accepted');
    }

    try {
      await this.s3.client.send(
        new DeleteObjectCommand({
          Bucket: this.s3.privateBucket,
          Key: file.storageRelPath,
        }),
      );
    } catch (_e) {
      const e = _e as any;
      const isNotFound =
        e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;
      if (!isNotFound) {
        throw new BadGatewayException('File storage unavailable');
      }
    }

    await this.prisma.requestContractFile.delete({
      where: { id: file.id },
      select: { id: true },
    });

    return { ok: true };
  }
}

