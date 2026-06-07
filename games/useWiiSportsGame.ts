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

type WiiSportsPressedButtons = Readonly<{
  hasPressedA: boolean;
  hasPressedB: boolean;
}>;

const INITIAL_PRESSED_BUTTONS = {
  hasPressedA: false,
  hasPressedB: false,
} satisfies WiiSportsPressedButtons;

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

function getBackgroundSrc({
  hasPressedA,
  hasPressedB,
}: WiiSportsPressedButtons) {
  if (hasPressedA && hasPressedB) {
    return WII_SPORTS_BACKGROUNDS.both;
  }

  if (hasPressedA) {
    return WII_SPORTS_BACKGROUNDS.onlyA;
  }

  if (hasPressedB) {
    return WII_SPORTS_BACKGROUNDS.onlyB;
  }

  return WII_SPORTS_BACKGROUNDS.default;
}

export function useWiiSportsGame(): Readonly<{
  backgroundSrc: string;
}> {
  const hasClearedRef = useRef(false);
  const pressedButtonsRef = useRef<WiiSportsPressedButtons>(
    INITIAL_PRESSED_BUTTONS,
  );
  const [pressedButtons, setPressedButtons] = useState<WiiSportsPressedButtons>(
    INITIAL_PRESSED_BUTTONS,
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const button = getWiiSportsButton(event);

      if (!button) {
        return;
      }

      event.preventDefault();

      const currentButtons = pressedButtonsRef.current;
      const nextButtons = {
        hasPressedA: currentButtons.hasPressedA || button === "a",
        hasPressedB: currentButtons.hasPressedB || button === "b",
      };

      if (
        nextButtons.hasPressedA === currentButtons.hasPressedA &&
        nextButtons.hasPressedB === currentButtons.hasPressedB
      ) {
        return;
      }

      pressedButtonsRef.current = nextButtons;
      setPressedButtons(nextButtons);

      if (
        hasClearedRef.current ||
        !nextButtons.hasPressedA ||
        !nextButtons.hasPressedB
      ) {
        return;
      }

      hasClearedRef.current = true;
      dispatchClear();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  return {
    backgroundSrc: getBackgroundSrc(pressedButtons),
  };
}
