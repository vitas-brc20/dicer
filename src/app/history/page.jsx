"use client";

import { useWallet } from "@/components/Wallet";
import { JsonRpc } from '@proton/js';
import { useEffect, useState } from "react";

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

            if (date) {
                // Convert date string (YYYY-MM-DD) to Unix timestamp for filtering by time
                const startOfDay = new Date(date + 'T00:00:00.000Z').getTime() / 1000;
                const endOfDay = new Date(date + 'T23:59:59.999Z').getTime() / 1000;
                
                lower_bound = startOfDay.toString();
                upper_bound = endOfDay.toString();
            }

            const result = await rpc.get_table_rows({
                json: true,
                code: CONTRACT_ACCOUNT,
                scope: CONTRACT_ACCOUNT,
                table: 'rollshist', // Query the historical rolls table
                lower_bound: date ? lower_bound : undefined, // Filter by date if provided
                upper_bound: date ? upper_bound : undefined,
                index_position: date ? 'bytime' : 'byplayer', // Use bytime index for date filter, byplayer otherwise
                key_type: date ? 'i64' : 'i64', // Both bytime and byplayer use i64
                limit: 100, // Fetch up to 100 rolls
                reverse: true, // Get most recent first
                show_payer: false,
            });

            // Filter by actor on the client side if not filtering by date
            // Or if filtering by date, ensure the actor matches
            const filteredRolls = result.rows.filter(roll => roll.player_account === actor);
            setRollHistory(filteredRolls);

        } catch (e) {
            console.error("Error fetching roll history:", e);
            setError('Failed to fetch roll history.');
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
            <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-gray-900 text-white">
                <p className="text-xl">Please connect your wallet to view roll history.</p>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center p-12 bg-gray-900 text-white">
            <h1 className="text-4xl font-bold mb-8">Your Roll History</h1>
            
            <div className="mb-6">
                <label htmlFor="filterDate" className="mr-2 text-lg">Filter by Date:</label>
                <input 
                    type="date" 
                    id="filterDate" 
                    value={filterDate} 
                    onChange={handleDateChange}
                    className="p-2 rounded-md bg-gray-800 text-white border border-gray-700"
                />
            </div>

            {loading ? (
                <p className="text-xl">Loading roll history...</p>
            ) : error ? (
                <p className="text-xl text-red-500">{error}</p>
            ) : rollHistory.length === 0 ? (
                <p className="text-xl">No roll history found for {session.auth.actor} {filterDate ? `on ${filterDate}` : ''}.</p>
            ) : (
                <div className="w-full max-w-2xl">
                    {rollHistory.map((roll) => (
                        <div key={roll.id} className="bg-gray-800 p-4 rounded-lg mb-4 flex justify-between items-center">
                            <div>
                                <p className="text-lg font-semibold">Roll: <span className="text-yellow-400">{roll.roll_result}</span></p>
                                <p className="text-sm text-gray-400">Time: {new Date(roll.roll_time + 'Z').toLocaleString()}</p>
                            </div>
                            <p className="text-sm text-gray-500">ID: {roll.id}</p>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}