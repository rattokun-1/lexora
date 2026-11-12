-- Server-generated lesson plans. Answers remain private and are never sent to the browser.
create table if not exists private.learning_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_version text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);

create table if not exists private.learning_plan_items (
  plan_id uuid not null references private.learning_plans(id) on delete cascade,
  item_index integer not null check (item_index between 0 and 9),
  word_id text not null,
  word text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  correct integer not null check (correct between 0 and 3),
  format text not null check (format in ('meaning-select', 'spelling', 'study')),
  answered_at timestamptz,
  primary key (plan_id, item_index)
);

create index if not exists learning_plans_user_created
  on private.learning_plans(user_id, created_at desc);

revoke all on private.learning_plans from public, anon, authenticated;
revoke all on private.learning_plan_items from public, anon, authenticated;

create or replace function public.lexora_create_lesson(requested_limit integer default 10)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := auth.uid();
  v_plan_id uuid := gen_random_uuid();
  lesson_limit integer := greatest(1, least(coalesce(requested_limit, 10), 10));
  model_version text;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  select coalesce(
    (select lm.version from public.learning_models lm where lm.active limit 1),
    'fsrs6-default-v1'
  ) into model_version;

  insert into private.learning_plans(id, user_id, model_version)
  values (v_plan_id, uid, model_version);

  with latest as (
    select distinct on (e.word_id)
      e.word_id, e.correct, e.occurred_at
    from private.learning_events e
    join private.learning_subjects s on s.subject_id = e.subject_id
    where s.user_id = uid
    order by e.word_id, e.occurred_at desc, e.event_id desc
  ),
  selected as (
    select
      q.id,
      q.word,
      q.options,
      q.correct,
      case
        when l.word_id is null then 0
        when not l.correct then 1
        when l.occurred_at < now() - interval '1 day' then 2
        else 3
      end as priority
    from private.duel_questions q
    left join latest l on l.word_id = 'new-word-' || q.id::text
    order by priority, q.band, md5(uid::text || ':' || q.id::text)
    limit lesson_limit
  )
  insert into private.learning_plan_items(
    plan_id, item_index, word_id, word, options, correct, format
  )
  select
    v_plan_id,
    row_number() over (order by priority, id) - 1,
    'new-word-' || id::text,
    word,
    options,
    correct,
    case (row_number() over (order by priority, id) - 1) % 3
      when 0 then 'study'
      when 1 then 'meaning-select'
      else 'spelling'
    end
  from selected;

  return jsonb_build_object(
    'plan_id', v_plan_id,
    'model_version', model_version,
    'items', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'index', item_index,
          'word_id', word_id,
          'word', word,
          'options', options,
          'format', format
        ) order by item_index
      ), '[]'::jsonb)
      from private.learning_plan_items
      where private.learning_plan_items.plan_id = v_plan_id
    )
  );
end;
$$;

drop function if exists public.lexora_answer_lesson(uuid, integer, integer);
create or replace function public.lexora_answer_lesson(
  lesson_id uuid,
  item_number integer,
  selected_choice integer,
  answer_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := auth.uid();
  item private.learning_plan_items;
  subject uuid;
  is_correct boolean;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select i.* into item
  from private.learning_plan_items i
  join private.learning_plans p on p.id = i.plan_id
  where i.plan_id = lesson_id
    and i.item_index = item_number
    and p.user_id = uid
    and p.expires_at > now()
  for update;

  if not found then raise exception 'Lesson item not found or expired'; end if;
  if item.answered_at is not null then raise exception 'Lesson item already answered'; end if;

  if item.format = 'meaning-select' and (selected_choice is null or selected_choice < 0 or selected_choice > 3) then
    raise exception 'Invalid choice';
  end if;

  is_correct := case
    when item.format = 'study' then true
    when item.format = 'spelling' then lower(trim(coalesce(answer_text, ''))) = lower(trim(item.word))
    else selected_choice = item.correct
  end;
  update private.learning_plan_items
  set answered_at = now()
  where plan_id = lesson_id and item_index = item_number;

  insert into private.learning_subjects(user_id)
  values (uid)
  on conflict (user_id) do nothing;
  select subject_id into subject
  from private.learning_subjects
  where user_id = uid;

  insert into private.learning_events(
    event_id, subject_id, word_id, format, correct, elapsed_days,
    prediction, response_ms, model_version, occurred_at
  )
  select
    gen_random_uuid(),
    subject,
    item.word_id,
    item.format,
    is_correct,
    0,
    null,
    null,
    p.model_version,
    now()
  from private.learning_plans p
  where p.id = lesson_id;

  return jsonb_build_object(
    'correct', is_correct,
    'correct_choice', item.correct,
    'word_id', item.word_id
  );
end;
$$;

revoke all on function public.lexora_create_lesson(integer) from public, anon;
grant execute on function public.lexora_create_lesson(integer) to authenticated;
revoke all on function public.lexora_answer_lesson(uuid, integer, integer, text) from public, anon;
grant execute on function public.lexora_answer_lesson(uuid, integer, integer, text) to authenticated;
