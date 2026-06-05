# Microgames Elevator

<p align="center">
  <img src="./public/games/game-flow/images/game-main-logo.png" alt="Microgames Elevator logo" width="240" />
</p>

<p align="center">
  음악 박자에 맞춰 짧은 미션을 빠르게 해결하고, 목숨이 다 떨어지기 전에 더 높은 층까지 올라가는 Next.js 기반 마이크로게임 프로젝트입니다.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white" />
</p>

<p align="center">
  <img src="./public/games/game-flow/images/main-elevator-1.png" alt="Main elevator gameplay scene" width="30%" />
  <img src="./public/games/game-flow/images/main-elevator-success-1.png" alt="Successful elevator result scene" width="30%" />
  <img src="./public/games/game-flow/images/main-elevator-fail-1.png" alt="Failed elevator result scene" width="30%" />
</p>

## 프로젝트 소개

Microgames Elevator는 WarioWare 스타일의 초단기 미션을 웹에서 플레이하는 게임입니다. 각 라운드는 조작법 안내, 시작 프롬프트, 제한 박자 안의 실제 플레이, 성공/실패 판정으로 이어집니다.

게임은 세션 단위 랜덤 bag으로 선택되며, 같은 마이크로게임이 바로 다시 나오는 상황을 피합니다. 일반 게임을 진행하다가 12라운드마다 보스 라운드가 등장하고, 속도와 압박은 라운드가 지날수록 올라갑니다.

## 게임 흐름

```txt
에셋 프리로드
  -> 메인 화면
  -> 조작법 안내
  -> 랜덤 마이크로게임
  -> 박자 제한 플레이
  -> 성공 / 실패 판정
  -> 속도 증가 또는 목숨 회복
  -> 12라운드마다 보스 라운드
  -> 게임 오버 및 최고 기록 저장
```

## 현재 마이크로게임

| 게임          | 미션                    | 조작                | 박자 | 종류 |
| ------------- | ----------------------- | ------------------- | ---- | ---- |
| Pokemon       | `이 포켓몬의 이름은?`   | 한글 키보드         | 12   | 일반 |
| Among Us      | `전선을 연결해라!`      | 마우스              | 14   | 일반 |
| Super Mario   | `코인을 정확히 모아라!` | 스페이스바          | 8    | 일반 |
| Jump          | `점프해라!`             | 스페이스바          | 8    | 일반 |
| Geometry Dash | `가시를 피해라!`        | 스페이스바          | 12   | 일반 |
| Tetris        | `4줄 없애라!`           | 방향키 + 스페이스바 | 12   | 일반 |
| Minecraft     | `다이아몬드를 캐라!`    | 마우스 hold         | 8    | 일반 |
| Undertale     | `피해라!`               | 방향키              | 8    | 일반 |
| AnimalFarm    | `단어를 거꾸로 써라!`   | 한글 키보드         | 36   | 보스 |

## 주요 기능

- 박자 기반 라운드 타이머와 게임별 beat count
- 게임별 BGM, 성공/실패 효과음, 프리로드 asset 관리
- 목숨 감소/회복 애니메이션
- 세션 랜덤 bag 방식의 마이크로게임 선택
- 실제 이미지와 사운드를 사용하는 게임별 canvas 구현
- 한글 IME 입력을 고려한 Pokemon/AnimalFarm typing game
- `localStorage` 기반 최고 기록 저장

## 조작 방식

<p>
  <img src="./public/games/forms/images/space.png" alt="Space key control" width="23%" />
  <img src="./public/games/forms/images/arrow-keys.png" alt="Arrow keys control" width="23%" />
  <img src="./public/games/forms/images/arrow-and-space.png" alt="Arrow keys and space control" width="23%" />
  <img src="./public/games/forms/images/mouse.png" alt="Mouse control" width="23%" />
</p>

지원하는 control type은 `space`, `arrowKeys`, `arrowAndSpace`, `mouseClick`, `koreanKeyboard`, `numberKeys`, `scroll`, `wasd`, `microphone`입니다. 현재 등록된 게임은 이 중 일부를 사용합니다.

## 기술 스택

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Canvas 2D 기반 마이크로게임
- Web Audio API 기반 BGM/SFX library
- `public/games/*/images`, `public/games/*/sounds` 기반 정적 asset

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

의존성을 설치합니다.

```bash
npm install
```

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 접속합니다.

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
5. `data/preloadAssets.ts`와 `lib/bgmLibrary.ts`에 필요한 preload/BGM/SFX 항목을 등록합니다.
6. custom input game이면 `hooks/useMicrogameInput.ts`의 generic clear 처리와 충돌하지 않게 제외합니다.

## 라이선스

이 프로젝트는 개인 실험용 비공개 프로젝트입니다.
