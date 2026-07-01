"use client";

import type { Microgame } from "@/data/microgames";
import { usePoppyPlaytimeGameCanvas } from "@/games/usePoppyPlaytimeGame";

export function PoppyPlaytimeGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = usePoppyPlaytimeGameCanvas(microgame.beatCount);

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-[#111827]" />
  );
}
