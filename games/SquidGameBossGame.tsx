"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import {
  type SquidGamePhase,
  useSquidGameBossGame,
} from "@/games/useSquidGameBossGame";

const PHASE_LABELS = {
  failure: "움직임 감지!",
  green: "달려!",
  red: "멈춰!",
  success: "통과!",
  waiting: "준비...",
} satisfies Record<SquidGamePhase, string>;

export function SquidGameBossGame({
  beatDurationMs,
  isActive,
  microgame,
}: Readonly<{
  beatDurationMs: number;
  isActive: boolean;
  microgame: Microgame;
}>) {
  void microgame;

  const { isHolding, phase, progress } = useSquidGameBossGame({
    beatDurationMs,
    isActive,
  });
  const isRedLight = phase === "failure" || phase === "red";
  const playerBottom = 8 + progress * 68;

  return (
    <div
      aria-label="무궁화 꽃이 피었습니다"
      className="relative h-screen w-screen touch-none select-none overflow-hidden bg-emerald-950"
    >
      <Image
        alt=""
        className="object-cover"
        fill
        priority
        sizes="100vw"
        src="/games/squid-game/images/background.png"
        unoptimized
      />
      <div
        className={`pointer-events-none absolute inset-0 transition-colors duration-150 ${
          isRedLight ? "bg-red-600/18" : "bg-transparent"
        }`}
      />
      <div className="absolute left-1/2 top-[7%] h-[13%] w-[11%] -translate-x-1/2">
        <Image
          alt=""
          className="object-contain drop-shadow-[0_0_1.5rem_rgba(0,0,0,0.5)]"
          fill
          priority
          sizes="11vw"
          src={
            isRedLight
              ? "/games/squid-game/images/doll-red-light.png"
              : "/games/squid-game/images/doll-green-light.png"
          }
          unoptimized
        />
      </div>
      <div
        className={`absolute left-1/2 aspect-square w-[clamp(3rem,7vw,7rem)] -translate-x-1/2 transition-[filter,transform] duration-100 ${
          isHolding && phase === "green"
            ? "scale-105 drop-shadow-[0_0_1rem_rgba(34,197,94,0.9)]"
            : "drop-shadow-[0_0_0.75rem_rgba(15,23,42,0.7)]"
        } ${phase === "failure" ? "rotate-12 grayscale" : ""}`}
        style={{ bottom: `${playerBottom}%` }}
      >
        <Image
          alt="플레이어"
          className="object-contain"
          fill
          priority
          sizes="7vw"
          src="/games/squid-game/images/player-icon.png"
          unoptimized
        />
      </div>
      <div
        className={`pointer-events-none absolute bottom-[3%] left-1/2 -translate-x-1/2 rounded-full border-4 px-8 py-3 text-[clamp(1.2rem,3vw,2.5rem)] font-black shadow-xl backdrop-blur-sm ${
          isRedLight
            ? "border-red-200 bg-red-700/88 text-white"
            : phase === "green"
              ? "border-emerald-100 bg-emerald-700/88 text-white"
              : "border-white/70 bg-slate-950/75 text-white"
        }`}
      >
        {PHASE_LABELS[phase]}
      </div>
      <div className="pointer-events-none absolute right-5 top-5 h-4 w-[min(30vw,20rem)] overflow-hidden rounded-full border-2 border-white/80 bg-black/55">
        <div
          className="h-full bg-emerald-400 transition-[width] duration-75"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
