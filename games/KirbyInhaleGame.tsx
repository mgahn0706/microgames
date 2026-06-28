"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import {
  useKirbyInhaleGame,
  type KirbyEnemyFrame,
  type KirbyInhaleFrame,
} from "@/games/useKirbyInhaleGame";

const KIRBY_ASSETS = {
  background: "/games/kirby/images/background.webp",
  enemyA: "/games/kirby/images/enemy-A.png",
  enemyB: "/games/kirby/images/enemy-B.png",
  inhaleA: "/games/kirby/images/kirby-inhaling-A.png",
  inhaleB: "/games/kirby/images/kirby-inhaling-B.png",
  ready: "/games/kirby/images/kirby-ready.png",
  start: "/games/kirby/images/kirby-start-inhaling.png",
} satisfies Record<"background" | KirbyEnemyFrame | KirbyInhaleFrame, string>;

function getEnemyTransform(progress: number) {
  const xOffset = progress * -34;
  const yOffset = Math.sin(progress * Math.PI * 5) * 2.8;
  const rotation = progress * -760;
  const scale = Math.max(0.18, 1 - progress * 0.74);

  return `translate(${xOffset}vw, ${yOffset}vh) rotate(${rotation}deg) scale(${scale})`;
}

export function KirbyInhaleGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const {
    enemyFrame,
    handlePointerCancel,
    handlePointerDown,
    handlePointerUp,
    inhaleFrame,
    isHolding,
    progress,
  } = useKirbyInhaleGame();

  return (
    <div
      aria-label="Kirby inhale microgame"
      className="relative h-screen w-screen cursor-pointer touch-none select-none overflow-hidden bg-[#49a7f5]"
      onDragStart={(event) => {
        event.preventDefault();
      }}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <Image
        alt=""
        className="select-none object-cover"
        draggable={false}
        fill
        onDragStart={(event) => {
          event.preventDefault();
        }}
        priority
        sizes="100vw"
        src={KIRBY_ASSETS.background}
        unoptimized
      />
      <div className="absolute inset-0 bg-sky-200/5" />
      <div
        aria-hidden="true"
        className={`absolute left-[31%] top-[73%] z-20 h-[18vh] min-h-24 w-[34vw] origin-left -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_left,rgba(255,255,255,0.96)_0%,rgba(173,232,255,0.68)_22%,rgba(255,255,255,0.18)_54%,rgba(255,255,255,0)_74%)] blur-sm transition-opacity duration-150 ${
          isHolding ? "opacity-95" : "opacity-0"
        }`}
        style={{
          transform: `translateY(-50%) scaleX(${0.26 + progress * 1.34})`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-[64%] top-[73%] z-30 aspect-square w-[clamp(5rem,11vw,8rem)] -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
        style={{
          opacity: progress >= 0.98 ? 0 : 1,
          transform: `${getEnemyTransform(progress)} translate(-50%, -50%)`,
        }}
      >
        <Image
          alt=""
          className="select-none object-contain drop-shadow-[0_14px_18px_rgba(21,87,54,0.32)]"
          draggable={false}
          fill
          onDragStart={(event) => {
            event.preventDefault();
          }}
          sizes="128px"
          src={KIRBY_ASSETS[enemyFrame]}
          unoptimized
        />
      </div>
      <div
        aria-hidden="true"
        className={`absolute left-[27%] top-[78%] z-40 aspect-[11/8] w-[clamp(13rem,27vw,24rem)] -translate-x-1/2 -translate-y-1/2 transition-transform duration-150 ${
          isHolding ? "scale-105" : "scale-100"
        }`}
      >
        <Image
          alt=""
          className="select-none object-contain drop-shadow-[0_18px_24px_rgba(46,52,132,0.34)]"
          draggable={false}
          fill
          onDragStart={(event) => {
            event.preventDefault();
          }}
          priority
          sizes="384px"
          src={KIRBY_ASSETS[inhaleFrame]}
          unoptimized
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute bottom-[6%] left-1/2 z-50 h-3 w-[min(30rem,62vw)] -translate-x-1/2 overflow-hidden rounded-full border border-white/65 bg-sky-950/28 shadow-[0_0_18px_rgba(255,255,255,0.32)]"
      >
        <div
          className="h-full rounded-full bg-[#f9f5ff] shadow-[0_0_18px_rgba(255,255,255,0.88)] transition-[width] duration-75"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
