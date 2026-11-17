import {
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ChatController } from './chat.controller';

describe('GET chat/unread', () => {
  it('uses the authenticated actor and validates the inbox role', async () => {
    const chat = {
      getRequiredActorUserId: vi.fn().mockReturnValue('user-1'),
      unreadSnapshot: vi.fn().mockResolvedValue([]),
    };
    const controller = new ChatController(chat as never);
    const request = {} as never;
    await expect(
      controller.unreadSnapshot(request, { role: 'provider' }),
    ).resolves.toEqual([]);
    expect(chat.getRequiredActorUserId).toHaveBeenCalledWith(request);
    expect(chat.unreadSnapshot).toHaveBeenCalledWith('user-1', 'provider');
    await expect(
      controller.unreadSnapshot(request, { role: 'other' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(chat.unreadSnapshot).toHaveBeenCalledTimes(1);
  });

  it('rejects an unauthenticated request without reading unread data', async () => {
    const chat = {
      getRequiredActorUserId: vi.fn(() => {
        throw new UnauthorizedException();
      }),
      unreadSnapshot: vi.fn(),
    };
    const controller = new ChatController(chat as never);
    await expect(
      controller.unreadSnapshot({} as never, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(chat.unreadSnapshot).not.toHaveBeenCalled();
  });
});
