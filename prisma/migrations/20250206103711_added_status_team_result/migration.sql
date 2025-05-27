-- CreateTable
CREATE TABLE `status_team_results` (
    `idStatus` INTEGER NOT NULL,
    `idTeam` INTEGER NOT NULL,
    `percentage` DOUBLE NOT NULL,

    PRIMARY KEY (`idStatus`, `idTeam`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `status_team_results` ADD CONSTRAINT `status_team_results_idStatus_fkey` FOREIGN KEY (`idStatus`) REFERENCES `status`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `status_team_results` ADD CONSTRAINT `status_team_results_idTeam_fkey` FOREIGN KEY (`idTeam`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
