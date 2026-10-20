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
