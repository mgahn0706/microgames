"use client";

import type { Microgame } from "@/data/microgames";
import { useBindingOfIsaacGameCanvas } from "@/games/useBindingOfIsaacGame";

export function BindingOfIsaacGame({
  isActive,
  microgame,
}: Readonly<{ isActive: boolean; microgame: Microgame }>) {
  const canvasRef = useBindingOfIsaacGameCanvas({ isActive });

  return (
    <canvas
      aria-label={microgame.startPrompt}
      ref={canvasRef}
      className="block h-screen w-screen touch-none bg-black"
    />
  );
}
