import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';

const reminderSelect = {
  id: true,
  requestId: true,
  providerId: true,
  text: true,
  remindAt: true,
  isDone: true,
  doneAt: true,
  createdAt: true,
  updatedAt: true,
  request: {
    select: {
      id: true,
      message: true,
      location: true,
      service: { select: { title: true } },
      category: { select: { name: true } },
    },
  },
} as const;

function getTodayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveProviderId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        activeProviderId: true,
        providerMemberships: {
          where: { status: 'ACTIVE' },
          select: { providerId: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!user) throw new ForbiddenException('User not found');

    const providerId =
      user.activeProviderId ?? user.providerMemberships[0]?.providerId ?? null;

    if (!providerId) throw new ForbiddenException('No active provider');

    return providerId;
  }

  async listForRequest(userId: string, requestId: string) {
    const providerId = await this.resolveProviderId(userId);

    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      select: { providerId: true },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.providerId !== providerId)
      throw new ForbiddenException('Access denied');

    return this.prisma.requestReminder.findMany({
      where: { requestId, providerId },
      select: reminderSelect,
      orderBy: { remindAt: 'asc' },
    });
  }

  async listAll(userId: string) {
    const providerId = await this.resolveProviderId(userId);

    return this.prisma.requestReminder.findMany({
      where: { providerId },
      select: reminderSelect,
      orderBy: { remindAt: 'asc' },
    });
  }

  async listToday(userId: string) {
    const providerId = await this.resolveProviderId(userId);
    const { start, end } = getTodayBounds();

    return this.prisma.requestReminder.findMany({
      where: {
        providerId,
        isDone: false,
        remindAt: { gte: start, lt: end },
      },
      select: reminderSelect,
      orderBy: { remindAt: 'asc' },
    });
  }

  async listWorkday(userId: string) {
    const providerId = await this.resolveProviderId(userId);
    const { start, end } = getTodayBounds();

    return this.prisma.requestReminder.findMany({
      where: {
        providerId,
        remindAt: { gte: start, lt: end },
      },
      select: reminderSelect,
      orderBy: { remindAt: 'asc' },
    });
  }

  async create(userId: string, requestId: string, dto: CreateReminderDto) {
    const providerId = await this.resolveProviderId(userId);

    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      select: { providerId: true },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.providerId !== providerId)
      throw new ForbiddenException('Access denied');

    return this.prisma.requestReminder.create({
      data: {
        requestId,
        providerId,
        text: dto.text,
        remindAt: new Date(dto.remindAt),
      },
      select: reminderSelect,
    });
  }

  async update(userId: string, reminderId: string, dto: UpdateReminderDto) {
    const providerId = await this.resolveProviderId(userId);

    const reminder = await this.prisma.requestReminder.findUnique({
      where: { id: reminderId },
      select: { providerId: true, isDone: true },
    });

    if (!reminder) throw new NotFoundException('Reminder not found');
    if (reminder.providerId !== providerId)
      throw new ForbiddenException('Access denied');

    const data: {
      text?: string;
      remindAt?: Date;
      isDone?: boolean;
      doneAt?: Date | null;
    } = {};

    if (dto.text !== undefined) data.text = dto.text;
    if (dto.remindAt !== undefined) data.remindAt = new Date(dto.remindAt);
    if (dto.isDone !== undefined) {
      data.isDone = dto.isDone;
      data.doneAt =
        dto.isDone && !reminder.isDone
          ? new Date()
          : dto.isDone
            ? reminder['doneAt']
            : null;
    }

    return this.prisma.requestReminder.update({
      where: { id: reminderId },
      data,
      select: reminderSelect,
    });
  }

  async delete(userId: string, reminderId: string) {
    const providerId = await this.resolveProviderId(userId);

    const reminder = await this.prisma.requestReminder.findUnique({
      where: { id: reminderId },
      select: { providerId: true },
    });

    if (!reminder) throw new NotFoundException('Reminder not found');
    if (reminder.providerId !== providerId)
      throw new ForbiddenException('Access denied');

    await this.prisma.requestReminder.delete({ where: { id: reminderId } });
  }
}
