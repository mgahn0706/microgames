"use client";

import type { Microgame } from "@/data/microgames";
import { useAnimalCrossingStampGameCanvas } from "@/games/useAnimalCrossingStampGame";

export function AnimalCrossingStampGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const canvasRef = useAnimalCrossingStampGameCanvas();

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-emerald-50" />
  );
}
