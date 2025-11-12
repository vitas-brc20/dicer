#pragma once

#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <eosio/system.hpp>
#include <eosio/time.hpp>

using namespace eosio;

// [[eosio::contract("11dice")]]
class [[eosio::contract("11dice")]] onedice : public contract {
public:
    using contract::contract;

    /**
     * @brief Action to roll the dice.
     * @param account - The account rolling the dice.
     */
    [[eosio::action]]
    void rolldice(name account);

    /**
     * @brief Action to draw the winning number and distribute rewards.
     * This action can only be called by the contract account itself.
     */
    [[eosio::action]]
    void drawresult();

    /**
     * @brief Action to process a specific payout entry from the payout queue.
     * This action can only be called by the contract account itself (or a designated payout account).
     * @param payout_id - The ID of the payout entry to process.
     */
    [[eosio::action]]
    void processpayout(uint64_t payout_id);

    /**
     * @brief Notification handler for token transfers.
     * Used to detect payments and issue tickets.
     */
    [[eosio::on_notify("eosio.token::transfer")]]
    void on_transfer(name from, name to, asset quantity, std::string memo);

private:
    // Scoped by contract account
    TABLE ticket_counts {
        name account;
        uint64_t tickets;

        uint64_t primary_key() const { return account.value; }
    };
    typedef multi_index<"tickets"_n, ticket_counts> tickets_table;

    // New table to store dice roll entries
    TABLE roll_entry {
        uint64_t        id; // Primary key for the roll entry
        name            player_account;
        uint8_t         roll_result;
        time_point_sec  roll_time;

        uint64_t primary_key() const { return id; }
        uint64_t by_player() const { return player_account.value; }
        uint64_t by_time() const { return roll_time.sec_since_epoch(); }
    };
    typedef multi_index<"rolls"_n, roll_entry,
        indexed_by<"byplayer"_n, const_mem_fun<roll_entry, uint64_t, &roll_entry::by_player>>,
        indexed_by<"bytime"_n, const_mem_fun<roll_entry, uint64_t, &roll_entry::by_time>>
    > roll_entries_table;

    // New table to store payout entries
    TABLE payout_entry {
        uint64_t        id; // Primary key for the payout entry
        name            winner_account;
        asset           payout_amount;
        time_point_sec  created_time;
        bool            processed = false; // Flag to indicate if payout has been processed

        uint64_t primary_key() const { return id; }
        uint64_t by_winner() const { return winner_account.value; }
        uint64_t by_created() const { return created_time.sec_since_epoch(); }
    };
    typedef multi_index<"payouts"_n, payout_entry,
        indexed_by<"bywinner"_n, const_mem_fun<payout_entry, uint64_t, &payout_entry::by_winner>>,
        indexed_by<"bycreated"_n, const_mem_fun<payout_entry, uint64_t, &payout_entry::by_created>>
    > payout_queue_table;
};
