#include "11dice.hpp"
#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <eosio/system.hpp>
#include <eosio/crypto.hpp> // Required for sha256

using namespace eosio;

// Constants for the game
const symbol XPR_SYMBOL = symbol("XPR", 4);
const int64_t TICKET_PRICE = 110000; // 11.0000 XPR

// Helper function for more robust pseudo-random number generation
uint8_t generate_random_number(uint64_t seed) {
    checksum256 hash = sha256(reinterpret_cast<const char*>(&seed), sizeof(seed));
    uint64_t random_val = *reinterpret_cast<const uint64_t*>(hash.data());
    return (static_cast<uint8_t>(random_val % 6)) + 1;
}

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

    // Use the helper function for more robust pseudo-random number generation
    uint8_t dice_roll = generate_random_number(current_time_point().elapsed.count());
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

void onedice::drawresult() {
    require_auth(get_self()); // Only the contract itself can call this action

    // Generate a winning roll using a more robust pseudo-random number generation
    uint64_t seed = current_time_point().elapsed.count() + current_block_time().to_time_point().elapsed.count();
    uint8_t winning_roll = generate_random_number(seed);
    print("WINNING_ROLL:", winning_roll);

    // Calculate today's date range (UTC)
    time_point_sec current_time = current_time_point();
    uint32_t current_day_start_sec = current_time.sec_since_epoch() - (current_time.sec_since_epoch() % (24 * 60 * 60)); // Start of current UTC day
    time_point_sec current_day_start(current_day_start_sec);
    time_point_sec next_day_start(current_day_start_sec + (24 * 60 * 60));

    roll_entries_table rolls(get_self(), get_self().value);
    auto rolls_by_time = rolls.get_index<"bytime"_n>();

    asset total_pot = asset(0, XPR_SYMBOL);
    std::vector<name> winners; // Store winning player accounts (can have duplicates for multiple winning entries)

    // Iterate through rolls for today
    auto itr = rolls_by_time.lower_bound(current_day_start.sec_since_epoch());
    while (itr != rolls_by_time.end() && itr->roll_time < next_day_start) {
        total_pot += asset(TICKET_PRICE, XPR_SYMBOL); // Each roll costs one ticket
        if (itr->roll_result == winning_roll) {
            winners.push_back(itr->player_account);
        }
        itr++;
    }

    check(total_pot.amount > 0, "No rolls recorded for today. No payout.");
    check(winners.size() > 0, "No winners for today's roll. No payout.");

    // Calculate payout
    double total_payout_amount = total_pot.amount * 0.9; // 90% payout
    double payout_per_winner_entry = total_payout_amount / winners.size();

    // Group winners to avoid multiple transfers to the same account if possible,
    // or just iterate and send. For simplicity, we'll iterate and send for now.
    // A more optimized approach would sum up payouts per unique winner.

    // Distribute payouts (queue for external processing)
    payout_queue_table payouts(get_self(), get_self().value);
    for (const auto& winner_account : winners) {
        asset payout_quantity = asset(static_cast<int64_t>(payout_per_winner_entry), XPR_SYMBOL);
        payouts.emplace(get_self(), [&](auto& row) { // Payer is contract itself
            row.id = payouts.available_primary_key();
            row.winner_account = winner_account;
            row.payout_amount = payout_quantity;
            row.created_time = current_time_point();
            row.processed = false;
        });
    }

    // Store the winning roll for transparency
    winning_rolls_table winrolls(get_self(), get_self().value);
    winrolls.emplace(get_self(), [&](auto& row) {
        row.id = draw_time.sec_since_epoch();
        row.winning_roll = winning_roll;
        row.draw_time = draw_time;
    });

    // Clear today's rolls after payout determination
    itr = rolls_by_time.lower_bound(current_day_start.sec_since_epoch());
    while (itr != rolls_by_time.end() && itr->roll_time < next_day_start) {
        itr = rolls_by_time.erase(itr);
    }
}

[[eosio::action]]
void onedice::procpay(uint64_t payout_id) {
    require_auth(get_self()); // Only the contract itself can call this action

    payout_queue_table payouts(get_self(), get_self().value);
    auto itr = payouts.find(payout_id);

    check(itr != payouts.end(), "Payout entry not found.");
    check(!itr->processed, "Payout entry already processed.");

    // Mark as processed
    payouts.modify(itr, get_self(), [&](auto& row) {
        row.processed = true;
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
