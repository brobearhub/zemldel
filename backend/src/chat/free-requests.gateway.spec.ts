import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io, type Socket } from 'socket.io-client';
import { sign } from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatGateway } from './chat.gateway';
import { SocketJwtService } from './socket-jwt.service';
import { freeRequestEligibilityWhere } from '../requests/free-request-eligibility';
import { FREE_REQUEST_BATCH_MS } from './free-request-broadcast';

afterEach(() => vi.unstubAllEnvs());

describe('provider broadcast over real sockets', () => {
  it(
    'delivers to two authenticated providers, excludes customers, and syncs after reconnect',
    async () => {
      vi.stubEnv('SOCKET_JWT_SECRET', 'local-test-socket-secret');
      const http = createServer();
      const server = new Server(http, { transports: ['websocket'] });
      const latest = { id: 'request-latest', createdAt: new Date() };
      const audience = ['provider-one', 'provider-two'].map((id) => ({
        id,
        activeProviderId: id,
        providerMemberships: [
          {
            providerId: id,
            provider: {
              city: { regionCode: '66' },
              services: [
                { categoryId: id === 'provider-one' ? 'child' : 'other' },
              ],
            },
          },
        ],
      }));
      const requestQuery = vi.fn().mockResolvedValue(latest);
      const gateway = new ChatGateway(
        new SocketJwtService(),
        {
          notifyPresenceChanged: vi.fn(),
        } as never,
        {
          serviceCategory: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'parent', parentId: null },
              { id: 'child', parentId: 'parent' },
              { id: 'other', parentId: null },
            ]),
          },
          user: {
            findMany: vi.fn().mockResolvedValue(audience),
            findFirst: vi.fn(({ where }: { where: { id: string } }) =>
              audience.find((user) => user.id === where.id),
            ),
            findUnique: vi.fn(({ where }: { where: { id: string } }) => ({
              accountKind: where.id.startsWith('provider')
                ? 'PROVIDER'
                : 'CUSTOMER',
            })),
          },
          request: { findFirst: requestQuery },
        } as never,
      );
      gateway.server = server;
      server.on('connection', (socket) => {
        void gateway.handleConnection(socket);
      });
      await new Promise<void>((resolve) =>
        http.listen(0, '127.0.0.1', resolve),
      );
      const url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
      const clients: Socket[] = [];
      const connect = async (id: string) => {
        const client = io(url, {
          autoConnect: false,
          transports: ['websocket'],
          reconnection: false,
          auth: {
            token: sign({}, 'local-test-socket-secret', {
              subject: id,
              expiresIn: 60,
            }),
          },
        });
        clients.push(client);
        const ready = new Promise<void>((resolve, reject) => {
          client.once('connect_error', reject);
          if (id.startsWith('provider'))
            client.once('free-request.snapshot', () => resolve());
          else client.once('connect', () => resolve());
        });
        client.connect();
        await ready;
        return client;
      };
      try {
        const [first, second, customer] = await Promise.all([
          connect('provider-one'),
          connect('provider-two'),
          connect('customer'),
        ]);
        const customerHint = vi.fn();
        customer.on('free-request.created', customerHint);
        const firstHint = new Promise((resolve) =>
          first.once('free-request.created', resolve),
        );
        const secondHint = new Promise((resolve) =>
          second.once('free-request.created', resolve),
        );
        const payload = {
          requestId: 'new-request',
          createdAt: new Date().toISOString(),
        };
        gateway.emitFreeRequestCreated({
          ...payload,
          categoryId: null,
          regionCode: '66',
        });
        expect(await firstHint).toEqual(payload);
        expect(await secondHint).toEqual(payload);
        expect(customerHint).not.toHaveBeenCalled();
        expect(
          server.sockets.adapter.rooms.get('providers:free-requests')?.size,
        ).toBe(2);
        const excludedHint = vi.fn();
        second.on('free-request.created', excludedHint);
        const categoryHint = new Promise((resolve) =>
          first.once('free-request.created', resolve),
        );
        gateway.emitFreeRequestCreated({
          ...payload,
          requestId: 'parent-request',
          categoryId: 'parent',
          regionCode: '66',
        });
        expect(await categoryHint).toEqual({
          ...payload,
          requestId: 'parent-request',
        });
        expect(excludedHint).not.toHaveBeenCalled();
        expect(customerHint).not.toHaveBeenCalled();
        first.disconnect();
        const snapshot = new Promise((resolve) =>
          first.once('free-request.snapshot', resolve),
        );
        first.connect();
        expect(await snapshot).toEqual({
          requestId: latest.id,
          createdAt: latest.createdAt.toISOString(),
        });
        const query = requestQuery.mock.lastCall?.[0] as
          | { where: { AND: unknown[] } }
          | undefined;
        expect(query?.where.AND).toContainEqual(
          freeRequestEligibilityWhere('66', ['child', 'parent']),
        );
      } finally {
        gateway.onModuleDestroy();
        clients.forEach((client) => client.disconnect());
        await server.close();
      }
    },
    FREE_REQUEST_BATCH_MS * 3,
  );
});
