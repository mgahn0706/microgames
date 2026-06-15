"use client";

import type { Microgame } from "@/data/microgames";
import { useChessGameCanvas } from "@/games/useChessGame";

export function ChessGame({ microgame }: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useChessGameCanvas();

  return (
    <canvas
      aria-label={microgame.startPrompt}
      className="block h-screen w-screen touch-none bg-[#20242a]"
      ref={canvasRef}
    />
  );
}
