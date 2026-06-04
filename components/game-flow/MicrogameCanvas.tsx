"use client";

import { useEffect, useRef } from "react";
import type { Microgame } from "@/games/microgames";

function getMicrogameAccent(microgame: Microgame) {
  if (microgame.type === "boss") {
    return "#f97316";
  }

  if (microgame.control === "mouseClick") {
    return "#f9a8d4";
  }

  if (microgame.control === "scroll") {
    return "#a7f3d0";
  }

  if (microgame.control === "numberKeys") {
    return "#fde68a";
  }

  return "#67e8f9";
}

export function MicrogameCanvas({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    const resizeCanvas = () => {
      const { height, width } = canvas.getBoundingClientRect();

      canvas.height = Math.floor(height * pixelRatio);
      canvas.width = Math.floor(width * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    const draw = () => {
      const { height, width } = canvas.getBoundingClientRect();
      const accent = getMicrogameAccent(microgame);

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#050505";
      context.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.2;

      context.strokeStyle = accent;
      context.lineWidth = 8;
      context.shadowBlur = 28;
      context.shadowColor = accent;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.stroke();

      context.shadowBlur = 0;
      context.fillStyle = "#ffffff";
      context.font = "900 42px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(microgame.title, centerX, centerY);

      context.fillStyle = accent;
      context.font = "900 18px sans-serif";
      context.fillText(microgame.instruction, centerX, centerY + radius + 46);
    };

    resizeCanvas();
    draw();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("resize", draw);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("resize", draw);
    };
  }, [microgame]);

  return (
    <canvas
      ref={canvasRef}
      className="block h-screen w-screen bg-black"
      aria-label={microgame.title}
    />
  );
}
