"use client";

import { ChromeDinoSpaceGame } from "@/games/ChromeDinoSpaceGame";
import { CourseRegistrationNumberGame } from "@/games/CourseRegistrationNumberGame";
import { DefaultMicrogameCanvas } from "@/games/DefaultMicrogameCanvas";
import type { Microgame } from "@/data/microgames";
import { UndertaleMouseGame } from "@/games/UndertaleMouseGame";

type GameCanvasProps = Readonly<{
  microgame: Microgame;
}>;

function renderGameCanvas(microgame: Microgame) {
  if (microgame.canvas === "undertaleMouse") {
    return <UndertaleMouseGame microgame={microgame} />;
  }

  if (microgame.canvas === "chromeDinoSpace") {
    return <ChromeDinoSpaceGame microgame={microgame} />;
  }

  if (microgame.canvas === "courseRegistrationNumber") {
    return <CourseRegistrationNumberGame microgame={microgame} />;
  }

  return <DefaultMicrogameCanvas microgame={microgame} />;
}

export function MicrogameCanvas({ microgame }: GameCanvasProps) {
  return (
    renderGameCanvas(microgame)
  );
}
