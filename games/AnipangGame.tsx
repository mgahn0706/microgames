"use client";

import type { Microgame } from "@/data/microgames";
import { useAnipangGameCanvas } from "@/games/useAnipangGame";

export function AnipangGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useAnipangGameCanvas(microgame.beatCount);

  return (
    <canvas
      ref={canvasRef}
      className="block h-screen w-screen touch-none select-none bg-[#42c9f3]"
    />
  );
}
