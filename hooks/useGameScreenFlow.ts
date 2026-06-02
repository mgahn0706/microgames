"use client";

import { useEffect, useState } from "react";

const PRELOAD_ASSETS = [
  "/images/main-elevator-1.png",
  "/images/main-elevator-2.png",
  "/sounds/095. Museum - Intermissions.mp3",
];

const MIN_LOADING_TIME_MS = 900;

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

function preloadGameAssets() {
  return Promise.allSettled([
    ...PRELOAD_ASSETS.map(preloadAsset),
    waitForMinimumLoadingTime(),
  ]);
}

export function useGameScreenFlow() {
  const [screen, setScreen] = useState<GameScreen>("main");

  useEffect(() => {
    if (screen !== "loading") {
      return;
    }

    let isCurrentLoadingScreen = true;

    preloadGameAssets().then(() => {
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
