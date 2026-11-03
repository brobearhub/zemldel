import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import type { MailSender, OutboundMail } from './mail-sender';

/** Yandex Postbox exposes the AWS-compatible SESv2 API over HTTPS. */
export class PostboxMailSender implements MailSender {
  constructor(
    private readonly client: SESv2Client,
    private readonly from: string,
  ) {}

  async send(mail: OutboundMail): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.from,
        Destination: { ToAddresses: [mail.to] },
        Content: {
          Simple: {
            Subject: { Data: mail.subject, Charset: 'UTF-8' },
            Body: { Text: { Data: mail.text, Charset: 'UTF-8' } },
          },
        },
      }),
      { abortSignal: AbortSignal.timeout(8_000) },
    );
  }
}
