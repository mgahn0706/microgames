"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
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
import { useGameSetupTransition } from "@/hooks/useGameSetupTransition";
import {
  bgmLibrary,
  GAME_OVER_DURATION_MS,
  unlockBgmLibrary,
  type BgmTrack,
} from "@/lib/bgmLibrary";
import { useRandomFormInstruction } from "@/hooks/useRandomFormInstruction";

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
const MAIN_SCREEN_EXIT_MS = 680;

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
  shouldDim = true,
  roundResult = "idle",
}: Readonly<{ shouldDim?: boolean; roundResult?: GameRoundResult }>) {
  const elevatorImages = ELEVATOR_RESULT_IMAGES[roundResult];

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      aria-label="Neon elevator scene"
    >
      <Image
        className="absolute inset-0 size-full object-cover object-center opacity-100"
        src={elevatorImages[0]}
        alt=""
        fill
        priority
        sizes="100vw"
      />
      <Image
        className="neon-elevator-flicker absolute inset-0 size-full object-cover object-center"
        src={elevatorImages[1]}
        alt=""
        fill
        priority
        sizes="100vw"
      />
      {shouldDim ? (
        <>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.08),rgba(0,0,0,0.65)_70%)]" />
        </>
      ) : null}
    </div>
  );
}

function NeonShell({
  children,
  roundResult = "idle",
  rhythmStyle,
  shouldDim = true,
}: Readonly<{
  children: React.ReactNode;
  rhythmStyle?: SynchronizedRhythmStyle;
  roundResult?: GameRoundResult;
  shouldDim?: boolean;
}>) {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-black text-white"
      style={rhythmStyle}
    >
      <ElevatorBackdrop roundResult={roundResult} shouldDim={shouldDim} />
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-8 sm:px-8 lg:px-10">
        {children}
      </section>
    </main>
  );
}

function FixedLivesOverlay({
  animateSetup = false,
  getStaggeredRhythmStyle,
  lives,
  maxLives,
}: Readonly<{
  animateSetup?: boolean;
  getStaggeredRhythmStyle: (index: number) => SynchronizedRhythmStyle;
  lives: number;
  maxLives: number;
}>) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center pb-8 sm:pb-12"
      aria-label={`${lives} of ${maxLives} lives remaining`}
    >
      <div
        className={`${animateSetup ? "setup-screen" : ""} relative h-28 w-[min(92vw,720px)] sm:h-32`}
      >
        {LIFE_LABELS.map((label, index) => {
          const isActive = index < lives;
          const shouldAnimateInactive = !animateSetup && !isActive;
          const lifeSlotStyle = {
            "--setup-life-delay": animateSetup ? `${index * 140}ms` : "0ms",
            left: `${12.5 + index * 25}%`,
          } satisfies CSSProperties & {
            "--setup-life-delay": string;
          };

          return (
            <div
              className="setup-life-slot absolute top-0 h-20 w-24 sm:h-24 sm:w-36 lg:h-28 lg:w-44"
              key={label}
              style={lifeSlotStyle}
            >
              <div
                className="life-fish-motion relative size-full"
                style={getStaggeredRhythmStyle(index)}
              >
                <Image
                  src="/images/life-deactive.png"
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 176px, (min-width: 640px) 144px, 96px"
                  className={`object-contain transition-opacity duration-300 ${
                    isActive ? "opacity-0" : "opacity-100"
                  } ${shouldAnimateInactive ? "life-bone-enter" : ""}`}
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
                  } ${shouldAnimateInactive ? "life-active-exit" : ""}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
  phaseBeatCount,
  progressBeats,
}: Readonly<{
  phaseBeatCount: number;
  progressBeats: number;
}>) {
  return (
    <BeatIndicator
      phaseBeatCount={phaseBeatCount}
      progressBeats={progressBeats}
    />
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
      className="floor-display-card mx-auto grid size-56 place-items-center rounded-md border-2 border-cyan-100 bg-black/70 shadow-[0_0_38px_rgba(103,232,249,0.32)] sm:size-72"
      style={floorRiseStyle}
    >
      <div className="text-center">
        <p className="text-sm font-black uppercase tracking-[0.32em] text-cyan-100">
          현재 층
        </p>
        <div className="relative mt-3 h-28 overflow-hidden sm:h-36">
          <p className="floor-number-rise-out absolute inset-0 grid place-items-center text-8xl font-black leading-none text-white/55 drop-shadow-[0_0_18px_rgba(103,232,249,0.45)] sm:text-9xl">
            {previousRoundNumber.toString().padStart(2, "0")}
          </p>
          <p className="floor-number-rise-in absolute inset-0 grid place-items-center text-8xl font-black leading-none text-white drop-shadow-[0_0_18px_rgba(103,232,249,0.75)] sm:text-9xl">
            {roundNumber.toString().padStart(2, "0")}
          </p>
        </div>
      </div>
    </div>
  );
}

function InstructionRoundScreen({
  instructionStep,
  phaseBeatCount,
  progressBeats,
  rhythmStyle,
  roundNumber,
}: Readonly<{
  instructionStep: "formPhoto" | "formDescription" | "floor";
  phaseBeatCount: number;
  progressBeats: number;
  rhythmStyle: SynchronizedRhythmStyle;
  roundNumber: number;
}>) {
  const formInstruction = useRandomFormInstruction(roundNumber);
  const shouldShowFormDescription = instructionStep === "formDescription";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 text-center">
      {instructionStep !== "floor" ? (
        <div
          className={`instruction-form-stage ${
            shouldShowFormDescription ? "instruction-form-stage-description" : ""
          }`}
        >
          <div className="instruction-photo-only-card rounded-lg border border-cyan-100/70 bg-black/70 p-3 shadow-[0_0_28px_rgba(103,232,249,0.18)]">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={formInstruction.imageSrc}
                alt={formInstruction.alt}
                fill
                sizes="(min-width: 640px) 240px, 62vw"
                className="object-contain drop-shadow-[0_0_22px_rgba(103,232,249,0.62)]"
              />
            </div>
          </div>
          <div className="instruction-description-card rounded-lg border border-cyan-100/70 bg-black/70 p-5 shadow-[0_0_28px_rgba(103,232,249,0.18)] sm:p-6">
            <div className="relative mx-auto aspect-[4/3] w-52 sm:w-56">
              <Image
                src={formInstruction.imageSrc}
                alt={formInstruction.alt}
                fill
                sizes="224px"
                className="object-contain drop-shadow-[0_0_18px_rgba(103,232,249,0.55)]"
              />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-sm font-black uppercase tracking-[0.32em] text-cyan-100">
                조작법
              </p>
              <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">
                {formInstruction.title}
              </h1>
              <p className="mt-4 leading-7 text-cyan-50/80">
                {formInstruction.description}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <CurrentFloorDisplay
          rhythmStyle={rhythmStyle}
          roundNumber={roundNumber}
        />
      )}
      <RoundFooter
        phaseBeatCount={phaseBeatCount}
        progressBeats={progressBeats}
      />
    </div>
  );
}

function MicrogameRoundScreen({
  canRecordResult,
  gameBeatCount,
  onFinish,
  onRecordFailure,
  onRecordSuccess,
  phaseBeatCount,
  progressBeats,
}: Readonly<{
  canRecordResult: boolean;
  gameBeatCount: number;
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
        phaseBeatCount={phaseBeatCount}
        progressBeats={progressBeats}
      />
    </div>
  );
}

function ResultRoundScreen({
  phaseBeatCount,
  progressBeats,
}: Readonly<{
  phaseBeatCount: number;
  progressBeats: number;
}>) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl items-end justify-center pb-40 text-center">
      <RoundFooter
        phaseBeatCount={phaseBeatCount}
        progressBeats={progressBeats}
      />
    </div>
  );
}

function SpeedUpScreen({
  phaseBeatCount,
  progressBeats,
  speedLevel,
}: Readonly<{
  phaseBeatCount: number;
  progressBeats: number;
  speedLevel: number;
}>) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-8 pb-24 text-center">
      <div className="speed-up-typography">
        <p className="text-sm font-black uppercase tracking-[0.34em] text-cyan-100">
          Speed Up
        </p>
        <h1 className="mt-4 text-6xl font-black leading-none text-white drop-shadow-[0_0_24px_rgba(103,232,249,0.8)] sm:text-8xl">
          BPM UP
        </h1>
        <p className="mt-5 text-xl font-black tracking-[0.24em] text-cyan-50/80">
          LEVEL {speedLevel + 1}
        </p>
      </div>
      <RoundFooter
        phaseBeatCount={phaseBeatCount}
        progressBeats={progressBeats}
      />
    </div>
  );
}

function MainScreen({ onStart }: Readonly<{ onStart: () => void }>) {
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
    <NeonShell rhythmStyle={rhythmStyle}>
      <div
        className={`rounded-lg border border-cyan-100/70 bg-black/55 p-6 shadow-[0_0_32px_rgba(103,232,249,0.18)] backdrop-blur-sm sm:p-8 ${
          isStarting ? "main-screen-exit-up" : ""
        }`}
      >
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
              <NeonButton onClick={startGame}>
                {isStarting ? "준비 중" : "게임 시작"}
              </NeonButton>
            </div>
          </div>
          <div className="mx-auto w-full max-w-48 lg:max-w-none">
            <Image
              src="/images/game-main-logo.png"
              alt="캣타워 오르기 로고"
              width={880}
              height={1268}
              priority
              className="main-logo-bounce h-auto w-full object-contain drop-shadow-[0_0_24px_rgba(103,232,249,0.45)]"
            />
          </div>
        </div>
      </div>
    </NeonShell>
  );
}

function SetupScreen({
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
  const {
    beatDurationMs,
    gameBeatCount,
    instructionStep,
    phase,
    phaseBeatCount,
    progressBeats,
    recordFailure,
    recordSuccess,
    roundNumber,
    roundResult,
    speedLevel,
  } = useBeatGameRound({
    onFailure: onLoseLife,
    onFinish,
    onResetResult,
    onSuccess,
    shouldFinishAfterResult: lives <= 0,
  });
  const { getStaggeredRhythmStyle, rhythmStyle } =
    useSynchronizedRhythm(beatDurationMs);
  const canRecordResult = phase === "game";
  useEffect(() => {
    bgmLibrary.setBeatDurationMs(beatDurationMs);

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

    if (phase === "speedUp") {
      bgmLibrary.play("speedUp", "once").catch((error: unknown) => {
        console.error(error);
      });
      return;
    }

    const nextResultBgmTrack = RESULT_BGM_TRACKS[roundResult];
    const shouldGoToGameOver = roundResult === "failure" && lives <= 0;
    const shouldSpeedUpAfterResult = roundNumber % 4 === 0;

    if (!nextResultBgmTrack) {
      return;
    }

    if (shouldGoToGameOver) {
      bgmLibrary.play(nextResultBgmTrack, "once").catch((error: unknown) => {
        console.error(error);
      });
      return;
    }

    if (shouldSpeedUpAfterResult) {
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
  }, [beatDurationMs, lives, phase, roundNumber, roundResult]);

  return (
    <NeonShell
      roundResult={roundResult}
      rhythmStyle={rhythmStyle}
      shouldDim={false}
    >
      <FixedLivesOverlay
        getStaggeredRhythmStyle={getStaggeredRhythmStyle}
        lives={lives}
        maxLives={maxLives}
      />
      {phase === "instruction" ? (
        <InstructionRoundScreen
          instructionStep={instructionStep}
          phaseBeatCount={phaseBeatCount}
          progressBeats={progressBeats}
          rhythmStyle={rhythmStyle}
          roundNumber={roundNumber}
        />
      ) : phase === "game" ? (
        <MicrogameRoundScreen
          canRecordResult={canRecordResult}
          gameBeatCount={gameBeatCount}
          onFinish={onFinish}
          onRecordFailure={recordFailure}
          onRecordSuccess={recordSuccess}
          phaseBeatCount={phaseBeatCount}
          progressBeats={progressBeats}
        />
      ) : phase === "speedUp" ? (
        <SpeedUpScreen
          phaseBeatCount={phaseBeatCount}
          progressBeats={progressBeats}
          speedLevel={speedLevel}
        />
      ) : (
        <ResultRoundScreen
          phaseBeatCount={phaseBeatCount}
          progressBeats={progressBeats}
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
    completeSetup,
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

  if (screen === "setup") {
    return (
      <SetupScreen
        lives={lives}
        maxLives={maxLives}
        onComplete={completeSetup}
      />
    );
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
