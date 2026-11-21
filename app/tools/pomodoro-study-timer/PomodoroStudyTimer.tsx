"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ToolShell from "../ToolShell";

/* ---------------------------------------------------------------- types */

type Phase = "focus" | "shortBreak" | "longBreak";
type Tone = "idle" | "active" | "success" | "warn";
type AmbientId = "none" | "brown" | "rain" | "drone" | "cafe" | "forest";

type TimerSettings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
};

type StudySession = {
  id: string;
  subject: string;
  duration: number;
  date: string;
  completedAt: string;
};

type Persisted = {
  phase: Phase;
  remainingMs: number;
  endAt: number | null;
  isRunning: boolean;
  completedFocusSessions: number;
  settings: TimerSettings;
  sessions: StudySession[];
  subject: string;
  customSubject: string;
  goalMinutes: number;
  autoStartBreaks: boolean;
  soundOn: boolean;
  ambient: AmbientId;
  ambientVolume: number;
};

/* ------------------------------------------------------------ constants */

const STORAGE_KEY = "toolsab-pomodoro-timer-v2";
const LEGACY_KEY = "toolsab-pomodoro-timer-v1";

const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
};

const PHASES: Record<Phase, { label: string; description: string; short: string }> = {
  focus: {
    label: "Focus time",
    description: "Work on one task without distractions.",
    short: "Focus",
  },
  shortBreak: {
    label: "Short break",
    description: "Step away and give yourself a little rest.",
    short: "Short break",
  },
  longBreak: {
    label: "Long break",
    description: "Take a longer break before your next focus cycle.",
    short: "Long break",
  },
};

const SUBJECTS = [
  "Mathematics",
  "Science",
  "Programming",
  "English",
  "History",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Other",
];

const SUBJECT_COLORS = [
  "#ff5a1f",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
  "#6366f1",
  "#84cc16",
];

const GOAL_OPTIONS = [30, 45, 60, 90, 120, 180, 240, 300, 360, 480];

const AMBIENT_OPTIONS: { id: AmbientId; label: string; icon: string; hint: string }[] = [
  { id: "none", label: "Off", icon: "⏸", hint: "Silence" },
  { id: "brown", label: "Brown noise", icon: "🟤", hint: "Warm mask" },
  { id: "rain", label: "Rain", icon: "🌧", hint: "Steady hush" },
  { id: "drone", label: "Deep focus", icon: "🎚", hint: "Low tone" },
  { id: "cafe", label: "Cafe hum", icon: "☕", hint: "Soft murmur" },
  { id: "forest", label: "Forest", icon: "🌲", hint: "Airy wind" },
];

const RING_RADIUS = 96;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/* -------------------------------------------------------------- helpers */

function getLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatClock(milliseconds: number) {
  const totalSeconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatShort(milliseconds: number) {
  const totalMinutes = Math.floor(Math.max(0, milliseconds) / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function formatGoalOption(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hour${hours > 1 ? "s" : ""}` : `${hours}h ${rest}m`;
}

function getPhaseDuration(phase: Phase, settings: TimerSettings) {
  const minutes =
    phase === "focus"
      ? settings.focusMinutes
      : phase === "shortBreak"
      ? settings.shortBreakMinutes
      : settings.longBreakMinutes;
  return minutes * 60 * 1000;
}

function isValidSession(value: unknown): value is StudySession {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.subject === "string" &&
    typeof item.duration === "number" &&
    typeof item.date === "string" &&
    typeof item.completedAt === "string"
  );
}

function isAmbientId(value: unknown): value is AmbientId {
  return (
    value === "none" ||
    value === "brown" ||
    value === "rain" ||
    value === "drone" ||
    value === "cafe" ||
    value === "forest"
  );
}

/* ------------------------------------------------------------ component */

export default function PomodoroStudyTimer() {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);

  /* ---- timer ---- */
  const [phase, setPhase] = useState<Phase>("focus");
  const [remainingMs, setRemainingMs] = useState(DEFAULT_SETTINGS.focusMinutes * 60000);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [completedFocusSessions, setCompletedFocusSessions] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const lastHandledEndAt = useRef<number | null>(null);

  /* ---- data ---- */
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subject, setSubject] = useState("Mathematics");
  const [customSubject, setCustomSubject] = useState("");
  const [goalMinutes, setGoalMinutes] = useState(120);

  /* ---- sound ---- */
  const [soundOn, setSoundOn] = useState(true);
  const [autoStartBreaks, setAutoStartBreaks] = useState(true);
  const [ambient, setAmbient] = useState<AmbientId>("none");
  const [ambientVolume, setAmbientVolume] = useState(0.35);

  /* ---- ui ---- */
  const [message, setMessage] = useState("Set a subject and start your first focus block.");
  const [tone, setTone] = useState<Tone>("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [showAmbient, setShowAmbient] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const baseTitleRef = useRef<string>("");
  const ambientRef = useRef<{
    ctx: AudioContext;
    master: GainNode;
    stop: () => void;
  } | null>(null);

  /* ------------------------------------------------------------- derive */

  const currentRemaining =
    isRunning && endAt !== null ? Math.max(0, endAt - now) : remainingMs;

  const totalDuration = getPhaseDuration(phase, settings);

  const progress = Math.min(
    100,
    Math.max(0, totalDuration > 0 ? ((totalDuration - currentRemaining) / totalDuration) * 100 : 0)
  );

  const ringProgress = progress / 100;
  const ringOffset = RING_CIRCUMFERENCE * (1 - ringProgress);

  const isCompleted = !isRunning && remainingMs === 0;

  const selectedSubject =
    subject === "Other" ? customSubject.trim() || "Other" : subject;

  const todayKey = getLocalDateKey();

  const todaySessions = useMemo(
    () => sessions.filter((session) => session.date === todayKey),
    [sessions, todayKey]
  );

  const todayStudyTime = todaySessions.reduce((t, s) => t + s.duration, 0);
  const goalMs = Math.max(1, goalMinutes) * 60000;
  const goalProgress = Math.min(100, (todayStudyTime / goalMs) * 100);

  const totalCompletedTime = sessions.reduce((t, s) => t + s.duration, 0);

  const streaks = useMemo(() => {
    const days = new Set(sessions.map((s) => s.date));
    let current = 0;
    const cursor = new Date();
    if (!days.has(getLocalDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(getLocalDateKey(cursor))) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    const sorted = [...days].sort();
    let best = 0;
    let run = 0;
    let prev: string | null = null;
    for (const day of sorted) {
      if (prev) {
        const a = new Date(`${prev}T00:00:00`).getTime();
        const b = new Date(`${day}T00:00:00`).getTime();
        run = Math.round((b - a) / 86400000) === 1 ? run + 1 : 1;
      } else run = 1;
      best = Math.max(best, run);
      prev = day;
    }
    return { current, best: Math.max(best, current) };
  }, [sessions]);

  const weekly = useMemo(() => {
    const days: { key: string; label: string; total: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = getLocalDateKey(date);
      const total = sessions.reduce((sum, s) => (s.date === key ? sum + s.duration : sum), 0);
      days.push({
        key,
        label: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date).slice(0, 2),
        total,
        isToday: i === 0,
      });
    }
    return days;
  }, [sessions]);

  const weekValues = weekly.map((d) => d.total);
  const weekMax = Math.max(...weekValues, 30 * 60000) * 1.1;
  const weekBest = Math.max(...weekValues, 0);
  const weekTotal = weekValues.reduce((s, v) => s + v, 0);
  const goalLinePercent = Math.min(100, (goalMs / weekMax) * 100);
  const showGoalLine = goalMs <= weekMax;

  const subjectSummary = useMemo(() => {
    const totals: Record<string, number> = {};
    todaySessions.forEach((s) => {
      totals[s.subject] = (totals[s.subject] || 0) + s.duration;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [todaySessions]);

  const achievements = useMemo(() => {
    const totalMs = sessions.reduce((s, x) => s + x.duration, 0);
    const longest = sessions.reduce((m, x) => Math.max(m, x.duration), 0);
    const perDay: Record<string, number> = {};
    sessions.forEach((s) => {
      perDay[s.date] = (perDay[s.date] || 0) + s.duration;
    });
    const bestDay = Object.values(perDay).reduce((m, v) => Math.max(m, v), 0);
    const hasNight = sessions.some((s) => {
      const h = new Date(s.completedAt).getHours();
      return h >= 22 || h < 4;
    });
    const hasEarly = sessions.some((s) => {
      const h = new Date(s.completedAt).getHours();
      return h >= 4 && h < 7;
    });
    return [
      { id: "first", icon: "🎯", label: "First pomodoro", unlocked: sessions.length >= 1 },
      { id: "p5", icon: "🍅", label: "5 pomodoros", unlocked: sessions.length >= 5 },
      { id: "p25", icon: "📚", label: "25 pomodoros", unlocked: sessions.length >= 25 },
      { id: "p100", icon: "🏅", label: "100 pomodoros", unlocked: sessions.length >= 100 },
      { id: "h1", icon: "⏱️", label: "1h day", unlocked: bestDay >= 3600000 },
      { id: "h4", icon: "🔥", label: "4h day", unlocked: bestDay >= 4 * 3600000 },
      { id: "st3", icon: "📅", label: "3-day streak", unlocked: streaks.best >= 3 },
      { id: "st7", icon: "🚀", label: "7-day streak", unlocked: streaks.best >= 7 },
      { id: "marathon", icon: "💎", label: "50-min block", unlocked: longest >= 50 * 60000 },
      { id: "t10", icon: "🏆", label: "10h total", unlocked: totalMs >= 10 * 3600000 },
      { id: "t50", icon: "👑", label: "50h total", unlocked: totalMs >= 50 * 3600000 },
      { id: "night", icon: "🌙", label: "Night owl", unlocked: hasNight },
      { id: "early", icon: "🌅", label: "Early bird", unlocked: hasEarly },
    ];
  }, [sessions, streaks.best]);

  const completedInCycle =
    completedFocusSessions % Math.max(1, settings.sessionsBeforeLongBreak);
  const cyclePosition =
    completedInCycle === 0 && completedFocusSessions > 0
      ? settings.sessionsBeforeLongBreak
      : completedInCycle;

  const statusLabel = isRunning
    ? phase === "focus"
      ? "FOCUSING"
      : "ON BREAK"
    : remainingMs === 0
    ? "COMPLETE"
    : currentRemaining < totalDuration
    ? "PAUSED"
    : "READY";

  const statusKey = isRunning
    ? phase === "focus"
      ? "active"
      : "break"
    : remainingMs === 0
    ? "paused"
    : currentRemaining < totalDuration
    ? "paused"
    : "ready";

  const subLabel =
    phase === "focus"
      ? `Block ${Math.max(1, cyclePosition)}/${Math.max(1, settings.sessionsBeforeLongBreak)} · ${settings.focusMinutes}m`
      : `${PHASES[phase].label} · ${phase === "shortBreak" ? settings.shortBreakMinutes : settings.longBreakMinutes}m`;

  /* ------------------------------------------------------------- chime */

  const playChime = useCallback(
    (kind: "focus" | "break") => {
      if (!soundOn) return;
      try {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        if (!audioRef.current) audioRef.current = new Ctor();
        const ctx = audioRef.current;
        if (ctx.state === "suspended") void ctx.resume();
        const notes = kind === "focus" ? [523.25, 659.25, 783.99] : [659.25, 523.25];
        notes.forEach((frequency, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = ctx.currentTime + index * 0.13;
          osc.type = "sine";
          osc.frequency.setValueAtTime(frequency, start);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.4);
        });
      } catch {
        /* audio is a bonus */
      }
    },
    [soundOn]
  );

  /* ------------------------------------------------------- ambient engine */

  const buildAmbient = useCallback(
    (ctx: AudioContext, id: Exclude<AmbientId, "none">, volume: number) => {
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.8);
      master.connect(ctx.destination);

      const nodes: AudioScheduledSourceNode[] = [];
      const disposers: (() => void)[] = [];

      const makeNoiseBuffer = (seconds = 4) => {
        const length = Math.floor(ctx.sampleRate * seconds);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
        return buffer;
      };

      const noiseLayer = (
        filterType: BiquadFilterType,
        frequency: number,
        q: number,
        gainValue: number,
        brownish = false
      ) => {
        const source = ctx.createBufferSource();
        source.buffer = makeNoiseBuffer();
        source.loop = true;
        if (brownish) {
          const data = source.buffer!.getChannelData(0);
          let last = 0;
          for (let i = 0; i < data.length; i += 1) {
            last = (last + 0.02 * data[i]) / 1.02;
            data[i] = last * 3.5;
          }
        }
        const filter = ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = frequency;
        filter.Q.value = q;
        const gain = ctx.createGain();
        gain.gain.value = gainValue;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        source.start();
        nodes.push(source);
        disposers.push(() => {
          try { source.stop(); } catch { /* already stopped */ }
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
        });
      };

      const lfo = (target: AudioParam, rate: number, depth: number, base: number) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = rate;
        const amp = ctx.createGain();
        amp.gain.value = depth;
        target.setValueAtTime(base, ctx.currentTime);
        osc.connect(amp);
        amp.connect(target);
        osc.start();
        nodes.push(osc);
        disposers.push(() => {
          try { osc.stop(); } catch { /* already stopped */ }
          osc.disconnect();
          amp.disconnect();
        });
      };

      const drone = (frequency: number, gainValue: number) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = frequency;
        const gain = ctx.createGain();
        gain.gain.value = gainValue;
        osc.connect(gain);
        gain.connect(master);
        osc.start();
        nodes.push(osc);
        disposers.push(() => {
          try { osc.stop(); } catch { /* already stopped */ }
          osc.disconnect();
          gain.disconnect();
        });
      };

      switch (id) {
        case "brown":
          noiseLayer("lowpass", 900, 0.7, 0.55, true);
          lfo(master.gain, 0.05, volume * 0.06, volume);
          break;
        case "rain":
          noiseLayer("highpass", 1400, 0.4, 0.28);
          noiseLayer("lowpass", 700, 0.8, 0.35);
          lfo(master.gain, 0.08, volume * 0.08, volume);
          break;
        case "drone":
          drone(110, 0.045);
          drone(164.81, 0.03);
          drone(220, 0.018);
          noiseLayer("lowpass", 300, 0.5, 0.12, true);
          break;
        case "cafe":
          noiseLayer("bandpass", 500, 0.6, 0.45);
          noiseLayer("lowpass", 250, 0.4, 0.25);
          lfo(master.gain, 0.15, volume * 0.05, volume);
          break;
        case "forest":
          noiseLayer("bandpass", 3000, 0.3, 0.18);
          noiseLayer("lowpass", 1200, 0.5, 0.22);
          lfo(master.gain, 0.11, volume * 0.09, volume);
          break;
      }

      const stop = () => {
        try {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
        } catch { /* ignore */ }
        window.setTimeout(() => {
          disposers.forEach((fn) => fn());
          master.disconnect();
        }, 260);
      };

      return { master, stop };
    },
    []
  );

  const stopAmbient = useCallback(() => {
    if (ambientRef.current) {
      ambientRef.current.stop();
      ambientRef.current = null;
    }
  }, []);

  const startAmbient = useCallback(
    (id: AmbientId, volume: number) => {
      stopAmbient();
      if (id === "none") return;
      try {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        if (!audioRef.current) audioRef.current = new Ctor();
        const ctx = audioRef.current;
        if (ctx.state === "suspended") void ctx.resume();
        const { master, stop } = buildAmbient(ctx, id, volume);
        ambientRef.current = { ctx, master, stop };
      } catch { /* audio is a bonus */ }
    },
    [stopAmbient, buildAmbient]
  );

  useEffect(() => {
    if (!hydrated) return;
    if (ambient === "none") {
      stopAmbient();
      return;
    }
    startAmbient(ambient, ambientVolume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambient]);

  useEffect(() => {
    if (!hydrated) return;
    if (ambientRef.current && ambient !== "none") {
      const { ctx, master } = ambientRef.current;
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(ambientVolume, ctx.currentTime, 0.12);
      } catch { /* ignore */ }
    }
  }, [ambientVolume, ambient, hydrated]);

  useEffect(() => () => stopAmbient(), [stopAmbient]);

  /* ---------------------------------------------------------- hydration */

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Partial<Persisted>;
        if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        if (data.phase === "focus" || data.phase === "shortBreak" || data.phase === "longBreak") {
          setPhase(data.phase);
        }
        if (typeof data.remainingMs === "number" && Number.isFinite(data.remainingMs)) {
          setRemainingMs(Math.max(0, data.remainingMs));
        }
        if (typeof data.endAt === "number") setEndAt(data.endAt);
        if (typeof data.isRunning === "boolean") setIsRunning(data.isRunning);
        if (typeof data.completedFocusSessions === "number") {
          setCompletedFocusSessions(Math.max(0, data.completedFocusSessions));
        }
        if (Array.isArray(data.sessions)) {
          setSessions(data.sessions.filter(isValidSession));
        }
        if (typeof data.subject === "string") setSubject(data.subject);
        if (typeof data.customSubject === "string") setCustomSubject(data.customSubject);
        if (typeof data.goalMinutes === "number") setGoalMinutes(data.goalMinutes);
        if (typeof data.autoStartBreaks === "boolean") setAutoStartBreaks(data.autoStartBreaks);
        if (typeof data.soundOn === "boolean") setSoundOn(data.soundOn);
        if (isAmbientId(data.ambient)) setAmbient(data.ambient);
        if (typeof data.ambientVolume === "number" && Number.isFinite(data.ambientVolume)) {
          setAmbientVolume(Math.min(1, Math.max(0, data.ambientVolume)));
        }
      } else {
        // Migrate from v1 (count only, no session log)
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          try {
            const data = JSON.parse(legacy) as {
              settings?: Partial<TimerSettings>;
              completedFocusSessions?: number;
              phase?: Phase;
            };
            if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
            if (typeof data.completedFocusSessions === "number") {
              setCompletedFocusSessions(Math.max(0, data.completedFocusSessions));
            }
            if (data.phase === "focus" || data.phase === "shortBreak" || data.phase === "longBreak") {
              setPhase(data.phase);
            }
          } catch { /* ignore */ }
        }
      }
    } catch { /* start clean */ }
    setNow(Date.now());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: Persisted = {
      phase,
      remainingMs,
      endAt,
      isRunning,
      completedFocusSessions,
      settings,
      sessions,
      subject,
      customSubject,
      goalMinutes,
      autoStartBreaks,
      soundOn,
      ambient,
      ambientVolume,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch { /* storage may be unavailable */ }
  }, [
    hydrated, phase, remainingMs, endAt, isRunning, completedFocusSessions,
    settings, sessions, subject, customSubject, goalMinutes,
    autoStartBreaks, soundOn, ambient, ambientVolume,
  ]);

  /* -------------------------------------------------------------- ticking */

  useEffect(() => {
    if (!isRunning || endAt === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [isRunning, endAt]);

  /* -------------------------------------------------------- tab title */

  useEffect(() => {
    baseTitleRef.current = document.title;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (isRunning) {
      document.title = `${formatClock(currentRemaining)} · ${PHASES[phase].short}`;
    } else if (baseTitleRef.current) {
      document.title = baseTitleRef.current;
    }
  }, [hydrated, isRunning, currentRemaining, phase]);

  /* ----------------------------------------------------------- recording */

  const recordFocus = useCallback(
    (duration: number) => {
      if (duration < 1000) return;
      const completedDate = new Date();
      const entry: StudySession = {
        id: `${completedDate.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        subject: selectedSubject,
        duration,
        date: getLocalDateKey(completedDate),
        completedAt: completedDate.toISOString(),
      };
      setSessions((prev) => [entry, ...prev]);
    },
    [selectedSubject]
  );

  /* ----------------------------------------------------------- controls */

  const startTimer = useCallback(() => {
    if (isRunning || remainingMs <= 0) return;
    const stamp = Date.now();
    setNow(stamp);
    setEndAt(stamp + remainingMs);
    setIsRunning(true);
    setTone("active");
    setMessage(
      phase === "focus"
        ? `Focusing on ${selectedSubject}…`
        : "Break running — step away from the screen."
    );
  }, [isRunning, remainingMs, phase, selectedSubject]);

  const pauseTimer = useCallback(() => {
    if (!isRunning || endAt === null) return;
    const remaining = Math.max(0, endAt - Date.now());
    setRemainingMs(remaining);
    setEndAt(null);
    setIsRunning(false);
    setNow(Date.now());
    setTone("warn");
    setMessage("Paused — your progress is saved.");
  }, [isRunning, endAt]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setEndAt(null);
    setRemainingMs(getPhaseDuration(phase, settings));
    setNow(Date.now());
    setTone("idle");
    setMessage("Timer reset. Ready when you are.");
  }, [phase, settings]);

  const changePhase = useCallback(
    (next: Phase) => {
      setIsRunning(false);
      setEndAt(null);
      setPhase(next);
      setRemainingMs(getPhaseDuration(next, settings));
      setNow(Date.now());
      setTone("idle");
      setMessage(`${PHASES[next].label} ready.`);
    },
    [settings]
  );

  const startNextPhase = useCallback(() => {
    if (phase === "focus") {
      const shouldLong =
        completedFocusSessions > 0 &&
        completedFocusSessions % settings.sessionsBeforeLongBreak === 0;
      changePhase(shouldLong ? "longBreak" : "shortBreak");
    } else {
      changePhase("focus");
    }
  }, [phase, completedFocusSessions, settings.sessionsBeforeLongBreak, changePhase]);

  const updateSetting = useCallback(
    (key: keyof TimerSettings, value: number) => {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      if (!isRunning) {
        setRemainingMs(getPhaseDuration(phase, updated));
        setEndAt(null);
      }
    },
    [settings, isRunning, phase]
  );

  const resetAll = useCallback(() => {
    setIsRunning(false);
    setEndAt(null);
    setPhase("focus");
    setSettings(DEFAULT_SETTINGS);
    setRemainingMs(DEFAULT_SETTINGS.focusMinutes * 60000);
    setCompletedFocusSessions(0);
    setNow(Date.now());
    lastHandledEndAt.current = null;
    setTone("idle");
    setMessage("Everything reset.");
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const exportCSV = useCallback(() => {
    const rows = [
      ["Date", "Completed At", "Subject", "Duration (minutes)"],
      ...sessions.map((s) => [
        s.date,
        new Date(s.completedAt).toLocaleTimeString(),
        s.subject,
        (s.duration / 60000).toFixed(2),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `toolsab-pomodoro-${getLocalDateKey()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [sessions]);

  /* ---------------------------------------------------- completion logic */

  useEffect(() => {
    if (!isRunning || endAt === null || now < endAt) return;
    if (lastHandledEndAt.current === endAt) return;
    lastHandledEndAt.current = endAt;

    const finishedPhase = phase;
    setRemainingMs(0);
    setEndAt(null);
    setIsRunning(false);

    if (finishedPhase === "focus") {
      recordFocus(getPhaseDuration("focus", settings));
      setCompletedFocusSessions((c) => c + 1);
      setTone("success");
      setMessage(
        `Focus complete — ${formatShort(getPhaseDuration("focus", settings))} of ${selectedSubject} logged.`
      );
      playChime("focus");

      if (autoStartBreaks) {
        const nextFocusCount = completedFocusSessions + 1;
        const shouldLong =
          nextFocusCount > 0 &&
          nextFocusCount % settings.sessionsBeforeLongBreak === 0;
        const nextPhase: Phase = shouldLong ? "longBreak" : "shortBreak";
        // Schedule the next phase start slightly later so state settles.
        window.setTimeout(() => {
          const stamp = Date.now();
          setPhase(nextPhase);
          setNow(stamp);
          setEndAt(stamp + getPhaseDuration(nextPhase, settings));
          setIsRunning(true);
        }, 400);
      }
    } else {
      setTone("success");
      setMessage("Break complete — ready for the next focus block.");
      playChime("break");

      if (autoStartBreaks) {
        window.setTimeout(() => {
          const stamp = Date.now();
          setPhase("focus");
          setNow(stamp);
          setEndAt(stamp + getPhaseDuration("focus", settings));
          setIsRunning(true);
        }, 400);
      }
    }
  }, [
    now, isRunning, endAt, phase, settings, selectedSubject,
    autoStartBreaks, completedFocusSessions, recordFocus, playChime,
  ]);

  /* --------------------------------------------------------- shortcuts */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.code === "Space") {
        event.preventDefault();
        if (isRunning) pauseTimer();
        else if (remainingMs > 0) startTimer();
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        resetTimer();
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        if (!isRunning && isCompleted) startNextPhase();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRunning, pauseTimer, startTimer, resetTimer, startNextPhase, remainingMs, isCompleted]);

  /* ------------------------------------------------------------- render */

  const messageIcon =
    tone === "success" ? "✓" : tone === "warn" ? "!" : tone === "active" ? "◉" : "◆";

  const activeAmbient =
    AMBIENT_OPTIONS.find((o) => o.id === ambient) ?? AMBIENT_OPTIONS[0];

  const cycleSlots = Math.max(1, settings.sessionsBeforeLongBreak);

  return (
    <ToolShell title="Pomodoro Study Timer" onReset={resetAll} wide>
      <div className="ps">
        {/* HEADER */}
        <header className="ps-head">
          <div className="ps-head-text">
            <span className="ps-eyebrow">POMODORO · PRO</span>
            <h2>Pomodoro Study Timer</h2>
          </div>
          <div className="ps-best">
            <span className="ps-best-label">STREAK</span>
            <strong className="ps-best-value">🔥 {streaks.current}</strong>
          </div>
        </header>

        {/* STAT BAR */}
        <div className="ps-bar">
          <div className="ps-bar-cell">
            <span>TODAY</span>
            <strong>{formatShort(todayStudyTime)}</strong>
          </div>
          <div className="ps-bar-sep" />
          <div className="ps-bar-cell">
            <span>SESSIONS</span>
            <strong>{todaySessions.length}</strong>
          </div>
          <div className="ps-bar-sep" />
          <div className="ps-bar-cell">
            <span>GOAL</span>
            <strong>{Math.round(goalProgress)}%</strong>
          </div>
          <div className="ps-bar-sep" />
          <div className="ps-bar-cell">
            <span>ALL TIME</span>
            <strong>{formatShort(totalCompletedTime)}</strong>
          </div>
        </div>

        {/* STAGE */}
        <div className={`ps-stage ${isRunning ? "is-running" : ""} ${phase !== "focus" ? "is-break" : ""}`}>
          <div className="ps-stage-top">
            <span className={`ps-pill ps-pill-${statusKey}`}>
              <span className="ps-pill-dot" />
              {statusLabel}
            </span>

            <div className="ps-stage-right">
              <span className="ps-cycle-dots" aria-label={`Block ${cyclePosition} of ${cycleSlots}`}>
                {Array.from({ length: cycleSlots }, (_, index) => (
                  <span key={index} className={`ps-dot ${index < completedInCycle ? "is-on" : ""}`} />
                ))}
              </span>

              <button
                type="button"
                className={`ps-icon-btn ${ambient !== "none" ? "is-on" : ""}`}
                onClick={() => setShowAmbient((v) => !v)}
                aria-label={ambient === "none" ? "Open ambient sound panel" : `Ambient: ${activeAmbient.label}`}
                title={ambient === "none" ? "Ambient sound" : `Ambient: ${activeAmbient.label}`}
              >
                {ambient === "none" ? "🎧" : activeAmbient.icon}
              </button>

              <button
                type="button"
                className={`ps-icon-btn ${soundOn ? "is-on" : ""}`}
                onClick={() => setSoundOn((v) => !v)}
                aria-label={soundOn ? "Mute completion sound" : "Enable completion sound"}
                title={soundOn ? "Sound on" : "Sound off"}
              >
                {soundOn ? "🔔" : "🔕"}
              </button>
            </div>
          </div>

          <div className="ps-ring-wrap">
            <svg className="ps-ring" viewBox="0 0 220 220" aria-hidden="true">
              <defs>
                <linearGradient id="psRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff8a4c" />
                  <stop offset="100%" stopColor="#e94b18" />
                </linearGradient>
              </defs>
              <circle className="ps-ring-track" cx="110" cy="110" r={RING_RADIUS} />
              <circle
                className="ps-ring-fill"
                cx="110"
                cy="110"
                r={RING_RADIUS}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 110 110)"
              />
            </svg>

            <div className="ps-ring-center">
              <div className="ps-time" role="timer" aria-live="off">
                {hydrated ? formatClock(currentRemaining) : formatClock(DEFAULT_SETTINGS.focusMinutes * 60000)}
              </div>
              <div className="ps-time-sub">{subLabel}</div>
            </div>
          </div>
        </div>

        {/* GOAL BAR */}
        <div className="ps-goal">
          <div className="ps-goal-top">
            <span>Daily goal · {formatGoalOption(goalMinutes)}</span>
            <span>
              {goalProgress >= 100
                ? "Goal reached 🎉"
                : `${formatShort(Math.max(0, goalMs - todayStudyTime))} left`}
            </span>
          </div>
          <div className="ps-goal-track">
            <div
              className={`ps-goal-fill ${goalProgress >= 100 ? "is-done" : ""}`}
              style={{ width: `${goalProgress}%` }}
            />
          </div>
        </div>

        {/* ACTION ROW */}
        <div className="ps-action">
          <div className={`ps-msg ps-msg-${tone}`} role="status" aria-live="polite">
            <span className="ps-msg-icon">{messageIcon}</span>
            <span>{message}</span>
          </div>

          <div className="ps-action-btns">
            <button
              type="button"
              className="ps-btn ps-btn-ghost"
              onClick={resetTimer}
              disabled={!isRunning && currentRemaining === totalDuration}
            >
              Reset
            </button>

            {!isRunning && isCompleted ? (
              <button type="button" className="ps-btn ps-btn-pri ps-btn-ready" onClick={startNextPhase}>
                {phase === "focus" ? "Start break" : "Next focus"}
              </button>
            ) : (
              <button
                type="button"
                className={`ps-btn ps-btn-pri ${!isRunning ? "ps-btn-ready" : ""}`}
                onClick={isRunning ? pauseTimer : startTimer}
                disabled={!isRunning && remainingMs <= 0}
              >
                {isRunning ? "Pause" : currentRemaining < totalDuration ? "Resume" : "Start"}
              </button>
            )}
          </div>
        </div>

        {/* PHASE STRIP */}
        <div className="ps-mode-strip" role="group" aria-label="Phase">
          {(["focus", "shortBreak", "longBreak"] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`ps-mode-btn ${phase === key ? "is-active" : ""}`}
              onClick={() => changePhase(key)}
              disabled={isRunning}
              aria-pressed={phase === key}
            >
              <span className="ps-mode-name">
                {key === "focus" ? "Focus" : key === "shortBreak" ? "Short break" : "Long break"}
              </span>
              <span className="ps-mode-meta">
                {key === "focus"
                  ? settings.focusMinutes
                  : key === "shortBreak"
                  ? settings.shortBreakMinutes
                  : settings.longBreakMinutes}
                m
              </span>
            </button>
          ))}
        </div>

        {/* SUBJECT CHIPS */}
        <div className="ps-chips" role="group" aria-label="Study subject">
          {SUBJECTS.map((item) => (
            <button
              key={item}
              type="button"
              className={`ps-chip ${subject === item ? "is-active" : ""}`}
              onClick={() => {
                if (isRunning) return;
                setSubject(item);
              }}
              disabled={isRunning}
              aria-pressed={subject === item}
            >
              {item}
            </button>
          ))}
        </div>

        {subject === "Other" && (
          <input
            type="text"
            className="ps-input"
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            placeholder="Name your subject (e.g. Economics)"
            maxLength={32}
            disabled={isRunning}
            aria-label="Custom subject name"
          />
        )}

        {/* CYCLE PROGRESS */}
        <section className="ps-panel ps-panel-static">
          <div className="ps-panel-head">
            <div>
              <strong style={{ fontSize: 12, fontWeight: 800 }}>Focus cycle</strong>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--ps-muted)" }}>
                Complete focus sessions to earn your long break.
              </p>
            </div>
            <span className="ps-mini-badge">
              {cyclePosition} of {settings.sessionsBeforeLongBreak}
            </span>
          </div>

          <div className="ps-cycle-grid">
            {Array.from({ length: cycleSlots }, (_, index) => {
              const done = index < completedInCycle;
              return (
                <div key={index} className={`ps-cycle-cell ${done ? "is-done" : ""}`}>
                  {done ? "✓" : index + 1}
                </div>
              );
            })}
          </div>

          <p className="ps-cycle-foot">
            Completed focus sessions: <strong>{completedFocusSessions}</strong>
          </p>
        </section>

        {/* AMBIENT */}
        <button
          type="button"
          className="ps-expand"
          onClick={() => setShowAmbient((v) => !v)}
          aria-expanded={showAmbient}
        >
          <span>Ambient sound · {ambient === "none" ? "off" : activeAmbient.label.toLowerCase()}</span>
          <span className="ps-expand-chev">{showAmbient ? "−" : "+"}</span>
        </button>

        {showAmbient && (
          <div className="ps-panel">
            <p className="ps-ambient-note">
              Synthesized in your browser — no files, no tracking. Soundscapes mask distractions; they are
              deliberately non-musical so they do not compete with your focus.
            </p>

            <div className="ps-ambient-grid" role="group" aria-label="Ambient soundscape">
              {AMBIENT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`ps-ambient-btn ${ambient === option.id ? "is-active" : ""}`}
                  onClick={() => setAmbient(option.id)}
                  aria-pressed={ambient === option.id}
                >
                  <span className="ps-ambient-icon">{option.icon}</span>
                  <span className="ps-ambient-label">{option.label}</span>
                  <span className="ps-ambient-hint">{option.hint}</span>
                </button>
              ))}
            </div>

            <label className="ps-field ps-ambient-vol">
              <span>Volume · {Math.round(ambientVolume * 100)}%</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={ambientVolume}
                onChange={(e) => setAmbientVolume(Number(e.target.value))}
                disabled={ambient === "none"}
              />
            </label>
          </div>
        )}

        {/* SETTINGS */}
        <button
          type="button"
          className="ps-expand"
          onClick={() => setShowSettings((v) => !v)}
          aria-expanded={showSettings}
        >
          <span>Settings · durations, goal &amp; auto-start</span>
          <span className="ps-expand-chev">{showSettings ? "−" : "+"}</span>
        </button>

        {showSettings && (
          <div className="ps-panel">
            <div className="ps-grid">
              <label className="ps-field">
                <span>Focus duration (min)</span>
                <select
                  value={settings.focusMinutes}
                  disabled={isRunning}
                  onChange={(e) => updateSetting("focusMinutes", Number(e.target.value))}
                >
                  {Array.from({ length: 86 }, (_, i) => i + 5).map((v) => (
                    <option key={v} value={v}>{v} minutes</option>
                  ))}
                </select>
              </label>

              <label className="ps-field">
                <span>Short break (min)</span>
                <select
                  value={settings.shortBreakMinutes}
                  disabled={isRunning}
                  onChange={(e) => updateSetting("shortBreakMinutes", Number(e.target.value))}
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((v) => (
                    <option key={v} value={v}>{v} minutes</option>
                  ))}
                </select>
              </label>

              <label className="ps-field">
                <span>Long break (min)</span>
                <select
                  value={settings.longBreakMinutes}
                  disabled={isRunning}
                  onChange={(e) => updateSetting("longBreakMinutes", Number(e.target.value))}
                >
                  {Array.from({ length: 56 }, (_, i) => i + 5).map((v) => (
                    <option key={v} value={v}>{v} minutes</option>
                  ))}
                </select>
              </label>

              <label className="ps-field">
                <span>Blocks before long break</span>
                <select
                  value={settings.sessionsBeforeLongBreak}
                  disabled={isRunning}
                  onChange={(e) => updateSetting("sessionsBeforeLongBreak", Number(e.target.value))}
                >
                  {Array.from({ length: 7 }, (_, i) => i + 2).map((v) => (
                    <option key={v} value={v}>{v} sessions</option>
                  ))}
                </select>
              </label>

              <label className="ps-field">
                <span>Daily goal</span>
                <select
                  value={goalMinutes}
                  onChange={(e) => setGoalMinutes(Number(e.target.value))}
                >
                  {GOAL_OPTIONS.map((m) => (
                    <option key={m} value={m}>{formatGoalOption(m)}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="ps-toggles">
              <button
                type="button"
                role="switch"
                aria-checked={autoStartBreaks}
                className={`ps-toggle ${autoStartBreaks ? "is-on" : ""}`}
                onClick={() => setAutoStartBreaks((v) => !v)}
              >
                <span className="ps-toggle-dot" />
                Auto-start next phase
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={soundOn}
                className={`ps-toggle ${soundOn ? "is-on" : ""}`}
                onClick={() => setSoundOn((v) => !v)}
              >
                <span className="ps-toggle-dot" />
                Completion sound
              </button>
            </div>

            {isRunning && (
              <p className="ps-hint-warn">Pause the timer before changing durations.</p>
            )}
          </div>
        )}

        {/* INSIGHTS */}
        <button
          type="button"
          className="ps-expand"
          onClick={() => setShowInsights((v) => !v)}
          aria-expanded={showInsights}
        >
          <span>
            Insights · 7-day trend · {subjectSummary.length} subject
            {subjectSummary.length === 1 ? "" : "s"} today
          </span>
          <span className="ps-expand-chev">{showInsights ? "−" : "+"}</span>
        </button>

        {showInsights && (
          <div className="ps-panel">
            <div className="ps-week">
              <div className="ps-week-bars">
                {showGoalLine && (
                  <div
                    className="ps-goal-line"
                    style={{ bottom: `${goalLinePercent}%` }}
                    aria-hidden="true"
                  />
                )}
                {weekly.map((day, index) => {
                  const value = weekValues[index];
                  const height = weekMax > 0 ? Math.max(3, (value / weekMax) * 100) : 3;
                  return (
                    <div className="ps-week-col" key={day.key}>
                      <div
                        className={`ps-week-bar ${day.isToday ? "is-today" : ""} ${value > 0 ? "has-value" : ""}`}
                        style={{ height: `${height}%` }}
                        title={`${day.label}: ${formatShort(value)}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="ps-week-labels">
                {weekly.map((day) => (
                  <span key={day.key} className={day.isToday ? "is-today" : undefined}>
                    {day.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="ps-week-foot">
              <span>Best day: {formatShort(weekBest)}</span>
              <span>7-day total: {formatShort(weekTotal)}</span>
              <span>Streak: {streaks.current} 🔥</span>
            </div>

            <div className="ps-subjects">
              {subjectSummary.length === 0 ? (
                <p className="ps-empty">
                  Your subject breakdown appears once you log focus time today.
                </p>
              ) : (
                subjectSummary.map(([name, duration], index) => {
                  const percentage = todayStudyTime > 0 ? (duration / todayStudyTime) * 100 : 0;
                  const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
                  return (
                    <div className="ps-subject-row" key={name}>
                      <div className="ps-subject-top">
                        <span className="ps-subject-name">
                          <span className="ps-subject-dot" style={{ background: color }} />
                          {name}
                        </span>
                        <span className="ps-subject-time">{formatShort(duration)}</span>
                      </div>
                      <div className="ps-subject-track">
                        <div
                          className="ps-subject-fill"
                          style={{ width: `${percentage}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="ps-achievements">
              {achievements.map((a) => (
                <span key={a.id} className={`ps-achievement ${a.unlocked ? "is-unlocked" : ""}`}>
                  <span className="ps-ach-icon">{a.unlocked ? a.icon : "🔒"}</span>
                  {a.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* HISTORY */}
        <button
          type="button"
          className="ps-expand"
          onClick={() => setShowHistory((v) => !v)}
          aria-expanded={showHistory}
        >
          <span>
            History · {sessions.length} session{sessions.length === 1 ? "" : "s"}
          </span>
          <span className="ps-expand-chev">{showHistory ? "−" : "+"}</span>
        </button>

        {showHistory && (
          <div className="ps-panel">
            <div className="ps-panel-head">
              <span>{formatShort(totalCompletedTime)} logged all-time</span>
              <button
                type="button"
                className="ps-mini-btn"
                onClick={exportCSV}
                disabled={sessions.length === 0}
              >
                Export CSV
              </button>
            </div>

            {sessions.length === 0 ? (
              <p className="ps-empty">No sessions yet. Finish a focus block to build your history.</p>
            ) : (
              <div className="ps-history">
                {sessions.map((session) => (
                  <div className="ps-history-row" key={session.id}>
                    <div className="ps-history-main">
                      <strong>{session.subject}</strong>
                      <span className="ps-history-meta">
                        {new Date(session.completedAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="ps-history-right">
                      <span className="ps-history-badge">Pomodoro</span>
                      <span className="ps-history-dur">{formatShort(session.duration)}</span>
                      <button
                        type="button"
                        className="ps-icon-btn"
                        onClick={() => deleteSession(session.id)}
                        aria-label={`Delete ${session.subject} session`}
                        title="Delete session"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="ps-trash"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HELP */}
        <button
          type="button"
          className="ps-expand"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
        >
          <span>How to use</span>
          <span className="ps-expand-chev">{showHelp ? "−" : "+"}</span>
        </button>

        {showHelp && (
          <div className="ps-panel">
            <div className="ps-step">
              <span>01</span>
              <div>
                <strong>Pick a subject</strong>
                <p>Every focus block is logged under the selected subject for a clean breakdown.</p>
              </div>
            </div>
            <div className="ps-step">
              <span>02</span>
              <div>
                <strong>Start a focus block</strong>
                <p>Focus for your set duration. When it ends, a break begins automatically (if enabled).</p>
              </div>
            </div>
            <div className="ps-step">
              <span>03</span>
              <div>
                <strong>Set the mood (optional)</strong>
                <p>Open Ambient sound to pick a synthesized soundscape that masks distractions.</p>
              </div>
            </div>
            <div className="ps-step">
              <span>04</span>
              <div>
                <strong>Review your progress</strong>
                <p>Watch your streak, 7-day chart, subject split, and achievements grow.</p>
              </div>
            </div>
            <div className="ps-step">
              <span>05</span>
              <div>
                <strong>Keyboard shortcuts</strong>
                <p>
                  <kbd>Space</kbd> start / pause · <kbd>R</kbd> reset · <kbd>N</kbd> next phase when complete.
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="ps-note">
          Everything is stored in this browser only. Export a CSV to keep a permanent copy of your log.
        </p>
      </div>

      <style jsx>{`
        .ps {
          --ps-primary: #ff5a1f;
          --ps-primary-dark: #e64a14;
          --ps-primary-soft: #fff3ed;
          --ps-primary-surface: #fff7f3;
          --ps-primary-hover: #ffb69d;
          --ps-text: var(--text-main, #172033);
          --ps-muted: var(--text-muted, #596579);
          --ps-border: var(--border-color, #e8ebf1);
          --ps-surface: var(--card-bg, #ffffff);
          --ps-soft: #fafbfc;

          color: var(--ps-text);
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
        }

        /* ------------------------------------------------ header */
        .ps-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .ps-head-text { min-width: 0; }
        .ps-eyebrow {
          display: block;
          color: var(--ps-primary);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          margin-bottom: 3px;
        }
        .ps-head h2 {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.2;
          margin: 0;
        }
        .ps-best {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
          padding: 8px 12px;
          border: 1px solid var(--ps-border);
          border-radius: 10px;
          background: linear-gradient(145deg, #fff3ed, #fffaf7);
          flex-shrink: 0;
        }
        .ps-best-label {
          font-size: 8px;
          font-weight: 800;
          color: var(--ps-muted);
          letter-spacing: 1px;
        }
        .ps-best-value {
          font-size: 18px;
          font-weight: 800;
          color: var(--ps-primary);
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }

        /* ------------------------------------------------ stat bar */
        .ps-bar {
          display: flex;
          align-items: stretch;
          border: 1px solid var(--ps-border);
          border-radius: 11px;
          background: var(--ps-surface);
          overflow: hidden;
          margin-bottom: 12px;
        }
        .ps-bar-cell {
          flex: 1;
          min-width: 0;
          padding: 9px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .ps-bar-cell > span {
          font-size: 8px;
          font-weight: 800;
          color: var(--ps-muted);
          letter-spacing: 0.9px;
        }
        .ps-bar-cell strong {
          font-size: 15px;
          font-weight: 800;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
          color: var(--ps-text);
        }
        .ps-bar-sep { width: 1px; background: var(--ps-border); flex-shrink: 0; }

        /* ------------------------------------------------ stage */
        .ps-stage {
          position: relative;
          padding: 14px;
          border: 1px solid var(--ps-border);
          border-radius: 16px;
          background: radial-gradient(circle at 50% 15%, #ffffff 0%, #fafbfc 72%);
          box-shadow: 0 6px 20px rgba(23, 32, 51, 0.05);
          transition: box-shadow 240ms ease, border-color 240ms ease;
        }
        .ps-stage.is-running {
          border-color: var(--ps-primary-hover);
          box-shadow: 0 10px 30px rgba(255, 90, 31, 0.14);
        }
        .ps-stage.is-break.is-running {
          border-color: #86efac;
          box-shadow: 0 10px 30px rgba(22, 163, 74, 0.14);
        }
        .ps-stage-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ps-stage-right { display: flex; align-items: center; gap: 8px; }

        .ps-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5px;
          white-space: nowrap;
          background: var(--ps-primary-soft);
          color: var(--ps-primary);
        }
        .ps-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--ps-primary);
          box-shadow: 0 0 0 2px rgba(255, 90, 31, 0.15);
        }
        .ps-pill-active .ps-pill-dot { animation: psBlink 1.4s ease-in-out infinite; }
        .ps-pill-break { background: #ecfdf5; color: #15803d; }
        .ps-pill-break .ps-pill-dot { background: #16a34a; box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15); }
        .ps-pill-paused { background: #fef3c7; color: #b45309; }
        .ps-pill-paused .ps-pill-dot { background: #f59e0b; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.18); }

        @keyframes psBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }

        .ps-cycle-dots { display: inline-flex; align-items: center; gap: 4px; }
        .ps-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #e2e6ee;
          transition: background 200ms ease, transform 200ms ease;
        }
        .ps-dot.is-on { background: var(--ps-primary); transform: scale(1.15); }

        .ps-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid var(--ps-border);
          background: #fff;
          font-size: 12px;
          line-height: 1;
          cursor: pointer;
          transition: border-color 150ms ease, background 150ms ease;
        }
        .ps-icon-btn:hover { border-color: var(--ps-primary-hover); background: var(--ps-primary-surface); }
        .ps-icon-btn.is-on { border-color: var(--ps-primary-hover); background: var(--ps-primary-soft); }

        /* ------------------------------------------------ ring */
        .ps-ring-wrap {
          position: relative;
          width: min(258px, 74vw);
          aspect-ratio: 1;
          margin: 8px auto 2px;
          display: grid;
          place-items: center;
        }
        .ps-ring { position: absolute; inset: 0; width: 100%; height: 100%; }
        .ps-ring-track { fill: none; stroke: #eef0f5; stroke-width: 12; }
        .ps-ring-fill {
          fill: none;
          stroke: url(#psRingGrad);
          stroke-width: 12;
          stroke-linecap: round;
          transition: stroke-dashoffset 220ms linear;
        }
        .ps-stage.is-running .ps-ring-fill { filter: drop-shadow(0 0 6px rgba(255, 90, 31, 0.35)); }
        .ps-stage.is-break.is-running .ps-ring-fill { filter: drop-shadow(0 0 6px rgba(22, 163, 74, 0.35)); }

        .ps-ring-center {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-align: center;
          padding: 0 22px;
        }
        .ps-time {
          font-size: clamp(30px, 9vw, 44px);
          font-weight: 900;
          letter-spacing: -1.5px;
          line-height: 1;
          font-variant-numeric: tabular-nums;
          color: var(--ps-text);
        }
        .ps-time-sub {
          font-size: 10px;
          font-weight: 700;
          color: var(--ps-muted);
          letter-spacing: 0.2px;
          line-height: 1.4;
        }

        /* ------------------------------------------------ goal */
        .ps-goal {
          margin-top: 10px;
          padding: 10px 12px;
          border: 1px solid var(--ps-border);
          border-radius: 11px;
          background: var(--ps-surface);
        }
        .ps-goal-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          font-size: 10px;
          font-weight: 700;
          color: var(--ps-muted);
          margin-bottom: 7px;
        }
        .ps-goal-track {
          height: 7px;
          border-radius: 999px;
          background: #eef0f5;
          overflow: hidden;
        }
        .ps-goal-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff8a4c, #ff5a1f);
          transition: width 260ms ease;
        }
        .ps-goal-fill.is-done { background: linear-gradient(90deg, #34d399, #10b981); }

        /* ------------------------------------------------ action */
        .ps-action {
          display: flex;
          align-items: stretch;
          gap: 8px;
          margin-top: 10px;
        }
        .ps-msg {
          flex: 1;
          min-width: 0;
          min-height: 40px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 11px;
          border-radius: 9px;
          background: var(--ps-soft);
          color: var(--ps-muted);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.4;
        }
        .ps-msg-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #475569;
          font-size: 10px;
          font-weight: 900;
        }
        .ps-msg-active { background: var(--ps-primary-soft); color: var(--ps-primary-dark); }
        .ps-msg-active .ps-msg-icon { background: #ffe2d5; color: var(--ps-primary); }
        .ps-msg-success { background: #ecfdf5; color: #166534; }
        .ps-msg-success .ps-msg-icon { background: #dcfce7; color: #15803d; }
        .ps-msg-warn { background: #fffbeb; color: #b45309; }
        .ps-msg-warn .ps-msg-icon { background: #fef3c7; color: #b45309; }

        .ps-action-btns { display: flex; gap: 6px; flex-shrink: 0; }
        .ps-btn {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: background 150ms ease, transform 150ms ease,
            box-shadow 150ms ease, border-color 150ms ease, color 150ms ease;
        }
        .ps-btn:focus-visible { outline: 3px solid var(--ps-primary-hover); outline-offset: 3px; }
        .ps-btn:disabled { cursor: not-allowed; opacity: 0.45; }

        .ps-btn-pri {
          border: 1px solid #e74e1b;
          background: linear-gradient(135deg, #ff682f, #e94b18);
          color: #fff;
          box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
          min-width: 88px;
        }
        .ps-btn-pri:hover:not(:disabled) {
          background: linear-gradient(135deg, #f45a25, #d94112);
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(255, 90, 31, 0.28);
        }
        .ps-btn-pri.ps-btn-ready { animation: psReady 1.6s ease-in-out infinite; }
        @keyframes psReady {
          0%, 100% { box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2); }
          50% { box-shadow: 0 3px 18px rgba(255, 90, 31, 0.45); }
        }

        .ps-btn-ghost {
          border: 1px solid transparent;
          background: transparent;
          color: var(--ps-muted);
        }
        .ps-btn-ghost:hover:not(:disabled) {
          color: var(--ps-primary);
          background: var(--ps-primary-surface);
        }

        /* ------------------------------------------------ phase strip */
        .ps-mode-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          margin-top: 12px;
        }
        .ps-mode-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 6px;
          border: 1px solid var(--ps-border);
          border-radius: 10px;
          background: var(--ps-surface);
          color: var(--ps-text);
          cursor: pointer;
          transition: border-color 150ms ease, background 150ms ease;
        }
        .ps-mode-btn:hover:not(:disabled) {
          border-color: var(--ps-primary-hover);
          background: var(--ps-primary-surface);
        }
        .ps-mode-btn:disabled { cursor: not-allowed; opacity: 0.55; }
        .ps-mode-btn.is-active {
          border-color: var(--ps-primary);
          background: var(--ps-primary-soft);
          box-shadow: inset 0 0 0 1px var(--ps-primary);
        }
        .ps-mode-name { font-size: 12px; font-weight: 800; }
        .ps-mode-btn.is-active .ps-mode-name { color: var(--ps-primary); }
        .ps-mode-meta { font-size: 9px; font-weight: 600; color: var(--ps-muted); }
        .ps-mode-btn.is-active .ps-mode-meta { color: var(--ps-primary); opacity: 0.8; }

        /* ------------------------------------------------ chips */
        .ps-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
        }
        .ps-chip {
          padding: 6px 11px;
          border-radius: 999px;
          border: 1px solid var(--ps-border);
          background: var(--ps-surface);
          color: var(--ps-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
        }
        .ps-chip:hover:not(:disabled) {
          border-color: var(--ps-primary-hover);
          color: var(--ps-primary);
          background: var(--ps-primary-surface);
        }
        .ps-chip.is-active {
          border-color: var(--ps-primary);
          background: var(--ps-primary-soft);
          color: var(--ps-primary);
          box-shadow: inset 0 0 0 1px var(--ps-primary);
        }
        .ps-chip:disabled { cursor: not-allowed; opacity: 0.5; }

        .ps-input {
          width: 100%;
          margin-top: 8px;
          padding: 9px 12px;
          border-radius: 9px;
          border: 1px solid var(--ps-border);
          background: #fff;
          color: var(--ps-text);
          font-size: 12px;
          font-weight: 600;
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }
        .ps-input:focus {
          border-color: var(--ps-primary);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
        }

        /* ------------------------------------------------ cycle panel */
        .ps-panel-static { margin-top: 10px; }
        .ps-mini-badge {
          padding: 3px 9px;
          border-radius: 999px;
          background: var(--ps-primary-soft);
          color: var(--ps-primary);
          font-size: 10px;
          font-weight: 800;
        }
        .ps-cycle-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
          gap: 6px;
          margin-top: 10px;
        }
        .ps-cycle-cell {
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          border: 1px solid var(--ps-border);
          background: var(--ps-surface);
          color: var(--ps-muted);
          font-size: 12px;
          font-weight: 800;
        }
        .ps-cycle-cell.is-done {
          border-color: var(--ps-primary);
          background: var(--ps-primary);
          color: #fff;
        }
        .ps-cycle-foot {
          margin: 10px 0 0;
          font-size: 10px;
          color: var(--ps-muted);
          font-weight: 700;
        }

        /* ------------------------------------------------ ambient */
        .ps-ambient-note {
          margin: 0 0 10px;
          font-size: 10px;
          line-height: 1.6;
          color: var(--ps-muted);
        }
        .ps-ambient-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
        }
        .ps-ambient-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          padding: 9px 6px;
          border: 1px solid var(--ps-border);
          border-radius: 10px;
          background: #fff;
          color: var(--ps-text);
          cursor: pointer;
          transition: border-color 150ms ease, background 150ms ease;
        }
        .ps-ambient-btn:hover { border-color: var(--ps-primary-hover); background: var(--ps-primary-surface); }
        .ps-ambient-btn.is-active {
          border-color: var(--ps-primary);
          background: var(--ps-primary-soft);
          box-shadow: inset 0 0 0 1px var(--ps-primary);
        }
        .ps-ambient-icon { font-size: 15px; line-height: 1.2; }
        .ps-ambient-label { font-size: 10px; font-weight: 800; }
        .ps-ambient-btn.is-active .ps-ambient-label { color: var(--ps-primary); }
        .ps-ambient-hint { font-size: 8px; font-weight: 600; color: var(--ps-muted); }
        .ps-ambient-vol { margin-top: 12px; }
        .ps-ambient-vol input[type="range"] { padding: 0; accent-color: var(--ps-primary); cursor: pointer; }

        /* ------------------------------------------------ expandables */
        .ps-expand {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          padding: 9px 12px;
          border: 1px solid var(--ps-border);
          border-radius: 9px;
          background: transparent;
          color: var(--ps-muted);
          font-size: 11px;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
          transition: color 150ms ease, border-color 150ms ease;
        }
        .ps-expand:hover { color: var(--ps-primary); border-color: var(--ps-primary-hover); }
        .ps-expand-chev { font-size: 14px; font-weight: 500; color: var(--ps-primary); flex-shrink: 0; }
        .ps-panel {
          margin-top: 8px;
          padding: 12px 14px;
          border: 1px solid var(--ps-border);
          border-radius: 11px;
          background: var(--ps-soft);
        }

        /* ------------------------------------------------ settings */
        .ps-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .ps-field { display: flex; flex-direction: column; gap: 4px; }
        .ps-field > span {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: var(--ps-muted);
          text-transform: uppercase;
        }
        .ps-field select,
        .ps-field input {
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--ps-border);
          background: #fff;
          color: var(--ps-text);
          font-size: 12px;
          font-weight: 700;
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }
        .ps-field select:focus,
        .ps-field input:focus {
          border-color: var(--ps-primary);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
        }
        .ps-toggles {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--ps-border);
        }
        .ps-toggle {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid var(--ps-border);
          background: #fff;
          color: var(--ps-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
        }
        .ps-toggle-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #cbd5e1;
          transition: background 150ms ease;
        }
        .ps-toggle.is-on { border-color: var(--ps-primary); background: var(--ps-primary-soft); color: var(--ps-primary); }
        .ps-toggle.is-on .ps-toggle-dot {
          background: var(--ps-primary);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.15);
        }
        .ps-hint-warn { margin: 10px 0 0; font-size: 10px; color: #b45309; font-weight: 700; }

        /* ------------------------------------------------ weekly */
        .ps-week { padding-bottom: 2px; }
        .ps-week-bars {
          position: relative;
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          height: 96px;
          align-items: end;
        }
        .ps-goal-line {
          position: absolute;
          left: 0;
          right: 0;
          border-top: 1px dashed rgba(255, 90, 31, 0.45);
          pointer-events: none;
        }
        .ps-week-col {
          height: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .ps-week-bar {
          width: 100%;
          max-width: 26px;
          border-radius: 5px 5px 3px 3px;
          background: #e9edf3;
          transition: height 300ms ease, background 200ms ease;
        }
        .ps-week-bar.has-value { background: linear-gradient(180deg, #ffb08c, #ff5a1f); }
        .ps-week-bar.is-today { box-shadow: 0 0 0 2px rgba(255, 90, 31, 0.22); }
        .ps-week-labels {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          margin-top: 5px;
          font-size: 9px;
          font-weight: 800;
          color: var(--ps-muted);
          text-align: center;
          letter-spacing: 0.3px;
        }
        .ps-week-labels .is-today { color: var(--ps-primary); }
        .ps-week-foot {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 6px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--ps-border);
          font-size: 10px;
          font-weight: 700;
          color: var(--ps-muted);
        }

        /* ------------------------------------------------ subjects */
        .ps-subjects { display: grid; gap: 9px; margin-top: 12px; }
        .ps-subject-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .ps-subject-name {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--ps-text);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ps-subject-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .ps-subject-time { color: var(--ps-muted); font-variant-numeric: tabular-nums; flex-shrink: 0; }
        .ps-subject-track {
          height: 6px;
          border-radius: 999px;
          background: #eef0f5;
          overflow: hidden;
        }
        .ps-subject-fill { height: 100%; border-radius: inherit; transition: width 260ms ease; }

        /* ------------------------------------------------ achievements */
        .ps-achievements {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--ps-border);
        }
        .ps-achievement {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          border-radius: 999px;
          background: #eef0f5;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2px;
        }
        .ps-achievement.is-unlocked { background: var(--ps-primary-soft); color: var(--ps-primary); }
        .ps-ach-icon { font-size: 11px; }

        /* ------------------------------------------------ history */
        .ps-panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          font-size: 10px;
          font-weight: 700;
          color: var(--ps-muted);
        }
        .ps-mini-btn {
          padding: 6px 10px;
          border-radius: 7px;
          border: 1px solid var(--ps-border);
          background: #fff;
          color: var(--ps-text);
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: border-color 150ms ease, color 150ms ease, background 150ms ease;
        }
        .ps-mini-btn:hover:not(:disabled) {
          border-color: var(--ps-primary-hover);
          color: var(--ps-primary);
          background: var(--ps-primary-surface);
        }
        .ps-mini-btn:disabled { cursor: not-allowed; opacity: 0.45; }

        .ps-history {
          display: grid;
          gap: 5px;
          max-height: 260px;
          overflow-y: auto;
        }
        .ps-history-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          background: var(--ps-surface);
        }
        .ps-history-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .ps-history-main strong {
          font-size: 11px;
          font-weight: 800;
          color: var(--ps-text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ps-history-meta { font-size: 9px; color: var(--ps-muted); }
        .ps-history-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .ps-history-badge {
          padding: 2px 7px;
          border-radius: 999px;
          background: #eef0f5;
          color: var(--ps-muted);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .ps-history-dur {
          font-size: 11px;
          font-weight: 800;
          color: var(--ps-text);
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .ps-trash { width: 14px; height: 14px; }
        .ps-empty {
          margin: 0;
          padding: 16px 12px;
          border-radius: 9px;
          background: var(--ps-surface);
          color: var(--ps-muted);
          font-size: 11px;
          font-weight: 600;
          text-align: center;
          line-height: 1.6;
        }

        /* ------------------------------------------------ help */
        .ps-step {
          display: flex;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px solid var(--ps-border);
        }
        .ps-step:first-child { padding-top: 0; }
        .ps-step:last-child { padding-bottom: 0; border-bottom: 0; }
        .ps-step > span {
          width: 26px;
          height: 26px;
          flex: 0 0 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          background: var(--ps-primary-soft);
          color: var(--ps-primary);
          font-size: 9px;
          font-weight: 900;
        }
        .ps-step strong {
          display: block;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 2px;
          color: var(--ps-text);
        }
        .ps-step p { margin: 0; font-size: 10px; line-height: 1.5; color: var(--ps-muted); }
        .ps-step kbd {
          display: inline-block;
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid var(--ps-border);
          background: #fff;
          font-size: 9px;
          font-weight: 800;
          color: var(--ps-text);
        }

        .ps-note {
          margin: 12px 0 0;
          text-align: center;
          font-size: 10px;
          line-height: 1.7;
          color: var(--ps-muted);
        }

        /* ------------------------------------------------ responsive */
        @media (max-width: 520px) {
          .ps-head { flex-wrap: wrap; }
          .ps-best-value { font-size: 16px; }
          .ps-bar-cell { padding: 8px; }
          .ps-bar-cell strong { font-size: 13px; }
          .ps-action { flex-direction: column; }
          .ps-action-btns { justify-content: stretch; }
          .ps-action-btns .ps-btn { flex: 1; padding: 0 10px; }
          .ps-grid { grid-template-columns: minmax(0, 1fr); }
          .ps-week-bars { height: 82px; }
          .ps-ambient-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ps-ring-fill,
          .ps-goal-fill,
          .ps-subject-fill,
          .ps-week-bar,
          .ps-btn-pri.ps-btn-ready,
          .ps-pill-active .ps-pill-dot {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </ToolShell>
  );
}