"use client";

import { useGameScreenFlow } from "@/hooks/useGameScreenFlow";
import { useSeenMicrogames } from "@/hooks/useSeenMicrogames";
import { GameScreen } from "./GameScreen";
import type { HomeView } from "./HomeHeader";
import {
  GameOverScreen,
  LoadingScreen,
  MainScreen,
  SetupScreen,
} from "./flowScreens";

export function GameFlowExperience({
  homeView,
}: Readonly<{
  homeView: HomeView;
}>) {
  const { recordSeenMicrogameId, seenMicrogameIds } = useSeenMicrogames();
  const {
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
        onReachRound={recordReachedRound}
        onResetResult={resetRoundResult}
        onSeenMicrogame={recordSeenMicrogameId}
        onSuccess={recordSuccess}
      />
    );
  }

  if (screen === "gameOver") {
    return (
      <GameOverScreen
        finalReachedRound={finalReachedRound}
        highestReachedRound={highestReachedRound}
        onReturnToMain={returnToMain}
      />
    );
  }

  return (
    <MainScreen
      highestReachedRound={highestReachedRound}
      homeView={homeView}
      onStart={startGame}
      seenMicrogameIds={seenMicrogameIds}
    />
  );
}
