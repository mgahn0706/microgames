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
  | "animalCrossingStamps"
  | "animalFarmReverseTyping"
  | "appleNumberSum"
  | "amongUsWires"
  | "brainAcademyBlocks"
  | "chromeDinoSpace"
  | "cookieRun"
  | "courseRegistrationNumber"
  | "crazyArcade"
  | "default"
  | "flickingGame"
  | "flappyBird"
  | "geometryDashSpikes"
  | "gomokuWhiteStone"
  | "halliGalliBoss"
  | "hancomTyping"
  | "kartriderCourse"
  | "kirbyInhale"
  | "laytonShapeMatch"
  | "leagueChampionBan"
  | "maplestoryLieDetector"
  | "maplestoryRune"
  | "minigameExBearMeat"
  | "minecraftMining"
  | "modooMarble"
  | "pianoMelody"
  | "pongSurvival"
  | "pokemonTyping"
  | "superMarioGalaxyStarBits"
  | "superMarioCoins"
  | "submitAssignment"
  | "tetrisLineClear"
  | "twoThousandFortyEightBoss"
  | "undertaleMouse"
  | "wiiSportsDualPress"
  | "zeldaCircleDraw"
  | "zeldaOcarinaOfTime";

export type MicrogameMicroscope = Readonly<{
  description: string;
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
    beatCount: 8,
    canvas: "submitAssignment",
    microscope: {
      description:
        "과제 마감 직전에 제출해보신 적이 있으신가요? 체크박스 체크를 잊지 마세요.",
      imageAlt: "과제 제출 화면",
      imageSrc: "/games/submit-assignment/images/background.png",
    },
    control: "mouseClick",
    id: "submit-assignment",
    startPrompt: "과제를 제출해라!",
    title: "과제 제출",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "laytonShapeMatch",
    microscope: {
      description:
        "레이튼 교수식 문제는 단순해 보여도 꼭 한 번 더 보게 됩니다. 같은 모양을 찾아 번호를 눌러보세요.",
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
      description:
        "롤 챔피언 선택창은 늘 시간이 부족하죠. 밴해야 할 챔피언을 찾고, 망설이지 말고 눌러야 합니다.",
      imageAlt: "리그 오브 레전드 챔피언 선택 배경",
      imageSrc: "/games/league-of-legend/images/background.png",
    },
    control: "mouseClick",
    id: "league-of-legend-champion-ban",
    startPrompt: "챔피언을 밴해라!",
    title: "리그 오브 레전드",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "minecraftMining",
    microscope: {
      description:
        "마인크래프트에서 다이아몬드 발견하면 괜히 숨이 멎죠. 곡괭이를 놓치지 말고 끝까지 캐야 합니다.",
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
    canvas: "brainAcademyBlocks",
    microscope: {
      description:
        "말랑말랑 두뇌교실 문제는 쉬워 보일 때가 제일 위험합니다. 블록을 얼른 세고 맞는 숫자를 눌러야 해요.",
      imageAlt: "두뇌교실 블록 문제 배경",
      imageSrc: "/games/brain-academy/images/background.png",
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
      description:
        "메이플스토리 거짓말 탐지기, 갑자기 뜨면 심장이 철렁하죠. 몬스터 이름을 보고 그대로 입력해야 합니다.",
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
      description:
        "메이플 룬 해방할 때 화살표 놓치면 괜히 민망합니다. 방향을 보고 순서대로 착착 눌러야 해요.",
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
      description:
        "모두의 마블의 주사위 컨트롤을 아시나요? 꾹 눌러 12를 띄워보세요.",
      imageAlt: "모두의마블 배경",
      imageSrc: "/games/modoo-marble/images/background.png",
    },
    control: "mouseHold",
    id: "modoo-marble-big-number",
    startPrompt: "큰 수를 굴려라!",
    title: "모두의 마블",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "animalCrossingStamps",
    microscope: {
      description:
        "동물의 숲 박물관의 스탬프를 보고 빠르게 쾅쾅 찍어야 합니다. 아, 잘못 찍으면 실패예요!",
      imageAlt: "동물의 숲 스탬프",
      imageSrc: "/games/animal-crossing/images/stamp.png",
    },
    control: "mouseClick",
    id: "animal-crossing-stamp-card",
    startPrompt: "찍어라!",
    title: "모여봐요 동물의 숲",
    type: "normal",
  },

  {
    beatCount: 16,
    canvas: "minigameExBearMeat",
    microscope: {
      description:
        "미니게임EX를 아는 사람이 있으려나 모르겠네요. 세 곰 중 누가 제일 많이 먹었는지 보셨나요?.",
      imageAlt: "미니게임EX 곰",
      imageSrc: "/games/minigame-ex/images/idle-bear.png",
    },
    control: "numberKeys",
    id: "minigame-ex-bear-meat",
    startPrompt: "곰을 잘봐라!",
    title: "미니게임EX",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "kirbyInhale",
    microscope: {
      description:
        "별의 커비에서는 숨을 크게 들이마시는 순간이 시작입니다. 마우스를 꾹 눌러 적을 끝까지 빨아들이세요.",
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
    beatCount: 12,
    canvas: "appleNumberSum",
    microscope: {
      description:
        "사과게임, 한때 시간 순삭이었죠. 숫자가 적힌 사과들을 드래그해서 딱 10을 만들면 되는데, 급하면 꼭 하나를 더 잡습니다.",
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
    canvas: "superMarioCoins",
    microscope: {
      description:
        "마리오 하면 역시 점프와 코인이죠. 블록을 치고 코인을 모으는데, 너무 많이 먹어도 안 됩니다.",
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
      description:
        "슈퍼마리오 갤럭시에서는 이 스타구슬이 재화에요. 손을 떼지 말고 쭉 끌어서 여섯 개를 모아야 해요.",
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
    canvas: "flickingGame",
    microscope: {
      description:
        "알까기는 손끝 힘 조절이 전부입니다. 내 돌은 나가도 괜찮지만, 상대 돌은 반드시 판 밖으로 밀어내야 합니다.",
      imageAlt: "알까기 판",
      imageSrc: "/games/flicking-game/images/board.png",
    },
    control: "mouseDrag",
    id: "flicking-game",
    startPrompt: "적 돌을 밀어내라!",
    title: "알까기",
    type: "normal",
  },

  {
    beatCount: 14,
    canvas: "amongUsWires",
    microscope: {
      description:
        "어몽어스, 코로나 시절 때 많이 했는데 말이죠. 전선 색깔 맞춰 쭉 연결하면 되는데, 급하면 꼭 손이 꼬입니다.",
      imageAlt: "어몽어스 전선 작업 배경",
      imageSrc: "/games/among-us/images/background.png",
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
      description: "언더테일의 샌즈, 아시는구나! 겁.나.어.렵.습.니.다.",
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
      description:
        "오목은 한 수만 잘 놓아도 바로 끝납니다. 흰돌 차례예요. 어디에 둬야 다섯 개가 이어질까요?",
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
      description:
        "젤다의 전설: 스카이워드 소드입니다. 마스터소드로 여신의 벽에 문양을 그리면 폭탄이 나와요.",
      imageAlt: "젤다 원 그리기 배경",
      imageSrc: "/games/zelda/images/background.png",
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
      description:
        "시간의 오카리나에서는 짧은 멜로디 하나가 문을 열고 날씨도 바꿉니다. 악보를 보고 정확히 연주해보세요.",
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
    beatCount: 12,
    canvas: "geometryDashSpikes",
    microscope: {
      description:
        "지오메트리 대시는 보기엔 단순한데 한 번 삐끗하면 바로 끝입니다. Stereo Madness, 다들 아시나요?",
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
    beatCount: 12,
    canvas: "cookieRun",
    microscope: {
      description:
        "쿠키런은 달리기만 하면 끝이 아니죠. 뛰고, 숙이고, 또 뛰고... 쿠키들의 반란이 시작된다!",
      imageAlt: "쿠키런 배경",
      imageSrc: "/games/cookie-run/images/background.png",
    },
    control: "arrowAndSpace",
    id: "cookie-run-obstacle-dodge",
    startPrompt: "달려라!",
    title: "쿠키런",
    type: "normal",
  },

  {
    beatCount: 12,
    canvas: "crazyArcade",
    microscope: {
      description:
        "크레이지 아케이드 하면 물풍선이죠. 추억이네요. 다들 드림서버였나요, 해피서버였나요?",
      imageAlt: "크레이지 아케이드 배경",
      imageSrc: "/games/crazy-arcade/images/background.png",
    },
    control: "arrowAndSpace",
    id: "crazy-arcade-water-bomb",
    startPrompt: "물폭탄을 설치해라!",
    title: "크레이지 아케이드",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "chromeDinoSpace",
    microscope: {
      description:
        "인터넷 안 될 때 나타나는 그 공룡, 다들 한 번쯤 뛰어봤죠? 선인장이 오면 생각보다 빨리 스페이스를 눌러야 해요.",
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
      description:
        "테트리스에서 긴 막대 기다린 적 있나요? 드디어 왔습니다. 이제 제대로 꽂아서 네 줄을 지워야 해요.",
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
    canvas: "pokemonTyping",
    microscope: {
      description:
        "피카츄, 라이츄, 파이리, 꼬부기... 다들 포켓몬 아시나요? 빠르게 포켓몬 이름을 맞춰야 해요. 아, 얘 이름이 뭐였더라?",
      imageAlt: "포켓몬 도감 배경",
      imageSrc: "/games/pokemon/images/pokedex-background.png",
    },
    control: "koreanKeyboard",
    id: "pokemon-name-typing",
    startPrompt: "이 포켓몬의 이름은?",
    title: "포켓몬",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "pongSurvival",
    microscope: {
      description:
        "퐁은 공 하나가 전부인 게임인데, 놓치는 순간 바로 끝입니다. 위아래로 패들을 움직여 짧은 랠리를 버텨보세요.",
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
      description:
        "플래피버드, 너무 어려운 게임입니다. 파이프 사이를 통과하려고 누르다 보면 손이 자꾸 급해져요.",
      imageAlt: "플래피버드",
      imageSrc: "/games/flappy-bird/images/bird.png",
    },
    control: "space",
    id: "flappy-bird-pipe-dodge",
    startPrompt: "파이프를 피해라!",
    title: "플래피버드",
    type: "normal",
  },

  {
    beatCount: 10,
    canvas: "pianoMelody",
    microscope: {
      description:
        "피아노는 쉬운 음도 순서가 꼬이면 바로 헷갈립니다. 방금 들은 멜로디를 기억해서 숫자키로 다시 눌러보세요.",
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
    beatCount: 12,
    canvas: "hancomTyping",
    microscope: {
      description:
        "한컴 타자 연습하던 시절 기억나나요? 단어가 내려오기 전에 빠르게 치면 되는데, 오타 하나가 꽤 아픕니다.",
      imageAlt: "한컴 타자 배경",
      imageSrc: "/games/hancom/images/background.png",
    },
    control: "koreanKeyboard",
    id: "hancom-word-typing",
    startPrompt: "단어를 입력해라!",
    title: "한컴 타자연습",
    type: "normal",
  },

  {
    beatCount: 8,
    canvas: "wiiSportsDualPress",
    microscope: {
      description:
        "Wii Sports를 해보셨나요? A와 B를 둘 다 눌러 게임을 시작하세요.",
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
    beatCount: 42,
    canvas: "twoThousandFortyEightBoss",
    microscope: {
      description:
        "2048은 한 번 밀면 판이 확 바뀌죠. 같은 숫자를 합쳐 32를 만들어야 하는데, 판이 꽉 막히면 바로 끝입니다.",
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
      description:
        "다들 동물농장을 아시나요? 샤르릉 뿌뿡 뿍짝뿍짝 사람이 되어라 얍~!",
      imageAlt: "동물농장 배경",
      imageSrc: "/games/animal-farm/images/background.png",
    },
    control: "koreanKeyboard",
    id: "animal-farm-reverse-typing",
    startPrompt: "단어를 거꾸로 써라!",
    title: "동물농장",
    type: "boss",
  },

  {
    beatCount: 36,
    canvas: "kartriderCourse",
    microscope: {
      description:
        "카트라이더는 속도보다 라인을 잡는 게 더 어렵죠. 벽에 박지 말고 빌리지 운하 코스를 끝까지 달려야 합니다.",
      imageAlt: "카트라이더 운하 코스",
      imageSrc: "/games/kartrider/images/track.png",
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
      description:
        "할리갈리는 종 치는 손이 빠른 사람이 이깁니다. 과일이 다섯 개가 되는 순간, 고민하지 말고 눌러야 해요.",
      imageAlt: "할리갈리 종",
      imageSrc: "/games/halli-galli/images/bell.png",
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

export function isMicrogameClearKey(
  control: MicrogameControl,
  event: KeyboardEvent,
) {
  if (control === "arrowKeys") {
    return ["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(
      event.key,
    );
  }

  if (control === "space") {
    return event.code === "Space";
  }

  if (control === "arrowAndSpace") {
    return (
      event.code === "Space" ||
      ["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key)
    );
  }

  if (control === "numberKeys") {
    return /^\d$/.test(event.key);
  }

  if (control === "koreanKeyboard") {
    return /^[ㄱ-ㅎㅏ-ㅣ가-힣]$/.test(event.key);
  }

  return false;
}
