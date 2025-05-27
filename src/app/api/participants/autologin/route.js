import { NextResponse } from 'next/server';
import { createParticipantAuto } from '@/actions/participant';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('idteam');
    try {
        const participant = await createParticipantAuto({ teamId });
        return NextResponse.json({ ...participant }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
