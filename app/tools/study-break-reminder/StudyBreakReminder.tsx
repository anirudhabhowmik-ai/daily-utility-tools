"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import ToolShell from "../ToolShell";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Phase = "study" | "shortBreak" | "longBreak";
type TimerStatus = "idle" | "running" | "paused";
type HistoryFilter = "all" | "study" | "breaks";
type ThemeMode = "light" | "dark";

type Settings = {
  studyMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStart: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  notificationsEnabled: boolean;
  theme: ThemeMode;
};

type DurationKey = "studyMinutes" | "shortBreakMinutes" | "longBreakMinutes";

type SessionRecord = {
  id: string;
  mode: Phase;
  completedAt: string;
  plannedMinutes: number;
  actualSeconds: number;
  result: "completed" | "skipped";
};

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const SETTINGS_KEY = "toolsab-study-break-settings-v3";
const HISTORY_KEY = "toolsab-study-break-history-v3";
const MAX_HISTORY = 500;
const HISTORY_PAGE = 30;
const RING_RADIUS = 104;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const DEFAULT_SETTINGS: Settings = {
  studyMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStart: true,
  soundEnabled: true,
  soundVolume: 70,
  notificationsEnabled: false,
  theme: "light",
};

const PHASE_LABELS: Record<Phase, string> = {
  study: "Focus session",
  shortBreak: "Short break",
  longBreak: "Long break",
};

const PRESETS = [
  {
    name: "Classic Pomodoro",
    description: "A balanced routine for everyday tasks.",
    studyMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakInterval: 4,
  },
  {
    name: "Deep Work",
    description: "Longer sessions for demanding work.",
    studyMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 30,
    longBreakInterval: 3,
  },
  {
    name: "Extended Focus",
    description: "Extended concentration with fewer interruptions.",
    studyMinutes: 90,
    shortBreakMinutes: 15,
    longBreakMinutes: 30,
    longBreakInterval: 2,
  },
] as const;

type Preset = (typeof PRESETS)[number];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function durationFor(phase: Phase, settings: Settings) {
  if (phase === "study") return settings.studyMinutes * 60;
  if (phase === "shortBreak") return settings.shortBreakMinutes * 60;
  return settings.longBreakMinutes * 60;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(remainder).padStart(2, "0");

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes === 0 && safe > 0) return `${safe}s`;
  return `${minutes} min`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function systemTheme(): ThemeMode {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readSettings(): Settings {
  const fallback: Settings = { ...DEFAULT_SETTINGS, theme: systemTheme() };

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<Settings>;

    return {
      studyMinutes: clamp(parsed.studyMinutes, 1, 180, 25),
      shortBreakMinutes: clamp(parsed.shortBreakMinutes, 1, 60, 5),
      longBreakMinutes: clamp(parsed.longBreakMinutes, 1, 90, 15),
      longBreakInterval: clamp(parsed.longBreakInterval, 2, 10, 4),
      autoStart:
        typeof parsed.autoStart === "boolean"
          ? parsed.autoStart
          : DEFAULT_SETTINGS.autoStart,
      soundEnabled:
        typeof parsed.soundEnabled === "boolean"
          ? parsed.soundEnabled
          : DEFAULT_SETTINGS.soundEnabled,
      soundVolume: clamp(parsed.soundVolume, 0, 100, 70),
      notificationsEnabled:
        typeof parsed.notificationsEnabled === "boolean"
          ? parsed.notificationsEnabled
          : false,
      theme:
        parsed.theme === "dark" || parsed.theme === "light"
          ? parsed.theme
          : fallback.theme,
    };
  } catch {
    return fallback;
  }
}

function readHistory(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is SessionRecord => {
        if (!item || typeof item !== "object") return false;

        const record = item as Partial<SessionRecord>;

        return (
          typeof record.id === "string" &&
          (record.mode === "study" ||
            record.mode === "shortBreak" ||
            record.mode === "longBreak") &&
          typeof record.completedAt === "string" &&
          !Number.isNaN(new Date(record.completedAt).getTime()) &&
          typeof record.plannedMinutes === "number" &&
          Number.isFinite(record.plannedMinutes) &&
          typeof record.actualSeconds === "number" &&
          Number.isFinite(record.actualSeconds) &&
          (record.result === "completed" || record.result === "skipped")
        );
      })
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

/**
 * Completed focus sessions since the last long break.
 * History is newest-first, and any long break (finished or skipped) closes
 * the previous cycle.
 */
function countCycle(history: SessionRecord[]) {
  let count = 0;

  for (const record of history) {
    if (record.mode === "longBreak") break;
    if (record.mode === "study" && record.result === "completed") count += 1;
  }

  return count;
}

function playChime(context: AudioContext, volume: number) {
  const level = Math.min(100, Math.max(0, volume)) / 100;
  const peak = Math.max(0.0001, level * 0.2);
  const notes = [660, 880, 1108.73];

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.17;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.45);
  });
}

function downloadHistory(history: SessionRecord[]) {
  const blob = new Blob([JSON.stringify(history, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `toolsab-study-history-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* -------------------------------------------------------------------------- */
/* Small UI pieces                                                            */
/* -------------------------------------------------------------------------- */

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    play: <path d="M7 4v16l13-8z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    restart: <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />,
    skip: <path d="M5 4v16l11-8zM19 5v14" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    moon: <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />,
    sound: (
      <>
        <path d="M4 9v6h4l5 4V5L8 9z" />
        <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
      </>
    ),
    bell: <path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />,
    sliders: (
      <>
        <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h.01" />
        <circle cx="16" cy="6" r="2" />
        <circle cx="10" cy="12" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5" />
        <path d="M5 19h14" />
      </>
    ),
    trend: <path d="m3 17 6-6 4 4 8-8M15 7h6v6" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4 4L19 6" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.info}
    </svg>
  );
}

/** Button-based sliding switch (role="switch"). */
function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  const descId = useId();

  return (
    <div className="sbr-switch-row">
      <div className="sbr-switch-copy">
        <span className="sbr-switch-label">{label}</span>
        <span className="sbr-switch-description" id={descId}>
          {description}
        </span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-describedby={descId}
        className={`sbr-toggle ${checked ? "is-on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="sbr-toggle-thumb" />
      </button>
    </div>
  );
}

/**
 * Number input that lets people clear and retype the value. The value is
 * committed as soon as it is valid, and clamped when the field loses focus.
 */
function NumberField({
  label,
  value,
  min,
  max,
  unit,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) setText(String(value));
  }, [value]);

  const commitIfValid = (raw: string) => {
    const parsed = Number(raw);

    if (
      raw.trim() !== "" &&
      Number.isInteger(parsed) &&
      parsed >= min &&
      parsed <= max
    ) {
      onCommit(parsed);
    }
  };

  return (
    <div className="sbr-field">
      <label htmlFor={id}>{label}</label>
      <div className={`sbr-number-wrap ${disabled ? "is-disabled" : ""}`}>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={text}
          disabled={disabled}
          onFocus={() => {
            editingRef.current = true;
          }}
          onChange={(event) => {
            setText(event.currentTarget.value);
            commitIfValid(event.currentTarget.value);
          }}
          onBlur={() => {
            editingRef.current = false;

            const next =
              text.trim() === "" ? value : clamp(text, min, max, value);

            onCommit(next);
            setText(String(next));
          }}
        />
        <span>{unit}</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function StudyBreakReminder() {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [phase, setPhase] = useState<Phase>("study");
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE);
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");

  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const historyRef = useRef<SessionRecord[]>([]);
  const phaseRef = useRef<Phase>("study");
  const statusRef = useRef<TimerStatus>("idle");
  const remainingRef = useRef(25 * 60);
  const endAtRef = useRef<number | null>(null);
  const finishRef = useRef<() => void>(() => undefined);
  const audioRef = useRef<AudioContext | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Load and save                                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const loadedSettings = readSettings();
    const loadedHistory = readHistory();
    const initialSeconds = durationFor("study", loadedSettings);

    settingsRef.current = loadedSettings;
    historyRef.current = loadedHistory;
    remainingRef.current = initialSeconds;

    setSettings(loadedSettings);
    setHistory(loadedHistory);
    setRemainingSeconds(initialSeconds);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      setNotice("Your browser could not save the timer settings.");
    }
  }, [settings, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(history.slice(0, MAX_HISTORY))
      );
    } catch {
      setNotice("Your browser could not save the session history.");
    }
  }, [history, hydrated]);

  useEffect(
    () => () => {
      const context = audioRef.current;

      if (context && context.state !== "closed") {
        void context.close().catch(() => undefined);
      }
    },
    []
  );

  /* Notices disappear on their own. */
  useEffect(() => {
    if (!notice) return;

    const id = window.setTimeout(() => setNotice(""), 7000);
    return () => window.clearTimeout(id);
  }, [notice]);

  /* ------------------------------------------------------------------------ */
  /* Audio and notifications                                                  */
  /* ------------------------------------------------------------------------ */

  /** Must be called from a user gesture so browsers allow later playback. */
  const unlockAudio = useCallback(() => {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!Ctor) return;

      if (!audioRef.current || audioRef.current.state === "closed") {
        audioRef.current = new Ctor();
      }

      if (audioRef.current.state === "suspended") {
        void audioRef.current.resume().catch(() => undefined);
      }
    } catch {
      /* Audio is optional. */
    }
  }, []);

  const playSound = useCallback(
    (volume: number) => {
      if (volume <= 0) return;

      unlockAudio();

      const context = audioRef.current;
      if (!context) return;

      try {
        void context.resume().catch(() => undefined);
        playChime(context, volume);
      } catch {
        /* Some browsers may block audio playback. */
      }
    },
    [unlockAudio]
  );

  const sendPhaseNotification = useCallback((finishedPhase: Phase) => {
    if (!settingsRef.current.notificationsEnabled) return;

    if (!("Notification" in window)) {
      setNotificationMessage(
        "This browser does not support desktop notifications."
      );
      return;
    }

    if (Notification.permission !== "granted") {
      setNotificationMessage(
        "Notifications are not permitted by your browser."
      );
      return;
    }

    try {
      const body =
        finishedPhase === "study"
          ? "Your focus session is complete. Time for a break."
          : "Your break is over. Ready to focus again?";

      const notification = new Notification(
        `${PHASE_LABELS[finishedPhase]} finished`,
        { body, tag: "toolsab-study-break" }
      );

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch {
      setNotificationMessage(
        "The browser could not display the desktop notification."
      );
    }
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Settings                                                                 */
  /* ------------------------------------------------------------------------ */

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      const durationKeys: (keyof Settings)[] = [
        "studyMinutes",
        "shortBreakMinutes",
        "longBreakMinutes",
      ];

      if (statusRef.current !== "idle" && durationKeys.includes(key)) {
        setNotice("Restart the timer before changing durations.");
        return;
      }

      const nextSettings = { ...settingsRef.current, [key]: value };

      settingsRef.current = nextSettings;
      setSettings(nextSettings);

      if (statusRef.current === "idle" && durationKeys.includes(key)) {
        const nextSeconds = durationFor(phaseRef.current, nextSettings);

        remainingRef.current = nextSeconds;
        setRemainingSeconds(nextSeconds);
      }
    },
    []
  );

  /* ------------------------------------------------------------------------ */
  /* Timer engine                                                             */
  /* ------------------------------------------------------------------------ */

  const addHistoryRecord = useCallback(
    (mode: Phase, result: "completed" | "skipped", actualSeconds: number) => {
      const current = settingsRef.current;

      const plannedMinutes =
        mode === "study"
          ? current.studyMinutes
          : mode === "shortBreak"
            ? current.shortBreakMinutes
            : current.longBreakMinutes;

      const record: SessionRecord = {
        id: createId(),
        mode,
        completedAt: new Date().toISOString(),
        plannedMinutes,
        actualSeconds: Math.max(0, Math.round(actualSeconds)),
        result,
      };

      // Update the ref immediately so phase transitions never read stale history.
      const nextHistory = [record, ...historyRef.current].slice(
        0,
        MAX_HISTORY
      );

      historyRef.current = nextHistory;
      setHistory(nextHistory);
    },
    []
  );

  const startPhase = useCallback((nextPhase: Phase, autoStart: boolean) => {
    const seconds = durationFor(nextPhase, settingsRef.current);

    phaseRef.current = nextPhase;
    statusRef.current = autoStart ? "running" : "idle";
    remainingRef.current = seconds;
    endAtRef.current = autoStart ? Date.now() + seconds * 1000 : null;

    setPhase(nextPhase);
    setStatus(autoStart ? "running" : "idle");
    setRemainingSeconds(seconds);
  }, []);

  const finishPhase = useCallback(() => {
    const finishedPhase = phaseRef.current;
    const current = settingsRef.current;
    const completedSeconds = durationFor(finishedPhase, current);

    endAtRef.current = null;
    remainingRef.current = 0;
    statusRef.current = "idle";

    // A phase only counts as completed when its countdown reaches zero.
    addHistoryRecord(finishedPhase, "completed", completedSeconds);

    if (current.soundEnabled) playSound(current.soundVolume);

    sendPhaseNotification(finishedPhase);

    const auto = current.autoStart;

    if (finishedPhase === "study") {
      const nextPhase: Phase =
        countCycle(historyRef.current) >= current.longBreakInterval
          ? "longBreak"
          : "shortBreak";
      const label = nextPhase === "longBreak" ? "long" : "short";

      startPhase(nextPhase, auto);
      setNotice(
        auto
          ? `Focus session complete. Your ${label} break has started.`
          : `Focus session complete. Your ${label} break is ready.`
      );
    } else {
      startPhase("study", auto);
      setNotice(
        auto
          ? "Break complete. Your next focus session has started."
          : "Break complete. Your next focus session is ready."
      );
    }
  }, [addHistoryRecord, playSound, sendPhaseNotification, startPhase]);

  useEffect(() => {
    finishRef.current = finishPhase;
  }, [finishPhase]);

  const syncClock = useCallback(() => {
    const endAt = endAtRef.current;

    if (endAt === null || statusRef.current !== "running") return;

    const nextSeconds = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));

    remainingRef.current = nextSeconds;
    setRemainingSeconds(nextSeconds);

    if (nextSeconds === 0) finishRef.current();
  }, []);

  useEffect(() => {
    if (status !== "running") return;

    syncClock();
    const intervalId = window.setInterval(syncClock, 250);

    return () => window.clearInterval(intervalId);
  }, [status, syncClock]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") syncClock();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [syncClock]);

  /* Show the countdown in the browser tab. */
  useEffect(() => {
    if (!hydrated || status === "idle") return;

    const original = document.title;

    document.title = `${formatTime(remainingSeconds)} · ${PHASE_LABELS[phase]}${
      status === "paused" ? " (paused)" : ""
    }`;

    return () => {
      document.title = original;
    };
  }, [hydrated, status, remainingSeconds, phase]);

  /* Warn before closing the page while a session is running. */
  useEffect(() => {
    if (status !== "running") return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  /* ------------------------------------------------------------------------ */
  /* Controls                                                                 */
  /* ------------------------------------------------------------------------ */

  const startTimer = useCallback(() => {
    if (statusRef.current === "running") return;

    unlockAudio();

    const seconds = remainingRef.current;

    if (seconds <= 0) {
      startPhase(phaseRef.current, true);
      setNotice("");
      return;
    }

    endAtRef.current = Date.now() + seconds * 1000;
    statusRef.current = "running";
    setStatus("running");
    setNotice("");
  }, [startPhase, unlockAudio]);

  const pauseTimer = useCallback(() => {
    if (statusRef.current !== "running") return;

    const endAt = endAtRef.current;
    const seconds =
      endAt === null
        ? remainingRef.current
        : Math.max(0, Math.ceil((endAt - Date.now()) / 1000));

    endAtRef.current = null;
    remainingRef.current = seconds;
    statusRef.current = "paused";

    setRemainingSeconds(seconds);
    setStatus("paused");
  }, []);

  const restartPhase = useCallback(() => {
    startPhase(phaseRef.current, false);
    setNotice("Current phase restarted.");
  }, [startPhase]);

  const skipPhase = useCallback(() => {
    const skippedPhase = phaseRef.current;
    const totalSeconds = durationFor(skippedPhase, settingsRef.current);
    const elapsedSeconds = Math.max(0, totalSeconds - remainingRef.current);

    endAtRef.current = null;

    addHistoryRecord(skippedPhase, "skipped", elapsedSeconds);

    if (skippedPhase === "study") {
      // Skipping a focus session does not count it as completed.
      const nextPhase: Phase =
        countCycle(historyRef.current) >= settingsRef.current.longBreakInterval
          ? "longBreak"
          : "shortBreak";

      startPhase(nextPhase, false);
      setNotice("Focus session skipped. It was not counted as completed.");
    } else {
      startPhase("study", false);
      setNotice("Break skipped. Your next focus session is ready.");
    }
  }, [addHistoryRecord, startPhase]);

  const resetAll = useCallback(() => {
    endAtRef.current = null;
    phaseRef.current = "study";
    statusRef.current = "idle";

    const seconds = durationFor("study", settingsRef.current);
    remainingRef.current = seconds;

    setPhase("study");
    setStatus("idle");
    setRemainingSeconds(seconds);
    setNotice("");
    setNotificationMessage("");
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    if (statusRef.current !== "idle") {
      setNotice("Restart the timer before applying a preset.");
      return;
    }

    const nextSettings: Settings = {
      ...settingsRef.current,
      studyMinutes: preset.studyMinutes,
      shortBreakMinutes: preset.shortBreakMinutes,
      longBreakMinutes: preset.longBreakMinutes,
      longBreakInterval: preset.longBreakInterval,
    };

    settingsRef.current = nextSettings;
    setSettings(nextSettings);

    phaseRef.current = "study";
    setPhase("study");

    const seconds = durationFor("study", nextSettings);
    remainingRef.current = seconds;
    setRemainingSeconds(seconds);

    setNotice(`${preset.name} preset applied.`);
  }, []);

  const requestNotifications = useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        updateSetting("notificationsEnabled", false);
        setNotificationMessage("Desktop notifications are turned off.");
        return;
      }

      if (!("Notification" in window)) {
        setNotificationMessage(
          "This browser does not support desktop notifications."
        );
        updateSetting("notificationsEnabled", false);
        return;
      }

      try {
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
          updateSetting("notificationsEnabled", true);
          setNotificationMessage("Desktop notifications are enabled.");
        } else {
          updateSetting("notificationsEnabled", false);
          setNotificationMessage(
            "Notification permission was not granted. Check your browser settings."
          );
        }
      } catch {
        updateSetting("notificationsEnabled", false);
        setNotificationMessage(
          "Could not request notification permission from this browser."
        );
      }
    },
    [updateSetting]
  );

  const testNotification = () => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      setNotificationMessage("Turn on desktop notifications first.");
      return;
    }

    try {
      new Notification("Study Break Reminder", {
        body: "Notifications are working.",
        tag: "toolsab-study-break-test",
      });
    } catch {
      setNotificationMessage(
        "The browser could not display the desktop notification."
      );
    }
  };

  const clearHistory = () => {
    historyRef.current = [];
    setHistory([]);
    setConfirmClear(false);
    setHistoryLimit(HISTORY_PAGE);
    setNotice("Session history cleared.");
  };

  /* ------------------------------------------------------------------------ */
  /* Keyboard shortcuts                                                       */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
        return;
      }

      const target = event.target as HTMLElement | null;

      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.code === "Space") {
        // Let focused buttons and switches use their native Space behaviour.
        if (target?.closest("button, a, [role='switch'], summary")) return;

        event.preventDefault();

        if (statusRef.current === "running") pauseTimer();
        else startTimer();
      } else if (event.key.toLowerCase() === "r") {
        restartPhase();
      } else if (event.key.toLowerCase() === "s") {
        skipPhase();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pauseTimer, restartPhase, skipPhase, startTimer]);

  /* ------------------------------------------------------------------------ */
  /* Derived data                                                             */
  /* ------------------------------------------------------------------------ */

  const todayStats = useMemo(() => {
    const today = localDayKey(new Date());

    const records = history.filter(
      (record) =>
        record.mode === "study" &&
        localDayKey(new Date(record.completedAt)) === today
    );

    return {
      completed: records.filter((record) => record.result === "completed")
        .length,
      seconds: records.reduce((total, record) => total + record.actualSeconds, 0),
    };
  }, [history]);

  const savedCompletedStudies = useMemo(
    () =>
      history.filter(
        (record) => record.mode === "study" && record.result === "completed"
      ).length,
    [history]
  );

  const sessionsUntilLongBreak = Math.max(
    0,
    settings.longBreakInterval - countCycle(history)
  );

  const filteredHistory = useMemo(
    () =>
      history.filter((record) => {
        if (historyFilter === "study") return record.mode === "study";
        if (historyFilter === "breaks") return record.mode !== "study";
        return true;
      }),
    [history, historyFilter]
  );

  const totalPhaseSeconds = durationFor(phase, settings);
  const progress =
    totalPhaseSeconds > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((totalPhaseSeconds - remainingSeconds) / totalPhaseSeconds) * 100
          )
        )
      : 0;

  const activePreset = PRESETS.find(
    (preset) =>
      preset.studyMinutes === settings.studyMinutes &&
      preset.shortBreakMinutes === settings.shortBreakMinutes &&
      preset.longBreakMinutes === settings.longBreakMinutes &&
      preset.longBreakInterval === settings.longBreakInterval
  );

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  if (!hydrated) {
    return (
      <ToolShell title="Study Break Reminder Pro" onReset={resetAll} wide>
        <div className="sbr-loading" role="status">
          <span className="sbr-loading-dot" />
          Preparing your focus workspace…
        </div>
        <TimerStyles />
      </ToolShell>
    );
  }

  const startLabel =
    status === "paused"
      ? "Resume"
      : phase === "study"
        ? "Start focus"
        : "Start break";

  return (
    <ToolShell title="Study Break Reminder Pro" onReset={resetAll} wide>
      <div className="sbr-app" data-theme={settings.theme}>
        <section className="sbr-main-grid">
          <div className="sbr-timer-card" data-phase={phase}>
            <div className="sbr-timer-top">
              <div>
                <span className="sbr-eyebrow">Your focus session</span>
                <h3>{PHASE_LABELS[phase]}</h3>
                <p>
                  {phase === "study"
                    ? "Stay focused. One task at a time."
                    : "Step away and give your mind a moment."}
                </p>
              </div>

              <div className="sbr-timer-badges">
                <span className={`sbr-status sbr-status-${status}`}>
                  <i />
                  {status === "running"
                    ? "Running"
                    : status === "paused"
                      ? "Paused"
                      : "Ready"}
                </span>
                <button
                  type="button"
                  className="sbr-icon-button"
                  aria-label={
                    settings.theme === "dark"
                      ? "Switch to light mode"
                      : "Switch to dark mode"
                  }
                  title={settings.theme === "dark" ? "Light mode" : "Dark mode"}
                  onClick={() =>
                    updateSetting(
                      "theme",
                      settings.theme === "dark" ? "light" : "dark"
                    )
                  }
                >
                  <Icon name={settings.theme === "dark" ? "sun" : "moon"} />
                </button>
              </div>
            </div>

            <div
              className="sbr-timer-area"
              role="timer"
              aria-label={`${PHASE_LABELS[phase]} time remaining`}
            >
              <svg
                className="sbr-progress-ring"
                viewBox="0 0 240 240"
                aria-hidden="true"
              >
                <circle
                  className="sbr-ring-track"
                  cx="120"
                  cy="120"
                  r={RING_RADIUS}
                />
                <circle
                  className="sbr-ring-progress"
                  cx="120"
                  cy="120"
                  r={RING_RADIUS}
                  strokeDasharray={RING_LENGTH}
                  strokeDashoffset={RING_LENGTH * (1 - progress / 100)}
                />
              </svg>

              <div className="sbr-time-display">
                <span className="sbr-time">{formatTime(remainingSeconds)}</span>
                <span className="sbr-time-caption">
                  {status === "running"
                    ? "Time remaining"
                    : status === "paused"
                      ? "Timer paused"
                      : "Ready when you are"}
                </span>
              </div>
            </div>

            <div className="sbr-timer-actions">
              {status === "running" ? (
                <button
                  type="button"
                  className="sbr-primary-button"
                  onClick={pauseTimer}
                >
                  <Icon name="pause" size={16} /> Pause
                </button>
              ) : (
                <button
                  type="button"
                  className="sbr-primary-button"
                  onClick={startTimer}
                >
                  <Icon name="play" size={16} /> {startLabel}
                </button>
              )}

              <button
                type="button"
                className="sbr-secondary-button"
                onClick={restartPhase}
              >
                <Icon name="restart" size={15} /> Restart
              </button>

              <button
                type="button"
                className="sbr-secondary-button"
                onClick={skipPhase}
              >
                <Icon name="skip" size={15} /> Skip
              </button>
            </div>

            <div className="sbr-shortcuts">
              <span>
                <kbd>Space</kbd> Start / pause
              </span>
              <span>
                <kbd>R</kbd> Restart
              </span>
              <span>
                <kbd>S</kbd> Skip
              </span>
            </div>
          </div>

          <aside className="sbr-side-column">
            <div className="sbr-stats-card">
              <div className="sbr-section-heading">
                <div>
                  <span className="sbr-eyebrow">Your progress</span>
                  <h3>Today at a glance</h3>
                </div>
                <span className="sbr-stat-icon">
                  <Icon name="trend" />
                </span>
              </div>

              <div className="sbr-stat-grid">
                <div className="sbr-stat">
                  <span className="sbr-stat-value">{todayStats.completed}</span>
                  <span className="sbr-stat-label">
                    Completed focus sessions
                  </span>
                </div>
                <div className="sbr-stat">
                  <span className="sbr-stat-value">
                    {formatDuration(todayStats.seconds)}
                  </span>
                  <span className="sbr-stat-label">Recorded focus time</span>
                </div>
                <div className="sbr-stat">
                  <span className="sbr-stat-value">
                    {sessionsUntilLongBreak}
                  </span>
                  <span className="sbr-stat-label">
                    Sessions until long break
                  </span>
                </div>
                <div className="sbr-stat">
                  <span className="sbr-stat-value">
                    {savedCompletedStudies}
                  </span>
                  <span className="sbr-stat-label">
                    Saved completed sessions
                  </span>
                </div>
              </div>
            </div>

            <div className="sbr-presets-card">
              <div className="sbr-section-heading">
                <div>
                  <span className="sbr-eyebrow">Quick setup</span>
                  <h3>Focus presets</h3>
                </div>
              </div>

              <div className="sbr-presets">
                {PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.name}
                    className={`sbr-preset ${
                      activePreset?.name === preset.name ? "is-active" : ""
                    }`}
                    aria-pressed={activePreset?.name === preset.name}
                    disabled={status !== "idle"}
                    onClick={() => applyPreset(preset)}
                  >
                    <span className="sbr-preset-top">
                      <strong>{preset.name}</strong>
                      {activePreset?.name === preset.name && (
                        <Icon name="check" size={15} />
                      )}
                    </span>
                    <span className="sbr-preset-desc">
                      {preset.description}
                    </span>
                    <small>
                      {preset.studyMinutes}m focus · {preset.shortBreakMinutes}m
                      short · {preset.longBreakMinutes}m long
                    </small>
                  </button>
                ))}
              </div>

              {status !== "idle" && (
                <p className="sbr-inline-hint">
                  Restart the timer to switch presets.
                </p>
              )}
            </div>
          </aside>
        </section>

        <section className="sbr-settings-card">
          <div className="sbr-section-heading sbr-settings-heading">
            <div>
              <span className="sbr-eyebrow">Make it yours</span>
              <h3>Timer settings</h3>
              <p>Adjust your focus and recovery intervals.</p>
            </div>
            <span className="sbr-stat-icon">
              <Icon name="sliders" />
            </span>
          </div>

          <div className="sbr-duration-grid">
            <NumberField
              label="Focus duration"
              unit="minutes"
              min={1}
              max={180}
              value={settings.studyMinutes}
              disabled={status !== "idle"}
              onCommit={(value) => updateSetting("studyMinutes", value)}
            />
            <NumberField
              label="Short break"
              unit="minutes"
              min={1}
              max={60}
              value={settings.shortBreakMinutes}
              disabled={status !== "idle"}
              onCommit={(value) => updateSetting("shortBreakMinutes", value)}
            />
            <NumberField
              label="Long break"
              unit="minutes"
              min={1}
              max={90}
              value={settings.longBreakMinutes}
              disabled={status !== "idle"}
              onCommit={(value) => updateSetting("longBreakMinutes", value)}
            />
            <NumberField
              label="Long break after"
              unit="sessions"
              min={2}
              max={10}
              value={settings.longBreakInterval}
              onCommit={(value) => updateSetting("longBreakInterval", value)}
            />
          </div>

          {status !== "idle" && (
            <p className="sbr-inline-hint">
              Durations are locked while a phase is running or paused. Restart
              the timer to change them.
            </p>
          )}

          <div className="sbr-auto-row">
            <Switch
              label="Start the next phase automatically"
              description="Move straight from focus to break, and back again, without pressing start."
              checked={settings.autoStart}
              onChange={(checked) => updateSetting("autoStart", checked)}
            />
          </div>

          <div className="sbr-preference-grid">
            <div className="sbr-preference-panel">
              <div className="sbr-preference-heading">
                <span className="sbr-preference-icon">
                  <Icon name="sound" />
                </span>
                <div>
                  <strong>Sound alerts</strong>
                  <span>Audio feedback when a phase ends.</span>
                </div>
              </div>

              <Switch
                label="Completion sound"
                description="Play an alert when a timer phase ends."
                checked={settings.soundEnabled}
                onChange={(checked) => updateSetting("soundEnabled", checked)}
              />

              {settings.soundEnabled && (
                <div className="sbr-volume-control">
                  <div className="sbr-volume-label">
                    <label htmlFor="sbr-volume">Sound volume</label>
                    <strong>{settings.soundVolume}%</strong>
                  </div>

                  <input
                    id="sbr-volume"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={settings.soundVolume}
                    style={
                      {
                        "--volume": `${settings.soundVolume}%`,
                      } as CSSProperties
                    }
                    onChange={(event) =>
                      updateSetting(
                        "soundVolume",
                        Number(event.currentTarget.value)
                      )
                    }
                  />

                  <div className="sbr-range-labels">
                    <span>Quiet</span>
                    <span>Maximum</span>
                  </div>

                  <button
                    type="button"
                    className="sbr-text-button"
                    disabled={settings.soundVolume === 0}
                    onClick={() => playSound(settings.soundVolume)}
                  >
                    Play test sound
                  </button>
                </div>
              )}
            </div>

            <div className="sbr-preference-panel">
              <div className="sbr-preference-heading">
                <span className="sbr-preference-icon sbr-notification-icon">
                  <Icon name="bell" />
                </span>
                <div>
                  <strong>Browser notifications</strong>
                  <span>Get notified when your timer finishes.</span>
                </div>
              </div>

              <Switch
                label="Desktop notifications"
                description="Show a browser notification when a phase ends."
                checked={settings.notificationsEnabled}
                onChange={(checked) => void requestNotifications(checked)}
              />

              {settings.notificationsEnabled && (
                <button
                  type="button"
                  className="sbr-text-button"
                  onClick={testNotification}
                >
                  Send test notification
                </button>
              )}

              {notificationMessage && (
                <p className="sbr-notification-message" role="status">
                  {notificationMessage}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="sbr-history-card">
          <div className="sbr-section-heading sbr-history-heading">
            <div>
              <span className="sbr-eyebrow">Your activity</span>
              <h3>Session history</h3>
              <p>Your recent completed and skipped timer phases.</p>
            </div>

            <div className="sbr-history-actions">
              <button
                type="button"
                className="sbr-export-button"
                onClick={() => downloadHistory(history)}
                disabled={history.length === 0}
              >
                <Icon name="download" size={14} /> Export JSON
              </button>

              {confirmClear ? (
                <>
                  <button
                    type="button"
                    className="sbr-clear-button is-confirm"
                    onClick={clearHistory}
                  >
                    Yes, clear all
                  </button>
                  <button
                    type="button"
                    className="sbr-export-button"
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="sbr-clear-button"
                  disabled={history.length === 0}
                  onClick={() => setConfirmClear(true)}
                >
                  Clear history
                </button>
              )}
            </div>
          </div>

          <div
            className="sbr-history-filters"
            role="group"
            aria-label="Filter session history"
          >
            {(["all", "study", "breaks"] as HistoryFilter[]).map((filter) => (
              <button
                type="button"
                key={filter}
                className={historyFilter === filter ? "active" : ""}
                aria-pressed={historyFilter === filter}
                onClick={() => {
                  setHistoryFilter(filter);
                  setHistoryLimit(HISTORY_PAGE);
                }}
              >
                {filter === "all"
                  ? "All sessions"
                  : filter === "study"
                    ? "Focus"
                    : "Breaks"}
              </button>
            ))}
          </div>

          {filteredHistory.length === 0 ? (
            <div className="sbr-empty-history">
              <span>
                <Icon name="clock" size={22} />
              </span>
              <strong>No sessions to show yet</strong>
              <p>
                {history.length === 0
                  ? "Finish or skip a phase and it will appear here."
                  : "There are no entries for this filter."}
              </p>
            </div>
          ) : (
            <div className="sbr-history-list">
              {filteredHistory.slice(0, historyLimit).map((record) => (
                <div className="sbr-history-row" key={record.id}>
                  <span
                    className={`sbr-history-dot ${
                      record.mode === "study"
                        ? "focus"
                        : record.mode === "shortBreak"
                          ? "short"
                          : "long"
                    }`}
                  />

                  <div className="sbr-history-info">
                    <strong>{PHASE_LABELS[record.mode]}</strong>
                    <span>{formatDate(record.completedAt)}</span>
                  </div>

                  <span className="sbr-history-duration">
                    {formatDuration(record.actualSeconds)}
                  </span>

                  <span
                    className={`sbr-history-result ${
                      record.result === "completed" ? "completed" : "skipped"
                    }`}
                  >
                    {record.result === "completed" ? "Completed" : "Skipped"}
                  </span>
                </div>
              ))}

              {filteredHistory.length > historyLimit && (
                <div className="sbr-history-more">
                  <button
                    type="button"
                    className="sbr-export-button"
                    onClick={() =>
                      setHistoryLimit((value) => value + HISTORY_PAGE)
                    }
                  >
                    Show more ({filteredHistory.length - historyLimit} left)
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="sbr-notice-slot" aria-live="polite">
          {notice && (
            <div className="sbr-notice">
              <Icon name="info" size={16} />
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss message"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          )}
        </div>

        <p className="sbr-local-note">
          Your settings and session history are saved in this browser. Keep this
          page open while using the timer. It does not keep running after you
          close the page.
        </p>
      </div>

      <TimerStyles />
    </ToolShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

/* Global, prefixed styles. The previous scoped <style jsx> block could not
   reach the Switch component (a separate component), so toggles rendered
   unstyled. Plain global CSS fixes that and keeps ">" selectors intact. */
const STYLES = `
.sbr-app {
  --sbr-accent: #f4511e;
  --sbr-accent-hover: #dc4210;
  --sbr-accent-soft: #fff1ea;
  --sbr-accent-border: #ffd2bf;
  --sbr-on-accent: #ffffff;
  --sbr-ink: #1b1e2b;
  --sbr-muted: #667085;
  --sbr-faint: #98a2b3;
  --sbr-border: #e6e8ef;
  --sbr-border-strong: #d5d8e2;
  --sbr-surface: #ffffff;
  --sbr-surface-2: #f8f9fb;
  --sbr-hover: #f2f4f8;
  --sbr-input: #ffffff;
  --sbr-track: #e9ecf2;
  --sbr-ring: rgba(244, 81, 30, 0.22);
  --sbr-success: #138a5c;
  --sbr-success-soft: #e8f7f0;
  --sbr-danger: #d92d3a;
  --sbr-shadow: 0 1px 2px rgba(20, 24, 40, 0.04), 0 8px 24px -12px rgba(20, 24, 40, 0.12);
  color: var(--sbr-ink);
  display: grid;
  gap: 20px;
  width: 100%;
  min-width: 0;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.sbr-app[data-theme="dark"] {
  --sbr-accent: #ff6b3d;
  --sbr-accent-hover: #ff8259;
  --sbr-accent-soft: rgba(255, 107, 61, 0.14);
  --sbr-accent-border: rgba(255, 107, 61, 0.38);
  --sbr-on-accent: #1a0d07;
  --sbr-ink: #eceef5;
  --sbr-muted: #9aa3b8;
  --sbr-faint: #6f7992;
  --sbr-border: #262c3f;
  --sbr-border-strong: #343b52;
  --sbr-surface: #151a2a;
  --sbr-surface-2: #1a2033;
  --sbr-hover: #20273c;
  --sbr-input: #0f1424;
  --sbr-track: #2a3148;
  --sbr-ring: rgba(255, 107, 61, 0.3);
  --sbr-success: #4cd39a;
  --sbr-success-soft: rgba(76, 211, 154, 0.14);
  --sbr-danger: #ff7a82;
  --sbr-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 30px -14px rgba(0, 0, 0, 0.6);
  background: #0d1120;
  padding: 22px;
  border-radius: 22px;
  color-scheme: dark;
}

.sbr-app *,
.sbr-app *::before,
.sbr-app *::after {
  box-sizing: border-box;
}

.sbr-app button,
.sbr-app input,
.sbr-app select {
  font-family: inherit;
}

.sbr-app button:focus-visible,
.sbr-app a:focus-visible {
  outline: 2px solid var(--sbr-accent);
  outline-offset: 2px;
}

.sbr-app kbd {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  border: 1px solid var(--sbr-border-strong);
  border-bottom-width: 2px;
  border-radius: 6px;
  background: var(--sbr-surface);
  color: var(--sbr-ink);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
}

/* Loading */

.sbr-loading {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #777b83;
  font-size: 14px;
}

.sbr-loading-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f4511e;
  box-shadow: 0 0 0 6px rgba(244, 81, 30, 0.14);
}

/* Cards */

.sbr-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  gap: 20px;
}

.sbr-timer-card,
.sbr-stats-card,
.sbr-presets-card,
.sbr-settings-card,
.sbr-history-card {
  min-width: 0;
  background: var(--sbr-surface);
  border: 1px solid var(--sbr-border);
  border-radius: 22px;
  box-shadow: var(--sbr-shadow);
}

/* Timer: the one memorable surface. The phase colour lives here only. */

.sbr-timer-card {
  --phase: #f4511e;
  --phase-soft: #fff1ea;
  --phase-border: #ffd2bf;
  --phase-on: #ffffff;
  padding: clamp(22px, 4vw, 34px);
  display: flex;
  flex-direction: column;
  align-items: center;
  border-color: var(--phase-border);
  box-shadow: 0 0 0 5px var(--phase-soft), var(--sbr-shadow);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.sbr-timer-card[data-phase="shortBreak"] {
  --phase: #138a5c;
  --phase-soft: #eaf7f1;
  --phase-border: #b9e4d2;
}

.sbr-timer-card[data-phase="longBreak"] {
  --phase: #3b6fd4;
  --phase-soft: #ecf1fc;
  --phase-border: #c3d3f4;
}

.sbr-app[data-theme="dark"] .sbr-timer-card {
  --phase: #ff6b3d;
  --phase-soft: rgba(255, 107, 61, 0.12);
  --phase-border: rgba(255, 107, 61, 0.4);
  --phase-on: #1a0d07;
}

.sbr-app[data-theme="dark"] .sbr-timer-card[data-phase="shortBreak"] {
  --phase: #4cd39a;
  --phase-soft: rgba(76, 211, 154, 0.12);
  --phase-border: rgba(76, 211, 154, 0.4);
  --phase-on: #06241a;
}

.sbr-app[data-theme="dark"] .sbr-timer-card[data-phase="longBreak"] {
  --phase: #7aa2ff;
  --phase-soft: rgba(122, 162, 255, 0.12);
  --phase-border: rgba(122, 162, 255, 0.4);
  --phase-on: #0a1430;
}

.sbr-timer-top {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.sbr-eyebrow {
  display: block;
  color: var(--sbr-muted);
  font-size: 12px;
  font-weight: 650;
}

.sbr-timer-top h3,
.sbr-section-heading h3 {
  margin: 3px 0 0;
  font-size: 21px;
  letter-spacing: -0.025em;
  font-weight: 800;
}

.sbr-timer-top p,
.sbr-section-heading p {
  margin: 6px 0 0;
  color: var(--sbr-muted);
  font-size: 13px;
  line-height: 1.5;
}

.sbr-timer-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.sbr-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border-radius: 999px;
  background: var(--sbr-surface-2);
  color: var(--sbr-muted);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.sbr-status i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--sbr-faint);
}

.sbr-status-running {
  background: var(--sbr-success-soft);
  color: var(--sbr-success);
}

.sbr-status-running i {
  background: var(--sbr-success);
  box-shadow: 0 0 0 4px rgba(19, 138, 92, 0.2);
}

.sbr-status-paused {
  background: rgba(229, 154, 50, 0.16);
  color: #b36b10;
}

.sbr-status-paused i {
  background: #e59a32;
}

.sbr-icon-button {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--sbr-border-strong);
  border-radius: 10px;
  background: var(--sbr-surface);
  color: var(--sbr-muted);
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.sbr-icon-button:hover {
  background: var(--sbr-hover);
  color: var(--sbr-ink);
}

.sbr-timer-area {
  width: min(100%, 300px);
  aspect-ratio: 1;
  margin: 24px auto 20px;
  position: relative;
  display: grid;
  place-items: center;
}

.sbr-progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  overflow: visible;
}

.sbr-ring-track,
.sbr-ring-progress {
  fill: none;
  stroke-width: 9;
}

.sbr-ring-track {
  stroke: var(--sbr-track);
}

.sbr-ring-progress {
  stroke: var(--phase);
  stroke-linecap: round;
  transition: stroke-dashoffset 0.25s linear, stroke 0.3s ease;
}

.sbr-time-display {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.sbr-time {
  font-size: clamp(52px, 9vw, 74px);
  line-height: 1;
  letter-spacing: -0.045em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.sbr-time-caption {
  color: var(--sbr-muted);
  font-size: 12px;
  font-weight: 600;
}

.sbr-timer-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
}

.sbr-primary-button,
.sbr-secondary-button,
.sbr-export-button,
.sbr-clear-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  border-radius: 12px;
  padding: 0 18px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease,
    color 0.18s ease, transform 0.18s ease;
}

.sbr-primary-button:active,
.sbr-secondary-button:active {
  transform: translateY(1px);
}

.sbr-primary-button {
  min-width: 150px;
  color: var(--phase-on);
  background: var(--phase);
  border: 1px solid var(--phase);
  font-size: 14px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.25) inset, 0 10px 24px -10px var(--phase);
}

.sbr-primary-button:hover {
  filter: brightness(0.93);
}

.sbr-secondary-button,
.sbr-export-button {
  background: var(--sbr-surface);
  border: 1px solid var(--sbr-border-strong);
  color: var(--sbr-ink);
}

.sbr-secondary-button:hover:not(:disabled),
.sbr-export-button:hover:not(:disabled) {
  border-color: var(--sbr-accent-border);
  background: var(--sbr-accent-soft);
}

.sbr-shortcuts {
  margin-top: 22px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 18px;
  color: var(--sbr-muted);
  font-size: 12px;
}

.sbr-shortcuts span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

/* Side column */

.sbr-side-column {
  display: grid;
  gap: 20px;
  align-content: start;
  min-width: 0;
}

.sbr-stats-card,
.sbr-presets-card {
  padding: 22px;
}

.sbr-section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.sbr-section-heading h3 {
  font-size: 18px;
}

.sbr-stat-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: var(--sbr-accent-soft);
  color: var(--sbr-accent);
}

.sbr-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 14px;
  margin-top: 22px;
}

.sbr-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.sbr-stat-value {
  font-size: 26px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.sbr-stat-label {
  color: var(--sbr-muted);
  font-size: 12px;
  line-height: 1.4;
}

.sbr-presets {
  display: grid;
  gap: 9px;
  margin-top: 18px;
}

.sbr-preset {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 13px 14px;
  text-align: left;
  border: 1px solid var(--sbr-border);
  border-radius: 13px;
  background: var(--sbr-surface);
  color: var(--sbr-ink);
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.sbr-preset:hover:not(:disabled) {
  border-color: var(--sbr-accent-border);
  background: var(--sbr-accent-soft);
}

.sbr-preset.is-active {
  border-color: var(--sbr-accent);
  background: var(--sbr-accent-soft);
}

.sbr-preset:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.sbr-preset-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.sbr-preset-top svg {
  color: var(--sbr-accent);
}

.sbr-preset-desc {
  color: var(--sbr-muted);
  font-size: 12px;
}

.sbr-preset small {
  color: var(--sbr-faint);
  font-size: 11px;
}

/* Settings */

.sbr-settings-card,
.sbr-history-card {
  padding: clamp(20px, 3vw, 28px);
}

.sbr-settings-heading {
  margin-bottom: 22px;
}

.sbr-duration-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.sbr-field {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.sbr-field > label {
  color: var(--sbr-ink);
  font-size: 13px;
  font-weight: 650;
}

.sbr-number-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 0 12px;
  border: 1px solid var(--sbr-border-strong);
  border-radius: 11px;
  background: var(--sbr-input);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.sbr-number-wrap:focus-within {
  border-color: var(--sbr-accent);
  box-shadow: 0 0 0 3px var(--sbr-ring);
}

.sbr-number-wrap.is-disabled {
  background: var(--sbr-surface-2);
}

.sbr-number-wrap input {
  width: 100%;
  min-width: 0;
  height: 44px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--sbr-ink);
  font-size: 16px;
  font-weight: 750;
}

.sbr-number-wrap input:disabled {
  color: var(--sbr-faint);
  cursor: not-allowed;
}

.sbr-number-wrap span {
  color: var(--sbr-muted);
  font-size: 12px;
  white-space: nowrap;
}

.sbr-inline-hint {
  margin: 12px 0 0;
  color: #a8610f;
  font-size: 12px;
}

.sbr-app[data-theme="dark"] .sbr-inline-hint {
  color: #f0b45f;
}

.sbr-auto-row {
  margin-top: 20px;
  padding: 4px 0;
  border-top: 1px solid var(--sbr-border);
  border-bottom: 1px solid var(--sbr-border);
}

.sbr-auto-row .sbr-switch-row {
  padding: 12px 0;
}

.sbr-preference-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 20px;
}

.sbr-preference-panel {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--sbr-border);
  border-radius: 16px;
  background: var(--sbr-surface-2);
}

.sbr-preference-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.sbr-preference-icon {
  display: grid;
  place-items: center;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: var(--sbr-accent-soft);
  color: var(--sbr-accent);
}

.sbr-notification-icon {
  background: rgba(59, 111, 212, 0.12);
  color: #3b6fd4;
}

.sbr-app[data-theme="dark"] .sbr-notification-icon {
  color: #7aa2ff;
}

.sbr-preference-heading div {
  display: grid;
  gap: 2px;
}

.sbr-preference-heading strong {
  font-size: 14px;
}

.sbr-preference-heading div span {
  color: var(--sbr-muted);
  font-size: 12px;
  line-height: 1.4;
}

/* Switch */

.sbr-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}

.sbr-switch-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.sbr-switch-label {
  color: var(--sbr-ink);
  font-size: 13px;
  font-weight: 650;
}

.sbr-switch-description {
  color: var(--sbr-muted);
  font-size: 12px;
  line-height: 1.5;
}

.sbr-toggle {
  position: relative;
  flex: 0 0 46px;
  width: 46px;
  height: 26px;
  padding: 3px;
  border: 0;
  border-radius: 999px;
  background: var(--sbr-border-strong);
  cursor: pointer;
  transition: background-color 0.2s ease;
  appearance: none;
  -webkit-appearance: none;
}

.sbr-toggle.is-on {
  background: var(--sbr-accent);
}

.sbr-toggle-thumb {
  display: block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transform: translateX(0);
  transition: transform 0.2s cubic-bezier(0.3, 0.7, 0.3, 1);
}

.sbr-toggle.is-on .sbr-toggle-thumb {
  transform: translateX(20px);
}

.sbr-toggle:focus-visible {
  outline: 3px solid var(--sbr-ring);
  outline-offset: 3px;
}

/* Volume */

.sbr-volume-control {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--sbr-border);
}

.sbr-volume-label {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--sbr-muted);
  font-size: 12px;
}

.sbr-volume-label strong {
  color: var(--sbr-accent);
  font-size: 12px;
}

.sbr-volume-control input[type="range"] {
  display: block;
  width: 100%;
  height: 6px;
  margin: 14px 0 8px;
  border-radius: 99px;
  outline: none;
  background: linear-gradient(
    to right,
    var(--sbr-accent) 0%,
    var(--sbr-accent) var(--volume),
    var(--sbr-track) var(--volume),
    var(--sbr-track) 100%
  );
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.sbr-volume-control input[type="range"]::-webkit-slider-thumb {
  width: 18px;
  height: 18px;
  border: 3px solid #fff;
  border-radius: 50%;
  background: var(--sbr-accent);
  box-shadow: 0 0 0 1px var(--sbr-accent), 0 2px 6px rgba(0, 0, 0, 0.25);
  appearance: none;
  -webkit-appearance: none;
}

.sbr-volume-control input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 3px solid #fff;
  border-radius: 50%;
  background: var(--sbr-accent);
  box-shadow: 0 0 0 1px var(--sbr-accent);
}

.sbr-volume-control input[type="range"]:focus-visible {
  box-shadow: 0 0 0 3px var(--sbr-ring);
}

.sbr-range-labels {
  display: flex;
  justify-content: space-between;
  color: var(--sbr-faint);
  font-size: 11px;
}

.sbr-text-button {
  margin-top: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--sbr-accent);
  font-size: 12px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.sbr-text-button:disabled {
  opacity: 0.4;
  cursor: default;
  text-decoration: none;
}

.sbr-notification-message {
  margin: 12px 0 0;
  color: var(--sbr-muted);
  font-size: 12px;
  line-height: 1.5;
}

/* History */

.sbr-history-heading {
  align-items: center;
  margin-bottom: 18px;
}

.sbr-history-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sbr-export-button,
.sbr-clear-button {
  min-height: 38px;
  padding: 0 13px;
  font-size: 12px;
}

.sbr-clear-button {
  border: 1px solid var(--sbr-border-strong);
  background: var(--sbr-surface);
  color: var(--sbr-muted);
}

.sbr-clear-button:hover:not(:disabled) {
  border-color: rgba(217, 45, 58, 0.45);
  color: var(--sbr-danger);
}

.sbr-clear-button.is-confirm {
  border-color: var(--sbr-danger);
  background: var(--sbr-danger);
  color: #fff;
}

.sbr-clear-button.is-confirm:hover {
  color: #fff;
  filter: brightness(0.92);
}

.sbr-export-button:disabled,
.sbr-clear-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sbr-history-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--sbr-border);
}

.sbr-history-filters button {
  padding: 8px 13px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--sbr-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.18s ease;
}

.sbr-history-filters button:hover {
  color: var(--sbr-ink);
}

.sbr-history-filters button.active {
  border-color: var(--sbr-accent-border);
  background: var(--sbr-accent-soft);
  color: var(--sbr-accent);
}

.sbr-empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 36px 12px 26px;
  text-align: center;
}

.sbr-empty-history > span {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin-bottom: 12px;
  border-radius: 14px;
  background: var(--sbr-accent-soft);
  color: var(--sbr-accent);
}

.sbr-empty-history strong {
  font-size: 14px;
}

.sbr-empty-history p {
  margin: 6px 0 0;
  color: var(--sbr-muted);
  font-size: 13px;
}

.sbr-history-list {
  display: grid;
}

.sbr-history-row {
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 14px;
  padding: 14px 2px;
  border-bottom: 1px solid var(--sbr-border);
}

.sbr-history-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.sbr-history-dot.focus {
  background: #f4511e;
}

.sbr-history-dot.short {
  background: #138a5c;
}

.sbr-history-dot.long {
  background: #3b6fd4;
}

.sbr-history-info {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.sbr-history-info strong {
  font-size: 13px;
}

.sbr-history-info span {
  overflow: hidden;
  color: var(--sbr-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sbr-history-duration {
  color: var(--sbr-ink);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sbr-history-result {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.sbr-history-result.completed {
  background: var(--sbr-success-soft);
  color: var(--sbr-success);
}

.sbr-history-result.skipped {
  background: var(--sbr-track);
  color: var(--sbr-muted);
}

.sbr-history-more {
  display: flex;
  justify-content: center;
  padding-top: 16px;
}

/* Notice */

.sbr-notice-slot:empty {
  display: none;
}

.sbr-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  border: 1px solid var(--sbr-accent-border);
  border-radius: 13px;
  background: var(--sbr-accent-soft);
  color: var(--sbr-ink);
  font-size: 13px;
}

.sbr-notice > svg {
  flex-shrink: 0;
  color: var(--sbr-accent);
}

.sbr-notice span {
  flex: 1;
}

.sbr-notice button {
  display: grid;
  place-items: center;
  padding: 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--sbr-muted);
  cursor: pointer;
}

.sbr-notice button:hover {
  color: var(--sbr-ink);
}

.sbr-local-note {
  margin: -4px 0 0;
  color: var(--sbr-muted);
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

/* Responsive */

@media (max-width: 850px) {
  .sbr-main-grid {
    grid-template-columns: 1fr;
  }

  .sbr-side-column {
    grid-template-columns: 1fr 1fr;
  }

  .sbr-duration-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .sbr-app[data-theme="dark"] {
    padding: 14px;
    border-radius: 16px;
  }

  .sbr-side-column,
  .sbr-preference-grid {
    grid-template-columns: 1fr;
  }

  .sbr-timer-top {
    flex-direction: column;
  }

  .sbr-primary-button {
    width: 100%;
  }

  .sbr-history-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .sbr-history-row {
    grid-template-columns: 9px minmax(0, 1fr) auto;
    gap: 6px 12px;
  }

  .sbr-history-result {
    grid-column: 2 / -1;
    justify-self: start;
  }

  .sbr-history-duration {
    grid-column: 3;
    grid-row: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sbr-app *,
  .sbr-app *::before,
  .sbr-app *::after {
    transition: none !important;
    animation: none !important;
  }
}
`;

function TimerStyles() {
  return <style dangerouslySetInnerHTML={{ __html: STYLES }} />;
}