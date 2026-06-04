"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMicrogameForRound } from "@/games/microgames";
import { useBeatGameRound } from "@/hooks/useBeatGameRound";
import { useMicrogameInput } from "@/hooks/useMicrogameInput";
import { useSynchronizedRhythm } from "@/hooks/useSynchronizedRhythm";
import { bgmLibrary, type SoundEffectTrack } from "@/lib/bgmLibrary";
import { FixedLivesOverlay } from "./FixedLivesOverlay";
import { RESULT_BGM_TRACKS } from "./gameFlowConstants";
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

export function GameScreen({
  lives,
  maxLives,
  onFinish,
  onGainLife,
  onLoseLife,
  onResetResult,
  onSuccess,
}: Readonly<{
  lives: number;
  maxLives: number;
  onFinish: () => void;
  onGainLife: () => void;
  onLoseLife: () => void;
  onResetResult: () => void;
  onSuccess: (roundNumber: number) => void;
}>) {
  const [microgameSessionSeed] = useState(() => Math.random());
  const oneUpAppliedRoundRef = useRef<number | null>(null);
  const clearSoundPlayedRoundRef = useRef<number | null>(null);
  const getRoundMicrogame = useCallback(
    (nextRoundNumber: number) =>
      getMicrogameForRound(nextRoundNumber, microgameSessionSeed),
    [microgameSessionSeed],
  );

  const {
    beatDurationMs,
    beatsLeft,
    instructionStep,
    phase,
    recordSuccess,
    roundNumber,
    roundResult,
  } = useBeatGameRound({
    getGameBeatCount: (nextRoundNumber) =>
      getRoundMicrogame(nextRoundNumber).beatCount,
    onFailure: onLoseLife,
    onFinish,
    onResetResult,
    onSuccess,
    shouldFinishAfterResult: lives <= 0,
    shouldPlayOneUp: lives > 0 && lives < maxLives,
  });
  const { getStaggeredRhythmStyle, rhythmStyle } =
    useSynchronizedRhythm(beatDurationMs);
  const microgame = useMemo(
    () => getRoundMicrogame(roundNumber),
    [getRoundMicrogame, roundNumber],
  );
  const canRecordResult = phase === "game";
  const recordSuccessWithClearSound = useCallback(() => {
    recordSuccess();

    if (clearSoundPlayedRoundRef.current === roundNumber) {
      return;
    }

    clearSoundPlayedRoundRef.current = roundNumber;
    bgmLibrary
      .playSoundEffect(getRandomClearSoundEffect())
      .catch((error: unknown) => {
        console.error(error);
      });
  }, [recordSuccess, roundNumber]);

  useMicrogameInput({
    isActive: phase === "game",
    microgame,
    onClear: recordSuccessWithClearSound,
    roundNumber,
  });

  useEffect(() => {
    bgmLibrary.setBeatDurationMs(beatDurationMs);

    if (phase === "instruction") {
      bgmLibrary.play("intermission", "once").catch((error: unknown) => {
        console.error(error);
      });
      return;
    }

    if (phase === "game") {
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

    const nextResultBgmTrack = RESULT_BGM_TRACKS[roundResult];
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
      .playSequence(nextResultBgmTrack, "once", "intermission", "once")
      .catch((error: unknown) => {
        console.error(error);
      });
  }, [beatDurationMs, lives, onGainLife, phase, roundNumber, roundResult]);

  return (
    <NeonShell
      roundResult={roundResult}
      rhythmStyle={rhythmStyle}
      showBackdrop={phase !== "game"}
      shouldDim={false}
    >
      {phase === "game" ? null : (
        <FixedLivesOverlay
          getStaggeredRhythmStyle={getStaggeredRhythmStyle}
          lives={lives}
          maxLives={maxLives}
        />
      )}
      {phase === "instruction" ? (
        <InstructionRoundScreen
          beatDurationMs={beatDurationMs}
          instructionStep={instructionStep}
          microgame={microgame}
          rhythmStyle={rhythmStyle}
          roundNumber={roundNumber}
        />
      ) : phase === "game" ? (
        <MicrogameRoundScreen
          beatsLeft={beatsLeft}
          canRecordResult={canRecordResult}
          microgame={microgame}
          onFinish={onFinish}
        />
      ) : phase === "speedUp" ? (
        <SpeedUpScreen />
      ) : phase === "bossStage" ? (
        <BossStageScreen />
      ) : phase === "oneUp" ? (
        <OneUpScreen />
      ) : (
        <ResultRoundScreen />
      )}
    </NeonShell>
  );
}
