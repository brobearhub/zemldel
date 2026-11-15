import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InternalAuthService } from '../auth/internal-auth.service';
import {
  REQUEST_FEED_THROTTLE_OPTIONS,
  RequestFeedThrottlerGuard,
} from './request-feed-throttler.guard';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

const SECRET = 'request-feed-throttler-test-secret';
const TOKEN = InternalAuthService.createTokenForUserId('user-a', SECRET);

describe('request feed throttling over HTTP', () => {
  let app: INestApplication<App>;
  let now: number;
  const service = {
    requireProviderContext: vi.fn(),
    listProFeed: vi.fn(),
    countProRequestStats: vi.fn(),
  };

  beforeEach(async () => {
    vi.stubEnv('INTERNAL_API_SECRET', SECRET);
    now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    service.requireProviderContext.mockResolvedValue({
      providerId: 'provider',
    });
    service.listProFeed.mockResolvedValue({ items: [], hasMore: false });
    service.countProRequestStats.mockResolvedValue({ total: 0 });

    // Vitest/esbuild does not emit constructor type metadata; use the real
    // controller and its route decorators with only the DB-facing service mocked.
    Reflect.defineMetadata(
      'design:paramtypes',
      [RequestsService],
      RequestsController,
    );
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(REQUEST_FEED_THROTTLE_OPTIONS)],
      controllers: [RequestsController],
      providers: [
        InternalAuthService,
        RequestFeedThrottlerGuard,
        { provide: RequestsService, useValue: service },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  function feed(query = 'scope=free', token = TOKEN) {
    return request(app.getHttpServer())
      .get(`/pro/requests/feed?${query}`)
      .set('x-internal-auth', token);
  }

  async function fillBurst() {
    for (let i = 0; i < 30; i++) {
      await feed(i % 2 ? `serviceId=service-${i}` : 'scope=free').expect(200);
    }
  }

  it('shares a budget across services, free requests, search and pagination before DB access', async () => {
    await fillBurst();
    const blocked = await feed(
      'serviceId=another&search=Ivan&cursor=another&limit=5',
    )
      .set('X-Forwarded-For', '203.0.113.25')
      .set('X-Real-IP', '203.0.113.26')
      .set('X-User-Id', 'user-b')
      .expect(429);

    expect(blocked.headers['retry-after']).toBe('10');
    expect(blocked.body).toMatchObject({
      statusCode: 429,
      message: 'Слишком много запросов. Подождите немного и повторите попытку.',
    });
    expect(service.requireProviderContext).toHaveBeenCalledTimes(30);
    expect(service.listProFeed).toHaveBeenCalledTimes(30);

    now += 5_000;
    const stillBlocked = await feed().expect(429);
    expect(stillBlocked.headers['retry-after']).toBe('5');
    now += 5_001;
    await feed().expect(200);
  });

  it('does not block another signed-in user behind the same Next.js proxy', async () => {
    await fillBurst();
    await feed().expect(429);
    const otherToken = InternalAuthService.createTokenForUserId(
      'user-b',
      SECRET,
    );
    await feed('scope=free', otherToken).expect(200);
  });

  it('enforces the minute budget even when bursts are spaced apart, then releases it', async () => {
    for (let burst = 0; burst < 4; burst++) {
      await fillBurst();
      now += 11_000;
    }
    const blocked = await feed().expect(429);
    expect(blocked.headers['retry-after']).toBe('60');
    expect(service.listProFeed).toHaveBeenCalledTimes(120);

    now += 60_001;
    await feed().expect(200);
  });

  it('reports the longer wait when both limits are exceeded and does not extend it on retry', async () => {
    for (let burst = 0; burst < 4; burst++) {
      await fillBurst();
      if (burst < 3) now += 11_000;
    }
    const blocked = await feed().expect(429);
    expect(blocked.headers['retry-after']).toBe('60');
    now += 10_000;
    const stillBlocked = await feed().expect(429);
    expect(stillBlocked.headers['retry-after']).toBe('50');
    expect(service.listProFeed).toHaveBeenCalledTimes(120);
    now += 50_001;
    await feed().expect(200);
  });

  it('rejects missing or forged identity before calling the DB-facing service', async () => {
    await request(app.getHttpServer())
      .get('/pro/requests/feed?scope=free')
      .set('X-User-Id', 'user-a')
      .expect(401);
    const forged = InternalAuthService.createTokenForUserId(
      'user-b',
      'wrong-secret',
    );
    await feed('scope=free', forged).expect(403);
    expect(service.requireProviderContext).not.toHaveBeenCalled();
    expect(service.listProFeed).not.toHaveBeenCalled();
  });

  it('limits only the feed and leaves the other controller routes available', async () => {
    await fillBurst();
    await feed().expect(429);
    await request(app.getHttpServer())
      .get('/pro/requests/stats')
      .set('x-internal-auth', TOKEN)
      .expect(200);
    expect(service.countProRequestStats).toHaveBeenCalledOnce();
  });
});
