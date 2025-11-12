#include "11dice.hpp"

// Constants for the game
const symbol XPR_SYMBOL = symbol("XPR", 4);
const int64_t TICKET_PRICE = 110000; // 11.0000 XPR

void onedice::rolldice(name account) {
    require_auth(account);

    tickets_table tickets(get_self(), get_self().value);
    auto iterator = tickets.find(account.value);

    check(iterator != tickets.end(), "No tickets found for this account. Please buy a ticket first.");
    check(iterator->tickets > 0, "No tickets remaining.");

    // Decrement ticket count
    tickets.modify(iterator, get_self(), [&](auto& row) {
        row.tickets--;
    });

    // Simple pseudo-random number generation based on block info
    // For a real-world application, a more robust oracle-based solution would be better.
    uint8_t dice_roll = (static_cast<uint8_t>(current_time_point().elapsed.count() % 6)) + 1;

    // Log the result by calling the logroll action
            action(
                permission_level{get_self(), "eosio.code"_n},
                get_self(),
                "logroll"_n,
                std::make_tuple(account, dice_roll)
            ).send();}

void onedice::logroll(name account, uint8_t roll) {
    // This action requires the contract's own permission
    require_auth(get_self());
    // This action intentionally does nothing but create a trace in the transaction
    // for off-chain services to easily read the dice roll result.
}

void onedice::on_transfer(name from, name to, asset quantity, std::string memo) {
    // If the transfer is not to this contract, ignore it
    if (to != get_self()) {
        return;
    }
    // We only care about transfers from users, not from the contract itself
    if (from == get_self()) {
        return;
    }

    // Check for valid payment
    check(quantity.symbol == XPR_SYMBOL, "Only XPR tokens are accepted.");
    check(quantity.is_valid(), "Invalid token quantity.");
    check(quantity.amount == TICKET_PRICE, "Payment must be exactly 11.0000 XPR.");

    // Payment is valid, issue a ticket
    tickets_table tickets(get_self(), get_self().value);
    auto iterator = tickets.find(from.value);

    if (iterator == tickets.end()) {
        // First time buyer, create a new entry
        tickets.emplace(get_self(), [&](auto& row) {
            row.account = from;
            row.tickets = 1;
        });
    } else {
        // Existing player, increment their ticket count
        tickets.modify(iterator, get_self(), [&](auto& row) {
            row.tickets++;
        });
    }
}
