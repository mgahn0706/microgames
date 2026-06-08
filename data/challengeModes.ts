export type ChallengeModeId = "doubleSpeed" | "noControl" | "thrill";

export type ChallengeMode = Readonly<{
  description: string;
  id: ChallengeModeId;
  title: string;
}>;

export const CHALLENGE_MODES = [
  {
    description: "첫 라운드부터 2배 빠른 속도로 시작합니다.",
    id: "doubleSpeed",
    title: "겁나빠름",
  },
  {
    description: "목숨 1개로 시작하고, 최대 목숨도 1개라 회복할 수 없습니다.",
    id: "thrill",
    title: "스릴만점",
  },
  {
    description: "조작법을 알려주지 않고 바로 플레이합니다.",
    id: "noControl",
    title: "센스쟁이",
  },
] satisfies ChallengeMode[];

export const CHALLENGE_MODE_UNLOCK_ROUND = 12;
export const DOUBLE_SPEED_BEAT_DURATION_MULTIPLIER = 0.66;
export const NO_CONTROL_INSTRUCTION_BEATS = 4;
export const THRILL_MODE_MAX_LIVES = 1;

export function hasChallengeMode(
  challengeModeIds: readonly ChallengeModeId[],
  challengeModeId: ChallengeModeId,
) {
  return challengeModeIds.includes(challengeModeId);
}
