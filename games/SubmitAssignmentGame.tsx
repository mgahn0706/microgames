"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import { useSubmitAssignmentGame } from "@/games/useSubmitAssignmentGame";

const BACKGROUND_SRC = "/games/submit-assignment/images/background.png";
const BACKGROUND_FRAME_STYLE = {
  aspectRatio: "1672 / 941",
  width: "min(100vw, calc(100vh * 1672 / 941))",
} as const;
const CHECKBOX_OVERLAY_STYLE = {
  height: "7.4%",
  left: "25.5%",
  top: "34.7%",
  width: "4.7%",
} as const;
const SUBMIT_DISABLED_OVERLAY_STYLE = {
  height: "11.4%",
  left: "35.4%",
  top: "45.7%",
  width: "13.2%",
} as const;

function EmojiRain({ emoji }: Readonly<{ emoji: string }>) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20"
    >
      {Array.from({ length: 34 }, (_, index) => (
        <span
          className="absolute -top-12 text-[clamp(1.8rem,4vw,3.6rem)] drop-shadow-[0_8px_12px_rgba(0,0,0,0.24)]"
          key={index}
          style={{
            animation: `submit-assignment-rain ${1.05 + (index % 7) * 0.11}s linear ${index * 0.025}s both`,
            left: `${(index * 29) % 100}%`,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

export function SubmitAssignmentGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const { containerRef, handlePointerDown, hasChecked, result } =
    useSubmitAssignmentGame();

  return (
    <div
      className="relative h-screen w-screen cursor-pointer touch-none select-none overflow-hidden bg-white"
      onDragStart={(event) => {
        event.preventDefault();
      }}
      onPointerDown={handlePointerDown}
      ref={containerRef}
    >
      <Image
        alt=""
        className="select-none object-contain"
        draggable={false}
        fill
        onDragStart={(event) => {
          event.preventDefault();
        }}
        priority
        sizes="100vw"
        src={BACKGROUND_SRC}
        unoptimized
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={BACKGROUND_FRAME_STYLE}
      >
        {hasChecked ? (
          <div
            className="absolute grid place-items-center text-[clamp(2.2rem,3.8vw,4rem)] font-black leading-none text-[#111827]"
            style={CHECKBOX_OVERLAY_STYLE}
          >
            ✓
          </div>
        ) : null}
        {!hasChecked ? (
          <div
            className="absolute rounded bg-white/54 shadow-[inset_0_0_0_2px_rgba(148,163,184,0.34)] backdrop-grayscale"
            style={SUBMIT_DISABLED_OVERLAY_STYLE}
          />
        ) : null}
      </div>
      {result === "success" ? <EmojiRain emoji="🎉" /> : null}
      {result === "failure" ? <EmojiRain emoji="💀" /> : null}
      <style jsx>{`
        @keyframes submit-assignment-rain {
          0% {
            opacity: 0;
            transform: translate3d(0, -12vh, 0) rotate(0deg);
          }
          10% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 116vh, 0) rotate(420deg);
          }
        }
      `}</style>
    </div>
  );
}
