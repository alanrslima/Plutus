-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "import_history_id" TEXT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_history_id_fkey" FOREIGN KEY ("import_history_id") REFERENCES "import_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;
