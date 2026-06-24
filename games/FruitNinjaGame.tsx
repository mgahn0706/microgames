"use client";

import type { Microgame } from "@/data/microgames";
import { useFruitNinjaGameCanvas } from "@/games/useFruitNinjaGame";

export function FruitNinjaGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useFruitNinjaGameCanvas(microgame.beatCount);

  return (
    <canvas
      ref={canvasRef}
      className="block h-screen w-screen cursor-none touch-none bg-lime-950"
    />
  );
}
