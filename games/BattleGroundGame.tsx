"use client";

import type { Microgame } from "@/data/microgames";
import { useBattleGroundGameCanvas } from "@/games/useBattleGroundGame";

export function BattleGroundGame({
  beatDurationMs,
  isActive,
  microgame,
}: Readonly<{
  beatDurationMs: number;
  isActive: boolean;
  microgame: Microgame;
}>) {
  const canvasRef = useBattleGroundGameCanvas({
    beatCount: microgame.beatCount,
    beatDurationMs,
    isActive,
  });

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-[#0e1b17]" />
  );
}
