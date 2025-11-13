import { JsonRpc } from '@proton/js';
import { Name } from '@greymass/eosio';

// TODO: Replace with the actual RPC endpoint for the network you are using (e.g., Proton Mainnet, Testnet)
const rpc = new JsonRpc(['https://proton.greymass.com']); 

// TODO: Replace with your contract account name
const CONTRACT_ACCOUNT = 'inchgame';

/**
 * Fetches the ticket balance for a given account from the smart contract.
 * @param actor - The user's account name.
 * @returns The number of tickets the user has, or 0 if not found.
 */
export const getTicketBalance = async (actor) => {
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

/**
 * Fetches the latest dice roll for a given account from the smart contract.
 * @param actor - The user's account name.
 * @returns The latest dice roll result (1-6), or null if not found.
 */
export const getLatestRoll = async (actor) => {
    try {
        const result = await rpc.get_table_rows({
            json: true,
            code: CONTRACT_ACCOUNT,
            scope: CONTRACT_ACCOUNT,
            table: 'rolls',
            lower_bound: new Name(actor).value.toString(), // Convert name to uint64_t string
            upper_bound: new Name(actor).value.toString(), // Convert name to uint64_t string
            index_position: '1', // Use the first secondary index (byplayer)
            key_type: 'i64', // Correct key type for uint64_t
            limit: 1,
            reverse: true, // Get the latest roll
        });

        if (result.rows.length > 0 && result.rows[0].player_account === actor) {
            return result.rows[0].roll_result;
        }

        return null;
    } catch (e) {
        console.error('Error fetching latest roll:', e);
        return null;
    }
};
