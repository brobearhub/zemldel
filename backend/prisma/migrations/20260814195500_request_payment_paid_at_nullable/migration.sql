-- Make payment confirmation optional (scheduled vs confirmed).
ALTER TABLE "RequestPayment" ALTER COLUMN "paidAt" DROP NOT NULL;

