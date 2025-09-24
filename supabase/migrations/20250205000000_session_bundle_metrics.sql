-- 경로: supabase/migrations/20250205000000_session_bundle_metrics.sql
-- 역할: 세션 번들 기반 학습 지표 뷰와 함수 로직 업데이트
-- 의존관계: public.session_bundles, public.session_bundle_metrics, public.sessions, public.attempts, public.grades, public.user_concept_status, public.users
-- 포함 함수: session_bundle_metrics 뷰 정의, get_user_level_stats()

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

commit;
