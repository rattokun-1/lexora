create table private.duel_questions(id integer primary key,band integer not null check(band between 1 and 10),word text not null,options jsonb not null,correct integer not null check(correct between 0 and 3));
create table private.duels(id uuid primary key default gen_random_uuid(),a uuid not null references auth.users on delete cascade,b uuid not null references auth.users on delete cascade,starts_at timestamptz not null default now()+interval '3 seconds',deck integer[] not null,check(a<>b));
create table private.duel_queue(user_id uuid primary key references auth.users on delete cascade,band integer not null,queued_at timestamptz not null default now());
create table private.duel_answers(match_id uuid references private.duels on delete cascade,user_id uuid references auth.users on delete cascade,n integer not null,correct boolean not null,answered_at timestamptz not null default clock_timestamp(),primary key(match_id,user_id,n));
create index on private.duels(a,starts_at);
create index on private.duels(b,starts_at);
create or replace function public.lexora_duel(action text,choice integer default null,expected integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); opponent uuid; lvl integer:=5; d private.duels; q private.duel_questions; n integer; score integer; other_score integer; t timestamptz:=clock_timestamp(); last_at timestamptz; deck integer[];
begin
 if uid is null then raise exception 'ログインが必要です';end if;
 if action not in ('join','status','answer','cancel') then raise exception 'Invalid action';end if;
 perform pg_advisory_xact_lock(140060);
 if action='cancel' then delete from private.duel_queue where user_id=uid;return jsonb_build_object('state','idle');end if;
 select * into d from private.duels where (a=uid or b=uid) and starts_at>t-interval '5 minutes' order by starts_at desc limit 1;
 if action='status' and exists(select 1 from private.duel_queue where user_id=uid and queued_at>t-interval '120 seconds') and (d.id is null or t>=d.starts_at+interval '60 seconds') then return jsonb_build_object('state','waiting');end if;
 if action='join' and (d.id is null or t>=d.starts_at+interval '60 seconds') then
  lvl:=greatest(1,least(10,coalesce((select (state#>>'{placement,result,level}')::integer from public.user_data where user_id=uid),5)));
  delete from private.duel_queue where queued_at<t-interval '120 seconds';
  select user_id into opponent from private.duel_queue where user_id<>uid and abs(band-lvl)<=2 order by queued_at limit 1;
  if opponent is null then insert into private.duel_queue values(uid,lvl,t) on conflict(user_id) do nothing;return jsonb_build_object('state','waiting');end if;
  select array_agg(id) into deck from (select id from private.duel_questions order by abs(band-lvl),random() limit 200) s;
  if coalesce(array_length(deck,1),0)<20 then raise exception '問題データが未設定です';end if;
  insert into private.duels(a,b,deck) values(opponent,uid,deck) returning * into d;
  delete from private.duel_queue where user_id in (uid,opponent);
 end if;
 if d.id is null then return jsonb_build_object('state',case when exists(select 1 from private.duel_queue where user_id=uid) then 'waiting' else 'idle' end);end if;
 select count(*)::integer,max(answered_at) into n,last_at from private.duel_answers where match_id=d.id and user_id=uid;
 if action='answer' then
  if t<d.starts_at or t>=d.starts_at+interval '60 seconds' then raise exception '受付時間外です';end if;
  if expected is distinct from n or choice is null or choice not between 0 and 3 then raise exception '回答が更新されています';end if;
  if t<coalesce(last_at,d.starts_at)+interval '300 milliseconds' then raise exception '回答が速すぎます';end if;
  select * into q from private.duel_questions where id=d.deck[n+1];
  if q.id is null then raise exception '全問回答済みです';end if;
  insert into private.duel_answers(match_id,user_id,n,correct) values(d.id,uid,n,choice=q.correct);n:=n+1;
 end if;
 select count(*) filter(where correct)::integer into score from private.duel_answers where match_id=d.id and user_id=uid;
 select count(*) filter(where correct)::integer into other_score from private.duel_answers where match_id=d.id and user_id<>uid;
 select * into q from private.duel_questions where id=d.deck[n+1];
 return jsonb_build_object('state',case when t<d.starts_at then 'countdown' when t>=d.starts_at+interval '60 seconds' then 'finished' else 'playing' end,'matchId',d.id,'serverNow',t,'startsAt',d.starts_at,'endsAt',d.starts_at+interval '60 seconds','score',score,'opponentScore',other_score,'index',n,'question',case when t>=d.starts_at and t<d.starts_at+interval '60 seconds' and q.id is not null then jsonb_build_object('word',q.word,'options',q.options) else null end);
end;$$;
revoke all on function public.lexora_duel(text,integer,integer) from public,anon;
grant execute on function public.lexora_duel(text,integer,integer) to authenticated;
-- Abandoned matches/answers expire; run daily as service_role alongside review retention.
create or replace function public.lexora_purge_duels() returns void language sql security definer set search_path='' as $$delete from private.duels where starts_at<now()-interval '7 days';delete from private.duel_queue where queued_at<now()-interval '2 minutes';$$;
revoke all on function public.lexora_purge_duels() from public,anon,authenticated;
grant execute on function public.lexora_purge_duels() to service_role;
