"use client";

import type { Microgame } from "@/data/microgames";
import { useMinesweeperGameCanvas } from "@/games/useMinesweeperGame";

export function MinesweeperGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useMinesweeperGameCanvas(microgame.beatCount);

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-[#008080]" />
  );
}
