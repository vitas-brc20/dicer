import { NextResponse } from 'next/server';

export async function GET(request) {
    // KST is UTC+9
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstTime = new Date(now.getTime() + kstOffset);

    const kstHour = kstTime.getUTCHours();

    // Rolling is allowed from 00:00 to 22:59 KST.
    // It is disabled during the 23:00 hour.
    if (kstHour === 23) {
        return NextResponse.json(
            { error: 'Game is closed for tallying between 23:00 and 23:59 KST.' },
            { status: 400 }
        );
    }

    return NextResponse.json({ ok: true, message: 'It is a valid time to roll.' });
}
