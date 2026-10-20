-- One-time migration for databases created before email uniqueness was added.
-- Back up the database before running. This applies to all reservations,
-- including cancelled ones. Existing duplicate emails must be reviewed
-- manually; this migration will fail without deleting any bookings.
USE restaurant_reservation;

-- Inspect case-insensitive duplicate addresses before running the ALTER.
SELECT LOWER(TRIM(email)) AS normalized_email, COUNT(*) AS occurrences,
       GROUP_CONCAT(id ORDER BY id) AS reservation_ids
FROM reservations
GROUP BY LOWER(TRIM(email))
HAVING COUNT(*) > 1;

-- Normalize existing addresses; check the query above before this step.
UPDATE reservations SET email = LOWER(TRIM(email));

-- Must be run only AFTER resolving all duplicates shown above.
-- If the unique index already exists, do not run this statement again.
ALTER TABLE reservations ADD UNIQUE KEY uq_reservations_email (email);
