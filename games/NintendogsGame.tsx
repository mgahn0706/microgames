"use client";

import type { Microgame } from "@/data/microgames";
import { useNintendogsGameCanvas } from "@/games/useNintendogsGame";

export function NintendogsGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useNintendogsGameCanvas(microgame.beatCount);

  return (
    <canvas
      ref={canvasRef}
      className="block h-screen w-screen touch-none bg-sky-200"
      style={{ cursor: "none" }}
    />
  );
}
