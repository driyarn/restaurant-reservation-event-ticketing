# Week 10–11 Testing and Debugging Checklist
Run `npm test`. Requires MySQL 8+ for database integration.
1. Import `db/schema.sql`; start app; GET `/api/health` -> 200.
2. GET `/api/tables` and `/api/events` -> seeded rows.
3. POST valid reservation with admin key -> 201; SQL SELECT shows row.
4. GET list and GET ID -> same row.
5. PUT ID with changed party size -> 200; row updated.
6. Conflicting table/time -> 409; capacity exceeded -> 422.
7. Invalid email or past time -> 400; unauthorized admin requests -> 401.
8. DELETE ID -> 200; SQL status becomes cancelled; repeated cancellation -> 404.
9. POST ticket registration -> 201; event remaining tickets decreases; excessive quantity -> 409.
10. SQL-looking name is stored as ordinary text because prepared statements are used.
These are *expected* results. Record actual integration outcomes when testing with a running MySQL instance.
