import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

type InternalAuthPayload = {
  userId: string;
};

function toBase64Url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function fromBase64Url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

@Injectable()
export class InternalAuthService {
  private getSecret() {
    const secret = process.env.INTERNAL_API_SECRET;
    if (!secret) {
      throw new InternalServerErrorException(
        'INTERNAL_API_SECRET is not configured',
      );
    }
    return secret;
  }

  private sign(encodedPayload: string) {
    return createHmac('sha256', this.getSecret())
      .update(encodedPayload)
      .digest('hex');
  }

  verifyToken(token: string | undefined): InternalAuthPayload {
    if (!token) {
      throw new UnauthorizedException('Missing internal auth token');
    }

    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) {
      throw new UnauthorizedException('Malformed internal auth token');
    }

    const expected = this.sign(encodedPayload);
    const actualBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new ForbiddenException('Invalid internal auth token');
    }

    const payload = JSON.parse(
      fromBase64Url(encodedPayload),
    ) as Partial<InternalAuthPayload>;
    if (typeof payload.userId !== 'string' || payload.userId.length === 0) {
      throw new UnauthorizedException('Internal auth token is missing userId');
    }

    return { userId: payload.userId };
  }

  getUserIdFromRequest(request: Request) {
    const token = request.header('x-internal-auth');
    return this.verifyToken(token).userId;
  }

  getOptionalUserIdFromRequest(request: Request) {
    const token = request.header('x-internal-auth');
    if (!token) {
      return null;
    }

    return this.verifyToken(token).userId;
  }

  static createTokenForUserId(userId: string, secret: string) {
    const payload = toBase64Url(JSON.stringify({ userId }));
    const signature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return `${payload}.${signature}`;
  }
}
