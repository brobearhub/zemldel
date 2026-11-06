import { describe, expect, it, vi } from 'vitest';
import { ContractFilesService } from './contract-files.service';
import { ContractFilesController } from './contract-files.controller';

function fixture() {
  const create = vi.fn().mockResolvedValue({ id: 'file' });
  const prisma = {
    request: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'r1',
        providerId: 'p1',
        customerUserId: 'c1',
        lockedAt: new Date(),
        status: 'DISCUSSING',
      }),
    },
    $transaction: vi.fn(
      async (
        run: (tx: {
          requestContractFile: { create: typeof create };
        }) => Promise<unknown>,
      ) => await run({ requestContractFile: { create } }),
    ),
  };
  const auth = {
    getServiceManagementContext: vi
      .fn()
      .mockResolvedValue({ isPlatformAdmin: false, providerId: 'p1' }),
  };
  const s3 = {
    putObject: vi.fn().mockResolvedValue({}),
    deleteObject: vi.fn().mockResolvedValue(undefined),
    getObject: vi.fn(),
    isSecureKey: (key: string) => key.startsWith('documents/'),
  };
  const service = new ContractFilesService(
    prisma as never,
    auth as never,
    s3 as never,
  );
  return { service, s3, create };
}

const document = {
  originalname: 'contract.pdf',
  mimetype: 'application/pdf',
  buffer: Buffer.from('test document'),
  size: 13,
} as Express.Multer.File;
const signature = {
  originalname: 'contract.pdf.sig',
  mimetype: 'application/octet-stream',
  buffer: Buffer.from('test signature'),
  size: 14,
} as Express.Multer.File;

describe('contract upload with optional signature', () => {
  it('stores only the document when no signature was supplied', async () => {
    const { service, s3, create } = fixture();
    const result = await service.uploadBundleForProvider({
      actorUserId: 'u1',
      requestId: 'r1',
      document,
    });
    expect(result.bundleId).toBeTruthy();
    expect(s3.putObject).toHaveBeenCalledTimes(1);
    expect(s3.putObject.mock.calls[0][0]).toMatchObject({
      Key: expect.stringMatching(/^documents\//),
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'CONTRACT_DOCUMENT',
          bundleId: result.bundleId,
        }),
      }),
    );
  });

  it('keeps the supplied signature in the same bundle', async () => {
    const { service, s3, create } = fixture();
    const result = await service.uploadBundleForProvider({
      actorUserId: 'u1',
      requestId: 'r1',
      document,
      signature,
    });
    expect(s3.putObject).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'CONTRACT_SIGNATURE',
          bundleId: result.bundleId,
        }),
      }),
    );
  });

  it.each([
    [
      { ...signature, originalname: 'signature.exe' },
      'Unsupported signature type',
    ],
    [{ ...signature, buffer: Buffer.alloc(0) }, 'Empty signature'],
  ])('rejects an invalid supplied signature', async (file, message) => {
    const { service, s3 } = fixture();
    await expect(
      service.uploadBundleForProvider({
        actorUserId: 'u1',
        requestId: 'r1',
        document,
        signature: file,
      }),
    ).rejects.toThrow(message);
    expect(s3.putObject).not.toHaveBeenCalled();
  });

  it('rejects an empty document even without a signature', async () => {
    const { service, s3 } = fixture();
    await expect(
      service.uploadBundleForProvider({
        actorUserId: 'u1',
        requestId: 'r1',
        document: { ...document, buffer: Buffer.alloc(0) },
      }),
    ).rejects.toThrow('Empty document');
    expect(s3.putObject).not.toHaveBeenCalled();
  });

  it('removes the document from storage when its database write fails', async () => {
    const { service, s3, create } = fixture();
    create.mockRejectedValue(new Error('database unavailable'));
    await expect(
      service.uploadBundleForProvider({
        actorUserId: 'u1',
        requestId: 'r1',
        document,
      }),
    ).rejects.toThrow('database unavailable');
    expect(s3.putObject).toHaveBeenCalledTimes(1);
    expect(s3.deleteObject).toHaveBeenCalledWith(
      s3.putObject.mock.calls[0][0].Key,
    );
  });

  it('removes the already uploaded document if uploading its signature fails', async () => {
    const { service, s3, create } = fixture();
    s3.putObject
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('upload failed'))
      .mockResolvedValueOnce({});
    await expect(
      service.uploadBundleForProvider({
        actorUserId: 'u1',
        requestId: 'r1',
        document,
        signature,
      }),
    ).rejects.toThrow('upload failed');
    expect(create).not.toHaveBeenCalled();
    expect(s3.deleteObject).toHaveBeenCalledWith(
      s3.putObject.mock.calls[0][0].Key,
    );
  });
});

describe('contract upload HTTP boundary', () => {
  it('requires the document and does not accept a signature by itself', async () => {
    const service = { uploadBundleForProvider: vi.fn() };
    const controller = new ContractFilesController(
      service as never,
      { getUserIdFromRequest: () => 'u1' } as never,
    );
    await expect(
      controller.uploadBundleForProvider(
        { files: { signature: [signature] } } as never,
        'r1',
        {} as never,
      ),
    ).rejects.toMatchObject({ status: 422 });
    expect(service.uploadBundleForProvider).not.toHaveBeenCalled();
  });

  it('passes a document without a signature to the service', async () => {
    const service = {
      uploadBundleForProvider: vi.fn().mockResolvedValue({ bundleId: 'b1' }),
    };
    const controller = new ContractFilesController(
      service as never,
      { getUserIdFromRequest: () => 'u1' } as never,
    );
    const response = { json: vi.fn() };
    await controller.uploadBundleForProvider(
      { files: { document: [document] } } as never,
      'r1',
      response as never,
    );
    expect(service.uploadBundleForProvider).toHaveBeenCalledWith({
      actorUserId: 'u1',
      requestId: 'r1',
      document,
      signature: undefined,
    });
    expect(response.json).toHaveBeenCalledWith({ bundleId: 'b1' });
  });
});
