import { afterEach, describe, expect, it, vi } from 'vitest';
import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import type { SESv2Client } from '@aws-sdk/client-sesv2';
import { createServer, type Socket } from 'node:net';
import { createTransport } from 'nodemailer';
import { FallbackMailSender } from './fallback-mail-sender';
import { PostboxMailSender } from './postbox-mail-sender';
import { createMailSender } from './create-mail-sender';
import { SmtpMailSender } from './smtp-mail-sender';

const mail = { to: 'user@example.org', subject: 'Тест', text: 'Привет' };

describe('mail delivery', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('falls back only on an SMTP connection failure', async () => {
    const primary = {
      send: vi.fn().mockRejectedValue({
        code: 'ETIMEDOUT',
        command: 'CONN',
        timeoutType: 'CONNECT_TIMEOUT',
      }),
    };
    const fallback = { send: vi.fn().mockResolvedValue(undefined) };
    await new FallbackMailSender(primary, fallback).send(mail);
    expect(fallback.send).toHaveBeenCalledOnce();
    expect(fallback.send).toHaveBeenCalledWith(mail);
  });

  it('falls back after a real Nodemailer connection timeout', async () => {
    const sockets: Socket[] = [];
    const server = createServer((socket) => {
      sockets.push(socket);
      socket.on('error', () => {});
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('No TCP address');
    const transport = createTransport({
      host: '127.0.0.1',
      port: address.port,
      secure: true,
      connectionTimeout: 150,
    });
    const fallback = { send: vi.fn().mockResolvedValue(undefined) };
    try {
      await new FallbackMailSender(
        new SmtpMailSender(transport, 'sender@example.org'),
        fallback,
      ).send(mail);
      expect(fallback.send).toHaveBeenCalledWith(mail);
    } finally {
      transport.close();
      sockets.forEach((socket) => socket.destroy());
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it.each([
    { code: 'ETIMEDOUT', command: 'DATA' },
    { code: 'ETIMEDOUT', command: 'CONN', timeoutType: 'SOCKET_TIMEOUT' },
    { code: 'EAUTH', command: 'AUTH PLAIN' },
    { code: 'ETIMEDOUT' },
  ])(
    'does not retry an ambiguous or non-connection error %j',
    async (error) => {
      const primary = { send: vi.fn().mockRejectedValue(error) };
      const fallback = { send: vi.fn() };
      await expect(
        new FallbackMailSender(primary, fallback).send(mail),
      ).rejects.toBe(error);
      expect(fallback.send).not.toHaveBeenCalled();
    },
  );

  it('sends a UTF-8 message through the SES-compatible API', async () => {
    const send = vi.fn().mockResolvedValue({ MessageId: 'id' });
    await new PostboxMailSender(
      { send } as unknown as SESv2Client,
      'sender@example.org',
    ).send(mail);
    const [command, options] = send.mock.calls[0] as [
      SendEmailCommand,
      { abortSignal: AbortSignal },
    ];
    expect(command).toBeInstanceOf(SendEmailCommand);
    expect(command.input).toEqual({
      FromEmailAddress: 'sender@example.org',
      Destination: { ToAddresses: ['user@example.org'] },
      Content: {
        Simple: {
          Subject: { Data: 'Тест', Charset: 'UTF-8' },
          Body: { Text: { Data: 'Привет', Charset: 'UTF-8' } },
        },
      },
    });
    expect(options.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('fails at startup if Postbox credentials are incomplete', () => {
    vi.stubEnv('MAIL_TRANSPORT', 'postbox');
    vi.stubEnv('SMTP_FROM', 'sender@example.org');
    vi.stubEnv('POSTBOX_ACCESS_KEY_ID', '');
    vi.stubEnv('POSTBOX_SECRET_ACCESS_KEY', '');
    expect(() => createMailSender()).toThrow('Postbox requires');
  });
});
