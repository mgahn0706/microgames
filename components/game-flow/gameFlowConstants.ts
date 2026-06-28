import type { GameRoundResult } from "@/hooks/useGameScreenFlow";
import type { BgmTrack } from "@/lib/bgmLibrary";

export const ELEVATOR_IMAGES = [
  "/games/game-flow/images/main-elevator-1.webp",
  "/games/game-flow/images/main-elevator-2.webp",
];

export const ELEVATOR_RESULT_IMAGES = {
  failure: [
    "/games/game-flow/images/main-elevator-fail-1.webp",
    "/games/game-flow/images/main-elevator-fail-2.webp",
  ],
  idle: ELEVATOR_IMAGES,
  success: [
    "/games/game-flow/images/main-elevator-success-1.webp",
    "/games/game-flow/images/main-elevator-success-2.webp",
  ],
} satisfies Record<GameRoundResult, string[]>;

export const ELEVATOR_WARNING_IMAGES = [
  "/games/game-flow/images/main-elevator-warning-1.webp",
  "/games/game-flow/images/main-elevator-warning-2.webp",
];

export const RESULT_BGM_TRACKS = {
  failure: "fail",
  idle: null,
  success: "success",
} satisfies Record<GameRoundResult, BgmTrack | null>;

export const NO_CONTROL_RESULT_BGM_TRACKS = {
  failure: "failNoControl",
  idle: null,
  success: "successNoControl",
} satisfies Record<GameRoundResult, BgmTrack | null>;

const SPEED_UP_MESSAGES = [
  "잘하고 있어요!",
  "속도가 올라가고 있어요!",
  "계속 달려봐요!",
  "따라오실 수 있나요?",
  "더 빨라질 거예요!",
  "집중력 유지!",
] as const;

const BOSS_STAGE_MESSAGES = [
  "보스 등장!",
  "어려울 수 있어요!",
  "집중력 최대치로!",
  "준비되셨나요?",
  "할 수 있어요!",
  "최선을 다해봐요!",
] as const;

export const MAIN_SCREEN_EXIT_MS = 680;

function getRandomMessage<T extends readonly string[]>(messages: T): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getRandomSpeedUpMessage() {
  return getRandomMessage(SPEED_UP_MESSAGES);
}

export function getRandomBossStageMessage() {
  return getRandomMessage(BOSS_STAGE_MESSAGES);
}

export function getDefaultSpeedUpMessage() {
  return SPEED_UP_MESSAGES[0];
}

export function getDefaultBossStageMessage() {
  return BOSS_STAGE_MESSAGES[0];
}
