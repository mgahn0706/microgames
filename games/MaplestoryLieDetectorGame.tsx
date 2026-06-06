"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import { useMaplestoryLieDetectorGame } from "@/games/useMaplestoryLieDetectorGame";

export function MaplestoryLieDetectorGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const { inputHandlers, inputRef, targetOption, typedValue } =
    useMaplestoryLieDetectorGame();
  void typedValue;

  return (
    <div className="relative grid h-screen w-screen place-items-center overflow-hidden bg-[#111827]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.18),rgba(15,23,42,0.64)_52%,rgba(0,0,0,0.95))]" />
      <div className="relative aspect-video w-screen max-w-[calc(100vh*16/9)]">
        <Image
          alt=""
          className="object-contain"
          fill
          priority
          sizes="100vw"
          src={targetOption.imageSrc}
          unoptimized
        />
        <input
          ref={inputRef}
          aria-label="거짓말탐지기 입력"
          autoCapitalize="off"
          autoComplete="off"
          autoFocus
          className="absolute left-[10.15%] top-[68.85%] h-[9.15%] w-[80%] border-0 bg-transparent px-[2.2%] text-center font-black text-[#1f2937] outline-none [font-size:clamp(1.6rem,4.2vw,4rem)]"
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
