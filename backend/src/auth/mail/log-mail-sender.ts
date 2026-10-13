import { Logger } from '@nestjs/common';
import type { MailSender, OutboundMail } from './mail-sender';

/** Why: без SMTP ссылка остаётся только в логе сервера и не попадает в HTTP-ответ. */
export class LogMailSender implements MailSender {
  private readonly logger = new Logger(LogMailSender.name);

  send(mail: OutboundMail): Promise<void> {
    this.logger.log(
      `SMTP не задан. Письмо для ${mail.to}: ${mail.subject}\n${mail.text}`,
    );
    return Promise.resolve();
  }
}
