"use client";

import Image from "next/image";
import type { Microgame } from "@/data/microgames";
import { useWiiSportsGame } from "@/games/useWiiSportsGame";

export function WiiSportsGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const { backgroundSrc } = useWiiSportsGame();

  return (
    <div className="relative grid h-screen w-screen place-items-center overflow-hidden bg-black">
      <div className="relative aspect-video w-screen max-w-[calc(100vh*16/9)]">
        <Image
          alt=""
          className="object-contain"
          fill
          priority
          sizes="100vw"
          src={backgroundSrc}
          unoptimized
        />
      </div>
    </div>
  );
}
