-- Model data is pseudonymous, not guaranteed anonymous. Retain 365 days.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create table private.learning_subjects(user_id uuid primary key references auth.users on delete cascade, subject_id uuid not null unique default gen_random_uuid());
create table private.learning_events(
 event_id uuid primary key,subject_id uuid not null references private.learning_subjects(subject_id) on delete cascade,
 word_id text not null,format text not null check(format in ('meaning-select','recall','spelling')),
 correct boolean not null,elapsed_days double precision not null check(elapsed_days between 0 and 3650),
 prediction double precision check(prediction between 0 and 1),response_ms integer check(response_ms between 0 and 600000),
 model_version text not null,occurred_at timestamptz not null,received_at timestamptz not null default now());
create index on private.learning_events(subject_id,occurred_at);
create or replace function public.lexora_record_reviews(events jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare sid uuid; e jsonb; n integer:=0; added integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(events)<>'array' or jsonb_array_length(events)>100 then raise exception 'Invalid batch'; end if;
 insert into private.learning_subjects(user_id) values(auth.uid()) on conflict do nothing;
 select subject_id into sid from private.learning_subjects where user_id=auth.uid();
 for e in select value from jsonb_array_elements(events) loop
  if length(e->>'word_id')>100 or length(e->>'model_version')>100 or (e->>'occurred_at')::timestamptz>now()+interval '5 minutes' or (e->>'occurred_at')::timestamptz<now()-interval '365 days' then raise exception 'Invalid review';end if;
  insert into private.learning_events(event_id,subject_id,word_id,format,correct,elapsed_days,prediction,response_ms,model_version,occurred_at)
  values((e->>'event_id')::uuid,sid,e->>'word_id',e->>'format',(e->>'correct')::boolean,(e->>'elapsed_days')::float8,(e->>'prediction')::float8,(e->>'response_ms')::integer,e->>'model_version',(e->>'occurred_at')::timestamptz) on conflict do nothing;
  get diagnostics added=row_count;n:=n+added;
 end loop;
 return n;
end;$$;
revoke all on function public.lexora_record_reviews(jsonb) from public,anon;
grant execute on function public.lexora_record_reviews(jsonb) to authenticated;
create table public.learning_models(version text primary key,artifact jsonb not null,active boolean not null default false,created_at timestamptz not null default now(),check(not active or artifact->>'eligible'='true'));
create unique index one_active_learning_model on public.learning_models(active) where active;
alter table public.learning_models enable row level security;
grant select on public.learning_models to anon,authenticated;
create policy active_model_only on public.learning_models for select using(active);
revoke all on public.learning_models from anon,authenticated;
grant select(version,artifact,active) on public.learning_models to anon,authenticated;
-- Run daily using your scheduler. No browser may export the training set.
create or replace function public.lexora_purge_reviews() returns void language sql security definer set search_path='' as $$delete from private.learning_events where occurred_at<now()-interval '365 days';$$;
revoke all on function public.lexora_purge_reviews() from public,anon,authenticated;
grant execute on function public.lexora_purge_reviews() to service_role;
create or replace function public.lexora_export_reviews(page_offset integer default 0) returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(row_to_json(e)),'[]'::jsonb) from (select subject_id,format,correct,elapsed_days,prediction,model_version,occurred_at from private.learning_events order by occurred_at,event_id limit 1000 offset greatest(0,page_offset)) e;
$$;
revoke all on function public.lexora_export_reviews(integer) from public,anon,authenticated;
grant execute on function public.lexora_export_reviews(integer) to service_role;
create or replace function public.lexora_activate_model(candidate jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if coalesce(candidate->>'kind'<>'logistic-calibration-v1' or candidate->>'eligible'<>'true' or (candidate->>'trainingCount')::integer<500 or (candidate#>>'{validation,count}')::integer<100 or not ((candidate#>>'{validation,logLoss}')::float8<(candidate#>>'{baseline,logLoss}')::float8*.99) or not ((candidate#>>'{validation,brier}')::float8<=(candidate#>>'{baseline,brier}')::float8) or not ((candidate#>>'{parameters,slope}')::float8 between .05 and 5) or not (abs((candidate#>>'{parameters,intercept}')::float8)<=5) ,true) then raise exception 'Invalid model evaluation';end if;
 perform pg_advisory_xact_lock(140001);
 update public.learning_models set active=false where active;
 insert into public.learning_models(version,artifact,active) values(candidate->>'version',candidate,true) on conflict(version) do update set active=true,artifact=excluded.artifact;
 return jsonb_build_object('active',candidate->>'version');
end;$$;
revoke all on function public.lexora_activate_model(jsonb) from public,anon,authenticated;
grant execute on function public.lexora_activate_model(jsonb) to service_role;
create or replace function public.lexora_reset_model() returns jsonb language plpgsql security definer set search_path='' as $$begin perform pg_advisory_xact_lock(140001);update public.learning_models set active=false where active;return '{"active":"fsrs6-default-v1"}'::jsonb;end;$$;
revoke all on function public.lexora_reset_model() from public,anon,authenticated;
grant execute on function public.lexora_reset_model() to service_role;
