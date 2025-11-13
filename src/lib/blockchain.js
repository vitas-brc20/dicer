import { JsonRpc } from '@proton/js';
import { Name } from '@greymass/eosio';

const rpc = new JsonRpc(['https://proton.greymass.com']);
const CONTRACT_ACCOUNT = 'inchgame';

export const getTicketBalance = async (actor) => {
    try {
        console.log("getTicketBalance: Fetching balance for actor:", actor);
        const rpcParams = {
            json: true,
            code: CONTRACT_ACCOUNT,
            scope: CONTRACT_ACCOUNT,
            table: 'tickets',
            lower_bound: actor,
            upper_bound: actor,
            limit: 1,
            show_payer: false,
        };
        console.log("getTicketBalance: RPC params:", rpcParams);
        const result = await rpc.get_table_rows(rpcParams);
        console.log("getTicketBalance: RPC response:", result);

        if (result.rows.length > 0) {
            return result.rows[0].tickets;
        }
        return 0;
    } catch (e) {
        console.error("Error getting ticket balance:", e);
        return 0;
    }
};

export const getLatestRoll = async (actor) => {
    try {
        console.log("getLatestRoll: Fetching latest roll for actor:", actor);
        const actorName = new Name(actor);
        const rpcParams = {
            json: true,
            code: CONTRACT_ACCOUNT,
            scope: CONTRACT_ACCOUNT,
            table: 'rolls', // Temporary rolls table
            lower_bound: actorName.value.toString(),
            upper_bound: actorName.value.toString(),
            index_position: 'byplayer', // Use byplayer index
            key_type: 'i64',
            limit: 1,
            reverse: true, // Get most recent first
            show_payer: false,
        };
        console.log("getLatestRoll: RPC params:", rpcParams);
        const result = await rpc.get_table_rows(rpcParams);
        console.log("getLatestRoll: RPC response:", result);

        if (result.rows.length > 0) {
            return result.rows[0].roll_result;
        }
        return null;
    } catch (e) {
        console.error("Error getting latest roll:", e);
        return null;
    }
};
