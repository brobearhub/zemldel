-- Снимок цены услуги на заявке и системные сообщения в чате.
ALTER TABLE "Request" ADD COLUMN "servicePriceRubles" INTEGER;

CREATE TYPE "MessageKind" AS ENUM ('USER', 'SYSTEM');

ALTER TABLE "Message" ADD COLUMN "kind" "MessageKind" NOT NULL DEFAULT 'USER';
