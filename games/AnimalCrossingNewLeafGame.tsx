"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import { useAnimalCrossingNewLeafGame } from "@/games/useAnimalCrossingNewLeafGame";

export function AnimalCrossingNewLeafGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const { inputHandlers, inputRef, targetSentence } =
    useAnimalCrossingNewLeafGame();

  return (
    <div className="relative grid h-screen w-screen place-items-center overflow-hidden bg-[#fff1a8]">
      <div className="relative aspect-video w-screen max-w-[calc(100vh*16/9)]">
        <Image
          alt=""
          className="object-contain"
          fill
          priority
          sizes="100vw"
          src="/games/animal-crossing-new-leaf/images/background.png"
          unoptimized
        />
        <div className="absolute left-[31.2%] top-[23.8%] h-[7.4%] w-[41.6%] overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center px-[2.4%] font-black text-[#0018b8]/50 [font-size:clamp(1.35rem,2.75vw,2.9rem)]"
          >
            {targetSentence}
          </div>
          <input
            ref={inputRef}
            aria-label="동물의 숲 사과문 입력"
            autoCapitalize="off"
            autoComplete="off"
            autoFocus
            className="absolute inset-0 h-full w-full border-0 bg-transparent px-[2.4%] font-black text-[#0018b8] caret-[#0018b8] outline-none [font-size:clamp(1.35rem,2.75vw,2.9rem)]"
            inputMode="text"
            lang="ko"
            spellCheck={false}
            type="text"
            {...inputHandlers}
          />
        </div>
      </div>
    </div>
  );
}
