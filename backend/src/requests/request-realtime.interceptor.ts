import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { concatMap, type Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';

/** Invalidate snapshots only after a successful controller write (and its transaction). */
@Injectable()
export class RequestRealtimeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestRealtimeInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ChatGateway,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method))
      return next.handle();
    const route = (
      (request.route as { path?: string } | undefined)?.path ?? ''
    ).replace(/^\//, '');
    const params = request.params as Record<string, string>;
    let requestId: string | undefined;
    const match = route.match(
      /(?:^|\/)requests\/(?:mine\/)?:(requestId|id)(?:\/|$)/,
    );
    if (match) requestId = params[match[1]];
    // A deleted row cannot identify its recipients after commit.
    let deletedRecipients: string[] | undefined;
    if (
      request.method === 'DELETE' &&
      route === 'requests/mine/:id' &&
      requestId
    ) {
      try {
        deletedRecipients = await this.getRecipients(requestId);
      } catch (error) {
        this.logger.warn(
          `Could not snapshot deletion recipients: ${String(error)}`,
        );
      }
    }
    // Legacy endpoints without requestId must be resolved before deletion.
    try {
      if (route === 'pro/contract-files/:fileId') {
        requestId = (
          await this.prisma.requestContractFile.findUnique({
            where: { id: params.fileId },
            select: { requestId: true },
          })
        )?.requestId;
      } else if (route === 'reviews/:reviewId/reply') {
        requestId = (
          await this.prisma.review.findUnique({
            where: { id: params.reviewId },
            select: { requestId: true },
          })
        )?.requestId;
      } else if (route === 'chat/conversations/:conversationId/messages') {
        requestId =
          (
            await this.prisma.conversation.findUnique({
              where: { id: params.conversationId },
              select: { requestId: true },
            })
          )?.requestId ?? undefined;
      }
    } catch {
      // Authorization and validation errors remain the controller's responsibility.
    }
    return next.handle().pipe(
      concatMap(async (result: unknown) => {
        try {
          const body = request.body as
            | { serviceRequestId?: string }
            | undefined;
          const id =
            requestId ??
            (route === 'chat/ensure' ? body?.serviceRequestId : undefined);
          if (id) {
            const recipients =
              deletedRecipients ?? (await this.getRecipients(id));
            for (const userId of recipients)
              this.gateway.emitRequestChanged(userId, id);
          }
        } catch (error) {
          // A notification failure must never turn a committed write into a failed response.
          this.logger.warn(`Request notification failed: ${String(error)}`);
        }
        return result;
      }),
    );
  }

  private async getRecipients(requestId: string): Promise<string[]> {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      select: {
        customerUserId: true,
        providerId: true,
        providerOffers: { select: { providerId: true } },
        conversations: { select: { providerId: true } },
      },
    });
    if (!request) return [];
    const providerIds = [
      ...new Set(
        [
          request.providerId,
          ...request.providerOffers.map((o) => o.providerId),
          ...request.conversations.map((c) => c.providerId),
        ].filter((id): id is string => Boolean(id)),
      ),
    ];
    const members = await this.prisma.providerMember.findMany({
      where: { providerId: { in: providerIds }, status: 'ACTIVE' },
      select: { userId: true },
    });
    const users = new Set(members.map((m) => m.userId));
    if (request.customerUserId) users.add(request.customerUserId);
    // No deal data is sent to archived providers; their HTTP reads enforce current access.
    return [...users];
  }
}
