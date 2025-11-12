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
};
