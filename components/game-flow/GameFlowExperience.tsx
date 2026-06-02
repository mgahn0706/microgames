"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useBgmTrack } from "@/hooks/useBgmTrack";
import {
  type GameRoundResult,
  useGameScreenFlow,
} from "@/hooks/useGameScreenFlow";
import { useBeatGameRound } from "@/hooks/useBeatGameRound";
import {
  RHYTHM_DURATION_MS,
  type SynchronizedRhythmStyle,
  useSynchronizedRhythm,
} from "@/hooks/useSynchronizedRhythm";
import {
  bgmLibrary,
  GAME_OVER_DURATION_MS,
  unlockBgmLibrary,
  type BgmTrack,
} from "@/lib/bgmLibrary";

const ELEVATOR_IMAGES = [
  "/images/main-elevator-1.png",
  "/images/main-elevator-2.png",
];
const ELEVATOR_RESULT_IMAGES = {
  failure: [
    "/images/main-elevator-fail-1.png",
    "/images/main-elevator-fail-2.png",
  ],
  idle: ELEVATOR_IMAGES,
  success: [
    "/images/main-elevator-success-1.png",
    "/images/main-elevator-success-2.png",
  ],
} satisfies Record<GameRoundResult, string[]>;

const LIFE_LABELS = ["Life 1", "Life 2", "Life 3", "Life 4"];
const RESULT_BGM_TRACKS = {
  failure: "fail",
  idle: null,
  success: "success",
} satisfies Record<GameRoundResult, BgmTrack | null>;

function NeonButton({
  children,
  onClick,
  variant = "primary",
}: Readonly<{
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
}>) {
  const buttonTone =
    variant === "primary"
      ? "border-cyan-200 bg-cyan-200 text-black shadow-[0_0_24px_rgba(103,232,249,0.45)] hover:bg-white"
      : "border-white/70 bg-black/50 text-white hover:border-cyan-200 hover:text-cyan-100";

  return (
    <button
      className={`${buttonTone} min-h-12 rounded-md border px-6 py-3 text-base font-black uppercase tracking-[0.18em] transition`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ElevatorBackdrop({
  roundResult = "idle",
}: Readonly<{ roundResult?: GameRoundResult }>) {
  const elevatorImages = ELEVATOR_RESULT_IMAGES[roundResult];

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      aria-label="Neon elevator scene"
    >
      <Image
        className="absolute inset-0 size-full object-cover opacity-100"
        src={elevatorImages[0]}
        alt=""
        fill
        priority
        sizes="100vw"
      />
      <Image
        className="neon-elevator-flicker absolute inset-0 size-full object-cover"
        src={elevatorImages[1]}
        alt=""
        fill
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.08),rgba(0,0,0,0.65)_70%)]" />
    </div>
  );
}

function NeonShell({
  children,
  roundResult = "idle",
  rhythmStyle,
}: Readonly<{
  children: React.ReactNode;
  rhythmStyle?: SynchronizedRhythmStyle;
  roundResult?: GameRoundResult;
}>) {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-black text-white"
      style={rhythmStyle}
    >
      <ElevatorBackdrop roundResult={roundResult} />
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-8 sm:px-8 lg:px-10">
        {children}
      </section>
    </main>
  );
}

function LivesMeter({
  getStaggeredRhythmStyle,
  lives,
  maxLives,
}: Readonly<{
  getStaggeredRhythmStyle: (index: number) => SynchronizedRhythmStyle;
  lives: number;
  maxLives: number;
}>) {
  return (
    <div
      className="mt-6 flex justify-center"
      aria-label={`${lives} of ${maxLives} lives remaining`}
    >
      <div className="flex w-full max-w-4xl items-end justify-center gap-1 px-3 py-2 sm:gap-4 sm:px-6 sm:py-3">
        {LIFE_LABELS.map((label, index) => {
          const isActive = index < lives;

          return (
            <div
              className="life-fish-motion relative h-20 w-24 sm:h-24 sm:w-36 lg:h-28 lg:w-44"
              key={label}
              style={getStaggeredRhythmStyle(index)}
            >
              <Image
                src="/images/life-deactive.png"
                alt=""
                fill
                sizes="(min-width: 1024px) 176px, (min-width: 640px) 144px, 96px"
                className={`object-contain transition-opacity duration-300 ${
                  isActive ? "opacity-0" : "opacity-100"
                }`}
              />
              <Image
                src="/images/life-active.png"
                alt={isActive ? `${label} active` : ""}
                fill
                sizes="(min-width: 1024px) 176px, (min-width: 640px) 144px, 96px"
                className={`object-contain transition-opacity duration-300 ${
                  isActive
                    ? "opacity-100 drop-shadow-[0_0_18px_#67e8f9]"
                    : "opacity-0"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoundLives({
  getStaggeredRhythmStyle,
  lives,
  maxLives,
}: Readonly<{
  getStaggeredRhythmStyle: (index: number) => SynchronizedRhythmStyle;
  lives: number;
  maxLives: number;
}>) {
  return (
    <LivesMeter
      getStaggeredRhythmStyle={getStaggeredRhythmStyle}
      lives={lives}
      maxLives={maxLives}
    />
  );
}

function BeatIndicator({
  phaseBeatCount,
  progressBeats,
}: Readonly<{
  phaseBeatCount: number;
  progressBeats: number;
}>) {
  return (
    <div
      className="mx-auto flex items-center justify-center gap-2"
      aria-label={`Beat ${progressBeats} of ${phaseBeatCount}`}
    >
      {Array.from({ length: phaseBeatCount }, (_, index) => {
        const isActive = index < progressBeats;

        return (
          <span
            className={`size-3 rounded-full border transition ${
              isActive
                ? "border-cyan-100 bg-cyan-100 shadow-[0_0_14px_rgba(103,232,249,0.8)]"
                : "border-white/35 bg-black/55"
            }`}
            key={index}
          />
        );
      })}
      <span className="ml-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-50/80">
        {progressBeats}/{phaseBeatCount}
      </span>
    </div>
  );
}

function RoundFooter({
  getStaggeredRhythmStyle,
  lives,
  maxLives,
  phaseBeatCount,
  progressBeats,
}: Readonly<{
  getStaggeredRhythmStyle: (index: number) => SynchronizedRhythmStyle;
  lives: number;
  maxLives: number;
  phaseBeatCount: number;
  progressBeats: number;
}>) {
  return (
    <div className="space-y-4">
      <BeatIndicator
        phaseBeatCount={phaseBeatCount}
        progressBeats={progressBeats}
      />
      <RoundLives
        getStaggeredRhythmStyle={getStaggeredRhythmStyle}
        lives={lives}
        maxLives={maxLives}
      />
    </div>
  );
}

function CurrentFloorDisplay({
  roundNumber,
  rhythmStyle,
}: Readonly<{
  roundNumber: number;
  rhythmStyle: SynchronizedRhythmStyle;
}>) {
  const previousRoundNumber = Math.max(roundNumber - 1, 0);
  const floorRiseStyle = {
    ...rhythmStyle,
    "--floor-rise-duration": `${RHYTHM_DURATION_MS * 4}ms`,
  } satisfies SynchronizedRhythmStyle & { "--floor-rise-duration": string };

  return (
    <div
      className="mx-auto grid size-56 place-items-center rounded-md border-2 border-cyan-100 bg-black/70 shadow-[0_0_38px_rgba(103,232,249,0.32)] sm:size-72"
      style={floorRiseStyle}
    >
      <div className="text-center">
        <p className="text-sm font-black uppercase tracking-[0.32em] text-cyan-100">
          Current Floor
        </p>
        <div className="relative mt-3 h-28 overflow-hidden sm:h-36">
          <p className="floor-number-rise-out absolute inset-0 text-8xl font-black leading-none text-white/55 drop-shadow-[0_0_18px_rgba(103,232,249,0.45)] sm:text-9xl">
            {previousRoundNumber.toString().padStart(2, "0")}
          </p>
          <p className="floor-number-rise-in absolute inset-0 text-8xl font-black leading-none text-white drop-shadow-[0_0_18px_rgba(103,232,249,0.75)] sm:text-9xl">
            {roundNumber.toString().padStart(2, "0")}
          </p>
        </div>
      </div>
    </div>
  );
}

function InstructionRoundScreen({
  getStaggeredRhythmStyle,
  instructionStep,
  lives,
  maxLives,
  phaseBeatCount,
  progressBeats,
  rhythmStyle,
  roundNumber,
}: Readonly<{
  getStaggeredRhythmStyle: (index: number) => SynchronizedRhythmStyle;
  instructionStep: "controls" | "floor";
  lives: number;
  maxLives: number;
  phaseBeatCount: number;
  progressBeats: number;
  rhythmStyle: SynchronizedRhythmStyle;
  roundNumber: number;
}>) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 text-center">
      {instructionStep === "controls" ? (
        <div className="mx-auto grid max-w-3xl gap-5 rounded-lg border border-cyan-100/70 bg-black/70 p-6 shadow-[0_0_36px_rgba(103,232,249,0.22)] backdrop-blur-sm sm:grid-cols-[220px_1fr] sm:text-left">
          <div className="relative mx-auto aspect-square w-44 sm:w-full">
            <Image
              src="/images/forms/space.png"
              alt="Space key control form"
              fill
              sizes="220px"
              className="object-contain drop-shadow-[0_0_18px_rgba(103,232,249,0.55)]"
            />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-sm font-black uppercase tracking-[0.32em] text-cyan-100">
              Form
            </p>
            <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">
              스페이스로 박자에 맞춰 입력
            </h1>
            <p className="mt-4 leading-7 text-cyan-50/80">
              조작법을 확인하면 현재 층이 올라갑니다.
            </p>
          </div>
        </div>
      ) : (
        <CurrentFloorDisplay
          rhythmStyle={rhythmStyle}
          roundNumber={roundNumber}
        />
      )}
      <RoundFooter
        getStaggeredRhythmStyle={getStaggeredRhythmStyle}
        lives={lives}
        maxLives={maxLives}
        phaseBeatCount={phaseBeatCount}
        progressBeats={progressBeats}
      />
    </div>
  );
}

function MicrogameRoundScreen({
  canRecordResult,
  gameBeatCount,
  getStaggeredRhythmStyle,
  lives,
  maxLives,
  onFinish,
  onRecordFailure,
  onRecordSuccess,
  phaseBeatCount,
  progressBeats,
}: Readonly<{
  canRecordResult: boolean;
  gameBeatCount: number;
  getStaggeredRhythmStyle: (index: number) => SynchronizedRhythmStyle;
  lives: number;
  maxLives: number;
  onFinish: () => void;
  onRecordFailure: () => void;
  onRecordSuccess: () => void;
  phaseBeatCount: number;
  progressBeats: number;
}>) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <section className="flex min-h-[520px] flex-col justify-between rounded-lg border border-cyan-200 bg-cyan-950/75 p-6 text-center shadow-[0_0_42px_rgba(103,232,249,0.25)] backdrop-blur-sm">
        <div className="border-b border-cyan-100/50 pb-4">
          <p className="font-black uppercase tracking-[0.24em] text-cyan-100">
            Microgame
          </p>
        </div>
        <div className="grid flex-1 place-items-center py-12">
          <div className="space-y-4">
            <h1 className="text-6xl font-black leading-tight drop-shadow-[0_0_18px_rgba(103,232,249,0.7)] sm:text-8xl">
              Press at the beat
            </h1>
            <p className="mx-auto max-w-md text-cyan-50/75">
              본게임은 소리 없이 {gameBeatCount}비트 동안 진행됩니다.
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            className="min-h-12 rounded-md border border-white/70 bg-black/50 px-6 py-3 text-base font-black uppercase tracking-[0.18em] text-white transition enabled:hover:border-cyan-200 enabled:hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canRecordResult}
            onClick={onRecordSuccess}
            type="button"
          >
            성공 처리
          </button>
          <button
            className="min-h-12 rounded-md border border-white/70 bg-black/50 px-6 py-3 text-base font-black uppercase tracking-[0.18em] text-white transition enabled:hover:border-cyan-200 enabled:hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canRecordResult}
            onClick={onRecordFailure}
            type="button"
          >
            실패 처리
          </button>
          <NeonButton onClick={onFinish} variant="secondary">
            게임 종료
          </NeonButton>
        </div>
      </section>
      <RoundFooter
        getStaggeredRhythmStyle={getStaggeredRhythmStyle}
        lives={lives}
        maxLives={maxLives}
        phaseBeatCount={phaseBeatCount}
        progressBeats={progressBeats}
      />
    </div>
  );
}

function ResultRoundScreen({
  getStaggeredRhythmStyle,
  lives,
  maxLives,
  phaseBeatCount,
  progressBeats,
  roundResult,
}: Readonly<{
  getStaggeredRhythmStyle: (index: number) => SynchronizedRhythmStyle;
  lives: number;
  maxLives: number;
  phaseBeatCount: number;
  progressBeats: number;
  roundResult: GameRoundResult;
}>) {
  const resultTone = {
    failure: {
      label: "Failure",
      message: "실패했습니다. 라이프가 1개 줄어듭니다.",
      state: "실패",
      tone: "border-rose-300/80 bg-rose-950/55 text-rose-100",
    },
    idle: {
      label: "Ready",
      message: "판정 대기 중입니다.",
      state: "대기 중",
      tone: "border-white/35 bg-black/45 text-cyan-50/80",
    },
    success: {
      label: "Success",
      message: "성공했습니다. 사운드가 끝나면 다음 게임으로 넘어갑니다.",
      state: "성공",
      tone: "border-emerald-200/80 bg-emerald-950/55 text-emerald-100",
    },
  }[roundResult];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 text-center">
      <section className="rounded-lg border border-cyan-100/70 bg-black/70 p-8 shadow-[0_0_42px_rgba(103,232,249,0.25)] backdrop-blur-sm sm:p-12">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-100">
            Result
          </p>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-white/60">
            {resultTone.label}
          </p>
          <div className={`mt-6 rounded-md border p-8 ${resultTone.tone}`}>
            <h1 className="text-7xl font-black sm:text-9xl">
              {resultTone.state}
            </h1>
            <p className="mt-5 text-lg leading-8">{resultTone.message}</p>
          </div>
        </div>
      </section>
      <RoundFooter
        getStaggeredRhythmStyle={getStaggeredRhythmStyle}
        lives={lives}
        maxLives={maxLives}
        phaseBeatCount={phaseBeatCount}
        progressBeats={progressBeats}
      />
    </div>
  );
}

function MainScreen({ onStart }: Readonly<{ onStart: () => void }>) {
  useBgmTrack("resultsAndMain", "loop", "now");

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
    unlockBgmLibrary()
      .catch((error: unknown) => {
        console.error(error);
      })
      .finally(onStart);
  };

  return (
    <NeonShell>
      <div className="rounded-lg border border-cyan-100/70 bg-black/55 p-6 shadow-[0_0_32px_rgba(103,232,249,0.18)] backdrop-blur-sm sm:p-8">
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
            <div className="flex flex-col gap-3 sm:flex-row">
              <NeonButton onClick={startGame}>게임 시작</NeonButton>
            </div>
          </div>
          <div className="mx-auto w-full max-w-48 lg:max-w-none">
            <Image
              src="/images/game-main-logo.png"
              alt="캣타워 오르기 로고"
              width={880}
              height={1268}
              priority
              className="h-auto w-full object-contain drop-shadow-[0_0_24px_rgba(103,232,249,0.45)]"
            />
          </div>
        </div>
      </div>
    </NeonShell>
  );
}

function LoadingScreen() {
  useBgmTrack("resultsAndMain", "loop", "now");

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
            src="/images/loading-spinner.png"
            alt=""
            width={180}
            height={151}
            priority
            className="h-auto w-full object-contain drop-shadow-[0_0_22px_rgba(103,232,249,0.75)]"
          />
        </div>
        <div className="mx-auto my-8 h-4 max-w-md overflow-hidden rounded-full border border-cyan-100/70 bg-black">
          <div className="neon-loading-bar h-full rounded-full bg-cyan-200" />
        </div>
      </div>
    </NeonShell>
  );
}

function GameScreen({
  lives,
  maxLives,
  onFinish,
  onLoseLife,
  onResetResult,
  onSuccess,
}: Readonly<{
  lives: number;
  maxLives: number;
  onFinish: () => void;
  onLoseLife: () => void;
  onResetResult: () => void;
  onSuccess: () => void;
}>) {
  const { getStaggeredRhythmStyle, rhythmStyle } = useSynchronizedRhythm();
  const {
    gameBeatCount,
    instructionStep,
    phase,
    phaseBeatCount,
    progressBeats,
    recordFailure,
    recordSuccess,
    roundNumber,
    roundResult,
  } = useBeatGameRound({
    onFailure: onLoseLife,
    onFinish,
    onResetResult,
    onSuccess,
    shouldFinishAfterResult: lives <= 0,
  });
  const canRecordResult = phase === "game";
  useEffect(() => {
    if (phase === "instruction") {
      bgmLibrary.play("intermission", "once").catch((error: unknown) => {
        console.error(error);
      });
      return;
    }

    if (phase === "game") {
      bgmLibrary.stop();
      return;
    }

    const nextResultBgmTrack = RESULT_BGM_TRACKS[roundResult];
    const shouldGoToGameOver = roundResult === "failure" && lives <= 0;

    if (!nextResultBgmTrack) {
      return;
    }

    if (shouldGoToGameOver) {
      bgmLibrary.play(nextResultBgmTrack, "once").catch((error: unknown) => {
        console.error(error);
      });
      return;
    }

    bgmLibrary
      .playSequence(nextResultBgmTrack, "once", "intermission", "once")
      .catch((error: unknown) => {
        console.error(error);
      });
  }, [lives, phase, roundResult]);

  return (
    <NeonShell roundResult={roundResult} rhythmStyle={rhythmStyle}>
      {phase === "instruction" ? (
        <InstructionRoundScreen
          getStaggeredRhythmStyle={getStaggeredRhythmStyle}
          instructionStep={instructionStep}
          lives={lives}
          maxLives={maxLives}
          phaseBeatCount={phaseBeatCount}
          progressBeats={progressBeats}
          rhythmStyle={rhythmStyle}
          roundNumber={roundNumber}
        />
      ) : phase === "game" ? (
        <MicrogameRoundScreen
          canRecordResult={canRecordResult}
          gameBeatCount={gameBeatCount}
          getStaggeredRhythmStyle={getStaggeredRhythmStyle}
          lives={lives}
          maxLives={maxLives}
          onFinish={onFinish}
          onRecordFailure={recordFailure}
          onRecordSuccess={recordSuccess}
          phaseBeatCount={phaseBeatCount}
          progressBeats={progressBeats}
        />
      ) : (
        <ResultRoundScreen
          getStaggeredRhythmStyle={getStaggeredRhythmStyle}
          lives={lives}
          maxLives={maxLives}
          phaseBeatCount={phaseBeatCount}
          progressBeats={progressBeats}
          roundResult={roundResult}
        />
      )}
    </NeonShell>
  );
}

function GameOverScreen({
  onReturnToMain,
}: Readonly<{
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
          Final Floor
        </p>
        <h1 className="text-5xl font-black leading-none text-white drop-shadow-[0_0_18px_rgba(103,232,249,0.7)] sm:text-7xl">
          Game Over
        </h1>
        <div className="mx-auto my-8 grid max-w-xl gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-white/35 bg-black/45 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">
              Score
            </p>
            <p className="mt-2 text-3xl font-black text-cyan-100">000</p>
          </div>
          <div className="rounded-md border border-white/35 bg-black/45 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">
              Round
            </p>
            <p className="mt-2 text-3xl font-black text-cyan-100">01</p>
          </div>
          <div className="rounded-md border border-white/35 bg-black/45 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">
              Status
            </p>
            <p className="mt-2 text-3xl font-black text-cyan-100">End</p>
          </div>
        </div>
        <div className="flex justify-center">
          <NeonButton onClick={returnToMain}>메인으로</NeonButton>
        </div>
      </div>
    </NeonShell>
  );
}

export function GameFlowExperience() {
  const {
    finishGame,
    lives,
    loseLife,
    maxLives,
    recordSuccess,
    resetRoundResult,
    returnToMain,
    screen,
    startGame,
  } = useGameScreenFlow();

  if (screen === "loading") {
    return <LoadingScreen />;
  }

  if (screen === "playing") {
    return (
      <GameScreen
        lives={lives}
        maxLives={maxLives}
        onFinish={finishGame}
        onLoseLife={loseLife}
        onResetResult={resetRoundResult}
        onSuccess={recordSuccess}
      />
    );
  }

  if (screen === "gameOver") {
    return <GameOverScreen onReturnToMain={returnToMain} />;
  }

  return <MainScreen onStart={startGame} />;
}
