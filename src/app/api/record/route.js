import { NextResponse } from 'next/server';

export async function POST(request) {
    return NextResponse.json({ error: 'This endpoint is deprecated. Rolls are now recorded on-chain.' }, { status: 410 });
}