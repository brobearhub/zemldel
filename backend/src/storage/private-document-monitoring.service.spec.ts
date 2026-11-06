import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  healthSensors,
  sendHealthMetrics,
} from './private-document-monitoring.service';

const healthy = {
  checkedAt: '2026-11-06T00:00:00.000Z',
  ok: true,
  storageReachable: true,
  cleanup: { pending: 2, overdue: 0, oldestOverdueSeconds: 60 },
};

afterEach(() => vi.unstubAllGlobals());

describe('private document monitoring', () => {
  it('reports a database outage without publishing a false empty cleanup queue', () => {
    const sensors = healthSensors({ ...healthy, ok: false, cleanup: null });
    expect(sensors).toContainEqual({
      labels: { sensor: 'private_documents_database_reachable' },
      value: 0,
    });
    expect(sensors).not.toContainEqual(
      expect.objectContaining({
        labels: { sensor: 'passport_cleanup_overdue' },
      }),
    );
  });

  it('sends only numeric aggregates to the fixed HTTPS endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'OK', sensorsProcessed: 7 }),
    });
    vi.stubGlobal('fetch', fetch);
    await sendHealthMetrics(
      'folder__b1gcdvf6jupvtiqplmo6',
      'example-key',
      healthy,
    );
    const [url, request] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://ingest.monium.yandex.cloud/api/v2/metrics?');
    expect(url).not.toContain('example-key');
    expect(request.redirect).toBe('error');
    expect(request.headers).toEqual(
      expect.objectContaining({ Authorization: 'Application-Key example-key' }),
    );
    expect(typeof request.body).toBe('string');
    const payload = JSON.parse(request.body as string) as {
      metrics: Array<{ name: string; type: string; value: number }>;
    };
    expect(payload.metrics).toContainEqual({
      name: 'passport_cleanup_pending',
      type: 'DGAUGE',
      value: 2,
    });
    expect(
      payload.metrics.every((item) => typeof item.value === 'number'),
    ).toBe(true);
    expect(JSON.stringify(payload)).not.toContain('example-key');
  });

  it('uses an explicitly configured Monium service', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'OK', sensorsProcessed: 7 }),
    });
    vi.stubGlobal('fetch', fetch);
    await sendHealthMetrics(
      'folder__b1gcdvf6jupvtiqplmo6',
      'example-key',
      healthy,
      'private-documents',
    );
    const [url] = fetch.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).searchParams.get('service')).toBe('private-documents');
  });

  it('rejects an invalid Monium service before sending metrics', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(
      sendHealthMetrics(
        'folder__b1gcdvf6jupvtiqplmo6',
        'secret',
        healthy,
        '../other',
      ),
    ).rejects.toThrow('Invalid monitoring configuration');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails on invalid configuration and unsuccessful delivery', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', fetch);
    await expect(sendHealthMetrics('bad', 'secret', healthy)).rejects.toThrow(
      'Invalid monitoring configuration',
    );
    expect(fetch).not.toHaveBeenCalled();
    await expect(
      sendHealthMetrics('folder__b1gcdvf6jupvtiqplmo6', 'secret', healthy),
    ).rejects.toThrow('Monitoring request failed');
  });

  it('treats an HTTP 200 with zero processed metrics as unconfirmed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'OK', sensorsProcessed: 0 }),
      }),
    );
    await expect(
      sendHealthMetrics('folder__b1gcdvf6jupvtiqplmo6', 'secret', healthy),
    ).rejects.toThrow('Monitoring did not confirm all metrics');
  });
});
