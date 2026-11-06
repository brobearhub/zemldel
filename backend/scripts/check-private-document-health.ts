import 'dotenv/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { PassportStorageService } from '../src/storage/passport-storage.service';
import { checkPrivateDocumentHealth } from './private-document-health';

async function main() {
  const prisma = new PrismaService();
  const storage = new PassportStorageService();
  // A failed DB connection must not leave a scheduler waiting indefinitely.
  const deadline = setTimeout(() => {
    console.log(JSON.stringify({ ok: false, reason: 'health-check-timeout' }));
    process.exit(1);
  }, 90_000);
  deadline.unref();
  try {
    const result = await checkPrivateDocumentHealth(prisma, storage);
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  } finally {
    storage.onModuleDestroy();
    await prisma.$disconnect();
    clearTimeout(deadline);
  }
}

void main().catch(() => {
  // Never log DB/SDK errors: they can contain credentials or document keys.
  console.log(JSON.stringify({ ok: false, reason: 'health-check-failed' }));
  process.exitCode = 1;
});
