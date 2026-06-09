"use client";

import { useCallback, useEffect, useState } from "react";
import { MAX_USERNAME_LENGTH, RANKING_GAME_ID } from "@/lib/rankings";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePlayerIdentity } from "./usePlayerIdentity";

export type ScoreSubmissionStatus =
  | "idle"
  | "needsUsername"
  | "skipped"
  | "submitting"
  | "submitted"
  | "error";

export function useScoreSubmission(score: number) {
  const {
    isReady,
    playerId,
    recordSubmittedBest,
    recordSubmittedUsername,
    saveUsername,
    submittedBest,
    submittedUsername,
    username: storedUsername,
  } = usePlayerIdentity();
  const [username, setUsername] = useState(storedUsername);
  const [status, setStatus] = useState<ScoreSubmissionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submitScore = useCallback(
    async (requestedUsername: string) => {
      const normalizedUsername = requestedUsername.trim();

      if (
        !normalizedUsername ||
        normalizedUsername.length > MAX_USERNAME_LENGTH
      ) {
        setStatus("needsUsername");
        setErrorMessage(`닉네임을 1~${MAX_USERNAME_LENGTH}자로 입력해 주세요.`);
        return false;
      }

      saveUsername(normalizedUsername);

      const isNewBestScore = score > submittedBest;
      const isUsernameChanged = normalizedUsername !== submittedUsername;

      if (!playerId || (!isNewBestScore && !isUsernameChanged)) {
        setStatus("skipped");
        setErrorMessage(null);
        return true;
      }

      setStatus("submitting");
      setErrorMessage(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.rpc("submit_score", {
          p_game_id: RANKING_GAME_ID,
          p_player_id: playerId,
          p_score: score,
          p_username: normalizedUsername,
        });

        if (error) {
          throw error;
        }

        recordSubmittedBest(score);
        recordSubmittedUsername(normalizedUsername);
        setUsername(normalizedUsername);
        setStatus("submitted");

        try {
          await fetch("/api/rankings/revalidate", { method: "POST" });
        } catch (error) {
          console.error("Failed to revalidate rankings.", error);
        }

        return true;
      } catch (error) {
        console.error(error);
        setStatus("error");
        setErrorMessage("기록을 전송하지 못했습니다. 다시 시도해 주세요.");
        return false;
      }
    },
    [
      playerId,
      recordSubmittedBest,
      recordSubmittedUsername,
      saveUsername,
      score,
      submittedBest,
      submittedUsername,
    ],
  );

  useEffect(() => {
    if (
      status !== "idle" ||
      !isReady ||
      !storedUsername ||
      (score <= submittedBest && storedUsername === submittedUsername)
    ) {
      return;
    }

    const submissionTimer = window.setTimeout(() => {
      void submitScore(storedUsername);
    }, 0);

    return () => {
      window.clearTimeout(submissionTimer);
    };
  }, [
    isReady,
    score,
    status,
    storedUsername,
    submitScore,
    submittedBest,
    submittedUsername,
  ]);

  const displayStatus =
    status !== "idle"
      ? status
      : !isReady
        ? "idle"
        : !storedUsername
          ? "needsUsername"
          : score <= submittedBest
            ? "skipped"
            : "idle";

  return {
    errorMessage,
    isReady,
    setUsername,
    status: displayStatus,
    submitScore,
    submittedBest,
    username,
  };
}
