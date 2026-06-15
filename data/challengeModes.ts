export type ChallengeModes = Readonly<{
  fastStart: boolean;
  noControlHints: boolean;
  singleLife: boolean;
}>;

export const DEFAULT_CHALLENGE_MODES = {
  fastStart: false,
  noControlHints: false,
  singleLife: false,
} satisfies ChallengeModes;

export const CHALLENGE_MODE_UNLOCK_ROUND = 13;

export const CHALLENGE_MODE_OPTIONS = [
  {
    description: "첫 라운드부터 기본 속도의 1.8배로 시작합니다.",
    key: "fastStart",
    title: "완전빠름",
  },
  {
    description: "목숨이 1개뿐이며 보스 클리어 후에도 회복하지 않습니다.",
    key: "singleLife",
    title: "스릴만점",
  },
  {
    description: "조작 안내 없이 게임이 바로 시작됩니다.",
    key: "noControlHints",
    title: "센스쟁이",
  },
] as const satisfies readonly {
  description: string;
  key: keyof ChallengeModes;
  title: string;
}[];
