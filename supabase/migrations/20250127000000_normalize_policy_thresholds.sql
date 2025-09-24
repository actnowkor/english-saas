-- 경로: supabase/migrations/20250127000000_normalize_policy_thresholds.sql
-- 역할: 레벨 정책 임계값을 0~1 비율로 정규화하는 데이터 마이그레이션
-- 의존관계: public.policy_level_up
-- 포함 기능: 정책 백분율 컬럼/JSON 값 정규화 업데이트

begin;

update public.policy_level_up
set min_correct_rate = round(min_correct_rate / 100, 4)
where min_correct_rate is not null
  and min_correct_rate > 1;

update public.policy_level_up
set min_box_level_ratio = round(min_box_level_ratio / 100, 4)
where min_box_level_ratio is not null
  and min_box_level_ratio > 1;

commit;
