"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import { useNanaimoGame } from "@/games/useNanaimoGame";

const ASSET_BASE = "/games/nana-imo";
const BACKGROUND_SRC = `${ASSET_BASE}/images/background.png`;
const BOSS_BULLET_SRC = `${ASSET_BASE}/images/boss-bullet.png`;
const BOSS_SRC = `${ASSET_BASE}/images/boss.png`;
const PLAYER_SRC = `${ASSET_BASE}/images/player.png`;

export function NanaimoGame({
  beatDurationMs,
  isActive,
  microgame,
}: Readonly<{
  beatDurationMs: number;
  isActive: boolean;
  microgame: Microgame;
}>) {
  const {
    bossHit,
    bullets,
    elapsedProgress,
    failureStartedAt,
    hasFailed,
    hitFlashMs,
    player,
    shots,
  } = useNanaimoGame({
      beatCount: microgame.beatCount,
      beatDurationMs,
      isActive,
    });
  const playerWasHit = failureStartedAt !== null;

  return (
    <div className="grid h-screen w-screen place-items-center overflow-hidden bg-[#10250d]">
      <div className="relative aspect-[1672/941] w-screen max-w-[calc(100vh*1672/941)] select-none overflow-hidden">
        <Image
          alt=""
          className="pointer-events-none select-none object-cover"
          draggable={false}
          fill
          priority
          sizes="100vw"
          src={BACKGROUND_SRC}
          unoptimized
        />

        <div
          aria-hidden="true"
          className={[
            "absolute z-10 aspect-[1536/1024] -translate-x-1/2 -translate-y-1/2 transition-[filter,transform] duration-100",
            bossHit
              ? "drop-shadow-[0_0_24px_rgba(96,165,250,0.84)]"
              : "drop-shadow-[0_12px_22px_rgba(0,0,0,0.42)]",
            hitFlashMs > 0 ? "scale-105 brightness-125" : "",
          ].join(" ")}
          style={{
            height: "114%",
            left: "82%",
            top: "50%",
          }}
        >
          <Image
            alt=""
            className="object-contain"
            draggable={false}
            fill
            priority
            sizes="420px"
            src={BOSS_SRC}
            unoptimized
          />
        </div>

        {shots.map((shot) => (
          <div
            aria-hidden="true"
            className="absolute z-30 h-[1.2%] w-[4.2%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-200 shadow-[0_0_16px_rgba(253,224,71,0.92)]"
            key={shot.id}
            style={{ left: `${shot.x}%`, top: `${shot.y}%` }}
          />
        ))}

        {bullets.map((bullet) => (
          <div
            aria-hidden="true"
            className="absolute z-20 aspect-[178/84] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_14px_rgba(253,224,71,0.85)]"
            key={bullet.id}
            style={{
              left: `${bullet.x}%`,
              top: `${bullet.y}%`,
              transform: `translate(-50%, -50%) rotate(${bullet.rotationDeg}deg)`,
              width: `${bullet.radius * 2.8}%`,
            }}
          >
            <Image
              alt=""
              className="object-contain"
              draggable={false}
              fill
              priority
              sizes="120px"
              src={BOSS_BULLET_SRC}
              unoptimized
            />
          </div>
        ))}

        <div
          aria-hidden="true"
          className={[
            "absolute z-40 aspect-[2850/1970] -translate-x-1/2 -translate-y-1/2 transition-[filter] duration-100",
            playerWasHit
              ? "animate-[nanaimo-player-hit-fall_760ms_ease-in_forwards] drop-shadow-[0_0_24px_rgba(248,113,113,0.9)]"
              : hasFailed
              ? "grayscale brightness-75"
              : "drop-shadow-[0_0_18px_rgba(34,197,94,0.72)]",
          ].join(" ")}
          style={{
            left: `${player.x}%`,
            top: `${player.y}%`,
            width: "9.2%",
          }}
        >
          <Image
            alt=""
            className="object-contain"
            draggable={false}
            fill
            priority
            sizes="220px"
            src={PLAYER_SRC}
            unoptimized
          />
        </div>

        <div
          aria-hidden="true"
          className="absolute bottom-[6.2%] left-1/2 z-50 h-[2.1%] w-[42%] -translate-x-1/2 overflow-hidden rounded-full border border-white/45 bg-black/45"
        >
          <div
            className="h-full bg-gradient-to-r from-lime-300 via-cyan-300 to-fuchsia-300 transition-[width] duration-100"
            style={{ width: `${elapsedProgress * 100}%` }}
          />
        </div>

        <div
          aria-hidden="true"
          className={[
            "absolute left-[88.5%] top-[12.2%] z-50 h-[3.3%] w-[8.6%] -translate-x-1/2 rounded-full border border-white/50 transition-colors duration-150",
            bossHit
              ? "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.84)]"
              : "bg-black/60",
          ].join(" ")}
        />
      </div>
    </div>
  );
}
