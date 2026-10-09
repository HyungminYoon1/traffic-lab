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

## D04 — 시드 기반 사건과 예산형 개입 / 2026-10-09

- Context: 수동 슬라이더 실험을 실제 선택과 목표가 있는 교통 제어 도전으로 확장하되 1 km 단일 차로와 정적 호스팅을 보존해야 합니다. 이번 작업은 로컬 구현·검증만 승인되었고 커밋·푸시·배포·원격 쓰기는 금지되었습니다.
- Options: 교차로/다차로 게임; 즉시 영구적으로 설정을 바꾸는 슬라이더; 기존 모델 안의 예정된 교란과 제한 시간 개입.
- Decision: 180/240초의 세 도전, 정수 시드 1–9999, 지정 시각의 동일 차량 번호 급제동 및 420–580 m 구간의 희망 속도 제한. 개입은 전체 차량의 희망 속도와 목표 차간 시간을 함께 30/60초 바꾸고 1/2점을 소비합니다. 예산은 도전별 4/6/5점. 유지 중 교체·중첩·환불은 허용하지 않으며 만료 시 원래 조건으로 복귀합니다. 도전에서는 임의 차량 수 변경·추가 급제동을 막고 자유 실험으로 제공합니다.
- Rationale: 속도 억제, 여유 확보, 회복 시점과 조밀한 대열의 선택이 실제 파동에 영향을 주고 시간을 배분해야 합니다. 원래 차로·차량 보존·IDM 참고 계산을 유지하며 난도를 외형에만 의존하지 않습니다.
- Affected: dist/src/model.js, dist/src/challenge.js, dist/src/app.js, dist/index.html, dist/styles.css, test/challenge.test.js, README.md, architecture.md.
- Review: 개입은 운전자 반응 설정 실험이며 현실의 안전거리/교통 정책 권고가 아닙니다. 사건·목표·예산 조정 시 대표 전략과 무개입 실패를 다시 확인해야 합니다. 모든 시드의 성공 가능성을 전수 증명한 것은 아닙니다.

## D05 — 같은 출발 상태와 이동량으로 비교·평가 / 2026-10-09

- Context: 희망 속도 설정을 올린 것과 실제 흐름 개선을 구분하고, 마지막 순간의 빠른 차량 한 대가 성공으로 표시되는 것을 막아야 합니다.
- Options: 순간 평균 속도만 평가; 임의 점수/자동 성공; 같은 시드의 무개입 대조군과 구간 집계.
- Decision: 같은 출발 상태·사건 시각·차량 번호의 독립된 무개입 도로를 병렬 계산합니다. 출발 평균과 이후 최근 구간을 표시합니다. 흐름은 실제 이동 거리 합계 ÷ 1000 m ÷ 구간 초 × 3600, 속도는 구간 평균 km/h, 안정성은 매 단계 차량 속도 표준편차의 구간 평균입니다. 시작점 누적 통과 대수는 별도의 검지기 측정이며 유출량으로 표현하지 않습니다. 정해진 중간 시각의 직전 20초 흐름·편차 검사와 종료 직전 60초의 흐름·편차·무개입 대비 개선을 모두 통과해야 성공입니다. 동등한 경계값은 통과, 부족한 측정 구간 및 비유한 값은 실패 처리합니다.
- Rationale: 고정 차량 수에서 속도와 환산 흐름은 연관되지만 단위가 다르고, 밀도가 달라지면 같은 속도도 흐름이 달라집니다. 중간 목표는 후반에만 개입해서 초반 회복 실패를 덮는 전략을 막습니다. 대조군은 출발 전 상태와 동일 시각의 무개입 결과를 구분합니다.
- Affected: dist/src/model.js, dist/src/challenge.js, dist/src/app.js, dist/index.html, test/model.test.js, test/challenge.test.js, docs/verification.md.
- Review: 개입 후 같은 차량 번호의 위치는 달라집니다. 이것은 동일 차량에 대한 사건 비교이며 동일 지점의 급제동 비교가 아닙니다. 흐름 값은 실제 도로 실측이나 출구 처리량이 아닙니다.

## D06 — 순수 계산, 제한된 메모리와 재현 가능한 조작 / 2026-10-09

- Context: 도전 추가 후에도 UI 배속·화면 재생률·일시 정지가 모델 판정을 바꾸지 않아야 합니다. 저장·서버·분석 기능 추가는 승인되지 않았습니다.
- Options: DOM 이벤트에서 직접 판정; 벽시계 기반 사건; 모델의 정수 단계와 순수 도전 모듈.
- Decision: 사건·평가·예산은 challenge.js에서 모델 정수 tick으로 처리하고 항상 0.05초씩 계산합니다. step 함수도 다른 간격을 거절하여 계산 규칙을 강제합니다. 도로/제한 구간 설정은 명시적인 유한 숫자만 받고 알려지지 않은 도로 설정은 거절합니다. 준비/재시도는 정지 상태로 시작하며 10초 진행을 지원합니다. 실행당 차량 60대, 두 도로, 1200개 측정 샘플, 도로별 그래프 240개, 최대 6개 개입 기록으로 제한합니다. UI와 선택적 WebMCP는 같은 검증 함수를 사용하고 도전 중 자유 설정 우회를 거절합니다. 세션·시드·기록은 브라우저 메모리에만 두며 페이지 종료 시 사라집니다.
- Rationale: 기존 순수 모델/UI 경계를 유지하고 접근 가능한 단계 관찰 및 같은 시드의 재검토가 가능합니다. 새로운 네트워크 연결·계정·저장소가 필요 없습니다.
- Affected: architecture.md, dist/src/challenge.js, dist/src/app.js, dist/index.html, tools/check.mjs, test/challenge.test.js.
- Review: 실제 브라우저 조작·모바일 레이아웃·선택적 WebMCP 확인은 메인 담당자의 별도 QA이며 이번 구현 담당자는 NOT_RUN으로 인계합니다. 기존 배포 전 브라우저 기록을 이번 변경의 증거로 재사용하지 않습니다.
