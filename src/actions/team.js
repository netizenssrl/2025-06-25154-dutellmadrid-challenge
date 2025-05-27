"use server";
import prisma from '@/libs/prisma';
export const getTeams = async () => {
    return await prisma.team.findMany();
}
export const getTeamsOrderedById = async () => {
    return await prisma.team.findMany({
        orderBy: {
            id: 'asc'
        }
    });
}
export const resetTeamsScore = async () => {
    return await prisma.team.updateMany({
        data: {
            iScore: 0
        }
    });
}
