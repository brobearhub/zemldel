import { Inject, Injectable, type ExecutionContext } from '@nestjs/common';
import {
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerModuleOptions,
} from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';

export const REQUEST_FEED_THROTTLE_OPTIONS: ThrottlerModuleOptions = {
  throttlers: [
    { name: 'burst', ttl: 10_000, limit: 30 },
    { name: 'minute', ttl: 60_000, limit: 120 },
  ],
  errorMessage:
    'Слишком много запросов. Подождите немного и повторите попытку.',
};

@Injectable()
export class RequestFeedThrottlerGuard extends ThrottlerGuard {
  @Inject(InternalAuthService)
  private readonly internalAuth!: InternalAuthService;

  private readonly blockedRequests = new WeakMap<
    Request,
    ThrottlerLimitDetail
  >();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    try {
      const allowed = await super.canActivate(context);
      const blocked = this.blockedRequests.get(request);
      if (blocked) {
        context
          .switchToHttp()
          .getResponse<Response>()
          .setHeader('Retry-After', blocked.timeToBlockExpire);
        await super.throwThrottlingException(context, blocked);
      }
      return allowed;
    } finally {
      this.blockedRequests.delete(request);
    }
  }

  protected getTracker(request: Request): Promise<string> {
    // Next.js signs this identity after checking the session. Its shared proxy IP
    // and client-supplied forwarding headers must not define a user's budget.
    const userId = this.internalAuth.getUserIdFromRequest(request);
    return Promise.resolve(`user:${userId}`);
  }

  protected throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    // Check both standard throttlers before rejecting the request. Otherwise a
    // short block can hide a longer block and promise an incorrect retry time.
    const request = context.switchToHttp().getRequest<Request>();
    const previous = this.blockedRequests.get(request);
    if (!previous || detail.timeToBlockExpire > previous.timeToBlockExpire) {
      this.blockedRequests.set(request, detail);
    }
    return Promise.resolve();
  }
}
