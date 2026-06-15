"use client";

import { useCallback, useEffect, useState } from "react";
import { ALL_GAME_PRELOAD_ASSETS } from "@/data/preloadAssets";
import { useHighestReachedRound } from "@/hooks/useHighestReachedRound";
import { BGM_LIBRARY_PRELOAD_ASSET_PATHS, bgmLibrary } from "@/lib/bgmLibrary";

const PRELOAD_CONCURRENCY = 16;
const PRELOAD_PROGRESS_STEP = 5;

const GENERAL_PRELOAD_ASSETS = ALL_GAME_PRELOAD_ASSETS.filter(
  (assetPath) => !BGM_LIBRARY_PRELOAD_ASSET_PATHS.has(assetPath),
);

type GlobalPreloadState = {
  isComplete: boolean;
  promise: Promise<void> | null;
};

const GLOBAL_PRELOAD_STATE_KEY = "__catTowerGameAssetsPreload";
const serverPreloadState: GlobalPreloadState = {
  isComplete: false,
  promise: null,
};

function getGlobalPreloadState() {
  if (typeof window === "undefined") {
    return serverPreloadState;
  }

  const globalWindow = window as typeof window & {
    [GLOBAL_PRELOAD_STATE_KEY]?: GlobalPreloadState;
  };

  globalWindow[GLOBAL_PRELOAD_STATE_KEY] ??= {
    isComplete: false,
    promise: null,
  };

  return globalWindow[GLOBAL_PRELOAD_STATE_KEY];
}

export type GameScreen = "main" | "loading" | "setup" | "playing" | "gameOver";
export type GameRoundResult = "idle" | "success" | "failure";
export type PreloadStatus = Readonly<{
  errorMessage: string | null;
  phase: "complete" | "failed" | "loading";
  progress: number;
}>;

const INITIAL_PRELOAD_STATUS = {
  errorMessage: null,
  phase: "loading",
  progress: 0,
} satisfies PreloadStatus;

const COMPLETE_PRELOAD_STATUS = {
  errorMessage: null,
  phase: "complete",
  progress: 100,
} satisfies PreloadStatus;

type PreloadProgressHandler = (status: PreloadStatus) => void;

function isImageAsset(assetPath: string) {
  return /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(assetPath);
}

function preloadImageAsset(assetPath: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve();
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function runPreloadTasks(onProgress: PreloadProgressHandler | undefined) {
  const totalTaskCount = GENERAL_PRELOAD_ASSETS.length + 1;
  let completedTaskCount = 0;
  let hasFailed = false;
  let lastReportedProgress = 0;
  const reportTaskComplete = () => {
    if (hasFailed) {
      return;
    }

    completedTaskCount += 1;

    const rawProgress = (completedTaskCount / totalTaskCount) * 100;
    const progress = Math.min(
      Math.floor(rawProgress / PRELOAD_PROGRESS_STEP) * PRELOAD_PROGRESS_STEP,
      95,
    );

    if (progress <= lastReportedProgress) {
      return;
    }

    lastReportedProgress = progress;
    onProgress?.({
      errorMessage: null,
      phase: "loading",
      progress,
    });
  };
  const workerCount = Math.min(
    PRELOAD_CONCURRENCY,
    GENERAL_PRELOAD_ASSETS.length,
  );
  const assetWorkers = Array.from({ length: workerCount }, (_, workerIndex) => {
    const loadWorkerAssets = async (assetIndex: number): Promise<void> => {
      const assetPath = GENERAL_PRELOAD_ASSETS[assetIndex];

      if (!assetPath) {
        return;
      }

      await preloadAsset(assetPath);
      reportTaskComplete();
      await loadWorkerAssets(assetIndex + workerCount);
    };

    return loadWorkerAssets(workerIndex);
  });
  const audioPreload = bgmLibrary.preloadAll().then(() => {
    reportTaskComplete();
  });

  try {
    await Promise.all([...assetWorkers, audioPreload]);
  } catch (error) {
    hasFailed = true;
    onProgress?.({
      errorMessage: getErrorMessage(error),
      phase: "failed",
      progress: lastReportedProgress,
    });
    throw error;
  }

  onProgress?.(COMPLETE_PRELOAD_STATUS);
}

function preloadAllGameAssets(onProgress?: PreloadProgressHandler) {
  const preloadState = getGlobalPreloadState();
  preloadState.promise ??= runPreloadTasks(onProgress).then(() => {
    preloadState.isComplete = true;
  });

  return preloadState.promise;
}

function resetPreloadCache() {
  const preloadState = getGlobalPreloadState();
  preloadState.promise = null;
  preloadState.isComplete = false;
}

function areAllGameAssetsPreloaded() {
  return getGlobalPreloadState().isComplete;
}

export function useGameScreenFlow(maxLives: number) {
  const [preloadStatus, setPreloadStatus] = useState<PreloadStatus>(
    areAllGameAssetsPreloaded()
      ? COMPLETE_PRELOAD_STATUS
      : INITIAL_PRELOAD_STATUS,
  );
  const [preloadAttempt, setPreloadAttempt] = useState(0);
  const [screen, setScreen] = useState<GameScreen>(
    areAllGameAssetsPreloaded() ? "main" : "loading",
  );
  const [lives, setLives] = useState(maxLives);
  const [roundResult, setRoundResult] = useState<GameRoundResult>("idle");
  const [finalReachedRound, setFinalReachedRound] = useState(0);
  const { highestReachedRound, recordHighestReachedRound } =
    useHighestReachedRound();

  useEffect(() => {
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
    resetPreloadCache();
    setPreloadStatus(INITIAL_PRELOAD_STATUS);
    setPreloadAttempt((currentAttempt) => currentAttempt + 1);
    setScreen("loading");
  }, []);

  const startGame = useCallback(() => {
    setFinalReachedRound(0);
    setLives(maxLives);
    setRoundResult("idle");
    setScreen("setup");
  }, [maxLives]);

  const completeSetup = useCallback(() => {
    setScreen("playing");
  }, []);

  const finishGame = useCallback(
    (reachedRound: number) => {
      setFinalReachedRound(reachedRound);
      recordHighestReachedRound(reachedRound);
      setLives(0);
      setScreen("gameOver");
    },
    [recordHighestReachedRound],
  );

  const restartGame = useCallback(() => {
    setFinalReachedRound(0);
    setLives(maxLives);
    setRoundResult("idle");
    setScreen("setup");
  }, [maxLives]);

  const returnToMain = useCallback(() => {
    setFinalReachedRound(0);
    setLives(maxLives);
    setRoundResult("idle");
    setScreen("main");
  }, [maxLives]);

  const recordReachedRound = useCallback(
    (roundNumber: number) => {
      recordHighestReachedRound(roundNumber);
      setFinalReachedRound((currentFinalReachedRound) =>
        Math.max(currentFinalReachedRound, roundNumber),
      );
    },
    [recordHighestReachedRound],
  );

  const recordSuccess = useCallback(() => {
    setRoundResult("success");
  }, []);

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

      return Math.min(currentLives + 1, maxLives);
    });
  }, [maxLives]);

  return {
    completeSetup,
    finalReachedRound,
    finishGame,
    gainLife,
    highestReachedRound,
    lives,
    loseLife,
    maxLives,
    preloadStatus,
    recordReachedRound,
    recordSuccess,
    resetRoundResult,
    restartGame,
    retryPreload,
    returnToMain,
    roundResult,
    screen,
    startGame,
  };
}
