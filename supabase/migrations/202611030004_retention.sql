-- Supabase supports pg_cron; no outbound requests or credentials are needed.
create extension if not exists pg_cron;
select cron.schedule('lexora-data-retention','17 3 * * *','select public.lexora_purge_reviews(); select public.lexora_purge_duels();');
