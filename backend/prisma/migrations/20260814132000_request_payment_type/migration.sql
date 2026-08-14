-- CreateEnum
CREATE TYPE "RequestPaymentType" AS ENUM ('CONTRACT', 'OTHER');

-- AlterTable
ALTER TABLE "RequestPayment" ADD COLUMN     "type" "RequestPaymentType" NOT NULL DEFAULT 'CONTRACT';

