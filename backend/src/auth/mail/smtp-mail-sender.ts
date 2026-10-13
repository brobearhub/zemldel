import type { Transporter } from 'nodemailer';
import type { MailSender, OutboundMail } from './mail-sender';

export class SmtpMailSender implements MailSender {
  constructor(
    private readonly transport: Transporter,
    private readonly from: string,
  ) {}

  async send(mail: OutboundMail): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    });
  }
}
