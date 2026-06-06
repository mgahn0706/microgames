"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MICROGAMES, getMicrogameFormInstruction } from "@/data/microgames";
import type { PreloadStatus } from "@/hooks/useGameScreenFlow";
import { useBgmTrack } from "@/hooks/useBgmTrack";
import { useGameSetupTransition } from "@/hooks/useGameSetupTransition";
import { useSynchronizedRhythm } from "@/hooks/useSynchronizedRhythm";
import {
  bgmLibrary,
  GAME_OVER_DURATION_MS,
  unlockBgmLibrary,
} from "@/lib/bgmLibrary";
import { FixedLivesOverlay } from "./FixedLivesOverlay";
import { MAIN_SCREEN_EXIT_MS } from "./gameFlowConstants";
import { NeonButton, NeonShell } from "./NeonShell";

const LOADING_MESSAGES = [
  "식빵 굽는 중...",
  "엘리베이터 점검 중...",
  "도장 잉크 채우는 중...",
  "룬 해독하는 중...",
  "카트 예열하는 중...",
  "챔피언 목록 펼치는 중...",
  "도감 페이지 넘기는 중...",
  "전선 연결 순서 확인 중...",
  "코인 블록 준비 중...",
  "선인장 위치 확인 중...",
  "점프 타이밍 맞추는 중...",
  "슬라이드 구간 확인 중...",
  "낱말 내려보내는 중...",
  "원형 판정 준비 중...",
  "긴 블록 위치 맞추는 중...",
  "광석 배치하는 중...",
  "멜로디 순서 맞추는 중...",
  "블록 문제 고르는 중...",
  "탐지기 문구 불러오는 중...",
  "화살표 순서 섞는 중...",
  "같은 모양 찾는 중...",
  "밴할 챔피언 고르는 중...",
  "카드 한 장 뒤집는 중...",
  "벨 울릴 순간 기다리는 중...",
  "주사위 게이지 맞추는 중...",
  "물풍선 위치 정하는 중...",
  "마지막 바퀴 준비 중...",
  "운하 코스 확인 중...",
  "스탬프 위치 맞추는 중...",
  "과일 개수 확인 중...",
  "몬스터 이름 불러오는 중...",
  "클리어 판정 준비 중...",
  "다음 게임 순서 섞는 중...",
  "결과 화면 준비 중...",
] as const;

export type HomeView = "home" | "howToPlay" | "microscope";

const HOME_NAV_ITEMS = [
  { href: "/", label: "홈", view: "home" },
  { href: "/how-to-play", label: "게임 방법", view: "howToPlay" },
  { href: "/microscope", label: "도감", view: "microscope" },
] as const;

function HomeHeader({
  homeView,
  isStarting,
}: Readonly<{
  homeView: HomeView;
  isStarting: boolean;
}>) {
  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 ${
        isStarting ? "main-screen-exit-up" : ""
      }`}
    >
      <nav className="w-full bg-white/10 px-4 py-3 shadow-[0_0_28px_rgba(103,232,249,0.18)] backdrop-blur-xl sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            className="shrink-0 px-2 text-sm font-black tracking-normal text-cyan-50 drop-shadow-[0_0_12px_rgba(103,232,249,0.72)] sm:px-3 sm:text-base"
            href="/"
          >
            캣타워 오르기
          </Link>
          <div className="grid grid-cols-3 gap-1 rounded-md border border-white/10 bg-black/20 p-1">
            {HOME_NAV_ITEMS.map((item) => {
              const isActive = homeView === item.view;

              return (
                <Link
                  className={`rounded px-3 py-2 text-center text-xs font-black transition sm:min-w-24 sm:text-sm ${
                    isActive
                      ? "bg-cyan-100 text-black shadow-[0_0_18px_rgba(103,232,249,0.38)]"
                      : "text-cyan-50/78 hover:bg-white/10 hover:text-white"
                  }`}
                  href={item.href}
                  key={item.view}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </header>
  );
}

function HomePanel({
  highestClearedRound,
  isStarting,
  startGame,
}: Readonly<{
  highestClearedRound: number;
  isStarting: boolean;
  startGame: () => void;
}>) {
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
              {highestClearedRound.toString().padStart(2, "0")}
            </span>
            <span className="pb-1 text-lg font-black leading-none">층</span>
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <NeonButton onClick={startGame}>
            {isStarting ? "준비 중" : "게임 시작"}
          </NeonButton>
        </div>
      </div>
      <div className="mx-auto w-full max-w-48 lg:max-w-none">
        <Image
          src="/games/game-flow/images/game-main-logo.png"
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
          빠르게 보고, 바로 움직이기
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

function MicroscopePanel({
  seenMicrogameIds,
}: Readonly<{
  seenMicrogameIds: readonly string[];
}>) {
  const discoveredMicrogameCount = MICROGAMES.filter(({ id }) =>
    seenMicrogameIds.includes(id),
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100">
            Game Microscope
          </p>
          <h1 className="text-3xl font-black leading-none text-white drop-shadow-[0_0_14px_rgba(103,232,249,0.55)] sm:text-4xl">
            게임 도감
          </h1>
        </div>
        <p className="w-fit rounded-md border border-cyan-100/35 bg-black/30 px-3 py-2 text-sm font-black text-cyan-50">
          발견 {discoveredMicrogameCount}/{MICROGAMES.length}
        </p>
      </div>
      <div className="overflow-hidden rounded-md border border-cyan-100/25 bg-black/32">
        {MICROGAMES.map((microgame) => {
          const formInstruction = getMicrogameFormInstruction(microgame);
          const isSeen = seenMicrogameIds.includes(microgame.id);

          return (
            <article
              className={`grid min-h-24 grid-cols-[72px_1fr] gap-3 border-b border-white/10 p-3 last:border-b-0 sm:grid-cols-[84px_1fr_auto] sm:items-center sm:gap-4 ${
                isSeen
                  ? "bg-white/[0.03]"
                  : "bg-black/24 text-white/62"
              }`}
              key={microgame.id}
            >
              <div className="relative size-[72px] overflow-hidden rounded border border-white/12 bg-slate-950 sm:size-[84px]">
                <Image
                  alt={microgame.microscope.imageAlt}
                  className={`size-full object-cover ${
                    isSeen ? "opacity-100" : "opacity-20"
                  }`}
                  decoding="async"
                  height={84}
                  sizes="84px"
                  src={microgame.microscope.imageSrc}
                  width={84}
                />
                {isSeen ? null : (
                  <div className="absolute inset-0 grid place-items-center bg-black/45">
                    <span className="rounded border border-white/30 bg-black/70 px-2 py-1 text-xs font-black text-white">
                      잠금
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="min-w-0 text-lg font-black leading-tight text-white">
                    {microgame.title}
                  </h2>
                  <span
                    className={`rounded border px-2 py-0.5 text-[0.68rem] font-black ${
                      isSeen
                        ? "border-cyan-100/35 text-cyan-50"
                        : "border-white/20 text-white/50"
                    }`}
                  >
                    {isSeen ? "발견" : "미발견"}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-black text-cyan-50/82">
                  {formInstruction.title}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-cyan-50/68">
                  {microgame.microscope.description}
                </p>
              </div>
              {microgame.type === "boss" ? (
                <div className="col-start-2 flex items-center justify-end sm:col-start-auto sm:items-start">
                  <span className="rounded border border-amber-200/45 px-2 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-amber-50">
                    Boss
                  </span>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function renderHomeView(
  homeView: HomeView,
  highestClearedRound: number,
  isStarting: boolean,
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
      highestClearedRound={highestClearedRound}
      isStarting={isStarting}
      startGame={startGame}
    />
  );
}

export function MainScreen({
  highestClearedRound,
  homeView,
  onStart,
  seenMicrogameIds,
}: Readonly<{
  highestClearedRound: number;
  homeView: HomeView;
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
      <HomeHeader homeView={homeView} isStarting={isStarting} />
      <div
        className={`mt-16 rounded-lg border border-cyan-100/70 bg-black/55 p-6 shadow-[0_0_32px_rgba(103,232,249,0.18)] sm:p-8 ${
          homeView === "microscope"
            ? "max-h-[calc(100vh-6rem)] overflow-y-auto"
            : "backdrop-blur-sm"
        } ${
          isStarting ? "main-screen-exit-up" : ""
        }`}
      >
        {renderHomeView(
          homeView,
          highestClearedRound,
          isStarting,
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

function getDisplayAssetPath(assetPath: string) {
  if (!assetPath) {
    return "";
  }

  return assetPath.length > 88 ? `...${assetPath.slice(-85)}` : assetPath;
}

export function LoadingScreen({
  onRetry,
  preloadStatus,
}: Readonly<{
  onRetry: () => void;
  preloadStatus: PreloadStatus;
}>) {
  useBgmTrack("resultsAndMain", "loop", "now");
  const [messageIndex, setMessageIndex] = useState(0);
  const progress =
    preloadStatus.total > 0
      ? Math.round((preloadStatus.loaded / preloadStatus.total) * 100)
      : 0;
  const isFailed = preloadStatus.phase === "failed";
  const loadingMessage = LOADING_MESSAGES[messageIndex];

  useEffect(() => {
    if (isFailed) {
      return;
    }

    const messageTimer = window.setInterval(() => {
      setMessageIndex(
        (currentMessageIndex) =>
          (currentMessageIndex + 1) % LOADING_MESSAGES.length,
      );
    }, 1400);

    return () => {
      window.clearInterval(messageTimer);
    };
  }, [isFailed]);

  return (
    <NeonShell>
      <div className="mx-auto w-full max-w-2xl rounded-lg border border-cyan-100/70 bg-black/65 p-6 text-center shadow-[0_0_36px_rgba(103,232,249,0.22)] backdrop-blur-sm sm:p-8">
        <p className="mb-4 text-sm font-black uppercase tracking-[0.32em] text-cyan-100">
          Cat Tower
        </p>
        <h1 className="text-4xl font-black text-white drop-shadow-[0_0_18px_rgba(103,232,249,0.65)] sm:text-6xl">
          잠시만 기다려 주세요
        </h1>
        <div className="loading-spinner-vital mx-auto mt-8 grid size-32 place-items-center sm:size-40">
          <Image
            src="/games/game-flow/images/loading-spinner.png"
            alt=""
            width={180}
            height={151}
            priority
            className="h-auto w-full object-contain drop-shadow-[0_0_22px_rgba(103,232,249,0.75)]"
            unoptimized
          />
        </div>
        <p className="mt-5 text-sm font-black text-cyan-50/80">
          {isFailed ? "로딩을 멈췄어요" : loadingMessage}
        </p>
        <div className="mx-auto my-8 h-4 max-w-md overflow-hidden rounded-full border border-cyan-100/70 bg-black">
          <div
            className="h-full rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(103,232,249,0.9)] transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mx-auto max-w-xl rounded-md border border-cyan-100/25 bg-black/35 p-3 text-left text-xs leading-5 text-cyan-50/75">
          <div className="flex items-center justify-between gap-3 font-black text-cyan-100">
            <span>{isFailed ? "프리로딩 실패" : "프리로딩 중"}</span>
            <span>
              {preloadStatus.loaded}/{preloadStatus.total} · {progress}%
            </span>
          </div>
          {isFailed ? (
            <div className="mt-2 space-y-1 text-red-100">
              <p>
                실패 asset:{" "}
                <span className="break-all font-black">
                  {getDisplayAssetPath(preloadStatus.failedAsset ?? "")}
                </span>
              </p>
              <p className="break-all text-red-100/75">
                {preloadStatus.errorMessage}
              </p>
              <button
                className="mt-2 rounded border border-red-100/45 px-3 py-1 text-xs font-black text-red-50 transition hover:bg-red-500/20"
                onClick={onRetry}
                type="button"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <p className="mt-2 break-all text-cyan-50/65">
              현재 로드:{" "}
              <span className="font-black">
                {getDisplayAssetPath(preloadStatus.currentAsset)}
              </span>
            </p>
          )}
        </div>
      </div>
    </NeonShell>
  );
}

export function GameOverScreen({
  finalClearedRound,
  highestClearedRound,
  onReturnToMain,
}: Readonly<{
  finalClearedRound: number;
  highestClearedRound: number;
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
                {finalClearedRound.toString().padStart(2, "0")}
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
                {highestClearedRound.toString().padStart(2, "0")}
              </span>
              <span className="pb-1 text-2xl font-black leading-none">층</span>
            </p>
          </div>
        </div>
        <div className="flex justify-center">
          <NeonButton onClick={returnToMain}>메인으로</NeonButton>
        </div>
      </div>
    </NeonShell>
  );
}
