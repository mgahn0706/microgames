"use client";

import type { Microgame } from "@/data/microgames";
import { usePokemonMysteryDungeonGameCanvas } from "@/games/usePokemonMysteryDungeonGame";

export function PokemonMysteryDungeonGame({
  beatDurationMs,
  isActive,
  microgame,
}: Readonly<{
  beatDurationMs: number;
  isActive: boolean;
  microgame: Microgame;
}>) {
  const canvasRef = usePokemonMysteryDungeonGameCanvas({
    beatDurationMs,
    isActive,
  });

  return (
    <canvas
      aria-label={microgame.startPrompt}
      ref={canvasRef}
      className="block h-screen w-screen touch-none bg-black"
    />
  );
}
