"use client";

import type { Microgame } from "@/data/microgames";
import { useTetrisLineClearGameCanvas } from "@/games/useTetrisLineClearGame";

export function TetrisLineClearGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useTetrisLineClearGameCanvas(microgame.beatCount);

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-slate-950" />
  );
}
