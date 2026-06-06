# 캣타워 오르기

<p align="center">
  <img src="./public/games/game-flow/images/game-main-logo.png" alt="캣타워 오르기 로고" width="250" />
</p>

<p align="center">
  박자에 맞춰 쏟아지는 짧은 미션을 해결하고, 목숨을 지키며 더 높은 층까지 올라가는 웹 마이크로게임입니다.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white" />
</p>

<p align="center">
  <img src="./public/games/game-flow/images/main-elevator-1.png" alt="플레이 중인 메인 화면" width="30%" />
  <img src="./public/games/game-flow/images/main-elevator-success-1.png" alt="성공 결과 화면" width="30%" />
  <img src="./public/games/game-flow/images/main-elevator-fail-1.png" alt="실패 결과 화면" width="30%" />
</p>

## 한눈에 보기

캣타워 오르기는 WarioWare 스타일의 초단기 미션을 Next.js와 Canvas로 구현한 리듬형 웹 게임입니다. 매 라운드마다 조작법이 먼저 제시되고, 플레이어는 제한된 박자 안에 포켓몬 이름 맞히기, 전선 연결, 가시 피하기, 광물 캐기 같은 미션을 해결해야 합니다.

| 항목        | 내용                                             |
| ----------- | ------------------------------------------------ |
| 장르        | 박자 기반 마이크로게임                           |
| 플랫폼      | Web                                              |
| 라운드 구조 | 조작법 안내 -> 미션 -> 성공/실패 판정            |
| 선택 규칙   | 세션 랜덤 bag, 직전 게임 즉시 반복 방지          |
| 보스 규칙   | 12라운드마다 AnimalFarm 보스 라운드              |
| 저장        | `localStorage` 최고 기록 저장                    |
| 에셋        | `public/games/*/images`, `public/games/*/sounds` |

## 게임 흐름

```txt
에셋 프리로드
  -> 메인 화면
  -> 조작법 안내
  -> 시작 프롬프트
  -> 박자 제한 미션
  -> 성공 / 실패 판정
  -> 속도 증가 또는 목숨 회복
  -> 12라운드마다 보스 라운드
  -> 게임 오버 및 최고 기록 저장
```

## 마이크로게임 목록

| 게임              | 미션                    | 조작                | 박자 | 종류 |
| ----------------- | ----------------------- | ------------------- | ---- | ---- |
| Pokemon           | `이 포켓몬의 이름은?`   | 한글 키보드         | 12   | 일반 |
| Among Us          | `전선을 연결해라!`      | 마우스 드래그       | 14   | 일반 |
| 동물의 숲         | `도장을 세 번 찍어라!`  | 마우스 클릭         | 8    | 일반 |
| Super Mario       | `코인을 정확히 모아라!` | 스페이스바          | 8    | 일반 |
| Jump              | `점프해라!`             | 스페이스바          | 8    | 일반 |
| Geometry Dash     | `가시를 피해라!`        | 스페이스바          | 12   | 일반 |
| Tetris            | `4줄 없애라!`           | 방향키 + 스페이스바 | 12   | 일반 |
| Minecraft         | `다이아몬드를 캐라!`    | 마우스 hold/drag    | 8    | 일반 |
| Piano             | `멜로디를 연주해라!`    | 숫자키 1~9          | 10   | 일반 |
| 말랑말랑 두뇌교실 | `블록은 몇 개?`         | 숫자키              | 12   | 일반 |
| Undertale         | `피해라!`               | 방향키              | 8    | 일반 |
| AnimalFarm        | `단어를 거꾸로 써라!`   | 한글 키보드         | 36   | 보스 |

## 플레이 감각

- 게임별 BGM이 라운드 박자에 맞춰 재생됩니다.
- 성공, 실패, 채굴, 전선 연결, 점프 같은 행동에 SFX가 붙습니다.
- 목숨이 사라지거나 새로 생길 때 실제 값 변화에 맞춰 애니메이션이 재생됩니다.
- 한글 IME 입력을 고려해 Pokemon과 AnimalFarm typing game이 동작합니다.
- canvas 게임은 각 라운드마다 remount되어 이전 상태가 다음 라운드로 새지 않습니다.

## 조작 안내

<p>
  <img src="./public/games/forms/images/space.png" alt="스페이스바 조작 안내" width="23%" />
  <img src="./public/games/forms/images/arrow-keys.png" alt="방향키 조작 안내" width="23%" />
  <img src="./public/games/forms/images/arrow-and-space.png" alt="방향키와 스페이스바 조작 안내" width="23%" />
  <img src="./public/games/forms/images/click.png" alt="마우스 클릭 조작 안내" width="23%" />
  <img src="./public/games/forms/images/drag.png" alt="마우스 드래그 조작 안내" width="23%" />
</p>

지원 control type은 `space`, `arrowKeys`, `arrowAndSpace`, `mouseClick`, `mouseDrag`, `koreanKeyboard`, `numberKeys`, `scroll`, `microphone`입니다. 현재 등록된 마이크로게임은 이 중 일부를 사용합니다.

## 기술 스택

| 영역     | 사용 기술                                   |
| -------- | ------------------------------------------- |
| App      | Next.js App Router, React 19                |
| Language | TypeScript                                  |
| Style    | Tailwind CSS 4                              |
| Gameplay | Canvas 2D, custom React hooks               |
| Audio    | Web Audio API 기반 BGM/SFX library          |
| Assets   | 정적 image/sound files under `public/`      |
| State    | 라운드 진행 hook, 입력 hook, 기록 저장 hook |

## 프로젝트 구조

```txt
app/                     Next.js route와 전역 스타일
components/game-flow/    메인 화면, 라운드 화면, 결과 화면, 목숨 UI
data/                    마이크로게임 registry, 조작법, preload asset 목록
games/                   각 microgame React canvas와 hook 구현
hooks/                   라운드 진행, 입력, 리듬, 기록 저장 hook
lib/                     canvas helper와 BGM/SFX library
public/games/            게임별 image/sound asset
types/                   공유 타입 선언
```

## 시작하기

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 다음 주소에서 열립니다.

```txt
http://localhost:3000
```

## 스크립트

```bash
npm run dev           # Next.js 개발 서버
npm run build         # 프로덕션 빌드
npm run start         # 프로덕션 서버
npm run lint          # ESLint
npm run format        # Prettier 포맷팅
npm run format:check  # Prettier 검사
```

## 마이크로게임 추가하기

1. `games/`에 `<GameName>Game.tsx`와 `use<GameName>Game.ts`를 추가합니다.
2. `data/microgames.ts`에 `canvas`, `control`, `beatCount`, `startPrompt`를 등록합니다.
3. `components/game-flow/MicrogameCanvas.tsx`에 canvas route를 연결합니다.
4. 필요한 asset을 `public/games/<game>/images` 또는 `public/games/<game>/sounds`에 추가합니다.
5. `data/preloadAssets.ts`와 `lib/bgmLibrary.ts`에 preload, BGM, SFX 항목을 등록합니다.
6. custom input game이면 `hooks/useMicrogameInput.ts`의 generic clear 처리와 충돌하지 않게 제외합니다.

## 라이선스

이 프로젝트는 개인 실험용 비공개 프로젝트입니다.
