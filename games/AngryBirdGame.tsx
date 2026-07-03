"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import { useAngryBirdGame } from "@/games/useAngryBirdGame";

const BACKGROUND_SRC = "/games/angry-bird/images/background.png";
const BIRD_SRC = "/games/angry-bird/images/angry-bird.png";
const SLINGSHOT_SRC = "/games/angry-bird/images/slingshot.png";

function getBandPath(
  launchPoint: Readonly<{ x: number; y: number }>,
  birdPoint: Readonly<{ x: number; y: number }>,
) {
  return `M ${launchPoint.x - 0.55} ${launchPoint.y - 3.55} L ${birdPoint.x} ${birdPoint.y} M ${launchPoint.x + 0.55} ${launchPoint.y - 3.55} L ${birdPoint.x} ${birdPoint.y}`;
}

export function AngryBirdGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const {
    birdElementRef,
    birdPoint,
    clearLineX,
    dragPoint,
    handlePointerCancel,
    handlePointerDown,
    handlePointerLeave,
    handlePointerMove,
    handlePointerUp,
    launchPoint,
    phase,
  } = useAngryBirdGame();

  return (
    <div
      className="relative h-screen w-screen touch-none select-none overflow-hidden bg-[#bdeaf0]"
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="absolute left-1/2 top-1/2 aspect-[728/410] w-[max(100vw,177.561vh)] -translate-x-1/2 -translate-y-1/2">
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
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <line
            stroke="#fef08a"
            strokeDasharray="1.5 1.5"
            strokeLinecap="round"
            strokeWidth="0.7"
            x1={clearLineX}
            x2={clearLineX}
            y1="24"
            y2="86"
          />
          {phase === "aiming" || dragPoint ? (
            <path
              d={getBandPath(launchPoint, birdPoint)}
              fill="none"
              stroke="#4a2412"
              strokeLinecap="round"
              strokeWidth="3.4"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
        <Image
          alt=""
          className="pointer-events-none absolute z-20 h-auto w-[5.2%] -translate-x-1/2 -translate-y-[19%] object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.28)]"
          draggable={false}
          height={847}
          priority
          sizes="5vw"
          src={SLINGSHOT_SRC}
          style={{
            left: `${launchPoint.x}%`,
            top: `${launchPoint.y}%`,
          }}
          unoptimized
          width={269}
        />
        <div
          aria-label="앵그리버드 당기기"
          className={`absolute z-30 aspect-square w-[3.2%] will-change-[left,top,transform] ${
            phase === "aiming" ? "cursor-grabbing" : "cursor-grab"
          }`}
          ref={birdElementRef}
          style={{
            left: `${birdPoint.x}%`,
            top: `${birdPoint.y}%`,
            transform: "translate(-50%, -50%) rotate(0deg)",
          }}
        >
          <Image
            alt=""
            className="object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.3)]"
            draggable={false}
            fill
            priority
            sizes="4vw"
            src={BIRD_SRC}
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}
