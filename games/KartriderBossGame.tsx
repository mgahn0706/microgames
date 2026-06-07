"use client";

import type { Microgame } from "@/data/microgames";
import { useKartriderBossGameCanvas } from "@/games/useKartriderBossGame";

export function KartriderBossGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const canvasRef = useKartriderBossGameCanvas();

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-black" />
  );
}
