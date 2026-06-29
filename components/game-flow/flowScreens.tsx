"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScoreSubmissionPanel } from "@/components/ranking/ScoreSubmissionPanel";
import {
  CHALLENGE_MODE_UNLOCK_ROUND,
  CHALLENGE_MODE_OPTIONS,
  type ChallengeModes,
} from "@/data/challengeModes";
import {
  MICROGAMES,
  getMicrogameFormInstruction,
  type Microgame,
} from "@/data/microgames";
import type { PreloadStatus } from "@/hooks/useGameScreenFlow";
import { useBgmTrack } from "@/hooks/useBgmTrack";
import { useGameSetupTransition } from "@/hooks/useGameSetupTransition";
import { useLoadingScreenCarousel } from "@/hooks/useLoadingScreenCarousel";
import { usePracticeSpeedMultiplierState } from "@/hooks/usePracticeSpeedMultiplierState";
import { useSynchronizedRhythm } from "@/hooks/useSynchronizedRhythm";
import {
  bgmLibrary,
  GAME_OVER_DURATION_MS,
  unlockBgmLibrary,
} from "@/lib/bgmLibrary";
import {
  formatPracticeSpeedMultiplier,
  MAX_PRACTICE_SPEED_MULTIPLIER,
  MIN_PRACTICE_SPEED_MULTIPLIER,
  normalizePracticeSpeedMultiplier,
  PRACTICE_SPEED_STEP,
} from "@/lib/practiceSpeed";
import { FixedLivesOverlay } from "./FixedLivesOverlay";
import { MAIN_SCREEN_EXIT_MS } from "./gameFlowConstants";
import { HomeHeader, type HomeView } from "./HomeHeader";
import { NeonButton, NeonShell } from "./NeonShell";

const LOADING_MESSAGES = [
  "엘리베이터 점검 중...",
  "고양이 간식 채우는 중...",
  "캣타워 층수 세는 중...",
  "발판 미끄럼 방지 확인 중...",
  "과제 제출 버튼 확인 중...",
  "도블 카드 섞는 중...",
  "도감 페이지 넘기는 중...",
  "레이튼 문제 그림 맞추는 중...",
  "챔피언 밴 목록 불러오는 중...",
  "코러스맨 숨 고르는 중...",
  "목숨 표시등 닦는 중...",
  "다이아몬드 광석 찾는 중...",
  "두뇌교실 블록 쌓는 중...",
  "거짓말 탐지기 문구 준비 중...",
  "메이플 룬 방향 섞는 중...",
  "라운드 순서 섞는 중...",
  "주사위 게이지 맞추는 중...",
  "스탬프 위치 정하는 중...",
  "곰이 먹은 고기 세는 중...",
  "바운스볼 별 올려두는 중...",
  "고양이 앞발 스트레칭 중...",
  "커비가 숨 들이마시는 중...",
  "불과 얼음의 박자 맞추는 중...",
  "사과 숫자판 채우는 중...",
  "수박 합칠 준비 중...",
  "박자 표시등 예열 중...",
  "마리오 코인 개수 맞추는 중...",
  "스타구슬 흩뿌리는 중...",
  "스네이크 사과 올려두는 중...",
  "스도쿠 빈칸 고르는 중...",
  "알까기 돌 배치하는 중...",
  "성공 효과음 고르는 중...",
  "어몽어스 전선 색 맞추는 중...",
  "뼈 공격 궤적 계산 중...",
  "오목 승리 자리 찾는 중...",
  "여신의 벽 문양 준비 중...",
  "실패 화면 접어두는 중...",
  "오카리나 악보 펼치는 중...",
  "가시 점프 타이밍 맞추는 중...",
  "체스 킹 잡을 수 찾는 중...",
  "쿠키런 장애물 세우는 중...",
  "고양이 털 날림 방지 중...",
  "쿠키 스킬 순서 확인 중...",
  "물풍선 설치 위치 정하는 중...",
  "공룡 앞 선인장 세우는 중...",
  "테트리스 긴 막대 기다리는 중...",
  "최고 기록 칸 비워두는 중...",
  "포켓몬 도감 켜는 중...",
  "타입 카드 손패 섞는 중...",
  "퐁 공 속도 맞추는 중...",
  "플래피버드 파이프 세우는 중...",
  "엘리베이터 문 닫는 중...",
  "피아노 멜로디 고르는 중...",
  "한컴 단어 내려보내는 중...",
  "수박 던질 각도 재는 중...",
  "Baba 규칙 블록 놓는 중...",
  "보스 라운드 출입증 확인 중...",
  "파이어보이와 워터걸 발판 확인 중...",
  "Wii Sports 버튼 확인 중...",
  "2048 보드 숫자 채우는 중...",
  "동물농장 단어 거꾸로 뒤집는 중...",
  "고양이 눈치 보는 중...",
  "무궁화 꽃 타이밍 재는 중...",
  "카트라이더 운하 코스 여는 중...",
  "할리갈리 과일 카드 나누는 중...",
  "다음 층 버튼 누르는 중...",
  "캣타워 꼭대기 불 켜는 중...",
  "결과 화면 준비 중...",
] as const;

const LOADING_CARTOONS = [
  {
    alt: "로딩 카툰 1",
    src: "/games/game-flow/images/loading-cartoon-1.webp",
  },
  {
    alt: "로딩 카툰 2",
    src: "/games/game-flow/images/loading-cartoon-2.webp",
  },
  {
    alt: "로딩 카툰 3",
    src: "/games/game-flow/images/loading-cartoon-3.webp",
  },
  {
    alt: "로딩 카툰 4",
    src: "/games/game-flow/images/loading-cartoon-4.webp",
  },
] as const;

function HomePanel({
  challengeModes,
  highestReachedRound,
  isStarting,
  onChallengeModesChange,
  startGame,
}: Readonly<{
  challengeModes: ChallengeModes;
  highestReachedRound: number;
  isStarting: boolean;
  onChallengeModesChange: (challengeModes: ChallengeModes) => void;
  startGame: () => void;
}>) {
  const isChallengeModeUnlocked =
    highestReachedRound >= CHALLENGE_MODE_UNLOCK_ROUND;
  const activeChallengeModeCount = CHALLENGE_MODE_OPTIONS.filter(
    (option) => challengeModes[option.key],
  ).length;

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_260px] lg:items-center">
      <div className="space-y-7">
        <p className="text-sm font-black uppercase tracking-[0.32em] text-cyan-100">
          마이크로게임 천국
        </p>
        <div className="space-y-4">
          <h1 className="max-w-3xl text-5xl font-black leading-none tracking-normal text-white drop-shadow-[0_0_18px_rgba(103,232,249,0.7)] sm:text-7xl">
            캣타워 오르기
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-cyan-50/85">
            고양이가 엘리베이터를 타고 캣타워를 오르는 것을 도와주세요. 과연
            당신은 몇 층까지 올라갈 수 있을까요? 당신의 센스를 보여주세요!
          </p>
        </div>
        <div className="max-w-xs rounded-md border border-cyan-100/55 bg-black/45 p-4 shadow-[0_0_24px_rgba(103,232,249,0.16)]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/60">
            최고 기록
          </p>
          <p className="mt-2 flex items-end gap-2 text-cyan-100 drop-shadow-[0_0_16px_rgba(103,232,249,0.68)]">
            <span className="text-4xl font-black leading-none">
              {highestReachedRound.toString().padStart(2, "0")}
            </span>
            <span className="pb-1 text-lg font-black leading-none">층</span>
          </p>
        </div>
        {isChallengeModeUnlocked ? (
          <details className="group max-w-2xl rounded-md border border-fuchsia-200/45 bg-fuchsia-950/20 shadow-[0_0_24px_rgba(232,121,249,0.12)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-fuchsia-100 marker:content-none">
              <span>
                <span className="block text-xs font-black uppercase tracking-[0.24em]">
                  Challenge Mode
                </span>
                <span className="mt-1 block text-sm font-bold text-cyan-50/65">
                  {activeChallengeModeCount > 0
                    ? `${activeChallengeModeCount}개 활성화`
                    : "눌러서 설정하기"}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="text-xl font-black transition-transform group-open:rotate-180"
              >
                ▾
              </span>
            </summary>
            <fieldset className="border-t border-fuchsia-100/20 p-4">
              <legend className="sr-only">챌린지 모드 선택</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {CHALLENGE_MODE_OPTIONS.map((option) => {
                  const isChecked = challengeModes[option.key];

                  return (
                    <label
                      className={`cursor-pointer rounded border p-3 transition ${
                        isChecked
                          ? "border-fuchsia-100 bg-fuchsia-300/16 shadow-[0_0_18px_rgba(232,121,249,0.18)]"
                          : "border-white/20 bg-black/30 hover:border-fuchsia-100/55"
                      } ${isStarting ? "pointer-events-none opacity-60" : ""}`}
                      key={option.key}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          checked={isChecked}
                          className="size-4 accent-fuchsia-300"
                          disabled={isStarting}
                          onChange={(event) => {
                            onChallengeModesChange({
                              ...challengeModes,
                              [option.key]: event.target.checked,
                            });
                          }}
                          type="checkbox"
                        />
                        <span className="font-black text-white">
                          {option.title}
                        </span>
                      </span>
                      <span className="mt-2 block text-xs font-bold leading-5 text-cyan-50/68">
                        {option.description}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </details>
        ) : (
          <div className="max-w-2xl rounded-md border border-white/20 bg-black/30 p-4 text-white/55">
            <p className="text-xs font-black uppercase tracking-[0.24em]">
              Challenge Mode · Locked
            </p>
            <p className="mt-2 text-sm font-bold text-cyan-50/60">
              최고 기록 {CHALLENGE_MODE_UNLOCK_ROUND}층 달성 시 해금됩니다.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <NeonButton onClick={startGame}>
            {isStarting ? "준비 중" : "게임 시작"}
          </NeonButton>
        </div>
      </div>
      <div className="mx-auto w-full max-w-48 lg:max-w-none">
        <Image
          src="/games/game-flow/images/game-main-logo.webp"
          alt="캣타워 오르기 로고"
          width={880}
          height={1268}
          priority
          className="main-logo-bounce h-auto w-full object-contain drop-shadow-[0_0_24px_rgba(103,232,249,0.45)]"
          unoptimized
        />
      </div>
    </div>
  );
}

function HowToPlayPanel() {
  const rules = [
    "짧은 명령을 보고 제한 시간 안에 마이크로게임을 클리어합니다.",
    "라운드마다 조작법이 바뀌며, 안내 화면에서 필요한 입력을 먼저 보여줍니다.",
    "보스 라운드는 더 길고, 성공하면 다음 구간을 버틸 여유가 생깁니다.",
    "목숨이 모두 사라지기 전까지 더 높은 층을 노리면 됩니다.",
  ] as const;

  return (
    <div className="space-y-7">
      <div className="space-y-4">
        <p className="text-sm font-black uppercase tracking-[0.32em] text-cyan-100">
          How to Play
        </p>
        <h1 className="text-4xl font-black leading-none text-white drop-shadow-[0_0_18px_rgba(103,232,249,0.65)] sm:text-6xl">
          눈치껏 하세요...
        </h1>
        <p className="max-w-3xl text-lg leading-8 text-cyan-50/82">
          게임은 짧고 빠르게 이어집니다. 화면에 뜨는 한 줄 명령과 조작 안내를
          보고, 다음 순간에 바로 해결하세요.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rules.map((rule, index) => (
          <div
            className="rounded-md border border-cyan-100/25 bg-black/38 p-4 shadow-[0_0_18px_rgba(103,232,249,0.1)]"
            key={rule}
          >
            <p className="text-xs font-black text-cyan-100/60">
              STEP {index + 1}
            </p>
            <p className="mt-2 text-base font-black leading-7 text-cyan-50">
              {rule}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function maskMicroscopeText(value: string) {
  return Array.from(value)
    .map((character) => (character.trim() ? "?" : character))
    .join("");
}

function getMicrogamePracticeHref(
  microgame: Microgame,
  practiceSpeedMultiplier: number,
) {
  const speed = formatPracticeSpeedMultiplier(practiceSpeedMultiplier);

  return `/microscope/${microgame.id}?speed=${speed}`;
}

function MicroscopePanel({
  seenMicrogameIds,
}: Readonly<{
  seenMicrogameIds: readonly string[];
}>) {
  const router = useRouter();
  const [testPracticeMicrogameId, setTestPracticeMicrogameId] = useState<
    string | null
  >(null);
  const [practiceSpeedMultiplier, setPracticeSpeedMultiplier] =
    usePracticeSpeedMultiplierState();
  const discoveredMicrogameCount = MICROGAMES.filter(({ id }) =>
    seenMicrogameIds.includes(id),
  ).length;

  useEffect(() => {
    if (!testPracticeMicrogameId) {
      return;
    }

    const openHoveredPractice = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.metaKey || event.ctrlKey) {
        return;
      }

      event.preventDefault();
      router.push(
        `/microscope/${testPracticeMicrogameId}?speed=${formatPracticeSpeedMultiplier(
          practiceSpeedMultiplier,
        )}`,
      );
    };

    window.addEventListener("keydown", openHoveredPractice);

    return () => {
      window.removeEventListener("keydown", openHoveredPractice);
    };
  }, [practiceSpeedMultiplier, router, testPracticeMicrogameId]);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-black leading-none text-cyan-50/90 sm:text-xl">
          게임 도감
        </h1>
        <div className="flex w-full items-center gap-2 sm:w-[22rem]">
          <p className="grid shrink-0 place-items-center whitespace-nowrap rounded border border-cyan-100/15 bg-black/25 px-2 py-1 text-xs font-black text-cyan-50/85">
            {discoveredMicrogameCount}/{MICROGAMES.length}
          </p>
          <label className="min-w-0 flex-1 rounded border border-cyan-100/15 bg-black/25 px-2 py-1.5">
            <span className="flex items-center justify-between gap-2 text-[0.62rem] font-black uppercase tracking-normal text-cyan-100/70">
              <span>연습 속도</span>
              <span className="text-[0.68rem] text-white/85">
                x{formatPracticeSpeedMultiplier(practiceSpeedMultiplier)}
              </span>
            </span>
            <input
              aria-label="연습 게임 속도"
              className="mt-1 h-1.5 w-full accent-cyan-200"
              max={MAX_PRACTICE_SPEED_MULTIPLIER}
              min={MIN_PRACTICE_SPEED_MULTIPLIER}
              onChange={(event) => {
                setPracticeSpeedMultiplier(
                  normalizePracticeSpeedMultiplier(
                    Number.parseFloat(event.target.value),
                  ),
                );
              }}
              step={PRACTICE_SPEED_STEP}
              type="range"
              value={practiceSpeedMultiplier}
            />
          </label>
        </div>
      </div>
      <div className="grid gap-px overflow-hidden rounded border border-cyan-100/15 bg-white/10 sm:grid-cols-4 lg:grid-cols-7">
        {MICROGAMES.map((microgame) => {
          const formInstruction = getMicrogameFormInstruction(microgame);
          const isSeen = seenMicrogameIds.includes(microgame.id);
          const displayTitle = isSeen
            ? microgame.title
            : maskMicroscopeText(microgame.title);
          const displayControlTitle = isSeen
            ? formInstruction.title
            : maskMicroscopeText(formInstruction.title);

          const card = (
            <article
              className={`grid h-full min-h-22 grid-rows-[40px_1fr] gap-0.5 p-1 ${
                isSeen
                  ? "bg-slate-950/90 transition hover:bg-cyan-950/90"
                  : "bg-black/90 text-white/62"
              }`}
            >
              <div className="relative mx-auto size-10 overflow-hidden rounded border border-white/10 bg-slate-950">
                <Image
                  alt={microgame.microscope.imageAlt}
                  className={`size-full object-cover ${
                    isSeen ? "opacity-100" : "opacity-20"
                  }`}
                  decoding="async"
                  height={40}
                  sizes="40px"
                  src={microgame.microscope.imageSrc}
                  width={40}
                />
                {isSeen ? null : (
                  <div className="absolute inset-0 grid place-items-center bg-black/45">
                    <span className="rounded border border-white/25 bg-black/70 px-1 py-px text-[0.48rem] font-black text-white">
                      잠금
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0 text-center">
                <div className="flex min-w-0 items-baseline justify-center gap-1">
                  <h2 className="line-clamp-2 min-w-0 text-[0.68rem] font-black leading-[1.05] text-white">
                    {displayTitle}
                  </h2>
                  {microgame.type === "boss" ? (
                    <span className="relative -top-px shrink-0 rounded border border-amber-200/40 px-1 py-px text-[0.52rem] font-black uppercase tracking-normal text-amber-50">
                      Boss
                    </span>
                  ) : null}
                </div>
                <p className="mx-auto mt-0.5 max-w-full truncate text-[0.56rem] font-black leading-none text-cyan-50/62">
                  {displayControlTitle}
                </p>
              </div>
            </article>
          );

          if (isSeen) {
            return (
              <Link
                aria-label={`${microgame.title} 연습하기`}
                className="block"
                href={getMicrogamePracticeHref(
                  microgame,
                  practiceSpeedMultiplier,
                )}
                key={microgame.id}
              >
                {card}
              </Link>
            );
          }

          return (
            <div
              aria-label={`${microgame.title} 테스트 연습 열기`}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80"
              key={microgame.id}
              onBlur={() => {
                setTestPracticeMicrogameId((currentMicrogameId) =>
                  currentMicrogameId === microgame.id
                    ? null
                    : currentMicrogameId,
                );
              }}
              onFocus={() => {
                setTestPracticeMicrogameId(microgame.id);
              }}
              onMouseEnter={() => {
                setTestPracticeMicrogameId(microgame.id);
              }}
              onMouseLeave={() => {
                setTestPracticeMicrogameId((currentMicrogameId) =>
                  currentMicrogameId === microgame.id
                    ? null
                    : currentMicrogameId,
                );
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.metaKey || event.ctrlKey) {
                  return;
                }

                event.preventDefault();
                event.stopPropagation();
                router.push(
                  getMicrogamePracticeHref(microgame, practiceSpeedMultiplier),
                );
              }}
              role="button"
              tabIndex={0}
            >
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderHomeView(
  challengeModes: ChallengeModes,
  homeView: HomeView,
  highestReachedRound: number,
  isStarting: boolean,
  onChallengeModesChange: (challengeModes: ChallengeModes) => void,
  startGame: () => void,
  seenMicrogameIds: readonly string[],
) {
  if (homeView === "howToPlay") {
    return <HowToPlayPanel />;
  }

  if (homeView === "microscope") {
    return <MicroscopePanel seenMicrogameIds={seenMicrogameIds} />;
  }

  return (
    <HomePanel
      challengeModes={challengeModes}
      highestReachedRound={highestReachedRound}
      isStarting={isStarting}
      onChallengeModesChange={onChallengeModesChange}
      startGame={startGame}
    />
  );
}

export function MainScreen({
  challengeModes,
  highestReachedRound,
  homeView,
  onChallengeModesChange,
  onStart,
  seenMicrogameIds,
}: Readonly<{
  challengeModes: ChallengeModes;
  highestReachedRound: number;
  homeView: HomeView;
  onChallengeModesChange: (challengeModes: ChallengeModes) => void;
  onStart: () => void;
  seenMicrogameIds: readonly string[];
}>) {
  useBgmTrack("resultsAndMain", "loop", "now");
  const [isStarting, setIsStarting] = useState(false);
  const { rhythmStyle } = useSynchronizedRhythm();

  useEffect(() => {
    const unlockMainBgm = () => {
      unlockBgmLibrary().catch((error: unknown) => {
        console.error(error);
      });
    };

    unlockMainBgm();
    window.addEventListener("pointerdown", unlockMainBgm, { once: true });
    window.addEventListener("keydown", unlockMainBgm, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockMainBgm);
      window.removeEventListener("keydown", unlockMainBgm);
    };
  }, []);

  const startGame = () => {
    if (isStarting) {
      return;
    }

    setIsStarting(true);
    unlockBgmLibrary()
      .catch((error: unknown) => {
        console.error(error);
      })
      .finally(() => {
        window.setTimeout(() => {
          onStart();
        }, MAIN_SCREEN_EXIT_MS);
      });
  };

  return (
    <NeonShell
      animateBackdrop={homeView !== "microscope"}
      rhythmStyle={rhythmStyle}
    >
      <HomeHeader currentView={homeView} isStarting={isStarting} />
      <div
        className={`mt-16 rounded-lg border border-cyan-100/70 bg-black/55 shadow-[0_0_32px_rgba(103,232,249,0.18)] ${
          homeView === "microscope"
            ? "max-h-[calc(100vh-5rem)] overflow-y-auto p-3 sm:p-4"
            : "p-6 backdrop-blur-sm sm:p-8"
        } ${isStarting ? "main-screen-exit-up" : ""}`}
      >
        {renderHomeView(
          challengeModes,
          homeView,
          highestReachedRound,
          isStarting,
          onChallengeModesChange,
          startGame,
          seenMicrogameIds,
        )}
      </div>
    </NeonShell>
  );
}

export function SetupScreen({
  lives,
  maxLives,
  onComplete,
}: Readonly<{
  lives: number;
  maxLives: number;
  onComplete: () => void;
}>) {
  const { getStaggeredRhythmStyle, rhythmStyle } = useSynchronizedRhythm();

  useGameSetupTransition({
    isActive: true,
    onComplete,
  });

  return (
    <NeonShell rhythmStyle={rhythmStyle} shouldDim={false}>
      <FixedLivesOverlay
        animateSetup
        getStaggeredRhythmStyle={getStaggeredRhythmStyle}
        lives={lives}
        maxLives={maxLives}
      />
    </NeonShell>
  );
}

export function LoadingScreen({
  onRetry,
  preloadStatus,
}: Readonly<{
  onRetry: () => void;
  preloadStatus: PreloadStatus;
}>) {
  useBgmTrack("resultsAndMain", "loop", "now");
  const isFailed = preloadStatus.phase === "failed";
  const { cartoonIndex, messageIndex } = useLoadingScreenCarousel({
    cartoonCount: LOADING_CARTOONS.length,
    isPaused: isFailed,
    messageCount: LOADING_MESSAGES.length,
  });
  const loadingMessage = LOADING_MESSAGES[messageIndex];
  const loadingCartoon = LOADING_CARTOONS[cartoonIndex];

  return (
    <NeonShell>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-lg border border-cyan-100/70 bg-black/65 p-4 shadow-[0_0_36px_rgba(103,232,249,0.22)] backdrop-blur-sm sm:p-5">
        {loadingCartoon ? (
          <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-cyan-100/25 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/72">
                배경 이야기
              </p>
              <p className="text-xs font-black text-cyan-50/55">
                {cartoonIndex + 1}/{LOADING_CARTOONS.length}
              </p>
            </div>
            <div className="grid min-h-0 place-items-center py-3">
              <Image
                src={loadingCartoon.src}
                alt={loadingCartoon.alt}
                width={1024}
                height={1536}
                priority
                className="max-h-[68vh] w-full rounded object-contain shadow-[0_0_22px_rgba(103,232,249,0.18)]"
                sizes="(min-width: 768px) 600px, 92vw"
                unoptimized
              />
            </div>
            <div className="flex gap-1.5">
              {LOADING_CARTOONS.map((cartoon, index) => (
                <span
                  aria-hidden="true"
                  className={`h-1.5 flex-1 rounded-full ${
                    index === cartoonIndex ? "bg-cyan-100" : "bg-cyan-100/18"
                  }`}
                  key={cartoon.src}
                />
              ))}
            </div>
          </section>
        ) : null}
        <div className="flex items-center gap-3">
          <div className="loading-spinner-vital grid size-10 shrink-0 place-items-center">
            <Image
              src="/games/game-flow/images/loading-spinner.webp"
              alt=""
              width={64}
              height={54}
              priority
              className="h-auto w-full object-contain drop-shadow-[0_0_14px_rgba(103,232,249,0.58)]"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-cyan-50/88">
              {isFailed ? "로딩을 멈췄어요" : loadingMessage}
            </p>
            {isFailed ? (
              <div className="mt-1 flex min-w-0 items-center gap-2 text-xs font-black text-red-100">
                <span className="truncate">
                  {preloadStatus.errorMessage ?? "게임 준비에 실패했습니다."}
                </span>
                <button
                  className="ml-auto shrink-0 rounded border border-red-100/45 px-2 py-0.5 text-xs font-black text-red-50 transition hover:bg-red-500/20"
                  onClick={onRetry}
                  type="button"
                >
                  다시 시도
                </button>
              </div>
            ) : null}
            <div className="mt-2 h-2 overflow-hidden rounded-full border border-cyan-100/40 bg-black">
              <div
                className="h-full rounded-full bg-cyan-200 shadow-[0_0_16px_rgba(103,232,249,0.85)] transition-[width] duration-150 ease-out"
                style={{ width: `${preloadStatus.progress}%` }}
              />
            </div>
          </div>
          <p className="shrink-0 text-2xl font-black leading-none text-cyan-100">
            {isFailed ? "!" : `${preloadStatus.progress}%`}
          </p>
        </div>
      </div>
    </NeonShell>
  );
}

export function GameOverScreen({
  finalReachedRound,
  highestReachedRound,
  onReturnToMain,
}: Readonly<{
  finalReachedRound: number;
  highestReachedRound: number;
  onReturnToMain: () => void;
}>) {
  useEffect(() => {
    bgmLibrary.play("gameOver", "once").catch((error: unknown) => {
      console.error(error);
    });

    const resultMusicTimer = window.setTimeout(() => {
      bgmLibrary
        .play("resultsAndMain", "loop", "now")
        .catch((error: unknown) => {
          console.error(error);
        });
    }, GAME_OVER_DURATION_MS);

    return () => {
      window.clearTimeout(resultMusicTimer);
    };
  }, []);

  const returnToMain = () => {
    unlockBgmLibrary()
      .catch((error: unknown) => {
        console.error(error);
      })
      .finally(onReturnToMain);
  };

  return (
    <NeonShell>
      <div className="game-over-comic-drop mx-auto w-full max-w-3xl rounded-lg border border-cyan-100/70 bg-black/70 p-6 text-center shadow-[0_0_38px_rgba(103,232,249,0.24)] backdrop-blur-sm sm:p-8">
        <p className="mb-4 text-sm font-black uppercase tracking-[0.32em] text-cyan-100">
          게임 종료
        </p>
        <h1 className="text-5xl font-black leading-none text-white drop-shadow-[0_0_18px_rgba(103,232,249,0.7)] sm:text-7xl">
          Game Over
        </h1>
        <div className="mx-auto my-8 grid max-w-xl gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-white/35 bg-black/45 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">
              도달 층
            </p>
            <p className="mt-3 flex items-end justify-center gap-2 text-cyan-100 drop-shadow-[0_0_18px_rgba(103,232,249,0.7)]">
              <span className="text-6xl font-black leading-none sm:text-7xl">
                {finalReachedRound.toString().padStart(2, "0")}
              </span>
              <span className="pb-1 text-2xl font-black leading-none">층</span>
            </p>
          </div>
          <div className="rounded-md border border-cyan-100/55 bg-black/45 p-6 shadow-[0_0_24px_rgba(103,232,249,0.16)]">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">
              최고 기록
            </p>
            <p className="mt-3 flex items-end justify-center gap-2 text-cyan-100 drop-shadow-[0_0_18px_rgba(103,232,249,0.7)]">
              <span className="text-6xl font-black leading-none sm:text-7xl">
                {highestReachedRound.toString().padStart(2, "0")}
              </span>
              <span className="pb-1 text-2xl font-black leading-none">층</span>
            </p>
          </div>
        </div>
        <ScoreSubmissionPanel score={finalReachedRound} />
        <div className="flex justify-center">
          <NeonButton onClick={returnToMain}>메인으로</NeonButton>
        </div>
      </div>
    </NeonShell>
  );
}
