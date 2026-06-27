"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import type { BearNumber } from "@/games/useMinigameExGame";
import { useMinigameExGame } from "@/games/useMinigameExGame";

const BACKGROUND_SRC = "/games/minigame-ex/images/background.webp";
const EATING_BEAR_SRC = "/games/minigame-ex/images/eating-bear.png";
const IDLE_BEAR_SRC = "/games/minigame-ex/images/idle-bear.png";
const BEAR_LAYOUT = [
  { number: 1, x: "37%", y: "64%" },
  { number: 2, x: "50%", y: "64%" },
  { number: 3, x: "63%", y: "64%" },
] satisfies ReadonlyArray<{
  number: BearNumber;
  x: string;
  y: string;
}>;

export function MinigameExGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const { activeEatingBears, containerRef, hasFailed, isChoosing, wrongBear } =
    useMinigameExGame();

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-[#17100b]"
      ref={containerRef}
    >
      <Image
        alt=""
        className="object-cover"
        fill
        priority
        sizes="100vw"
        src={BACKGROUND_SRC}
        unoptimized
      />
      <div className="absolute inset-0 bg-black/10" />
      {isChoosing ? (
        <div className="pointer-events-none absolute left-1/2 top-[10%] z-20 w-[min(58rem,86vw)] -translate-x-1/2 rounded-md border-2 border-amber-100/60 bg-black/62 px-7 py-5 text-center text-[clamp(1.45rem,3.2vw,3rem)] font-black text-amber-50 shadow-[0_0_30px_rgba(251,191,36,0.3)]">
          가장 많은 고기를 먹은 곰을 선택해라
        </div>
      ) : null}
      {BEAR_LAYOUT.map((bear) => {
        const isEating = activeEatingBears.includes(bear.number);
        const isWrong = wrongBear === bear.number;

        return (
          <div
            aria-label={`${bear.number}번 곰 선택`}
            className={`pointer-events-none absolute z-10 aspect-[3/2] w-[clamp(17rem,38vw,32rem)] -translate-x-1/2 -translate-y-1/2 transition duration-150 ${
              isChoosing ? "scale-105" : ""
            } ${hasFailed ? "opacity-55 grayscale" : ""} ${
              isWrong ? "scale-95" : ""
            }`}
            key={bear.number}
            style={{
              left: bear.x,
              top: bear.y,
            }}
          >
            <Image
              alt=""
              className={`object-contain drop-shadow-[0_14px_20px_rgba(0,0,0,0.4)] ${
                isEating ? "scale-110" : "scale-100"
              } transition-transform duration-150`}
              fill
              sizes="288px"
              src={isEating ? EATING_BEAR_SRC : IDLE_BEAR_SRC}
              unoptimized
            />
            <span
              className={`absolute left-1/2 top-full mt-1 grid size-10 -translate-x-1/2 place-items-center rounded-full border text-xl font-black shadow-[0_0_16px_rgba(251,191,36,0.22)] ${
                isChoosing
                  ? "border-amber-100 bg-amber-300 text-stone-950"
                  : "border-white/35 bg-black/45 text-white/80"
              }`}
            >
              {bear.number}
            </span>
          </div>
        );
      })}
    </div>
  );
}
