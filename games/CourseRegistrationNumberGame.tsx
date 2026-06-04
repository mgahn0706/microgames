"use client";

import { useCallback } from "react";
import type { Microgame } from "@/data/microgames";
import { drawCenteredText, useStaticCanvas } from "@/lib/canvasUtils";

export function CourseRegistrationNumberGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const draw = useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number) => {
      context.fillStyle = "#082f49";
      context.fillRect(0, 0, width, height);

      const panelWidth = Math.min(width * 0.76, 820);
      const panelHeight = Math.min(height * 0.58, 440);
      const panelX = (width - panelWidth) / 2;
      const panelY = (height - panelHeight) / 2;

      context.fillStyle = "#f8fafc";
      context.fillRect(panelX, panelY, panelWidth, panelHeight);
      context.fillStyle = "#0f172a";
      context.fillRect(panelX, panelY, panelWidth, 62);

      drawCenteredText(
        context,
        "COURSE REGISTRATION",
        width / 2,
        panelY + 31,
        22,
        "#ffffff",
      );

      context.fillStyle = "#e2e8f0";
      for (const row of [0, 1, 2]) {
        context.fillRect(
          panelX + 44,
          panelY + 102 + row * 72,
          panelWidth - 88,
          42,
        );
      }

      context.fillStyle = "#0284c7";
      context.fillRect(
        panelX + panelWidth - 198,
        panelY + panelHeight - 92,
        154,
        48,
      );
      drawCenteredText(
        context,
        "SUBMIT",
        panelX + panelWidth - 121,
        panelY + panelHeight - 68,
        20,
      );
      drawCenteredText(
        context,
        microgame.title,
        width / 2,
        panelY + panelHeight + 48,
        28,
        "#fde68a",
      );
    },
    [microgame.title],
  );
  const canvasRef = useStaticCanvas({ draw });

  return <canvas ref={canvasRef} className="block h-screen w-screen bg-sky-950" />;
}
