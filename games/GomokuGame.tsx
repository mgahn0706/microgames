"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import type { GomokuPoint, GomokuStone } from "@/games/useGomokuGame";
import { useGomokuGame } from "@/games/useGomokuGame";

const BOARD_IMAGE_SRC = "/games/gomoku/images/board.png";
const BOARD_WIDTH = 461;
const BOARD_HEIGHT = 459;
const BOARD_LEFT = 33;
const BOARD_TOP = 31;
const CELL_SIZE = 23;
const GRID_SIZE = 19;

function getIntersectionStyle({ column, row }: GomokuPoint) {
  return {
    left: `${((BOARD_LEFT + column * CELL_SIZE) / BOARD_WIDTH) * 100}%`,
    top: `${((BOARD_TOP + row * CELL_SIZE) / BOARD_HEIGHT) * 100}%`,
  };
}

function GomokuStoneView({ stone }: Readonly<{ stone: GomokuStone }>) {
  const stoneTone =
    stone.color === "white"
      ? "border-slate-300 bg-[radial-gradient(circle_at_35%_30%,#ffffff,#f8fafc_42%,#cbd5e1_100%)] shadow-[0_2px_5px_rgba(15,23,42,0.36)]"
      : "border-slate-950 bg-[radial-gradient(circle_at_32%_28%,#475569,#111827_48%,#020617_100%)] shadow-[0_2px_5px_rgba(15,23,42,0.48)]";

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute z-10 size-[5.2%] -translate-x-1/2 -translate-y-1/2 rounded-full border ${stoneTone}`}
      style={getIntersectionStyle(stone)}
    />
  );
}

export function GomokuGame({ microgame }: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const { playAtPoint, stones } = useGomokuGame();

  return (
    <div className="grid h-screen w-screen place-items-center overflow-hidden bg-[#2f1d10]">
      <div className="relative aspect-[461/459] h-[min(96vh,96vw)] touch-none select-none drop-shadow-[0_16px_26px_rgba(0,0,0,0.45)]">
        <Image
          alt=""
          className="object-contain"
          fill
          priority
          sizes="(max-width: 640px) 96vw, 461px"
          src={BOARD_IMAGE_SRC}
          unoptimized
        />
        {stones.map((stone) => (
          <GomokuStoneView
            key={`${stone.color}-${stone.column}-${stone.row}`}
            stone={stone}
          />
        ))}
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
          const point = {
            column: index % GRID_SIZE,
            row: Math.floor(index / GRID_SIZE),
          } satisfies GomokuPoint;

          return (
            <button
              aria-label="흰돌 놓기"
              className="absolute z-20 size-[6.4%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent outline-none transition focus-visible:ring-2 focus-visible:ring-white/80"
              key={`${point.column}-${point.row}`}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                playAtPoint(point);
              }}
              style={getIntersectionStyle(point)}
              type="button"
            />
          );
        })}
      </div>
    </div>
  );
}
