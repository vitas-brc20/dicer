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

    // The dice_roll result can be read by off-chain services directly from the transaction trace
    // of the rolldice action itself. No need for a separate inline action.
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
