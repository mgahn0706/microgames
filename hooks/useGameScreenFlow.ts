"use client";

import { useCallback, useEffect, useState } from "react";
import { ALL_GAME_PRELOAD_ASSETS } from "@/data/preloadAssets";
import { useHighestClearedRound } from "@/hooks/useHighestClearedRound";
import { bgmLibrary } from "@/lib/bgmLibrary";

const MIN_LOADING_TIME_MS = 900;
const MAX_LIVES = 4;

let allGameAssetsPreloadPromise: Promise<unknown> | null = null;

export type GameScreen = "main" | "loading" | "setup" | "playing" | "gameOver";
export type GameRoundResult = "idle" | "success" | "failure";

function waitForMinimumLoadingTime() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MIN_LOADING_TIME_MS);
  });
}

function preloadAsset(assetPath: string) {
  return fetch(assetPath, { cache: "force-cache" }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to preload ${assetPath}`);
    }
  });
}

function preloadAllGameAssets() {
  allGameAssetsPreloadPromise ??= Promise.allSettled([
    ...ALL_GAME_PRELOAD_ASSETS.map(preloadAsset),
    bgmLibrary.preloadAll(),
    waitForMinimumLoadingTime(),
  ]);

  return allGameAssetsPreloadPromise;
}

export function useGameScreenFlow() {
  const [screen, setScreen] = useState<GameScreen>("loading");
  const [lives, setLives] = useState(MAX_LIVES);
  const [roundResult, setRoundResult] = useState<GameRoundResult>("idle");
  const [finalClearedRound, setFinalClearedRound] = useState(0);
  const { highestClearedRound, recordHighestClearedRound } =
    useHighestClearedRound();

  useEffect(() => {
    if (screen !== "loading") {
      return;
    }

    let isCurrentLoadingScreen = true;

    preloadAllGameAssets().then(() => {
      if (isCurrentLoadingScreen) {
        setScreen("main");
      }
    });

    return () => {
      isCurrentLoadingScreen = false;
    };
  }, [screen]);

  const startGame = useCallback(() => {
    setFinalClearedRound(0);
    setLives(MAX_LIVES);
    setRoundResult("idle");
    setScreen("setup");
  }, []);

  const completeSetup = useCallback(() => {
    setScreen("playing");
  }, []);

  const finishGame = useCallback(() => {
    setLives(0);
    setScreen("gameOver");
  }, []);

  const restartGame = useCallback(() => {
    setFinalClearedRound(0);
    setLives(MAX_LIVES);
    setRoundResult("idle");
    setScreen("setup");
  }, []);

  const returnToMain = useCallback(() => {
    setFinalClearedRound(0);
    setLives(MAX_LIVES);
    setRoundResult("idle");
    setScreen("main");
  }, []);

  const recordSuccess = useCallback((roundNumber: number) => {
    recordHighestClearedRound(roundNumber);
    setFinalClearedRound((currentFinalClearedRound) =>
      Math.max(currentFinalClearedRound, roundNumber),
    );
    setRoundResult("success");
  }, [recordHighestClearedRound]);

  const resetRoundResult = useCallback(() => {
    setRoundResult("idle");
  }, []);

  const loseLife = useCallback(() => {
    setRoundResult("failure");
    setLives((currentLives) => {
      return Math.max(currentLives - 1, 0);
    });
  }, []);

  const gainLife = useCallback(() => {
    setLives((currentLives) => {
      if (currentLives <= 0) {
        return currentLives;
      }

      return Math.min(currentLives + 1, MAX_LIVES);
    });
  }, []);

  return {
    completeSetup,
    finalClearedRound,
    finishGame,
    gainLife,
    highestClearedRound,
    lives,
    loseLife,
    maxLives: MAX_LIVES,
    recordSuccess,
    resetRoundResult,
    restartGame,
    returnToMain,
    roundResult,
    screen,
    startGame,
  };
}
