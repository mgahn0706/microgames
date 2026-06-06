const ENGLISH_TO_DUBEOLSI_CONSONANTS = {
  E: "ㄸ",
  Q: "ㅃ",
  R: "ㄲ",
  T: "ㅆ",
  W: "ㅉ",
  a: "ㅁ",
  b: "ㅠ",
  c: "ㅊ",
  d: "ㅇ",
  e: "ㄷ",
  f: "ㄹ",
  g: "ㅎ",
  q: "ㅂ",
  r: "ㄱ",
  s: "ㄴ",
  t: "ㅅ",
  v: "ㅍ",
  w: "ㅈ",
  x: "ㅌ",
  z: "ㅋ",
} as const;

const ENGLISH_TO_DUBEOLSI_VOWELS = {
  O: "ㅒ",
  P: "ㅖ",
  h: "ㅗ",
  i: "ㅑ",
  j: "ㅓ",
  k: "ㅏ",
  l: "ㅣ",
  n: "ㅜ",
  o: "ㅐ",
  p: "ㅔ",
  u: "ㅕ",
  y: "ㅛ",
} as const;

const COMPAT_CONSONANT_TO_INITIAL_INDEX = {
  ㄱ: 0,
  ㄲ: 1,
  ㄴ: 2,
  ㄷ: 3,
  ㄸ: 4,
  ㄹ: 5,
  ㅁ: 6,
  ㅂ: 7,
  ㅃ: 8,
  ㅅ: 9,
  ㅆ: 10,
  ㅇ: 11,
  ㅈ: 12,
  ㅉ: 13,
  ㅊ: 14,
  ㅋ: 15,
  ㅌ: 16,
  ㅍ: 17,
  ㅎ: 18,
} as const;

const COMPAT_VOWEL_TO_MEDIAL_INDEX = {
  ㅏ: 0,
  ㅐ: 1,
  ㅑ: 2,
  ㅒ: 3,
  ㅓ: 4,
  ㅔ: 5,
  ㅕ: 6,
  ㅖ: 7,
  ㅗ: 8,
  ㅘ: 9,
  ㅙ: 10,
  ㅚ: 11,
  ㅛ: 12,
  ㅜ: 13,
  ㅝ: 14,
  ㅞ: 15,
  ㅟ: 16,
  ㅠ: 17,
  ㅡ: 18,
  ㅢ: 19,
  ㅣ: 20,
} as const;

const COMPAT_CONSONANT_TO_FINAL_INDEX = {
  ㄱ: 1,
  ㄲ: 2,
  ㄳ: 3,
  ㄴ: 4,
  ㄵ: 5,
  ㄶ: 6,
  ㄷ: 7,
  ㄹ: 8,
  ㄺ: 9,
  ㄻ: 10,
  ㄼ: 11,
  ㄽ: 12,
  ㄾ: 13,
  ㄿ: 14,
  ㅀ: 15,
  ㅁ: 16,
  ㅂ: 17,
  ㅄ: 18,
  ㅅ: 19,
  ㅆ: 20,
  ㅇ: 21,
  ㅈ: 22,
  ㅊ: 23,
  ㅋ: 24,
  ㅌ: 25,
  ㅍ: 26,
  ㅎ: 27,
} as const;

const COMPOUND_FINALS = {
  ㄱㅅ: "ㄳ",
  ㄴㅈ: "ㄵ",
  ㄴㅎ: "ㄶ",
  ㄹㄱ: "ㄺ",
  ㄹㅁ: "ㄻ",
  ㄹㅂ: "ㄼ",
  ㄹㅅ: "ㄽ",
  ㄹㅌ: "ㄾ",
  ㄹㅍ: "ㄿ",
  ㄹㅎ: "ㅀ",
  ㅂㅅ: "ㅄ",
} as const;

const SPLIT_COMPOUND_FINALS = {
  ㄳ: ["ㄱ", "ㅅ"],
  ㄵ: ["ㄴ", "ㅈ"],
  ㄶ: ["ㄴ", "ㅎ"],
  ㄺ: ["ㄹ", "ㄱ"],
  ㄻ: ["ㄹ", "ㅁ"],
  ㄼ: ["ㄹ", "ㅂ"],
  ㄽ: ["ㄹ", "ㅅ"],
  ㄾ: ["ㄹ", "ㅌ"],
  ㄿ: ["ㄹ", "ㅍ"],
  ㅀ: ["ㄹ", "ㅎ"],
  ㅄ: ["ㅂ", "ㅅ"],
} as const;

const COMPOUND_VOWELS = {
  ㅗㅏ: "ㅘ",
  ㅗㅐ: "ㅙ",
  ㅗㅣ: "ㅚ",
  ㅜㅓ: "ㅝ",
  ㅜㅔ: "ㅞ",
  ㅜㅣ: "ㅟ",
  ㅡㅣ: "ㅢ",
} as const;

function isInitialConsonant(value: string) {
  return value in COMPAT_CONSONANT_TO_INITIAL_INDEX;
}

function isMedialVowel(value: string) {
  return value in COMPAT_VOWEL_TO_MEDIAL_INDEX;
}

function isFinalConsonant(value: string) {
  return value in COMPAT_CONSONANT_TO_FINAL_INDEX;
}

function composeHangulSyllable(initial: string, medial: string, final = "") {
  const initialIndex =
    COMPAT_CONSONANT_TO_INITIAL_INDEX[
      initial as keyof typeof COMPAT_CONSONANT_TO_INITIAL_INDEX
    ];
  const medialIndex =
    COMPAT_VOWEL_TO_MEDIAL_INDEX[
      medial as keyof typeof COMPAT_VOWEL_TO_MEDIAL_INDEX
    ];
  const finalIndex = final
    ? COMPAT_CONSONANT_TO_FINAL_INDEX[
        final as keyof typeof COMPAT_CONSONANT_TO_FINAL_INDEX
      ]
    : 0;

  if (
    initialIndex === undefined ||
    medialIndex === undefined ||
    finalIndex === undefined
  ) {
    return `${initial}${medial}${final}`;
  }

  return String.fromCharCode(
    0xac00 + (initialIndex * 21 + medialIndex) * 28 + finalIndex,
  );
}

function combineVowels(first: string, second: string) {
  return COMPOUND_VOWELS[`${first}${second}` as keyof typeof COMPOUND_VOWELS];
}

function combineFinals(first: string, second: string) {
  return COMPOUND_FINALS[`${first}${second}` as keyof typeof COMPOUND_FINALS];
}

function mapEnglishToDubeolsi(value: string) {
  return value
    .split("")
    .map(
      (character) =>
        ENGLISH_TO_DUBEOLSI_CONSONANTS[
          character as keyof typeof ENGLISH_TO_DUBEOLSI_CONSONANTS
        ] ??
        ENGLISH_TO_DUBEOLSI_VOWELS[
          character as keyof typeof ENGLISH_TO_DUBEOLSI_VOWELS
        ] ??
        ENGLISH_TO_DUBEOLSI_CONSONANTS[
          character.toLowerCase() as keyof typeof ENGLISH_TO_DUBEOLSI_CONSONANTS
        ] ??
        ENGLISH_TO_DUBEOLSI_VOWELS[
          character.toLowerCase() as keyof typeof ENGLISH_TO_DUBEOLSI_VOWELS
        ] ??
        character,
    );
}

function composeJamo(jamo: readonly string[]) {
  const output: string[] = [];
  let index = 0;

  while (index < jamo.length) {
    const initial = jamo[index];
    const next = jamo[index + 1];

    if (!isInitialConsonant(initial) || !next || !isMedialVowel(next)) {
      output.push(initial);
      index += 1;
      continue;
    }

    let medial = next;
    let cursor = index + 2;
    const combinedMedial = jamo[cursor]
      ? combineVowels(medial, jamo[cursor])
      : undefined;

    if (combinedMedial) {
      medial = combinedMedial;
      cursor += 1;
    }

    let final = "";
    const finalCandidate = jamo[cursor];

    if (finalCandidate && isFinalConsonant(finalCandidate)) {
      const following = jamo[cursor + 1];

      if (following && isMedialVowel(following)) {
        output.push(composeHangulSyllable(initial, medial));
        index = cursor;
        continue;
      }

      const compoundFinal = jamo[cursor + 1]
        ? combineFinals(finalCandidate, jamo[cursor + 1])
        : undefined;

      if (compoundFinal) {
        const afterCompound = jamo[cursor + 2];

        if (afterCompound && isMedialVowel(afterCompound)) {
          const splitFinal =
            SPLIT_COMPOUND_FINALS[
              compoundFinal as keyof typeof SPLIT_COMPOUND_FINALS
            ];

          output.push(composeHangulSyllable(initial, medial, splitFinal[0]));
          index = cursor + 1;
          continue;
        }

        final = compoundFinal;
        cursor += 2;
      } else {
        final = finalCandidate;
        cursor += 1;
      }
    }

    output.push(composeHangulSyllable(initial, medial, final));
    index = cursor;
  }

  return output.join("");
}

export function convertEnglishKeyboardInputToKorean(value: string) {
  return composeJamo(mapEnglishToDubeolsi(value));
}
