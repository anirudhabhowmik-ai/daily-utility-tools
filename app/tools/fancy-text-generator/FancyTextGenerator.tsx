"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type Category =
  | "Bold"
  | "Italic"
  | "Script"
  | "Gothic"
  | "Bubble"
  | "Boxed"
  | "Lines"
  | "Marks"
  | "Mini"
  | "Cute"
  | "Aesthetic"
  | "Glitch"
  | "Flip"
  | "Math"
  | "Wide"
  | "Code"
  | "Other";

type CategoryFilter = "All" | Category;
type Support = "wide" | "limited";
type Tab = "styles" | "symbols" | "ideas" | "recent";
type CaseMode = "as-typed" | "lower" | "upper" | "title" | "sentence";
type SortMode = "popular" | "az" | "category";
type Theme = "light" | "dark";
type SymbolMode = "insert" | "copy";
type Density = "comfortable" | "compact";
type ViewMode = "list" | "grid";

type FancyStyle = {
  id: string;
  name: string;
  category: Category;
  support: Support;
  convert: (text: string) => string;
};

type RecentItem = { text: string; style: string; at: number };

type Persisted = {
  favorites: string[];
  recents: RecentItem[];
  theme: Theme | null;
  decorationId: string;
  customBefore: string;
  customAfter: string;
  caseMode: CaseMode;
  platformId: string;
  sort: SortMode;
  activeId: string;
  density: Density;
  effectId: string;
  view: ViewMode;
  supportOnly: boolean;
};

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "toolsab-fancy-text-v4";
const MAX_CHARS = 1200;

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* -------------------------------------------------------------------------- */
/*  Conversion helpers                                                        */
/* -------------------------------------------------------------------------- */

type Convert = (text: string) => string;

type MathOptions = {
  upper?: number;
  lower?: number;
  digit?: number;
  exceptions?: Record<string, string>;
};

function math({ upper, lower, digit, exceptions = {} }: MathOptions): Convert {
  return (text) =>
    Array.from(text)
      .map((character) => {
        if (exceptions[character]) return exceptions[character];
        const code = character.codePointAt(0)!;
        if (upper !== undefined && code >= 65 && code <= 90) {
          return String.fromCodePoint(upper + code - 65);
        }
        if (lower !== undefined && code >= 97 && code <= 122) {
          return String.fromCodePoint(lower + code - 97);
        }
        if (digit !== undefined && code >= 48 && code <= 57) {
          return String.fromCodePoint(digit + code - 48);
        }
        return character;
      })
      .join("");
}

function table(map: Record<string, string>, foldCase = false): Convert {
  return (text) =>
    Array.from(text)
      .map(
        (character) =>
          map[character] ??
          (foldCase ? map[character.toLowerCase()] : undefined) ??
          character,
      )
      .join("");
}

function digitMap(list: string[]): Convert {
  return (text) => text.replace(/[0-9]/g, (digit) => list[Number(digit)]);
}

function pipe(...fns: Convert[]): Convert {
  return (text) => fns.reduce((acc, fn) => fn(acc), text);
}

function combine(mark: string): Convert {
  return (text) =>
    Array.from(text)
      .map((character) => (/\s/.test(character) ? character : character + mark))
      .join("");
}

function interleave(mark: string): Convert {
  return (text) =>
    text
      .split(/(\s+)/)
      .map((part) =>
        /^\s+$/.test(part) || part === "" ? part : Array.from(part).join(mark),
      )
      .join("");
}

function wrapEach(before: string, after: string): Convert {
  return (text) =>
    Array.from(text)
      .map((character) =>
        /\s/.test(character) ? character : `${before}${character}${after}`,
      )
      .join("");
}

function frame(before: string, after: string): Convert {
  return (text) => `${before}${text}${after}`;
}

const ZALGO_UP = [
  0x0300, 0x0301, 0x0302, 0x0303, 0x0304, 0x0305, 0x0306, 0x0307, 0x0308,
  0x030a, 0x030b, 0x030c, 0x0312, 0x0313, 0x0314, 0x033d, 0x033e, 0x033f,
  0x0346, 0x034a, 0x034b, 0x034c, 0x0350, 0x0351, 0x0352, 0x0357, 0x035b,
  0x0363, 0x0364, 0x0365,
];

const ZALGO_DOWN = [
  0x0316, 0x0317, 0x0318, 0x0319, 0x031c, 0x031d, 0x031e, 0x031f, 0x0320,
  0x0324, 0x0325, 0x0326, 0x0329, 0x032a, 0x032b, 0x032c, 0x032d, 0x032e,
  0x032f, 0x0330, 0x0331, 0x0332, 0x0333, 0x0339, 0x033a, 0x033b, 0x033c,
  0x0345, 0x0347, 0x0348, 0x0349, 0x034d, 0x034e,
];

function glitch(level: number, mode: "both" | "up" | "down" = "both"): Convert {
  return (text) => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    return Array.from(text)
      .map((character) => {
        if (/\s/.test(character)) return character;
        let output = character;
        const up =
          mode === "down" ? 0 : Math.max(1, Math.round(random() * level));
        const down =
          mode === "up"
            ? 0
            : Math.max(
                mode === "down" ? 1 : 0,
                Math.round(random() * level * 0.7),
              );
        for (let i = 0; i < up; i++) {
          output += String.fromCodePoint(
            ZALGO_UP[Math.floor(random() * ZALGO_UP.length)],
          );
        }
        for (let i = 0; i < down; i++) {
          output += String.fromCodePoint(
            ZALGO_DOWN[Math.floor(random() * ZALGO_DOWN.length)],
          );
        }
        return output;
      })
      .join("");
  };
}

function applyCase(text: string, mode: CaseMode) {
  if (mode === "lower") return text.toLowerCase();
  if (mode === "upper") return text.toUpperCase();
  if (mode === "title") {
    return text
      .toLowerCase()
      .replace(
        /(^|\s)(\p{L})/gu,
        (_match, space: string, letter: string) => space + letter.toUpperCase(),
      );
  }
  if (mode === "sentence") {
    const lowered = text.toLowerCase();
    return lowered.replace(/(^\s*\p{L})|([.!?]\s+\p{L})/gu, (match) =>
      match.toUpperCase(),
    );
  }
  return text;
}

function clampText(text: string) {
  const characters = Array.from(text);
  return characters.length > MAX_CHARS
    ? characters.slice(0, MAX_CHARS).join("")
    : text;
}

/* -------------------------------------------------------------------------- */
/*  Character tables                                                          */
/* -------------------------------------------------------------------------- */

const smallCapsMap: Record<string, string> = {
  a: "ᴀ",
  b: "ʙ",
  c: "ᴄ",
  d: "ᴅ",
  e: "ᴇ",
  f: "ꜰ",
  g: "ɢ",
  h: "ʜ",
  i: "ɪ",
  j: "ᴊ",
  k: "ᴋ",
  l: "ʟ",
  m: "ᴍ",
  n: "ɴ",
  o: "ᴏ",
  p: "ᴘ",
  q: "ǫ",
  r: "ʀ",
  s: "ꜱ",
  t: "ᴛ",
  u: "ᴜ",
  v: "ᴠ",
  w: "ᴡ",
  x: "x",
  y: "ʏ",
  z: "ᴢ",
};

const superscriptMap: Record<string, string> = {
  a: "ᵃ",
  b: "ᵇ",
  c: "ᶜ",
  d: "ᵈ",
  e: "ᵉ",
  f: "ᶠ",
  g: "ᵍ",
  h: "ʰ",
  i: "ⁱ",
  j: "ʲ",
  k: "ᵏ",
  l: "ˡ",
  m: "ᵐ",
  n: "ⁿ",
  o: "ᵒ",
  p: "ᵖ",
  r: "ʳ",
  s: "ˢ",
  t: "ᵗ",
  u: "ᵘ",
  v: "ᵛ",
  w: "ʷ",
  x: "ˣ",
  y: "ʸ",
  z: "ᶻ",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
};

const superCapsMap: Record<string, string> = {
  A: "ᴬ",
  B: "ᴮ",
  C: "ᶜ",
  D: "ᴰ",
  E: "ᴱ",
  F: "ᶠ",
  G: "ᴳ",
  H: "ᴴ",
  I: "ᴵ",
  J: "ᴶ",
  K: "ᴷ",
  L: "ᴸ",
  M: "ᴹ",
  N: "ᴺ",
  O: "ᴼ",
  P: "ᴾ",
  Q: "Q",
  R: "ᴿ",
  S: "ˢ",
  T: "ᵀ",
  U: "ᵁ",
  V: "ⱽ",
  W: "ᵂ",
  X: "ˣ",
  Y: "ʸ",
  Z: "ᶻ",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

const subscriptMap: Record<string, string> = {
  a: "ₐ",
  e: "ₑ",
  h: "ₕ",
  i: "ᵢ",
  j: "ⱼ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",
  p: "ₚ",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
};

const upsideDownMap: Record<string, string> = {
  a: "ɐ",
  b: "q",
  c: "ɔ",
  d: "p",
  e: "ǝ",
  f: "ɟ",
  g: "ƃ",
  h: "ɥ",
  i: "ᴉ",
  j: "ɾ",
  k: "ʞ",
  l: "ן",
  m: "ɯ",
  n: "u",
  o: "o",
  p: "d",
  q: "b",
  r: "ɹ",
  s: "s",
  t: "ʇ",
  u: "n",
  v: "ʌ",
  w: "ʍ",
  x: "x",
  y: "ʎ",
  z: "z",
  A: "∀",
  B: "ᗺ",
  C: "Ɔ",
  D: "ᗡ",
  E: "Ǝ",
  F: "Ⅎ",
  G: "⅁",
  H: "H",
  I: "I",
  J: "ſ",
  K: "⋊",
  L: "⅂",
  M: "W",
  N: "N",
  O: "O",
  P: "Ԁ",
  Q: "Ό",
  R: "ᴚ",
  S: "S",
  T: "⊥",
  U: "∩",
  V: "Λ",
  W: "M",
  X: "X",
  Y: "⅄",
  Z: "Z",
  "1": "⇂",
  "2": "ᄅ",
  "3": "Ɛ",
  "4": "ㄣ",
  "5": "ϛ",
  "6": "9",
  "7": "ㄥ",
  "8": "8",
  "9": "6",
  "0": "0",
  ".": "˙",
  ",": "'",
  "'": ",",
  "?": "¿",
  "!": "¡",
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "<": ">",
  ">": "<",
  "&": "⅋",
  _: "‾",
};

const greekMixMap: Record<string, string> = {
  a: "α",
  b: "в",
  c: "¢",
  d: "∂",
  e: "є",
  f: "ƒ",
  g: "g",
  h: "н",
  i: "ι",
  j: "נ",
  k: "к",
  l: "ℓ",
  m: "м",
  n: "η",
  o: "σ",
  p: "ρ",
  q: "q",
  r: "я",
  s: "ѕ",
  t: "т",
  u: "υ",
  v: "ν",
  w: "ω",
  x: "χ",
  y: "γ",
  z: "z",
};

const cyrillicMixMap: Record<string, string> = {
  a: "а",
  b: "б",
  c: "ц",
  d: "д",
  e: "е",
  f: "ф",
  g: "г",
  h: "н",
  i: "и",
  j: "й",
  k: "к",
  l: "л",
  m: "н",
  n: "н",
  o: "о",
  p: "п",
  q: "к",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  w: "щ",
  x: "х",
  y: "у",
  z: "з",
};

const runicMap: Record<string, string> = {
  a: "ᚨ",
  b: "ᛒ",
  c: "ᚲ",
  d: "ᛞ",
  e: "ᛖ",
  f: "ᚠ",
  g: "ᚷ",
  h: "ᚺ",
  i: "ᛁ",
  j: "ᛃ",
  k: "ᚲ",
  l: "ᛚ",
  m: "ᛗ",
  n: "ᚾ",
  o: "ᛟ",
  p: "ᛈ",
  q: "ᛩ",
  r: "ᚱ",
  s: "ᛊ",
  t: "ᛏ",
  u: "ᚢ",
  v: "ᚡ",
  w: "ᚹ",
  x: "ᛪ",
  y: "ᛦ",
  z: "ᛎ",
};

const dottedAccentMap: Record<string, string> = {
  a: "ä",
  b: "ḅ",
  c: "ċ",
  d: "ḋ",
  e: "ë",
  f: "ḟ",
  g: "ġ",
  h: "ḧ",
  i: "ï",
  j: "ĵ",
  k: "ḳ",
  l: "ḷ",
  m: "ṁ",
  n: "ṅ",
  o: "ö",
  p: "ṗ",
  q: "q",
  r: "ṙ",
  s: "ṡ",
  t: "ẗ",
  u: "ü",
  v: "ṿ",
  w: "ẅ",
  x: "ẍ",
  y: "ÿ",
  z: "ż",
};

const lookalikeMap: Record<string, string> = {
  a: "ą",
  b: "ɓ",
  c: "ƈ",
  d: "ɖ",
  e: "ɛ",
  f: "ʄ",
  g: "ɠ",
  h: "ɧ",
  i: "ı",
  j: "ʝ",
  k: "ƙ",
  l: "ʅ",
  m: "ʍ",
  n: "ŋ",
  o: "օ",
  p: "ƥ",
  q: "զ",
  r: "ʀ",
  s: "ʂ",
  t: "ȶ",
  u: "ų",
  v: "ʋ",
  w: "ա",
  x: "Ҳ",
  y: "ʏ",
  z: "ȥ",
};

const smoothMixMap: Record<string, string> = {
  a: "ǟ",
  b: "ɮ",
  c: "ƈ",
  d: "ɖ",
  e: "ɛ",
  f: "ʄ",
  g: "ɢ",
  h: "ɦ",
  i: "ɨ",
  j: "ʝ",
  k: "ӄ",
  l: "ʟ",
  m: "ʍ",
  n: "ռ",
  o: "օ",
  p: "ք",
  q: "զ",
  r: "ʀ",
  s: "ֆ",
  t: "ȶ",
  u: "ʊ",
  v: "ʋ",
  w: "ա",
  x: "ӿ",
  y: "ʏ",
  z: "ʐ",
};

const curvyMap: Record<string, string> = {
  a: "ᗩ",
  b: "ᗷ",
  c: "ᑕ",
  d: "ᗪ",
  e: "ᗴ",
  f: "ᖴ",
  g: "ᘜ",
  h: "ᕼ",
  i: "ᓰ",
  j: "ᒚ",
  k: "ᛕ",
  l: "ᒪ",
  m: "ᗰ",
  n: "ᑎ",
  o: "ᗝ",
  p: "ᑭ",
  q: "ᑫ",
  r: "ᖇ",
  s: "ᔕ",
  t: "丅",
  u: "ᑌ",
  v: "ᐯ",
  w: "ᗯ",
  x: "᙭",
  y: "Ꭹ",
  z: "ᘔ",
};

const blockMap: Record<string, string> = {
  a: "卂",
  b: "乃",
  c: "匚",
  d: "ᗪ",
  e: "乇",
  f: "下",
  g: "Ꮆ",
  h: "卄",
  i: "丨",
  j: "丿",
  k: "Ҝ",
  l: "ㄥ",
  m: "爪",
  n: "刀",
  o: "口",
  p: "尸",
  q: "Ɋ",
  r: "尺",
  s: "丂",
  t: "丅",
  u: "ㄩ",
  v: "ᐯ",
  w: "山",
  x: "乂",
  y: "ㄚ",
  z: "乙",
};

const currencyMap: Record<string, string> = {
  a: "₳",
  b: "฿",
  c: "₵",
  d: "₫",
  e: "Ɇ",
  f: "₣",
  g: "₲",
  h: "Ħ",
  i: "ł",
  j: "J",
  k: "₭",
  l: "Ⱡ",
  m: "₥",
  n: "₦",
  o: "Ø",
  p: "₱",
  q: "Q",
  r: "Ɽ",
  s: "$",
  t: "₮",
  u: "Ʉ",
  v: "V",
  w: "₩",
  x: "Ӿ",
  y: "¥",
  z: "Ƶ",
};

const brailleMap: Record<string, string> = {
  a: "⠁",
  b: "⠃",
  c: "⠉",
  d: "⠙",
  e: "⠑",
  f: "⠋",
  g: "⠛",
  h: "⠓",
  i: "⠊",
  j: "⠚",
  k: "⠅",
  l: "⠇",
  m: "⠍",
  n: "⠝",
  o: "⠕",
  p: "⠏",
  q: "⠟",
  r: "⠗",
  s: "⠎",
  t: "⠞",
  u: "⠥",
  v: "⠧",
  w: "⠺",
  x: "⠭",
  y: "⠽",
  z: "⠵",
};

const morseMap: Record<string, string> = {
  a: ".-",
  b: "-...",
  c: "-.-.",
  d: "-..",
  e: ".",
  f: "..-.",
  g: "--.",
  h: "....",
  i: "..",
  j: ".---",
  k: "-.-",
  l: ".-..",
  m: "--",
  n: "-.",
  o: "---",
  p: ".--.",
  q: "--.-",
  r: ".-.",
  s: "...",
  t: "-",
  u: "..-",
  v: "...-",
  w: ".--",
  x: "-..-",
  y: "-.--",
  z: "--..",
  "0": "-----",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
};

const leetMap: Record<string, string> = {
  a: "4",
  b: "8",
  e: "3",
  g: "9",
  i: "1",
  o: "0",
  s: "5",
  t: "7",
};

const circledDigits = ["⓪", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];
const negativeCircledDigits = [
  "⓿",
  "❶",
  "❷",
  "❸",
  "❹",
  "❺",
  "❻",
  "❼",
  "❽",
  "❾",
];
const parenthesizedDigits = ["0", "⑴", "⑵", "⑶", "⑷", "⑸", "⑹", "⑺", "⑻", "⑼"];
const doubleStruckDigits = ["𝟘", "𝟙", "𝟚", "𝟛", "𝟜", "𝟝", "𝟞", "𝟟", "𝟠", "𝟡"];
const sansDigitList = ["𝟢", "𝟣", "𝟤", "𝟥", "𝟦", "𝟧", "𝟨", "𝟩", "𝟪", "𝟫"];
const mathBoldDigits = ["𝟎", "𝟏", "𝟐", "𝟑", "𝟒", "𝟓", "𝟔", "𝟕", "𝟖", "𝟗"];

/* --- FIX A: explicit tables for enclosed alphanumerics ------------------- */

const negativeCircledMap: Record<string, string> = {
  A: "🅐",
  B: "🅑",
  C: "🅒",
  D: "🅓",
  E: "🅔",
  F: "🅕",
  G: "🅖",
  H: "🅗",
  I: "🅘",
  J: "🅙",
  K: "🅚",
  L: "🅛",
  M: "🅜",
  N: "🅝",
  O: "🅞",
  P: "🅟",
  Q: "🅠",
  R: "🅡",
  S: "🅢",
  T: "🅣",
  U: "🅤",
  V: "🅥",
  W: "🅦",
  X: "🅧",
  Y: "🅨",
  Z: "🅩",
};

const squaredMap: Record<string, string> = {
  A: "🄰",
  B: "🄱",
  C: "🄲",
  D: "🄳",
  E: "🄴",
  F: "🄵",
  G: "🄶",
  H: "🄷",
  I: "🄸",
  J: "🄹",
  K: "🄺",
  L: "🄻",
  M: "🄼",
  N: "🄽",
  O: "🄾",
  P: "🄿",
  Q: "🅀",
  R: "🅁",
  S: "🅂",
  T: "🅃",
  U: "🅄",
  V: "🅅",
  W: "🅆",
  X: "🅇",
  Y: "🅈",
  Z: "🅉",
};

const negativeSquaredMap: Record<string, string> = {
  A: "🅰",
  B: "🅱",
  C: "🅲",
  D: "🅳",
  E: "🅴",
  F: "🅵",
  G: "🅶",
  H: "🅷",
  I: "🅸",
  J: "🅹",
  K: "🅺",
  L: "🅻",
  M: "🅼",
  N: "🅽",
  O: "🅾",
  P: "🅿",
  Q: "🆀",
  R: "🆁",
  S: "🆂",
  T: "🆃",
  U: "🆄",
  V: "🆅",
  W: "🆆",
  X: "🆇",
  Y: "🆈",
  Z: "🆉",
};

/* -------------------------------------------------------------------------- */
/*  Reusable converters                                                       */
/* -------------------------------------------------------------------------- */

const boldC = math({ upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce });
const italicC = math({
  upper: 0x1d434,
  lower: 0x1d44e,
  exceptions: { h: "ℎ" },
});
const scriptC = math({
  upper: 0x1d49c,
  lower: 0x1d4b6,
  exceptions: {
    B: "ℬ",
    E: "ℰ",
    F: "ℱ",
    H: "ℋ",
    I: "ℐ",
    L: "ℒ",
    M: "ℳ",
    R: "ℛ",
    e: "ℯ",
    g: "ℊ",
    o: "ℴ",
  },
});
const frakturC = math({
  upper: 0x1d504,
  lower: 0x1d51e,
  exceptions: { C: "ℭ", H: "ℌ", I: "ℑ", R: "ℜ", Z: "ℨ" },
});
const doubleStruckC = pipe(
  math({
    upper: 0x1d538,
    lower: 0x1d552,
    exceptions: { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" },
  }),
  digitMap(doubleStruckDigits),
);
const sansBoldC = math({ upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec });
const monoC = math({ upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 });
const circledC = pipe(
  math({ upper: 0x24b6, lower: 0x24d0 }),
  digitMap(circledDigits),
);
const smallCapsC = table(smallCapsMap, true);

const fullwidthC: Convert = (text) =>
  Array.from(text)
    .map((character) => {
      const code = character.codePointAt(0)!;
      if (code >= 33 && code <= 126) return String.fromCodePoint(code + 0xfee0);
      if (character === " ") return "\u3000";
      return character;
    })
    .join("");

const strike = combine("\u0336");
const underline = combine("\u0332");

const morseC: Convert = (text) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      Array.from(word.toLowerCase())
        .map((character) => morseMap[character] ?? character)
        .join(" "),
    )
    .join(" / ");

const binaryC: Convert = (text) =>
  Array.from(text)
    .filter((character) => !/\s/.test(character))
    .map((character) => character.codePointAt(0)!.toString(2).padStart(8, "0"))
    .join(" ");

const hexC: Convert = (text) =>
  Array.from(text)
    .filter((character) => !/\s/.test(character))
    .map((character) =>
      character.codePointAt(0)!.toString(16).toUpperCase().padStart(2, "0"),
    )
    .join(" ");

const rot13C: Convert = (text) =>
  text.replace(/[a-z]/gi, (letter) => {
    const base = letter <= "Z" ? 65 : 97;
    return String.fromCharCode(
      ((letter.charCodeAt(0) - base + 13) % 26) + base,
    );
  });

const randomCaseC: Convert = (text) => {
  let index = 0;
  return Array.from(text)
    .map((character) => {
      if (!/\p{L}/u.test(character)) return character;
      const upper = (index * 5 + (index % 3)) % 7 < 3;
      index += 1;
      return upper ? character.toUpperCase() : character.toLowerCase();
    })
    .join("");
};

const inverseCaseC: Convert = (text) =>
  Array.from(text)
    .map((character) =>
      character === character.toUpperCase()
        ? character.toLowerCase()
        : character.toUpperCase(),
    )
    .join("");

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

function style(
  id: string,
  name: string,
  category: Category,
  convert: Convert,
  support: Support = "wide",
): FancyStyle {
  return { id, name, category, support, convert };
}

const fancyStyles: FancyStyle[] = [
  /* ---- Core alphabets ---- */
  style("bold", "Bold", "Bold", boldC),
  style("italic", "Italic", "Italic", italicC),
  style(
    "bold-italic",
    "Bold italic",
    "Bold",
    math({ upper: 0x1d468, lower: 0x1d482 }),
  ),
  style(
    "sans",
    "Sans serif",
    "Other",
    math({ upper: 0x1d5a0, lower: 0x1d5ba, digit: 0x1d7e2 }),
  ),
  style("sans-bold", "Sans bold", "Bold", sansBoldC),
  style(
    "sans-italic",
    "Sans italic",
    "Italic",
    math({ upper: 0x1d608, lower: 0x1d622 }),
  ),
  style(
    "sans-bold-italic",
    "Sans bold italic",
    "Bold",
    math({ upper: 0x1d63c, lower: 0x1d656 }),
  ),
  style("monospace", "Monospace", "Other", monoC),

  /* ---- Fancy letterforms ---- */
  style("script", "Cursive script", "Script", scriptC),
  style(
    "bold-script",
    "Bold cursive",
    "Script",
    math({ upper: 0x1d4d0, lower: 0x1d4ea }),
  ),
  style("fraktur", "Gothic fraktur", "Gothic", frakturC),
  style(
    "bold-fraktur",
    "Bold gothic",
    "Gothic",
    math({ upper: 0x1d56c, lower: 0x1d586 }),
  ),
  style("double-struck", "Double struck", "Math", doubleStruckC),
  style(
    "math-bold-digits",
    "Math bold digits",
    "Math",
    pipe(math({ upper: 0x1d400, lower: 0x1d41a }), digitMap(mathBoldDigits)),
  ),
  style(
    "sans-digits",
    "Sans digits",
    "Math",
    pipe(math({ upper: 0x1d5a0, lower: 0x1d5ba }), digitMap(sansDigitList)),
  ),
  style("circled", "Circled letters", "Bubble", circledC),
  /* FIX A: explicit tables for non-contiguous enclosed alphanumerics */
  style(
    "negative-circled",
    "Black circles",
    "Bubble",
    pipe(table(negativeCircledMap, true), digitMap(negativeCircledDigits)),
    "limited",
  ),
  style(
    "squared",
    "Squared letters",
    "Boxed",
    table(squaredMap, true),
    "limited",
  ),
  style(
    "negative-squared",
    "Black squares",
    "Boxed",
    table(negativeSquaredMap, true),
    "limited",
  ),
  style(
    "parenthesized",
    "Parenthesized",
    "Boxed",
    pipe(
      math({ upper: 0x1f110, lower: 0x249c }),
      digitMap(parenthesizedDigits),
    ),
  ),
  style("bracketed", "Bracketed letters", "Boxed", wrapEach("【", "】")),
  style("bracketed-white", "White brackets", "Boxed", wrapEach("『", "』")),
  style("bracketed-angle", "Angle brackets", "Boxed", wrapEach("《", "》")),
  style("bracketed-square", "Square brackets", "Boxed", wrapEach("[", "]")),
  style("bracketed-corner", "Corner brackets", "Boxed", wrapEach("「", "」")),
  style(
    "bracketed-tortoise",
    "Tortoise brackets",
    "Boxed",
    wrapEach("〔", "〕"),
  ),
  style("bracketed-curly", "Curly braces", "Boxed", wrapEach("{", "}")),
  style("paren-wrapped", "Round brackets", "Boxed", wrapEach("(", ")")),
  style("pipe-wrapped", "Pipe wrapped", "Boxed", wrapEach("|", "|")),

  /* ---- Fullwidth / wide ---- */
  style("fullwidth", "Fullwidth", "Wide", fullwidthC),
  style("spaced", "Spaced letters", "Wide", (text) =>
    Array.from(text).join(" "),
  ),
  style("wide-spaced", "Wide spaced", "Wide", (text) =>
    Array.from(text).join("  "),
  ),
  style("ultra-spaced", "Ultra wide spaced", "Wide", (text) =>
    Array.from(text).join("   "),
  ),
  style("fullwidth-bold-ish", "Fullwidth spaced", "Wide", (text) =>
    Array.from(fullwidthC(text)).join(" "),
  ),
  style(
    "fullwidth-strike",
    "Fullwidth strikethrough",
    "Wide",
    pipe(fullwidthC, strike),
    "limited",
  ),

  /* ---- Mini ---- */
  style("small-caps", "Small caps", "Mini", smallCapsC),
  style(
    "small-caps-underline",
    "Small caps underline",
    "Mini",
    pipe(smallCapsC, underline),
    "limited",
  ),
  style("superscript", "Superscript", "Mini", table(superscriptMap, true)),
  style(
    "super-caps",
    "Superscript caps",
    "Mini",
    pipe((text) => text.toUpperCase(), table(superCapsMap)),
    "limited",
  ),
  style("subscript", "Subscript", "Mini", table(subscriptMap, true), "limited"),

  /* ---- Flip ---- */
  style(
    "upside-down",
    "Upside down",
    "Flip",
    (text) =>
      Array.from(text)
        .reverse()
        .map((character) => upsideDownMap[character] ?? character)
        .join(""),
    "limited",
  ),
  style("reversed", "Reversed", "Flip", (text) =>
    Array.from(text).reverse().join(""),
  ),
  style(
    "mirrored",
    "Mirrored",
    "Flip",
    (text) =>
      Array.from(text)
        .reverse()
        .map((character) => {
          const map: Record<string, string> = {
            b: "d",
            d: "b",
            p: "q",
            q: "p",
            "(": ")",
            ")": "(",
            "[": "]",
            "]": "[",
            "{": "}",
            "}": "{",
            "<": ">",
            ">": "<",
          };
          return map[character] ?? character;
        })
        .join(""),
    "limited",
  ),
  style("reverse-words", "Reverse word order", "Flip", (text) =>
    text.split(/(\s+)/).reverse().join(""),
  ),
  style("reverse-each-word", "Reverse each word", "Flip", (text) =>
    text
      .split(/(\s+)/)
      .map((part) =>
        /\s/.test(part) ? part : Array.from(part).reverse().join(""),
      )
      .join(""),
  ),

  /* ---- Line decorations ---- */
  style("strikethrough", "Strikethrough", "Lines", strike),
  style("short-strike", "Short strike", "Lines", combine("\u0335"), "limited"),
  style("slash", "Slash through", "Lines", combine("\u0338"), "limited"),
  style("underline", "Underline", "Lines", underline),
  style("double-underline", "Double underline", "Lines", combine("\u0333")),
  style("overline", "Overline", "Lines", combine("\u0305")),
  style(
    "double-overline",
    "Double overline",
    "Lines",
    combine("\u033f"),
    "limited",
  ),
  style(
    "tilde-through",
    "Tilde through",
    "Lines",
    combine("\u0334"),
    "limited",
  ),
  style("dotted-below", "Dotted below", "Lines", combine("\u0323"), "limited"),
  style("tilde-below", "Wavy underline", "Lines", combine("\u0330"), "limited"),
  style(
    "macron-below",
    "Soft underline",
    "Lines",
    combine("\u0331"),
    "limited",
  ),
  style(
    "double-strike",
    "Double strike",
    "Lines",
    combine("\u0336\u0336"),
    "limited",
  ),
  style(
    "strike-underline",
    "Strike and underline",
    "Lines",
    combine("\u0336\u0332"),
    "limited",
  ),
  style(
    "over-under",
    "Over and under line",
    "Lines",
    combine("\u0305\u0332"),
    "limited",
  ),

  /* ---- Combos: letterform + line ---- */
  style(
    "bold-strike",
    "Bold strikethrough",
    "Bold",
    pipe(boldC, strike),
    "limited",
  ),
  style(
    "bold-underline",
    "Bold underline",
    "Bold",
    pipe(boldC, underline),
    "limited",
  ),
  style(
    "sans-bold-underline",
    "Sans bold underline",
    "Bold",
    pipe(sansBoldC, underline),
    "limited",
  ),
  style(
    "italic-underline",
    "Italic underline",
    "Italic",
    pipe(italicC, underline),
    "limited",
  ),
  style(
    "italic-strike",
    "Italic strikethrough",
    "Italic",
    pipe(italicC, strike),
    "limited",
  ),
  style(
    "script-underline",
    "Script underline",
    "Script",
    pipe(scriptC, underline),
    "limited",
  ),
  style(
    "script-strike",
    "Script strikethrough",
    "Script",
    pipe(scriptC, strike),
    "limited",
  ),
  style(
    "fraktur-strike",
    "Gothic strikethrough",
    "Gothic",
    pipe(frakturC, strike),
    "limited",
  ),
  style(
    "mono-strike",
    "Monospace strikethrough",
    "Other",
    pipe(monoC, strike),
    "limited",
  ),
  style(
    "double-struck-underline",
    "Double struck underline",
    "Math",
    pipe(doubleStruckC, underline),
    "limited",
  ),
  style(
    "circled-underline",
    "Circled underline",
    "Bubble",
    pipe(circledC, underline),
    "limited",
  ),

  /* ---- Combining marks ---- */
  style("acute", "Acute accent", "Marks", combine("\u0301")),
  style("grave", "Grave accent", "Marks", combine("\u0300")),
  style("diaeresis", "Double dot above", "Marks", combine("\u0308")),
  style("dot-above", "Dot above", "Marks", combine("\u0307")),
  style("ring-above", "Ring above", "Marks", combine("\u030a")),
  style("caron", "Caron", "Marks", combine("\u030c"), "limited"),
  style("tilde-above", "Tilde above", "Marks", combine("\u0303")),
  style("double-acute", "Double acute", "Marks", combine("\u030b"), "limited"),
  style(
    "inverted-breve",
    "Inverted breve",
    "Marks",
    combine("\u0311"),
    "limited",
  ),
  style("arrow-above", "Arrow above", "Marks", combine("\u20d7"), "limited"),
  style("cross-above", "Cross above", "Marks", combine("\u033d"), "limited"),
  style("comma-above", "Comma above", "Marks", combine("\u0313"), "limited"),
  style("bridge-below", "Bridge below", "Marks", combine("\u032a"), "limited"),
  style("x-below", "X below", "Marks", combine("\u0353"), "limited"),
  style(
    "asterisk-below",
    "Asterisk below",
    "Marks",
    combine("\u0359"),
    "limited",
  ),
  style("plus-below", "Plus below", "Marks", combine("\u031f"), "limited"),
  style("ring-below", "Ring below", "Marks", combine("\u0325"), "limited"),
  style(
    "seagull-below",
    "Seagull below",
    "Marks",
    combine("\u033c"),
    "limited",
  ),
  style(
    "sparkle-marks",
    "Dots above and below",
    "Marks",
    combine("\u0307\u0323"),
    "limited",
  ),

  /* ---- Enclosing marks ---- */
  style(
    "circle-around",
    "Circle around",
    "Bubble",
    combine("\u20dd"),
    "limited",
  ),
  style(
    "square-around",
    "Square around",
    "Boxed",
    combine("\u20de"),
    "limited",
  ),
  style(
    "diamond-around",
    "Diamond around",
    "Boxed",
    combine("\u20df"),
    "limited",
  ),
  style(
    "triangle-around",
    "Triangle around",
    "Boxed",
    combine("\u20e4"),
    "limited",
  ),
  style("keycap", "Keycap", "Boxed", combine("\u20e3"), "limited"),
  style("prohibited", "Prohibited sign", "Boxed", combine("\u20e0"), "limited"),

  /* ---- Letter swaps ---- */
  style(
    "greek-mix",
    "Greek and Cyrillic mix",
    "Cute",
    table(greekMixMap, true),
  ),
  style(
    "cyrillic-mix",
    "Cyrillic mix",
    "Other",
    table(cyrillicMixMap, true),
    "limited",
  ),
  style("runic", "Runic", "Other", table(runicMap, true), "limited"),
  style(
    "dotted-accent",
    "Dotted accent",
    "Other",
    table(dottedAccentMap, true),
  ),
  style(
    "lookalike",
    "Lookalike",
    "Other",
    table(lookalikeMap, true),
    "limited",
  ),
  style(
    "smooth-mix",
    "Smooth mix",
    "Other",
    table(smoothMixMap, true),
    "limited",
  ),
  style("curvy", "Curvy", "Other", table(curvyMap, true), "limited"),
  style("block", "Asian block", "Other", table(blockMap, true), "limited"),
  style("currency", "Currency", "Other", table(currencyMap, true), "limited"),
  style("braille", "Braille", "Other", table(brailleMap, true), "limited"),

  /* ---- Cute: wrap each letter ---- */
  style("dot-wrapped", "Dot wrapped", "Cute", wrapEach("•", "•")),
  style("heart-wrapped", "Heart wrapped", "Cute", wrapEach("♡", "♡")),
  style("star-wrapped", "Star wrapped", "Cute", wrapEach("★", "★")),
  style("sparkle-wrapped", "Sparkle wrapped", "Cute", wrapEach("✧", "✧")),
  style("moon-wrapped", "Moon wrapped", "Cute", wrapEach("☾", "☽")),
  style("flower-wrapped", "Flower wrapped", "Cute", wrapEach("✿", "✿")),
  style("diamond-wrapped", "Diamond wrapped", "Cute", wrapEach("◆", "◆")),
  style("arrow-wrapped", "Arrow wrapped", "Cute", wrapEach("«", "»")),
  style("note-wrapped", "Music wrapped", "Cute", wrapEach("♪", "♪")),
  style(
    "cloud-wrapped",
    "Cloud wrapped",
    "Cute",
    wrapEach("☁", "☁"),
    "limited",
  ),
  style("wave-wrapped", "Wave wrapped", "Cute", wrapEach("~", "~")),

  /* ---- Cute: link letters ---- */
  style("heart-linked", "Heart linked", "Cute", interleave("♥")),
  style("star-linked", "Star linked", "Cute", interleave("✦")),
  style("dot-linked", "Dot linked", "Cute", interleave("•")),
  style("sparkle-linked", "Sparkle linked", "Cute", interleave("✧")),
  style("flower-linked", "Flower linked", "Cute", interleave("✿")),
  style("arrow-linked", "Arrow linked", "Cute", interleave("→")),
  style("dash-linked", "Dash linked", "Cute", interleave("–")),
  style("slash-linked", "Slash linked", "Cute", interleave("/")),
  style("plus-linked", "Plus linked", "Cute", interleave("+")),
  style("tilde-linked", "Tilde linked", "Cute", interleave("~")),
  style("music-linked", "Music linked", "Cute", interleave("♪")),
  style("moon-linked", "Moon linked", "Cute", interleave("☾")),
  style("fire-linked", "Fire linked", "Cute", interleave("🔥")),
  style("bolt-linked", "Lightning linked", "Cute", interleave("ϟ"), "limited"),
  style("bubble-linked", "Bubble linked", "Cute", interleave("∘")),
  style("underscore-linked", "Underscore linked", "Cute", interleave("_")),

  /* ---- Aesthetic frames ---- */
  style(
    "aes-sparkle",
    "Sparkle trail",
    "Aesthetic",
    frame("✧･ﾟ: *✧･ﾟ:* ", " *:･ﾟ✧*:･ﾟ✧"),
  ),
  style("aes-dots", "Soft dots", "Aesthetic", frame("˚₊‧ ", " ‧₊˚"), "limited"),
  style("aes-star-dust", "Star dust", "Aesthetic", frame("⋆.˚ ", " ˚.⋆")),
  style(
    "aes-star-glow",
    "Star glow",
    "Aesthetic",
    frame("⋆⁺₊⋆ ", " ⋆₊⁺⋆"),
    "limited",
  ),
  style("aes-heart-line", "Heart line", "Aesthetic", frame("♡ ･ﾟ･ ", " ･ﾟ･ ♡")),
  style("aes-ornate", "Ornate", "Aesthetic", frame("༺ ", " ༻"), "limited"),
  style("aes-wing", "Wings", "Aesthetic", frame("𓆩 ", " 𓆪"), "limited"),
  style("aes-dash-star", "Dashed star", "Aesthetic", frame("✦•┈┈┈ ", " ┈┈┈•✦")),
  style("aes-wave-line", "Wave line", "Aesthetic", frame("﹏﹏ ", " ﹏﹏")),
  style(
    "aes-japan",
    "Japanese brackets",
    "Aesthetic",
    frame("꒰ ", " ꒱"),
    "limited",
  ),
  style(
    "aes-bunny",
    "Moon and stars",
    "Aesthetic",
    frame("☾ ⋆*･ﾟ ", " ･ﾟ*⋆ ☽"),
  ),
  style("aes-arrows", "Chevrons", "Aesthetic", frame("»»―――― ", " ――――««")),
  style("aes-flower-row", "Flower row", "Aesthetic", frame("❀･ﾟ･ ", " ･ﾟ･❀")),
  style(
    "aes-bold-sparkle",
    "Bold sparkle",
    "Aesthetic",
    pipe(boldC, frame("✨ ", " ✨")),
  ),
  style(
    "aes-script-hearts",
    "Script hearts",
    "Aesthetic",
    pipe(scriptC, frame("♡ ", " ♡")),
  ),
  style(
    "aes-gothic-moon",
    "Gothic moon",
    "Aesthetic",
    pipe(frakturC, frame("☾ ", " ☽")),
  ),
  style(
    "aes-small-caps-star",
    "Small caps star",
    "Aesthetic",
    pipe(smallCapsC, frame("✦ ", " ✦")),
  ),

  /* ---- Glitch ---- */
  style("glitch-mini", "Glitch mini", "Glitch", glitch(1), "limited"),
  style("glitch-light", "Glitch light", "Glitch", glitch(2), "limited"),
  style("glitch", "Glitch", "Glitch", glitch(5), "limited"),
  style("glitch-heavy", "Glitch heavy", "Glitch", glitch(9), "limited"),
  style("glitch-up", "Glitch rising", "Glitch", glitch(5, "up"), "limited"),
  style(
    "glitch-down",
    "Glitch falling",
    "Glitch",
    glitch(5, "down"),
    "limited",
  ),

  /* ---- Case play ---- */
  style("alternating", "aLtErNaTiNg", "Other", (text) => {
    let index = 0;
    return Array.from(text)
      .map((character) => {
        if (!/\p{L}/u.test(character)) return character;
        const converted =
          index % 2 === 0 ? character.toLowerCase() : character.toUpperCase();
        index += 1;
        return converted;
      })
      .join("");
  }),
  style("random-case", "rAnDoM cAsE", "Other", randomCaseC),
  style("inverse-case", "iNVERSE cASE", "Other", inverseCaseC),

  /* ---- Code and cipher ---- */
  style("leet", "Leet speak", "Code", table(leetMap, true)),
  style("morse", "Morse code", "Code", morseC),
  style("binary", "Binary", "Code", binaryC),
  style("hex", "Hex", "Code", hexC),
  style("rot13", "ROT13", "Code", rot13C),
];

const styleById = fancyStyles.reduce<Record<string, FancyStyle>>(
  (map, item) => {
    map[item.id] = item;
    return map;
  },
  {},
);

const categories: CategoryFilter[] = [
  "All",
  "Bold",
  "Italic",
  "Script",
  "Gothic",
  "Bubble",
  "Boxed",
  "Lines",
  "Marks",
  "Mini",
  "Cute",
  "Aesthetic",
  "Glitch",
  "Flip",
  "Math",
  "Wide",
  "Code",
  "Other",
];

const categoryCounts = categories.reduce<Record<string, number>>(
  (map, name) => {
    map[name] =
      name === "All"
        ? fancyStyles.length
        : fancyStyles.filter((item) => item.category === name).length;
    return map;
  },
  {},
);

/* -------------------------------------------------------------------------- */
/*  Decorations, effects, platforms, symbols, ideas                           */
/* -------------------------------------------------------------------------- */

const decorations = [
  { id: "none", label: "None", before: "", after: "" },
  { id: "sparkle", label: "✦ ✦", before: "✦ ", after: " ✦" },
  { id: "hearts", label: "♡ ♡", before: "♡ ", after: " ♡" },
  { id: "crown", label: "꧁ ꧂", before: "꧁ ", after: " ꧂" },
  { id: "corner", label: "『 』", before: "『", after: "』" },
  { id: "lenticular", label: "【 】", before: "【", after: "】" },
  { id: "stars", label: "☆彡", before: "☆彡 ", after: " 彡☆" },
  { id: "diamond", label: "⟡ ⟡", before: "⟡ ", after: " ⟡" },
  { id: "arrows", label: "» «", before: "» ", after: " «" },
  { id: "tilde", label: "~ ~", before: "~ ", after: " ~" },
  { id: "bullet", label: "• •", before: "• ", after: " •" },
  { id: "fire", label: "🔥 🔥", before: "🔥 ", after: " 🔥" },
  { id: "moon", label: "☾ ☽", before: "☾ ", after: " ☽" },
  { id: "quote", label: '" "', before: '"', after: '"' },
  { id: "curly", label: "❁ ❁", before: "❁ ", after: " ❁" },
  { id: "wave", label: "〰 〰", before: "〰 ", after: " 〰" },
  { id: "butterfly", label: "🦋 🦋", before: "🦋 ", after: " 🦋" },
  { id: "bolt", label: "⚡ ⚡", before: "⚡ ", after: " ⚡" },
  { id: "sparkles", label: "✨ ✨", before: "✨ ", after: " ✨" },
  { id: "flowers", label: "🌸 🌸", before: "🌸 ", after: " 🌸" },
  { id: "custom", label: "Custom", before: "", after: "" },
];

const effects = [
  { id: "none", label: "None", mark: "" },
  { id: "underline", label: "Underline", mark: "\u0332" },
  { id: "double-underline", label: "Double underline", mark: "\u0333" },
  { id: "strike", label: "Strike", mark: "\u0336" },
  { id: "overline", label: "Overline", mark: "\u0305" },
  { id: "slash", label: "Slash", mark: "\u0338" },
  { id: "dotted", label: "Dotted below", mark: "\u0323" },
  { id: "x-below", label: "X below", mark: "\u0353" },
  { id: "arrow", label: "Arrow above", mark: "\u20d7" },
];

const platforms = [
  { id: "instagram", label: "Instagram bio", limit: 150 },
  { id: "x", label: "X post", limit: 280 },
  { id: "tiktok", label: "TikTok bio", limit: 80 },
  { id: "discord", label: "Discord name", limit: 32 },
  { id: "whatsapp", label: "WhatsApp about", limit: 139 },
];

const symbolGroups: { name: string; items: string[] }[] = [
  {
    name: "Stars",
    items: [
      "✦",
      "✧",
      "★",
      "☆",
      "✩",
      "✪",
      "✫",
      "✬",
      "✭",
      "✮",
      "✯",
      "✰",
      "⋆",
      "✨",
      "⭐",
      "🌟",
    ],
  },
  {
    name: "Hearts",
    items: ["♡", "♥", "❥", "❣", "❤", "💖", "💗", "💞", "💕", "🤍", "🖤", "💜"],
  },
  {
    name: "Arrows",
    items: [
      "→",
      "←",
      "↑",
      "↓",
      "↔",
      "⇒",
      "⇐",
      "➜",
      "➤",
      "➔",
      "➥",
      "↳",
      "⤷",
      "»",
      "«",
    ],
  },
  {
    name: "Brackets",
    items: [
      "【",
      "】",
      "『",
      "』",
      "「",
      "」",
      "《",
      "》",
      "〖",
      "〗",
      "⟦",
      "⟧",
      "〔",
      "〕",
      "❮",
      "❯",
    ],
  },
  {
    name: "Dividers",
    items: [
      "─",
      "━",
      "═",
      "┄",
      "┈",
      "▬",
      "﹏",
      "‿",
      "⌇",
      "⋯",
      "〰",
      "∿",
      "≋",
      "░",
      "▒",
      "▓",
    ],
  },
  {
    name: "Ticks and marks",
    items: [
      "✓",
      "✔",
      "✗",
      "✘",
      "☑",
      "☒",
      "✚",
      "✖",
      "※",
      "§",
      "¶",
      "†",
      "‡",
      "©",
      "®",
      "™",
    ],
  },
  {
    name: "Music and nature",
    items: [
      "♪",
      "♫",
      "♬",
      "♩",
      "☀",
      "☁",
      "☂",
      "❄",
      "☾",
      "☽",
      "✿",
      "❀",
      "❁",
      "☘",
      "☮",
      "☯",
    ],
  },
  {
    name: "Emoji faces",
    items: [
      "😊",
      "😎",
      "🥰",
      "😍",
      "🤩",
      "😌",
      "🥹",
      "😇",
      "🔥",
      "💫",
      "🌙",
      "🎧",
      "🎮",
      "📸",
      "🚀",
      "🌈",
    ],
  },
  {
    name: "Decorative",
    items: [
      "꧁",
      "꧂",
      "❀",
      "✾",
      "✽",
      "✼",
      "❃",
      "❋",
      "❊",
      "✺",
      "✹",
      "✸",
      "✷",
      "✶",
      "✵",
      "✴",
    ],
  },
  {
    name: "Aesthetic",
    items: [
      "˚",
      "₊",
      "‧",
      "｡",
      "ﾟ",
      "･",
      "⁺",
      "⊹",
      "࿔",
      "ʚ",
      "ɞ",
      "ᡣ",
      "𐭩",
      "ᵎ",
      "ᵔ",
      "ᴗ",
    ],
  },
  {
    name: "Currency and math",
    items: [
      "$",
      "€",
      "£",
      "¥",
      "₹",
      "₿",
      "∞",
      "≈",
      "≠",
      "±",
      "×",
      "÷",
      "√",
      "∑",
      "π",
      "Ω",
    ],
  },
];

const ideas = [
  {
    label: "Creator bio",
    text: "Creator • Coffee lover • Building things I love",
  },
  { label: "Travel bio", text: "Chasing sunsets. Collecting stories." },
  { label: "Gaming name", text: "ShadowFox" },
  { label: "Business name", text: "Northwind Studio" },
  { label: "Student bio", text: "Learning every day. Dreaming big." },
  { label: "Birthday wish", text: "Happy Birthday!" },
  { label: "Quote", text: "Small steps still move you forward." },
  { label: "Welcome message", text: "Welcome to my world" },
  { label: "Stream title", text: "Late night ranked grind" },
  { label: "Link in bio", text: "New drop is live. Link in bio." },
];

const faqs = [
  {
    q: "Is this fancy text generator free?",
    a: "Yes. You can generate, preview and copy fancy text without paying or creating an account.",
  },
  {
    q: "Can I use fancy text on Instagram, TikTok or Discord?",
    a: "Most Unicode styles work in bios, captions, names and chats. Support varies by app and device, so use the preview and the support label on each style, then test it in the app.",
  },
  {
    q: "Are these real fonts?",
    a: "No. They are Unicode characters that look like different lettering styles. Nothing is installed on your device, and the look can vary between apps and operating systems.",
  },
  {
    q: "Why do some characters show as empty boxes?",
    a: "The app or device you are using does not have a glyph for that character. Styles marked Limited support are more likely to show boxes. Try a Bold, Italic, Script or Gothic style instead.",
  },
  {
    q: "What does the line effect do?",
    a: "It lays an underline, strike, overline or other mark over any style you pick. Use it to build combinations such as bold with an underline.",
  },
  {
    q: "Is my text uploaded to a server?",
    a: "No. Conversion happens in your browser. Your favorites, recent copies and settings are saved only in your browser storage. If you create a share link, the text you chose is placed in the link.",
  },
  {
    q: "Are fancy text styles accessible?",
    a: "Screen readers often read these characters badly or skip them. Use them for short decorative text such as names and bios, and avoid them for important information.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Storage helpers                                                           */
/* -------------------------------------------------------------------------- */

function readStorage(): Partial<Persisted> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Partial<Persisted>;
  } catch {
    return {};
  }
}

function writeStorage(data: Persisted) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // keep working
  }
}

function fallbackCopy(text: string): boolean {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function safeCopy(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => resolve(true))
          .catch(() => resolve(fallbackCopy(text)));
        return;
      }
      resolve(fallbackCopy(text));
    } catch {
      resolve(false);
    }
  });
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function FancyTextGenerator() {
  const [loaded, setLoaded] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [input, setInput] = useState("Hello World");
  const [tab, setTab] = useState<Tab>("styles");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("popular");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [supportOnly, setSupportOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [activeId, setActiveId] = useState("bold");
  const [decorationId, setDecorationId] = useState("none");
  const [effectId, setEffectId] = useState("none");
  const [customBefore, setCustomBefore] = useState("✦ ");
  const [customAfter, setCustomAfter] = useState(" ✦");
  const [caseMode, setCaseMode] = useState<CaseMode>("as-typed");
  const [platformId, setPlatformId] = useState("instagram");
  const [symbolMode, setSymbolMode] = useState<SymbolMode>("insert");
  const [symbolSearch, setSymbolSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [density, setDensity] = useState<Density>("comfortable");
  const [view, setView] = useState<ViewMode>("list");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number | null>(null);
  const copiedTimer = useRef<number | null>(null);

  const deferredInput = useDeferredValue(input);

  /* ----- hydrate ----- */
  useIsoLayoutEffect(() => {
    const saved = readStorage();

    if (Array.isArray(saved.favorites)) {
      setFavorites(
        saved.favorites.filter(
          (id): id is string =>
            typeof id === "string" && Boolean(styleById[id]),
        ),
      );
    }
    if (Array.isArray(saved.recents)) {
      setRecents(
        saved.recents
          .filter(
            (item): item is RecentItem =>
              typeof item === "object" &&
              item !== null &&
              typeof item.text === "string" &&
              typeof item.style === "string" &&
              typeof item.at === "number",
          )
          .slice(0, 24),
      );
    }
    if (saved.theme === "light" || saved.theme === "dark") {
      setTheme(saved.theme);
    } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
    if (
      typeof saved.decorationId === "string" &&
      decorations.some((d) => d.id === saved.decorationId)
    ) {
      setDecorationId(saved.decorationId);
    }
    if (
      typeof saved.effectId === "string" &&
      effects.some((e) => e.id === saved.effectId)
    ) {
      setEffectId(saved.effectId);
    }
    if (typeof saved.customBefore === "string")
      setCustomBefore(saved.customBefore.slice(0, 12));
    if (typeof saved.customAfter === "string")
      setCustomAfter(saved.customAfter.slice(0, 12));
    if (
      saved.caseMode === "as-typed" ||
      saved.caseMode === "lower" ||
      saved.caseMode === "upper" ||
      saved.caseMode === "title" ||
      saved.caseMode === "sentence"
    ) {
      setCaseMode(saved.caseMode);
    }
    if (
      typeof saved.platformId === "string" &&
      platforms.some((p) => p.id === saved.platformId)
    ) {
      setPlatformId(saved.platformId);
    }
    if (
      saved.sort === "popular" ||
      saved.sort === "az" ||
      saved.sort === "category"
    )
      setSort(saved.sort);
    if (typeof saved.activeId === "string" && styleById[saved.activeId]) {
      setActiveId(saved.activeId);
    }
    if (saved.density === "comfortable" || saved.density === "compact") {
      setDensity(saved.density);
    }
    if (saved.view === "list" || saved.view === "grid") setView(saved.view);
    if (typeof saved.supportOnly === "boolean")
      setSupportOnly(saved.supportOnly);

    try {
      const params = new URLSearchParams(
        window.location.hash.replace(/^#/, ""),
      );
      const sharedText = params.get("text");
      const sharedStyle = params.get("style");
      if (sharedText) setInput(clampText(sharedText));
      if (sharedStyle && styleById[sharedStyle]) setActiveId(sharedStyle);
    } catch {
      // ignore
    }

    setLoaded(true);
  }, []);

  /* ----- persist ----- */
  useEffect(() => {
    if (!loaded) return;
    writeStorage({
      favorites,
      recents,
      theme,
      decorationId,
      customBefore,
      customAfter,
      caseMode,
      platformId,
      sort,
      activeId,
      density,
      effectId,
      view,
      supportOnly,
    });
  }, [
    loaded,
    favorites,
    recents,
    theme,
    decorationId,
    customBefore,
    customAfter,
    caseMode,
    platformId,
    sort,
    activeId,
    density,
    effectId,
    view,
    supportOnly,
  ]);

  /* ----- clear timers ----- */
  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  /* ----- derived ----- */
  const decoration =
    decorations.find((item) => item.id === decorationId) ?? decorations[0];
  const effect = effects.find((item) => item.id === effectId) ?? effects[0];
  const before = decoration.id === "custom" ? customBefore : decoration.before;
  const after = decoration.id === "custom" ? customAfter : decoration.after;

  const buildFor = useCallback(
    (text: string, item: FancyStyle) => {
      if (!text.trim()) return "";
      const cased = applyCase(text, caseMode);
      let converted = item.convert(cased);
      if (effect.mark) converted = combine(effect.mark)(converted);
      return `${before}${converted}${after}`;
    },
    [caseMode, effect.mark, before, after],
  );

  const buildOutput = useCallback(
    (item: FancyStyle) => buildFor(input, item),
    [buildFor, input],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = fancyStyles.filter((item) => {
      const matchesCategory = category === "All" || item.category === category;
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      const matchesFavorites = !onlyFavorites || favorites.includes(item.id);
      const matchesSupport = !supportOnly || item.support === "wide";
      return (
        matchesCategory && matchesSearch && matchesFavorites && matchesSupport
      );
    });
    if (sort === "az") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sort === "category") {
      return [...list].sort(
        (a, b) =>
          categories.indexOf(a.category) - categories.indexOf(b.category) ||
          a.name.localeCompare(b.name),
      );
    }
    return list;
  }, [search, category, onlyFavorites, supportOnly, favorites, sort]);

  const rendered = useMemo(
    () =>
      filtered.map((item) => ({
        ...item,
        output: buildFor(deferredInput, item),
      })),
    [filtered, deferredInput, buildFor],
  );

  const activeStyle = styleById[activeId] ?? fancyStyles[0];
  const activeOutput = buildOutput(activeStyle);
  const platform =
    platforms.find((item) => item.id === platformId) ?? platforms[0];
  const activeCount = Array.from(activeOutput).length;
  const inputCount = Array.from(input).length;
  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const overLimit = activeCount > platform.limit;
  const previewText = activeOutput || "Your styled text appears here";

  const symbolGroupsFiltered = useMemo(() => {
    const query = symbolSearch.trim().toLowerCase();
    if (!query) return symbolGroups;
    return symbolGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (symbol) =>
            symbol.includes(query) || group.name.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [symbolSearch]);

  const paletteResults = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    if (!query) return fancyStyles.slice(0, 14);
    return fancyStyles
      .filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query),
      )
      .slice(0, 24);
  }, [paletteQuery]);

  /* ----- actions ----- */
  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
  }, []);

  const addRecent = useCallback((text: string, styleName: string) => {
    setRecents((current) =>
      [
        { text, style: styleName, at: Date.now() },
        ...current.filter((item) => item.text !== text),
      ].slice(0, 24),
    );
  }, []);

  const copyText = useCallback(
    async (
      text: string,
      id: string,
      styleName?: string,
      message = "Copied to clipboard",
    ) => {
      if (!text) return;
      const ok = await safeCopy(text);
      if (!ok) {
        showToast("Copy failed. Select the text and copy it manually.");
        return;
      }
      setCopiedId(id);
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopiedId(null), 1600);
      if (styleName) addRecent(text, styleName);
      showToast(message);
    },
    [addRecent, showToast],
  );

  /* ----- keyboard shortcuts ----- */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
        setPaletteIndex(0);
        return;
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "Enter" || event.key === "NumpadEnter") &&
        !typing
      ) {
        event.preventDefault();
        const active = styleById[activeId];
        if (active) {
          const out = buildOutput(active);
          if (out) void copyText(out, "stage", active.name);
        }
        return;
      }
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setTab("styles");
        window.setTimeout(() => searchRef.current?.focus(), 0);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeId, buildOutput, copyText]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }, []);

  /* FIX B: use functional setInput to avoid stale closure */
  const insertText = useCallback((snippet: string) => {
    const element = textareaRef.current;
    setInput((prev) => {
      if (!element) return clampText(prev + snippet);
      const start = element.selectionStart ?? prev.length;
      const end = element.selectionEnd ?? prev.length;
      const next = clampText(prev.slice(0, start) + snippet + prev.slice(end));
      window.requestAnimationFrame(() => {
        element.focus();
        const position = Math.min(start + snippet.length, next.length);
        element.setSelectionRange(position, position);
      });
      return next;
    });
  }, []);

  const handleSymbol = useCallback(
    (symbol: string) => {
      if (symbolMode === "insert") {
        insertText(symbol);
        showToast(`Added ${symbol} to your text`);
      } else {
        void copyText(
          symbol,
          `symbol-${symbol}`,
          undefined,
          `Copied ${symbol}`,
        );
      }
    },
    [symbolMode, insertText, copyText, showToast],
  );

  const pasteText = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInput(clampText(text));
        showToast("Pasted from clipboard");
      }
    } catch {
      showToast(
        "Your browser blocked paste. Press Ctrl+V or Cmd+V in the box.",
      );
    }
  }, [showToast]);

  const copyShareLink = useCallback(() => {
    if (!input.trim()) {
      showToast("Type some text first");
      return;
    }
    const params = new URLSearchParams({ text: input, style: activeId });
    const link = `${window.location.origin}${window.location.pathname}#${params.toString()}`;
    void copyText(link, "share", undefined, "Share link copied");
  }, [input, activeId, copyText, showToast]);

  const joinStyles = useCallback(
    (list: FancyStyle[]) =>
      list.map((item) => `${item.name}\n${buildOutput(item)}`).join("\n\n"),
    [buildOutput],
  );

  const copyAll = useCallback(() => {
    if (!input.trim() || filtered.length === 0) {
      showToast("Nothing to copy yet");
      return;
    }
    void copyText(
      joinStyles(filtered),
      "all",
      undefined,
      `Copied ${filtered.length} styles`,
    );
  }, [input, filtered, joinStyles, copyText, showToast]);

  const copyFavorites = useCallback(() => {
    const list = fancyStyles.filter((item) => favorites.includes(item.id));
    if (!input.trim() || list.length === 0) {
      showToast("Save a style and type some text first");
      return;
    }
    void copyText(
      joinStyles(list),
      "favorites",
      undefined,
      `Copied ${list.length} favorite styles`,
    );
  }, [input, favorites, joinStyles, copyText, showToast]);

  const downloadText = useCallback(() => {
    if (!input.trim() || filtered.length === 0) {
      showToast("Nothing to download yet");
      return;
    }
    try {
      const blob = new Blob([joinStyles(filtered)], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "fancy-text-styles.txt";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Downloaded fancy-text-styles.txt");
    } catch {
      showToast("Download failed in this browser");
    }
  }, [input, filtered, joinStyles, showToast]);

  const downloadCsv = useCallback(() => {
    if (!input.trim() || filtered.length === 0) {
      showToast("Nothing to download yet");
      return;
    }
    try {
      const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
      const rows = [
        "style,category,support,output",
        ...filtered.map((item) =>
          [item.name, item.category, item.support, buildOutput(item)]
            .map(escape)
            .join(","),
        ),
      ];
      const blob = new Blob(["\uFEFF" + rows.join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "fancy-text-styles.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Downloaded fancy-text-styles.csv");
    } catch {
      showToast("Download failed in this browser");
    }
  }, [input, filtered, buildOutput, showToast]);

  const loadSample = useCallback(() => {
    const samples = [
      "Hello World",
      "Good vibes only",
      "Dream big",
      "Stay curious",
      "Made with love",
    ];
    const options = samples.filter((sample) => sample !== input);
    setInput(options[Math.floor(Math.random() * options.length)]);
  }, [input]);

  const pickRandomStyle = useCallback(() => {
    const pool = filtered.length ? filtered : fancyStyles;
    const choices = pool.filter((item) => item.id !== activeId);
    const pick = choices[Math.floor(Math.random() * choices.length)] ?? pool[0];
    setActiveId(pick.id);
    showToast(`Previewing ${pick.name}`);
  }, [filtered, activeId, showToast]);

  const resetFilters = useCallback(() => {
    setSearch("");
    setCategory("All");
    setOnlyFavorites(false);
    setSupportOnly(false);
  }, []);

  const renderPreview = () => {
    if (platform.id === "discord") {
      return (
        <div className="mock mock-discord">
          <span className="mock-avatar" aria-hidden="true" />
          <div className="mock-body">
            <div className="mock-line">
              <strong className="mock-nick">{previewText}</strong>
              <span className="mock-time">Today at 9:41</span>
            </div>
            <p className="mock-text">
              This is how your name looks in a server.
            </p>
          </div>
        </div>
      );
    }

    if (platform.id === "x") {
      return (
        <div className="mock mock-x">
          <span className="mock-avatar" aria-hidden="true" />
          <div className="mock-body">
            <div className="mock-line">
              <strong>Your Name</strong>
              <span className="mock-handle">@yourname</span>
            </div>
            <p className="mock-text">{previewText}</p>
          </div>
        </div>
      );
    }

    if (platform.id === "whatsapp") {
      return (
        <div className="mock mock-whatsapp">
          <div className="mock-body">
            <span className="mock-label">About</span>
            <p className="mock-text">{previewText}</p>
          </div>
        </div>
      );
    }

    if (platform.id === "tiktok") {
      return (
        <div className="mock mock-center">
          <span className="mock-avatar big" aria-hidden="true" />
          <strong>@yourname</strong>
          <p className="mock-text">{previewText}</p>
        </div>
      );
    }

    return (
      <div className="mock mock-instagram">
        <span className="mock-avatar big" aria-hidden="true" />
        <div className="mock-body">
          <strong>yourname</strong>
          <p className="mock-text">{previewText}</p>
        </div>
      </div>
    );
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                */
  /* ---------------------------------------------------------------------- */

  return (
    <div className={`studio density-${density}`} data-theme={theme}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ---------- Hero ---------- */}
      <header className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-content">
          <div className="hero-badge">✦ Pro Unicode text studio</div>
          <h1>
            Fancy Text <span className="hero-accent">Generator</span>
          </h1>
          <p>
            Type once and see all {fancyStyles.length} Unicode text styles open
            at the same time, with {decorations.length - 2} decorations,{" "}
            {effects.length - 1} line effects and a live preview for Instagram,
            X, TikTok, Discord and WhatsApp.
          </p>
          <ul className="hero-points">
            <li>✓ Free, no sign-up</li>
            <li>✓ Runs in your browser</li>
            <li>✓ Every style visible</li>
            <li>✓ Ctrl/⌘+K palette</li>
          </ul>
          <div className="hero-actions">
            <button
              type="button"
              className="primary browse-button"
              onClick={() => {
                setTab("styles");
                searchRef.current?.focus();
              }}
            >
              Browse all styles
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setPaletteOpen(true);
                setPaletteIndex(0);
              }}
            >
              Open palette <kbd>⌘K</kbd>
            </button>
          </div>
        </div>

        <div className="hero-stats">
          <div>
            <strong>{fancyStyles.length}</strong>
            <span>styles</span>
          </div>
          <div>
            <strong>{decorations.length - 2}</strong>
            <span>decorations</span>
          </div>
          <div>
            <strong>
              {symbolGroups.reduce((n, g) => n + g.items.length, 0)}
            </strong>
            <span>symbols</span>
          </div>
        </div>
      </header>

      {/* ---------- Theme / density ---------- */}
      <div className="top-bar">
        <div className="segmented small" role="group" aria-label="Density">
          <button
            type="button"
            className={density === "comfortable" ? "on" : ""}
            aria-pressed={density === "comfortable"}
            onClick={() => setDensity("comfortable")}
          >
            Comfortable
          </button>
          <button
            type="button"
            className={density === "compact" ? "on" : ""}
            aria-pressed={density === "compact"}
            onClick={() => setDensity("compact")}
          >
            Compact
          </button>
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={() =>
            setTheme((value) => (value === "light" ? "dark" : "light"))
          }
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? "☾ Dark mode" : "☀ Light mode"}
        </button>
      </div>

      <div className="workspace">
        {/* -------------------- Composer -------------------- */}
        <aside className="composer">
          <section className="panel" aria-labelledby="composer-title">
            <div className="panel-head">
              <h2 id="composer-title">Your text</h2>
              <span
                className={`counter ${inputCount >= MAX_CHARS ? "full" : ""}`}
              >
                {wordCount} {wordCount === 1 ? "word" : "words"} · {inputCount}/
                {MAX_CHARS}
              </span>
            </div>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(clampText(event.target.value))}
              placeholder="Type or paste your text here"
              aria-label="Text to convert into fancy styles"
              rows={4}
            />

            <div className="button-row">
              <button
                type="button"
                className="chip-button"
                onClick={loadSample}
              >
                Try a sample
              </button>
              <button
                type="button"
                className="chip-button"
                onClick={() => void pasteText()}
              >
                Paste
              </button>
              <button
                type="button"
                className="chip-button"
                onClick={() => setInput("")}
                disabled={!input}
              >
                Clear
              </button>
              <button
                type="button"
                className="chip-button"
                onClick={copyShareLink}
              >
                Copy share link
              </button>
            </div>

            <fieldset className="field">
              <legend>Letter case</legend>
              <div className="segmented" role="group" aria-label="Letter case">
                {(
                  [
                    ["as-typed", "As typed"],
                    ["lower", "lowercase"],
                    ["upper", "UPPERCASE"],
                    ["title", "Title Case"],
                    ["sentence", "Sentence case"],
                  ] as [CaseMode, string][]
                ).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={caseMode === value ? "on" : ""}
                    aria-pressed={caseMode === value}
                    onClick={() => setCaseMode(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="field">
              <legend>Line effect on every style</legend>
              <div
                className="deco-grid effect-grid"
                role="group"
                aria-label="Line effect"
              >
                {effects.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={effectId === item.id ? "on" : ""}
                    aria-pressed={effectId === item.id}
                    onClick={() => setEffectId(item.id)}
                    title={item.label}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="field">
              <legend>Decoration around your text</legend>
              <div className="deco-grid" role="group" aria-label="Decoration">
                {decorations.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={decorationId === item.id ? "on" : ""}
                    aria-pressed={decorationId === item.id}
                    onClick={() => setDecorationId(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {decorationId === "custom" && (
                <div className="custom-deco">
                  <label>
                    <span>Start</span>
                    <input
                      type="text"
                      value={customBefore}
                      maxLength={12}
                      onChange={(event) => setCustomBefore(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>End</span>
                    <input
                      type="text"
                      value={customAfter}
                      maxLength={12}
                      onChange={(event) => setCustomAfter(event.target.value)}
                    />
                  </label>
                </div>
              )}
            </fieldset>
          </section>

          <section className="panel stage" aria-labelledby="preview-title">
            <div className="panel-head">
              <h2 id="preview-title">Live preview</h2>
              <span className="stage-style">{activeStyle.name}</span>
            </div>

            <div className="stage-output" aria-live="polite">
              {activeOutput || (
                <span className="placeholder">
                  Type something to see it styled
                </span>
              )}
            </div>

            <div className="button-row">
              <button
                type="button"
                className="primary"
                onClick={() =>
                  void copyText(activeOutput, "stage", activeStyle.name)
                }
                disabled={!activeOutput}
              >
                {copiedId === "stage" ? "Copied" : "Copy this style"}
              </button>
              <button
                type="button"
                className={`chip-button ${
                  favorites.includes(activeStyle.id) ? "liked" : ""
                }`}
                onClick={() => toggleFavorite(activeStyle.id)}
                aria-pressed={favorites.includes(activeStyle.id)}
              >
                {favorites.includes(activeStyle.id)
                  ? "♥ Saved"
                  : "♡ Save style"}
              </button>
              <button
                type="button"
                className="chip-button"
                onClick={pickRandomStyle}
              >
                Random style
              </button>
            </div>

            {activeStyle.support === "limited" && (
              <p className="notice">
                This style uses rare or combining characters. Some apps and
                devices show boxes or broken letters, so test it before you
                post.
              </p>
            )}

            <div
              className="platform-tabs"
              role="tablist"
              aria-label="Preview platform"
            >
              {platforms.map((item) => (
                <button
                  type="button"
                  role="tab"
                  key={item.id}
                  aria-selected={platformId === item.id}
                  className={platformId === item.id ? "on" : ""}
                  onClick={() => setPlatformId(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {renderPreview()}

            <p className={`limit ${overLimit ? "over" : ""}`}>
              {activeOutput
                ? `${activeCount} of about ${platform.limit} characters`
                : `Typical limit: about ${platform.limit} characters`}
              {overLimit && " (too long for this field)"}
            </p>
          </section>
        </aside>

        {/* -------------------- Library -------------------- */}
        <main className="library">
          <div className="tabs" role="tablist" aria-label="Tool sections">
            {(
              [
                ["styles", `Styles (${fancyStyles.length})`],
                ["symbols", "Symbols"],
                ["ideas", "Ideas"],
                ["recent", `Recent (${recents.length})`],
              ] as [Tab, string][]
            ).map(([value, label]) => (
              <button
                type="button"
                role="tab"
                key={value}
                aria-selected={tab === value}
                className={tab === value ? "on" : ""}
                onClick={() => setTab(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "styles" && (
            <section className="panel flush" aria-label="Text styles">
              <div className="toolbar">
                <div className="search">
                  <input
                    ref={searchRef}
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setSearch("");
                    }}
                    placeholder="Search styles. Press / to focus"
                    aria-label="Search text styles"
                  />
                </div>

                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                  aria-label="Sort styles"
                >
                  <option value="popular">Most useful first</option>
                  <option value="az">A to Z</option>
                  <option value="category">By category</option>
                </select>

                <button
                  type="button"
                  className={`chip-button ${onlyFavorites ? "on" : ""}`}
                  aria-pressed={onlyFavorites}
                  onClick={() => setOnlyFavorites((value) => !value)}
                >
                  ♡ Favorites ({favorites.length})
                </button>

                <button
                  type="button"
                  className={`chip-button ${supportOnly ? "on" : ""}`}
                  aria-pressed={supportOnly}
                  onClick={() => setSupportOnly((value) => !value)}
                  title="Hide styles that often show boxes on some devices"
                >
                  ✓ Wide support only
                </button>

                <div
                  className="segmented small"
                  role="group"
                  aria-label="Layout"
                >
                  <button
                    type="button"
                    className={view === "list" ? "on" : ""}
                    aria-pressed={view === "list"}
                    onClick={() => setView("list")}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    className={view === "grid" ? "on" : ""}
                    aria-pressed={view === "grid"}
                    onClick={() => setView("grid")}
                  >
                    Grid
                  </button>
                </div>
              </div>

              <div
                className="category-row"
                role="group"
                aria-label="Style categories"
              >
                {categories.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={category === item ? "on" : ""}
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                  >
                    {item} <span className="count">{categoryCounts[item]}</span>
                  </button>
                ))}
              </div>

              <div className="list-meta">
                <span>
                  Showing all {filtered.length} of {fancyStyles.length} styles
                </span>
                <span className="list-actions">
                  <button
                    type="button"
                    onClick={copyAll}
                    disabled={!input.trim() || !filtered.length}
                  >
                    {copiedId === "all" ? "Copied" : "Copy all"}
                  </button>
                  <button
                    type="button"
                    onClick={copyFavorites}
                    disabled={!input.trim() || !favorites.length}
                  >
                    {copiedId === "favorites" ? "Copied" : "Copy favorites"}
                  </button>
                  <button
                    type="button"
                    onClick={downloadText}
                    disabled={!input.trim() || !filtered.length}
                  >
                    Download .txt
                  </button>
                  <button
                    type="button"
                    onClick={downloadCsv}
                    disabled={!input.trim() || !filtered.length}
                  >
                    Download .csv
                  </button>
                </span>
              </div>

              {rendered.length > 0 ? (
                <ul className={`rows ${view === "grid" ? "grid" : ""}`}>
                  {rendered.map((item) => {
                    const isFavorite = favorites.includes(item.id);
                    const isActive = item.id === activeId;
                    const isCopied = copiedId === item.id;
                    return (
                      <li
                        key={item.id}
                        className={`row ${isActive ? "active" : ""}`}
                      >
                        <button
                          type="button"
                          className="row-main"
                          onClick={() => setActiveId(item.id)}
                          aria-pressed={isActive}
                          aria-label={`Preview ${item.name}`}
                        >
                          <span className="row-meta">
                            <span className="row-name">{item.name}</span>
                            <span className="row-tag">{item.category}</span>
                            {item.support === "limited" && (
                              <span className="row-warn">Limited support</span>
                            )}
                          </span>
                          <span className="row-output">
                            {item.output || (
                              <span className="placeholder">
                                Type text to see this style
                              </span>
                            )}
                          </span>
                        </button>

                        <div className="row-actions">
                          <button
                            type="button"
                            className={`heart ${isFavorite ? "on" : ""}`}
                            onClick={() => toggleFavorite(item.id)}
                            aria-pressed={isFavorite}
                            aria-label={
                              isFavorite
                                ? `Remove ${item.name} from favorites`
                                : `Add ${item.name} to favorites`
                            }
                          >
                            {isFavorite ? "♥" : "♡"}
                          </button>
                          <button
                            type="button"
                            className={`copy ${isCopied ? "done" : ""}`}
                            onClick={() =>
                              void copyText(item.output, item.id, item.name)
                            }
                            disabled={!item.output}
                          >
                            {isCopied ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="empty">
                  <h3>
                    {onlyFavorites && !favorites.length
                      ? "No favorites yet"
                      : "No styles match your search"}
                  </h3>
                  <p>
                    {onlyFavorites && !favorites.length
                      ? "Tap the heart on any style to keep it here."
                      : "Try a different word or clear the filters."}
                  </p>
                  <button
                    type="button"
                    className="primary"
                    onClick={resetFilters}
                  >
                    Show all styles
                  </button>
                </div>
              )}
            </section>
          )}

          {tab === "symbols" && (
            <section className="panel" aria-label="Symbols and emoji">
              <div className="panel-head">
                <div>
                  <h2>Symbols and emoji</h2>
                  <p className="sub">
                    Tap a symbol to use it in your text or copy it by itself.
                  </p>
                </div>
                <div
                  className="segmented small"
                  role="group"
                  aria-label="Symbol tap action"
                >
                  <button
                    type="button"
                    className={symbolMode === "insert" ? "on" : ""}
                    aria-pressed={symbolMode === "insert"}
                    onClick={() => setSymbolMode("insert")}
                  >
                    Add to text
                  </button>
                  <button
                    type="button"
                    className={symbolMode === "copy" ? "on" : ""}
                    aria-pressed={symbolMode === "copy"}
                    onClick={() => setSymbolMode("copy")}
                  >
                    Copy only
                  </button>
                </div>
              </div>

              <div className="search" style={{ marginBottom: 12 }}>
                <input
                  type="search"
                  value={symbolSearch}
                  onChange={(event) => setSymbolSearch(event.target.value)}
                  placeholder="Search symbols..."
                  aria-label="Search symbols"
                />
              </div>

              {symbolGroupsFiltered.length === 0 && (
                <div className="empty">
                  <h3>No symbols match your search</h3>
                  <p>Try a different keyword or clear the field.</p>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => setSymbolSearch("")}
                  >
                    Clear search
                  </button>
                </div>
              )}

              {symbolGroupsFiltered.map((group) => (
                <div className="symbol-group" key={group.name}>
                  <h3>{group.name}</h3>
                  <div className="symbol-grid">
                    {group.items.map((symbol) => (
                      <button
                        type="button"
                        key={symbol}
                        onClick={() => handleSymbol(symbol)}
                        aria-label={`${symbolMode === "insert" ? "Add" : "Copy"} ${symbol}`}
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {tab === "ideas" && (
            <section className="panel" aria-label="Text ideas">
              <div className="panel-head">
                <div>
                  <h2>Ideas to start from</h2>
                  <p className="sub">
                    Load an example, then try it in different styles.
                  </p>
                </div>
              </div>

              <ul className="idea-list">
                {ideas.map((idea) => (
                  <li key={idea.label}>
                    <div>
                      <strong>{idea.label}</strong>
                      <span>{idea.text}</span>
                    </div>
                    <button
                      type="button"
                      className="chip-button"
                      onClick={() => {
                        setInput(idea.text);
                        setTab("styles");
                        showToast(`Loaded ${idea.label.toLowerCase()}`);
                      }}
                    >
                      Use this text
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tab === "recent" && (
            <section className="panel" aria-label="Recently copied">
              <div className="panel-head">
                <div>
                  <h2>Recently copied</h2>
                  <p className="sub">Saved only in this browser.</p>
                </div>
                <div className="button-row tight">
                  <button
                    type="button"
                    className="chip-button"
                    onClick={() => {
                      setRecents([]);
                      showToast("History cleared");
                    }}
                    disabled={!recents.length}
                  >
                    Clear history
                  </button>
                  <button
                    type="button"
                    className="chip-button"
                    onClick={() => {
                      setFavorites([]);
                      showToast("Favorites cleared");
                    }}
                    disabled={!favorites.length}
                  >
                    Clear favorites
                  </button>
                </div>
              </div>

              {recents.length > 0 ? (
                <ul className="recent-list">
                  {recents.map((item, index) => (
                    <li key={`${item.text}-${index}`}>
                      <div>
                        <span className="row-tag">{item.style}</span>
                        <span className="recent-text">{item.text}</span>
                      </div>
                      <button
                        type="button"
                        className={`copy ${
                          copiedId === `recent-${index}` ? "done" : ""
                        }`}
                        onClick={() =>
                          void copyText(item.text, `recent-${index}`)
                        }
                      >
                        {copiedId === `recent-${index}` ? "Copied" : "Copy"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty">
                  <h3>Nothing copied yet</h3>
                  <p>
                    Styles you copy will show up here so you can grab them
                    again.
                  </p>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => setTab("styles")}
                  >
                    Browse styles
                  </button>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* -------------------- Guide -------------------- */}
      <section className="guide">
        <h2>What is a fancy text generator?</h2>
        <p>
          A fancy text generator turns normal letters into decorative Unicode
          characters. The result can look bold, italic, handwritten, gothic,
          circled, tiny or glitched. Because the characters are plain text, you
          can copy them and paste them into most apps without installing a font.
        </p>

        <h2>Where can you use fancy text?</h2>
        <div className="use-cases">
          <div>
            <h3>Social bios</h3>
            <p>
              Make an Instagram or TikTok bio stand out. Check the character
              count in the preview.
            </p>
          </div>
          <div>
            <h3>Captions and posts</h3>
            <p>Highlight a key word in a caption, tweet or status update.</p>
          </div>
          <div>
            <h3>Gaming and chat names</h3>
            <p>
              Try decorative names for Discord, Steam and other apps that accept
              Unicode.
            </p>
          </div>
          <div>
            <h3>Messages and invites</h3>
            <p>
              Add personality to birthday wishes, group names and event titles.
            </p>
          </div>
        </div>

        <h2>How to use this tool</h2>
        <ol>
          <li>Type or paste your text, or load an idea from the Ideas tab.</li>
          <li>
            Choose a letter case, a line effect and an optional decoration.
          </li>
          <li>Scroll the full list, or search and filter by category.</li>
          <li>Pick a style to see it in the live preview for your platform.</li>
          <li>Press Copy, or save the style as a favorite.</li>
          <li>Paste it into your app and check how it looks.</li>
        </ol>

        <h2>Tips for best results</h2>
        <ul>
          <li>
            Bold, Italic, Script and Gothic styles work in the widest range of
            apps.
          </li>
          <li>
            Turn on Wide support only to hide styles that may show boxes on some
            devices.
          </li>
          <li>
            Glitch, black circles, squares, enclosing marks and upside down
            styles may show boxes on some devices.
          </li>
          <li>
            Screen readers can read fancy text poorly, so keep important details
            in normal text.
          </li>
          <li>
            Some platforms block or filter certain characters in usernames.
          </li>
          <li>
            Press <kbd>Ctrl</kbd>+<kbd>K</kbd> (or <kbd>⌘</kbd>+<kbd>K</kbd>) to
            open the command palette.
          </li>
        </ul>

        <h2>Frequently asked questions</h2>
        <div className="faq">
          {faqs.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="note">
        <p>
          Made by ToolsAB. Your text is converted in your browser. Favorites,
          history and settings stay in this browser, and a share link contains
          only the text and style you chose.
        </p>
      </footer>

      <div className="toast" role="status" aria-live="polite">
        {toast && <span>{toast}</span>}
      </div>

      {/* -------------------- Command palette -------------------- */}
      {paletteOpen && (
        <div
          className="palette-backdrop"
          onClick={() => setPaletteOpen(false)}
          role="presentation"
        >
          <div
            className="palette"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Command palette"
          >
            <input
              autoFocus
              value={paletteQuery}
              onChange={(event) => {
                setPaletteQuery(event.target.value);
                setPaletteIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setPaletteIndex((i) =>
                    paletteResults.length ? (i + 1) % paletteResults.length : 0,
                  );
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setPaletteIndex((i) =>
                    paletteResults.length
                      ? (i - 1 + paletteResults.length) % paletteResults.length
                      : 0,
                  );
                } else if (event.key === "Enter") {
                  const pick =
                    paletteResults[paletteIndex] ?? paletteResults[0];
                  if (pick) {
                    setActiveId(pick.id);
                    setTab("styles");
                    setPaletteOpen(false);
                    setPaletteQuery("");
                    setPaletteIndex(0);
                  }
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setPaletteOpen(false);
                  setPaletteQuery("");
                  setPaletteIndex(0);
                }
              }}
              placeholder="Search styles, categories... Enter to pick the first"
              aria-label="Search styles in palette"
            />
            <ul>
              {paletteResults.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={i === paletteIndex ? "on" : ""}
                    onClick={() => {
                      setActiveId(item.id);
                      setTab("styles");
                      setPaletteOpen(false);
                      setPaletteQuery("");
                      setPaletteIndex(0);
                    }}
                  >
                    <span className="palette-name">{item.name}</span>
                    <span className="palette-tag">{item.category}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <style jsx>{`
        .studio {
          --bg: #f3f4f6;
          --surface: #ffffff;
          --raised: #f7f8fa;
          --ink: #15171b;
          --muted: #5b616b;
          --line: #e2e4e9;
          --accent: #ff5a1f;
          --accent-strong: #d03f0a;
          --accent-ink: #b8370a;
          --accent-soft: #fff1ea;
          --on-accent: #ffffff;
          --ok: #1c7a46;
          --danger: #b42318;
          --shadow:
            0 1px 2px rgba(16, 24, 40, 0.05), 0 10px 30px rgba(16, 24, 40, 0.05);

          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 24px 20px 70px;
          color: var(--ink);
          background: var(--bg);
          border-radius: 20px;
          line-height: 1.55;
        }

        .studio[data-theme="dark"] {
          --bg: #0e1013;
          --surface: #16191e;
          --raised: #1c2027;
          --ink: #eceef1;
          --muted: #9aa1ab;
          --line: #272c34;
          --accent: #ff7a45;
          --accent-strong: #ff7a45;
          --accent-ink: #ff9a6e;
          --accent-soft: #2a1a12;
          --on-accent: #1a0d06;
          --ok: #4cc38a;
          --danger: #ff8a7a;
          --shadow:
            0 1px 2px rgba(0, 0, 0, 0.4), 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        h1,
        h2,
        h3,
        p {
          margin: 0;
        }

        button,
        input,
        select,
        textarea {
          font: inherit;
          color: inherit;
        }

        button {
          cursor: pointer;
          transition:
            background-color 0.15s,
            border-color 0.15s,
            color 0.15s,
            transform 0.15s;
        }
        button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        button:focus-visible,
        input:focus-visible,
        select:focus-visible,
        textarea:focus-visible,
        summary:focus-visible {
          outline: 3px solid var(--accent);
          outline-offset: 2px;
        }

        kbd {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 6px;
          border: 1px solid var(--line);
          background: var(--raised);
          font-size: 11px;
          font-weight: 700;
          color: var(--muted);
        }

        /* ----- hero ----- */
        .hero {
          position: relative;
          overflow: hidden;
          border-radius: 22px;
          padding: 30px 30px 26px;
          margin-bottom: 18px;
          background: radial-gradient(
            120% 160% at 0% 0%,
            #2a2f3d 0%,
            #101218 70%
          );
          color: #fff;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 26px;
          align-items: center;
          box-shadow: 0 20px 44px -22px #171a21cc;
        }
        .hero-glow {
          position: absolute;
          width: 420px;
          height: 420px;
          right: -120px;
          top: -160px;
          background: radial-gradient(circle, #ff5a1f77, transparent 65%);
          pointer-events: none;
          animation: heroFloat 8s ease-in-out infinite alternate;
        }
        @keyframes heroFloat {
          from {
            transform: translate(0, 0) scale(1);
          }
          to {
            transform: translate(-30px, 30px) scale(1.08);
          }
        }
        .hero-content {
          position: relative;
          z-index: 1;
        }
        .hero-badge {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 999px;
          background: #ffffff1a;
          color: #ffc7ad;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          margin-bottom: 12px;
          backdrop-filter: blur(6px);
        }
        .hero h1 {
          font-size: clamp(30px, 4.2vw, 44px);
          line-height: 1.1;
          letter-spacing: -0.03em;
          font-weight: 800;
          color: #ffc7c7;
        }
        .hero-accent {
          background: linear-gradient(135deg, #ff8a3d, #ff5a1f);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .hero-content p {
          max-width: 640px;
          margin-top: 12px;
          color: #b9bfcc;
          font-size: 15px;
        }
        .hero-points {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          list-style: none;
          padding: 0;
          margin: 16px 0 0;
        }
        .hero-points li {
          padding: 5px 11px;
          border: 1px solid #ffffff26;
          border-radius: 999px;
          background: #ffffff10;
          color: #d7dbe4;
          font-size: 12px;
          font-weight: 600;
        }
        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }
        .hero-actions .primary {
          padding: 11px 20px;
        }
        .hero-actions .ghost {
          padding: 11px 18px;
          border: 1px solid #ffffff30;
          border-radius: 10px;
          background: #ffffff10;
          color: #fff;
          font-size: 14px;
          font-weight: 650;
        }
        .hero-actions .primary.browse-button {
          background: linear-gradient(135deg, #ff8a3d, #ff5a1f);
          border: none;
          outline: none;
          border-radius: 5px;
        }
        .hero-actions .primary.browse-button:hover {
          background: linear-gradient(135deg, #ff5a1f, #ff8a3d);
        }
        .hero-actions .ghost:hover {
          background: #ffffff1f;
          border-color: #ffffff50;
        }
        .hero-stats {
          display: flex;
          gap: 18px;
          padding: 16px 22px;
          border-radius: 18px;
          background: #ffffff0f;
          border: 1px solid #ffffff1c;
          backdrop-filter: blur(6px);
          position: relative;
          z-index: 1;
        }
        .hero-stats > div {
          text-align: center;
        }
        .hero-stats strong {
          display: block;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -1px;
        }
        .hero-stats span {
          display: block;
          font-size: 11px;
          color: #b9bfcc;
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        /* ----- top bar ----- */
        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .theme-toggle {
          padding: 9px 14px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: var(--surface);
          font-size: 13px;
          font-weight: 650;
        }
        .theme-toggle:hover {
          border-color: var(--accent);
        }

        /* ----- layout ----- */
        .workspace {
          display: grid;
          grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
          gap: 20px;
          align-items: start;
        }
        .composer {
          display: grid;
          gap: 16px;
          position: sticky;
          top: 16px;
          max-height: calc(100vh - 32px);
          overflow-y: auto;
          padding-right: 2px;
        }
        .library {
          min-width: 0;
        }

        .panel {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 20px;
          box-shadow: var(--shadow);
        }
        .panel.flush {
          padding: 0;
          overflow: hidden;
        }
        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }
        .panel-head h2 {
          font-size: 18px;
          font-weight: 750;
          letter-spacing: -0.01em;
        }
        .sub {
          margin-top: 3px;
          color: var(--muted);
          font-size: 13px;
        }
        .counter {
          color: var(--muted);
          font-size: 13px;
          font-variant-numeric: tabular-nums;
        }
        .counter.full {
          color: var(--danger);
        }

        textarea {
          width: 100%;
          min-height: 108px;
          padding: 14px;
          resize: vertical;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: var(--raised);
          font-size: 16px;
          line-height: 1.55;
        }
        textarea:focus {
          border-color: var(--accent);
        }

        .button-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .button-row.tight {
          margin-top: 0;
        }

        .chip-button {
          padding: 8px 13px;
          border: 1px solid var(--line);
          border-radius: 9px;
          background: var(--surface);
          font-size: 13px;
          font-weight: 650;
        }
        .chip-button:hover:not(:disabled) {
          border-color: var(--accent);
        }
        .chip-button.on {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent-ink);
        }
        .chip-button.liked {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent-ink);
        }

        .segmented {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .segmented button {
          padding: 8px 12px;
          border: 1px solid var(--line);
          border-radius: 9px;
          background: var(--surface);
          font-size: 13px;
          font-weight: 650;
        }
        .segmented button.on {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent-ink);
        }
        .segmented.small button {
          padding: 6px 10px;
          font-size: 12px;
        }

        .field {
          border: 0;
          padding: 0;
          margin: 16px 0 0;
        }
        .field legend {
          font-size: 12px;
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
        }

        .deco-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .deco-grid button {
          padding: 6px 10px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--surface);
          font-size: 12px;
          font-weight: 650;
        }
        .deco-grid button.on {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent-ink);
        }

        .custom-deco {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }
        .custom-deco label {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .custom-deco label span {
          font-size: 11px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .custom-deco input {
          padding: 8px 10px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--raised);
          font-size: 13px;
        }

        .stage-style {
          font-size: 12px;
          font-weight: 700;
          color: var(--accent-ink);
          background: var(--accent-soft);
          padding: 4px 10px;
          border-radius: 999px;
        }
        .stage-output {
          min-height: 72px;
          padding: 14px;
          border: 1px dashed var(--line);
          border-radius: 12px;
          background: var(--raised);
          font-size: 17px;
          line-height: 1.6;
          word-break: break-word;
        }
        .placeholder {
          color: var(--muted);
          font-style: italic;
        }
        .notice {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #fff7e6;
          border: 1px solid #ffd98a;
          color: #8a5b00;
          font-size: 12px;
        }
        .studio[data-theme="dark"] .notice {
          background: #2a1f0a;
          border-color: #6b4f10;
          color: #ffd98a;
        }

        .platform-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 14px 0 10px;
        }
        .platform-tabs button {
          padding: 6px 11px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: var(--surface);
          font-size: 12px;
          font-weight: 650;
        }
        .platform-tabs button.on {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent-ink);
        }

        .mock {
          display: flex;
          gap: 10px;
          padding: 14px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: var(--raised);
        }
        .mock-avatar {
          display: block;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff8a3d, #ff5a1f);
          flex-shrink: 0;
        }
        .mock-avatar.big {
          width: 52px;
          height: 52px;
        }
        .mock-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .mock-line {
          display: flex;
          gap: 8px;
          align-items: baseline;
        }
        .mock-time,
        .mock-handle {
          font-size: 11px;
          color: var(--muted);
        }
        .mock-nick {
          font-weight: 700;
        }
        .mock-text {
          font-size: 14px;
          word-break: break-word;
        }
        .mock-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .mock-center {
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .limit {
          margin-top: 8px;
          font-size: 12px;
          color: var(--muted);
        }
        .limit.over {
          color: var(--danger);
          font-weight: 700;
        }

        .tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .tabs button {
          padding: 9px 14px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: var(--surface);
          font-size: 13px;
          font-weight: 650;
        }
        .tabs button.on {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent-ink);
        }

        .toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 16px 20px 0;
        }
        .search {
          flex: 1 1 220px;
        }
        .search input {
          width: 100%;
          padding: 9px 12px;
          border: 1px solid var(--line);
          border-radius: 9px;
          background: var(--raised);
          font-size: 13px;
        }
        .toolbar select {
          padding: 9px 10px;
          border: 1px solid var(--line);
          border-radius: 9px;
          background: var(--raised);
          font-size: 13px;
        }

        .category-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 12px 20px;
          border-bottom: 1px solid var(--line);
        }
        .category-row button {
          padding: 6px 10px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: var(--surface);
          font-size: 12px;
          font-weight: 650;
        }
        .category-row button.on {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent-ink);
        }
        .category-row .count {
          margin-left: 4px;
          padding: 1px 6px;
          border-radius: 999px;
          background: var(--raised);
          font-size: 11px;
          color: var(--muted);
        }

        .list-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          font-size: 12px;
          color: var(--muted);
          flex-wrap: wrap;
        }
        .list-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .list-actions button {
          padding: 5px 9px;
          border: 1px solid var(--line);
          border-radius: 7px;
          background: var(--surface);
          font-size: 12px;
          font-weight: 650;
          color: var(--ink);
        }
        .list-actions button:hover:not(:disabled) {
          border-color: var(--accent);
        }

        .rows {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .rows.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 8px;
          padding: 12px 16px;
        }
        .row {
          display: flex;
          align-items: stretch;
          border-top: 1px solid var(--line);
          transition: background-color 0.15s;
        }
        .rows.grid .row {
          border: 1px solid var(--line);
          border-radius: 12px;
          flex-direction: column;
        }
        .row.active {
          background: var(--accent-soft);
        }
        .row-main {
          flex: 1;
          text-align: left;
          padding: 14px 20px;
          background: transparent;
          border: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .row-meta {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
        }
        .row-name {
          font-weight: 700;
          font-size: 13px;
        }
        .row-tag {
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 999px;
          background: var(--raised);
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
        }
        .row-warn {
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 999px;
          background: #fff7e6;
          color: #8a5b00;
          font-weight: 700;
        }
        .studio[data-theme="dark"] .row-warn {
          background: #2a1f0a;
          color: #ffd98a;
        }
        .row-output {
          font-size: 16px;
          line-height: 1.5;
          word-break: break-word;
        }
        .row-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 16px;
        }
        .rows.grid .row-actions {
          padding: 8px 12px 12px;
          justify-content: flex-end;
        }
        .heart {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: var(--surface);
          font-size: 15px;
          display: grid;
          place-items: center;
        }
        .heart.on {
          color: var(--accent);
          border-color: var(--accent);
        }
        .copy {
          padding: 6px 11px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--surface);
          font-size: 12px;
          font-weight: 700;
        }
        .copy:hover:not(:disabled) {
          border-color: var(--accent);
        }
        .copy.done {
          background: var(--ok);
          border-color: var(--ok);
          color: #fff;
        }

        .empty {
          text-align: center;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .empty h3 {
          font-size: 16px;
        }
        .empty p {
          color: var(--muted);
          font-size: 13px;
          max-width: 360px;
        }

        .symbol-group {
          padding: 14px 20px;
          border-top: 1px solid var(--line);
        }
        .symbol-group h3 {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--muted);
          margin-bottom: 8px;
        }
        .symbol-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .symbol-grid button {
          width: 40px;
          height: 40px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--raised);
          font-size: 18px;
        }
        .symbol-grid button:hover {
          border-color: var(--accent);
        }

        .idea-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .idea-list li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 0;
          border-top: 1px solid var(--line);
        }
        .idea-list li:first-child {
          border-top: 0;
        }
        .idea-list li > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .idea-list strong {
          font-size: 13px;
        }
        .idea-list span {
          font-size: 13px;
          color: var(--muted);
        }

        .recent-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .recent-list li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 0;
          border-top: 1px solid var(--line);
        }
        .recent-list li:first-child {
          border-top: 0;
        }
        .recent-list li > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .recent-text {
          font-size: 14px;
          word-break: break-word;
        }

        .guide {
          margin-top: 32px;
        }
        .guide h2 {
          font-size: 20px;
          margin-top: 24px;
        }
        .guide h2:first-child {
          margin-top: 0;
        }
        .guide p {
          margin-top: 8px;
          color: var(--muted);
        }
        .guide ul,
        .guide ol {
          margin: 8px 0 0;
          padding-left: 22px;
          color: var(--muted);
        }
        .guide li {
          margin-top: 6px;
        }
        .use-cases {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          margin-top: 12px;
        }
        .use-cases > div {
          padding: 14px;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: var(--surface);
        }
        .use-cases h3 {
          font-size: 14px;
        }
        .use-cases p {
          margin-top: 4px;
          font-size: 13px;
        }
        .faq {
          margin-top: 12px;
        }
        .faq details {
          padding: 12px 14px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: var(--surface);
          margin-bottom: 8px;
        }
        .faq summary {
          font-weight: 650;
          cursor: pointer;
        }
        .faq p {
          margin-top: 8px;
        }

        .note {
          margin-top: 24px;
          padding: 14px 18px;
          border-radius: 12px;
          background: var(--surface);
          border: 1px solid var(--line);
          font-size: 12px;
          color: var(--muted);
        }

        .toast {
          position: fixed;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          pointer-events: none;
          z-index: 60;
        }
        .toast span {
          display: block;
          padding: 10px 16px;
          border-radius: 10px;
          background: #15171bee;
          color: #fff;
          font-size: 13px;
          font-weight: 650;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
          animation: toastIn 0.2s ease-out;
        }
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .palette-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 12, 16, 0.5);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 80px 20px;
          z-index: 70;
          backdrop-filter: blur(2px);
        }
        .palette {
          width: min(520px, 100%);
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
          overflow: hidden;
        }
        .palette input {
          width: 100%;
          padding: 14px 16px;
          border: 0;
          border-bottom: 1px solid var(--line);
          background: transparent;
          font-size: 15px;
        }
        .palette ul {
          list-style: none;
          margin: 0;
          padding: 6px;
          max-height: 360px;
          overflow-y: auto;
        }
        .palette li button {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          text-align: left;
          font-size: 13px;
        }
        .palette li button:hover,
        .palette li button.on {
          background: var(--accent-soft);
          color: var(--accent-ink);
        }
        .palette-name {
          font-weight: 650;
        }
        .palette-tag {
          font-size: 11px;
          color: var(--muted);
        }

        .density-compact .panel {
          padding: 14px;
        }
        .density-compact .row-main {
          padding: 10px 14px;
        }
        .density-compact .category-row {
          padding: 8px 14px;
        }
        .density-compact .toolbar {
          padding: 12px 14px 0;
        }

        @media (max-width: 960px) {
          .workspace {
            grid-template-columns: 1fr;
          }
          .composer {
            position: static;
            max-height: none;
          }
          .hero {
            grid-template-columns: 1fr;
          }
          .hero-stats {
            width: 100%;
            justify-content: space-between;
          }
        }
        @media (max-width: 560px) {
          .studio {
            padding: 16px 12px 60px;
          }
          .row {
            flex-direction: column;
          }
          .row-actions {
            padding: 0 16px 12px;
            justify-content: flex-end;
          }
          .hero-stats {
            flex-wrap: wrap;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}
