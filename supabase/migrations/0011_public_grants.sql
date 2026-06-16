-- Polar - restore the standard anon/authenticated table privileges (migration 0011).
--
-- Every prior migration was authored against the normal Supabase convention where
-- the anon and authenticated roles already hold the data privileges on public
-- tables and ROW-LEVEL SECURITY decides which rows each role can touch. Those
-- migrations therefore only add RLS policies + function grants and never grant
-- table privileges themselves.
--
-- When the schema is applied with `supabase db push` (direct/pooler connection)
-- instead of the dashboard SQL editor, the project's default privileges are not
-- laid down, so anon/authenticated end up with only TRUNCATE/REFERENCES/TRIGGER
-- and the storefront's public reads fail with "permission denied for table".
--
-- This migration grants the standard privileges (idempotent) and sets default
-- privileges so future tables inherit them. Safety rests on RLS, which is enabled
-- on every business table: public-read policies expose only active catalog rows,
-- anon may INSERT orders/order_items via the anon-insert policies, and all admin
-- writes are gated by is_admin(). Granting the privileges only lets the roles
-- ATTEMPT operations; RLS still decides the outcome.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on all tables in schema public to anon, authenticated;

grant usage, select
  on all sequences in schema public to anon, authenticated;

grant execute
  on all functions in schema public to anon, authenticated;

-- Future objects created by the migration role inherit the same privileges.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;

alter default privileges in schema public
  grant execute on functions to anon, authenticated;
