"use client";

import type { Microgame } from "@/data/microgames";
import {
  KEYBOARD_ROWS,
  WORD_LENGTH,
  WORDLE_MAX_GUESSES,
  type LetterEvaluation,
  useWordleBossGame,
} from "@/games/useWordleBossGame";

const TILE_CLASS_BY_EVALUATION = {
  absent: "border-[#787c7e] bg-[#787c7e] text-white",
  correct: "border-[#6aaa64] bg-[#6aaa64] text-white",
  empty: "border-[#d3d6da] bg-white text-[#1a1a1b]",
  present: "border-[#c9b458] bg-[#c9b458] text-white",
} satisfies Record<LetterEvaluation | "empty", string>;

const KEY_CLASS_BY_EVALUATION = {
  absent: "bg-[#787c7e] text-white",
  correct: "bg-[#6aaa64] text-white",
  empty: "bg-[#d3d6da] text-[#1a1a1b]",
  present: "bg-[#c9b458] text-white",
} satisfies Record<LetterEvaluation | "empty", string>;

export function WordleBossGame({
  microgame,
}: Readonly<{ microgame: Microgame }>) {
  void microgame;

  const {
    currentGuess,
    guesses,
    keyEvaluations,
    message,
    submitGuess,
    typeBackspace,
    typeLetter,
  } = useWordleBossGame();

  const boardRows = Array.from({ length: WORDLE_MAX_GUESSES }, (_, rowIndex) => {
    const submittedGuess = guesses[rowIndex];
    const letters = submittedGuess
      ? submittedGuess.letters
      : rowIndex === guesses.length
        ? currentGuess.padEnd(WORD_LENGTH, " ").split("")
        : Array.from({ length: WORD_LENGTH }, () => " ");

    return {
      evaluations: submittedGuess?.evaluations,
      letters,
    };
  });

  return (
    <div className="grid h-screen w-screen place-items-center overflow-hidden bg-white px-3 text-[#1a1a1b]">
      <div className="flex h-full w-full max-w-[500px] flex-col">
        <header className="relative flex h-[52px] shrink-0 items-center justify-center border-b border-[#d3d6da]">
          <h1 className="font-serif text-[28px] font-black tracking-[0.01em]">
            Wordle
          </h1>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#878a8c]">
            Boss
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-3">
          <div className="pointer-events-none h-8">
            {message ? (
              <div className="rounded px-3 py-1.5 text-sm font-bold text-white shadow-sm [background:#1a1a1b]">
                {message}
              </div>
            ) : null}
          </div>

          <div className="grid grid-rows-6 gap-[5px]">
            {boardRows.map((row, rowIndex) => (
              <div className="grid grid-cols-5 gap-[5px]" key={rowIndex}>
                {row.letters.map((letter, columnIndex) => {
                  const evaluation = row.evaluations?.[columnIndex] ?? "empty";
                  const hasLetter = letter.trim().length > 0;

                  return (
                    <div
                      className={[
                        "grid size-[clamp(42px,9.5vh,62px)] place-items-center border-2 text-[clamp(1.75rem,5.4vh,2.35rem)] font-bold uppercase leading-none transition-colors",
                        row.evaluations
                          ? TILE_CLASS_BY_EVALUATION[evaluation]
                          : hasLetter
                            ? "border-[#878a8c] bg-white text-[#1a1a1b]"
                            : TILE_CLASS_BY_EVALUATION.empty,
                      ].join(" ")}
                      key={`${rowIndex}-${columnIndex}`}
                    >
                      {letter.trim()}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </main>

        <div className="flex shrink-0 flex-col gap-1.5 pb-2">
          {KEYBOARD_ROWS.map((row) => (
            <div className="flex justify-center gap-1.5" key={row.join("")}>
              {row.map((key) => {
                const isWideKey = key === "ENTER" || key === "BACKSPACE";
                const evaluation =
                  key.length === 1 ? (keyEvaluations[key] ?? "empty") : "empty";

                return (
                  <button
                    className={[
                      "h-[58px] rounded-[4px] text-[13px] font-bold uppercase transition-colors active:brightness-95",
                      isWideKey ? "min-w-[64px] px-2" : "min-w-0 flex-1 px-0",
                      KEY_CLASS_BY_EVALUATION[evaluation],
                    ].join(" ")}
                    key={key}
                    onClick={() => {
                      if (key === "ENTER") {
                        submitGuess();
                        return;
                      }

                      if (key === "BACKSPACE") {
                        typeBackspace();
                        return;
                      }

                      typeLetter(key);
                    }}
                    type="button"
                  >
                    {key === "BACKSPACE" ? "⌫" : key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
