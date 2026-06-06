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

  const { chooseAnswer, hasFailed, puzzle } = useLaytonShapeMatchGame();

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
        {ANSWER_HOTSPOTS.map(({ answer, left }) => (
          <button
            aria-label={`${answer}번 선택`}
            className="absolute top-[60%] h-[29%] w-[15%] -translate-x-1/2 cursor-pointer rounded-md bg-transparent outline-none"
            disabled={hasFailed}
            key={answer}
            onPointerDown={(event) => {
              event.preventDefault();
              chooseAnswer(answer);
            }}
            style={{ left }}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
