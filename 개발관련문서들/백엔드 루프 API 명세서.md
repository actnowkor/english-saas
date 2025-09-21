# 영어 학습 SaaS — 백엔드 루프 API 명세서

## 개요

* 목적: **출제 → 제출 → 채점 → 라이트너(SRS) 갱신 → 세션 완료** 루프를 API로 노출
* 설계 원칙: 각 API는 **Postgres Function 1:1 호출**을 래핑
* 인증: 서버사이드에서 **Supabase Service Role 키**로 호출 권장(클라이언트 직접 호출 금지)
* 포맷: `JSON` 요청/응답, `UTF-8`

### 공통

* Base URL(예시): `https://<PROJECT>.supabase.co/functions/v1` (Edge Functions 사용 시)
  또는 **Next.js Route Handlers** 기준 `https://<YOUR_DOMAIN>/api`
* Headers

  * `Content-Type: application/json`
  * `Authorization: Bearer <SERVICE_ROLE_KEY>` (서버사이드에서만 사용)
* 에러 포맷(통일):

```json
{ "error": { "code": "STRING_CODE", "message": "사람이 읽을 수 있는 설명", "details": {} } }
```

---

## 1) 세션 시작 / 출제

### Endpoint

`POST /sessions`

### 설명

* **start\_session(user\_id, count)** 를 호출해 학습 세션을 만들고, **출제된 문항 스냅샷**을 생성합니다.

### Request

```json
{
  "user_id": "uuid-사용자ID",
  "target_item_count": 10
}
```

* `target_item_count` 생략 시 기본값 10

### Response (성공)

```json
{
  "session_id": "uuid-세션ID"
}
```

> 기본 사양은 함수 반환값과 동일하게 `session_id`만 반환.
> 필요 시 `?expand=items` 쿼리파라미터를 추가해 세션 내 출제 문항 목록을 함께 반환하는 확장도 가능(선택).

### Response (에러 예시)

```json
{ "error": { "code": "USER_NOT_FOUND", "message": "user_id가 존재하지 않습니다." } }
```

### 매핑

* Function: `start_session(p_user_id uuid, p_count int default 10) returns uuid`

### cURL 예시

```bash
curl -X POST "$BASE_URL/sessions" \
  -H "Authorization: Bearer $SERVICE_ROLE" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<USER_UUID>","target_item_count":5}'
```

---

## 2) 답안 제출

### Endpoint

`POST /attempts`

### 설명

* **submit\_attempt(session\_id, item\_id, answer\_raw, latency\_ms)** 호출로 사용자의 답안을 기록합니다.

### Request

```json
{
  "session_id": "uuid-세션ID",
  "item_id": "uuid-아이템ID",
  "answer_raw": "사용자 원문 답안",
  "latency_ms": 3200
}
```

### Response (성공)

```json
{ "attempt_id": "uuid-시도ID" }
```

### Response (에러 예시)

```json
{ "error": { "code": "INVALID_SESSION_OR_ITEM", "message": "세션 또는 아이템이 유효하지 않습니다." } }
```

### 매핑

* Function: `submit_attempt(p_session_id uuid, p_item_id uuid, p_answer_raw text, p_latency_ms int) returns uuid`

### cURL 예시

```bash
curl -X POST "$BASE_URL/attempts" \
  -H "Authorization: Bearer $SERVICE_ROLE" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"<SESSION_UUID>","item_id":"<ITEM_UUID>","answer_raw":"There is a cat on the mat.","latency_ms":2800}'
```

---

## 3) 채점(룰 기반)

### Endpoint

POST /grades

설명

외부 채점 모듈(AI 또는 규칙 로직)이 판정 결과 전체를 JSON으로 제공.

DB 함수 save_grade를 호출해 저장.

Request
{
  "attempt_id": "uuid-시도ID",
  "label": "near_miss",                // correct | wrong | variant | near_miss
  "feedback_short": "관사가 빠졌어요.",
  "minimal_rewrite": "There is a cat.",
  "error_tags": ["article_missing"],   // 선택: ["preposition_error","be_omitted"] 등
  "judge": "rule",                     // 기본값: rule (또는 ai)
  "evidence": { "rule_version": "v2" } // 선택: 판정 근거 (AI 결과, 규칙 로그 등)
}

Response (성공)
{
  "attempt_id": "uuid-시도ID",
  "label": "near_miss",
  "feedback_short": "관사가 빠졌어요.",
  "minimal_rewrite": "There is a cat.",
  "error_tags": ["article_missing"],
  "judge": "rule",
  "saved_at": "2025-09-01T10:20:30Z"
}

Response (에러 예시)
{
  "error": {
    "code": "ATTEMPT_NOT_FOUND",
    "message": "해당 attempt_id가 존재하지 않습니다."
  }
}

---

## 4) 라이트너(SRS) 갱신

### Endpoint

`POST /srs/update`

### 설명

* **update\_srs(session\_id)** 를 호출하여, 해당 세션 내 채점 결과로

  * **단어/문구** → `user_item_status`
  * **문장(개념)** → `user_concept_status`
    를 **라이트너 박스 규칙**에 따라 갱신합니다.

### 라이트너 박스 규칙(기본 정책)

* 맞음(`correct`/`variant`) → **box\_level = +1 (최대 5)**
* 틀림(`wrong`/`near_miss`) → **box\_level = 1**
* 간격표(다음 복습일): box1=0d, box2=1d, box3=3d, box4=7d, box5=14d
* 분기:

  * **단어/문구(Item)** 은 `user_item_status`로
  * **문장(Concept)** 은 `user_concept_status`로

### Request

```json
{ "session_id": "uuid-세션ID" }
```

### Response (성공)

* 함수는 `void`이므로 다음 두 방식 중 하나 선택:

  * `204 No Content`
  * 또는

```json
{ "status": "ok" }
```

### Response (에러 예시)

```json
{ "error": { "code": "NO_GRADED_ATTEMPTS", "message": "해당 세션에 채점된 시도가 없습니다." } }
```

### 매핑

* Function: `update_srs(p_session_id uuid) returns void`

### cURL 예시

```bash
curl -X POST "$BASE_URL/srs/update" \
  -H "Authorization: Bearer $SERVICE_ROLE" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"<SESSION_UUID>"}'
```

---

## 5) 세션 완료

### Endpoint

`POST /sessions/{id}/complete`

### 설명

* **complete\_session(session\_id)** 호출로 세션을 `completed` 상태로 전환하고 종료 시간을 기록합니다.

### Request

* Path: `id = session_id(UUID)`
* Body: 필요 없음(또는 아래처럼 명시적으로 포함해도 무방)

```json
{ "session_id": "uuid-세션ID" }
```

### Response (성공)

```json
{ "status": "completed", "ended_at": "2025-09-01T10:30:00Z" }
```

### Response (에러 예시)

```json
{ "error": { "code": "SESSION_NOT_FOUND", "message": "해당 세션이 존재하지 않습니다." } }
```

### 매핑

* Function: `complete_session(p_session_id uuid) returns void`

### cURL 예시

```bash
curl -X POST "$BASE_URL/sessions/<SESSION_UUID>/complete" \
  -H "Authorization: Bearer $SERVICE_ROLE" \
  -H "Content-Type: application/json"
```

---

## (선택) 조회용 보조 엔드포인트

> 아래는 테스트 편의를 위한 추천 조회 API입니다(필수 아님).

### GET /sessions/{id}

* 응답: 세션 메타 + `session_items` 요약(문항 수, order\_index 등)

### GET /sessions/{id}/attempts

* 응답: 제출 목록(최근순), `grades.label` 조인 포함

### GET /srs/summary?user\_id=...

* 응답: `user_item_status` & `user_concept_status`에서 다음 복습 예정(`next_due_at`) 상위 N개

---

## 에러 코드 표(권장)

| code                       | 의미                    | 대응      |
| -------------------------- | --------------------- | ------- |
| USER\_NOT\_FOUND           | user\_id가 존재하지 않음     | 400     |
| INVALID\_SESSION           | 세션 ID 형식/존재 문제        | 400/404 |
| INVALID\_SESSION\_OR\_ITEM | 세션/아이템 관계 불일치         | 400     |
| ATTEMPT\_NOT\_FOUND        | attempt\_id가 존재하지 않음  | 404     |
| ALREADY\_GRADED            | 해당 시도는 이미 채점 완료       | 409     |
| NO\_GRADED\_ATTEMPTS       | 해당 세션에 채점된 시도가 없음     | 409     |
| DB\_CONSTRAINT             | 제약조건 위반(ENUM 값 불일치 등) | 400     |
| INTERNAL\_ERROR            | 서버 내부 오류              | 500     |

---

## 보안/운영 가이드

* **개발/테스트 단계**: RLS 끄고, **Service Role**로 서버사이드 호출
* **운영 전환 시**:

  1. 테이블에 **RLS 활성화**
  2. `auth.uid()` 기반 **정책(policy)** 추가
  3. API는 **서버사이드에서만** DB 함수 호출(클라이언트는 절대 Service Role 보지 않음)
* 로깅: 모든 함수 호출에 대해 **요청ID / user\_id / session\_id / attempt\_id**를 로깅하면 디버깅 쉬움


## 비즈니스 로직 노트(핵심 반영 내용)

* **스냅샷 기준 채점**: 항상 `session_items.snapshot_json`의 정답/변형을 기준 (원본 변경과 무관하게 재현성 보장)
* **라이트너 분기**:

  * **단어/문구**는 `user_item_status`, \*\*문장(개념)\*\*은 `user_concept_status`
* **박스 레벨 규칙**: 맞으면 승급, 틀리면 초기화, **간격표** 적용(box1=0d → box5=14d)
* **확장 여지**: `variant`/`near_miss`/`error_tags`/`minimal_rewrite` 등은 규칙 고도화 시 채점 함수 개선으로 바로 반영 가능

---

3. API 흐름 요약 (업데이트 후)

사용자 답안 제출
→ POST /attempts → attempt_id 발급

비즈니스 로직(앱 서버)

attempt_id 기반으로 session_items.snapshot_json 불러오기

규칙 채점 or AI 호출

판정 결과(JSON) 생성

채점 결과 저장
→ POST /grades

외부 로직 결과를 그대로 전달

DB는 단순 저장 & 이력 관리만 수행

SRS 갱신
→ POST /srs/update

grades.label만 보고 라이트너 업데이트

4. UI/로직 설계 관점 컨텍스트

-UI (교사/학습자용 화면)

feedback_short = 즉시 피드백 텍스트

minimal_rewrite = 수정 예시 제시

error_tags = 에러 카테고리 아이콘/태그 표시

-비즈니스 로직

채점 알고리즘을 자유롭게 바꿀 수 있음 (룰엔진 → AI, 또는 혼합)

DB는 채점판정 저장소 역할만 하므로, 알고리즘 교체 시 DB 수정 불필요

-운영 확장

AI 사용 시 judge="ai", evidence={모델 버전, 프롬프트} 기록 가능

A/B 테스트, 채점 정확도 검증에도 유리

-데이터베이스 구조 변경 여부

추가 변경 없음 

기존 grades 테이블 필드(label, feedback_short, minimal_rewrite, error_tags, judge, evidence_json)를 그대로 활용.

단지 grade_attempt 함수 제거 → save_grade 함수 추가로만 변경.

요약:

DB는 단순 기록소,

채점/피드백 로직은 앱 코드에서 처리,

API는 POST /grades로 판정 결과 전체를 저장.
