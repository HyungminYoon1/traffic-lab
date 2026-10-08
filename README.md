# TRAFFIC LAB — 정체 연구소

[실행](https://hyungminyoon1.github.io/traffic-lab/) · [WEB LAB](https://hyungminyoon1.github.io/web-lab/)

1 km 원형 도로에서 차량 수·희망 속도·차간 시간을 바꾸고 급제동이 흐름에 미치는 영향을 관찰하는 실험입니다.

## 직접 해보기

- 차량 수·희망 속도·목표 차간 시간과 시간 배속 조절
- 도로 클릭 또는 Enter로 선택 차량을 3초간 제동
- 차량별 속도 색상, 느린 차량 수와 평균 흐름 계산
- 최근 평균 속도 그래프, 여유로운/붐비는 도로 프리셋

개인 소개나 계정 없이 사용할 수 있습니다. 새로고침하면 실험 상태가 초기화됩니다.

참고 개념: [원문과 추가 학습](https://traffic-simulation.de/info/info_IDM.html). 구현은 이 저장소의 계산 모델과 UI로 작성했습니다.

## 실행 및 검증

Node.js 22 이상. 외부 패키지는 없습니다.

```sh
npm run dev -- 0
npm test
npm run check
```

main에 푸시하면 검증 후 dist만 GitHub Pages에 배포합니다. 계산 모델과 UI는 분리되어 있습니다. 현재 페이지를 닫으면 실험 상태가 사라지며 서버 업로드·계정·방문자 추적 기능은 없습니다. 호스팅 로그와 앱의 데이터 처리는 별개입니다.

[구조](architecture.md) · [결정 기록](docs/decisions.md) · [검증 기록](docs/verification.md)

AI 에이전트와 함께 제작했습니다. 참고 개념과 원작 링크는 앱 및 설명에 표시하며, 다른 사이트의 코드나 디자인을 복제하지 않습니다. 별도 라이선스는 아직 부여하지 않았습니다.
