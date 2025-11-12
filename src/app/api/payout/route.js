import { NextResponse } from 'next/server';
import { Api, JsonRpc, RpcError, JsSignatureProvider } from '@proton/js';

// --- Blockchain Connection ---
const rpc = new JsonRpc(['https://proton.greymass.com']);
const signatureProvider = new JsSignatureProvider([process.env.PAYOUT_PRIVATE_KEY]);
const api = new Api({ rpc, signatureProvider });

export async function POST(request) {
    // 1. --- Security Check ---
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. --- Call drawresult action on the smart contract ---
        const actions = [{
            account: 'inchgame', // The contract account
            name: 'drawresult',
            authorization: [{
                actor: process.env.PAYOUT_ACCOUNT_NAME, // Should be 'inchgame'
                permission: process.env.PAYOUT_ACCOUNT_PERMISSION, // Should be 'active'
            }],
            data: {}, // drawresult takes no parameters
        }];

        const result = await api.transact({ actions }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });

        // 3. --- Return Success Response ---
        return NextResponse.json({
            message: 'drawresult action successfully called on contract!',
            transactionId: result.transaction_id,
        });

    } catch (error) {
        console.error('Error calling drawresult action:', error);
        if (error instanceof RpcError) {
            return NextResponse.json({ error: 'RPC Error', details: error.json }, { status: 500 });
        }
        return NextResponse.json({ error: 'An unexpected error occurred when calling drawresult.' }, { status: 500 });
    }
}