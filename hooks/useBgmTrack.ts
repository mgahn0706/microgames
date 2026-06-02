"use client";

import { useEffect } from "react";
import {
  bgmLibrary,
  type BgmPlaybackMode,
  type BgmTrack,
} from "@/lib/bgmLibrary";

export function useBgmTrack(
  track: BgmTrack | null,
  mode: BgmPlaybackMode = "loop",
) {
  useEffect(() => {
    if (!track) {
      bgmLibrary.stop();
      return;
    }

    bgmLibrary.play(track, mode).catch((error: unknown) => {
      console.error(error);
    });
  }, [mode, track]);
}
