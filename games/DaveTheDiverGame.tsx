"use client";

import type { Microgame } from "@/data/microgames";
import { useDaveTheDiverGameCanvas } from "@/games/useDaveTheDiverGame";

export function DaveTheDiverGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useDaveTheDiverGameCanvas(microgame.beatCount);

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-[#009fe8]" />
  );
}
