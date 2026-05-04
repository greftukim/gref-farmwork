# Playwright MCP 셋업 보고서 (U-INFRA-PLAYWRIGHT-001)

**작성일**: 2026-05-04
**라운드 명**: U-INFRA-PLAYWRIGHT-001 (운영 인프라, 트랙 77 분리)
**기준 커밋**: `f3a5113` (origin/main HEAD, U21 후)
**산출물**: 본 보고서 + LESSONS 157 + commit (코드 변경 0건)

---

## 1. 셋업 결과

### 1.1 명령

```
claude mcp add playwright --scope project -- npx -y @playwright/mcp@latest
```

### 1.2 결과 raw

```
Added stdio MCP server playwright with command: npx -y @playwright/mcp@latest to project config
File modified: C:\Users\김태우\Desktop\gref-farmwork\.mcp.json
```

### 1.3 `.mcp.json` 변경 요약

```json
{
  "mcpServers": {
    "supabase": { ...기존... },
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "env": {}
    }
  }
}
```

`.gitignore`에 `.mcp.json` 박제됨 → 커밋 영향 없음 (자격증명 노출 0건).

### 1.4 `claude mcp list` raw

```
context7: npx -y @upstash/context7-mcp - ✓ Connected
supabase: cmd /c npx -y @supabase/mcp-server-supabase@latest --project-ref=yzqdpfauadbtutkhxzeu - ✓ Connected
playwright: npx @playwright/mcp@latest - ✓ Connected
```

**서버 수준 연결 ✓** — playwright MCP 프로세스가 Claude Code CLI에 정상 등록.

---

## 2. 시연 결과

### 2.1 Antigravity 세션 내 Playwright 도구 노출 — **현 세션 미가용** (제약)

`/mcp` 검증 결과는 ✓ Connected이지만, **현 Antigravity Claude Code 세션의 도구 검색(ToolSearch)에서 `browser_navigate`/`browser_snapshot`/`browser_screenshot` 등 Playwright 도구가 노출되지 않음**.

```
ToolSearch query: "browser_navigate browser_snapshot browser_click browser_screenshot"
→ No matching deferred tools found

ToolSearch query: "select:mcp__playwright__browser_navigate,..."
→ No matching deferred tools found
```

**원인**: Antigravity는 세션 시작 시점에 등록된 MCP 서버만 도구 스키마로 노출. 세션 진행 중 추가된 서버는 다음 세션부터 도구 사용 가능 (Claude Code CLI 일반 동작 — `/mcp` reload 명령 부재 시 새 세션 진입 필요).

### 2.2 Fallback 시연 (curl) — public 페이지 도달성 검증

자격증명 불필요 영역(`/login`)에 대해 HTTP 직접 요청으로 동작 확인:

```
$ curl -sS -L https://gref-farmwork.vercel.app/login -o /dev/null \
       -w "HTTP: %{http_code}\nfinal_url: %{url_effective}\nsize: %{size_download} bytes\n"
HTTP: 200
final_url: https://gref-farmwork.vercel.app/login
size: 809 bytes
time: 0.861704s

$ curl -sS -L https://gref-farmwork.vercel.app/login | grep -oE "<title>[^<]+</title>"
<title>GREF FarmWork</title>
```

✅ Vercel 배포 라이브 + SPA shell 응답.

### 2.3 다음 세션 진입 시 자동 활성화 권고 절차 박제

다음 Antigravity 세션에서 운영자 또는 자율 흐름이 다음을 실행하면 즉시 시연 가능:

```
# 시연 시나리오 (다음 세션)
1. ToolSearch query: "browser_navigate playwright" → 도구 스키마 로드
2. mcp__playwright__browser_navigate → "https://gref-farmwork.vercel.app/login"
3. mcp__playwright__browser_snapshot → DOM 추출
4. mcp__playwright__browser_take_screenshot → 이미지 박제 (보고서 갱신)
```

본 보고서는 **셋업 완료 + fallback 검증 + 다음 세션 활용 절차 박제**로 클로징.

---

## 3. 향후 활용 가능 영역

### 3.1 트랙 77 후속 (사용자 검증 자동화)

| 라운드 | 시나리오 | 자동화 가능 |
|---|---|---|
| U18 | S1~S13 (작업 관리 매트릭스) | 🟢 자격증명 후 일괄 |
| U19 | S1~S10 (툴바 + 동 row 숨김) | 🟢 동일 |
| U20 | S1~S20 (온실 정보 3탭 + 권한 검증) | 🟢 farm_admin/master 권한 분기 자동 검증 가능 |
| U21 | S1~S11 (작업 모달 자동 매칭 힌트) | 🟢 zone+date 변경 시 derive 라벨 매칭 자동 검증 |

### 3.2 회귀 검증 인프라

- 자산 보존 7건 영역의 시각 회귀 검증 (출퇴근 v2 / FCM 알림 / QR 카메라 / PWA 모달 / 76-A 칸반 흐름)
- 자율 진단 대신 본 세션이 직접 브라우저 흐름 시뮬 → 사용자 F12 부담 0

### 3.3 Codex 위임 부적합 영역

본 인프라는 환경 도구 활용이라 Codex 위임 부적합 — Claude Code 직접 진행만 가능 (CCB / Codex 표준 §4.3 추종).

---

## 4. 발견 사항 / 제약

### 4.1 Antigravity 세션 내 MCP 서버 hot-add 한계
- `claude mcp add` 명령은 `.mcp.json`에 정상 박제 + 서버 연결까지 성공
- 단 **현 세션의 도구 스키마는 갱신되지 않음** (세션 시작 시점에만 로드)
- 운영 절차 박제: **다음 세션 진입 시 자동 활성화** (수동 작업 0)

### 4.2 자격증명 사용 0건 (G77-QQ / INFRA-C 추종)
- 본 라운드는 **public 페이지 시연만**. `/login` 폼 진입 / 인증 흐름은 별 라운드.
- 다음 세션에서 사용자 명시 승인 시 자격증명 활용 — 별 안내 시점에 결정.

### 4.3 셋업 명령 옵션 비교
- 옵션 A (`claude mcp add --scope project`) → ✅ 채택 (1회 명령으로 .mcp.json 자동 박제)
- 옵션 B (`.mcp.json` 직접 편집) → 사용 불필요. 단 향후 `env` 변수 추가 시 직접 편집 가능 영역.

### 4.4 자산 보존 7건 영향 0건
- 본 라운드 src/ 변경 0건. 빌드 영향 0. 자산 7건 모두 byte-identical (vs `f3a5113`).

---

## 5. LESSONS 157 박제

`docs/LESSONS_LEARNED.md`에 본 라운드 발견 패턴 박제 — "Antigravity Claude Code 환경 + Playwright MCP 셋업 패턴".

핵심:
1. `claude mcp add --scope project` 1회 명령으로 `.mcp.json` 자동 박제
2. 서버 수준 연결은 `claude mcp list`로 즉시 확인
3. 도구 스키마는 다음 세션부터 노출 (세션 hot-add 미지원)
4. fallback 시연은 curl로 public 도달성 확인 → 다음 세션 진입 시 실 시연 절차 박제

---

## 6. 산출물

### 6.1 git
- 변경 파일: 본 보고서 신규 + `docs/LESSONS_LEARNED.md` 갱신 (LESSONS 157)
- src/ 변경 0건. 마이그레이션 0건.
- 커밋 메시지 (예상): `docs(infra-playwright): MCP 셋업 + 시연 절차 박제 + LESSONS 157`

### 6.2 BACKLOG 갱신
- 본 라운드 BACKLOG 신규 0건
- 다음 라운드 진입 시 활용 가능 영역 박제 (§3 참조)

---

## 7. 자가 검증 (C1~C8)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | Playwright MCP 셋업 명령 실행 + 결과 박제 | ✅ §1.1~1.3 |
| C2 | `claude mcp list` 검증 raw | ✅ §1.4 — `playwright: ✓ Connected` |
| C3 | 시연 (https://gref-farmwork.vercel.app/login) | ✅ HTTP 200 / `<title>GREF FarmWork</title>` (curl fallback) |
| C4 | 자격증명 코드/보고서 박제 0건 | ✅ grep 0건 — public 페이지만 |
| C5 | 자산 보존 7건 영향 0건 | ✅ src/ 변경 0건 |
| C6 | LESSONS 157 박제 | ✅ §5 |
| C7 | docs commit + push | (커밋 후 보고) |
| C8 | 셋업 실패 시 fallback 절차 박제 | ✅ §4.3 (옵션 B 박제) — 본 라운드는 옵션 A 성공 |

---

## 8. 사용자 검증 시나리오

본 라운드는 사용자 부담 0.

| # | 시나리오 | 기대 |
|---|---|---|
| S1 | §1 셋업 결과 raw | playwright Connected ✅ |
| S2 | §2 시연 결과 — fallback (curl) + 다음 세션 절차 | HTTP 200 + 절차 박제 |
| S3 | §3 향후 활용 가능 영역 | U22 진입 시 자동 검증 검토 |

---

## 9. CCB / Codex 자율 협업 (표준 §4)

### 9.1 Claude Code 직접 진행 (전 영역)
- MCP 셋업 (`claude mcp add`) — 환경 변경 영역
- `claude mcp list` 검증 + ToolSearch 도구 노출 테스트
- curl fallback 시연
- 보고서 + LESSONS 157 박제

### 9.2 Codex 위임 0건
- 본 라운드는 환경 도구 활용 → Codex 위임 부적합 (표준 §4.3)

### 9.3 자율 결정 근거
| ID | 근거 |
|---|---|
| INFRA-A | 옵션 A (`claude mcp add --scope project`) — 1회 명령 + 자동 박제 |
| INFRA-B | `/login` public 페이지 — 자격증명 불필요 (G77-QQ 정신 추종) |
| INFRA-C | 자격증명 사용 0건 — 셋업+시연만 |
| INFRA-D | LESSONS 157 박제 — Antigravity hot-add 한계 + 다음 세션 활성화 패턴 |
| INFRA-E | 셋업 성공 → 옵션 B 박제만 (실행 X) |
| INFRA-F | docs commit only — 코드 변경 0건 |

---

## 10. 핵심 요약 (5줄)

1. Playwright MCP 셋업 ✅ — `claude mcp add --scope project`로 1회 명령 박제 + 서버 연결.
2. **세션 hot-add 한계 발견** — 현 세션 도구 스키마 미노출. **다음 세션 진입 시 자동 활성화**.
3. Fallback 시연 (curl) — `https://gref-farmwork.vercel.app/login` HTTP 200 + `<title>GREF FarmWork</title>`.
4. 자격증명 사용 0건. 자산 보존 7건 영향 0건. src/ 변경 0건.
5. LESSONS 157 박제 — Antigravity + Playwright MCP 셋업 패턴 + 다음 세션 활용 절차.

---

**끝.**
