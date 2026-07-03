export type BgmThemeTrack =
  | "bossStage"
  | "fail"
  | "gameOver"
  | "intermission"
  | "mainLoop"
  | "oneUp"
  | "setup"
  | "speedUp"
  | "success";

export type BgmThemeOption = Readonly<{
  id: string;
  label: string;
}>;

export const BGM_THEME_STORAGE_KEY = "microgames-bgm-theme";

export const BGM_THEME_OPTIONS = [
  {
    id: "yaongElevator",
    label: "야옹 엘리베이터",
  },
  {
    id: "summerVacation",
    label: "여름 휴가",
  },
  {
    id: "rockBand",
    label: "락 밴드",
  },
  {
    id: "cityPop",
    label: "시티 팝",
  },
  {
    id: "deepOcean",
    label: "바다 깊은 곳",
  },
  {
    id: "classicGameMania",
    label: "고전게임 매니아",
  },
] as const satisfies readonly BgmThemeOption[];

export type BgmThemeId = (typeof BGM_THEME_OPTIONS)[number]["id"];

export const DEFAULT_BGM_THEME_OPTION = BGM_THEME_OPTIONS[0];

export const BGM_THEME_TRACK_PATHS = {
  yaongElevator: {
    bossStage: "/audio/bgm/themes/yaong-elevator/boss-stage.mp3",
    fail: "/audio/bgm/themes/yaong-elevator/failure.mp3",
    gameOver: "/audio/bgm/themes/yaong-elevator/game-over.mp3",
    intermission: "/audio/bgm/themes/yaong-elevator/intermission.mp3",
    mainLoop: "/audio/bgm/themes/yaong-elevator/main-loop.mp3",
    oneUp: "/audio/bgm/themes/yaong-elevator/one-up.mp3",
    setup: "/audio/bgm/themes/yaong-elevator/setup.mp3",
    speedUp: "/audio/bgm/themes/yaong-elevator/speed-up.mp3",
    success: "/audio/bgm/themes/yaong-elevator/success.mp3",
  },
  summerVacation: {
    bossStage: "/audio/bgm/themes/summer-vacation/boss-stage.mp3",
    fail: "/audio/bgm/themes/summer-vacation/failure.mp3",
    gameOver: "/audio/bgm/themes/summer-vacation/game-over.mp3",
    intermission: "/audio/bgm/themes/summer-vacation/intermission.mp3",
    mainLoop: "/audio/bgm/themes/summer-vacation/main-loop.mp3",
    oneUp: "/audio/bgm/themes/summer-vacation/one-up.mp3",
    setup: "/audio/bgm/themes/summer-vacation/setup.mp3",
    speedUp: "/audio/bgm/themes/summer-vacation/speed-up.mp3",
    success: "/audio/bgm/themes/summer-vacation/success.mp3",
  },
  rockBand: {
    bossStage: "/audio/bgm/themes/rock-band/boss-stage.mp3",
    fail: "/audio/bgm/themes/rock-band/failure.mp3",
    gameOver: "/audio/bgm/themes/rock-band/game-over.mp3",
    intermission: "/audio/bgm/themes/rock-band/intermission.mp3",
    mainLoop: "/audio/bgm/themes/rock-band/main-loop.mp3",
    oneUp: "/audio/bgm/themes/rock-band/one-up.mp3",
    setup: "/audio/bgm/themes/rock-band/setup.mp3",
    speedUp: "/audio/bgm/themes/rock-band/speed-up.mp3",
    success: "/audio/bgm/themes/rock-band/success.mp3",
  },
  cityPop: {
    bossStage: "/audio/bgm/themes/city-pop/boss-stage.mp3",
    fail: "/audio/bgm/themes/city-pop/failure.mp3",
    gameOver: "/audio/bgm/themes/city-pop/game-over.mp3",
    intermission: "/audio/bgm/themes/city-pop/intermission.mp3",
    mainLoop: "/audio/bgm/themes/city-pop/main-loop.mp3",
    oneUp: "/audio/bgm/themes/city-pop/one-up.mp3",
    setup: "/audio/bgm/themes/city-pop/setup.mp3",
    speedUp: "/audio/bgm/themes/city-pop/speed-up.mp3",
    success: "/audio/bgm/themes/city-pop/success.mp3",
  },
  deepOcean: {
    bossStage: "/audio/bgm/themes/deep-ocean/boss-stage.mp3",
    fail: "/audio/bgm/themes/deep-ocean/failure.mp3",
    gameOver: "/audio/bgm/themes/deep-ocean/game-over.mp3",
    intermission: "/audio/bgm/themes/deep-ocean/intermission.mp3",
    mainLoop: "/audio/bgm/themes/deep-ocean/main-loop.mp3",
    oneUp: "/audio/bgm/themes/deep-ocean/one-up.mp3",
    setup: "/audio/bgm/themes/deep-ocean/setup.mp3",
    speedUp: "/audio/bgm/themes/deep-ocean/speed-up.mp3",
    success: "/audio/bgm/themes/deep-ocean/success.mp3",
  },
  classicGameMania: {
    bossStage: "/audio/bgm/themes/classic-game-mania/boss-stage.mp3",
    fail: "/audio/bgm/themes/classic-game-mania/failure.mp3",
    gameOver: "/audio/bgm/themes/classic-game-mania/game-over.mp3",
    intermission: "/audio/bgm/themes/classic-game-mania/intermission.mp3",
    mainLoop: "/audio/bgm/themes/classic-game-mania/main-loop.mp3",
    oneUp: "/audio/bgm/themes/classic-game-mania/one-up.mp3",
    setup: "/audio/bgm/themes/classic-game-mania/setup.mp3",
    speedUp: "/audio/bgm/themes/classic-game-mania/speed-up.mp3",
    success: "/audio/bgm/themes/classic-game-mania/success.mp3",
  },
} as const satisfies Record<BgmThemeId, Record<BgmThemeTrack, string>>;

export function getBgmThemeOption(themeId: string | null) {
  return (
    BGM_THEME_OPTIONS.find((option) => option.id === themeId) ??
    DEFAULT_BGM_THEME_OPTION
  );
}
