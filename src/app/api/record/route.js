import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        const { actor, roll } = await request.json();

        if (!actor || !roll) {
            return NextResponse.json({ error: 'Actor and roll are required.' }, { status: 400 });
        }
        if (typeof roll !== 'number' || roll < 1 || roll > 6) {
            return NextResponse.json({ error: 'Invalid roll value.' }, { status: 400 });
        }

        const { error } = await supabase
            .from('rolls')
            .insert([
                { actor, roll },
            ]);

        if (error) {
            console.error('Supabase insert error:', error);
            throw error;
        }

        return NextResponse.json({ success: true, message: 'Roll recorded.' });

    } catch (error) {
        console.error('Error recording roll:', error);
        return NextResponse.json({ error: 'Failed to record roll.' }, { status: 500 });
    }
}
