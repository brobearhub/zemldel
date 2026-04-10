import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export type SocketJwtPayload = {
  sub: string;
};

@Injectable()
export class SocketJwtService {
  private getSecret() {
    const secret = process.env.SOCKET_JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException(
        'SOCKET_JWT_SECRET is not configured',
      );
    }
    return secret;
  }

  verify(token: string | undefined): SocketJwtPayload {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Missing socket token');
    }

    try {
      const decoded = jwt.verify(token, this.getSecret()) as jwt.JwtPayload;
      if (typeof decoded.sub !== 'string' || !decoded.sub) {
        throw new UnauthorizedException('Invalid socket token payload');
      }
      return { sub: decoded.sub };
    } catch {
      throw new UnauthorizedException('Invalid or expired socket token');
    }
  }
}
