"use client";

import type { Microgame } from "@/data/microgames";
import { useFruitNinjaGameCanvas } from "@/games/useFruitNinjaGame";

export function FruitNinjaGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useFruitNinjaGameCanvas(microgame.beatCount);

  return (
    <canvas
      ref={canvasRef}
      className="block h-screen w-screen touch-none bg-lime-950"
      style={{
        cursor: 'url("/games/fruit-ninja/images/cursor.svg") 3 21, crosshair',
      }}
    />
  );
}
