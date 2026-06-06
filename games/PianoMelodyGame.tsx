"use client";

import type { Microgame } from "@/data/microgames";
import { usePianoMelodyGameCanvas } from "@/games/usePianoMelodyGame";

export function PianoMelodyGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const canvasRef = usePianoMelodyGameCanvas();

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-zinc-950" />
  );
}
