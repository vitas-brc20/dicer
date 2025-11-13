import { useWallet } from "@/components/Wallet";
import { getTicketBalance, getLatestRoll } from "@/lib/blockchain";
import { useEffect, useState } from "react";
import Link from "next/link"; // Import Link for navigation

const Dice = ({ result, rolling }) => {
    if (rolling) {
        return (
            <div className="mt-6 p-6 bg-dark-card rounded-xl shadow-lg flex flex-col items-center justify-center min-h-[180px] border-2 border-pastel-blue-dark animate-pulse">
                <p className="text-xl text-pastel-blue-dark font-pixel">Rolling...</p>
                <p className="text-8xl font-pixel text-accent-green animate-bounce">🎲</p>
            </div>
        );
    }
    if (result === null) return null;
    return (
        <div className="mt-6 p-6 bg-dark-card rounded-xl shadow-lg flex flex-col items-center justify-center min-h-[180px] border-2 border-pastel-green">
            <p className="text-xl text-pastel-green font-pixel">You rolled:</p>
            <p className="text-8xl font-pixel text-accent-green">{result}</p>
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
        }
        finally {
            setLoading(false);
            setIsRolling(false);
        }
    };

    const renderGameControls = () => {
        if (loading && !status) {
            return <p className="text-lg text-pastel-blue-dark font-pixel">Loading ticket balance...</p>;
        }
        if (status) {
            return <p className="text-lg text-pastel-yellow font-pixel">{status}</p>;
        }

        return (
            <div className="w-full">
                <p className="text-xl mb-4 text-pastel-green font-pixel">Your tickets: <span className="font-bold text-accent-green">{ticketBalance}</span></p>
                <div className="flex flex-col space-y-4">
                    <button 
                        onClick={handleBuyTicket}
                        className="w-full px-6 py-3 bg-pastel-purple text-dark-text text-lg font-pixel rounded-xl shadow-md hover:bg-pastel-pink transition-all duration-200 ease-in-out disabled:bg-gray-500 disabled:cursor-not-allowed border-2 border-pastel-purple hover:border-pastel-pink"
                        disabled={loading}
                    >
                        Buy Ticket (11 XPR)
                    </button>
                    {ticketBalance > 0 && (
                        <button 
                            onClick={handleRollDice}
                            className="w-full px-8 py-4 bg-pastel-green text-dark-text text-xl font-pixel rounded-xl shadow-md hover:bg-accent-green transform hover:scale-105 transition-all duration-200 ease-in-out disabled:bg-gray-500 disabled:cursor-not-allowed border-2 border-pastel-green hover:border-accent-green"
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
        <div className="text-center p-8 bg-dark-card rounded-xl shadow-2xl max-w-md mx-auto border-4 border-pastel-blue-dark">
            <p className="mb-4 text-lg text-pastel-blue-dark font-pixel">Welcome, <span className="font-bold text-accent-green">{session?.auth?.actor}</span>!</p>
            <div className="my-8 p-6 bg-dark-bg rounded-xl shadow-inner min-h-[150px] flex items-center justify-center border-2 border-pastel-purple">
                {renderGameControls()}
            </div>
            <Dice result={diceResult} rolling={isRolling} />
            <div className="mt-8 flex flex-col space-y-4">
                <button
                    onClick={logout}
                    className="px-6 py-3 bg-pastel-pink text-dark-text rounded-xl shadow-md hover:bg-red-500 transition-all duration-200 ease-in-out border-2 border-pastel-pink hover:border-red-500 font-pixel"
                >
                    Logout
                </button>
                <Link href="/history" passHref>
                    <button
                        className="px-6 py-3 bg-pastel-blue-dark text-dark-text rounded-xl shadow-md hover:bg-accent-blue transition-all duration-200 ease-in-out border-2 border-pastel-blue-dark hover:border-accent-blue font-pixel"
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
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-dark-bg text-white">
            <div className="z-10 w-full max-w-md items-center justify-center text-center">
                <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-pastel-purple to-pastel-blue-dark text-transparent bg-clip-text font-pixel leading-tight">11dice</h1>
                <p className="text-pastel-green mb-10 text-xl font-pixel">The daily XPR Network dice game.</p>
                
                {session ? (
                    <GameInterface />
                ) : (
                    <button
                        onClick={login}
                        className="px-8 py-4 bg-pastel-green text-dark-text text-xl font-bold rounded-xl shadow-lg hover:bg-accent-green transform hover:scale-105 transition-all duration-200 ease-in-out border-4 border-pastel-green hover:border-accent-green font-pixel"
                    >
                        Connect Wallet to Play
                    </button>
                )}
            </div>
        </main>
    );
}