"use client";

import type { Microgame } from "@/data/microgames";
import { useGeometryDashGameCanvas } from "@/games/useGeometryDashGame";

export function GeometryDashGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useGeometryDashGameCanvas(microgame.beatCount);

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-slate-950" />
  );
}
