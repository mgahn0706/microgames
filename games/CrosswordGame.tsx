"use client";

import type { Microgame } from "@/data/microgames";
import { useCrosswordGame } from "@/games/useCrosswordGame";

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
    verticalClue,
  } = useCrosswordGame();

  return (
    <div className="relative grid h-screen w-screen place-items-center overflow-hidden bg-[#101a24] px-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(252,211,77,0.16),rgba(20,184,166,0.12)_34%,rgba(15,23,42,0.88)_72%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:36px_36px]" />

      <section className="relative flex w-full max-w-5xl flex-col items-center gap-7">
        <div className="grid w-full max-w-3xl grid-cols-1 gap-3 text-center sm:grid-cols-2">
          <p className="rounded-md border border-amber-100/28 bg-black/36 px-4 py-3 text-[clamp(1.25rem,3.2vw,2.75rem)] font-black tracking-normal text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.12)]">
            가로 {horizontalClue}
          </p>
          <p className="rounded-md border border-cyan-100/28 bg-black/36 px-4 py-3 text-[clamp(1.25rem,3.2vw,2.75rem)] font-black tracking-normal text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)]">
            세로 {verticalClue}
          </p>
        </div>

        <div className="grid aspect-square w-[min(78vw,58vh,31rem)] grid-cols-4 grid-rows-4 gap-1.5 rounded-lg border border-white/18 bg-black/45 p-2 shadow-[0_0_36px_rgba(34,211,238,0.18)]">
          {grid.flatMap((row, rowIndex) =>
            row.map((cell, columnIndex) => (
              <div
                className={`relative grid place-items-center rounded-md border text-[clamp(2rem,7vw,4.75rem)] font-black leading-none ${
                  cell.isFilled
                    ? cell.isAnswer
                      ? `border-amber-100 bg-amber-200 text-slate-950 shadow-[0_0_22px_rgba(251,191,36,0.45)] ${
                          isMistake ? "animate-pulse" : ""
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
              </div>
            )),
          )}
        </div>
      </section>

    </div>
  );
}
