"use client";

import type { Microgame } from "@/data/microgames";
import { useCookieRunGameCanvas } from "@/games/useCookieRunGame";

export function CookieRunGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useCookieRunGameCanvas(microgame.beatCount);

  return (
    <canvas
      ref={canvasRef}
      className="block h-screen w-screen touch-none bg-black"
    />
  );
}
