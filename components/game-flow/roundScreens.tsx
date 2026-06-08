"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useState } from "react";
import { FORM_INSTRUCTIONS } from "@/data/formInstructions";
import type { Microgame } from "@/data/microgames";
import { getMicrogameFormInstruction } from "@/data/microgames";
import type { InstructionStep } from "@/hooks/useBeatGameRound";
import type { SynchronizedRhythmStyle } from "@/hooks/useSynchronizedRhythm";
import {
  getRandomBossStageMessage,
  getRandomSpeedUpMessage,
} from "./gameFlowConstants";
import { MicrogameCanvas } from "./MicrogameCanvas";

function CurrentFloorDisplay({
  beatDurationMs,
  roundNumber,
  rhythmStyle,
}: Readonly<{
  beatDurationMs: number;
  roundNumber: number;
  rhythmStyle: SynchronizedRhythmStyle;
}>) {
  const previousRoundNumber = Math.max(roundNumber - 1, 0);
  const floorElevatorStyle = {
    ...rhythmStyle,
    "--floor-elevator-duration": `${beatDurationMs * 4}ms`,
  } satisfies SynchronizedRhythmStyle & {
    "--floor-elevator-duration": string;
  };

  return (
    <div
      className="floor-display-card mx-auto grid size-56 place-items-center rounded-md border-2 border-cyan-100 bg-black/70 shadow-[0_0_38px_rgba(103,232,249,0.32)] sm:size-72"
      style={floorElevatorStyle}
    >
      <div className="w-full text-center">
        <p className="text-sm font-black uppercase tracking-[0.32em] text-cyan-100">
          현재 층
        </p>
        <div className="relative mx-auto mt-3 h-28 w-full overflow-hidden sm:h-36">
          <p className="floor-number-elevator-out absolute inset-0 grid place-items-center text-8xl font-black leading-none text-white/55 drop-shadow-[0_0_18px_rgba(103,232,249,0.45)] sm:text-9xl">
            {previousRoundNumber.toString().padStart(2, "0")}
          </p>
          <p className="floor-number-elevator-in absolute inset-0 grid place-items-center text-8xl font-black leading-none text-white drop-shadow-[0_0_18px_rgba(103,232,249,0.75)] sm:text-9xl">
            {roundNumber.toString().padStart(2, "0")}
          </p>
        </div>
      </div>
    </div>
  );
}

export function InstructionRoundScreen({
  beatDurationMs,
  instructionStep,
  isNoControlMode,
  microgame,
  rhythmStyle,
  roundNumber,
}: Readonly<{
  beatDurationMs: number;
  instructionStep: InstructionStep;
  isNoControlMode: boolean;
  microgame: Microgame;
  rhythmStyle: SynchronizedRhythmStyle;
  roundNumber: number;
}>) {
  const formInstruction = getMicrogameFormInstruction(microgame);
  const selectedFormIndex = FORM_INSTRUCTIONS.findIndex(
    (candidate) => candidate.imageSrc === formInstruction.imageSrc,
  );
  const shouldShowIdle = instructionStep === "idle";
  const shouldShowFloor = instructionStep === "floor";
  const shouldHideInstruction = instructionStep === "promptTransition";

  if (isNoControlMode) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-8 text-center">
        <div className="instruction-form-stage">
          <CurrentFloorDisplay
            beatDurationMs={beatDurationMs}
            rhythmStyle={rhythmStyle}
            roundNumber={roundNumber}
          />
        </div>
      </div>
    );
  }

  if (shouldHideInstruction) {
    return <div className="mx-auto min-h-screen w-full max-w-5xl" />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 text-center">
      <div className="instruction-form-stage">
        {shouldShowFloor ? (
          <CurrentFloorDisplay
            beatDurationMs={beatDurationMs}
            rhythmStyle={rhythmStyle}
            roundNumber={roundNumber}
          />
        ) : null}
        {instructionStep !== "floor" ? (
          <>
            {shouldShowIdle ? (
              <div className="instruction-idle-grid-card rounded-lg border border-cyan-100/45 bg-black/35 shadow-[0_0_22px_rgba(103,232,249,0.14)]">
                <div className="instruction-selection-grid">
                  {FORM_INSTRUCTIONS.map((candidate) => {
                    const isSelected =
                      candidate.imageSrc === formInstruction.imageSrc;

                    return (
                      <div
                        className={`instruction-selection-tile ${
                          isSelected ? "instruction-selection-tile-hidden" : ""
                        }`}
                        key={candidate.imageSrc}
                      >
                        <Image
                          src={candidate.imageSrc}
                          alt={isSelected ? formInstruction.alt : ""}
                          fill
                          sizes="96px"
                          className="object-contain drop-shadow-[0_0_14px_rgba(103,232,249,0.5)]"
                          unoptimized
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div
              className={`instruction-photo-card rounded-lg border bg-black/70 p-3 ${
                shouldShowIdle
                  ? "instruction-photo-card-grid-selected border-cyan-100/70 shadow-[0_0_24px_rgba(103,232,249,0.34)]"
                  : "instruction-photo-card-popup border-cyan-100/70 shadow-[0_0_28px_rgba(103,232,249,0.18)]"
              }`}
              style={
                {
                  "--instruction-selected-column": selectedFormIndex % 4,
                  "--instruction-selected-row": Math.floor(
                    selectedFormIndex / 4,
                  ),
                } as CSSProperties
              }
            >
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={formInstruction.imageSrc}
                  alt={formInstruction.alt}
                  fill
                  sizes="(min-width: 640px) 360px, 78vw"
                  className="object-contain drop-shadow-[0_0_22px_rgba(103,232,249,0.62)]"
                  unoptimized
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function MicrogameRoundScreen({
  beatsLeft,
  isTransitioning = false,
  microgame,
  roundNumber,
}: Readonly<{
  beatsLeft: number;
  isTransitioning?: boolean;
  microgame: Microgame;
  roundNumber: number;
}>) {
  return (
    <div
      className={`fixed inset-0 bg-black ${
        isTransitioning ? "microgame-canvas-transition pointer-events-none" : ""
      }`}
    >
      <MicrogameCanvas
        key={`${roundNumber}-${microgame.id}`}
        microgame={microgame}
      />
      {isTransitioning ? null : (
        <>
          <div className="timer-beat-shell absolute left-4 top-4 size-28 sm:left-6 sm:top-6 sm:size-32">
            <Image
              src="/games/game-flow/images/timer.png"
              alt=""
              fill
              sizes="(min-width: 640px) 128px, 112px"
              className="object-contain drop-shadow-[0_0_16px_rgba(103,232,249,0.55)]"
              priority
              unoptimized
            />
            <p className="timer-beat-number absolute inset-0 grid place-items-center pt-2 text-4xl font-black leading-none text-white sm:text-5xl">
              {beatsLeft}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function ResultRoundScreen() {
  return <div className="mx-auto min-h-screen w-full max-w-5xl text-center" />;
}

export function SpeedUpScreen() {
  const [cheerMessage] = useState(getRandomSpeedUpMessage);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-8 pb-24 text-center">
      <div className="speed-up-typography">
        <h1 className="phase-typography-title mt-4 text-6xl font-black leading-none text-white sm:text-8xl">
          SPEED UP
        </h1>
        <p className="phase-typography-message mt-5 text-xl font-black tracking-[0.24em] text-cyan-50">
          {cheerMessage}
        </p>
      </div>
    </div>
  );
}

export function BossStageScreen() {
  const [cheerMessage] = useState(getRandomBossStageMessage);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-8 pb-24 text-center">
      <div className="speed-up-typography">
        <h1 className="phase-typography-title mt-4 text-6xl font-black leading-none text-white sm:text-8xl">
          BOSS STAGE
        </h1>
        <p className="phase-typography-message mt-5 text-xl font-black tracking-[0.24em] text-cyan-50">
          {cheerMessage}
        </p>
      </div>
    </div>
  );
}

export function OneUpScreen() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-8 pb-24 text-center">
      <div className="speed-up-typography">
        <h1 className="phase-typography-title mt-4 text-6xl font-black leading-none text-white sm:text-8xl">
          1-UP
        </h1>
        <p className="phase-typography-message mt-5 text-xl font-black tracking-[0.24em] text-cyan-50">
          목숨 하나 추가!
        </p>
      </div>
    </div>
  );
}
