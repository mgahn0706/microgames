"use client";

import type { Microgame } from "@/data/microgames";
import { useMinecraftMiningGameCanvas } from "@/games/useMinecraftMiningGame";

export function MinecraftMiningGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const canvasRef = useMinecraftMiningGameCanvas();

  return (
    <canvas
      ref={canvasRef}
      className="block h-screen w-screen touch-none bg-slate-900"
    />
  );
}
