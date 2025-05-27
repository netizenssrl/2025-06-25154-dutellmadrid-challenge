"use server";
import prisma from '@/libs/prisma';
import { emitSocketEvent, SOCKET_EVENTS, SOCKET_TARGETS } from "@/libs/socket";

export const getVotingSessionsByRoom = async (roomId) => {
    try {
        const condition = roomId ? {
            OR: [
                {
                    roomQuestions: {
                        some: {
                            roomId: parseInt(roomId),
                        },
                    },
                },
                {
                    roomQuestions: {
                        none: {}, // Sessioni senza riferimento a roomId
                    },
                },
            ]
        } : {};
        const votingSessions = await prisma.votingSession.findMany({
            where: {
                question: condition
            },
            include: {
                question: {
                    include: {
                        answers: true
                    }
                },
                participantAnswers: {
                    include: {
                        participant: true,
                        answer: true
                    }
                },
                votingSessionTeamResult: true
            },
            orderBy: {
                dtmStarted: 'desc'
            }
        });
        return votingSessions;
    }
    catch (error) {
        throw new Error("Error fetching voting sessions");
    }
};
export const startVotingSession = async (questionId, bFakeResults, roomId) => {
    try {
        const votingSession = await prisma.votingSession.create({
            data: {
                questionId,
                bFakeResults,
                dtmStarted: new Date()
            }
        });
        emitSocketEvent(SOCKET_TARGETS.ADMIN, roomId, SOCKET_EVENTS.VOTINGSESSION.CREATED, votingSession);
        return votingSession;
    }
    catch (error) {
        throw new Error("Error starting voting session");
    }
};
export const stopVotingSession = async (votingSessionId, bFakeResults, roomId) => {
    try {
        const votingSession = await prisma.votingSession.update({
            where: {
                id: votingSessionId
            },
            data: {
                dtmStopped: new Date(),
                bFakeResults
            }
        });
        emitSocketEvent(SOCKET_TARGETS.ADMIN, roomId, SOCKET_EVENTS.VOTINGSESSION.STOPPED, votingSession);
        return votingSession;
    }
    catch (error) {
        throw new Error("Error stopping voting session");
    }
};
export const getResults = async (votingSessionId, bTeamPointsEnabled, bRoomPointsEnabled, roomId) => {
    try {
        // if bTeamPointsEnabled consider only participants with bTeamPointsEnabled
        // if bRoomPointsEnabled consider only participants with bRoomPointsEnabled
        const votingSession = await prisma.participantAnswer.findMany({
            where: {
                votingSessionId: parseInt(votingSessionId),
                ...(bTeamPointsEnabled && { participant: { bTeamPointsEnabled: true } }),
                ...(bRoomPointsEnabled && { participant: { bRoomPointsEnabled: true } }),
                ...(roomId !== "all" && { participant: { roomId: parseInt(roomId) } }),
            },
            include: {
                participant: true,
                answer: true
            }
        });
        return votingSession;
    }
    catch (error) {
        throw new Error("Error fetching teams results");
    }
};
export const setTeamsPoints = async (votingSessionId, iScore) => {
    try{
        const teamScores = await prisma.votingSessionTeamResult.findMany({
            where: { votingSessionId }
        });

        let maxPercentage = 0.00;
        teamScores.map(({ percentage }) => {
            if (percentage > maxPercentage) {
                maxPercentage = percentage;
            }
        });

        // Update each team's score in the database
        teamScores.map(async ({ teamId, percentage }) => {
            if (maxPercentage && maxPercentage === percentage) {
                await prisma.$transaction(async (prisma) => {
                    await prisma.votingSessionTeamResult.updateMany({
                        data: { iScore },
                        where: {
                            AND: [
                                { votingSessionId },
                                { teamId },
                            ],
                        },
                    });

                    await prisma.team.update({
                        where: { id: teamId },
                        data: { iScore: { increment: iScore } },
                    });
                });
            }
        });

    }
    catch (error) {
        console.log(error);
        throw new Error("Error setting teams points");
    }
};

export const setRoomsPoints = async (votingSessionId, iScore) => {
    try {

        // set points to each room depending on the correct answers
        const votingSession = await prisma.participantAnswer.findMany({
            where: {
                votingSessionId: parseInt(votingSessionId),
                participant: { bRoomPointsEnabled: true }
            },
            include: {
                participant: {
                    include: {
                        room: true
                    }
                },
                answer: true
            }
        });

        if(votingSession.length === 0) return;

        const roomAnswersCount = votingSession.reduce((acc, participantAnswer) => {
            const roomId = participantAnswer.participant.roomId;
            const bCorrect = participantAnswer.answer.bCorrect;
            const answerCount = {bCorrect: 0, total: 0};
            if(!acc[roomId]) acc[roomId] = answerCount;
            acc[roomId].total++;
            if(bCorrect) acc[roomId].bCorrect++;
            return acc;
        }, {});

        // Calculate normalized scores for each room
        const roomScores = Object.keys(roomAnswersCount).map((roomId) => {
            const correctAnswers = roomAnswersCount[roomId].bCorrect;
            const totalParticipants = roomAnswersCount[roomId].total || 1; // Avoid division by 0
            const percentage = correctAnswers / totalParticipants; // Percentage of correct answers
            const normalizedScore = Math.round(iScore * percentage); // Normalized score
            return { roomId: parseInt(roomId), score: normalizedScore };
        });

        // Update each room's score in the database
        const updatePromises = roomScores.map(({ roomId, score }) =>
            prisma.room.update({
                where: { id: roomId },
                data: { iScore: { increment: score } },
            })
        );

        await Promise.all(updatePromises);

    }
    catch (error) {
        throw new Error("Error setting rooms points");
    }
};

export const deleteAllVotingSessions = async () => {
    try {
        await prisma.$transaction(async (prisma) => {
            await prisma.votingSessionTeamResult.deleteMany();
            await prisma.participantAnswer.deleteMany();
            await prisma.votingSession.deleteMany();
            await prisma.$executeRawUnsafe(`ALTER TABLE voting_sessions AUTO_INCREMENT = 1`);
        });

        emitSocketEvent(SOCKET_TARGETS.ADMIN, null, SOCKET_EVENTS.VOTINGSESSION.DELETED);
    }
    catch (error) {
        throw new Error("Error deleting voting sessions");
    }
}

export const setTeamResults = async (votingSessionId, fakeTeamResult) => {
    try {
        if(!fakeTeamResult.length){
            const participantAnswers = await prisma.participantAnswer.findMany({
                where: {
                    votingSessionId,
                    participant: { bTeamPointsEnabled: true },
                },
                include: {
                    participant: {
                        include: {
                            team: true
                        }
                    },
                    answer: true
                }
            });
            if(participantAnswers.length === 0) return;
            const teamAnswersCount = participantAnswers.reduce((acc, participantAnswer) => {
                const teamId = participantAnswer.participant.teamId;
                const bCorrect = participantAnswer.answer.bCorrect;
                const answerCount = {bCorrect: 0, total: 0};
                if(!acc[teamId]) acc[teamId] = answerCount;
                acc[teamId].total++;
                if(bCorrect) acc[teamId].bCorrect++;
                return acc;
            }, {});
            const teams = await prisma.team.findMany();
            for (const team of teams) {
                if (!Object.keys(teamAnswersCount).includes(team.id.toString())) {
                    teamAnswersCount[team.id.toString()] = { bCorrect: 0, total: 0 };
                }
            }
            await Promise.all(
                Object.keys(teamAnswersCount).map(async (teamId) => {
                    const correctAnswers = teamAnswersCount[teamId].bCorrect;
                    const totalParticipants = teamAnswersCount[teamId].total || 1; // Evita divisioni per 0
                    const percentage = parseFloat(((correctAnswers / totalParticipants) * 100).toFixed(2));
        
                    const votingSessionTeamResult = await prisma.votingSessionTeamResult.findFirst({
                        where: {
                            votingSessionId: parseInt(votingSessionId),
                            teamId: parseInt(teamId)
                        }
                    });
        
                    if (!votingSessionTeamResult) {
                        return prisma.votingSessionTeamResult.create({
                            data: {
                                votingSessionId: parseInt(votingSessionId),
                                teamId: parseInt(teamId),
                                percentage
                            }
                        });
                    }
                })
            );
        }
        else{
            await Promise.all(
                fakeTeamResult.map(async (teamResult) => {
                    const votingSessionTeamResult = await prisma.votingSessionTeamResult.findFirst({
                        where: {
                            votingSessionId: parseInt(votingSessionId),
                            teamId: parseInt(teamResult.teamId)
                        }
                    });
                    if (!votingSessionTeamResult) {
                        return prisma.votingSessionTeamResult.create({
                            data: {
                                votingSessionId: parseInt(votingSessionId),
                                teamId: parseInt(teamResult.teamId),
                                percentage: teamResult.percentage
                            }
                        });
                    }
                })
            )
        }
        
    } catch (error) {
        throw new Error("Error fetching teams results");
    }
}
