/*
  Warnings:

  - You are about to drop the column `comapnyName` on the `User` table. All the data in the column will be lost.
  - Added the required column `companyName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `User` DROP COLUMN `comapnyName`,
    ADD COLUMN `companyName` VARCHAR(191) NOT NULL;
