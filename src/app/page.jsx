"use client";

import { useWallet } from "@/components/Wallet";
import { getTicketBalance, getLatestRoll } from "@/lib/blockchain";
import { useEffect, useState } from "react";
import Link from "next/link"; // Import Link for navigation

const Dice = ({ result, rolling }) => {
    if (rolling) {
        return (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg shadow-lg flex flex-col items-center justify-center min-h-[150px]">
                <p className="text-xl text-gray-300">Rolling...</p>
                <p className="text-7xl font-bold text-blue-400 animate-bounce">🎲</p>
            </div>
        );
    }
    if (result === null) return null;
    return (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg shadow-lg flex flex-col items-center justify-center min-h-[150px]">
            <p className="text-xl text-gray-300">You rolled:</p>
            <p className="text-7xl font-bold text-green-400">{result}</p>
        </div>
    )
}

const GameInterface = () => {
    const { session, logout, transact } = useWallet();
    const [ticketBalance, setTicketBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('');
    const [diceResult, setDiceResult] = useState(null);
    const [isRolling, setIsRolling] = useState(false);

    const refreshBalance = async () => {
        console.log("refreshBalance called. session.auth.actor:", session?.auth?.actor);
        if (!session?.auth?.actor) {
            console.log("refreshBalance: No session actor, returning.");
            return;
        }
        setLoading(true);
        setStatus('Refreshing balance...');
        try {
            const balance = await getTicketBalance(session.auth.actor);
            console.log("refreshBalance: Fetched balance:", balance);
            setTicketBalance(balance);
            setStatus('');
        } catch (e) {
            console.error("refreshBalance: Failed to refresh balance:", e);
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
                data: { from: session.auth.actor, to: 'inchgame', quantity: '11.0000 XPR', memo: 'buy 11dice ticket' },
            }]);
            setStatus('Purchase successful! Refreshing balance...');
            console.log("handleBuyTicket: Calling refreshBalance after purchase.");
            await refreshBalance();
            console.log("handleBuyTicket: refreshBalance completed after purchase.");
        } catch (e) {
            if (e instanceof Error) {
                setStatus(`Purchase failed: ${e.message}`);
            }
            else {
                setStatus(`Purchase failed: An unknown error occurred.`);
            }
            setLoading(false);
        }
    };

    const handleRollDice = async () => {
        if (!session) return;
        setLoading(true);
        setDiceResult(null);
        setIsRolling(true);
        setStatus('Checking game time...');

        try {
            const timeCheck = await fetch('/api/roll');
            if (!timeCheck.ok) {
                const { error } = await timeCheck.json();
                throw new Error(error);
            }

            setStatus('Waiting for your signature...');
            const result = await transact([{
                account: 'inchgame',
                name: 'rolldice',
                authorization: [{ actor: session.auth.actor, permission: session.auth.permission }],
                data: { account: session.auth.actor },
            }]);

            setStatus('Roll successful! Fetching result...');
            const roll = await getLatestRoll(session.auth.actor);
            if (roll === null) {
                throw new Error('Could not retrieve latest roll from contract.');
            }
            setDiceResult(roll);
            setStatus('Roll recorded! Refreshing balance...');

            await refreshBalance();

        } catch (e) {
            if (e instanceof Error) {
                setStatus(`Roll failed: ${e.message}`);
            }
            else {
                setStatus(`Roll failed: An unknown error occurred.`);
            }
            setStatus('');
        } finally {
            setLoading(false);
            setIsRolling(false);
        }
    };

    const renderGameControls = () => {
        if (loading && !status) {
            return <p className="text-lg text-gray-300">Loading ticket balance...</p>;
        }
        if (status) {
            return <p className="text-lg text-yellow-400">{status}</p>;
        }

        return (
            <div className="w-full">
                <p className="text-xl mb-4">Your tickets: <span className="font-bold text-purple-400">{ticketBalance}</span></p>
                <div className="flex flex-col space-y-4">
                    <button 
                        onClick={handleBuyTicket}
                        className="w-full px-6 py-3 bg-purple-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-all duration-200 ease-in-out disabled:bg-gray-500 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        Buy Ticket (11 XPR)
                    </button>
                    {ticketBalance > 0 && (
                        <button 
                            onClick={handleRollDice}
                            className="w-full px-8 py-4 bg-green-600 text-white text-xl font-bold rounded-lg shadow-md hover:bg-green-700 transform hover:scale-105 transition-all duration-200 ease-in-out disabled:bg-gray-500 disabled:cursor-not-allowed"
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
        <div className="text-center p-6 bg-gray-800 rounded-xl shadow-2xl max-w-md mx-auto">
            <p className="mb-4 text-lg text-gray-300">Welcome, <span className="font-bold text-blue-400">{session?.auth?.actor}</span>!</p>
            <div className="my-8 p-6 bg-gray-900 rounded-lg shadow-inner min-h-[150px] flex items-center justify-center">
                {renderGameControls()}
            </div>
            <Dice result={diceResult} rolling={isRolling} />
            <div className="mt-8 flex justify-center space-x-4">
                <button
                    onClick={logout}
                    className="px-6 py-3 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition-all duration-200 ease-in-out"
                >
                    Logout
                </button>
                <Link href="/history" passHref>
                    <button
                        className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-all duration-200 ease-in-out"
                    >
                        View Roll History
                    </button>
                </Link>
            </div>
        </div>
    );
};

export default function Home() {
    const { session, login } = useWallet();

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-gray-900 text-white">
            <div className="z-10 w-full max-w-md items-center justify-center text-center">
                <h1 className="text-6xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-500 text-transparent bg-clip-text">11dice</h1>
                <p className="text-gray-400 mb-10 text-xl">The daily XPR Network dice game.</p>
                
                {session ? (
                    <GameInterface />
                ) : (
                    <button
                        onClick={login}
                        className="px-8 py-4 bg-blue-600 text-white text-xl font-bold rounded-lg shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 ease-in-out"
                    >
                        Connect Wallet to Play
                    </button>
                )}
            </div>
        </main>
    );
}