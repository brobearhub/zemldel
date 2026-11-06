import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PassportStorageService } from './passport-storage.service';
import { checkPrivateDocumentHealth } from './private-document-health';

type Health = Awaited<ReturnType<typeof checkPrivateDocumentHealth>>;
type Sensor = { labels: { sensor: string }; value: number };

export function healthSensors(health: Health): Sensor[] {
  const metrics: Sensor[] = [
    {
      labels: { sensor: 'private_documents_storage_reachable' },
      value: Number(health.storageReachable),
    },
    {
      labels: { sensor: 'private_documents_database_reachable' },
      value: Number(health.cleanup !== null),
    },
    {
      labels: { sensor: 'private_documents_health_check' },
      value: Number(health.ok),
    },
    { labels: { sensor: 'private_documents_heartbeat' }, value: 1 },
  ];
  if (health.cleanup) {
    metrics.push(
      {
        labels: { sensor: 'passport_cleanup_pending' },
        value: health.cleanup.pending,
      },
      {
        labels: { sensor: 'passport_cleanup_overdue' },
        value: health.cleanup.overdue,
      },
      {
        labels: { sensor: 'passport_cleanup_oldest_seconds' },
        value: health.cleanup.oldestOverdueSeconds,
      },
    );
  }
  return metrics;
}

export async function sendHealthMetrics(
  project: string,
  key: string,
  health: Health,
  service = 'private-documents-validation',
) {
  if (
    !/^folder__[a-z0-9]{20}$/.test(project) ||
    !/^[a-z][a-z0-9-]{0,62}$/.test(service) ||
    !key ||
    /[\r\n]/.test(key)
  ) {
    throw new Error('Invalid monitoring configuration');
  }
  const params = new URLSearchParams({
    project,
    cluster: 'default',
    service,
  });
  const metrics = healthSensors(health).map(({ labels, value }) => ({
    name: labels.sensor,
    type: 'DGAUGE',
    value,
  }));
  const response = await fetch(
    `https://ingest.monium.yandex.cloud/api/v2/metrics?${params}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Application-Key ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metrics }),
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    },
  );
  if (!response.ok) throw new Error('Monitoring request failed');
  const result: unknown = await response.json();
  if (
    !result ||
    typeof result !== 'object' ||
    !('status' in result) ||
    result.status !== 'OK' ||
    !('sensorsProcessed' in result) ||
    result.sensorsProcessed !== metrics.length
  ) {
    throw new Error('Monitoring did not confirm all metrics');
  }
}

@Injectable()
export class PrivateDocumentMonitoringService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrivateDocumentMonitoringService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PassportStorageService,
  ) {}

  onModuleInit() {
    const project = process.env.PRIVATE_DOCUMENT_MONIUM_PROJECT?.trim();
    const key = process.env.PRIVATE_DOCUMENT_MONIUM_APPLICATION_KEY?.trim();
    const service =
      process.env.PRIVATE_DOCUMENT_MONIUM_SERVICE?.trim() ||
      'private-documents-validation';
    if (!project && !key) return;
    if (
      !project ||
      !key ||
      !/^folder__[a-z0-9]{20}$/.test(project) ||
      !/^[a-z][a-z0-9-]{0,62}$/.test(service) ||
      /[\r\n]/.test(key)
    ) {
      this.logger.error(
        'Private document monitoring configuration is incomplete',
      );
      return;
    }
    const start = () => {
      if (this.running || this.stopped) return;
      this.running = (async () => {
        const health = await checkPrivateDocumentHealth(
          this.prisma,
          this.storage,
        );
        await sendHealthMetrics(project, key, health, service);
      })()
        .catch(() =>
          this.logger.warn(
            'Private document monitoring failed; retry scheduled',
          ),
        )
        .finally(() => {
          this.running = undefined;
        });
    };
    this.timer = setInterval(start, 60_000);
    this.timer.unref();
    start();
  }

  async onModuleDestroy() {
    this.stopped = true;
    clearInterval(this.timer);
    await this.running;
  }
}
