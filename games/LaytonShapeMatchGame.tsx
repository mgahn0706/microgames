"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import { useLaytonShapeMatchGame } from "@/games/useLaytonShapeMatchGame";

const ANSWER_HOTSPOTS = [
  { answer: 1, left: "19.5%" },
  { answer: 2, left: "37.6%" },
  { answer: 3, left: "55.8%" },
  { answer: 4, left: "74%" },
] as const;

export function LaytonShapeMatchGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const { chooseAnswer, hasFailed, lastWrongAnswer, puzzle } =
    useLaytonShapeMatchGame();

  return (
    <div className="relative grid h-screen w-screen place-items-center overflow-hidden bg-[#0f172a]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.18),rgba(15,23,42,0.66)_56%,rgba(0,0,0,0.96))]" />
      <div className="relative aspect-video w-screen max-w-[calc(100vh*16/9)]">
        <Image
          alt=""
          className="object-contain"
          fill
          priority
          sizes="100vw"
          src={puzzle.src}
          unoptimized
        />
        {ANSWER_HOTSPOTS.map(({ answer, left }) => {
          const isWrongAnswer = lastWrongAnswer === answer;
          const isCorrectAnswer = hasFailed && puzzle.answer === answer;

          return (
            <button
              aria-label={`${answer}번 선택`}
              className={`absolute top-[60%] h-[29%] w-[15%] -translate-x-1/2 cursor-pointer rounded-md outline-none transition ${
                isWrongAnswer
                  ? "animate-[layton-wrong-shake_180ms_ease-in-out_2] bg-red-500/34 shadow-[inset_0_0_0_4px_rgba(248,113,113,0.92),0_0_26px_rgba(248,113,113,0.72)]"
                  : isCorrectAnswer
                    ? "bg-emerald-400/24 shadow-[inset_0_0_0_4px_rgba(110,231,183,0.86),0_0_24px_rgba(52,211,153,0.55)]"
                    : "bg-transparent"
              }`}
              disabled={hasFailed}
              key={answer}
              onPointerDown={(event) => {
                event.preventDefault();
                chooseAnswer(answer);
              }}
              style={{ left }}
              type="button"
            />
          );
        })}
      </div>
      <style jsx>{`
        @keyframes layton-wrong-shake {
          0%,
          100% {
            transform: translateX(-50%);
          }
          25% {
            transform: translateX(calc(-50% - 0.42rem));
          }
          75% {
            transform: translateX(calc(-50% + 0.42rem));
          }
        }
      `}</style>
    </div>
  );
}
