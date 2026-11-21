
"use client";

import { useEffect, useRef, useState } from "react";
import ToolShell from "../ToolShell";

type Phase = "focus" | "shortBreak" | "longBreak";

type TimerSettings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
};

type SavedData = {
  phase: Phase;
  remainingMs: number;
  endAt: number | null;
  isRunning: boolean;
  completedFocusSessions: number;
  settings: TimerSettings;
};

const STORAGE_KEY = "toolsab-pomodoro-timer-v1";

const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
};

const PHASES: Record<
  Phase,
  { label: string; description: string }
> = {
  focus: {
    label: "Focus time",
    description: "Work on one task without distractions.",
  },
  shortBreak: {
    label: "Short break",
    description: "Step away and give yourself a little rest.",
  },
  longBreak: {
    label: "Long break",
    description: "Take a longer break before your next focus cycle.",
  },
};

function getPhaseDuration(
  phase: Phase,
  settings: TimerSettings,
) {
  const minutes =
    phase === "focus"
      ? settings.focusMinutes
      : phase === "shortBreak"
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes;

  return minutes * 60 * 1000;
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.ceil(
    Math.max(0, milliseconds) / 1000,
  );

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    seconds,
  ).padStart(2, "0")}`;
}

function getLocalDateKey() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function PomodoroStudyTimer() {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] =
    useState<TimerSettings>(DEFAULT_SETTINGS);

  const [phase, setPhase] = useState<Phase>("focus");
  const [remainingMs, setRemainingMs] = useState(
    DEFAULT_SETTINGS.focusMinutes * 60000,
  );

  const [endAt, setEndAt] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [completedFocusSessions, setCompletedFocusSessions] =
    useState(0);

  const [now, setNow] = useState(Date.now());
  const lastHandledEndAt = useRef<number | null>(null);

  const currentRemaining =
    isRunning && endAt !== null
      ? Math.max(0, endAt - now)
      : remainingMs;

  const totalDuration = getPhaseDuration(phase, settings);

  const progress = Math.min(
    100,
    Math.max(
      0,
      ((totalDuration - currentRemaining) / totalDuration) * 100,
    ),
  );

  const isCompleted = !isRunning && remainingMs === 0;

  // Restore saved timer and settings.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const data = JSON.parse(stored) as Partial<SavedData>;

        if (data.settings) {
          const restoredSettings = {
            ...DEFAULT_SETTINGS,
            ...data.settings,
          };

          setSettings(restoredSettings);
        }

        if (
          data.phase === "focus" ||
          data.phase === "shortBreak" ||
          data.phase === "longBreak"
        ) {
          setPhase(data.phase);
        }

        if (
          typeof data.remainingMs === "number" &&
          Number.isFinite(data.remainingMs)
        ) {
          setRemainingMs(Math.max(0, data.remainingMs));
        }

        if (typeof data.endAt === "number") {
          setEndAt(data.endAt);
        }

        if (typeof data.isRunning === "boolean") {
          setIsRunning(data.isRunning);
        }

        if (
          typeof data.completedFocusSessions === "number"
        ) {
          setCompletedFocusSessions(
            Math.max(0, data.completedFocusSessions),
          );
        }
      }
    } catch {
      // Start with default timer settings if saved data is invalid.
    }

    setNow(Date.now());
    setHydrated(true);
  }, []);

  // Save the current timer state.
  useEffect(() => {
    if (!hydrated) return;

    const data: SavedData = {
      phase,
      remainingMs,
      endAt,
      isRunning,
      completedFocusSessions,
      settings,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // The timer can still run without browser storage.
    }
  }, [
    hydrated,
    phase,
    remainingMs,
    endAt,
    isRunning,
    completedFocusSessions,
    settings,
  ]);

  // Refresh the displayed countdown.
  useEffect(() => {
    if (!isRunning || endAt === null) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => window.clearInterval(interval);
  }, [isRunning, endAt]);

  // Complete the current phase once its deadline is reached.
  useEffect(() => {
    if (!isRunning || endAt === null || now < endAt) return;

    if (lastHandledEndAt.current === endAt) return;

    lastHandledEndAt.current = endAt;

    setRemainingMs(0);
    setEndAt(null);
    setIsRunning(false);

    if (phase === "focus") {
      setCompletedFocusSessions((count) => count + 1);
    }
  }, [now, isRunning, endAt, phase]);

  function startTimer() {
    if (isRunning || remainingMs <= 0) return;

    const startTime = Date.now();

    setNow(startTime);
    setEndAt(startTime + remainingMs);
    setIsRunning(true);
  }

  function pauseTimer() {
    if (!isRunning || endAt === null) return;

    const remaining = Math.max(0, endAt - Date.now());

    setRemainingMs(remaining);
    setEndAt(null);
    setIsRunning(false);
    setNow(Date.now());
  }

  function resetTimer() {
    setIsRunning(false);
    setEndAt(null);
    setRemainingMs(getPhaseDuration(phase, settings));
    setNow(Date.now());
  }

  function changePhase(nextPhase: Phase) {
    setIsRunning(false);
    setEndAt(null);
    setPhase(nextPhase);
    setRemainingMs(getPhaseDuration(nextPhase, settings));
    setNow(Date.now());
  }

  function startNextPhase() {
    if (phase === "focus") {
      const shouldTakeLongBreak =
        completedFocusSessions > 0 &&
        completedFocusSessions %
          settings.sessionsBeforeLongBreak === 0;

      changePhase(
        shouldTakeLongBreak ? "longBreak" : "shortBreak",
      );
    } else {
      changePhase("focus");
    }
  }

  function updateSetting(
    key: keyof TimerSettings,
    value: number,
  ) {
    const updatedSettings = {
      ...settings,
      [key]: value,
    };

    setSettings(updatedSettings);

    if (!isRunning) {
      setRemainingMs(getPhaseDuration(phase, updatedSettings));
      setEndAt(null);
    }
  }

  function resetAll() {
    setIsRunning(false);
    setEndAt(null);
    setPhase("focus");
    setSettings(DEFAULT_SETTINGS);
    setRemainingMs(DEFAULT_SETTINGS.focusMinutes * 60000);
    setCompletedFocusSessions(0);
    setNow(Date.now());
    lastHandledEndAt.current = null;
  }

  const completedInCycle =
    completedFocusSessions % settings.sessionsBeforeLongBreak;

  const cyclePosition =
    completedInCycle === 0 && completedFocusSessions > 0
      ? settings.sessionsBeforeLongBreak
      : completedInCycle;

  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <ToolShell
      title="Pomodoro Study Timer"
      onReset={resetAll}
      wide
    >
      <div className="space-y-6">
        {/* Main timer */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <span
                className={`h-2 w-2 rounded-full ${
                  isRunning ? "animate-pulse bg-green-500" : "bg-blue-500"
                }`}
              />
              {PHASES[phase].label}
            </div>

            <h2 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
              {PHASES[phase].description}
            </h2>

            <div
              role="timer"
              aria-live="off"
              className="mt-5 font-mono text-6xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-8xl"
            >
              {hydrated ? formatTime(currentRemaining) : "25:00"}
            </div>

            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {todayLabel}
            </p>

            {/* Progress bar */}
            <div className="mx-auto mt-8 h-3 max-w-lg overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {Math.round(progress)}% completed
            </div>

            {/* Controls */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {!isRunning ? (
                <button
                  type="button"
                  onClick={startTimer}
                  disabled={remainingMs <= 0}
                  className="rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {remainingMs === 0 ? "Time completed" : "Start"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pauseTimer}
                  className="rounded-xl bg-amber-500 px-8 py-3 font-semibold text-white transition hover:bg-amber-600"
                >
                  Pause
                </button>
              )}

              <button
                type="button"
                onClick={resetTimer}
                className="rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Reset
              </button>

              {!isRunning && isCompleted && (
                <button
                  type="button"
                  onClick={startNextPhase}
                  className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
                >
                  {phase === "focus"
                    ? "Start break"
                    : "Start next focus"}
                </button>
              )}
            </div>

            {isCompleted && (
              <p className="mt-5 text-sm font-medium text-green-600 dark:text-green-400">
                {phase === "focus"
                  ? "Focus session completed. Great work!"
                  : "Break completed. Ready for your next focus session?"}
              </p>
            )}
          </div>
        </section>

        {/* Phase shortcuts */}
        <section className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["focus", "Focus", settings.focusMinutes],
              ["shortBreak", "Short break", settings.shortBreakMinutes],
              ["longBreak", "Long break", settings.longBreakMinutes],
            ] as const
          ).map(([key, label, minutes]) => (
            <button
              key={key}
              type="button"
              onClick={() => changePhase(key)}
              disabled={isRunning}
              className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                phase === key
                  ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900"
              }`}
            >
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {label}
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                {minutes} min
              </p>
            </button>
          ))}
        </section>

        {/* Cycle progress */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Focus cycle
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Complete focus sessions to reach your long break.
              </p>
            </div>

            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {cyclePosition} of {settings.sessionsBeforeLongBreak}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-3">
            {Array.from(
              { length: settings.sessionsBeforeLongBreak },
              (_, index) => {
                const completed =
                  index < completedFocusSessions %
                    settings.sessionsBeforeLongBreak ||
                  (completedFocusSessions > 0 &&
                    completedFocusSessions %
                      settings.sessionsBeforeLongBreak === 0);

                return (
                  <div
                    key={index}
                    className={`flex h-12 items-center justify-center rounded-xl border text-sm font-semibold ${
                      completed
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800"
                    }`}
                  >
                    {completed ? "✓" : index + 1}
                  </div>
                );
              },
            )}
          </div>

          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Completed focus sessions:{" "}
            <strong className="text-gray-900 dark:text-white">
              {completedFocusSessions}
            </strong>
          </p>
        </section>

        {/* Settings */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Timer settings
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Adjust the length of your focus and break periods.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                {
                  key: "focusMinutes",
                  label: "Focus duration",
                  min: 5,
                  max: 90,
                },
                {
                  key: "shortBreakMinutes",
                  label: "Short break",
                  min: 1,
                  max: 30,
                },
                {
                  key: "longBreakMinutes",
                  label: "Long break",
                  min: 5,
                  max: 60,
                },
                {
                  key: "sessionsBeforeLongBreak",
                  label: "Focus sessions before long break",
                  min: 2,
                  max: 8,
                },
              ] as const
            ).map((item) => (
              <div key={item.key}>
                <label
                  htmlFor={item.key}
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {item.label}
                </label>

                <select
                  id={item.key}
                  value={settings[item.key]}
                  disabled={isRunning}
                  onChange={(event) =>
                    updateSetting(item.key, Number(event.target.value))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {Array.from(
                    {
                      length: item.max - item.min + 1,
                    },
                    (_, index) => item.min + index,
                  ).map((value) => (
                    <option key={value} value={value}>
                      {item.key === "sessionsBeforeLongBreak"
                        ? `${value} sessions`
                        : `${value} minutes`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {isRunning && (
            <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
              Pause the timer before changing settings.
            </p>
          )}
        </section>

        {/* Daily summary */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your focus summary
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            A quick look at your completed Pomodoro sessions.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-5 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Completed focus sessions
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {completedFocusSessions}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-5 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total completed focus time
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {Math.floor(
                  (completedFocusSessions * settings.focusMinutes) / 60,
                )}
                h{" "}
                {(completedFocusSessions * settings.focusMinutes) % 60}
                m
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-6 text-gray-500 dark:text-gray-400">
            The summary counts completed focus sessions using your current
            focus duration. If you change the duration later, this estimate
            will reflect the new setting rather than the original length of
            each session.
          </p>
        </section>

        <p className="text-center text-xs leading-6 text-gray-500 dark:text-gray-400">
          Your timer settings and progress are saved in this browser. They
          are not automatically synced across devices.
        </p>
      </div>
    </ToolShell>
  );
}
