-- 경로: supabase/migrations/20250205000000_session_bundle_metrics.sql
-- 역할: 세션 번들 기반 학습 지표 뷰와 함수 로직 업데이트
-- 의존관계: public.session_bundles, public.session_bundle_metrics, public.sessions, public.attempts, public.grades, public.user_concept_status, public.policy_level_adjustments, public.users
-- 포함 함수: session_bundle_metrics 뷰 정의, get_user_level_stats(), get_difficulty_adjustment()

begin;

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

create or replace function get_user_level_stats(p_user_id uuid)
returns table (
  recent_session_id uuid,
  recent_session_started_at timestamptz,
  recent_session_ended_at timestamptz,
  recent_attempts int,
  recent_correct_attempts int,
  recent_correct_rate numeric,
  total_attempts bigint,
  stable_concept_count bigint,
  stable_concept_ratio numeric,
  low_box_concept_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_concepts bigint;
  v_recent_bundle_id uuid;
  v_bundle_stats session_bundle_metrics%rowtype;
  v_has_bundle_stats boolean := false;
begin
  recent_attempts := 0;
  recent_correct_attempts := 0;
  recent_correct_rate := 0;

  select s.id,
         s.started_at,
         s.ended_at,
         s.bundle_id
  into recent_session_id,
       recent_session_started_at,
       recent_session_ended_at,
       v_recent_bundle_id
  from sessions s
  where s.user_id = p_user_id
    and s.status = 'completed'
  order by coalesce(s.ended_at, s.started_at) desc
  limit 1;

  if recent_session_id is not null then
    if v_recent_bundle_id is not null then
      select sbm.*
      into v_bundle_stats
      from session_bundle_metrics sbm
      where sbm.bundle_id = v_recent_bundle_id
      limit 1;

      v_has_bundle_stats := found;
    end if;

    if v_has_bundle_stats then
      recent_attempts := coalesce(v_bundle_stats.attempt_count, 0);
      recent_correct_attempts := coalesce(v_bundle_stats.correct_count, 0);
      recent_correct_rate := coalesce(v_bundle_stats.correct_rate, 0);
    else
      select count(*)::int,
             count(*) filter (where g.label in ('correct', 'variant'))::int
      into recent_attempts,
           recent_correct_attempts
      from attempts a
      left join grades g on g.attempt_id = a.id
      where a.session_id = recent_session_id;

      if recent_attempts > 0 then
        recent_correct_rate := round((recent_correct_attempts::numeric / recent_attempts)::numeric, 4);
      else
        recent_correct_rate := 0;
      end if;
    end if;
  end if;

  select coalesce(sum(ucs.total_attempts), 0)
  into total_attempts
  from user_concept_status ucs
  where ucs.user_id = p_user_id;

  select coalesce(count(*), 0)
  into stable_concept_count
  from user_concept_status ucs
  where ucs.user_id = p_user_id
    and ucs.box_level >= 4;

  select coalesce(count(*), 0)
  into v_total_concepts
  from user_concept_status ucs
  where ucs.user_id = p_user_id;

  stable_concept_ratio :=
    case when v_total_concepts > 0
         then round((stable_concept_count::numeric / v_total_concepts)::numeric, 4)
         else 0 end;

  select coalesce(count(*), 0)
  into low_box_concept_count
  from user_concept_status ucs
  where ucs.user_id = p_user_id
    and ucs.box_level <= 2;

  return next;
end;
$$;
-- get_user_level_stats: 번들 요약 기반 사용자 레벨 통계 반환

create or replace function get_difficulty_adjustment(p_user_id uuid)
returns table (
  applied boolean,
  reason text,
  policy_level int,
  recent_correct_rate numeric,
  low_box_concept_count bigint,
  adjusted_mix jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_level int;
  v_condition jsonb;
  v_threshold_rate numeric;
  v_threshold_low int;
  v_recent_bundle_rows int := 0;
  v_attempt_summary record;
begin
  select current_level
  into v_level
  from users
  where id = p_user_id;

  if v_level is null then
    applied := false;
    reason := '사용자 레벨 정보 없음';
    policy_level := null;
    recent_correct_rate := 0;
    low_box_concept_count := 0;
    adjusted_mix := null;
    return next;
  end if;

  policy_level := v_level;

  with recent_bundle_stats as (
    select sbm.attempt_count,
           sbm.correct_count
    from sessions s
    join session_bundle_metrics sbm on sbm.bundle_id = s.bundle_id
    where s.user_id = p_user_id
      and s.status = 'completed'
    order by coalesce(s.ended_at, s.started_at) desc
    limit 3
  )
  select case
           when coalesce(sum(attempt_count), 0) > 0 then round((sum(correct_count)::numeric / sum(attempt_count))::numeric, 4)
           else null
         end,
         count(*)
  into recent_correct_rate,
       v_recent_bundle_rows
  from recent_bundle_stats;

  if recent_correct_rate is null then
    with recent_sessions as (
      select s.id
      from sessions s
      where s.user_id = p_user_id
        and s.status = 'completed'
      order by coalesce(s.ended_at, s.started_at) desc
      limit 3
    )
    select count(*)::int as attempt_count,
           count(*) filter (where g.label in ('correct', 'variant'))::int as correct_count
    into v_attempt_summary
    from attempts a
    left join grades g on g.attempt_id = a.id
    where a.session_id in (select id from recent_sessions);

    if coalesce(v_attempt_summary.attempt_count, 0) > 0 then
      recent_correct_rate := round((coalesce(v_attempt_summary.correct_count, 0)::numeric / v_attempt_summary.attempt_count)::numeric, 4);
    else
      recent_correct_rate := 0;
    end if;
  end if;

  select coalesce(gs.low_box_concept_count, 0)
  into low_box_concept_count
  from get_user_level_stats(p_user_id) as gs;

  select condition_json, adjusted_mix_json
  into v_condition, adjusted_mix
  from policy_level_adjustments
  where level = v_level;

  if v_condition is null or adjusted_mix is null then
    applied := false;
    reason := '조정 조건 미충족';
    adjusted_mix := null;
    return next;
  end if;

  v_threshold_rate := coalesce((v_condition->>'recent_correct_rate_below')::numeric, 0.6);
  v_threshold_low := coalesce((v_condition->>'low_box_concepts_over')::int, 5);

  if recent_correct_rate < v_threshold_rate
     and low_box_concept_count >= v_threshold_low then
    applied := true;
    reason := format('최근 정답률 %.2f < 기준 %.2f, 낮은 박스 %s ≥ %s',
                     recent_correct_rate, v_threshold_rate,
                     low_box_concept_count, v_threshold_low);
    adjusted_mix := normalize_level_mix(adjusted_mix);
  else
    applied := false;
    reason := '조정 조건 미충족';
    adjusted_mix := null;
  end if;

  return next;
end;
$$;
-- get_difficulty_adjustment: 번들 지표 기반 난이도 조정 판단

commit;
