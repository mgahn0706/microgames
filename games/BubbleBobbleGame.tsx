"use client";

import type { Microgame } from "@/data/microgames";
import { useBubbleBobbleGameCanvas } from "@/games/useBubbleBobbleGame";

export function BubbleBobbleGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useBubbleBobbleGameCanvas(microgame.beatCount);

  return (
    <canvas
      ref={canvasRef}
      className="block h-screen w-screen bg-[#102a55]"
    />
  );
}
