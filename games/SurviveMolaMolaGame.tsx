"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import { useSurviveMolaMolaGame } from "@/games/useSurviveMolaMolaGame";

const BACKGROUND_SRC = "/games/survive-mola-mola/images/background.png";
const DEATH_MOLA_MOLA_SRC =
  "/games/survive-mola-mola/images/death-mola-mola.png";
const MOLA_MOLA_SRC = "/games/survive-mola-mola/images/mola-mola.png";
const SHRIMP_SRC = "/games/survive-mola-mola/images/shrimp.png";
const SHRIMP_LAYOUT = [
  { id: 1, x: 34, y: 43, rotate: "-8deg", scale: 1 },
  { id: 2, x: 67, y: 36, rotate: "12deg", scale: 0.94 },
] as const;

export function SurviveMolaMolaGame({
  beatDurationMs,
  isActive,
  microgame,
}: Readonly<{
  beatDurationMs: number;
  isActive: boolean;
  microgame: Microgame;
}>) {
  const {
    activeShrimpId,
    eatenShrimpIds,
    handleMolaMolaPointerDown,
    handleShrimpPointerDown,
    hasFailed,
    isEating,
    molaMotion,
    targetShrimpCount,
  } = useSurviveMolaMolaGame({
    beatCount: microgame.beatCount,
    beatDurationMs,
    isActive,
  });
  const isCleared = eatenShrimpIds.length >= targetShrimpCount;

  return (
    <div className="relative h-screen w-screen touch-none select-none overflow-hidden bg-[#009dcc]">
      <Image
        alt=""
        className="object-cover"
        draggable={false}
        fill
        priority
        sizes="100vw"
        src={BACKGROUND_SRC}
        unoptimized
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(134,232,255,0.08),rgba(2,72,118,0.16))]" />

      {SHRIMP_LAYOUT.map((shrimp) => {
        const isEaten = eatenShrimpIds.includes(shrimp.id);
        const isBeingEaten = activeShrimpId === shrimp.id;

        return (
          <button
            aria-label={`${shrimp.id}번째 새우 먹기`}
            className={`absolute z-20 aspect-[69/55] w-[clamp(5.8rem,11vw,10.5rem)] -translate-x-1/2 -translate-y-1/2 outline-none transition duration-150 ${
              isEaten
                ? "pointer-events-none scale-50 opacity-0"
                : isBeingEaten
                  ? "pointer-events-none scale-95 opacity-80"
                  : "scale-100 hover:scale-110 active:scale-95"
            }`}
            disabled={
              hasFailed || isCleared || isEaten || activeShrimpId !== null
            }
            key={shrimp.id}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleShrimpPointerDown(shrimp.id, {
                x: shrimp.x,
                y: shrimp.y,
              });
            }}
            style={{
              left: `${shrimp.x}%`,
              top: `${shrimp.y}%`,
            }}
            type="button"
          >
            <span
              className="absolute inset-0"
              style={{
                transform: `rotate(${shrimp.rotate}) scale(${shrimp.scale})`,
              }}
            >
              <Image
                alt=""
                className="object-contain drop-shadow-[0_8px_8px_rgba(0,47,72,0.42)]"
                draggable={false}
                fill
                sizes="168px"
                src={SHRIMP_SRC}
                unoptimized
              />
            </span>
          </button>
        );
      })}

      <button
        aria-label="개복치"
        className={`absolute z-30 aspect-[56/59] w-[clamp(9rem,22vw,18rem)] -translate-x-1/2 -translate-y-1/2 outline-none transition-[left,top,opacity] duration-500 ease-out ${
          hasFailed ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        disabled={hasFailed || isCleared || activeShrimpId !== null}
        onPointerDown={(event) => {
          event.preventDefault();
          handleMolaMolaPointerDown();
        }}
        style={{
          left: `${molaMotion.x}%`,
          top: `${molaMotion.y}%`,
        }}
        type="button"
      >
        <span
          className={`absolute inset-0 ${isEating ? "mola-mola-eating" : ""}`}
          key={molaMotion.motionKey}
          style={{
            transform: `scaleX(${molaMotion.direction === "right" ? -1 : 1})`,
          }}
        >
          <Image
            alt=""
            className="object-contain drop-shadow-[0_16px_14px_rgba(0,46,70,0.36)]"
            draggable={false}
            fill
            priority
            sizes="288px"
            src={MOLA_MOLA_SRC}
            unoptimized
          />
        </span>
      </button>

      {hasFailed ? (
        <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-cyan-950/28">
          <div className="mola-mola-sudden-death relative aspect-[3/2] h-[min(76vh,70vw)]">
            <Image
              alt=""
              className="object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,0.35)]"
              draggable={false}
              fill
              priority
              sizes="76vh"
              src={DEATH_MOLA_MOLA_SRC}
              unoptimized
            />
            <div className="absolute left-1/2 top-[13%] -translate-x-1/2 rounded border-4 border-red-700 bg-white px-6 py-2 text-[clamp(2rem,5vw,5rem)] font-black text-red-700 shadow-[0_8px_0_rgba(127,29,29,0.32)]">
              돌연사
            </div>
          </div>
        </div>
      ) : null}
      <style jsx>{`
        .mola-mola-eating {
          animation: mola-mola-eating 520ms cubic-bezier(0.16, 0.9, 0.22, 1.2)
            both;
        }

        .mola-mola-sudden-death {
          animation: mola-mola-sudden-death 1100ms ease-out both;
        }

        @keyframes mola-mola-eating {
          0%,
          100% {
            translate: 0 0;
            rotate: 0deg;
          }
          20% {
            translate: -4px -3px;
            rotate: -5deg;
          }
          42% {
            translate: 5px 2px;
            rotate: 4deg;
          }
          65% {
            translate: -3px 3px;
            rotate: -3deg;
          }
          82% {
            translate: 3px -2px;
            rotate: 2deg;
          }
        }

        @keyframes mola-mola-sudden-death {
          0% {
            opacity: 0;
            transform: scale(0.55) rotate(-8deg);
          }
          15% {
            opacity: 1;
            transform: scale(1.08) rotate(3deg);
          }
          30% {
            transform: scale(0.98) rotate(-2deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
}
