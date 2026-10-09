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

## D07 — validatedReplaynottrustedterminalstate / 2026-10-09

- Context: 사용자가 제한된 기기 저장·정책 재생·내보내기/가져오기를 명시 승인했습니다. D02/D06의 메모리 전용 제한은 이 결정의 제한된 정책 저장 범위에서만 대체합니다. 단독 담당자는 traffic-lab만 수정하고 커밋·푸시·배포·계정 접근은 하지 않습니다.
- Options: 최종 도로/점수 스냅샷 복원; 무제한 실행 기록; 제한된 실제 입력만 저장하고 처음부터 재계산.
- Decision: 기존 캠페인 `idm-v1`과 세 도전의 목표·시드·IDM·예산을 유지합니다. 정책은 버전·캠페인·도전·시드·정수 tick·속도·차간 시간·30/60초 유지 시간만 포함합니다. 최대 6개, 중첩/역순/예산 초과/잘못된 값/도전 종료 이후의 시작 시각은 거절합니다. 기존 종료 직전 개입도 유지하며 30/60초 비용은 전부 사용하고 도전 종료 시 재생을 멈춥니다. JSON 4 KB, 저장 최대 10개·48 KiB, 실제 파일 크기를 먼저 검사합니다. 이름·계정·자유 HTML·최종 상태·점수는 받지 않습니다. 직접 성공만 전체 재계산으로 확인하여 동일 정책 항목에 `independent` 표시하고 자동 저장합니다. 가져오기/재생은 직접 성공을 부여하지 않습니다. 성공 정책이 삭제되면 그에 의존한 완료도 감소합니다. 저장 차단·한도 실패는 완료 저장 실패로 알립니다. 선택 삭제·전체 삭제를 제공하고 자동 축출은 하지 않습니다.
- Rationale: 동일 출발 상태와 실제 실행 입력을 재현하며 완료 플래그/결과 주입을 막습니다. 정책과 완료 증거를 같은 최대 10개 항목으로 제한합니다. 브라우저 저장 자체는 사용자가 수정할 수 있으므로 외부 인증/순위 증거로 사용하지 않습니다.
- Affected: architecture.md, README.md, dist/src/policy.js, dist/src/storage.js, dist/src/challenge.js, dist/src/app.js, dist/index.html, dist/styles.css, test/policy.test.js, test/storage.test.js.
- Review: 캠페인 규칙 변경 시 버전을 올리고 기존 캠페인을 보존하거나 명시적으로 이관합니다. 현재 재생은 frame당 최대 20 paired steps, 10초 진행 최대 200; 저장 시 증명 재계산은 최대 10개×4800 paired steps. 초기 화면은 정책 목록만 읽고 완료를 부여하지 않습니다. 저장 파일/요약 변경은 UI 상태에서 숨겨진 성공 주입을 허용하지 않습니다.

## D08 — 기기 완료 요약 경계 / 2026-10-09

- Context: 승인된 갤러리 계약은 `web-lab-progress-v1`의 최소 완료 요약만 읽습니다. 다른 앱의 저장 데이터는 traffic-lab 소유가 아닙니다.
- Options: 실행/시드/개입 공유; 방문 도전 수를 완료로 표시; 저장된 직접 성공 정책의 재검증으로 최소 요약 작성.
- Decision: 저장 항목 중 `independent`이고 전체 재생으로 중간·최종 목표를 모두 통과한 고유 도전 수만 계산하며 total은 3입니다. 요약은 version 1, 앱 ID, completed/total 정수, 실제 갱신 ISO 시각만 포함합니다. 갤러리를 제외한 기존 서비스 디렉터리 15개 ID를 whitelist로 고정하고 0..total<=1000, exact keys, 최대 8192문자로 검증합니다. read-modify-write로 다른 앱의 정상 기록을 그대로 유지합니다. 자체 완료가 0이면 자체 요약만 제거하며, 전체 삭제는 자체 정책 키와 자체 요약만 제거합니다. malformed/oversized aggregate는 무변경 실패하고 UI는 정책 저장과 요약 실패를 구분합니다. 방문·예제·가져오기·재생은 새 완료를 만들지 않습니다.
- Rationale: 필요한 완료 개수만 같은 origin의 갤러리에 전달하며 사적인 실행 payload·이름·시드·파일 데이터를 요약에 쓰지 않습니다. 고유 도전 기준이므로 여러 시드로 같은 도전을 성공해도 부풀려지지 않습니다.
- Affected: dist/src/progress.js, dist/src/storage.js, dist/src/app.js, architecture.md, README.md, test/storage.test.js.
- Review: origin별 기기 저장이며 보안 인증/백엔드/공개 순위가 아닙니다. 잘못된 다른 앱 데이터는 임의 복구하거나 지우지 않습니다. 다른 앱·web-lab은 수정하지 않으며 메인 담당자가 계약 복사와 실제 갤러리 연동을 검증합니다.

## D09 — 구간 관측과 간결한 문구 / 2026-10-09

- Context: 사용자는 무개입 대비 실제 검지기 처리량·정지·손실 비교와 불필요한 홍보/AI/반복 문구 제거를 요청했습니다.
- Options: 흐름을 검지기 처리량으로 이름만 변경; 인과적 개선 주장; 관측량을 독립 집계하여 같은 구간 표와 차이를 제공.
- Decision: 기존 거리 기반 흐름/판정은 유지하고 실제 wraparound 통과 대수 및 대/시간 처리량, 0.1 m/s 미만 정지 대·초, 원래 희망 속도 기준 시간 손실 대·초를 0.05초 끝 관측으로 추가합니다. 원래 희망 속도 기준은 개입 중에도 양쪽 도로에 동일합니다. 최대 60초/중간 20초 샘플 경계를 유지합니다. 차이는 단순 관측값으로 표시하며 원인/실도로 효과를 단정하지 않습니다. 반복 도전 소개·홍보 제목·선택지의 해석 유도 문구를 제거하고 목표·단위·조작·모델 가정·저장 범위·IDM 출처를 남깁니다.
- Rationale: 검지기 국소 통과는 순환도로 전체 이동 흐름과 방향이 다를 수 있습니다. 시드 4 wave의 중간 구간에서는 전체 흐름이 높지만 검지기 통과는 13대 대 15대로 낮습니다. 실제 모델 값을 그대로 보여야 합니다.
- Affected: dist/src/challenge.js, dist/src/app.js, dist/index.html, dist/styles.css, README.md, architecture.md, test/policy.test.js.
- Review: 시간 손실은 실제 지연 측정이 아닌 명시된 고정 희망 속도 기준의 모델 지표입니다. 기존 성공 경로와 무개입/중간 실패 경로를 회귀 검사하며 브라우저/스크린샷/공개 검증은 메인 담당자가 수행합니다.
