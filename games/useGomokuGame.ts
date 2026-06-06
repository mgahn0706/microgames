"use client";

import type { RefObject } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

export type GomokuStoneColor = "black" | "white";

export type GomokuPoint = Readonly<{
  column: number;
  row: number;
}>;

export type GomokuStone = Readonly<
  GomokuPoint & {
    color: GomokuStoneColor;
  }
>;

const STONE_PLACED_SOUND_SRC = "/games/gomoku/sounds/stone-placed.mp3";
const WINNING_TARGET = { column: 11, row: 9 } satisfies GomokuPoint;
const INITIAL_STONES = [
  { color: "white", column: 7, row: 9 },
  { color: "white", column: 8, row: 9 },
  { color: "white", column: 9, row: 9 },
  { color: "white", column: 10, row: 9 },
  { color: "black", column: 6, row: 8 },
  { color: "black", column: 6, row: 10 },
  { color: "black", column: 12, row: 8 },
  { color: "black", column: 12, row: 10 },
  { color: "black", column: 4, row: 5 },
  { color: "black", column: 14, row: 13 },
] satisfies GomokuStone[];

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function isSamePoint(first: GomokuPoint, second: GomokuPoint) {
  return first.column === second.column && first.row === second.row;
}

function isOccupied(point: GomokuPoint, stones: readonly GomokuStone[]) {
  return stones.some((stone) => isSamePoint(stone, point));
}

function playStoneSound(audioRef: RefObject<HTMLAudioElement | null>) {
  if (!audioRef.current) {
    audioRef.current = new Audio(STONE_PLACED_SOUND_SRC);
  }

  audioRef.current.currentTime = 0;
  audioRef.current.play().catch(() => {
    // Browsers can reject audio until a trusted gesture fully unlocks playback.
  });
}

export function useGomokuGame() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasResolvedRef = useRef(false);
  const [placedStone, setPlacedStone] = useState<GomokuStone | null>(null);

  const stones = useMemo(
    () => (placedStone ? [...INITIAL_STONES, placedStone] : INITIAL_STONES),
    [placedStone],
  );

  const playAtPoint = useCallback((point: GomokuPoint) => {
    if (hasResolvedRef.current || isOccupied(point, INITIAL_STONES)) {
      return;
    }

    const nextStone = {
      color: "white",
      ...point,
    } satisfies GomokuStone;

    hasResolvedRef.current = true;
    setPlacedStone(nextStone);
    playStoneSound(audioRef);

    if (isSamePoint(point, WINNING_TARGET)) {
      dispatchClear();
    }
  }, []);

  return {
    playAtPoint,
    stones,
  };
}
