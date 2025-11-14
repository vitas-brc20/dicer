import { NextResponse } from 'next/server';
import { Api, JsonRpc, RpcError, JsSignatureProvider } from '@proton/js';

// --- Blockchain Connection ---
const rpc = new JsonRpc(['https://proton.greymass.com']);
const signatureProvider = new JsSignatureProvider([process.env.PAYOUT_PRIVATE_KEY]);
const api = new Api({ rpc, signatureProvider });

// Contract account name
const CONTRACT_ACCOUNT = 'inchgame';

export async function POST(request) {
    // 1. --- Security Check ---
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. --- Call drawresult action on the smart contract ---
        // This populates the payout_queue table
        const drawResultActions = [{
            account: CONTRACT_ACCOUNT,
            name: 'drawresult',
            authorization: [{
                actor: process.env.PAYOUT_ACCOUNT_NAME,
                permission: process.env.PAYOUT_ACCOUNT_PERMISSION,
            }],
            data: {},
        }];

        const drawResultTx = await api.transact({ actions: drawResultActions }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });

        console.log('drawresult action successfully called:', drawResultTx.transaction_id);

        return NextResponse.json({
            message: 'drawresult action successfully called.',
            drawResultTransactionId: drawResultTx.transaction_id,
        });

    } catch (error) {
        console.error('Error in winrolls process:', error);
        if (error instanceof RpcError) {
            return NextResponse.json({ error: 'RPC Error', details: error.json }, { status: 500 });
        }
        return NextResponse.json({ error: 'An unexpected error occurred during winrolls process.' }, { status: 500 });
    }
}
