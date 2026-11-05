\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
\i /work/supabase/migrations/202611020001_user_data.sql
\i /work/supabase/migrations/202611030001_learning_models.sql
\i /work/supabase/migrations/202611030002_duels.sql
\i /work/supabase/migrations/202611030003_duel_bank.sql
insert into auth.users values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select public.lexora_duel('join');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
select public.lexora_duel('join');
do $$begin if (select count(*) from private.duels)<>1 then raise exception 'Matching failed';end if;end;$$;
update private.duels set starts_at=now()-interval '1 second';
select public.lexora_duel('status');
select public.lexora_duel('answer',0,0);
do $$begin begin perform public.lexora_duel('answer',0,0);raise exception 'Duplicate accepted';exception when others then if sqlerrm='Duplicate accepted' then raise;end if;end;end;$$;
update private.duels set starts_at=now()-interval '61 seconds';
do $$begin if public.lexora_duel('status')->>'state'<>'finished' then raise exception 'Time limit failed';end if;end;$$;
select public.lexora_record_reviews(jsonb_set('[{"event_id":"00000000-0000-4000-8000-000000000099","word_id":"1","format":"recall","correct":true,"elapsed_days":2,"prediction":0.9,"response_ms":1000,"model_version":"test","occurred_at":"2026-11-03T01:31:23.964Z"}]'::jsonb,'{0,occurred_at}',to_jsonb(now())));
do $$begin if (select count(*) from private.learning_events)<>1 then raise exception 'Ingest failed';end if;if has_table_privilege('authenticated','private.learning_events','select') then raise exception 'Training data exposed';end if;if has_function_privilege('authenticated','public.lexora_export_reviews(integer)','execute') then raise exception 'Export exposed';end if;end;$$;

\i /work/supabase/migrations/202611040001_leaderboard.sql
do $$declare r jsonb;begin r:=public.kotomia_leaderboard();if jsonb_array_length(r)=0 then raise exception 'No ranking records';end if;if r::text like '%00000000-0000%' then raise exception 'Identity leaked';end if;if has_function_privilege('anon','public.kotomia_leaderboard()','execute') then raise exception 'Anonymous ranking access';end if;end;$$;
