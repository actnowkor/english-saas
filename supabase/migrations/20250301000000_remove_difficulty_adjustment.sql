-- 경로: supabase/migrations/20250301000000_remove_difficulty_adjustment.sql
-- 역할: 난이도 하향 조정을 위한 함수와 정책 테이블 제거
-- 의존관계: public.get_difficulty_adjustment, public.policy_level_adjustments
-- 포함 함수: get_difficulty_adjustment 제거, policy_level_adjustments 테이블 제거

begin;

drop function if exists public.get_difficulty_adjustment(uuid);

drop table if exists public.policy_level_adjustments;

commit;
