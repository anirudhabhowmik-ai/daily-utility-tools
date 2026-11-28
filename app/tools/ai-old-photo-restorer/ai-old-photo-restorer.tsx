"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent } from "react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type Status = "idle" | "loading" | "processing" | "completed" | "error";
type Quality = "fast" | "balanced" | "high";
type OutFormat = "png" | "jpeg" | "webp";
type ViewMode = "slider" | "side";
type Device = "wasm" | "webgpu";
type Engine = "lightweight" | "classical" | "face";

interface ImageInfo {
  width: number;
  height: number;
  bytes: number;
}

interface ResultInfo {
  width: number;
  height: number;
  bytes: number;
  seconds: number;
}

class CancelError extends Error {
  constructor() {
    super("Enhancement cancelled.");
    this.name = "CancelError";
  }
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const ENGINES: Record<Engine, { id: string; label: string; hint: string }> = {
  lightweight: {
    id: "Xenova/swin2SR-lightweight-x2-64",
    label: "Fast Upscaler",
    hint: "Quick sharpening and 2x upscaling. Best for objects/landscapes.",
  },
  classical: {
    id: "Xenova/swin2SR-classical-sr-x2-64",
    label: "High Quality Upscaler",
    hint: "Sharper detail for objects, but many times slower.",
  },
  face: {
    // NOTE: Ensure this exact model exists on HuggingFace and supports image-to-image pipeline
    id: "Xenova/gfpgan", 
    label: "Face Restorer",
    hint: "Rebuilds facial features, eyes, and skin. Best for portraits.",
  },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// INCREASED TILE SIZES: Gives the AI more context to prevent blurry faces.
const TILE_CPU = { tile: 256, pad: 16 };
const TILE_GPU = { tile: 512, pad: 32 };

const QUALITY: Record<Quality, { label: string; side: number; hint: string }> = {
  fast: { label: "Fast", side: 512, hint: "Longest side up to 512 px" },
  balanced: { label: "Balanced", side: 1024, hint: "Longest side up to 1024 px" },
  high: { label: "High", side: 1536, hint: "Longest side up to 1536 px" },
};

const FORMATS: { value: OutFormat; label: string; mime: string; ext: string }[] = [
  { value: "png", label: "PNG", mime: "image/png", ext: "png" },
  { value: "jpeg", label: "JPG", mime: "image/jpeg", ext: "jpg" },
  { value: "webp", label: "WebP", mime: "image/webp", ext: "webp" },
];

/* -------------------------------------------------------------------------- */
/*  AI engine (runs in a background worker)                                    */
/* -------------------------------------------------------------------------- */

const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3";

const WORKER_SOURCE = `
import { pipeline, RawImage, env } from "${TRANSFORMERS_URL}";
env.allowLocalModels = false;
try {
  if (self.crossOriginIsolated && env.backends && env.backends.onnx && env.backends.onnx.wasm) {
    env.backends.onnx.wasm.numThreads = Math.max(1, Math.min(4, (self.navigator.hardwareConcurrency || 2) - 1));
  }
} catch (e) {}

let pipe = null;
let pipeDevice = null;
const files = {};

function report(info) {
  if (!info || typeof info.file !== "string") return;
  if (info.status === "progress" && isFinite(info.progress)) files[info.file] = info.progress;
  else if (info.status === "done") files[info.file] = 100;
  else return;
  const values = Object.values(files);
  const percent = values.reduce((a, b) => a + b, 0) / values.length;
  self.postMessage({ type: "progress", percent: percent });
}

self.onmessage = async (event) => {
  const m = event.data;
  try {
    if (m.type === "load") {
      const key = m.device + "|" + m.model;
      if (!pipe || pipeDevice !== key) {
        pipe = null;
        pipe = await pipeline("image-to-image", m.model, { device: m.device, progress_callback: report });
        pipeDevice = key;
      }
      self.postMessage({ type: "done", id: m.id });
    } else if (m.type === "run") {
      const image = new RawImage(new Uint8ClampedArray(m.data), m.width, m.height, 3);
      let out = await pipe(image);
      if (Array.isArray(out)) out = out[0];
      const copy = new Uint8ClampedArray(out.data);
      self.postMessage(
        { type: "done", id: m.id, result: { width: out.width, height: out.height, channels: out.channels, data: copy } },
        [copy.buffer]
      );
    }
  } catch (error) {
    self.postMessage({ type: "error", id: m.id, message: String((error && error.message) || error) });
  }
};
`;

interface PendingCall {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

let worker: Worker | null = null;
let workerUrl = "";
let nextCallId = 1;
let loadedKey = "";
let progressListener: ((percent: number) => void) | null = null;
const pendingCalls = new Map<number, PendingCall>();

function disposeWorker(reason = "The AI engine was stopped.") {
  if (worker) worker.terminate();
  worker = null;
  if (workerUrl) URL.revokeObjectURL(workerUrl);
  workerUrl = "";
  loadedKey = "";
  pendingCalls.forEach((call) => call.reject(new Error(reason)));
  pendingCalls.clear();
}

function getWorker(): Worker {
  if (worker) return worker;
  workerUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
  const instance = new Worker(workerUrl, { type: "module" });

  instance.onmessage = (event: MessageEvent) => {
    const message = event.data;
    if (message.type === "progress") {
      progressListener?.(message.percent);
      return;
    }
    const call = pendingCalls.get(message.id);
    if (!call) return;
    pendingCalls.delete(message.id);
    if (message.type === "error") call.reject(new Error(message.message));
    else call.resolve(message.result);
  };

  instance.onerror = (event: ErrorEvent) => {
    event.preventDefault?.();
    disposeWorker(
      "The AI engine could not be started. Check your internet connection (it loads from a CDN) and try again."
    );
  };

  worker = instance;
  return instance;
}

function callWorker(message: Record<string, unknown>, transfer: Transferable[] = []) {
  return new Promise<any>((resolve, reject) => {
    const id = nextCallId++;
    pendingCalls.set(id, { resolve, reject });
    try {
      getWorker().postMessage({ ...message, id }, transfer);
    } catch (error) {
      pendingCalls.delete(id);
      reject(error instanceof Error ? error : new Error("Could not start the AI engine."));
    }
  });
}

async function ensureModel(device: Device, engine: Engine) {
  const key = `${device}|${ENGINES[engine].id}`;
  if (loadedKey === key && worker) return;
  await callWorker({ type: "load", device, model: ENGINES[engine].id });
  loadedKey = key;
}

function upscaleTile(rgb: Uint8ClampedArray, width: number, height: number) {
  return callWorker({ type: "run", data: rgb.buffer, width, height }, [rgb.buffer]);
}

/* -------------------------------------------------------------------------- */
/*  Image helpers                                                              */
/* -------------------------------------------------------------------------- */

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This image could not be opened. Try another file."));
    img.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, type = "image/png", quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create the image file."))),
      type,
      quality
    )
  );
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  return { canvas, ctx };
}

function estimate(info: ImageInfo | null, quality: Quality, tile: number) {
  if (!info) return null;
  const scale = Math.min(1, QUALITY[quality].side / Math.max(info.width, info.height));
  const w = Math.max(1, Math.round(info.width * scale));
  const h = Math.max(1, Math.round(info.height * scale));
  return {
    inputW: w,
    inputH: h,
    outputW: w * 2,
    outputH: h * 2,
    tiles: Math.ceil(w / tile) * Math.ceil(h / tile),
    downscaled: scale < 1,
  };
}

function buildSource(img: HTMLImageElement, maxSide: number, tile: number) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  const pw = Math.ceil(w / tile) * tile;
  const ph = Math.ceil(h / tile) * tile;

  const { canvas, ctx } = createCanvas(pw, ph);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pw, ph);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  if (pw > w) ctx.drawImage(canvas, w - 1, 0, 1, h, w, 0, pw - w, h);
  if (ph > h) ctx.drawImage(canvas, 0, h - 1, pw, 1, 0, h, pw, ph - h);
  return { canvas, w, h, pw, ph };
}

function rawToImageData(raw: any): ImageData {
  const { width, height, channels, data } = raw as {
    width: number;
    height: number;
    channels: number;
    data: ArrayLike<number>;
  };
  const rgba = new Uint8ClampedArray(width * height * 4);
  const count = width * height;
  if (channels === 4) {
    rgba.set(data as ArrayLike<number>);
  } else if (channels === 3) {
    for (let i = 0; i < count; i++) {
      rgba[i * 4] = data[i * 3];
      rgba[i * 4 + 1] = data[i * 3 + 1];
      rgba[i * 4 + 2] = data[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }
  } else if (channels === 1) {
    for (let i = 0; i < count; i++) {
      rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = data[i];
      rgba[i * 4 + 3] = 255;
    }
  } else {
    throw new Error("The AI model returned an unsupported image format.");
  }
  return new ImageData(rgba, width, height);
}

/* ------------------------- Scratch & crack repair -------------------------- */

function rankFilter(src: Uint8Array, w: number, h: number, r: number, useMax: boolean) {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let v = useMax ? 0 : 255;
      for (let k = -r; k <= r; k++) {
        const xx = Math.min(w - 1, Math.max(0, x + k));
        const s = src[row + xx];
        if (useMax ? s > v : s < v) v = s;
      }
      tmp[row + x] = v;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = useMax ? 0 : 255;
      for (let k = -r; k <= r; k++) {
        const yy = Math.min(h - 1, Math.max(0, y + k));
        const s = tmp[yy * w + x];
        if (useMax ? s > v : s < v) v = s;
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

function repairScratches(d: Uint8ClampedArray, w: number, h: number, strength: number) {
  const n = w * h;
  const lum = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  }

  const half = Math.max(2, Math.round(Math.min(w, h) / 350));
  const opened = rankFilter(rankFilter(lum, w, h, half, false), w, h, half, true);
  const threshold = 46 - strength * 0.36;

  let mask = new Uint8Array(n);
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (lum[i] - opened[i] > threshold) {
      mask[i] = 1;
      count++;
    }
  }
  if (count === 0 || count > n * 0.25) return;

  mask = rankFilter(mask, w, h, 1, true);

  const known = new Uint8Array(n);
  let remaining = 0;
  for (let i = 0; i < n; i++) {
    if (mask[i]) remaining++;
    else known[i] = 1;
  }
  for (let pass = 0; pass < 200 && remaining > 0; pass++) {
    const filled: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (known[i]) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let c = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const j = yy * w + xx;
            if (!known[j]) continue;
            r += d[j * 4];
            g += d[j * 4 + 1];
            b += d[j * 4 + 2];
            c++;
          }
        }
        if (c > 0) {
          d[i * 4] = r / c;
          d[i * 4 + 1] = g / c;
          d[i * 4 + 2] = b / c;
          filled.push(i);
        }
      }
    }
    if (filled.length === 0) break;
    for (const i of filled) known[i] = 1;
    remaining -= filled.length;
  }
}

/** NEW: Unsharp Masking (High-Pass filter) to make AI details pop */
function applySharpen(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  if (strength <= 0) return;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const copy = new Uint8ClampedArray(d);

  const amount = strength * 0.05; // Scale strength

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = copy[i + c];
        const neighbors = 
          copy[i - 4 + c] + copy[i + 4 + c] + 
          copy[i - w * 4 + c] + copy[i + w * 4 + c];
        const diff = center - (neighbors / 4);
        d[i + c] = Math.min(255, Math.max(0, center + diff * amount));
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyFinishing(
  source: HTMLCanvasElement,
  autoLevels: boolean,
  blackWhite: boolean,
  repair: number,
  sharpen: number,
  colorBoost: boolean
) {
  if (!autoLevels && !blackWhite && repair <= 0 && sharpen <= 0 && !colorBoost) return source;
  const { canvas, ctx } = createCanvas(source.width, source.height);
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data;

  if (repair > 0) repairScratches(d, canvas.width, canvas.height, repair);

  if (autoLevels) {
    const histogram = new Uint32Array(256);
    const total = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      histogram[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
    }
    let low = 0;
    let high = 255;
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += histogram[v];
      if (acc >= total * 0.005) {
        low = v;
        break;
      }
    }
    acc = 0;
    for (let v = 255; v >= 0; v--) {
      acc += histogram[v];
      if (acc >= total * 0.005) {
        high = v;
        break;
      }
    }
    if (high - low >= 24) {
      const lut = new Uint8ClampedArray(256);
      for (let v = 0; v < 256; v++) lut[v] = ((v - low) * 255) / (high - low);
      for (let i = 0; i < d.length; i += 4) {
        d[i] = lut[d[i]];
        d[i + 1] = lut[d[i + 1]];
        d[i + 2] = lut[d[i + 2]];
      }
    }
  }

  if (blackWhite) {
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = g;
    }
  }

  ctx.putImageData(image, 0, 0);

  // NEW: Apply Unsharp Mask
  if (sharpen > 0) {
    applySharpen(ctx, canvas.width, canvas.height, sharpen);
  }

  // NEW: Apply Color Boost
  if (colorBoost) {
    ctx.filter = 'contrast(1.05) saturate(1.15)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
  }

  return canvas;
}

function friendlyError(error: unknown) {
  const text = error instanceof Error ? error.message : "";
  if (/memory|allocation|out of|buffer/i.test(text)) {
    return "Your device ran out of memory. Choose Fast quality or a smaller photo and try again.";
  }
  if (/AI engine|CDN/i.test(text)) return text;
  if (/fetch|network|failed to load|load failed/i.test(text)) {
    return "The AI model could not be downloaded. Check your internet connection and try again.";
  }
  return text || "Something went wrong while enhancing your photo. Please try again.";
}

/* -------------------------------------------------------------------------- */
/*  UI Components                                                              */
/* -------------------------------------------------------------------------- */

function Toggle({ label, hint, checked, disabled, onChange }: { label: string; hint?: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void; }) {
  return (
    <div className="ape-switch-row">
      <div>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </div>
      <input className="ape-switch" type="checkbox" role="switch" checked={checked} disabled={disabled} aria-label={label} onChange={(event) => onChange(event.target.checked)} />
    </div>
  );
}

function CompareSlider({ before, after, ratio, position, onPosition }: { before: string; after: string; ratio: number; position: number; onPosition: (value: number) => void; }) {
  return (
    <div className="ape-compare" style={{ width: `min(100%, ${Math.round(560 * ratio)}px)`, aspectRatio: String(ratio), ["--pos" as string]: `${position}%` }}>
      <img className="ape-compare-img" src={before} alt="Original photo" draggable={false} />
      <img className="ape-compare-img ape-compare-after" src={after} alt="AI enhanced photo" draggable={false} />
      <span className="ape-tag left">Original</span>
      <span className="ape-tag right">Enhanced</span>
      <div className="ape-handle" aria-hidden="true"><span>⇆</span></div>
      <input className="ape-compare-range" type="range" min={0} max={100} step={0.1} value={position} aria-label="Compare original and enhanced photo" onChange={(event) => onPosition(Number(event.target.value))} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function AiOldPhotoRestorer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const originalUrlRef = useRef("");
  const finalUrlRef = useRef("");
  const resultCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cancelRef = useRef(false);
  const mountedRef = useRef(false);
  const dragDepth = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);

  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [info, setInfo] = useState<ImageInfo | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [quality, setQuality] = useState<Quality>("balanced");
  const [hasGpu, setHasGpu] = useState(false);
  const [useGpu, setUseGpu] = useState(false);
  const [engine, setEngine] = useState<Engine>("lightweight");
  
  // Finishing State
  const [repair, setRepair] = useState(50);
  const [autoLevels, setAutoLevels] = useState(true); // Default to true for better results
  const [blackWhite, setBlackWhite] = useState(false);
  const [sharpen, setSharpen] = useState(40); // NEW
  const [colorBoost, setColorBoost] = useState(true); // NEW

  const [format, setFormat] = useState<OutFormat>("png");
  const [jpgQuality, setJpgQuality] = useState(92);

  const [resultVersion, setResultVersion] = useState(0);
  const [finalUrl, setFinalUrl] = useState("");
  const [result, setResult] = useState<ResultInfo | null>(null);
  const [view, setView] = useState<ViewMode>("slider");
  const [position, setPosition] = useState(50);

  const isWorking = status === "loading" || status === "processing";

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const gpu = typeof navigator !== "undefined" && "gpu" in navigator && !!(navigator as any).gpu;
    setHasGpu(gpu);
    if (gpu) setUseGpu(true);
    else setQuality("fast");
    return () => {
      mountedRef.current = false;
      cancelRef.current = true;
      progressListener = null;
      disposeWorker();
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      if (finalUrlRef.current) URL.revokeObjectURL(finalUrlRef.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const clearResult = useCallback(() => {
    if (finalUrlRef.current) {
      URL.revokeObjectURL(finalUrlRef.current);
      finalUrlRef.current = "";
    }
    resultCanvasRef.current = null;
    setFinalUrl("");
    setResult(null);
    setPosition(50);
  }, []);

  const selectFile = useCallback(
    async (selected?: File | null) => {
      if (!selected || isWorking) return;
      if (!selected.type.startsWith("image/")) {
        setError("That file is not an image. Choose a JPG, PNG or WebP photo.");
        return;
      }
      if (!ACCEPTED_TYPES.includes(selected.type)) {
        setError("Please upload a JPG, PNG or WebP image.");
        return;
      }
      if (selected.size > MAX_FILE_SIZE) {
        setError("That photo is larger than 10 MB. Choose a smaller image.");
        return;
      }

      const url = URL.createObjectURL(selected);
      try {
        const img = await loadImageElement(url);
        if (!mountedRef.current) {
          URL.revokeObjectURL(url);
          return;
        }
        if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
        originalUrlRef.current = url;
        imageRef.current = img;
        clearResult();
        setFile(selected);
        setOriginalUrl(url);
        setInfo({ width: img.naturalWidth, height: img.naturalHeight, bytes: selected.size });
        setStatus("idle");
        setProgress(0);
        setPhase("");
        setEta("");
        setError("");
        setNotice("");
      } catch (err) {
        URL.revokeObjectURL(url);
        setError(err instanceof Error ? err.message : "This image could not be opened.");
      }
    },
    [clearResult, isWorking]
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      for (const item of Array.from(event.clipboardData?.items ?? [])) {
        if (item.type.startsWith("image/")) {
          const pasted = item.getAsFile();
          if (pasted) {
            event.preventDefault();
            void selectFile(pasted);
          }
          break;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [selectFile]);

  const removePhoto = useCallback(() => {
    if (isWorking) return;
    if (originalUrlRef.current) {
      URL.revokeObjectURL(originalUrlRef.current);
      originalUrlRef.current = "";
    }
    imageRef.current = null;
    clearResult();
    setFile(null);
    setOriginalUrl("");
    setInfo(null);
    setStatus("idle");
    setProgress(0);
    setPhase("");
    setEta("");
    setError("");
    setNotice("");
    if (inputRef.current) inputRef.current.value = "";
  }, [clearResult, isWorking]);

  const restorePhoto = async () => {
    const img = imageRef.current;
    if (!file || !img || isWorking) {
      setError("Please upload a photo first.");
      return;
    }

    cancelRef.current = false;
    clearResult();
    setError("");
    setNotice("");
    setStatus("loading");
    setProgress(0);
    setEta("");
    setPhase("Starting the AI engine (first time only)");
    startedAtRef.current = performance.now();
    progressListener = (percent) => {
      if (!mountedRef.current) return;
      const value = Math.round(percent);
      setProgress(value);
      setPhase(value >= 99 ? "Preparing the model" : "Downloading the AI model (first time only)");
    };

    try {
      let device: Device = useGpu && hasGpu ? "webgpu" : "wasm";
      const { tile: TILE, pad: PAD } = device === "webgpu" ? TILE_GPU : TILE_CPU;
      const source = buildSource(img, QUALITY[quality].side, TILE);

      try {
        await ensureModel(device, engine);
      } catch (loadError) {
        if (cancelRef.current || device !== "webgpu") throw loadError;
        device = "wasm";
        setNotice("GPU mode is not available on this device. Using the standard mode instead.");
        await ensureModel("wasm", engine);
      }
      if (cancelRef.current) throw new CancelError();

      const infer = async (rgb: Uint8ClampedArray, w: number, h: number) => {
        try {
          return await upscaleTile(rgb.slice(), w, h);
        } catch (inferError) {
          if (cancelRef.current || device !== "webgpu") throw inferError;
          device = "wasm";
          setNotice("GPU mode failed. Continuing in the standard mode.");
          await ensureModel("wasm", engine);
          return upscaleTile(rgb.slice(), w, h);
        }
      };

      setStatus("processing");
      setProgress(0);
      setPhase("Enhancing your photo");

      const cols = source.pw / TILE;
      const rows = source.ph / TILE;
      const total = cols * rows;
      let done = 0;
      let scale = 0;
      let output: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
      const processingStart = performance.now();

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (cancelRef.current) throw new CancelError();

          const x = col * TILE;
          const y = row * TILE;
          const rx = Math.max(0, x - PAD);
          const ry = Math.max(0, y - PAD);
          const rw = Math.min(source.pw, x + TILE + PAD) - rx;
          const rh = Math.min(source.ph, y + TILE + PAD) - ry;

          const region = createCanvas(rw, rh);
          region.ctx.drawImage(source.canvas, rx, ry, rw, rh, 0, 0, rw, rh);
          const rgba = region.ctx.getImageData(0, 0, rw, rh).data;
          const rgb = new Uint8ClampedArray(rw * rh * 3);
          for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
            rgb[j] = rgba[i];
            rgb[j + 1] = rgba[i + 1];
            rgb[j + 2] = rgba[i + 2];
          }

          const tile = await infer(rgb, rw, rh);
          if (!tile || !tile.data || !tile.width || !tile.height) {
            throw new Error("The AI model returned an unsupported image format.");
          }

          if (!output) {
            scale = tile.width / rw;
            if (!Number.isFinite(scale) || scale < 1) {
              throw new Error("The AI model returned an unexpected image size.");
            }
            output = createCanvas(Math.round(source.pw * scale), Math.round(source.ph * scale));
          }

          const data = rawToImageData(tile);
          const sx = Math.round((x - rx) * scale);
          const sy = Math.round((y - ry) * scale);
          const size = Math.round(TILE * scale);
          output.ctx.putImageData(data, Math.round(x * scale) - sx, Math.round(y * scale) - sy, sx, sy, size, size);

          done++;
          if (!mountedRef.current) throw new CancelError();
          setProgress(Math.round((done / total) * 100));
          const perTile = (performance.now() - processingStart) / done;
          const secondsLeft = (perTile * (total - done)) / 1000;
          setEta(done < total ? `About ${formatTime(secondsLeft)} left` : "");
          if (done === 3 && secondsLeft > 150) {
            setNotice(`This device is slow: about ${formatTime(secondsLeft)} left. Cancel and choose Fast quality or the Lightweight engine for quicker results.`);
          }
          await tick();
        }
      }

      if (!output) throw new Error("The AI model did not produce an image.");

      const finalW = Math.round(source.w * scale);
      const finalH = Math.round(source.h * scale);
      const cropped = createCanvas(finalW, finalH);
      cropped.ctx.drawImage(output.canvas, 0, 0, finalW, finalH, 0, 0, finalW, finalH);

      resultCanvasRef.current = cropped.canvas;
      const seconds = (performance.now() - startedAtRef.current) / 1000;
      setResult({ width: finalW, height: finalH, bytes: 0, seconds });
      setResultVersion((v) => v + 1);
      setStatus("completed");
      setProgress(100);
      setPhase("Enhancement complete");
      setEta("");
      flash("Photo enhanced");
    } catch (err) {
      if (!mountedRef.current) return;
      setEta("");
      setProgress(0);
      if (err instanceof CancelError || cancelRef.current) {
        setStatus("idle");
        setPhase("");
        setNotice("Enhancement cancelled.");
      } else {
        console.error("Photo enhancement error:", err);
        setStatus("error");
        setPhase("");
        setError(friendlyError(err));
      }
    } finally {
      progressListener = null;
    }
  };

  const cancel = () => {
    cancelRef.current = true;
    setPhase("Cancelling…");
    if (status === "loading") disposeWorker("Cancelled.");
  };

  const formatInfo = FORMATS.find((item) => item.value === format) ?? FORMATS[0];

  useEffect(() => {
    const base = resultCanvasRef.current;
    if (!base) return;
    let stale = false;

    const timer = setTimeout(async () => {
      try {
        // Pass the new sharpen and colorBoost args
        const finished = applyFinishing(base, autoLevels, blackWhite, repair, sharpen, colorBoost);
        const blob = await canvasBlob(finished, formatInfo.mime, format === "png" ? undefined : jpgQuality / 100);
        if (stale || !mountedRef.current) return;
        const url = URL.createObjectURL(blob);
        if (finalUrlRef.current) URL.revokeObjectURL(finalUrlRef.current);
        finalUrlRef.current = url;
        setFinalUrl(url);
        setResult((previous) => previous ? { ...previous, bytes: blob.size, width: finished.width, height: finished.height } : previous);
      } catch (err) {
        if (!stale && mountedRef.current) {
          setError(err instanceof Error ? err.message : "Could not prepare the enhanced image.");
        }
      }
    }, 150);

    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [resultVersion, autoLevels, blackWhite, repair, sharpen, colorBoost, format, jpgQuality, formatInfo.mime]);

  const downloadPhoto = () => {
    if (!finalUrl || !file) return;
    const base = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 40) || "photo";
    const link = document.createElement("a");
    link.href = finalUrl;
    link.download = `${base}-enhanced-x2.${formatInfo.ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    flash("Download started");
  };

  const copyPhoto = async () => {
    const base = resultCanvasRef.current;
    if (!base) return;
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      setError("Your browser cannot copy images. Use Download instead.");
      return;
    }
    try {
      const blob = await canvasBlob(applyFinishing(base, autoLevels, blackWhite, repair, sharpen, colorBoost));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      flash("Image copied to clipboard");
    } catch {
      setError("Could not copy the image. Use Download instead.");
    }
  };

  const gpuActive = useGpu && hasGpu;
  const tileSize = (gpuActive ? TILE_GPU : TILE_CPU).tile;
  const plan = useMemo(() => estimate(info, quality, tileSize), [info, quality, tileSize]);
  const ratio = result ? result.width / result.height : info ? info.width / info.height : 1;
  const showResult = status === "completed" && !!finalUrl && !!originalUrl;

  const hasFiles = (event: ReactDragEvent) => Array.from(event.dataTransfer.types).includes("Files");
  const dropzoneKey = (event: ReactKeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className="ape"
      onDragEnter={(event) => { if (!hasFiles(event)) return; event.preventDefault(); dragDepth.current += 1; setIsDragging(true); }}
      onDragOver={(event) => { if (hasFiles(event)) event.preventDefault(); }}
      onDragLeave={(event) => { if (!hasFiles(event)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setIsDragging(false); }}
      onDrop={(event) => { if (!hasFiles(event)) return; event.preventDefault(); dragDepth.current = 0; setIsDragging(false); void selectFile(event.dataTransfer.files?.[0]); }}
    >
      <style jsx global>{`
        .ape { --accent: #ff5a1f; --accent-2: #e64a14; --accent-soft: #fff3ed; --ink: #111827; --ink-2: #374151; --muted: #6b7280; --line: #e6e8f0; position: relative; width: 100%; min-width: 0; color: var(--ink); box-sizing: border-box; }
        .ape *, .ape *::before, .ape *::after { box-sizing: border-box; }
        .ape input[type="file"] { display: none; }
        .ape .hero { display: flex; align-items: center; justify-content: space-between; gap: 14px 24px; flex-wrap: wrap; padding: 20px 24px; margin-bottom: 20px; border-radius: 20px; color: #fff; background: radial-gradient(700px 240px at 100% -30%, rgba(255, 255, 255, 0.25), transparent 60%), linear-gradient(120deg, #ff5a1f 0%, #e64a14 100%); box-shadow: 0 18px 38px -20px rgba(255, 90, 31, 0.75); }
        .ape .hero h2 { margin: 0 0 4px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
        .ape .hero p { margin: 0; max-width: 560px; font-size: 13px; line-height: 1.6; color: rgba(255, 255, 255, 0.92); }
        .ape .tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .ape .tags span { padding: 5px 11px; border-radius: 999px; font-size: 11px; font-weight: 700; background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); }
        .ape .layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 380px); gap: 20px; align-items: start; }
        .ape .main, .ape .side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .ape .side { position: sticky; top: 16px; }
        .ape .card { min-width: 0; padding: 20px; background: #fff; border: 1px solid var(--line); border-radius: 18px; box-shadow: 0 1px 2px rgba(17, 24, 39, 0.03), 0 8px 24px -14px rgba(17, 24, 39, 0.12); }
        .ape .card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
        .ape .card h3 { margin: 0; font-size: 15px; font-weight: 800; letter-spacing: -0.01em; }
        .ape .help { margin: 4px 0 0; font-size: 12px; line-height: 1.55; color: var(--muted); }
        .ape .label { display: block; margin: 0 0 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
        .ape .dropzone { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-height: 320px; padding: 36px 20px; text-align: center; cursor: pointer; border: 2px dashed #ffb99b; border-radius: 18px; background: linear-gradient(180deg, #fffaf7, var(--accent-soft)); transition: 0.18s ease; }
        .ape .dropzone:hover, .ape .dropzone:focus-visible, .ape .dropzone.active { border-color: var(--accent); background: #ffeee5; outline: none; box-shadow: 0 0 0 4px rgba(255, 90, 31, 0.12); }
        .ape .drop-icon { display: grid; place-items: center; width: 68px; height: 68px; margin-bottom: 8px; border-radius: 20px; font-size: 32px; background: #fff; box-shadow: 0 10px 24px -12px rgba(255, 90, 31, 0.6); }
        .ape .dropzone strong { font-size: 17px; }
        .ape .dropzone span { font-size: 13px; color: var(--muted); }
        .ape .dropzone small { font-size: 11px; color: var(--muted); }
        .ape .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 10px 18px; border-radius: 12px; border: 1px solid #d9dde8; background: #fff; color: var(--ink-2); font: inherit; font-size: 13px; font-weight: 750; cursor: pointer; transition: 0.15s ease; }
        .ape .button:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); transform: translateY(-1px); }
        .ape .button.primary { width: 100%; min-height: 52px; font-size: 15px; border-color: transparent; color: #fff; background: linear-gradient(135deg, var(--accent), var(--accent-2)); box-shadow: 0 12px 24px -12px rgba(255, 90, 31, 0.8); }
        .ape .button.primary:hover:not(:disabled) { color: #fff; filter: brightness(1.07); }
        .ape .button.danger:hover:not(:disabled) { border-color: #dc2626; color: #dc2626; }
        .ape .button.small { min-height: 36px; padding: 6px 14px; font-size: 12px; }
        .ape .button:disabled { opacity: 0.5; cursor: not-allowed; }
        .ape .button:focus-visible, .ape .segment:focus-visible, .ape .quality:focus-visible { outline: 3px solid rgba(255, 90, 31, 0.3); outline-offset: 2px; }
        .ape .row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .ape .meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
        .ape .chip { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #f1f3f9; color: var(--ink-2); }
        .ape .chip.accent { background: var(--accent-soft); color: var(--accent); }
        .ape .preview { display: flex; justify-content: center; overflow: hidden; border: 1px solid var(--line); border-radius: 14px; background-color: #fff; background-image: conic-gradient(#eceff4 25%, #fff 0 50%, #eceff4 0 75%, #fff 0); background-size: 18px 18px; }
        .ape .preview img { display: block; max-width: 100%; max-height: 460px; object-fit: contain; }
        .ape .progress-card { padding: 16px; border: 1px solid #ffd9c7; border-radius: 14px; background: var(--accent-soft); }
        .ape .progress-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; font-size: 13px; font-weight: 700; }
        .ape .progress-head small { font-size: 12px; font-weight: 600; color: var(--muted); }
        .ape .bar { height: 10px; overflow: hidden; border-radius: 999px; background: #ffe0d1; }
        .ape .bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); transition: width 0.3s ease; }
        .ape .bar.indeterminate i { width: 35% !important; animation: ape-slide 1.3s ease-in-out infinite; }
        @keyframes ape-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        .ape .progress-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; font-size: 12px; color: var(--muted); }
        .ape .alert { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 12px 14px; border-radius: 12px; font-size: 12.5px; line-height: 1.55; }
        .ape .alert.error { border: 1px solid #ffd4cc; background: #fff2f0; color: #b42318; }
        .ape .alert.notice { border: 1px solid #ffe3b8; background: #fff8eb; color: #8a5200; }
        .ape .alert button { border: 0; background: none; color: inherit; font-size: 18px; line-height: 1; cursor: pointer; }
        .ape .segmented { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; padding: 4px; border-radius: 12px; background: #eef0f6; }
        .ape .segment { min-height: 36px; padding: 8px 6px; border: 0; border-radius: 9px; background: transparent; color: var(--muted); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
        .ape .segment.active { background: #fff; color: var(--accent); box-shadow: 0 1px 4px rgba(17, 24, 39, 0.14); }
        .ape .segment:disabled { cursor: not-allowed; opacity: 0.6; }
        .ape .qualities { display: grid; gap: 8px; }
        .ape .quality { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; padding: 11px 13px; text-align: left; border: 1px solid var(--line); border-radius: 12px; background: #fff; font: inherit; cursor: pointer; transition: 0.15s ease; }
        .ape .quality:hover:not(:disabled) { border-color: var(--accent); }
        .ape .quality.active { border-color: var(--accent); background: var(--accent-soft); box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.1); }
        .ape .quality:disabled { cursor: not-allowed; opacity: 0.6; }
        .ape .quality strong { display: block; font-size: 13px; }
        .ape .quality span { display: block; margin-top: 2px; font-size: 11px; color: var(--muted); }
        .ape .quality em { font-style: normal; font-size: 11px; font-weight: 800; color: var(--accent); }
        .ape .plan { margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: #f6f7fb; font-size: 12px; line-height: 1.6; color: var(--ink-2); }
        .ape .stack { display: flex; flex-direction: column; gap: 16px; }
        .ape .divider { height: 1px; background: #eef0f5; }
        .ape .range { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 999px; background: linear-gradient(90deg, var(--accent) var(--pct, 50%), #e3e6ef var(--pct, 50%)); cursor: pointer; outline: none; }
        .ape .range::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid var(--accent); box-shadow: 0 2px 6px rgba(255, 90, 31, 0.35); }
        .ape .range::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 2px solid var(--accent); }
        .ape .range-head { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; font-weight: 700; }
        .ape .range-head span:last-child { padding: 1px 8px; border-radius: 7px; background: var(--accent-soft); color: var(--accent); }
        .ape .ape-switch-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .ape .ape-switch-row strong { display: block; font-size: 12.5px; }
        .ape .ape-switch-row small { display: block; margin-top: 2px; font-size: 11px; line-height: 1.45; color: var(--muted); }
        .ape .ape-switch { -webkit-appearance: none; appearance: none; flex-shrink: 0; position: relative; width: 44px; height: 25px; margin: 0; border-radius: 30px; background: #d5d9e4; cursor: pointer; transition: background 0.2s ease; }
        .ape .ape-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 19px; height: 19px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); transition: transform 0.2s ease; }
        .ape .ape-switch:checked { background: var(--accent); }
        .ape .ape-switch:checked::after { transform: translateX(19px); }
        .ape .ape-switch:disabled { opacity: 0.5; cursor: not-allowed; }
        .ape .ape-compare { position: relative; margin: 0 auto; overflow: hidden; border-radius: 14px; border: 1px solid var(--line); background: #f3f4f8; user-select: none; }
        .ape .ape-compare-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; pointer-events: none; }
        .ape .ape-compare-after { clip-path: inset(0 0 0 var(--pos)); }
        .ape .ape-handle { position: absolute; top: 0; bottom: 0; left: var(--pos); width: 3px; margin-left: -1.5px; background: #fff; box-shadow: 0 0 0 1px rgba(17, 24, 39, 0.15), 0 0 12px rgba(0, 0, 0, 0.3); pointer-events: none; }
        .ape .ape-handle span { position: absolute; top: 50%; left: 50%; display: grid; place-items: center; width: 40px; height: 40px; transform: translate(-50%, -50%); border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #fff; font-size: 16px; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35); }
        .ape .ape-compare-range { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: ew-resize; }
        .ape .ape-tag { position: absolute; bottom: 12px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; color: #fff; background: rgba(17, 24, 39, 0.65); pointer-events: none; }
        .ape .ape-tag.left { left: 12px; }
        .ape .ape-tag.right { right: 12px; background: rgba(255, 90, 31, 0.9); }
        .ape .side-by-side { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .ape .side-by-side figure { margin: 0; }
        .ape .side-by-side figcaption { margin-bottom: 8px; font-size: 12px; font-weight: 800; color: var(--ink-2); }
        .ape .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 16px 0; }
        .ape .stat { padding: 12px; border-radius: 12px; background: #f6f7fb; }
        .ape .stat small { display: block; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
        .ape .stat strong { display: block; margin-top: 4px; font-size: 13px; }
        .ape .actions { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; }
        .ape .actions .button { width: 100%; }
        .ape .info { padding: 14px 16px; border: 1px solid #ffe0d1; border-radius: 14px; background: var(--accent-soft); font-size: 12px; line-height: 1.7; color: #9a3412; }
        .ape .info strong { color: #7c2d12; }
        .ape .drop-overlay { position: absolute; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--accent); border-radius: 18px; background: rgba(255, 243, 237, 0.94); color: var(--accent); font-size: 17px; font-weight: 800; pointer-events: none; }
        .ape .toast { position: fixed; bottom: 24px; left: 50%; z-index: 50; padding: 10px 18px; border-radius: 999px; background: var(--ink); color: #fff; font-size: 13px; font-weight: 600; opacity: 0; transform: translate(-50%, 8px); pointer-events: none; transition: all 0.2s ease; box-shadow: 0 12px 28px -10px rgba(0, 0, 0, 0.5); }
        .ape .toast.show { opacity: 1; transform: translate(-50%, 0); }
        @media (max-width: 1023px) { .ape .layout { grid-template-columns: minmax(0, 1fr); } .ape .side { position: static; } }
        @media (max-width: 640px) { .ape .hero { padding: 16px; } .ape .card { padding: 15px; } .ape .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .ape .actions, .ape .side-by-side, .ape .row { grid-template-columns: minmax(0, 1fr); } }
        @media (prefers-reduced-motion: reduce) { .ape * { transition: none !important; } }
      `}</style>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = ""; }} />

      {isDragging && <div className="drop-overlay">Drop your photo to enhance it</div>}

      <header className="hero">
        <div>
          <h2>AI Old Photo Enhancer</h2>
          <p>Upscale and sharpen old or low-resolution photos with an AI super-resolution model, then clean up scratches and cracks. Everything runs inside your browser, so your photo is never uploaded.</p>
        </div>
        <div className="tags">
          <span>2× resolution</span>
          <span>Scratch repair</span>
          <span>Private &amp; local</span>
          <span>Before / after</span>
        </div>
      </header>

      <div className="layout">
        <div className="main">
          {error && (
            <div className="alert error" role="alert">
              <span>{error}</span>
              <button type="button" aria-label="Dismiss message" onClick={() => setError("")}>×</button>
            </div>
          )}
          {notice && !error && (
            <div className="alert notice" role="status">
              <span>{notice}</span>
              <button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}>×</button>
            </div>
          )}

          <section className="card">
            {!originalUrl ? (
              <div className={`dropzone ${isDragging ? "active" : ""}`} role="button" tabIndex={0} aria-label="Upload a photo" onClick={() => inputRef.current?.click()} onKeyDown={dropzoneKey}>
                <div className="drop-icon" aria-hidden="true">📷</div>
                <strong>Upload your old photo</strong>
                <span>Drag and drop, paste with Ctrl+V, or click to browse</span>
                <span className="button primary" style={{ width: "auto", marginTop: 12, minHeight: 44, fontSize: 14 }}>Choose photo</span>
                <small>JPG, PNG or WebP · up to 10 MB</small>
              </div>
            ) : (
              <>
                <div className="card-top">
                  <div style={{ minWidth: 0 }}>
                    <h3>Your photo</h3>
                    <div className="meta">
                      <span className="chip" style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file?.name}</span>
                      {info && (
                        <>
                          <span className="chip">{info.width} × {info.height}px</span>
                          <span className="chip">{formatBytes(info.bytes)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="button small" disabled={isWorking} onClick={() => inputRef.current?.click()}>Change</button>
                    <button type="button" className="button small danger" disabled={isWorking} onClick={removePhoto}>Remove</button>
                  </div>
                </div>

                <div className="preview">
                  <img src={originalUrl} alt="Original uploaded photo" />
                </div>

                {isWorking && (
                  <div className="progress-card" style={{ marginTop: 16 }} aria-live="polite">
                    <div className="progress-head">
                      <span>{phase}</span>
                      <small>{progress}%</small>
                    </div>
                    <div className={`bar ${status === "loading" && progress === 0 ? "indeterminate" : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                      <i style={{ width: `${progress}%` }} />
                    </div>
                    <div className="progress-foot">
                      <span>{status === "loading" ? "The first run downloads the model. The page stays responsive meanwhile." : eta || "Keep this tab open while the photo is processed."}</span>
                      <button type="button" className="button small danger" onClick={cancel}>Cancel</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {showResult && result && (
            <section className="card">
              <div className="card-top">
                <div>
                  <span className="chip accent">AI enhancement complete</span>
                  <h3 style={{ marginTop: 10 }}>Before and after</h3>
                  <p className="help">Drag the handle to compare the original with the enhanced photo.</p>
                </div>
                <div className="segmented" role="radiogroup" aria-label="Comparison view" style={{ minWidth: 220 }}>
                  {(["slider", "side"] as ViewMode[]).map((mode) => (
                    <button key={mode} type="button" role="radio" aria-checked={view === mode} className={`segment ${view === mode ? "active" : ""}`} onClick={() => setView(mode)}>
                      {mode === "slider" ? "Slider" : "Side by side"}
                    </button>
                  ))}
                </div>
              </div>

              {view === "slider" ? (
                <CompareSlider before={originalUrl} after={finalUrl} ratio={ratio} position={position} onPosition={setPosition} />
              ) : (
                <div className="side-by-side">
                  <figure>
                    <figcaption>Original</figcaption>
                    <div className="preview"><img src={originalUrl} alt="Original photo" /></div>
                  </figure>
                  <figure>
                    <figcaption>AI enhanced</figcaption>
                    <div className="preview" style={{ borderColor: "#ffd0b8" }}><img src={finalUrl} alt="AI enhanced photo" /></div>
                  </figure>
                </div>
              )}

              <div className="stats">
                <div className="stat"><small>Original</small><strong>{info ? `${info.width} × ${info.height}` : "—"}</strong></div>
                <div className="stat"><small>Enhanced</small><strong>{result.width} × {result.height}</strong></div>
                <div className="stat"><small>File size</small><strong>{result.bytes ? formatBytes(result.bytes) : "…"}</strong></div>
                <div className="stat"><small>Time taken</small><strong>{formatTime(result.seconds)}</strong></div>
              </div>

              <div className="actions">
                <button type="button" className="button primary" style={{ minHeight: 48, fontSize: 14 }} onClick={downloadPhoto}>⬇ Download {formatInfo.label}</button>
                <button type="button" className="button" onClick={() => void copyPhoto()}>Copy image</button>
                <button type="button" className="button" onClick={removePhoto}>New photo</button>
              </div>
            </section>
          )}

          <section className="info">
            <strong>Good to know:</strong> the AI model doubles the resolution (2×) and adds sharpness. Thin scratches and cracks are removed by the Scratch &amp; crack repair slider in the Finishing panel, which you can adjust instantly after enhancing. Large photos are scaled to the chosen quality size before enhancing so your browser stays responsive. The model downloads the first time you use it. For the quickest results use the Lightweight engine with the GPU switch on; the Classical engine on a CPU can take many minutes.
          </section>
        </div>

        <aside className="side">
          <section className="card">
            <div className="stack">
              <div>
                <span className="label">AI engine</span>
                <div className="qualities" role="radiogroup" aria-label="AI engine">
                  {(Object.keys(ENGINES) as Engine[]).map((key) => (
                    <button key={key} type="button" role="radio" aria-checked={engine === key} disabled={isWorking} className={`quality ${engine === key ? "active" : ""}`} onClick={() => setEngine(key)}>
                      <div>
                        <strong>{ENGINES[key].label}</strong>
                        <span>{ENGINES[key].hint}</span>
                      </div>
                      {key === "lightweight" && <em>Recommended</em>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="label">Quality</span>
                <div className="qualities" role="radiogroup" aria-label="Quality">
                  {(Object.keys(QUALITY) as Quality[]).map((key) => {
                    const est = estimate(info, key, tileSize);
                    return (
                      <button key={key} type="button" role="radio" aria-checked={quality === key} disabled={isWorking} className={`quality ${quality === key ? "active" : ""}`} onClick={() => setQuality(key)}>
                        <div>
                          <strong>{QUALITY[key].label}</strong>
                          <span>{QUALITY[key].hint}</span>
                        </div>
                        {est && <em>{est.outputW} × {est.outputH}</em>}
                      </button>
                    );
                  })}
                </div>
                {plan && (
                  <div className="plan">
                    {plan.downscaled ? `Your photo is scaled to ${plan.inputW} × ${plan.inputH}px first, then enhanced to ${plan.outputW} × ${plan.outputH}px.` : `Your photo is enhanced from ${plan.inputW} × ${plan.inputH}px to ${plan.outputW} × ${plan.outputH}px.`}{" "}About {plan.tiles} {plan.tiles === 1 ? "tile" : "tiles"} to process.
                  </div>
                )}
              </div>

              {hasGpu && (
                <>
                  <div className="divider" />
                  <Toggle label="Use graphics card (GPU)" hint="Much faster on supported browsers. Falls back automatically if it fails." checked={useGpu} disabled={isWorking} onChange={setUseGpu} />
                </>
              )}

              <button type="button" className="button primary" disabled={!file || isWorking} onClick={() => void restorePhoto()}>
                {status === "loading" ? "Loading AI model…" : status === "processing" ? "Enhancing photo…" : status === "completed" ? "✨ Enhance again" : "✨ Enhance photo with AI"}
              </button>
              {!file && <p className="help" style={{ marginTop: -8 }}>Upload a photo to get started.</p>}
            </div>
          </section>

          <section className="card">
            <div className="stack">
              <div>
                <h3>Finishing</h3>
                <p className="help">Applied to the result instantly, no need to run the AI again.</p>
              </div>
              
              <div>
                <div className="range-head">
                  <label htmlFor="ape-sharpen">Sharpen details</label>
                  <span>{sharpen === 0 ? "Off" : `${sharpen}%`}</span>
                </div>
                <input id="ape-sharpen" className="range" type="range" min={0} max={100} value={sharpen} style={{ ["--pct" as string]: `${sharpen}%` }} onChange={(event) => setSharpen(Number(event.target.value))} />
                <p className="help">Brings out the fine details created by the AI.</p>
              </div>

              <div>
                <div className="range-head">
                  <label htmlFor="ape-repair">Scratch &amp; crack repair</label>
                  <span>{repair === 0 ? "Off" : `${repair}%`}</span>
                </div>
                <input id="ape-repair" className="range" type="range" min={0} max={100} value={repair} style={{ ["--pct" as string]: `${repair}%` }} onChange={(event) => setRepair(Number(event.target.value))} />
                <p className="help">Removes thin bright cracks and scratches.</p>
              </div>

              <Toggle label="Color Boost" hint="Fixes faded colors and adds vibrancy." checked={colorBoost} onChange={setColorBoost} />
              <Toggle label="Auto contrast" hint="Stretches faded tones for a punchier look." checked={autoLevels} onChange={setAutoLevels} />
              <Toggle label="Black and white" hint="Convert the result to grayscale." checked={blackWhite} onChange={setBlackWhite} />
              
              <div className="divider" />
              <div>
                <span className="label">Download format</span>
                <div className="segmented" role="radiogroup" aria-label="Download format">
                  {FORMATS.map((item) => (
                    <button key={item.value} type="button" role="radio" aria-checked={format === item.value} className={`segment ${format === item.value ? "active" : ""}`} onClick={() => setFormat(item.value)}>{item.label}</button>
                  ))}
                </div>
              </div>
              {format !== "png" && (
                <div>
                  <div className="range-head">
                    <label htmlFor="ape-jpg-quality">Compression quality</label>
                    <span>{jpgQuality}%</span>
                  </div>
                  <input id="ape-jpg-quality" className="range" type="range" min={50} max={100} value={jpgQuality} style={{ ["--pct" as string]: `${((jpgQuality - 50) / 50) * 100}%` }} onChange={(event) => setJpgQuality(Number(event.target.value))} />
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <div role="status" aria-live="polite" className={`toast ${toast ? "show" : ""}`}>
        {toast}
      </div>
    </div>
  );
}