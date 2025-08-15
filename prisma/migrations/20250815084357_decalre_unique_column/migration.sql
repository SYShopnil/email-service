/*
  Warnings:

  - A unique constraint covering the columns `[id,status]` on the table `EmailLog` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_id_status_key" ON "public"."EmailLog"("id", "status");
