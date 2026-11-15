import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ContractFilesController } from './contract-files.controller';
import { ProviderDocumentsService } from '../provider-documents/provider-documents.service';
import { ContractFilesService } from './contract-files.service';
import { InternalAuthService } from '../auth/internal-auth.service';

describe('contract multipart validation', () => {
  let app: INestApplication<App>;
  const upload = vi.fn().mockResolvedValue({ bundleId: 'bundle' });
  const uploadMisc = vi.fn().mockResolvedValue({ created: [{ id: 'file' }] });
  const uploadSource = vi.fn();
  const visibility = vi
    .fn()
    .mockResolvedValue({ id: 'file', visibleToCustomer: false });
  beforeEach(async () => {
    uploadSource.mockReset().mockResolvedValue({
      originalname: 'library.xlsx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('sheet'),
      size: 5,
    });
    upload.mockClear();
    uploadMisc.mockClear();
    visibility.mockClear();
    // Vitest's esbuild transform does not emit Nest constructor metadata.
    Reflect.defineMetadata(
      'design:paramtypes',
      [ContractFilesService, InternalAuthService, ProviderDocumentsService],
      ContractFilesController,
    );
    const module = await Test.createTestingModule({
      controllers: [ContractFilesController],
      providers: [
        { provide: ProviderDocumentsService, useValue: { uploadSource } },
        {
          provide: ContractFilesService,
          useValue: {
            uploadBundleForProvider: upload,
            uploadForProvider: uploadMisc,
            setMiscVisibilityForProvider: visibility,
          },
        },
        {
          provide: InternalAuthService,
          useValue: { getUserIdFromRequest: () => 'actor' },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 422 for unsupported files before invoking storage', async () => {
    const response = await request(app.getHttpServer())
      .post('/pro/requests/r/contract-bundles')
      .attach('document', Buffer.from('invalid'), {
        filename: 'invalid.exe',
        contentType: 'application/octet-stream',
      });
    expect(response.status).toBe(422);
    expect((response.body as { message: string }).message).toContain(
      'PDF, Word, Excel',
    );
    expect(upload).not.toHaveBeenCalled();
  });
  it('accepts a document without an optional signature', async () => {
    const response = await request(app.getHttpServer())
      .post('/pro/requests/r/contract-bundles')
      .attach('document', Buffer.from('test'), {
        filename: 'contract.pdf',
        contentType: 'application/pdf',
      });
    expect(response.status).toBe(201);
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'r', signature: undefined }),
    );
  });

  it('resolves a library source for contracts and preserves an optional signature', async () => {
    const response = await request(app.getHttpServer())
      .post('/pro/requests/r/contract-bundles')
      .field('sourceDocumentId', 'library-file')
      .attach('signature', Buffer.from('signature'), {
        filename: 'contract.sig',
        contentType: 'application/octet-stream',
      });
    expect(response.status).toBe(201);
    expect(uploadSource).toHaveBeenCalledWith('actor', 'library-file');
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({ originalname: 'library.xlsx' }),
        signature: expect.objectContaining({ originalname: 'contract.sig' }),
      }),
    );
  });

  it('resolves library sources for provider documents and keeps private visibility', async () => {
    const response = await request(app.getHttpServer())
      .post('/pro/requests/r/provider-misc')
      .field('sourceDocumentIds', JSON.stringify(['library-file']))
      .field('visibleToCustomer', 'false');
    expect(response.status).toBe(201);
    expect(uploadMisc).toHaveBeenCalledWith(
      expect.objectContaining({
        visibleToCustomer: false,
        files: [expect.objectContaining({ originalname: 'library.xlsx' })],
      }),
    );
  });

  it('rejects more than ten library files before reading storage', async () => {
    const response = await request(app.getHttpServer())
      .post('/pro/requests/r/provider-misc')
      .field(
        'sourceDocumentIds',
        JSON.stringify(Array.from({ length: 11 }, (_, index) => String(index))),
      );
    expect(response.status).toBe(422);
    expect(uploadSource).not.toHaveBeenCalled();
    expect(uploadMisc).not.toHaveBeenCalled();
  });

  it.each([
    ['true', true],
    ['false', false],
    [undefined, true],
  ])('persists multipart visibility %s as %s', async (value, expected) => {
    const pending = request(app.getHttpServer()).post(
      '/pro/requests/r/provider-misc',
    );
    if (value !== undefined) pending.field('visibleToCustomer', value);
    const response = await pending.attach('files', Buffer.from('test'), {
      filename: 'plan.pdf',
      contentType: 'application/pdf',
    });
    expect(response.status).toBe(201);
    expect(uploadMisc).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'r',
        visibleToCustomer: expected,
      }),
    );
  });

  it('rejects malformed visibility before storing a file', async () => {
    const response = await request(app.getHttpServer())
      .post('/pro/requests/r/provider-misc')
      .field('visibleToCustomer', 'no')
      .attach('files', Buffer.from('test'), {
        filename: 'plan.pdf',
        contentType: 'application/pdf',
      });
    expect(response.status).toBe(422);
    expect(uploadMisc).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'sets existing file visibility to %s',
    async (value) => {
      const response = await request(app.getHttpServer())
        .patch('/pro/requests/r/provider-misc/file')
        .send({ visibleToCustomer: value });
      expect(response.status).toBe(200);
      expect(visibility).toHaveBeenCalledWith({
        actorUserId: 'actor',
        requestId: 'r',
        fileId: 'file',
        visibleToCustomer: value,
      });
    },
  );

  it.each([
    {},
    { visibleToCustomer: 'false' },
    { visibleToCustomer: 0 },
    { visibleToCustomer: null },
  ])('rejects invalid visibility updates: %j', async (body) => {
    const response = await request(app.getHttpServer())
      .patch('/pro/requests/r/provider-misc/file')
      .send(body);
    expect(response.status).toBe(422);
    expect(visibility).not.toHaveBeenCalled();
  });
});
