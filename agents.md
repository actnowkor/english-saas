# AGENTS.md

## General Rules
- **Comments and Chat Responses**: Always written in Korean.
- **Code Header**: At the very top of every file, include a summary block with:
  - **File path** (relative to project root).
  - **Main purpose/role of the file**.
  - **Dependencies** (connections to other files/modules).
  - **Short list of included functions or key features**.

## Code Style
- Use consistent indentation (2 spaces).
- Prefer clear, simple variable names in English.
- Avoid unnecessary complexity; functions should be small and single-purpose.

## Documentation & Structure
- Each function must be followed by a short Korean comment explaining its role.
- 코드에 적힌 한글 주석이 깨지지 않도록 한다.
- For exported functions/components: include usage notes (Korean).
- Organize code into logical sections: imports, constants, main logic, exports.

## Communication Rules
- All explanations in chat (assistant replies) are in Korean, even when the code itself is in English.
- When providing code, include the Korean summary block at the start of the file as described above.
- If asked to modify or extend code, keep the same commenting and structure rules.

## Example File Header
```ts
// 경로: app/api/sessions/[id]/route.ts
// 역할: 세션 메타 + 스냅샷 조회 API 엔드포인트
// 의존관계: db/client.ts, lib/auth.ts
// 포함 함수: getSessionById(), validateUser(), returnSnapshot()
````
## Error Handling

* 기본적인 입력값 체크와 null/undefined 방어 정도만 작성.
* 과도한 예외 처리 로직은 만들지 않는다.

## Testing

* 필수 핵심 함수에만 간단한 예시 테스트 작성.
* 과도한 테스트 커버리지 요구 없음.

```
