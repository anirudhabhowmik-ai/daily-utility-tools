"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

/**
 * Open-Meteo's free endpoints are for NON-COMMERCIAL use only.
 * If your site is commercial (ads, paid plans, etc.), buy an Open-Meteo
 * plan and put the key here. The key is visible in the browser, so for
 * production it is better to proxy these two requests through your own
 * API route. Leave empty to use the free endpoints.
 */
const OPEN_METEO_API_KEY = "";

const FORECAST_URL = OPEN_METEO_API_KEY
  ? "https://customer-api.open-meteo.com/v1/forecast"
  : "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = OPEN_METEO_API_KEY
  ? "https://customer-geocoding-api.open-meteo.com/v1/search"
  : "https://geocoding-api.open-meteo.com/v1/search";
const KEY_PARAM = OPEN_METEO_API_KEY ? `&apikey=${encodeURIComponent(OPEN_METEO_API_KEY)}` : "";

/* ------------------------------------------------------------------ */
/* Types & data                                                        */
/* ------------------------------------------------------------------ */

type Place = { name: string; detail: string; lat: number; lon: number; tz: string };
type Forecast = { times: number[]; cloud: number[] };
type ForecastState = "idle" | "loading" | "ready" | "error";
type Tone = "great" | "good" | "fair" | "poor" | "none";

type SkyLevel = {
  value: number;
  title: string;
  nelm: number;
  nelmRange: string;
  sqm: string;
  color: string;
  dark: boolean;
  description: string;
  example: string;
};

type Estimate = {
  stars: number;
  lower: number;
  upper: number;
  nelm: number;
  clear: number;
  daylight: boolean;
  score: number;
  label: string;
  tone: Tone;
  pleiades: number;
};

type MoonInfo = {
  illum: number;
  alt: number | null;
  up: boolean;
  effect: number;
  phase: string;
  emoji: string;
  source: "computed" | "manual";
};

type Evaluation = {
  ms: number;
  cloud: number;
  cloudSource: "live" | "manual";
  sunAlt: number | null;
  moon: MoonInfo;
  est: Estimate;
};

const STORE_KEY = "star-counter-pro-v1";

const SKY_LEVELS: SkyLevel[] = [
  { value: 1, title: "Bortle 1 – Excellent dark sky", nelm: 7.8, nelmRange: "7.6–8.0", sqm: "≥ 21.9", color: "#04060d", dark: true, description: "Extremely dark skies with very little artificial light.", example: "Remote deserts, high mountains, far from any town" },
  { value: 2, title: "Bortle 2 – Typical dark sky", nelm: 7.3, nelmRange: "7.1–7.5", sqm: "21.7–21.9", color: "#090e1c", dark: true, description: "Very dark skies, usually away from towns and cities.", example: "Remote countryside and national parks" },
  { value: 3, title: "Bortle 3 – Rural sky", nelm: 6.8, nelmRange: "6.6–7.0", sqm: "21.3–21.7", color: "#101a33", dark: true, description: "Some light pollution near the horizon, but a dark sky overhead.", example: "Rural areas with distant village glow" },
  { value: 4, title: "Bortle 4 – Rural / suburban transition", nelm: 6.3, nelmRange: "6.1–6.5", sqm: "20.4–21.3", color: "#1d2c4d", dark: true, description: "Light pollution is noticeable, especially toward nearby towns.", example: "Countryside within ~20 km of a city" },
  { value: 5, title: "Bortle 5 – Suburban sky", nelm: 5.8, nelmRange: "5.6–6.0", sqm: "19.5–20.4", color: "#364a70", dark: true, description: "The sky is moderately affected by artificial lighting.", example: "Quiet suburbs and small towns" },
  { value: 6, title: "Bortle 6 – Bright suburban sky", nelm: 5.3, nelmRange: "5.1–5.5", sqm: "18.9–19.5", color: "#6a7ca0", dark: true, description: "Only brighter stars are easy to see.", example: "Busy suburbs, edge of a big city" },
  { value: 7, title: "Bortle 7 – Suburban / urban transition", nelm: 4.8, nelmRange: "4.6–5.0", sqm: "18.4–18.9", color: "#a4aec4", dark: false, description: "Many faint stars disappear because of city lighting.", example: "Dense suburbs, outskirts of large cities" },
  { value: 8, title: "Bortle 8 – City sky", nelm: 4.3, nelmRange: "4.1–4.5", sqm: "17.8–18.4", color: "#d3d6de", dark: false, description: "Only a small number of bright stars may be visible.", example: "Most city neighbourhoods" },
  { value: 9, title: "Bortle 9 – Inner-city sky", nelm: 3.9, nelmRange: "≤ 4.0", sqm: "< 17.8", color: "#eeeceb", dark: false, description: "Severe light pollution makes most stars difficult to see.", example: "Downtown cores, brightly lit city centres" },
];

const QUICK_PICKS: { label: string; value: number }[] = [
  { label: "City centre", value: 8 },
  { label: "Suburb", value: 6 },
  { label: "Countryside", value: 4 },
  { label: "Dark-sky site", value: 2 },
];

/* log10 of the whole-sky count of stars brighter than magnitude m */
const MAG_TABLE: [number, number][] = [
  [0, 0.6], [1, 1.18], [2, 1.68], [3, 2.23], [4, 2.71],
  [5, 3.2], [6, 3.68], [7, 4.15], [8, 4.62],
];

/* ------------------------------------------------------------------ */
/* Math & astronomy helpers                                            */
/* ------------------------------------------------------------------ */

const RAD = Math.PI / 180;
const HOUR = 3600000;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const norm360 = (x: number) => ((x % 360) + 360) % 360;
const julianDay = (ms: number) => ms / 86400000 + 2440587.5;

function starsBrighterThan(m: number): number {
  let log10: number;
  if (m <= 0) log10 = 0.6 + m * 0.5;
  else if (m >= 8) log10 = 4.62 + (m - 8) * 0.46;
  else {
    const i = Math.floor(m);
    const [, v0] = MAG_TABLE[i];
    const [, v1] = MAG_TABLE[i + 1];
    log10 = v0 + (v1 - v0) * (m - i);
  }
  return Math.pow(10, log10);
}

function roundNice(n: number): number {
  if (n < 20) return Math.round(n);
  if (n < 100) return Math.round(n / 5) * 5;
  if (n < 1000) return Math.round(n / 10) * 10;
  return Math.round(n / 50) * 50;
}

function sunPos(ms: number) {
  const n = julianDay(ms) - 2451545.0;
  const L = norm360(280.46 + 0.9856474 * n);
  const g = norm360(357.528 + 0.9856003 * n) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * n) * RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  return { lambda, ra, dec };
}

function altitudeOf(ra: number, dec: number, ms: number, lat: number, lon: number) {
  const d = julianDay(ms) - 2451545.0;
  const gmst = norm360(280.46061837 + 360.98564736629 * d);
  const ha = (gmst + lon) * RAD - ra;
  const l = lat * RAD;
  const s = Math.sin(l) * Math.sin(dec) + Math.cos(l) * Math.cos(dec) * Math.cos(ha);
  return Math.asin(clamp(s, -1, 1)) / RAD;
}

function sunAltitude(ms: number, lat: number, lon: number) {
  const s = sunPos(ms);
  return altitudeOf(s.ra, s.dec, ms, lat, lon);
}

const PHASES = [
  "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
  "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent",
];
const PHASE_EMOJI = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];

function moonAt(ms: number, place?: { lat: number; lon: number } | null) {
  const d = julianDay(ms) - 2451545.0;
  const L = norm360(218.316 + 13.176396 * d);
  const M = norm360(134.963 + 13.064993 * d) * RAD;
  const F = norm360(93.272 + 13.22935 * d) * RAD;
  const lam = (L + 6.289 * Math.sin(M)) * RAD;
  const bet = 5.128 * Math.sin(F) * RAD;
  const sun = sunPos(ms);

  const elong = Math.acos(clamp(Math.cos(bet) * Math.cos(lam - sun.lambda), -1, 1));
  const illum = (1 - Math.cos(elong)) / 2;
  const angle = norm360((lam - sun.lambda) / RAD);
  const idx = Math.floor(((angle + 22.5) % 360) / 45);

  let alt: number | null = null;
  if (place) {
    const eps = (23.439 - 0.0000004 * d) * RAD;
    const ra = Math.atan2(Math.sin(lam) * Math.cos(eps) - Math.tan(bet) * Math.sin(eps), Math.cos(lam));
    const dec = Math.asin(Math.sin(bet) * Math.cos(eps) + Math.cos(bet) * Math.sin(eps) * Math.sin(lam));
    alt = altitudeOf(ra, dec, ms, place.lat, place.lon) - 0.9;
  }

  return { illum, alt, phase: PHASES[idx], emoji: PHASE_EMOJI[idx] };
}

function darknessWindow(now: number, lat: number, lon: number) {
  const step = 10 * 60000;
  const from = now - 12 * HOUR;
  const to = now + 36 * HOUR;
  const segs: { start: number; end: number }[] = [];
  let segStart: number | null = null;
  let minAlt = 90;

  for (let t = from; t <= to; t += step) {
    const a = sunAltitude(t, lat, lon);
    if (a < minAlt) minAlt = a;
    const dark = a < -18;
    if (dark && segStart === null) segStart = t;
    if (!dark && segStart !== null) {
      segs.push({ start: segStart, end: t });
      segStart = null;
    }
  }
  if (segStart !== null) segs.push({ start: segStart, end: to });

  return { window: segs.find((s) => s.end > now) ?? null, minAlt };
}

/* ------------------------------------------------------------------ */
/* Star-count model                                                    */
/* ------------------------------------------------------------------ */

function estimate(input: { bortle: number; cloud: number; moonEffect: number; sunAlt: number | null }): Estimate {
  const { bortle, cloud, moonEffect, sunAlt } = input;
  const level = SKY_LEVELS[bortle - 1];

  const darkScale = Math.max(0.2, 1 - (bortle - 1) / 10);
  const moonLoss = 1.7 * Math.pow(clamp(moonEffect, 0, 1), 0.8) * darkScale;
  const twilightLoss = sunAlt !== null && sunAlt > -18 ? 0.28 * (sunAlt + 18) : 0;
  const hazeLoss = 0.6 * (cloud / 100);
  const nelm = level.nelm - moonLoss - twilightLoss - hazeLoss;

  const clear = clamp(1 - cloud / 100, 0, 1);
  const daylight = sunAlt !== null && sunAlt > -0.83;

  const raw = daylight ? 0 : starsBrighterThan(nelm) * 0.2 * Math.pow(clear, 1.2);
  const stars = roundNice(raw);
  const lower = roundNice(raw * 0.75);
  const upper = roundNice(raw * 1.25);
  const score = Math.round(100 * Math.sqrt(Math.min(1, raw / 5000)));

  let label = "Poor visibility";
  let tone: Tone = "poor";
  if (daylight) { label = "Daylight"; tone = "none"; }
  else if (clear < 0.1) { label = "Overcast"; tone = "none"; }
  else if (raw >= 3000) { label = "Excellent visibility"; tone = "great"; }
  else if (raw >= 1200) { label = "Very good visibility"; tone = "great"; }
  else if (raw >= 400) { label = "Good visibility"; tone = "good"; }
  else if (raw >= 120) { label = "Fair visibility"; tone = "fair"; }

  const pleiades = nelm >= 6.5 ? 12 : nelm >= 6 ? 9 : nelm >= 5.5 ? 8 : nelm >= 5 ? 7 : nelm >= 4.5 ? 6 : nelm >= 4 ? 4 : 0;

  return { stars, lower, upper, nelm, clear, daylight, score, label, tone, pleiades };
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

function fmt(ms: number, tz: string | undefined, opts: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat(undefined, { ...opts, timeZone: tz }).format(ms);
  } catch {
    return new Intl.DateTimeFormat(undefined, opts).format(ms);
  }
}

function sunLabel(alt: number | null) {
  if (alt === null) return "Assumed dark";
  if (alt > -0.83) return "Daylight";
  if (alt > -6) return "Civil twilight";
  if (alt > -12) return "Nautical twilight";
  if (alt > -18) return "Astro. twilight";
  return "Full darkness";
}

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * e;
      fromRef.current = p >= 1 ? target : v;
      setValue(Math.round(v));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

/* ------------------------------------------------------------------ */
/* Animated starfield                                                  */
/* ------------------------------------------------------------------ */

const TINTS = ["255,255,255", "205,225,255", "255,240,210", "255,255,255"];

const FIELD = (() => {
  let seed = 20260101;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const count = 1100;
  return Array.from({ length: count }, (_, i) => {
    const b = 1 - i / count;
    return {
      x: rand(),
      y: Math.pow(rand(), 1.15) * 0.92,
      r: 0.45 + 1.25 * Math.pow(b, 3),
      a: 0.45 + 0.55 * Math.pow(b, 0.6),
      phase: rand() * Math.PI * 2,
      speed: 0.6 + rand() * 1.8,
      tint: Math.floor(rand() * 4),
    };
  });
})();

function Starfield(props: { stars: number; cloud: number; moonIllum: number; moonUp: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  const drawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    propsRef.current = props;
    drawRef.current?.();
  }, [props.stars, props.cloud, props.moonIllum, props.moonUp]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let dpr = 1;
    let raf = 0;
    let last = 0;

    const draw = (t: number) => {
      const { stars, cloud, moonIllum, moonUp } = propsRef.current;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const n = Math.min(FIELD.length, Math.round(Math.pow(Math.max(0, stars), 0.78) * 1.6));
      const dim = 1 - (cloud / 100) * 0.6;

      for (let i = 0; i < n; i++) {
        const s = FIELD[i];
        const tw = reduce ? 1 : 0.8 + 0.2 * Math.sin((t / 1000) * s.speed + s.phase);
        ctx.fillStyle = `rgba(${TINTS[s.tint]},${(s.a * tw * dim).toFixed(3)})`;
        if (s.r < 1) {
          ctx.fillRect(s.x * w, s.y * h, s.r * 1.4, s.r * 1.4);
        } else {
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (moonUp && moonIllum > 0.02) {
        const mx = w * 0.86;
        const my = h * 0.2;
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, 140);
        g.addColorStop(0, `rgba(255,244,214,${0.35 * moonIllum + 0.05})`);
        g.addColorStop(1, "rgba(255,244,214,0)");
        ctx.fillStyle = g;
        ctx.fillRect(mx - 140, my - 140, 280, 280);
        ctx.beginPath();
        ctx.arc(mx, my, 13, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,247,226,${0.3 + 0.65 * moonIllum})`;
        ctx.fill();
      }
    };

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      draw(performance.now());
    };

    drawRef.current = () => draw(performance.now());
    resize();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    const loop = (t: number) => {
      if (t - last > 33) {
        last = t;
        draw(t);
      }
      raf = requestAnimationFrame(loop);
    };
    if (!reduce) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      drawRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" />;
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
  pin: "M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z",
  copy: "M9 9h10v10H9zM5 15V5h10",
  reset: "M4 4v6h6M20 20v-6h-6M20 10A8 8 0 006.3 6.3L4 10m16 4l-2.3 3.7A8 8 0 014 14",
};

function Card({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="sc-card">
      <div className="sc-card-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Slider({
  label,
  value,
  onChange,
  disabled,
  hint,
  left,
  right,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  hint?: string;
  left: string;
  right: string;
}) {
  const id = useId();
  const fill = disabled ? "#c9d0dc" : "#ff5a1f";
  return (
    <div className={`sc-slider ${disabled ? "is-disabled" : ""}`}>
      <div className="sc-slider-head">
        <label htmlFor={id}>{label}</label>
        <span className="sc-badge">{value}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ background: `linear-gradient(to right, ${fill} ${value}%, #e6eaf1 ${value}%)` }}
      />
      <div className="sc-slider-scale">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      {hint && <p className="sc-hint">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function StarCounterTool() {
  const searchRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef(false);
  const forecastReq = useRef(0);
  const toastTimer = useRef<number | undefined>(undefined);

  const [now, setNow] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const [bortle, setBortle] = useState(6);
  const [manualCloud, setManualCloud] = useState(10);
  const [manualMoon, setManualMoon] = useState(25);
  const [auto, setAuto] = useState(true);

  const [place, setPlace] = useState<Place | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [locMsg, setLocMsg] = useState("");

  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [forecastState, setForecastState] = useState<ForecastState>("idle");
  /* Selected hour stored as a timestamp (null = "now") so the selection
     stays on the same hour when the clock rolls over. */
  const [selectedMs, setSelectedMs] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  }, []);

  /* ---------- live forecast ---------- */

  const loadForecast = useCallback(async (p: Place) => {
    const id = ++forecastReq.current;
    setForecastState("loading");
    try {
      const url =
        `${FORECAST_URL}?latitude=${p.lat}&longitude=${p.lon}` +
        `&hourly=cloud_cover&forecast_days=3&timezone=auto&timeformat=unixtime${KEY_PARAM}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      if (id !== forecastReq.current) return;

      const times: unknown = data?.hourly?.time;
      const cloud: unknown = data?.hourly?.cloud_cover;
      if (!Array.isArray(times) || !Array.isArray(cloud)) throw new Error("bad data");

      setForecast({
        times: times.map((t) => Number(t) * 1000),
        cloud: cloud.map((c) => (typeof c === "number" ? c : NaN)),
      });
      if (typeof data.timezone === "string") {
        const tz = data.timezone as string;
        setPlace((prev) => (prev && prev.lat === p.lat && prev.lon === p.lon ? { ...prev, tz } : prev));
      }
      setForecastState("ready");
    } catch {
      if (id === forecastReq.current) {
        setForecast(null);
        setForecastState("error");
      }
    }
  }, []);

  /* ---------- mount: clock + restore saved settings ---------- */

  useEffect(() => {
    setNow(Date.now());
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Number.isInteger(s.bortle) && s.bortle >= 1 && s.bortle <= 9) setBortle(s.bortle);
        if (typeof s.manualCloud === "number") setManualCloud(clamp(s.manualCloud, 0, 100));
        if (typeof s.manualMoon === "number") setManualMoon(clamp(s.manualMoon, 0, 100));
        const p = s.place;
        if (
          p &&
          typeof p.name === "string" &&
          typeof p.lat === "number" &&
          typeof p.lon === "number" &&
          Math.abs(p.lat) <= 90 &&
          Math.abs(p.lon) <= 180
        ) {
          const restored: Place = {
            name: p.name,
            detail: typeof p.detail === "string" ? p.detail : "",
            lat: p.lat,
            lon: p.lon,
            tz: typeof p.tz === "string" ? p.tz : Intl.DateTimeFormat().resolvedOptions().timeZone,
          };
          setPlace(restored);
          setQuery(restored.detail ? `${restored.name}, ${restored.detail}` : restored.name);
          void loadForecast(restored);
        }
      }
    } catch {
      /* ignore corrupted storage */
    }
    setHydrated(true);

    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(toastTimer.current);
    };
  }, [loadForecast]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ bortle, manualCloud, manualMoon, place }));
    } catch {
      /* storage unavailable */
    }
  }, [hydrated, bortle, manualCloud, manualMoon, place]);

  /* ---------- city search (debounced) ---------- */

  useEffect(() => {
    if (!typingRef.current) return;
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      setSearchError("");
      return;
    }

    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const url = `${GEOCODE_URL}?name=${encodeURIComponent(q)}&count=5&language=en&format=json${KEY_PARAM}`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        const results: Place[] = (Array.isArray(data?.results) ? data.results : [])
          .filter((r: { latitude?: unknown; longitude?: unknown }) => typeof r.latitude === "number" && typeof r.longitude === "number")
          .map(
            (r: { name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string }) => ({
              name: r.name,
              detail: [r.admin1, r.country].filter(Boolean).join(", "),
              lat: r.latitude,
              lon: r.longitude,
              tz: r.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            })
          );
        setSuggestions(results);
        if (results.length === 0) setSearchError("No matching places found.");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
          setSearchError("Place search is unavailable right now. You can still set conditions manually.");
        }
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  /* ---------- place actions ---------- */

  const selectPlace = (p: Place) => {
    typingRef.current = false;
    setPlace(p);
    setQuery(p.detail ? `${p.name}, ${p.detail}` : p.name);
    setSuggestions([]);
    setSearchError("");
    setLocMsg("");
    setOpen(false);
    setAuto(true);
    setSelectedMs(null);
    void loadForecast(p);
  };

  const clearPlace = () => {
    forecastReq.current++;
    typingRef.current = false;
    setPlace(null);
    setForecast(null);
    setForecastState("idle");
    setQuery("");
    setSuggestions([]);
    setSearchError("");
    setLocMsg("");
    setSelectedMs(null);
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocMsg("Your browser does not support location detection.");
      return;
    }
    setLocMsg("Requesting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        selectPlace({
          name: "My location",
          detail: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
          lat: latitude,
          lon: longitude,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        setLocMsg("Location detected. Choose the light-pollution level for your area.");
      },
      (err) => {
        setLocMsg(
          err.code === 1
            ? "Location permission was denied. Search for your city instead."
            : "Location is not available right now. Search for your city instead."
        );
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  /* ---------- evaluation ---------- */

  const live = auto && !!place;
  const tz = place?.tz;

  /* The forecast's hour boundaries sit at the location's local hours, which
     are offset from UTC hours in zones like India (+5:30). Align to them. */
  const hourOffset = useMemo(
    () => (forecast && forecast.times.length ? ((forecast.times[0] % HOUR) + HOUR) % HOUR : 0),
    [forecast]
  );

  const cloudByHour = useMemo(() => {
    const map = new Map<number, number>();
    if (forecast) {
      forecast.times.forEach((t, i) => {
        const c = forecast.cloud[i];
        if (Number.isFinite(c)) map.set(Math.round((t - hourOffset) / HOUR), c);
      });
    }
    return map;
  }, [forecast, hourOffset]);

  const evaluate = useCallback(
    (ms: number): Evaluation => {
      let cloud = manualCloud;
      let cloudSource: "live" | "manual" = "manual";
      let sunAlt: number | null = null;
      let moon: MoonInfo;

      if (live && place) {
        const liveCloud = cloudByHour.get(Math.floor((ms - hourOffset) / HOUR));
        if (liveCloud !== undefined) {
          cloud = liveCloud;
          cloudSource = "live";
        }
        sunAlt = sunAltitude(ms, place.lat, place.lon);
        const m = moonAt(ms, place);
        const alt = m.alt ?? -90;
        const factor = alt <= 0 ? 0 : clamp(Math.sin(alt * RAD) * 1.6, 0, 1);
        moon = { illum: m.illum, alt: m.alt, up: alt > 0, effect: m.illum * factor, phase: m.phase, emoji: m.emoji, source: "computed" };
      } else {
        moon = {
          illum: manualMoon / 100,
          alt: null,
          up: manualMoon > 0,
          effect: manualMoon / 100,
          phase: "Manual setting",
          emoji: "🌙",
          source: "manual",
        };
      }

      return { ms, cloud, cloudSource, sunAlt, moon, est: estimate({ bortle, cloud, moonEffect: moon.effect, sunAlt }) };
    },
    [live, place, cloudByHour, hourOffset, manualCloud, manualMoon, bortle]
  );

  const hours = useMemo(() => {
    if (!live || now === 0) return [];
    const start = Math.floor((now - hourOffset) / HOUR) * HOUR + hourOffset;
    return Array.from({ length: 24 }, (_, i) => evaluate(i === 0 ? now : start + i * HOUR));
  }, [live, now, evaluate, hourOffset]);

  const safeIdx = useMemo(() => {
    if (!hours.length || selectedMs === null) return 0;
    const i = hours.findIndex((h) => h.ms === selectedMs);
    return i < 0 ? 0 : i;
  }, [hours, selectedMs]);

  const current: Evaluation = useMemo(
    () => (hours.length ? hours[safeIdx] : evaluate(now)),
    [hours, safeIdx, evaluate, now]
  );

  const bestIdx = useMemo(() => {
    let best = 0;
    hours.forEach((h, i) => {
      if (h.est.stars > hours[best].est.stars) best = i;
    });
    return best;
  }, [hours]);

  const maxStars = useMemo(() => Math.max(1, ...hours.map((h) => h.est.stars)), [hours]);

  const darkness = useMemo(
    () => (place && now ? darknessWindow(now, place.lat, place.lon) : null),
    [place, now]
  );
  const moonToday = useMemo(() => (now ? moonAt(now, place) : null), [now, place]);

  const level = SKY_LEVELS[bortle - 1];
  const est = current.est;
  const count = useCountUp(est.stars);

  const highlights = useMemo(() => {
    const visible = !est.daylight && est.clear >= 0.3;
    return [
      { icon: "🔭", label: "Big Dipper", note: "All seven stars", ok: visible && est.nelm >= 3.6 },
      { icon: "🌌", label: "Orion Nebula (M42)", note: "Fuzzy naked-eye glow", ok: visible && est.nelm >= 4.6 },
      { icon: "✨", label: "Pleiades cluster", note: est.pleiades > 0 && visible ? `About ${est.pleiades} stars` : "Not resolved", ok: visible && est.pleiades > 0 },
      { icon: "🌀", label: "Andromeda Galaxy", note: "Requires a dark sky", ok: visible && est.nelm >= 5.9 },
      { icon: "🌠", label: "Milky Way band", note: "Needs very dark, clear skies", ok: visible && est.nelm >= 6.2 },
      { icon: "🪐", label: "Planets & bright stars", note: "Visible in almost any sky", ok: !est.daylight && est.clear >= 0.2 },
    ];
  }, [est]);

  /* ---------- actions ---------- */

  const resetAll = () => {
    forecastReq.current++;
    typingRef.current = false;
    setBortle(6);
    setManualCloud(10);
    setManualMoon(25);
    setAuto(true);
    setPlace(null);
    setForecast(null);
    setForecastState("idle");
    setQuery("");
    setSuggestions([]);
    setSearchError("");
    setLocMsg("");
    setSelectedMs(null);
  };

  const buildReport = () => {
    const when = now ? fmt(current.ms, tz, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
    return [
      "Star Counter report",
      place ? `Location: ${place.name}${place.detail ? `, ${place.detail}` : ""}` : "Location: not set (manual conditions)",
      `Time: ${when}`,
      `Estimated visible stars: about ${est.stars.toLocaleString()} (range ${est.lower.toLocaleString()}–${est.upper.toLocaleString()})`,
      `Rating: ${est.label} · score ${est.score}/100`,
      `Faint-star limit: magnitude ${Math.max(0, est.nelm).toFixed(1)}`,
      `Light pollution: Bortle ${bortle}`,
      `Cloud cover: ${Math.round(current.cloud)}% (${current.cloudSource === "live" ? "live forecast" : "manual"})`,
      `Moon: ${Math.round(current.moon.illum * 100)}% illuminated${current.moon.source === "computed" ? `, ${current.moon.up ? "above" : "below"} the horizon` : " (manual)"}`,
    ].join("\n");
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildReport());
      showToast("Report copied to clipboard");
    } catch {
      showToast("Copy isn't supported in this browser");
    }
  };

  const matchMoonToday = () => {
    if (!moonToday) return;
    setManualMoon(Math.round((moonToday.illum * 100) / 5) * 5);
    showToast(`Set to today's ${moonToday.phase.toLowerCase()}`);
  };

  const selectHour = (i: number) => {
    setSelectedMs(i === 0 ? null : hours[i]?.ms ?? null);
  };

  /* ---------- derived display ---------- */

  const captionTime = now
    ? fmt(current.ms, tz, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "";
  const captionPlace = place ? place.name : "your device's local time";
  const nelmShown = Math.max(0, est.nelm);
  const hasWindow = !!darkness?.window;

  /* ---------- render ---------- */

  return (
    <div className="sc-root">
      <style jsx global>{`
        .sc-root {
          --sc-accent: #ff5a1f;
          --sc-accent-dark: #e94b13;
          --sc-ink: #172033;
          --sc-muted: #7a8497;
          --sc-border: #e5eaf2;
          width: 100%;
          min-width: 0;
          color: var(--sc-ink);
          box-sizing: border-box;
        }
        .sc-root *,
        .sc-root *::before,
        .sc-root *::after {
          box-sizing: border-box;
        }
        .sc-root button,
        .sc-root input,
        .sc-root select {
          font-family: inherit;
        }

        /* ---------- Hero ---------- */
        .sc-hero {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          border-radius: 26px;
          color: #fff;
          background: linear-gradient(180deg, #050816 0%, #0b1230 55%, #151b40 100%);
          box-shadow: 0 22px 54px rgba(8, 12, 40, 0.35);
        }
        .sc-hero canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }
        .sc-horizon {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 60%;
          z-index: 1;
          pointer-events: none;
          background: linear-gradient(to top, rgba(255, 170, 90, 0.9), rgba(255, 140, 90, 0));
          transition: opacity 0.5s ease;
        }
        .sc-clouds {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background: radial-gradient(ellipse at 25% 35%, rgba(170, 184, 205, 0.6), transparent 55%),
            radial-gradient(ellipse at 75% 55%, rgba(150, 165, 190, 0.5), transparent 55%),
            radial-gradient(ellipse at 50% 85%, rgba(170, 184, 205, 0.45), transparent 60%);
          filter: blur(8px);
          transition: opacity 0.5s ease;
        }
        .sc-hero-body {
          position: relative;
          z-index: 3;
          padding: 40px 26px 22px;
          text-align: center;
        }
        .sc-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border: 1px solid rgba(125, 190, 255, 0.25);
          border-radius: 999px;
          background: rgba(125, 190, 255, 0.1);
          color: #bfe0ff;
          font-size: 12px;
          font-weight: 650;
        }
        .sc-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.2);
        }
        .sc-hero h2 {
          margin: 16px 0 0;
          font-size: clamp(24px, 4vw, 34px);
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .sc-hero-sub {
          max-width: 560px;
          margin: 10px auto 0;
          font-size: 14px;
          line-height: 1.65;
          color: #b9c4dd;
        }
        .sc-result {
          max-width: 560px;
          margin: 26px auto 0;
          padding: 22px 18px 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 22px;
          background: rgba(10, 16, 44, 0.55);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .sc-result-label {
          margin: 0;
          font-size: 13px;
          color: #b9c4dd;
        }
        .sc-count {
          margin: 6px 0 0;
          font-size: clamp(56px, 12vw, 92px);
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.03em;
          font-variant-numeric: tabular-nums;
          text-shadow: 0 0 40px rgba(160, 200, 255, 0.45);
        }
        .sc-range {
          margin: 10px 0 0;
          font-size: 13px;
          color: #b9c4dd;
        }
        .sc-pill {
          display: inline-block;
          margin-top: 14px;
          padding: 7px 16px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 750;
          background: rgba(125, 190, 255, 0.18);
          color: #cfe8ff;
        }
        .sc-pill[data-tone="great"] { background: rgba(52, 211, 153, 0.2); color: #86efc5; }
        .sc-pill[data-tone="good"] { background: rgba(96, 165, 250, 0.22); color: #bfdcff; }
        .sc-pill[data-tone="fair"] { background: rgba(251, 191, 36, 0.2); color: #fde68a; }
        .sc-pill[data-tone="poor"] { background: rgba(251, 146, 60, 0.22); color: #fdba74; }
        .sc-pill[data-tone="none"] { background: rgba(148, 163, 184, 0.25); color: #e2e8f0; }
        .sc-caption {
          margin: 16px 0 0;
          font-size: 12px;
          color: #93a0bd;
        }
        .sc-stats {
          position: relative;
          z-index: 3;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          padding: 0 22px 22px;
        }
        .sc-stat {
          padding: 13px 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          background: rgba(10, 16, 44, 0.5);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          min-width: 0;
        }
        .sc-stat span {
          display: block;
          font-size: 11px;
          color: #93a0bd;
        }
        .sc-stat strong {
          display: block;
          margin-top: 5px;
          font-size: 15px;
          font-weight: 750;
          color: #fff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sc-stat small {
          display: block;
          margin-top: 2px;
          font-size: 11px;
          color: #93a0bd;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ---------- Layout ---------- */
        .sc-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
          gap: 20px;
          align-items: start;
          margin-top: 20px;
        }
        .sc-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        .sc-side {
          position: sticky;
          top: 18px;
        }

        /* ---------- Cards ---------- */
        .sc-card {
          padding: 22px;
          border: 1px solid var(--sc-border);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 3px 12px rgba(20, 35, 60, 0.04);
          min-width: 0;
        }
        .sc-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }
        .sc-card-head h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 780;
          color: var(--sc-ink);
        }
        .sc-card-head p {
          margin: 4px 0 0;
          font-size: 12px;
          line-height: 1.6;
          color: var(--sc-muted);
        }
        .sc-label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #30394c;
        }
        .sc-hint {
          margin: 8px 0 0;
          font-size: 11px;
          line-height: 1.5;
          color: var(--sc-muted);
        }

        /* ---------- Buttons & inputs ---------- */
        .sc-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 10px 16px;
          border: 1px solid #dfe3eb;
          border-radius: 12px;
          background: #fff;
          color: #30394c;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.18s ease;
        }
        .sc-btn:hover:not(:disabled) {
          border-color: var(--sc-accent);
          color: var(--sc-accent);
        }
        .sc-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .sc-btn.primary {
          background: linear-gradient(135deg, #ff6b35, #ff5a1f);
          border-color: var(--sc-accent);
          color: #fff;
          box-shadow: 0 8px 20px rgba(255, 90, 31, 0.22);
        }
        .sc-btn.primary:hover:not(:disabled) {
          background: var(--sc-accent-dark);
          border-color: var(--sc-accent-dark);
          color: #fff;
        }
        .sc-btn.block { width: 100%; }
        .sc-link {
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
          white-space: nowrap;
        }
        .sc-link:hover { color: var(--sc-accent); }

        .sc-row {
          display: flex;
          gap: 10px;
        }
        .sc-input-wrap {
          position: relative;
          flex: 1;
          min-width: 0;
        }
        .sc-input {
          width: 100%;
          height: 46px;
          padding: 9px 13px;
          border: 1px solid #d8e0eb;
          border-radius: 12px;
          background: #fff;
          color: var(--sc-ink);
          font-size: 14px;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .sc-input:focus {
          border-color: var(--sc-accent);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
        }
        .sc-suggest {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 20;
          margin-top: 6px;
          overflow: hidden;
          border: 1px solid var(--sc-border);
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 16px 40px rgba(20, 35, 60, 0.16);
        }
        .sc-suggest button {
          display: block;
          width: 100%;
          padding: 11px 14px;
          border: 0;
          border-bottom: 1px solid #f0f2f6;
          background: #fff;
          text-align: left;
          cursor: pointer;
        }
        .sc-suggest button:last-child { border-bottom: 0; }
        .sc-suggest button:hover { background: #fff7f3; }
        .sc-suggest strong {
          display: block;
          font-size: 13px;
          color: var(--sc-ink);
        }
        .sc-suggest span {
          display: block;
          margin-top: 2px;
          font-size: 11px;
          color: var(--sc-muted);
        }
        .sc-suggest-note {
          padding: 12px 14px;
          font-size: 12px;
          color: var(--sc-muted);
        }
        .sc-chip-place {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 14px;
          padding: 11px 14px;
          border: 1px solid #ffe1d3;
          border-radius: 12px;
          background: #fff8f4;
        }
        .sc-chip-place strong {
          display: block;
          font-size: 13px;
          color: #87462e;
        }
        .sc-chip-place span {
          display: block;
          margin-top: 2px;
          font-size: 11px;
          color: #a8644a;
        }
        .sc-status {
          margin: 10px 0 0;
          font-size: 12px;
          color: var(--sc-muted);
        }
        .sc-status.err { color: #b42318; }

        /* ---------- Bortle picker ---------- */
        .sc-picks {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 14px;
        }
        .sc-chip {
          padding: 7px 13px;
          border: 1px solid #e1e5ec;
          border-radius: 999px;
          background: #fff;
          color: #465066;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .sc-chip:hover {
          border-color: var(--sc-accent);
          background: #fff7f3;
          color: var(--sc-accent);
        }
        .sc-bortle {
          display: grid;
          grid-template-columns: repeat(9, minmax(0, 1fr));
          gap: 6px;
        }
        .sc-bortle button {
          height: 54px;
          border: 2px solid transparent;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .sc-bortle button:hover { transform: translateY(-2px); }
        .sc-bortle button.active {
          border-color: var(--sc-accent);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.25);
          transform: translateY(-2px);
        }
        .sc-scale {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 11px;
          color: var(--sc-muted);
        }
        .sc-level {
          margin-top: 16px;
          padding: 16px;
          border: 1px solid var(--sc-border);
          border-radius: 14px;
          background: #fafbfd;
        }
        .sc-level h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 780;
        }
        .sc-level p {
          margin: 6px 0 0;
          font-size: 13px;
          line-height: 1.6;
          color: #5d677b;
        }
        .sc-level-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }
        .sc-level-meta div {
          padding: 10px 12px;
          border-radius: 10px;
          background: #fff;
          border: 1px solid #edf0f4;
        }
        .sc-level-meta span {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #8892a6;
        }
        .sc-level-meta strong {
          display: block;
          margin-top: 4px;
          font-size: 13px;
        }

        /* ---------- Forecast chart ---------- */
        .sc-chart {
          display: flex;
          align-items: stretch;
          gap: 3px;
          height: 150px;
        }
        .sc-bar-btn {
          position: relative;
          display: flex;
          flex: 1;
          align-items: flex-end;
          min-width: 0;
          padding: 0;
          border: 0;
          border-radius: 6px;
          background: #f4f6fa;
          cursor: pointer;
        }
        .sc-bar-btn[data-sun="day"] { background: #fff4dc; }
        .sc-bar-btn[data-sun="twi"] { background: #eaeeff; }
        .sc-bar-btn.sel { outline: 2px solid var(--sc-ink); outline-offset: 1px; }
        .sc-bar {
          width: 100%;
          min-height: 3px;
          border-radius: 6px 6px 3px 3px;
          background: linear-gradient(180deg, #ff8a5c, #ff5a1f);
          opacity: 0.7;
          transition: height 0.35s ease, opacity 0.2s ease;
        }
        .sc-bar-btn:hover .sc-bar,
        .sc-bar-btn.sel .sc-bar { opacity: 1; }
        .sc-moon-dot {
          position: absolute;
          top: 4px;
          left: 50%;
          width: 5px;
          height: 5px;
          margin-left: -2.5px;
          border-radius: 50%;
          background: #94a3b8;
        }
        .sc-axis {
          display: flex;
          gap: 3px;
          margin-top: 8px;
        }
        .sc-axis span {
          flex: 1;
          min-width: 0;
          font-size: 10px;
          color: var(--sc-muted);
          text-align: center;
          white-space: nowrap;
        }
        .sc-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 14px;
          font-size: 11px;
          color: var(--sc-muted);
        }
        .sc-legend i {
          display: inline-block;
          width: 10px;
          height: 10px;
          margin-right: 6px;
          border-radius: 3px;
          vertical-align: -1px;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
        }

        /* ---------- Highlights ---------- */
        .sc-hl-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .sc-hl {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border: 1px solid #edf0f4;
          border-radius: 14px;
          background: #fafbfd;
          opacity: 0.6;
        }
        .sc-hl.ok {
          border-color: #cdeedd;
          background: #f2fbf6;
          opacity: 1;
        }
        .sc-hl-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 11px;
          background: #fff;
          font-size: 19px;
          box-shadow: 0 1px 4px rgba(20, 35, 60, 0.08);
        }
        .sc-hl strong {
          display: block;
          font-size: 13px;
        }
        .sc-hl span {
          display: block;
          margin-top: 2px;
          font-size: 11px;
          color: var(--sc-muted);
        }
        .sc-hl .tick {
          margin-left: auto;
          font-size: 14px;
          font-weight: 800;
          color: #16a34a;
        }
        .sc-hl:not(.ok) .tick { color: #b6bdca; }

        /* ---------- Sliders / toggle ---------- */
        .sc-stack {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .sc-slider-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 9px;
        }
        .sc-slider-head label {
          font-size: 13px;
          font-weight: 700;
          color: #30394c;
        }
        .sc-badge {
          min-width: 52px;
          padding: 2px 9px;
          border-radius: 7px;
          background: #fff1ea;
          color: var(--sc-accent-dark);
          font-size: 12px;
          font-weight: 750;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }
        .sc-slider.is-disabled .sc-badge { background: #eef1f6; color: #6b7589; }
        .sc-slider input[type="range"] {
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
        .sc-slider input[type="range"]:disabled { cursor: not-allowed; }
        .sc-slider input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid var(--sc-accent);
          box-shadow: 0 2px 8px rgba(255, 90, 31, 0.35);
          cursor: grab;
        }
        .sc-slider input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid var(--sc-accent);
          box-shadow: 0 2px 8px rgba(255, 90, 31, 0.35);
          cursor: grab;
        }
        .sc-slider.is-disabled input[type="range"]::-webkit-slider-thumb { border-color: #b6bdca; box-shadow: none; }
        .sc-slider.is-disabled input[type="range"]::-moz-range-thumb { border-color: #b6bdca; box-shadow: none; }
        .sc-slider input[type="range"]:focus-visible { box-shadow: 0 0 0 4px rgba(255, 90, 31, 0.18); }
        .sc-slider-scale {
          display: flex;
          justify-content: space-between;
          margin-top: 7px;
          font-size: 11px;
          color: var(--sc-muted);
        }

        .sc-switch-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding-bottom: 18px;
          border-bottom: 1px solid #edf0f4;
        }
        .sc-switch-row strong {
          display: block;
          font-size: 13px;
        }
        .sc-switch-row small {
          display: block;
          margin-top: 3px;
          font-size: 11px;
          line-height: 1.5;
          color: var(--sc-muted);
        }
        .sc-switch {
          -webkit-appearance: none;
          appearance: none;
          position: relative;
          flex-shrink: 0;
          width: 44px;
          height: 25px;
          margin: 0;
          border-radius: 30px;
          background: #d9dee7;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .sc-switch::after {
          content: "";
          position: absolute;
          top: 3px;
          left: 3px;
          width: 19px;
          height: 19px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
          transition: transform 0.2s ease;
        }
        .sc-switch:checked { background: var(--sc-accent); }
        .sc-switch:checked::after { transform: translateX(19px); }
        .sc-switch:disabled { opacity: 0.45; cursor: not-allowed; }
        .sc-switch:focus-visible { outline: 3px solid rgba(255, 90, 31, 0.25); outline-offset: 2px; }

        /* ---------- Tonight ---------- */
        .sc-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sc-info-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          background: #f6f8fb;
        }
        .sc-info-row .em {
          font-size: 26px;
          line-height: 1;
        }
        .sc-info-row strong {
          display: block;
          font-size: 13px;
        }
        .sc-info-row span {
          display: block;
          margin-top: 2px;
          font-size: 12px;
          color: #5d677b;
        }
        .sc-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .sc-method {
          border: 1px solid #ffe3b3;
          border-radius: 18px;
          background: #fffbf1;
          padding: 4px 22px;
        }
        .sc-method summary {
          padding: 16px 0;
          font-size: 14px;
          font-weight: 750;
          color: #6b4a00;
          cursor: pointer;
        }
        .sc-method p {
          margin: 0 0 14px;
          font-size: 13px;
          line-height: 1.7;
          color: #7a5a14;
        }
        .sc-method p:last-child { margin-bottom: 18px; }

        .sc-toast-wrap {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 24px;
          z-index: 60;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }
        .sc-toast {
          padding: 10px 20px;
          border-radius: 999px;
          background: #172033;
          color: #fff;
          font-size: 13px;
          font-weight: 650;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
        }
        .sc-credit {
          margin: 22px 0 0;
          text-align: center;
          font-size: 11px;
          color: var(--sc-muted);
        }
        .sc-credit a { color: inherit; text-decoration: underline; }

        /* ---------- Responsive ---------- */
        @media (max-width: 1000px) {
          .sc-layout { grid-template-columns: minmax(0, 1fr); }
          .sc-side { position: static; }
          .sc-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 640px) {
          .sc-hero-body { padding: 30px 16px 18px; }
          .sc-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 0 14px 16px; }
          .sc-card { padding: 16px; }
          .sc-row { flex-direction: column; }
          .sc-hl-grid { grid-template-columns: 1fr; }
          .sc-level-meta { grid-template-columns: 1fr; }
          .sc-bortle button { height: 46px; font-size: 14px; }
          .sc-axis span:not(.show) { visibility: hidden; }
        }
      `}</style>

      {/* ============================ HERO ============================ */}
      <section className="sc-hero">
        <Starfield stars={est.stars} cloud={current.cloud} moonIllum={current.moon.illum} moonUp={current.moon.up} />
        <div className="sc-horizon" style={{ opacity: ((bortle - 1) / 8) * 0.38 }} />
        <div className="sc-clouds" style={{ opacity: clamp(current.cloud / 100, 0, 1) * 0.85 }} />

        <div className="sc-hero-body">
          <span className="sc-eyebrow">
            <span className="sc-dot" />
            Night sky estimation tool
          </span>
          <h2>How many stars can you see tonight?</h2>
          <p className="sc-hero-sub">
            Combines light pollution, live cloud cover, moon position and twilight to estimate the stars visible to the naked eye.
          </p>

          <div className="sc-result" aria-live="polite">
            <p className="sc-result-label">Estimated visible stars</p>
            <div className="sc-count">{now ? count.toLocaleString() : "—"}</div>
            <p className="sc-range">
              Approximate range: {est.lower.toLocaleString()}–{est.upper.toLocaleString()} stars
            </p>
            <span className="sc-pill" data-tone={est.tone}>
              {est.label}
            </span>
          </div>

          <p className="sc-caption">
            {captionTime ? `${captionTime} · ${captionPlace}` : "Loading…"}
          </p>
        </div>

        <div className="sc-stats">
          <div className="sc-stat">
            <span>Faintest star</span>
            <strong>{est.daylight ? "—" : `Mag ${nelmShown.toFixed(1)}`}</strong>
            <small>Naked-eye limit</small>
          </div>
          <div className="sc-stat">
            <span>Clear sky</span>
            <strong>{Math.round(est.clear * 100)}%</strong>
            <small>{current.cloudSource === "live" ? "Live forecast" : "Manual setting"}</small>
          </div>
          <div className="sc-stat">
            <span>Moon</span>
            <strong>
              {current.moon.emoji} {Math.round(current.moon.illum * 100)}%
            </strong>
            <small>
              {current.moon.source === "computed" ? (current.moon.up ? "Above horizon" : "Below horizon") : "Manual setting"}
            </small>
          </div>
          <div className="sc-stat">
            <span>Sun</span>
            <strong>{sunLabel(current.sunAlt)}</strong>
            <small>{current.sunAlt === null ? "Set a location" : `${current.sunAlt.toFixed(0)}° altitude`}</small>
          </div>
          <div className="sc-stat">
            <span>Stargazing score</span>
            <strong>{est.score} / 100</strong>
            <small>Bortle {bortle}</small>
          </div>
        </div>
      </section>

      {/* ============================ BODY ============================ */}
      <div className="sc-layout">
        <div className="sc-col">
          {/* Location */}
          <Card
            title="Observing location"
            subtitle="Optional. A location unlocks live cloud cover, exact moon position and twilight timing."
          >
            <div ref={searchRef}>
              <label htmlFor="sc-city" className="sc-label">
                City or observing location
              </label>
              <div className="sc-row">
                <div className="sc-input-wrap">
                  <input
                    id="sc-city"
                    className="sc-input"
                    type="text"
                    autoComplete="off"
                    value={query}
                    placeholder="e.g. Kolkata, India"
                    onFocus={() => setOpen(true)}
                    onChange={(e) => {
                      typingRef.current = true;
                      setQuery(e.target.value);
                      setOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && suggestions[0]) {
                        e.preventDefault();
                        selectPlace(suggestions[0]);
                      }
                      if (e.key === "Escape") setOpen(false);
                    }}
                  />
                  {open && (suggestions.length > 0 || searching || searchError) && (
                    <div className="sc-suggest" role="listbox">
                      {searching && <div className="sc-suggest-note">Searching…</div>}
                      {!searching && searchError && <div className="sc-suggest-note">{searchError}</div>}
                      {suggestions.map((s) => (
                        <button
                          key={`${s.lat}-${s.lon}-${s.name}`}
                          type="button"
                          role="option"
                          aria-selected={false}
                          onClick={() => selectPlace(s)}
                        >
                          <strong>{s.name}</strong>
                          <span>{s.detail || `${s.lat.toFixed(2)}°, ${s.lon.toFixed(2)}°`}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" className="sc-btn" onClick={locateMe}>
                  <Icon d={ICONS.pin} /> Use my location
                </button>
              </div>

              {locMsg && (
                <p className="sc-status" aria-live="polite">
                  {locMsg}
                </p>
              )}

              {place && (
                <div className="sc-chip-place">
                  <div style={{ minWidth: 0 }}>
                    <strong>
                      📍 {place.name}
                      {place.detail ? `, ${place.detail}` : ""}
                    </strong>
                    <span>
                      {place.lat.toFixed(2)}°, {place.lon.toFixed(2)}° · {place.tz}
                    </span>
                  </div>
                  <button type="button" className="sc-link" onClick={clearPlace}>
                    Clear
                  </button>
                </div>
              )}

              {place && forecastState === "loading" && <p className="sc-status">Fetching live cloud forecast…</p>}
              {place && forecastState === "ready" && <p className="sc-status">Live cloud forecast loaded for this location.</p>}
              {place && forecastState === "error" && (
                <p className="sc-status err">
                  Live forecast is unavailable. Your manual cloud-cover setting is being used.{" "}
                  <button type="button" className="sc-link" style={{ display: "inline" }} onClick={() => void loadForecast(place)}>
                    Retry
                  </button>
                </p>
              )}
            </div>
          </Card>

          {/* Light pollution */}
          <Card
            title="Light pollution level"
            subtitle="Pick the Bortle class that matches the sky where you will be observing."
          >
            <div className="sc-picks">
              {QUICK_PICKS.map((q) => (
                <button key={q.label} type="button" className="sc-chip" onClick={() => setBortle(q.value)}>
                  {q.label}
                </button>
              ))}
            </div>

            <div className="sc-bortle" role="radiogroup" aria-label="Bortle class">
              {SKY_LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  role="radio"
                  aria-checked={bortle === l.value}
                  aria-label={l.title}
                  title={l.title}
                  className={bortle === l.value ? "active" : ""}
                  style={{ background: l.color, color: l.dark ? "#fff" : "#172033" }}
                  onClick={() => setBortle(l.value)}
                >
                  {l.value}
                </button>
              ))}
            </div>
            <div className="sc-scale">
              <span>Darkest</span>
              <span>Brightest</span>
            </div>

            <div className="sc-level">
              <h4>{level.title}</h4>
              <p>{level.description}</p>
              <div className="sc-level-meta">
                <div>
                  <span>Faint-star limit</span>
                  <strong>Mag {level.nelmRange}</strong>
                </div>
                <div>
                  <span>Sky brightness</span>
                  <strong>{level.sqm} SQM</strong>
                </div>
                <div>
                  <span>Typical place</span>
                  <strong style={{ fontWeight: 650 }}>{level.example}</strong>
                </div>
              </div>
            </div>
          </Card>

          {/* Forecast */}
          {live && (
            <Card
              title="Next 24 hours"
              subtitle="Tap an hour to see its estimate. Bars show the expected star count."
              action={
                hours.length > 0 ? (
                  <button type="button" className="sc-link" onClick={() => selectHour(bestIdx)}>
                    ★ Jump to best hour
                  </button>
                ) : undefined
              }
            >
              {hours.length === 0 ? (
                <p className="sc-status">Calculating…</p>
              ) : (
                <>
                  <div className="sc-chart" role="listbox" aria-label="Hourly star visibility">
                    {hours.map((h, i) => {
                      const sun = h.sunAlt === null ? "night" : h.sunAlt > -0.83 ? "day" : h.sunAlt > -18 ? "twi" : "night";
                      const label = i === 0 ? "Now" : fmt(h.ms, tz, { hour: "numeric" });
                      return (
                        <button
                          key={h.ms}
                          type="button"
                          role="option"
                          aria-selected={i === safeIdx}
                          data-sun={sun}
                          className={`sc-bar-btn ${i === safeIdx ? "sel" : ""}`}
                          title={`${label}: about ${h.est.stars.toLocaleString()} stars · ${Math.round(h.cloud)}% cloud`}
                          onClick={() => selectHour(i)}
                        >
                          {h.moon.up && <span className="sc-moon-dot" />}
                          <span className="sc-bar" style={{ height: `${Math.max(2, (h.est.stars / maxStars) * 100)}%` }} />
                        </button>
                      );
                    })}
                  </div>
                  <div className="sc-axis">
                    {hours.map((h, i) => (
                      <span key={h.ms} className={i % 3 === 0 ? "show" : ""}>
                        {i % 3 === 0 ? (i === 0 ? "Now" : fmt(h.ms, tz, { hour: "numeric" })) : ""}
                      </span>
                    ))}
                  </div>
                  <div className="sc-legend">
                    <span><i style={{ background: "#fff4dc" }} />Daylight</span>
                    <span><i style={{ background: "#eaeeff" }} />Twilight</span>
                    <span><i style={{ background: "#f4f6fa" }} />Dark</span>
                    <span><i style={{ background: "#94a3b8", borderRadius: "50%" }} />Moon above horizon</span>
                  </div>
                  <p className="sc-hint">
                    Best time in this window: <strong>{fmt(hours[bestIdx].ms, tz, { weekday: "short", hour: "numeric", minute: "2-digit" })}</strong>{" "}
                    with about {hours[bestIdx].est.stars.toLocaleString()} stars.
                  </p>
                </>
              )}
            </Card>
          )}

          {/* Highlights */}
          <Card title="What you could see" subtitle="Sights that should be visible under the selected conditions.">
            <div className="sc-hl-grid">
              {highlights.map((h) => (
                <div key={h.label} className={`sc-hl ${h.ok ? "ok" : ""}`}>
                  <div className="sc-hl-icon">{h.icon}</div>
                  <div style={{ minWidth: 0 }}>
                    <strong>{h.label}</strong>
                    <span>{h.note}</span>
                  </div>
                  <span className="tick">{h.ok ? "✓" : "–"}</span>
                </div>
              ))}
            </div>
          </Card>

          <details className="sc-method">
            <summary>How is this estimate calculated?</summary>
            <p>
              Each Bortle class sets a typical naked-eye limiting magnitude. The tool lowers that limit for moonlight (based on the
              moon's real illumination and height above the horizon), for twilight (based on the sun's altitude) and for cloud haze,
              then converts the result into a star count using a catalogue-based magnitude table. Cloud cover also reduces how much of the
              sky is open.
            </p>
            <p>
              It is still an estimate. It does not know your exact horizon, air transparency, humidity, or the sky-brightness of your
              specific site, and individual eyesight varies. Treat the number as a realistic guide, not a measurement.
            </p>
          </details>
        </div>

        {/* ============================ SIDEBAR ============================ */}
        <aside className="sc-col sc-side">
          <Card title="Conditions">
            <div className="sc-stack">
              <div className="sc-switch-row">
                <div>
                  <strong>Use live conditions</strong>
                  <small>
                    {place
                      ? "Cloud forecast, moon position and twilight are calculated automatically."
                      : "Choose a location to enable live cloud, moon and twilight data."}
                  </small>
                </div>
                <input
                  className="sc-switch"
                  type="checkbox"
                  role="switch"
                  aria-label="Use live conditions"
                  checked={live}
                  disabled={!place}
                  onChange={(e) => setAuto(e.target.checked)}
                />
              </div>

              <Slider
                label="Cloud cover"
                value={live && current.cloudSource === "live" ? Math.round(current.cloud) : manualCloud}
                onChange={setManualCloud}
                disabled={live && current.cloudSource === "live"}
                hint={live && current.cloudSource === "live" ? "Using the live forecast for the selected hour." : undefined}
                left="Clear sky"
                right="Completely cloudy"
              />

              <Slider
                label="Moonlight brightness"
                value={live ? Math.round(current.moon.effect * 100) : manualMoon}
                onChange={setManualMoon}
                disabled={live}
                hint={
                  live
                    ? `${current.moon.emoji} ${current.moon.phase}, ${current.moon.up ? "above" : "below"} the horizon at this hour.`
                    : undefined
                }
                left="No moonlight"
                right="Bright moonlight"
              />

              {!live && moonToday && (
                <button type="button" className="sc-btn block" onClick={matchMoonToday}>
                  {moonToday.emoji} Match today's moon phase ({Math.round(moonToday.illum * 100)}%)
                </button>
              )}
            </div>
          </Card>

          <Card title="Tonight at a glance">
            <div className="sc-info">
              {moonToday && (
                <div className="sc-info-row">
                  <div className="em">{moonToday.emoji}</div>
                  <div>
                    <strong>{moonToday.phase}</strong>
                    <span>{Math.round(moonToday.illum * 100)}% illuminated</span>
                  </div>
                </div>
              )}

              <div className="sc-info-row">
                <div className="em">🌌</div>
                <div>
                  <strong>Full darkness</strong>
                  <span>
                    {!place
                      ? "Set a location to see when the sky gets fully dark."
                      : hasWindow && darkness?.window
                        ? `${fmt(darkness.window.start, tz, { hour: "numeric", minute: "2-digit" })} – ${fmt(darkness.window.end, tz, { hour: "numeric", minute: "2-digit" })}`
                        : "No full astronomical darkness at this latitude right now."}
                  </span>
                </div>
              </div>

              <div className="sc-info-row">
                <div className="em">⏱️</div>
                <div>
                  <strong>Time zone</strong>
                  <span>{place ? place.tz : "Your device's local time"}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Actions">
            <div className="sc-actions">
              <button type="button" className="sc-btn primary" onClick={copyReport}>
                <Icon d={ICONS.copy} /> Copy report
              </button>
              <button type="button" className="sc-btn" onClick={resetAll}>
                <Icon d={ICONS.reset} /> Reset all
              </button>
            </div>
          </Card>
        </aside>
      </div>

      <p className="sc-credit">
        Weather and place search data by{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
          Open-Meteo.com
        </a>
        . Search terms and coordinates are sent to Open-Meteo only when you use location features.
      </p>

      <div aria-live="polite" className="sc-toast-wrap">
        {toast && <div className="sc-toast">{toast}</div>}
      </div>
    </div>
  );
}