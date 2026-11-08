import { describe, expect, it, vi } from 'vitest';
import {
  DeleteObjectCommand,
  ListObjectVersionsCommand,
} from '@aws-sdk/client-s3';
import { DocumentStorageService } from './document-storage.service';

function fixture(kmsKeyId: string | null = 'kms') {
  const send = vi.fn().mockResolvedValue({});
  const legacySend = vi.fn().mockResolvedValue({});
  const service = new DocumentStorageService(
    {
      getConnection: () => ({
        client: { send },
        bucket: 'secure',
        kmsKeyId,
      }),
    } as never,
    { client: { send: legacySend }, privateBucket: 'legacy' } as never,
  );
  return { service, send, legacySend };
}

describe('private document storage', () => {
  it('omits KMS headers for synthetic testing documents', async () => {
    const { service, send } = fixture(null);
    await service.putObject({
      Key: 'documents/synthetic',
      Body: Buffer.from('synthetic'),
      ContentType: 'text/plain',
    });
    expect(send.mock.calls[0][0].input).not.toHaveProperty(
      'ServerSideEncryption',
    );
    expect(send.mock.calls[0][0].input).not.toHaveProperty('SSEKMSKeyId');
  });

  it.each([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/octet-stream',
  ])('encrypts %s and prevents public caching', async (ContentType) => {
    const { service, send, legacySend } = fixture();
    await service.putObject({
      Key: 'documents/random',
      Body: Buffer.from('synthetic'),
      ContentType,
    });
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'secure',
      Key: 'documents/random',
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: 'kms',
      CacheControl: 'private, no-store',
      ContentType,
    });
    expect(legacySend).not.toHaveBeenCalled();
  });

  it('rejects writes to a legacy key', async () => {
    const { service, send, legacySend } = fixture();
    await expect(
      service.putObject({ Key: 'private/old', Body: 'synthetic' }),
    ).rejects.toThrow('private documents prefix');
    expect(send).not.toHaveBeenCalled();
    expect(legacySend).not.toHaveBeenCalled();
  });

  it('does not fall back to old storage when a new object is missing', async () => {
    const { service, send, legacySend } = fixture();
    send.mockRejectedValue({ name: 'NoSuchKey' });
    await expect(service.getObject('documents/missing')).rejects.toMatchObject({
      name: 'NoSuchKey',
    });
    expect(legacySend).not.toHaveBeenCalled();
  });

  it('reads historical keys from their original bucket until migration', async () => {
    const { service, send, legacySend } = fixture();
    await service.getObject('private/old');
    expect(legacySend.mock.calls[0][0].input).toEqual({
      Bucket: 'legacy',
      Key: 'private/old',
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('erases every exact-key version and marker across pages, preserving adjacent objects', async () => {
    const { service, send } = fixture();
    send
      .mockResolvedValueOnce({
        Versions: [
          { Key: 'documents/a', VersionId: 'old' },
          { Key: 'documents/adjacent', VersionId: 'other' },
        ],
        IsTruncated: true,
        NextKeyMarker: 'documents/a',
        NextVersionIdMarker: 'old',
      })
      .mockResolvedValueOnce({
        DeleteMarkers: [{ Key: 'documents/a', VersionId: 'null' }],
        IsTruncated: false,
      });
    await service.deleteObject('documents/a');
    const deletes = send.mock.calls
      .filter(([command]) => command instanceof DeleteObjectCommand)
      .map(([command]) => command.input);
    expect(deletes).toEqual([
      { Bucket: 'secure', Key: 'documents/a', VersionId: 'old' },
      { Bucket: 'secure', Key: 'documents/a', VersionId: 'null' },
    ]);
    expect(send.mock.calls[1][0].input).toMatchObject({
      KeyMarker: 'documents/a',
      VersionIdMarker: 'old',
    });
    expect(send.mock.calls.at(-1)?.[0]).toBeInstanceOf(
      ListObjectVersionsCommand,
    );
  });

  it('does not report successful erasure when a retained copy remains', async () => {
    const { service, send } = fixture();
    send.mockResolvedValue({
      Versions: [{ Key: 'documents/a', VersionId: 'null' }],
    });
    await expect(service.deleteObject('documents/a')).rejects.toMatchObject({
      message: 'Document erasure failed',
      cause: { message: 'Document erasure incomplete' },
    });
  });

  it('propagates storage errors instead of pretending deletion succeeded', async () => {
    const { service, send } = fixture();
    send.mockRejectedValue(new Error('storage unavailable'));
    await expect(service.deleteObject('documents/a')).rejects.toMatchObject({
      message: 'Document erasure failed',
      cause: { message: 'storage unavailable' },
    });
  });

  it('does not expose a missing bucket as a successfully erased legacy file', async () => {
    const { service, legacySend } = fixture();
    legacySend.mockRejectedValue({
      name: 'NoSuchBucket',
      $metadata: { httpStatusCode: 404 },
    });
    await expect(service.deleteObject('private/old')).rejects.toMatchObject({
      message: 'Document erasure failed',
    });
    await expect(
      service.deleteObject('private/old'),
    ).rejects.not.toHaveProperty('$metadata');
  });
});
