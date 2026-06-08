"use client";

import { useGameScreenFlow } from "@/hooks/useGameScreenFlow";
import { useSeenMicrogames } from "@/hooks/useSeenMicrogames";
import { GameScreen } from "./GameScreen";
import {
  type HomeView,
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
    activeChallengeModeIds,
    completeSetup,
    finalClearedRound,
    finishGame,
    gainLife,
    highestClearedRound,
    isChallengeModeUnlocked,
    lives,
    loseLife,
    maxLives,
    preloadStatus,
    recordSuccess,
    resetRoundResult,
    returnToMain,
    retryPreload,
    screen,
    selectedChallengeModeIds,
    startGame,
    toggleChallengeMode,
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
        challengeModeIds={activeChallengeModeIds}
        lives={lives}
        maxLives={maxLives}
        onFinish={finishGame}
        onGainLife={gainLife}
        onLoseLife={loseLife}
        onResetResult={resetRoundResult}
        onSeenMicrogame={recordSeenMicrogameId}
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
    <MainScreen
      challengeModeIds={selectedChallengeModeIds}
      highestClearedRound={highestClearedRound}
      homeView={homeView}
      isChallengeModeUnlocked={isChallengeModeUnlocked}
      onStart={startGame}
      onToggleChallengeMode={toggleChallengeMode}
      seenMicrogameIds={seenMicrogameIds}
    />
  );
}
