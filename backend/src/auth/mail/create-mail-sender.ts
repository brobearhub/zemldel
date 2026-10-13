import { createTransport } from 'nodemailer';
import { LogMailSender } from './log-mail-sender';
import type { MailSender } from './mail-sender';
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

/** Why: пустой SMTP_HOST включает лог, чтобы локальный сброс работал без почтового сервера. */
export function createMailSender(): MailSender {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    return new LogMailSender();
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim() ?? '';
  const pass = process.env.SMTP_PASSWORD ?? '';
  const from = process.env.SMTP_FROM?.trim() || user;

  const transport = createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });

  return new SmtpMailSender(transport, from);
}
