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
};
