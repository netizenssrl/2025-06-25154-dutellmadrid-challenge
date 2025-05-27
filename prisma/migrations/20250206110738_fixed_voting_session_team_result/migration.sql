/*
  Warnings:

  - You are about to drop the `status_team_results` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `status_team_results` DROP FOREIGN KEY `status_team_results_idStatus_fkey`;

-- DropForeignKey
ALTER TABLE `status_team_results` DROP FOREIGN KEY `status_team_results_idTeam_fkey`;

-- DropTable
DROP TABLE `status_team_results`;

-- CreateTable
CREATE TABLE `voting_session_team_results` (
    `idVotingSession` INTEGER NOT NULL,
    `idTeam` INTEGER NOT NULL,
    `percentage` DOUBLE NOT NULL,

    PRIMARY KEY (`idVotingSession`, `idTeam`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `voting_session_team_results` ADD CONSTRAINT `voting_session_team_results_idVotingSession_fkey` FOREIGN KEY (`idVotingSession`) REFERENCES `voting_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voting_session_team_results` ADD CONSTRAINT `voting_session_team_results_idTeam_fkey` FOREIGN KEY (`idTeam`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
