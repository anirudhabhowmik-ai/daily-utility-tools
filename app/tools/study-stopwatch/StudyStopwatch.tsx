"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ToolShell from "../ToolShell";

/* ---------------------------------------------------------------- types */

type Mode = "stopwatch" | "pomodoro" | "countdown";
type PomodoroPhase = "focus" | "break" | "longBreak";
type Tone = "idle" | "active" | "success" | "warn";

type AmbientId = "none" | "brown" | "rain" | "drone" | "cafe" | "forest";

type StudySession = {
  id: string;
  subject: string;
  duration: number;
  date: string;
  completedAt: string;
  mode: Mode;
};

type PomodoroSettings = {
  focus: number;
  break: number;
  longBreak: number;
  cycles: number;
};

type Persisted = {
  sessions: StudySession[];
  goalMinutes: number;
  subject: string;
  customSubject: string;
  mode: Mode;
  pomodoro: PomodoroSettings;
  countdownMinutes: number;
  soundOn: boolean;
  autoStart: boolean;
  phase: PomodoroPhase;
  cycleCount: number;
  accumulated: number;
  startedAt: number | null;
  ambient: AmbientId;
  ambientVolume: number;
};

/* ------------------------------------------------------------ constants */

const STORAGE_KEY = "toolsab-study-stopwatch-v2";
const LEGACY_KEY = "toolsab-study-stopwatch-v1";

const DEFAULT_POMODORO: PomodoroSettings = {
  focus: 25,
  break: 5,
  longBreak: 15,
  cycles: 4,
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
const COUNTDOWN_PRESETS = [15, 25, 30, 45, 60, 90];

const MODES: { id: Mode; name: string; meta: string }[] = [
  { id: "stopwatch", name: "Stopwatch", meta: "open-ended" },
  { id: "pomodoro", name: "Pomodoro", meta: "focus + breaks" },
  { id: "countdown", name: "Countdown", meta: "set a target" },
];

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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatClock(milliseconds: number) {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function formatShort(milliseconds: number) {
  const totalMinutes = Math.floor(Math.max(0, milliseconds) / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function formatDuration(milliseconds: number) {
  if (milliseconds <= 0) return "0 min";
  const totalMinutes = Math.max(1, Math.round(milliseconds / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

function formatGoalOption(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0
    ? `${hours} hour${hours > 1 ? "s" : ""}`
    : `${hours}h ${rest}m`;
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

function modeLabel(mode: Mode) {
  if (mode === "pomodoro") return "Pomodoro";
  if (mode === "countdown") return "Countdown";
  return "Stopwatch";
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

export default function StudyStopwatch() {
  const [hydrated, setHydrated] = useState(false);

  /* ---- data ---- */
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subject, setSubject] = useState("Mathematics");
  const [customSubject, setCustomSubject] = useState("");
  const [goalMinutes, setGoalMinutes] = useState(120);

  /* ---- timer config ---- */
  const [mode, setMode] = useState<Mode>("stopwatch");
  const [pomodoro, setPomodoro] = useState<PomodoroSettings>(DEFAULT_POMODORO);
  const [countdownMinutes, setCountdownMinutes] = useState(45);
  const [soundOn, setSoundOn] = useState(true);
  const [autoStart, setAutoStart] = useState(true);

  /* ---- ambient ---- */
  const [ambient, setAmbient] = useState<AmbientId>("none");
  const [ambientVolume, setAmbientVolume] = useState(0.35);

  /* ---- pomodoro runtime ---- */
  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [cycleCount, setCycleCount] = useState(0);

  /* ---- clock ---- */
  const [accumulated, setAccumulated] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  /* ---- ui ---- */
  const [message, setMessage] = useState(
    "Pick a subject and start your first focus block."
  );
  const [tone, setTone] = useState<Tone>("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [showAmbient, setShowAmbient] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const baseTitleRef = useRef<string>("");

  /* ----- ambient audio graph refs ----- */
  const ambientRef = useRef<{
    ctx: AudioContext;
    master: GainNode;
    nodes: AudioScheduledSourceNode[];
    stop: () => void;
  } | null>(null);

  const isRunning = startedAt !== null;

  /* ------------------------------------------------------------- derive */

  const liveSegment = startedAt !== null ? Math.max(0, now - startedAt) : 0;
  const elapsed = accumulated + liveSegment;

  const segmentMs =
    mode === "pomodoro"
      ? Math.max(
          1,
          phase === "focus"
            ? pomodoro.focus
            : phase === "longBreak"
            ? pomodoro.longBreak
            : pomodoro.break
        ) * 60000
      : mode === "countdown"
      ? Math.max(1, countdownMinutes) * 60000
      : 0;

  const remaining =
    mode === "stopwatch" ? elapsed : Math.max(0, segmentMs - elapsed);
  const displayMs = mode === "stopwatch" ? elapsed : remaining;

  const inBreak = mode === "pomodoro" && phase !== "focus";

  /** Time that actually counts as studying (breaks do not). */
  const liveStudyMs = inBreak ? 0 : elapsed;

  const selectedSubject =
    subject === "Other" ? customSubject.trim() || "Other" : subject;

  const todayKey = getLocalDateKey();

  const todaySessions = useMemo(
    () => sessions.filter((session) => session.date === todayKey),
    [sessions, todayKey]
  );

  const todayStudyTime = todaySessions.reduce(
    (total, session) => total + session.duration,
    0
  );
  const currentTotalToday = todayStudyTime + liveStudyMs;

  const goalMs = Math.max(1, goalMinutes) * 60000;
  const goalProgress = Math.min(
    100,
    goalMs > 0 ? (currentTotalToday / goalMs) * 100 : 0
  );

  const totalCompletedTime = sessions.reduce(
    (total, session) => total + session.duration,
    0
  );

  const streaks = useMemo(() => {
    const days = new Set(sessions.map((session) => session.date));

    let current = 0;
    const cursor = new Date();
    if (!days.has(getLocalDateKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (days.has(getLocalDateKey(cursor))) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const sorted = [...days].sort();
    let best = 0;
    let run = 0;
    let previous: string | null = null;
    for (const day of sorted) {
      if (previous) {
        const prevTime = new Date(`${previous}T00:00:00`).getTime();
        const thisTime = new Date(`${day}T00:00:00`).getTime();
        const diff = Math.round((thisTime - prevTime) / 86400000);
        run = diff === 1 ? run + 1 : 1;
      } else {
        run = 1;
      }
      best = Math.max(best, run);
      previous = day;
    }

    return { current, best: Math.max(best, current) };
  }, [sessions]);

  const weekly = useMemo(() => {
    const days: {
      key: string;
      label: string;
      total: number;
      isToday: boolean;
    }[] = [];

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = getLocalDateKey(date);
      const total = sessions.reduce(
        (sum, session) => (session.date === key ? sum + session.duration : sum),
        0
      );
      days.push({
        key,
        label: new Intl.DateTimeFormat(undefined, { weekday: "short" })
          .format(date)
          .slice(0, 2),
        total,
        isToday: i === 0,
      });
    }

    return days;
  }, [sessions, todayKey]);

  const weekValues = weekly.map((day) =>
    day.isToday ? day.total + liveStudyMs : day.total
  );
  const weekMax = Math.max(...weekValues, 30 * 60000) * 1.1;
  const goalLinePercent = Math.min(100, (goalMs / weekMax) * 100);
  const showGoalLine = goalMs <= weekMax;

  const weekBest = Math.max(...weekValues, 0);
  const weekTotal = weekValues.reduce((sum, value) => sum + value, 0);

  const subjectSummary = useMemo(() => {
    const totals: Record<string, number> = {};

    todaySessions.forEach((session) => {
      totals[session.subject] =
        (totals[session.subject] || 0) + session.duration;
    });

    if (liveStudyMs > 0) {
      totals[selectedSubject] = (totals[selectedSubject] || 0) + liveStudyMs;
    }

    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [todaySessions, liveStudyMs, selectedSubject]);

  const achievements = useMemo(() => {
    const totalMs = sessions.reduce((sum, s) => sum + s.duration, 0);
    const longest = sessions.reduce((max, s) => Math.max(max, s.duration), 0);

    const perDay: Record<string, number> = {};
    sessions.forEach((session) => {
      perDay[session.date] = (perDay[session.date] || 0) + session.duration;
    });
    const bestDay = Object.values(perDay).reduce(
      (max, value) => Math.max(max, value),
      0
    );

    const pomodoroCount = sessions.filter((s) => s.mode === "pomodoro").length;

    const hasNight = sessions.some((s) => {
      const hour = new Date(s.completedAt).getHours();
      return hour >= 22 || hour < 4;
    });
    const hasEarly = sessions.some((s) => {
      const hour = new Date(s.completedAt).getHours();
      return hour >= 4 && hour < 7;
    });

    return [
      {
        id: "first",
        icon: "🎯",
        label: "First session",
        unlocked: sessions.length >= 1,
      },
      {
        id: "s10",
        icon: "📚",
        label: "10 sessions",
        unlocked: sessions.length >= 10,
      },
      {
        id: "s50",
        icon: "🏅",
        label: "50 sessions",
        unlocked: sessions.length >= 50,
      },
      { id: "h1", icon: "⏱️", label: "1h day", unlocked: bestDay >= 3600000 },
      {
        id: "h4",
        icon: "🔥",
        label: "4h day",
        unlocked: bestDay >= 4 * 3600000,
      },
      {
        id: "st3",
        icon: "📅",
        label: "3-day streak",
        unlocked: streaks.best >= 3,
      },
      {
        id: "st7",
        icon: "🚀",
        label: "7-day streak",
        unlocked: streaks.best >= 7,
      },
      {
        id: "pomo",
        icon: "🍅",
        label: "10 pomodoros",
        unlocked: pomodoroCount >= 10,
      },
      {
        id: "marathon",
        icon: "💎",
        label: "90-min block",
        unlocked: longest >= 90 * 60000,
      },
      {
        id: "t10",
        icon: "🏆",
        label: "10h total",
        unlocked: totalMs >= 10 * 3600000,
      },
      {
        id: "t50",
        icon: "👑",
        label: "50h total",
        unlocked: totalMs >= 50 * 3600000,
      },
      { id: "night", icon: "🌙", label: "Night owl", unlocked: hasNight },
      { id: "early", icon: "🌅", label: "Early bird", unlocked: hasEarly },
    ];
  }, [sessions, streaks.best]);

  const completedInCycle =
    cycleCount === 0
      ? 0
      : ((cycleCount - 1) % Math.max(1, pomodoro.cycles)) + 1;

  const ringProgress =
    mode === "stopwatch"
      ? Math.min(1, currentTotalToday / goalMs)
      : Math.min(1, segmentMs > 0 ? elapsed / segmentMs : 0);

  const ringOffset = RING_CIRCUMFERENCE * (1 - ringProgress);

  const statusLabel = isRunning
    ? inBreak
      ? "ON BREAK"
      : "FOCUSING"
    : elapsed > 0
    ? "PAUSED"
    : "READY";

  const statusKey = isRunning
    ? inBreak
      ? "break"
      : "active"
    : elapsed > 0
    ? "paused"
    : "ready";

  const subLabel =
    mode === "stopwatch"
      ? `${Math.round(goalProgress)}% of daily goal`
      : mode === "pomodoro"
      ? `${
          phase === "focus"
            ? "Focus"
            : phase === "longBreak"
            ? "Long break"
            : "Short break"
        } · block ${Math.max(1, completedInCycle)}/${Math.max(
          1,
          pomodoro.cycles
        )}`
      : `${countdownMinutes} minute countdown`;

  /* ------------------------------------------------------------- chime */

  const playChime = useCallback(
    (kind: "focus" | "break") => {
      if (!soundOn) return;
      try {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctor) return;

        if (!audioRef.current) audioRef.current = new Ctor();
        const ctx = audioRef.current;
        if (ctx.state === "suspended") void ctx.resume();

        const notes =
          kind === "focus" ? [523.25, 659.25, 783.99] : [659.25, 523.25];

        notes.forEach((frequency, index) => {
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = ctx.currentTime + index * 0.13;

          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(frequency, start);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);

          oscillator.connect(gain);
          gain.connect(ctx.destination);
          oscillator.start(start);
          oscillator.stop(start + 0.4);
        });
      } catch {
        // Sound is a bonus — never block the timer.
      }
    },
    [soundOn]
  );

  /* ------------------------------------------------------- ambient engine */

  /**
   * Builds a self-contained ambient soundscape graph.
   * Returns a stop() that tears the whole thing down.
   * Everything here is synthesized — no audio files, no licensing.
   */
  const buildAmbient = useCallback(
    (ctx: AudioContext, id: Exclude<AmbientId, "none">, volume: number) => {
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.8);
      master.connect(ctx.destination);

      const nodes: AudioScheduledSourceNode[] = [];
      const disposers: (() => void)[] = [];

      /** Fill an AudioBuffer with white noise (one-shot, 4s). */
      const makeNoiseBuffer = (seconds = 4) => {
        const length = Math.floor(ctx.sampleRate * seconds);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) {
          data[i] = Math.random() * 2 - 1;
        }
        return buffer;
      };

      /** Loop a noise buffer through a filter into master. */
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

        // For "brown-ish" noise, integrate the white noise with a lowpass
        // to approximate the warmer 1/f² spectrum.
        const filter = ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = frequency;
        filter.Q.value = q;

        const gain = ctx.createGain();
        gain.gain.value = gainValue;

        let last = 0;
        if (brownish) {
          // Pre-process the buffer in-place to brown noise.
          const data = source.buffer!.getChannelData(0);
          for (let i = 0; i < data.length; i += 1) {
            const white = data[i];
            last = (last + 0.02 * white) / 1.02;
            data[i] = last * 3.5;
          }
        }

        source.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        source.start();
        nodes.push(source);
        disposers.push(() => {
          try {
            source.stop();
          } catch {
            /* already stopped */
          }
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
        });
      };

      /** A slow LFO that gently wobbles a target AudioParam. */
      const lfo = (
        target: AudioParam,
        rate: number,
        depth: number,
        base: number
      ) => {
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
          try {
            osc.stop();
          } catch {
            /* already stopped */
          }
          osc.disconnect();
          amp.disconnect();
        });
      };

      /** Sustained filtered drone tone. */
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
          try {
            osc.stop();
          } catch {
            /* already stopped */
          }
          osc.disconnect();
          gain.disconnect();
        });
      };

      switch (id) {
        case "brown": {
          noiseLayer("lowpass", 900, 0.7, 0.55, true);
          lfo(master.gain, 0.05, volume * 0.06, volume);
          break;
        }
        case "rain": {
          // High-passed noise = hiss of droplets + lowpassed = body.
          noiseLayer("highpass", 1400, 0.4, 0.28);
          noiseLayer("lowpass", 700, 0.8, 0.35);
          lfo(master.gain, 0.08, volume * 0.08, volume);
          break;
        }
        case "drone": {
          drone(110, 0.045); // A2
          drone(164.81, 0.03); // E3
          drone(220, 0.018); // A3
          noiseLayer("lowpass", 300, 0.5, 0.12, true);
          break;
        }
        case "cafe": {
          noiseLayer("bandpass", 500, 0.6, 0.45);
          noiseLayer("lowpass", 250, 0.4, 0.25);
          lfo(master.gain, 0.15, volume * 0.05, volume);
          break;
        }
        case "forest": {
          noiseLayer("bandpass", 3000, 0.3, 0.18);
          noiseLayer("lowpass", 1200, 0.5, 0.22);
          lfo(master.gain, 0.11, volume * 0.09, volume);
          break;
        }
      }

      const stop = () => {
        try {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
        } catch {
          /* ignore */
        }
        // Give the fade-out a moment before tearing down.
        window.setTimeout(() => {
          disposers.forEach((fn) => fn());
          master.disconnect();
        }, 260);
      };

      return { master, nodes, stop };
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
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctor) return;

        if (!audioRef.current) audioRef.current = new Ctor();
        const ctx = audioRef.current;
        if (ctx.state === "suspended") void ctx.resume();

        const { master, nodes, stop } = buildAmbient(ctx, id, volume);
        ambientRef.current = { ctx, master, nodes, stop };
      } catch {
        // Audio failure should never break the timer.
      }
    },
    [stopAmbient, buildAmbient]
  );

  /* React to ambient selection / volume changes. */
  useEffect(() => {
    if (!hydrated) return;
    if (ambient === "none") {
      stopAmbient();
      return;
    }
    startAmbient(ambient, ambientVolume);
    // We intentionally re-create on volume change so the gain applies cleanly.
    // The stop() fades out over ~260ms, so it does not click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambient]);

  useEffect(() => {
    if (!hydrated) return;
    if (ambientRef.current && ambient !== "none") {
      const { ctx, master } = ambientRef.current;
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(ambientVolume, ctx.currentTime, 0.12);
      } catch {
        /* ignore */
      }
    }
  }, [ambientVolume, ambient, hydrated]);

  /* Tear down ambient audio on unmount. */
  useEffect(() => {
    return () => {
      stopAmbient();
    };
  }, [stopAmbient]);

  /* ---------------------------------------------------------- persistence */

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const data = JSON.parse(raw) as Partial<Persisted>;

        if (Array.isArray(data.sessions)) {
          setSessions(
            data.sessions
              .filter(isValidSession)
              .map((session) => ({
                ...session,
                mode: session.mode ?? "stopwatch",
              }))
          );
        }
        if (typeof data.goalMinutes === "number")
          setGoalMinutes(data.goalMinutes);
        if (typeof data.subject === "string") setSubject(data.subject);
        if (typeof data.customSubject === "string")
          setCustomSubject(data.customSubject);
        if (data.mode) setMode(data.mode);

        if (data.pomodoro && typeof data.pomodoro === "object") {
          const p = data.pomodoro;
          setPomodoro({
            focus:
              typeof p.focus === "number" ? p.focus : DEFAULT_POMODORO.focus,
            break:
              typeof p.break === "number" ? p.break : DEFAULT_POMODORO.break,
            longBreak:
              typeof p.longBreak === "number"
                ? p.longBreak
                : DEFAULT_POMODORO.longBreak,
            cycles:
              typeof p.cycles === "number"
                ? p.cycles
                : DEFAULT_POMODORO.cycles,
          });
        }

        if (typeof data.countdownMinutes === "number")
          setCountdownMinutes(data.countdownMinutes);
        if (typeof data.soundOn === "boolean") setSoundOn(data.soundOn);
        if (typeof data.autoStart === "boolean") setAutoStart(data.autoStart);
        if (data.phase) setPhase(data.phase);
        if (typeof data.cycleCount === "number")
          setCycleCount(data.cycleCount);
        if (typeof data.accumulated === "number")
          setAccumulated(data.accumulated);
        if (
          typeof data.startedAt === "number" &&
          Number.isFinite(data.startedAt)
        ) {
          setStartedAt(data.startedAt);
        }
        if (isAmbientId(data.ambient)) setAmbient(data.ambient);
        if (
          typeof data.ambientVolume === "number" &&
          Number.isFinite(data.ambientVolume)
        ) {
          setAmbientVolume(Math.min(1, Math.max(0, data.ambientVolume)));
        }
      } else {
        // One-time migration from the v1 stopwatch.
        const legacyRaw = localStorage.getItem(LEGACY_KEY);
        if (legacyRaw) {
          const legacy = JSON.parse(legacyRaw) as {
            sessions?: unknown;
            goalMinutes?: unknown;
            subject?: unknown;
            elapsedBeforeStart?: unknown;
            startedAt?: unknown;
          };

          if (Array.isArray(legacy.sessions)) {
            setSessions(
              legacy.sessions
                .filter(isValidSession)
                .map((session) => ({ ...session, mode: "stopwatch" as Mode }))
            );
          }
          if (typeof legacy.goalMinutes === "number")
            setGoalMinutes(legacy.goalMinutes);
          if (typeof legacy.subject === "string") setSubject(legacy.subject);
          if (typeof legacy.elapsedBeforeStart === "number")
            setAccumulated(legacy.elapsedBeforeStart);
          if (
            typeof legacy.startedAt === "number" &&
            Number.isFinite(legacy.startedAt)
          ) {
            setStartedAt(legacy.startedAt);
          }
        }
      }
    } catch {
      // Corrupted storage — start clean.
    }

    setNow(Date.now());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const payload: Persisted = {
      sessions,
      goalMinutes,
      subject,
      customSubject,
      mode,
      pomodoro,
      countdownMinutes,
      soundOn,
      autoStart,
      phase,
      cycleCount,
      accumulated,
      startedAt,
      ambient,
      ambientVolume,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // The tool keeps working without storage.
    }
  }, [
    hydrated,
    sessions,
    goalMinutes,
    subject,
    customSubject,
    mode,
    pomodoro,
    countdownMinutes,
    soundOn,
    autoStart,
    phase,
    cycleCount,
    accumulated,
    startedAt,
    ambient,
    ambientVolume,
  ]);

  /* -------------------------------------------------------------- ticking */

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  /* -------------------------------------------------------- tab title */

  useEffect(() => {
    baseTitleRef.current = document.title;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (isRunning) {
      document.title = `${formatClock(displayMs)} · ${
        mode === "pomodoro" ? statusLabel : modeLabel(mode)
      }`;
    } else if (baseTitleRef.current) {
      document.title = baseTitleRef.current;
    }
  }, [hydrated, isRunning, displayMs, mode, statusLabel]);

  /* ----------------------------------------------------------- recording */

  const recordSession = useCallback(
    (duration: number, sessionSubject: string, sessionMode: Mode) => {
      if (duration < 1000) return;

      const completedDate = new Date();
      const entry: StudySession = {
        id: `${completedDate.getTime()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        subject: sessionSubject,
        duration,
        date: getLocalDateKey(completedDate),
        completedAt: completedDate.toISOString(),
        mode: sessionMode,
      };

      setSessions((previous) => [entry, ...previous]);
    },
    []
  );

  /* ---------------------------------------------------------- controls */

  const startTimer = useCallback(() => {
    if (startedAt !== null) return;
    const stamp = Date.now();
    setNow(stamp);
    setStartedAt(stamp);
    setTone("active");
    setMessage(
      mode === "pomodoro"
        ? phase === "focus"
          ? `Focus block running — ${selectedSubject}.`
          : "Break running — step away from the screen."
        : `Tracking ${selectedSubject}…`
    );
  }, [startedAt, mode, phase, selectedSubject]);

  const pauseTimer = useCallback(() => {
    if (startedAt === null) return;
    const stamp = Date.now();
    setAccumulated((value) => value + Math.max(0, stamp - startedAt));
    setStartedAt(null);
    setNow(stamp);
    setTone("warn");
    setMessage("Paused — your progress is saved.");
  }, [startedAt]);

  const resetTimer = useCallback(() => {
    setStartedAt(null);
    setAccumulated(0);
    setNow(Date.now());
    setTone("idle");
    setMessage("Timer reset. Ready when you are.");
  }, []);

  const completeSegment = useCallback(() => {
    if (mode === "countdown") {
      recordSession(segmentMs, selectedSubject, "countdown");
      setStartedAt(null);
      setAccumulated(0);
      setNow(Date.now());
      setTone("success");
      setMessage(
        `Countdown complete — ${formatDuration(
          segmentMs
        )} of ${selectedSubject} logged.`
      );
      playChime("focus");
      return;
    }

    if (mode === "pomodoro") {
      if (phase === "focus") {
        recordSession(segmentMs, selectedSubject, "pomodoro");
        const nextCycle = cycleCount + 1;
        setCycleCount(nextCycle);
        const longBreakDue = nextCycle % Math.max(1, pomodoro.cycles) === 0;

        setPhase(longBreakDue ? "longBreak" : "break");
        setAccumulated(0);
        setNow(Date.now());
        setStartedAt(autoStart ? Date.now() : null);
        setTone("success");
        setMessage(
          longBreakDue
            ? "Focus block done — enjoy a long break."
            : "Focus block done — short break time."
        );
        playChime("break");
        return;
      }

      setPhase("focus");
      setAccumulated(0);
      setNow(Date.now());
      setStartedAt(autoStart ? Date.now() : null);
      setTone("active");
      setMessage("Break finished — next focus block is ready.");
      playChime("focus");
    }
  }, [
    mode,
    phase,
    segmentMs,
    cycleCount,
    pomodoro.cycles,
    autoStart,
    selectedSubject,
    recordSession,
    playChime,
  ]);

  useEffect(() => {
    if (!hydrated || !isRunning) return;
    if (mode === "stopwatch") return;
    if (segmentMs <= 0) return;
    if (elapsed < segmentMs) return;
    completeSegment();
  }, [hydrated, isRunning, mode, elapsed, segmentMs, completeSegment]);

  const finishSession = useCallback(() => {
    const total =
      accumulated +
      (startedAt !== null ? Math.max(0, Date.now() - startedAt) : 0);
    const countable = mode === "pomodoro" && phase !== "focus" ? 0 : total;

    if (mode === "pomodoro" && phase !== "focus") {
      setPhase("focus");
      setAccumulated(0);
      setStartedAt(autoStart ? Date.now() : null);
      setNow(Date.now());
      setTone("active");
      setMessage("Break skipped — back to focus.");
      return;
    }

    if (countable >= 1000) {
      recordSession(countable, selectedSubject, mode);
      setTone("success");
      setMessage(`Saved ${formatDuration(countable)} of ${selectedSubject}.`);
      playChime("focus");
    } else {
      setTone("warn");
      setMessage("Nothing to save yet — start the timer first.");
    }

    setStartedAt(null);
    setAccumulated(0);
    setNow(Date.now());
    setPhase("focus");
  }, [
    accumulated,
    startedAt,
    mode,
    phase,
    autoStart,
    recordSession,
    selectedSubject,
    playChime,
  ]);

  const changeMode = useCallback(
    (next: Mode) => {
      if (isRunning || next === mode) return;
      setMode(next);
      setStartedAt(null);
      setAccumulated(0);
      setPhase("focus");
      setNow(Date.now());
      setTone("idle");
      setMessage(
        next === "stopwatch"
          ? "Stopwatch ready — track study of any length."
          : next === "pomodoro"
          ? "Pomodoro ready — focus, then take a break."
          : `Countdown set to ${countdownMinutes} minutes.`
      );
    },
    [isRunning, mode, countdownMinutes]
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((previous) => previous.filter((session) => session.id !== id));
  }, []);

  const exportCSV = useCallback(() => {
    const rows = [
      ["Date", "Completed At", "Subject", "Mode", "Duration (minutes)"],
      ...sessions.map((session) => [
        session.date,
        new Date(session.completedAt).toLocaleTimeString(),
        session.subject,
        modeLabel(session.mode),
        (session.duration / 60000).toFixed(2),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `toolsab-study-sessions-${getLocalDateKey()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [sessions]);

  /* --------------------------------------------------------- shortcuts */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.code === "Space") {
        event.preventDefault();
        if (isRunning) pauseTimer();
        else startTimer();
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        finishSession();
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        resetTimer();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRunning, pauseTimer, startTimer, finishSession, resetTimer]);

  /* ------------------------------------------------------------- render */

  const messageIcon =
    tone === "success"
      ? "✓"
      : tone === "warn"
      ? "!"
      : tone === "active"
      ? "◉"
      : "◆";

  const setPomodoroField = (
    field: keyof PomodoroSettings,
    raw: string,
    min: number,
    max: number
  ) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.min(max, Math.max(min, Math.round(parsed)));
    setPomodoro((previous) => ({ ...previous, [field]: clamped }));
  };

  const activeAmbient =
    AMBIENT_OPTIONS.find((option) => option.id === ambient) ??
    AMBIENT_OPTIONS[0];

  return (
    <ToolShell title="Study Stopwatch & Tracker" onReset={resetTimer} wide>
      <div className="ss">
        {/* HEADER */}
        <header className="ss-head">
          <div className="ss-head-text">
            <span className="ss-eyebrow">FOCUS ENGINE · PRO</span>
            <h2>Study Stopwatch &amp; Tracker</h2>
          </div>
          <div className="ss-best">
            <span className="ss-best-label">STREAK</span>
            <strong className="ss-best-value">🔥 {streaks.current}</strong>
          </div>
        </header>

        {/* STAT BAR */}
        <div className="ss-bar">
          <div className="ss-bar-cell">
            <span>TODAY</span>
            <strong>{formatShort(currentTotalToday)}</strong>
          </div>
          <div className="ss-bar-sep" />
          <div className="ss-bar-cell">
            <span>SESSIONS</span>
            <strong>{todaySessions.length}</strong>
          </div>
          <div className="ss-bar-sep" />
          <div className="ss-bar-cell">
            <span>GOAL</span>
            <strong>{Math.round(goalProgress)}%</strong>
          </div>
          <div className="ss-bar-sep" />
          <div className="ss-bar-cell">
            <span>ALL TIME</span>
            <strong>{formatShort(totalCompletedTime)}</strong>
          </div>
        </div>

        {/* STAGE */}
        <div className={`ss-stage ${isRunning ? "is-running" : ""}`}>
          <div className="ss-stage-top">
            <span className={`ss-pill ss-pill-${statusKey}`}>
              <span className="ss-pill-dot" />
              {statusLabel}
            </span>

            <div className="ss-stage-right">
              {mode === "pomodoro" && (
                <span
                  className="ss-cycle-dots"
                  aria-label={`Block ${completedInCycle} of ${pomodoro.cycles}`}
                >
                  {Array.from(
                    { length: Math.max(1, pomodoro.cycles) },
                    (_, index) => (
                      <span
                        key={index}
                        className={`ss-dot ${
                          index < completedInCycle ? "is-on" : ""
                        }`}
                      />
                    )
                  )}
                </span>
              )}

              <button
                type="button"
                className={`ss-icon-btn ${ambient !== "none" ? "is-on" : ""}`}
                onClick={() => setShowAmbient((value) => !value)}
                aria-label={
                  ambient === "none"
                    ? "Open ambient sound panel"
                    : `Ambient: ${activeAmbient.label}`
                }
                title={
                  ambient === "none"
                    ? "Ambient sound"
                    : `Ambient: ${activeAmbient.label}`
                }
              >
                {ambient === "none" ? "🎧" : activeAmbient.icon}
              </button>

              <button
                type="button"
                className={`ss-icon-btn ${soundOn ? "is-on" : ""}`}
                onClick={() => setSoundOn((value) => !value)}
                aria-label={
                  soundOn ? "Mute completion sound" : "Enable completion sound"
                }
                title={soundOn ? "Sound on" : "Sound off"}
              >
                {soundOn ? "🔔" : "🔕"}
              </button>
            </div>
          </div>

          <div className="ss-ring-wrap">
            <svg className="ss-ring" viewBox="0 0 220 220" aria-hidden="true">
              <defs>
                <linearGradient
                  id="ssRingGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#ff8a4c" />
                  <stop offset="100%" stopColor="#e94b18" />
                </linearGradient>
              </defs>
              <circle
                className="ss-ring-track"
                cx="110"
                cy="110"
                r={RING_RADIUS}
              />
              <circle
                className="ss-ring-fill"
                cx="110"
                cy="110"
                r={RING_RADIUS}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 110 110)"
              />
            </svg>

            <div className="ss-ring-center">
              <div className="ss-time" role="timer" aria-live="off">
                {hydrated ? formatClock(displayMs) : "--:--"}
              </div>
              <div className="ss-time-sub">{subLabel}</div>
            </div>
          </div>
        </div>

        {/* GOAL BAR */}
        <div className="ss-goal">
          <div className="ss-goal-top">
            <span>Daily goal · {formatGoalOption(goalMinutes)}</span>
            <span>
              {goalProgress >= 100
                ? "Goal reached 🎉"
                : `${formatShort(
                    Math.max(0, goalMs - currentTotalToday)
                  )} left`}
            </span>
          </div>
          <div className="ss-goal-track">
            <div
              className={`ss-goal-fill ${goalProgress >= 100 ? "is-done" : ""}`}
              style={{ width: `${goalProgress}%` }}
            />
          </div>
        </div>

        {/* ACTION ROW */}
        <div className="ss-action">
          <div
            className={`ss-msg ss-msg-${tone}`}
            role="status"
            aria-live="polite"
          >
            <span className="ss-msg-icon">{messageIcon}</span>
            <span>{message}</span>
          </div>

          <div className="ss-action-btns">
            <button
              type="button"
              className="ss-btn ss-btn-ghost"
              onClick={resetTimer}
              disabled={!isRunning && elapsed === 0}
            >
              Reset
            </button>

            <button
              type="button"
              className={`ss-btn ss-btn-pri ${
                !isRunning ? "ss-btn-ready" : ""
              }`}
              onClick={isRunning ? pauseTimer : startTimer}
            >
              {isRunning ? "Pause" : elapsed > 0 ? "Resume" : "Start"}
            </button>

            <button
              type="button"
              className="ss-btn ss-btn-sec"
              onClick={finishSession}
              disabled={!isRunning && elapsed === 0}
            >
              {inBreak ? "Skip break" : "Finish"}
            </button>
          </div>
        </div>

        {/* SUBJECT CHIPS */}
        <div className="ss-chips" role="group" aria-label="Study subject">
          {SUBJECTS.map((item) => (
            <button
              key={item}
              type="button"
              className={`ss-chip ${subject === item ? "is-active" : ""}`}
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
            className="ss-input"
            value={customSubject}
            onChange={(event) => setCustomSubject(event.target.value)}
            placeholder="Name your subject (e.g. Economics)"
            maxLength={32}
            disabled={isRunning}
            aria-label="Custom subject name"
          />
        )}

        {/* MODE STRIP */}
        <div className="ss-mode-strip" role="group" aria-label="Timer mode">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ss-mode-btn ${mode === item.id ? "is-active" : ""}`}
              onClick={() => changeMode(item.id)}
              disabled={isRunning}
              aria-pressed={mode === item.id}
            >
              <span className="ss-mode-name">{item.name}</span>
              <span className="ss-mode-meta">{item.meta}</span>
            </button>
          ))}
        </div>

        {/* COUNTDOWN PRESETS */}
        {mode === "countdown" && (
          <div className="ss-quick" role="group" aria-label="Countdown length">
            {COUNTDOWN_PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={`ss-quick-btn ${
                  countdownMinutes === minutes ? "is-active" : ""
                }`}
                onClick={() => {
                  if (isRunning) return;
                  setCountdownMinutes(minutes);
                  setAccumulated(0);
                  setStartedAt(null);
                  setNow(Date.now());
                  setTone("idle");
                  setMessage(`Countdown set to ${minutes} minutes.`);
                }}
                disabled={isRunning}
                aria-pressed={countdownMinutes === minutes}
              >
                {minutes}m
              </button>
            ))}
          </div>
        )}

        {/* AMBIENT PANEL */}
        <button
          type="button"
          className="ss-expand"
          onClick={() => setShowAmbient((value) => !value)}
          aria-expanded={showAmbient}
        >
          <span>
            Ambient sound ·{" "}
            {ambient === "none" ? "off" : activeAmbient.label.toLowerCase()}
          </span>
          <span className="ss-expand-chev">{showAmbient ? "−" : "+"}</span>
        </button>

        {showAmbient && (
          <div className="ss-panel">
            <p className="ss-ambient-note">
              Synthesized in your browser — no files, no tracking. Soundscapes
              mask distractions; they are deliberately non-musical so they do
              not compete with your reading.
            </p>

            <div
              className="ss-ambient-grid"
              role="group"
              aria-label="Ambient soundscape"
            >
              {AMBIENT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`ss-ambient-btn ${
                    ambient === option.id ? "is-active" : ""
                  }`}
                  onClick={() => setAmbient(option.id)}
                  aria-pressed={ambient === option.id}
                >
                  <span className="ss-ambient-icon">{option.icon}</span>
                  <span className="ss-ambient-label">{option.label}</span>
                  <span className="ss-ambient-hint">{option.hint}</span>
                </button>
              ))}
            </div>

            <label className="ss-field ss-ambient-vol">
              <span>Volume · {Math.round(ambientVolume * 100)}%</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={ambientVolume}
                onChange={(event) =>
                  setAmbientVolume(Number(event.target.value))
                }
                disabled={ambient === "none"}
              />
            </label>
          </div>
        )}

        {/* SETTINGS */}
        <button
          type="button"
          className="ss-expand"
          onClick={() => setShowSettings((value) => !value)}
          aria-expanded={showSettings}
        >
          <span>Settings · goal, pomodoro &amp; sound</span>
          <span className="ss-expand-chev">{showSettings ? "−" : "+"}</span>
        </button>

        {showSettings && (
          <div className="ss-panel">
            <div className="ss-grid">
              <label className="ss-field">
                <span>Daily goal</span>
                <select
                  value={goalMinutes}
                  onChange={(event) =>
                    setGoalMinutes(Number(event.target.value))
                  }
                >
                  {GOAL_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {formatGoalOption(minutes)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ss-field">
                <span>Focus length (min)</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={pomodoro.focus}
                  onChange={(event) =>
                    setPomodoroField("focus", event.target.value, 1, 120)
                  }
                />
              </label>

              <label className="ss-field">
                <span>Short break (min)</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={pomodoro.break}
                  onChange={(event) =>
                    setPomodoroField("break", event.target.value, 1, 60)
                  }
                />
              </label>

              <label className="ss-field">
                <span>Long break (min)</span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={pomodoro.longBreak}
                  onChange={(event) =>
                    setPomodoroField("longBreak", event.target.value, 1, 90)
                  }
                />
              </label>

              <label className="ss-field">
                <span>Blocks per long break</span>
                <input
                  type="number"
                  min={2}
                  max={8}
                  value={pomodoro.cycles}
                  onChange={(event) =>
                    setPomodoroField("cycles", event.target.value, 2, 8)
                  }
                />
              </label>

              <label className="ss-field">
                <span>Countdown (min)</span>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={countdownMinutes}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    if (!Number.isFinite(parsed)) return;
                    setCountdownMinutes(
                      Math.min(600, Math.max(1, Math.round(parsed)))
                    );
                  }}
                />
              </label>
            </div>

            <div className="ss-toggles">
              <button
                type="button"
                role="switch"
                aria-checked={autoStart}
                className={`ss-toggle ${autoStart ? "is-on" : ""}`}
                onClick={() => setAutoStart((value) => !value)}
              >
                <span className="ss-toggle-dot" />
                Auto-start next block
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={soundOn}
                className={`ss-toggle ${soundOn ? "is-on" : ""}`}
                onClick={() => setSoundOn((value) => !value)}
              >
                <span className="ss-toggle-dot" />
                Completion sound
              </button>
            </div>
          </div>
        )}

        {/* INSIGHTS */}
        <button
          type="button"
          className="ss-expand"
          onClick={() => setShowInsights((value) => !value)}
          aria-expanded={showInsights}
        >
          <span>
            Insights · 7-day trend · {subjectSummary.length} subject
            {subjectSummary.length === 1 ? "" : "s"} today
          </span>
          <span className="ss-expand-chev">{showInsights ? "−" : "+"}</span>
        </button>

        {showInsights && (
          <div className="ss-panel">
            <div className="ss-week">
              <div className="ss-week-bars">
                {showGoalLine && (
                  <div
                    className="ss-goal-line"
                    style={{ bottom: `${goalLinePercent}%` }}
                    aria-hidden="true"
                  />
                )}

                {weekly.map((day, index) => {
                  const value = weekValues[index];
                  const height =
                    weekMax > 0 ? Math.max(3, (value / weekMax) * 100) : 3;

                  return (
                    <div className="ss-week-col" key={day.key}>
                      <div
                        className={`ss-week-bar ${
                          day.isToday ? "is-today" : ""
                        } ${value > 0 ? "has-value" : ""}`}
                        style={{ height: `${height}%` }}
                        title={`${day.label}: ${formatShort(value)}`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="ss-week-labels">
                {weekly.map((day) => (
                  <span
                    key={day.key}
                    className={day.isToday ? "is-today" : undefined}
                  >
                    {day.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="ss-week-foot">
              <span>Best day: {formatShort(weekBest)}</span>
              <span>7-day total: {formatShort(weekTotal)}</span>
              <span>Streak: {streaks.current} 🔥</span>
            </div>

            <div className="ss-subjects">
              {subjectSummary.length === 0 ? (
                <p className="ss-empty">
                  Your subject breakdown appears once you log study time today.
                </p>
              ) : (
                subjectSummary.map(([name, duration], index) => {
                  const percentage =
                    currentTotalToday > 0
                      ? (duration / currentTotalToday) * 100
                      : 0;
                  const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];

                  return (
                    <div className="ss-subject-row" key={name}>
                      <div className="ss-subject-top">
                        <span className="ss-subject-name">
                          <span
                            className="ss-subject-dot"
                            style={{ background: color }}
                          />
                          {name}
                        </span>
                        <span className="ss-subject-time">
                          {formatShort(duration)}
                        </span>
                      </div>
                      <div className="ss-subject-track">
                        <div
                          className="ss-subject-fill"
                          style={{
                            width: `${percentage}%`,
                            background: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="ss-achievements">
              {achievements.map((achievement) => (
                <span
                  key={achievement.id}
                  className={`ss-achievement ${
                    achievement.unlocked ? "is-unlocked" : ""
                  }`}
                >
                  <span className="ss-ach-icon">
                    {achievement.unlocked ? achievement.icon : "🔒"}
                  </span>
                  {achievement.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* HISTORY */}
        <button
          type="button"
          className="ss-expand"
          onClick={() => setShowHistory((value) => !value)}
          aria-expanded={showHistory}
        >
          <span>
            History · {sessions.length} session{sessions.length === 1 ? "" : "s"}
          </span>
          <span className="ss-expand-chev">{showHistory ? "−" : "+"}</span>
        </button>

        {showHistory && (
          <div className="ss-panel">
            <div className="ss-panel-head">
              <span>{formatDuration(totalCompletedTime)} logged all-time</span>
              <button
                type="button"
                className="ss-mini-btn"
                onClick={exportCSV}
                disabled={sessions.length === 0}
              >
                Export CSV
              </button>
            </div>

            {sessions.length === 0 ? (
              <p className="ss-empty">
                No completed sessions yet. Start your first block to build your
                history.
              </p>
            ) : (
              <div className="ss-history">
                {sessions.map((session) => (
                  <div className="ss-history-row" key={session.id}>
                    <div className="ss-history-main">
                      <strong>{session.subject}</strong>
                      <span className="ss-history-meta">
                        {new Date(session.completedAt).toLocaleString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>

                    <div className="ss-history-right">
                      <span className="ss-history-badge">
                        {modeLabel(session.mode)}
                      </span>
                      <span className="ss-history-dur">
                        {formatDuration(session.duration)}
                      </span>
                      <button
                        type="button"
                        className="ss-icon-btn"
                        onClick={() => deleteSession(session.id)}
                        aria-label={`Delete ${session.subject} session`}
                        title="Delete session"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="ss-trash"
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
          className="ss-expand"
          onClick={() => setShowHelp((value) => !value)}
          aria-expanded={showHelp}
        >
          <span>How to use</span>
          <span className="ss-expand-chev">{showHelp ? "−" : "+"}</span>
        </button>

        {showHelp && (
          <div className="ss-panel">
            <div className="ss-step">
              <span>01</span>
              <div>
                <strong>Pick a mode</strong>
                <p>
                  Stopwatch for open study, Pomodoro for timed blocks with
                  breaks, Countdown for a fixed target.
                </p>
              </div>
            </div>
            <div className="ss-step">
              <span>02</span>
              <div>
                <strong>Choose a subject</strong>
                <p>
                  Everything you log is filed under the selected subject so your
                  breakdown stays accurate.
                </p>
              </div>
            </div>
            <div className="ss-step">
              <span>03</span>
              <div>
                <strong>Set the mood (optional)</strong>
                <p>
                  Open Ambient sound to pick a synthesized background. It is
                  non-musical on purpose — meant to mask distractions, not to
                  entertain.
                </p>
              </div>
            </div>
            <div className="ss-step">
              <span>04</span>
              <div>
                <strong>Finish &amp; review</strong>
                <p>
                  Hit Finish (or let the block end) to save the session. Watch
                  your streak, goal ring and achievements grow.
                </p>
              </div>
            </div>
            <div className="ss-step">
              <span>05</span>
              <div>
                <strong>Keyboard shortcuts</strong>
                <p>
                  <kbd>Space</kbd> start / pause · <kbd>F</kbd> finish ·{" "}
                  <kbd>R</kbd> reset.
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="ss-note">
          Everything is stored in this browser only. Export a CSV to keep a
          permanent copy of your study log.
        </p>
      </div>

      <style jsx>{`
        .ss {
          --ss-primary: #ff5a1f;
          --ss-primary-dark: #e64a14;
          --ss-primary-soft: #fff3ed;
          --ss-primary-surface: #fff7f3;
          --ss-primary-hover: #ffb69d;
          --ss-text: var(--text-main, #172033);
          --ss-muted: var(--text-muted, #596579);
          --ss-border: var(--border-color, #e8ebf1);
          --ss-surface: var(--card-bg, #ffffff);
          --ss-soft: #fafbfc;

          color: var(--ss-text);
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
        }

        /* ------------------------------------------------ header */
        .ss-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .ss-head-text {
          min-width: 0;
        }

        .ss-eyebrow {
          display: block;
          color: var(--ss-primary);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          margin-bottom: 3px;
        }

        .ss-head h2 {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.2;
          margin: 0;
        }

        .ss-best {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
          padding: 8px 12px;
          border: 1px solid var(--ss-border);
          border-radius: 10px;
          background: linear-gradient(145deg, #fff3ed, #fffaf7);
          flex-shrink: 0;
        }

        .ss-best-label {
          font-size: 8px;
          font-weight: 800;
          color: var(--ss-muted);
          letter-spacing: 1px;
        }

        .ss-best-value {
          font-size: 18px;
          font-weight: 800;
          color: var(--ss-primary);
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }

        /* ------------------------------------------------ stat bar */
        .ss-bar {
          display: flex;
          align-items: stretch;
          border: 1px solid var(--ss-border);
          border-radius: 11px;
          background: var(--ss-surface);
          overflow: hidden;
          margin-bottom: 12px;
        }

        .ss-bar-cell {
          flex: 1;
          min-width: 0;
          padding: 9px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .ss-bar-cell > span {
          font-size: 8px;
          font-weight: 800;
          color: var(--ss-muted);
          letter-spacing: 0.9px;
        }

        .ss-bar-cell strong {
          font-size: 15px;
          font-weight: 800;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
          color: var(--ss-text);
        }

        .ss-bar-sep {
          width: 1px;
          background: var(--ss-border);
          flex-shrink: 0;
        }

        /* ------------------------------------------------ stage */
        .ss-stage {
          position: relative;
          padding: 14px;
          border: 1px solid var(--ss-border);
          border-radius: 16px;
          background: radial-gradient(
            circle at 50% 15%,
            #ffffff 0%,
            #fafbfc 72%
          );
          box-shadow: 0 6px 20px rgba(23, 32, 51, 0.05);
          transition: box-shadow 240ms ease, border-color 240ms ease;
        }

        .ss-stage.is-running {
          border-color: var(--ss-primary-hover);
          box-shadow: 0 10px 30px rgba(255, 90, 31, 0.14);
        }

        .ss-stage-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .ss-stage-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ss-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5px;
          white-space: nowrap;
          background: var(--ss-primary-soft);
          color: var(--ss-primary);
        }

        .ss-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--ss-primary);
          box-shadow: 0 0 0 2px rgba(255, 90, 31, 0.15);
        }

        .ss-pill-active .ss-pill-dot {
          animation: ssBlink 1.4s ease-in-out infinite;
        }

        .ss-pill-break {
          background: #ecfdf5;
          color: #15803d;
        }

        .ss-pill-break .ss-pill-dot {
          background: #16a34a;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15);
        }

        .ss-pill-paused {
          background: #fef3c7;
          color: #b45309;
        }

        .ss-pill-paused .ss-pill-dot {
          background: #f59e0b;
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.18);
        }

        @keyframes ssBlink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.35;
          }
        }

        .ss-cycle-dots {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .ss-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #e2e6ee;
          transition: background 200ms ease, transform 200ms ease;
        }

        .ss-dot.is-on {
          background: var(--ss-primary);
          transform: scale(1.15);
        }

        .ss-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid var(--ss-border);
          background: #fff;
          font-size: 12px;
          line-height: 1;
          cursor: pointer;
          transition: border-color 150ms ease, background 150ms ease;
        }

        .ss-icon-btn:hover {
          border-color: var(--ss-primary-hover);
          background: var(--ss-primary-surface);
        }

        .ss-icon-btn.is-on {
          border-color: var(--ss-primary-hover);
          background: var(--ss-primary-soft);
        }

        /* ------------------------------------------------ ring */
        .ss-ring-wrap {
          position: relative;
          width: min(258px, 74vw);
          aspect-ratio: 1;
          margin: 8px auto 2px;
          display: grid;
          place-items: center;
        }

        .ss-ring {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .ss-ring-track {
          fill: none;
          stroke: #eef0f5;
          stroke-width: 12;
        }

        .ss-ring-fill {
          fill: none;
          stroke: url(#ssRingGrad);
          stroke-width: 12;
          stroke-linecap: round;
          transition: stroke-dashoffset 220ms linear;
        }

        .ss-stage.is-running .ss-ring-fill {
          filter: drop-shadow(0 0 6px rgba(255, 90, 31, 0.35));
        }

        .ss-ring-center {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-align: center;
          padding: 0 22px;
        }

        .ss-time {
          font-size: clamp(30px, 9vw, 44px);
          font-weight: 900;
          letter-spacing: -1.5px;
          line-height: 1;
          font-variant-numeric: tabular-nums;
          color: var(--ss-text);
        }

        .ss-time-sub {
          font-size: 10px;
          font-weight: 700;
          color: var(--ss-muted);
          letter-spacing: 0.2px;
          line-height: 1.4;
        }

        /* ------------------------------------------------ goal bar */
        .ss-goal {
          margin-top: 10px;
          padding: 10px 12px;
          border: 1px solid var(--ss-border);
          border-radius: 11px;
          background: var(--ss-surface);
        }

        .ss-goal-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          font-size: 10px;
          font-weight: 700;
          color: var(--ss-muted);
          margin-bottom: 7px;
        }

        .ss-goal-track {
          height: 7px;
          border-radius: 999px;
          background: #eef0f5;
          overflow: hidden;
        }

        .ss-goal-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff8a4c, #ff5a1f);
          transition: width 260ms ease;
        }

        .ss-goal-fill.is-done {
          background: linear-gradient(90deg, #34d399, #10b981);
        }

        /* ------------------------------------------------ action row */
        .ss-action {
          display: flex;
          align-items: stretch;
          gap: 8px;
          margin-top: 10px;
        }

        .ss-msg {
          flex: 1;
          min-width: 0;
          min-height: 40px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 11px;
          border-radius: 9px;
          background: var(--ss-soft);
          color: var(--ss-muted);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.4;
        }

        .ss-msg-icon {
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

        .ss-msg-active {
          background: var(--ss-primary-soft);
          color: var(--ss-primary-dark);
        }

        .ss-msg-active .ss-msg-icon {
          background: #ffe2d5;
          color: var(--ss-primary);
        }

        .ss-msg-success {
          background: #ecfdf5;
          color: #166534;
        }

        .ss-msg-success .ss-msg-icon {
          background: #dcfce7;
          color: #15803d;
        }

        .ss-msg-warn {
          background: #fffbeb;
          color: #b45309;
        }

        .ss-msg-warn .ss-msg-icon {
          background: #fef3c7;
          color: #b45309;
        }

        .ss-action-btns {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }

        .ss-btn {
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

        .ss-btn:focus-visible {
          outline: 3px solid var(--ss-primary-hover);
          outline-offset: 3px;
        }

        .ss-btn:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .ss-btn-pri {
          border: 1px solid #e74e1b;
          background: linear-gradient(135deg, #ff682f, #e94b18);
          color: #fff;
          box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
          min-width: 88px;
        }

        .ss-btn-pri:hover:not(:disabled) {
          background: linear-gradient(135deg, #f45a25, #d94112);
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(255, 90, 31, 0.28);
        }

        .ss-btn-pri.ss-btn-ready {
          animation: ssReady 1.6s ease-in-out infinite;
        }

        @keyframes ssReady {
          0%,
          100% {
            box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
          }
          50% {
            box-shadow: 0 3px 18px rgba(255, 90, 31, 0.45);
          }
        }

        .ss-btn-sec {
          border: 1px solid var(--ss-border);
          background: #fff;
          color: var(--ss-text);
        }

        .ss-btn-sec:hover:not(:disabled) {
          border-color: var(--ss-primary-hover);
          color: var(--ss-primary);
          background: var(--ss-primary-surface);
        }

        .ss-btn-ghost {
          border: 1px solid transparent;
          background: transparent;
          color: var(--ss-muted);
        }

        .ss-btn-ghost:hover:not(:disabled) {
          color: var(--ss-primary);
          background: var(--ss-primary-surface);
        }

        /* ------------------------------------------------ subject chips */
        .ss-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
        }

        .ss-chip {
          padding: 6px 11px;
          border-radius: 999px;
          border: 1px solid var(--ss-border);
          background: var(--ss-surface);
          color: var(--ss-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 150ms ease, background 150ms ease,
            color 150ms ease;
        }

        .ss-chip:hover:not(:disabled) {
          border-color: var(--ss-primary-hover);
          color: var(--ss-primary);
          background: var(--ss-primary-surface);
        }

        .ss-chip.is-active {
          border-color: var(--ss-primary);
          background: var(--ss-primary-soft);
          color: var(--ss-primary);
          box-shadow: inset 0 0 0 1px var(--ss-primary);
        }

        .ss-chip:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .ss-input {
          width: 100%;
          margin-top: 8px;
          padding: 9px 12px;
          border-radius: 9px;
          border: 1px solid var(--ss-border);
          background: #fff;
          color: var(--ss-text);
          font-size: 12px;
          font-weight: 600;
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }

        .ss-input:focus {
          border-color: var(--ss-primary);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
        }

        /* ------------------------------------------------ mode strip */
        .ss-mode-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          margin-top: 12px;
        }

        .ss-mode-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 6px;
          border: 1px solid var(--ss-border);
          border-radius: 10px;
          background: var(--ss-surface);
          color: var(--ss-text);
          cursor: pointer;
          transition: border-color 150ms ease, background 150ms ease;
        }

        .ss-mode-btn:hover:not(:disabled) {
          border-color: var(--ss-primary-hover);
          background: var(--ss-primary-surface);
        }

        .ss-mode-btn:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .ss-mode-btn.is-active {
          border-color: var(--ss-primary);
          background: var(--ss-primary-soft);
          box-shadow: inset 0 0 0 1px var(--ss-primary);
        }

        .ss-mode-name {
          font-size: 12px;
          font-weight: 800;
        }

        .ss-mode-btn.is-active .ss-mode-name {
          color: var(--ss-primary);
        }

        .ss-mode-meta {
          font-size: 9px;
          font-weight: 600;
          color: var(--ss-muted);
        }

        .ss-mode-btn.is-active .ss-mode-meta {
          color: var(--ss-primary);
          opacity: 0.8;
        }

        /* ------------------------------------------------ quick presets */
        .ss-quick {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }

        .ss-quick-btn {
          flex: 1 1 auto;
          min-width: 52px;
          padding: 7px 10px;
          border-radius: 8px;
          border: 1px solid var(--ss-border);
          background: var(--ss-surface);
          color: var(--ss-muted);
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          font-variant-numeric: tabular-nums;
          transition: border-color 150ms ease, background 150ms ease,
            color 150ms ease;
        }

        .ss-quick-btn:hover:not(:disabled) {
          border-color: var(--ss-primary-hover);
          color: var(--ss-primary);
          background: var(--ss-primary-surface);
        }

        .ss-quick-btn.is-active {
          border-color: var(--ss-primary);
          background: var(--ss-primary-soft);
          color: var(--ss-primary);
          box-shadow: inset 0 0 0 1px var(--ss-primary);
        }

        .ss-quick-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        /* ------------------------------------------------ ambient */
        .ss-ambient-note {
          margin: 0 0 10px;
          font-size: 10px;
          line-height: 1.6;
          color: var(--ss-muted);
        }

        .ss-ambient-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
        }

        .ss-ambient-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          padding: 9px 6px;
          border: 1px solid var(--ss-border);
          border-radius: 10px;
          background: #fff;
          color: var(--ss-text);
          cursor: pointer;
          transition: border-color 150ms ease, background 150ms ease;
        }

        .ss-ambient-btn:hover {
          border-color: var(--ss-primary-hover);
          background: var(--ss-primary-surface);
        }

        .ss-ambient-btn.is-active {
          border-color: var(--ss-primary);
          background: var(--ss-primary-soft);
          box-shadow: inset 0 0 0 1px var(--ss-primary);
        }

        .ss-ambient-icon {
          font-size: 15px;
          line-height: 1.2;
        }

        .ss-ambient-label {
          font-size: 10px;
          font-weight: 800;
        }

        .ss-ambient-btn.is-active .ss-ambient-label {
          color: var(--ss-primary);
        }

        .ss-ambient-hint {
          font-size: 8px;
          font-weight: 600;
          color: var(--ss-muted);
        }

        .ss-ambient-vol {
          margin-top: 12px;
        }

        .ss-ambient-vol input[type="range"] {
          padding: 0;
          accent-color: var(--ss-primary);
          cursor: pointer;
        }

        /* ------------------------------------------------ expandables */
        .ss-expand {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          padding: 9px 12px;
          border: 1px solid var(--ss-border);
          border-radius: 9px;
          background: transparent;
          color: var(--ss-muted);
          font-size: 11px;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
          transition: color 150ms ease, border-color 150ms ease;
        }

        .ss-expand:hover {
          color: var(--ss-primary);
          border-color: var(--ss-primary-hover);
        }

        .ss-expand-chev {
          font-size: 14px;
          font-weight: 500;
          color: var(--ss-primary);
          flex-shrink: 0;
        }

        .ss-panel {
          margin-top: 8px;
          padding: 12px 14px;
          border: 1px solid var(--ss-border);
          border-radius: 11px;
          background: var(--ss-soft);
        }

        /* ------------------------------------------------ settings */
        .ss-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .ss-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ss-field > span {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: var(--ss-muted);
          text-transform: uppercase;
        }

        .ss-field select,
        .ss-field input {
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--ss-border);
          background: #fff;
          color: var(--ss-text);
          font-size: 12px;
          font-weight: 700;
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }

        .ss-field select:focus,
        .ss-field input:focus {
          border-color: var(--ss-primary);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
        }

        .ss-toggles {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--ss-border);
        }

        .ss-toggle {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid var(--ss-border);
          background: #fff;
          color: var(--ss-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 150ms ease, background 150ms ease,
            color 150ms ease;
        }

        .ss-toggle-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #cbd5e1;
          transition: background 150ms ease;
        }

        .ss-toggle.is-on {
          border-color: var(--ss-primary);
          background: var(--ss-primary-soft);
          color: var(--ss-primary);
        }

        .ss-toggle.is-on .ss-toggle-dot {
          background: var(--ss-primary);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.15);
        }

        /* ------------------------------------------------ weekly chart */
        .ss-week {
          padding-bottom: 2px;
        }

        .ss-week-bars {
          position: relative;
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          height: 96px;
          align-items: end;
        }

        .ss-goal-line {
          position: absolute;
          left: 0;
          right: 0;
          border-top: 1px dashed rgba(255, 90, 31, 0.45);
          pointer-events: none;
        }

        .ss-week-col {
          height: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .ss-week-bar {
          width: 100%;
          max-width: 26px;
          border-radius: 5px 5px 3px 3px;
          background: #e9edf3;
          transition: height 300ms ease, background 200ms ease;
        }

        .ss-week-bar.has-value {
          background: linear-gradient(180deg, #ffb08c, #ff5a1f);
        }

        .ss-week-bar.is-today {
          box-shadow: 0 0 0 2px rgba(255, 90, 31, 0.22);
        }

        .ss-week-labels {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          margin-top: 5px;
          font-size: 9px;
          font-weight: 800;
          color: var(--ss-muted);
          text-align: center;
          letter-spacing: 0.3px;
        }

        .ss-week-labels .is-today {
          color: var(--ss-primary);
        }

        .ss-week-foot {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 6px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--ss-border);
          font-size: 10px;
          font-weight: 700;
          color: var(--ss-muted);
        }

        /* ------------------------------------------------ subjects */
        .ss-subjects {
          display: grid;
          gap: 9px;
          margin-top: 12px;
        }

        .ss-subject-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .ss-subject-name {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--ss-text);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ss-subject-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .ss-subject-time {
          color: var(--ss-muted);
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }

        .ss-subject-track {
          height: 6px;
          border-radius: 999px;
          background: #eef0f5;
          overflow: hidden;
        }

        .ss-subject-fill {
          height: 100%;
          border-radius: inherit;
          transition: width 260ms ease;
        }

        /* ------------------------------------------------ achievements */
        .ss-achievements {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--ss-border);
        }

        .ss-achievement {
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

        .ss-achievement.is-unlocked {
          background: var(--ss-primary-soft);
          color: var(--ss-primary);
        }

        .ss-ach-icon {
          font-size: 11px;
        }

        /* ------------------------------------------------ history */
        .ss-panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          font-size: 10px;
          font-weight: 700;
          color: var(--ss-muted);
        }

        .ss-mini-btn {
          padding: 6px 10px;
          border-radius: 7px;
          border: 1px solid var(--ss-border);
          background: #fff;
          color: var(--ss-text);
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: border-color 150ms ease, color 150ms ease,
            background 150ms ease;
        }

        .ss-mini-btn:hover:not(:disabled) {
          border-color: var(--ss-primary-hover);
          color: var(--ss-primary);
          background: var(--ss-primary-surface);
        }

        .ss-mini-btn:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .ss-history {
          display: grid;
          gap: 5px;
          max-height: 260px;
          overflow-y: auto;
        }

        .ss-history-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          background: var(--ss-surface);
        }

        .ss-history-main {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .ss-history-main strong {
          font-size: 11px;
          font-weight: 800;
          color: var(--ss-text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ss-history-meta {
          font-size: 9px;
          color: var(--ss-muted);
        }

        .ss-history-right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .ss-history-badge {
          padding: 2px 7px;
          border-radius: 999px;
          background: #eef0f5;
          color: var(--ss-muted);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }

        .ss-history-dur {
          font-size: 11px;
          font-weight: 800;
          color: var(--ss-text);
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .ss-trash {
          width: 14px;
          height: 14px;
        }

        .ss-empty {
          margin: 0;
          padding: 16px 12px;
          border-radius: 9px;
          background: var(--ss-surface);
          color: var(--ss-muted);
          font-size: 11px;
          font-weight: 600;
          text-align: center;
          line-height: 1.6;
        }

        /* ------------------------------------------------ help steps */
        .ss-step {
          display: flex;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px solid var(--ss-border);
        }

        .ss-step:first-child {
          padding-top: 0;
        }

        .ss-step:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .ss-step > span {
          width: 26px;
          height: 26px;
          flex: 0 0 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          background: var(--ss-primary-soft);
          color: var(--ss-primary);
          font-size: 9px;
          font-weight: 900;
        }

        .ss-step strong {
          display: block;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 2px;
          color: var(--ss-text);
        }

        .ss-step p {
          margin: 0;
          font-size: 10px;
          line-height: 1.5;
          color: var(--ss-muted);
        }

        .ss-step kbd {
          display: inline-block;
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid var(--ss-border);
          background: #fff;
          font-size: 9px;
          font-weight: 800;
          color: var(--ss-text);
        }

        .ss-note {
          margin: 12px 0 0;
          text-align: center;
          font-size: 10px;
          line-height: 1.7;
          color: var(--ss-muted);
        }

        /* ------------------------------------------------ responsive */
        @media (max-width: 520px) {
          .ss-head {
            flex-wrap: wrap;
          }

          .ss-best-value {
            font-size: 16px;
          }

          .ss-bar-cell {
            padding: 8px;
          }

          .ss-bar-cell strong {
            font-size: 13px;
          }

          .ss-action {
            flex-direction: column;
          }

          .ss-action-btns {
            justify-content: stretch;
          }

          .ss-action-btns .ss-btn {
            flex: 1;
            padding: 0 10px;
          }

          .ss-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .ss-week-bars {
            height: 82px;
          }

          .ss-ambient-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ss-ring-fill,
          .ss-goal-fill,
          .ss-subject-fill,
          .ss-week-bar,
          .ss-btn-pri.ss-btn-ready,
          .ss-pill-active .ss-pill-dot {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </ToolShell>
  );
}