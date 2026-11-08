import { describe, expect, it, vi } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { PassportFormStorageService } from './passport-form-storage.service';
import { parsePassportDto } from './dto/passport.dto';

const passport = parsePassportDto({ series: '0000', number: '000001' }).data!;
const key = `passports/${randomUUID()}/form/${randomUUID()}.json`;
const body = JSON.stringify(passport);
const sha256 = createHash('sha256').update(body).digest('hex');

function fixture(kmsKeyId: string | null = 'kms') {
  const send = vi
    .fn()
    .mockResolvedValue({ Body: { transformToString: () => body } });
  return {
    send,
    storage: new PassportFormStorageService({
      getConnection: () => ({
        client: { send },
        bucket: 'private',
        kmsKeyId,
      }),
    } as never),
  };
}

describe('passport JSON storage', () => {
  it('omits KMS headers for synthetic testing data', async () => {
    const { send, storage } = fixture(null);
    await storage.put(key, passport);
    expect(send.mock.calls[0][0].input).not.toHaveProperty(
      'ServerSideEncryption',
    );
    expect(send.mock.calls[0][0].input).not.toHaveProperty('SSEKMSKeyId');
  });

  it('writes JSON with required encryption and without personal data in metadata', async () => {
    const { send, storage } = fixture();
    expect(await storage.put(key, passport)).toBe(sha256);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: 'private',
      Key: key,
      Body: body,
      ContentType: 'application/json',
      CacheControl: 'private, no-store',
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: 'kms',
    });
  });
  it('reads and validates a verified JSON object', async () => {
    expect(await fixture().storage.read(key, sha256)).toEqual(passport);
  });
  it('rejects an object with a different checksum', async () => {
    await expect(
      fixture().storage.read(key, '0'.repeat(64)),
    ).rejects.toMatchObject({ status: 502 });
  });
  it('rejects a valid checksum on a malformed passport', async () => {
    const { send, storage } = fixture();
    const invalid = '{"series":"bad"}';
    send.mockResolvedValue({ Body: { transformToString: () => invalid } });
    await expect(
      storage.read(key, createHash('sha256').update(invalid).digest('hex')),
    ).rejects.toMatchObject({ status: 502 });
  });
  it('does not expose storage error details to the API', async () => {
    const { send, storage } = fixture();
    send.mockRejectedValue(new Error('sensitive upstream details'));
    await expect(storage.put(key, passport)).rejects.toThrow(
      'Passport storage unavailable',
    );
  });
  it('cannot erase files outside the passport form prefix', async () => {
    const { send, storage } = fixture();
    await expect(storage.erase('documents/another-file')).rejects.toThrow(
      'Invalid passport object key',
    );
    expect(send).not.toHaveBeenCalled();
  });
});
