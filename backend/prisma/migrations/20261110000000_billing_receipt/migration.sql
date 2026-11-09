-- Keep old orders intact; new purchases snapshot the buyer's receipt address.
ALTER TABLE "BillingOrder" ADD COLUMN "receiptEmail" TEXT;
