"use client";

import { AnimalCrossingStampGame } from "@/games/AnimalCrossingStampGame";
import { AnimalFarmBossGame } from "@/games/AnimalFarmBossGame";
import { AmongUsWireGame } from "@/games/AmongUsWireGame";
import { BrainAcademyBlockGame } from "@/games/BrainAcademyBlockGame";
import { ChromeDinoSpaceGame } from "@/games/ChromeDinoSpaceGame";
import { CookieRunGame } from "@/games/CookieRunGame";
import { CourseRegistrationNumberGame } from "@/games/CourseRegistrationNumberGame";
import { CrazyArcadeGame } from "@/games/CrazyArcadeGame";
import { DefaultMicrogameCanvas } from "@/games/DefaultMicrogameCanvas";
import { GeometryDashGame } from "@/games/GeometryDashGame";
import { GomokuGame } from "@/games/GomokuGame";
import { HalliGalliBossGame } from "@/games/HalliGalliBossGame";
import { HancomTypingGame } from "@/games/HancomTypingGame";
import { KartriderBossGame } from "@/games/KartriderBossGame";
import { LaytonShapeMatchGame } from "@/games/LaytonShapeMatchGame";
import { LeagueChampionBanGame } from "@/games/LeagueChampionBanGame";
import { MaplestoryLieDetectorGame } from "@/games/MaplestoryLieDetectorGame";
import { MaplestoryRuneGame } from "@/games/MaplestoryRuneGame";
import { MinecraftMiningGame } from "@/games/MinecraftMiningGame";
import { ModooMarbleGame } from "@/games/ModooMarbleGame";
import type { Microgame } from "@/data/microgames";
import { PianoMelodyGame } from "@/games/PianoMelodyGame";
import { PokemonTypingGame } from "@/games/PokemonTypingGame";
import { SuperMarioCoinGame } from "@/games/SuperMarioCoinGame";
import { TetrisLineClearGame } from "@/games/TetrisLineClearGame";
import { UndertaleMouseGame } from "@/games/UndertaleMouseGame";
import { ZeldaCircleDrawGame } from "@/games/ZeldaCircleDrawGame";

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

  if (microgame.canvas === "modooMarble") {
    return <ModooMarbleGame microgame={microgame} />;
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

  if (microgame.canvas === "leagueChampionBan") {
    return <LeagueChampionBanGame microgame={microgame} />;
  }

  if (microgame.canvas === "pianoMelody") {
    return <PianoMelodyGame microgame={microgame} />;
  }

  if (microgame.canvas === "chromeDinoSpace") {
    return <ChromeDinoSpaceGame microgame={microgame} />;
  }

  if (microgame.canvas === "cookieRun") {
    return <CookieRunGame microgame={microgame} />;
  }

  if (microgame.canvas === "crazyArcade") {
    return <CrazyArcadeGame microgame={microgame} />;
  }

  if (microgame.canvas === "geometryDashSpikes") {
    return <GeometryDashGame microgame={microgame} />;
  }

  if (microgame.canvas === "gomokuWhiteStone") {
    return <GomokuGame microgame={microgame} />;
  }

  if (microgame.canvas === "hancomTyping") {
    return <HancomTypingGame microgame={microgame} />;
  }

  if (microgame.canvas === "halliGalliBoss") {
    return <HalliGalliBossGame microgame={microgame} />;
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

  if (microgame.canvas === "zeldaCircleDraw") {
    return <ZeldaCircleDrawGame microgame={microgame} />;
  }

  return <DefaultMicrogameCanvas microgame={microgame} />;
}

export function MicrogameCanvas({ microgame }: GameCanvasProps) {
  return renderGameCanvas(microgame);
}
