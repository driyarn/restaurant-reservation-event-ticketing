# Restaurant Reservation with Event Registration and Ticketing System

**Cavite State University — COSC 75, Week 10–11 Activity 6**

A Node.js / Express + MySQL backend prototype, with a Figma-inspired HTML/CSS/JavaScript and Bootstrap frontend for managing restaurant reservations and registering for events. This project demonstrates database connectivity, CRUD operations, server-side validation, prepared SQL statements and access control.

## Stack
- **Design:** Figma (Krusty Krab theme: forest green `#083c32` and gold `#d5b878`)
- **Frontend:** HTML, CSS, JavaScript, Bootstrap 5
- **Backend:** Node.js 20+, Express 4
- **Database:** MySQL 8+ using `mysql2/promise`
- **Tools:** VS Code, GitHub, Postman-compatible REST endpoints
- **Payments:** No real PayMongo payment is collected or integrated; ticket registrations reserve availability only.

## Requirements
Node.js 20+, npm, MySQL 8+. Bootstrap and Google Fonts require an internet connection to load.

## Start
1. Clone the repository and run `npm install`.
2. Import the schema with a privileged MySQL account: `mysql -u root -p < db/schema.sql`.
3. Create a dedicated MySQL application user and grant it SELECT, INSERT, UPDATE, DELETE on `restaurant_reservation.*`. Avoid using the MySQL root account for the application.
4. Copy `.env.example` to `.env`. Enter your DB credentials and a **long randomly generated** `ADMIN_API_KEY` of at least 32 characters.
5. Run `npm start`, then open `http://localhost:3000`.
6. For reservation CRUD in the UI, use **Manage Reservations**, enter the same ADMIN_API_KEY, and load bookings.

## API
| Method | Route | Function | Access |
|---|---|---|---|
| GET | `/api/health` | Verify DB connectivity | Public |
| GET | `/api/tables` | Read active dining tables | Public |
| GET | `/api/events` | Read events and remaining tickets | Public |
| POST | `/api/event-registrations` | Reserve event tickets (unpaid) | Public |
| GET | `/api/reservations` | List bookings | Admin |
| GET | `/api/reservations/:id` | Read a booking | Admin |
| POST | `/api/reservations` | Create a booking | Admin |
| PUT | `/api/reservations/:id` | Update a booking | Admin |
| DELETE | `/api/reservations/:id` | Cancel a booking (soft deletion) | Admin |

Admin endpoints require an `x-admin-key` request header. This key is for educational staff-side demonstrations; it is not a replacement for production authentication, authorization, sessions, and CSRF protection.

### Example create reservation
```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_LOCAL_ADMIN_KEY" \
  -d '{"customer_name":"Maria Santos","email":"maria@example.com","phone":"+639171234567","table_id":2,"party_size":3,"reserved_at":"2027-12-18T19:00","duration_minutes":90,"notes":"Anniversary"}'
```

## Business rules
- Table must be active, and party size cannot exceed its capacity.
- Reservations must use a future Philippine-local time and cannot overlap another confirmed booking for the same table.
- Reservations are cancelled by changing their status instead of permanently deleting personal records.
- Event ticket capacity is checked in a transaction that locks the event record.
- Request bodies are checked with Zod; SQL data is passed using prepared statements.
- API rate limits, JSON body limits, HTTP security headers, and an admin key are included.

## Verification and limitations
Run `npm test` to run validation unit tests. Follow `docs/TESTING.md` for live MySQL CRUD integration checks. Local syntax/unit verification does **not** establish successful MySQL connectivity until tested with a running server. Ticket reservations are not paid tickets; payment processing, email delivery, robust customer identity, and full production hardening are outside this Week 10–11 prototype scope. The frontend is an adapted Figma dashboard, not a pixel-perfect replication of every Figma page.

**Figma design:** https://www.figma.com/design/W5E08KkbtWpykLlkKqdNxH/Restaurant-Reservation-with-Event-Registration-and-Ticketing-Systrem?node-id=0-1

## Troubleshooting: empty table dropdown / Manage Reservations fails

These are connected to the same MySQL schema. First open `http://localhost:3000/api/health` after starting Node. It should respond with `{"status":"ok","database":"connected","schema":"ready"}`. If it returns `setup_required` with a list of missing tables, import the schema into the **same database configured by DB_NAME**:

```bash
mysql -u root -p < db/schema.sql
```

Restart `npm start`. Check seed records:

```sql
USE restaurant_reservation;
SHOW TABLES;
SELECT id, label, seats, active FROM dining_tables;
SELECT COUNT(*) FROM reservations;
```

The tables dropdown should contain Garden 1, Garden 2, Main Hall 1, and Family Table. If the tables were previously created but no seed rows exist, rerun `db/schema.sql`, which uses upserts for the sample dining tables.

If the health response reports an access or connection failure, inspect `.env` locally (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD), ensure MySQL is running, and grant the application user the required privileges on the configured database. Never share your admin key or database password in screenshots or issues.

Manage Reservations additionally requires `ADMIN_API_KEY` to be set in the server's `.env` with a length of at least 32 characters. Restart the Node server after changing `.env`. Paste the **same exact key** in the Manage Reservations input (the key is never stored in GitHub). A wrong key returns 401; an unconfigured key returns 503; and an empty reservations table should return `{"data":[]}`, not an error.

If a 500 error persists after these checks, inspect the Node terminal for the underlying error code and message. The API intentionally does not expose raw SQL or credentials to the browser.

## Reservation improvements (October 2026)

- **Manage Reservations:** Search records by reservation ID, guest name, email, phone number, table ID, time or status; filter by Confirmed or Cancelled. Search is client-side over the most recent 100 records loaded by the existing admin endpoint, so older reservations may not appear until server-side pagination/search is implemented.
- **Check table availability:** The reservation form now queries `GET /api/availability?reserved_at=2027-12-18T19:00&duration_minutes=90&party_size=2`. Each active table is marked **Available** or **Unavailable / occupied** and unavailable tables are disabled. Choose date, guest count and duration before a table. Updating a reservation ignores its own booking with `exclude_id`. The server independently checks collisions within a transaction when saving.
- **Philippine mobile validation:** Phone numbers must use the strict international format `+639XXXXXXXXX` (13 characters; 9 digits after `+639`). Example: `+639171234567`. The API rejects local `09...`, incomplete numbers, non-PH codes, spaces, hyphens, unsupported symbols, or extra digits with a 400 response.

### Manual verification
1. Run `npm test` (new invalid mobile format cases included), start MySQL and `npm start`.
2. Open **Reservation**, choose a future time and guest count. The dropdown should show available and unavailable table labels.
3. Save a booking, then open the dialog again using the same table/time: that table should display **Unavailable / occupied** and be disabled. Another non-overlapping time should enable it again.
4. Test `+639171234567` (accepted) and `09171234567`, `+6391712`, `+6391712345678` (rejected).
5. Open **Manage Reservations**, load records with the admin key, search by guest name or ID, then change the status filter.
6. If you get an error, inspect `/api/health` and the server logs. These steps require a running MySQL instance and are not assertions that live integration tests have already passed.

## Reservation form usability refinements

- The country code **+63** is displayed in a fixed prefix beside the mobile input. Guests enter only `917 123 4567`; the browser formats as `XXX XXX XXXX` and sends the API the canonical `+639171234567`. The server still rejects invalid numbers.
- Full Name requires **first name and surname**. A single name or invalid name characters are rejected in the browser with an inline error message and rejected on the API by Zod validation. Multi-part surnames and accented letters are allowed.
- Manage Reservations search checks only reservation **ID, guest name, date/time, and status**. Email, phone, and table are no longer searched. Status also has a separate filter.
- The SQL database does not require a migration for these UI and validation changes. Existing older reservation records are not automatically renamed or modified.

### Quick regression checks
Run `npm test` and `npm start`. Try submitting only “Maria” as the guest name; the form should say a first name and surname are required. “Maria Santos” is accepted. In the phone input, type `9171234567`; it should display `917 123 4567` next to fixed `+63`. Deleting digits or using an incomplete number should block submission. Search reservations by name and ID, then verify searching an email address or phone number alone does **not** match a row.

## Unique email for reservations (October 2026)

Each email address can now belong to **only one reservation record** (including cancelled reservations). An existing reservation can be edited while keeping its own email; reusing another reservation's email returns **HTTP 409** with `This email is already used by another reservation. Please use a different email address.` Email values are trimmed and stored in lowercase.

**New databases:** `db/schema.sql` includes the `uq_reservations_email` unique index.

**Existing databases:** Importing `db/schema.sql` again does **not** change an existing reservations table because it uses `CREATE TABLE IF NOT EXISTS`. You must apply `db/migrations/001_unique_reservation_email.sql` instead. **Back up the database first**, run its duplicate-email audit query, resolve conflicting emails manually without deleting valid reservations, then normalize email values and add the unique index. Do not rerun the `ALTER TABLE` if the index already exists.

Test by creating one reservation, attempting a second reservation with the same email (including different letter case), and editing another reservation to that email: both duplicates should return 409. Editing the first reservation with its own existing email should succeed. This is the chosen lab requirement; for a future production app, multiple visits by the same customer would normally be modeled as separate reservations linked to a customer account instead.

## Reservation corrections — 21 October 2026

- **Email field:** required, browser email format check, and a clear inline duplicate-email message returned from the REST API (HTTP 409). The existing database uniqueness rule continues to apply.
- **Date/time:** the reservation form sets the earliest selectable datetime to the current Philippine-local minute, and blocks submissions with past or missing date/time. The backend continues to reject past reservations.
- **Name-based visible IDs:** confirmed reservations have a `display_code` in the form `JD-001` for John Doe. This code uses the initials of the first and last name and the smallest positive sequence unused by **currently confirmed** reservations with those initials. The internal numeric primary key `id` remains unchanged for API routes and referential integrity. Cancelling a reservation keeps its historical record but releases its display code (sets it to NULL); the code can be reused on a future booking. Codes are not regenerated when editing the customer's name. Duplicate customer initials use independent sequences, and allocation is serialized with a MySQL row lock. Previously cancelled reservations may show their internal numeric IDs as a fallback in Manage Reservations.
- **Admin access display:** search, filters, and records are hidden until a successful authenticated load. Changing the API key immediately hides and clears records; failed attempts leave results hidden. API key verification continues to happen server-side on every protected request.

### Required MySQL upgrade (existing projects only)
1. **Back up your MySQL database.**
2. Run the SQL file `db/migrations/002_reservation_display_codes.sql` once (do not rerun its ALTER TABLE statement). It adds the `display_code` column and allocator lock table.
3. Run `node scripts/backfill-display-codes.js` from the project root after updating `.env` to assign codes to previously confirmed reservations.
4. Restart your Node server with `npm start`.

**Important:** Until the migration is applied, the updated reservation API cannot load `display_code`, and management queries will fail. A cancelled record retains its original database ID, but its visible display code becomes available for reuse. This is not a deletion of historical reservation data. Email uniqueness still applies to cancelled records; it does not reset when their visible code is released.

### Suggested regression checks
Try one-name validation, duplicate email validation, previous-day selection, two bookings named John Doe (JD-001, JD-002), cancel JD-001 and create another John Doe booking (JD-001), change a valid admin key to an invalid one (records instantly disappear), and verify search/filter controls are hidden until the next successful authorized load. Run `npm test` and check these scenarios against your own MySQL setup; these database scenarios have not been executed in this environment.

## Global reservation number sequence (October 21 update)

**Rule:** The numeric suffix is global across all names, not per initials. John Doe = `JD-001`, Mary Jane = `MJ-002`. If JD-001 is cancelled, the next new reservation (for example, Edgardo Jorge) receives `EJ-001`, while MJ-002 remains unchanged. Without released numbers, the next number increases (003, 004, ...). If several numbers are released, the **most recently cancelled** number is reused first (last-in, first-out). No two active reservations receive the same suffix. The numeric database primary key remains stable, and cancelled bookings remain in history with a NULL display code.

### Existing database upgrade (XAMPP/phpMyAdmin)
1. Back up the database and **stop the Node server** to prevent writes.
2. Import `db/migrations/003_global_reservation_sequence.sql` through phpMyAdmin (after migration 002, if not already applied).
3. Run `node scripts/backfill-display-codes.js` in your project folder. This **renumbers all existing active codes**, in order of the internal numeric reservation ID, as one global sequence; older visible codes can change. Keep the server stopped until this completes.
4. Run `npm test`, restart with `npm start`, then check `SELECT id,display_code,status FROM reservations ORDER BY id;`.

Do **not** rerun the backfill after new cancellations/bookings: it is a one-time transition tool and resets the released-number stack. A stable historical reference should use internal numeric `id`, since reused display codes do not uniquely identify historic cancelled records.
