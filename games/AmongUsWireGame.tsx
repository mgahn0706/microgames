"use client";

import type { Microgame } from "@/data/microgames";
import { useAmongUsWireGameCanvas } from "@/games/useAmongUsWireGame";

export function AmongUsWireGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const canvasRef = useAmongUsWireGameCanvas();

  return (
    <canvas
      ref={canvasRef}
      className="block h-screen w-screen touch-none bg-black"
    />
  );
}
