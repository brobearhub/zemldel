import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ContractFilesController } from './contract-files.controller';
import { ContractFilesService } from './contract-files.service';
import { InternalAuthService } from '../auth/internal-auth.service';

describe('contract multipart validation', () => {
  let app: INestApplication<App>;
  const upload = vi.fn().mockResolvedValue({ bundleId: 'bundle' });
  beforeEach(async () => {
    upload.mockClear();
    // Vitest's esbuild transform does not emit Nest constructor metadata.
    Reflect.defineMetadata(
      'design:paramtypes',
      [ContractFilesService, InternalAuthService],
      ContractFilesController,
    );
    const module = await Test.createTestingModule({
      controllers: [ContractFilesController],
      providers: [
        {
          provide: ContractFilesService,
          useValue: { uploadBundleForProvider: upload },
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
      'PDF/DOCX',
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
});
