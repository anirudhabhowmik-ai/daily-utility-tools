"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { createPortal } from "react-dom";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type Template =
  | "ruled"
  | "college"
  | "wide"
  | "blank"
  | "dot"
  | "grid"
  | "cornell"
  | "daily"
  | "weekly"
  | "todo"
  | "meeting";

type PaperSize = "A4" | "A5" | "Letter" | "Legal";
type Orientation = "portrait" | "landscape";

type Settings = {
  title: string;
  subtitle: string;
  template: Template;
  paperSize: PaperSize;
  orientation: Orientation;
  pages: number;
  lineSpacing: number;
  gridSize: number;
  margin: number;
  lineColor: string;
  accentColor: string;
  showMargin: boolean;
  showHeader: boolean;
  showFooter: boolean;
  showPageNumbers: boolean;
  includeCover: boolean;
};

/** Drawing primitives. All coordinates are in millimetres, origin top-left. */
type Prim =
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; w: number; c: string }
  | {
      t: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      sw?: number;
      stroke?: string;
      fill?: string;
      r?: number;
    }
  | { t: "dots"; x: number; y: number; cols: number; rows: number; step: number; r: number; c: string }
  | {
      t: "text";
      x: number;
      y: number;
      s: string;
      size: number;
      c: string;
      bold?: boolean;
      anchor?: "start" | "middle" | "end";
    };

type Rect = { x: number; y: number; w: number; h: number };

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "toolsab-printable-notebook-v2";
const BRAND = "#ff5a1f";
const MM_PER_PT = 25.4 / 72;

const INK = "#172033";
const MUTED = "#64748b";
const SOFT = "#cbd5e1";
const BORDER = "#94a3b8";

const DEFAULT_SETTINGS: Settings = {
  title: "My Notebook",
  subtitle: "Notes, ideas and plans",
  template: "ruled",
  paperSize: "A4",
  orientation: "portrait",
  pages: 10,
  lineSpacing: 8,
  gridSize: 6,
  margin: 15,
  lineColor: "#cbd5e1",
  accentColor: BRAND,
  showMargin: true,
  showHeader: true,
  showFooter: true,
  showPageNumbers: true,
  includeCover: false,
};

const PAPER_SIZES: Record<PaperSize, { width: number; height: number; label: string }> = {
  A4: { width: 210, height: 297, label: "A4" },
  A5: { width: 148, height: 210, label: "A5" },
  Letter: { width: 215.9, height: 279.4, label: "Letter" },
  Legal: { width: 215.9, height: 355.6, label: "Legal" },
};

const TEMPLATES: { value: Template; label: string; description: string }[] = [
  { value: "ruled", label: "Ruled", description: "Standard lined paper for everyday writing." },
  { value: "college", label: "College ruled", description: "Narrower lines for more writing space." },
  { value: "wide", label: "Wide ruled", description: "Wider line spacing for comfortable handwriting." },
  { value: "blank", label: "Blank", description: "Plain pages for sketching and free-form notes." },
  { value: "dot", label: "Dot grid", description: "Subtle dots for bullet journals and diagrams." },
  { value: "grid", label: "Square grid", description: "Square grid paper for calculations and layouts." },
  { value: "cornell", label: "Cornell notes", description: "Cue column, notes area and summary section." },
  { value: "daily", label: "Daily planner", description: "Priorities, schedule, notes and reflection." },
  { value: "weekly", label: "Weekly planner", description: "A weekly overview from Monday to Sunday." },
  { value: "todo", label: "To-do list", description: "A checklist page with additional notes." },
  { value: "meeting", label: "Meeting notes", description: "Agenda, discussion notes and action items." },
];

const PATTERNED: Template[] = ["ruled", "college", "wide", "blank", "dot", "grid"];
const templateValues = TEMPLATES.map((item) => item.value);

const LINE_COLORS = ["#cbd5e1", "#94a3b8", "#93c5fd", "#86efac", "#fcd34d", "#fda4af", "#c4b5fd", "#334155"];
const ACCENT_COLORS = ["#ff5a1f", "#2563eb", "#0891b2", "#059669", "#ca8a04", "#9333ea", "#db2777", "#334155"];

/* -------------------------------------------------------------------------- */
/*  Text helpers (Helvetica metrics, WinAnsi encoding)                         */
/* -------------------------------------------------------------------------- */

const rep = (value: number, count: number) => Array.from({ length: count }, () => value);

// Character widths for code points 32..126 (units per 1000 em).
const HELV: number[] = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  ...rep(556, 10),
  278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500,
  334, 260, 334, 584,
];

const HELV_BOLD: number[] = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  ...rep(556, 10),
  333, 333, 584, 584, 584, 611, 975,
  722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  333, 278, 333, 584, 556, 333,
  556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500,
  389, 280, 389, 584,
];

// Windows-1252 characters outside Latin-1, mapped to their byte codes.
const WIN_MAP: Record<number, number> = {
  0x20ac: 128, 0x201a: 130, 0x0192: 131, 0x201e: 132, 0x2026: 133, 0x2020: 134, 0x2021: 135,
  0x02c6: 136, 0x2030: 137, 0x0160: 138, 0x2039: 139, 0x0152: 140, 0x017d: 142, 0x2018: 145,
  0x2019: 146, 0x201c: 147, 0x201d: 148, 0x2022: 149, 0x2013: 150, 0x2014: 151, 0x02dc: 152,
  0x2122: 153, 0x0161: 154, 0x203a: 155, 0x0153: 156, 0x017e: 158, 0x0178: 159,
};

function winCode(ch: string): number {
  const cp = ch.codePointAt(0) ?? 63;
  if ((cp >= 32 && cp <= 126) || (cp >= 160 && cp <= 255)) return cp;
  return WIN_MAP[cp] ?? 63;
}

/** Replaces characters the built-in PDF font cannot draw, so preview and PDF match. */
function clean(value: string): string {
  return Array.from(value.replace(/\s+/g, " "))
    .map((ch) => (winCode(ch) === 63 && ch !== "?" ? "?" : ch))
    .join("");
}

function textWidth(value: string, size: number, bold = false): number {
  const table = bold ? HELV_BOLD : HELV;
  let total = 0;
  for (const ch of Array.from(value)) {
    const code = winCode(ch);
    total += code >= 32 && code <= 126 ? table[code - 32] : 556;
  }
  return (total / 1000) * size * MM_PER_PT;
}

function fit(value: string, maxWidth: number, size: number, bold = false): string {
  if (!value || textWidth(value, size, bold) <= maxWidth) return value;
  let chars = Array.from(value);
  while (chars.length > 1 && textWidth(chars.join("") + "...", size, bold) > maxWidth) chars = chars.slice(0, -1);
  return chars.join("").trimEnd() + "...";
}

function wrapLines(value: string, maxWidth: number, size: number, bold = false): string[] {
  const lines: string[] = [];
  let current = "";

  for (let word of value.split(" ").filter(Boolean)) {
    while (textWidth(word, size, bold) > maxWidth && word.length > 1) {
      let cut = word.length - 1;
      while (cut > 1 && textWidth(word.slice(0, cut), size, bold) > maxWidth) cut--;
      if (current) {
        lines.push(current);
        current = "";
      }
      lines.push(word.slice(0, cut));
      word = word.slice(cut);
    }

    const next = current ? `${current} ${word}` : word;
    if (!current || textWidth(next, size, bold) <= maxWidth) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function tint(hex: string, amount: number): string {
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "ff5a1f";
  const mix = (i: number) => {
    const value = parseInt(h.slice(i, i + 2), 16);
    return Math.round(value + (255 - value) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${mix(0)}${mix(2)}${mix(4)}`;
}

/* -------------------------------------------------------------------------- */
/*  Settings                                                                   */
/* -------------------------------------------------------------------------- */

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeSettings(value: unknown): Settings {
  if (!isObject(value)) return DEFAULT_SETTINGS;

  const bool = (key: keyof Settings) =>
    typeof value[key] === "boolean" ? (value[key] as boolean) : (DEFAULT_SETTINGS[key] as boolean);

  const paperSize: PaperSize =
    value.paperSize === "A4" || value.paperSize === "A5" || value.paperSize === "Letter" || value.paperSize === "Legal"
      ? value.paperSize
      : DEFAULT_SETTINGS.paperSize;

  return {
    title: typeof value.title === "string" ? value.title.slice(0, 60) : DEFAULT_SETTINGS.title,
    subtitle: typeof value.subtitle === "string" ? value.subtitle.slice(0, 80) : DEFAULT_SETTINGS.subtitle,
    template: templateValues.includes(value.template as Template)
      ? (value.template as Template)
      : DEFAULT_SETTINGS.template,
    paperSize,
    orientation: value.orientation === "landscape" ? "landscape" : "portrait",
    pages: Math.round(clamp(Number(value.pages) || DEFAULT_SETTINGS.pages, 1, 100)),
    lineSpacing: clamp(Number(value.lineSpacing) || DEFAULT_SETTINGS.lineSpacing, 5, 14),
    gridSize: clamp(Number(value.gridSize) || DEFAULT_SETTINGS.gridSize, 3, 12),
    margin: clamp(Number(value.margin) || DEFAULT_SETTINGS.margin, 5, 35),
    lineColor: isHexColor(value.lineColor) ? value.lineColor : DEFAULT_SETTINGS.lineColor,
    accentColor: isHexColor(value.accentColor) ? value.accentColor : DEFAULT_SETTINGS.accentColor,
    showMargin: bool("showMargin"),
    showHeader: bool("showHeader"),
    showFooter: bool("showFooter"),
    showPageNumbers: bool("showPageNumbers"),
    includeCover: bool("includeCover"),
  };
}

function getDimensions(settings: Settings) {
  const paper = PAPER_SIZES[settings.paperSize];
  return settings.orientation === "portrait"
    ? { width: paper.width, height: paper.height }
    : { width: paper.height, height: paper.width };
}

function getSpacing(settings: Settings) {
  if (settings.template === "college") return 7;
  if (settings.template === "wide") return 11;
  return settings.lineSpacing;
}

/* -------------------------------------------------------------------------- */
/*  Page drawing                                                               */
/* -------------------------------------------------------------------------- */

type Out = Prim[];

const pText = (
  out: Out,
  x: number,
  y: number,
  value: string,
  size: number,
  c = MUTED,
  bold = false,
  anchor: "start" | "middle" | "end" = "start"
) => out.push({ t: "text", x, y, s: clean(value), size, c, bold, anchor });

const pLine = (out: Out, x1: number, y1: number, x2: number, y2: number, w: number, c: string) =>
  out.push({ t: "line", x1, y1, x2, y2, w, c });

const pRect = (
  out: Out,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { stroke?: string; fill?: string; sw?: number; r?: number }
) => out.push({ t: "rect", x, y, w: Math.max(0, w), h: Math.max(0, h), ...opts });

function labelLine(out: Out, x: number, y: number, label: string, w: number, size = 8) {
  const labelWidth = textWidth(label, size);
  pText(out, x, y, label, size, "#475569");
  pLine(out, x + labelWidth + 1.5, y + 0.7, x + w, y + 0.7, 0.2, BORDER);
}

function ruledIn(out: Out, x: number, y: number, w: number, h: number, c: string, spacing = 7) {
  const count = Math.floor(h / spacing);
  for (let i = 1; i <= count; i++) pLine(out, x, y + i * spacing, x + w, y + i * spacing, 0.18, c);
}

function titledBox(out: Out, x: number, y: number, w: number, h: number, title: string) {
  pRect(out, x, y, w, h, { stroke: "#b8c2cf", sw: 0.3, r: 1.2 });
  pText(out, x + 2.5, y + 4.8, title, 8, "#334155", true);
}

function checkRows(out: Out, x: number, y: number, w: number, h: number, c: string) {
  const count = Math.floor(h / 7);
  for (let i = 0; i < count; i++) {
    const yy = y + (i + 1) * 7;
    pRect(out, x, yy - 3.8, 3.2, 3.2, { stroke: "#64748b", sw: 0.25, r: 0.4 });
    pLine(out, x + 5, yy, x + w, yy, 0.18, c);
  }
}

function heading(out: Out, body: Rect, title: string, accent: string): number {
  pText(out, body.x, body.y + 6.5, title, 16, INK, true);
  pLine(out, body.x, body.y + 9.5, body.x + body.w, body.y + 9.5, 0.3, SOFT);
  pLine(out, body.x, body.y + 9.5, body.x + Math.min(16, body.w), body.y + 9.5, 1, accent);
  return body.y + 13;
}

function geometry(s: Settings) {
  const { width: W, height: H } = getDimensions(s);
  const m = s.margin;
  const ux = m;
  const uy = m;
  const uw = W - 2 * m;
  const uh = H - 2 * m;
  const headerH = s.showHeader ? 9 : 0;
  const footerH = s.showFooter ? 9 : 0;
  const body: Rect = { x: ux, y: uy + headerH, w: uw, h: Math.max(20, uh - headerH - footerH) };
  return { W, H, ux, uy, uw, uh, body };
}

function buildCornell(out: Out, s: Settings, body: Rect) {
  let y = heading(out, body, "Cornell Notes", s.accentColor);
  labelLine(out, body.x, y + 3.5, "Topic:", body.w * 0.64);
  labelLine(out, body.x + body.w * 0.7, y + 3.5, "Date:", body.w * 0.3);
  y += 8;

  const bottom = body.y + body.h;
  const summaryH = Math.max(24, body.h * 0.15);
  const mainH = Math.max(30, bottom - summaryH - 3 - y);
  const cueW = body.w * 0.3;

  pRect(out, body.x, y, body.w, mainH, { stroke: BORDER, sw: 0.3, r: 1.2 });
  pLine(out, body.x + cueW, y, body.x + cueW, y + mainH, 0.3, BORDER);
  pLine(out, body.x, y + 7, body.x + body.w, y + 7, 0.3, BORDER);
  pText(out, body.x + 2.5, y + 4.8, "Cues / Questions", 8, "#334155", true);
  pText(out, body.x + cueW + 2.5, y + 4.8, "Notes", 8, "#334155", true);
  ruledIn(out, body.x + cueW + 1, y + 7, body.w - cueW - 2, mainH - 8, s.lineColor);

  titledBox(out, body.x, bottom - summaryH, body.w, summaryH, "Summary");
  ruledIn(out, body.x + 2, bottom - summaryH + 6, body.w - 4, summaryH - 8, s.lineColor);
}

function buildDaily(out: Out, s: Settings, body: Rect) {
  let y = heading(out, body, "Daily Planner", s.accentColor);
  labelLine(out, body.x, y + 3.5, "Date:", body.w * 0.48);
  labelLine(out, body.x + body.w * 0.55, y + 3.5, "Day:", body.w * 0.45);
  y += 9;

  const bottom = body.y + body.h;
  const priorityH = 29;
  titledBox(out, body.x, y, body.w, priorityH, "Top priorities");
  checkRows(out, body.x + 2.5, y + 6, body.w - 5, priorityH - 8, s.lineColor);
  y += priorityH + 3;

  const remaining = bottom - y;
  const reflectionH = clamp(remaining * 0.2, 22, 32);
  const columnsH = Math.max(40, remaining - reflectionH - 3);
  const colW = (body.w - 3) / 2;

  titledBox(out, body.x, y, colW, columnsH, "Schedule");
  const hours = ["7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM"];
  const rows = Math.min(hours.length, Math.floor((columnsH - 8) / 7));
  for (let i = 0; i < rows; i++) {
    const yy = y + 8 + (i + 1) * 7 - 1;
    pText(out, body.x + 2.5, yy - 1.4, hours[i], 7, MUTED);
    pLine(out, body.x + 15, yy, body.x + colW - 2, yy, 0.18, s.lineColor);
  }

  titledBox(out, body.x + colW + 3, y, colW, columnsH, "Notes");
  ruledIn(out, body.x + colW + 5, y + 6, colW - 4, columnsH - 8, s.lineColor);

  const ry = y + columnsH + 3;
  titledBox(out, body.x, ry, body.w, bottom - ry, "End-of-day reflection");
  ruledIn(out, body.x + 2, ry + 6, body.w - 4, bottom - ry - 8, s.lineColor);
}

function buildWeekly(out: Out, s: Settings, body: Rect, landscape: boolean) {
  let y = heading(out, body, "Weekly Planner", s.accentColor);
  labelLine(out, body.x, y + 3.5, "Week of:", body.w * 0.7);
  y += 9;

  const cols = landscape ? 4 : 2;
  const rows = 8 / cols;
  const gap = 2.5;
  const cellW = (body.w - gap * (cols - 1)) / cols;
  const cellH = (body.y + body.h - y - gap * (rows - 1)) / rows;
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Notes"];

  names.forEach((name, index) => {
    const cx = body.x + (index % cols) * (cellW + gap);
    const cy = y + Math.floor(index / cols) * (cellH + gap);
    pRect(out, cx + 0.2, cy + 0.2, cellW - 0.4, 6, { fill: index === 7 ? tint(s.accentColor, 0.88) : "#f1f5f9" });
    pRect(out, cx, cy, cellW, cellH, { stroke: "#b8c2cf", sw: 0.3, r: 1.2 });
    pText(out, cx + 2.5, cy + 4.5, name, 8, "#334155", true);
    ruledIn(out, cx + 1.5, cy + 6, cellW - 3, cellH - 7, s.lineColor);
  });
}

function buildTodo(out: Out, s: Settings, body: Rect) {
  let y = heading(out, body, "To-do List", s.accentColor);
  labelLine(out, body.x, y + 3.5, "Date:", body.w * 0.6);
  y += 9;

  const bottom = body.y + body.h;
  const remaining = bottom - y;
  const notesH = Math.max(28, remaining * 0.24);
  const tasksH = Math.max(30, remaining - notesH - 3);

  titledBox(out, body.x, y, body.w, tasksH, "Tasks");
  checkRows(out, body.x + 2.5, y + 6, body.w - 5, tasksH - 8, s.lineColor);

  const ny = y + tasksH + 3;
  titledBox(out, body.x, ny, body.w, bottom - ny, "Notes");
  ruledIn(out, body.x + 2, ny + 6, body.w - 4, bottom - ny - 8, s.lineColor);
}

function buildMeeting(out: Out, s: Settings, body: Rect) {
  let y = heading(out, body, "Meeting Notes", s.accentColor);
  labelLine(out, body.x, y + 3.5, "Meeting:", body.w);
  y += 8;
  labelLine(out, body.x, y + 3.5, "Date:", body.w * 0.45);
  labelLine(out, body.x + body.w * 0.52, y + 3.5, "Facilitator:", body.w * 0.48);
  y += 8;
  labelLine(out, body.x, y + 3.5, "Attendees:", body.w);
  y += 9;

  const bottom = body.y + body.h;
  const remaining = bottom - y;
  const agendaH = Math.max(24, remaining * 0.2);
  const actionsH = Math.max(32, remaining * 0.26);
  const discussionH = Math.max(30, remaining - agendaH - actionsH - 6);

  titledBox(out, body.x, y, body.w, agendaH, "Agenda");
  ruledIn(out, body.x + 2, y + 6, body.w - 4, agendaH - 8, s.lineColor);
  y += agendaH + 3;

  titledBox(out, body.x, y, body.w, discussionH, "Discussion notes");
  ruledIn(out, body.x + 2, y + 6, body.w - 4, discussionH - 8, s.lineColor);
  y += discussionH + 3;

  titledBox(out, body.x, y, body.w, bottom - y, "Action items");
  checkRows(out, body.x + 2.5, y + 6, body.w - 5, bottom - y - 8, s.lineColor);
}

/** Everything that is identical on every content page. */
function buildContentShared(s: Settings, boost = false): Prim[] {
  const out: Out = [];
  const g = geometry(s);
  const { body } = g;
  const accent = s.accentColor;

  if (s.showHeader) {
    const showDate = g.uw >= 90;
    const right = showDate ? 46 : 0;
    const lineY = g.uy + 7;
    pText(out, g.ux, g.uy + 4.6, fit(clean(s.title || "My Notebook"), g.uw - right - 4, 8, true), 8, "#475569", true);

    if (showDate) {
      pText(out, g.ux + g.uw - right, g.uy + 4.6, "Date", 7.5, MUTED);
      pLine(out, g.ux + g.uw - right + textWidth("Date", 7.5) + 1.5, g.uy + 4.8, g.ux + g.uw, g.uy + 4.8, 0.2, BORDER);
    }

    pLine(out, g.ux, lineY, g.ux + g.uw, lineY, 0.25, SOFT);
    pLine(out, g.ux, lineY, g.ux + 14, lineY, 0.8, accent);
  }

  if (s.showFooter) {
    pLine(out, g.ux, g.uy + g.uh - 6.2, g.ux + g.uw, g.uy + g.uh - 6.2, 0.2, SOFT);
    const subtitle = fit(clean(s.subtitle), g.uw * 0.7, 7.5);
    if (subtitle) pText(out, g.ux, g.uy + g.uh - 1.6, subtitle, 7.5, "#94a3b8");
  }

  const t = s.template;

  if (t === "ruled" || t === "college" || t === "wide") {
    const spacing = getSpacing(s);
    const count = Math.floor(body.h / spacing);
    for (let i = 1; i <= count; i++) pLine(out, body.x, body.y + i * spacing, body.x + body.w, body.y + i * spacing, 0.2, s.lineColor);
    if (s.showMargin) {
      const mx = body.x + body.w * 0.09;
      pLine(out, mx, body.y, mx, body.y + count * spacing, 0.25, "#e9a0a0");
    }
  } else if (t === "grid" || t === "dot") {
    const step = s.gridSize;
    const cols = Math.floor(body.w / step);
    const rows = Math.floor(body.h / step);
    const x0 = body.x + (body.w - cols * step) / 2;
    const y0 = body.y + (body.h - rows * step) / 2;

    if (t === "grid") {
      for (let i = 0; i <= cols; i++) pLine(out, x0 + i * step, y0, x0 + i * step, y0 + rows * step, 0.18, s.lineColor);
      for (let j = 0; j <= rows; j++) pLine(out, x0, y0 + j * step, x0 + cols * step, y0 + j * step, 0.18, s.lineColor);
    } else {
      out.push({ t: "dots", x: x0, y: y0, cols: cols + 1, rows: rows + 1, step, r: boost ? 0.9 : 0.28, c: s.lineColor });
    }

    if (s.showMargin) {
      const mx = x0 + Math.max(1, Math.round(cols * 0.09)) * step;
      pLine(out, mx, y0, mx, y0 + rows * step, 0.25, "#e9a0a0");
    }
  } else if (t === "blank") {
    if (s.showMargin) {
      const mx = body.x + body.w * 0.09;
      pLine(out, mx, body.y, mx, body.y + body.h, 0.25, "#e9a0a0");
    }
  } else if (t === "cornell") buildCornell(out, s, body);
  else if (t === "daily") buildDaily(out, s, body);
  else if (t === "weekly") buildWeekly(out, s, body, g.W > g.H);
  else if (t === "todo") buildTodo(out, s, body);
  else if (t === "meeting") buildMeeting(out, s, body);

  return out;
}

/** The only per-page element: the page number. */
function buildContentUnique(s: Settings, pageNumber: number): Prim[] {
  if (!s.showFooter || !s.showPageNumbers) return [];
  const g = geometry(s);
  return [
    { t: "text", x: g.ux + g.uw, y: g.uy + g.uh - 1.6, s: `Page ${pageNumber}`, size: 8, c: "#94a3b8", anchor: "end" },
  ];
}

function buildCover(s: Settings): Prim[] {
  const { W, H } = geometry(s);
  const out: Out = [];
  const accent = s.accentColor;
  const inset = Math.min(14, W * 0.08);
  const cx = W / 2;
  const maxW = W - 2 * inset - 26;

  pRect(out, inset, inset, W - 2 * inset, H - 2 * inset, { stroke: accent, sw: 0.8, r: 2 });
  pRect(out, inset + 3, inset + 3, W - 2 * inset - 6, H - 2 * inset - 6, { stroke: tint(accent, 0.7), sw: 0.25, r: 1.2 });

  const title = clean(s.title.trim() || "My Notebook");
  let size = 34;
  let lines = wrapLines(title, maxW, size, true);
  for (const candidate of [34, 30, 26, 22, 18]) {
    size = candidate;
    lines = wrapLines(title, maxW, size, true);
    if (lines.length <= 3) break;
  }
  if (lines.length > 3) {
    lines = lines.slice(0, 3);
    lines[2] = fit(lines[2] + "...", maxW, size, true);
  }

  pLine(out, cx - 10, H * 0.25, cx + 10, H * 0.25, 1.4, accent);

  const lineHeight = size * MM_PER_PT * 1.25;
  let y = H * 0.25 + 14;
  lines.forEach((line) => {
    pText(out, cx, y, line, size, INK, true, "middle");
    y += lineHeight;
  });

  const subtitle = clean(s.subtitle.trim());
  if (subtitle) {
    y += 2;
    wrapLines(subtitle, maxW, 12).slice(0, 2).forEach((line) => {
      pText(out, cx, y, line, 12, MUTED, false, "middle");
      y += 6.5;
    });
  }

  const fieldX = W * 0.2;
  const fieldW = W * 0.6;
  const fieldTop = Math.max(y + 18, H * 0.64);
  ["Name:", "Subject:", "Year:"].forEach((label, index) => {
    labelLine(out, fieldX, fieldTop + index * 12, label, fieldW, 10);
  });

  pLine(out, cx - 10, H - inset - 14, cx + 10, H - inset - 14, 1.4, accent);
  return out;
}

/* -------------------------------------------------------------------------- */
/*  PDF writer (vector, no dependencies)                                       */
/* -------------------------------------------------------------------------- */

const fmt = (value: number) => String(+value.toFixed(3));

function pdfColor(hex: string) {
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "000000";
  return [0, 2, 4].map((i) => fmt(parseInt(h.slice(i, i + 2), 16) / 255)).join(" ");
}

function pdfString(value: string) {
  let result = "";
  for (const ch of Array.from(value)) {
    const code = winCode(ch);
    if (code === 40 || code === 41 || code === 92) result += "\\" + String.fromCharCode(code);
    else if (code < 32 || code > 126) result += "\\" + code.toString(8).padStart(3, "0");
    else result += String.fromCharCode(code);
  }
  return `(${result})`;
}

function primsToPdf(prims: Prim[], pageHeight: number): string {
  const k = 72 / 25.4;
  const X = (v: number) => fmt(v * k);
  const Y = (v: number) => fmt((pageHeight - v) * k);
  const P = (x: number, y: number) => `${X(x)} ${Y(y)}`;
  const ops: string[] = [];

  for (const p of prims) {
    if (p.t === "line") {
      ops.push(`${fmt(p.w * k)} w ${pdfColor(p.c)} RG ${P(p.x1, p.y1)} m ${P(p.x2, p.y2)} l S`);
    }

    if (p.t === "rect") {
      const parts: string[] = [];
      if (p.fill) parts.push(`${pdfColor(p.fill)} rg`);
      if (p.stroke) parts.push(`${pdfColor(p.stroke)} RG ${fmt((p.sw ?? 0.25) * k)} w`);
      if (!p.fill && !p.stroke) continue;

      let path: string;
      if (p.r && p.r > 0) {
        const r = Math.min(p.r, p.w / 2, p.h / 2);
        const c = r * 0.5523;
        const { x, y, w, h } = p;
        path = [
          `${P(x + r, y)} m`,
          `${P(x + w - r, y)} l`,
          `${P(x + w - r + c, y)} ${P(x + w, y + r - c)} ${P(x + w, y + r)} c`,
          `${P(x + w, y + h - r)} l`,
          `${P(x + w, y + h - r + c)} ${P(x + w - r + c, y + h)} ${P(x + w - r, y + h)} c`,
          `${P(x + r, y + h)} l`,
          `${P(x + r - c, y + h)} ${P(x, y + h - r + c)} ${P(x, y + h - r)} c`,
          `${P(x, y + r)} l`,
          `${P(x, y + r - c)} ${P(x + r - c, y)} ${P(x + r, y)} c h`,
        ].join(" ");
      } else {
        path = `${X(p.x)} ${Y(p.y + p.h)} ${fmt(p.w * k)} ${fmt(p.h * k)} re`;
      }

      ops.push(`${parts.join(" ")} ${path} ${p.fill && p.stroke ? "B" : p.fill ? "f" : "S"}`);
    }

    if (p.t === "dots") {
      const c = p.r * 0.5523;
      const paths: string[] = [];
      for (let j = 0; j < p.rows; j++) {
        for (let i = 0; i < p.cols; i++) {
          const cx = p.x + i * p.step;
          const cy = p.y + j * p.step;
          paths.push(
            `${P(cx + p.r, cy)} m ${P(cx + p.r, cy + c)} ${P(cx + c, cy + p.r)} ${P(cx, cy + p.r)} c ` +
              `${P(cx - c, cy + p.r)} ${P(cx - p.r, cy + c)} ${P(cx - p.r, cy)} c ` +
              `${P(cx - p.r, cy - c)} ${P(cx - c, cy - p.r)} ${P(cx, cy - p.r)} c ` +
              `${P(cx + c, cy - p.r)} ${P(cx + p.r, cy - c)} ${P(cx + p.r, cy)} c h`
          );
        }
      }
      ops.push(`${pdfColor(p.c)} rg ${paths.join(" ")} f`);
    }

    if (p.t === "text") {
      const width = textWidth(p.s, p.size, p.bold);
      const x = p.anchor === "middle" ? p.x - width / 2 : p.anchor === "end" ? p.x - width : p.x;
      ops.push(
        `BT /${p.bold ? "F2" : "F1"} ${fmt(p.size)} Tf ${pdfColor(p.c)} rg ${P(x, p.y)} Td ${pdfString(p.s)} Tj ET`
      );
    }
  }

  return ops.join("\n");
}

function buildPdfBlob(s: Settings): Blob {
  const { width: W, height: H } = getDimensions(s);
  const k = 72 / 25.4;
  const pw = fmt(W * k);
  const ph = fmt(H * k);
  const pageCount = s.pages + (s.includeCover ? 1 : 0);

  const sharedStream = primsToPdf(buildContentShared(s), H);
  const coverStream = s.includeCover ? primsToPdf(buildCover(s), H) : "";

  const stream = (dict: string, data: string) =>
    `<< ${dict} /Length ${data.length} >>\nstream\n${data}\nendstream`;

  const objects: string[] = [];
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, i) => `${7 + 2 * i} 0 R`).join(" ")}] /Count ${pageCount} >>`;
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  objects[4] = stream(
    `/Type /XObject /Subtype /Form /BBox [0 0 ${pw} ${ph}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >>`,
    sharedStream || "q Q"
  );
  objects[5] = `<< /Title ${pdfString(clean(s.title || "Notebook"))} /Producer (ToolsAB Printable Notebook Maker) >>`;

  for (let i = 0; i < pageCount; i++) {
    const isCover = s.includeCover && i === 0;
    const pageNumber = s.includeCover ? i : i + 1;
    const content = isCover
      ? coverStream || "q Q"
      : `q /Fm1 Do Q\n${primsToPdf(buildContentUnique(s, pageNumber), H)}`;

    objects[6 + 2 * i] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Fm1 5 0 R >> >> /Contents ${8 + 2 * i} 0 R >>`;
    objects[7 + 2 * i] = stream("", content);
  }

  let pdf = "%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n";
  const offsets: number[] = [];

  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: "application/pdf" });
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* -------------------------------------------------------------------------- */
/*  SVG page renderer                                                          */
/* -------------------------------------------------------------------------- */

function PageSvg({
  shared,
  unique,
  w,
  h,
  idPrefix,
  className,
  style,
}: {
  shared: Prim[];
  unique: Prim[];
  w: number;
  h: number;
  idPrefix: string;
  className?: string;
  style?: CSSProperties;
}) {
  const prims = [...shared, ...unique];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      style={style}
      role="img"
      aria-label="Notebook page"
    >
      <rect width={w} height={h} fill="#ffffff" />
      {prims.map((p, i) => {
        if (p.t === "line") {
          return <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.c} strokeWidth={p.w} />;
        }

        if (p.t === "rect") {
          return (
            <rect
              key={i}
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              rx={p.r}
              fill={p.fill ?? "none"}
              stroke={p.stroke}
              strokeWidth={p.stroke ? p.sw ?? 0.25 : undefined}
            />
          );
        }

        if (p.t === "dots") {
          const id = `${idPrefix}-d${i}`;
          return (
            <g key={i}>
              <defs>
                <pattern
                  id={id}
                  x={p.x - p.step / 2}
                  y={p.y - p.step / 2}
                  width={p.step}
                  height={p.step}
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx={p.step / 2} cy={p.step / 2} r={p.r} fill={p.c} />
                </pattern>
              </defs>
              <rect
                x={p.x - p.step / 2}
                y={p.y - p.step / 2}
                width={p.cols * p.step}
                height={p.rows * p.step}
                fill={`url(#${id})`}
              />
            </g>
          );
        }

        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            fontSize={p.size * MM_PER_PT}
            fontWeight={p.bold ? 700 : 400}
            fill={p.c}
            textAnchor={p.anchor ?? "start"}
            fontFamily="Helvetica, Arial, sans-serif"
          >
            {p.s}
          </text>
        );
      })}
    </svg>
  );
}

function TemplateThumb({ template, accent }: { template: Template; accent: string }) {
  const id = useId().replace(/:/g, "");

  const shared = useMemo(
    () =>
      buildContentShared(
        {
          ...DEFAULT_SETTINGS,
          template,
          accentColor: accent,
          lineColor: "#94a3b8",
          margin: 10,
          lineSpacing: 9,
          gridSize: 9,
          showHeader: false,
          showFooter: false,
          showPageNumbers: false,
          showMargin: false,
        },
        true
      ),
    [template, accent]
  );

  return <PageSvg shared={shared} unique={[]} w={210} h={297} idPrefix={`th${id}`} className="nb-thumb" />;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

type Notice = { text: string; kind: "ok" | "error" } | null;

export default function PrintableNotebookGenerator() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [previewPage, setPreviewPage] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [pagesText, setPagesText] = useState(String(DEFAULT_SETTINGS.pages));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewId = useId().replace(/:/g, "");

  /* ------------------------------ persistence ---------------------------- */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSettings(normalizeSettings(JSON.parse(saved)));
    } catch {
      // Invalid or unavailable saved data is ignored.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, [settings, loaded]);

  useEffect(() => {
    setPagesText(String(settings.pages));
  }, [settings.pages]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  /* ------------------------------ derived -------------------------------- */

  const totalPages = settings.pages + (settings.includeCover ? 1 : 0);
  const page = Math.min(previewPage, totalPages);
  const previewIsCover = settings.includeCover && page === 1;
  const contentPageNumber = settings.includeCover ? page - 1 : page;
  const dims = getDimensions(settings);
  const selectedTemplate = TEMPLATES.find((item) => item.value === settings.template);
  const isRuled = settings.template === "ruled";
  const isGridType = settings.template === "dot" || settings.template === "grid";
  const isPatterned = PATTERNED.includes(settings.template);

  const shared = useMemo(() => buildContentShared(settings), [settings]);
  const cover = useMemo(() => (settings.includeCover ? buildCover(settings) : []), [settings]);
  const unique = useMemo(
    () => (previewIsCover ? [] : buildContentUnique(settings, contentPageNumber)),
    [settings, previewIsCover, contentPageNumber]
  );

  const hasUnsupportedText = clean(settings.title) !== settings.title || clean(settings.subtitle) !== settings.subtitle;

  /* ------------------------------ actions -------------------------------- */

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setNotice(null);
  };

  const setPages = (value: number) => update("pages", Math.round(clamp(value, 1, 100)));

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setPreviewPage(1);
    setNotice({ text: "Settings have been reset.", kind: "ok" });
  };

  const exportSettings = () => {
    downloadBlob(
      "printable-notebook-settings.json",
      new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" })
    );
    setNotice({ text: "Settings exported.", kind: "ok" });
  };

  const importSettings = async (file?: File) => {
    if (!file) return;

    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isObject(parsed)) throw new Error("Invalid file");
      setSettings(normalizeSettings(parsed));
      setPreviewPage(1);
      setNotice({ text: "Settings imported.", kind: "ok" });
    } catch {
      setNotice({ text: "Unable to import this file. Choose a notebook settings JSON file.", kind: "error" });
    }
  };

  const savePdf = () => {
    if (busy) return;
    setBusy(true);
    setNotice(null);

    // Let the button state paint before the synchronous PDF build starts.
    setTimeout(() => {
      try {
        const safeTitle =
          (settings.title || "my-notebook")
            .trim()
            .replace(/[^\w-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .toLowerCase() || "my-notebook";

        downloadBlob(`${safeTitle}.pdf`, buildPdfBlob(settings));
        setNotice({ text: `Your ${totalPages}-page PDF has been downloaded.`, kind: "ok" });
      } catch (error) {
        console.error("Notebook PDF export failed:", error);
        setNotice({ text: "PDF generation failed. Please try again.", kind: "error" });
      } finally {
        setBusy(false);
      }
    }, 40);
  };

  const printNotebook = () => {
    setNotice(null);
    setPrinting(true);
  };

  useEffect(() => {
    if (!printing) return;

    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => window.print()));

    return () => {
      window.removeEventListener("afterprint", done);
      cancelAnimationFrame(frame);
    };
  }, [printing]);

  const onStageKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") setPreviewPage(Math.max(1, page - 1));
    if (event.key === "ArrowRight") setPreviewPage(Math.min(totalPages, page + 1));
  };

  const fmtMm = (value: number) => String(Math.round(value * 10) / 10);

  /* ------------------------------ render --------------------------------- */

  return (
    <div className="nb-root">
      <style jsx global>{`
        .nb-root,
        .nb-root *,
        .nb-root *::before,
        .nb-root *::after {
          box-sizing: border-box;
        }

        .nb-root {
          --nb-accent: #ff5a1f;
          --nb-accent-dark: #e9470d;
          --nb-ink: #172033;
          --nb-muted: #64748b;
          --nb-border: #e8e8ec;
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          color: var(--nb-ink);
          font-size: 14px;
          line-height: 1.5;
        }

        .nb-root button,
        .nb-root input,
        .nb-root select {
          font-family: inherit;
          margin: 0;
        }

        .nb-root h2,
        .nb-root h3,
        .nb-root h4,
        .nb-root p {
          margin: 0;
        }

        .nb-root button {
          cursor: pointer;
          transition: background 150ms ease, border-color 150ms ease, color 150ms ease,
            box-shadow 150ms ease, transform 150ms ease;
        }

        .nb-root button:active:not(:disabled) {
          transform: scale(0.98);
        }

        .nb-root button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .nb-root button:focus-visible,
        .nb-root input:focus-visible,
        .nb-root select:focus-visible,
        .nb-root [tabindex]:focus-visible {
          outline: 2px solid var(--nb-accent);
          outline-offset: 2px;
        }

        /* Hero */
        .nb-root .nb-hero {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 30px 34px;
          border: 1px solid #ffe1d3;
          border-radius: 24px;
          background: linear-gradient(135deg, #fff3ec 0%, #ffffff 55%, #fff0f3 100%);
        }

        .nb-root .nb-hero::after {
          content: "";
          position: absolute;
          right: -70px;
          top: -90px;
          width: 260px;
          height: 260px;
          border-radius: 50%;
          background: rgba(255, 90, 31, 0.12);
          filter: blur(44px);
          pointer-events: none;
        }

        .nb-root .nb-hero > * {
          position: relative;
          z-index: 1;
        }

        .nb-root .nb-hero h2 {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }

        .nb-root .nb-hero p {
          margin-top: 8px;
          max-width: 540px;
          color: #556070;
        }

        .nb-root .nb-hero-facts {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .nb-root .nb-fact {
          padding: 8px 14px;
          border: 1px solid #ffe1d3;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.8);
          font-size: 12px;
          color: #556070;
        }

        .nb-root .nb-fact strong {
          display: block;
          font-size: 15px;
          color: var(--nb-ink);
        }

        /* Layout */
        .nb-root .nb-grid {
          display: grid;
          grid-template-columns: minmax(320px, 410px) minmax(0, 1fr);
          gap: 20px;
          align-items: start;
        }

        .nb-root .nb-card {
          min-width: 0;
          border: 1px solid var(--nb-border);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 28px rgba(15, 23, 42, 0.05);
        }

        .nb-root .nb-preview-card {
          position: sticky;
          top: 88px;
        }

        @media (max-width: 960px) {
          .nb-root .nb-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .nb-root .nb-preview-card {
            position: static;
            order: -1;
          }
        }

        .nb-root .nb-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 20px;
          border-bottom: 1px solid #f1f2f5;
        }

        .nb-root .nb-h3 {
          font-size: 17px;
          font-weight: 800;
        }

        .nb-root .nb-sub {
          margin-top: 2px;
          font-size: 12.5px;
          color: var(--nb-muted);
        }

        /* Settings sections */
        .nb-root .nb-section {
          padding: 18px 20px;
          border-bottom: 1px solid #f1f2f5;
        }

        .nb-root .nb-section:last-of-type {
          border-bottom: 0;
        }

        .nb-root .nb-h4 {
          margin-bottom: 14px;
          font-size: 14px;
          font-weight: 800;
        }

        .nb-root .nb-label {
          display: block;
          margin: 14px 0 7px;
          font-size: 12px;
          font-weight: 700;
          color: #4b5563;
        }

        .nb-root .nb-h4 + .nb-label {
          margin-top: 0;
        }

        .nb-root .nb-help {
          margin-top: 7px;
          font-size: 11.5px;
          line-height: 1.5;
          color: #8a93a2;
        }

        .nb-root .nb-help.is-warn {
          color: #b45309;
        }

        .nb-root .nb-input {
          display: block;
          width: 100%;
          min-height: 40px;
          padding: 9px 12px;
          border: 1px solid #dfe3e9;
          border-radius: 11px;
          background: #fff;
          font-size: 13.5px;
          color: var(--nb-ink);
          outline: none;
        }

        .nb-root .nb-input:focus {
          border-color: var(--nb-accent);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
        }

        /* Template cards */
        .nb-root .nb-templates {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .nb-root .nb-template {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          padding: 8px 6px 9px;
          border: 1px solid var(--nb-border);
          border-radius: 13px;
          background: #fff;
          font-size: 11.5px;
          font-weight: 650;
          color: #3b4150;
          text-align: center;
          line-height: 1.25;
        }

        .nb-root .nb-template:hover {
          border-color: #ffb49a;
          background: #fffaf7;
        }

        .nb-root .nb-template[aria-pressed="true"] {
          border-color: var(--nb-accent);
          background: #fff6f1;
          color: #c2410c;
          box-shadow: 0 0 0 2px rgba(255, 90, 31, 0.16);
        }

        .nb-root .nb-thumb-wrap {
          width: 100%;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          background: #fff;
        }

        .nb-root .nb-thumb {
          display: block;
          width: 100%;
          height: auto;
        }

        .nb-root .nb-thumb line,
        .nb-root .nb-thumb rect[stroke] {
          vector-effect: non-scaling-stroke;
          stroke-width: 0.7px;
        }

        /* Segmented controls */
        .nb-root .nb-seg {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: 1fr;
          gap: 4px;
          padding: 4px;
          border-radius: 12px;
          background: #f1f3f6;
        }

        .nb-root .nb-seg button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
          min-height: 40px;
          padding: 6px 8px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          font-size: 12.5px;
          font-weight: 700;
          color: #5b6472;
        }

        .nb-root .nb-seg button small {
          font-size: 10px;
          font-weight: 500;
          color: #8a93a2;
        }

        .nb-root .nb-seg button[aria-pressed="true"] {
          background: #fff;
          color: #c2410c;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
        }

        .nb-root .nb-orient {
          flex-direction: row !important;
          gap: 8px !important;
        }

        .nb-root .nb-orient i {
          display: block;
          border: 1.6px solid currentColor;
          border-radius: 2px;
        }

        .nb-root .nb-orient .is-p {
          width: 10px;
          height: 14px;
        }

        .nb-root .nb-orient .is-l {
          width: 14px;
          height: 10px;
        }

        /* Sliders */
        .nb-root .nb-range-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 14px 0 7px;
          font-size: 12px;
          font-weight: 700;
          color: #4b5563;
        }

        .nb-root .nb-range-row:first-of-type {
          margin-top: 0;
        }

        .nb-root .nb-pill {
          padding: 2px 9px;
          border-radius: 99px;
          background: #fff1ea;
          font-size: 11.5px;
          font-weight: 800;
          color: #c2410c;
        }

        .nb-root input[type="range"] {
          display: block;
          width: 100%;
          height: 20px;
          accent-color: var(--nb-accent);
          cursor: pointer;
        }

        .nb-root input[type="range"]:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        /* Swatches */
        .nb-root .nb-swatches {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .nb-root .nb-swatch {
          width: 28px;
          height: 28px;
          padding: 0;
          border: 3px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 0 1px #d4d8df;
        }

        .nb-root .nb-swatch[aria-pressed="true"] {
          box-shadow: 0 0 0 2px #0f172a;
        }

        .nb-root .nb-color-input {
          width: 34px;
          height: 30px;
          padding: 0;
          border: 1px solid #dfe3e9;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
        }

        /* Switches */
        .nb-root .nb-switch {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 9px 0;
          font-size: 13px;
          font-weight: 600;
          color: #3b4150;
          cursor: pointer;
        }

        .nb-root .nb-switch input {
          appearance: none;
          -webkit-appearance: none;
          position: relative;
          flex: none;
          width: 40px;
          height: 23px;
          border-radius: 99px;
          background: #d6dae1;
          cursor: pointer;
          transition: background 150ms ease;
        }

        .nb-root .nb-switch input::after {
          content: "";
          position: absolute;
          top: 3px;
          left: 3px;
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.3);
          transition: transform 150ms ease;
        }

        .nb-root .nb-switch input:checked {
          background: var(--nb-accent);
        }

        .nb-root .nb-switch input:checked::after {
          transform: translateX(17px);
        }

        /* Stepper */
        .nb-root .nb-stepper {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) 42px;
          gap: 6px;
        }

        .nb-root .nb-stepper .nb-input {
          text-align: center;
          font-weight: 700;
        }

        .nb-root .nb-stepper input::-webkit-outer-spin-button,
        .nb-root .nb-stepper input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .nb-root .nb-stepper input[type="number"] {
          -moz-appearance: textfield;
        }

        /* Buttons */
        .nb-root .nb-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 9px 16px;
          border: 1px solid transparent;
          border-radius: 11px;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.2;
          white-space: nowrap;
        }

        .nb-root .nb-btn-primary {
          width: 100%;
          min-height: 48px;
          background: linear-gradient(180deg, #ff6a33, #ff5a1f);
          color: #fff;
          font-size: 14px;
          box-shadow: 0 8px 20px rgba(255, 90, 31, 0.3);
        }

        .nb-root .nb-btn-primary:hover:not(:disabled) {
          background: linear-gradient(180deg, #ff5a1f, #e9470d);
        }

        .nb-root .nb-btn-secondary {
          border-color: var(--nb-border);
          background: #fff;
          color: #3b4150;
        }

        .nb-root .nb-btn-secondary:hover:not(:disabled) {
          border-color: #ffb49a;
          background: #fff7f3;
          color: #d83d0b;
        }

        .nb-root .nb-btn-small {
          min-height: 34px;
          padding: 6px 12px;
          font-size: 12px;
        }

        .nb-root .nb-btn-icon {
          min-height: 40px;
          padding: 0;
          font-size: 18px;
        }

        .nb-root .nb-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 18px 20px 20px;
          border-top: 1px solid #f1f2f5;
          background: linear-gradient(180deg, #fffaf7, #fff);
          border-radius: 0 0 20px 20px;
        }

        .nb-root .nb-actions-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .nb-root .nb-hidden {
          display: none;
        }

        .nb-root .nb-notice {
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 600;
        }

        .nb-root .nb-notice.is-ok {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          color: #166534;
        }

        .nb-root .nb-notice.is-error {
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
        }

        .nb-root .nb-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: nb-spin 0.8s linear infinite;
        }

        @keyframes nb-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Preview */
        .nb-root .nb-pager {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nb-root .nb-pager-count {
          min-width: 64px;
          text-align: center;
          font-size: 13px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          color: #475569;
        }

        .nb-root .nb-pager .nb-btn-icon {
          width: 36px;
          min-height: 36px;
        }

        .nb-root .nb-stage {
          margin: 18px 20px 0;
          padding: 28px 20px;
          border: 1px solid #edf0f3;
          border-radius: 16px;
          background: radial-gradient(#d9dee7 0.7px, transparent 0.7px), #f3f5f8;
          background-size: 14px 14px;
          outline: none;
        }

        .nb-root .nb-paper {
          width: 100%;
          margin: 0 auto;
        }

        .nb-root .nb-paper.is-portrait {
          max-width: 400px;
        }

        .nb-root .nb-paper.is-landscape {
          max-width: 640px;
        }

        .nb-root .nb-paper svg {
          display: block;
          width: 100%;
          height: auto;
          background: #fff;
          box-shadow: 0 2px 4px rgba(15, 23, 42, 0.08), 0 16px 40px rgba(15, 23, 42, 0.16);
        }

        .nb-root .nb-scrub {
          margin: 14px 20px 0;
        }

        .nb-root .nb-chips {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          padding: 16px 20px 20px;
        }

        .nb-root .nb-chip {
          min-width: 0;
          padding: 10px 12px;
          border: 1px solid #edf0f3;
          border-radius: 12px;
          background: #fafbfc;
        }

        .nb-root .nb-chip strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .nb-root .nb-chip span {
          font-size: 11.5px;
          color: #7b8493;
        }

        @media (max-width: 560px) {
          .nb-root .nb-hero {
            padding: 22px;
          }
          .nb-root .nb-chips {
            grid-template-columns: minmax(0, 1fr);
          }
          .nb-root .nb-stage {
            margin: 14px 12px 0;
            padding: 16px 10px;
          }
        }

        /* How to */
        .nb-root .nb-how {
          padding: 22px 24px;
        }

        .nb-root .nb-how-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        @media (max-width: 800px) {
          .nb-root .nb-how-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 480px) {
          .nb-root .nb-how-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        .nb-root .nb-how-step {
          padding: 14px;
          border: 1px solid #edf0f3;
          border-radius: 14px;
        }

        .nb-root .nb-how-step strong {
          display: block;
          font-size: 13px;
        }

        .nb-root .nb-how-step p {
          margin-top: 5px;
          font-size: 12px;
          color: var(--nb-muted);
        }

        .nb-root .nb-privacy {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #f1f2f5;
          font-size: 12px;
          color: var(--nb-muted);
        }

        /* Printing */
        .nb-print-host {
          display: none;
        }

        @media print {
          body > *:not(.nb-print-host) {
            display: none !important;
          }

          .nb-print-host {
            display: block !important;
          }

          .nb-print-page {
            overflow: hidden;
            break-after: page;
            page-break-after: always;
          }

          .nb-print-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .nb-print-page svg {
            display: block;
            width: 100%;
            height: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nb-root * {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>

      {/* Hero */}
      <div className="nb-hero">
        <div>
          <h2>Create your own printable notebook</h2>
          <p>
            Design custom notebook pages, check them in the live preview, and download a crisp PDF
            that is ready to print.
          </p>
        </div>
        <div className="nb-hero-facts">
          <div className="nb-fact">
            <strong>{TEMPLATES.length}</strong>
            page styles
          </div>
          <div className="nb-fact">
            <strong>Up to 100</strong>
            pages
          </div>
          <div className="nb-fact">
            <strong>Private</strong>
            made in your browser
          </div>
        </div>
      </div>

      <div className="nb-grid">
        {/* Settings */}
        <aside className="nb-card">
          <div className="nb-card-head">
            <div>
              <h3 className="nb-h3">Notebook settings</h3>
              <p className="nb-sub">Changes appear in the preview straight away.</p>
            </div>
            <button type="button" className="nb-btn nb-btn-secondary nb-btn-small" onClick={resetSettings}>
              Reset
            </button>
          </div>

          <section className="nb-section">
            <h4 className="nb-h4">Page style</h4>
            <div className="nb-templates">
              {TEMPLATES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className="nb-template"
                  aria-pressed={settings.template === item.value}
                  onClick={() => update("template", item.value)}
                >
                  <span className="nb-thumb-wrap">
                    <TemplateThumb template={item.value} accent={settings.accentColor} />
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
            <p className="nb-help">{selectedTemplate?.description}</p>
          </section>

          <section className="nb-section">
            <h4 className="nb-h4">Paper</h4>
            <span className="nb-label">Paper size</span>
            <div className="nb-seg" role="group" aria-label="Paper size">
              {(Object.keys(PAPER_SIZES) as PaperSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={settings.paperSize === size}
                  onClick={() => update("paperSize", size)}
                >
                  {PAPER_SIZES[size].label}
                  <small>
                    {fmtMm(PAPER_SIZES[size].width)}×{fmtMm(PAPER_SIZES[size].height)}
                  </small>
                </button>
              ))}
            </div>

            <span className="nb-label">Orientation</span>
            <div className="nb-seg" role="group" aria-label="Orientation">
              <button
                type="button"
                className="nb-orient"
                aria-pressed={settings.orientation === "portrait"}
                onClick={() => update("orientation", "portrait")}
              >
                <i className="is-p" /> Portrait
              </button>
              <button
                type="button"
                className="nb-orient"
                aria-pressed={settings.orientation === "landscape"}
                onClick={() => update("orientation", "landscape")}
              >
                <i className="is-l" /> Landscape
              </button>
            </div>

            <div className="nb-range-row" style={{ marginTop: 18 }}>
              <label htmlFor="nb-margin">Page margin</label>
              <span className="nb-pill">{settings.margin} mm</span>
            </div>
            <input
              id="nb-margin"
              type="range"
              min={5}
              max={35}
              value={settings.margin}
              onChange={(event) => update("margin", Number(event.target.value))}
            />
            <p className="nb-help">Sets the empty border around the writing area.</p>
          </section>

          <section className="nb-section">
            <h4 className="nb-h4">Lines, grid and colours</h4>

            <div className="nb-range-row">
              <label htmlFor="nb-line-spacing">Line spacing</label>
              <span className="nb-pill">{settings.template === "college" ? 7 : settings.template === "wide" ? 11 : settings.lineSpacing} mm</span>
            </div>
            <input
              id="nb-line-spacing"
              type="range"
              min={5}
              max={14}
              value={settings.lineSpacing}
              disabled={!isRuled}
              onChange={(event) => update("lineSpacing", Number(event.target.value))}
            />
            {!isRuled && ["college", "wide"].includes(settings.template) && (
              <p className="nb-help">College and wide ruled use a fixed spacing. Pick Ruled to adjust it.</p>
            )}

            <div className="nb-range-row">
              <label htmlFor="nb-grid-size">Grid spacing</label>
              <span className="nb-pill">{settings.gridSize} mm</span>
            </div>
            <input
              id="nb-grid-size"
              type="range"
              min={3}
              max={12}
              value={settings.gridSize}
              disabled={!isGridType}
              onChange={(event) => update("gridSize", Number(event.target.value))}
            />

            <span className="nb-label">Line and grid colour</span>
            <div className="nb-swatches">
              {LINE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="nb-swatch"
                  style={{ background: color }}
                  aria-label={`Line colour ${color}`}
                  aria-pressed={settings.lineColor.toLowerCase() === color}
                  onClick={() => update("lineColor", color)}
                />
              ))}
              <input
                type="color"
                className="nb-color-input"
                value={settings.lineColor}
                aria-label="Custom line colour"
                onChange={(event) => update("lineColor", event.target.value)}
              />
            </div>

            <span className="nb-label">Accent colour (cover and headings)</span>
            <div className="nb-swatches">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="nb-swatch"
                  style={{ background: color }}
                  aria-label={`Accent colour ${color}`}
                  aria-pressed={settings.accentColor.toLowerCase() === color}
                  onClick={() => update("accentColor", color)}
                />
              ))}
              <input
                type="color"
                className="nb-color-input"
                value={settings.accentColor}
                aria-label="Custom accent colour"
                onChange={(event) => update("accentColor", event.target.value)}
              />
            </div>

            {isPatterned && (
              <label className="nb-switch" style={{ marginTop: 8 }}>
                Show left margin line
                <input
                  type="checkbox"
                  checked={settings.showMargin}
                  onChange={(event) => update("showMargin", event.target.checked)}
                />
              </label>
            )}
          </section>

          <section className="nb-section">
            <h4 className="nb-h4">Notebook details</h4>

            <label className="nb-label" htmlFor="nb-title">
              Notebook title
            </label>
            <input
              id="nb-title"
              type="text"
              className="nb-input"
              maxLength={60}
              value={settings.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="e.g. Biology notes"
            />

            <label className="nb-label" htmlFor="nb-subtitle">
              Subtitle
            </label>
            <input
              id="nb-subtitle"
              type="text"
              className="nb-input"
              maxLength={80}
              value={settings.subtitle}
              onChange={(event) => update("subtitle", event.target.value)}
              placeholder="e.g. Semester 1"
            />
            {hasUnsupportedText && (
              <p className="nb-help is-warn">
                The PDF uses a built-in font, so characters outside the Latin alphabet show as “?”.
              </p>
            )}

            <label className="nb-label" htmlFor="nb-pages">
              Content pages
            </label>
            <div className="nb-stepper">
              <button
                type="button"
                className="nb-btn nb-btn-secondary nb-btn-icon"
                aria-label="Remove a page"
                disabled={settings.pages <= 1}
                onClick={() => setPages(settings.pages - 1)}
              >
                −
              </button>
              <input
                id="nb-pages"
                type="number"
                inputMode="numeric"
                className="nb-input"
                min={1}
                max={100}
                value={pagesText}
                onChange={(event) => {
                  setPagesText(event.target.value);
                  const value = Number(event.target.value);
                  if (event.target.value !== "" && Number.isFinite(value)) setPages(value);
                }}
                onBlur={() => setPagesText(String(settings.pages))}
              />
              <button
                type="button"
                className="nb-btn nb-btn-secondary nb-btn-icon"
                aria-label="Add a page"
                disabled={settings.pages >= 100}
                onClick={() => setPages(settings.pages + 1)}
              >
                +
              </button>
            </div>
            <p className="nb-help">Choose between 1 and 100 pages.</p>

            <label className="nb-switch" style={{ marginTop: 6 }}>
              Add a cover page
              <input
                type="checkbox"
                checked={settings.includeCover}
                onChange={(event) => {
                  update("includeCover", event.target.checked);
                  setPreviewPage(1);
                }}
              />
            </label>
          </section>

          <section className="nb-section">
            <h4 className="nb-h4">Header and footer</h4>
            <label className="nb-switch">
              Notebook title in header
              <input
                type="checkbox"
                checked={settings.showHeader}
                onChange={(event) => update("showHeader", event.target.checked)}
              />
            </label>
            <label className="nb-switch">
              Footer with subtitle
              <input
                type="checkbox"
                checked={settings.showFooter}
                onChange={(event) => update("showFooter", event.target.checked)}
              />
            </label>
            <label className="nb-switch">
              Page numbers
              <input
                type="checkbox"
                checked={settings.showPageNumbers}
                disabled={!settings.showFooter}
                onChange={(event) => update("showPageNumbers", event.target.checked)}
              />
            </label>
          </section>

          <div className="nb-actions">
            <button type="button" className="nb-btn nb-btn-primary" onClick={savePdf} disabled={busy}>
              {busy ? (
                <>
                  <span className="nb-spinner" /> Creating PDF...
                </>
              ) : (
                <>Download PDF ({totalPages} {totalPages === 1 ? "page" : "pages"})</>
              )}
            </button>

            <div className="nb-actions-row">
              <button type="button" className="nb-btn nb-btn-secondary" onClick={printNotebook}>
                Print
              </button>
              <button type="button" className="nb-btn nb-btn-secondary" onClick={exportSettings}>
                Export settings
              </button>
            </div>

            <button
              type="button"
              className="nb-btn nb-btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Import settings
            </button>
            <input
              ref={fileInputRef}
              className="nb-hidden"
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                void importSettings(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />

            {notice && (
              <p className={`nb-notice ${notice.kind === "ok" ? "is-ok" : "is-error"}`} role="status">
                {notice.text}
              </p>
            )}

            <p className="nb-help" style={{ marginTop: 0 }}>
              The PDF is built in your browser as vector artwork, so lines stay sharp at any print size.
            </p>
          </div>
        </aside>

        {/* Preview */}
        <main className="nb-card nb-preview-card">
          <div className="nb-card-head">
            <div>
              <h3 className="nb-h3">Live preview</h3>
              <p className="nb-sub">
                {previewIsCover ? "Cover page" : `Page ${contentPageNumber} of ${settings.pages}`}
              </p>
            </div>
            <div className="nb-pager">
              <button
                type="button"
                className="nb-btn nb-btn-secondary nb-btn-icon"
                onClick={() => setPreviewPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                ‹
              </button>
              <span className="nb-pager-count">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className="nb-btn nb-btn-secondary nb-btn-icon"
                onClick={() => setPreviewPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>

          <div className="nb-stage" tabIndex={0} onKeyDown={onStageKey} aria-label="Page preview. Use the arrow keys to change page.">
            <div className={`nb-paper ${settings.orientation === "landscape" ? "is-landscape" : "is-portrait"}`}>
              <PageSvg
                shared={previewIsCover ? [] : shared}
                unique={previewIsCover ? cover : unique}
                w={dims.width}
                h={dims.height}
                idPrefix={`pv${previewId}`}
              />
            </div>
          </div>

          {totalPages > 1 && (
            <div className="nb-scrub">
              <input
                type="range"
                min={1}
                max={totalPages}
                value={page}
                aria-label="Jump to page"
                onChange={(event) => setPreviewPage(Number(event.target.value))}
              />
            </div>
          )}

          <div className="nb-chips">
            <div className="nb-chip">
              <strong>{PAPER_SIZES[settings.paperSize].label}</strong>
              <span>
                {fmtMm(dims.width)} × {fmtMm(dims.height)} mm, {settings.orientation}
              </span>
            </div>
            <div className="nb-chip">
              <strong>{totalPages} total pages</strong>
              <span>{settings.includeCover ? "Cover and content pages" : "Content pages"}</span>
            </div>
            <div className="nb-chip">
              <strong>{selectedTemplate?.label}</strong>
              <span>Selected style</span>
            </div>
          </div>
        </main>
      </div>

      {/* How it works */}
      <section className="nb-card nb-how">
        <h3 className="nb-h3">How to create your printable notebook</h3>
        <div className="nb-how-grid">
          <div className="nb-how-step">
            <strong>Pick a page style</strong>
            <p>Choose lined, blank, grid, Cornell notes or a planner.</p>
          </div>
          <div className="nb-how-step">
            <strong>Customise the paper</strong>
            <p>Set the size, orientation, margins, spacing and colours.</p>
          </div>
          <div className="nb-how-step">
            <strong>Set the page count</strong>
            <p>Add up to 100 pages, with an optional cover.</p>
          </div>
          <div className="nb-how-step">
            <strong>Download or print</strong>
            <p>Save the notebook as a PDF, or print it straight away.</p>
          </div>
        </div>
        <p className="nb-privacy">
          Your settings are saved in this browser. Nothing is uploaded: the PDF is created on your
          device.
        </p>
      </section>

      {/* Print sheet, only mounted while printing */}
      {printing &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="nb-print-host">
            <style>{`@page { size: ${dims.width}mm ${dims.height}mm; margin: 0; }`}</style>
            {Array.from({ length: totalPages }, (_, index) => {
              const isCover = settings.includeCover && index === 0;
              const number = settings.includeCover ? index : index + 1;

              return (
                <div
                  className="nb-print-page"
                  key={index}
                  style={{ width: `${dims.width}mm`, height: `${dims.height - 0.4}mm` }}
                >
                  <PageSvg
                    shared={isCover ? [] : shared}
                    unique={isCover ? cover : buildContentUnique(settings, number)}
                    w={dims.width}
                    h={dims.height}
                    idPrefix={`pr${index}`}
                  />
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}