"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import { useHancomTypingGame } from "@/games/useHancomTypingGame";

export function HancomTypingGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const { completedCount, fallingWords, inputHandlers, inputRef } =
    useHancomTypingGame();

  return (
    <div className="relative grid h-screen w-screen place-items-center overflow-hidden bg-black">
      <div className="relative aspect-video w-screen max-w-[calc(100vh*16/9)]">
        <Image
          alt=""
          className="object-contain"
          fill
          priority
          sizes="100vw"
          src="/games/hancom/images/background.webp"
          unoptimized
        />
        <div className="absolute left-[1.7%] top-[12.7%] h-[78.6%] w-[77.9%] overflow-hidden">
          {fallingWords.map((word) => (
            <div
              className={`absolute -translate-x-1/2 select-none font-black text-black [font-size:clamp(2.1rem,5.2vw,5.2rem)] ${
                word.isCompleted ? "opacity-0" : "opacity-100"
              }`}
              key={word.id}
              style={{
                left: `${word.leftPercent}%`,
                top: `${word.topPercent}%`,
              }}
            >
              {word.text}
            </div>
          ))}
        </div>
        <input
          key={completedCount}
          ref={inputRef}
          aria-label="한컴 단어 입력"
          autoCapitalize="off"
          autoComplete="off"
          autoFocus
          className="absolute left-[2.8%] top-[94.1%] h-[4.9%] w-[93.9%] border-0 bg-transparent px-[2.2%] text-center font-black text-white outline-none [font-size:clamp(1.25rem,2.8vw,2.75rem)] placeholder:text-transparent"
          inputMode="text"
          lang="ko"
          spellCheck={false}
          type="text"
          {...inputHandlers}
        />
      </div>
    </div>
  );
}
