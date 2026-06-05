"use client";

import { AnimalCrossingStampGame } from "@/games/AnimalCrossingStampGame";
import { AnimalFarmBossGame } from "@/games/AnimalFarmBossGame";
import { AmongUsWireGame } from "@/games/AmongUsWireGame";
import { BrainAcademyBlockGame } from "@/games/BrainAcademyBlockGame";
import { ChromeDinoSpaceGame } from "@/games/ChromeDinoSpaceGame";
import { CourseRegistrationNumberGame } from "@/games/CourseRegistrationNumberGame";
import { DefaultMicrogameCanvas } from "@/games/DefaultMicrogameCanvas";
import { GeometryDashGame } from "@/games/GeometryDashGame";
import { KartriderBossGame } from "@/games/KartriderBossGame";
import { LaytonShapeMatchGame } from "@/games/LaytonShapeMatchGame";
import { MaplestoryLieDetectorGame } from "@/games/MaplestoryLieDetectorGame";
import { MaplestoryRuneGame } from "@/games/MaplestoryRuneGame";
import { MinecraftMiningGame } from "@/games/MinecraftMiningGame";
import type { Microgame } from "@/data/microgames";
import { PianoMelodyGame } from "@/games/PianoMelodyGame";
import { PokemonTypingGame } from "@/games/PokemonTypingGame";
import { SuperMarioCoinGame } from "@/games/SuperMarioCoinGame";
import { TetrisLineClearGame } from "@/games/TetrisLineClearGame";
import { UndertaleMouseGame } from "@/games/UndertaleMouseGame";

type GameCanvasProps = Readonly<{
  microgame: Microgame;
}>;

function renderGameCanvas(microgame: Microgame) {
  if (microgame.canvas === "animalCrossingStamps") {
    return <AnimalCrossingStampGame microgame={microgame} />;
  }

  if (microgame.canvas === "animalFarmReverseTyping") {
    return <AnimalFarmBossGame microgame={microgame} />;
  }

  if (microgame.canvas === "amongUsWires") {
    return <AmongUsWireGame microgame={microgame} />;
  }

  if (microgame.canvas === "brainAcademyBlocks") {
    return <BrainAcademyBlockGame microgame={microgame} />;
  }

  if (microgame.canvas === "undertaleMouse") {
    return <UndertaleMouseGame microgame={microgame} />;
  }

  if (microgame.canvas === "superMarioCoins") {
    return <SuperMarioCoinGame microgame={microgame} />;
  }

  if (microgame.canvas === "pokemonTyping") {
    return <PokemonTypingGame microgame={microgame} />;
  }

  if (microgame.canvas === "minecraftMining") {
    return <MinecraftMiningGame microgame={microgame} />;
  }

  if (microgame.canvas === "maplestoryLieDetector") {
    return <MaplestoryLieDetectorGame microgame={microgame} />;
  }

  if (microgame.canvas === "maplestoryRune") {
    return <MaplestoryRuneGame microgame={microgame} />;
  }

  if (microgame.canvas === "laytonShapeMatch") {
    return <LaytonShapeMatchGame microgame={microgame} />;
  }

  if (microgame.canvas === "pianoMelody") {
    return <PianoMelodyGame microgame={microgame} />;
  }

  if (microgame.canvas === "chromeDinoSpace") {
    return <ChromeDinoSpaceGame microgame={microgame} />;
  }

  if (microgame.canvas === "geometryDashSpikes") {
    return <GeometryDashGame microgame={microgame} />;
  }

  if (microgame.canvas === "kartriderCourse") {
    return <KartriderBossGame microgame={microgame} />;
  }

  if (microgame.canvas === "tetrisLineClear") {
    return <TetrisLineClearGame microgame={microgame} />;
  }

  if (microgame.canvas === "courseRegistrationNumber") {
    return <CourseRegistrationNumberGame microgame={microgame} />;
  }

  return <DefaultMicrogameCanvas microgame={microgame} />;
}

export function MicrogameCanvas({ microgame }: GameCanvasProps) {
  return renderGameCanvas(microgame);
}
