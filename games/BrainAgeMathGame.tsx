"use client";

import type { Microgame } from "@/data/microgames";
import { useBrainAgeMathGameCanvas } from "@/games/useBrainAgeMathGame";

export function BrainAgeMathGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useBrainAgeMathGameCanvas();

  return (
    <canvas
      aria-label={microgame.startPrompt}
      ref={canvasRef}
      className="block h-screen w-screen bg-white"
    />
  );
}
