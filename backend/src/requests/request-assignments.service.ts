import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { getActiveMembership } from '../auth/authorization';
import { ChatGateway } from '../chat/chat.gateway';
import { assignedMemberSelect, assignedMemberDto } from './request-assignment';

@Injectable()
export class RequestAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly gateway: ChatGateway,
  ) {}

  async assign(userId: string, requestId: string, memberId: string | null) {
    const ctx = await this.auth.getServiceManagementContext(userId, 'read');
    if (!ctx.providerId || ctx.isPlatformAdmin)
      throw new ForbiddenException('Нет доступа к заявке');
    const providerId = ctx.providerId;
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Request" WHERE "id" = ${requestId}::uuid FOR UPDATE`;
      const request = await tx.request.findUnique({
        where: { id: requestId },
        select: {
          providerId: true,
          status: true,
          assignedMemberId: true,
          assignedMember: { select: { userId: true } },
        },
      });
      if (!request || request.providerId !== providerId)
        throw new NotFoundException('Заявка не найдена в этом профиле');
      if (request.status === 'CLOSED' || request.status === 'CANCELLED')
        throw new BadRequestException(
          'Нельзя назначить сотрудника на закрытую заявку',
        );
      if (
        memberId &&
        !(await tx.providerMember.findFirst({
          where: { id: memberId, providerId, status: 'ACTIVE' },
          select: { id: true },
        }))
      ) {
        throw new BadRequestException(
          'Выберите действующего сотрудника этой команды',
        );
      }
      const updated = await tx.request.update({
        where: { id: requestId },
        data: { assignedMemberId: memberId },
        select: {
          providerId: true,
          assignedMember: { select: assignedMemberSelect },
        },
      });
      if (request.assignedMemberId !== memberId) {
        await tx.requestEvent.create({
          data: {
            requestId,
            type: 'ASSIGN_EMPLOYEE',
            actorUserId: userId,
            actorProviderId: providerId,
            payload: { previousMemberId: request.assignedMemberId, memberId },
          },
        });
      }
      return {
        assignedMember: assignedMemberDto(
          updated.assignedMember,
          updated.providerId,
        ),
        previousUserId: request.assignedMember?.userId,
      };
    });
    if (result.previousUserId)
      this.gateway.emitRequestChanged(result.previousUserId, requestId);
    return { assignedMember: result.assignedMember };
  }

  async listAssigned(userId: string, requestId?: string) {
    const user = await this.auth.getUserAuthContext(userId);
    const membership = getActiveMembership(user);
    if (!user || !membership || user.systemRole === 'PLATFORM_ADMIN')
      throw new ForbiddenException('Нет доступа к заявкам');
    const rows = await this.prisma.request.findMany({
      where: {
        ...(requestId ? { id: requestId } : {}),
        providerId: membership.providerId,
        assignedMember: {
          userId,
          providerId: membership.providerId,
          status: 'ACTIVE',
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: requestId ? 1 : 500,
      select: {
        id: true,
        number: true,
        status: true,
        message: true,
        location: true,
        cadastralNumbers: true,
        updatedAt: true,
        providerId: true,
        provider: { select: { name: true } },
        assignedMember: { select: assignedMemberSelect },
        service: { select: { title: true } },
        category: { select: { name: true } },
        requestCity: { select: { name: true } },
        customerName: true,
        customerUser: { select: { name: true } },
      },
    });
    const items = rows.map((row) => ({
      id: row.id,
      number: row.number,
      status: row.status,
      title: row.service?.title || row.category?.name || 'Заявка',
      message: row.message,
      location: row.location,
      cadastralNumbers: row.cadastralNumbers,
      city: row.requestCity?.name ?? null,
      customerName: row.customerUser?.name || row.customerName,
      providerName: row.provider?.name ?? null,
      assignedMember: assignedMemberDto(row.assignedMember, row.providerId),
      updatedAt: row.updatedAt,
    }));
    if (requestId) {
      if (!items[0])
        throw new NotFoundException(
          'Заявка не назначена вам или больше недоступна',
        );
      return items[0];
    }
    return { items };
  }
}
