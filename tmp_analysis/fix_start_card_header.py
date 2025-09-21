import pathlib

path = pathlib.Path(r"c:/actnow-coding/english-learning-app/components/dashboard/start-learning-card.tsx")
lines = path.read_text(encoding="utf-8").splitlines()
lines[1] = "// 역할: 학습 시작 카드와 이용 제한 안내를 담당"
lines[2] = "// 의존관계: components/dashboard/session-type-modal.tsx, app/api/learn/check, app/api/sessions"
lines[3] = "// 포함 함수: StartLearningCard()"
path.write_text("\n".join(lines) + "\n", encoding="utf-8")
