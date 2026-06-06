"use client";

import type { Microgame } from "@/data/microgames";
import { useBrainAcademyBlockGameCanvas } from "@/games/useBrainAcademyBlockGame";

export function BrainAcademyBlockGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const canvasRef = useBrainAcademyBlockGameCanvas();

  return (
    <canvas ref={canvasRef} className="block h-screen w-screen bg-sky-100" />
  );
}
