"use client";

import type { Microgame } from "@/data/microgames";
import { useTheWorldHardestGameCanvas } from "@/games/useTheWorldHardestGame";

export function TheWorldHardestGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useTheWorldHardestGameCanvas(microgame.beatCount);

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-black" />
  );
}
