-- Run once after backing up your existing database.
USE restaurant_reservation;
ALTER TABLE reservations ADD COLUMN display_code VARCHAR(32) NULL UNIQUE AFTER id;
CREATE TABLE IF NOT EXISTS reservation_code_lock (id TINYINT PRIMARY KEY) ENGINE=InnoDB;
INSERT IGNORE INTO reservation_code_lock(id) VALUES(1);
-- Existing confirmed reservations will be given unique display IDs by the maintenance script.
-- Keep original numeric id values intact so edit and cancel links continue to work.
