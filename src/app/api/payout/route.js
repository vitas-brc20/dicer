import { NextResponse } from 'next/server';
import { Api, JsonRpc, RpcError, JsSignatureProvider } from '@proton/js';

// --- Blockchain Connection ---
const rpc = new JsonRpc(['https://proton.greymass.com']);
const signatureProvider = new JsSignatureProvider([process.env.PAYOUT_PRIVATE_KEY]);
const api = new Api({ rpc, signatureProvider });

// Contract account name
const CONTRACT_ACCOUNT = 'inchgame';
const TOKEN_CONTRACT = 'eosio.token';

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

        // Add a small delay to ensure drawresult transaction is processed
        // This is important because we immediately try to read the table after.
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 3. --- Fetch pending payouts from payout_queue table ---
        const payoutQueueResult = await rpc.get_table_rows({
            json: true,
            code: CONTRACT_ACCOUNT,
            scope: CONTRACT_ACCOUNT,
            table: 'payouts', // 'payouts' is the table name in the contract
            limit: 100, // Fetch up to 100 pending payouts at a time
            reverse: false,
            show_payer: false,
        });

        const pendingPayouts = payoutQueueResult.rows.filter(payout => !payout.processed);

        if (pendingPayouts.length === 0) {
            return NextResponse.json({
                message: 'drawresult action called, but no pending payouts to process.',
                drawResultTransactionId: drawResultTx.transaction_id,
            });
        }

        console.log(`Found ${pendingPayouts.length} pending payouts.`);

        // 4. --- Process each pending payout ---
        const processedPayouts = [];
        for (const payout of pendingPayouts) {
            try {
                const transferActions = [{
                    account: TOKEN_CONTRACT,
                    name: 'transfer',
                    authorization: [{
                        actor: process.env.PAYOUT_ACCOUNT_NAME,
                        permission: process.env.PAYOUT_ACCOUNT_PERMISSION,
                    }],
                    data: {
                        from: process.env.PAYOUT_ACCOUNT_NAME,
                        to: payout.winner_account,
                        quantity: payout.payout_amount,
                        memo: `11dice game payout for roll ID ${payout.id}`,
                    },
                }, {
                    account: CONTRACT_ACCOUNT,
                    name: 'procpay',
                    authorization: [{
                        actor: process.env.PAYOUT_ACCOUNT_NAME,
                        permission: process.env.PAYOUT_ACCOUNT_PERMISSION,
                    }],
                    data: {
                        payout_id: payout.id,
                    },
                }];

                const payoutTx = await api.transact({ actions: transferActions }, {
                    blocksBehind: 3,
                    expireSeconds: 30,
                });

                processedPayouts.push({
                    payoutId: payout.id,
                    winner: payout.winner_account,
                    amount: payout.payout_amount,
                    transactionId: payoutTx.transaction_id,
                });
                console.log(`Processed payout ${payout.id} for ${payout.winner_account}. Tx ID: ${payoutTx.transaction_id}`);

            } catch (payoutError) {
                console.error(`Error processing payout ${payout.id} for ${payout.winner_account}:`, payoutError);
                // Continue to next payout even if one fails
            }
        }

        // 5. --- Return Success Response ---
        return NextResponse.json({
            message: 'Payout process completed.',
            drawResultTransactionId: drawResultTx.transaction_id,
            processedPayouts: processedPayouts,
            unprocessedPayoutsCount: pendingPayouts.length - processedPayouts.length,
        });

    } catch (error) {
        console.error('Error in payout process:', error);
        if (error instanceof RpcError) {
            return NextResponse.json({ error: 'RPC Error', details: error.json }, { status: 500 });
        }
        return NextResponse.json({ error: 'An unexpected error occurred during payout process.' }, { status: 500 });
    }
}