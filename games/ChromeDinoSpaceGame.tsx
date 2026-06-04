"use client";

import { useCallback } from "react";
import type { Microgame } from "@/data/microgames";
import { drawCenteredText, useStaticCanvas } from "@/lib/canvasUtils";

export function ChromeDinoSpaceGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const draw = useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number) => {
      context.fillStyle = "#f7f7f7";
      context.fillRect(0, 0, width, height);

      const groundY = height * 0.68;

      context.strokeStyle = "#2f2f2f";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(0, groundY);
      context.lineTo(width, groundY);
      context.stroke();

      context.fillStyle = "#2f2f2f";
      context.fillRect(width * 0.28, groundY - 96, 74, 96);
      context.fillRect(width * 0.34, groundY - 132, 58, 58);
      context.fillRect(width * 0.42, groundY - 58, 44, 18);
      context.fillRect(width * 0.3, groundY, 18, 42);
      context.fillRect(width * 0.37, groundY, 18, 42);

      context.fillStyle = "#1f2937";
      context.fillRect(width * 0.66, groundY - 92, 30, 92);
      context.fillRect(width * 0.63, groundY - 58, 30, 14);
      context.fillRect(width * 0.69, groundY - 72, 30, 14);

      drawCenteredText(
        context,
        microgame.title,
        width / 2,
        height * 0.22,
        30,
        "#2f2f2f",
      );
    },
    [microgame.title],
  );
  const canvasRef = useStaticCanvas({ draw });

  return <canvas ref={canvasRef} className="block h-screen w-screen bg-white" />;
}
