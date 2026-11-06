import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { PrismaService } from '../src/prisma/prisma.service';
import { InternalAuthService } from '../src/auth/internal-auth.service';
import { PassportStorageService } from '../src/storage/passport-storage.service';
import { PassportFormStorageService } from '../src/documents/passport-form-storage.service';

async function main() {
  assert(process.env.INTERNAL_API_SECRET);
  const db = new PrismaService();
  const storage = new PassportStorageService();
  const erase = new PassportFormStorageService(storage);
  const customer = randomUUID(),
    actor = randomUUID(),
    stranger = randomUUID(),
    providerId = randomUUID(),
    requestId = randomUUID(),
    photoId = randomUUID();
  const users = [customer, actor, stranger];
  const base = `http://127.0.0.1:${Number(process.env.PORT ?? 3003)}`;
  const headers = (id: string) => ({
    'x-internal-auth': InternalAuthService.createTokenForUserId(
      id,
      process.env.INTERNAL_API_SECRET!,
    ),
  });
  const call = (path: string, id: string, method = 'GET', body?: unknown) =>
    fetch(`${base}${path}`, {
      method,
      headers: {
        ...headers(id),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const formPath = `/pro/requests/${requestId}/passport`;
  const photoPath = `${formPath}/photos/${photoId}`;
  const grantPath = `/documents/passport/access/${requestId}`;
  const grant = (form: boolean, photo: boolean) =>
    call(grantPath, customer, 'PUT', { form, photo, durationDays: 7 });
  try {
    await db.user.createMany({
      data: users.map((id) => ({
        id,
        email: `qa-access-${id}@example.com`,
        accountKind:
          id === actor ? ('PROVIDER' as const) : ('CUSTOMER' as const),
      })),
    });
    await db.provider.create({
      data: {
        id: providerId,
        name: 'Access QA',
        slug: `qa-access-${providerId}`,
        type: 'SELF_EMPLOYED',
        ownerUserId: actor,
      },
    });
    await db.providerMember.create({
      data: { userId: actor, providerId, role: 'OWNER' },
    });
    await db.user.update({
      where: { id: actor },
      data: { activeProviderId: providerId },
    });
    await db.request.create({
      data: {
        id: requestId,
        providerId,
        customerUserId: customer,
        status: 'ACTIVE',
      },
    });
    assert.equal(
      (await fetch(`${base}/documents/passport/access`)).status,
      401,
    );
    assert.equal(
      (
        await call('/documents/passport/mine', customer, 'PUT', {
          series: '0000',
          number: '000001',
          fullName: 'СИНТЕТИЧЕСКАЯ ПРОВЕРКА',
        })
      ).status,
      200,
    );
    const png = await sharp({
      create: { width: 80, height: 50, channels: 3, background: '#7c927f' },
    })
      .png()
      .toBuffer();
    const body = new FormData();
    body.append('uploadId', photoId);
    body.append(
      'file',
      new Blob([Uint8Array.from(png)], { type: 'image/png' }),
      'synthetic.png',
    );
    assert.equal(
      (
        await fetch(`${base}/documents/passport/photos/mine`, {
          method: 'POST',
          headers: headers(customer),
          body,
        })
      ).status,
      201,
    );
    assert.equal((await call(formPath, actor)).status, 403);
    assert.equal((await call(photoPath, actor)).status, 403);
    assert.equal(
      (
        await call(grantPath, stranger, 'PUT', {
          form: true,
          photo: true,
          durationDays: 7,
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await call(grantPath, customer, 'PUT', {
          form: true,
          photo: true,
          durationDays: 0,
        })
      ).status,
      400,
    );
    assert.equal((await grant(true, false)).status, 200);
    const form = await call(formPath, actor);
    assert.equal(form.status, 200);
    assert.equal(form.headers.get('cache-control'), 'private, no-store');
    assert.equal(((await form.json()) as { number: string }).number, '000001');
    assert.equal((await call(photoPath, actor)).status, 403);
    assert.equal((await grant(false, true)).status, 200);
    assert.equal((await call(formPath, actor)).status, 403);
    const photo = await call(photoPath, actor);
    assert.equal(photo.status, 200);
    assert.equal(photo.headers.get('cache-control'), 'private, no-store');
    assert.equal(photo.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(
      (await sharp(Buffer.from(await photo.arrayBuffer())).metadata()).width,
      80,
    );
    assert.equal((await call(`${formPath}/photos`, actor)).status, 200);
    assert.equal((await call(photoPath, stranger)).status, 403);
    assert.equal(
      (await call(`${grantPath}/PHOTO`, customer, 'DELETE')).status,
      200,
    );
    assert.equal((await call(photoPath, actor)).status, 403);
    await grant(true, true);
    await db.passportAccessGrant.updateMany({
      where: { requestId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    assert.equal((await call(formPath, actor)).status, 403);
    assert.equal((await call(photoPath, actor)).status, 403);
    await grant(true, true);
    await db.providerMember.updateMany({
      where: { providerId, userId: actor },
      data: { status: 'SUSPENDED' },
    });
    assert.equal((await call(formPath, actor)).status, 403);
    await db.providerMember.updateMany({
      where: { providerId, userId: actor },
      data: { status: 'ACTIVE' },
    });
    await db.request.update({
      where: { id: requestId },
      data: { status: 'CLOSED' },
    });
    assert.equal((await call(formPath, actor)).status, 403);
    await db.request.update({
      where: { id: requestId },
      data: { status: 'ACTIVE' },
    });
    assert.equal((await call(formPath, actor)).status, 403);
    const state = (await (
      await call('/documents/passport/access', customer)
    ).json()) as { audit: Array<{ action: string }> };
    assert(
      state.audit.some(
        (row: { action: string }) => row.action === 'PROVIDER_FORM_READ',
      ),
    );
    assert(
      state.audit.some(
        (row: { action: string }) => row.action === 'PROVIDER_PHOTO_READ',
      ),
    );
    assert(
      state.audit.some(
        (row: { action: string }) => row.action === 'REQUEST_REVOKE_PHOTO',
      ),
    );
    console.log(
      'PASS: real HTTP/private storage; separate consent, owner/provider isolation, expiry, revocation, membership suspension, request closure and audit',
    );
  } finally {
    await db.request.deleteMany({ where: { id: requestId } });
    await db.provider.deleteMany({ where: { id: providerId } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    const jobs = await db.passportObjectCleanup.findMany({
      where: { userId: { in: users } },
    });
    for (const job of jobs) {
      await erase.erase(job.objectKey);
      await db.passportObjectCleanup.deleteMany({
        where: { objectKey: job.objectKey },
      });
    }
    storage.onModuleDestroy();
    await db.$disconnect();
    console.log(
      'PASS: synthetic accounts, request, passport JSON/photo and cleanup tasks removed',
    );
  }
}
void main().catch((error: unknown) => {
  console.error(
    error instanceof assert.AssertionError
      ? `Assertion failed: actual=${String(error.actual)}, expected=${String(error.expected)}`
      : 'Passport access check failed',
  );
  process.exitCode = 1;
});
