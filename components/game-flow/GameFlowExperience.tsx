"use client";

import { useGameScreenFlow } from "@/hooks/useGameScreenFlow";
import { GameScreen } from "./GameScreen";
import {
  GameOverScreen,
  LoadingScreen,
  MainScreen,
  SetupScreen,
} from "./flowScreens";

export function GameFlowExperience() {
  const {
    completeSetup,
    finalClearedRound,
    finishGame,
    gainLife,
    highestClearedRound,
    lives,
    loseLife,
    maxLives,
    preloadStatus,
    recordSuccess,
    resetRoundResult,
    returnToMain,
    retryPreload,
    screen,
    startGame,
  } = useGameScreenFlow();

  if (screen === "loading") {
    return (
      <LoadingScreen onRetry={retryPreload} preloadStatus={preloadStatus} />
    );
  }

  if (screen === "setup") {
    return (
      <SetupScreen
        lives={lives}
        maxLives={maxLives}
        onComplete={completeSetup}
      />
    );
  }

  if (screen === "playing") {
    return (
      <GameScreen
        lives={lives}
        maxLives={maxLives}
        onFinish={finishGame}
        onGainLife={gainLife}
        onLoseLife={loseLife}
        onResetResult={resetRoundResult}
        onSuccess={recordSuccess}
      />
    );
  }

  if (screen === "gameOver") {
    return (
      <GameOverScreen
        finalClearedRound={finalClearedRound}
        highestClearedRound={highestClearedRound}
        onReturnToMain={returnToMain}
      />
    );
  }

  return (
    <MainScreen highestClearedRound={highestClearedRound} onStart={startGame} />
  );
}
