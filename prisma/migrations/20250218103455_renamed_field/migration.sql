/*
  Warnings:

  - You are about to drop the column `bFake` on the `voting_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `voting_sessions` DROP COLUMN `bFake`,
    ADD COLUMN `bFakeResults` BOOLEAN NOT NULL DEFAULT false;
