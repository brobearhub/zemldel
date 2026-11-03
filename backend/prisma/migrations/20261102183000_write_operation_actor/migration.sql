ALTER TABLE "WriteOperation" ADD CONSTRAINT "WriteOperation_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
