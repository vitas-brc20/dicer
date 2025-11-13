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

    const fetchRollHistory = async (actor, date = '') => {
        setLoading(true);
        setError('');
        try {
            let lower_bound = '';
            let upper_bound = '';
            let index_position = '';
            let key_type = '';

            if (date) {
                // Convert date string (YYYY-MM-DD) to Unix timestamp for filtering by time
                const startOfDay = new Date(date + 'T00:00:00.000Z').getTime() / 1000;
                const endOfDay = new Date(date + 'T23:59:59.999Z').getTime() / 1000;
                
                lower_bound = startOfDay.toString();
                upper_bound = endOfDay.toString();
                index_position = 'bytime';
                key_type = 'i64';
            } else {
                // Query by player account
                const actorName = new Name(actor);
                lower_bound = actorName.value.toString();
                upper_bound = actorName.value.toString(); // For exact match
                index_position = 'byplayer';
                key_type = 'i64';
            }

            const result = await rpc.get_table_rows({
                json: true,
                code: CONTRACT_ACCOUNT,
                scope: CONTRACT_ACCOUNT,
                table: 'rollshist', // Query the historical rolls table
                lower_bound: lower_bound,
                upper_bound: upper_bound,
                index_position: index_position,
                key_type: key_type,
                limit: 100, // Fetch up to 100 rolls
                reverse: true, // Get most recent first
                show_payer: false,
            });

            // Client-side filter is no longer strictly necessary if bounds are set correctly,
            // but keeping it for robustness in case of scope issues or partial matches.
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
            fetchRollHistory(session.auth.actor, filterDate);
        }
    }, [session, filterDate]);

    const handleDateChange = (e) => {
        setFilterDate(e.target.value);
    };

    if (!session) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-dark-bg text-dark-text">
                <p className="text-xl text-pastel-blue-dark mb-6">Please connect your wallet to view roll history.</p>
                <Link href="/" passHref>
                    <button className="px-8 py-4 bg-pastel-green text-dark-text text-xl font-bold rounded-lg shadow-md hover:bg-accent-green transform hover:scale-105 transition-all duration-200 ease-in-out border-4 border-pastel-green hover:border-accent-green">
                        Connect Wallet
                    </button>
                </Link>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center p-12 bg-dark-bg text-dark-text">
            <h1 className="text-5xl font-bold mb-8 text-dark-text">Your Roll History</h1>
            
            <div className="mb-8 p-4 bg-dark-card rounded-lg shadow-lg flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 border-2 border-pastel-blue-dark">
                <label htmlFor="filterDate" className="text-lg text-pastel-blue-dark">Filter by Date:</label>
                <input 
                    type="date" 
                    id="filterDate" 
                    value={filterDate} 
                    onChange={handleDateChange}
                    className="p-3 rounded-lg bg-dark-bg text-dark-text border-2 border-pastel-purple focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none shadow-md"
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
                        <div key={roll.id} className="bg-dark-card p-5 rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center border-2 border-pastel-green hover:border-accent-green transition-colors duration-200">
                            <div>
                                <p className="text-xl">Roll: <span className="text-accent-green">{roll.roll_result}</span></p>
                                <p className="text-sm text-gray-400">Time: {new Date(roll.roll_time + 'Z').toLocaleString()}</p>
                            </div>
                            <p className="text-sm text-pastel-blue-dark mt-2 sm:mt-0">Roll ID: {roll.id}</p>
                        </div>
                    ))}
                </div>
            )}
            <Link href="/" passHref>
                <button className="mt-10 px-8 py-4 bg-pastel-blue-dark text-dark-text text-xl font-bold rounded-lg shadow-md hover:bg-accent-blue transition-all duration-200 ease-in-out border-4 border-pastel-blue-dark hover:border-accent-blue">
                    Back to Game
                </button>
            </Link>
        </main>
    );
}