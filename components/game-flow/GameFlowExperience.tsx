"use client";

import Image from "next/image";
import { useGameScreenFlow } from "@/hooks/useGameScreenFlow";

const ELEVATOR_IMAGES = [
  "/images/main-elevator-1.png",
  "/images/main-elevator-2.png",
];

const FLOW_STEPS = ["Lobby", "Loading", "Mission", "Game Over"];

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

function ElevatorBackdrop() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      aria-label="Neon elevator scene"
    >
      <Image
        className="absolute inset-0 size-full object-cover opacity-100"
        src={ELEVATOR_IMAGES[0]}
        alt=""
        fill
        priority
        sizes="100vw"
      />
      <Image
        className="neon-elevator-flicker absolute inset-0 size-full object-cover"
        src={ELEVATOR_IMAGES[1]}
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

function NeonShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <ElevatorBackdrop />
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-8 sm:px-8 lg:px-10">
        {children}
      </section>
    </main>
  );
}

function FlowPanel({ currentStep }: Readonly<{ currentStep: string }>) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {FLOW_STEPS.map((step) => {
        const isActive = step === currentStep;

        return (
          <div
            className={`rounded-md border px-4 py-3 text-sm font-black uppercase tracking-[0.16em] ${
              isActive
                ? "border-cyan-200 bg-cyan-200 text-black shadow-[0_0_22px_rgba(103,232,249,0.5)]"
                : "border-white/35 bg-black/45 text-white/70"
            }`}
            key={step}
          >
            {step}
          </div>
        );
      })}
    </div>
  );
}

function MainScreen({ onStart }: Readonly<{ onStart: () => void }>) {
  return (
    <NeonShell>
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <div className="space-y-7 rounded-lg border border-cyan-100/70 bg-black/55 p-6 shadow-[0_0_32px_rgba(103,232,249,0.18)] backdrop-blur-sm sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.32em] text-cyan-100">
            Elevator Ready
          </p>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-5xl font-black leading-none tracking-normal text-white drop-shadow-[0_0_18px_rgba(103,232,249,0.7)] sm:text-7xl">
              미션 층으로 이동합니다.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-cyan-50/85">
              문이 열리면 짧은 규칙을 보고 바로 반응하세요. 엘리베이터는
              로비에서 게임 화면까지 끊김 없이 이동합니다.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <NeonButton onClick={onStart}>게임 시작</NeonButton>
          </div>
        </div>

        <div className="rounded-lg border border-cyan-100/70 bg-black/60 p-5 shadow-[0_0_30px_rgba(103,232,249,0.2)] backdrop-blur-sm">
          <div className="mb-5 flex items-center justify-between border-b border-cyan-100/50 pb-4">
            <span className="font-black uppercase tracking-[0.24em] text-cyan-100">
              Floor 00
            </span>
            <span className="rounded border border-white/60 px-3 py-1 text-sm font-black text-white">
              Lobby
            </span>
          </div>
          <FlowPanel currentStep="Lobby" />
        </div>
      </div>
    </NeonShell>
  );
}

function LoadingScreen() {
  return (
    <NeonShell>
      <div className="mx-auto w-full max-w-2xl rounded-lg border border-cyan-100/70 bg-black/65 p-6 text-center shadow-[0_0_36px_rgba(103,232,249,0.22)] backdrop-blur-sm sm:p-8">
        <p className="mb-4 text-sm font-black uppercase tracking-[0.32em] text-cyan-100">
          Loading All Games
        </p>
        <h1 className="text-4xl font-black text-white drop-shadow-[0_0_18px_rgba(103,232,249,0.65)] sm:text-6xl">
          모든 게임 준비 중
        </h1>
        <div className="mx-auto my-8 h-4 max-w-md overflow-hidden rounded-full border border-cyan-100/70 bg-black">
          <div className="neon-loading-bar h-full rounded-full bg-cyan-200" />
        </div>
        <FlowPanel currentStep="Loading" />
      </div>
    </NeonShell>
  );
}

function GameScreen({ onFinish }: Readonly<{ onFinish: () => void }>) {
  return (
    <NeonShell>
      <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="space-y-4 rounded-lg border border-cyan-100/70 bg-black/65 p-5 shadow-[0_0_30px_rgba(103,232,249,0.18)] backdrop-blur-sm">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-100">
              Floor 01
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">Mission</h1>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-white/35 bg-black/45 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                Round
              </p>
              <p className="mt-2 text-3xl font-black text-cyan-100">01</p>
            </div>
            <div className="rounded-md border border-white/35 bg-black/45 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                Score
              </p>
              <p className="mt-2 text-3xl font-black text-cyan-100">000</p>
            </div>
          </div>
          <FlowPanel currentStep="Mission" />
        </aside>

        <section className="flex min-h-[420px] flex-col justify-between rounded-lg border border-cyan-100/70 bg-black/70 p-6 shadow-[0_0_36px_rgba(103,232,249,0.22)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 border-b border-cyan-100/50 pb-4">
            <p className="font-black uppercase tracking-[0.24em] text-cyan-100">
              Door Open
            </p>
            <p className="rounded border border-white/60 px-3 py-1 text-sm font-black">
              Time 08
            </p>
          </div>
          <div className="grid flex-1 place-items-center py-12 text-center">
            <div className="space-y-4">
              <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-100">
                Basic Layout
              </p>
              <h2 className="text-5xl font-black leading-tight drop-shadow-[0_0_18px_rgba(103,232,249,0.7)]">
                Press at the beat
              </h2>
              <p className="mx-auto max-w-md text-cyan-50/75">
                실제 마이크로게임이 들어갈 영역입니다. 지금은 화면 흐름 확인을
                위한 기본 레이아웃만 표시합니다.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <NeonButton onClick={onFinish} variant="secondary">
              게임 종료
            </NeonButton>
          </div>
        </section>
      </div>
    </NeonShell>
  );
}

function GameOverScreen({
  onRestart,
  onReturnToMain,
}: Readonly<{
  onRestart: () => void;
  onReturnToMain: () => void;
}>) {
  return (
    <NeonShell>
      <div className="mx-auto w-full max-w-3xl rounded-lg border border-cyan-100/70 bg-black/70 p-6 text-center shadow-[0_0_38px_rgba(103,232,249,0.24)] backdrop-blur-sm sm:p-8">
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
        <div className="mb-8">
          <FlowPanel currentStep="Game Over" />
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <NeonButton onClick={onRestart}>다시 시작</NeonButton>
          <NeonButton onClick={onReturnToMain} variant="secondary">
            메인으로
          </NeonButton>
        </div>
      </div>
    </NeonShell>
  );
}

export function GameFlowExperience() {
  const { finishGame, restartGame, returnToMain, screen, startGame } =
    useGameScreenFlow();

  if (screen === "loading") {
    return <LoadingScreen />;
  }

  if (screen === "playing") {
    return <GameScreen onFinish={finishGame} />;
  }

  if (screen === "gameOver") {
    return (
      <GameOverScreen onRestart={restartGame} onReturnToMain={returnToMain} />
    );
  }

  return <MainScreen onStart={startGame} />;
}
