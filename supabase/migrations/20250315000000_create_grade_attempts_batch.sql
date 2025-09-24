-- 경로: supabase/migrations/20250315000000_create_grade_attempts_batch.sql
-- 역할: attempts·grades 동시 저장용 grade_attempts_batch RPC 생성
-- 의존관계: public.submit_attempt, public.save_grade
-- 포함 함수: grade_attempts_batch()

create or replace function public.grade_attempts_batch(
  p_session_id uuid,
  p_attempts jsonb
)
returns table (
  item_id uuid,
  attempt_id uuid,
  label text,
  feedback text,
  minimal_rewrite text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  new_attempt uuid;
begin
  if p_attempts is null or jsonb_array_length(p_attempts) = 0 then
    return;
  end if;

  for rec in
    select *
    from jsonb_to_recordset(p_attempts) as x(
      item_id uuid,
      answer_raw text,
      latency_ms integer,
      label text,
      feedback text,
      minimal_rewrite text,
      error_tags jsonb,
      judge text,
      evidence jsonb
    )
  loop
    new_attempt := public.submit_attempt(
      p_session_id => p_session_id,
      p_item_id => rec.item_id,
      p_answer_raw => coalesce(rec.answer_raw, ''),
      p_latency_ms => rec.latency_ms
    );

    perform public.save_grade(
      p_attempt_id => new_attempt,
      p_label => coalesce(rec.label, 'wrong'),
      p_feedback => coalesce(rec.feedback, ''),
      p_minimal_rewrite => coalesce(rec.minimal_rewrite, null),
      p_error_tags => coalesce(rec.error_tags, '[]'::jsonb),
      p_judge => coalesce(rec.judge, 'rule'),
      p_evidence => coalesce(rec.evidence, '{}'::jsonb)
    );

    item_id := rec.item_id;
    attempt_id := new_attempt;
    label := coalesce(rec.label, 'wrong');
    feedback := coalesce(rec.feedback, '');
    minimal_rewrite := rec.minimal_rewrite;
    return next;
  end loop;
end;
$$;
