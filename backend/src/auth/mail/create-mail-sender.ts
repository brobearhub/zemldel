import { createTransport } from 'nodemailer';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { FallbackMailSender } from './fallback-mail-sender';
import { LogMailSender } from './log-mail-sender';
import type { MailSender } from './mail-sender';
import { PostboxMailSender } from './postbox-mail-sender';
import { SmtpMailSender } from './smtp-mail-sender';

export type PasswordResetConfig = {
  readonly frontendUrl: string;
};

export function readPasswordResetConfig(): PasswordResetConfig {
  const frontendUrl = (
    process.env.FRONTEND_URL ?? 'http://localhost:4000'
  ).replace(/\/$/, '');
  return { frontendUrl };
}

export function createMailSender(): MailSender {
  const mode = process.env.MAIL_TRANSPORT?.trim() || 'smtp';
  if (!['smtp', 'postbox'].includes(mode)) {
    throw new Error('MAIL_TRANSPORT must be smtp or postbox');
  }
  const fallbackEnabled = process.env.MAIL_POSTBOX_FALLBACK === 'true';
  const from =
    process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || '';
  const postbox =
    mode === 'postbox' || fallbackEnabled ? createPostbox(from) : null;
  if (mode === 'postbox') return postbox!;

  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    if (fallbackEnabled)
      throw new Error('SMTP_HOST is required for SMTP fallback mode');
    return new LogMailSender();
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim() ?? '';
  const pass = process.env.SMTP_PASSWORD ?? '';

  const transport = createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
    ...(fallbackEnabled ? { connectionTimeout: 3_000, dnsTimeout: 3_000 } : {}),
  });

  const smtp = new SmtpMailSender(transport, from);
  return postbox ? new FallbackMailSender(smtp, postbox) : smtp;
}

function createPostbox(from: string): MailSender {
  const accessKeyId = process.env.POSTBOX_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.POSTBOX_SECRET_ACCESS_KEY?.trim();
  if (!from || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Postbox requires SMTP_FROM, POSTBOX_ACCESS_KEY_ID and POSTBOX_SECRET_ACCESS_KEY',
    );
  }
  const client = new SESv2Client({
    region: 'ru-central1',
    endpoint: 'https://postbox.cloud.yandex.net',
    credentials: { accessKeyId, secretAccessKey },
    maxAttempts: 1,
  });
  return new PostboxMailSender(client, from);
}
