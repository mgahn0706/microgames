"use client";

import { useCallback, useEffect, useState } from "react";
import { ALL_GAME_PRELOAD_ASSETS } from "@/data/preloadAssets";
import { useHighestReachedRound } from "@/hooks/useHighestReachedRound";
import { BGM_LIBRARY_PRELOAD_ASSET_PATHS, bgmLibrary } from "@/lib/bgmLibrary";

const MIN_LOADING_TIME_MS = 900;
const MAX_LIVES = 4;
const PRELOAD_CONCURRENCY = 6;

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
  total: GENERAL_PRELOAD_ASSETS.length + 2,
} satisfies PreloadStatus;

const COMPLETE_PRELOAD_STATUS = {
  ...INITIAL_PRELOAD_STATUS,
  currentAsset: "",
  loaded: INITIAL_PRELOAD_STATUS.total,
  phase: "complete",
} satisfies PreloadStatus;

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function runPreloadTasks(onProgress: PreloadProgressHandler | undefined) {
  let loaded = 0;
  let hasFailed = false;

  const reportStarted = (label: string) => {
    if (hasFailed) {
      return;
    }

    onProgress?.({
      currentAsset: label,
      errorMessage: null,
      failedAsset: null,
      loaded,
      phase: "loading",
      total: INITIAL_PRELOAD_STATUS.total,
    });
  };

  const runTrackedTask = async (
    label: string,
    load: () => Promise<unknown>,
  ) => {
    reportStarted(label);

    try {
      await load();
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      if (!hasFailed) {
        hasFailed = true;
        onProgress?.({
          currentAsset: "",
          errorMessage,
          failedAsset: label,
          loaded,
          phase: "failed",
          total: INITIAL_PRELOAD_STATUS.total,
        });
      }

      throw error;
    }

    loaded += 1;
    if (!hasFailed) {
      onProgress?.({
        currentAsset: label,
        errorMessage: null,
        failedAsset: null,
        loaded,
        phase: "loading",
        total: INITIAL_PRELOAD_STATUS.total,
      });
    }
  };

  const workerCount = Math.min(
    PRELOAD_CONCURRENCY,
    GENERAL_PRELOAD_ASSETS.length,
  );
  const assetWorkers = Array.from({ length: workerCount }, (_, workerIndex) => {
    const loadWorkerAssets = async (assetIndex: number): Promise<void> => {
      if (hasFailed) {
        return;
      }

      const assetPath = GENERAL_PRELOAD_ASSETS[assetIndex];

      if (!assetPath) {
        return;
      }

      await runTrackedTask(assetPath, () => preloadAsset(assetPath));
      await loadWorkerAssets(assetIndex + workerCount);
    };

    return loadWorkerAssets(workerIndex);
  });

  await Promise.all([
    ...assetWorkers,
    runTrackedTask("오디오 버퍼 준비", () => bgmLibrary.preloadAll()),
    runTrackedTask("로딩 화면 준비", waitForMinimumLoadingTime),
  ]);

  onProgress?.({
    currentAsset: "",
    errorMessage: null,
    failedAsset: null,
    loaded,
    phase: "complete",
    total: INITIAL_PRELOAD_STATUS.total,
  });
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

export function useGameScreenFlow() {
  const [preloadStatus, setPreloadStatus] = useState<PreloadStatus>(
    areAllGameAssetsPreloaded()
      ? COMPLETE_PRELOAD_STATUS
      : INITIAL_PRELOAD_STATUS,
  );
  const [preloadAttempt, setPreloadAttempt] = useState(0);
  const [screen, setScreen] = useState<GameScreen>(
    areAllGameAssetsPreloaded() ? "main" : "loading",
  );
  const [lives, setLives] = useState(MAX_LIVES);
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
    setLives(MAX_LIVES);
    setRoundResult("idle");
    setScreen("setup");
  }, []);

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
    setLives(MAX_LIVES);
    setRoundResult("idle");
    setScreen("setup");
  }, []);

  const returnToMain = useCallback(() => {
    setFinalReachedRound(0);
    setLives(MAX_LIVES);
    setRoundResult("idle");
    setScreen("main");
  }, []);

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

      return Math.min(currentLives + 1, MAX_LIVES);
    });
  }, []);

  return {
    completeSetup,
    finalReachedRound,
    finishGame,
    gainLife,
    highestReachedRound,
    lives,
    loseLife,
    maxLives: MAX_LIVES,
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
