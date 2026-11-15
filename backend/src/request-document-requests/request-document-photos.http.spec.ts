import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ContractFilesController } from '../contract-files/contract-files.controller';
import { ContractFilesService } from '../contract-files/contract-files.service';
import { RequestDocumentRequestsController } from './request-document-requests.controller';
import { RequestDocumentRequestsService } from './request-document-requests.service';
import { InternalAuthService } from '../auth/internal-auth.service';

describe('request photo multipart uploads', () => {
  let app: INestApplication<App>;
  const providerUpload = vi.fn().mockResolvedValue({ created: [] });
  const customerUpload = vi.fn().mockResolvedValue({ ok: true });
  beforeAll(async () => {
    Reflect.defineMetadata(
      'design:paramtypes',
      [ContractFilesService, InternalAuthService],
      ContractFilesController,
    );
    Reflect.defineMetadata(
      'design:paramtypes',
      [RequestDocumentRequestsService, InternalAuthService],
      RequestDocumentRequestsController,
    );
    const module = await Test.createTestingModule({
      controllers: [ContractFilesController, RequestDocumentRequestsController],
      providers: [
        {
          provide: ContractFilesService,
          useValue: { uploadForProvider: providerUpload },
        },
        {
          provide: RequestDocumentRequestsService,
          useValue: { uploadForCustomer: customerUpload },
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
  afterAll(async () => {
    await app.close();
  });

  for (const [url, field, upload] of [
    ['/pro/requests/r/provider-misc', 'files', providerUpload],
    ['/requests/mine/r/document-requests/d/upload', 'file', customerUpload],
  ] as const) {
    it(`accepts converted photos at ${url}`, async () => {
      upload.mockClear();
      const response = await request(app.getHttpServer())
        .post(url)
        .attach(field, Buffer.from('RIFF0000WEBP'), {
          filename: 'photo.webp',
          contentType: 'image/webp',
        });
      expect(response.status).toBe(201);
      expect(upload).toHaveBeenCalledOnce();
      const input = upload.mock.calls[0][0] as {
        file?: Express.Multer.File;
        files?: Express.Multer.File[];
      };
      expect(input.file ?? input.files?.[0]).toMatchObject({
        originalname: 'photo.webp',
        mimetype: 'image/webp',
      });
    });
    it(`rejects unconverted photos at ${url}`, async () => {
      upload.mockClear();
      const response = await request(app.getHttpServer())
        .post(url)
        .attach(field, Buffer.from('jpeg'), {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        });
      expect(response.status).toBe(422);
      expect(upload).not.toHaveBeenCalled();
    });
  }
  it('keeps contract uploads restricted to PDF and DOCX', async () => {
    const response = await request(app.getHttpServer())
      .post('/pro/requests/r/contract-bundles')
      .attach('document', Buffer.from('RIFF0000WEBP'), {
        filename: 'photo.webp',
        contentType: 'image/webp',
      });
    expect(response.status).toBe(422);
  });
});
