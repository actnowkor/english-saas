좋아요. “온보딩은 최초 1회만 노출”로 바꾸는 걸 기준으로, 코드 없이 단계별로 정리해드릴게요. (말씀하신 대로 “선호 레벨”이 아니라 “현재 레벨(current level)”을 기준으로 판단합니다.)

# 1) 데이터베이스 변경(스키마/마이그레이션)

1. `users`(또는 `profiles`) 테이블에 컬럼 추가

* `current_level` (INT, NULL 허용)

  * 의미: 유저의 현재 학습 레벨. **NULL이면 아직 온보딩 미완료**로 간주.
  * 온보딩 완료 시 최초 1회 값이 세팅됨. 이후에는 서비스 로직에 따라 업데이트될 수 있음.
* (선택) `onboarded_at` (TIMESTAMP, NULL 허용)

  * 의미: 온보딩 완료 시각(추적/분석용). 온보딩 제어는 `current_level`만으로도 충분하지만, 운영/로그 분석을 위해 추천.

2. 초기 데이터 상태

* 기존 유저: 기본값 `current_level = NULL` (다음 로그인 시 온보딩으로 유도됨)
* 신규 유저: 회원가입 → 프로필 생성 시 `current_level = NULL`로 시작

3. RLS/권한

* 유저가 **자기 자신의** `current_level`만 읽고/수정 가능하도록 기존 RLS 정책에 read/update 권한 확인(정책에 “user\_id = auth.uid()” 같은 소유자 조건 필요).
* 추가 컬럼이 RLS에 막히지 않도록 정책 범위에 포함되는지 점검.

# 2) 백엔드/서버 로직 변경

1. 로그인 후 프로필 조회 API/쿼리에서 `current_level` 포함해 응답

* 세션이 생기면 `GET /me` 또는 `getUserProfile()`에서 `current_level`를 항상 리턴.

2. 온보딩 완료 처리 엔드포인트(또는 액션)

* 온보딩 화면에서 최종 “시작하기/완료” 액션 시:

  * `current_level`을 유저가 선택/판정한 값으로 **업데이트**
  * (선택) `onboarded_at`도 함께 기록
  * 정상 저장되면 대시보드로 리다이렉트

3. (선택) 데이터 정합성 가드

* 이미 `current_level`이 설정된 유저가 온보딩 완료 엔드포인트를 다시 호출하면 **변경 금지** 또는 “이미 완료됨” 에러/무시 처리(원치 않는 덮어쓰기 방지).

# 3) 프런트엔드 라우팅/가드 변경

1. “로그인 후 최초 진입” 가드

* 앱 초기화 시점(예: `_app`, `layout`, 전역 가드, 또는 `/` 진입 시)에서 **프로필 fetch → `current_level` 체크**

  * `current_level === NULL` → `/onboarding`로 이동
  * `current_level !== NULL` → `/dashboard`로 이동

2. 온보딩 페이지 진입 가드

* 이미 온보딩 완료(`current_level !== NULL`) 상태에서 `/onboarding`로 접근 시 `/dashboard`로 리다이렉트(직접 URL 입력 방지)

3. 새로고침/재접속 시 동작

* 모든 보호 라우트(예: `/dashboard`, `/study` 등) 진입 전에 공통으로 **프로필 상태를 갱신하여** 위 규칙 유지
* 캐시/스토리지에 의존하지 말고, 세션이 유효하면 서버/DB 기준으로 판별

# 4) 변경해야 할 파일(예시 구조)

> 실제 폴더/파일명은 현재 프로젝트 구조에 맞춰 조정하세요.

* 백엔드/공용 API

  * `src/server/api/getUserProfile.(ts|js)` 또는 `src/lib/userProfile.(ts|js)`

    * `current_level`을 포함해 반환하도록 수정
  * `src/server/api/completeOnboarding.(ts|js)`

    * 온보딩 완료 시 `current_level` 업데이트(+ `onboarded_at`) 처리

* 프런트엔드 라우팅/가드

  * `src/app/(root)/layout.(tsx|vue|jsx)` 또는 `_app`/전역 가드 컴포넌트

    * 프로필 로드 → `current_level` 기준 리다이렉트 로직 추가
  * `src/pages/onboarding.(tsx|vue|jsx)`

    * 완료 액션에서 완료 API 호출 후 `/dashboard`로 이동
    * 이미 완료 상태면 마운트 시 `/dashboard`로 리다이렉트
  * `src/pages/dashboard.(tsx|vue|jsx)`

    * 별도 변경 없음(가드에서 걸러짐)

* DB 마이그레이션/모델

  * `supabase/migrations/xxxx_add_current_level.sql` (또는 Prisma/Drizzle 등)

    * `current_level`(nullable), (선택)`onboarded_at` 추가
  * RLS/정책 파일

    * 본인 행만 읽기/수정 가능하도록 정책 확인/보강

# 5) QA 체크리스트

* [ ] 신규 가입 → 로그인 → 온보딩 노출 → 완료 후 대시보드 진입
* [ ] 새로고침/브라우저 재접속(다른 탭 포함) → **온보딩 재노출 안 됨**
* [ ] 온보딩 도중 이탈 후 재접속 → 다시 온보딩부터 시작(미완이므로 `current_level = NULL`)
* [ ] 온보딩 완료 후 `/onboarding` 직접 입력 → 대시보드로 리다이렉트
* [ ] RLS: 본인만 자신의 `current_level` 조회/수정 가능
* [ ] 기존 유저(마이그레이션 후 `NULL`)도 정상적으로 온보딩 유도

# 6) 롤아웃/마이그레이션 계획

1. 스키마 배포: `current_level`/`onboarded_at` 컬럼 추가
2. 백엔드 배포: 프로필 응답/온보딩 완료 API 반영
3. 프런트 배포: 라우팅 가드/온보딩 완료 처리 반영
4. 점검: 운영 콘솔에서 임의 계정으로 시나리오 테스트
5. 모니터링: 오류 로그, 온보딩 완료율 지표 확인

# 7) 기획서에 추가할 문구(복붙용)


## 온보딩 노출 기준(최초 1회 정책)

* 목적: 유저의 **현재 학습 레벨**을 최초 1회 수집하여 개인화된 대시보드를 제공한다.
* 판별 로직: `users.current_level`이 **NULL이면** 온보딩 화면을 노출한다. 값이 존재하면 온보딩을 **재노출하지 않는다**.
* 최초 진입 흐름

  1. 로그인 완료 → 프로필 조회
  2. `current_level = NULL` → 온보딩 진입
  3. 유저가 레벨 선택/판정 → “시작하기”
  4. 서버에서 `current_level` 저장(필수), `onboarded_at` 저장(선택) → 대시보드로 이동
* 재접속/새로고침

  * 로그인 상태에서 재접속 시 서버의 `current_level` 값을 기준으로 즉시 라우팅한다. (`NULL`이 아니면 대시보드로 직행)
* 강제 접근 제어

  * 온보딩 완료(`current_level != NULL`) 상태에서 `/onboarding` URL 접근 시 자동으로 대시보드로 리다이렉트한다.
* 데이터 항목

  * `current_level` (int, nullable): 현재 학습 레벨. 온보딩 완료 여부의 판별 기준.
  * `onboarded_at` (timestamp, nullable, 선택): 온보딩 완료 시각(지표/분석용).
* 예외 및 에러 처리

  * 이미 `current_level`이 존재하는 계정은 온보딩 완료 API 요청을 무시하거나 “이미 완료됨” 메시지를 반환한다.
* 지표/로그

  * 온보딩 진입률, 완료율, 평균 소요 시간, 이탈 단계, 온보딩 후 24시간 내 재방문/학습 시작률을 수집한다.


레벨을 **온보딩 최초 1회 수집 + 이후 학습 기록에 따라 갱신**하려면 두 가지 확장이 필요합니다.

---

## 1. `users` 테이블 확장

온보딩 정책에 맞게 필드를 추가합니다.

* `current_level` (int, nullable):
  사용자의 현재 학습 레벨.
  → **온보딩 여부 판별**(NULL이면 온보딩 필요).
  → 학습/라이트너 데이터와 별개로 **대시보드에 바로 보여줄 현재값**.

* `onboarded_at` (timestamp, nullable):
  온보딩 완료 시각. 분석용 지표, 최초 진입 흐름 관리.

💡 이렇게 하면 로그인 시 `current_level`이 NULL인지 여부만 체크하면 되고, `onboarding/page.tsx` (이미 폴더 구조 있음)와 바로 연결됩니다.

---

## 2. 사용자 레벨 변화 기록용 새 테이블

레벨은 시간이 지남에 따라 변할 수 있으니 **히스토리 테이블**을 둬야 합니다.

### `user_level_history`

* `id` (uuid, pk)
* `user_id` (uuid, fk → users.id)
* `level` (int, not null): 변경된 레벨
* `source` (text): 변경 근거 (예: "onboarding", "auto\_assessment", "manual\_override")
* `changed_at` (timestamp, default now()): 변경 시각

💡 이 테이블에 누적 기록을 쌓아두면:

* 온보딩으로 시작한 최초 레벨 기록
* 세션/정답률 기반 자동 레벨 상향·하향 기록
* 관리자가 수동 조정한 경우도 남길 수 있음

---

## 3. 연계 방식

1. **온보딩 최초 진입**

   * `users.current_level = NULL` → 온보딩 화면 노출
   * 유저가 레벨 선택/판정 → API에서 `users.current_level`과 `users.onboarded_at` 저장
   * 동시에 `user_level_history`에 `"onboarding"` 소스로 기록 추가

2. **학습 중 자동 갱신**

   * 라이트너/세션 결과 기반으로 레벨이 바뀌면

     * `users.current_level` 업데이트
     * `user_level_history`에 `"auto_assessment"` 소스로 기록 남김

3. **대시보드/히스토리**

   * 현재 레벨은 `users.current_level`만 보면 됨
   * 과거 변화를 보고 싶으면 `user_level_history`를 조회

---

## 4. 요약

* `users`에 **current\_level, onboarded\_at** 필드를 추가
* 레벨 변화를 추적하기 위해 **user\_level\_history 테이블**을 신설
* 온보딩/자동 평가/관리자 조정 모두 이력에 남김
* 프론트는 `users.current_level`로 현재 레벨만 빠르게 확인하고, `user_level_history`는 분석·UI 확장용으로 활용

    — 복붙 끝 —
