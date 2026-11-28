"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ToolShell from "../ToolShell";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type Rgb = [number, number, number];
type PaletteId =
  | "original"
  | "adaptive"
  | "retro"
  | "pico8"
  | "gameboy"
  | "c64"
  | "cga"
  | "grayscale"
  | "mono";
type DitherMode = "none" | "floyd" | "bayer";
type Sampling = "smooth" | "sharp";
type ViewMode = "split" | "result" | "original";

interface Options {
  pixelSize: number;
  sampling: Sampling;
  palette: PaletteId;
  colors: number;
  dither: DitherMode;
  ditherStrength: number;
  brightness: number;
  contrast: number;
  saturation: number;
}

interface SourceImage {
  url: string;
  name: string;
  width: number;
  height: number;
  element: HTMLImageElement;
}

interface BaseImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

interface UsedColor {
  hex: string;
  count: number;
}

interface Processed {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  used: UsedColor[];
  uniqueCount: number;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const MAX_WORKING_DIMENSION = 1600;
const MAX_EXPORT_DIMENSION = 8192;
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const DEFAULT_OPTIONS: Options = {
  pixelSize: 12,
  sampling: "smooth",
  palette: "retro",
  colors: 16,
  dither: "none",
  ditherStrength: 70,
  brightness: 0,
  contrast: 0,
  saturation: 0,
};

const PALETTES: {
  id: PaletteId;
  label: string;
  hint: string;
  colors?: string[];
}[] = [
  { id: "original", label: "Original", hint: "Keeps every colour from the photo" },
  { id: "adaptive", label: "Adaptive", hint: "Picks the best colours from your photo" },
  {
    id: "retro",
    label: "Retro 16",
    hint: "Classic 16-colour pixel art palette",
    colors: [
      "#140c1c", "#442434", "#30346d", "#4e4a4e",
      "#854c30", "#346856", "#d04648", "#757161",
      "#597dce", "#d27d2c", "#8595a1", "#6daa2c",
      "#d2aa99", "#6dc2ca", "#dad45e", "#deeed6",
    ],
  },
  {
    id: "pico8",
    label: "PICO-8",
    hint: "Bright fantasy console palette",
    colors: [
      "#000000", "#1d2b53", "#7e2553", "#008751",
      "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8",
      "#ff004d", "#ffa300", "#ffec27", "#00e436",
      "#29adff", "#83769c", "#ff77a8", "#ffccaa",
    ],
  },
  {
    id: "gameboy",
    label: "Game Boy",
    hint: "Four shades of green",
    colors: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
  },
  {
    id: "c64",
    label: "Commodore 64",
    hint: "8-bit home computer colours",
    colors: [
      "#000000", "#ffffff", "#880000", "#aaffee",
      "#cc44cc", "#00cc55", "#0000aa", "#eeee77",
      "#dd8855", "#664400", "#ff7777", "#333333",
      "#777777", "#aaff66", "#0088ff", "#bbbbbb",
    ],
  },
  {
    id: "cga",
    label: "CGA",
    hint: "Four-colour DOS graphics",
    colors: ["#000000", "#55ffff", "#ff55ff", "#ffffff"],
  },
  { id: "grayscale", label: "Grayscale", hint: "Shades of gray, you choose how many" },
  { id: "mono", label: "Black and white", hint: "Pure 1-bit black and white" },
];

const PRESETS: { name: string; hint: string; options: Partial<Options> }[] = [
  {
    name: "Retro RPG",
    hint: "Chunky 16-colour look",
    options: { pixelSize: 10, palette: "retro", dither: "none", saturation: 10 },
  },
  {
    name: "Handheld",
    hint: "Green screen with dithering",
    options: {
      pixelSize: 8,
      palette: "gameboy",
      dither: "bayer",
      ditherStrength: 60,
      contrast: 15,
    },
  },
  {
    name: "Fantasy console",
    hint: "PICO-8 with soft shading",
    options: { pixelSize: 8, palette: "pico8", dither: "floyd", ditherStrength: 70 },
  },
  {
    name: "Newsprint",
    hint: "1-bit halftone feel",
    options: {
      pixelSize: 6,
      palette: "mono",
      dither: "bayer",
      ditherStrength: 100,
      contrast: 10,
    },
  },
  {
    name: "Clean 32",
    hint: "Adaptive colours, no dithering",
    options: {
      pixelSize: 6,
      palette: "adaptive",
      colors: 32,
      dither: "none",
      saturation: 15,
    },
  },
];

const EXPORT_SCALES = [
  { value: "match", label: "Match photo size" },
  { value: "1", label: "1× (one pixel per block)" },
  { value: "2", label: "2×" },
  { value: "4", label: "4×" },
  { value: "8", label: "8×" },
  { value: "16", label: "16×" },
];

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function hexToRgb(hex: string): Rgb {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function grayRamp(levels: number): Rgb[] {
  const count = Math.max(2, levels);
  return Array.from({ length: count }, (_, i) => {
    const v = Math.round((255 * i) / (count - 1));
    return [v, v, v] as Rgb;
  });
}

/** Median-cut quantiser: picks `count` representative colours from the image. */
function medianCut(buf: Float32Array, alpha: Uint8Array, count: number): Rgb[] {
  const total = alpha.length;
  const step = Math.max(1, Math.floor(total / 20000));
  const samples: number[] = [];

  for (let i = 0; i < total; i += step) {
    if (!alpha[i]) continue;
    samples.push(
      Math.round(clamp(buf[i * 3], 0, 255)),
      Math.round(clamp(buf[i * 3 + 1], 0, 255)),
      Math.round(clamp(buf[i * 3 + 2], 0, 255))
    );
  }

  const sampleCount = samples.length / 3;
  if (sampleCount === 0) return [[0, 0, 0]];

  const boxes: number[][] = [Array.from({ length: sampleCount }, (_, i) => i)];

  while (boxes.length < count) {
    let target = -1;
    let bestScore = 0;
    let bestChannel = 0;

    for (let b = 0; b < boxes.length; b++) {
      const box = boxes[b];
      if (box.length < 2) continue;

      const min = [255, 255, 255];
      const max = [0, 0, 0];

      for (const index of box) {
        for (let c = 0; c < 3; c++) {
          const v = samples[index * 3 + c];
          if (v < min[c]) min[c] = v;
          if (v > max[c]) max[c] = v;
        }
      }

      const ranges = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
      const range = Math.max(...ranges);
      if (range === 0) continue;

      const score = range * Math.sqrt(box.length);
      if (score > bestScore) {
        bestScore = score;
        target = b;
        bestChannel = ranges.indexOf(range);
      }
    }

    if (target < 0) break;

    const box = boxes[target];
    box.sort(
      (a, b) => samples[a * 3 + bestChannel] - samples[b * 3 + bestChannel]
    );
    const middle = box.length >> 1;
    boxes.splice(target, 1, box.slice(0, middle), box.slice(middle));
  }

  const seen = new Set<number>();
  const palette: Rgb[] = [];

  for (const box of boxes) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const index of box) {
      r += samples[index * 3];
      g += samples[index * 3 + 1];
      b += samples[index * 3 + 2];
    }
    const size = box.length || 1;
    const color: Rgb = [
      Math.round(r / size),
      Math.round(g / size),
      Math.round(b / size),
    ];
    const key = (color[0] << 16) | (color[1] << 8) | color[2];
    if (!seen.has(key)) {
      seen.add(key);
      palette.push(color);
    }
  }

  palette.sort(
    (a, b) =>
      0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2] -
      (0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2])
  );

  return palette;
}

/** Average distance from each palette colour to its closest neighbour. */
function averagePaletteGap(pal: Float32Array, size: number) {
  if (size < 2) return 0;
  let total = 0;
  for (let a = 0; a < size; a++) {
    let best = Number.POSITIVE_INFINITY;
    for (let b = 0; b < size; b++) {
      if (a === b) continue;
      const dr = pal[a * 3] - pal[b * 3];
      const dg = pal[a * 3 + 1] - pal[b * 3 + 1];
      const db = pal[a * 3 + 2] - pal[b * 3 + 2];
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      if (distance < best) best = distance;
    }
    total += best;
  }
  return total / size;
}

/** Draws the photo once at a sensible working size so later passes are fast. */
function buildWorkingCanvas(image: HTMLImageElement): HTMLCanvasElement | null {
  const scale = Math.min(
    1,
    MAX_WORKING_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight)
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

/** Shrinks an image to the target size in gentle steps for clean averaging. */
function resample(
  input: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  smooth: boolean
) {
  let current: HTMLCanvasElement = input;

  if (smooth) {
    while (
      current.width / 2 >= targetWidth &&
      current.height / 2 >= targetHeight
    ) {
      const step = document.createElement("canvas");
      step.width = Math.max(targetWidth, Math.floor(current.width / 2));
      step.height = Math.max(targetHeight, Math.floor(current.height / 2));
      const stepContext = step.getContext("2d");
      if (!stepContext) break;
      stepContext.imageSmoothingEnabled = true;
      stepContext.imageSmoothingQuality = "high";
      stepContext.drawImage(current, 0, 0, step.width, step.height);
      current = step;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.imageSmoothingEnabled = smooth;
  if (smooth) context.imageSmoothingQuality = "high";
  context.drawImage(current, 0, 0, targetWidth, targetHeight);

  return context.getImageData(0, 0, targetWidth, targetHeight);
}

function buildBase(
  working: HTMLCanvasElement,
  pixelSize: number,
  sampling: Sampling
): BaseImage | null {
  const width = Math.max(1, Math.round(working.width / pixelSize));
  const height = Math.max(1, Math.round(working.height / pixelSize));

  try {
    const imageData = resample(working, width, height, sampling === "smooth");
    if (!imageData) return null;
    return { width, height, data: imageData.data };
  } catch {
    return null;
  }
}

function processImage(base: BaseImage, options: Options): Processed {
  const { width, height, data } = base;
  const total = width * height;
  const buf = new Float32Array(total * 3);
  const alpha = new Uint8Array(total);

  // Colour adjustments.
  const brightness = options.brightness * 2.55;
  const contrastValue = options.contrast * 2;
  const contrastFactor =
    (259 * (contrastValue + 255)) / (255 * (259 - contrastValue));
  const saturation = 1 + options.saturation / 100;
  const grayOnly = options.palette === "grayscale" || options.palette === "mono";

  for (let i = 0; i < total; i++) {
    const p = i * 4;
    alpha[i] = data[p + 3] >= 128 ? 1 : 0;

    let r = contrastFactor * (data[p] + brightness - 128) + 128;
    let g = contrastFactor * (data[p + 1] + brightness - 128) + 128;
    let b = contrastFactor * (data[p + 2] + brightness - 128) + 128;

    const luma = 0.299 * r + 0.587 * g + 0.114 * b;

    if (grayOnly) {
      r = g = b = luma;
    } else {
      r = luma + (r - luma) * saturation;
      g = luma + (g - luma) * saturation;
      b = luma + (b - luma) * saturation;
    }

    buf[i * 3] = clamp(r, 0, 255);
    buf[i * 3 + 1] = clamp(g, 0, 255);
    buf[i * 3 + 2] = clamp(b, 0, 255);
  }

  // Resolve palette.
  let palette: Rgb[] | null = null;
  const definition = PALETTES.find((item) => item.id === options.palette);

  if (options.palette === "adaptive") {
    palette = medianCut(buf, alpha, options.colors);
  } else if (options.palette === "grayscale") {
    palette = grayRamp(options.colors);
  } else if (options.palette === "mono") {
    palette = grayRamp(2);
  } else if (definition?.colors) {
    palette = definition.colors.map(hexToRgb);
  }

  const out = new Uint8ClampedArray(total * 4);

  // Original colours: no quantisation.
  if (!palette) {
    for (let i = 0; i < total; i++) {
      out[i * 4] = Math.round(buf[i * 3]);
      out[i * 4 + 1] = Math.round(buf[i * 3 + 1]);
      out[i * 4 + 2] = Math.round(buf[i * 3 + 2]);
      out[i * 4 + 3] = alpha[i] ? 255 : 0;
    }
    return { width, height, data: out, used: [], uniqueCount: 0 };
  }

  const paletteSize = palette.length;
  const pal = new Float32Array(paletteSize * 3);
  palette.forEach((color, k) => {
    pal[k * 3] = color[0];
    pal[k * 3 + 1] = color[1];
    pal[k * 3 + 2] = color[2];
  });

  const nearest = (r: number, g: number, b: number) => {
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let k = 0; k < paletteSize; k++) {
      const dr = r - pal[k * 3];
      const dg = g - pal[k * 3 + 1];
      const db = b - pal[k * 3 + 2];
      const redMean = (r + pal[k * 3]) / 2;
      const distance =
        (2 + redMean / 256) * dr * dr +
        4 * dg * dg +
        (2 + (255 - redMean) / 256) * db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = k;
      }
    }
    return best;
  };

  const counts = new Map<number, number>();

  const write = (i: number, k: number) => {
    const r = Math.round(pal[k * 3]);
    const g = Math.round(pal[k * 3 + 1]);
    const b = Math.round(pal[k * 3 + 2]);
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 255;
    const key = (r << 16) | (g << 8) | b;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };

  const strength = options.ditherStrength / 100;

  if (options.dither === "floyd") {
    for (let y = 0; y < height; y++) {
      // Serpentine scan avoids diagonal streaks.
      const leftToRight = y % 2 === 0;
      for (let step = 0; step < width; step++) {
        const x = leftToRight ? step : width - 1 - step;
        const i = y * width + x;
        if (!alpha[i]) continue;

        const j = i * 3;
        const r = clamp(buf[j], 0, 255);
        const g = clamp(buf[j + 1], 0, 255);
        const b = clamp(buf[j + 2], 0, 255);

        const k = nearest(r, g, b);
        write(i, k);

        const er = (r - pal[k * 3]) * strength;
        const eg = (g - pal[k * 3 + 1]) * strength;
        const eb = (b - pal[k * 3 + 2]) * strength;

        const diffuse = (dx: number, dy: number, factor: number) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny >= height) return;
          const index = (ny * width + nx) * 3;
          buf[index] += er * factor;
          buf[index + 1] += eg * factor;
          buf[index + 2] += eb * factor;
        };

        const dir = leftToRight ? 1 : -1;
        diffuse(dir, 0, 7 / 16);
        diffuse(-dir, 1, 3 / 16);
        diffuse(0, 1, 5 / 16);
        diffuse(dir, 1, 1 / 16);
      }
    }
  } else {
    // Ordered dithering: shift size follows the real gap between palette colours.
    const gap = averagePaletteGap(pal, paletteSize);
    const amplitude =
      options.dither === "bayer" ? (gap / Math.sqrt(3)) * strength : 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (!alpha[i]) continue;

        const offset =
          amplitude === 0
            ? 0
            : ((BAYER_4[y % 4][x % 4] + 0.5) / 16 - 0.5) * amplitude;

        const j = i * 3;
        const k = nearest(
          clamp(buf[j] + offset, 0, 255),
          clamp(buf[j + 1] + offset, 0, 255),
          clamp(buf[j + 2] + offset, 0, 255)
        );
        write(i, k);
      }
    }
  }

  const used = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 32)
    .map(([key, count]) => ({
      hex: rgbToHex((key >> 16) & 255, (key >> 8) & 255, key & 255),
      count,
    }));

  return { width, height, data: out, used, uniqueCount: counts.size };
}

function renderExportCanvas(processed: Processed, scale: number) {
  const small = document.createElement("canvas");
  small.width = processed.width;
  small.height = processed.height;
  const smallContext = small.getContext("2d");
  if (!smallContext) return null;

  const imageData = smallContext.createImageData(processed.width, processed.height);
  imageData.data.set(processed.data);
  smallContext.putImageData(imageData, 0, 0);

  const output = document.createElement("canvas");
  output.width = processed.width * scale;
  output.height = processed.height * scale;
  const outputContext = output.getContext("2d");
  if (!outputContext) return null;

  outputContext.imageSmoothingEnabled = false;
  outputContext.drawImage(small, 0, 0, output.width, output.height);
  return output;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/png")
  );
}

/* -------------------------------------------------------------------------- */
/*  Small UI pieces                                                            */
/* -------------------------------------------------------------------------- */

function RangeField({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  help,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  help?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="range-field">
      <div className="range-head">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        <span className="range-value">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {help && <p className="section-help">{help}</p>}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="segmented">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`segment ${active ? "active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PaletteSwatch({ id, colors }: { id: PaletteId; colors?: string[] }) {
  if (colors) {
    return (
      <div className="swatch">
        {colors.map((color, index) => (
          <span key={`${color}-${index}`} style={{ background: color }} />
        ))}
      </div>
    );
  }

  const gradients: Record<string, string> = {
    original: "linear-gradient(90deg,#ef4444,#f59e0b,#84cc16,#06b6d4,#6366f1,#d946ef)",
    adaptive: "linear-gradient(90deg,#7c2d12,#ea580c,#fbbf24,#65a30d,#0e7490,#312e81)",
    grayscale: "linear-gradient(90deg,#000,#fff)",
    mono: "linear-gradient(90deg,#000 50%,#fff 50%)",
  };

  return <div className="swatch single" style={{ background: gradients[id] }} />;
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function PhotoToPixelArt() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef<string>("");
  const dragDepth = useRef(0);
  const splitDragging = useRef(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [source, setSource] = useState<SourceImage | null>(null);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const [view, setView] = useState<ViewMode>("split");
  const [split, setSplit] = useState(50);
  const [showGrid, setShowGrid] = useState(false);
  const [exportScale, setExportScale] = useState("match");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const deferred = useDeferredValue(options);
  const isUpdating = deferred !== options;

  /* ----------------------------- Processing ------------------------------ */

  const working = useMemo(
    () => (source ? buildWorkingCanvas(source.element) : null),
    [source]
  );

  const base = useMemo(
    () =>
      working ? buildBase(working, deferred.pixelSize, deferred.sampling) : null,
    [working, deferred.pixelSize, deferred.sampling]
  );

  const processed = useMemo(
    () => (base ? processImage(base, deferred) : null),
    [base, deferred]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !processed) return;

    canvas.width = processed.width;
    canvas.height = processed.height;

    const context = canvas.getContext("2d");
    if (!context) return;

    const imageData = context.createImageData(processed.width, processed.height);
    imageData.data.set(processed.data);
    context.putImageData(imageData, 0, 0);
  }, [processed, source]);

  /* ------------------------------- Helpers ------------------------------- */

  const flash = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 2200);
  }, []);

  const loadFile = useCallback(
    (file?: File | null) => {
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("That file is not an image. Choose a JPG, PNG, WebP or similar file.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("That image is larger than 15 MB. Choose a smaller file.");
        return;
      }

      const url = URL.createObjectURL(file);
      const element = new Image();

      element.onload = () => {
        if (!element.naturalWidth || !element.naturalHeight) {
          URL.revokeObjectURL(url);
          setError("This image has no readable size. Try a different file.");
          return;
        }

        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;

        setSource({
          url,
          name: file.name || "pasted-image.png",
          width: element.naturalWidth,
          height: element.naturalHeight,
          element,
        });
        setSplit(50);
        setError("");
        flash("Image loaded");
      };

      element.onerror = () => {
        URL.revokeObjectURL(url);
        setError("Your browser could not open this image. Try a JPG, PNG or WebP version.");
      };

      element.src = url;
    },
    [flash]
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            loadFile(file);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadFile]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const update = <K extends keyof Options>(key: K, value: Options[K]) =>
    setOptions((previous) => ({ ...previous, [key]: value }));

  const resetAll = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = "";
    }
    setSource(null);
    setOptions(DEFAULT_OPTIONS);
    setView("split");
    setSplit(50);
    setShowGrid(false);
    setExportScale("match");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ------------------------------- Export -------------------------------- */

  // "Match photo size" scales each pixel block back up to the photo's own size.
  const rawScale =
    exportScale === "match"
      ? processed && source
        ? Math.max(1, Math.round(source.width / processed.width))
        : 1
      : Number(exportScale);
  const maxSide = processed ? Math.max(processed.width, processed.height) : 1;
  const scale = Math.max(
    1,
    Math.min(rawScale, Math.floor(MAX_EXPORT_DIMENSION / maxSide))
  );
  const exportWidth = processed ? processed.width * scale : 0;
  const exportHeight = processed ? processed.height * scale : 0;

  async function handleDownload() {
    if (!processed || !source) return;

    const canvas = renderExportCanvas(processed, scale);
    const blob = canvas ? await canvasToBlob(canvas) : null;

    if (!blob) {
      setError("Could not create the PNG file. Try a smaller export size.");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const baseName = source.name.replace(/\.[^/.]+$/, "") || "pixel-art";

    link.href = url;
    link.download = `${baseName}-pixel-art-${exportWidth}x${exportHeight}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    flash("PNG downloaded");
  }

  async function handleCopy() {
    if (!processed) return;

    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof ClipboardItem === "undefined"
    ) {
      setError("Your browser cannot copy images. Download the PNG instead.");
      return;
    }

    try {
      const canvas = renderExportCanvas(processed, scale);
      const blob = canvas ? await canvasToBlob(canvas) : null;
      if (!blob) throw new Error("No blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      flash("Image copied to clipboard");
    } catch {
      setError("Could not copy the image. Download the PNG instead.");
    }
  }

  async function copyHex(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      flash(`Copied ${hex}`);
    } catch {
      setError("Could not copy the colour code.");
    }
  }

  /* ---------------------------- Compare slider --------------------------- */

  function moveSplit(clientX: number) {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width === 0) return;
    setSplit(clamp(((clientX - rect.left) / rect.width) * 100, 0, 100));
  }

  /* -------------------------------- Render ------------------------------- */

  const hasFiles = (event: React.DragEvent) =>
    Array.from(event.dataTransfer.types).includes("Files");

  const activePalette = PALETTES.find((item) => item.id === options.palette);
  const paletteUsesCount =
    options.palette === "adaptive" || options.palette === "grayscale";
  const ditherAvailable = options.palette !== "original";

  return (
    <ToolShell title="Pixel Art Studio Pro" onReset={resetAll} wide>
      <div
        className="px-pro"
        onDragEnter={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          if (hasFiles(event)) event.preventDefault();
        }}
        onDragLeave={(event) => {
          if (!hasFiles(event)) return;
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setIsDragging(false);
          loadFile(event.dataTransfer.files?.[0]);
        }}
      >
        <style jsx global>{`
          .px-pro {
            --accent: #ff5a1f;
            position: relative;
            color: #172033;
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }
          .px-pro *,
          .px-pro *::before,
          .px-pro *::after {
            box-sizing: border-box;
          }

          .px-pro .studio-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(340px, 440px);
            gap: 20px;
            align-items: start;
            width: 100%;
            min-width: 0;
          }
          .px-pro .studio-main,
          .px-pro .studio-sidebar {
            display: flex;
            flex-direction: column;
            gap: 16px;
            min-width: 0;
          }
          .px-pro .studio-sidebar {
            position: sticky;
            top: 18px;
          }

          .px-pro .section {
            background: #fff;
            border: 1px solid #e5eaf2;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 3px 12px rgba(20, 35, 60, 0.035);
            min-width: 0;
            width: 100%;
          }
          .px-pro .section-heading {
            font-size: 15px;
            font-weight: 780;
            margin: 0 0 5px;
            color: #172033;
          }
          .px-pro .section-help {
            color: #7a8497;
            font-size: 12px;
            line-height: 1.6;
            margin: 6px 0 0;
          }
          .px-pro .section-help.lead {
            margin: 0 0 15px;
          }
          .px-pro .field-label {
            display: block;
            font-size: 12px;
            font-weight: 700;
            color: #30394c;
            margin-bottom: 7px;
          }
          .px-pro .select {
            width: 100%;
            height: 44px;
            border: 1px solid #d8e0eb;
            border-radius: 10px;
            padding: 9px 11px;
            background: #fff;
            color: #172033;
            font: inherit;
            font-size: 13px;
            outline: none;
          }
          .px-pro .select:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
          }
          .px-pro .stack {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }

          /* Range */
          .px-pro .range-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }
          .px-pro .range-head .field-label {
            margin-bottom: 4px;
          }
          .px-pro .range-value {
            min-width: 52px;
            text-align: center;
            font-size: 12px;
            font-weight: 750;
            font-variant-numeric: tabular-nums;
            background: #f3f5f8;
            color: #30394c;
            border-radius: 7px;
            padding: 2px 8px;
          }
          .px-pro .range {
            width: 100%;
            cursor: pointer;
            accent-color: var(--accent);
          }

          /* Segmented */
          .px-pro .segmented {
            display: grid;
            grid-auto-flow: column;
            grid-auto-columns: 1fr;
            gap: 4px;
            padding: 4px;
            background: #f0f2f6;
            border-radius: 11px;
          }
          .px-pro .segment {
            border: 0;
            background: transparent;
            border-radius: 8px;
            padding: 9px 8px;
            min-height: 36px;
            font-size: 12px;
            font-weight: 700;
            color: #5b6579;
            cursor: pointer;
          }
          .px-pro .segment:hover {
            color: #172033;
          }
          .px-pro .segment.active {
            background: #fff;
            color: var(--accent);
            box-shadow: 0 1px 3px rgba(20, 35, 60, 0.12);
          }
          .px-pro .segment:focus-visible,
          .px-pro .button:focus-visible,
          .px-pro .style-card:focus-visible,
          .px-pro .chip:focus-visible,
          .px-pro .color-chip:focus-visible {
            outline: 3px solid rgba(255, 90, 31, 0.25);
            outline-offset: 2px;
          }

          /* Cards */
          .px-pro .style-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
          .px-pro .style-card {
            padding: 12px;
            text-align: left;
            border: 1px solid #e1e5ec;
            background: #fff;
            border-radius: 11px;
            cursor: pointer;
            min-width: 0;
            transition: 0.18s ease;
          }
          .px-pro .style-card:hover {
            border-color: var(--accent);
          }
          .px-pro .style-card.active {
            border: 2px solid var(--accent);
            background: #fff7f3;
            padding: 11px;
          }
          .px-pro .style-card strong {
            display: block;
            font-size: 13px;
            margin-bottom: 7px;
            color: #172033;
          }
          .px-pro .swatch {
            display: flex;
            height: 12px;
            overflow: hidden;
            border-radius: 3px;
          }
          .px-pro .swatch span {
            flex: 1;
          }
          .px-pro .swatch.single {
            width: 100%;
            box-shadow: inset 0 0 0 1px #d8e0eb;
          }

          .px-pro .chip-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .px-pro .chip {
            border: 1px solid #dfe3eb;
            background: #fff;
            color: #30394c;
            border-radius: 999px;
            padding: 8px 14px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: 0.18s ease;
          }
          .px-pro .chip:hover {
            border-color: var(--accent);
            color: var(--accent);
            background: #fff8f5;
          }

          /* Buttons */
          .px-pro .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            min-height: 44px;
            padding: 10px 13px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 750;
            cursor: pointer;
            border: 1px solid #dfe3eb;
            background: #fff;
            color: #30394c;
            transition: 0.18s ease;
          }
          .px-pro .button:hover:not(:disabled) {
            border-color: var(--accent);
            color: var(--accent);
          }
          .px-pro .button.primary {
            background: linear-gradient(135deg, #ff6b35, #ff5a1f);
            border-color: var(--accent);
            color: #fff;
            box-shadow: 0 4px 12px rgba(255, 90, 31, 0.16);
          }
          .px-pro .button.primary:hover:not(:disabled) {
            background: #e94b13;
            color: #fff;
            border-color: #e94b13;
          }
          .px-pro .button:disabled {
            opacity: 0.45;
            cursor: not-allowed;
          }
          .px-pro .button-row {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
            margin-top: 12px;
          }
          .px-pro .toggle-button {
            width: auto;
            min-height: 34px;
            padding: 6px 12px;
          }
          .px-pro .toggle-button.on {
            border-color: var(--accent);
            background: #fff7f3;
            color: var(--accent);
          }
          .px-pro .link-button {
            border: 0;
            background: none;
            color: var(--accent);
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            padding: 0;
          }

          /* Upload */
          .px-pro .file-picker {
            display: block;
            width: 100%;
            padding: 28px 20px;
            border: 1.5px dashed #cbd2df;
            border-radius: 12px;
            background: #fafbfc;
            cursor: pointer;
            text-align: center;
            transition: 0.18s ease;
          }
          .px-pro .file-picker:hover {
            border-color: var(--accent);
            background: #fff9f6;
          }
          .px-pro .file-picker strong {
            display: block;
            font-size: 13px;
            margin-bottom: 5px;
          }
          .px-pro .file-picker span {
            display: block;
            color: #80899a;
            font-size: 11px;
            line-height: 1.5;
          }
          .px-pro .file-info {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-top: 14px;
            padding: 10px 12px;
            border: 1px solid #e5e8ef;
            border-radius: 10px;
            background: #fafbfc;
          }
          .px-pro .file-info strong {
            display: block;
            font-size: 12px;
            overflow-wrap: anywhere;
          }
          .px-pro .file-info span {
            font-size: 11px;
            color: #818b9c;
          }

          /* Preview */
          .px-pro .preview-toolbar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 12px;
          }
          .px-pro .preview-toolbar .segmented {
            flex: 1 1 220px;
          }
          .px-pro .updating {
            font-size: 11px;
            color: #818b9c;
            transition: opacity 0.2s ease;
          }
          .px-pro .stage-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 240px;
            padding: 10px;
            border: 1px solid #e4e7ed;
            border-radius: 12px;
            background: #f3f5f8;
            overflow: hidden;
          }
          .px-pro .stage {
            position: relative;
            overflow: hidden;
            border-radius: 8px;
            user-select: none;
            background-color: #fff;
            background-image: conic-gradient(
              #e9ecf1 25%,
              #fff 0 50%,
              #e9ecf1 0 75%,
              #fff 0
            );
            background-size: 16px 16px;
            box-shadow: 0 1px 4px rgba(20, 35, 60, 0.15);
          }
          .px-pro .stage canvas {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            image-rendering: pixelated;
          }
          .px-pro .stage img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: fill;
            pointer-events: none;
          }
          .px-pro .grid-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }
          .px-pro .tag {
            position: absolute;
            top: 8px;
            padding: 2px 8px;
            border-radius: 6px;
            background: rgba(23, 32, 51, 0.78);
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            pointer-events: none;
          }
          .px-pro .divider {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            transform: translateX(-50%);
            background: #fff;
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25);
          }
          .px-pro .divider:focus-visible {
            outline: none;
            background: var(--accent);
          }
          .px-pro .divider-handle {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 34px;
            height: 34px;
            transform: translate(-50%, -50%);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #fff;
            color: #465066;
            font-size: 12px;
            font-weight: 800;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          }

          .px-pro .stats {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
            margin: 12px 0 0;
          }
          .px-pro .stat {
            border: 1px solid #e5eaf2;
            border-radius: 10px;
            background: #fafbfc;
            padding: 8px 6px;
            text-align: center;
          }
          .px-pro .stat dt {
            font-size: 11px;
            color: #7a8497;
          }
          .px-pro .stat dd {
            margin: 2px 0 0;
            font-size: 13px;
            font-weight: 750;
            font-variant-numeric: tabular-nums;
          }

          .px-pro .color-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .px-pro .color-chip {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: 1px solid rgba(20, 35, 60, 0.18);
            cursor: pointer;
            transition: transform 0.12s ease;
          }
          .px-pro .color-chip:hover {
            transform: scale(1.12);
          }

          .px-pro .empty {
            text-align: center;
            color: #8992a2;
            font-size: 12px;
            padding: 30px 8px;
            line-height: 1.5;
          }

          .px-pro .notice {
            border: 1px solid #ffe1d3;
            background: #fff8f4;
            color: #87462e;
            border-radius: 10px;
            padding: 12px;
            font-size: 11px;
            line-height: 1.6;
            margin-top: 12px;
          }
          .px-pro .error {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 10px;
            border: 1px solid #ffd4cc;
            background: #fff2f0;
            color: #b42318;
            border-radius: 10px;
            padding: 12px;
            font-size: 12px;
            line-height: 1.5;
            margin-bottom: 16px;
          }
          .px-pro .error button {
            border: 0;
            background: none;
            color: #b42318;
            font-size: 16px;
            line-height: 1;
            cursor: pointer;
          }

          .px-pro .drop-overlay {
            position: absolute;
            inset: 0;
            z-index: 30;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px dashed var(--accent);
            border-radius: 16px;
            background: rgba(255, 247, 243, 0.92);
            color: #c2410c;
            font-size: 16px;
            font-weight: 750;
            pointer-events: none;
          }

          .px-pro .toast {
            position: fixed;
            bottom: 24px;
            left: 50%;
            z-index: 50;
            transform: translate(-50%, 8px);
            padding: 9px 16px;
            border-radius: 999px;
            background: #172033;
            color: #fff;
            font-size: 13px;
            font-weight: 600;
            opacity: 0;
            pointer-events: none;
            transition: all 0.2s ease;
          }
          .px-pro .toast.show {
            opacity: 1;
            transform: translate(-50%, 0);
          }

          @media (max-width: 1099px) {
            .px-pro .studio-layout {
              grid-template-columns: minmax(0, 1fr);
            }
            .px-pro .studio-sidebar {
              position: static;
              order: -1;
            }
          }
          @media (max-width: 600px) {
            .px-pro .section {
              padding: 15px;
            }
            .px-pro .button-row,
            .px-pro .style-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(event) => {
            loadFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        {isDragging && <div className="drop-overlay">Drop your image to load it</div>}

        {error && (
          <div className="error" role="alert">
            <p style={{ margin: 0 }}>{error}</p>
            <button type="button" aria-label="Dismiss message" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        <div className="studio-layout">
          {/* ============================ LEFT COLUMN ============================ */}
          <main className="studio-main">
            {/* 1. Photo */}
            <section className="section">
              <h3 className="section-heading">1. Your photo</h3>
              <p className="section-help lead">
                Choose a photo to convert. You can also drag and drop it anywhere
                on this page, or paste it with Ctrl+V or Cmd+V.
              </p>

              <label className="file-picker">
                <strong>{source ? "＋ Choose a different photo" : "＋ Choose a photo"}</strong>
                <span>JPG, PNG, WebP and other browser formats · Up to 15 MB</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(event) => {
                    loadFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>

              {source && (
                <div className="file-info">
                  <div style={{ minWidth: 0 }}>
                    <strong>{source.name}</strong>
                    <span>
                      {source.width}×{source.height}px
                    </span>
                  </div>
                  <button type="button" className="link-button" onClick={resetAll}>
                    Remove
                  </button>
                </div>
              )}
            </section>

            {/* 2. Quick styles */}
            <section className="section">
              <h3 className="section-heading">2. Quick styles</h3>
              <p className="section-help lead">
                Start from a ready-made look, then fine-tune it below.
              </p>
              <div className="chip-row">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className="chip"
                    title={preset.hint}
                    onClick={() => setOptions({ ...DEFAULT_OPTIONS, ...preset.options })}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </section>

            {/* 3. Pixelation */}
            <section className="section">
              <h3 className="section-heading">3. Pixelation</h3>
              <p className="section-help lead">
                Larger pixels give a chunkier, more abstract picture.
              </p>
              <div className="stack">
                <RangeField
                  id="pixel-size"
                  label="Pixel size"
                  value={options.pixelSize}
                  min={2}
                  max={64}
                  suffix="px"
                  onChange={(value) => update("pixelSize", value)}
                />
                <div>
                  <span className="field-label">Sampling</span>
                  <Segmented<Sampling>
                    label="Sampling method"
                    value={options.sampling}
                    onChange={(value) => update("sampling", value)}
                    options={[
                      { value: "smooth", label: "Smooth average" },
                      { value: "sharp", label: "Sharp pick" },
                    ]}
                  />
                  <p className="section-help">
                    Smooth blends each block for natural colour. Sharp picks one
                    pixel per block for a harder look.
                  </p>
                </div>
              </div>
            </section>

            {/* 4. Palette */}
            <section className="section">
              <h3 className="section-heading">4. Colour palette</h3>
              <p className="section-help lead">Pick the colours your pixel art can use.</p>

              <div className="style-grid" role="radiogroup" aria-label="Colour palette">
                {PALETTES.map((item) => {
                  const active = item.id === options.palette;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      title={item.hint}
                      className={`style-card ${active ? "active" : ""}`}
                      onClick={() => update("palette", item.id)}
                    >
                      <strong>{item.label}</strong>
                      <PaletteSwatch id={item.id} colors={item.colors} />
                    </button>
                  );
                })}
              </div>

              {activePalette && <p className="section-help">{activePalette.hint}.</p>}

              {paletteUsesCount && (
                <div style={{ marginTop: 16 }}>
                  <RangeField
                    id="color-count"
                    label={options.palette === "grayscale" ? "Gray levels" : "Number of colours"}
                    value={options.colors}
                    min={2}
                    max={options.palette === "grayscale" ? 16 : 32}
                    onChange={(value) => update("colors", value)}
                  />
                </div>
              )}
            </section>

            {/* 5. Dithering */}
            <section className="section">
              <h3 className="section-heading">5. Dithering</h3>
              <p className="section-help lead">
                Dithering mixes palette colours to fake extra shades.
              </p>

              {ditherAvailable ? (
                <div className="stack">
                  <div>
                    <Segmented<DitherMode>
                      label="Dithering method"
                      value={options.dither}
                      onChange={(value) => update("dither", value)}
                      options={[
                        { value: "none", label: "Off" },
                        { value: "floyd", label: "Diffusion" },
                        { value: "bayer", label: "Ordered" },
                      ]}
                    />
                    <p className="section-help">
                      Diffusion looks organic. Ordered gives a retro crosshatch.
                    </p>
                  </div>
                  {options.dither !== "none" && (
                    <RangeField
                      id="dither-strength"
                      label="Dither strength"
                      value={options.ditherStrength}
                      min={10}
                      max={100}
                      suffix="%"
                      onChange={(value) => update("ditherStrength", value)}
                    />
                  )}
                </div>
              ) : (
                <p className="section-help">Choose a limited palette to use dithering.</p>
              )}
            </section>

            {/* 6. Adjustments */}
            <section className="section">
              <div className="range-head" style={{ marginBottom: 5 }}>
                <h3 className="section-heading" style={{ margin: 0 }}>
                  6. Adjust the photo
                </h3>
                <button
                  type="button"
                  className="link-button"
                  onClick={() =>
                    setOptions((previous) => ({
                      ...previous,
                      brightness: 0,
                      contrast: 0,
                      saturation: 0,
                    }))
                  }
                >
                  Reset
                </button>
              </div>
              <p className="section-help lead">Applied before the palette is chosen.</p>
              <div className="stack">
                <RangeField
                  id="brightness"
                  label="Brightness"
                  value={options.brightness}
                  min={-100}
                  max={100}
                  onChange={(value) => update("brightness", value)}
                />
                <RangeField
                  id="contrast"
                  label="Contrast"
                  value={options.contrast}
                  min={-100}
                  max={100}
                  onChange={(value) => update("contrast", value)}
                />
                <RangeField
                  id="saturation"
                  label="Saturation"
                  value={options.saturation}
                  min={-100}
                  max={100}
                  onChange={(value) => update("saturation", value)}
                />
              </div>
            </section>
          </main>

          {/* ============================ RIGHT COLUMN =========================== */}
          <aside className="studio-sidebar">
            {/* 7. Preview */}
            <section className="section">
              <h3 className="section-heading">7. Before and after preview</h3>
              <p className="section-help lead">
                Drag across the picture to compare the photo with your pixel art.
              </p>

              {!source ? (
                <div className="empty">Choose a photo to see your pixel art here.</div>
              ) : (
                <>
                  <div className="preview-toolbar">
                    <Segmented<ViewMode>
                      label="Preview mode"
                      value={view}
                      onChange={setView}
                      options={[
                        { value: "split", label: "Compare" },
                        { value: "result", label: "Pixel art" },
                        { value: "original", label: "Original" },
                      ]}
                    />
                    <span
                      className="updating"
                      aria-live="polite"
                      style={{ opacity: isUpdating ? 1 : 0 }}
                    >
                      Updating…
                    </span>
                    <button
                      type="button"
                      className={`button toggle-button ${showGrid ? "on" : ""}`}
                      aria-pressed={showGrid}
                      onClick={() => setShowGrid((value) => !value)}
                    >
                      Pixel grid
                    </button>
                  </div>

                  <div className="stage-wrap">
                    {processed ? (
                      <div
                        ref={stageRef}
                        className="stage"
                        style={{
                          aspectRatio: `${processed.width} / ${processed.height}`,
                          width: `min(100%, calc(60vh * ${processed.width / processed.height}))`,
                          touchAction: view === "split" ? "none" : "auto",
                          cursor: view === "split" ? "ew-resize" : "default",
                        }}
                        onPointerDown={(event) => {
                          if (view !== "split") return;
                          splitDragging.current = true;
                          event.currentTarget.setPointerCapture(event.pointerId);
                          moveSplit(event.clientX);
                        }}
                        onPointerMove={(event) => {
                          if (splitDragging.current) moveSplit(event.clientX);
                        }}
                        onPointerUp={(event) => {
                          splitDragging.current = false;
                          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                            event.currentTarget.releasePointerCapture(event.pointerId);
                          }
                        }}
                        onPointerCancel={() => {
                          splitDragging.current = false;
                        }}
                      >
                        <canvas
                          ref={canvasRef}
                          aria-label="Generated pixel art image"
                          style={{ opacity: view === "original" ? 0 : 1 }}
                        />

                        {showGrid && view !== "original" && processed.width <= 256 && (
                          <div
                            className="grid-overlay"
                            style={{
                              backgroundImage:
                                "linear-gradient(to right, rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.18) 1px, transparent 1px)",
                              backgroundSize: `${100 / processed.width}% ${100 / processed.height}%`,
                            }}
                          />
                        )}

                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={source.url}
                          alt="Original uploaded photo"
                          draggable={false}
                          style={{
                            visibility: view === "result" ? "hidden" : "visible",
                            clipPath:
                              view === "split"
                                ? `inset(0 ${100 - split}% 0 0)`
                                : "inset(0 0 0 0)",
                          }}
                        />

                        {view === "split" && (
                          <>
                            <span className="tag" style={{ left: 8 }}>
                              Original
                            </span>
                            <span className="tag" style={{ right: 8 }}>
                              Pixel art
                            </span>
                            <div
                              role="slider"
                              tabIndex={0}
                              aria-label="Compare original and pixel art"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(split)}
                              className="divider"
                              style={{ left: `${split}%` }}
                              onKeyDown={(event) => {
                                if (event.key === "ArrowLeft") {
                                  event.preventDefault();
                                  setSplit((value) => clamp(value - 5, 0, 100));
                                }
                                if (event.key === "ArrowRight") {
                                  event.preventDefault();
                                  setSplit((value) => clamp(value + 5, 0, 100));
                                }
                              }}
                            >
                              <span className="divider-handle">◂▸</span>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="empty">
                        This image could not be processed. Try a smaller or different file.
                      </div>
                    )}
                  </div>

                  {processed && (
                    <dl className="stats">
                      <div className="stat">
                        <dt>Pixel grid</dt>
                        <dd>
                          {processed.width}×{processed.height}
                        </dd>
                      </div>
                      <div className="stat">
                        <dt>Colours used</dt>
                        <dd>{processed.uniqueCount > 0 ? processed.uniqueCount : "Full colour"}</dd>
                      </div>
                      <div className="stat">
                        <dt>PNG size</dt>
                        <dd>
                          {exportWidth}×{exportHeight}
                        </dd>
                      </div>
                    </dl>
                  )}
                </>
              )}
            </section>

            {/* 8. Colours */}
            {processed && processed.used.length > 0 && (
              <section className="section">
                <h3 className="section-heading">8. Colours in your image</h3>
                <p className="section-help lead">Click a colour to copy its code.</p>
                <div className="color-grid">
                  {processed.used.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      className="color-chip"
                      onClick={() => void copyHex(color.hex)}
                      title={`${color.hex} · ${color.count} pixels`}
                      aria-label={`Copy colour ${color.hex}`}
                      style={{ background: color.hex }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 9. Export */}
            <section className="section">
              <h3 className="section-heading">
                {processed && processed.used.length > 0 ? "9" : "8"}. Export
              </h3>
              <p className="section-help lead">
                Download a sharp PNG with crisp, hard-edged pixels.
              </p>

              <label className="field-label" htmlFor="export-size">
                PNG size
              </label>
              <select
                id="export-size"
                className="select"
                value={exportScale}
                onChange={(event) => setExportScale(event.target.value)}
              >
                {EXPORT_SCALES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p className="section-help">
                {processed
                  ? `Your PNG will be ${exportWidth}×${exportHeight}px.`
                  : "Choose a photo to see the export size."}
              </p>

              <div className="button-row">
                <button
                  type="button"
                  className="button primary"
                  disabled={!processed}
                  onClick={() => void handleDownload()}
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={!processed}
                  onClick={() => void handleCopy()}
                >
                  Copy image
                </button>
              </div>
            </section>
          </aside>
        </div>

        <div className="notice" style={{ marginTop: 16 }}>
          <strong>Privacy and processing:</strong> Your photo is processed inside your
          browser and is never uploaded to a server.
        </div>

        <div role="status" aria-live="polite" className={`toast ${notice ? "show" : ""}`}>
          {notice}
        </div>
      </div>
    </ToolShell>
  );
}