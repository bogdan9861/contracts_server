/*
  Warnings:

  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Contract` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `AuditLog` DROP FOREIGN KEY `AuditLog_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Client` DROP FOREIGN KEY `Client_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Company` DROP FOREIGN KEY `Company_ownerId_fkey`;

-- DropForeignKey
ALTER TABLE `Contract` DROP FOREIGN KEY `Contract_clientId_fkey`;

-- DropForeignKey
ALTER TABLE `Contract` DROP FOREIGN KEY `Contract_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Notification` DROP FOREIGN KEY `Notification_userId_fkey`;

-- DropTable
DROP TABLE `AuditLog`;

-- DropTable
DROP TABLE `Client`;

-- DropTable
DROP TABLE `Company`;

-- DropTable
DROP TABLE `Contract`;

-- DropTable
DROP TABLE `Notification`;

-- DropTable
DROP TABLE `User`;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `role` ENUM('COMPANY_OWNER', 'CLIENT') NOT NULL,
    `ownedCompanyId` VARCHAR(191) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_ownedCompanyId_key`(`ownedCompanyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companies` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `inn` VARCHAR(191) NULL,
    `kpp` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `companies_inn_key`(`inn`),
    UNIQUE INDEX `companies_ownerId_key`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contracts` (
    `id` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sum` DECIMAL(10, 2) NOT NULL,
    `fileUrl` VARCHAR(191) NULL,
    `requestStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `contractStatus` ENUM('ACTIVE', 'EXPIRED', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
    `companyId` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `reviewedAt` DATETIME(3) NULL,
    `signedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectedReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contracts_number_key`(`number`),
    INDEX `contracts_companyId_idx`(`companyId`),
    INDEX `contracts_ownerId_idx`(`ownerId`),
    INDEX `contracts_clientId_idx`(`clientId`),
    INDEX `contracts_requestStatus_idx`(`requestStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `type` ENUM('CONTRACT_REQUEST_RECEIVED', 'CONTRACT_APPROVED', 'CONTRACT_REJECTED') NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `contractId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_isRead_idx`(`isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `oldValue` JSON NULL,
    `newValue` JSON NULL,
    `userId` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_ownedCompanyId_fkey` FOREIGN KEY (`ownedCompanyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
