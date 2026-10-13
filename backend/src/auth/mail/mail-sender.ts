export type OutboundMail = {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
};

/** Why: Strategy — SMTP в проде и лог в локальной среде взаимозаменяемы. */
export interface MailSender {
  send(mail: OutboundMail): Promise<void>;
}

export const MAIL_SENDER = Symbol('MAIL_SENDER');
