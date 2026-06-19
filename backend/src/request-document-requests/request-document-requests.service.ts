import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  EXCLUSIVE_PROVIDER_STATUSES,
  isOrderExecutionStatus,
} from '../requests/dto/request.dto';
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

function toItemDto(row: {
  id: string;
  title: string;
  sortOrder: number;
  status: 'REQUESTED' | 'UPLOADED';
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  uploadedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    title: row.title,
    sortOrder: row.sortOrder,
    status: row.status,
    originalName: row.originalName
      ? decodePossiblyMisencodedFileName(row.originalName)
      : null,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    uploadedAt: row.uploadedAt ? row.uploadedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class RequestDocumentRequestsService {
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

  private async assertProviderCanManageRequestExclusive(input: {
    providerId: string;
    requestId: string;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId },
      select: { id: true, status: true, providerId: true, customerUserId: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.customerUserId) {
      throw new BadRequestException('Customer is required');
    }
    if (!request.providerId) {
      throw new BadRequestException('Provider is required');
    }
    if (request.providerId !== input.providerId) {
      throw new ForbiddenException('Forbidden');
    }
    if (
      !(EXCLUSIVE_PROVIDER_STATUSES as readonly string[]).includes(request.status)
    ) {
      throw new ForbiddenException('Forbidden');
    }
    return request;
  }

  async listForProvider(input: { actorUserId: string; requestId: string }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    await this.assertProviderCanManageRequestExclusive({
      providerId,
      requestId: input.requestId,
    });

    const rows = await this.prisma.requestDocumentRequest.findMany({
      where: { requestId: input.requestId, providerId },
      select: {
        id: true,
        title: true,
        sortOrder: true,
        status: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        uploadedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ sortOrder: 'asc' }],
      take: 200,
    });

    return rows.map((row) => toItemDto(row));
  }

  async createForProvider(input: {
    actorUserId: string;
    requestId: string;
    title: string;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    await this.assertProviderCanManageRequestExclusive({
      providerId,
      requestId: input.requestId,
    });

    const title = input.title?.trim?.() ?? '';
    if (title.length < 3) {
      throw new BadRequestException('Title is required');
    }

    const last = await this.prisma.requestDocumentRequest.findFirst({
      where: { requestId: input.requestId, providerId },
      select: { sortOrder: true },
      orderBy: [{ sortOrder: 'desc' }],
    });
    const nextSort = (last?.sortOrder ?? 0) + 1;

    const created = await this.prisma.requestDocumentRequest.create({
      data: {
        request: { connect: { id: input.requestId } },
        provider: { connect: { id: providerId } },
        title,
        sortOrder: nextSort,
        status: 'REQUESTED',
      } satisfies Prisma.RequestDocumentRequestCreateInput,
      select: {
        id: true,
        title: true,
        sortOrder: true,
        status: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        uploadedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return toItemDto(created);
  }

  async listForCustomer(input: { actorUserId: string; requestId: string }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { id: true, providerId: true, status: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) return [];

    if (
      !(EXCLUSIVE_PROVIDER_STATUSES as readonly string[]).includes(request.status)
    ) {
      return [];
    }

    const rows = await this.prisma.requestDocumentRequest.findMany({
      where: { requestId: request.id, providerId: request.providerId },
      select: {
        id: true,
        title: true,
        sortOrder: true,
        status: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        uploadedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ sortOrder: 'asc' }],
      take: 200,
    });

    return rows.map((row) => toItemDto(row));
  }

  async uploadForCustomer(input: {
    actorUserId: string;
    requestId: string;
    docRequestId: string;
    file: Express.Multer.File;
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

    const doc = await this.prisma.requestDocumentRequest.findFirst({
      where: {
        id: input.docRequestId,
        requestId: request.id,
        providerId: request.providerId,
      },
      select: { id: true, storageRelPath: true },
    });
    if (!doc) throw new NotFoundException('Document request not found');

    const ext = normalizeExt(input.file.originalname, input.file.mimetype);
    if (!ext) {
      throw new BadRequestException('Unsupported file type');
    }
    if (!input.file.buffer || input.file.buffer.length === 0) {
      throw new BadRequestException('Empty file');
    }

    const newKey = `${this.s3.privatePrefix}requests/${request.id}/document-requests/${doc.id}${ext}`;
    const originalName = decodePossiblyMisencodedFileName(input.file.originalname);
    const hash = sha256Buffer(input.file.buffer);

    await this.s3.client.send(
      new PutObjectCommand({
        Bucket: this.s3.privateBucket,
        Key: newKey,
        Body: input.file.buffer,
        ContentType: input.file.mimetype,
        CacheControl: 'private, no-store',
      }),
    );

    try {
      await this.prisma.requestDocumentRequest.update({
        where: { id: doc.id },
        data: {
          status: 'UPLOADED',
          uploadedByUserId: input.actorUserId,
          uploadedAt: new Date(),
          originalName,
          mimeType: input.file.mimetype,
          sizeBytes: input.file.size,
          sha256: hash,
          storageRelPath: newKey,
        },
        select: { id: true },
      });
    } catch (e) {
      await this.s3.client
        .send(new DeleteObjectCommand({ Bucket: this.s3.privateBucket, Key: newKey }))
        .catch(() => null);
      throw e;
    }

    if (doc.storageRelPath && doc.storageRelPath !== newKey) {
      await this.s3.client
        .send(
          new DeleteObjectCommand({
            Bucket: this.s3.privateBucket,
            Key: doc.storageRelPath,
          }),
        )
        .catch(() => null);
    }

    return { ok: true };
  }

  async getDownloadStreamForProvider(input: {
    actorUserId: string;
    docRequestId: string;
    inline: boolean;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const doc = await this.prisma.requestDocumentRequest.findFirst({
      where: { id: input.docRequestId, providerId },
      select: {
        id: true,
        status: true,
        originalName: true,
        mimeType: true,
        storageRelPath: true,
        requestId: true,
      },
    });
    if (!doc) throw new NotFoundException('Document request not found');

    await this.assertProviderCanManageRequestExclusive({
      providerId,
      requestId: doc.requestId,
    });

    if (
      doc.status !== 'UPLOADED' ||
      !doc.storageRelPath ||
      !doc.originalName ||
      !doc.mimeType
    ) {
      throw new NotFoundException('File not found');
    }

    const fileName = decodePossiblyMisencodedFileName(doc.originalName);
    const disposition =
      input.inline && doc.mimeType === 'application/pdf' ? 'inline' : 'attachment';

    try {
      const obj = await this.s3.client.send(
        new GetObjectCommand({
          Bucket: this.s3.privateBucket,
          Key: doc.storageRelPath,
        }),
      );
      const body = obj.Body as unknown;
      if (!body || typeof (body as any).pipe !== 'function') {
        throw new NotFoundException('File not found');
      }
      return {
        stream: body as NodeJS.ReadableStream,
        fileName,
        mimeType: doc.mimeType,
        disposition,
      };
    } catch (_e) {
      const e = _e as any;
      const isNotFound =
        e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;
      if (isNotFound) {
        throw new NotFoundException('File not found');
      }
      throw new BadGatewayException('File storage unavailable');
    }
  }

  async getDownloadStreamForCustomer(input: {
    actorUserId: string;
    requestId: string;
    docRequestId: string;
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

    const doc = await this.prisma.requestDocumentRequest.findFirst({
      where: {
        id: input.docRequestId,
        requestId: request.id,
        providerId: request.providerId,
      },
      select: {
        id: true,
        status: true,
        originalName: true,
        mimeType: true,
        storageRelPath: true,
      },
    });
    if (!doc) throw new NotFoundException('Document request not found');
    if (
      doc.status !== 'UPLOADED' ||
      !doc.storageRelPath ||
      !doc.originalName ||
      !doc.mimeType
    ) {
      throw new NotFoundException('File not found');
    }

    const fileName = decodePossiblyMisencodedFileName(doc.originalName);
    const disposition =
      input.inline && doc.mimeType === 'application/pdf' ? 'inline' : 'attachment';

    try {
      const obj = await this.s3.client.send(
        new GetObjectCommand({
          Bucket: this.s3.privateBucket,
          Key: doc.storageRelPath,
        }),
      );
      const body = obj.Body as unknown;
      if (!body || typeof (body as any).pipe !== 'function') {
        throw new NotFoundException('File not found');
      }
      return {
        stream: body as NodeJS.ReadableStream,
        fileName,
        mimeType: doc.mimeType,
        disposition,
      };
    } catch (_e) {
      const e = _e as any;
      const isNotFound =
        e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;
      if (isNotFound) {
        throw new NotFoundException('File not found');
      }
      throw new BadGatewayException('File storage unavailable');
    }
  }

  async deleteFileForCustomer(input: {
    actorUserId: string;
    requestId: string;
    docRequestId: string;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { id: true, providerId: true, status: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) throw new BadRequestException('Provider is required');

    if (isOrderExecutionStatus(request.status)) {
      throw new ForbiddenException('Cannot delete files after contract accepted');
    }
    if (
      !(EXCLUSIVE_PROVIDER_STATUSES as readonly string[]).includes(request.status)
    ) {
      throw new ForbiddenException('Forbidden');
    }

    const doc = await this.prisma.requestDocumentRequest.findFirst({
      where: {
        id: input.docRequestId,
        requestId: request.id,
        providerId: request.providerId,
      },
      select: {
        id: true,
        status: true,
        uploadedByUserId: true,
        storageRelPath: true,
      },
    });
    if (!doc) throw new NotFoundException('Document request not found');
    if (doc.status !== 'UPLOADED' || !doc.storageRelPath) {
      throw new NotFoundException('File not found');
    }
    if (!doc.uploadedByUserId || doc.uploadedByUserId !== input.actorUserId) {
      throw new ForbiddenException('Forbidden');
    }

    try {
      await this.s3.client.send(
        new DeleteObjectCommand({
          Bucket: this.s3.privateBucket,
          Key: doc.storageRelPath,
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

    await this.prisma.requestDocumentRequest.update({
      where: { id: doc.id },
      data: {
        status: 'REQUESTED',
        uploadedByUserId: null,
        uploadedAt: null,
        originalName: null,
        mimeType: null,
        sizeBytes: null,
        sha256: null,
        storageRelPath: null,
      },
      select: { id: true },
    });

    return { ok: true };
  }
}

