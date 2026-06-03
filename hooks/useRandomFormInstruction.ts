"use client";

import { useMemo, useState } from "react";
import { FORM_INSTRUCTIONS } from "@/games/formInstructions";

function getSeededFormIndex(roundNumber: number, sessionSeed: number) {
  const seed = Math.sin((roundNumber + 1) * 9301 + sessionSeed * 49297);
  const normalizedSeed = seed - Math.floor(seed);

  return Math.floor(normalizedSeed * FORM_INSTRUCTIONS.length);
}

export function useRandomFormInstruction(roundNumber: number) {
  const [sessionSeed] = useState(() => Math.random());

  return useMemo(() => {
    const formIndex = getSeededFormIndex(roundNumber, sessionSeed);

    return FORM_INSTRUCTIONS[formIndex];
  }, [roundNumber, sessionSeed]);
}
