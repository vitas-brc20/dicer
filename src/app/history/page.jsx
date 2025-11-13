"use client";

import { useWallet } from "@/components/Wallet";
import { JsonRpc } from '@proton/js';
import { useEffect, useState } from "react";
import Link from "next/link"; // Import Link for navigation
import { Name } from '@greymass/eosio'; // Import Name for account name conversion

const rpc = new JsonRpc(['https://proton.greymass.com']);
const CONTRACT_ACCOUNT = 'inchgame';

export default function HistoryPage() {
    const { session } = useWallet();
    const [rollHistory, setRollHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterDate, setFilterDate] = useState(''); // For date filtering

    const fetchRollHistory = async (actor) => { // Fetch roll history for the given actor
        setLoading(true);
        setError('');
        try {
            // Always use the simplified query pattern for the logged-in player
            const rpcParams = {
                json: true,
                code: CONTRACT_ACCOUNT,
                scope: CONTRACT_ACCOUNT,
                table: 'rollshist', // Query the historical rolls table
                lower_bound: '', // As per user's working query
                upper_bound: actor, // As per user's working query
                index_position: 1, // As per user's working query (1 for byplayer)
                key_type: '', // As per user's working query
                limit: 100, // Fetch up to 100 rolls as requested
                reverse: true, // Get most recent first
                show_payer: false,
            };
            console.log("fetchRollHistory: RPC params:", rpcParams);
            const result = await rpc.get_table_rows(rpcParams);
            console.log("fetchRollHistory: RPC response:", result);

            // Client-side filter is still necessary as the RPC query might return more than just the actor's rolls
            const filteredRolls = result.rows.filter(roll => roll.player_account === actor);
            setRollHistory(filteredRolls);

        } catch (e) {
            console.error("Error fetching roll history:", e);
            setError(`Failed to fetch roll history: ${e.message || e}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.auth?.actor) {
            fetchRollHistory(session.auth.actor); // Removed filterDate from here
        }
    }, [session]); // Removed filterDate from dependency array

    const handleDateChange = (e) => {
        // Date filtering is no longer directly used for RPC, but can be kept for client-side display if needed
        setFilterDate(e.target.value);
    };

    if (!session) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-dark-bg text-dark-text">
                <p className="text-xl text-pastel-blue-dark mb-6">Please connect your wallet to view roll history.</p>
                <Link href="/" passHref>
                    <button className="px-8 py-4 bg-pastel-green text-dark-text text-xl font-bold rounded-xl shadow-xl hover:bg-accent-green transform hover:scale-105 transition-all duration-200 ease-in-out active:translate-y-0.5 border-solid border-4 border-pastel-green hover:border-accent-green">
                        Connect Wallet
                    </button>
                </Link>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-dark-bg text-dark-text">
            <div className="z-10 w-full max-w-md items-center justify-center text-center">
                <div className="text-center p-8 bg-dark-card rounded-xl shadow-2xl max-w-md mx-auto border-4 border-pastel-blue-dark">
                    <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-pastel-purple to-pastel-blue-dark text-transparent bg-clip-text">Your Roll History</h1>
                    
                    <div className="mb-8 p-4 bg-dark-card rounded-xl shadow-lg flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 border-2 border-pastel-blue-dark">
                        <label htmlFor="filterDate" className="text-lg text-pastel-blue-dark">Filter by Date:</label>
                        <input 
                            type="date" 
                            id="filterDate" 
                            value={filterDate} 
                            onChange={handleDateChange}
                            className="p-3 rounded-xl bg-dark-bg text-dark-text border-solid border-2 border-pastel-purple focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none shadow-xl"
                        />
                    </div>

                    {loading ? (
                        <p className="text-xl text-pastel-blue-dark">Loading roll history...</p>
                    ) : error ? (
                        <p className="text-xl text-pastel-pink">{error}</p>
                    ) : rollHistory.length === 0 ? (
                        <p className="text-xl text-pastel-yellow">No roll history found for <span className="font-bold text-accent-green">{session.auth.actor}</span> {filterDate ? `on ${filterDate}` : ''}.</p>
                    ) : (
                        <div className="w-full max-w-2xl space-y-4">
                            {rollHistory.map((roll) => (
                                <div key={roll.id} className="bg-pastel-blue-light text-dark-text p-5 rounded-xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center border-2 border-pastel-green hover:border-accent-green transition-colors duration-200">
                                    <div>
                                        <p className="text-xl">Roll: <span className="text-accent-green">{roll.roll_result}</span></p>
                                        <p className="text-sm text-gray-700">Time: {new Date(roll.roll_time + 'Z').toLocaleString()}</p>
                                    </div>
                                    <p className="text-sm text-pastel-blue-dark mt-2 sm:mt-0">Roll ID: {roll.id}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <Link href="/" passHref>
                        <button className="mt-10 px-8 py-4 bg-pastel-blue-dark text-dark-text text-xl font-bold rounded-xl shadow-xl hover:bg-accent-blue transition-all duration-200 ease-in-out active:translate-y-0.5 border-solid border-4 border-pastel-blue-dark hover:border-accent-blue">
                            Back to Game
                        </button>
                    </Link>
                </div>
            </div>
        </main>
    );
}