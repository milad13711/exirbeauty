-- One staff member can't have two active appointments that overlap in time on the same day.
-- Enforced by the database so concurrent bookings can never double-book (the app maps the violation to 409 SLOT_TAKEN).
-- Needs the btree_gist extension (bundled with PostgreSQL; creating it needs a privileged role once).
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment" ADD CONSTRAINT "appt_no_overlap"
  EXCLUDE USING gist (
    "staffId" WITH =,
    "date" WITH =,
    int4range("startMin", "startMin" + "durationMin") WITH &&
  ) WHERE ("status" IN ('PENDING', 'CONFIRMED', 'IN_SERVICE'));

ALTER TABLE "Appointment" ADD CONSTRAINT "appt_valid_time" CHECK ("startMin" >= 0 AND "durationMin" > 0 AND "startMin" + "durationMin" <= 1440);
