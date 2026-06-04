"use client";

import { useCallback } from "react";
import type { Microgame } from "@/data/microgames";
import { drawCenteredText, useStaticCanvas } from "@/lib/canvasUtils";

export function UndertaleMouseGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const draw = useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number) => {
      context.fillStyle = "#050505";
      context.fillRect(0, 0, width, height);

      const boxWidth = Math.min(width * 0.72, 760);
      const boxHeight = Math.min(height * 0.44, 360);
      const boxX = (width - boxWidth) / 2;
      const boxY = (height - boxHeight) / 2;

      context.strokeStyle = "#ffffff";
      context.lineWidth = 6;
      context.strokeRect(boxX, boxY, boxWidth, boxHeight);

      context.fillStyle = "#ef4444";
      context.beginPath();
      context.moveTo(width / 2, height / 2 + 34);
      context.bezierCurveTo(
        width / 2 - 70,
        height / 2 - 26,
        width / 2 - 58,
        height / 2 - 86,
        width / 2,
        height / 2 - 42,
      );
      context.bezierCurveTo(
        width / 2 + 58,
        height / 2 - 86,
        width / 2 + 70,
        height / 2 - 26,
        width / 2,
        height / 2 + 34,
      );
      context.fill();

      context.strokeStyle = "#f9a8d4";
      context.lineWidth = 4;
      context.setLineDash([18, 20]);
      context.beginPath();
      context.arc(
        width / 2,
        height / 2,
        Math.min(boxWidth, boxHeight) * 0.34,
        0,
        Math.PI * 2,
      );
      context.stroke();
      context.setLineDash([]);

      drawCenteredText(
        context,
        microgame.title,
        width / 2,
        boxY - 44,
        28,
        "#f9a8d4",
      );
    },
    [microgame.title],
  );
  const canvasRef = useStaticCanvas({ draw });

  return <canvas ref={canvasRef} className="block h-screen w-screen bg-black" />;
}
