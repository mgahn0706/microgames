"use client";

import type { Microgame } from "@/data/microgames";
import { usePinballGameCanvas } from "@/games/usePinballGame";

export function PinballGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = usePinballGameCanvas(microgame.beatCount);

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-[#05070f]" />
  );
}
