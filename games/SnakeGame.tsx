"use client";

import type { Microgame } from "@/data/microgames";
import { useSnakeGameCanvas } from "@/games/useSnakeGame";

export function SnakeGame({ microgame }: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useSnakeGameCanvas(microgame.beatCount);

  return (
    <canvas
      ref={canvasRef}
      className="block h-screen w-screen bg-emerald-950"
    />
  );
}
