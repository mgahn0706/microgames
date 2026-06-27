"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MICROGAME_CLEAR_EVENT,
  MICROGAME_FAILURE_EVENT,
} from "@/hooks/useMicrogameInput";

export type CookieRunKingdomSkill = Readonly<{
  id: string;
  key: 1 | 2 | 3 | 4 | 5;
  nameKo: string;
  portraitSrc: string;
  profileSrc: string;
  voiceSrc?: string;
}>;

export const COOKIE_RUN_KINGDOM_SKILLS = [
  {
    id: "darkchoco",
    key: 1,
    nameKo: "다크초코 쿠키",
    portraitSrc:
      "/games/cookie-run-kingdom/images/skill-portrait-darkchoco.webp",
    profileSrc: "/games/cookie-run-kingdom/images/skill-profile-darkchoco.png",
    voiceSrc: "/games/cookie-run-kingdom/sounds/skill-voice-darkchoco.wav",
  },
  {
    id: "espresso",
    key: 2,
    nameKo: "에스프레소맛 쿠키",
    portraitSrc: "/games/cookie-run-kingdom/images/skill-portrait-espresso.webp",
    profileSrc: "/games/cookie-run-kingdom/images/skill-profile-espresso.png",
    voiceSrc: "/games/cookie-run-kingdom/sounds/skill-voice-espresso.wav",
  },
  {
    id: "licorice",
    key: 3,
    nameKo: "감초맛 쿠키",
    portraitSrc: "/games/cookie-run-kingdom/images/skill-portrait-licorice.webp",
    profileSrc: "/games/cookie-run-kingdom/images/skill-profile-licorice.png",
    voiceSrc: "/games/cookie-run-kingdom/sounds/skill-voice-licorice.wav",
  },
  {
    id: "pomegranate",
    key: 4,
    nameKo: "석류맛 쿠키",
    portraitSrc:
      "/games/cookie-run-kingdom/images/skill-portrait-pomegranate.webp",
    profileSrc:
      "/games/cookie-run-kingdom/images/skill-profile-pomegranate.png",
    voiceSrc: "/games/cookie-run-kingdom/sounds/skill-voice-pomegranate.wav",
  },
  {
    id: "vampire",
    key: 5,
    nameKo: "뱀파이어맛 쿠키",
    portraitSrc: "/games/cookie-run-kingdom/images/skill-portrait-vampire.webp",
    profileSrc: "/games/cookie-run-kingdom/images/skill-profile-vampire.png",
    voiceSrc: "/games/cookie-run-kingdom/sounds/skill-voice-vampire.wav",
  },
] satisfies readonly CookieRunKingdomSkill[];

const FAILURE_DELAY_MS = 1950;
const SKILL_EFFECT_SRC = "/games/cookie-run-kingdom/sounds/skill-effect.wav";
const WRONG_FEEDBACK_MS = 320;

function dispatchClear() {
  window.dispatchEvent(new CustomEvent(MICROGAME_CLEAR_EVENT));
}

function dispatchFailure() {
  window.dispatchEvent(new CustomEvent(MICROGAME_FAILURE_EVENT));
}

function getRandomTarget() {
  const target =
    COOKIE_RUN_KINGDOM_SKILLS[
      Math.floor(Math.random() * COOKIE_RUN_KINGDOM_SKILLS.length)
    ];

  if (!target) {
    throw new Error("CookieRun Kingdom requires at least one skill.");
  }

  return target;
}

function parseSkillKey(event: KeyboardEvent) {
  if (/^[1-5]$/.test(event.key)) {
    return Number(event.key) as CookieRunKingdomSkill["key"];
  }

  if (/^Numpad[1-5]$/.test(event.code)) {
    return Number(
      event.code.replace("Numpad", ""),
    ) as CookieRunKingdomSkill["key"];
  }

  return null;
}

function playAudio(src: string, volume: number) {
  const audio = new Audio(src);

  audio.volume = volume;
  audio.play().catch((error: unknown) => {
    console.error(error);
  });

  return audio;
}

function playSkillAudio(target: CookieRunKingdomSkill) {
  return [
    playAudio(SKILL_EFFECT_SRC, 0.58),
    ...(target.voiceSrc ? [playAudio(target.voiceSrc, 1)] : []),
  ];
}

export function useCookieRunKingdomGame(): Readonly<{
  activatedSkill: CookieRunKingdomSkill | null;
  targetSkill: CookieRunKingdomSkill;
  wrongKey: CookieRunKingdomSkill["key"] | null;
}> {
  const failureTimerRef = useRef<number | null>(null);
  const hasResolvedRef = useRef(false);
  const skillAudioRef = useRef<readonly HTMLAudioElement[]>([]);
  const wrongFeedbackTimerRef = useRef<number | null>(null);
  const [activatedSkill, setActivatedSkill] =
    useState<CookieRunKingdomSkill | null>(null);
  const [targetSkill] = useState(getRandomTarget);
  const [wrongKey, setWrongKey] = useState<CookieRunKingdomSkill["key"] | null>(
    null,
  );

  const activateSkill = useCallback(
    (skillKey: CookieRunKingdomSkill["key"]) => {
      if (hasResolvedRef.current) {
        return;
      }

      if (skillKey !== targetSkill.key) {
        setWrongKey(skillKey);
        hasResolvedRef.current = true;

        if (wrongFeedbackTimerRef.current !== null) {
          window.clearTimeout(wrongFeedbackTimerRef.current);
        }

        wrongFeedbackTimerRef.current = window.setTimeout(() => {
          setWrongKey((currentKey) =>
            currentKey === skillKey ? null : currentKey,
          );
          wrongFeedbackTimerRef.current = null;
        }, WRONG_FEEDBACK_MS);

        const selectedSkill = COOKIE_RUN_KINGDOM_SKILLS.find(
          (skill) => skill.key === skillKey,
        );

        if (!selectedSkill) {
          throw new Error(`Missing CookieRun Kingdom skill: ${skillKey}`);
        }

        setActivatedSkill(selectedSkill);
        skillAudioRef.current = playSkillAudio(selectedSkill);
        failureTimerRef.current = window.setTimeout(() => {
          dispatchFailure();
          failureTimerRef.current = null;
        }, FAILURE_DELAY_MS);
        return;
      }

      hasResolvedRef.current = true;
      setWrongKey(null);
      setActivatedSkill(targetSkill);
      skillAudioRef.current = playSkillAudio(targetSkill);
      dispatchClear();
    },
    [targetSkill],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const skillKey = parseSkillKey(event);

      if (!skillKey) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      activateSkill(skillKey);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [activateSkill]);

  useEffect(
    () => () => {
      if (failureTimerRef.current !== null) {
        window.clearTimeout(failureTimerRef.current);
      }

      if (wrongFeedbackTimerRef.current !== null) {
        window.clearTimeout(wrongFeedbackTimerRef.current);
      }

      skillAudioRef.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    },
    [],
  );

  return {
    activatedSkill,
    targetSkill,
    wrongKey,
  };
}
