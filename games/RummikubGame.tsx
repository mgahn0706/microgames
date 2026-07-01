"use client";

import type { Microgame } from "@/data/microgames";
import { useRummikubGameCanvas } from "@/games/useRummikubGame";

export function RummikubGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useRummikubGameCanvas(microgame.beatCount);

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-[#071a35]" />
  );
}
