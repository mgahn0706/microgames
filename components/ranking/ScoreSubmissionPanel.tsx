"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { useScoreSubmission } from "@/hooks/useScoreSubmission";
import { MAX_USERNAME_LENGTH } from "@/lib/rankings";

function getStatusMessage(
  status: ReturnType<typeof useScoreSubmission>["status"],
) {
  if (status === "submitting") {
    return "최고 기록을 전송하는 중입니다.";
  }

  if (status === "submitted") {
    return "최고 기록과 닉네임이 랭킹에 등록되었습니다.";
  }

  if (status === "skipped") {
    return "현재 최고 기록과 닉네임이 이미 등록되어 있습니다.";
  }

  return "닉네임 입력 후 최고 기록이 자동으로 랭킹에 등록됩니다.";
}

export function ScoreSubmissionPanel({
  score,
}: Readonly<{
  score: number;
}>) {
  const router = useRouter();
  const { errorMessage, isReady, setUsername, status, submitScore, username } =
    useScoreSubmission(score);
  const isSubmitting = status === "submitting";

  const submitUsername = () => {
    void submitScore(username);
  };

  const finishUsernameInput = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  const showTopRankings = async () => {
    const isSubmitted = await submitScore(username);

    if (isSubmitted) {
      router.push("/ranking");
      router.refresh();
    }
  };

  return (
    <div className="mx-auto mb-6 max-w-xl rounded-md border border-cyan-100/35 bg-black/45 p-4 text-left">
      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
          랭킹 닉네임
        </span>
        <input
          className="mt-2 min-h-11 w-full rounded-md border border-white/30 bg-black/65 px-3 font-bold text-white outline-none transition placeholder:text-white/35 focus:border-cyan-100"
          disabled={!isReady || isSubmitting}
          maxLength={MAX_USERNAME_LENGTH}
          onBlur={submitUsername}
          onChange={(event) => setUsername(event.target.value)}
          onKeyDown={finishUsernameInput}
          placeholder="닉네임 입력 또는 변경 후 Enter"
          type="text"
          value={username}
        />
      </label>
      <div className="mt-3 flex flex-col gap-2 text-sm font-bold sm:flex-row sm:items-center sm:justify-between">
        <p className={errorMessage ? "text-red-100" : "text-cyan-50/68"}>
          {errorMessage ?? getStatusMessage(status)}
        </p>
        <button
          className="shrink-0 font-black text-cyan-100 underline decoration-cyan-100/45 underline-offset-4 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting}
          onClick={() => void showTopRankings()}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          Top 10 보기
        </button>
      </div>
    </div>
  );
}
