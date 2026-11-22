"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import ToolShell from "../ToolShell";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Difficulty = "Beginner" | "Intermediate" | "Advanced";
type Priority = "Low" | "Normal" | "High";
type TopicStatus = "new" | "learning" | "mastered";
type PickMode = "random" | "priority" | "fresh";
type ThemeMode = "light" | "dark";
type RecordType = "pick" | "study";
type ToastKind = "success" | "error" | "info";

type Topic = {
  id: string;
  title: string;
  subject: string;
  difficulty: Difficulty;
  priority: Priority;
  status: TopicStatus;
  minutes: number;
  notes: string;
  favorite: boolean;
  createdAt: string;
  pickedCount: number;
  lastPickedAt: string | null;
  studiedMinutes: number;
};

type TopicValues = Omit<
  Topic,
  "id" | "createdAt" | "pickedCount" | "lastPickedAt" | "studiedMinutes"
>;

type PickRecord = {
  id: string;
  type: RecordType;
  topicId: string;
  topicTitle: string;
  subject: string;
  difficulty: Difficulty;
  pickedAt: string;
  minutes: number;
};

type Prefs = {
  theme: ThemeMode;
  mode: PickMode;
  animate: boolean;
  avoidRepeat: boolean;
  sound: boolean;
};

type TopicDraft = {
  title: string;
  subject: string;
  difficulty: Difficulty;
  priority: Priority;
  status: TopicStatus;
  minutes: string;
  notes: string;
  favorite: boolean;
};

type ToastData = {
  id: string;
  kind: ToastKind;
  message: string;
};

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "danger" | "primary";
  onConfirm: () => void;
} | null;

type PendingImport = {
  fileName: string;
  topics: Topic[];
  history: PickRecord[];
  skipped: number;
};

type FocusTimer = {
  topicId: string;
  durationMs: number;
  running: boolean;
  endAt: number | null;
  remainingMs: number;
};

type BulkItem = {
  title: string;
  subject: string;
  difficulty: Difficulty;
};

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "toolsab-random-study-topic-picker-v1";
const MAX_IMPORT_SIZE = 5 * 1024 * 1024;
const MAX_BULK = 300;
const LIBRARY_PAGE = 30;
const HISTORY_PAGE = 15;
const RING_RADIUS = 44;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const DIFFICULTIES: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];
const PRIORITIES: Priority[] = ["Low", "Normal", "High"];

const STATUS_OPTIONS: { value: TopicStatus; label: string }[] = [
  { value: "new", label: "Not started" },
  { value: "learning", label: "Learning" },
  { value: "mastered", label: "Mastered" },
];

const MODE_OPTIONS: { value: PickMode; label: string; description: string }[] =
  [
    {
      value: "random",
      label: "Pure random",
      description: "Every topic in the pool has an equal chance of coming up.",
    },
    {
      value: "priority",
      label: "By priority",
      description:
        "High-priority topics are more likely to come up than low-priority ones.",
    },
    {
      value: "fresh",
      label: "Least studied",
      description:
        "Topics you have picked less often are more likely to come up.",
    },
  ];

const PRIORITY_WEIGHT: Record<Priority, number> = {
  Low: 1,
  Normal: 2,
  High: 4,
};

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
};

const PRIORITY_RANK: Record<Priority, number> = {
  Low: 0,
  Normal: 1,
  High: 2,
};

const FOCUS_PRESETS = [15, 25, 45, 60, 90];

const DEFAULT_PREFS: Prefs = {
  theme: "light",
  mode: "random",
  animate: true,
  avoidRepeat: true,
  sound: true,
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const createId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const pad = (value: number) => String(value).padStart(2, "0");

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const addDays = (key: string, amount: number) => {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, (m || 1) - 1, (d || 1) + amount));
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const topicKey = (title: string, subject: string) =>
  `${title.trim().toLowerCase()}|${subject.trim().toLowerCase()}`;

const isDifficulty = (value: unknown): value is Difficulty =>
  DIFFICULTIES.includes(value as Difficulty);

const isPriority = (value: unknown): value is Priority =>
  PRIORITIES.includes(value as Priority);

const isStatus = (value: unknown): value is TopicStatus =>
  value === "new" || value === "learning" || value === "mastered";

const isValidDateString = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(new Date(value).getTime());

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatMinutes = (minutes: number) => {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;

  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} hr`;

  return `${hours} hr ${rest} min`;
};

const formatClock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/* Quotes every cell and neutralises spreadsheet formulas (CSV injection). */
const csvEscape = (value: string | number) => {
  let text = String(value);

  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
};

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function playChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!Ctx) return;

    const ctx = new Ctx();

    [880, 1174.66].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + index * 0.2;

      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.65);
    });

    window.setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, 1500);
  } catch {
    /* Audio is a nice-to-have; ignore failures. */
  }
}

function sampleTopics(): Topic[] {
  const now = new Date().toISOString();

  const rows: [string, string, Difficulty][] = [
    ["Variables and Data Types", "Programming", "Beginner"],
    ["JavaScript Array Methods", "Programming", "Intermediate"],
    ["React Hooks", "Programming", "Advanced"],
    ["Fractions and Decimals", "Mathematics", "Beginner"],
    ["Linear Equations", "Mathematics", "Intermediate"],
    ["Probability", "Mathematics", "Advanced"],
    ["Cell Structure", "Biology", "Beginner"],
    ["Human Nervous System", "Biology", "Intermediate"],
  ];

  return rows.map(([title, subject, difficulty], index) => ({
    id: `sample-${index + 1}`,
    title,
    subject,
    difficulty,
    priority: "Normal",
    status: "new",
    minutes: 30,
    notes: "",
    favorite: false,
    createdAt: now,
    pickedCount: 0,
    lastPickedAt: null,
    studiedMinutes: 0,
  }));
}

function normalizeTopic(value: unknown): Topic | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Record<string, unknown>;

  const title =
    typeof item.title === "string" ? item.title.trim().slice(0, 120) : "";
  const subject =
    typeof item.subject === "string" ? item.subject.trim().slice(0, 60) : "";

  if (!title || !subject) return null;

  const minutes = Math.floor(Number(item.minutes));
  const picked = Math.floor(Number(item.pickedCount));
  const studied = Math.floor(Number(item.studiedMinutes));

  return {
    id: typeof item.id === "string" && item.id ? item.id : createId(),
    title,
    subject,
    difficulty: isDifficulty(item.difficulty) ? item.difficulty : "Beginner",
    priority: isPriority(item.priority) ? item.priority : "Normal",
    status: isStatus(item.status) ? item.status : "new",
    minutes: Number.isFinite(minutes) ? clamp(minutes, 5, 480) : 30,
    notes:
      typeof item.notes === "string" ? item.notes.trim().slice(0, 500) : "",
    favorite: item.favorite === true,
    createdAt: isValidDateString(item.createdAt)
      ? item.createdAt
      : new Date().toISOString(),
    pickedCount: Number.isFinite(picked) && picked > 0 ? picked : 0,
    lastPickedAt: isValidDateString(item.lastPickedAt)
      ? item.lastPickedAt
      : null,
    studiedMinutes: Number.isFinite(studied) && studied > 0 ? studied : 0,
  };
}

function normalizeTopics(raw: unknown[]) {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const topics: Topic[] = [];
  let skipped = 0;

  raw.forEach((entry) => {
    const topic = normalizeTopic(entry);

    if (!topic) {
      skipped += 1;
      return;
    }

    const key = topicKey(topic.title, topic.subject);

    if (seenIds.has(topic.id) || seenKeys.has(key)) {
      skipped += 1;
      return;
    }

    seenIds.add(topic.id);
    seenKeys.add(key);
    topics.push(topic);
  });

  return { topics, skipped };
}

function normalizeHistory(raw: unknown[], topicIds: Set<string>) {
  const seen = new Set<string>();
  const records: PickRecord[] = [];

  raw.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;

    const item = entry as Record<string, unknown>;

    if (
      typeof item.id !== "string" ||
      typeof item.topicId !== "string" ||
      typeof item.topicTitle !== "string" ||
      typeof item.subject !== "string" ||
      !isValidDateString(item.pickedAt) ||
      !topicIds.has(item.topicId) ||
      seen.has(item.id)
    ) {
      return;
    }

    const minutes = Math.floor(Number(item.minutes));

    seen.add(item.id);
    records.push({
      id: item.id,
      type: item.type === "study" ? "study" : "pick",
      topicId: item.topicId,
      topicTitle: item.topicTitle,
      subject: item.subject,
      difficulty: isDifficulty(item.difficulty) ? item.difficulty : "Beginner",
      pickedAt: item.pickedAt,
      minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 0,
    });
  });

  return records;
}

function normalizePrefs(value: unknown, fallbackTheme: ThemeMode): Prefs {
  const item =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    theme:
      item.theme === "dark" || item.theme === "light"
        ? item.theme
        : fallbackTheme,
    mode:
      item.mode === "priority" || item.mode === "fresh" ? item.mode : "random",
    animate: item.animate !== false,
    avoidRepeat: item.avoidRepeat !== false,
    sound: item.sound !== false,
  };
}

function weightedPick<T>(items: T[], weightOf: (item: T) => number): T {
  const weights = items.map((item) => Math.max(0.0001, weightOf(item)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  let threshold = Math.random() * total;

  for (let index = 0; index < items.length; index += 1) {
    threshold -= weights[index];
    if (threshold <= 0) return items[index];
  }

  return items[items.length - 1];
}

function computeStreak(dates: Set<string>, today: string) {
  let cursor = dates.has(today) ? today : addDays(today, -1);
  let streak = 0;

  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function buildValues(draft: TopicDraft): string | TopicValues {
  const title = draft.title.trim();
  const subject = draft.subject.trim();
  const minutes = Number(draft.minutes);

  if (!title) return "Enter a topic name.";
  if (!subject) return "Enter a subject.";

  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) {
    return "Estimated time must be a whole number between 5 and 480 minutes.";
  }

  return {
    title,
    subject,
    difficulty: draft.difficulty,
    priority: draft.priority,
    status: draft.status,
    minutes,
    notes: draft.notes.trim().slice(0, 500),
    favorite: draft.favorite,
  };
}

function parseBulk(
  text: string,
  defaultSubject: string,
  defaultDifficulty: Difficulty,
  existing: Set<string>
) {
  const items: BulkItem[] = [];
  const seen = new Set(existing);

  let duplicates = 0;
  let invalid = 0;
  let overflow = 0;

  text.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();

    if (!line) return;

    const parts = line.split(/\s*[|\t]\s*/);
    const title = (parts[0] ?? "").trim().slice(0, 120);
    const subject = ((parts[1] ?? "").trim() || defaultSubject.trim()).slice(
      0,
      60
    );
    const rawDifficulty = (parts[2] ?? "").trim().toLowerCase();
    const difficulty =
      DIFFICULTIES.find((item) => item.toLowerCase() === rawDifficulty) ??
      defaultDifficulty;

    if (!title || !subject) {
      invalid += 1;
      return;
    }

    const key = topicKey(title, subject);

    if (seen.has(key)) {
      duplicates += 1;
      return;
    }

    if (items.length >= MAX_BULK) {
      overflow += 1;
      return;
    }

    seen.add(key);
    items.push({ title, subject, difficulty });
  });

  return { items, duplicates, invalid, overflow };
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function Icon({
  name,
  size = 18,
  fill,
}: {
  name: string;
  size?: number;
  fill?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: fill ?? "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  const paths: Record<string, ReactNode> = {
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    shuffle: <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />,
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    edit: <path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z" />,
    trash: <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />,
    star: (
      <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.7l6.2-.9z" />
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    play: <path d="M7 4v16l13-8z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5" />
        <path d="M5 19h14" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m-5 5 5-5 5 5" />
        <path d="M5 20h14" />
      </>
    ),
    moon: <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    flame: (
      <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
    ),
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z" />
        <path d="M4 5.5V22M8 7h8M8 11h7" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3 9 5-9 5-9-5z" />
        <path d="m3 13 9 5 9-5" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2 20h20z" />
        <path d="M12 10v4M12 17h.01" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V6a2 2 0 0 1 2-2h9" />
      </>
    ),
    bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
    list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
    filter: <path d="M4 6h16M7 12h10m-7 6h4" />,
  };

  return <svg {...common}>{paths[name] ?? paths.target}</svg>;
}

/* -------------------------------------------------------------------------- */
/* Small UI pieces                                                            */
/* -------------------------------------------------------------------------- */

function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();

  return (
    <label className="rsp-switch-row" htmlFor={id}>
      <span className="rsp-switch-text">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <span className="rsp-switch">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span className="rsp-switch-track" aria-hidden="true">
          <span className="rsp-switch-thumb" />
        </span>
      </span>
    </label>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div className="rsp-seg" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const id = window.setTimeout(
      () => onDismiss(toast.id),
      toast.kind === "error" ? 6500 : 4200
    );

    return () => window.clearTimeout(id);
  }, [toast.id, toast.kind, onDismiss]);

  return (
    <div
      className={`rsp-toast ${toast.kind}`}
      role={toast.kind === "error" ? "alert" : "status"}
    >
      <span className="rsp-toast-icon">
        <Icon
          name={
            toast.kind === "error"
              ? "alert"
              : toast.kind === "success"
                ? "check"
                : "info"
          }
          size={16}
        />
      </span>
      <span className="rsp-toast-message">{toast.message}</span>
      <button
        type="button"
        className="rsp-toast-close"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Overlay (modal) base                                                       */
/* -------------------------------------------------------------------------- */

const overlayStack: string[] = [];
let savedBodyOverflow = "";
let savedBodyPadding = "";

function Overlay({
  title,
  theme,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  theme: ThemeMode;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const idRef = useRef(createId());
  const closeRef = useRef(onClose);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const id = idRef.current;
    const previous = document.activeElement as HTMLElement | null;

    if (overlayStack.length === 0) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      savedBodyOverflow = document.body.style.overflow;
      savedBodyPadding = document.body.style.paddingRight;
      document.body.style.overflow = "hidden";

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    overlayStack.push(id);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        overlayStack[overlayStack.length - 1] === id
      ) {
        closeRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const root = dialogRef.current;
    const preferred = root?.querySelector<HTMLElement>("[data-autofocus]");

    (preferred ?? root)?.focus({ preventScroll: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);

      const index = overlayStack.indexOf(id);
      if (index >= 0) overlayStack.splice(index, 1);

      if (overlayStack.length === 0) {
        document.body.style.overflow = savedBodyOverflow;
        document.body.style.paddingRight = savedBodyPadding;
      }

      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;

    const root = dialogRef.current;
    if (!root) return;

    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )
    );

    if (focusables.length === 0) {
      event.preventDefault();
      root.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === root)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className="rsp rsp-portal" data-theme={theme}>
      <div
        className="rsp-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          ref={dialogRef}
          tabIndex={-1}
          className={`rsp-modal ${size}`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onKeyDown={trapFocus}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="rsp-modal-head">
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <button
        type="button"
        className="rsp-icon-btn"
        aria-label="Close dialog"
        onClick={onClose}
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}

function ConfirmDialog({
  state,
  theme,
  onCancel,
  onConfirm,
}: {
  state: NonNullable<ConfirmState>;
  theme: ThemeMode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Overlay title={state.title} theme={theme} onClose={onCancel} size="sm">
      <div className="rsp-confirm">
        <div className={`rsp-confirm-icon ${state.tone}`}>
          <Icon name={state.tone === "danger" ? "alert" : "info"} size={24} />
        </div>
        <h3>{state.title}</h3>
        <p>{state.message}</p>
        <div className="rsp-confirm-actions">
          <button
            type="button"
            className="rsp-btn rsp-btn-light"
            data-autofocus
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`rsp-btn ${
              state.tone === "danger" ? "rsp-btn-danger" : "rsp-btn-primary"
            }`}
            onClick={onConfirm}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function TopicEditorModal({
  topic,
  theme,
  subjects,
  onSave,
  onClose,
}: {
  topic: Topic;
  theme: ThemeMode;
  subjects: string[];
  onSave: (draft: TopicDraft) => string | null;
  onClose: () => void;
}) {
  const listId = useId();
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<TopicDraft>({
    title: topic.title,
    subject: topic.subject,
    difficulty: topic.difficulty,
    priority: topic.priority,
    status: topic.status,
    minutes: String(topic.minutes),
    notes: topic.notes,
    favorite: topic.favorite,
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = onSave(draft);

    if (result) setError(result);
  };

  return (
    <Overlay title="Edit topic" theme={theme} onClose={onClose}>
      <ModalHeader
        title="Edit topic"
        subtitle="Update the details, priority and study status."
        onClose={onClose}
      />
      <form onSubmit={submit}>
        <div className="rsp-modal-body">
          <label className="rsp-field">
            <span>Topic name</span>
            <input
              data-autofocus
              value={draft.title}
              maxLength={120}
              onChange={(event) =>
                setDraft({ ...draft, title: event.currentTarget.value })
              }
            />
          </label>

          <div className="rsp-row-2">
            <label className="rsp-field">
              <span>Subject</span>
              <input
                list={listId}
                value={draft.subject}
                maxLength={60}
                onChange={(event) =>
                  setDraft({ ...draft, subject: event.currentTarget.value })
                }
              />
              <datalist id={listId}>
                {subjects.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>

            <label className="rsp-field">
              <span>Estimated time (minutes)</span>
              <input
                type="number"
                min={5}
                max={480}
                value={draft.minutes}
                onChange={(event) =>
                  setDraft({ ...draft, minutes: event.currentTarget.value })
                }
              />
            </label>
          </div>

          <div className="rsp-field">
            <span>Difficulty</span>
            <Segmented
              label="Difficulty"
              value={draft.difficulty}
              onChange={(difficulty) => setDraft({ ...draft, difficulty })}
              options={DIFFICULTIES.map((item) => ({
                value: item,
                label: item,
              }))}
            />
          </div>

          <div className="rsp-field">
            <span>Priority</span>
            <Segmented
              label="Priority"
              value={draft.priority}
              onChange={(priority) => setDraft({ ...draft, priority })}
              options={PRIORITIES.map((item) => ({ value: item, label: item }))}
            />
          </div>

          <div className="rsp-field">
            <span>Status</span>
            <Segmented
              label="Status"
              value={draft.status}
              onChange={(status) => setDraft({ ...draft, status })}
              options={STATUS_OPTIONS}
            />
          </div>

          <label className="rsp-field">
            <span>Notes (optional)</span>
            <textarea
              rows={3}
              maxLength={500}
              value={draft.notes}
              placeholder="Resources, chapter numbers, questions to answer..."
              onChange={(event) =>
                setDraft({ ...draft, notes: event.currentTarget.value })
              }
            />
          </label>

          <Switch
            checked={draft.favorite}
            onChange={(favorite) => setDraft({ ...draft, favorite })}
            label="Favorite topic"
            description="Favorites can be filtered and are highlighted in your library."
          />

          {error && (
            <div className="rsp-inline-error" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="rsp-modal-foot">
          <button
            type="button"
            className="rsp-btn rsp-btn-light"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="rsp-btn rsp-btn-primary">
            Save changes
          </button>
        </div>
      </form>
    </Overlay>
  );
}

function BulkAddModal({
  theme,
  subjects,
  existingKeys,
  onAdd,
  onClose,
}: {
  theme: ThemeMode;
  subjects: string[];
  existingKeys: Set<string>;
  onAdd: (items: BulkItem[]) => void;
  onClose: () => void;
}) {
  const listId = useId();
  const [text, setText] = useState("");
  const [defaultSubject, setDefaultSubject] = useState("");
  const [defaultDifficulty, setDefaultDifficulty] =
    useState<Difficulty>("Beginner");

  const parsed = useMemo(
    () => parseBulk(text, defaultSubject, defaultDifficulty, existingKeys),
    [text, defaultSubject, defaultDifficulty, existingKeys]
  );

  return (
    <Overlay title="Bulk add topics" theme={theme} onClose={onClose} size="lg">
      <ModalHeader
        title="Bulk add topics"
        subtitle="Paste one topic per line. Use Topic | Subject | Difficulty, or just a topic name."
        onClose={onClose}
      />
      <div className="rsp-modal-body">
        <div className="rsp-row-2">
          <label className="rsp-field">
            <span>Default subject</span>
            <input
              list={listId}
              value={defaultSubject}
              maxLength={60}
              placeholder="Used when a line has no subject"
              onChange={(event) => setDefaultSubject(event.currentTarget.value)}
            />
            <datalist id={listId}>
              {subjects.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <div className="rsp-field">
            <span>Default difficulty</span>
            <Segmented
              label="Default difficulty"
              value={defaultDifficulty}
              onChange={setDefaultDifficulty}
              options={DIFFICULTIES.map((item) => ({
                value: item,
                label: item,
              }))}
            />
          </div>
        </div>

        <label className="rsp-field">
          <span>Topics</span>
          <textarea
            data-autofocus
            rows={9}
            value={text}
            placeholder={
              "Photosynthesis | Biology | Beginner\nQuadratic Formula | Mathematics | Intermediate\nClosures"
            }
            onChange={(event) => setText(event.currentTarget.value)}
          />
        </label>

        <div className="rsp-bulk-summary">
          <span className="ok">
            <strong>{parsed.items.length}</strong> will be added
          </span>
          <span>
            <strong>{parsed.duplicates}</strong> duplicates skipped
          </span>
          <span>
            <strong>{parsed.invalid}</strong> missing a subject
          </span>
          {parsed.overflow > 0 && (
            <span className="warn">
              <strong>{parsed.overflow}</strong> over the {MAX_BULK} limit
            </span>
          )}
        </div>

        {parsed.items.length > 0 && (
          <ul className="rsp-bulk-preview">
            {parsed.items.slice(0, 5).map((item) => (
              <li key={topicKey(item.title, item.subject)}>
                <strong>{item.title}</strong>
                <span>
                  {item.subject} · {item.difficulty}
                </span>
              </li>
            ))}
            {parsed.items.length > 5 && (
              <li className="more">+ {parsed.items.length - 5} more</li>
            )}
          </ul>
        )}
      </div>

      <div className="rsp-modal-foot">
        <button
          type="button"
          className="rsp-btn rsp-btn-light"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rsp-btn rsp-btn-primary"
          disabled={parsed.items.length === 0}
          onClick={() => onAdd(parsed.items)}
        >
          Add {parsed.items.length || ""} topic
          {parsed.items.length === 1 ? "" : "s"}
        </button>
      </div>
    </Overlay>
  );
}

function ImportModal({
  pending,
  theme,
  onMerge,
  onReplace,
  onClose,
}: {
  pending: PendingImport;
  theme: ThemeMode;
  onMerge: () => void;
  onReplace: () => void;
  onClose: () => void;
}) {
  return (
    <Overlay title="Import backup" theme={theme} onClose={onClose}>
      <ModalHeader
        title="Import backup"
        subtitle={pending.fileName}
        onClose={onClose}
      />
      <div className="rsp-modal-body">
        <div className="rsp-import-stats">
          <div>
            <strong>{pending.topics.length}</strong>
            <span>topics found</span>
          </div>
          <div>
            <strong>{pending.history.length}</strong>
            <span>history records</span>
          </div>
          <div>
            <strong>{pending.skipped}</strong>
            <span>skipped as invalid</span>
          </div>
        </div>

        <div className="rsp-import-options">
          <button type="button" data-autofocus onClick={onMerge}>
            <strong>Merge with my library</strong>
            <span>
              Keeps everything you have and adds only new topics (with their
              history). Topics that already exist are skipped.
            </span>
          </button>
          <button type="button" className="danger" onClick={onReplace}>
            <strong>Replace my library</strong>
            <span>
              Removes your current topics and history and uses this backup
              instead.
            </span>
          </button>
        </div>
      </div>
      <div className="rsp-modal-foot">
        <button
          type="button"
          className="rsp-btn rsp-btn-light"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </Overlay>
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function RandomStudyTopicPicker() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [history, setHistory] = useState<PickRecord[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Beginner");

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [excludePicked, setExcludePicked] = useState(false);
  const [excludeMastered, setExcludeMastered] = useState(false);
  const [libraryLimit, setLibraryLimit] = useState(LIBRARY_PAGE);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastPickedId, setLastPickedId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [shuffleLabel, setShuffleLabel] = useState("");

  const [showHistory, setShowHistory] = useState(true);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE);

  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(
    null
  );

  const [focus, setFocus] = useState<FocusTimer | null>(null);
  const [focusMinutes, setFocusMinutes] = useState("25");
  const [now, setNow] = useState(() => Date.now());

  const importInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLElement>(null);
  const pickTimerRef = useRef<number | null>(null);
  const topicsRef = useRef<Topic[]>([]);
  const handlePickRef = useRef<() => void>(() => undefined);
  const finishFocusRef = useRef<(completed: boolean) => void>(() => undefined);

  const subjectListId = useId();

  /* ------------------------------------------------------------------------ */
  /* Toasts and confirm                                                       */
  /* ------------------------------------------------------------------------ */

  const notify = useCallback((kind: ToastKind, message: string) => {
    setToasts((current) => [
      ...current.slice(-2),
      { id: createId(), kind, message },
    ]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const askConfirm = useCallback(
    (options: NonNullable<ConfirmState>) => setConfirm(options),
    []
  );

  /* ------------------------------------------------------------------------ */
  /* Persistence                                                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const systemTheme: ThemeMode =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

    let loaded = false;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (parsed && typeof parsed === "object") {
          const data = parsed as Record<string, unknown>;

          if (Array.isArray(data.topics)) {
            const normalized = normalizeTopics(data.topics);
            const ids = new Set(normalized.topics.map((topic) => topic.id));

            setTopics(normalized.topics);
            setHistory(
              Array.isArray(data.history)
                ? normalizeHistory(data.history, ids)
                : []
            );
            setPrefs(normalizePrefs(data.prefs, systemTheme));
            loaded = true;
          }
        }
      }
    } catch {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);

        if (raw) {
          window.localStorage.setItem(`${STORAGE_KEY}-corrupt-backup`, raw);
        }
      } catch {
        /* Nothing more we can do. */
      }

      notify(
        "error",
        "Saved data could not be read, so the sample topics were loaded. The old data was kept as a backup in this browser."
      );
    }

    if (!loaded) {
      setTopics(sampleTopics());
      setHistory([]);
      setPrefs({ ...DEFAULT_PREFS, theme: systemTheme });
    }

    setHydrated(true);
  }, [notify]);

  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 2, topics, history, prefs })
      );
    } catch {
      notify(
        "error",
        "Browser storage is unavailable or full. Export a backup to protect your data."
      );
    }
  }, [topics, history, prefs, hydrated, notify]);

  useEffect(() => {
    topicsRef.current = topics;
  }, [topics]);

  useEffect(
    () => () => {
      if (pickTimerRef.current) window.clearTimeout(pickTimerRef.current);
    },
    []
  );

  /* ------------------------------------------------------------------------ */
  /* Derived data                                                             */
  /* ------------------------------------------------------------------------ */

  const subjects = useMemo(
    () =>
      Array.from(new Set(topics.map((topic) => topic.subject.trim()))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [topics]
  );

  const existingKeys = useMemo(
    () => new Set(topics.map((topic) => topicKey(topic.title, topic.subject))),
    [topics]
  );

  const pickedTopicIds = useMemo(
    () =>
      new Set(
        history
          .filter((record) => record.type === "pick")
          .map((record) => record.topicId)
      ),
    [history]
  );

  const filteredTopics = useMemo(() => {
    const query = search.trim().toLowerCase();

    return topics.filter((topic) => {
      if (
        query &&
        !topic.title.toLowerCase().includes(query) &&
        !topic.subject.toLowerCase().includes(query) &&
        !topic.notes.toLowerCase().includes(query)
      ) {
        return false;
      }

      if (subjectFilter !== "all" && topic.subject !== subjectFilter) {
        return false;
      }

      if (difficultyFilter !== "all" && topic.difficulty !== difficultyFilter) {
        return false;
      }

      if (statusFilter !== "all" && topic.status !== statusFilter) {
        return false;
      }

      if (favoritesOnly && !topic.favorite) return false;
      if (excludePicked && pickedTopicIds.has(topic.id)) return false;
      if (excludeMastered && topic.status === "mastered") return false;

      return true;
    });
  }, [
    topics,
    search,
    subjectFilter,
    difficultyFilter,
    statusFilter,
    favoritesOnly,
    excludePicked,
    excludeMastered,
    pickedTopicIds,
  ]);

  const sortedTopics = useMemo(() => {
    const list = [...filteredTopics];

    list.sort((a, b) => {
      switch (sortBy) {
        case "az":
          return a.title.localeCompare(b.title);
        case "most":
          return b.pickedCount - a.pickedCount;
        case "least":
          return a.pickedCount - b.pickedCount;
        case "difficulty":
          return DIFFICULTY_RANK[b.difficulty] - DIFFICULTY_RANK[a.difficulty];
        case "priority":
          return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
        case "recent":
          return (b.lastPickedAt ?? "").localeCompare(a.lastPickedAt ?? "");
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });

    return list;
  }, [filteredTopics, sortBy]);

  const recentHistory = useMemo(
    () =>
      [...history].sort(
        (a, b) =>
          new Date(b.pickedAt).getTime() - new Date(a.pickedAt).getTime()
      ),
    [history]
  );

  const selectedTopic = selectedId
    ? topics.find((topic) => topic.id === selectedId)
    : undefined;

  const editingTopic = editingId
    ? topics.find((topic) => topic.id === editingId)
    : undefined;

  const focusTopic = focus
    ? topics.find((topic) => topic.id === focus.topicId)
    : undefined;

  const today = dateKey(new Date());

  const stats = useMemo(() => {
    const activity = new Map<string, number>();

    history.forEach((record) => {
      const key = dateKey(new Date(record.pickedAt));
      activity.set(key, (activity.get(key) ?? 0) + 1);
    });

    const mastered = topics.filter((topic) => topic.status === "mastered");
    const studiedMinutes = topics.reduce(
      (sum, topic) => sum + topic.studiedMinutes,
      0
    );
    const sessions = history.filter((record) => record.type === "study").length;
    const picks = history.filter((record) => record.type === "pick").length;

    const subjectMap = new Map<string, { total: number; mastered: number }>();

    topics.forEach((topic) => {
      const entry = subjectMap.get(topic.subject) ?? { total: 0, mastered: 0 };
      entry.total += 1;
      if (topic.status === "mastered") entry.mastered += 1;
      subjectMap.set(topic.subject, entry);
    });

    const subjectStats = Array.from(subjectMap.entries())
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const last7 = Array.from({ length: 7 }, (_, index) => {
      const key = addDays(today, -(6 - index));
      const [y, m, d] = key.split("-").map(Number);

      return {
        key,
        count: activity.get(key) ?? 0,
        label: new Date(y, m - 1, d).toLocaleDateString(undefined, {
          weekday: "short",
        }),
      };
    });

    const difficultyCounts = DIFFICULTIES.map((item) => ({
      label: item,
      count: topics.filter((topic) => topic.difficulty === item).length,
    }));

    return {
      mastered: mastered.length,
      masteredPercent: topics.length
        ? Math.round((mastered.length / topics.length) * 100)
        : 0,
      studiedMinutes,
      sessions,
      picks,
      streak: computeStreak(new Set(activity.keys()), today),
      subjectStats,
      last7,
      difficultyCounts,
    };
  }, [topics, history, today]);

  const availableCount = filteredTopics.length;
  const maxLast7 = Math.max(1, ...stats.last7.map((day) => day.count));
  const hasActiveFilters =
    search.trim() !== "" ||
    subjectFilter !== "all" ||
    difficultyFilter !== "all" ||
    statusFilter !== "all" ||
    favoritesOnly ||
    excludePicked ||
    excludeMastered;

  const activeMode =
    MODE_OPTIONS.find((item) => item.value === prefs.mode) ?? MODE_OPTIONS[0];

  /* ------------------------------------------------------------------------ */
  /* Topic management                                                         */
  /* ------------------------------------------------------------------------ */

  const addTopic = (values: TopicValues) => {
    const topic: Topic = {
      id: createId(),
      ...values,
      createdAt: new Date().toISOString(),
      pickedCount: 0,
      lastPickedAt: null,
      studiedMinutes: 0,
    };

    setTopics((current) => [topic, ...current]);
  };

  const handleQuickAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = buildValues({
      title,
      subject,
      difficulty,
      priority: "Normal",
      status: "new",
      minutes: "30",
      notes: "",
      favorite: false,
    });

    if (typeof result === "string") {
      notify("error", result);
      return;
    }

    if (existingKeys.has(topicKey(result.title, result.subject))) {
      notify("error", "This topic already exists in the same subject.");
      return;
    }

    addTopic(result);
    setTitle("");
    setDifficulty("Beginner");
    notify("success", `"${result.title}" added to your library.`);
    quickAddRef.current?.focus({ preventScroll: true });
  };

  const handleBulkAdd = (items: BulkItem[]) => {
    const stamp = new Date().toISOString();

    const created: Topic[] = items.map((item) => ({
      id: createId(),
      title: item.title,
      subject: item.subject,
      difficulty: item.difficulty,
      priority: "Normal",
      status: "new",
      minutes: 30,
      notes: "",
      favorite: false,
      createdAt: stamp,
      pickedCount: 0,
      lastPickedAt: null,
      studiedMinutes: 0,
    }));

    setTopics((current) => [...created, ...current]);
    setBulkOpen(false);
    notify(
      "success",
      `${created.length} topic${created.length === 1 ? "" : "s"} added.`
    );
  };

  const saveTopic = (draft: TopicDraft): string | null => {
    if (!editingTopic) return "This topic no longer exists.";

    const result = buildValues(draft);

    if (typeof result === "string") return result;

    const duplicate = topics.some(
      (topic) =>
        topic.id !== editingTopic.id &&
        topicKey(topic.title, topic.subject) ===
          topicKey(result.title, result.subject)
    );

    if (duplicate) {
      return "Another topic with this name already exists in that subject.";
    }

    const id = editingTopic.id;

    setTopics((current) =>
      current.map((topic) => (topic.id === id ? { ...topic, ...result } : topic))
    );

    setHistory((current) =>
      current.map((record) =>
        record.topicId === id
          ? {
              ...record,
              topicTitle: result.title,
              subject: result.subject,
              difficulty: result.difficulty,
            }
          : record
      )
    );

    setEditingId(null);
    notify("success", "Topic updated.");
    return null;
  };

  const deleteTopic = (topic: Topic) => {
    askConfirm({
      title: "Delete this topic?",
      message: `"${topic.title}" and its pick and study history will be permanently removed.`,
      confirmLabel: "Delete topic",
      tone: "danger",
      onConfirm: () => {
        setTopics((current) => current.filter((item) => item.id !== topic.id));
        setHistory((current) =>
          current.filter((record) => record.topicId !== topic.id)
        );
        setSelectedId((current) => (current === topic.id ? null : current));
        setLastPickedId((current) => (current === topic.id ? null : current));
        setFocus((current) => (current?.topicId === topic.id ? null : current));
        setEditingId((current) => (current === topic.id ? null : current));
        notify("success", "Topic deleted.");
      },
    });
  };

  const toggleFavorite = (topic: Topic) => {
    setTopics((current) =>
      current.map((item) =>
        item.id === topic.id ? { ...item, favorite: !item.favorite } : item
      )
    );
  };

  const setTopicStatus = (topic: Topic, status: TopicStatus) => {
    setTopics((current) =>
      current.map((item) => (item.id === topic.id ? { ...item, status } : item))
    );

    if (status === "mastered") {
      notify("success", `Marked "${topic.title}" as mastered.`);
    }
  };

  const toggleMastered = (topic: Topic) =>
    setTopicStatus(topic, topic.status === "mastered" ? "learning" : "mastered");

  const clearFilters = () => {
    setSearch("");
    setSubjectFilter("all");
    setDifficultyFilter("all");
    setStatusFilter("all");
    setFavoritesOnly(false);
    setExcludePicked(false);
    setExcludeMastered(false);
    setLibraryLimit(LIBRARY_PAGE);
  };

  /* ------------------------------------------------------------------------ */
  /* Random picking                                                           */
  /* ------------------------------------------------------------------------ */

  const commitPick = (topicId: string) => {
    const topic = topicsRef.current.find((item) => item.id === topicId);

    if (!topic) {
      notify("error", "That topic was removed before it could be selected.");
      return;
    }

    const pickedAt = new Date().toISOString();

    setTopics((current) =>
      current.map((item) =>
        item.id === topicId
          ? { ...item, pickedCount: item.pickedCount + 1, lastPickedAt: pickedAt }
          : item
      )
    );

    setHistory((current) => [
      {
        id: createId(),
        type: "pick",
        topicId,
        topicTitle: topic.title,
        subject: topic.subject,
        difficulty: topic.difficulty,
        pickedAt,
        minutes: 0,
      },
      ...current,
    ]);

    setSelectedId(topicId);
    setLastPickedId(topicId);

    if (FOCUS_PRESETS.includes(topic.minutes)) {
      setFocusMinutes(String(topic.minutes));
    }
  };

  const handlePick = () => {
    if (picking) return;

    if (filteredTopics.length === 0) {
      notify("error", "No topics are available with the current filters.");
      return;
    }

    let pool = filteredTopics;

    if (prefs.avoidRepeat && pool.length > 1 && lastPickedId) {
      pool = pool.filter((topic) => topic.id !== lastPickedId);
    }

    const chosen =
      prefs.mode === "priority"
        ? weightedPick(pool, (topic) => PRIORITY_WEIGHT[topic.priority])
        : prefs.mode === "fresh"
          ? weightedPick(pool, (topic) => 1 / (1 + topic.pickedCount))
          : pool[Math.floor(Math.random() * pool.length)];

    if (!prefs.animate || pool.length === 1) {
      commitPick(chosen.id);
      return;
    }

    const titles = pool.map((topic) => topic.title);
    const totalSteps = 14;
    let step = 0;

    setPicking(true);

    const run = () => {
      step += 1;

      if (step < totalSteps) {
        setShuffleLabel(titles[Math.floor(Math.random() * titles.length)]);
        pickTimerRef.current = window.setTimeout(run, 70 + step * 14);
        return;
      }

      pickTimerRef.current = null;
      setPicking(false);
      setShuffleLabel("");
      commitPick(chosen.id);
    };

    run();
  };

  useEffect(() => {
    handlePickRef.current = handlePick;
  });

  /* ------------------------------------------------------------------------ */
  /* Focus timer                                                              */
  /* ------------------------------------------------------------------------ */

  const focusRemaining = focus
    ? focus.running && focus.endAt
      ? Math.max(0, focus.endAt - now)
      : focus.remainingMs
    : 0;

  const focusRunning = focus?.running ?? false;
  const focusActive = focus !== null;
  const focusClockText = formatClock(focusRemaining);
  const focusTitleText = focusTopic?.title ?? "";

  useEffect(() => {
    if (!focusRunning) return;

    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);

    return () => window.clearInterval(id);
  }, [focusRunning]);

  useEffect(() => {
    if (focus && !topics.some((topic) => topic.id === focus.topicId)) {
      setFocus(null);
    }
  }, [focus, topics]);

  /* Show the countdown in the browser tab so it can be tracked elsewhere. */
  useEffect(() => {
    if (!focusActive) return;

    const original = document.title;

    document.title = `${focusClockText} · ${focusTitleText || "Focus session"}`;

    return () => {
      document.title = original;
    };
  }, [focusActive, focusClockText, focusTitleText]);

  const logStudy = (topicId: string, minutes: number) => {
    const topic = topicsRef.current.find((item) => item.id === topicId);

    if (!topic || minutes < 1) return;

    setTopics((current) =>
      current.map((item) =>
        item.id === topicId
          ? { ...item, studiedMinutes: item.studiedMinutes + minutes }
          : item
      )
    );

    setHistory((current) => [
      {
        id: createId(),
        type: "study",
        topicId,
        topicTitle: topic.title,
        subject: topic.subject,
        difficulty: topic.difficulty,
        pickedAt: new Date().toISOString(),
        minutes,
      },
      ...current,
    ]);

    notify("success", `Logged ${formatMinutes(minutes)} on "${topic.title}".`);
  };

  const startFocus = (topic: Topic) => {
    const minutes = Number(focusMinutes);

    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
      notify("error", "Choose a focus time between 1 and 240 minutes.");
      return;
    }

    const begin = () => {
      const stamp = Date.now();
      const ms = minutes * 60000;

      setNow(stamp);
      setFocus({
        topicId: topic.id,
        durationMs: ms,
        running: true,
        endAt: stamp + ms,
        remainingMs: ms,
      });
      setSelectedId(topic.id);

      setTopics((current) =>
        current.map((item) =>
          item.id === topic.id && item.status === "new"
            ? { ...item, status: "learning" }
            : item
        )
      );
    };

    if (focus && focus.topicId !== topic.id) {
      askConfirm({
        title: "Replace the running session?",
        message:
          "You already have a focus session in progress for another topic. Starting a new one will discard it without logging any time.",
        confirmLabel: "Start new session",
        tone: "primary",
        onConfirm: begin,
      });
      return;
    }

    if (focus && focus.topicId === topic.id) {
      notify("info", "A focus session is already running for this topic.");
      return;
    }

    begin();
  };

  const togglePauseFocus = () => {
    if (!focus) return;

    const stamp = Date.now();

    setNow(stamp);

    if (focus.running && focus.endAt) {
      setFocus({
        ...focus,
        running: false,
        endAt: null,
        remainingMs: Math.max(0, focus.endAt - stamp),
      });
    } else {
      setFocus({
        ...focus,
        running: true,
        endAt: stamp + focus.remainingMs,
      });
    }
  };

  const finishFocus = (completed: boolean) => {
    if (!focus) return;

    const remaining =
      focus.running && focus.endAt
        ? Math.max(0, focus.endAt - Date.now())
        : focus.remainingMs;

    const elapsed = focus.durationMs - remaining;
    const minutes = completed
      ? Math.round(focus.durationMs / 60000)
      : Math.round(elapsed / 60000);
    const topicId = focus.topicId;

    setFocus(null);

    if (completed && prefs.sound) playChime();

    if (minutes >= 1) {
      logStudy(topicId, minutes);
    } else {
      notify("info", "That session was under a minute, so nothing was logged.");
    }
  };

  useEffect(() => {
    finishFocusRef.current = finishFocus;
  });

  useEffect(() => {
    if (focus && focus.running && focusRemaining <= 0) {
      finishFocusRef.current(true);
    }
  }, [focus, focusRemaining]);

  const cancelFocus = () => {
    if (!focus) return;

    const elapsed = focus.durationMs - focusRemaining;

    if (elapsed < 60000) {
      setFocus(null);
      return;
    }

    askConfirm({
      title: "Discard this session?",
      message:
        "The time you have studied so far will not be logged. Use “Finish & log” if you want to keep it.",
      confirmLabel: "Discard session",
      tone: "danger",
      onConfirm: () => setFocus(null),
    });
  };

  /* ------------------------------------------------------------------------ */
  /* History                                                                  */
  /* ------------------------------------------------------------------------ */

  const handleClearHistory = () => {
    if (history.length === 0) return;

    askConfirm({
      title: "Clear all history?",
      message:
        "This removes every pick and study record and resets each topic's picked count and studied time. Your topics and their statuses are kept.",
      confirmLabel: "Clear history",
      tone: "danger",
      onConfirm: () => {
        setHistory([]);
        setLastPickedId(null);
        setTopics((current) =>
          current.map((topic) => ({
            ...topic,
            pickedCount: 0,
            lastPickedAt: null,
            studiedMinutes: 0,
          }))
        );
        notify("success", "History cleared.");
      },
    });
  };

  /* ------------------------------------------------------------------------ */
  /* Export / import                                                          */
  /* ------------------------------------------------------------------------ */

  const handleExport = () => {
    downloadFile(
      `toolsab-study-topics-${dateKey(new Date())}.json`,
      JSON.stringify(
        {
          version: 2,
          exportedAt: new Date().toISOString(),
          topics,
          history,
        },
        null,
        2
      ),
      "application/json"
    );

    notify("success", "Your JSON backup has been downloaded.");
  };

  const handleExportCsv = () => {
    const rows: (string | number)[][] = [
      [
        "Topic",
        "Subject",
        "Difficulty",
        "Priority",
        "Status",
        "Estimated minutes",
        "Times picked",
        "Minutes studied",
        "Favorite",
        "Last picked",
        "Notes",
      ],
      ...topics.map((topic) => [
        topic.title,
        topic.subject,
        topic.difficulty,
        topic.priority,
        STATUS_OPTIONS.find((item) => item.value === topic.status)?.label ??
          topic.status,
        topic.minutes,
        topic.pickedCount,
        topic.studiedMinutes,
        topic.favorite ? "Yes" : "No",
        topic.lastPickedAt ?? "",
        topic.notes,
      ]),
    ];

    downloadFile(
      `toolsab-study-topics-${dateKey(new Date())}.csv`,
      `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\r\n")}`,
      "text/csv;charset=utf-8"
    );

    notify("success", "Topics exported as CSV.");
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) return;

    try {
      if (file.size > MAX_IMPORT_SIZE) {
        throw new Error("The selected file is larger than the 5 MB import limit.");
      }

      if (!file.name.toLowerCase().endsWith(".json")) {
        throw new Error("Please select a JSON backup file.");
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(await file.text());
      } catch {
        throw new Error("This file is not valid JSON.");
      }

      const rawTopics = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object"
          ? (parsed as Record<string, unknown>).topics
          : null;

      if (!Array.isArray(rawTopics)) {
        throw new Error("This file is not a compatible ToolsAB backup.");
      }

      const normalized = normalizeTopics(rawTopics);

      if (normalized.topics.length === 0) {
        throw new Error("No valid topics were found in this file.");
      }

      const rawHistory =
        !Array.isArray(parsed) &&
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as Record<string, unknown>).history)
          ? ((parsed as Record<string, unknown>).history as unknown[])
          : [];

      setPendingImport({
        fileName: file.name,
        topics: normalized.topics,
        history: normalizeHistory(
          rawHistory,
          new Set(normalized.topics.map((topic) => topic.id))
        ),
        skipped: normalized.skipped,
      });
    } catch (importError) {
      notify(
        "error",
        importError instanceof Error
          ? importError.message
          : "Could not import this backup file."
      );
    } finally {
      input.value = "";
    }
  };

  const confirmImport = (mode: "merge" | "replace") => {
    if (!pendingImport) return;

    if (mode === "replace") {
      setTopics(pendingImport.topics);
      setHistory(pendingImport.history);
      setSelectedId(null);
      setLastPickedId(null);
      setFocus(null);
      setEditingId(null);
      clearFilters();
      notify(
        "success",
        `Library replaced with ${pendingImport.topics.length} topics.`
      );
    } else {
      const knownKeys = new Set(existingKeys);
      const usedIds = new Set(topics.map((topic) => topic.id));
      const idMap = new Map<string, string>();
      const additions: Topic[] = [];

      pendingImport.topics.forEach((topic) => {
        const key = topicKey(topic.title, topic.subject);

        if (knownKeys.has(key)) return;

        const id = usedIds.has(topic.id) ? createId() : topic.id;

        usedIds.add(id);
        knownKeys.add(key);
        idMap.set(topic.id, id);
        additions.push({ ...topic, id });
      });

      const existingHistoryIds = new Set(history.map((record) => record.id));

      const historyAdditions = pendingImport.history
        .filter(
          (record) =>
            idMap.has(record.topicId) && !existingHistoryIds.has(record.id)
        )
        .map((record) => ({
          ...record,
          topicId: idMap.get(record.topicId) ?? record.topicId,
        }));

      setTopics((current) => [...additions, ...current]);
      setHistory((current) => [...historyAdditions, ...current]);

      notify(
        "success",
        `${additions.length} new topic${
          additions.length === 1 ? "" : "s"
        } merged, ${pendingImport.topics.length - additions.length} skipped as duplicates.`
      );
    }

    setPendingImport(null);
  };

  /* ------------------------------------------------------------------------ */
  /* Reset                                                                    */
  /* ------------------------------------------------------------------------ */

  const handleReset = () => {
    askConfirm({
      title: "Reset the study topic picker?",
      message:
        "Your topics, history and filters will be replaced with the sample topics. This cannot be undone.",
      confirmLabel: "Reset everything",
      tone: "danger",
      onConfirm: () => {
        if (pickTimerRef.current) {
          window.clearTimeout(pickTimerRef.current);
          pickTimerRef.current = null;
        }

        setPicking(false);
        setShuffleLabel("");
        setTopics(sampleTopics());
        setHistory([]);
        setSelectedId(null);
        setLastPickedId(null);
        setFocus(null);
        setEditingId(null);
        setTitle("");
        setSubject("");
        setDifficulty("Beginner");
        setSortBy("newest");
        clearFilters();
        setShowHistory(true);
        setHistoryLimit(HISTORY_PAGE);
        notify("success", "The tool has been reset to its sample topics.");
      },
    });
  };

  /* ------------------------------------------------------------------------ */
  /* Keyboard shortcuts                                                       */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;

      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (document.querySelector(".rsp-modal")) return;

      const key = event.key.toLowerCase();

      if (key === "p") {
        event.preventDefault();
        handlePickRef.current();
      } else if (key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (key === "n") {
        event.preventDefault();
        quickAddRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const studyTopic = (topic: Topic) => {
    setSelectedId(topic.id);

    if (FOCUS_PRESETS.includes(topic.minutes)) {
      setFocusMinutes(String(topic.minutes));
    }

    pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copyTitle = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notify("success", "Topic copied to clipboard.");
    } catch {
      notify("error", "Could not copy. Select the text and copy it manually.");
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  if (!hydrated) {
    return (
      <ToolShell title="Random Study Topic Picker" onReset={handleReset} wide>
        <div className="rsp rsp-loading" role="status">
          <div className="rsp-spinner" />
          <p>Loading your study topics...</p>
        </div>
        <PickerStyles />
      </ToolShell>
    );
  }

  const shownTopics = sortedTopics.slice(0, libraryLimit);
  const focusProgress = focus
    ? clamp(1 - focusRemaining / Math.max(1, focus.durationMs), 0, 1)
    : 0;

  return (
    <ToolShell title="Random Study Topic Picker" onReset={handleReset} wide>
      <div className="rsp" data-theme={prefs.theme}>
        {/* Hero */}
        <header className="rsp-hero">
          <div className="rsp-hero-copy">
            <span className="rsp-eyebrow">
              <Icon name="target" size={15} />
              Study planner
            </span>
            <h2>Decide what to learn next.</h2>
            <p>
              Build your topic library, let the picker choose your next study
              target, run a focus session and watch your progress grow.
            </p>
            <div className="rsp-shortcuts">
              <span>
                <kbd>P</kbd> pick a topic
              </span>
              <span>
                <kbd>/</kbd> search
              </span>
              <span>
                <kbd>N</kbd> new topic
              </span>
            </div>
          </div>

          <div className="rsp-hero-actions">
            <button
              type="button"
              className="rsp-icon-btn rsp-theme-btn"
              aria-label={
                prefs.theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              title={prefs.theme === "dark" ? "Light mode" : "Dark mode"}
              onClick={() =>
                setPrefs((current) => ({
                  ...current,
                  theme: current.theme === "dark" ? "light" : "dark",
                }))
              }
            >
              <Icon name={prefs.theme === "dark" ? "sun" : "moon"} size={18} />
            </button>
            <button
              type="button"
              className="rsp-btn rsp-btn-light"
              onClick={() => setBulkOpen(true)}
            >
              <Icon name="list" size={16} />
              Bulk add
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="rsp-stats">
          <div className="rsp-stat">
            <div className="rsp-stat-icon">
              <Icon name="layers" size={18} />
            </div>
            <strong>{topics.length}</strong>
            <span>Total topics</span>
            <small>
              {subjects.length} subject{subjects.length === 1 ? "" : "s"}
            </small>
          </div>
          <div className="rsp-stat">
            <div className="rsp-stat-icon">
              <Icon name="check" size={18} />
            </div>
            <strong>{stats.mastered}</strong>
            <span>Mastered</span>
            <small>{stats.masteredPercent}% of your library</small>
          </div>
          <div className="rsp-stat">
            <div className="rsp-stat-icon">
              <Icon name="shuffle" size={18} />
            </div>
            <strong>{stats.picks}</strong>
            <span>Times picked</span>
            <small>{availableCount} in the current pool</small>
          </div>
          <div className="rsp-stat">
            <div className="rsp-stat-icon">
              <Icon name="clock" size={18} />
            </div>
            <strong>{formatMinutes(stats.studiedMinutes)}</strong>
            <span>Study time</span>
            <small>
              {stats.sessions} focus session{stats.sessions === 1 ? "" : "s"}
            </small>
          </div>
          <div className={`rsp-stat ${stats.streak > 0 ? "hot" : ""}`}>
            <div className="rsp-stat-icon">
              <Icon name="flame" size={18} />
            </div>
            <strong>
              {stats.streak} {stats.streak === 1 ? "day" : "days"}
            </strong>
            <span>Study streak</span>
            <small>Counts days with a pick or session</small>
          </div>
        </div>

        <div className="rsp-layout">
          <div className="rsp-col">
            {/* Picker */}
            <section
              className="rsp-picker"
              ref={pickerRef}
              aria-labelledby="rsp-picker-title"
            >
              <div className="rsp-picker-head">
                <div>
                  <span className="rsp-label">Random picker</span>
                  <h3 id="rsp-picker-title">Your next study target</h3>
                </div>
                <span className="rsp-pool-badge">
                  <Icon name="filter" size={13} />
                  {availableCount} in pool
                </span>
              </div>

              <div className="rsp-mode">
                <Segmented
                  label="Pick mode"
                  value={prefs.mode}
                  onChange={(mode) =>
                    setPrefs((current) => ({ ...current, mode }))
                  }
                  options={MODE_OPTIONS.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                />
                <p>{activeMode.description}</p>
              </div>

              <div
                className={`rsp-result ${picking ? "shuffling" : ""} ${
                  selectedTopic && !picking ? "has-topic" : ""
                }`}
                aria-live="polite"
              >
                {picking ? (
                  <>
                    <span className="rsp-result-label">Choosing...</span>
                    <p className="rsp-result-title">
                      {shuffleLabel || "Shuffling topics"}
                    </p>
                  </>
                ) : selectedTopic ? (
                  <>
                    <span className="rsp-result-label">
                      Your selected topic
                    </span>
                    <p className="rsp-result-title">{selectedTopic.title}</p>
                    <div className="rsp-chips center">
                      <span className="rsp-chip">{selectedTopic.subject}</span>
                      <span
                        className={`rsp-chip rsp-d-${selectedTopic.difficulty.toLowerCase()}`}
                      >
                        {selectedTopic.difficulty}
                      </span>
                      <span className={`rsp-chip rsp-s-${selectedTopic.status}`}>
                        {
                          STATUS_OPTIONS.find(
                            (item) => item.value === selectedTopic.status
                          )?.label
                        }
                      </span>
                      <span className="rsp-chip rsp-ghost">
                        <Icon name="clock" size={12} />
                        {selectedTopic.minutes} min
                      </span>
                    </div>
                    {selectedTopic.notes && (
                      <p className="rsp-result-notes">{selectedTopic.notes}</p>
                    )}
                    <p className="rsp-result-meta">
                      Picked {selectedTopic.pickedCount}{" "}
                      {selectedTopic.pickedCount === 1 ? "time" : "times"}
                      {selectedTopic.studiedMinutes > 0 &&
                        ` · ${formatMinutes(selectedTopic.studiedMinutes)} studied`}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="rsp-result-label">Ready when you are</span>
                    <p className="rsp-result-title">What will you study today?</p>
                    <p className="rsp-result-meta">
                      Press the button below or hit <kbd>P</kbd> to pick a
                      topic.
                    </p>
                  </>
                )}
              </div>

              <div className="rsp-picker-actions">
                <button
                  type="button"
                  className="rsp-pick-button"
                  onClick={handlePick}
                  disabled={availableCount === 0 || picking}
                >
                  <Icon name="shuffle" size={19} />
                  {picking
                    ? "Choosing..."
                    : selectedTopic
                      ? "Pick another topic"
                      : "Pick a random topic"}
                </button>

                {selectedTopic && !picking && (
                  <div className="rsp-quick-actions">
                    <button
                      type="button"
                      className={`rsp-icon-btn ${
                        selectedTopic.favorite ? "fav" : ""
                      }`}
                      aria-pressed={selectedTopic.favorite}
                      aria-label="Toggle favorite"
                      title="Favorite"
                      onClick={() => toggleFavorite(selectedTopic)}
                    >
                      <Icon
                        name="star"
                        size={17}
                        fill={selectedTopic.favorite ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      type="button"
                      className="rsp-icon-btn"
                      aria-label="Copy topic name"
                      title="Copy topic name"
                      onClick={() => void copyTitle(selectedTopic.title)}
                    >
                      <Icon name="copy" size={17} />
                    </button>
                    <button
                      type="button"
                      className={`rsp-btn ${
                        selectedTopic.status === "mastered"
                          ? "rsp-btn-success"
                          : "rsp-btn-light"
                      }`}
                      onClick={() => toggleMastered(selectedTopic)}
                    >
                      <Icon name="check" size={15} />
                      {selectedTopic.status === "mastered"
                        ? "Mastered"
                        : "Mark mastered"}
                    </button>
                  </div>
                )}
              </div>

              {availableCount === 0 && (
                <p className="rsp-pick-hint">
                  {topics.length === 0
                    ? "Add a topic to start picking."
                    : "No topics match your filters, so there is nothing to pick from."}{" "}
                  {topics.length > 0 && hasActiveFilters && (
                    <button
                      type="button"
                      className="rsp-link"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  )}
                </p>
              )}

              {/* Focus session */}
              {(focus || (selectedTopic && !picking)) && (
                <div className="rsp-focus">
                  {focus && focusTopic ? (
                    <>
                      <div className="rsp-focus-head">
                        <div
                          className="rsp-ring"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(focusProgress * 100)}
                          aria-label="Focus session progress"
                        >
                          <svg viewBox="0 0 100 100" aria-hidden="true">
                            <circle
                              className="rsp-ring-bg"
                              cx="50"
                              cy="50"
                              r={RING_RADIUS}
                            />
                            <circle
                              className="rsp-ring-fg"
                              cx="50"
                              cy="50"
                              r={RING_RADIUS}
                              strokeDasharray={RING_LENGTH}
                              strokeDashoffset={RING_LENGTH * (1 - focusProgress)}
                            />
                          </svg>
                          <span
                            className={`rsp-clock ${focus.running ? "live" : ""}`}
                          >
                            {formatClock(focusRemaining)}
                          </span>
                        </div>
                        <div className="rsp-focus-info">
                          <span className="rsp-label">
                            {focus.running ? "Focus session" : "Session paused"}
                          </span>
                          <strong>{focusTopic.title}</strong>
                          <small>
                            {Math.round(focusProgress * 100)}% of{" "}
                            {Math.round(focus.durationMs / 60000)} min
                          </small>
                        </div>
                      </div>
                      <div className="rsp-focus-actions">
                        <button
                          type="button"
                          className="rsp-btn rsp-btn-light"
                          onClick={togglePauseFocus}
                        >
                          <Icon name={focus.running ? "pause" : "play"} size={15} />
                          {focus.running ? "Pause" : "Resume"}
                        </button>
                        <button
                          type="button"
                          className="rsp-btn rsp-btn-primary"
                          onClick={() => finishFocus(false)}
                        >
                          <Icon name="stop" size={15} />
                          Finish &amp; log
                        </button>
                        <button
                          type="button"
                          className="rsp-btn rsp-btn-ghost"
                          onClick={cancelFocus}
                        >
                          Discard
                        </button>
                      </div>
                    </>
                  ) : selectedTopic ? (
                    <>
                      <div className="rsp-focus-intro">
                        <span className="rsp-label">Focus session</span>
                        <strong>Study this topic with a timer</strong>
                      </div>
                      <div className="rsp-focus-setup">
                        <div className="rsp-presets">
                          {FOCUS_PRESETS.map((minutes) => (
                            <button
                              key={minutes}
                              type="button"
                              className={
                                focusMinutes === String(minutes) ? "active" : ""
                              }
                              onClick={() => setFocusMinutes(String(minutes))}
                            >
                              {minutes}m
                            </button>
                          ))}
                          <label className="rsp-custom-minutes">
                            <input
                              type="number"
                              min={1}
                              max={240}
                              value={focusMinutes}
                              aria-label="Custom focus minutes"
                              onChange={(event) =>
                                setFocusMinutes(event.currentTarget.value)
                              }
                            />
                            <span>min</span>
                          </label>
                        </div>
                        <button
                          type="button"
                          className="rsp-btn rsp-btn-primary"
                          onClick={() => startFocus(selectedTopic)}
                        >
                          <Icon name="play" size={15} />
                          Start focus
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              <div className="rsp-picker-settings">
                <Switch
                  checked={prefs.animate}
                  onChange={(animate) =>
                    setPrefs((current) => ({ ...current, animate }))
                  }
                  label="Shuffle animation"
                  description="Cycle through topics before revealing the pick."
                />
                <Switch
                  checked={prefs.avoidRepeat}
                  onChange={(avoidRepeat) =>
                    setPrefs((current) => ({ ...current, avoidRepeat }))
                  }
                  label="Avoid repeating the last pick"
                  description="Skip the topic you just picked when others are available."
                />
                <Switch
                  checked={prefs.sound}
                  onChange={(sound) =>
                    setPrefs((current) => ({ ...current, sound }))
                  }
                  label="Completion chime"
                  description="Play a soft sound when a focus session ends."
                />
              </div>
            </section>

            {/* Quick add */}
            <section className="rsp-card" aria-labelledby="rsp-add-title">
              <div className="rsp-card-head">
                <div>
                  <span className="rsp-label">Quick add</span>
                  <h3 id="rsp-add-title">Add a study topic</h3>
                </div>
                <button
                  type="button"
                  className="rsp-btn rsp-btn-ghost"
                  onClick={() => setBulkOpen(true)}
                >
                  <Icon name="list" size={15} />
                  Add many
                </button>
              </div>

              <form className="rsp-add-form" onSubmit={handleQuickAdd}>
                <label className="rsp-field rsp-grow">
                  <span>Topic name</span>
                  <input
                    ref={quickAddRef}
                    value={title}
                    maxLength={120}
                    placeholder="e.g. JavaScript Promises"
                    onChange={(event) => setTitle(event.currentTarget.value)}
                  />
                </label>
                <label className="rsp-field">
                  <span>Subject</span>
                  <input
                    list={subjectListId}
                    value={subject}
                    maxLength={60}
                    placeholder="e.g. Programming"
                    onChange={(event) => setSubject(event.currentTarget.value)}
                  />
                  <datalist id={subjectListId}>
                    {subjects.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>
                <label className="rsp-field">
                  <span>Difficulty</span>
                  <select
                    value={difficulty}
                    onChange={(event) =>
                      setDifficulty(event.currentTarget.value as Difficulty)
                    }
                  >
                    {DIFFICULTIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="rsp-btn rsp-btn-primary">
                  <Icon name="plus" size={16} />
                  Add topic
                </button>
              </form>
            </section>

            {/* Library */}
            <section className="rsp-card" aria-labelledby="rsp-library-title">
              <div className="rsp-card-head">
                <div>
                  <span className="rsp-label">Library</span>
                  <h3 id="rsp-library-title">Your topic library</h3>
                </div>
                <span className="rsp-muted">
                  Showing {filteredTopics.length} of {topics.length}
                </span>
              </div>

              <div className="rsp-filters">
                <div className="rsp-search">
                  <Icon name="search" size={16} />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={search}
                    placeholder="Search topics, subjects or notes..."
                    aria-label="Search topics"
                    onChange={(event) => {
                      setSearch(event.currentTarget.value);
                      setLibraryLimit(LIBRARY_PAGE);
                    }}
                  />
                </div>

                <select
                  aria-label="Filter by subject"
                  value={subjectFilter}
                  onChange={(event) => {
                    setSubjectFilter(event.currentTarget.value);
                    setLibraryLimit(LIBRARY_PAGE);
                  }}
                >
                  <option value="all">All subjects</option>
                  {subjects.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by difficulty"
                  value={difficultyFilter}
                  onChange={(event) => {
                    setDifficultyFilter(event.currentTarget.value);
                    setLibraryLimit(LIBRARY_PAGE);
                  }}
                >
                  <option value="all">All levels</option>
                  {DIFFICULTIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.currentTarget.value);
                    setLibraryLimit(LIBRARY_PAGE);
                  }}
                >
                  <option value="all">Any status</option>
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Sort topics"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.currentTarget.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="az">Name A–Z</option>
                  <option value="most">Most picked</option>
                  <option value="least">Least picked</option>
                  <option value="recent">Recently picked</option>
                  <option value="difficulty">Hardest first</option>
                  <option value="priority">Highest priority</option>
                </select>
              </div>

              <div className="rsp-switches">
                <Switch
                  checked={favoritesOnly}
                  onChange={setFavoritesOnly}
                  label="Favorites only"
                  description="Only show and pick from starred topics."
                />
                <Switch
                  checked={excludePicked}
                  onChange={setExcludePicked}
                  label="Exclude topics already picked"
                  description="Hide previously selected topics from the pool."
                />
                <Switch
                  checked={excludeMastered}
                  onChange={setExcludeMastered}
                  label="Exclude mastered topics"
                  description="Focus on topics you have not mastered yet."
                />
              </div>

              <div className="rsp-filter-footer">
                <span>The picker uses exactly the topics shown here.</span>
                <button
                  type="button"
                  className="rsp-link"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                >
                  Clear filters
                </button>
              </div>

              {filteredTopics.length === 0 ? (
                <div className="rsp-empty">
                  <div className="rsp-empty-icon">
                    <Icon name="book" size={26} />
                  </div>
                  <h4>
                    {topics.length === 0
                      ? "Your library is empty"
                      : "No matching topics"}
                  </h4>
                  <p>
                    {topics.length === 0
                      ? "Add your first topic above, or paste many at once with Bulk add."
                      : "Try a different search, or clear your filters to see every topic."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="rsp-topic-list">
                    {shownTopics.map((topic) => (
                      <article
                        className={`rsp-topic ${topic.status} ${
                          selectedId === topic.id ? "selected" : ""
                        }`}
                        key={topic.id}
                      >
                        <button
                          type="button"
                          className="rsp-check"
                          aria-label={
                            topic.status === "mastered"
                              ? `Unmark ${topic.title} as mastered`
                              : `Mark ${topic.title} as mastered`
                          }
                          aria-pressed={topic.status === "mastered"}
                          title={
                            topic.status === "mastered"
                              ? "Mastered"
                              : "Mark as mastered"
                          }
                          onClick={() => toggleMastered(topic)}
                        >
                          <Icon name="check" size={14} />
                        </button>

                        <div className="rsp-topic-body">
                          <div className="rsp-topic-title">
                            <h4>{topic.title}</h4>
                            {topic.favorite && (
                              <span className="rsp-fav-mark" title="Favorite">
                                <Icon name="star" size={13} fill="currentColor" />
                              </span>
                            )}
                          </div>

                          <div className="rsp-chips">
                            <span className="rsp-chip">{topic.subject}</span>
                            <span
                              className={`rsp-chip rsp-d-${topic.difficulty.toLowerCase()}`}
                            >
                              {topic.difficulty}
                            </span>
                            <span className={`rsp-chip rsp-s-${topic.status}`}>
                              {
                                STATUS_OPTIONS.find(
                                  (item) => item.value === topic.status
                                )?.label
                              }
                            </span>
                            {topic.priority !== "Normal" && (
                              <span
                                className={`rsp-chip rsp-p-${topic.priority.toLowerCase()}`}
                              >
                                {topic.priority} priority
                              </span>
                            )}
                            <span className="rsp-chip rsp-ghost">
                              <Icon name="clock" size={12} />
                              {topic.minutes} min
                            </span>
                          </div>

                          {topic.notes && (
                            <p className="rsp-topic-notes">{topic.notes}</p>
                          )}

                          <p className="rsp-topic-meta">
                            Picked {topic.pickedCount}{" "}
                            {topic.pickedCount === 1 ? "time" : "times"}
                            {topic.studiedMinutes > 0 &&
                              ` · ${formatMinutes(topic.studiedMinutes)} studied`}
                            {topic.lastPickedAt
                              ? ` · Last picked ${formatDate(topic.lastPickedAt)}`
                              : " · Not picked yet"}
                          </p>
                        </div>

                        <div className="rsp-topic-actions">
                          <button
                            type="button"
                            className={`rsp-icon-btn ${topic.favorite ? "fav" : ""}`}
                            aria-pressed={topic.favorite}
                            aria-label={
                              topic.favorite
                                ? `Remove ${topic.title} from favorites`
                                : `Add ${topic.title} to favorites`
                            }
                            title="Favorite"
                            onClick={() => toggleFavorite(topic)}
                          >
                            <Icon
                              name="star"
                              size={16}
                              fill={topic.favorite ? "currentColor" : "none"}
                            />
                          </button>
                          <button
                            type="button"
                            className="rsp-icon-btn"
                            aria-label={`Study ${topic.title}`}
                            title="Study this topic"
                            onClick={() => studyTopic(topic)}
                          >
                            <Icon name="bolt" size={16} />
                          </button>
                          <button
                            type="button"
                            className="rsp-icon-btn"
                            aria-label={`Edit ${topic.title}`}
                            title="Edit"
                            onClick={() => setEditingId(topic.id)}
                          >
                            <Icon name="edit" size={16} />
                          </button>
                          <button
                            type="button"
                            className="rsp-icon-btn danger"
                            aria-label={`Delete ${topic.title}`}
                            title="Delete"
                            onClick={() => deleteTopic(topic)}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>

                  {sortedTopics.length > libraryLimit && (
                    <div className="rsp-more">
                      <button
                        type="button"
                        className="rsp-btn rsp-btn-light"
                        onClick={() =>
                          setLibraryLimit((value) => value + LIBRARY_PAGE)
                        }
                      >
                        Show more ({sortedTopics.length - libraryLimit} left)
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          <div className="rsp-col">
            {/* Insights */}
            <section className="rsp-card" aria-labelledby="rsp-insights-title">
              <div className="rsp-card-head">
                <div>
                  <span className="rsp-label">Insights</span>
                  <h3 id="rsp-insights-title">Your progress</h3>
                </div>
              </div>

              <div className="rsp-insight">
                <div className="rsp-insight-top">
                  <strong>Overall mastery</strong>
                  <span>{stats.masteredPercent}%</span>
                </div>
                <div className="rsp-progress">
                  <div style={{ width: `${stats.masteredPercent}%` }} />
                </div>
              </div>

              {stats.subjectStats.length > 0 && (
                <div className="rsp-insight">
                  <div className="rsp-insight-top">
                    <strong>By subject</strong>
                    <span>mastered / total</span>
                  </div>
                  <div className="rsp-subject-bars">
                    {stats.subjectStats.map((item) => (
                      <div key={item.name} className="rsp-subject-bar">
                        <div>
                          <span>{item.name}</span>
                          <em>
                            {item.mastered}/{item.total}
                          </em>
                        </div>
                        <div className="rsp-progress thin">
                          <div
                            style={{
                              width: `${(item.mastered / item.total) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rsp-insight">
                <div className="rsp-insight-top">
                  <strong>Last 7 days</strong>
                  <span>picks and sessions</span>
                </div>
                <div className="rsp-week">
                  {stats.last7.map((day) => (
                    <div
                      key={day.key}
                      className="rsp-week-col"
                      title={`${day.key}: ${day.count} activit${day.count === 1 ? "y" : "ies"}`}
                    >
                      <strong>{day.count || ""}</strong>
                      <div className="rsp-week-track">
                        <div
                          style={{
                            height: `${Math.max(
                              day.count > 0 ? 8 : 0,
                              (day.count / maxLast7) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span>{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rsp-insight">
                <div className="rsp-insight-top">
                  <strong>Difficulty mix</strong>
                </div>
                <div className="rsp-mix">
                  {stats.difficultyCounts.map((item) => (
                    <div
                      key={item.label}
                      className={`rsp-mix-item rsp-d-${item.label.toLowerCase()}`}
                    >
                      <strong>{item.count}</strong>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* History */}
            <section className="rsp-card" aria-labelledby="rsp-history-title">
              <div className="rsp-card-head">
                <div>
                  <span className="rsp-label">History</span>
                  <h3 id="rsp-history-title">Picks and sessions</h3>
                </div>
                <button
                  type="button"
                  className="rsp-btn rsp-btn-ghost"
                  aria-expanded={showHistory}
                  onClick={() => setShowHistory((current) => !current)}
                >
                  {showHistory ? "Hide" : "Show"}
                </button>
              </div>

              {showHistory && (
                <>
                  {recentHistory.length === 0 ? (
                    <div className="rsp-empty small">
                      <h4>No activity yet</h4>
                      <p>Your picks and focus sessions will appear here.</p>
                    </div>
                  ) : (
                    <div className="rsp-history-list">
                      {recentHistory.slice(0, historyLimit).map((record) => (
                        <div className="rsp-history-item" key={record.id}>
                          <span className={`rsp-history-icon ${record.type}`}>
                            <Icon
                              name={record.type === "study" ? "clock" : "shuffle"}
                              size={14}
                            />
                          </span>
                          <div>
                            <strong>{record.topicTitle}</strong>
                            <span>
                              {record.type === "study"
                                ? `Studied ${formatMinutes(record.minutes)}`
                                : "Picked"}{" "}
                              · {record.subject}
                            </span>
                          </div>
                          <time dateTime={record.pickedAt}>
                            {formatDate(record.pickedAt)}
                          </time>
                        </div>
                      ))}
                    </div>
                  )}

                  {recentHistory.length > historyLimit && (
                    <div className="rsp-more">
                      <button
                        type="button"
                        className="rsp-btn rsp-btn-light"
                        onClick={() =>
                          setHistoryLimit((value) => value + HISTORY_PAGE)
                        }
                      >
                        Show more ({recentHistory.length - historyLimit} left)
                      </button>
                    </div>
                  )}

                  <div className="rsp-history-footer">
                    <span>{history.length} total records</span>
                    <button
                      type="button"
                      className="rsp-btn rsp-btn-danger-light"
                      onClick={handleClearHistory}
                      disabled={history.length === 0}
                    >
                      Clear history
                    </button>
                  </div>
                </>
              )}
            </section>

            {/* Backup */}
            <section className="rsp-card" aria-labelledby="rsp-backup-title">
              <div className="rsp-card-head">
                <div>
                  <span className="rsp-label">Backup</span>
                  <h3 id="rsp-backup-title">Backup and restore</h3>
                </div>
              </div>

              <p className="rsp-backup-text">
                Download your topics and history, or import a previous backup to
                merge it into your library or replace it.
              </p>

              <div className="rsp-backup-actions">
                <button
                  type="button"
                  className="rsp-btn rsp-btn-primary"
                  onClick={handleExport}
                >
                  <Icon name="download" size={15} />
                  Export JSON
                </button>
                <button
                  type="button"
                  className="rsp-btn rsp-btn-light"
                  onClick={handleExportCsv}
                  disabled={topics.length === 0}
                >
                  <Icon name="download" size={15} />
                  Export CSV
                </button>
                <button
                  type="button"
                  className="rsp-btn rsp-btn-light"
                  onClick={() => importInputRef.current?.click()}
                >
                  <Icon name="upload" size={15} />
                  Import
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange={(event) => void handleImportFile(event)}
                />
              </div>

              <p className="rsp-backup-note">Maximum import size: 5 MB.</p>
            </section>
          </div>
        </div>

        <div className="rsp-footer-note">
          <Icon name="info" size={16} />
          <span>
            Your topics and history are saved privately in this browser. They
            are not synced across devices, so export a backup before clearing
            browser data. A running focus session is not saved if you close the
            page.
          </span>
        </div>

        {/* Modals */}
        {editingTopic && (
          <TopicEditorModal
            key={editingTopic.id}
            topic={editingTopic}
            theme={prefs.theme}
            subjects={subjects}
            onSave={saveTopic}
            onClose={() => setEditingId(null)}
          />
        )}

        {bulkOpen && (
          <BulkAddModal
            theme={prefs.theme}
            subjects={subjects}
            existingKeys={existingKeys}
            onAdd={handleBulkAdd}
            onClose={() => setBulkOpen(false)}
          />
        )}

        {pendingImport && (
          <ImportModal
            pending={pendingImport}
            theme={prefs.theme}
            onMerge={() => confirmImport("merge")}
            onReplace={() => confirmImport("replace")}
            onClose={() => setPendingImport(null)}
          />
        )}

        {confirm && (
          <ConfirmDialog
            state={confirm}
            theme={prefs.theme}
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              const run = confirm.onConfirm;

              setConfirm(null);
              run();
            }}
          />
        )}
      </div>

      {/* Toasts render in a portal so no parent transform can break fixed positioning. */}
      {createPortal(
        <div className="rsp rsp-portal" data-theme={prefs.theme}>
          <div className="rsp-toasts">
            {toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
            ))}
          </div>
        </div>,
        document.body
      )}

      <PickerStyles />
    </ToolShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const STYLES = `
.rsp {
  --rsp-accent: #f4511e;
  --rsp-accent-hover: #dc4210;
  --rsp-accent-soft: #fff1ea;
  --rsp-accent-border: #ffd2bf;
  --rsp-on-accent: #ffffff;
  --rsp-ink: #1b1e2b;
  --rsp-muted: #667085;
  --rsp-faint: #98a2b3;
  --rsp-border: #e6e8ef;
  --rsp-border-strong: #d5d8e2;
  --rsp-surface: #ffffff;
  --rsp-surface-2: #f8f9fb;
  --rsp-hover: #f2f4f8;
  --rsp-input: #ffffff;
  --rsp-track: #e9ecf2;
  --rsp-ring: rgba(244, 81, 30, 0.22);
  --rsp-shadow-sm: 0 1px 2px rgba(20, 24, 40, 0.05);
  --rsp-shadow: 0 1px 2px rgba(20, 24, 40, 0.04), 0 8px 24px -12px rgba(20, 24, 40, 0.12);
  --rsp-shadow-lg: 0 30px 80px -20px rgba(15, 18, 32, 0.45);
  --rsp-success: #168a5c;
  --rsp-danger: #d92d3a;
  --rsp-gold: #e29a00;
  color: var(--rsp-ink);
  width: 100%;
  min-width: 0;
  font-size: 14px;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
  -webkit-font-smoothing: antialiased;
}

.rsp[data-theme="dark"] {
  --rsp-accent: #ff6b3d;
  --rsp-accent-hover: #ff8259;
  --rsp-accent-soft: rgba(255, 107, 61, 0.14);
  --rsp-accent-border: rgba(255, 107, 61, 0.38);
  --rsp-on-accent: #1a0d07;
  --rsp-ink: #eceef5;
  --rsp-muted: #9aa3b8;
  --rsp-faint: #6f7992;
  --rsp-border: #262c3f;
  --rsp-border-strong: #343b52;
  --rsp-surface: #151a2a;
  --rsp-surface-2: #1a2033;
  --rsp-hover: #20273c;
  --rsp-input: #0f1424;
  --rsp-track: #2a3148;
  --rsp-ring: rgba(255, 107, 61, 0.3);
  --rsp-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --rsp-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 30px -14px rgba(0, 0, 0, 0.6);
  --rsp-success: #4cd39a;
  --rsp-danger: #ff7a82;
  --rsp-gold: #f5b92e;
  background: #0d1120;
  padding: 22px;
  border-radius: 22px;
  color-scheme: dark;
}

.rsp *,
.rsp *::before,
.rsp *::after {
  box-sizing: border-box;
}

.rsp button,
.rsp input,
.rsp select,
.rsp textarea {
  font-family: inherit;
}

.rsp button:focus-visible,
.rsp a:focus-visible,
.rsp summary:focus-visible,
.rsp-modal:focus-visible,
.rsp-import-options button:focus-visible {
  outline: 2px solid var(--rsp-accent);
  outline-offset: 2px;
}

.rsp.rsp-portal,
.rsp.rsp-portal[data-theme="dark"] {
  display: block;
  position: static;
  width: 0;
  height: 0;
  padding: 0;
  gap: 0;
  background: transparent;
  border-radius: 0;
}

.rsp kbd {
  display: inline-block;
  min-width: 20px;
  padding: 1px 6px;
  border: 1px solid var(--rsp-border-strong);
  border-bottom-width: 2px;
  border-radius: 6px;
  background: var(--rsp-surface);
  color: var(--rsp-ink);
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.rsp-loading {
  min-height: 320px;
  align-items: center;
  justify-content: center;
  color: #737b89;
}

.rsp-spinner {
  width: 34px;
  height: 34px;
  border: 3px solid #ffe0d5;
  border-top-color: #f4511e;
  border-radius: 50%;
  animation: rsp-spin 0.8s linear infinite;
}

@keyframes rsp-spin {
  to { transform: rotate(360deg); }
}

@keyframes rsp-pop {
  from { opacity: 0; transform: translateY(6px) scale(0.985); }
  to { opacity: 1; transform: none; }
}

@keyframes rsp-reveal {
  0% { opacity: 0; transform: translateY(10px) scale(0.97); }
  60% { opacity: 1; transform: translateY(-2px) scale(1.01); }
  100% { opacity: 1; transform: none; }
}

@keyframes rsp-flicker {
  0%, 100% { opacity: 1; transform: translateY(0); }
  50% { opacity: 0.45; transform: translateY(-3px); }
}

@keyframes rsp-halo {
  0% { box-shadow: 0 0 0 0 var(--rsp-ring); }
  100% { box-shadow: 0 0 0 18px rgba(244, 81, 30, 0); }
}

/* Hero */

.rsp-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 30px 32px;
  border: 1px solid var(--rsp-border);
  border-radius: 22px;
  background: var(--rsp-surface);
  box-shadow: var(--rsp-shadow);
  position: relative;
  overflow: hidden;
}

.rsp-hero::before {
  content: "";
  position: absolute;
  left: 0;
  top: 22px;
  bottom: 22px;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: var(--rsp-accent);
}

.rsp-hero-copy {
  min-width: 0;
}

.rsp-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--rsp-accent);
  font-size: 13px;
  font-weight: 700;
}

.rsp-hero h2 {
  margin: 10px 0 10px;
  font-size: clamp(26px, 4vw, 38px);
  line-height: 1.1;
  letter-spacing: -0.035em;
  font-weight: 800;
  color: var(--rsp-ink);
}

.rsp-hero p {
  max-width: 600px;
  margin: 0;
  color: var(--rsp-muted);
  font-size: 15px;
  line-height: 1.65;
}

.rsp-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 18px;
  color: var(--rsp-muted);
  font-size: 12px;
}

.rsp-shortcuts span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.rsp-hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* Buttons */

.rsp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 11px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
  transition: background-color 0.18s ease, border-color 0.18s ease,
    color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.rsp-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.rsp-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.rsp-btn-primary {
  background: var(--rsp-accent);
  color: var(--rsp-on-accent);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.25) inset, 0 6px 16px -6px rgba(244, 81, 30, 0.55);
}

.rsp-btn-primary:hover:not(:disabled) {
  background: var(--rsp-accent-hover);
}

.rsp-btn-light {
  background: var(--rsp-surface);
  border-color: var(--rsp-border-strong);
  color: var(--rsp-ink);
  box-shadow: var(--rsp-shadow-sm);
}

.rsp-btn-light:hover:not(:disabled) {
  border-color: var(--rsp-accent-border);
  background: var(--rsp-accent-soft);
}

.rsp-btn-ghost {
  min-height: 34px;
  padding: 0 12px;
  background: transparent;
  color: var(--rsp-muted);
}

.rsp-btn-ghost:hover:not(:disabled) {
  background: var(--rsp-hover);
  color: var(--rsp-ink);
}

.rsp-btn-danger {
  background: var(--rsp-danger);
  color: #fff;
  box-shadow: 0 6px 16px -6px rgba(217, 45, 58, 0.55);
}

.rsp-btn-danger:hover:not(:disabled) {
  filter: brightness(0.92);
}

.rsp-btn-danger-light {
  min-height: 34px;
  background: transparent;
  border-color: rgba(217, 45, 58, 0.35);
  color: var(--rsp-danger);
}

.rsp-btn-danger-light:hover:not(:disabled) {
  background: rgba(217, 45, 58, 0.08);
}

.rsp-btn-success {
  background: rgba(22, 138, 92, 0.12);
  border-color: rgba(22, 138, 92, 0.4);
  color: var(--rsp-success);
}

.rsp-icon-btn {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 1px solid var(--rsp-border-strong);
  border-radius: 10px;
  background: var(--rsp-surface);
  color: var(--rsp-muted);
  cursor: pointer;
  box-shadow: var(--rsp-shadow-sm);
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.rsp-icon-btn:hover {
  background: var(--rsp-hover);
  color: var(--rsp-ink);
}

.rsp-icon-btn.fav {
  color: var(--rsp-gold);
  border-color: rgba(226, 154, 0, 0.5);
}

.rsp-icon-btn.danger {
  color: var(--rsp-danger);
}

.rsp-icon-btn.danger:hover {
  background: rgba(217, 45, 58, 0.1);
  border-color: rgba(217, 45, 58, 0.4);
}

.rsp-theme-btn {
  width: 40px;
  height: 40px;
  border-radius: 11px;
}

.rsp-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--rsp-accent);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.rsp-link:disabled {
  opacity: 0.4;
  cursor: default;
  text-decoration: none;
}

/* Stats */

.rsp-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.rsp-stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--rsp-border);
  border-radius: 16px;
  background: var(--rsp-surface);
  box-shadow: var(--rsp-shadow);
}

.rsp-stat.hot {
  border-color: var(--rsp-accent-border);
  background: var(--rsp-accent-soft);
}

.rsp-stat-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  margin-bottom: 10px;
  border-radius: 10px;
  background: var(--rsp-accent-soft);
  color: var(--rsp-accent);
}

.rsp-stat.hot .rsp-stat-icon {
  background: var(--rsp-accent);
  color: var(--rsp-on-accent);
}

.rsp-stat strong {
  font-size: 25px;
  line-height: 1.15;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.rsp-stat > span {
  font-size: 13px;
  font-weight: 650;
}

.rsp-stat small {
  color: var(--rsp-muted);
  font-size: 12px;
  line-height: 1.4;
}

/* Layout */

.rsp-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;
}

.rsp-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.rsp-card {
  min-width: 0;
  padding: 24px;
  border: 1px solid var(--rsp-border);
  border-radius: 20px;
  background: var(--rsp-surface);
  box-shadow: var(--rsp-shadow);
}

.rsp-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 20px;
}

.rsp-card-head h3 {
  margin: 2px 0 0;
  font-size: 18px;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.rsp-label {
  display: block;
  color: var(--rsp-muted);
  font-size: 12px;
  font-weight: 650;
}

.rsp-muted {
  color: var(--rsp-muted);
  font-size: 12px;
}

/* Picker: the one memorable surface */

.rsp-picker {
  min-width: 0;
  padding: 26px;
  border: 1px solid var(--rsp-accent-border);
  border-radius: 24px;
  background: var(--rsp-surface);
  box-shadow: 0 0 0 5px var(--rsp-accent-soft), var(--rsp-shadow);
}

.rsp-picker-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.rsp-picker-head h3 {
  margin: 2px 0 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.025em;
}

.rsp-pool-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--rsp-accent-soft);
  color: var(--rsp-accent);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.rsp-mode p {
  margin: 10px 0 0;
  color: var(--rsp-muted);
  font-size: 13px;
  line-height: 1.6;
}

.rsp-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 210px;
  margin: 22px 0;
  padding: 28px 24px;
  border: 1.5px dashed var(--rsp-accent-border);
  border-radius: 18px;
  background: var(--rsp-surface-2);
  text-align: center;
}

.rsp-result.has-topic {
  border-style: solid;
  border-color: var(--rsp-accent);
  background: var(--rsp-surface);
  animation: rsp-reveal 0.45s cubic-bezier(0.2, 0.8, 0.2, 1), rsp-halo 0.9s ease-out;
}

.rsp-result.shuffling .rsp-result-title {
  animation: rsp-flicker 0.3s ease infinite;
  color: var(--rsp-muted);
}

.rsp-result-label {
  color: var(--rsp-accent);
  font-size: 13px;
  font-weight: 700;
}

.rsp-result-title {
  max-width: 100%;
  margin: 12px 0 14px;
  overflow-wrap: anywhere;
  font-size: clamp(24px, 4.4vw, 36px);
  line-height: 1.15;
  letter-spacing: -0.035em;
  font-weight: 800;
  color: var(--rsp-ink);
}

.rsp-result-meta {
  margin: 14px 0 0;
  color: var(--rsp-muted);
  font-size: 13px;
}

.rsp-result-notes {
  max-width: 520px;
  margin: 14px 0 0;
  color: var(--rsp-muted);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.rsp-picker-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.rsp-pick-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 28px;
  border: 0;
  border-radius: 14px;
  background: var(--rsp-accent);
  color: var(--rsp-on-accent);
  cursor: pointer;
  font-size: 15px;
  font-weight: 750;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.25) inset, 0 12px 28px -10px rgba(244, 81, 30, 0.7);
  transition: background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.rsp-pick-button:hover:not(:disabled) {
  background: var(--rsp-accent-hover);
  transform: translateY(-1px);
}

.rsp-pick-button:active:not(:disabled) {
  transform: translateY(1px);
}

.rsp-pick-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rsp-pick-hint {
  margin: 14px 0 0;
  color: var(--rsp-muted);
  font-size: 13px;
  text-align: center;
}

.rsp-quick-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rsp-picker-settings {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 32px;
  margin-top: 22px;
  padding-top: 12px;
  border-top: 1px solid var(--rsp-border);
}

/* Focus */

.rsp-focus {
  margin-top: 22px;
  padding: 18px;
  border: 1px solid var(--rsp-border);
  border-radius: 16px;
  background: var(--rsp-surface-2);
}

.rsp-focus-head {
  display: flex;
  align-items: center;
  gap: 18px;
}

.rsp-focus-intro {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 14px;
}

.rsp-focus-intro strong {
  font-size: 15px;
}

.rsp-ring {
  position: relative;
  display: grid;
  place-items: center;
  width: 104px;
  height: 104px;
  flex-shrink: 0;
}

.rsp-ring svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.rsp-ring circle {
  fill: none;
  stroke-width: 7;
}

.rsp-ring-bg {
  stroke: var(--rsp-track);
}

.rsp-ring-fg {
  stroke: var(--rsp-accent);
  stroke-linecap: round;
  transition: stroke-dashoffset 0.3s linear;
}

.rsp-clock {
  position: relative;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: var(--rsp-ink);
}

.rsp-clock.live {
  color: var(--rsp-accent);
}

.rsp-focus-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.rsp-focus-info strong {
  font-size: 16px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.rsp-focus-info small {
  color: var(--rsp-muted);
  font-size: 12px;
}

.rsp-progress {
  height: 8px;
  border-radius: 999px;
  background: var(--rsp-track);
  overflow: hidden;
}

.rsp-progress.thin {
  height: 6px;
}

.rsp-progress > div {
  height: 100%;
  border-radius: inherit;
  background: var(--rsp-accent);
  transition: width 0.3s ease;
}

.rsp-focus-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.rsp-focus-setup {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rsp-presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.rsp-presets > button {
  padding: 8px 13px;
  border: 1px solid var(--rsp-border-strong);
  border-radius: 999px;
  background: var(--rsp-surface);
  color: var(--rsp-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.18s ease;
}

.rsp-presets > button:hover,
.rsp-presets > button.active {
  border-color: var(--rsp-accent);
  background: var(--rsp-accent-soft);
  color: var(--rsp-accent);
}

.rsp-custom-minutes {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid var(--rsp-border-strong);
  border-radius: 999px;
  background: var(--rsp-input);
  color: var(--rsp-muted);
  font-size: 12px;
}

.rsp-custom-minutes input {
  width: 46px;
  padding: 8px 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--rsp-ink);
  font-size: 13px;
  font-weight: 700;
}

/* Forms */

.rsp-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.rsp-field > span {
  color: var(--rsp-ink);
  font-size: 13px;
  font-weight: 650;
}

.rsp-field input,
.rsp-field select,
.rsp-field textarea,
.rsp-filters select,
.rsp-search input {
  min-width: 0;
  color: var(--rsp-ink);
  font-size: 14px;
}

.rsp-field input,
.rsp-field select,
.rsp-field textarea {
  width: 100%;
  padding: 0 13px;
  height: 44px;
  border: 1px solid var(--rsp-border-strong);
  border-radius: 11px;
  outline: none;
  background: var(--rsp-input);
  transition: border-color 0.18s, box-shadow 0.18s;
}

.rsp-field textarea {
  height: auto;
  padding: 12px 13px;
  line-height: 1.6;
  resize: vertical;
}

.rsp-field input:focus,
.rsp-field select:focus,
.rsp-field textarea:focus,
.rsp-filters select:focus,
.rsp-custom-minutes:focus-within {
  border-color: var(--rsp-accent);
  box-shadow: 0 0 0 3px var(--rsp-ring);
}

.rsp-field input::placeholder,
.rsp-field textarea::placeholder,
.rsp-search input::placeholder {
  color: var(--rsp-faint);
}

.rsp select option {
  background: var(--rsp-surface);
  color: var(--rsp-ink);
}

.rsp-add-form {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.1fr) minmax(0, 1fr) auto;
  align-items: end;
  gap: 12px;
}

.rsp-add-form .rsp-btn {
  height: 44px;
}

.rsp-row-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

/* Segmented */

.rsp-seg {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--rsp-border);
  border-radius: 12px;
  background: var(--rsp-surface-2);
  max-width: 100%;
}

.rsp-seg button {
  padding: 8px 14px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--rsp-muted);
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition: 0.18s ease;
}

.rsp-seg button:hover {
  color: var(--rsp-ink);
}

.rsp-seg button.active {
  background: var(--rsp-surface);
  color: var(--rsp-accent);
  box-shadow: 0 1px 2px rgba(20, 24, 40, 0.12), 0 0 0 1px var(--rsp-border);
}

/* Switch */

.rsp-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 0;
  cursor: pointer;
}

.rsp-switch-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rsp-switch-text strong {
  font-size: 13px;
  font-weight: 650;
  color: var(--rsp-ink);
}

.rsp-switch-text small {
  color: var(--rsp-muted);
  font-size: 12px;
  line-height: 1.5;
}

.rsp-switch {
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 26px;
}

.rsp-switch input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.rsp-switch-track {
  position: absolute;
  inset: 0;
  border: 1px solid var(--rsp-border-strong);
  border-radius: 26px;
  background: var(--rsp-track);
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.rsp-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s cubic-bezier(0.3, 0.7, 0.3, 1);
}

.rsp-switch input:checked + .rsp-switch-track {
  background: var(--rsp-accent);
  border-color: var(--rsp-accent);
}

.rsp-switch input:checked + .rsp-switch-track .rsp-switch-thumb {
  transform: translateX(18px);
}

.rsp-switch input:focus-visible + .rsp-switch-track {
  box-shadow: 0 0 0 3px var(--rsp-ring);
}

/* Filters */

.rsp-filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.rsp-search {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 13px;
  border: 1px solid var(--rsp-border-strong);
  border-radius: 11px;
  background: var(--rsp-input);
  color: var(--rsp-muted);
}

.rsp-search:focus-within {
  border-color: var(--rsp-accent);
  box-shadow: 0 0 0 3px var(--rsp-ring);
}

.rsp-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
}

.rsp-filters select {
  width: 100%;
  height: 42px;
  padding: 0 10px;
  border: 1px solid var(--rsp-border-strong);
  border-radius: 11px;
  outline: none;
  background: var(--rsp-input);
  font-size: 13px;
}

.rsp-switches {
  margin-top: 14px;
  padding: 2px 0;
  border-top: 1px solid var(--rsp-border);
  border-bottom: 1px solid var(--rsp-border);
}

.rsp-switches .rsp-switch-row + .rsp-switch-row {
  border-top: 1px solid var(--rsp-border);
}

.rsp-filter-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 12px 0 18px;
  color: var(--rsp-muted);
  font-size: 12px;
}

/* Topic list */

.rsp-topic-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rsp-topic {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--rsp-border);
  border-radius: 16px;
  background: var(--rsp-surface);
  transition: border-color 0.18s, box-shadow 0.18s;
}

.rsp-topic:hover {
  border-color: var(--rsp-border-strong);
  box-shadow: var(--rsp-shadow);
}

.rsp-topic.selected {
  border-color: var(--rsp-accent);
  box-shadow: 0 0 0 3px var(--rsp-ring);
}

.rsp-check {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  margin-top: 1px;
  border: 1.5px solid var(--rsp-border-strong);
  border-radius: 50%;
  background: transparent;
  color: transparent;
  cursor: pointer;
  transition: 0.18s ease;
}

.rsp-check:hover {
  border-color: var(--rsp-success);
  color: var(--rsp-success);
}

.rsp-topic.mastered .rsp-check {
  border-color: var(--rsp-success);
  background: var(--rsp-success);
  color: #fff;
}

.rsp-topic.mastered h4 {
  color: var(--rsp-muted);
}

.rsp-topic-body {
  flex: 1;
  min-width: 0;
}

.rsp-topic-title {
  display: flex;
  align-items: center;
  gap: 7px;
}

.rsp-topic-title h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.rsp-fav-mark {
  display: inline-grid;
  color: var(--rsp-gold);
}

.rsp-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}

.rsp-chips.center {
  justify-content: center;
  margin-top: 0;
}

.rsp-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--rsp-track);
  color: var(--rsp-muted);
  font-size: 11px;
  font-weight: 650;
}

.rsp-chip.rsp-ghost {
  background: transparent;
  border: 1px solid var(--rsp-border-strong);
}

.rsp-d-beginner {
  background: rgba(22, 138, 92, 0.12);
  color: #137a52;
}

.rsp-d-intermediate {
  background: rgba(226, 154, 0, 0.15);
  color: #92600a;
}

.rsp-d-advanced {
  background: rgba(217, 45, 58, 0.12);
  color: #b3202c;
}

.rsp-s-new {
  background: rgba(88, 101, 242, 0.12);
  color: #4452d6;
}

.rsp-s-learning {
  background: rgba(244, 81, 30, 0.12);
  color: #c2410c;
}

.rsp-s-mastered {
  background: rgba(22, 138, 92, 0.14);
  color: #137a52;
}

.rsp-p-high {
  background: rgba(217, 45, 58, 0.12);
  color: #b3202c;
}

.rsp-p-low {
  background: var(--rsp-track);
  color: var(--rsp-muted);
}

.rsp[data-theme="dark"] .rsp-d-beginner,
.rsp[data-theme="dark"] .rsp-s-mastered {
  background: rgba(76, 211, 154, 0.14);
  color: #6fe0b0;
}

.rsp[data-theme="dark"] .rsp-d-intermediate {
  background: rgba(245, 185, 46, 0.14);
  color: #f5c96b;
}

.rsp[data-theme="dark"] .rsp-d-advanced,
.rsp[data-theme="dark"] .rsp-p-high {
  background: rgba(255, 122, 130, 0.14);
  color: #ff9aa0;
}

.rsp[data-theme="dark"] .rsp-s-new {
  background: rgba(154, 167, 255, 0.14);
  color: #aab5ff;
}

.rsp[data-theme="dark"] .rsp-s-learning {
  background: rgba(255, 107, 61, 0.16);
  color: #ffa27d;
}

.rsp-topic-notes {
  margin: 10px 0 0;
  color: var(--rsp-muted);
  font-size: 13px;
  line-height: 1.55;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rsp-topic-meta {
  margin: 10px 0 0;
  color: var(--rsp-faint);
  font-size: 11px;
  line-height: 1.5;
}

.rsp-topic-actions {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
}

.rsp-more {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

/* Empty */

.rsp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
  border: 1.5px dashed var(--rsp-border-strong);
  border-radius: 16px;
  background: var(--rsp-surface-2);
  text-align: center;
}

.rsp-empty.small {
  padding: 26px 16px;
}

.rsp-empty-icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  margin-bottom: 12px;
  border-radius: 16px;
  background: var(--rsp-accent-soft);
  color: var(--rsp-accent);
}

.rsp-empty h4 {
  margin: 0 0 5px;
  font-size: 15px;
}

.rsp-empty p {
  max-width: 380px;
  margin: 0;
  color: var(--rsp-muted);
  font-size: 13px;
  line-height: 1.6;
}

/* Insights */

.rsp-insight + .rsp-insight {
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid var(--rsp-border);
}

.rsp-insight-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 13px;
}

.rsp-insight-top span {
  color: var(--rsp-muted);
  font-size: 12px;
}

.rsp-subject-bars {
  display: grid;
  gap: 13px;
}

.rsp-subject-bar > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}

.rsp-subject-bar span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rsp-subject-bar em {
  color: var(--rsp-muted);
  font-style: normal;
  font-variant-numeric: tabular-nums;
}

.rsp-week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  height: 124px;
  align-items: end;
}

.rsp-week-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  height: 100%;
}

.rsp-week-col strong {
  min-height: 14px;
  color: var(--rsp-muted);
  font-size: 11px;
}

.rsp-week-track {
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 72px;
  border-radius: 8px;
  background: var(--rsp-surface-2);
  overflow: hidden;
}

.rsp-week-track > div {
  width: 100%;
  border-radius: 6px 6px 0 0;
  background: var(--rsp-accent);
  transition: height 0.3s;
}

.rsp-week-col span {
  color: var(--rsp-muted);
  font-size: 11px;
}

.rsp-mix {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.rsp-mix-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 8px;
  border-radius: 12px;
  text-align: center;
}

.rsp-mix-item strong {
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.rsp-mix-item span {
  font-size: 11px;
  font-weight: 650;
}

/* History */

.rsp-history-list {
  display: flex;
  flex-direction: column;
}

.rsp-history-item {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 4px 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--rsp-border);
}

.rsp-history-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: var(--rsp-accent-soft);
  color: var(--rsp-accent);
}

.rsp-history-icon.study {
  background: rgba(22, 138, 92, 0.14);
  color: var(--rsp-success);
}

.rsp-history-item > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rsp-history-item strong {
  font-size: 13px;
  overflow-wrap: anywhere;
}

.rsp-history-item > div > span {
  color: var(--rsp-muted);
  font-size: 11px;
}

.rsp-history-item time {
  grid-column: 2;
  color: var(--rsp-faint);
  font-size: 11px;
}

.rsp-history-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 16px;
  color: var(--rsp-muted);
  font-size: 12px;
}

/* Backup */

.rsp-backup-text {
  margin: -6px 0 16px;
  color: var(--rsp-muted);
  font-size: 13px;
  line-height: 1.7;
}

.rsp-backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rsp-backup-note {
  margin: 12px 0 0;
  color: var(--rsp-faint);
  font-size: 11px;
}

.rsp-footer-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 18px;
  border: 1px solid var(--rsp-border);
  border-radius: 14px;
  background: var(--rsp-surface-2);
  color: var(--rsp-muted);
  font-size: 12px;
  line-height: 1.65;
}

.rsp-footer-note svg {
  flex-shrink: 0;
  margin-top: 2px;
}

/* Toasts */

.rsp-toasts {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 10100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(92vw, 440px);
  transform: translateX(-50%);
  pointer-events: none;
}

.rsp-toast {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 13px;
  border-radius: 14px;
  background: #1a1f2e;
  color: #f2f4f8;
  font-size: 13px;
  box-shadow: 0 18px 44px -12px rgba(0, 0, 0, 0.45);
  pointer-events: auto;
  animation: rsp-pop 0.2s ease;
}

.rsp-toast-icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
}

.rsp-toast.success .rsp-toast-icon {
  background: rgba(76, 211, 154, 0.22);
  color: #6fe0b0;
}

.rsp-toast.error .rsp-toast-icon {
  background: rgba(255, 122, 130, 0.22);
  color: #ff9aa0;
}

.rsp-toast.info .rsp-toast-icon {
  background: rgba(154, 167, 255, 0.22);
  color: #aab5ff;
}

.rsp-toast-message {
  flex: 1;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.rsp-toast-close {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  padding: 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #9aa3b5;
  cursor: pointer;
}

.rsp-toast-close:hover {
  color: #fff;
}

/* Modals */

.rsp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  overflow: auto;
  overscroll-behavior: contain;
  background: rgba(12, 15, 26, 0.6);
  backdrop-filter: blur(5px);
}

.rsp-modal {
  display: flex;
  flex-direction: column;
  width: min(100%, 580px);
  max-height: min(92vh, 860px);
  border: 1px solid var(--rsp-border);
  border-radius: 22px;
  background: var(--rsp-surface);
  color: var(--rsp-ink);
  overflow: hidden;
  box-shadow: var(--rsp-shadow-lg);
  animation: rsp-pop 0.2s ease;
}

.rsp-modal:focus {
  outline: none;
}

.rsp-modal.sm {
  width: min(100%, 420px);
}

.rsp-modal.lg {
  width: min(100%, 680px);
}

.rsp-modal form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.rsp-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--rsp-border);
  flex-shrink: 0;
}

.rsp-modal-head h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.rsp-modal-head p {
  margin: 5px 0 0;
  color: var(--rsp-muted);
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.rsp-modal-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px 24px;
  overflow-y: auto;
  overscroll-behavior: contain;
  min-height: 0;
}

.rsp-modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--rsp-border);
  background: var(--rsp-surface-2);
  flex-shrink: 0;
}

.rsp-inline-error {
  padding: 11px 13px;
  border: 1px solid rgba(217, 45, 58, 0.35);
  border-radius: 11px;
  background: rgba(217, 45, 58, 0.08);
  color: var(--rsp-danger);
  font-size: 13px;
}

.rsp-confirm {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 26px 24px;
  text-align: center;
}

.rsp-confirm-icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  margin-bottom: 16px;
  border-radius: 18px;
}

.rsp-confirm-icon.danger {
  background: rgba(217, 45, 58, 0.12);
  color: var(--rsp-danger);
}

.rsp-confirm-icon.primary {
  background: var(--rsp-accent-soft);
  color: var(--rsp-accent);
}

.rsp-confirm h3 {
  margin: 0 0 8px;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.rsp-confirm p {
  margin: 0 0 24px;
  color: var(--rsp-muted);
  font-size: 14px;
  line-height: 1.65;
}

.rsp-confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: 100%;
}

.rsp-bulk-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  color: var(--rsp-muted);
  font-size: 13px;
}

.rsp-bulk-summary strong {
  color: var(--rsp-ink);
}

.rsp-bulk-summary .ok strong {
  color: var(--rsp-success);
}

.rsp-bulk-summary .warn strong {
  color: var(--rsp-danger);
}

.rsp-bulk-preview {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--rsp-border);
  border-radius: 13px;
  overflow: hidden;
}

.rsp-bulk-preview li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 14px;
  font-size: 13px;
}

.rsp-bulk-preview li + li {
  border-top: 1px solid var(--rsp-border);
}

.rsp-bulk-preview li span {
  color: var(--rsp-muted);
  font-size: 12px;
}

.rsp-bulk-preview li.more {
  justify-content: center;
  color: var(--rsp-muted);
  background: var(--rsp-surface-2);
}

.rsp-import-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.rsp-import-stats > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  border: 1px solid var(--rsp-border);
  border-radius: 13px;
  background: var(--rsp-surface-2);
  text-align: center;
}

.rsp-import-stats strong {
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}

.rsp-import-stats span {
  color: var(--rsp-muted);
  font-size: 11px;
}

.rsp-import-options {
  display: grid;
  gap: 10px;
}

.rsp-import-options button {
  display: grid;
  gap: 5px;
  padding: 16px;
  border: 1px solid var(--rsp-border-strong);
  border-radius: 14px;
  background: var(--rsp-surface);
  color: var(--rsp-ink);
  text-align: left;
  cursor: pointer;
  transition: 0.18s ease;
}

.rsp-import-options button:hover {
  border-color: var(--rsp-accent);
  background: var(--rsp-accent-soft);
}

.rsp-import-options button.danger:hover {
  border-color: var(--rsp-danger);
  background: rgba(217, 45, 58, 0.07);
}

.rsp-import-options strong {
  font-size: 14px;
}

.rsp-import-options span {
  color: var(--rsp-muted);
  font-size: 12px;
  line-height: 1.55;
}

/* Responsive */

@media (max-width: 1180px) {
  .rsp-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .rsp-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .rsp-add-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rsp-add-form .rsp-grow {
    grid-column: 1 / -1;
  }

  .rsp-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rsp-picker-settings {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .rsp[data-theme="dark"] {
    padding: 14px;
    border-radius: 16px;
  }

  .rsp {
    gap: 14px;
  }

  .rsp-col {
    gap: 14px;
  }

  .rsp-hero {
    flex-direction: column;
    padding: 22px 20px;
  }

  .rsp-hero-actions {
    width: 100%;
  }

  .rsp-hero-actions .rsp-btn {
    flex: 1;
  }

  .rsp-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .rsp-stat {
    padding: 14px;
  }

  .rsp-stat strong {
    font-size: 21px;
  }

  .rsp-card,
  .rsp-picker {
    padding: 18px;
  }

  .rsp-add-form {
    grid-template-columns: 1fr;
  }

  .rsp-add-form .rsp-btn {
    width: 100%;
  }

  .rsp-topic {
    flex-wrap: wrap;
  }

  .rsp-topic-body {
    flex-basis: calc(100% - 46px);
  }

  .rsp-topic-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .rsp-picker-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .rsp-pick-button {
    width: 100%;
  }

  .rsp-quick-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .rsp-focus-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .rsp-focus-setup .rsp-btn {
    width: 100%;
  }

  .rsp-row-2 {
    grid-template-columns: 1fr;
  }

  .rsp-modal-head,
  .rsp-modal-body,
  .rsp-modal-foot {
    padding-left: 18px;
    padding-right: 18px;
  }

  .rsp-import-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 420px) {
  .rsp-filters {
    grid-template-columns: 1fr;
  }

  .rsp-stats {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rsp *,
  .rsp-modal,
  .rsp-toast {
    animation: none !important;
    transition: none !important;
  }
}
`;

/* Plain <style> with dangerouslySetInnerHTML keeps ">" selectors intact and
   works without any styled-jsx registry. */
function PickerStyles() {
  return <style dangerouslySetInnerHTML={{ __html: STYLES }} />;
}