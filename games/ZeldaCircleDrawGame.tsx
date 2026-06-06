"use client";

import type { Microgame } from "@/data/microgames";
import { useZeldaCircleDrawGameCanvas } from "@/games/useZeldaCircleDrawGame";

export function ZeldaCircleDrawGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const canvasRef = useZeldaCircleDrawGameCanvas();

  return (
    <canvas
      ref={canvasRef}
      className="block h-screen w-screen touch-none bg-black"
    />
  );
}
