"use client";

import { useEffect, useState } from "react";
import { ALL_GAME_PRELOAD_ASSETS } from "@/games/preloadAssets";

const MIN_LOADING_TIME_MS = 900;

let allGameAssetsPreloadPromise: Promise<unknown> | null = null;

export type GameScreen = "main" | "loading" | "playing" | "gameOver";

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
    waitForMinimumLoadingTime(),
  ]);

  return allGameAssetsPreloadPromise;
}

export function useGameScreenFlow() {
  const [screen, setScreen] = useState<GameScreen>("main");

  useEffect(() => {
    if (screen !== "loading") {
      return;
    }

    let isCurrentLoadingScreen = true;

    preloadAllGameAssets().then(() => {
      if (isCurrentLoadingScreen) {
        setScreen("playing");
      }
    });

    return () => {
      isCurrentLoadingScreen = false;
    };
  }, [screen]);

  const startGame = () => {
    setScreen("loading");
  };

  const finishGame = () => {
    setScreen("gameOver");
  };

  const restartGame = () => {
    setScreen("loading");
  };

  const returnToMain = () => {
    setScreen("main");
  };

  return {
    finishGame,
    restartGame,
    returnToMain,
    screen,
    startGame,
  };
}
