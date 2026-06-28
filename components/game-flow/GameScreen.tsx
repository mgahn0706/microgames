"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChallengeModes } from "@/data/challengeModes";
import { FORM_INSTRUCTIONS } from "@/data/formInstructions";
import { getMicrogamePoolForRound, type Microgame } from "@/data/microgames";
import { useBeatGameRound } from "@/hooks/useBeatGameRound";
import { useMicrogameInput } from "@/hooks/useMicrogameInput";
import { useRecordSeenMicrogame } from "@/hooks/useRecordSeenMicrogame";
import { useSynchronizedRhythm } from "@/hooks/useSynchronizedRhythm";
import { bgmLibrary, type SoundEffectTrack } from "@/lib/bgmLibrary";
import { FixedLivesOverlay } from "./FixedLivesOverlay";
import {
  NO_CONTROL_RESULT_BGM_TRACKS,
  RESULT_BGM_TRACKS,
} from "./gameFlowConstants";
import { NeonShell } from "./NeonShell";
import {
  BossStageScreen,
  InstructionRoundScreen,
  MicrogameRoundScreen,
  OneUpScreen,
  ResultRoundScreen,
  SpeedUpScreen,
} from "./roundScreens";

const CLEAR_SOUND_EFFECTS = [
  "clear1",
  "clear2",
  "clear3",
  "clear4",
  "clear5",
] satisfies SoundEffectTrack[];

function getRandomClearSoundEffect() {
  return CLEAR_SOUND_EFFECTS[
    Math.floor(Math.random() * CLEAR_SOUND_EFFECTS.length)
  ];
}

function FormInstructionImageCache() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed -left-[9999px] top-0 size-px overflow-hidden opacity-0"
    >
      {FORM_INSTRUCTIONS.map((instruction) => (
        <Image
          src={instruction.imageSrc}
          alt=""
          width={1448}
          height={1086}
          key={instruction.imageSrc}
          priority
          unoptimized
        />
      ))}
    </div>
  );
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;

    let value = state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function getStringHash(value: string) {
  return Array.from(value).reduce(
    (hash, character) => (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0,
    0,
  );
}

function shuffleMicrogames(microgames: readonly Microgame[], seed: number) {
  const nextMicrogames = [...microgames];
  const random = createSeededRandom(seed);

  for (let index = nextMicrogames.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const currentMicrogame = nextMicrogames[index];
    const swapMicrogame = nextMicrogames[swapIndex];

    nextMicrogames[index] = swapMicrogame;
    nextMicrogames[swapIndex] = currentMicrogame;
  }

  return nextMicrogames;
}

function getRoundMicrogame(roundNumber: number, sessionSeed: number) {
  const bagStates: Record<
    string,
    {
      bag: Microgame[];
      previousMicrogame: Microgame | undefined;
      refillCount: number;
    }
  > = {};
  let selectedMicrogame: Microgame | undefined;

  for (
    let currentRoundNumber = 1;
    currentRoundNumber <= roundNumber;
    currentRoundNumber += 1
  ) {
    const microgamePool = getMicrogamePoolForRound(currentRoundNumber);
    const bagKey = microgamePool.map(({ id }) => id).join("|");
    const bagState = bagStates[bagKey] ?? {
      bag: [],
      previousMicrogame: undefined,
      refillCount: 0,
    };
    const shouldRefill = bagState.bag.length === 0;
    const refillSeed =
      (sessionSeed +
        getStringHash(bagKey) +
        bagState.refillCount * 2654435761) >>>
      0;
    const nextBag = shouldRefill
      ? avoidImmediateMicrogameRepeat(
          shuffleMicrogames(microgamePool, refillSeed),
          bagState.previousMicrogame,
        )
      : bagState.bag;
    const [nextMicrogame, ...remainingMicrogames] = nextBag;

    if (!nextMicrogame) {
      throw new Error("Microgame pool must include at least one game.");
    }

    selectedMicrogame = nextMicrogame;
    bagStates[bagKey] = {
      bag: remainingMicrogames,
      previousMicrogame: nextMicrogame,
      refillCount: shouldRefill
        ? bagState.refillCount + 1
        : bagState.refillCount,
    };
  }

  if (!selectedMicrogame) {
    throw new Error("Round number must be at least 1.");
  }

  return selectedMicrogame;
}

function avoidImmediateMicrogameRepeat(
  microgames: readonly Microgame[],
  previousMicrogame: Microgame | undefined,
) {
  const nextMicrogames = [...microgames];

  if (
    !previousMicrogame ||
    nextMicrogames.length <= 1 ||
    nextMicrogames[0]?.id !== previousMicrogame.id
  ) {
    return nextMicrogames;
  }

  const replacementIndex = nextMicrogames.findIndex(
    (microgame) => microgame.id !== previousMicrogame.id,
  );

  if (replacementIndex <= 0) {
    return nextMicrogames;
  }

  const repeatedMicrogame = nextMicrogames[0];
  const replacementMicrogame = nextMicrogames[replacementIndex];

  nextMicrogames[0] = replacementMicrogame;
  nextMicrogames[replacementIndex] = repeatedMicrogame;

  return nextMicrogames;
}

export function GameScreen({
  challengeModes,
  lives,
  maxLives,
  onFinish,
  onGainLife,
  onLoseLife,
  onReachRound,
  onResetResult,
  onSeenMicrogame,
  onSuccess,
}: Readonly<{
  challengeModes: ChallengeModes;
  lives: number;
  maxLives: number;
  onFinish: (reachedRound: number) => void;
  onGainLife: () => void;
  onLoseLife: () => void;
  onReachRound: (roundNumber: number) => void;
  onResetResult: () => void;
  onSeenMicrogame: (microgameId: string) => void;
  onSuccess: () => void;
}>) {
  const oneUpAppliedRoundRef = useRef<number | null>(null);
  const clearSoundPlayedRoundRef = useRef<number | null>(null);
  const [microgameSessionSeed] = useState(() =>
    Math.floor(Math.random() * 4294967296),
  );
  const getMicrogameForRound = useCallback(
    (nextRoundNumber: number) =>
      getRoundMicrogame(nextRoundNumber, microgameSessionSeed),
    [microgameSessionSeed],
  );

  const {
    beatDurationMs,
    beatsLeft,
    confirmSuccessFeedback,
    gameBeatCount,
    instructionStep,
    phase,
    recordFailure,
    recordSuccess,
    roundNumber,
    roundResult,
  } = useBeatGameRound({
    getGameBeatCount: (nextRoundNumber) =>
      getMicrogameForRound(nextRoundNumber).beatCount,
    initialSpeedMultiplier: challengeModes.fastStart ? 1.8 : 1,
    noControlHints: challengeModes.noControlHints,
    onFailure: onLoseLife,
    onFinish,
    onResetResult,
    onSuccess,
    shouldFinishAfterResult: lives <= 0,
    shouldPlayOneUp:
      !challengeModes.singleLife && lives > 0 && lives < maxLives,
  });
  const { getStaggeredRhythmStyle, rhythmStyle } =
    useSynchronizedRhythm(beatDurationMs);
  const microgame = useMemo(
    () => getMicrogameForRound(roundNumber),
    [getMicrogameForRound, roundNumber],
  );

  const backdropTone =
    phase === "bossStage" || phase === "speedUp" ? "warning" : "default";
  const shouldShowCanvasTransition =
    phase === "instruction" && instructionStep === "promptTransition";
  const shouldShowStartPrompt =
    (phase === "instruction" && instructionStep === "promptTransition") ||
    (phase === "game" && beatsLeft === gameBeatCount);
  const recordSuccessWithClearSound = useCallback(() => {
    recordSuccess();

    if (microgame.canvas === "babaIsYou") {
      return;
    }

    if (clearSoundPlayedRoundRef.current === roundNumber) {
      return;
    }

    clearSoundPlayedRoundRef.current = roundNumber;
    bgmLibrary
      .playSoundEffect(getRandomClearSoundEffect())
      .then(confirmSuccessFeedback)
      .catch((error: unknown) => {
        console.error(error);
      });
  }, [confirmSuccessFeedback, microgame.canvas, recordSuccess, roundNumber]);

  useMicrogameInput({
    isActive: phase === "game",
    onClear: recordSuccessWithClearSound,
    onFailure: recordFailure,
    roundNumber,
  });
  useRecordSeenMicrogame({
    isActive: phase === "game",
    microgameId: microgame.id,
    onSeen: onSeenMicrogame,
  });

  useEffect(() => {
    if (phase !== "game") {
      return;
    }

    onReachRound(roundNumber);
  }, [onReachRound, phase, roundNumber]);

  useEffect(() => {
    bgmLibrary.setBeatDurationMs(beatDurationMs);

    if (phase === "instruction") {
      bgmLibrary
        .play(
          challengeModes.noControlHints
            ? "intermissionNoControl"
            : "intermission",
          "once",
        )
        .catch((error: unknown) => {
          console.error(error);
        });
      return;
    }

    if (phase === "game") {
      if (microgame.canvas === "animalCrossingStamps") {
        bgmLibrary
          .play("animalCrossing", "once", "now")
          .catch((error: unknown) => {
            console.error(error);
          });
        return;
      }

      if (microgame.canvas === "brainAcademyBlocks") {
        bgmLibrary
          .play("brainAcademy", "once", "now")
          .catch((error: unknown) => {
            console.error(error);
          });
        return;
      }

      if (microgame.canvas === "animalFarmReverseTyping") {
        bgmLibrary.play("animalFarm", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "appleNumberSum") {
        bgmLibrary.play("appleGame", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "babaIsYou") {
        bgmLibrary.play("babaIsYou", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "geometryDashSpikes") {
        bgmLibrary
          .play("geometryDash", "once", "now")
          .catch((error: unknown) => {
            console.error(error);
          });
        return;
      }

      if (microgame.canvas === "fireAndIceDance") {
        bgmLibrary.play("fireAndIce", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "fruitNinja") {
        bgmLibrary.play("fruitNinja", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "pokemonTyping") {
        bgmLibrary.play("pokemon", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "pokemonTcgPocket") {
        bgmLibrary
          .play("pokemonTcgPocket", "once", "now")
          .catch((error: unknown) => {
            console.error(error);
          });
        return;
      }

      if (microgame.canvas === "pokerougeShop") {
        bgmLibrary.play("pokerouge", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "rhythmHeroSpinner") {
        bgmLibrary.play("rhythmHero", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "undertaleMouse") {
        bgmLibrary.play("undertale", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "wiiSportsDualPress") {
        bgmLibrary.play("wiiSports", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "wordleBoss") {
        bgmLibrary.play("wordle", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "superMarioCoins") {
        bgmLibrary.play("superMario", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "superMarioGalaxyStarBits") {
        bgmLibrary
          .play("superMarioGalaxy", "once", "now")
          .catch((error: unknown) => {
            console.error(error);
          });
        return;
      }

      if (microgame.canvas === "suikaGame") {
        bgmLibrary.play("suikaGame", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "starcraftMove") {
        bgmLibrary.play("starcraft", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "tetrisLineClear") {
        bgmLibrary.play("tetris", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "minecraftMining") {
        bgmLibrary.play("minecraft", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "modooMarble") {
        bgmLibrary
          .play("modooMarble", "once", "now")
          .catch((error: unknown) => {
            console.error(error);
          });
        return;
      }

      if (microgame.canvas === "cookieRun") {
        bgmLibrary.play("cookieRun", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "cookieRunKingdom") {
        bgmLibrary
          .play("cookieRunKingdom", "once", "now")
          .catch((error: unknown) => {
            console.error(error);
          });
        return;
      }

      if (microgame.canvas === "crosswordPuzzle") {
        bgmLibrary.play("crossword", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "crazyArcade") {
        bgmLibrary
          .play("crazyArcade", "once", "now")
          .catch((error: unknown) => {
            console.error(error);
          });
        return;
      }

      if (microgame.canvas === "dobble") {
        bgmLibrary.play("dobble", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "maplestoryLieDetector") {
        bgmLibrary.play("maplestory", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "laytonShapeMatch") {
        bgmLibrary.play("layton", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "leagueChampionBan") {
        bgmLibrary
          .play("leagueOfLegend", "once", "now")
          .catch((error: unknown) => {
            console.error(error);
          });
        return;
      }

      if (microgame.canvas === "hancomTyping") {
        bgmLibrary.play("hancom", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "zeldaCircleDraw") {
        bgmLibrary.play("zelda", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "halliGalliBoss") {
        bgmLibrary.play("halliGalli", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "maplestoryRune") {
        bgmLibrary.play("mapleRune", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "minigameExBearMeat") {
        bgmLibrary.play("minigameEx", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "kartriderCourse") {
        bgmLibrary.play("kartrider", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "kirbyInhale") {
        bgmLibrary.play("kirby", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      if (microgame.canvas === "sudokuMissingNumber") {
        bgmLibrary.play("sudoku", "once", "now").catch((error: unknown) => {
          console.error(error);
        });
        return;
      }

      bgmLibrary.stop();
      return;
    }

    if (phase === "speedUp") {
      bgmLibrary.play("speedUp", "once").catch((error: unknown) => {
        console.error(error);
      });
      return;
    }

    if (phase === "bossStage") {
      bgmLibrary.play("bossStage", "once").catch((error: unknown) => {
        console.error(error);
      });
      return;
    }

    if (phase === "oneUp") {
      if (oneUpAppliedRoundRef.current === roundNumber) {
        return;
      }

      oneUpAppliedRoundRef.current = roundNumber;
      onGainLife();
      bgmLibrary.play("oneUp", "once").catch((error: unknown) => {
        console.error(error);
      });
      return;
    }

    const resultBgmTracks = challengeModes.noControlHints
      ? NO_CONTROL_RESULT_BGM_TRACKS
      : RESULT_BGM_TRACKS;
    const nextResultBgmTrack = resultBgmTracks[roundResult];
    const intermissionTrack = challengeModes.noControlHints
      ? "intermissionNoControl"
      : "intermission";
    const shouldGoToGameOver = roundResult === "failure" && lives <= 0;
    const shouldSpeedUpAfterResult = roundNumber % 4 === 0;

    if (!nextResultBgmTrack) {
      return;
    }

    if (shouldGoToGameOver) {
      bgmLibrary.play(nextResultBgmTrack, "once").catch((error: unknown) => {
        console.error(error);
      });
      return;
    }

    if (shouldSpeedUpAfterResult) {
      bgmLibrary.play(nextResultBgmTrack, "once").catch((error: unknown) => {
        console.error(error);
      });
      return;
    }

    bgmLibrary
      .playSequence(nextResultBgmTrack, "once", intermissionTrack, "once")
      .catch((error: unknown) => {
        console.error(error);
      });
  }, [
    beatDurationMs,
    challengeModes.noControlHints,
    lives,
    microgame.canvas,
    onGainLife,
    phase,
    roundNumber,
    roundResult,
  ]);

  return (
    <NeonShell
      backdropTone={backdropTone}
      roundResult={roundResult}
      rhythmStyle={rhythmStyle}
      showBackdrop={phase !== "game"}
      shouldDim={false}
      transition={phase === "result" ? "toElevator" : "none"}
    >
      <FormInstructionImageCache />
      {phase === "game" ? null : (
        <FixedLivesOverlay
          getStaggeredRhythmStyle={getStaggeredRhythmStyle}
          lives={lives}
          maxLives={maxLives}
        />
      )}
      <div className={phase === "instruction" ? "contents" : "hidden"}>
        <InstructionRoundScreen
          beatDurationMs={beatDurationMs}
          hideControlIndicator={challengeModes.noControlHints}
          instructionStep={instructionStep}
          microgame={microgame}
          rhythmStyle={rhythmStyle}
          roundNumber={roundNumber}
        />
      </div>
      {phase === "game" || shouldShowCanvasTransition ? (
        <MicrogameRoundScreen
          beatDurationMs={beatDurationMs}
          beatsLeft={beatsLeft}
          isTransitioning={shouldShowCanvasTransition}
          microgame={microgame}
          roundNumber={roundNumber}
        />
      ) : phase === "speedUp" ? (
        <SpeedUpScreen />
      ) : phase === "bossStage" ? (
        <BossStageScreen />
      ) : phase === "oneUp" ? (
        <OneUpScreen />
      ) : phase === "instruction" ? null : (
        <ResultRoundScreen />
      )}
      {shouldShowStartPrompt ? (
        <div
          className="microgame-start-prompt pointer-events-none fixed inset-0 z-30 grid place-items-center"
          key={`${roundNumber}-${microgame.id}`}
        >
          <p>{microgame.startPrompt}</p>
        </div>
      ) : null}
    </NeonShell>
  );
}
