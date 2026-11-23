CREATE TABLE "EmailVerification" (
    "email" TEXT NOT NULL,
    "userId" UUID,
    "accountKind" "AccountKind",
    "codeHash" TEXT,
    "sentAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "tokenHash" TEXT,
    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("email"),
    CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EmailVerification_userId_idx" ON "EmailVerification"("userId");
