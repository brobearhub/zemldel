import 'dotenv/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { PassportStorageService } from '../src/storage/passport-storage.service';
import { checkPrivateDocumentHealth } from '../src/storage/private-document-health';
import { sendHealthMetrics } from '../src/storage/private-document-monitoring.service';

async function main() {
  const project = process.env.PRIVATE_DOCUMENT_MONIUM_PROJECT?.trim();
  const key = process.env.PRIVATE_DOCUMENT_MONIUM_APPLICATION_KEY?.trim();
  const service =
    process.env.PRIVATE_DOCUMENT_MONIUM_SERVICE?.trim() ||
    'private-documents-validation';
  if (!project || !key) throw new Error('monitoring-not-configured');

  const prisma = new PrismaService();
  const storage = new PassportStorageService();
  let stage: 'health' | 'push' = 'health';
  const deadline = setTimeout(() => {
    console.log(JSON.stringify({ published: false, reason: 'timeout' }));
    process.exit(1);
  }, 90_000);
  deadline.unref();
  try {
    const health = await checkPrivateDocumentHealth(prisma, storage);
    stage = 'push';
    await sendHealthMetrics(project, key, health, service);
    console.log(
      JSON.stringify({
        published: true,
        healthOk: health.ok,
        databaseReachable: health.cleanup !== null,
        storageReachable: health.storageReachable,
      }),
    );
    if (!health.ok) process.exitCode = 1;
  } catch {
    console.log(
      JSON.stringify({ published: false, reason: `${stage}-failed` }),
    );
    process.exitCode = 1;
  } finally {
    storage.onModuleDestroy();
    await prisma.$disconnect();
    clearTimeout(deadline);
  }
}

void main().catch(() => {
  // Network, database and SDK errors may include keys or document identifiers.
  console.log(
    JSON.stringify({ published: false, reason: 'check-or-push-failed' }),
  );
  process.exitCode = 1;
});
