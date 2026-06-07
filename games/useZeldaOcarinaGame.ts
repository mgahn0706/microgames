"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MICROGAME_CLEAR_EVENT } from "@/hooks/useMicrogameInput";

export type OcarinaInput = "down" | "left" | "right" | "space" | "up";

export type OcarinaSong = Readonly<{
  id: string;
  imageAlt: string;
  imageSrc: string;
  sequence: readonly OcarinaInput[];
}>;

const FEEDBACK_DURATION_MS = 260;
const NOTE_SOUNDS = {
  down: "/games/zelda-ocarina-of-time/sounds/F_down.wav",
  left: "/games/zelda-ocarina-of-time/sounds/B_left.wav",
  right: "/games/zelda-ocarina-of-time/sounds/A_right.wav",
  space: "/games/zelda-ocarina-of-time/sounds/D_space.wav",
  up: "/games/zelda-ocarina-of-time/sounds/D2_up.wav",
} satisfies Record<OcarinaInput, string>;

const OCARINA_SONGS = [
  {
    id: "zeldas-lullaby",
    imageAlt: "Zelda's Lullaby 악보",
    imageSrc: "/games/zelda-ocarina-of-time/images/zeldas_lullaby.png",
    sequence: ["left", "up", "right", "left", "up", "right"],
  },
  {
    id: "eponas-song",
    imageAlt: "Epona's Song 악보",
    imageSrc: "/games/zelda-ocarina-of-time/images/eponas_song.png",
    sequence: ["up", "left", "right", "up", "left", "right"],
  },
  {
    id: "song-of-time",
    imageAlt: "Song of Time 악보",
    imageSrc: "/games/zelda-ocarina-of-time/images/song_of_time.png",
    sequence: ["right", "space", "down", "right", "space", "down"],
  },
  {
    id: "song-of-storms",
    imageAlt: "Song of Storms 악보",
    imageSrc: "/games/zelda-ocarina-of-time/images/song_of_storm.png",
    sequence: ["space", "down", "up", "space", "down", "up"],
  },
] as const satisfies readonly OcarinaSong[];

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function getRandomSong() {
  const song = OCARINA_SONGS[Math.floor(Math.random() * OCARINA_SONGS.length)];

  if (!song) {
    throw new Error("Missing ocarina song.");
  }

  return song;
}

function parseOcarinaInput(event: KeyboardEvent): OcarinaInput | null {
  if (event.key === "ArrowDown") {
    return "down";
  }

  if (event.key === "ArrowLeft") {
    return "left";
  }

  if (event.key === "ArrowRight") {
    return "right";
  }

  if (event.key === "ArrowUp") {
    return "up";
  }

  if (event.code === "Space") {
    return "space";
  }

  return null;
}

function playNote(audio: HTMLAudioElement | undefined) {
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  audio.play().catch((error: unknown) => {
    console.error(error);
  });
}

export function useZeldaOcarinaGame(): Readonly<{
  feedback: "idle" | "success" | "wrong";
  progress: number;
  song: OcarinaSong;
}> {
  const audioByInputRef = useRef<
    Partial<Record<OcarinaInput, HTMLAudioElement>>
  >({});
  const feedbackTimerRef = useRef<number | null>(null);
  const hasClearedRef = useRef(false);
  const [feedback, setFeedback] = useState<"idle" | "success" | "wrong">(
    "idle",
  );
  const [progress, setProgress] = useState(0);
  const [song] = useState(getRandomSong);

  const resetProgress = useCallback(() => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }

    setFeedback("wrong");
    setProgress(0);

    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback("idle");
      feedbackTimerRef.current = null;
    }, FEEDBACK_DURATION_MS);
  }, []);

  useEffect(() => {
    audioByInputRef.current = Object.fromEntries(
      Object.entries(NOTE_SOUNDS).map(([input, soundSrc]) => {
        const audio = new Audio(soundSrc);

        audio.preload = "auto";
        audio.volume = 0.94;

        return [input, audio];
      }),
    ) as Partial<Record<OcarinaInput, HTMLAudioElement>>;

    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const input = parseOcarinaInput(event);

      if (!input || hasClearedRef.current) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      playNote(audioByInputRef.current[input]);

      setProgress((currentProgress) => {
        const expectedInput = song.sequence[currentProgress];

        if (input !== expectedInput) {
          resetProgress();
          return 0;
        }

        const nextProgress = currentProgress + 1;

        if (nextProgress >= song.sequence.length) {
          hasClearedRef.current = true;
          if (feedbackTimerRef.current !== null) {
            window.clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = null;
          }

          setFeedback("success");
          dispatchClear();
        }

        return nextProgress;
      });
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [resetProgress, song.sequence]);

  return {
    feedback,
    progress,
    song,
  };
}
