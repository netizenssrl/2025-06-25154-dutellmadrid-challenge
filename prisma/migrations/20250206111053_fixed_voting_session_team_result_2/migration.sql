/*
  Warnings:

  - The primary key for the `voting_session_team_results` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `idTeam` on the `voting_session_team_results` table. All the data in the column will be lost.
  - You are about to drop the column `idVotingSession` on the `voting_session_team_results` table. All the data in the column will be lost.
  - Added the required column `teamId` to the `voting_session_team_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `votingSessionId` to the `voting_session_team_results` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `voting_session_team_results` DROP FOREIGN KEY `voting_session_team_results_idTeam_fkey`;

-- DropForeignKey
ALTER TABLE `voting_session_team_results` DROP FOREIGN KEY `voting_session_team_results_idVotingSession_fkey`;

-- DropIndex
DROP INDEX `voting_session_team_results_idTeam_fkey` ON `voting_session_team_results`;

-- AlterTable
ALTER TABLE `voting_session_team_results` DROP PRIMARY KEY,
    DROP COLUMN `idTeam`,
    DROP COLUMN `idVotingSession`,
    ADD COLUMN `teamId` INTEGER NOT NULL,
    ADD COLUMN `votingSessionId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`votingSessionId`, `teamId`);

-- AddForeignKey
ALTER TABLE `voting_session_team_results` ADD CONSTRAINT `voting_session_team_results_votingSessionId_fkey` FOREIGN KEY (`votingSessionId`) REFERENCES `voting_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voting_session_team_results` ADD CONSTRAINT `voting_session_team_results_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
