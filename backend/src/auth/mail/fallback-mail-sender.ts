import { Logger } from '@nestjs/common';
import type { MailSender, OutboundMail } from './mail-sender';

/** Retry only when SMTP failed while connecting, before a message could be sent. */
export class FallbackMailSender implements MailSender {
  private readonly logger = new Logger(FallbackMailSender.name);

  constructor(
    private readonly primary: MailSender,
    private readonly fallback: MailSender,
  ) {}

  async send(mail: OutboundMail): Promise<void> {
    try {
      await this.primary.send(mail);
    } catch (error) {
      const smtpError = error as {
        code?: unknown;
        command?: unknown;
        timeoutType?: unknown;
      } | null;
      const beforeSending =
        smtpError?.command === 'CONN' &&
        (smtpError.code === 'EDNS' ||
          (smtpError.code === 'ETIMEDOUT' &&
            smtpError.timeoutType === 'CONNECT_TIMEOUT'));
      if (!beforeSending) {
        throw error;
      }
      this.logger.warn(
        'SMTP connection failed; sending through Postbox HTTPS.',
      );
      await this.fallback.send(mail);
    }
  }
}
