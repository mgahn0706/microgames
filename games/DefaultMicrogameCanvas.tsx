"use client";

import { useCallback } from "react";
import type { Microgame } from "@/data/microgames";
import { drawCenteredText, useStaticCanvas } from "@/lib/canvasUtils";

export function DefaultMicrogameCanvas({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const draw = useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number) => {
      const accent = microgame.type === "boss" ? "#f97316" : "#67e8f9";
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.2;

      context.fillStyle = "#050505";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = accent;
      context.lineWidth = 8;
      context.shadowBlur = 28;
      context.shadowColor = accent;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.stroke();
      context.shadowBlur = 0;
      drawCenteredText(context, microgame.title, centerX, centerY, 42);
      drawCenteredText(
        context,
        microgame.instruction,
        centerX,
        centerY + radius + 46,
        18,
        accent,
      );
    },
    [microgame.instruction, microgame.title, microgame.type],
  );
  const canvasRef = useStaticCanvas({ draw });

  return <canvas ref={canvasRef} className="block h-screen w-screen bg-black" />;
}
