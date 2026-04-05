# 재배 AI 연동 설계

## 개요
기존 재배 AI 서버(FastAPI, localhost:8000)와 HTTP로 양방향 데이터 교환.
DeePC 환경 제어 + XGBoost/TOMGRO 생육 예측 시스템과 연동.

## 나가는 방향 (인력관리 → 재배 AI)

작업 완료 시 자동 전송:
```
POST /api/workforce/work-logs
{
  "date": "2026-04-05",
  "zone_id": "zone-a",
  "task_type": "PRUNE_LEAF",
  "quantity": 120,
  "unit": "매",
  "per_plant_avg": 3.5,
  "row_range": [1, 8],
  "worker_count": 3
}
```

생육 조사 데이터 전송:
```
POST /api/workforce/surveys
{
  "date": "2026-04-05",
  "zone_id": "zone-a",
  "samples": [{
    "row": 3, "plant": 5,
    "plant_height": 185.0,
    "stem_diameter": 11.2,
    "leaf_count": 28,
    "truss_number": 8,
    "fruit_count": 42,
    "fruit_weight": 12.5
  }]
}
```

## 들어오는 방향 (재배 AI → 인력관리)

주 1회 배치로 AI 작업 제안 수신:
```
POST /api/ai/suggestions
{
  "suggestions": [{
    "task_type": "PRUNE_LEAF",
    "zone_id": "zone-a",
    "recommended_quantity": 150,
    "unit": "매",
    "confidence": 0.82,
    "reasoning": "현재 LAI 3.8 → 목표 3.2, 주당 4매 적엽 권장"
  }]
}
```

## 모델별 연동

**XGBoost**: 농작업 feature 추가 (최근 7일 적엽/적과/수확 누적, 생육 조사값)
**TOMGRO**: 적엽 → LAI 차감, 적과 → 분배율 재계산, 적심 → 생장점 제거 플래그

## AI 제안 흐름
1. 매주 월요일 06:00 배치 실행
2. 최근 7일 작업 기록 + 생육 조사 수집
3. TOMGRO 시뮬레이션 → 7일 후 예측
4. 목표 대비 편차 → 작업량 역산
5. XGBoost로 검증
6. 인력관리 앱으로 제안 전송
7. 관리자 검토 → 수용/거부/수정
