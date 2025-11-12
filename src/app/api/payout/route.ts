import { NextResponse } from 'next/server';
import { Api, JsonRpc, RpcError, JsSignatureProvider } from '@proton/js';
import { supabase } from '@/lib/supabase';

// Helper function to get the start and end of the current day in KST
const getKSTDayRange = () => {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    
    // Start of the day in KST
    const kstDate = new Date(now.getTime() + kstOffset);
    const year = kstDate.getUTCFullYear();
    const month = kstDate.getUTCMonth();
    const day = kstDate.getUTCDate();
    
    const startOfDayUTC = new Date(Date.UTC(year, month, day, 0, 0, 0));
    const startOfDayKST = new Date(startOfDayUTC.getTime() - kstOffset);

    // End of the day in KST
    const endOfDayKST = new Date(startOfDayKST.getTime() + 24 * 60 * 60 * 1000 - 1);

    return { start: startOfDayKST.toISOString(), end: endOfDayKST.toISOString(), today: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
};


// --- Blockchain Connection ---
const rpc = new JsonRpc(['https://proton.greymass.com']);
const signatureProvider = new JsSignatureProvider([process.env.PAYOUT_PRIVATE_KEY!]);
const api = new Api({ rpc, signatureProvider });

export async function POST(request: Request) {
    // 1. --- Security Check ---
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. --- Get Today's Rolls from Supabase ---
        const { start, end, today } = getKSTDayRange();

        const { data: rolls, error: dbError } = await supabase
            .from('rolls')
            .select('actor, roll')
            .gte('created_at', start)
            .lte('created_at', end);

        if (dbError) {
            console.error('Supabase select error:', dbError);
            throw dbError;
        }

        if (!rolls || rolls.length === 0) {
            return NextResponse.json({ message: 'No participants today.' });
        }

        // 3. --- Determine Winner ---
        const winningRoll = Math.floor(Math.random() * 6) + 1;
        const winners = rolls.filter((r: any) => r.roll === winningRoll);

        if (winners.length === 0) {
            return NextResponse.json({ message: `Winning number was ${winningRoll}, but there were no winners.` });
        }

        // 4. --- Calculate Payout ---
        const totalParticipants = rolls.length;
        const prizePool = (totalParticipants * 11 * 0.9); // 90% of the total pot
        const individualPayout = prizePool / winners.length;
        
        // Format to 4 decimal places for XPR
        const payoutAmount = individualPayout.toFixed(4);
        const payoutAsset = `${payoutAmount} XPR`;

        // 5. --- Construct and Send Payout Transaction ---
        const actions = winners.map((winner: any) => ({
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{
                actor: process.env.PAYOUT_ACCOUNT_NAME!,
                permission: process.env.PAYOUT_ACCOUNT_PERMISSION!,
            }],
            data: {
                from: process.env.PAYOUT_ACCOUNT_NAME!,
                to: winner.actor,
                quantity: payoutAsset,
                memo: `Congratulations! You won the 11dice game for ${today}.`,
            },
        }));

        const result = await api.transact({ actions }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });

        // 6. --- Return Success Response ---
        return NextResponse.json({
            message: 'Payout successful!',
            winningRoll,
            totalParticipants,
            winnerCount: winners.length,
            prizePool: `${prizePool.toFixed(4)} XPR`,
            individualPayout: payoutAsset,
            transactionId: (result as any).transaction_id,
        });

    } catch (error) {
        console.error('Payout failed:', error);
        if (error instanceof RpcError) {
            return NextResponse.json({ error: 'RPC Error', details: error.json }, { status: 500 });
        }
        return NextResponse.json({ error: 'An unexpected error occurred during payout.' }, { status: 500 });
    }
}
