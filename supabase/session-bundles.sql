-- 경로: supabase/session-bundles.sql
-- 역할: 학습 세션 번들 테이블과 함수/RLS 정의
-- 의존관계: public.users, public.sessions, public.session_items, public.attempts, public.grades, public.items, public.concepts
-- 포함 함수: truncate_old_bundles(), archive_session_into_bundle(), get_bundle_result()

begin;

create table if not exists public.session_bundles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  bundle_seq bigint not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  session_ids jsonb not null default '[]'::jsonb,
  summary_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists session_bundles_user_seq_idx
  on public.session_bundles(user_id, bundle_seq desc);

alter table public.sessions
  add column if not exists bundle_id uuid;

alter table public.sessions
  add constraint sessions_bundle_id_fkey
    foreign key (bundle_id) references public.session_bundles(id) on delete set null;

create index if not exists sessions_bundle_id_idx
  on public.sessions(bundle_id);

create or replace view public.session_bundle_metrics as
select
  sb.id as bundle_id,
  sb.user_id,
  sb.bundle_seq,
  sb.started_at,
  sb.ended_at,
  (sb.summary_json->'metadata'->>'session_id')::uuid as session_id,
  coalesce((sb.summary_json->'metrics'->>'total_items')::int, 0) as attempt_count,
  coalesce((sb.summary_json->'metrics'->>'correct_items')::int, 0) as correct_count,
  coalesce((sb.summary_json->'metrics'->>'duration_ms')::bigint, 0) as duration_ms,
  case
    when coalesce((sb.summary_json->'metrics'->>'total_items')::numeric, 0) > 0
      then round(
        coalesce((sb.summary_json->'metrics'->>'correct_items')::numeric, 0)
        / nullif(coalesce((sb.summary_json->'metrics'->>'total_items')::numeric, 0), 0),
        4
      )
    else 0
  end as correct_rate
from public.session_bundles sb;


create or replace function public.truncate_old_bundles(
  p_user_id uuid,
  p_keep int default 30
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.session_bundles sb
  using (
    select id
    from public.session_bundles
    where user_id = p_user_id
    order by bundle_seq desc
    offset greatest(coalesce(p_keep, 30), 0)
  ) old
  where sb.id = old.id;
end;
$$;

create or replace function public.archive_session_into_bundle(
  p_session_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_bundle_id uuid;
  v_next_seq bigint := 1;
  v_started timestamptz;
  v_ended timestamptz;
  v_items jsonb := '[]'::jsonb;
  v_attempts jsonb := '[]'::jsonb;
  v_calendar jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_correct integer := 0;
  v_sentence integer := 0;
  v_word integer := 0;
  v_phrase integer := 0;
  v_duration_ms bigint := 0;
begin
  select s.id,
         s.user_id,
         s.started_at,
         coalesce(s.ended_at, now()) as ended_at,
         s.status,
         s.strategy_json,
         s.target_item_count
    into v_session
  from public.sessions s
  where s.id = p_session_id
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if v_session.user_id is null then
    raise exception 'SESSION_USER_NOT_FOUND';
  end if;

  if v_session.status is distinct from 'completed' then
    update public.sessions
      set status = 'completed',
          ended_at = coalesce(ended_at, now())
    where id = p_session_id;
  end if;

  v_started := coalesce(v_session.started_at, now());
  v_ended := coalesce(v_session.ended_at, now());
  v_duration_ms := greatest(0, (extract(epoch from (v_ended - v_started)) * 1000)::bigint);

  select coalesce(max(bundle_seq), 0) + 1
    into v_next_seq
  from public.session_bundles
  where user_id = v_session.user_id;

  with item_data as (
    select
      si.item_id,
      si.order_index,
      lower(nullif(coalesce(si.snapshot_json->>'type', it.type::text), '')) as item_type,
      coalesce(nullif(si.snapshot_json->>'level', ''), it.level::text) as item_level,
      coalesce(nullif(si.snapshot_json->>'concept_key', ''), it.concept_key) as concept_key,
      coalesce(nullif(si.snapshot_json->>'concept_ko', ''), c.display_name) as concept_ko,
      si.snapshot_json
    from public.session_items si
    left join public.items it on it.id = si.item_id
    left join public.concepts c on c.concept_key = coalesce(nullif(si.snapshot_json->>'concept_key', ''), it.concept_key)
    where si.session_id = p_session_id
  ), item_agg as (
    select
      coalesce(jsonb_agg(jsonb_build_object(
        'item_id', item_id,
        'order_index', order_index,
        'type', item_type,
        'level', item_level,
        'concept_key', concept_key,
        'concept_ko', concept_ko,
        'snapshot', snapshot_json
      ) order by order_index), '[]'::jsonb) as items_json,
      count(*) as total,
      count(*) filter (where item_type = 'sentence') as sentence_cnt,
      count(*) filter (where item_type = 'word') as word_cnt,
      count(*) filter (where item_type = 'phrase') as phrase_cnt
    from item_data
  )
  select items_json, total, sentence_cnt, word_cnt, phrase_cnt
    into v_items, v_total, v_sentence, v_word, v_phrase
  from item_agg;

  with item_data as (
    select
      si.item_id,
      si.order_index,
      lower(nullif(coalesce(si.snapshot_json->>'type', it.type::text), '')) as item_type,
      coalesce(nullif(si.snapshot_json->>'level', ''), it.level::text) as item_level,
      si.snapshot_json
    from public.session_items si
    left join public.items it on it.id = si.item_id
    where si.session_id = p_session_id
  ), last_attempt as (
    select distinct on (a.item_id)
      a.item_id,
      a.id as attempt_id,
      a.answer_raw,
      a.latency_ms,
      a.submitted_at,
      g.label,
      g.feedback_short,
      g.minimal_rewrite
    from public.attempts a
    left join public.grades g on g.attempt_id = a.id
    where a.session_id = p_session_id
    order by a.item_id, g.created_at desc nulls last, a.submitted_at desc nulls last, a.id desc
  ), attempt_data as (
    select
      i.item_id,
      i.order_index,
      la.attempt_id,
      la.answer_raw,
      la.label,
      la.feedback_short,
      la.minimal_rewrite,
      la.submitted_at,
      la.latency_ms
    from last_attempt la
    left join public.session_items i on i.session_id = p_session_id and i.item_id = la.item_id
  ), attempt_agg as (
    select
      coalesce(jsonb_agg(jsonb_build_object(
        'item_id', item_id,
        'order_index', order_index,
        'attempt_id', attempt_id,
        'answer', answer_raw,
        'label', label,
        'feedback', feedback_short,
        'minimal_rewrite', minimal_rewrite,
        'submitted_at', submitted_at,
        'latency_ms', latency_ms
      ) order by order_index), '[]'::jsonb) as attempts_json,
      count(*) filter (where label in ('correct', 'variant')) as correct_cnt

    from attempt_data
  ), calendar_agg as (
    select coalesce(jsonb_agg(day order by day), '[]'::jsonb) as calendar_json
    from (
      select distinct to_char((submitted_at at time zone 'Asia/Seoul')::date, 'YYYY-MM-DD') as day
      from attempt_data
      where submitted_at is not null
    ) d
  )
  select attempts_json, correct_cnt, calendar_json
    into v_attempts, v_correct, v_calendar
  from attempt_agg, calendar_agg;

  insert into public.session_bundles (
    user_id,
    bundle_seq,
    started_at,
    ended_at,
    session_ids,
    summary_json
  ) values (
    v_session.user_id,
    v_next_seq,
    v_started,
    v_ended,
    jsonb_build_array(v_session.id),
    jsonb_build_object(
      'metadata', jsonb_build_object(
        'session_id', v_session.id,
        'user_id', v_session.user_id,
        'bundle_seq', v_next_seq,
        'started_at', v_started,
        'ended_at', v_ended,
        'target_item_count', v_session.target_item_count,
        'strategy', coalesce(v_session.strategy_json, '{}'::jsonb)
      ),
      'items', v_items,
      'attempts', v_attempts,
      'metrics', jsonb_build_object(
        'total_items', coalesce(v_total, 0),
        'correct_items', coalesce(v_correct, 0),
        'sentence_count', coalesce(v_sentence, 0),
        'word_count', coalesce(v_word, 0),
        'phrase_count', coalesce(v_phrase, 0),
        'duration_ms', v_duration_ms
      ),
      'calendar', jsonb_build_object(
        'dates', v_calendar
      )
    )
  ) returning id into v_bundle_id;

  update public.sessions
     set bundle_id = v_bundle_id
   where id = p_session_id;

  delete from public.grades g
   where exists (
     select 1 from public.attempts a
     where a.id = g.attempt_id and a.session_id = p_session_id
   );

  delete from public.attempts a
   where a.session_id = p_session_id;

  delete from public.session_items si
   where si.session_id = p_session_id;

  perform public.truncate_old_bundles(v_session.user_id, 30);

  return v_bundle_id;
end;
$$;

create or replace function public.get_bundle_result(
  p_bundle_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _own boolean;
  _result jsonb;
begin
  select exists (
    select 1 from public.session_bundles
    where id = p_bundle_id
      and user_id = _uid
  ) into _own;

  if not coalesce(_own, false) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select jsonb_build_object(
           'bundle_id', sb.id,
           'started_at', sb.started_at,
           'ended_at', sb.ended_at,
           'summary', sb.summary_json
         )
    into _result
  from public.session_bundles sb
  where sb.id = p_bundle_id;

  return coalesce(_result, '{}'::jsonb);
end;
$$;

alter table public.session_bundles enable row level security;

drop policy if exists session_bundles_select_own on public.session_bundles;
create policy session_bundles_select_own
  on public.session_bundles
  for select
  using (user_id = auth.uid());

drop policy if exists session_bundles_insert_service on public.session_bundles;
create policy session_bundles_insert_service
  on public.session_bundles
  for insert
  with check (auth.role() = 'service_role');

drop policy if exists session_bundles_update_service on public.session_bundles;
create policy session_bundles_update_service
  on public.session_bundles
  for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists session_bundles_delete_service on public.session_bundles;
create policy session_bundles_delete_service
  on public.session_bundles
  for delete
  using (auth.role() = 'service_role');

commit;
