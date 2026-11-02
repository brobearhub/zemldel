import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import type { AddressInfo } from 'node:net';
import type { Request, Response } from 'express';
import { parse } from 'content-disposition';
import { describe, expect, it, vi } from 'vitest';
import { ContractFilesController } from './contract-files.controller';

describe('contract downloads over HTTP', () => {
  for (const role of ['customer', 'provider'] as const) {
    for (const [fileName, mimeType, disposition] of [
      [
        'Акт выполненных работ № 2 от 13.07.26.pdf',
        'application/pdf',
        'attachment',
      ],
      [
        'Акт выполненных работ № 2 от 13.07.26.pdf',
        'application/pdf',
        'inline',
      ],
      [
        'Акт выполненных работ № 2 от 13.07.26.pdf.sig',
        'application/octet-stream',
        'attachment',
      ],
      ['contract "final".pdf', 'application/pdf', 'attachment'],
      ['contract\r\nX-Injected: yes.pdf', 'application/pdf', 'attachment'],
    ]) {
      it(`${role}: ${disposition} ${JSON.stringify(fileName)}`, async () => {
        const bytes = Buffer.from('test file bytes');
        const download = vi.fn().mockImplementation(() =>
          Promise.resolve({
            stream: Readable.from([bytes]),
            fileName,
            mimeType,
            disposition,
          }),
        );
        const controller = new ContractFilesController(
          {
            getDownloadStreamForProvider: download,
            getDownloadStreamForCustomer: download,
          } as never,
          { getUserIdFromRequest: () => 'actor' } as never,
        );
        const server = createServer((req, res) => {
          const request = Object.assign(req, {
            query: { inline: disposition === 'inline' ? '1' : undefined },
          }) as unknown as Request;
          const run =
            role === 'provider'
              ? controller.downloadProvider(
                  request,
                  'file',
                  res as unknown as Response,
                )
              : controller.downloadCustomer(
                  request,
                  'request',
                  'file',
                  res as unknown as Response,
                );
          void run.catch(() => {
            res.statusCode = 500;
            res.end();
          });
        });
        await new Promise<void>((resolve) =>
          server.listen(0, '127.0.0.1', resolve),
        );
        try {
          const response = await fetch(
            `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
          );
          expect(response.status).toBe(200);
          expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
          const header = parse(response.headers.get('content-disposition')!);
          expect(header.type).toBe(disposition);
          expect(header.parameters.filename).toBe(fileName);
          expect(response.headers.get('content-type')).toBe(mimeType);
          expect(response.headers.get('cache-control')).toBe(
            'private, no-store',
          );
          expect(response.headers.has('x-injected')).toBe(false);
          expect(download).toHaveBeenCalledWith(
            expect.objectContaining({
              actorUserId: 'actor',
              fileId: 'file',
              inline: disposition === 'inline',
            }),
          );
        } finally {
          await new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          );
        }
      });
    }
  }
});
