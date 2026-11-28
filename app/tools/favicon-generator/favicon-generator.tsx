"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DragEvent as ReactDragEvent } from "react";
import JSZip from "jszip";
import ToolShell from "../ToolShell";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type Mode = "text" | "image";
type Shape = "square" | "rounded" | "circle" | "squircle";
type BgType = "solid" | "linear" | "radial" | "transparent";
type Variant = "standard" | "apple" | "maskable";
type Weight = 400 | 700 | 900;
type ImageFit = "cover" | "contain";
type SvgMode = "live" | "image";
type PreviewBg = "checker" | "light" | "dark";
type CodeTab = "html" | "next" | "manifest";

interface Design {
  mode: Mode;
  text: string;
  font: string;
  weight: Weight;
  italic: boolean;
  fontSize: number;
  textColor: string;
  shape: Shape;
  radius: number;
  padding: number;
  bgType: BgType;
  bg: string;
  bg2: string;
  angle: number;
  borderWidth: number;
  borderColor: string;
  shadow: boolean;
  offsetX: number;
  offsetY: number;
  rotation: number;
  imageFit: ImageFit;
  imageZoom: number;
  removeBg: boolean;
  tolerance: number;
  autoCrop: boolean;
}

interface Site {
  siteName: string;
  shortName: string;
  themeColor: string;
  themeLinked: boolean;
}

interface SourceImage {
  url: string;
  name: string;
  element: HTMLImageElement;
  isSvg: boolean;
}

interface CustomFont {
  name: string;
  dataUrl: string;
}

interface RenderArgs {
  size: number;
  variant: Variant;
  design: Design;
  image: HTMLCanvasElement | null;
  family: string;
}

type RenderFn = (size: number, variant?: Variant) => HTMLCanvasElement;

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FONT_SIZE = 5 * 1024 * 1024;
const WORKING_DIMENSION = 1024;
const PRESET_KEY = "toolsab-favicon-studio-preset";
const CUSTOM_FONT_FAMILY = "FaviconCustomFont";
const EMOJI_FALLBACK = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';

const PNG_SIZES = [16, 32, 48, 64, 96, 128, 180, 192, 256, 384, 512, 1024];
const PACKAGE_SIZES = [16, 32, 48, 64, 96, 128, 256];
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const EMOJI_PICKS = ["A", "★", "⚡", "🚀", "❤️", "🔥", "✓", "☕", "🌿"];

const FONTS: { label: string; css: string }[] = [
  { label: "Arial", css: `Arial, Helvetica, sans-serif, ${EMOJI_FALLBACK}` },
  { label: "Helvetica", css: `Helvetica, Arial, sans-serif, ${EMOJI_FALLBACK}` },
  { label: "Verdana", css: `Verdana, Geneva, sans-serif, ${EMOJI_FALLBACK}` },
  { label: "Tahoma", css: `Tahoma, Geneva, sans-serif, ${EMOJI_FALLBACK}` },
  { label: "Trebuchet MS", css: `"Trebuchet MS", Helvetica, sans-serif, ${EMOJI_FALLBACK}` },
  { label: "Impact", css: `Impact, Haettenschweiler, sans-serif, ${EMOJI_FALLBACK}` },
  { label: "Georgia", css: `Georgia, "Times New Roman", serif, ${EMOJI_FALLBACK}` },
  { label: "Times New Roman", css: `"Times New Roman", Times, serif, ${EMOJI_FALLBACK}` },
  { label: "Courier New", css: `"Courier New", Courier, monospace, ${EMOJI_FALLBACK}` },
  { label: "Comic Sans MS", css: `"Comic Sans MS", "Comic Sans", cursive, ${EMOJI_FALLBACK}` },
  { label: "System UI", css: `system-ui, -apple-system, "Segoe UI", sans-serif, ${EMOJI_FALLBACK}` },
];

const DEFAULT_DESIGN: Design = {
  mode: "text",
  text: "A",
  font: "Arial",
  weight: 700,
  italic: false,
  fontSize: 70,
  textColor: "#ffffff",
  shape: "rounded",
  radius: 22,
  padding: 12,
  bgType: "solid",
  bg: "#ff5a1f",
  bg2: "#e64a14",
  angle: 135,
  borderWidth: 0,
  borderColor: "#ffffff",
  shadow: false,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  imageFit: "cover",
  imageZoom: 100,
  removeBg: false,
  tolerance: 20,
  autoCrop: false,
};

const DEFAULT_SITE: Site = {
  siteName: "My Website",
  shortName: "Website",
  themeColor: "#ff5a1f",
  themeLinked: true,
};

/** Fields every quick style resets first, so styles never stack on each other. */
const STYLE_BASE: Partial<Design> = {
  bgType: "solid",
  borderWidth: 0,
  borderColor: "#ffffff",
  shadow: false,
  weight: 700,
  shape: "rounded",
  radius: 22,
  angle: 135,
};

const QUICK_STYLES: { name: string; swatch: string; design: Partial<Design> }[] = [
  {
    name: "Ocean",
    swatch: "linear-gradient(135deg,#2563eb,#06b6d4)",
    design: { bgType: "linear", bg: "#2563eb", bg2: "#06b6d4", textColor: "#ffffff" },
  },
  {
    name: "Sunset",
    swatch: "linear-gradient(135deg,#f97316,#db2777)",
    design: { bgType: "linear", bg: "#f97316", bg2: "#db2777", textColor: "#ffffff" },
  },
  {
    name: "Midnight",
    swatch: "#0f172a",
    design: { bg: "#0f172a", textColor: "#38bdf8", shape: "squircle", borderWidth: 3, borderColor: "#38bdf8" },
  },
  {
    name: "Mint",
    swatch: "#10b981",
    design: { bg: "#10b981", textColor: "#ffffff", shape: "circle", shadow: true },
  },
  {
    name: "Candy",
    swatch: "radial-gradient(circle,#f9a8d4,#a855f7)",
    design: { bgType: "radial", bg: "#f9a8d4", bg2: "#a855f7", textColor: "#ffffff", shape: "circle" },
  },
  {
    name: "Gold",
    swatch: "linear-gradient(160deg,#fde68a,#d97706)",
    design: { bgType: "linear", bg: "#fde68a", bg2: "#d97706", angle: 160, textColor: "#451a03", shape: "squircle", weight: 900 },
  },
  {
    name: "Mono",
    swatch: "#ffffff",
    design: { bg: "#ffffff", textColor: "#111111", shape: "square", borderWidth: 4, borderColor: "#111111" },
  },
  {
    name: "Floating",
    swatch: "transparent",
    design: { bgType: "transparent", textColor: "#ff5a1f", shadow: true, weight: 900 },
  },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function hexToRgb(value: string): [number, number, number] {
  const safe = HEX_RE.test(value) ? value : "#000000";
  return [
    parseInt(safe.slice(1, 3), 16),
    parseInt(safe.slice(3, 5), 16),
    parseInt(safe.slice(5, 7), 16),
  ];
}

function luminance(value: string) {
  const [r, g, b] = hexToRgb(value).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c] as string)
  );
}

const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? clamp(v, min, max) : fallback;

const hex = (v: unknown, fallback: string) =>
  typeof v === "string" && HEX_RE.test(v) ? v : fallback;

function oneOf<T extends string | number>(v: unknown, list: readonly T[], fallback: T): T {
  return list.includes(v as T) ? (v as T) : fallback;
}

function sanitizeDesign(raw: Record<string, unknown>): Design {
  const d = DEFAULT_DESIGN;
  return {
    mode: oneOf(raw.mode, ["text", "image"] as const, d.mode),
    text: typeof raw.text === "string" ? raw.text.slice(0, 48) : d.text,
    font: typeof raw.font === "string" ? raw.font.slice(0, 40) : d.font,
    weight: oneOf(raw.weight, [400, 700, 900] as const, d.weight),
    italic: typeof raw.italic === "boolean" ? raw.italic : d.italic,
    fontSize: num(raw.fontSize, 20, 100, d.fontSize),
    textColor: hex(raw.textColor, d.textColor),
    shape: oneOf(raw.shape, ["square", "rounded", "circle", "squircle"] as const, d.shape),
    radius: num(raw.radius, 0, 50, d.radius),
    padding: num(raw.padding, 0, 35, d.padding),
    bgType: oneOf(raw.bgType, ["solid", "linear", "radial", "transparent"] as const, d.bgType),
    bg: hex(raw.bg, d.bg),
    bg2: hex(raw.bg2, d.bg2),
    angle: num(raw.angle, 0, 360, d.angle),
    borderWidth: num(raw.borderWidth, 0, 10, d.borderWidth),
    borderColor: hex(raw.borderColor, d.borderColor),
    shadow: typeof raw.shadow === "boolean" ? raw.shadow : d.shadow,
    offsetX: num(raw.offsetX, -40, 40, d.offsetX),
    offsetY: num(raw.offsetY, -40, 40, d.offsetY),
    rotation: num(raw.rotation, -180, 180, d.rotation),
    imageFit: oneOf(raw.imageFit, ["cover", "contain"] as const, d.imageFit),
    imageZoom: num(raw.imageZoom, 50, 300, d.imageZoom),
    removeBg: typeof raw.removeBg === "boolean" ? raw.removeBg : d.removeBg,
    tolerance: num(raw.tolerance, 1, 100, d.tolerance),
    autoCrop: typeof raw.autoCrop === "boolean" ? raw.autoCrop : d.autoCrop,
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not read the file."));
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create the image."))),
      "image/png"
    )
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function writeClipboard(text: string) {
  if (!navigator.clipboard) throw new Error("Clipboard unavailable");
  await navigator.clipboard.writeText(text);
}

/* -------------------------------------------------------------------------- */
/*  Geometry shared by canvas and SVG output                                   */
/* -------------------------------------------------------------------------- */

function shapePath(shape: Shape, radiusPct: number, s: number): string {
  const f = (n: number) => Number(n.toFixed(3));

  if (shape === "circle") {
    const r = s / 2;
    return `M${r} 0A${r} ${r} 0 1 1 ${r} ${s}A${r} ${r} 0 1 1 ${r} 0Z`;
  }

  if (shape === "rounded") {
    const r = f(Math.min(s / 2, (s * radiusPct) / 100));
    if (r < 0.01) return `M0 0H${s}V${s}H0Z`;
    return (
      `M${r} 0H${f(s - r)}A${r} ${r} 0 0 1 ${s} ${r}V${f(s - r)}` +
      `A${r} ${r} 0 0 1 ${f(s - r)} ${s}H${r}A${r} ${r} 0 0 1 0 ${f(s - r)}` +
      `V${r}A${r} ${r} 0 0 1 ${r} 0Z`
    );
  }

  if (shape === "squircle") {
    const n = 5;
    const a = s / 2;
    const points: string[] = [];
    const steps = 96;
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const c = Math.cos(t);
      const sn = Math.sin(t);
      const x = a + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const y = a + a * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
      points.push(`${f(x)} ${f(y)}`);
    }
    return `M${points.join("L")}Z`;
  }

  return `M0 0H${s}V${s}H0Z`;
}

function gradientLine(angle: number, s: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const c = Math.cos(rad);
  const sn = Math.sin(rad);
  const h = s / 2;
  const len = h * (Math.abs(c) + Math.abs(sn));
  return { x0: h - c * len, y0: h - sn * len, x1: h + c * len, y1: h + sn * len };
}

function applyVariant(design: Design, variant: Variant): Design {
  if (variant === "standard") return design;
  const next: Design = { ...design, shape: "square" };
  // Apple and maskable icons must be fully opaque.
  if (next.bgType === "transparent") {
    next.bgType = "solid";
    next.bg = "#ffffff";
  }
  if (variant === "maskable") {
    next.padding = Math.max(next.padding, 14);
    next.borderWidth = 0;
  }
  return next;
}

let measureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext() {
  if (!measureContext) {
    measureContext = document.createElement("canvas").getContext("2d");
  }
  return measureContext;
}

function textLines(text: string) {
  return text
    .split("\n")
    .slice(0, 3)
    .map((line) => Array.from(line).slice(0, 16).join(""));
}

/** Font size is relative to the icon size; shrinks so text always fits. */
function layoutText(design: Design, family: string) {
  const lines = textLines(design.text);
  if (!lines.some((line) => line.trim())) return null;

  const lineHeight = 1.05;
  const content = 1 - (2 * design.padding) / 100;
  const ctx = getMeasureContext();
  let fs = (design.fontSize / 100) * content;
  fs = Math.min(fs, content / (lines.length * lineHeight));

  if (ctx) {
    ctx.font = `${design.italic ? "italic " : ""}${design.weight} 100px ${family}`;
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width)) / 100;
    if (widest > 0) fs = Math.min(fs, content / widest);
  }

  return { lines, fs, lineHeight };
}

/* -------------------------------------------------------------------------- */
/*  Image preparation                                                          */
/* -------------------------------------------------------------------------- */

function buildWorkingCanvas(source: SourceImage): HTMLCanvasElement | null {
  const el = source.element;
  const w = el.naturalWidth || 512;
  const h = el.naturalHeight || 512;
  const limit = WORKING_DIMENSION / Math.max(w, h);
  const scale = source.isSvg ? limit : Math.min(1, limit);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function processImage(
  base: HTMLCanvasElement,
  removeBg: boolean,
  tolerance: number,
  autoCrop: boolean
): HTMLCanvasElement {
  if (!removeBg && !autoCrop) return base;

  const width = base.width;
  const height = base.height;
  const work = document.createElement("canvas");
  work.width = width;
  work.height = height;
  const ctx = work.getContext("2d", { willReadFrequently: true });
  if (!ctx) return base;
  ctx.drawImage(base, 0, 0);

  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;

  if (removeBg) {
    const corners = [0, width - 1, (height - 1) * width, width * height - 1];
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (const c of corners) {
      if (d[c * 4 + 3] >= 10) {
        r += d[c * 4];
        g += d[c * 4 + 1];
        b += d[c * 4 + 2];
        n++;
      }
    }

    if (n > 0) {
      r /= n;
      g /= n;
      b /= n;
      const limit = (tolerance / 100) * 441.67;
      const limit2 = limit * limit;

      const matches = (i: number) => {
        if (d[i * 4 + 3] < 10) return true;
        const dr = d[i * 4] - r;
        const dg = d[i * 4 + 1] - g;
        const db = d[i * 4 + 2] - b;
        return dr * dr + dg * dg + db * db <= limit2;
      };

      const visited = new Uint8Array(width * height);
      const stack = new Int32Array(width * height);
      let top = 0;

      const push = (i: number) => {
        if (visited[i] || !matches(i)) return;
        visited[i] = 1;
        stack[top++] = i;
      };

      for (let x = 0; x < width; x++) {
        push(x);
        push((height - 1) * width + x);
      }
      for (let y = 0; y < height; y++) {
        push(y * width);
        push(y * width + width - 1);
      }

      while (top > 0) {
        const i = stack[--top];
        d[i * 4 + 3] = 0;
        const x = i % width;
        const y = (i - x) / width;
        if (x > 0) push(i - 1);
        if (x < width - 1) push(i + 1);
        if (y > 0) push(i - width);
        if (y < height - 1) push(i + width);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  if (!autoCrop) return work;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (d[(y * width + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || (minX === 0 && minY === 0 && maxX === width - 1 && maxY === height - 1)) {
    return work;
  }

  const cropped = document.createElement("canvas");
  cropped.width = maxX - minX + 1;
  cropped.height = maxY - minY + 1;
  cropped
    .getContext("2d")
    ?.drawImage(work, minX, minY, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
  return cropped;
}

/** Halves the image step by step so tiny icons stay sharp instead of jagged. */
function shrinkTo(source: HTMLCanvasElement, targetWidth: number) {
  let current = source;
  while (current.width / 2 >= targetWidth && current.width > 1 && current.height > 1) {
    const step = document.createElement("canvas");
    step.width = Math.max(1, Math.floor(current.width / 2));
    step.height = Math.max(1, Math.floor(current.height / 2));
    const ctx = step.getContext("2d");
    if (!ctx) break;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(current, 0, 0, step.width, step.height);
    current = step;
  }
  return current;
}

/* -------------------------------------------------------------------------- */
/*  Icon renderer (canvas)                                                     */
/* -------------------------------------------------------------------------- */

function renderIcon({ size: S, variant, design, image, family }: RenderArgs): HTMLCanvasElement {
  const d = applyVariant(design, variant);
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  const path = new Path2D(shapePath(d.shape, d.radius, S));

  ctx.save();
  ctx.clip(path);

  if (d.bgType !== "transparent") {
    if (d.bgType === "solid") {
      ctx.fillStyle = d.bg;
    } else if (d.bgType === "linear") {
      const l = gradientLine(d.angle, S);
      const gradient = ctx.createLinearGradient(l.x0, l.y0, l.x1, l.y1);
      gradient.addColorStop(0, d.bg);
      gradient.addColorStop(1, d.bg2);
      ctx.fillStyle = gradient;
    } else {
      const gradient = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.7);
      gradient.addColorStop(0, d.bg);
      gradient.addColorStop(1, d.bg2);
      ctx.fillStyle = gradient;
    }
    ctx.fillRect(0, 0, S, S);
  }

  const pad = (S * d.padding) / 100;
  const box = S - pad * 2;
  const cx = S / 2 + (d.offsetX * S) / 100;
  const cy = S / 2 + (d.offsetY * S) / 100;

  ctx.save();
  if (d.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = S * 0.03;
    ctx.shadowOffsetY = S * 0.015;
  }

  if (d.mode === "text") {
    const layout = layoutText(d, family);
    if (layout) {
      const px = layout.fs * S;
      ctx.translate(cx, cy);
      ctx.rotate((d.rotation * Math.PI) / 180);
      ctx.fillStyle = d.textColor;
      ctx.font = `${d.italic ? "italic " : ""}${d.weight} ${px}px ${family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      layout.lines.forEach((line, i) => {
        ctx.fillText(line, 0, (i - (layout.lines.length - 1) / 2) * px * layout.lineHeight);
      });
    }
  } else if (image && image.width > 0 && image.height > 0) {
    const base =
      d.imageFit === "cover"
        ? Math.max(box / image.width, box / image.height)
        : Math.min(box / image.width, box / image.height);
    const scale = (base * d.imageZoom) / 100;
    const dw = image.width * scale;
    const dh = image.height * scale;
    const shrunk = shrinkTo(image, dw);

    if (d.imageFit === "cover") {
      ctx.beginPath();
      ctx.rect(pad, pad, box, box);
      ctx.clip();
    }
    ctx.translate(cx, cy);
    ctx.rotate((d.rotation * Math.PI) / 180);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(shrunk, 0, 0, shrunk.width, shrunk.height, -dw / 2, -dh / 2, dw, dh);
  }
  ctx.restore();

  if (d.borderWidth > 0) {
    ctx.lineWidth = S * (d.borderWidth / 100) * 2;
    ctx.strokeStyle = d.borderColor;
    ctx.stroke(path);
  }

  ctx.restore();
  return canvas;
}

/* -------------------------------------------------------------------------- */
/*  SVG output                                                                 */
/* -------------------------------------------------------------------------- */

function svgFromRaster(dataUrl: string) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="512" height="512" viewBox="0 0 512 512">` +
    `<image width="512" height="512" href="${dataUrl}" xlink:href="${dataUrl}"/></svg>`
  );
}

function svgLive(design: Design, family: string, fontDataUrl: string | null) {
  const S = 512;
  const d = design;
  const defs: string[] = [];
  const f = (n: number) => Number(n.toFixed(3));

  let fill = d.bg;
  if (d.bgType === "linear") {
    const l = gradientLine(d.angle, S);
    defs.push(
      `<linearGradient id="bg" gradientUnits="userSpaceOnUse" x1="${f(l.x0)}" y1="${f(l.y0)}" x2="${f(l.x1)}" y2="${f(l.y1)}">` +
        `<stop offset="0" stop-color="${d.bg}"/><stop offset="1" stop-color="${d.bg2}"/></linearGradient>`
    );
    fill = "url(#bg)";
  } else if (d.bgType === "radial") {
    defs.push(
      `<radialGradient id="bg" gradientUnits="userSpaceOnUse" cx="${S / 2}" cy="${S / 2}" r="${S * 0.7}">` +
        `<stop offset="0" stop-color="${d.bg}"/><stop offset="1" stop-color="${d.bg2}"/></radialGradient>`
    );
    fill = "url(#bg)";
  }

  const shape = shapePath(d.shape, d.radius, S);
  defs.push(`<clipPath id="shape"><path d="${shape}"/></clipPath>`);

  if (d.shadow) {
    defs.push(
      `<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">` +
        `<feDropShadow dx="0" dy="${f(S * 0.015)}" stdDeviation="${f(S * 0.015)}" flood-color="#000" flood-opacity="0.35"/></filter>`
    );
  }

  if (fontDataUrl) {
    defs.push(
      `<style>@font-face{font-family:'${CUSTOM_FONT_FAMILY}';src:url(${fontDataUrl});}</style>`
    );
  }

  const body: string[] = [];
  if (d.bgType !== "transparent") {
    body.push(`<rect width="${S}" height="${S}" fill="${fill}"/>`);
  }

  const layout = layoutText(d, family);
  if (layout) {
    const px = f(layout.fs * S);
    const cx = f(S / 2 + (d.offsetX * S) / 100);
    const cy = f(S / 2 + (d.offsetY * S) / 100);
    const attrFamily = escapeXml(family.replace(/"/g, "'"));
    const texts = layout.lines
      .map((line, i) => {
        const y = f((i - (layout.lines.length - 1) / 2) * layout.fs * S * layout.lineHeight);
        return `<text x="0" y="${y}" text-anchor="middle" dominant-baseline="central">${escapeXml(line)}</text>`;
      })
      .join("");
    body.push(
      `<g transform="translate(${cx} ${cy}) rotate(${d.rotation})"${d.shadow ? ' filter="url(#shadow)"' : ""} ` +
        `fill="${d.textColor}" font-family="${attrFamily}" font-size="${px}" font-weight="${d.weight}"` +
        `${d.italic ? ' font-style="italic"' : ""}>${texts}</g>`
    );
  }

  if (d.borderWidth > 0) {
    body.push(
      `<path d="${shape}" fill="none" stroke="${d.borderColor}" stroke-width="${f(S * (d.borderWidth / 100) * 2)}"/>`
    );
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">` +
    `<defs>${defs.join("")}</defs><g clip-path="url(#shape)">${body.join("")}</g></svg>`
  );
}

/* -------------------------------------------------------------------------- */
/*  ICO output                                                                 */
/* -------------------------------------------------------------------------- */

async function buildIco(blobs: { size: number; blob: Blob }[]) {
  const images = await Promise.all(
    blobs.map(async ({ size, blob }) => ({
      size,
      bytes: new Uint8Array(await blob.arrayBuffer()),
    }))
  );

  const headerSize = 6 + 16 * images.length;
  const total = images.reduce((sum, item) => sum + item.bytes.length, headerSize);
  const buffer = new ArrayBuffer(total);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);

  let offset = headerSize;
  images.forEach((item, i) => {
    const entry = 6 + i * 16;
    const dimension = item.size >= 256 ? 0 : item.size;
    view.setUint8(entry, dimension);
    view.setUint8(entry + 1, dimension);
    view.setUint8(entry + 2, 0);
    view.setUint8(entry + 3, 0);
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, item.bytes.length, true);
    view.setUint32(entry + 12, offset, true);
    bytes.set(item.bytes, offset);
    offset += item.bytes.length;
  });

  return new Blob([buffer], { type: "image/x-icon" });
}

/* -------------------------------------------------------------------------- */
/*  Small UI pieces                                                            */
/* -------------------------------------------------------------------------- */

function IconCanvas({
  render,
  size,
  variant = "standard",
  display,
  label,
  className,
}: {
  render: RenderFn;
  size: number;
  variant?: Variant;
  display: number;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    try {
      const output = render(size, variant);
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, size, size);
      ctx?.drawImage(output, 0, 0);
    } catch {
      /* rendering errors are surfaced by the export actions */
    }
  }, [render, size, variant]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className={className}
      style={{ width: display, height: display }}
    />
  );
}

function RangeField({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
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
        style={{ ["--pct" as string]: `${pct}%` }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
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
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={`segment ${option.value === value ? "active" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="color-field">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value.toLowerCase())}
          aria-label={`${label} picker`}
        />
        <input
          type="text"
          value={draft}
          maxLength={7}
          spellCheck={false}
          aria-label={`${label} hex code`}
          onChange={(event) => {
            const raw = event.target.value;
            const next = raw.startsWith("#") ? raw : `#${raw}`;
            setDraft(next);
            if (HEX_RE.test(next)) onChange(next.toLowerCase());
          }}
          onBlur={() => setDraft(value)}
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="switch-row">
      <div>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </div>
      <input
        className="switch"
        type="checkbox"
        role="switch"
        checked={checked}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}

function SizeChips({
  sizes,
  selected,
  onToggle,
  label,
}: {
  sizes: number[];
  selected: number[];
  onToggle: (size: number) => void;
  label: string;
}) {
  return (
    <div className="chip-row" role="group" aria-label={label}>
      {sizes.map((size) => (
        <button
          key={size}
          type="button"
          aria-pressed={selected.includes(size)}
          className={`chip ${selected.includes(size) ? "on" : ""}`}
          onClick={() => onToggle(size)}
        >
          {size}
        </button>
      ))}
    </div>
  );
}

function SectionHead({
  step,
  title,
  help,
}: {
  step: number | string;
  title: string;
  help?: string;
}) {
  return (
    <div className="section-top">
      <span className="step-badge">{step}</span>
      <div>
        <h3 className="section-heading">{title}</h3>
        {help && <p className="section-help">{help}</p>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function FaviconGenerator() {
  const urlRef = useRef("");
  const fontInputRef = useRef<HTMLInputElement>(null);
  const fontFaceRef = useRef<FontFace | null>(null);
  const dragDepth = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN);
  const [site, setSite] = useState<Site>(DEFAULT_SITE);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [customFont, setCustomFont] = useState<CustomFont | null>(null);
  const [fontVersion, setFontVersion] = useState(0);
  const [fileName, setFileName] = useState("favicon");
  const [pngSize, setPngSize] = useState(512);
  const [icoSizes, setIcoSizes] = useState<number[]>([16, 32, 48]);
  const [packageSizes, setPackageSizes] = useState<number[]>([16, 32, 48]);
  const [svgMode, setSvgMode] = useState<SvgMode>("live");
  const [previewBg, setPreviewBg] = useState<PreviewBg>("checker");
  const [codeTab, setCodeTab] = useState<CodeTab>("html");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  /* Stable updater: never changes identity, so it cannot retrigger effects. */
  const set = useCallback(
    <K extends keyof Design>(key: K, value: Design[K]) =>
      setDesign((previous) =>
        previous[key] === value ? previous : { ...previous, [key]: value }
      ),
    []
  );

  const flash = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 2400);
  }, []);

  /* ------------------------------- Image -------------------------------- */

  const loadImage = useCallback(
    (file?: File | null) => {
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("That file is not an image. Choose a PNG, JPG, WebP, GIF or SVG file.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("That image is larger than 10 MB. Choose a smaller file.");
        return;
      }

      const url = URL.createObjectURL(file);
      const element = new Image();

      element.onload = () => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;
        setSource({
          url,
          name: file.name || "pasted-image.png",
          element,
          isSvg: file.type === "image/svg+xml",
        });
        setDesign((previous) => ({ ...previous, mode: "image" }));
        const base = (file.name || "").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-");
        if (base) setFileName(base.slice(0, 50));
        setError("");
        flash("Image loaded");
      };

      element.onerror = () => {
        URL.revokeObjectURL(url);
        setError("Your browser could not open this image. Try a PNG, JPG or WebP version.");
      };

      element.src = url;
    },
    [flash]
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName) && !event.clipboardData?.files?.length) {
        return;
      }
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            loadImage(file);
          }
          break;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadImage]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      if (fontFaceRef.current) document.fonts.delete(fontFaceRef.current);
    };
  }, []);

  const loadFont = useCallback(
    async (file?: File | null) => {
      if (!file) return;
      if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) {
        setError("Choose a TTF, OTF, WOFF or WOFF2 font file.");
        return;
      }
      if (file.size > MAX_FONT_SIZE) {
        setError("That font file is larger than 5 MB.");
        return;
      }

      try {
        const [buffer, dataUrl] = await Promise.all([file.arrayBuffer(), readAsDataUrl(file)]);
        const face = new FontFace(CUSTOM_FONT_FAMILY, buffer);
        await face.load();
        if (fontFaceRef.current) document.fonts.delete(fontFaceRef.current);
        document.fonts.add(face);
        fontFaceRef.current = face;
        setCustomFont({ name: file.name, dataUrl });
        setFontVersion((v) => v + 1);
        setDesign((previous) => ({ ...previous, font: "custom", mode: "text" }));
        setError("");
        flash("Custom font loaded");
      } catch {
        setError("Could not load this font file. Try a different font.");
      }
    },
    [flash]
  );

  const removeImage = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = "";
    }
    setSource(null);
  }, []);

  const baseCanvas = useMemo(() => (source ? buildWorkingCanvas(source) : null), [source]);

  /* Heavy flood-fill work follows a deferred copy so sliders stay smooth. */
  const deferredDesign = useDeferredValue(design);

  const imageCanvas = useMemo(
    () =>
      baseCanvas
        ? processImage(
            baseCanvas,
            deferredDesign.removeBg,
            deferredDesign.tolerance,
            deferredDesign.autoCrop
          )
        : null,
    [baseCanvas, deferredDesign.removeBg, deferredDesign.tolerance, deferredDesign.autoCrop]
  );

  /* ------------------------------ Rendering ------------------------------ */

  const useCustom = design.font === "custom" && customFont !== null;
  const family = useCustom
    ? `"${CUSTOM_FONT_FAMILY}", sans-serif, ${EMOJI_FALLBACK}`
    : FONTS.find((item) => item.label === design.font)?.css ?? FONTS[0].css;

  /** Builds a renderer with an internal cache so each size draws only once. */
  const makeRenderer = useCallback(
    (d: Design): RenderFn => {
      void fontVersion;
      const cache = new Map<string, HTMLCanvasElement>();
      return (size, variant = "standard") => {
        const key = `${size}:${variant}`;
        const hit = cache.get(key);
        if (hit) return hit;
        const out = renderIcon({ size, variant, design: d, image: imageCanvas, family });
        cache.set(key, out);
        return out;
      };
    },
    [imageCanvas, family, fontVersion]
  );

  const render = useMemo(() => makeRenderer(design), [makeRenderer, design]);
  const previewRender = useMemo(
    () => makeRenderer(deferredDesign),
    [makeRenderer, deferredDesign]
  );

  const themeColor = site.themeLinked
    ? design.bgType === "transparent"
      ? "#ffffff"
      : design.bg
    : site.themeColor;

  const contrast = useMemo(() => {
    if (design.mode !== "text" || design.bgType === "transparent") return null;
    const against =
      design.bgType === "solid"
        ? contrastRatio(design.textColor, design.bg)
        : Math.min(
            contrastRatio(design.textColor, design.bg),
            contrastRatio(design.textColor, design.bg2)
          );
    return Math.round(against * 10) / 10;
  }, [design]);

  const contrastOk = contrast !== null && contrast >= 3;

  /* -------------------------------- Codes -------------------------------- */

  const htmlCode = useMemo(
    () =>
      `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="${themeColor}">`,
    [themeColor]
  );

  const nextCode = useMemo(
    () =>
      `// app/layout.tsx
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: ${JSON.stringify(site.siteName)},
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "${themeColor}",
};`,
    [site.siteName, themeColor]
  );

  const manifestCode = useMemo(
    () =>
      JSON.stringify(
        {
          name: site.siteName,
          short_name: site.shortName,
          icons: [
            { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
          theme_color: themeColor,
          background_color: design.bgType === "transparent" ? "#ffffff" : design.bg,
          display: "standalone",
        },
        null,
        2
      ),
    [site.siteName, site.shortName, themeColor, design.bg, design.bgType]
  );

  const activeCode =
    codeTab === "html" ? htmlCode : codeTab === "next" ? nextCode : manifestCode;

  /* -------------------------------- Exports ------------------------------- */

  const safeName = fileName.trim() || "favicon";

  const buildSvg = useCallback(() => {
    if (design.mode === "image" || svgMode === "image") {
      return svgFromRaster(render(512).toDataURL("image/png"));
    }
    return svgLive(design, family, useCustom && customFont ? customFont.dataUrl : null);
  }, [design, svgMode, render, family, useCustom, customFont]);

  const exportPng = async () => {
    try {
      downloadBlob(await canvasBlob(render(pngSize)), `${safeName}-${pngSize}x${pngSize}.png`);
      flash("PNG downloaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PNG export failed.");
    }
  };

  const copyPng = async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof ClipboardItem === "undefined"
    ) {
      setError("Your browser cannot copy images. Download the PNG instead.");
      return;
    }
    try {
      const blob = await canvasBlob(render(pngSize));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      flash("Image copied to clipboard");
    } catch {
      setError("Could not copy the image. Download the PNG instead.");
    }
  };

  const exportSvg = () => {
    try {
      downloadBlob(
        new Blob([buildSvg()], { type: "image/svg+xml;charset=utf-8" }),
        `${safeName}.svg`
      );
      flash("SVG downloaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "SVG export failed.");
    }
  };

  const makeIco = async () => {
    const sizes = [...icoSizes].sort((a, b) => a - b);
    const blobs = await Promise.all(
      sizes.map(async (size) => ({ size, blob: await canvasBlob(render(size)) }))
    );
    return buildIco(blobs);
  };

  const exportIco = async () => {
    if (icoSizes.length === 0) {
      setError("Select at least one size for the ICO file.");
      return;
    }
    try {
      downloadBlob(await makeIco(), `${safeName}.ico`);
      flash("ICO downloaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ICO export failed.");
    }
  };

  const copyDataUri = async () => {
    try {
      const uri = render(32).toDataURL("image/png");
      await writeClipboard(`<link rel="icon" href="${uri}">`);
      flash("Inline favicon tag copied");
    } catch {
      setError("Clipboard access is unavailable in this browser.");
    }
  };

  const copyCode = async () => {
    try {
      await writeClipboard(activeCode);
      flash("Code copied");
    } catch {
      setError("Clipboard access is unavailable in this browser.");
    }
  };

  const downloadPackage = async () => {
    if (icoSizes.length === 0) {
      setError("Select at least one size for the ICO file.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const zip = new JSZip();
      const sortedIco = [...icoSizes].sort((a, b) => a - b);

      zip.file("favicon.ico", await makeIco());
      zip.file("favicon.svg", buildSvg());

      for (const size of [...packageSizes].sort((a, b) => a - b)) {
        zip.file(`favicon-${size}x${size}.png`, await canvasBlob(render(size)));
      }

      zip.file("apple-touch-icon.png", await canvasBlob(render(180, "apple")));
      zip.file("android-chrome-192x192.png", await canvasBlob(render(192)));
      zip.file("android-chrome-512x512.png", await canvasBlob(render(512)));
      zip.file("maskable-icon-512x512.png", await canvasBlob(render(512, "maskable")));

      zip.file("site.webmanifest", manifestCode);
      zip.file("html-code.txt", htmlCode);
      zip.file("nextjs-code.txt", nextCode);
      zip.file(
        "README.txt",
        `Favicon package for ${site.siteName}

1. Upload every image file and site.webmanifest to the root of your website.
2. Paste the code from html-code.txt into the <head> of your pages.
   Next.js users can use nextjs-code.txt instead.

favicon.ico                    Multi-size icon (${sortedIco.join(", ")}px) for older browsers
favicon.svg                    Scalable icon for modern browsers
apple-touch-icon.png           180px square icon for iPhone and iPad home screens
android-chrome-*.png           Icons for Android and the web manifest
maskable-icon-512x512.png      Full-bleed Android icon with a safe zone
site.webmanifest               Web app manifest
`
      );

      downloadBlob(await zip.generateAsync({ type: "blob" }), `${safeName}-favicon-package.zip`);
      flash("Favicon package downloaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Package generation failed.");
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------- Presets -------------------------------- */

  const toggleSize = (
    setter: (updater: (previous: number[]) => number[]) => void,
    size: number
  ) =>
    setter((previous) =>
      previous.includes(size) ? previous.filter((s) => s !== size) : [...previous, size]
    );

  const savePreset = () => {
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify({ design, site }));
      setError("");
      flash("Settings saved in this browser");
    } catch {
      setError("Could not save settings in this browser.");
    }
  };

  const loadPreset = () => {
    try {
      const saved = localStorage.getItem(PRESET_KEY);
      if (!saved) {
        setError("No saved settings were found in this browser.");
        return;
      }
      const parsed = JSON.parse(saved) as {
        design?: Record<string, unknown>;
        site?: Record<string, unknown>;
      };
      const loaded = sanitizeDesign(parsed.design ?? {});
      if (loaded.mode === "image" && !source) loaded.mode = "text";
      if (loaded.font === "custom" && !customFont) loaded.font = DEFAULT_DESIGN.font;
      setDesign(loaded);
      const s = parsed.site ?? {};
      setSite({
        siteName: typeof s.siteName === "string" ? s.siteName.slice(0, 60) : DEFAULT_SITE.siteName,
        shortName:
          typeof s.shortName === "string" ? s.shortName.slice(0, 20) : DEFAULT_SITE.shortName,
        themeColor: hex(s.themeColor, DEFAULT_SITE.themeColor),
        themeLinked:
          typeof s.themeLinked === "boolean" ? s.themeLinked : DEFAULT_SITE.themeLinked,
      });
      setError("");
      flash("Saved settings loaded");
    } catch {
      setError("Could not load the saved settings.");
    }
  };

  /* Stable identity: ToolShell can safely use it in effects or memo deps. */
  const resetAll = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = "";
    }
    if (fontFaceRef.current) {
      document.fonts.delete(fontFaceRef.current);
      fontFaceRef.current = null;
    }
    setSource(null);
    setCustomFont(null);
    setDesign(DEFAULT_DESIGN);
    setSite(DEFAULT_SITE);
    setFileName("favicon");
    setPngSize(512);
    setIcoSizes([16, 32, 48]);
    setPackageSizes([16, 32, 48]);
    setSvgMode("live");
    setPreviewBg("checker");
    setCodeTab("html");
    setError("");
    flash("Settings reset");
  }, [flash]);

  /* -------------------------------- Render -------------------------------- */

  const hasFiles = (event: ReactDragEvent) =>
    Array.from(event.dataTransfer.types).includes("Files");

  const siteName = site.siteName || "My Website";

  return (
    <ToolShell title="Favicon Studio Pro" onReset={resetAll} wide>
      <div
        className="fav-pro"
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
          if (!hasFiles(event)) return;
          event.preventDefault();
          dragDepth.current = 0;
          setIsDragging(false);
          loadImage(event.dataTransfer.files?.[0]);
        }}
      >
        <style jsx global>{`
          /* Breadcrumb: turns an unstyled <ol> into a clean inline trail. */
          nav[aria-label*="readcrumb" i],
          nav.breadcrumb,
          nav.breadcrumbs,
          .breadcrumb,
          .breadcrumbs {
            width: 100%;
            max-width: 1240px;
            margin: 18px auto 16px;
            padding: 0 16px;
            box-sizing: border-box;
          }
          nav[aria-label*="readcrumb" i] ol,
          nav.breadcrumb ol,
          nav.breadcrumbs ol,
          ol.breadcrumb,
          ol.breadcrumbs,
          .breadcrumb ol,
          .breadcrumbs ol {
            display: inline-flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 2px 8px;
            margin: 0;
            padding: 8px 16px;
            list-style: none;
            font-size: 13px;
            line-height: 1.4;
            background: #fff;
            border: 1px solid #e6e8f0;
            border-radius: 999px;
            box-shadow: 0 6px 18px -12px rgba(17, 24, 39, 0.25);
          }
          nav[aria-label*="readcrumb" i] li,
          nav.breadcrumb li,
          nav.breadcrumbs li,
          .breadcrumb li,
          .breadcrumbs li {
            display: inline-flex;
            align-items: center;
            margin: 0;
            padding: 0;
            list-style: none;
            color: #6b7280;
            font-weight: 600;
          }
          nav[aria-label*="readcrumb" i] li::marker,
          .breadcrumb li::marker,
          .breadcrumbs li::marker {
            content: "";
          }
          nav[aria-label*="readcrumb" i] li[aria-hidden="true"],
          .breadcrumb li[aria-hidden="true"],
          .breadcrumbs li[aria-hidden="true"] {
            color: #c3c8d6;
            font-weight: 400;
          }
          nav[aria-label*="readcrumb" i] a,
          .breadcrumb a,
          .breadcrumbs a {
            color: #ff5a1f;
            font-weight: 700;
            text-decoration: none;
          }
          nav[aria-label*="readcrumb" i] a:hover,
          .breadcrumb a:hover,
          .breadcrumbs a:hover {
            color: #e64a14;
            text-decoration: underline;
          }
          nav[aria-label*="readcrumb" i] li:last-child,
          .breadcrumb li:last-child,
          .breadcrumbs li:last-child {
            color: #111827;
            font-weight: 800;
          }
          .tool-interface .tool-workspace-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px 20px;
            flex-wrap: wrap;
            padding: 16px 20px;
            margin-bottom: 18px;
            background: #fff;
            border: 1px solid #e6e8f0;
            border-left: 4px solid #ff5a1f;
            border-radius: 16px;
            box-shadow: 0 1px 2px rgba(17, 24, 39, 0.03), 0 8px 24px -14px rgba(17, 24, 39, 0.12);
          }
          .tool-interface .tool-workspace-kicker {
            margin: 0 0 4px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #ff5a1f;
          }
          .tool-interface .tool-workspace-title {
            margin: 0;
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #111827;
          }
          .tool-interface .tool-workspace-caption {
            margin: 4px 0 0;
            font-size: 12px;
            color: #6b7280;
          }
          .tool-interface .tool-workspace-actions {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
          }
          .tool-interface .tool-local-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 12px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            background: #ecfdf3;
            color: #067647;
          }
          .tool-interface .tool-secondary-button {
            min-height: 36px;
            padding: 7px 14px;
            border-radius: 10px;
            border: 1px solid #d9dde8;
            background: #fff;
            color: #374151;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: 0.15s ease;
          }
          .tool-interface .tool-secondary-button:hover {
            border-color: #ff5a1f;
            color: #ff5a1f;
          }
          .fav-pro {
            --accent: #ff5a1f;
            --accent-2: #e64a14;
            --accent-soft: #fff3ed;
            --ink: #111827;
            --ink-2: #374151;
            --muted: #6b7280;
            --line: #e6e8f0;
            --surface: #ffffff;
            --canvas: #f5f6fb;
            position: relative;
            color: var(--ink);
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }
          .fav-pro *,
          .fav-pro *::before,
          .fav-pro *::after {
            box-sizing: border-box;
          }
          .fav-pro .hero {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px 24px;
            flex-wrap: wrap;
            border-radius: 16px;
            padding: 14px 18px;
            margin-bottom: 18px;
            color: #fff;
            background: linear-gradient(120deg, #ff5a1f 0%, #e64a14 100%);
            box-shadow: 0 14px 30px -18px rgba(255, 90, 31, 0.7);
          }
          .fav-pro .hero p {
            margin: 0;
            flex: 1 1 320px;
            font-size: 13px;
            font-weight: 600;
            line-height: 1.55;
            color: rgba(255, 255, 255, 0.95);
          }
          .fav-pro .hero-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .fav-pro .hero-tags span {
            padding: 5px 11px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.18);
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          .fav-pro .studio-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(340px, 420px);
            gap: 20px;
            align-items: start;
            width: 100%;
            min-width: 0;
          }
          .fav-pro .studio-main,
          .fav-pro .studio-sidebar {
            display: flex;
            flex-direction: column;
            gap: 16px;
            min-width: 0;
          }
          .fav-pro .studio-sidebar {
            position: sticky;
            top: 16px;
            max-height: calc(100vh - 32px);
            overflow-y: auto;
            padding: 2px;
            scrollbar-width: thin;
          }
          .fav-pro .section {
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 20px;
            box-shadow: 0 1px 2px rgba(17, 24, 39, 0.03), 0 8px 24px -14px rgba(17, 24, 39, 0.12);
            min-width: 0;
            width: 100%;
          }
          .fav-pro .section-top {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 16px;
          }
          .fav-pro .step-badge {
            flex-shrink: 0;
            width: 28px;
            height: 28px;
            border-radius: 9px;
            display: grid;
            place-items: center;
            font-size: 12px;
            font-weight: 800;
            color: #fff;
            background: linear-gradient(135deg, var(--accent), var(--accent-2));
            box-shadow: 0 4px 10px -3px rgba(255, 90, 31, 0.55);
          }
          .fav-pro .section-heading {
            font-size: 15px;
            font-weight: 800;
            letter-spacing: -0.01em;
            margin: 0;
            color: var(--ink);
          }
          .fav-pro .section-help {
            color: var(--muted);
            font-size: 12px;
            line-height: 1.6;
            margin: 4px 0 0;
          }
          .fav-pro .field-label {
            display: block;
            font-size: 12px;
            font-weight: 700;
            color: var(--ink-2);
            margin-bottom: 7px;
          }
          .fav-pro .input,
          .fav-pro .select,
          .fav-pro .textarea {
            width: 100%;
            border: 1px solid #d9dde8;
            border-radius: 11px;
            padding: 9px 12px;
            background: #fff;
            color: var(--ink);
            font: inherit;
            font-size: 13px;
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
          }
          .fav-pro .input,
          .fav-pro .select {
            height: 44px;
          }
          .fav-pro .textarea {
            min-height: 76px;
            resize: vertical;
            line-height: 1.5;
          }
          .fav-pro .input:focus,
          .fav-pro .select:focus,
          .fav-pro .textarea:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 4px rgba(255, 90, 31, 0.14);
          }
          .fav-pro .stack {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }
          .fav-pro .grid-2 {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }
          .fav-pro .grid-2 > div {
            min-width: 0;
          }
          .fav-pro .range-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }
          .fav-pro .range-head .field-label {
            margin-bottom: 6px;
          }
          .fav-pro .range-value {
            min-width: 52px;
            text-align: center;
            font-size: 11px;
            font-weight: 800;
            font-variant-numeric: tabular-nums;
            background: var(--accent-soft);
            color: var(--accent);
            border-radius: 7px;
            padding: 2px 8px;
          }
          .fav-pro .range {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 6px;
            border-radius: 999px;
            cursor: pointer;
            outline: none;
            background: linear-gradient(
              90deg,
              var(--accent) var(--pct, 50%),
              #e3e6ef var(--pct, 50%)
            );
          }
          .fav-pro .range::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #fff;
            border: 2px solid var(--accent);
            box-shadow: 0 2px 6px rgba(255, 90, 31, 0.35);
          }
          .fav-pro .range::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #fff;
            border: 2px solid var(--accent);
            box-shadow: 0 2px 6px rgba(255, 90, 31, 0.35);
          }
          .fav-pro .range:focus-visible {
            box-shadow: 0 0 0 4px rgba(255, 90, 31, 0.18);
          }
          .fav-pro .segmented {
            display: grid;
            grid-auto-flow: column;
            grid-auto-columns: 1fr;
            gap: 4px;
            padding: 4px;
            background: #eef0f6;
            border-radius: 12px;
          }
          .fav-pro .segment {
            border: 0;
            background: transparent;
            border-radius: 9px;
            padding: 9px 6px;
            min-height: 36px;
            font-size: 12px;
            font-weight: 700;
            color: var(--muted);
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .fav-pro .segment:hover {
            color: var(--ink);
          }
          .fav-pro .segment.active {
            background: #fff;
            color: var(--accent);
            box-shadow: 0 1px 4px rgba(17, 24, 39, 0.14);
          }
          .fav-pro .segment:focus-visible,
          .fav-pro .button:focus-visible,
          .fav-pro .chip:focus-visible,
          .fav-pro .tab-button:focus-visible,
          .fav-pro .style-card:focus-visible,
          .fav-pro .file-picker:focus-within {
            outline: 3px solid rgba(255, 90, 31, 0.3);
            outline-offset: 2px;
          }
          .fav-pro .color-field {
            display: flex;
            align-items: center;
            gap: 8px;
            height: 44px;
            border: 1px solid #d9dde8;
            border-radius: 11px;
            padding: 4px 8px 4px 4px;
            background: #fff;
          }
          .fav-pro .color-field input[type="color"] {
            width: 36px;
            height: 34px;
            border: 0;
            padding: 0;
            background: none;
            cursor: pointer;
          }
          .fav-pro .color-field input[type="text"] {
            width: 100%;
            min-width: 0;
            border: 0;
            outline: none;
            font: inherit;
            font-size: 13px;
            font-variant-numeric: tabular-nums;
            background: transparent;
            color: var(--ink);
          }
          .fav-pro .chip-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .fav-pro .chip {
            border: 1px solid var(--line);
            background: #fff;
            color: var(--ink-2);
            border-radius: 999px;
            padding: 7px 13px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: 0.15s ease;
          }
          .fav-pro .chip:hover {
            border-color: var(--accent);
            color: var(--accent);
          }
          .fav-pro .chip.on {
            border-color: var(--accent);
            background: var(--accent-soft);
            color: var(--accent);
          }
          .fav-pro .chip.emoji {
            font-size: 15px;
            padding: 4px 11px;
          }
          .fav-pro .style-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
          }
          .fav-pro .style-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 12px 6px 10px;
            border: 1px solid var(--line);
            border-radius: 14px;
            background: #fff;
            font-size: 11px;
            font-weight: 700;
            color: var(--ink-2);
            cursor: pointer;
            transition: 0.15s ease;
          }
          .fav-pro .style-card:hover {
            border-color: var(--accent);
            transform: translateY(-2px);
            box-shadow: 0 10px 20px -12px rgba(255, 90, 31, 0.5);
          }
          .fav-pro .swatch {
            width: 38px;
            height: 38px;
            border-radius: 11px;
            border: 1px solid rgba(17, 24, 39, 0.1);
            background-color: #fff;
            background-image: conic-gradient(#e9ecf1 25%, #fff 0 50%, #e9ecf1 0 75%, #fff 0);
            background-size: 10px 10px;
            overflow: hidden;
          }
          .fav-pro .swatch i {
            display: block;
            width: 100%;
            height: 100%;
          }
          .fav-pro .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            width: 100%;
            min-height: 44px;
            padding: 10px 13px;
            border-radius: 11px;
            font-size: 12px;
            font-weight: 750;
            cursor: pointer;
            border: 1px solid #d9dde8;
            background: #fff;
            color: var(--ink-2);
            transition: 0.15s ease;
          }
          .fav-pro .button:hover:not(:disabled) {
            border-color: var(--accent);
            color: var(--accent);
            transform: translateY(-1px);
          }
          .fav-pro .button.primary {
            background: linear-gradient(135deg, var(--accent), var(--accent-2));
            border-color: transparent;
            color: #fff;
            box-shadow: 0 8px 18px -8px rgba(255, 90, 31, 0.7);
          }
          .fav-pro .button.primary:hover:not(:disabled) {
            color: #fff;
            filter: brightness(1.08);
          }
          .fav-pro .button.dark {
            background: var(--ink);
            border-color: var(--ink);
            color: #fff;
            min-height: 48px;
            font-size: 13px;
          }
          .fav-pro .button.dark:hover:not(:disabled) {
            background: #000;
            color: #fff;
            border-color: #000;
          }
          .fav-pro .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .fav-pro .button-row {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
            margin-top: 12px;
          }
          .fav-pro .link-button {
            border: 0;
            background: none;
            color: var(--accent);
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            padding: 0;
          }
          .fav-pro .link-button:hover {
            text-decoration: underline;
          }
          .fav-pro .file-picker {
            display: block;
            width: 100%;
            padding: 26px 20px;
            border: 1.5px dashed #c3c8d9;
            border-radius: 14px;
            background: #fafbff;
            cursor: pointer;
            text-align: center;
            transition: 0.15s ease;
          }
          .fav-pro .file-picker:hover {
            border-color: var(--accent);
            background: var(--accent-soft);
          }
          .fav-pro .file-picker strong {
            display: block;
            font-size: 13px;
            margin-bottom: 5px;
          }
          .fav-pro .file-picker span {
            display: block;
            color: var(--muted);
            font-size: 11px;
            line-height: 1.5;
          }
          .fav-pro .file-info {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-top: 12px;
            padding: 10px 12px;
            border: 1px solid var(--line);
            border-radius: 12px;
            background: #fafbff;
          }
          .fav-pro .file-info img {
            width: 40px;
            height: 40px;
            object-fit: contain;
            border-radius: 8px;
            background: #eef0f6;
          }
          .fav-pro .file-info strong {
            display: block;
            font-size: 12px;
            overflow-wrap: anywhere;
          }
          .fav-pro .file-info span {
            font-size: 11px;
            color: var(--muted);
          }
          .fav-pro .switch-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border-top: 1px solid #eef0f5;
            padding: 12px 0 0;
          }
          .fav-pro .switch-row strong {
            display: block;
            font-size: 12px;
          }
          .fav-pro .switch-row small {
            display: block;
            font-size: 11px;
            color: var(--muted);
            margin-top: 3px;
            line-height: 1.45;
          }
          .fav-pro .switch {
            appearance: none;
            -webkit-appearance: none;
            width: 44px;
            height: 25px;
            border-radius: 30px;
            background: #d5d9e4;
            position: relative;
            cursor: pointer;
            flex-shrink: 0;
            transition: background 0.2s ease;
            margin: 0;
          }
          .fav-pro .switch::after {
            content: "";
            position: absolute;
            width: 19px;
            height: 19px;
            border-radius: 50%;
            background: #fff;
            top: 3px;
            left: 3px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            transition: transform 0.2s ease;
          }
          .fav-pro .switch:checked {
            background: var(--accent);
          }
          .fav-pro .switch:checked::after {
            transform: translateX(19px);
          }
          .fav-pro .switch:focus-visible {
            outline: 3px solid rgba(255, 90, 31, 0.3);
            outline-offset: 2px;
          }
          .fav-pro .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border-radius: 9px;
            padding: 7px 11px;
            font-size: 11px;
            font-weight: 700;
            line-height: 1.4;
          }
          .fav-pro .badge.good {
            background: #ecfdf3;
            color: #067647;
          }
          .fav-pro .badge.warn {
            background: #fff6e5;
            color: #a15c07;
          }
          .fav-pro .notice {
            border: 1px solid #ffd9c7;
            background: var(--accent-soft);
            color: #9a3412;
            border-radius: 12px;
            padding: 12px 14px;
            font-size: 12px;
            line-height: 1.6;
          }
          .fav-pro .error {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 10px;
            border: 1px solid #ffd4cc;
            background: #fff2f0;
            color: #b42318;
            border-radius: 12px;
            padding: 12px 14px;
            font-size: 12px;
            line-height: 1.5;
            margin-bottom: 16px;
          }
          .fav-pro .error button {
            border: 0;
            background: none;
            color: #b42318;
            font-size: 18px;
            line-height: 1;
            cursor: pointer;
          }
          .fav-pro .preview-stage {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 240px;
            padding: 24px;
            border: 1px solid var(--line);
            border-radius: 14px;
            margin-top: 12px;
            transition: background 0.2s ease;
          }
          .fav-pro .preview-stage.checker {
            background-color: #fff;
            background-image: conic-gradient(#eceff4 25%, #fff 0 50%, #eceff4 0 75%, #fff 0);
            background-size: 20px 20px;
          }
          .fav-pro .preview-stage.light {
            background: #ffffff;
          }
          .fav-pro .preview-stage.dark {
            background: #151a28;
          }
          .fav-pro .preview-canvas {
            display: block;
            max-width: 100%;
            filter: drop-shadow(0 10px 20px rgba(20, 35, 60, 0.28));
          }
          .fav-pro .real-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          .fav-pro .real-grid > section {
            margin: 0;
          }
          .fav-pro .tabs-demo {
            display: grid;
            gap: 8px;
          }
          .fav-pro .browser-tab {
            display: flex;
            align-items: center;
            gap: 8px;
            border-radius: 10px 10px 0 0;
            padding: 8px 12px;
            font-size: 12px;
            max-width: 100%;
          }
          .fav-pro .browser-tab span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex: 1;
            min-width: 0;
          }
          .fav-pro .browser-tab.light {
            background: #eef0f4;
            color: #30394c;
            border: 1px solid #dde1e8;
          }
          .fav-pro .browser-tab.dark {
            background: #2b3242;
            color: #dfe4ee;
            border: 1px solid #39425a;
          }
          .fav-pro .device-row {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-top: 16px;
          }
          .fav-pro .device {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 7px;
            padding: 14px 6px;
            border-radius: 14px;
            background: linear-gradient(160deg, #475569, #1e293b);
            color: #e2e8f0;
            font-size: 11px;
            text-align: center;
          }
          .fav-pro .device small {
            font-size: 10px;
            color: #cbd5e1;
          }
          .fav-pro .ios-mask {
            width: 60px;
            height: 60px;
            border-radius: 22%;
            overflow: hidden;
            line-height: 0;
            box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
          }
          .fav-pro .round-mask {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            overflow: hidden;
            line-height: 0;
            box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
          }
          .fav-pro .search-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 16px;
            padding: 12px;
            border: 1px solid var(--line);
            border-radius: 12px;
            background: #fff;
          }
          .fav-pro .search-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #f1f3f4;
            flex-shrink: 0;
          }
          .fav-pro .search-row strong {
            display: block;
            font-size: 12px;
            color: #202124;
          }
          .fav-pro .search-row small {
            display: block;
            font-size: 11px;
            color: #4d5156;
          }
          .fav-pro .search-title {
            font-size: 14px;
            color: #1a0dab;
            margin-top: 2px;
          }
          .fav-pro .ladder {
            display: flex;
            align-items: flex-end;
            flex-wrap: wrap;
            gap: 18px;
            padding: 14px;
            border-radius: 12px;
            background: #f3f5fa;
            margin-top: 16px;
          }
          .fav-pro .ladder > div {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            font-size: 10px;
            color: var(--muted);
          }
          .fav-pro .ladder canvas {
            image-rendering: pixelated;
          }
          .fav-pro .code-tabs {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
            margin-bottom: 10px;
          }
          .fav-pro .tab-button {
            border: 0;
            border-radius: 9px;
            padding: 9px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            background: #eef0f6;
            color: var(--muted);
          }
          .fav-pro .tab-button.active {
            background: var(--accent-soft);
            color: var(--accent);
          }
          .fav-pro pre {
            max-height: 260px;
            overflow: auto;
            margin: 0;
            padding: 14px;
            border-radius: 12px;
            background: #1a1210;
            color: #ffd8c6;
            font-size: 11.5px;
            line-height: 1.65;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
          }
          .fav-pro .export-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 800;
            color: var(--muted);
            margin: 0 0 8px;
          }
          .fav-pro .drop-overlay {
            position: absolute;
            inset: 0;
            z-index: 30;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px dashed var(--accent);
            border-radius: 18px;
            background: rgba(255, 243, 237, 0.93);
            color: var(--accent);
            font-size: 16px;
            font-weight: 800;
            pointer-events: none;
          }
          .fav-pro .toast {
            position: fixed;
            bottom: 24px;
            left: 50%;
            z-index: 50;
            transform: translate(-50%, 8px);
            padding: 10px 18px;
            border-radius: 999px;
            background: var(--ink);
            color: #fff;
            font-size: 13px;
            font-weight: 600;
            opacity: 0;
            pointer-events: none;
            transition: all 0.2s ease;
            box-shadow: 0 12px 28px -10px rgba(0, 0, 0, 0.5);
          }
          .fav-pro .toast.show {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          @media (max-width: 1099px) {
            .fav-pro .studio-layout {
              grid-template-columns: minmax(0, 1fr);
            }
            .fav-pro .studio-sidebar {
              position: static;
              max-height: none;
              overflow: visible;
              order: -1;
            }
            .fav-pro .real-grid {
              grid-template-columns: minmax(0, 1fr);
            }
          }
          @media (max-width: 600px) {
            .fav-pro .hero {
              padding: 20px;
            }
            .fav-pro .section {
              padding: 15px;
            }
            .fav-pro .button-row,
            .fav-pro .grid-2 {
              grid-template-columns: 1fr;
            }
            .fav-pro .device-row {
              grid-template-columns: 1fr;
            }
            .fav-pro .style-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .fav-pro * {
              transition: none !important;
            }
          }
        `}</style>

        <input
          ref={fontInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          style={{ display: "none" }}
          onChange={(event) => {
            void loadFont(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        {isDragging && <div className="drop-overlay">Drop your image to use it as a favicon</div>}

        <div className="hero">
          <p>
            Build a complete favicon set: tab icons, Apple and Android home screen icons,
            SVG, ICO and a ready-to-use web manifest.
          </p>
          <div className="hero-tags">
            <span>ICO · SVG · PNG</span>
            <span>Maskable icons</span>
            <span>Live previews</span>
          </div>
        </div>

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
            {/* 1. Source */}
            <section className="section">
              <SectionHead
                step={1}
                title="Icon source"
                help="Start from a letter, word or emoji, or use your own logo. You can also drag an image onto this page or paste it with Ctrl+V."
              />

              <Segmented<Mode>
                label="Icon source"
                value={design.mode}
                onChange={(value) => set("mode", value)}
                options={[
                  { value: "text", label: "Text or emoji" },
                  { value: "image", label: "Image or logo" },
                ]}
              />

              {design.mode === "text" ? (
                <div style={{ marginTop: 14 }}>
                  <label className="field-label" htmlFor="icon-text">
                    Text or emoji
                  </label>
                  <textarea
                    id="icon-text"
                    className="textarea"
                    value={design.text}
                    maxLength={48}
                    rows={3}
                    placeholder="A"
                    onChange={(event) =>
                      set("text", event.target.value.split("\n").slice(0, 3).join("\n"))
                    }
                  />
                  <div className="chip-row" style={{ marginTop: 10 }} aria-label="Quick picks">
                    {EMOJI_PICKS.map((pick) => (
                      <button
                        key={pick}
                        type="button"
                        className="chip emoji"
                        onClick={() => set("text", pick)}
                      >
                        {pick}
                      </button>
                    ))}
                  </div>
                  <p className="section-help">
                    Up to 3 lines and 16 characters per line. Long text shrinks to fit.
                  </p>
                </div>
              ) : (
                <div style={{ marginTop: 14 }}>
                  <label className="file-picker">
                    <strong>{source ? "＋ Choose a different image" : "＋ Choose an image"}</strong>
                    <span>PNG, JPG, WebP, GIF or SVG · Up to 10 MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(event) => {
                        loadImage(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>

                  {source && (
                    <div className="file-info">
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={source.url} alt="" />
                        <div style={{ minWidth: 0 }}>
                          <strong>{source.name}</strong>
                          <span>
                            {source.element.naturalWidth || "—"}×{source.element.naturalHeight || "—"}px
                          </span>
                        </div>
                      </div>
                      <button type="button" className="link-button" onClick={removeImage}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 2. Quick styles */}
            <section className="section">
              <SectionHead
                step={2}
                title="Quick styles"
                help="Apply a ready-made look, then fine-tune it below."
              />
              <div className="style-grid">
                {QUICK_STYLES.map((style) => (
                  <button
                    key={style.name}
                    type="button"
                    className="style-card"
                    onClick={() =>
                      setDesign((previous) => ({ ...previous, ...STYLE_BASE, ...style.design }))
                    }
                  >
                    <span className="swatch">
                      <i style={{ background: style.swatch }} />
                    </span>
                    {style.name}
                  </button>
                ))}
              </div>
            </section>

            {/* 3. Shape and background */}
            <section className="section">
              <SectionHead
                step={3}
                title="Shape and background"
                help="The shape applies to the standard icon. Apple and maskable icons are always square, as those platforms require."
              />

              <div className="stack">
                <div>
                  <span className="field-label">Shape</span>
                  <Segmented<Shape>
                    label="Icon shape"
                    value={design.shape}
                    onChange={(value) => set("shape", value)}
                    options={[
                      { value: "square", label: "Square" },
                      { value: "rounded", label: "Rounded" },
                      { value: "squircle", label: "Squircle" },
                      { value: "circle", label: "Circle" },
                    ]}
                  />
                </div>

                {design.shape === "rounded" && (
                  <RangeField
                    id="radius"
                    label="Corner radius"
                    value={design.radius}
                    min={0}
                    max={50}
                    suffix="%"
                    onChange={(value) => set("radius", value)}
                  />
                )}

                <div>
                  <span className="field-label">Background</span>
                  <Segmented<BgType>
                    label="Background type"
                    value={design.bgType}
                    onChange={(value) => set("bgType", value)}
                    options={[
                      { value: "solid", label: "Solid" },
                      { value: "linear", label: "Linear" },
                      { value: "radial", label: "Radial" },
                      { value: "transparent", label: "None" },
                    ]}
                  />
                </div>

                {design.bgType !== "transparent" && (
                  <div className="grid-2">
                    <ColorField
                      id="bg-color"
                      label={design.bgType === "solid" ? "Background colour" : "Start colour"}
                      value={design.bg}
                      onChange={(value) => set("bg", value)}
                    />
                    {design.bgType !== "solid" && (
                      <ColorField
                        id="bg-color-2"
                        label="End colour"
                        value={design.bg2}
                        onChange={(value) => set("bg2", value)}
                      />
                    )}
                  </div>
                )}

                {design.bgType === "linear" && (
                  <RangeField
                    id="angle"
                    label="Gradient angle"
                    value={design.angle}
                    min={0}
                    max={360}
                    suffix="°"
                    onChange={(value) => set("angle", value)}
                  />
                )}

                <RangeField
                  id="padding"
                  label="Padding"
                  value={design.padding}
                  min={0}
                  max={35}
                  suffix="%"
                  onChange={(value) => set("padding", value)}
                />

                <div className="grid-2">
                  <RangeField
                    id="border-width"
                    label="Border width"
                    value={design.borderWidth}
                    min={0}
                    max={10}
                    suffix="%"
                    onChange={(value) => set("borderWidth", value)}
                  />
                  {design.borderWidth > 0 && (
                    <ColorField
                      id="border-color"
                      label="Border colour"
                      value={design.borderColor}
                      onChange={(value) => set("borderColor", value)}
                    />
                  )}
                </div>

                <Toggle
                  label="Soft shadow"
                  hint="Adds depth behind the text or logo."
                  checked={design.shadow}
                  onChange={(value) => set("shadow", value)}
                />
              </div>
            </section>

            {/* 4. Content */}
            <section className="section">
              <SectionHead
                step={4}
                title={design.mode === "text" ? "Text style" : "Logo placement"}
                help={
                  design.mode === "text"
                    ? "Choose how your letters look and where they sit."
                    : "Fit, crop and clean up your logo."
                }
              />

              <div className="stack">
                {design.mode === "text" ? (
                  <>
                    <div className="grid-2">
                      <div>
                        <label className="field-label" htmlFor="font-family">
                          Font
                        </label>
                        <select
                          id="font-family"
                          className="select"
                          value={useCustom ? "custom" : design.font}
                          onChange={(event) => set("font", event.target.value)}
                        >
                          {FONTS.map((item) => (
                            <option key={item.label} value={item.label}>
                              {item.label}
                            </option>
                          ))}
                          {customFont && <option value="custom">Custom: {customFont.name}</option>}
                        </select>
                      </div>
                      <ColorField
                        id="text-color"
                        label="Text colour"
                        value={design.textColor}
                        onChange={(value) => set("textColor", value)}
                      />
                    </div>

                    <button
                      type="button"
                      className="button"
                      onClick={() => fontInputRef.current?.click()}
                    >
                      Upload a custom font (TTF, OTF, WOFF)
                    </button>

                    <div>
                      <span className="field-label">Weight</span>
                      <Segmented<"400" | "700" | "900">
                        label="Font weight"
                        value={String(design.weight) as "400" | "700" | "900"}
                        onChange={(value) => set("weight", Number(value) as Weight)}
                        options={[
                          { value: "400", label: "Regular" },
                          { value: "700", label: "Bold" },
                          { value: "900", label: "Black" },
                        ]}
                      />
                    </div>

                    <RangeField
                      id="font-size"
                      label="Text size"
                      value={design.fontSize}
                      min={20}
                      max={100}
                      suffix="%"
                      onChange={(value) => set("fontSize", value)}
                    />

                    <Toggle
                      label="Italic"
                      checked={design.italic}
                      onChange={(value) => set("italic", value)}
                    />

                    {contrast !== null && (
                      <span className={`badge ${contrastOk ? "good" : "warn"}`}>
                        {contrastOk
                          ? `Contrast ${contrast}:1. Easy to read at small sizes.`
                          : `Contrast ${contrast}:1. Hard to read at 16px, so pick colours that differ more.`}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <span className="field-label">Fit</span>
                      <Segmented<ImageFit>
                        label="Image fit"
                        value={design.imageFit}
                        onChange={(value) => set("imageFit", value)}
                        options={[
                          { value: "cover", label: "Fill and crop" },
                          { value: "contain", label: "Fit inside" },
                        ]}
                      />
                    </div>

                    <RangeField
                      id="image-zoom"
                      label="Zoom"
                      value={design.imageZoom}
                      min={50}
                      max={300}
                      suffix="%"
                      onChange={(value) => set("imageZoom", value)}
                    />

                    <Toggle
                      label="Remove plain background"
                      hint="Clears the solid colour around your logo, starting from the edges."
                      checked={design.removeBg}
                      onChange={(value) => set("removeBg", value)}
                    />
                    {design.removeBg && (
                      <RangeField
                        id="tolerance"
                        label="Removal strength"
                        value={design.tolerance}
                        min={1}
                        max={100}
                        suffix="%"
                        onChange={(value) => set("tolerance", value)}
                      />
                    )}

                    <Toggle
                      label="Trim empty edges"
                      hint="Crops transparent space so the logo fills the icon."
                      checked={design.autoCrop}
                      onChange={(value) => set("autoCrop", value)}
                    />

                    {!source && (
                      <p className="section-help">Choose an image in step 1 to see these settings work.</p>
                    )}
                  </>
                )}

                <div className="grid-2">
                  <RangeField
                    id="offset-x"
                    label="Move left or right"
                    value={design.offsetX}
                    min={-40}
                    max={40}
                    suffix="%"
                    onChange={(value) => set("offsetX", value)}
                  />
                  <RangeField
                    id="offset-y"
                    label="Move up or down"
                    value={design.offsetY}
                    min={-40}
                    max={40}
                    suffix="%"
                    onChange={(value) => set("offsetY", value)}
                  />
                </div>
                <RangeField
                  id="rotation"
                  label="Rotate"
                  value={design.rotation}
                  min={-180}
                  max={180}
                  suffix="°"
                  onChange={(value) => set("rotation", value)}
                />
                <button
                  type="button"
                  className="link-button"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => setDesign((p) => ({ ...p, offsetX: 0, offsetY: 0, rotation: 0 }))}
                >
                  Reset position
                </button>
              </div>
            </section>

            {/* 5. Site details */}
            <section className="section">
              <SectionHead
                step={5}
                title="Website details"
                help="Used in the web manifest, the integration code and the previews."
              />
              <div className="stack">
                <div className="grid-2">
                  <div>
                    <label className="field-label" htmlFor="site-name">
                      Website name
                    </label>
                    <input
                      id="site-name"
                      className="input"
                      maxLength={60}
                      value={site.siteName}
                      onChange={(event) => setSite((s) => ({ ...s, siteName: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="short-name">
                      Short name
                    </label>
                    <input
                      id="short-name"
                      className="input"
                      maxLength={20}
                      value={site.shortName}
                      onChange={(event) => setSite((s) => ({ ...s, shortName: event.target.value }))}
                    />
                  </div>
                </div>

                <Toggle
                  label="Use the background colour as theme colour"
                  hint="The theme colour tints the browser toolbar on mobile."
                  checked={site.themeLinked}
                  onChange={(value) => setSite((s) => ({ ...s, themeLinked: value }))}
                />
                {!site.themeLinked && (
                  <ColorField
                    id="theme-color"
                    label="Theme colour"
                    value={site.themeColor}
                    onChange={(value) => setSite((s) => ({ ...s, themeColor: value }))}
                  />
                )}
              </div>

              <div className="button-row">
                <button type="button" className="button" onClick={savePreset}>
                  Save settings
                </button>
                <button type="button" className="button" onClick={loadPreset}>
                  Load saved settings
                </button>
              </div>
            </section>
          </main>

          {/* ============================ RIGHT COLUMN =========================== */}
          <aside className="studio-sidebar">
            {/* Preview */}
            <section className="section">
              <SectionHead step="★" title="Live preview" />
              <Segmented<PreviewBg>
                label="Preview background"
                value={previewBg}
                onChange={setPreviewBg}
                options={[
                  { value: "checker", label: "Transparent" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
              />
              <div className={`preview-stage ${previewBg}`}>
                <IconCanvas
                  render={previewRender}
                  size={512}
                  display={200}
                  label="Favicon preview"
                  className="preview-canvas"
                />
              </div>
            </section>

            {/* Export */}
            <section className="section">
              <SectionHead
                step={6}
                title="Export"
                help="Download single files, or the complete package a website needs."
              />

              <div className="stack">
                <button
                  type="button"
                  className="button dark"
                  disabled={busy}
                  onClick={() => void downloadPackage()}
                >
                  {busy ? "Building package…" : "Download complete ZIP package"}
                </button>
                <p className="section-help" style={{ marginTop: -8 }}>
                  favicon.ico, favicon.svg, PNG sizes, Apple touch icon, Android icons, a
                  maskable icon, site.webmanifest and ready-to-paste code.
                </p>

                <div>
                  <label className="field-label" htmlFor="file-name">
                    File name
                  </label>
                  <input
                    id="file-name"
                    className="input"
                    value={fileName}
                    onChange={(event) =>
                      setFileName(event.target.value.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 50))
                    }
                  />
                </div>

                <div>
                  <p className="export-label">PNG</p>
                  <select
                    id="png-size"
                    aria-label="PNG size"
                    className="select"
                    value={pngSize}
                    onChange={(event) => setPngSize(Number(event.target.value))}
                  >
                    {PNG_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size} × {size}px
                      </option>
                    ))}
                  </select>
                  <div className="button-row" style={{ marginTop: 9 }}>
                    <button type="button" className="button primary" onClick={() => void exportPng()}>
                      Download PNG
                    </button>
                    <button type="button" className="button" onClick={() => void copyPng()}>
                      Copy PNG
                    </button>
                  </div>
                </div>

                <div>
                  <p className="export-label">ICO sizes (px)</p>
                  <SizeChips
                    label="ICO sizes"
                    sizes={ICO_SIZES}
                    selected={icoSizes}
                    onToggle={(size) => toggleSize(setIcoSizes, size)}
                  />
                  <p className="section-help">
                    One file holding every size you select. 16, 32 and 48 cover most browsers.
                  </p>
                </div>

                {design.mode === "text" && (
                  <div>
                    <p className="export-label">SVG type</p>
                    <Segmented<SvgMode>
                      label="SVG type"
                      value={svgMode}
                      onChange={setSvgMode}
                      options={[
                        { value: "live", label: "Scalable text" },
                        { value: "image", label: "Exact picture" },
                      ]}
                    />
                    <p className="section-help">
                      {svgMode === "live"
                        ? "Small and editable. Letters use the chosen font, which may differ slightly on other devices."
                        : "Looks identical everywhere, but stores a picture, so the file is larger."}
                    </p>
                  </div>
                )}

                <div className="button-row" style={{ marginTop: 0 }}>
                  <button type="button" className="button" onClick={exportSvg}>
                    Download SVG
                  </button>
                  <button type="button" className="button" onClick={() => void exportIco()}>
                    Download ICO
                  </button>
                </div>

                <div>
                  <p className="export-label">Extra PNG sizes in the package (px)</p>
                  <SizeChips
                    label="Package PNG sizes"
                    sizes={PACKAGE_SIZES}
                    selected={packageSizes}
                    onToggle={(size) => toggleSize(setPackageSizes, size)}
                  />
                </div>
              </div>
            </section>
          </aside>
        </div>

        {/* ============================ FULL WIDTH ============================ */}
        <div className="real-grid">
          <section className="section">
            <SectionHead
              step={7}
              title="How it will look"
              help="Each preview uses the same renderer as your exported files."
            />

            <div className="tabs-demo">
              <div className="browser-tab light">
                <IconCanvas render={previewRender} size={32} display={16} label="Light browser tab icon" />
                <span>{siteName}</span>
                <span style={{ flex: "none", opacity: 0.5 }}>×</span>
              </div>
              <div className="browser-tab dark">
                <IconCanvas render={previewRender} size={32} display={16} label="Dark browser tab icon" />
                <span>{siteName}</span>
                <span style={{ flex: "none", opacity: 0.5 }}>×</span>
              </div>
            </div>

            <div className="device-row">
              <div className="device">
                <div className="ios-mask">
                  <IconCanvas render={previewRender} size={180} variant="apple" display={60} label="iPhone home screen icon" />
                </div>
                <strong>iPhone</strong>
                <small>{site.shortName || "Website"}</small>
              </div>
              <div className="device">
                <div className="round-mask">
                  <IconCanvas render={previewRender} size={192} variant="maskable" display={60} label="Android circle icon" />
                </div>
                <strong>Android</strong>
                <small>Circle crop</small>
              </div>
              <div className="device">
                <div className="ios-mask" style={{ borderRadius: "30%" }}>
                  <IconCanvas render={previewRender} size={192} variant="maskable" display={60} label="Android rounded icon" />
                </div>
                <strong>Android</strong>
                <small>Rounded crop</small>
              </div>
            </div>

            <div className="search-row">
              <span className="search-icon">
                <IconCanvas render={previewRender} size={32} display={18} label="Search result icon" />
              </span>
              <div style={{ minWidth: 0 }}>
                <strong>{siteName}</strong>
                <small>https://www.mywebsite.com</small>
                <div className="search-title">Welcome to {siteName}</div>
              </div>
            </div>

            <div className="ladder">
              {[16, 32, 48, 64].map((size) => (
                <div key={size}>
                  <IconCanvas render={previewRender} size={size} display={size} label={`${size} pixel icon`} />
                  <span>{size}px</span>
                </div>
              ))}
              <div>
                <IconCanvas render={previewRender} size={16} display={64} label="16 pixel icon enlarged" />
                <span>16px at 4×</span>
              </div>
            </div>
          </section>

          <section className="section">
            <SectionHead
              step={8}
              title="Add it to your website"
              help="Upload the files to your site root, then use this code."
            />

            <div className="code-tabs" role="tablist" aria-label="Integration code">
              {(
                [
                  ["html", "HTML"],
                  ["next", "Next.js"],
                  ["manifest", "Manifest"],
                ] as [CodeTab, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={codeTab === id}
                  className={`tab-button ${codeTab === id ? "active" : ""}`}
                  onClick={() => setCodeTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <pre>{activeCode}</pre>

            <div className="button-row">
              <button type="button" className="button primary" onClick={() => void copyCode()}>
                Copy code
              </button>
              <button type="button" className="button" onClick={() => void copyDataUri()}>
                Copy inline icon tag
              </button>
            </div>
          </section>
        </div>

        <div className="notice" style={{ marginTop: 20 }}>
          <strong>Privacy and processing:</strong> Your images and fonts are processed inside
          your browser and are never uploaded to a server.
        </div>

        <div role="status" aria-live="polite" className={`toast ${notice ? "show" : ""}`}>
          {notice}
        </div>
      </div>
    </ToolShell>
  );
}