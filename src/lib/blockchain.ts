import { RPC } from '@proton/js';

// TODO: Replace with the actual RPC endpoint for the network you are using (e.g., Proton Mainnet, Testnet)
const rpc = new RPC(['https://proton.greymass.com']); 

// TODO: Replace with your contract account name
const CONTRACT_ACCOUNT = '11dice';

/**
 * Fetches the ticket balance for a given account from the smart contract.
 * @param actor - The user's account name.
 * @returns The number of tickets the user has, or 0 if not found.
 */
export const getTicketBalance = async (actor: string): Promise<number> => {
    try {
        const result = await rpc.get_table_rows({
            json: true,
            code: CONTRACT_ACCOUNT,
            scope: CONTRACT_ACCOUNT,
            table: 'tickets',
            lower_bound: actor,
            upper_bound: actor,
            limit: 1,
        });

        if (result.rows.length > 0 && result.rows[0].account === actor) {
            return result.rows[0].tickets;
        }

        return 0;
    } catch (e) {
        console.error('Error fetching ticket balance:', e);
        return 0;
    }
};
