"use client";

import { useWallet } from "@/components/Wallet";
import { getTicketBalance } from "@/lib/blockchain";
import { useEffect, useState } from "react";

const Dice = ({ result }) => {
    if (!result) return null;
    return (
        <div className="mt-4 p-4 border-2 border-dashed border-green-400 rounded-lg">
            <p className="text-xl">You rolled:</p>
            <p className="text-6xl font-bold text-green-400">{result}</p>
        </div>
    )
}

// A component to show the main game UI
const GameInterface = () => {
    const { session, logout, transact } = useWallet();
    const [ticketBalance, setTicketBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('');
    const [diceResult, setDiceResult] = useState(null);

    const refreshBalance = async () => {
        if (!session?.auth?.actor) return;
        setLoading(true);
        setStatus('Refreshing balance...');
        try {
            const balance = await getTicketBalance(session.auth.actor);
            setTicketBalance(balance);
            setStatus('');
        } catch (e) {
            setStatus('Failed to refresh balance.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.auth?.actor) {
            refreshBalance();
        }
    }, [session]);

    const handleBuyTicket = async () => {
        if (!session) return;
        setLoading(true);
        setDiceResult(null);
        setStatus('Processing payment...');
        try {
            await transact([{
                account: 'eosio.token',
                name: 'transfer',
                authorization: [{ actor: session.auth.actor, permission: session.auth.permission }],
                data: { from: session.auth.actor, to: '11dice', quantity: '11.0000 XPR', memo: 'buy 11dice ticket' },
            }]);
            setStatus('Purchase successful! Refreshing balance...');
            await refreshBalance();
        } catch (e) {
            if (e instanceof Error) {
                setStatus(`Purchase failed: ${e.message}`);
            } else {
                setStatus(`Purchase failed: An unknown error occurred.`);
            }
            setLoading(false);
        }
    };

    const handleRollDice = async () => {
        if (!session) return;
        setLoading(true);
        setDiceResult(null);
        setStatus('Checking game time...');

        try {
            // 1. Check if it's a valid time to roll
            const timeCheck = await fetch('/api/roll');
            if (!timeCheck.ok) {
                const { error } = await timeCheck.json();
                throw new Error(error);
            }

            // 2. If time is valid, transact
            setStatus('Waiting for your signature...');
            const result = await transact([{
                account: '11dice', // The contract account
                name: 'rolldice',
                authorization: [{ actor: session.auth.actor, permission: session.auth.permission }],
                data: { account: session.auth.actor },
            }]);

            // 3. Parse result and show dice roll
            const logRollTrace = result.processed.action_traces.find(trace => trace.act.name === 'logroll');
            if (!logRollTrace) {
                throw new Error('Could not find roll result in transaction.');
            }
            const roll = logRollTrace.act.data.roll;
            setDiceResult(roll);
            setStatus('Roll successful! Recording result...');

            // 4. Record the roll in our DB
            const recordResult = await fetch('/api/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actor: session.auth.actor, roll: roll }),
            });

            if (!recordResult.ok) {
                const { error } = await recordResult.json();
                throw new Error(`Failed to record result: ${error}`);
            }
            setStatus('Roll recorded! Refreshing balance...');

            // 5. Refresh balance
            await refreshBalance();

        } catch (e) {
            if (e instanceof Error) {
                setStatus(`Roll failed: ${e.message}`);
            } else {
                setStatus(`Roll failed: An unknown error occurred.`);
            }
            setLoading(false);
        }
    };

    const renderGameControls = () => {
        if (loading && !status) {
            return <p className="text-lg">Loading ticket balance...</p>;
        }
        if (status) {
            return <p className="text-lg text-yellow-400">{status}</p>;
        }

        return (
            <div>
                <p className="text-lg">Your tickets: <span className="font-bold text-yellow-400">{ticketBalance}</span></p>
                <div className="mt-6 flex flex-col space-y-4"> {/* Added flex and space-y for layout */}
                    <button 
                        onClick={handleBuyTicket}
                        className="px-6 py-3 bg-purple-600 text-white text-lg rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-500"
                        disabled={loading}
                    >
                        Buy Ticket (11 XPR)
                    </button>
                    {ticketBalance > 0 && ( // Conditionally render Roll Dice button
                        <button 
                            onClick={handleRollDice}
                            className="px-8 py-4 bg-green-600 text-white text-xl font-semibold rounded-lg hover:bg-green-700 transition-transform hover:scale-105 disabled:bg-gray-500"
                            disabled={loading}
                        >
                            Roll Dice
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="text-center">
            <p className="mb-4">Welcome, <span className="font-bold">{session?.auth?.actor}</span>!</p>
            <div className="my-8 p-6 border rounded-lg border-gray-600 min-h-[150px] flex items-center justify-center">
                {renderGameControls()}
            </div>
            <Dice result={diceResult} />
            <button
                onClick={logout}
                className="mt-8 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
                Logout
            </button>
        </div>
    );
};

// The main page component
export default function Home() {
    const { session, login } = useWallet();

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-gray-900 text-white">
            <div className="z-10 w-full max-w-md items-center justify-center text-center">
                <h1 className="text-6xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-500 text-transparent bg-clip-text">11dice</h1>
                <p className="text-gray-400 mb-10">The daily XPR dice game.</p>
                
                {session ? (
                    <GameInterface />
                ) : (
                    <button
                        onClick={login}
                        className="px-8 py-4 bg-blue-600 text-white text-xl font-semibold rounded-lg hover:bg-blue-700 transition-transform hover:scale-105"
                    >
                        Connect Wallet to Play
                    </button>
                )}
            </div>
        </main>
    );
}