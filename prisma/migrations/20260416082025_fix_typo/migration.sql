/*
  Warnings:

  - You are about to drop the column `stauts` on the `Contract` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Contract` DROP COLUMN `stauts`,
    ADD COLUMN `status` ENUM('ACTIVE', 'CLOSED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE';
