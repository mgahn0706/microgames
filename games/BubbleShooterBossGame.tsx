"use client";

import type { Microgame } from "@/data/microgames";
import { useBubbleShooterBossGameCanvas } from "@/games/useBubbleShooterBossGame";

export function BubbleShooterBossGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useBubbleShooterBossGameCanvas(microgame.beatCount);

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-[#07112f]" />
  );
}
