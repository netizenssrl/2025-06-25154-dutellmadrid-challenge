import { NextResponse } from 'next/server';
import {getParticipantById, updateParticipant } from '@/actions/participant';


export async function POST(req, {params}) {
	const { id } = await params;
	const body = await req.json();
	try {
		const participant = await updateParticipant({id, ...body});
		return NextResponse.json( {...participant}, { status: 200 });
	}
	catch (error) {
		console.error(error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}