"use client";

import { useEffect, useRef } from "react";

type CanvasDrawOptions = Readonly<{
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
}>;

export function useStaticCanvas({ draw }: CanvasDrawOptions) {
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
    const render = () => {
      const { height, width } = canvas.getBoundingClientRect();

      canvas.height = Math.floor(height * pixelRatio);
      canvas.width = Math.floor(width * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw(context, width, height);
    };

    render();
    window.addEventListener("resize", render);

    return () => {
      window.removeEventListener("resize", render);
    };
  }, [draw]);

  return canvasRef;
}

export function drawCenteredText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color = "#ffffff",
) {
  context.fillStyle = color;
  context.font = `900 ${size}px Arial, Helvetica, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x, y);
}
