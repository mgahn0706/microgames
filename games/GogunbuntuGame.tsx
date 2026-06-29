"use client";

import type { Microgame } from "@/data/microgames";
import { useGogunbuntuGameCanvas } from "@/games/useGogunbuntuGame";

export function GogunbuntuGame({
  isActive,
  microgame,
}: Readonly<{ isActive: boolean; microgame: Microgame }>) {
  const canvasRef = useGogunbuntuGameCanvas({ isActive });

  return (
    <canvas
      aria-label={microgame.startPrompt}
      ref={canvasRef}
      className="block h-screen w-screen touch-none bg-black"
    />
  );
}
