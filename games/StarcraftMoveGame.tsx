"use client";

import type { Microgame } from "@/data/microgames";
import { useStarcraftMoveGameCanvas } from "@/games/useStarcraftMoveGame";

export function StarcraftMoveGame({
  beatDurationMs,
  microgame,
}: Readonly<{ beatDurationMs: number; microgame: Microgame }>) {
  void microgame;

  const canvasRef = useStarcraftMoveGameCanvas({ beatDurationMs });

  return (
    <canvas
      ref={canvasRef}
      className="block h-screen w-screen touch-none bg-black"
    />
  );
}
