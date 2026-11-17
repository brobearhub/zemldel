import { describe, expect, it, vi } from 'vitest';
import { ChatGateway } from './chat.gateway';

describe('request.changed events', () => {
  it('marks only deleted requests and does not change ordinary event payloads', () => {
    const emit = vi.fn();
    const to = vi.fn().mockReturnValue({ emit });
    const gateway = new ChatGateway({} as never, {} as never, {} as never);
    gateway.server = { to } as never;
    gateway.emitRequestChanged('user-1', 'request-1');
    gateway.emitRequestChanged('user-1', 'request-1', true);
    expect(to).toHaveBeenCalledWith('user:user-1');
    expect(emit.mock.calls).toEqual([
      ['request.changed', { requestId: 'request-1' }],
      ['request.changed', { requestId: 'request-1', deleted: true }],
    ]);
    gateway.onModuleDestroy();
  });
});
