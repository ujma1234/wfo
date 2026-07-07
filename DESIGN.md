---
version: 1.0
name: WFO-Cut-Calculator-Design-System
based-on: linear.app (VoltAgent/awesome-design-md)
description: >
  절삭량(Cutting Allowance) 계산기의 디자인 시스템. Linear의 near-black 캔버스와
  라벤더-블루 단일 액센트(#5e6ad2) 철학을 정밀 임상 도구에 이식했다. 다크(#010102)를
  네이티브로, 라이트(#ffffff inverse)를 대칭으로 지원한다. 헤어라인 테두리로 층을
  표현하고 그림자/글로우는 최소화한다. 액센트는 focus·유효 결과·기본 CTA에만 쓰고
  절대 장식적으로 쓰지 않는다. 수치는 모노(JetBrains Mono) tabular-nums, 본문/라벨은
  Inter로 음수 트래킹을 얕게 준다.
---

## 원칙 (Principles)

1. **단일 레이어 토큰.** `:root` + `html[data-theme="dark"]` + `html[data-theme="light"]`
   세 블록에서만 토큰을 선언한다. 오버라이드 레이어를 쌓지 않는다. (이전 index3의
   3겹 팰림프세스트를 이 시스템으로 붕괴시켰다.)
2. **액센트 절제.** `--signal`(#5e6ad2)은 ① 인풋 focus-ring ② 유효 결과 숫자
   ③ 기본 버튼/선택된 세그먼트 ④ 히트맵 매칭 셀 링 에만. 라벨·아이콘·테두리 장식엔 금지.
3. **헤어라인이 그림자를 대신한다.** 카드 경계는 1px `--line`. 그림자는 토스트/포커스
   같은 실제 부양 요소에만 얕게.
4. **수치는 모노, 텍스트는 산세리프.** 계산 결과·표·요약값은 `--mono` + tabular-nums.
   라벨·설명·헤더는 `--sans`.
5. **JS/데이터 불가침.** `==WFO-ENGINE==` 블록, `id`/`class` 훅, 정수(×100) 계산은
   스킨과 독립. 리디자인은 CSS/마크업에 한정한다.

## 색 토큰 (Color Tokens)

액센트는 테마 공통, 나머지는 테마별.

```
공통      --signal #5e6ad2   --signal-hover #828fff   --signal-focus #5e69d1
          --signal-ink #ffffff   --good #27a644   --bad #e5484d
```

| 역할 | 변수 | Dark (#010102 native) | Light (inverse) |
|---|---|---|---|
| 캔버스 | `--bg` | `#010102` | `#ffffff` |
| 캔버스 soft | `--bg-soft` | `#0b0c0d` | `#fafbfc` |
| 표면 1 | `--surface` | `#0f1011` | `#ffffff` |
| 표면 2 | `--surface-2` | `#141516` | `#f5f6f7` |
| 표면 3 | `--surface-3` | `#18191a` | `#eef0f2` |
| 헤어라인 | `--line` | `#23252a` | `#e8eaed` |
| 헤어라인 soft | `--line-soft` | `#1a1c20` | `#f0f1f3` |
| 헤어라인 strong | `--line-strong` | `#34343a` | `#d5d8dd` |
| 잉크 | `--ink` | `#f7f8f8` | `#0d0e10` |
| 잉크 muted | `--ink-2` | `#d0d6e0` | `#3c4149` |
| 잉크 subtle | `--ink-3` | `#8a8f98` | `#6b7280` |
| 잉크 tertiary | `--ink-4` | `#62666d` | `#9aa0aa` |
| 액센트(텍스트용) | `--signal-deep` | `#8b95ff` | `#4a52b0` |
| 인풋 배경 | `--field-bg` | `#0b0c0d` | `#fafbfc` |

> `--signal-deep`는 텍스트/작은 요소에 쓰는 대비 보정판이다. 흰 배경엔 어둡게,
> 검은 배경엔 밝게 — 액센트 원색(#5e6ad2)은 채움/링에만 쓴다.

## 타이포 (Typography)

폰트: `--sans: 'Inter','Pretendard',system-ui` · `--mono: 'JetBrains Mono',ui-monospace`
전역 트래킹 `-0.01em`. Linear 시그니처인 **얕은 음수 트래킹**을 큰 글자일수록 강하게.

| 토큰 | 용도 | size / weight / tracking | family |
|---|---|---|---|
| display-lg | 결과 숫자 `.big` | clamp(44–60px) / 600 / **-0.04em** | mono |
| headline | 필요 시 대제목 | 28px / 600 / -0.02em | sans |
| card-title | h1, 패널 타이틀 | 16px / 600 / -0.02em | sans |
| body | 설명·help | 13px / 400 / 0 | sans |
| label | 필드 라벨 | 13px / 500 / 0 | sans |
| eyebrow | 요약 라벨 | 11px / 500 / +0.02em | sans |
| mono | 모든 수치·표 | 11–15px / 500–600 / 0, tabular-nums | mono |

라벨은 **대문자화하지 않는다** (이전 uppercase+letter-spacing 제거).

## 반경·간격 (Radius / Spacing)

```
--r-xs 4  --r-sm 6  --r 8  --r-lg 12  --r-xl 16  --r-pill 9999
간격 스케일: 4 / 8 / 12 / 16 / 24 / 32
```
카드·패널·인풋은 `--r-lg`(12) 또는 `--r`(8). 칩/작은 버튼은 `--r-sm`.

## 컴포넌트 (Components)

- **card / panel** — `--surface` + 1px `--line`, `--r-lg`. 그림자 없음. 헤더는
  `--line-soft` 하단선.
- **button** — 기본: `--surface`+`--line`, hover `--surface-2`. primary: `--signal`
  채움 + `--signal-ink`, hover `--signal-hover`. 높이 40px, `--r`.
- **segment (6.0/6.5)** — 카드형 2분할. 선택 시 채움 대신 **틴트**
  (`--signal 8%` 배경 + `--signal` 테두리 + `--signal-deep` 텍스트 + inset ring).
- **input** — `--field-bg`, 1px `--line`, focus 시 `--signal-focus` 테두리 +
  `--signal 22%` focus-ring. 값은 mono 20px.
- **hero readout** — 유효 시 숫자만 `--signal-deep`, 나머지 텍스트는 잉크 계열.
  테두리만 액센트 틴트로 상태 표시(채운 배경 금지).
- **heatmap** — 셀 색은 **테마별 램프**: Light `near-white → 라벤더(hue 272)`,
  Dark `어두운 표면 → 라벤더`. 매칭 셀은 채움이 아니라 `--signal` 링 + inset.
  테마 토글 시 램프 재빌드(`hmBuiltMode=null`).
- **badge / toast / kbd** — 헤어라인 + `--surface`. 상태색(valid=액센트 틴트,
  na=`--bad` 틴트)은 테두리/텍스트에만.

## 제거된 것 (Removed)

- 4색 액센트 스위처(cobalt/teal/amber/violet) — Linear의 단일 액센트 철학에 반함.
  마크업·`.sw` 배선·`ACCENT_KEY`·`setAccent`·`data-accent` 전부 제거.
- 죽은 폰트 참조 `Space Grotesk`(로드된 적 없음) → `Inter`.
- 배경 도트 패턴, hero 스캔라인, 컬러 글로우/그림자 → Linear의 평면+헤어라인.
- 미사용 CSS(`.rule`, `.info-block`).
