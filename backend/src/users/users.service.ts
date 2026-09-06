import {
  BadRequestException,
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { assertActiveSelectableCity } from '../cities/city-validation';
import { CreateUserDto } from './dto/create-user.dto';
import { S3Service } from '../storage/s3.service';

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function sha256Buffer(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

function sniffImageExt(buf: Buffer, mimeType: string) {
  if (!ALLOWED_IMAGE_MIMES.has(mimeType)) return null;
  if (mimeType === 'image/png') {
    if (
      buf.length >= 8 &&
      buf
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return '.png';
    }
    return null;
  }
  if (mimeType === 'image/jpeg') {
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return '.jpg';
    }
    return null;
  }
  if (mimeType === 'image/webp') {
    if (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return '.webp';
    }
    return null;
  }
  return null;
}

function tryExtractKeyFromPublicUrl(input: { url: string; baseUrl: string }) {
  try {
    const u = new URL(input.url);
    const b = new URL(input.baseUrl);
    if (u.origin !== b.origin) return null;
    const key = u.pathname.replace(/^\//, '');
    return key.length > 0 ? key : null;
  } catch {
    return null;
  }
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  createUser(body: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        email: body.email.trim().toLowerCase(),
        name: body.name?.trim() || undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateMe(userId: string, input: { customerCityId?: string | null }) {
    let nextCustomerCityId: string | null | undefined = input.customerCityId;

    if (
      nextCustomerCityId !== undefined &&
      nextCustomerCityId !== null &&
      typeof nextCustomerCityId !== 'string'
    ) {
      throw new BadRequestException('Invalid customerCityId');
    }

    if (typeof nextCustomerCityId === 'string') {
      nextCustomerCityId = nextCustomerCityId.trim();
      if (nextCustomerCityId.length === 0) {
        nextCustomerCityId = null;
      }
    }

    if (nextCustomerCityId !== undefined && nextCustomerCityId !== null) {
      if (!this.isUuid(nextCustomerCityId)) {
        throw new BadRequestException('Invalid customerCityId');
      }
      await assertActiveSelectableCity(this.prisma, nextCustomerCityId);
    }

    if (nextCustomerCityId === undefined) {
      throw new BadRequestException('No fields to update');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        customerCityId: nextCustomerCityId,
      },
      select: {
        id: true,
        customerCityId: true,
        customerCity: {
          select: {
            id: true,
            name: true,
            regionCode: true,
            regionName: true,
          },
        },
        updatedAt: true,
      },
    });

    return {
      id: updated.id,
      customerCityId: updated.customerCityId,
      customerCity: updated.customerCity,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async uploadMyImage(input: { actorUserId: string; file: Express.Multer.File }) {
    const bucket = this.s3.requirePublicBucket();
    const cdnBase = this.s3.requirePublicCdnBaseUrl();

    const buf = input.file.buffer as Buffer | undefined;
    if (!buf || buf.length === 0) {
      throw new BadRequestException('file is required');
    }

    const ext = sniffImageExt(buf, input.file.mimetype);
    if (!ext) {
      throw new BadRequestException('Unsupported image type');
    }

    const hash = sha256Buffer(buf);
    const key = `${this.s3.publicPrefix}users/${input.actorUserId}/${hash}${ext}`;
    const url = `${cdnBase.replace(/\/+$/, '')}/${key}`;

    const prev = await this.prisma.user.findUnique({
      where: { id: input.actorUserId },
      select: { image: true },
    });

    try {
      await this.s3.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buf,
          ACL: 'public-read',
          ContentType: input.file.mimetype,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch {
      throw new BadGatewayException('File storage unavailable');
    }

    const updated = await this.prisma.user.update({
      where: { id: input.actorUserId },
      data: { image: url },
      select: { id: true, image: true, updatedAt: true },
    });

    const prevKey =
      prev?.image && this.s3.publicCdnBaseUrl
        ? tryExtractKeyFromPublicUrl({ url: prev.image, baseUrl: this.s3.publicCdnBaseUrl })
        : null;

    if (prevKey && prevKey.startsWith(`${this.s3.publicPrefix}users/${input.actorUserId}/`)) {
      await this.s3.client
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: prevKey }))
        .catch(() => null);
    }

    return {
      id: updated.id,
      image: updated.image,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteMyImage(input: { actorUserId: string }) {
    const bucket = this.s3.requirePublicBucket();
    const prev = await this.prisma.user.findUnique({
      where: { id: input.actorUserId },
      select: { image: true },
    });

    const updated = await this.prisma.user.update({
      where: { id: input.actorUserId },
      data: { image: null },
      select: { id: true, image: true, updatedAt: true },
    });

    const prevKey =
      prev?.image && this.s3.publicCdnBaseUrl
        ? tryExtractKeyFromPublicUrl({ url: prev.image, baseUrl: this.s3.publicCdnBaseUrl })
        : null;

    if (prevKey && prevKey.startsWith(`${this.s3.publicPrefix}users/${input.actorUserId}/`)) {
      await this.s3.client
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: prevKey }))
        .catch(() => null);
    }

    return {
      id: updated.id,
      image: updated.image,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
