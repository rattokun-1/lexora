-- v1.4.3: authenticated, pseudonymous leaderboard. No production execution by this patch.
create or replace function public.kotomia_leaderboard() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.place,r.alias),'[]'::jsonb) into result
 from (
   select dense_rank() over(order by best.score desc) as place,
     '学習者 '||upper(substr(md5(best.user_id::text),1,6)) as alias,
     best.score,best.user_id=auth.uid() as is_self
   from (
     select scores.user_id,max(scores.score)::integer as score from (
       select a.user_id,a.match_id,count(*) filter(where a.correct)::integer as score
       from private.duel_answers a join private.duels d on d.id=a.match_id
       where d.starts_at>=now()-interval '7 days' and d.starts_at+interval '60 seconds'<=now()
       group by a.user_id,a.match_id
     ) scores group by scores.user_id
   ) best
   order by place,alias limit 100
 ) r;
 return result;
end;$$;
revoke all on function public.kotomia_leaderboard() from public,anon;
grant execute on function public.kotomia_leaderboard() to authenticated;
