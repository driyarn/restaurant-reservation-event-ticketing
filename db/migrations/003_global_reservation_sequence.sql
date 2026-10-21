-- Upgrade existing databases after completing migration 002.
-- BACK UP database before running. Import ONCE in XAMPP/phpMyAdmin.
USE restaurant_reservation;
CREATE TABLE IF NOT EXISTS reservation_code_state (
 id TINYINT PRIMARY KEY,
 next_number BIGINT UNSIGNED NOT NULL
) ENGINE=InnoDB;
INSERT IGNORE INTO reservation_code_state(id,next_number) VALUES(1,1);
CREATE TABLE IF NOT EXISTS reservation_released_numbers (
 release_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 sequence_number BIGINT UNSIGNED NOT NULL UNIQUE
) ENGINE=InnoDB;
-- IMPORTANT: After this, stop the Node server and run:
-- node scripts/backfill-display-codes.js
-- This reassigns ACTIVE visible IDs as a single global ascending sequence
-- in numeric primary-key order. Previously displayed codes may change.
-- Restart server only after the backfill finishes.
