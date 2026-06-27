"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import type { Microgame } from "@/data/microgames";
import {
  COOKIE_RUN_KINGDOM_SKILLS,
  useCookieRunKingdomGame,
} from "@/games/useCookieRunKingdomGame";

const BACKGROUND_SRC = "/games/cookie-run-kingdom/images/background.webp";

export function CookieRunKingdomGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const { activatedSkill, targetSkill, wrongKey } = useCookieRunKingdomGame();

  return (
    <div className="relative grid h-screen w-screen place-items-center overflow-hidden bg-[#17103a]">
      <div className="relative aspect-[3168/1794] w-screen max-w-[calc(100vh*3168/1794)] overflow-hidden">
        <Image
          alt=""
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src={BACKGROUND_SRC}
          unoptimized
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,6,38,0.08)_42%,rgba(9,4,30,0.78)_100%)]" />

        <div className="absolute left-1/2 top-[5%] z-20 flex -translate-x-1/2 items-center gap-[clamp(0.6rem,1.1vw,1rem)] rounded-full border-2 border-[#ffe79b] bg-[#2e174f]/92 py-[clamp(0.35rem,0.7vw,0.65rem)] pl-[clamp(0.45rem,0.8vw,0.7rem)] pr-[clamp(1rem,2vw,1.8rem)] shadow-[0_0_26px_rgba(255,220,112,0.48),0_8px_22px_rgba(16,6,40,0.72)]">
          <div className="relative size-[clamp(3.2rem,5.6vw,5.8rem)] shrink-0 overflow-hidden rounded-full border-2 border-white/85 bg-[#1b123a]">
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="96px"
              src={targetSkill.profileSrc}
              unoptimized
            />
          </div>
          <div className="min-w-0 text-left text-white">
            <p className="text-[clamp(0.65rem,1vw,0.95rem)] font-black tracking-[0.18em] text-[#ffe79b]">
              SKILL TARGET
            </p>
            <p className="whitespace-nowrap text-[clamp(1.1rem,2.1vw,2rem)] font-black leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              {targetSkill.nameKo}
            </p>
          </div>
        </div>

        <div className="absolute bottom-[3.5%] left-1/2 z-20 flex w-[min(91%,68rem)] -translate-x-1/2 items-end justify-center gap-[clamp(0.45rem,1.2vw,1.2rem)]">
          {COOKIE_RUN_KINGDOM_SKILLS.map((skill) => {
            const isTarget = skill.id === targetSkill.id;
            const isActivated = skill.id === activatedSkill?.id;
            const isWrong = wrongKey === skill.key;

            return (
              <div
                aria-label={`${skill.key}번 ${skill.nameKo} 스킬`}
                className={[
                  "cookie-kingdom-skill-slot relative aspect-square w-[clamp(4.4rem,9vw,8.5rem)] rounded-[22%] border-[clamp(2px,0.35vw,5px)] bg-[#231347]/94 shadow-[0_8px_20px_rgba(8,2,28,0.75)]",
                  isTarget
                    ? "border-[#ffe58a] shadow-[0_0_24px_rgba(255,218,92,0.72),0_8px_20px_rgba(8,2,28,0.75)]"
                    : "border-[#9e89d3]",
                  isActivated ? "cookie-kingdom-skill-slot-active" : "",
                  isWrong ? "cookie-kingdom-skill-slot-wrong" : "",
                ].join(" ")}
                key={skill.id}
              >
                <div className="absolute inset-0 overflow-hidden rounded-[18%] bg-[#100828]">
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="144px"
                    src={skill.profileSrc}
                    unoptimized
                  />
                </div>
                <span className="absolute -left-[8%] -top-[12%] grid size-[clamp(1.7rem,3vw,2.8rem)] place-items-center rounded-full border-2 border-white bg-[#ffdc55] text-[clamp(0.95rem,1.7vw,1.55rem)] font-black text-[#341b58] shadow-[0_3px_0_#8d551b,0_0_12px_rgba(255,233,145,0.8)]">
                  {skill.key}
                </span>
                {isTarget ? (
                  <span className="cookie-kingdom-target-arrow pointer-events-none absolute -top-[35%] left-1/2 -translate-x-1/2 text-[clamp(1.7rem,3.5vw,3.2rem)] font-black text-[#fff1a8] drop-shadow-[0_3px_2px_#632b73]">
                    ▼
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {activatedSkill ? (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            <div className="cookie-kingdom-screen-impact absolute inset-0" />
            <div className="cookie-kingdom-skill-flash absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(255,252,211,1),rgba(255,205,91,0.78)_12%,rgba(164,69,255,0.56)_31%,rgba(15,5,49,0)_66%)]" />
            <div className="cookie-kingdom-burst-rays absolute -right-[18%] -top-[34%] aspect-square w-[94%]" />
            <div className="cookie-kingdom-aura-ring cookie-kingdom-aura-ring-one absolute right-[13%] top-[8%] aspect-square w-[43%] rounded-full border-[clamp(4px,0.6vw,9px)] border-[#fff2a7]/85" />
            <div className="cookie-kingdom-aura-ring cookie-kingdom-aura-ring-two absolute right-[8%] top-[2%] aspect-square w-[53%] rounded-full border-[clamp(2px,0.35vw,6px)] border-[#d98cff]/75" />
            <div className="cookie-kingdom-speed-lines absolute -right-[9%] -top-[1%] h-[72%] w-[82%] rotate-[-7deg] opacity-90" />
            <div className="cookie-kingdom-particle cookie-kingdom-particle-one absolute right-[48%] top-[13%]" />
            <div className="cookie-kingdom-particle cookie-kingdom-particle-two absolute right-[10%] top-[15%]" />
            <div className="cookie-kingdom-particle cookie-kingdom-particle-three absolute right-[41%] top-[50%]" />
            <div className="cookie-kingdom-particle cookie-kingdom-particle-four absolute right-[4%] top-[48%]" />
            <div
              className="cookie-kingdom-comic-panel absolute right-[2%] top-[5%] h-[62%] w-[62%] overflow-hidden border-[clamp(4px,0.65vw,10px)] border-[#fff3b0] bg-[radial-gradient(circle_at_68%_40%,#ffd96f_0%,#c84fc2_32%,#511979_72%,#230838_100%)] shadow-[0_0_0_clamp(3px,0.4vw,7px)_#4a1c66,0_0_48px_rgba(255,228,129,0.95)]"
              style={
                {
                  clipPath:
                    "polygon(7% 3%, 100% 0, 94% 89%, 65% 82%, 52% 100%, 0 88%)",
                } satisfies CSSProperties
              }
            >
              <div className="absolute inset-0 bg-[repeating-linear-gradient(125deg,rgba(255,255,255,0.18)_0_3px,transparent_3px_18px)]" />
              <div className="cookie-kingdom-panel-burst absolute inset-[-35%]" />
              <Image
                alt={`${activatedSkill.nameKo} 스킬 발동`}
                className="cookie-kingdom-skill-portrait object-contain object-center drop-shadow-[-16px_16px_10px_rgba(29,4,54,0.55)]"
                fill
                sizes="62vw"
                src={activatedSkill.portraitSrc}
                unoptimized
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
