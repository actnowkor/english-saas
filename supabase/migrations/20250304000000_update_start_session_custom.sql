-- 경로: supabase/migrations/20250304000000_update_start_session_custom.sql
-- 역할: start_session_custom 함수에서 난이도 조정 호출 제거 및 전략 JSON 정리
-- 의존관계: public.policy_thresholds, public.users, public.policy_level_mix, public.policy_type_weights, public.sessions, public.session_items, public.items, public.attempts, public.user_item_status, public.user_concept_status, public.normalize_level_mix, public.get_user_level_stats
-- 포함 함수: start_session_custom()

begin;

create or replace function public.start_session_custom(
  p_user_id uuid,
  p_type session_type,
  p_count int default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_default_count int;
  v_count int;
  v_force_new boolean;
  v_min_attempts int;
  v_review_due_first boolean;
  v_weak_requires_history boolean;

  v_current_level int;
  v_base_level_mix jsonb;
  v_applied_level_mix jsonb;
  v_type_weights jsonb;

  v_level_attempts int;
  v_effective_type session_type;

  tgt_review int := 0;
  tgt_new    int := 0;
  tgt_weak   int := 0;

  v_stats record;
begin
  select default_session_size,
         per_level_min_attempts_for_review,
         force_new_when_below_threshold,
         review_due_first,
         weak_requires_history
  into v_default_count, v_min_attempts, v_force_new, v_review_due_first, v_weak_requires_history
  from policy_thresholds
  order by updated_at desc
  limit 1;

  v_count := coalesce(p_count, v_default_count);

  select coalesce(u.current_level, 1)
  into v_current_level
  from users u
  where u.id = p_user_id;

  select plm.level_weights
  into v_base_level_mix
  from policy_level_mix plm
  where plm.level = v_current_level;

  if v_base_level_mix is null then
    v_base_level_mix := jsonb_build_object(v_current_level::text, 1.0);
  end if;

  v_applied_level_mix := normalize_level_mix(v_base_level_mix);

  select ptw.weights
  into v_type_weights
  from policy_type_weights ptw
  where ptw.session_type = p_type;

  if v_type_weights is null then
    v_type_weights := jsonb_build_object('review', 0.5, 'new', 0.3, 'weak', 0.2);
  end if;

  select coalesce(count(*), 0)
  into v_level_attempts
  from attempts a
  join session_items si on si.session_id = a.session_id and si.item_id = a.item_id
  where a.session_id in (select id from sessions where user_id = p_user_id)
    and (si.snapshot_json->>'level')::int = v_current_level;

  if v_force_new and v_level_attempts < v_min_attempts then
    v_effective_type := 'new_only';
  else
    v_effective_type := p_type;
  end if;

  if v_effective_type = 'new_only' then
    tgt_new := v_count;
  else
    tgt_review := floor((coalesce(v_type_weights->>'review', '0'))::numeric * v_count)::int;
    tgt_new    := floor((coalesce(v_type_weights->>'new', '0'))::numeric    * v_count)::int;
    tgt_weak   := floor((coalesce(v_type_weights->>'weak', '0'))::numeric   * v_count)::int;

    while (tgt_review + tgt_new + tgt_weak) < v_count loop
      if v_effective_type = 'review_only' then
        tgt_review := tgt_review + 1;
      elsif v_effective_type = 'weak_focus' then
        tgt_weak := tgt_weak + 1;
      else
        tgt_review := tgt_review + 1;
      end if;
    end loop;
  end if;

  drop table if exists tmp_final_ids;
  create temporary table tmp_final_ids on commit drop as
  with
  lvl as (
    select (key)::int as lvl, (value)::numeric as w
    from jsonb_each(v_applied_level_mix)
    order by 1
  ),

  review_targets as (
    select lvl,
           base + case
             when row_number() over (order by frac desc, lvl) <= (tgt_review - sum(base) over ())
             then 1 else 0 end as target
    from (
      select lvl,
             floor((w * tgt_review))::int as base,
             ((w * tgt_review) - floor(w * tgt_review)) as frac
      from lvl
    ) s
  ),
  weak_targets as (
    select lvl,
           base + case
             when row_number() over (order by frac desc, lvl) <= (tgt_weak - sum(base) over ())
             then 1 else 0 end as target
    from (
      select lvl,
             floor((w * tgt_weak))::int as base,
             ((w * tgt_weak) - floor(w * tgt_weak)) as frac
      from lvl
    ) s
  ),
  new_targets as (
    select lvl,
           base + case
             when row_number() over (order by frac desc, lvl) <= (tgt_new - sum(base) over ())
             then 1 else 0 end as target
    from (
      select lvl,
             floor((w * tgt_new))::int as base,
             ((w * tgt_new) - floor(w * tgt_new)) as frac
      from lvl
    ) s
  ),

  user_seen as (
    select distinct si.item_id
    from session_items si
    join sessions s on s.id = si.session_id
    where s.user_id = p_user_id
    union
    select distinct a.item_id
    from attempts a

    join sessions s on s.id = a.session_id
    where s.user_id = p_user_id
  ),
  review_items as (
    select i.id, i.level, i.created_at,
           coalesce(uis.next_due_at, now()) as due_at,
           case when uis.next_due_at <= now() then 1 else 0 end as is_due
    from items i
    join user_item_status uis on uis.item_id = i.id and uis.user_id = p_user_id
    where i.status in ('draft', 'approved')
  ),
  weak_items as (
    select i.id, i.level,
           coalesce(uis.wrong_count, 0) + coalesce(ucs.wrong_count, 0) as wscore,
           greatest(coalesce(uis.wrong_count, 0), coalesce(ucs.wrong_count, 0)) as maxw
    from items i
    left join user_item_status uis on uis.item_id = i.id and uis.user_id = p_user_id
    left join user_concept_status ucs on ucs.user_id = p_user_id and ucs.concept_key = i.concept_key
    where i.status in ('draft', 'approved')
      and (coalesce(uis.total_attempts, 0) + coalesce(ucs.total_attempts, 0)) > 0
  ),
  new_items as (
    select i.id, i.level, i.created_at
    from items i
    left join user_seen us on us.item_id = i.id
    where i.status in ('draft', 'approved')
      and us.item_id is null
  ),
  pick_review as (

    select ranked.id
    from (
      select ri.id,
             ri.level,
             row_number() over (
               partition by ri.level
               order by (case when v_review_due_first then ri.is_due else 0 end) desc,
                        (case when v_review_due_first then ri.due_at else ri.created_at end) asc
             ) as lvl_rank,
             rt.target
      from review_items ri
      join review_targets rt on rt.lvl = ri.level
      where rt.target > 0
    ) ranked
    where ranked.lvl_rank <= ranked.target
  ),
  pick_weak as (
    select ranked.id
    from (
      select wi.id,
             wi.level,
             row_number() over (
               partition by wi.level
               order by wi.wscore desc, wi.maxw desc
             ) as lvl_rank,
             wt.target
      from weak_items wi
      join weak_targets wt on wt.lvl = wi.level
      where wt.target > 0
        and ((not v_weak_requires_history) or wi.maxw > 0)
    ) ranked
    where ranked.lvl_rank <= ranked.target
  ),
  pick_new as (
    select ranked.id
    from (
      select ni.id,
             ni.level,
             row_number() over (
               partition by ni.level
               order by random()
             ) as lvl_rank,
             nt.target
      from new_items ni
      join new_targets nt on nt.lvl = ni.level
      where nt.target > 0
    ) ranked
    where ranked.lvl_rank <= ranked.target

  ),
  picked as (
    select id from pick_review
    union all
    select id from pick_weak
    union all
    select id from pick_new
  ),
  picked_dedup as (
    select distinct id from picked
  ),

  fill_total as (
    select greatest(v_count - (select count(*) from picked_dedup), 0) as total
  ),
  fill_targets as (
    select lvl,
           base + case
             when row_number() over (order by frac desc, lvl) <= (s.total - sum(base) over ())
             then 1 else 0 end as target
    from (
      select lvl,
             floor((w * ft.total))::int as base,
             ((w * ft.total) - floor(w * ft.total)) as frac,
             ft.total
      from lvl cross join fill_total ft
    ) s
  ),

  fill_candidates as (
    select id, level, min(priority) as priority
    from (
      select ni.id, ni.level, 1 as priority
      from new_items ni
      union all
      select ri.id, ri.level, 2 as priority
      from review_items ri
      union all
      select wi.id, wi.level, 3 as priority
      from weak_items wi
    ) raw
    group by id, level
  ),
  fillup as (
    select ranked.id
    from (
      select fc.id,
             fc.level,
             row_number() over (
               partition by fc.level
               order by fc.priority, random()
             ) as lvl_rank
      from fill_candidates fc
      join lvl on lvl.lvl = fc.level
      left join picked_dedup pd on pd.id = fc.id
      where pd.id is null
    ) ranked
    join fill_targets ft on ft.lvl = ranked.level
    where ranked.lvl_rank <= ft.target

  )
  select id
  from (
    select id from picked_dedup
    union all
    select id from fillup
    limit v_count
  ) f;

  select * into v_stats
  from get_user_level_stats(p_user_id);

  insert into public.sessions (user_id, status, target_item_count, started_at, strategy_json)
  values (
    p_user_id,
    'in_progress',
    v_count,
    now(),
    jsonb_build_object(
      'type', v_effective_type::text,
      'targets', jsonb_build_object('review', tgt_review, 'weak', tgt_weak, 'new', tgt_new),
      'underfilled', (select count(*) from tmp_final_ids) < v_count,
      'filled', (select count(*) from tmp_final_ids),
      'base_level_mix', v_base_level_mix,
      'applied_level_mix', v_applied_level_mix,
      'adjustment', jsonb_build_object(
        'applied', false,
        'reason', '',
        'policy_level', null,
        'recent_correct_rate', null,
        'low_box_concept_count', null
      ),
      'stats_snapshot', to_jsonb(v_stats)
    )
  )
  returning id into v_session_id;

  insert into public.session_items (session_id, item_id, order_index, snapshot_json)
  select v_session_id,
         i.id,
         row_number() over (order by i.created_at desc) as order_index,
         jsonb_build_object(
           'id', i.id,
           'type', i.type,
           'level', i.level,
           'difficulty', i.difficulty,
           'concept_key', i.concept_key,
           'source_ko', i.source_ko,
           'answer_en', i.answer_en,
           'allowed_variants_text', i.allowed_variants_text,
           'near_misses_text', i.near_misses_text
         )
  from items i
  where i.id in (select id from tmp_final_ids);

  return v_session_id;
end;
$$;

commit;
