-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "referenced_transaction_id" TEXT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_referenced_transaction_id_fkey" FOREIGN KEY ("referenced_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
