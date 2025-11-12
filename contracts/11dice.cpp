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
    print("DICE_ROLL:", dice_roll); // Add this line

    // Record the roll in the new roll_entries_table
    roll_entries_table rolls(get_self(), get_self().value);
    rolls.emplace(account, [&](auto& row) {
        row.id = rolls.available_primary_key();
        row.player_account = account;
        row.roll_result = dice_roll;
        row.roll_time = current_time_point();
    });
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
