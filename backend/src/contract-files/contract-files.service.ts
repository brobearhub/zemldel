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
import { EXCLUSIVE_PROVIDER_STATUSES } from '../requests/dto/request.dto';
import { S3Service } from '../storage/s3.service';

const ALLOWED_EXT = new Set(['.pdf', '.docx']);

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
        customerUserId: true,
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.customerUserId) {
      throw new BadRequestException('Customer is required');
    }

    const isExclusiveForProvider =
      request.providerId === input.providerId &&
      (EXCLUSIVE_PROVIDER_STATUSES as readonly string[]).includes(
        request.status,
      );

    const isPreSelectionAllowed =
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
      where: { requestId: input.requestId, providerId },
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
            status: 'PENDING_CUSTOMER',
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

  async listForCustomer(input: { actorUserId: string; requestId: string }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { id: true, status: true, providerId: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) return [];

    // Only show files in the exclusive phase (after provider selection).
    if (
      !(EXCLUSIVE_PROVIDER_STATUSES as readonly string[]).includes(request.status)
    ) {
      return [];
    }

    const rows = await this.prisma.requestContractFile.findMany({
      where: { requestId: request.id, providerId: request.providerId },
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
      where: { id: input.fileId, requestId: request.id, providerId: request.providerId },
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
      where: { id: input.fileId, requestId: request.id, providerId: request.providerId },
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
      select: { id: true, providerId: true, status: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) throw new BadRequestException('Provider is required');

    if (
      !(EXCLUSIVE_PROVIDER_STATUSES as readonly string[]).includes(request.status)
    ) {
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
}

