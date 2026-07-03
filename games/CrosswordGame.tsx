"use client";

import type { Microgame } from "@/data/microgames";
import { useCrosswordGame } from "@/games/useCrosswordGame";

const CLUE_CHIP_STYLES = {
  horizontal:
    "border-amber-100/28 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.12)]",
  vertical:
    "border-cyan-100/28 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)]",
} as const;

function ClueChip({
  tone,
  value,
}: Readonly<{
  tone: keyof typeof CLUE_CHIP_STYLES;
  value: string;
}>) {
  return (
    <div
      aria-label={value}
      className={`grid grid-cols-4 rounded-md border bg-black/36 px-4 py-3 text-[clamp(1.25rem,3.2vw,2.75rem)] font-black tracking-normal ${CLUE_CHIP_STYLES[tone]}`}
    >
      {Array.from(value).map((character, index) => (
        <span
          aria-hidden="true"
          className="grid min-w-0 place-items-center leading-none"
          key={`${character}-${index}`}
        >
          {character}
        </span>
      ))}
    </div>
  );
}

export function CrosswordGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const {
    grid,
    horizontalClue,
    inputHandlers,
    inputRef,
    isMistake,
    isSolved,
    verticalClue,
  } = useCrosswordGame();

  return (
    <div className="relative grid h-screen w-screen place-items-center overflow-hidden bg-[#101a24] px-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(252,211,77,0.16),rgba(20,184,166,0.12)_34%,rgba(15,23,42,0.88)_72%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:36px_36px]" />

      <section className="relative flex w-full max-w-5xl flex-col items-center gap-7">
        <div className="grid w-full max-w-3xl grid-cols-1 gap-3 text-center sm:grid-cols-2">
          <ClueChip tone="horizontal" value={horizontalClue} />
          <ClueChip tone="vertical" value={verticalClue} />
        </div>

        <div className="grid aspect-square w-[min(78vw,58vh,31rem)] grid-cols-4 grid-rows-4 gap-1.5 rounded-lg border border-white/18 bg-black/45 p-2 shadow-[0_0_36px_rgba(34,211,238,0.18)]">
          {grid.flatMap((row, rowIndex) =>
            row.map((cell, columnIndex) => (
              <div
                className={`relative grid place-items-center rounded-md border text-[clamp(2rem,7vw,4.75rem)] font-black leading-none ${
                  cell.isFilled
                    ? cell.isAnswer
                      ? `border-amber-100 bg-amber-200 text-slate-950 shadow-[0_0_22px_rgba(251,191,36,0.45)] ${
                          isSolved
                            ? "animate-[crossword-correct-pop_460ms_cubic-bezier(0.16,0.9,0.22,1.18)_both] shadow-[0_0_36px_rgba(52,211,153,0.72)]"
                            : isMistake
                              ? "animate-pulse"
                              : ""
                        }`
                      : "border-cyan-100/34 bg-slate-50 text-slate-950"
                    : "border-white/8 bg-slate-950/70"
                }`}
                key={`${rowIndex}-${columnIndex}`}
              >
                {cell.isFilled && !cell.isAnswer ? cell.character : null}
                {cell.isAnswer ? (
                  <input
                    ref={inputRef}
                    aria-label="십자말풀이 빈칸"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoFocus
                    className="absolute inset-0 size-full rounded-md border-0 bg-transparent text-center font-black text-slate-950 caret-slate-950 outline-none placeholder:text-slate-950/35"
                    inputMode="text"
                    lang="ko"
                    placeholder="?"
                    spellCheck={false}
                    type="text"
                    {...inputHandlers}
                  />
                ) : null}
                {cell.isAnswer && isSolved ? (
                  <span className="pointer-events-none absolute -right-3 -top-3 grid size-10 place-items-center rounded-full bg-emerald-400 text-xl font-black text-emerald-950 shadow-[0_0_24px_rgba(52,211,153,0.72)]">
                    ✓
                  </span>
                ) : null}
              </div>
            )),
          )}
        </div>
      </section>
      {isSolved ? (
        <div className="pointer-events-none absolute bottom-[8%] left-1/2 z-20 -translate-x-1/2 animate-[crossword-correct-text_500ms_ease-out_both] rounded-md border border-emerald-100/70 bg-emerald-500/78 px-8 py-4 text-[clamp(1.8rem,4vw,4rem)] font-black text-white shadow-[0_0_34px_rgba(52,211,153,0.58)]">
          정답!
        </div>
      ) : null}
      <style jsx>{`
        @keyframes crossword-correct-pop {
          0% {
            transform: scale(1);
          }
          55% {
            transform: scale(1.13);
          }
          100% {
            transform: scale(1.05);
          }
        }

        @keyframes crossword-correct-text {
          0% {
            opacity: 0;
            transform: translate(-50%, 14px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
