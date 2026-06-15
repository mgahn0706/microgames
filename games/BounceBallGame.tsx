"use client";

import type { Microgame } from "@/data/microgames";
import { useBounceBallGameCanvas } from "@/games/useBounceBallGame";

export function BounceBallGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useBounceBallGameCanvas(microgame.beatCount);

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-[#79c9f5]" />
  );
}
