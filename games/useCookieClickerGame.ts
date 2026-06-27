"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

const CLICK_SOUND_SRC = "/games/cookie-clicker/sounds/click-cookie.mp3";
const CLICK_SOUND_POOL_SIZE = 5;
const FLOATING_CLICK_LIFETIME_MS = 680;
const PRESS_ANIMATION_MS = 120;
const TARGET_COOKIE_COUNT = 10;

type FloatingClick = Readonly<{
  id: number;
  x: number;
  y: number;
}>;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function createClickSoundPool() {
  return Array.from({ length: CLICK_SOUND_POOL_SIZE }, () => {
    const audio = new Audio(CLICK_SOUND_SRC);

    audio.preload = "auto";
    audio.volume = 0.72;
    audio.load();

    return audio;
  });
}

export function useCookieClickerGame() {
  const [cookieCount, setCookieCount] = useState(0);
  const [floatingClicks, setFloatingClicks] = useState<FloatingClick[]>([]);
  const [isPressingCookie, setIsPressingCookie] = useState(false);
  const clearTimeoutsRef = useRef<Set<number>>(new Set());
  const hasClearedRef = useRef(false);
  const nextFloatingClickIdRef = useRef(0);
  const nextSoundIndexRef = useRef(0);
  const soundPoolRef = useRef<HTMLAudioElement[]>([]);

  const playClickSound = useCallback(() => {
    const soundPool = soundPoolRef.current;
    const audio = soundPool[nextSoundIndexRef.current % soundPool.length];

    if (!audio) {
      return;
    }

    nextSoundIndexRef.current += 1;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Browser audio can be blocked before the first trusted interaction.
    });
  }, []);

  const registerTimeout = useCallback((callback: () => void, delayMs: number) => {
    const timeout = window.setTimeout(() => {
      clearTimeoutsRef.current.delete(timeout);
      callback();
    }, delayMs);

    clearTimeoutsRef.current.add(timeout);
  }, []);

  const handleCookiePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (hasClearedRef.current) {
        return;
      }

      event.preventDefault();
      const bounds = event.currentTarget.getBoundingClientRect();
      const nextFloatingClick = {
        id: nextFloatingClickIdRef.current,
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      } satisfies FloatingClick;

      nextFloatingClickIdRef.current += 1;
      playClickSound();
      setIsPressingCookie(true);
      setFloatingClicks((currentFloatingClicks) => [
        ...currentFloatingClicks,
        nextFloatingClick,
      ]);
      registerTimeout(() => {
        setFloatingClicks((currentFloatingClicks) =>
          currentFloatingClicks.filter(
            (floatingClick) => floatingClick.id !== nextFloatingClick.id,
          ),
        );
      }, FLOATING_CLICK_LIFETIME_MS);
      registerTimeout(() => {
        setIsPressingCookie(false);
      }, PRESS_ANIMATION_MS);
      setCookieCount((currentCookieCount) => {
        const nextCookieCount = currentCookieCount + 1;

        if (nextCookieCount >= TARGET_COOKIE_COUNT) {
          hasClearedRef.current = true;
          dispatchClear();
        }

        return nextCookieCount;
      });
    },
    [playClickSound, registerTimeout],
  );

  useEffect(() => {
    const clearTimeouts = clearTimeoutsRef.current;
    const soundPool = createClickSoundPool();

    soundPoolRef.current = soundPool;

    return () => {
      clearTimeouts.forEach((timeout) => {
        window.clearTimeout(timeout);
      });
      clearTimeouts.clear();
      soundPool.forEach((audio) => {
        audio.pause();
      });
      soundPoolRef.current = [];
    };
  }, []);

  return {
    cookieCount,
    floatingClicks,
    handleCookiePointerDown,
    isPressingCookie,
    targetCookieCount: TARGET_COOKIE_COUNT,
  };
}
