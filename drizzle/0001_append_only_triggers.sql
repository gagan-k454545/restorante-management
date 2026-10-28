-- Append-only trigger function for immutable audit and financial tables
CREATE OR REPLACE FUNCTION prevent_update_or_delete()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Table % is append-only. UPDATE and DELETE operations are forbidden.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_payments_immutable
BEFORE UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();
--> statement-breakpoint
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();
--> statement-breakpoint
CREATE TRIGGER trg_order_history_immutable
BEFORE UPDATE OR DELETE ON order_history
FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();
--> statement-breakpoint
CREATE TRIGGER trg_credit_notes_immutable
BEFORE UPDATE OR DELETE ON credit_notes
FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();
