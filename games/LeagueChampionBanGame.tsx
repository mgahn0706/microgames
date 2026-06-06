"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import type { Microgame } from "@/data/microgames";
import {
  LEAGUE_CHAMPIONS,
  type LeagueChampion,
  useLeagueChampionBanGame,
} from "@/games/useLeagueChampionBanGame";

const GRID_COLUMN_COUNT = 6;
const GRID_LEFT_PERCENT = 26.85;
const GRID_TOP_PERCENT = 15.7;
const CELL_WIDTH_PERCENT = 6.25;
const CELL_HEIGHT_PERCENT = 12.4;
const CELL_X_GAP_PERCENT = 1.72;
const CELL_Y_GAP_PERCENT = 0.95;

function getChampionHotspotStyle(index: number): CSSProperties {
  const column = index % GRID_COLUMN_COUNT;
  const row = Math.floor(index / GRID_COLUMN_COUNT);

  return {
    height: `${CELL_HEIGHT_PERCENT}%`,
    left: `${GRID_LEFT_PERCENT + column * (CELL_WIDTH_PERCENT + CELL_X_GAP_PERCENT)}%`,
    top: `${GRID_TOP_PERCENT + row * (CELL_HEIGHT_PERCENT + CELL_Y_GAP_PERCENT)}%`,
    width: `${CELL_WIDTH_PERCENT}%`,
  };
}

function getChampionAriaLabel(champion: LeagueChampion) {
  return `${champion.nameKo} 밴`;
}

export function LeagueChampionBanGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const {
    banChampion,
    failByMissClick,
    hasFailed,
    selectedChampionId,
    targetChampion,
  } = useLeagueChampionBanGame();

  return (
    <div className="relative grid h-screen w-screen place-items-center overflow-hidden bg-black">
      <div
        className="relative aspect-video w-screen max-w-[calc(100vh*16/9)]"
        onPointerDown={() => {
          failByMissClick();
        }}
      >
        <Image
          alt=""
          className="object-contain"
          fill
          priority
          sizes="100vw"
          src="/games/league-of-legend/images/background.png"
          unoptimized
        />
        <div className="pointer-events-none absolute left-1/2 top-[8.2%] z-20 flex -translate-x-1/2 items-center gap-[clamp(0.5rem,1vw,0.9rem)] rounded-md border-2 border-[#f3c95f] bg-[#160706]/90 px-[clamp(0.9rem,2vw,1.8rem)] py-[clamp(0.35rem,0.9vw,0.7rem)] text-center shadow-[0_0_26px_rgba(243,201,95,0.42),0_0_42px_rgba(0,0,0,0.85)]">
          <span className="rounded-sm bg-[#b91c1c] px-[clamp(0.35rem,0.7vw,0.55rem)] py-[clamp(0.12rem,0.3vw,0.22rem)] text-[clamp(12px,1.3vw,20px)] font-black text-white">
            BAN
          </span>
          <span className="text-[clamp(22px,3.3vw,48px)] font-black leading-none text-[#fff1b8] drop-shadow-[0_2px_3px_rgba(0,0,0,0.92)]">
            {targetChampion.nameKo}
          </span>
        </div>
        {LEAGUE_CHAMPIONS.map((champion, index) => {
          const isSelected = selectedChampionId === champion.id;

          return (
            <button
              aria-label={getChampionAriaLabel(champion)}
              className="absolute z-10 cursor-pointer bg-transparent outline-none transition-[box-shadow,background-color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-[#f3c95f]"
              disabled={hasFailed}
              key={champion.id}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                banChampion(champion);
              }}
              style={getChampionHotspotStyle(index)}
              type="button"
            >
              <span
                className={[
                  "pointer-events-none absolute inset-[2%] rounded-sm border-2 opacity-0 transition-opacity duration-150",
                  isSelected
                    ? "border-[#e23d3d] bg-[#e23d3d]/18 opacity-100 shadow-[0_0_18px_rgba(226,61,61,0.7)]"
                    : "border-[#f3c95f] bg-[#f3c95f]/10",
                ].join(" ")}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
