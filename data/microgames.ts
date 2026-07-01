import type { FormInstruction } from "@/data/formInstructions";
import { FORM_INSTRUCTIONS } from "@/data/formInstructions";

export type MicrogameControl =
  | "arrowAndSpace"
  | "arrowKeys"
  | "koreanKeyboard"
  | "mouseClick"
  | "mouseDrag"
  | "mouseHold"
  | "numberKeys"
  | "space";

export type MicrogameType = "boss" | "normal";
export type MicrogameCanvas =
  | "anipangMatchThree"
  | "animalCrossingNewLeafTyping"
  | "animalCrossingStamps"
  | "animalFarmReverseTyping"
  | "appleNumberSum"
  | "amongUsWires"
  | "babaIsYou"
  | "bindingOfIsaacFlies"
  | "bounceBall"
  | "brainAgeMath"
  | "brainAcademyBlocks"
  | "bubbleBobble"
  | "chessCapture"
  | "chromeDinoSpace"
  | "cookieClicker"
  | "cookieRun"
  | "cookieRunKingdom"
  | "courseRegistrationNumber"
  | "crosswordPuzzle"
  | "crazyArcade"
  | "daveTheDiverGig"
  | "default"
  | "dobble"
  | "fireAndIceDance"
  | "fireBoyWaterGirl"
  | "flickingGame"
  | "flappyBird"
  | "fruitNinja"
  | "geometryDashSpikes"
  | "gogunbuntuCoinRun"
  | "gomokuWhiteStone"
  | "halliGalliBoss"
  | "hancomTyping"
  | "infiniteStairs"
  | "kartriderCourse"
  | "kirbyInhale"
  | "laytonShapeMatch"
  | "leagueChampionBan"
  | "maplestoryLieDetector"
  | "maplestoryRune"
  | "minigameExBearMeat"
  | "minecraftMining"
  | "minesweeperMineClick"
  | "modooMarble"
  | "pianoMelody"
  | "pinballSurvival"
  | "pongSurvival"
  | "poppyPlaytimeScanner"
  | "pokerougeShop"
  | "pokemonMysteryDungeon"
  | "pokemonTcgPocket"
  | "pokemonTyping"
  | "rhythmHeavenChorus"
  | "rhythmHeroSpinner"
  | "rummikubAttach"
  | "snakeApple"
  | "starcraftMove"
  | "superMarioGalaxyStarBits"
  | "superMarioCoins"
  | "submitAssignment"
  | "sudokuMissingNumber"
  | "squidGameRedLight"
  | "suikaGame"
  | "tetrisLineClear"
  | "theWorldHardestGame"
  | "ticTacToe"
  | "twoThousandFortyEightBoss"
  | "undertaleMouse"
  | "wiiSportsDualPress"
  | "wordleBoss"
  | "zeldaCircleDraw"
  | "zeldaOcarinaOfTime";

export type MicrogameMicroscope = Readonly<{
  imageAlt: string;
  imageSrc: string;
}>;

export type Microgame = Readonly<{
  beatCount: number;
  canvas: MicrogameCanvas;
  microscope: MicrogameMicroscope;
  control: MicrogameControl;
  id: string;
  startPrompt: string;
  title: string;
  type: MicrogameType;
}>;

const FORM_INSTRUCTIONS_BY_CONTROL = {
  arrowAndSpace: getFormInstructionByControl("arrowAndSpace"),
  arrowKeys: getFormInstructionByControl("arrowKeys"),
  koreanKeyboard: getFormInstructionByControl("koreanKeyboard"),
  mouseClick: getFormInstructionByControl("mouseClick"),
  mouseDrag: getFormInstructionByControl("mouseDrag"),
  mouseHold: getFormInstructionByControl("mouseHold"),
  numberKeys: getFormInstructionByControl("numberKeys"),
  space: getFormInstructionByControl("space"),
} satisfies Record<MicrogameControl, FormInstruction>;

export const MICROGAMES = [
  {
    beatCount: 10,
    canvas: "gogunbuntuCoinRun",
    microscope: {
      imageAlt: "고군분투 달리는 고양이",
      imageSrc: "/games/gogunbuntu/images/running-player.png",
    },
    control: "space",
    id: "gogunbuntu-coin-run",
    startPrompt: "15개를 모아라!",
    title: "고군분투",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "submitAssignment",
    microscope: {
      imageAlt: "과제 제출 화면",
      imageSrc: "/games/submit-assignment/images/background.png",
    },
    control: "mouseClick",
    id: "submit-assignment",
    startPrompt: "제출해라!",
    title: "과제 제출",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "animalCrossingNewLeafTyping",
    microscope: {
      imageAlt: "놀러와요 동물의 숲 키보드 화면",
      imageSrc: "/games/animal-crossing-new-leaf/images/background.png",
    },
    control: "koreanKeyboard",
    id: "animal-crossing-new-leaf-apology-typing",
    startPrompt: "입력해라!",
    title: "놀러와요 동물의 숲",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "daveTheDiverGig",
    microscope: {
      imageAlt: "데이브 더 다이버 클라운피시",
      imageSrc: "/games/dave-the-diver/images/clownfish.png",
    },
    control: "mouseHold",
    id: "dave-the-diver-clownfish",
    startPrompt: "사냥해라!",
    title: "데이브 더 다이버",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "dobble",
    microscope: {
      imageAlt: "도블 물음표 아이콘",
      imageSrc: "/games/dobble/images/question_mark.png",
    },
    control: "mouseClick",
    id: "dobble-symbol-match",
    startPrompt: "같은 그림을 찾아라!",
    title: "도블",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "rhythmHeroSpinner",
    microscope: {
      imageAlt: "도와줘! 리듬 히어로 스피너",
      imageSrc: "/games/rhythm-hero/images/spinner.webp",
    },
    control: "mouseDrag",
    id: "rhythm-hero-spinner",
    startPrompt: "돌려라!",
    title: "도와줘! 리듬 히어로",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "laytonShapeMatch",
    microscope: {
      imageAlt: "레이튼 모양 문제",
      imageSrc: "/games/layton/images/one-A.png",
    },
    control: "numberKeys",
    id: "layton-shape-match",
    startPrompt: "같은 모양을 찾아라!",
    title: "레이튼 교수와 이상한 마을",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "leagueChampionBan",
    microscope: {
      imageAlt: "리그 오브 레전드 챔피언 선택 배경",
      imageSrc: "/games/league-of-legend/images/background.webp",
    },
    control: "mouseClick",
    id: "league-of-legend-champion-ban",
    startPrompt: "챔피언을 밴해라!",
    title: "리그 오브 레전드",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "rhythmHeavenChorus",
    microscope: {
      imageAlt: "노래하는 코러스맨",
      imageSrc: "/games/rhythm-heaven/images/chorus-man-singing.png",
    },
    control: "mouseHold",
    id: "rhythm-heaven-chorus",
    startPrompt: "제때 멈춰라!",
    title: "리듬 세상",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "rummikubAttach",
    microscope: {
      imageAlt: "루미큐브 숫자 타일",
      imageSrc: "/games/rummikub/images/tile.png",
    },
    control: "mouseDrag",
    id: "rummikub-attach-tile",
    startPrompt: "타일을 붙여라!",
    title: "루미큐브",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "minecraftMining",
    microscope: {
      imageAlt: "마인크래프트 다이아몬드 광석",
      imageSrc: "/games/minecraft/images/diamond-ore.png",
    },
    control: "mouseHold",
    id: "minecraft-diamond-mining",
    startPrompt: "다이아몬드를 캐라!",
    title: "마인크래프트",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "brainAgeMath",
    microscope: {
      imageAlt: "닌텐도 DS 두뇌 트레이닝 계산 화면",
      imageSrc: "/games/brain-age/images/background.png",
    },
    control: "numberKeys",
    id: "brain-age-ds-math",
    startPrompt: "계산해라!",
    title: "매일매일 DS 두뇌 트레이닝",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "brainAcademyBlocks",
    microscope: {
      imageAlt: "두뇌교실 블록 문제 배경",
      imageSrc: "/games/brain-academy/images/background.webp",
    },
    control: "numberKeys",
    id: "brain-academy-block-count",
    startPrompt: "블록은 몇 개?",
    title: "말랑말랑 두뇌교실",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "maplestoryLieDetector",
    microscope: {
      imageAlt: "메이플스토리 몬스터",
      imageSrc: "/games/maplestory-lie-detector/images/slime-stump.png",
    },
    control: "koreanKeyboard",
    id: "maplestory-lie-detector",
    startPrompt: "입력해라!",
    title: "메이플스토리",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "maplestoryRune",
    microscope: {
      imageAlt: "메이플스토리 룬",
      imageSrc: "/games/maple-story-rune/images/rune.png",
    },
    control: "arrowKeys",
    id: "maplestory-rune-sequence",
    startPrompt: "순서대로 입력해라!",
    title: "메이플스토리 룬",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "modooMarble",
    microscope: {
      imageAlt: "모두의마블 배경",
      imageSrc: "/games/modoo-marble/images/background.webp",
    },
    control: "mouseHold",
    id: "modoo-marble-big-number",
    startPrompt: "12를 굴려라!",
    title: "모두의 마블",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "animalCrossingStamps",
    microscope: {
      imageAlt: "동물의 숲 스탬프",
      imageSrc: "/games/animal-crossing/images/stamp.webp",
    },
    control: "mouseClick",
    id: "animal-crossing-stamp-card",
    startPrompt: "찍어라!",
    title: "모여봐요 동물의 숲",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "infiniteStairs",
    microscope: {
      imageAlt: "무한의계단 계단",
      imageSrc: "/games/infinite-stairs/images/stair-brick.png",
    },
    control: "arrowKeys",
    id: "infinite-stairs-climb",
    startPrompt: "올라가라!",
    title: "무한의계단",
    type: "normal",
  },

  {
    beatCount: 16,
    canvas: "minigameExBearMeat",
    microscope: {
      imageAlt: "미니게임EX 곰",
      imageSrc: "/games/minigame-ex/images/idle-bear.png",
    },
    control: "numberKeys",
    id: "minigame-ex-bear-meat",
    startPrompt: "곰을 잘 봐라!",
    title: "미니게임EX",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "bounceBall",
    microscope: {
      imageAlt: "바운스볼 노란 공",
      imageSrc: "/games/bounce-ball/images/ball.png",
    },
    control: "arrowKeys",
    id: "bounce-ball-star",
    startPrompt: "별을 먹어라!",
    title: "바운스볼",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "bubbleBobble",
    microscope: {
      imageAlt: "버블보블 버블 드래곤",
      imageSrc: "/games/bubble-bobble/images/background.webp",
    },
    control: "arrowAndSpace",
    id: "bubble-bobble-defeat-enemies",
    startPrompt: "모든 적을 무찔러라!",
    title: "버블보블",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "kirbyInhale",
    microscope: {
      imageAlt: "별의 커비 흡입 자세",
      imageSrc: "/games/kirby/images/kirby-ready.png",
    },
    control: "mouseHold",
    id: "kirby-inhale",
    startPrompt: "빨아들여라!",
    title: "별의 커비: 울트라 슈퍼 디럭스",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "fireAndIceDance",
    microscope: {
      imageAlt: "불과 얼음의 춤 별빛 배경",
      imageSrc: "/games/a-dance-of-fire-and-ice/images/background.png",
    },
    control: "space",
    id: "a-dance-of-fire-and-ice",
    startPrompt: "박자에 맞춰 눌러라!",
    title: "불과 얼음의 춤",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "appleNumberSum",
    microscope: {
      imageAlt: "사과게임 보드",
      imageSrc: "/games/apple-game/images/apple.png",
    },
    control: "mouseDrag",
    id: "apple-game-number-sum",
    startPrompt: "10을 만들어라!",
    title: "사과게임",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "suikaGame",
    microscope: {
      imageAlt: "수박게임 수박",
      imageSrc: "/games/suika-game/images/watermelon.png",
    },
    control: "arrowAndSpace",
    id: "suika-game-watermelon",
    startPrompt: "수박을 만들어라!",
    title: "수박게임",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "superMarioCoins",
    microscope: {
      imageAlt: "슈퍼 마리오 코인",
      imageSrc: "/games/supermario/images/coin.png",
    },
    control: "space",
    id: "super-mario-coin-count",
    startPrompt: "코인을 정확히 모아라!",
    title: "슈퍼 마리오",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "superMarioGalaxyStarBits",
    microscope: {
      imageAlt: "슈퍼마리오 갤럭시 스타구슬",
      imageSrc: "/games/super-mario-galaxy/images/blue-bits.png",
    },
    control: "mouseDrag",
    id: "super-mario-galaxy-star-bits",
    startPrompt: "스타구슬을 모아라!",
    title: "슈퍼마리오 갤럭시",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "snakeApple",
    microscope: {
      imageAlt: "스네이크 게임 썸네일",
      imageSrc: "/games/snake/images/thumbnail.svg",
    },
    control: "arrowKeys",
    id: "snake-apple",
    startPrompt: "사과를 먹어라!",
    title: "스네이크",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "sudokuMissingNumber",
    microscope: {
      imageAlt: "빈칸이 있는 3×3 숫자 퍼즐",
      imageSrc: "/games/sudoku/images/thumbnail.svg",
    },
    control: "numberKeys",
    id: "sudoku-missing-number",
    startPrompt: "빈칸을 채워라!",
    title: "스도쿠",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "starcraftMove",
    microscope: {
      imageAlt: "스타크래프트 드라군",
      imageSrc: "/games/starcraft/images/idle.png",
    },
    control: "mouseClick",
    id: "starcraft-dragoon-mineral",
    startPrompt: "미네랄로 이동시켜라!",
    title: "스타크래프트",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "crosswordPuzzle",
    microscope: {
      imageAlt: "십자말풀이 4칸 격자",
      imageSrc: "/games/crossword/images/thumbnail.svg",
    },
    control: "koreanKeyboard",
    id: "crossword-four-character-idiom",
    startPrompt: "빈칸을 채워라!",
    title: "십자말풀이",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "flickingGame",
    microscope: {
      imageAlt: "알까기 판",
      imageSrc: "/games/flicking-game/images/board.png",
    },
    control: "mouseDrag",
    id: "flicking-game",
    startPrompt: "밀어내라!",
    title: "알까기",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "bindingOfIsaacFlies",
    microscope: {
      imageAlt: "아이작의 번제 아이작",
      imageSrc: "/games/the-binding-of-isaac/images/player-down.png",
    },
    control: "arrowAndSpace",
    id: "binding-of-isaac-fly-room",
    startPrompt: "모두 처치해라!",
    title: "아이작의 번제",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "anipangMatchThree",
    microscope: {
      imageAlt: "애니팡 고양이 동물 블록",
      imageSrc: "/games/anipang/images/cat.png",
    },
    control: "mouseDrag",
    id: "anipang-match-three",
    startPrompt: "세 마리를 맞춰라!",
    title: "애니팡",
    type: "normal",
  },

  {
    beatCount: 14,
    canvas: "amongUsWires",
    microscope: {
      imageAlt: "어몽어스 전선 작업 배경",
      imageSrc: "/games/among-us/images/background.webp",
    },
    control: "mouseDrag",
    id: "among-us-wire-task",
    startPrompt: "연결해라!",
    title: "어몽어스",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "undertaleMouse",
    microscope: {
      imageAlt: "언더테일 샌즈",
      imageSrc: "/games/undertale/images/sans.png",
    },
    control: "arrowKeys",
    id: "undertale-bone-dodge",
    startPrompt: "피해라!",
    title: "언더테일",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "gomokuWhiteStone",
    microscope: {
      imageAlt: "오목판",
      imageSrc: "/games/gomoku/images/board.png",
    },
    control: "mouseClick",
    id: "gomoku-white-five",
    startPrompt: "흰돌을 놓아 이겨라!",
    title: "오목",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "zeldaCircleDraw",
    microscope: {
      imageAlt: "젤다 원 그리기 배경",
      imageSrc: "/games/zelda/images/background.webp",
    },
    control: "mouseDrag",
    id: "zelda-circle-draw",
    startPrompt: "동그라미를 그려라!",
    title: "젤다의 전설: 스카이워드 소드",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "zeldaOcarinaOfTime",
    microscope: {
      imageAlt: "시간의 오카리나 악보",
      imageSrc: "/games/zelda-ocarina-of-time/images/zeldas_lullaby.png",
    },
    control: "arrowAndSpace",
    id: "zelda-ocarina-song",
    startPrompt: "연주해라!",
    title: "젤다의 전설: 시간의 오카리나",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "minesweeperMineClick",
    microscope: {
      imageAlt: "지뢰찾기 숨겨진 칸",
      imageSrc: "/games/minesweeper/images/TileUnknown.png",
    },
    control: "mouseClick",
    id: "minesweeper-click-mine",
    startPrompt: "터뜨려라!",
    title: "지뢰찾기",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "geometryDashSpikes",
    microscope: {
      imageAlt: "지오메트리 대시 플레이어",
      imageSrc: "/games/geometry-dash/images/player.png",
    },
    control: "space",
    id: "geometry-dash-spike-dodge",
    startPrompt: "가시를 피해라!",
    title: "지오메트리 대시",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "chessCapture",
    microscope: {
      imageAlt: "6×6 체스판과 흑색 기물",
      imageSrc: "/games/chess/images/chess_board.png",
    },
    control: "mouseDrag",
    id: "chess-one-move-capture",
    startPrompt: "킹을 잡아라!",
    title: "체스",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "cookieClicker",
    microscope: {
      imageAlt: "쿠키 클리커 쿠키",
      imageSrc: "/games/cookie-clicker/images/cookie.png",
    },
    control: "mouseClick",
    id: "cookie-clicker",
    startPrompt: "10개 모아라!",
    title: "쿠키 클리커",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "cookieRun",
    microscope: {
      imageAlt: "쿠키런 배경",
      imageSrc: "/games/cookie-run/images/background.webp",
    },
    control: "arrowAndSpace",
    id: "cookie-run-obstacle-dodge",
    startPrompt: "달려라!",
    title: "쿠키런: 오븐브레이크",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "cookieRunKingdom",
    microscope: {
      imageAlt: "쿠키런 킹덤 전투 화면",
      imageSrc: "/games/cookie-run-kingdom/images/background.webp",
    },
    control: "numberKeys",
    id: "cookie-run-kingdom-skill",
    startPrompt: "스킬을 발동해라!",
    title: "쿠키런: 킹덤",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "crazyArcade",
    microscope: {
      imageAlt: "크레이지 아케이드 배경",
      imageSrc: "/games/crazy-arcade/images/background.webp",
    },
    control: "arrowAndSpace",
    id: "crazy-arcade-water-bomb",
    startPrompt: "물풍선을 설치해라!",
    title: "크레이지 아케이드",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "chromeDinoSpace",
    microscope: {
      imageAlt: "크롬 공룡게임",
      imageSrc: "/games/chrome-dino/images/dinosaur.png",
    },
    control: "space",
    id: "jump-gap",
    startPrompt: "점프해라!",
    title: "크롬 공룡게임",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "tetrisLineClear",
    microscope: {
      imageAlt: "테트리스 썸네일",
      imageSrc: "/games/tetris/images/thumbnail.svg",
    },
    control: "arrowAndSpace",
    id: "tetris-four-line-clear",
    startPrompt: "4줄 없애라!",
    title: "테트리스",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "ticTacToe",
    microscope: {
      imageAlt: "틱택토 보드",
      imageSrc: "/games/tic-tac-toe/images/thumbnail.svg",
    },
    control: "mouseClick",
    id: "tic-tac-toe-random-ai",
    startPrompt: "이겨라!",
    title: "틱택토",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "poppyPlaytimeScanner",
    microscope: {
      imageAlt: "파피 플레이타임 파란 손 스캐너",
      imageSrc: "/games/poppy-playtime/images/hand-scanner.png",
    },
    control: "mouseHold",
    id: "poppy-playtime-hand-scan",
    startPrompt: "스캔해라!",
    title: "파피 플레이타임",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "pokemonMysteryDungeon",
    microscope: {
      imageAlt: "포켓몬 불가사의 던전 계단 타일",
      imageSrc: "/games/pokemon-mystery-dungeon/images/target-stair-tile.png",
    },
    control: "arrowKeys",
    id: "pokemon-mystery-dungeon-stairs",
    startPrompt: "계단으로 가라!",
    title: "포켓몬 불가사의 던전: 어둠의 탐험대",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "pokemonTyping",
    microscope: {
      imageAlt: "포켓몬 도감 배경",
      imageSrc: "/games/pokemon/images/pokedex-background.webp",
    },
    control: "koreanKeyboard",
    id: "pokemon-name-typing",
    startPrompt: "이 포켓몬의 이름은?",
    title: "포켓몬스터",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "pokemonTcgPocket",
    microscope: {
      imageAlt: "포켓몬 카드 게임 Pocket의 파이리 카드",
      imageSrc: "/games/pokemon-tcg-pocket/images/fire-card.png",
    },
    control: "mouseDrag",
    id: "pokemon-tcg-pocket-type-card",
    startPrompt: "맞는 타입 카드를 내라!",
    title: "포켓몬 카드 게임 Pocket",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "pokerougeShop",
    microscope: {
      imageAlt: "포켓로그 마스터볼",
      imageSrc: "/games/pokerouge/images/master-ball.png",
    },
    control: "arrowAndSpace",
    id: "pokerouge-master-ball-shop",
    startPrompt: "마스터볼을 골라라!",
    title: "포켓로그",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "pongSurvival",
    microscope: {
      imageAlt: "퐁 게임 화면",
      imageSrc: "/games/pong/images/thumbnail.svg",
    },
    control: "arrowKeys",
    id: "pong-survival",
    startPrompt: "버텨라!",
    title: "퐁",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "flappyBird",
    microscope: {
      imageAlt: "플래피버드",
      imageSrc: "/games/flappy-bird/images/bird.png",
    },
    control: "space",
    id: "flappy-bird-pipe-dodge",
    startPrompt: "피해라!",
    title: "플래피버드",
    type: "normal",
  },

  {
    beatCount: 10,
    canvas: "pianoMelody",
    microscope: {
      imageAlt: "피아노 배경",
      imageSrc: "/games/piano/images/background.png",
    },
    control: "numberKeys",
    id: "piano-melody-repeat",
    startPrompt: "연주해라!",
    title: "피아노",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "pinballSurvival",
    microscope: {
      imageAlt: "핀볼 테이블과 플리퍼",
      imageSrc: "/games/pinball/images/background.png",
    },
    control: "space",
    id: "pinball-survival",
    startPrompt: "떨어뜨리지 마라!",
    title: "핀볼",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "hancomTyping",
    microscope: {
      imageAlt: "한컴 타자 배경",
      imageSrc: "/games/hancom/images/background.webp",
    },
    control: "koreanKeyboard",
    id: "hancom-word-typing",
    startPrompt: "입력해라!",
    title: "한컴 타자연습",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "fruitNinja",
    microscope: {
      imageAlt: "후르츠 닌자 수박",
      imageSrc: "/games/fruit-ninja/images/watermelon.png",
    },
    control: "mouseDrag",
    id: "fruit-ninja-watermelon-slice",
    startPrompt: "베어라!",
    title: "후르츠 닌자",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "babaIsYou",
    microscope: {
      imageAlt: "Baba Is You의 Baba 캐릭터",
      imageSrc: "/games/baba-is-you/images/baba.png",
    },
    control: "arrowKeys",
    id: "baba-is-you-reach-flag",
    startPrompt: "깃대에 도달해라!",
    title: "Baba Is You",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "fireBoyWaterGirl",
    microscope: {
      imageAlt: "파이어보이와 워터걸 캐릭터",
      imageSrc: "/games/fire-boy-and-water-girl/images/fire-boy-idle.png",
    },
    control: "arrowKeys",
    id: "fire-boy-water-girl-escape",
    startPrompt: "건너가라!",
    title: "Fire Boy and Water Girl",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "wiiSportsDualPress",
    microscope: {
      imageAlt: "Wii Sports A와 B 버튼 안내",
      imageSrc: "/games/wii-sports/images/backgroud-default.png",
    },
    control: "koreanKeyboard",
    id: "wii-sports-dual-button",
    startPrompt: "A와 B를 눌러라!",
    title: "Wii Sports",
    type: "normal",
  },

  {
    beatCount: 36,
    canvas: "twoThousandFortyEightBoss",
    microscope: {
      imageAlt: "2048 보드",
      imageSrc: "/games/two-thousand-forty-eight/images/thumbnail.svg",
    },
    control: "arrowKeys",
    id: "two-thousand-forty-eight-boss",
    startPrompt: "32를 만들어라!",
    title: "2048",
    type: "boss",
  },

  {
    beatCount: 36,
    canvas: "animalFarmReverseTyping",
    microscope: {
      imageAlt: "동물농장 배경",
      imageSrc: "/games/animal-farm/images/background.webp",
    },
    control: "koreanKeyboard",
    id: "animal-farm-reverse-typing",
    startPrompt: "단어를 거꾸로 써라!",
    title: "동물농장",
    type: "boss",
  },

  {
    beatCount: 50,
    canvas: "theWorldHardestGame",
    microscope: {
      imageAlt: "세상에서 제일 어려운 게임 레벨",
      imageSrc: "/games/the-world-hardest-game/images/background.png",
    },
    control: "arrowKeys",
    id: "the-world-hardest-game",
    startPrompt: "끝까지 가라!",
    title: "세상에서 제일 어려운 게임",
    type: "boss",
  },

  {
    beatCount: 36,
    canvas: "squidGameRedLight",
    microscope: {
      imageAlt: "무궁화 꽃이 피었습니다 인형",
      imageSrc: "/games/squid-game/images/doll-red-light.png",
    },
    control: "mouseHold",
    id: "squid-game-red-light-green-light",
    startPrompt: "결승선을 통과해라!",
    title: "오징어 게임",
    type: "boss",
  },

  {
    beatCount: 52,
    canvas: "wordleBoss",
    microscope: {
      imageAlt: "워들 5글자 단어 퍼즐 보드",
      imageSrc: "/games/wordle/images/thumbnail.svg",
    },
    control: "koreanKeyboard",
    id: "wordle-boss",
    startPrompt: "단어를 맞춰라!",
    title: "워들",
    type: "boss",
  },

  {
    beatCount: 36,
    canvas: "kartriderCourse",
    microscope: {
      imageAlt: "카트라이더 운하 코스",
      imageSrc: "/games/kartrider/images/track.webp",
    },
    control: "arrowKeys",
    id: "kartrider-village-canal-course",
    startPrompt: "완주해라!",
    title: "카트라이더",
    type: "boss",
  },

  {
    beatCount: 36,
    canvas: "halliGalliBoss",
    microscope: {
      imageAlt: "할리갈리 종",
      imageSrc: "/games/halli-galli/images/bell.webp",
    },
    control: "mouseClick",
    id: "halli-galli-bell-boss",
    startPrompt: "과일이 5개일 때 종을 쳐라!",
    title: "할리갈리",
    type: "boss",
  },
] satisfies Microgame[];

const NORMAL_MICROGAMES = MICROGAMES.filter(
  (microgame) => microgame.type === "normal",
);
const BOSS_MICROGAMES = MICROGAMES.filter(
  (microgame) => microgame.type === "boss",
);

function getSeededMicrogameIndex(
  roundNumber: number,
  sessionSeed: number,
  poolSize: number,
) {
  const seed = Math.sin((roundNumber + 1) * 9301 + sessionSeed * 49297);
  const normalizedSeed = seed - Math.floor(seed);

  return Math.floor(normalizedSeed * poolSize);
}

export function isBossMicrogameRound(roundNumber: number) {
  return roundNumber > 1 && (roundNumber - 1) % 12 === 0;
}

export function getMicrogamePoolForRound(roundNumber: number) {
  return isBossMicrogameRound(roundNumber)
    ? BOSS_MICROGAMES
    : NORMAL_MICROGAMES;
}

export function getMicrogameForRound(roundNumber: number, sessionSeed: number) {
  const microgamePool = getMicrogamePoolForRound(roundNumber);

  return microgamePool[
    getSeededMicrogameIndex(roundNumber, sessionSeed, microgamePool.length)
  ];
}

export function getMicrogameFormInstruction(microgame: Microgame) {
  return FORM_INSTRUCTIONS_BY_CONTROL[microgame.control];
}

function getFormInstructionByControl(control: MicrogameControl) {
  const formInstruction = FORM_INSTRUCTIONS.find(
    (instruction) => instruction.control === control,
  );

  if (!formInstruction) {
    throw new Error(`Missing form instruction for control: ${control}`);
  }

  return formInstruction;
}
