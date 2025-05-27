import { NextResponse } from "next/server";
import { getTeamsOrderedById } from "@/actions/team";
export async function GET(req) {
    try {
        const teams = await getTeamsOrderedById();
        return NextResponse.json(teams, { status: 200 });
    }
    catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
