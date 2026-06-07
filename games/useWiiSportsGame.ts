"use client";

import { useEffect, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const WII_SPORTS_BACKGROUNDS = {
  default: "/games/wii-sports/images/backgroud-default.png",
  onlyA: "/games/wii-sports/images/backgroud-only-A.png",
  onlyB: "/games/wii-sports/images/background-only-B.png",
  both: "/games/wii-sports/images/background-A-and-B.png",
} as const;

type WiiSportsButton = "a" | "b";

type WiiSportsHeldButtons = Readonly<{
  isHoldingA: boolean;
  isHoldingB: boolean;
}>;

const INITIAL_HELD_BUTTONS = {
  isHoldingA: false,
  isHoldingB: false,
} satisfies WiiSportsHeldButtons;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function getWiiSportsButton(event: KeyboardEvent): WiiSportsButton | null {
  if (event.code === "KeyA" || event.key === "ㅁ" || event.key === "a") {
    return "a";
  }

  if (event.code === "KeyB" || event.key === "ㅠ" || event.key === "b") {
    return "b";
  }

  return null;
}

function getBackgroundSrc({ isHoldingA, isHoldingB }: WiiSportsHeldButtons) {
  if (isHoldingA && isHoldingB) {
    return WII_SPORTS_BACKGROUNDS.both;
  }

  if (isHoldingA) {
    return WII_SPORTS_BACKGROUNDS.onlyA;
  }

  if (isHoldingB) {
    return WII_SPORTS_BACKGROUNDS.onlyB;
  }

  return WII_SPORTS_BACKGROUNDS.default;
}

export function useWiiSportsGame(): Readonly<{
  backgroundSrc: string;
}> {
  const hasClearedRef = useRef(false);
  const heldButtonsRef = useRef<WiiSportsHeldButtons>(INITIAL_HELD_BUTTONS);
  const [heldButtons, setHeldButtons] =
    useState<WiiSportsHeldButtons>(INITIAL_HELD_BUTTONS);

  useEffect(() => {
    const syncHeldButtons = (nextButtons: WiiSportsHeldButtons) => {
      const currentButtons = heldButtonsRef.current;

      if (
        nextButtons.isHoldingA === currentButtons.isHoldingA &&
        nextButtons.isHoldingB === currentButtons.isHoldingB
      ) {
        return;
      }

      heldButtonsRef.current = nextButtons;
      setHeldButtons(nextButtons);

      if (
        hasClearedRef.current ||
        !nextButtons.isHoldingA ||
        !nextButtons.isHoldingB
      ) {
        return;
      }

      hasClearedRef.current = true;
      dispatchClear();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const button = getWiiSportsButton(event);

      if (!button) {
        return;
      }

      event.preventDefault();

      const currentButtons = heldButtonsRef.current;

      syncHeldButtons({
        isHoldingA: currentButtons.isHoldingA || button === "a",
        isHoldingB: currentButtons.isHoldingB || button === "b",
      });
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const button = getWiiSportsButton(event);

      if (!button) {
        return;
      }

      event.preventDefault();

      const currentButtons = heldButtonsRef.current;

      syncHeldButtons({
        isHoldingA: button === "a" ? false : currentButtons.isHoldingA,
        isHoldingB: button === "b" ? false : currentButtons.isHoldingB,
      });
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, []);

  return {
    backgroundSrc: getBackgroundSrc(heldButtons),
  };
}
