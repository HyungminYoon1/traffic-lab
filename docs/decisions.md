# Decisions

## D01 — Static, independent implementation

- Context: the user approved implementing all six proposed services and adding them to WEB LAB.
- Options: merge into existing services; backend/Sites hosting; independent static Pages repositories.
- Decision: independent traffic-lab repository and public GitHub Pages, pure model separated from rendering, no dependencies or new paid services.
- Rationale: fits the current collection, keeps other releases untouched, supports local model verification.
- Affected: architecture.md, dist, test, tools and .github/workflows/pages.yml.
- Review: additions requiring server state or different hosting need a separate decision.

## D02 — Transient, bounded browser state

- Context: these experiments need configuration, not user accounts or retained visitor records.
- Options: server upload/analytics/history; transient browser memory and deliberate local output.
- Decision: no stored visitor state or uploaded data. Bound all controls and model work. Pixel imports, when applicable, never leave the browser; reject unsupported/oversized files and cap decoded work.
- Rationale: privacy and predictable resource use; no API credential or personal profile required.
- Affected: dist/src/model.js, dist/src/app.js, dist/index.html and optional WebMCP summaries.
- Review: do not add hidden persistence or make medical/real-traffic/benchmark claims from these models. Use GitHub noreply identity for commits.

## D03 — 계산과 조작의 경계

- Context: 설명만 표시하는 데 그치지 않고 조작한 조건에서 실제 결과를 계산해야 합니다.
- Options: 고정 애니메이션/결과 문구; 범위를 제한한 순수 모델과 동일 상태를 읽는 UI.
- Decision: SI 단위의 IDM 참고 단일 차로 모델입니다. 계산 간격은 0.05초, 감속은 하한을 두고 이전 앞차 위치를 넘지 않도록 이동을 제한합니다. 차선 변경·진입·신호등은 포함하지 않습니다. 평균 흐름은 차량 수×평균 속도÷도로 길이로 계산합니다.
- Rationale: 재현 가능한 검사와 읽을 수 있는 결과를 제공하고 브라우저 자원 사용을 제한합니다.
- Affected: dist/src/model.js, dist/src/app.js, dist/index.html, dist/styles.css and test/model.test.js.
- Review: 이는 모델 결과이지 실제 도로의 실측 수치가 아닙니다. 고밀도 충돌 방지 경계는 원래 IDM과 구별하여 문서화합니다.
