"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { GameRoundResult } from "@/hooks/useGameScreenFlow";
import type { SynchronizedRhythmStyle } from "@/hooks/useSynchronizedRhythm";
import {
  ELEVATOR_RESULT_IMAGES,
  ELEVATOR_WARNING_IMAGES,
} from "./gameFlowConstants";

type ElevatorBackdropTone = "default" | "warning";

export function NeonButton({
  children,
  onClick,
  variant = "primary",
}: Readonly<{
  children: ReactNode;
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
  animate = true,
  isVisible = true,
  transition = "none",
  shouldDim = true,
  roundResult = "idle",
  tone = "default",
}: Readonly<{
  animate?: boolean;
  isVisible?: boolean;
  roundResult?: GameRoundResult;
  shouldDim?: boolean;
  tone?: ElevatorBackdropTone;
  transition?: "none" | "toElevator";
}>) {
  const elevatorImages =
    tone === "warning"
      ? ELEVATOR_WARNING_IMAGES
      : ELEVATOR_RESULT_IMAGES[roundResult];

  return (
    <div
      className={`fixed inset-0 overflow-hidden ${
        isVisible ? "" : "elevator-backdrop-hidden"
      } ${
        isVisible && transition === "toElevator"
          ? "elevator-result-transition"
          : ""
      }`}
      aria-label="Neon elevator scene"
    >
      <Image
        className="absolute inset-0 size-full object-cover object-center opacity-100"
        src={elevatorImages[0]}
        alt=""
        fill
        priority
        sizes="100vw"
        unoptimized
      />
      <Image
        className={`absolute inset-0 size-full object-cover object-center ${
          animate
            ? tone === "warning"
              ? "warning-elevator-overlay"
              : "neon-elevator-flicker"
            : "opacity-0"
        }`}
        src={elevatorImages[1]}
        alt=""
        fill
        priority
        sizes="100vw"
        unoptimized
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

export function NeonShell({
  animateBackdrop = true,
  children,
  showBackdrop = true,
  roundResult = "idle",
  rhythmStyle,
  shouldDim = true,
  backdropTone = "default",
  transition = "none",
}: Readonly<{
  animateBackdrop?: boolean;
  backdropTone?: ElevatorBackdropTone;
  children: ReactNode;
  rhythmStyle?: SynchronizedRhythmStyle;
  roundResult?: GameRoundResult;
  showBackdrop?: boolean;
  shouldDim?: boolean;
  transition?: "none" | "toElevator";
}>) {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-black text-white"
      style={rhythmStyle}
    >
      <ElevatorBackdrop
        animate={animateBackdrop}
        isVisible={showBackdrop}
        tone={backdropTone}
        roundResult={roundResult}
        shouldDim={shouldDim}
        transition={transition}
      />
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-8 sm:px-8 lg:px-10">
        {children}
      </section>
    </main>
  );
}
