"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CHALLENGE_MODE_UNLOCK_ROUND,
  THRILL_MODE_MAX_LIVES,
  type ChallengeModeId,
  hasChallengeMode,
} from "@/data/challengeModes";
import { ALL_GAME_PRELOAD_ASSETS } from "@/data/preloadAssets";
import { useHighestClearedRound } from "@/hooks/useHighestClearedRound";
import { bgmLibrary } from "@/lib/bgmLibrary";

const MIN_LOADING_TIME_MS = 900;
const MAX_LIVES = 4;
const ENABLE_GAME_ASSET_PRELOADING =
  process.env.NEXT_PUBLIC_ENABLE_GAME_ASSET_PRELOADING !== "false";

let allGameAssetsPreloadPromise: Promise<void> | null = null;

export type GameScreen = "main" | "loading" | "setup" | "playing" | "gameOver";
export type GameRoundResult = "idle" | "success" | "failure";
export type PreloadStatus = Readonly<{
  currentAsset: string;
  errorMessage: string | null;
  failedAsset: string | null;
  loaded: number;
  phase: "complete" | "failed" | "loading";
  total: number;
}>;

const INITIAL_PRELOAD_STATUS = {
  currentAsset: "",
  errorMessage: null,
  failedAsset: null,
  loaded: 0,
  phase: "loading",
  total: ALL_GAME_PRELOAD_ASSETS.length + 2,
} satisfies PreloadStatus;

type PreloadTask = Readonly<{
  label: string;
  load: () => Promise<unknown>;
}>;

type PreloadProgressHandler = (status: PreloadStatus) => void;

function waitForMinimumLoadingTime() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MIN_LOADING_TIME_MS);
  });
}

function isImageAsset(assetPath: string) {
  return /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(assetPath);
}

function preloadImageAsset(assetPath: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      if (!image.decode) {
        resolve();
        return;
      }

      image.decode().then(resolve).catch(resolve);
    };
    image.onerror = () => {
      reject(new Error(`Failed to preload image ${assetPath}`));
    };
    image.src = assetPath;
  });
}

function preloadFetchAsset(assetPath: string) {
  return fetch(assetPath, { cache: "force-cache" }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to preload ${assetPath}`);
    }
  });
}

function preloadAsset(assetPath: string) {
  if (isImageAsset(assetPath)) {
    return preloadImageAsset(assetPath);
  }

  return preloadFetchAsset(assetPath);
}

function createPreloadTasks() {
  return [
    ...ALL_GAME_PRELOAD_ASSETS.map((assetPath) => ({
      label: assetPath,
      load: () => preloadAsset(assetPath),
    })),
    {
      label: "오디오 버퍼 준비",
      load: () => bgmLibrary.preloadAll(),
    },
    {
      label: "로딩 화면 준비",
      load: waitForMinimumLoadingTime,
    },
  ] satisfies PreloadTask[];
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function runPreloadTasks(onProgress: PreloadProgressHandler | undefined) {
  const tasks = createPreloadTasks();
  let loaded = 0;

  for (const task of tasks) {
    onProgress?.({
      currentAsset: task.label,
      errorMessage: null,
      failedAsset: null,
      loaded,
      phase: "loading",
      total: tasks.length,
    });

    try {
      await task.load();
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      onProgress?.({
        currentAsset: "",
        errorMessage,
        failedAsset: task.label,
        loaded,
        phase: "failed",
        total: tasks.length,
      });
      throw error;
    }

    loaded += 1;
    onProgress?.({
      currentAsset: task.label,
      errorMessage: null,
      failedAsset: null,
      loaded,
      phase: "loading",
      total: tasks.length,
    });
  }

  onProgress?.({
    currentAsset: "",
    errorMessage: null,
    failedAsset: null,
    loaded,
    phase: "complete",
    total: tasks.length,
  });
}

function preloadAllGameAssets(onProgress?: PreloadProgressHandler) {
  allGameAssetsPreloadPromise ??= runPreloadTasks(onProgress);

  return allGameAssetsPreloadPromise;
}

function resetPreloadCache() {
  allGameAssetsPreloadPromise = null;
}

function getMaxLives(challengeModeIds: readonly ChallengeModeId[]) {
  return hasChallengeMode(challengeModeIds, "thrill")
    ? THRILL_MODE_MAX_LIVES
    : MAX_LIVES;
}

function getInitialLives(challengeModeIds: readonly ChallengeModeId[]) {
  return getMaxLives(challengeModeIds);
}

export function useGameScreenFlow() {
  const [preloadStatus, setPreloadStatus] = useState<PreloadStatus>(
    INITIAL_PRELOAD_STATUS,
  );
  const [preloadAttempt, setPreloadAttempt] = useState(0);
  const [screen, setScreen] = useState<GameScreen>(
    ENABLE_GAME_ASSET_PRELOADING ? "loading" : "main",
  );
  const [lives, setLives] = useState(MAX_LIVES);
  const [selectedChallengeModeIds, setSelectedChallengeModeIds] = useState<
    ChallengeModeId[]
  >([]);
  const [activeChallengeModeIds, setActiveChallengeModeIds] = useState<
    ChallengeModeId[]
  >([]);
  const [roundResult, setRoundResult] = useState<GameRoundResult>("idle");
  const [finalClearedRound, setFinalClearedRound] = useState(0);
  const { highestClearedRound, recordHighestClearedRound } =
    useHighestClearedRound();

  useEffect(() => {
    if (!ENABLE_GAME_ASSET_PRELOADING) {
      return;
    }

    if (screen !== "loading") {
      return;
    }

    let isCurrentLoadingScreen = true;

    preloadAllGameAssets((nextStatus) => {
      if (isCurrentLoadingScreen) {
        setPreloadStatus(nextStatus);
      }
    })
      .then(() => {
        if (isCurrentLoadingScreen) {
          setScreen("main");
        }
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    return () => {
      isCurrentLoadingScreen = false;
    };
  }, [preloadAttempt, screen]);

  const retryPreload = useCallback(() => {
    if (!ENABLE_GAME_ASSET_PRELOADING) {
      setScreen("main");
      return;
    }

    resetPreloadCache();
    setPreloadStatus(INITIAL_PRELOAD_STATUS);
    setPreloadAttempt((currentAttempt) => currentAttempt + 1);
    setScreen("loading");
  }, []);

  const toggleChallengeMode = useCallback((challengeModeId: ChallengeModeId) => {
    setSelectedChallengeModeIds((currentChallengeModeIds) => {
      if (highestClearedRound < CHALLENGE_MODE_UNLOCK_ROUND) {
        return currentChallengeModeIds;
      }

      if (currentChallengeModeIds.includes(challengeModeId)) {
        return currentChallengeModeIds.filter(
          (currentChallengeModeId) =>
            currentChallengeModeId !== challengeModeId,
        );
      }

      return [...currentChallengeModeIds, challengeModeId];
    });
  }, [highestClearedRound]);

  const startGame = useCallback(() => {
    const nextChallengeModeIds =
      highestClearedRound >= CHALLENGE_MODE_UNLOCK_ROUND
        ? selectedChallengeModeIds
        : [];

    setActiveChallengeModeIds(nextChallengeModeIds);
    setFinalClearedRound(0);
    setLives(getInitialLives(nextChallengeModeIds));
    setRoundResult("idle");
    setScreen("setup");
  }, [highestClearedRound, selectedChallengeModeIds]);

  const completeSetup = useCallback(() => {
    setScreen("playing");
  }, []);

  const finishGame = useCallback(() => {
    setLives(0);
    setScreen("gameOver");
  }, []);

  const restartGame = useCallback(() => {
    setFinalClearedRound(0);
    setLives(getInitialLives(activeChallengeModeIds));
    setRoundResult("idle");
    setScreen("setup");
  }, [activeChallengeModeIds]);

  const returnToMain = useCallback(() => {
    setFinalClearedRound(0);
    setLives(MAX_LIVES);
    setRoundResult("idle");
    setScreen("main");
  }, []);

  const recordSuccess = useCallback(
    (roundNumber: number) => {
      recordHighestClearedRound(roundNumber);
      setFinalClearedRound((currentFinalClearedRound) =>
        Math.max(currentFinalClearedRound, roundNumber),
      );
      setRoundResult("success");
    },
    [recordHighestClearedRound],
  );

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
      const currentMaxLives = getMaxLives(activeChallengeModeIds);

      if (currentLives <= 0) {
        return currentLives;
      }

      return Math.min(currentLives + 1, currentMaxLives);
    });
  }, [activeChallengeModeIds]);

  return {
    completeSetup,
    finalClearedRound,
    finishGame,
    gainLife,
    activeChallengeModeIds,
    highestClearedRound,
    isChallengeModeUnlocked:
      highestClearedRound >= CHALLENGE_MODE_UNLOCK_ROUND,
    lives,
    loseLife,
    maxLives: getMaxLives(activeChallengeModeIds),
    preloadStatus,
    recordSuccess,
    resetRoundResult,
    restartGame,
    retryPreload,
    returnToMain,
    roundResult,
    screen,
    selectedChallengeModeIds,
    startGame,
    toggleChallengeMode,
  };
}
