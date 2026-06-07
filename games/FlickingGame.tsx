"use client";

import type { Microgame } from "@/data/microgames";
import { useFlickingGameCanvas } from "@/games/useFlickingGame";

export function FlickingGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const canvasRef = useFlickingGameCanvas();

  return (
    <canvas
      ref={canvasRef}
      className="block h-screen w-screen touch-none bg-[#1b140b]"
    />
  );
}
