"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import ToolShell from "../ToolShell";

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type Unit = "ft" | "in" | "m";
type PriceBasis = "bag" | "weight" | "volume";

const FT_PER_M = 3.280839895;
const CUFT_PER_M3 = 35.3147;
const LB_PER_KG = 2.20462;
const LB_PER_CUFT_PER_KG_M3 = 1 / 16.0185; // kg/m³ -> lb/cu ft

// Nominal size -> typical outside diameter (inches) of perforated drain pipe
const PIPE_PRESETS = [
  { label: "3″", od: 3.5 },
  { label: "4″", od: 4.8 },
  { label: "6″", od: 6.9 },
  { label: "8″", od: 9.0 },
];

// Approximate loose bulk densities (lb / cu ft). Always confirm with supplier.
const GRAVEL_PRESETS = [
  { name: "Washed ¾″ stone", lb: 95 },
  { name: "Pea gravel", lb: 105 },
  { name: "Drain rock 1½″", lb: 92 },
  { name: "River rock", lb: 100 },
];

const DEFAULTS = {
  unit: "ft" as Unit,
  length: 20,
  trenchWidth: 1.5,
  baseDepth: 0.25,
  pipeDiameter: 4.8 / 12,
  coverDepth: 0.5,
  waste: 10,
  compaction: 0,
  bagSize: 0.5,
  density: 95,
  price: 0,
  priceBasis: "volume" as PriceBasis,
  currency: "$",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const round = (v: number, d = 4) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

const toFeet = (v: number, u: Unit) => (u === "in" ? v / 12 : u === "m" ? v * FT_PER_M : v);
const fromFeet = (v: number, u: Unit) => (u === "in" ? v * 12 : u === "m" ? v / FT_PER_M : v);

function fmt(value: number, digits = 2) {
  return Number.isFinite(value)
    ? value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits })
    : "—";
}

const volumeLabel = (u: Unit) => (u === "m" ? "m³" : "cu ft");
const volumeOf = (cuFt: number, u: Unit) => (u === "m" ? cuFt / CUFT_PER_M3 : cuFt);

/* ------------------------------------------------------------------ */
/* Styles (scoped, supports media queries + focus states)              */
/* ------------------------------------------------------------------ */

const CSS = `
.gc { --ink:#0e1f24; --ink-2:#17313a; --text:#1f2f36; --muted:#5f7279; --line:#dde5e8;
  --soft:#f3f7f8; --accent:#0f766e; --accent-soft:#e3f4f1; --mint:#6ee7d4; --warn:#b42318;
  width:1180px; max-width:100%; margin:0 auto; container-type:inline-size; grid-column:1 / -1; flex:1 1 100%; min-width:0; color:var(--text); font-variant-numeric:tabular-nums; }
.gc *, .gc *::before, .gc *::after { box-sizing:border-box; }
.gc-head { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; flex-wrap:wrap; margin-bottom:24px; }
.gc-head h2 { margin:0; font-size:26px; line-height:1.15; letter-spacing:-.02em; color:var(--ink); font-weight:800; }
.gc-head p { margin:8px 0 0; color:var(--muted); font-size:14px; line-height:1.6; max-width:56ch; }
.gc-seg { display:inline-flex; padding:4px; background:var(--soft); border:1px solid var(--line); border-radius:12px; gap:2px; }
.gc-seg button { border:0; background:transparent; padding:8px 16px; border-radius:9px; font:inherit; font-size:13px; font-weight:700; color:var(--muted); cursor:pointer; transition:background .15s,color .15s; }
.gc-seg button[aria-pressed="true"] { background:var(--ink); color:#fff; }
.gc-seg button:hover:not([aria-pressed="true"]) { color:var(--ink); }
.gc-layout { display:grid; grid-template-columns:minmax(0,1fr); gap:24px; align-items:start; }
@container (min-width: 880px) { .gc-layout { grid-template-columns:minmax(0,1fr) 420px; } .gc-aside { position:sticky; top:96px; } }
.gc-col { display:flex; flex-direction:column; gap:16px; min-width:0; }
.gc-card { background:#fff; border:1px solid var(--line); border-radius:16px; padding:22px; }
.gc-card h3 { display:flex; align-items:center; gap:10px; margin:0 0 4px; font-size:16px; font-weight:800; color:var(--ink); }
.gc-card h3 .ic { display:grid; place-items:center; width:30px; height:30px; border-radius:9px; background:var(--accent-soft); color:var(--accent); }
.gc-card .desc { margin:0 0 18px; color:var(--muted); font-size:13px; line-height:1.6; }
.gc-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr)); gap:16px; }
.gc-field { display:flex; flex-direction:column; gap:6px; min-width:0; }
.gc-label { font-size:13px; font-weight:700; color:var(--text); }
.gc-wrap { position:relative; display:flex; align-items:center; }
.gc-input, .gc-select { width:100%; min-width:0; height:46px; border:1px solid #c5d1d6; border-radius:10px; background:#fff; color:var(--ink); padding:0 14px; font:inherit; font-size:15px; font-weight:600; transition:border-color .15s, box-shadow .15s; }
.gc-input.has-suffix { padding-right:64px; }
.gc-input:hover, .gc-select:hover { border-color:#9db0b7; }
.gc-input:focus-visible, .gc-select:focus-visible, .gc-chip:focus-visible, .gc-seg button:focus-visible, .gc-btn:focus-visible { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px rgba(15,118,110,.22); }
.gc-input.err { border-color:var(--warn); background:#fff8f7; }
.gc-suffix { position:absolute; right:14px; font-size:12px; font-weight:700; color:#8a9ba1; pointer-events:none; }
.gc-hint { font-size:12px; color:var(--muted); line-height:1.4; }
.gc-select { appearance:none; cursor:pointer; padding-right:36px; background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1.5 6 6.5 11 1.5' fill='none' stroke='%235f7279' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>"); background-repeat:no-repeat; background-position:right 14px center; }
.gc-chips { display:flex; flex-wrap:wrap; gap:8px; }
.gc-chip { border:1px solid #c5d1d6; background:#fff; color:var(--text); border-radius:999px; padding:8px 14px; font:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:all .15s; }
.gc-chip:hover { border-color:var(--accent); color:var(--accent); }
.gc-chip[aria-pressed="true"] { background:var(--accent); border-color:var(--accent); color:#fff; }
.gc-sub { margin:18px 0 8px; font-size:13px; font-weight:700; color:var(--text); }
.gc-callout { margin-top:16px; padding:12px 14px; border-radius:10px; background:var(--soft); border:1px solid var(--line); font-size:13px; color:var(--muted); line-height:1.5; }
.gc-callout strong { color:var(--ink); }

.gc-result { background:linear-gradient(160deg,var(--ink) 0%,var(--ink-2) 100%); color:#fff; border-radius:20px; padding:26px; box-shadow:0 18px 40px -18px rgba(14,31,36,.55); }
.gc-result .top { display:flex; justify-content:space-between; align-items:center; gap:12px; }
.gc-result .kicker { font-size:13px; font-weight:700; color:var(--mint); }
.gc-btn { display:inline-flex; align-items:center; gap:6px; border:1px solid rgba(255,255,255,.22); background:rgba(255,255,255,.06); color:#fff; border-radius:9px; padding:7px 12px; font:inherit; font-size:12px; font-weight:700; cursor:pointer; transition:background .15s; }
.gc-btn:hover { background:rgba(255,255,255,.14); }
.gc-big { margin-top:14px; font-size:clamp(38px,6vw,52px); line-height:1.05; font-weight:800; letter-spacing:-.03em; overflow-wrap:anywhere; }
.gc-big small { font-size:18px; font-weight:700; color:#9fc3c0; letter-spacing:0; margin-left:6px; }
.gc-sub-line { margin-top:6px; font-size:14px; color:#b7d0cd; }
.gc-metrics { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:22px; }
.gc-metric { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.1); border-radius:12px; padding:13px 14px; min-width:0; }
.gc-metric .l { font-size:12px; color:#9fc3c0; font-weight:600; margin-bottom:4px; }
.gc-metric .v { font-size:19px; font-weight:800; overflow-wrap:anywhere; }
.gc-metric.wide { grid-column:1 / -1; background:rgba(110,231,212,.12); border-color:rgba(110,231,212,.3); }
.gc-diagram { margin-top:18px; background:#f4f8f9; border-radius:14px; padding:8px; }
.gc-diagram svg { display:block; width:100%; height:auto; }

.gc-rows { display:grid; gap:0; font-size:14px; }
.gc-row { display:flex; justify-content:space-between; gap:12px; padding:11px 0; border-bottom:1px solid #edf2f4; color:var(--muted); }
.gc-row span:last-child { text-align:right; white-space:nowrap; color:var(--text); font-weight:600; }
.gc-row.total { border-bottom:0; padding-bottom:0; color:var(--ink); font-weight:800; }
.gc-row.total span:last-child { color:var(--ink); font-weight:800; }
.gc-bar { display:flex; height:12px; border-radius:999px; overflow:hidden; margin:6px 0 10px; background:var(--soft); }
.gc-legend { display:flex; flex-wrap:wrap; gap:6px 16px; font-size:12px; color:var(--muted); margin-bottom:14px; }
.gc-legend i { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:6px; }
.gc-error { background:#fff4f2; border:1px solid #f5c2bb; color:var(--warn); border-radius:14px; padding:16px 18px; font-size:14px; }
.gc-error ul { margin:8px 0 0; padding-left:18px; line-height:1.6; }
.gc-note { font-size:12.5px; line-height:1.65; color:var(--muted); padding:0 4px; }
.gc-note strong { color:var(--text); }
`;

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const Svg = ({ children, size = 16 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const IconRuler = () => (
  <Svg size={16}>
    <path d="M21.3 8.7 8.7 21.3c-1 1-2.6 1-3.6 0L2.7 18.9c-1-1-1-2.6 0-3.6L15.3 2.7c1-1 2.6-1 3.6 0l2.4 2.4c1 1 1 2.6 0 3.6Z" />
    <path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2" />
  </Svg>
);
const IconPipe = () => (
  <Svg size={16}>
    <path d="M3 8h8a3 3 0 0 1 3 3v2a3 3 0 0 0 3 3h4" />
    <path d="M3 4v8M21 12v8" />
  </Svg>
);
const IconGravel = () => (
  <Svg size={16}>
    <circle cx="8" cy="8" r="3.5" />
    <circle cx="16.5" cy="10" r="2.5" />
    <circle cx="11" cy="17" r="3" />
  </Svg>
);
const IconTag = () => (
  <Svg size={16}>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
    <circle cx="7.5" cy="7.5" r="1.2" />
  </Svg>
);
const IconCopy = () => (
  <Svg>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
);
const IconCheck = () => (
  <Svg>
    <path d="m20 6-11 11-5-5" />
  </Svg>
);

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

function NumField({
  label, value, onChange, suffix, hint, error,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  hint?: string;
  error?: boolean;
}) {
  const [draft, setDraft] = useState(String(round(value)));
  const [focused, setFocused] = useState(false);

  // Keep the box in sync when the value changes from outside (unit switch, presets, reset)
  useEffect(() => {
    if (!focused) setDraft(String(round(value)));
  }, [value, focused]);

  return (
    <label className="gc-field">
      <span className="gc-label">{label}</span>
      <div className="gc-wrap">
        <input
          className={`gc-input${suffix ? " has-suffix" : ""}${error ? " err" : ""}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={draft}
          aria-invalid={error || undefined}
          onFocus={(e) => { setFocused(true); e.currentTarget.select(); }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const t = e.target.value;
            if (!/^\d*\.?\d*$/.test(t)) return;
            setDraft(t);
            onChange(t === "" || t === "." ? 0 : Number(t));
          }}
        />
        {suffix && <span className="gc-suffix">{suffix}</span>}
      </div>
      {hint && <span className="gc-hint">{hint}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Cross-section diagram                                               */
/* ------------------------------------------------------------------ */

function TrenchDiagram({
  widthFt, baseFt, pipeFt, coverFt, unit,
}: { widthFt: number; baseFt: number; pipeFt: number; coverFt: number; unit: Unit }) {
  const W = 360, H = 250;
  const depthFt = baseFt + pipeFt + coverFt;
  const maxW = 170, maxD = 135;
  const s = Math.min(maxW / Math.max(widthFt, 0.01), maxD / Math.max(depthFt, 0.01));
  const tw = widthFt * s, td = depthFt * s;
  const tx = (W - tw) / 2 - 22;
  const ty = 58;
  const baseH = baseFt * s, coverH = coverFt * s, pipeH = pipeFt * s;
  const pipeR = Math.max(pipeH / 2, 2);
  const pipeCx = tx + tw / 2;
  const pipeCy = ty + td - baseH - pipeH / 2;
  const lab = (ft: number) => `${fmt(fromFeet(ft, unit), 2)} ${unit}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cross-section of the trench showing gravel base, pipe, and gravel cover">
      <defs>
        <pattern id="gc-gravel" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#e6edf0" />
          <circle cx="2.5" cy="2.5" r="1.5" fill="#9db0b8" />
          <circle cx="7" cy="6.5" r="2" fill="#b4c3c9" />
          <circle cx="7.5" cy="1.5" r="1" fill="#a6b7be" />
          <circle cx="1.8" cy="8" r="1" fill="#a6b7be" />
        </pattern>
        <pattern id="gc-soil" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#e9dfcf" />
          <path d="M2 4h3M9 10h3M10 3h2" stroke="#d3c3a8" strokeWidth="1.2" strokeLinecap="round" />
        </pattern>
      </defs>

      {/* soil + ground line */}
      <rect x="8" y={ty} width={W - 16} height={H - ty - 8} rx="6" fill="url(#gc-soil)" />
      <line x1="8" y1={ty} x2={W - 8} y2={ty} stroke="#7d8f6a" strokeWidth="3" strokeLinecap="round" />

      {/* trench fill */}
      <rect x={tx} y={ty} width={tw} height={td} fill="url(#gc-gravel)" stroke="#6f8791" strokeWidth="1.5" />
      <line x1={tx} x2={tx + tw} y1={ty + coverH} y2={ty + coverH} stroke="#6f8791" strokeWidth="1" strokeDasharray="4 3" />
      <line x1={tx} x2={tx + tw} y1={ty + td - baseH} y2={ty + td - baseH} stroke="#6f8791" strokeWidth="1" strokeDasharray="4 3" />

      {/* pipe */}
      <circle cx={pipeCx} cy={pipeCy} r={pipeR} fill="#fff" stroke="#0e1f24" strokeWidth="2.5" />
      <circle cx={pipeCx} cy={pipeCy} r={Math.max(pipeR - 4, 1)} fill="none" stroke="#c2d0d5" strokeWidth="1" />
      <circle cx={pipeCx} cy={pipeCy} r="1.8" fill="#0f766e" />

      {/* width dimension */}
      <g stroke="#0e1f24" strokeWidth="1.2" fill="none">
        <line x1={tx} x2={tx + tw} y1={ty - 18} y2={ty - 18} />
        <line x1={tx} x2={tx} y1={ty - 23} y2={ty - 13} />
        <line x1={tx + tw} x2={tx + tw} y1={ty - 23} y2={ty - 13} />
      </g>
      <text x={tx + tw / 2} y={ty - 26} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0e1f24">{lab(widthFt)} wide</text>

      {/* depth dimension */}
      <g stroke="#0e1f24" strokeWidth="1.2" fill="none">
        <line x1={tx + tw + 16} x2={tx + tw + 16} y1={ty} y2={ty + td} />
        <line x1={tx + tw + 11} x2={tx + tw + 21} y1={ty} y2={ty} />
        <line x1={tx + tw + 11} x2={tx + tw + 21} y1={ty + td} y2={ty + td} />
      </g>
      <text x={tx + tw + 26} y={ty + td / 2 - 2} fontSize="12" fontWeight="700" fill="#0e1f24">{lab(depthFt)}</text>
      <text x={tx + tw + 26} y={ty + td / 2 + 12} fontSize="11" fill="#5f7279">deep</text>

      {/* layer labels */}
      <g fontSize="11" textAnchor="end" fill="#5f7279">
        <text x={tx - 8} y={ty + Math.max(coverH / 2, 8) - 2} fontWeight="700" fill="#0e1f24">Cover</text>
        <text x={tx - 8} y={ty + Math.max(coverH / 2, 8) + 10}>{lab(coverFt)}</text>
        <text x={tx - 8} y={pipeCy - 2} fontWeight="700" fill="#0e1f24">Pipe</text>
        <text x={tx - 8} y={pipeCy + 10}>{lab(pipeFt)}</text>
        <text x={tx - 8} y={ty + td - Math.max(baseH / 2, 6) - 2} fontWeight="700" fill="#0e1f24">Base</text>
        <text x={tx - 8} y={ty + td - Math.max(baseH / 2, 6) + 10}>{lab(baseFt)}</text>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function GravelCalculator() {
  const [unit, setUnit] = useState<Unit>(DEFAULTS.unit);
  const [length, setLength] = useState(DEFAULTS.length);
  const [trenchWidth, setTrenchWidth] = useState(DEFAULTS.trenchWidth);
  const [baseDepth, setBaseDepth] = useState(DEFAULTS.baseDepth);
  const [pipeDiameter, setPipeDiameter] = useState(DEFAULTS.pipeDiameter);
  const [coverDepth, setCoverDepth] = useState(DEFAULTS.coverDepth);
  const [waste, setWaste] = useState(DEFAULTS.waste);
  const [compaction, setCompaction] = useState(DEFAULTS.compaction);
  const [bagSize, setBagSize] = useState(DEFAULTS.bagSize);
  const [density, setDensity] = useState(DEFAULTS.density);
  const [price, setPrice] = useState(DEFAULTS.price);
  const [priceBasis, setPriceBasis] = useState<PriceBasis>(DEFAULTS.priceBasis);
  const [currency, setCurrency] = useState(DEFAULTS.currency);
  const [copied, setCopied] = useState(false);

  const metric = unit === "m";

  /* ---------- calculations (internally everything in feet / cu ft / lb) ---------- */
  const r = useMemo(() => {
    const lengthFt = toFeet(length, unit);
    const widthFt = toFeet(trenchWidth, unit);
    const baseFt = toFeet(baseDepth, unit);
    const pipeFt = toFeet(pipeDiameter, unit);
    const coverFt = toFeet(coverDepth, unit);
    const depthFt = baseFt + pipeFt + coverFt;

    const grossVolume = lengthFt * widthFt * depthFt;
    const pipeVolume = Math.PI * (pipeFt / 2) ** 2 * lengthFt;
    const netVolume = Math.max(0, grossVolume - pipeVolume);
    const afterCompaction = netVolume * (1 + compaction / 100);
    const orderVolume = afterCompaction * (1 + waste / 100);
    const cubicYards = orderVolume / 27;

    const layerBase = lengthFt * widthFt * baseFt;
    const layerCover = lengthFt * widthFt * coverFt;
    const layerPipeZone = Math.max(0, lengthFt * widthFt * pipeFt - pipeVolume);

    const bagCuFt = metric ? bagSize * CUFT_PER_M3 : bagSize;
    const densityLb = metric ? density * LB_PER_CUFT_PER_KG_M3 : density;
    const bags = bagCuFt > 0 ? Math.ceil(orderVolume / bagCuFt - 1e-9) : 0;
    const weightLb = orderVolume * densityLb;
    const weight = metric ? weightLb / LB_PER_KG : weightLb;
    const tons = metric ? weight / 1000 : weightLb / 2000;

    // Filter fabric: wraps the trench (floor + both walls) with a 1 ft overlap on top
    const fabricFt2 = lengthFt * (widthFt + 2 * depthFt + 1) * (1 + waste / 100);
    const fabric = metric ? fabricFt2 / (FT_PER_M * FT_PER_M) : fabricFt2;

    let cost = 0;
    if (price > 0) {
      if (priceBasis === "bag") cost = bags * price;
      else if (priceBasis === "weight") cost = tons * price;
      else cost = (metric ? orderVolume / CUFT_PER_M3 : cubicYards) * price;
    }

    return {
      lengthFt, widthFt, baseFt, pipeFt, coverFt, depthFt,
      grossVolume, pipeVolume, netVolume, afterCompaction, orderVolume, cubicYards,
      layerBase, layerCover, layerPipeZone, bags, weight, tons, fabric, cost,
    };
  }, [length, trenchWidth, baseDepth, pipeDiameter, coverDepth, unit, waste, compaction, bagSize, density, price, priceBasis, metric]);

  /* ---------- validation ---------- */
  const errs = {
    length: length <= 0,
    width: trenchWidth <= 0,
    pipe: pipeDiameter <= 0 || r.pipeFt >= r.widthFt,
    waste: waste < 0 || waste > 100,
    compaction: compaction < 0 || compaction > 100,
    bag: bagSize <= 0,
    density: density <= 0,
  };
  const messages: string[] = [];
  if (errs.length) messages.push("Trench length must be greater than 0.");
  if (errs.width) messages.push("Trench width must be greater than 0.");
  if (pipeDiameter <= 0) messages.push("Pipe diameter must be greater than 0.");
  else if (r.pipeFt >= r.widthFt && !errs.width) messages.push("The pipe must be narrower than the trench. Widen the trench or choose a smaller pipe.");
  if (errs.waste) messages.push("Waste must be between 0% and 100%.");
  if (errs.compaction) messages.push("Compaction must be between 0% and 100%.");
  if (errs.bag) messages.push("Bag size must be greater than 0.");
  if (errs.density) messages.push("Bulk density must be greater than 0.");
  const invalid = messages.length > 0;

  /* ---------- derived display values ---------- */
  const depthDisp = fromFeet(r.depthFt, unit);
  const vol = (cuFt: number) => `${fmt(volumeOf(cuFt, unit))} ${volumeLabel(unit)}`;
  const weightText = `${fmt(r.weight, 0)} ${metric ? "kg" : "lb"}`;
  const tonsText = `${fmt(r.tons, 2)} ${metric ? "tonnes" : "tons"}`;
  const fabricText = `${fmt(r.fabric, 0)} ${metric ? "m²" : "sq ft"}`;
  const pipeInches = r.pipeFt * 12;
  const activePipe = PIPE_PRESETS.find((p) => Math.abs(p.od - pipeInches) < 0.06);
  const densityLb = metric ? density * LB_PER_CUFT_PER_KG_M3 : density;
  const activeGravel = GRAVEL_PRESETS.find((g) => Math.abs(g.lb - densityLb) < 0.6);

  /* ---------- actions ---------- */
  const changeUnit = (next: Unit) => {
    if (next === unit) return;
    const conv = (v: number) => round(fromFeet(toFeet(v, unit), next));
    setLength(conv(length));
    setTrenchWidth(conv(trenchWidth));
    setBaseDepth(conv(baseDepth));
    setPipeDiameter(conv(pipeDiameter));
    setCoverDepth(conv(coverDepth));

    if (!metric && next === "m") {
      setBagSize(round(bagSize / CUFT_PER_M3, 4));
      setDensity(round(density / LB_PER_CUFT_PER_KG_M3, 0));
      if (priceBasis === "volume") setPrice(round(price * 1.30795, 2)); // per cu yd -> per m³
      if (priceBasis === "weight") setPrice(round(price * 1.10231, 2)); // per ton -> per tonne
    } else if (metric && next !== "m") {
      setBagSize(round(bagSize * CUFT_PER_M3, 3));
      setDensity(round(density * LB_PER_CUFT_PER_KG_M3, 1));
      if (priceBasis === "volume") setPrice(round(price / 1.30795, 2));
      if (priceBasis === "weight") setPrice(round(price / 1.10231, 2));
    }
    setUnit(next);
  };

  const reset = () => {
    setUnit(DEFAULTS.unit);
    setLength(DEFAULTS.length);
    setTrenchWidth(DEFAULTS.trenchWidth);
    setBaseDepth(DEFAULTS.baseDepth);
    setPipeDiameter(DEFAULTS.pipeDiameter);
    setCoverDepth(DEFAULTS.coverDepth);
    setWaste(DEFAULTS.waste);
    setCompaction(DEFAULTS.compaction);
    setBagSize(DEFAULTS.bagSize);
    setDensity(DEFAULTS.density);
    setPrice(DEFAULTS.price);
    setPriceBasis(DEFAULTS.priceBasis);
    setCurrency(DEFAULTS.currency);
    setCopied(false);
  };

  const pickPipe = (od: number) => setPipeDiameter(round(fromFeet(od / 12, unit)));
  const pickGravel = (lb: number) => setDensity(metric ? round(lb / LB_PER_CUFT_PER_KG_M3, 0) : lb);

  const copyResults = async () => {
    const lines = [
      "French Drain Gravel Estimate",
      "--------------------------------",
      `Trench: ${fmt(length)} ${unit} long × ${fmt(trenchWidth)} ${unit} wide × ${fmt(depthDisp)} ${unit} deep`,
      `Layers: ${fmt(baseDepth)} base + ${fmt(pipeDiameter)} pipe + ${fmt(coverDepth)} cover (${unit})`,
      "--------------------------------",
      `Order volume: ${vol(r.orderVolume)} (≈ ${fmt(r.cubicYards)} cu yd)`,
      `Bags (${fmt(bagSize, 3)} ${volumeLabel(unit)}): ${r.bags}`,
      `Weight: ${weightText} (${tonsText})`,
      `Filter fabric: ${fabricText}`,
    ];
    if (r.cost > 0) lines.push(`Estimated cost: ${currency}${fmt(r.cost)}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const pct = (v: number) => (r.netVolume > 0 ? (v / r.netVolume) * 100 : 0);
  const priceSuffix =
    priceBasis === "bag" ? "/ bag" : priceBasis === "weight" ? (metric ? "/ tonne" : "/ ton") : metric ? "/ m³" : "/ cu yd";

  /* ---------------------------------------------------------------- */
  return (
    <ToolShell title="French Drain Gravel Calculator" onReset={reset}>
      <style>{CSS}</style>
      <div className="gc">
        <header className="gc-head">
          <div>
            <h2>Estimate your drainage gravel</h2>
            <p>Work out how much gravel, how many bags, and how much filter fabric your French drain needs, with the pipe volume already subtracted.</p>
          </div>
          <div className="gc-seg" role="group" aria-label="Measurement unit">
            {(["ft", "in", "m"] as Unit[]).map((u) => (
              <button key={u} type="button" aria-pressed={unit === u} onClick={() => changeUnit(u)}>
                {u === "ft" ? "Feet" : u === "in" ? "Inches" : "Metric"}
              </button>
            ))}
          </div>
        </header>

        <div className="gc-layout">
          {/* ============ LEFT: inputs ============ */}
          <div className="gc-col">
            <section className="gc-card">
              <h3><span className="ic"><IconRuler /></span>Trench size</h3>
              <p className="desc">Enter the run length and the width you plan to dig. Depth is worked out from the layers below.</p>
              <div className="gc-grid">
                <NumField label="Trench length" value={length} onChange={setLength} suffix={unit} error={errs.length} />
                <NumField label="Trench width" value={trenchWidth} onChange={setTrenchWidth} suffix={unit} error={errs.width} />
              </div>
              <div className="gc-callout">
                <strong>Calculated depth: {fmt(depthDisp)} {unit}</strong> (gravel base + pipe + gravel cover)
              </div>
            </section>

            <section className="gc-card">
              <h3><span className="ic"><IconPipe /></span>Pipe and gravel layers</h3>
              <p className="desc">Pick a pipe size, then set how much gravel goes under and over it.</p>

              <div className="gc-label" style={{ marginBottom: 8 }}>Pipe size (nominal)</div>
              <div className="gc-chips" role="group" aria-label="Pipe size">
                {PIPE_PRESETS.map((p) => (
                  <button key={p.label} type="button" className="gc-chip" aria-pressed={activePipe?.od === p.od} onClick={() => pickPipe(p.od)}>
                    {p.label} pipe
                  </button>
                ))}
              </div>
              <p className="gc-hint" style={{ margin: "8px 0 16px" }}>
                {activePipe ? `Outside diameter set to ${activePipe.od} in.` : "Custom outside diameter in use."} Check your pipe's label for the exact value.
              </p>

              <div className="gc-grid">
                <NumField label="Pipe outside diameter" value={pipeDiameter} onChange={setPipeDiameter} suffix={unit} error={errs.pipe} />
                <NumField label="Gravel below pipe" value={baseDepth} onChange={setBaseDepth} suffix={unit} hint="Bedding under the pipe." />
                <NumField label="Gravel above pipe" value={coverDepth} onChange={setCoverDepth} suffix={unit} hint="Cover over the pipe." />
              </div>
            </section>

            <section className="gc-card">
              <h3><span className="ic"><IconGravel /></span>Material and ordering</h3>
              <p className="desc">Choose a gravel type to fill in a typical weight, then add allowances for waste and settling.</p>

              <div className="gc-label" style={{ marginBottom: 8 }}>Gravel type</div>
              <div className="gc-chips" role="group" aria-label="Gravel type">
                {GRAVEL_PRESETS.map((g) => (
                  <button key={g.name} type="button" className="gc-chip" aria-pressed={activeGravel?.name === g.name} onClick={() => pickGravel(g.lb)}>
                    {g.name}
                  </button>
                ))}
              </div>

              <div className="gc-sub">Quantities</div>
              <div className="gc-grid">
                <NumField label="Extra for waste" value={waste} onChange={setWaste} suffix="%" hint="Typical: 5–15%." error={errs.waste} />
                <NumField label="Compaction allowance" value={compaction} onChange={setCompaction} suffix="%" hint="Extra for settling." error={errs.compaction} />
                <NumField label="Bag size" value={bagSize} onChange={setBagSize} suffix={volumeLabel(unit)} hint="Printed on the bag." error={errs.bag} />
                <NumField label="Bulk density" value={density} onChange={setDensity} suffix={metric ? "kg/m³" : "lb/cu ft"} hint="Ask your supplier." error={errs.density} />
              </div>
            </section>

            <section className="gc-card">
              <h3><span className="ic"><IconTag /></span>Cost (optional)</h3>
              <p className="desc">Enter your supplier's price to see a total.</p>
              <div className="gc-grid">
                <label className="gc-field">
                  <span className="gc-label">Priced by</span>
                  <select className="gc-select" value={priceBasis} onChange={(e) => setPriceBasis(e.target.value as PriceBasis)}>
                    <option value="volume">{metric ? "Cubic metre" : "Cubic yard"}</option>
                    <option value="weight">{metric ? "Tonne" : "Ton"}</option>
                    <option value="bag">Bag</option>
                  </select>
                </label>
                <label className="gc-field">
                  <span className="gc-label">Currency</span>
                  <select className="gc-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {["$", "€", "£", "₹"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <NumField label="Price" value={price} onChange={setPrice} suffix={priceSuffix} />
              </div>
            </section>
          </div>

          {/* ============ RIGHT: results (whole column is sticky) ============ */}
          <aside className="gc-col gc-aside" aria-live="polite">
            {invalid ? (
              <div role="alert" className="gc-error">
                <strong>Fix these to see your estimate:</strong>
                <ul>{messages.map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            ) : (
              <>
                <section className="gc-result">
                  <div className="top">
                    <span className="kicker">Gravel to order</span>
                    <button type="button" className="gc-btn" onClick={copyResults}>
                      {copied ? <IconCheck /> : <IconCopy />} {copied ? "Copied" : "Copy summary"}
                    </button>
                  </div>
                  <div className="gc-big">
                    {fmt(volumeOf(r.orderVolume, unit))}
                    <small>{volumeLabel(unit)}</small>
                  </div>
                  <div className="gc-sub-line">About {fmt(r.cubicYards)} cubic yards, including {fmt(waste, 1)}% waste</div>

                  <div className="gc-metrics">
                    <div className="gc-metric"><div className="l">Bags needed</div><div className="v">{r.bags}</div></div>
                    <div className="gc-metric"><div className="l">Weight</div><div className="v">{weightText}</div></div>
                    <div className="gc-metric"><div className="l">Filter fabric</div><div className="v">{fabricText}</div></div>
                    <div className="gc-metric"><div className="l">Trench depth</div><div className="v">{fmt(depthDisp)} {unit}</div></div>
                    {r.cost > 0 && (
                      <div className="gc-metric wide"><div className="l">Estimated cost</div><div className="v">{currency}{fmt(r.cost)}</div></div>
                    )}
                  </div>

                  <div className="gc-diagram">
                    <TrenchDiagram widthFt={r.widthFt} baseFt={r.baseFt} pipeFt={r.pipeFt} coverFt={r.coverFt} unit={unit} />
                  </div>
                </section>

                <section className="gc-card">
                  <h3>Where the gravel goes</h3>
                  <div className="gc-bar" role="img" aria-label="Share of gravel by layer">
                    <div style={{ width: `${pct(r.layerCover)}%`, background: "#0f766e" }} />
                    <div style={{ width: `${pct(r.layerPipeZone)}%`, background: "#6ee7d4" }} />
                    <div style={{ width: `${pct(r.layerBase)}%`, background: "#17313a" }} />
                  </div>
                  <div className="gc-legend">
                    <span><i style={{ background: "#0f766e" }} />Cover {fmt(pct(r.layerCover), 0)}%</span>
                    <span><i style={{ background: "#6ee7d4" }} />Around pipe {fmt(pct(r.layerPipeZone), 0)}%</span>
                    <span><i style={{ background: "#17313a" }} />Base {fmt(pct(r.layerBase), 0)}%</span>
                  </div>

                  <div className="gc-rows">
                    <div className="gc-row"><span>Trench volume</span><span>{vol(r.grossVolume)}</span></div>
                    <div className="gc-row"><span>Minus pipe</span><span>− {vol(r.pipeVolume)}</span></div>
                    <div className="gc-row"><span>Gravel needed</span><span>{vol(r.netVolume)}</span></div>
                    <div className="gc-row"><span>With compaction ({fmt(compaction, 1)}%)</span><span>{vol(r.afterCompaction)}</span></div>
                    <div className="gc-row total"><span>Order quantity (with waste)</span><span>{vol(r.orderVolume)}</span></div>
                  </div>
                </section>
              </>
            )}

            <p className="gc-note">
              <strong>Estimate only.</strong> This assumes a straight, rectangular trench with a round pipe along its full length. It does not set trench slope, pipe size, gravel grade, or fabric type, and it does not check local code. Confirm bulk density and bag volume with your supplier.
            </p>
          </aside>
        </div>
      </div>
    </ToolShell>
  );
}