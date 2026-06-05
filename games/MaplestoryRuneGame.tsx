"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import {
  type RuneDirection,
  useMaplestoryRuneGame,
} from "@/games/useMaplestoryRuneGame";

const RUNE_DIRECTION_ASSETS = {
  down: "/games/maple-story-rune/images/down.png",
  left: "/games/maple-story-rune/images/lefr.png",
  right: "/games/maple-story-rune/images/right.png",
  up: "/games/maple-story-rune/images/up.png",
} satisfies Record<RuneDirection, string>;

export function MaplestoryRuneGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const { effectKey, pattern, progress } = useMaplestoryRuneGame();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0f172a]">
      <Image
        alt=""
        className="object-cover"
        fill
        priority
        sizes="100vw"
        src="/games/maple-story-rune/images/field.png"
        unoptimized
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute left-[8.5%] top-[39%] grid -translate-x-1/2 -translate-y-1/2 place-items-center">
        <div
          className={`relative size-[clamp(5rem,12vw,10rem)] transition-transform duration-150 ${
            effectKey > 0 ? "scale-105" : "scale-100"
          }`}
        >
          <Image
            alt=""
            className="object-contain drop-shadow-[0_0_22px_rgba(216,180,254,0.76)]"
            fill
            priority
            sizes="160px"
            src="/games/maple-story-rune/images/rune.png"
            unoptimized
          />
          {effectKey > 0 ? (
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full"
              key={effectKey}
            >
              <span className="absolute inset-[8%] rounded-full border-4 border-fuchsia-200/80 shadow-[0_0_28px_rgba(232,121,249,0.92)] animate-ping" />
              <span className="absolute inset-[-8%] rounded-full border-4 border-cyan-100/70 shadow-[0_0_34px_rgba(103,232,249,0.86)] animate-ping [animation-delay:90ms]" />
            </div>
          ) : null}
        </div>
      </div>
      <div className="absolute left-1/2 top-[12%] flex -translate-x-1/2 items-center gap-[clamp(0.7rem,1.5vw,1.25rem)] rounded-md border border-white/30 bg-black/45 px-[clamp(0.8rem,1.8vw,1.5rem)] py-[clamp(0.55rem,1.4vw,1rem)] shadow-[0_0_24px_rgba(168,85,247,0.24)] backdrop-blur-sm">
        {pattern.map((direction, index) => (
          <div
            className={`relative aspect-square w-[clamp(3rem,7vw,5.8rem)] transition duration-150 ${
              index < progress
                ? "scale-90 opacity-35"
                : index === progress
                  ? "scale-110 opacity-100 drop-shadow-[0_0_20px_rgba(250,204,21,0.9)]"
                  : "opacity-80"
            }`}
            key={`${direction}-${index}`}
          >
            <Image
              alt=""
              className="object-contain"
              fill
              sizes="96px"
              src={RUNE_DIRECTION_ASSETS[direction]}
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  );
}
