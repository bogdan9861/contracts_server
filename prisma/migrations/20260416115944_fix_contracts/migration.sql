-- DropForeignKey
ALTER TABLE `Contract` DROP FOREIGN KEY `Contract_clientId_fkey`;

-- DropIndex
DROP INDEX `Contract_clientId_fkey` ON `Contract`;

-- AlterTable
ALTER TABLE `Contract` MODIFY `clientId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
