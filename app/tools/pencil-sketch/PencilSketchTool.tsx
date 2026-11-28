"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/* Types & config                                                      */
/* ------------------------------------------------------------------ */

type Mode = "graphite" | "charcoal" | "color" | "ink";
type PaperKey = "white" | "cream" | "kraft" | "gray";
type View = "compare" | "sketch" | "original";
type Format = "png" | "jpeg" | "webp";

type Settings = {
  mode: Mode;
  intensity: number;
  detail: number;
  contrast: number;
  brightness: number;
  grain: number;
  colorAmount: number;
  paper: PaperKey;
};

type Engine = {
  width: number;
  height: number;
  source: ImageData;
  gray: Float32Array;
  blur: Float32Array | null;
  blurKey: number;
  noise: Float32Array | null;
  output: ImageData;
};

type ImageInfo = { name: string; width: number; height: number; size: number };

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const DEFAULTS: Settings = {
  mode: "graphite",
  intensity: 85,
  detail: 60,
  contrast: 100,
  brightness: 0,
  grain: 0,
  colorAmount: 60,
  paper: "white",
};

const PAPERS: Record<PaperKey, { label: string; rgb: [number, number, number]; hex: string }> = {
  white: { label: "White", rgb: [255, 255, 255], hex: "#ffffff" },
  cream: { label: "Cream", rgb: [252, 246, 230], hex: "#fcf6e6" },
  kraft: { label: "Kraft", rgb: [226, 205, 170], hex: "#e2cdaa" },
  gray: { label: "Gray", rgb: [232, 234, 238], hex: "#e8eaee" },
};

const MODES: { value: Mode; label: string }[] = [
  { value: "graphite", label: "Graphite" },
  { value: "charcoal", label: "Charcoal" },
  { value: "color", label: "Color" },
  { value: "ink", label: "Ink" },
];

const PRESETS: { label: string; settings: Partial<Settings> }[] = [
  { label: "Classic", settings: { ...DEFAULTS } },
  {
    label: "Soft Pencil",
    settings: { ...DEFAULTS, intensity: 65, detail: 40, contrast: 90, brightness: 8, paper: "cream", grain: 20 },
  },
  {
    label: "Bold Charcoal",
    settings: { ...DEFAULTS, mode: "charcoal", intensity: 95, detail: 50, contrast: 130, grain: 35, paper: "gray" },
  },
  {
    label: "Color Pencil",
    settings: { ...DEFAULTS, mode: "color", intensity: 80, colorAmount: 70, paper: "cream", grain: 15 },
  },
  {
    label: "Ink Lines",
    settings: { ...DEFAULTS, mode: "ink", intensity: 55, detail: 75, contrast: 110 },
  },
];

const RESOLUTIONS = [
  { label: "Standard · 1800 px", value: 1800 },
  { label: "High · 2400 px", value: 2400 },
  { label: "Ultra · 3200 px", value: 3200 },
];

const FORMATS: { value: Format; label: string; mime: string; ext: string }[] = [
  { value: "png", label: "PNG", mime: "image/png", ext: "png" },
  { value: "jpeg", label: "JPG", mime: "image/jpeg", ext: "jpg" },
  { value: "webp", label: "WebP", mime: "image/webp", ext: "webp" },
];

/* ------------------------------------------------------------------ */
/* Image-processing helpers                                            */
/* ------------------------------------------------------------------ */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function boxesForGauss(sigma: number, n: number): number[] {
  const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal);
  if (wl % 2 === 0) wl--;
  const wu = wl + 2;
  const mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
  const m = Math.round(mIdeal);
  const sizes: number[] = [];
  for (let i = 0; i < n; i++) sizes.push(i < m ? wl : wu);
  return sizes;
}

function boxBlurH(src: Float32Array, dst: Float32Array, w: number, h: number, r: number) {
  const iarr = 1 / (r + r + 1);
  for (let y = 0; y < h; y++) {
    let ti = y * w;
    let li = ti;
    let ri = ti + r;
    const fv = src[ti];
    const lv = src[ti + w - 1];
    let val = (r + 1) * fv;
    for (let j = 0; j < r; j++) val += src[ti + j];
    for (let j = 0; j <= r; j++) {
      val += src[ri++] - fv;
      dst[ti++] = val * iarr;
    }
    for (let j = r + 1; j < w - r; j++) {
      val += src[ri++] - src[li++];
      dst[ti++] = val * iarr;
    }
    for (let j = w - r; j < w; j++) {
      val += lv - src[li++];
      dst[ti++] = val * iarr;
    }
  }
}

function boxBlurV(src: Float32Array, dst: Float32Array, w: number, h: number, r: number) {
  const iarr = 1 / (r + r + 1);
  for (let x = 0; x < w; x++) {
    let ti = x;
    let li = ti;
    let ri = ti + r * w;
    const fv = src[ti];
    const lv = src[ti + w * (h - 1)];
    let val = (r + 1) * fv;
    for (let j = 0; j < r; j++) val += src[ti + j * w];
    for (let j = 0; j <= r; j++) {
      val += src[ri] - fv;
      dst[ti] = val * iarr;
      ri += w;
      ti += w;
    }
    for (let j = r + 1; j < h - r; j++) {
      val += src[ri] - src[li];
      dst[ti] = val * iarr;
      li += w;
      ri += w;
      ti += w;
    }
    for (let j = h - r; j < h; j++) {
      val += lv - src[li];
      dst[ti] = val * iarr;
      li += w;
      ti += w;
    }
  }
}

function gaussianBlur(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const a = new Float32Array(src);
  const b = new Float32Array(src.length);
  const maxR = Math.max(0, Math.floor(Math.min(w, h) / 2) - 1);
  for (const size of boxesForGauss(Math.max(0.5, sigma), 3)) {
    const r = Math.min(maxR, Math.max(0, (size - 1) / 2));
    boxBlurH(a, b, w, h, r);
    boxBlurV(b, a, w, h, r);
  }
  return a;
}

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function buildTone(s: Settings): Float32Array {
  const lut = new Float32Array(256);
  const amount = s.intensity / 100;
  const contrast = s.contrast / 100;
  const threshold = 185 + 60 * amount;

  for (let i = 0; i < 256; i++) {
    let x = i;
    if (s.mode === "charcoal") {
      x = 255 * Math.pow(x / 255, 1.7);
    } else if (s.mode === "ink") {
      const k = clamp((x - (threshold - 14)) / 28, 0, 1);
      x = 255 * k * k * (3 - 2 * k);
    }
    lut[i] = (x - 128) * contrast + 128 + s.brightness;
  }
  return lut;
}

function renderSketch(engine: Engine, s: Settings, canvas: HTMLCanvasElement) {
  const { width, height, source, gray, output } = engine;
  const n = width * height;

  const sigma = Math.max(1, Math.max(width, height) * (0.018 - 0.016 * (s.detail / 100)));
  const key = Math.round(sigma * 10);
  if (!engine.blur || engine.blurKey !== key) {
    engine.blur = gaussianBlur(gray, width, height, sigma);
    engine.blurKey = key;
  }
  const blur = engine.blur;

  const grainAmt = (s.grain / 100) * 28;
  if (grainAmt > 0 && !engine.noise) {
    const rand = mulberry32(1337);
    const noise = new Float32Array(n);
    for (let i = 0; i < n; i++) noise[i] = rand() * 2 - 1;
    engine.noise = noise;
  }
  const noise = engine.noise;

  const src = source.data;
  const out = output.data;
  const amount = s.intensity / 100;
  const tone = buildTone(s);
  const [pr, pg, pb] = PAPERS[s.paper].rgb.map((c) => c / 255);
  const isInk = s.mode === "ink";
  const isColor = s.mode === "color";
  const colorAmt = s.colorAmount / 100;

  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const g = gray[p];
    const b = blur[p];

    const sketch = Math.min(255, (g * 255) / Math.max(1, b));
    const base = isInk ? sketch : g * (1 - amount) + sketch * amount;
    const idx = base <= 0 ? 0 : base >= 255 ? 255 : (base + 0.5) | 0;

    let v = tone[idx];
    if (noise && grainAmt > 0) v += noise[p] * grainAmt;
    v = v < 0 ? 0 : v > 255 ? 255 : v;

    let r = v;
    let gg = v;
    let bb = v;

    if (isColor) {
      const lum = v / 255;
      const keep = 1 - colorAmt;
      r = v * keep + (255 - (255 - src[i]) * 0.65) * lum * colorAmt;
      gg = v * keep + (255 - (255 - src[i + 1]) * 0.65) * lum * colorAmt;
      bb = v * keep + (255 - (255 - src[i + 2]) * 0.65) * lum * colorAmt;
    }

    out[i] = r * pr;
    out[i + 1] = gg * pg;
    out[i + 2] = bb * pb;
    out[i + 3] = 255;
  }

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  canvas.getContext("2d")?.putImageData(output, 0, 0);
}

function buildEngine(img: HTMLImageElement, maxDim: number): Engine {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) throw new Error("This image has no readable dimensions.");

  const scale = Math.min(1, maxDim / Math.max(nw, nh));
  const width = Math.max(1, Math.round(nw * scale));
  const height = Math.max(1, Math.round(nh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Your browser could not process this image.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  const source = ctx.getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);
  const d = source.data;
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    gray[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }

  return {
    width,
    height,
    source,
    gray,
    blur: null,
    blurKey: -1,
    noise: null,
    output: new ImageData(width, height),
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/* Small UI pieces                                                     */
/* ------------------------------------------------------------------ */

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  upload: "M12 16V4m0 0L7 9m5-5l5 5M4 20h16",
  download: "M12 4v12m0 0l-5-5m5 5l5-5M4 20h16",
  copy: "M9 9h10v10H9zM5 15V5h10",
  reset: "M4 4v6h6M20 20v-6h-6M20 10A8 8 0 006.3 6.3L4 10m16 4l-2.3 3.7A8 8 0 014 14",
  image: "M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M9 9h.01",
};

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="ps-panel">
      <div className="ps-panel-head">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="ps-slider">
      <div className="ps-slider-head">
        <label htmlFor={id}>{label}</label>
        <span className="ps-badge">{format ? format(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, #ff5a1f ${pct}%, #e6eaf1 ${pct}%)`,
        }}
      />
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="ps-seg"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={active ? "active" : ""}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function PencilSketchTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const sketchCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);

  const engineRef = useRef<Engine | null>(null);
  const fileRef = useRef<File | null>(null);
  const loadIdRef = useRef(0);
  const rafRef = useRef(0);
  const drawnVersionRef = useRef(-1);
  const draggingSplitRef = useRef(false);
  const noticeTimerRef = useRef<number | undefined>(undefined);

  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [info, setInfo] = useState<ImageInfo | null>(null);
  const [version, setVersion] = useState(0);
  const [view, setView] = useState<View>("compare");
  const [split, setSplit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [format, setFormat] = useState<Format>("png");
  const [resolution, setResolution] = useState(1800);
  const [renderMs, setRenderMs] = useState(0);

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 2200);
  }, []);

  /* ---------- loading ---------- */

  const loadFile = useCallback((file: File, maxDim: number) => {
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file (JPG, PNG or WebP).");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Image size must be 15 MB or less.");
      return;
    }

    const id = ++loadIdRef.current;
    setLoading(true);

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      if (id !== loadIdRef.current) return;

      requestAnimationFrame(() =>
        window.setTimeout(() => {
          if (id !== loadIdRef.current) return;
          try {
            const engine = buildEngine(img, maxDim);
            engineRef.current = engine;
            fileRef.current = file;
            setInfo({
              name: file.name.replace(/\.[^/.]+$/, "") || "image",
              width: engine.width,
              height: engine.height,
              size: file.size,
            });
            setVersion((v) => v + 1);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong while processing.");
          } finally {
            setLoading(false);
          }
        }, 0)
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      if (id !== loadIdRef.current) return;
      setLoading(false);
      setError("Unable to open this image. Please try another photo.");
    };

    img.src = url;
  }, []);

  const handleFile = useCallback(
    (file: File | undefined | null) => {
      if (file) loadFile(file, resolution);
    },
    [loadFile, resolution]
  );

  /* ---------- rendering (throttled to animation frames) ---------- */

  useEffect(() => {
    const engine = engineRef.current;
    const sketch = sketchCanvasRef.current;
    const original = originalCanvasRef.current;
    if (!engine || !sketch || !original) return;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (drawnVersionRef.current !== version) {
        original.width = engine.width;
        original.height = engine.height;
        original.getContext("2d")?.putImageData(engine.source, 0, 0);
        drawnVersionRef.current = version;
      }
      const t0 = performance.now();
      renderSketch(engine, settings, sketch);
      setRenderMs(Math.round(performance.now() - t0));
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [settings, version, info]);

  /* ---------- paste from clipboard ---------- */

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (file) {
        event.preventDefault();
        handleFile(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFile]);

  useEffect(() => () => window.clearTimeout(noticeTimerRef.current), []);

  /* ---------- actions ---------- */

  function changeResolution(value: number) {
    setResolution(value);
    if (fileRef.current) loadFile(fileRef.current, value);
  }

  function getBlob(): Promise<Blob | null> {
    const canvas = sketchCanvasRef.current;
    if (!canvas) return Promise.resolve(null);
    const fmt = FORMATS.find((f) => f.value === format) ?? FORMATS[0];
    return new Promise((resolve) => canvas.toBlob(resolve, fmt.mime, 0.95));
  }

  async function downloadImage() {
    if (!info) return;
    const blob = await getBlob();
    if (!blob) {
      setError("Could not export the image. Please try again.");
      return;
    }
    const fmt = FORMATS.find((f) => f.value === format) ?? FORMATS[0];
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${info.name}-pencil-sketch.${fmt.ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showNotice("Download started");
  }

  async function copyImage() {
    const canvas = sketchCanvasRef.current;
    if (!canvas) return;
    try {
      if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
        throw new Error("unsupported");
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("no blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showNotice("Copied to clipboard");
    } catch {
      showNotice("Copy isn't supported in this browser");
    }
  }

  function resetTool() {
    loadIdRef.current++;
    engineRef.current = null;
    fileRef.current = null;
    drawnVersionRef.current = -1;
    setInfo(null);
    setSettings(DEFAULTS);
    setView("compare");
    setSplit(50);
    setError("");
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  /* ---------- compare slider ---------- */

  function updateSplit(clientX: number) {
    const el = compareRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    setSplit(clamp(((clientX - rect.left) / rect.width) * 100, 0, 100));
  }

  const clip = view === "compare" ? split : view === "sketch" ? 0 : 100;
  const aspect = info ? info.width / info.height : 1;

  /* ---------- render ---------- */

  return (
    <div
      className="ps-root"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <style jsx global>{`
        .ps-root {
          --ps-accent: #ff5a1f;
          --ps-accent-dark: #e94b13;
          --ps-ink: #172033;
          --ps-muted: #7a8497;
          --ps-border: #e5eaf2;
          position: relative;
          width: 100%;
          min-width: 0;
          color: var(--ps-ink);
          box-sizing: border-box;
        }
        .ps-root *,
        .ps-root *::before,
        .ps-root *::after {
          box-sizing: border-box;
        }
        .ps-root button {
          font-family: inherit;
        }
        .ps-hidden {
          display: none !important;
        }

        /* ---------- Upload screen ---------- */
        .ps-hero {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          min-height: 360px;
          padding: 40px 24px;
          border: 2px dashed #ffc9b3;
          border-radius: 24px;
          background: linear-gradient(135deg, #fff6f1 0%, #ffffff 50%, #fff1f6 100%);
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }
        .ps-hero:hover {
          border-color: var(--ps-accent);
          box-shadow: 0 14px 40px rgba(255, 90, 31, 0.12);
        }
        .ps-hero::before,
        .ps-hero::after {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
        }
        .ps-hero::before {
          top: -90px;
          left: -90px;
          background: rgba(255, 140, 90, 0.28);
        }
        .ps-hero::after {
          bottom: -90px;
          right: -90px;
          background: rgba(255, 120, 170, 0.22);
        }
        .ps-hero > * {
          position: relative;
          z-index: 1;
        }
        .ps-hero-icon {
          width: 84px;
          height: 84px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 26px;
          font-size: 40px;
          background: linear-gradient(135deg, #ff7a45, #ff5a1f);
          box-shadow: 0 12px 28px rgba(255, 90, 31, 0.32);
          margin-bottom: 20px;
          transition: transform 0.2s ease;
        }
        .ps-hero:hover .ps-hero-icon {
          transform: scale(1.06) rotate(-4deg);
        }
        .ps-hero h3 {
          margin: 0;
          font-size: 26px;
          line-height: 1.25;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--ps-ink);
        }
        .ps-hero p {
          margin: 10px 0 0;
          max-width: 440px;
          font-size: 14px;
          line-height: 1.6;
          color: #5f6a7e;
        }
        .ps-hero .ps-hero-note {
          margin-top: 16px;
          font-size: 12px;
          color: #8b94a5;
        }

        .ps-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 10px 18px;
          border-radius: 12px;
          border: 1px solid #dfe3eb;
          background: #fff;
          color: #30394c;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.18s ease;
          width: auto;
        }
        .ps-btn:hover:not(:disabled) {
          border-color: var(--ps-accent);
          color: var(--ps-accent);
        }
        .ps-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .ps-btn.primary {
          background: linear-gradient(135deg, #ff6b35, #ff5a1f);
          border-color: var(--ps-accent);
          color: #fff;
          box-shadow: 0 8px 20px rgba(255, 90, 31, 0.25);
        }
        .ps-btn.primary:hover:not(:disabled) {
          background: var(--ps-accent-dark);
          border-color: var(--ps-accent-dark);
          color: #fff;
          transform: translateY(-1px);
        }
        .ps-btn.big {
          min-height: 50px;
          padding: 12px 30px;
          font-size: 15px;
          margin-top: 26px;
        }
        .ps-btn.block {
          width: 100%;
        }

        .ps-features {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }
        .ps-feature {
          padding: 18px;
          border: 1px solid var(--ps-border);
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 3px 12px rgba(20, 35, 60, 0.04);
        }
        .ps-feature .emoji {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #fff3ed;
          font-size: 19px;
        }
        .ps-feature strong {
          display: block;
          margin-top: 12px;
          font-size: 14px;
        }
        .ps-feature span {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          line-height: 1.5;
          color: var(--ps-muted);
        }

        /* ---------- Editor layout ---------- */
        .ps-editor {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
          gap: 20px;
          align-items: start;
        }
        .ps-stage-card {
          overflow: hidden;
          border: 1px solid var(--ps-border);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 3px 12px rgba(20, 35, 60, 0.04);
        }
        .ps-stage-head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid #eef1f6;
          background: #fafbfd;
        }
        .ps-file-name {
          margin: 0;
          font-size: 14px;
          font-weight: 750;
          max-width: 360px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ps-file-meta {
          margin: 3px 0 0;
          font-size: 11px;
          color: var(--ps-muted);
        }
        .ps-stage-head .ps-seg {
          min-width: 260px;
        }
        .ps-stage {
          padding: 24px;
          background-color: #f4f6fa;
          background-image: radial-gradient(circle at 1px 1px, #dfe4ec 1px, transparent 0);
          background-size: 18px 18px;
        }
        .ps-canvas-wrap {
          position: relative;
          margin: 0 auto;
          overflow: hidden;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 18px 50px rgba(20, 35, 60, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.06);
          user-select: none;
          -webkit-user-select: none;
        }
        .ps-canvas-wrap canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }
        .ps-tag {
          position: absolute;
          top: 12px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(17, 24, 39, 0.62);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          pointer-events: none;
          backdrop-filter: blur(6px);
        }
        .ps-divider {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          margin-left: -1px;
          background: #fff;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
        }
        .ps-handle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 42px;
          height: 42px;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #fff;
          color: var(--ps-accent);
          font-weight: 800;
          font-size: 15px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
          outline: none;
        }
        .ps-handle:focus-visible {
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.4), 0 6px 18px rgba(0, 0, 0, 0.22);
        }
        .ps-loading-bar {
          padding: 10px 16px;
          text-align: center;
          font-size: 13px;
          font-weight: 650;
          color: #87462e;
          background: #fff8f4;
          border-top: 1px solid #ffe1d3;
        }

        /* ---------- Sidebar ---------- */
        .ps-side {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
          position: sticky;
          top: 18px;
        }
        .ps-panel {
          padding: 20px;
          border: 1px solid var(--ps-border);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 3px 12px rgba(20, 35, 60, 0.04);
        }
        .ps-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .ps-panel-head h3 {
          margin: 0;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #8892a6;
        }
        .ps-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 0;
          border: 0;
          background: none;
          font-size: 12px;
          font-weight: 700;
          color: #8892a6;
          cursor: pointer;
        }
        .ps-link-btn:hover {
          color: var(--ps-accent);
        }
        .ps-stack {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ps-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ps-chip {
          padding: 8px 14px;
          border: 1px solid #e1e5ec;
          border-radius: 999px;
          background: #fff;
          color: #465066;
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .ps-chip:hover {
          border-color: var(--ps-accent);
          background: #fff7f3;
          color: var(--ps-accent);
        }

        .ps-seg {
          display: grid;
          gap: 4px;
          padding: 4px;
          border-radius: 12px;
          background: #eff2f7;
        }
        .ps-seg button {
          padding: 8px 6px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #5d677b;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .ps-seg button:hover {
          color: var(--ps-ink);
        }
        .ps-seg button.active {
          background: #fff;
          color: var(--ps-accent);
          box-shadow: 0 2px 8px rgba(20, 35, 60, 0.1);
        }

        .ps-slider-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 9px;
        }
        .ps-slider-head label {
          font-size: 13px;
          font-weight: 650;
          color: #30394c;
        }
        .ps-badge {
          min-width: 52px;
          padding: 2px 9px;
          border-radius: 7px;
          background: #fff1ea;
          color: var(--ps-accent-dark);
          font-size: 12px;
          font-weight: 750;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }
        .ps-slider input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          display: block;
          width: 100%;
          height: 6px;
          margin: 0;
          border-radius: 999px;
          outline: none;
          cursor: pointer;
        }
        .ps-slider input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid var(--ps-accent);
          box-shadow: 0 2px 8px rgba(255, 90, 31, 0.35);
          cursor: grab;
        }
        .ps-slider input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid var(--ps-accent);
          box-shadow: 0 2px 8px rgba(255, 90, 31, 0.35);
          cursor: grab;
        }
        .ps-slider input[type="range"]:focus-visible {
          box-shadow: 0 0 0 4px rgba(255, 90, 31, 0.18);
        }

        .ps-label {
          display: block;
          margin-bottom: 9px;
          font-size: 13px;
          font-weight: 650;
          color: #30394c;
        }
        .ps-papers {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }
        .ps-paper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 8px 6px;
          border: 1.5px solid #e1e5ec;
          border-radius: 12px;
          background: #fff;
          color: #5d677b;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .ps-paper:hover {
          border-color: #c5ccd9;
        }
        .ps-paper.active {
          border-color: var(--ps-accent);
          background: #fff7f3;
          color: var(--ps-accent-dark);
        }
        .ps-swatch {
          display: block;
          width: 100%;
          height: 24px;
          border-radius: 7px;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
        }

        .ps-select {
          width: 100%;
          height: 44px;
          padding: 9px 11px;
          border: 1px solid #d8e0eb;
          border-radius: 10px;
          background: #fff;
          color: var(--ps-ink);
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .ps-select:focus {
          border-color: var(--ps-accent);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
        }
        .ps-hint {
          margin: 7px 0 0;
          font-size: 11px;
          color: var(--ps-muted);
          line-height: 1.5;
        }
        .ps-btn-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }
        .ps-btn-grid .full {
          grid-column: 1 / -1;
        }

        /* ---------- Alerts & toast ---------- */
        .ps-error {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          padding: 12px 14px;
          border: 1px solid #ffd4cc;
          border-radius: 12px;
          background: #fff2f0;
          color: #b42318;
          font-size: 13px;
          line-height: 1.5;
        }
        .ps-error button {
          border: 0;
          background: none;
          color: inherit;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          line-height: 1;
        }
        .ps-processing {
          margin-top: 16px;
          padding: 14px;
          border-radius: 12px;
          background: #fff8f4;
          border: 1px solid #ffe1d3;
          color: #87462e;
          text-align: center;
          font-size: 13px;
          font-weight: 650;
        }
        .ps-toast-wrap {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 24px;
          z-index: 60;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }
        .ps-toast {
          padding: 10px 20px;
          border-radius: 999px;
          background: #172033;
          color: #fff;
          font-size: 13px;
          font-weight: 650;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
        }
        .ps-drop-overlay {
          position: absolute;
          inset: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px dashed var(--ps-accent);
          border-radius: 24px;
          background: rgba(255, 90, 31, 0.08);
          backdrop-filter: blur(2px);
          pointer-events: none;
        }
        .ps-drop-overlay span {
          padding: 12px 22px;
          border-radius: 12px;
          background: #fff;
          color: var(--ps-accent-dark);
          font-size: 14px;
          font-weight: 750;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        }
        .ps-privacy {
          margin: 28px 0 0;
          text-align: center;
          font-size: 12px;
          color: var(--ps-muted);
        }

        /* ---------- Responsive ---------- */
        @media (max-width: 1000px) {
          .ps-editor {
            grid-template-columns: minmax(0, 1fr);
          }
          .ps-side {
            position: static;
          }
        }
        @media (max-width: 640px) {
          .ps-features {
            grid-template-columns: 1fr;
          }
          .ps-hero {
            min-height: 320px;
            padding: 28px 16px;
          }
          .ps-hero h3 {
            font-size: 22px;
          }
          .ps-stage {
            padding: 12px;
          }
          .ps-stage-head .ps-seg {
            min-width: 0;
            width: 100%;
          }
          .ps-stage-head > div:last-child {
            width: 100%;
          }
          .ps-panel {
            padding: 16px;
          }
        }
      `}</style>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="ps-hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {isDragging && (
        <div className="ps-drop-overlay">
          <span>Drop your photo to convert it</span>
        </div>
      )}

      {error && (
        <div className="ps-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            ✕
          </button>
        </div>
      )}

      {!info ? (
        /* ---------------- Upload screen ---------------- */
        <div>
          <div className="ps-hero" onClick={() => !loading && inputRef.current?.click()}>
            <div className="ps-hero-icon">✏️</div>
            <h3>Turn any photo into a pencil sketch</h3>
            <p>Drag &amp; drop, paste from clipboard (Ctrl/Cmd + V), or browse your files.</p>

            <button
              type="button"
              className="ps-btn primary big"
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              <Icon d={ICONS.upload} size={20} />
              {loading ? "Processing…" : "Choose Photo"}
            </button>

            <span className="ps-hero-note">JPG, PNG or WebP · up to 15 MB</span>
          </div>

          <div className="ps-features">
            {[
              ["🔒", "100% private", "Everything runs in your browser."],
              ["🎨", "4 art styles", "Graphite, charcoal, color & ink."],
              ["🖼️", "HD export", "PNG, JPG or WebP up to 3200 px."],
            ].map(([icon, title, text]) => (
              <div key={title} className="ps-feature">
                <div className="emoji">{icon}</div>
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ---------------- Editor ---------------- */
        <div className="ps-editor">
          {/* Stage */}
          <div className="ps-stage-card">
            <div className="ps-stage-head">
              <div style={{ minWidth: 0 }}>
                <p className="ps-file-name">{info.name}</p>
                <p className="ps-file-meta">
                  {info.width} × {info.height} px · {formatBytes(info.size)} · rendered in {renderMs} ms
                </p>
              </div>
              <div>
                <Segmented<View>
                  label="Preview mode"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "compare", label: "Compare" },
                    { value: "sketch", label: "Sketch" },
                    { value: "original", label: "Original" },
                  ]}
                />
              </div>
            </div>

            <div className="ps-stage">
              <div
                ref={compareRef}
                className="ps-canvas-wrap"
                style={{
                  aspectRatio: `${info.width} / ${info.height}`,
                  width: `min(100%, calc(72vh * ${aspect}))`,
                  cursor: view === "compare" ? "ew-resize" : "default",
                  touchAction: view === "compare" ? "pan-y" : "auto",
                }}
                onPointerDown={(e) => {
                  if (view !== "compare") return;
                  draggingSplitRef.current = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  updateSplit(e.clientX);
                }}
                onPointerMove={(e) => {
                  if (draggingSplitRef.current) updateSplit(e.clientX);
                }}
                onPointerUp={() => {
                  draggingSplitRef.current = false;
                }}
                onPointerCancel={() => {
                  draggingSplitRef.current = false;
                }}
              >
                <canvas ref={originalCanvasRef} aria-label="Original photo" />
                <canvas
                  ref={sketchCanvasRef}
                  style={{ clipPath: `inset(0 0 0 ${clip}%)` }}
                  aria-label="Pencil sketch result"
                />

                {view === "compare" && (
                  <>
                    <span className="ps-tag" style={{ left: 12 }}>
                      Original
                    </span>
                    <span className="ps-tag" style={{ right: 12 }}>
                      Sketch
                    </span>
                    <div className="ps-divider" style={{ left: `${split}%` }}>
                      <div
                        className="ps-handle"
                        role="slider"
                        tabIndex={0}
                        aria-label="Compare original and sketch"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(split)}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowLeft") setSplit((s) => clamp(s - 3, 0, 100));
                          if (e.key === "ArrowRight") setSplit((s) => clamp(s + 3, 0, 100));
                        }}
                      >
                        ↔
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {loading && <div className="ps-loading-bar">Processing your photo…</div>}
          </div>

          {/* Controls */}
          <aside className="ps-side">
            <Panel title="Presets">
              <div className="ps-chips">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className="ps-chip"
                    onClick={() => setSettings({ ...DEFAULTS, ...p.settings })}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel
              title="Style & Adjustments"
              action={
                <button type="button" className="ps-link-btn" onClick={() => setSettings(DEFAULTS)}>
                  <Icon d={ICONS.reset} size={13} /> Reset
                </button>
              }
            >
              <div className="ps-stack">
                <Segmented<Mode>
                  label="Sketch style"
                  value={settings.mode}
                  onChange={(v) => update("mode", v)}
                  options={MODES}
                />

                <Slider
                  label={settings.mode === "ink" ? "Line Density" : "Sketch Intensity"}
                  value={settings.intensity}
                  min={0}
                  max={100}
                  onChange={(v) => update("intensity", v)}
                  format={(v) => `${v}%`}
                />
                <Slider
                  label="Line Detail"
                  value={settings.detail}
                  min={0}
                  max={100}
                  onChange={(v) => update("detail", v)}
                  format={(v) => (v < 34 ? "Soft" : v < 67 ? "Balanced" : "Fine")}
                />
                <Slider
                  label="Contrast"
                  value={settings.contrast}
                  min={50}
                  max={200}
                  onChange={(v) => update("contrast", v)}
                  format={(v) => `${v}%`}
                />
                <Slider
                  label="Brightness"
                  value={settings.brightness}
                  min={-50}
                  max={50}
                  onChange={(v) => update("brightness", v)}
                  format={(v) => (v > 0 ? `+${v}` : `${v}`)}
                />
                <Slider
                  label="Paper Grain"
                  value={settings.grain}
                  min={0}
                  max={100}
                  onChange={(v) => update("grain", v)}
                  format={(v) => `${v}%`}
                />

                {settings.mode === "color" && (
                  <Slider
                    label="Color Strength"
                    value={settings.colorAmount}
                    min={0}
                    max={100}
                    onChange={(v) => update("colorAmount", v)}
                    format={(v) => `${v}%`}
                  />
                )}

                <div>
                  <span className="ps-label">Paper</span>
                  <div className="ps-papers">
                    {(Object.keys(PAPERS) as PaperKey[]).map((key) => {
                      const active = settings.paper === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`ps-paper ${active ? "active" : ""}`}
                          onClick={() => update("paper", key)}
                          aria-pressed={active}
                          title={PAPERS[key].label}
                        >
                          <span className="ps-swatch" style={{ backgroundColor: PAPERS[key].hex }} />
                          {PAPERS[key].label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Export">
              <div className="ps-stack" style={{ gap: 16 }}>
                <Segmented<Format>
                  label="Export format"
                  value={format}
                  onChange={setFormat}
                  options={FORMATS.map((f) => ({ value: f.value, label: f.label }))}
                />

                <div>
                  <label htmlFor="ps-resolution" className="ps-label">
                    Resolution
                  </label>
                  <select
                    id="ps-resolution"
                    className="ps-select"
                    value={resolution}
                    onChange={(e) => changeResolution(Number(e.target.value))}
                  >
                    {RESOLUTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <p className="ps-hint">Images smaller than the chosen size are never upscaled.</p>
                </div>

                <div className="ps-btn-grid">
                  <button type="button" className="ps-btn primary full" onClick={downloadImage}>
                    <Icon d={ICONS.download} size={18} /> Download Sketch
                  </button>
                  <button type="button" className="ps-btn" onClick={copyImage}>
                    <Icon d={ICONS.copy} /> Copy
                  </button>
                  <button type="button" className="ps-btn" onClick={resetTool}>
                    <Icon d={ICONS.image} /> New Photo
                  </button>
                </div>
              </div>
            </Panel>
          </aside>
        </div>
      )}

      {loading && !info && <div className="ps-processing">Processing your photo. Please wait…</div>}

      <div aria-live="polite" className="ps-toast-wrap">
        {notice && <div className="ps-toast">{notice}</div>}
      </div>

      <p className="ps-privacy">
        🔒 Your photo is processed locally in your browser. It is never uploaded to any server.
      </p>
    </div>
  );
}