"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useState } from "react";
import type { SynchronizedRhythmStyle } from "@/hooks/useSynchronizedRhythm";
import { LIFE_LABELS } from "./gameFlowConstants";

export function FixedLivesOverlay({
  animateSetup = false,
  getStaggeredRhythmStyle,
  lives,
  maxLives,
}: Readonly<{
  animateSetup?: boolean;
  getStaggeredRhythmStyle: (index: number) => SynchronizedRhythmStyle;
  lives: number;
  maxLives: number;
}>) {
  const [lifeAnimationState, setLifeAnimationState] = useState({
    lives,
    lostLifeIndexes: [] as readonly number[],
  });

  if (lifeAnimationState.lives !== lives) {
    const lostLifeIndexes =
      !animateSetup && lives < lifeAnimationState.lives
        ? Array.from(
            { length: lifeAnimationState.lives - lives },
            (_, offset) => lives + offset,
          )
        : [];

    setLifeAnimationState({ lives, lostLifeIndexes });
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center pb-8 sm:pb-12"
      aria-label={`${lives} of ${maxLives} lives remaining`}
    >
      <div
        className={`${animateSetup ? "setup-screen" : ""} relative h-28 w-[min(92vw,720px)] sm:h-32`}
      >
        {LIFE_LABELS.map((label, index) => {
          const isActive = index < lives;
          const shouldAnimateLostLife =
            lifeAnimationState.lostLifeIndexes.includes(index);
          const lifeSlotStyle = {
            "--setup-life-delay": animateSetup ? `${index * 140}ms` : "0ms",
            left: `${12.5 + index * 25}%`,
          } satisfies CSSProperties & {
            "--setup-life-delay": string;
          };

          return (
            <div
              className="setup-life-slot absolute top-0 h-20 w-24 sm:h-24 sm:w-36 lg:h-28 lg:w-44"
              key={label}
              style={lifeSlotStyle}
            >
              <div
                className="life-fish-motion relative size-full"
                style={getStaggeredRhythmStyle(index)}
              >
                <Image
                  src="/images/life-deactive.png"
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 176px, (min-width: 640px) 144px, 96px"
                  className={`object-contain transition-opacity duration-300 ${
                    isActive ? "opacity-0" : "opacity-100"
                  } ${shouldAnimateLostLife ? "life-bone-enter" : ""}`}
                />
                <Image
                  src="/images/life-active.png"
                  alt={isActive ? `${label} active` : ""}
                  fill
                  sizes="(min-width: 1024px) 176px, (min-width: 640px) 144px, 96px"
                  className={`object-contain transition-opacity duration-300 ${
                    isActive
                      ? "opacity-100 drop-shadow-[0_0_18px_#67e8f9]"
                      : "opacity-0"
                  } ${shouldAnimateLostLife ? "life-active-exit" : ""}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
