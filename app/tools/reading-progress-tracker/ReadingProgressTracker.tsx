"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import ToolShell from "../ToolShell";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ReadingStatus =
  | "want-to-read"
  | "currently-reading"
  | "on-hold"
  | "completed";

type BookFormat = "paperback" | "hardcover" | "ebook" | "audiobook";
type NoteKind = "note" | "quote" | "idea";
type ThemeMode = "light" | "dark";
type ViewMode = "grid" | "list";
type TabKey = "library" | "sessions" | "notes" | "insights";

type ReadingSession = {
  id: string;
  date: string;
  pages: number;
  minutes: number;
  note: string;
};

type BookNote = {
  id: string;
  page: number;
  text: string;
  kind: NoteKind;
  createdAt: string;
};

type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  format: BookFormat;
  tags: string[];
  totalPages: number;
  currentPage: number;
  status: ReadingStatus;
  rating: number;
  favorite: boolean;
  review: string;
  targetDate: string;
  coverUrl: string;
  description: string;
  startedAt: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  sessions: ReadingSession[];
  notes: BookNote[];
};

type ReadingData = {
  version: 2;
  dailyGoal: number;
  yearlyGoal: number;
  theme: ThemeMode;
  view: ViewMode;
  books: Book[];
};

type BookForm = {
  title: string;
  author: string;
  category: string;
  format: BookFormat;
  tags: string;
  totalPages: string;
  currentPage: string;
  status: ReadingStatus;
  rating: number;
  targetDate: string;
  coverUrl: string;
  description: string;
};

type SessionForm = {
  date: string;
  pages: string;
  minutes: string;
  note: string;
};

type TimerState = {
  bookId: string;
  running: boolean;
  startedAt: number | null;
  elapsedMs: number;
} | null;

type OnlineResult = {
  key: string;
  title: string;
  author: string;
  pages: number;
  coverUrl: string;
  category: string;
  year: number;
};

type ToastState = {
  id: string;
  message: string;
  action?: { label: string; run: () => void };
} | null;

type PendingImport = {
  fileName: string;
  data: ReadingData;
};

type Estimate = {
  days: number;
  date: string;
  pace: number;
  personal: boolean;
};

const STORAGE_KEY = "toolsab-reading-progress-tracker-v1";
const TIMER_KEY = "toolsab-reading-progress-timer-v1";

const CATEGORIES = [
  "Fiction",
  "Non-fiction",
  "Fantasy",
  "Science Fiction",
  "Mystery",
  "Romance",
  "Biography",
  "Business",
  "Self-help",
  "Science",
  "History",
  "Technology",
  "Education",
  "Other",
];

const STATUSES: { value: ReadingStatus; label: string }[] = [
  { value: "want-to-read", label: "Want to Read" },
  { value: "currently-reading", label: "Currently Reading" },
  { value: "on-hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
];

const FORMATS: { value: BookFormat; label: string }[] = [
  { value: "paperback", label: "Paperback" },
  { value: "hardcover", label: "Hardcover" },
  { value: "ebook", label: "E-book" },
  { value: "audiobook", label: "Audiobook" },
];

const NOTE_KINDS: { value: NoteKind; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "quote", label: "Quote" },
  { value: "idea", label: "Idea" },
];

const CHART_COLORS = [
  "#ff5a1f",
  "#6d7cff",
  "#27b07a",
  "#f2a900",
  "#c25bd6",
  "#2fb4d6",
  "#9aa3b5",
];

const MINUTE_PRESETS = [15, 30, 45, 60, 90];

const EMPTY_BOOK_FORM: BookForm = {
  title: "",
  author: "",
  category: "Fiction",
  format: "paperback",
  tags: "",
  totalPages: "",
  currentPage: "0",
  status: "want-to-read",
  rating: 0,
  targetDate: "",
  coverUrl: "",
  description: "",
};

const EMPTY_SESSION_FORM: SessionForm = {
  date: "",
  pages: "",
  minutes: "",
  note: "",
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function todayString() {
  return dateKey(new Date());
}

function parseDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(value: string, amount: number) {
  const [y, m, d] = value.split("-").map(Number);
  return dateKey(new Date(y, (m || 1) - 1, (d || 1) + amount));
}

function dayNumber(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
}

function daysBetween(from: string, to: string) {
  return dayNumber(to) - dayNumber(from);
}

function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dateLabel(date: string) {
  if (!date) return "Not set";

  const parsed = parseDate(date);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortDateLabel(date: string) {
  const parsed = parseDate(date);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatMinutes(minutes: number) {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remaining = rounded % 60;

  if (hours === 0) return `${remaining} min`;
  if (remaining === 0) return `${hours} hr`;

  return `${hours} hr ${remaining} min`;
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getProgress(book: Book) {
  if (book.totalPages <= 0) return 0;

  return Math.round(
    (clamp(book.currentPage, 0, book.totalPages) / book.totalPages) * 100
  );
}

function statusLabel(status: ReadingStatus) {
  return STATUSES.find((item) => item.value === status)?.label ?? status;
}

function formatLabel(format: BookFormat) {
  return FORMATS.find((item) => item.value === format)?.label ?? format;
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 5) return "Reading late tonight";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

function parseTags(value: string) {
  const seen = new Set<string>();
  const result: string[] = [];

  value
    .split(",")
    .map((tag) => tag.trim().slice(0, 24))
    .forEach((tag) => {
      const key = tag.toLowerCase();

      if (tag && !seen.has(key) && result.length < 10) {
        seen.add(key);
        result.push(tag);
      }
    });

  return result;
}

function mapCategory(subjects: string[]) {
  const text = subjects.join(" ").toLowerCase();

  const rules: [string, string[]][] = [
    ["Science Fiction", ["science fiction", "sci-fi"]],
    ["Fantasy", ["fantasy", "magic"]],
    ["Mystery", ["mystery", "detective", "thriller", "crime"]],
    ["Romance", ["romance", "love stories"]],
    ["Biography", ["biography", "autobiography", "memoir"]],
    [
      "Business",
      ["business", "economics", "entrepreneur", "finance", "management"],
    ],
    [
      "Self-help",
      ["self-help", "self help", "habits", "personal development", "motivation"],
    ],
    [
      "Science",
      ["science", "physics", "biology", "chemistry", "mathematics", "psychology"],
    ],
    ["History", ["history"]],
    ["Technology", ["computer", "programming", "software", "technology"]],
    ["Education", ["education", "teaching"]],
    ["Fiction", ["fiction", "novel"]],
  ];

  for (const [category, words] of rules) {
    if (words.some((word) => text.includes(word))) return category;
  }

  return "Other";
}

function normalizeBook(value: unknown): Book | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Partial<Book>;

  if (typeof item.title !== "string" || !item.title.trim()) return null;

  const totalPages = Math.max(1, Math.floor(Number(item.totalPages) || 1));
  const currentPage = clamp(
    Math.floor(Number(item.currentPage) || 0),
    0,
    totalPages
  );

  const validStatuses: ReadingStatus[] = [
    "want-to-read",
    "currently-reading",
    "on-hold",
    "completed",
  ];

  const status = validStatuses.includes(item.status as ReadingStatus)
    ? (item.status as ReadingStatus)
    : "want-to-read";

  const validFormats: BookFormat[] = [
    "paperback",
    "hardcover",
    "ebook",
    "audiobook",
  ];

  const format = validFormats.includes(item.format as BookFormat)
    ? (item.format as BookFormat)
    : "paperback";

  const sessions = Array.isArray(item.sessions)
    ? item.sessions
        .filter(
          (session): session is ReadingSession =>
            !!session &&
            typeof session.id === "string" &&
            typeof session.date === "string"
        )
        .map((session) => ({
          id: session.id,
          date: session.date,
          pages: Math.max(0, Math.floor(Number(session.pages) || 0)),
          minutes: Math.max(0, Math.floor(Number(session.minutes) || 0)),
          note: typeof session.note === "string" ? session.note : "",
        }))
    : [];

  const notes = Array.isArray(item.notes)
    ? item.notes
        .filter(
          (note): note is BookNote =>
            !!note &&
            typeof note.id === "string" &&
            typeof note.text === "string"
        )
        .map((note) => ({
          id: note.id,
          page: clamp(Math.floor(Number(note.page) || 0), 0, totalPages),
          text: note.text,
          kind: (["note", "quote", "idea"] as NoteKind[]).includes(
            note.kind as NoteKind
          )
            ? (note.kind as NoteKind)
            : "note",
          createdAt:
            typeof note.createdAt === "string" ? note.createdAt : "",
        }))
    : [];

  const tags = Array.isArray(item.tags)
    ? parseTags(
        item.tags.filter((tag): tag is string => typeof tag === "string").join(",")
      )
    : [];

  return {
    id: typeof item.id === "string" ? item.id : createId(),
    title: item.title.trim(),
    author: typeof item.author === "string" ? item.author : "",
    category: typeof item.category === "string" ? item.category : "Other",
    format,
    tags,
    totalPages,
    currentPage: status === "completed" ? totalPages : currentPage,
    status,
    rating: clamp(Math.floor(Number(item.rating) || 0), 0, 5),
    favorite: item.favorite === true,
    review: typeof item.review === "string" ? item.review : "",
    targetDate: isDateString(item.targetDate) ? item.targetDate : "",
    coverUrl: typeof item.coverUrl === "string" ? item.coverUrl : "",
    description:
      typeof item.description === "string" ? item.description : "",
    startedAt: typeof item.startedAt === "string" ? item.startedAt : "",
    completedAt:
      typeof item.completedAt === "string" ? item.completedAt : "",
    createdAt:
      typeof item.createdAt === "string" ? item.createdAt : todayString(),
    updatedAt:
      typeof item.updatedAt === "string" ? item.updatedAt : todayString(),
    sessions,
    notes,
  };
}

function getInitialData(): ReadingData {
  return {
    version: 2,
    dailyGoal: 20,
    yearlyGoal: 12,
    theme: "light",
    view: "grid",
    books: [],
  };
}

function normalizeData(value: unknown): ReadingData | null {
  const base = getInitialData();

  if (Array.isArray(value)) {
    return {
      ...base,
      books: value
        .map(normalizeBook)
        .filter((book): book is Book => book !== null),
    };
  }

  if (!value || typeof value !== "object") return null;

  const parsed = value as Partial<ReadingData>;

  if (!Array.isArray(parsed.books)) return null;

  return {
    version: 2,
    dailyGoal: clamp(Math.floor(Number(parsed.dailyGoal) || 20), 1, 10000),
    yearlyGoal: clamp(Math.floor(Number(parsed.yearlyGoal) || 12), 1, 1000),
    theme: parsed.theme === "dark" ? "dark" : "light",
    view: parsed.view === "list" ? "list" : "grid",
    books: parsed.books
      .map(normalizeBook)
      .filter((book): book is Book => book !== null),
  };
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function escapeCsv(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function isValidCoverUrl(value: string) {
  if (!value.trim()) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function computeStreaks(dates: Set<string>, today: string) {
  const sorted = Array.from(dates).sort();
  let longest = 0;
  let run = 0;
  let previous: number | null = null;

  for (const date of sorted) {
    const current = dayNumber(date);

    run = previous !== null && current - previous === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = current;
  }

  let cursor = dates.has(today) ? today : addDays(today, -1);
  let current = 0;

  while (dates.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest };
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

  const paths: Record<string, React.ReactNode> = {
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z" />
        <path d="M4 5.5V22M8 7h8M8 11h7" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chart: (
      <>
        <path d="M4 19V5M4 19h17" />
        <path d="m7 15 4-4 3 2 6-7" />
      </>
    ),
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
    edit: <path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z" />,
    trash: (
      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
    ),
    star: (
      <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.7l6.2-.9z" />
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    note: (
      <>
        <path d="M5 3h14v18H5z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    filter: <path d="M4 6h16M7 12h10m-7 6h4" />,
    bookOpen: (
      <>
        <path d="M12 7v14" />
        <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v18H5.5A2.5 2.5 0 0 0 3 23z" />
        <path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H12v18h6.5a2.5 2.5 0 0 1 2.5 2z" />
      </>
    ),
    heart: (
      <path d="M12 21s-8-5-9.5-10A5 5 0 0 1 12 7a5 5 0 0 1 9.5 4C20 16 12 21 12 21z" />
    ),
    flame: (
      <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
    ),
    play: <path d="M7 4v16l13-8z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
    list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    moon: <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />,
    trophy: (
      <path d="M8 4h8v6a4 4 0 0 1-8 0zM8 6H4v2a3 3 0 0 0 4 3M16 6h4v2a3 3 0 0 1-4 3M12 14v4M8 21h8M10 18h4" />
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V6a2 2 0 0 1 2-2h9" />
      </>
    ),
    quote: (
      <path d="M7 7H4v6h3l-1 4h3l1-4V7zM17 7h-3v6h3l-1 4h3l1-4V7z" />
    ),
    bulb: (
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" />
    ),
    sparkle: (
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
    ),
  };

  return <svg {...common}>{paths[name] ?? paths.book}</svg>;
}

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function ReadingProgressTracker() {
  const [data, setData] = useState<ReadingData>(getInitialData);
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState(todayString);
  const [now, setNow] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<TabKey>("library");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState("recent");

  const [showBookForm, setShowBookForm] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState<BookForm>(EMPTY_BOOK_FORM);
  const [bookError, setBookError] = useState("");

  const [onlineQuery, setOnlineQuery] = useState("");
  const [onlineResults, setOnlineResults] = useState<OnlineResult[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState("");
  const searchSeq = useRef(0);

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionBookId, setSessionBookId] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionForm, setSessionForm] =
    useState<SessionForm>(EMPTY_SESSION_FORM);
  const [sessionError, setSessionError] = useState("");
  const [sessionBookFilter, setSessionBookFilter] = useState("all");
  const [sessionLimit, setSessionLimit] = useState(25);

  const [noteSearch, setNoteSearch] = useState("");
  const [noteKindFilter, setNoteKindFilter] = useState("all");

  const [goalInput, setGoalInput] = useState("20");
  const [yearlyInput, setYearlyInput] = useState("12");
  const [rangeDays, setRangeDays] = useState(30);

  const [toast, setToast] = useState<ToastState>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(
    null
  );

  const [timer, setTimer] = useState<TimerState>(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerPick, setTimerPick] = useState("");

  const importRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const notify = useCallback(
    (message: string, action?: { label: string; run: () => void }) => {
      setToast({ id: createId(), message, action });
    },
    []
  );

  /* ------------------------------- Persistence --------------------------- */

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const normalized = normalizeData(JSON.parse(raw));

        if (normalized) setData(normalized);
      }
    } catch {
      notify("Saved data could not be loaded. You can import a backup.");
    }

    try {
      const rawTimer = localStorage.getItem(TIMER_KEY);

      if (rawTimer) {
        const parsed = JSON.parse(rawTimer) as Partial<NonNullable<TimerState>>;

        if (
          parsed &&
          typeof parsed.bookId === "string" &&
          typeof parsed.running === "boolean" &&
          typeof parsed.elapsedMs === "number"
        ) {
          setTimer({
            bookId: parsed.bookId,
            running: parsed.running,
            startedAt:
              typeof parsed.startedAt === "number" ? parsed.startedAt : null,
            elapsedMs: Math.max(0, parsed.elapsedMs),
          });
        }
      }
    } catch {
      /* ignore broken timer data */
    }

    setNow(Date.now());
    setHydrated(true);
  }, [notify]);

  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      notify("Browser storage is full. Export a backup and remove old data.");
    }
  }, [data, hydrated, notify]);

  useEffect(() => {
    if (!hydrated) return;

    try {
      if (timer) localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
      else localStorage.removeItem(TIMER_KEY);
    } catch {
      /* ignore */
    }
  }, [timer, hydrated]);

  useEffect(() => {
    setGoalInput(String(data.dailyGoal));
  }, [data.dailyGoal]);

  useEffect(() => {
    setYearlyInput(String(data.yearlyGoal));
  }, [data.yearlyGoal]);

  /* Keep "today" fresh across midnight */
  useEffect(() => {
    const id = window.setInterval(() => setToday(todayString()), 60000);
    return () => window.clearInterval(id);
  }, []);

  /* Timer tick */
  const timerRunning = timer?.running ?? false;

  useEffect(() => {
    if (!timerRunning) return;

    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(id);
  }, [timerRunning]);

  /* Toast auto dismiss */
  useEffect(() => {
    if (!toast) return;

    const id = window.setTimeout(
      () => setToast(null),
      toast.action ? 8000 : 4500
    );

    return () => window.clearTimeout(id);
  }, [toast]);

  const updateBooks = useCallback((updater: (books: Book[]) => Book[]) => {
    setData((previous) => ({
      ...previous,
      books: updater(previous.books),
    }));
  }, []);

  const updateBook = useCallback(
    (bookId: string, updater: (book: Book) => Book) => {
      updateBooks((books) =>
        books.map((book) => (book.id === bookId ? updater(book) : book))
      );
    },
    [updateBooks]
  );

  /* ------------------------------- Reset ---------------------------------- */

  const reset = useCallback(() => {
    const confirmed = window.confirm(
      "Are you sure you want to reset your reading library? This will permanently remove all books, reading sessions, notes, goals and the running timer from this browser."
    );

    if (!confirmed) return;

    setData((old) => ({
      ...getInitialData(),
      theme: old.theme,
    }));
    setTimer(null);
    setSelectedBookId(null);
    setShowBookForm(false);
    setEditingBookId(null);
    setBookForm(EMPTY_BOOK_FORM);
    setBookError("");
    setShowSessionForm(false);
    setSessionForm(EMPTY_SESSION_FORM);
    setSessionError("");
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setTagFilter("all");
    setFavoritesOnly(false);
    setSortBy("recent");
    setActiveTab("library");
    notify("Your reading library has been reset.");
  }, [notify]);

  /* --------------------------------- Analytics ---------------------------- */

  const analytics = useMemo(() => {
    const pagesByDate = new Map<string, number>();
    const minutesByDate = new Map<string, number>();
    const activeDates = new Set<string>();

    let totalPages = 0;
    let totalMinutes = 0;
    let sessionCount = 0;
    let longestSession = 0;
    let timedPages = 0;
    let timedMinutes = 0;
    let totalNotes = 0;

    data.books.forEach((book) => {
      totalNotes += book.notes.length;

      book.sessions.forEach((session) => {
        sessionCount += 1;
        totalPages += session.pages;
        totalMinutes += session.minutes;
        longestSession = Math.max(longestSession, session.minutes);

        if (session.minutes > 0) {
          timedPages += session.pages;
          timedMinutes += session.minutes;
        }

        pagesByDate.set(
          session.date,
          (pagesByDate.get(session.date) ?? 0) + session.pages
        );
        minutesByDate.set(
          session.date,
          (minutesByDate.get(session.date) ?? 0) + session.minutes
        );

        if (session.pages > 0 || session.minutes > 0) {
          activeDates.add(session.date);
        }
      });
    });

    const { current, longest } = computeStreaks(activeDates, today);

    let bestDayDate = "";
    let bestDayPages = 0;

    pagesByDate.forEach((pages, date) => {
      if (pages > bestDayPages) {
        bestDayPages = pages;
        bestDayDate = date;
      }
    });

    const since = addDays(today, -13);
    let last14 = 0;

    pagesByDate.forEach((pages, date) => {
      if (date >= since && date <= today) last14 += pages;
    });

    return {
      pagesByDate,
      minutesByDate,
      totalPages,
      totalMinutes,
      sessionCount,
      longestSession,
      totalNotes,
      streak: current,
      longestStreak: longest,
      bestDayDate,
      bestDayPages,
      speed: timedMinutes > 0 ? (timedPages / timedMinutes) * 60 : 0,
      globalPace: last14 / 14,
    };
  }, [data.books, today]);

  const todayPages = analytics.pagesByDate.get(today) ?? 0;
  const todayMinutes = analytics.minutesByDate.get(today) ?? 0;

  const currentYear = today.slice(0, 4);

  const completedBooks = data.books.filter(
    (book) => book.status === "completed"
  ).length;

  const completedThisYear = data.books.filter(
    (book) =>
      book.status === "completed" && book.completedAt.startsWith(currentYear)
  ).length;

  const readingBooks = data.books.filter(
    (book) => book.status === "currently-reading"
  ).length;

  const wishlistBooks = data.books.filter(
    (book) => book.status === "want-to-read"
  ).length;

  const estimateFinish = useCallback(
    (book: Book): Estimate | null => {
      const remaining = book.totalPages - book.currentPage;

      if (remaining <= 0 || book.status === "completed") return null;

      const since = addDays(today, -13);
      const own =
        book.sessions
          .filter((session) => session.date >= since && session.date <= today)
          .reduce((total, session) => total + session.pages, 0) / 14;

      const pace = own > 0 ? own : analytics.globalPace;

      if (pace <= 0) return null;

      const days = Math.max(1, Math.ceil(remaining / pace));

      return { days, date: addDays(today, days), pace, personal: own > 0 };
    },
    [today, analytics.globalPace]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    data.books.forEach((book) => book.tags.forEach((tag) => set.add(tag)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.books]);

  const filteredBooks = useMemo(() => {
    let result = [...data.books];

    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query) ||
          book.category.toLowerCase().includes(query) ||
          book.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((book) => book.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter((book) => book.category === categoryFilter);
    }

    if (tagFilter !== "all") {
      result = result.filter((book) => book.tags.includes(tagFilter));
    }

    if (favoritesOnly) {
      result = result.filter((book) => book.favorite);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "author":
          return a.author.localeCompare(b.author);
        case "progress":
          return getProgress(b) - getProgress(a);
        case "pages":
          return b.totalPages - a.totalPages;
        case "rating":
          return b.rating - a.rating;
        case "oldest":
          return a.createdAt.localeCompare(b.createdAt);
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });

    return result;
  }, [
    data.books,
    search,
    statusFilter,
    categoryFilter,
    tagFilter,
    favoritesOnly,
    sortBy,
  ]);

  const selectedBook = data.books.find((book) => book.id === selectedBookId);

  const allSessions = useMemo(
    () =>
      data.books
        .flatMap((book) =>
          book.sessions.map((session) => ({
            ...session,
            bookTitle: book.title,
            bookId: book.id,
          }))
        )
        .sort(
          (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
        ),
    [data.books]
  );

  const visibleSessions = useMemo(
    () =>
      sessionBookFilter === "all"
        ? allSessions
        : allSessions.filter((session) => session.bookId === sessionBookFilter),
    [allSessions, sessionBookFilter]
  );

  const allNotes = useMemo(
    () =>
      data.books
        .flatMap((book) =>
          book.notes.map((note) => ({
            ...note,
            bookTitle: book.title,
            bookId: book.id,
          }))
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.books]
  );

  const filteredNotes = useMemo(() => {
    const query = noteSearch.trim().toLowerCase();

    return allNotes.filter((note) => {
      if (noteKindFilter !== "all" && note.kind !== noteKindFilter) {
        return false;
      }

      if (!query) return true;

      return (
        note.text.toLowerCase().includes(query) ||
        note.bookTitle.toLowerCase().includes(query)
      );
    });
  }, [allNotes, noteSearch, noteKindFilter]);

  const rangeSeries = useMemo(
    () =>
      Array.from({ length: rangeDays }, (_, index) => {
        const date = addDays(today, -(rangeDays - 1 - index));

        return {
          date,
          pages: analytics.pagesByDate.get(date) ?? 0,
          label:
            rangeDays === 7
              ? parseDate(date).toLocaleDateString(undefined, {
                  weekday: "short",
                })
              : String(parseDate(date).getDate()),
        };
      }),
    [rangeDays, today, analytics.pagesByDate]
  );

  const rangeTotal = rangeSeries.reduce((sum, day) => sum + day.pages, 0);
  const rangeMax = Math.max(1, ...rangeSeries.map((day) => day.pages));

  const categorySlices = useMemo(() => {
    const counts = new Map<string, number>();

    data.books.forEach((book) =>
      counts.set(book.category, (counts.get(book.category) ?? 0) + 1)
    );

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 6);
    const rest = sorted.slice(6).reduce((sum, item) => sum + item[1], 0);

    const slices = top.map(([label, value], index) => ({
      label,
      value,
      color: CHART_COLORS[index],
    }));

    if (rest > 0) {
      slices.push({ label: "Other", value: rest, color: CHART_COLORS[6] });
    }

    return slices;
  }, [data.books]);

  const monthlyCompleted = useMemo(() => {
    const counts = Array.from({ length: 12 }, () => 0);

    data.books.forEach((book) => {
      if (book.status === "completed" && book.completedAt.startsWith(currentYear)) {
        const month = Number(book.completedAt.slice(5, 7)) - 1;

        if (month >= 0 && month < 12) counts[month] += 1;
      }
    });

    return counts;
  }, [data.books, currentYear]);

  const ratingStats = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    let total = 0;
    let rated = 0;

    data.books.forEach((book) => {
      if (book.rating > 0) {
        counts[book.rating - 1] += 1;
        total += book.rating;
        rated += 1;
      }
    });

    return { counts, rated, average: rated ? total / rated : 0 };
  }, [data.books]);

  const achievements = useMemo(
    () => [
      {
        id: "first-book",
        title: "First Chapter Closed",
        description: "Finish your first book",
        icon: "check",
        value: completedBooks,
        target: 1,
      },
      {
        id: "five-books",
        title: "Bookworm",
        description: "Finish 5 books",
        icon: "book",
        value: completedBooks,
        target: 5,
      },
      {
        id: "ten-books",
        title: "Library Builder",
        description: "Finish 10 books",
        icon: "trophy",
        value: completedBooks,
        target: 10,
      },
      {
        id: "streak-7",
        title: "Week Warrior",
        description: "Read 7 days in a row",
        icon: "flame",
        value: analytics.longestStreak,
        target: 7,
      },
      {
        id: "streak-30",
        title: "Unstoppable",
        description: "Read 30 days in a row",
        icon: "flame",
        value: analytics.longestStreak,
        target: 30,
      },
      {
        id: "pages-1000",
        title: "Thousand Pages",
        description: "Log 1,000 pages",
        icon: "bookOpen",
        value: analytics.totalPages,
        target: 1000,
      },
      {
        id: "pages-5000",
        title: "Page Turner",
        description: "Log 5,000 pages",
        icon: "bookOpen",
        value: analytics.totalPages,
        target: 5000,
      },
      {
        id: "hours-10",
        title: "Deep Focus",
        description: "Read for 10 hours",
        icon: "clock",
        value: Math.floor(analytics.totalMinutes / 60),
        target: 10,
      },
      {
        id: "hours-50",
        title: "Time Traveler",
        description: "Read for 50 hours",
        icon: "clock",
        value: Math.floor(analytics.totalMinutes / 60),
        target: 50,
      },
      {
        id: "notes-10",
        title: "Thoughtful Reader",
        description: "Save 10 notes or quotes",
        icon: "note",
        value: analytics.totalNotes,
        target: 10,
      },
      {
        id: "daily-goal",
        title: "Goal Getter",
        description: "Hit your daily goal in one day",
        icon: "target",
        value: analytics.bestDayPages,
        target: data.dailyGoal,
      },
      {
        id: "yearly-goal",
        title: "Yearly Champion",
        description: "Reach your yearly book goal",
        icon: "sparkle",
        value: completedThisYear,
        target: data.yearlyGoal,
      },
    ],
    [
      completedBooks,
      analytics.longestStreak,
      analytics.totalPages,
      analytics.totalMinutes,
      analytics.totalNotes,
      analytics.bestDayPages,
      completedThisYear,
      data.dailyGoal,
      data.yearlyGoal,
    ]
  );

  const unlockedCount = achievements.filter(
    (item) => item.value >= item.target
  ).length;

  /* ------------------------------- Book form ------------------------------ */

  function openAddBook() {
    setEditingBookId(null);
    setBookForm(EMPTY_BOOK_FORM);
    setBookError("");
    setOnlineQuery("");
    setOnlineResults([]);
    setOnlineError("");
    setShowBookForm(true);
  }

  function openEditBook(book: Book) {
    setEditingBookId(book.id);
    setBookForm({
      title: book.title,
      author: book.author,
      category: book.category,
      format: book.format,
      tags: book.tags.join(", "),
      totalPages: String(book.totalPages),
      currentPage: String(book.currentPage),
      status: book.status,
      rating: book.rating,
      targetDate: book.targetDate,
      coverUrl: book.coverUrl,
      description: book.description,
    });
    setBookError("");
    setOnlineResults([]);
    setShowBookForm(true);
  }

  async function searchOnline() {
    const query = onlineQuery.trim();

    if (query.length < 2) {
      setOnlineError("Type at least 2 characters to search.");
      return;
    }

    const seq = ++searchSeq.current;

    setOnlineLoading(true);
    setOnlineError("");
    setOnlineResults([]);

    try {
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(
          query
        )}&limit=6&fields=key,title,author_name,number_of_pages_median,cover_i,subject,first_publish_year`
      );

      if (!response.ok) throw new Error("Search failed");

      const json = (await response.json()) as {
        docs?: {
          key?: string;
          title?: string;
          author_name?: string[];
          number_of_pages_median?: number;
          cover_i?: number;
          subject?: string[];
          first_publish_year?: number;
        }[];
      };

      if (seq !== searchSeq.current) return;

      const results: OnlineResult[] = (json.docs ?? [])
        .filter((doc) => typeof doc.title === "string" && doc.title)
        .slice(0, 6)
        .map((doc, index) => ({
          key: doc.key ?? `${index}-${doc.title}`,
          title: doc.title ?? "",
          author: doc.author_name?.[0] ?? "",
          pages: doc.number_of_pages_median ?? 0,
          coverUrl: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : "",
          category: mapCategory(doc.subject ?? []),
          year: doc.first_publish_year ?? 0,
        }));

      setOnlineResults(results);

      if (results.length === 0) {
        setOnlineError("No books found. Try a different title or author.");
      }
    } catch {
      if (seq !== searchSeq.current) return;
      setOnlineError(
        "Online search is unavailable right now. You can still add the book manually."
      );
    } finally {
      if (seq === searchSeq.current) setOnlineLoading(false);
    }
  }

  function applyOnlineResult(result: OnlineResult) {
    setBookForm((old) => ({
      ...old,
      title: result.title,
      author: result.author || old.author,
      category: result.category,
      totalPages: result.pages > 0 ? String(result.pages) : old.totalPages,
      coverUrl: result.coverUrl || old.coverUrl,
    }));
    setOnlineResults([]);
    setOnlineError("");
    setOnlineQuery("");
  }

  function handleBookSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookError("");

    const title = bookForm.title.trim();
    const totalPages = Number(bookForm.totalPages);
    const currentPage = Number(bookForm.currentPage || 0);

    if (!title) {
      setBookError("Please enter the book title.");
      return;
    }

    if (
      !Number.isInteger(totalPages) ||
      totalPages < 1 ||
      totalPages > 100000
    ) {
      setBookError("Enter a valid total page count (1–100,000).");
      return;
    }

    if (
      !Number.isInteger(currentPage) ||
      currentPage < 0 ||
      currentPage > totalPages
    ) {
      setBookError("Current page must be between 0 and total pages.");
      return;
    }

    if (!isValidCoverUrl(bookForm.coverUrl)) {
      setBookError("Cover URL must be a valid HTTP or HTTPS address.");
      return;
    }

    const stamp = todayString();
    const tags = parseTags(bookForm.tags);

    if (editingBookId) {
      updateBook(editingBookId, (old) => {
        const nextStatus = bookForm.status;

        return {
          ...old,
          title,
          author: bookForm.author.trim(),
          category: bookForm.category,
          format: bookForm.format,
          tags,
          totalPages,
          currentPage: nextStatus === "completed" ? totalPages : currentPage,
          status: nextStatus,
          rating: bookForm.rating,
          targetDate: bookForm.targetDate,
          coverUrl: bookForm.coverUrl.trim(),
          description: bookForm.description.trim(),
          completedAt:
            nextStatus === "completed" ? old.completedAt || stamp : "",
          startedAt:
            nextStatus === "currently-reading"
              ? old.startedAt || stamp
              : old.startedAt,
          updatedAt: stamp,
        };
      });
      notify("Book details updated.");
    } else {
      const status = bookForm.status;

      const newBook: Book = {
        id: createId(),
        title,
        author: bookForm.author.trim(),
        category: bookForm.category,
        format: bookForm.format,
        tags,
        totalPages,
        currentPage: status === "completed" ? totalPages : currentPage,
        status,
        rating: bookForm.rating,
        favorite: false,
        review: "",
        targetDate: bookForm.targetDate,
        coverUrl: bookForm.coverUrl.trim(),
        description: bookForm.description.trim(),
        startedAt: status === "currently-reading" ? stamp : "",
        completedAt: status === "completed" ? stamp : "",
        createdAt: stamp,
        updatedAt: stamp,
        sessions: [],
        notes: [],
      };

      updateBooks((books) => [newBook, ...books]);
      notify("Book added to your library.");
    }

    setShowBookForm(false);
  }

  function deleteBook(book: Book) {
    updateBooks((books) => books.filter((item) => item.id !== book.id));

    if (selectedBookId === book.id) setSelectedBookId(null);
    if (timer?.bookId === book.id) setTimer(null);

    notify(`"${book.title}" deleted.`, {
      label: "Undo",
      run: () => updateBooks((books) => [book, ...books]),
    });
  }

  function updateBookStatus(book: Book, status: ReadingStatus) {
    const stamp = todayString();

    updateBook(book.id, (old) => ({
      ...old,
      status,
      currentPage: status === "completed" ? old.totalPages : old.currentPage,
      completedAt: status === "completed" ? old.completedAt || stamp : "",
      startedAt:
        status === "currently-reading" ? old.startedAt || stamp : old.startedAt,
      updatedAt: stamp,
    }));

    notify(`Status changed to ${statusLabel(status)}.`);
  }

  function updateCurrentPage(book: Book, page: number) {
    const currentPage = clamp(Math.floor(page), 0, book.totalPages);
    const stamp = todayString();

    const status: ReadingStatus =
      currentPage >= book.totalPages
        ? "completed"
        : currentPage > 0
          ? "currently-reading"
          : book.status === "completed"
            ? "currently-reading"
            : book.status;

    updateBook(book.id, (old) => ({
      ...old,
      currentPage,
      status,
      completedAt:
        status === "completed" ? old.completedAt || stamp : "",
      startedAt:
        status === "currently-reading" ? old.startedAt || stamp : old.startedAt,
      updatedAt: stamp,
    }));

    if (status === "completed" && book.status !== "completed") {
      notify("Congratulations! You completed this book.");
    }
  }

  function toggleFavorite(book: Book) {
    updateBook(book.id, (old) => ({ ...old, favorite: !old.favorite }));
  }

  /* ----------------------------- Reading sessions ------------------------ */

  function openSessionForm(bookId?: string, preset?: { minutes?: number }) {
    const fallback =
      data.books.find((book) => book.status === "currently-reading") ??
      data.books.find((book) => book.status !== "completed") ??
      data.books[0];

    setSessionBookId(bookId ?? fallback?.id ?? "");
    setEditingSessionId(null);
    setSessionForm({
      ...EMPTY_SESSION_FORM,
      date: today,
      minutes: preset?.minutes ? String(preset.minutes) : "",
    });
    setSessionError("");
    setShowSessionForm(true);
  }

  function openEditSession(bookId: string, session: ReadingSession) {
    setSessionBookId(bookId);
    setEditingSessionId(session.id);
    setSessionForm({
      date: session.date,
      pages: String(session.pages),
      minutes: String(session.minutes),
      note: session.note,
    });
    setSessionError("");
    setShowSessionForm(true);
  }

  function handleSessionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSessionError("");

    const book = data.books.find((item) => item.id === sessionBookId);

    if (!book) {
      setSessionError("Please select a book.");
      return;
    }

    const editing = editingSessionId
      ? book.sessions.find((item) => item.id === editingSessionId)
      : undefined;

    const pages = Number(sessionForm.pages);
    const minutes = Number(sessionForm.minutes);

    if (!isDateString(sessionForm.date) || sessionForm.date > today) {
      setSessionError("Choose a valid date that is not in the future.");
      return;
    }

    if (!Number.isInteger(pages) || pages < 1 || pages > 100000) {
      setSessionError("Enter a valid number of pages (at least 1).");
      return;
    }

    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      setSessionError("Enter reading time between 1 and 1,440 minutes.");
      return;
    }

    const available = book.totalPages - book.currentPage + (editing?.pages ?? 0);

    if (pages > available) {
      setSessionError(
        `This would exceed the book's remaining ${available} pages.`
      );
      return;
    }

    const completed =
      book.currentPage - (editing?.pages ?? 0) + pages >= book.totalPages;

    const session: ReadingSession = {
      id: editing?.id ?? createId(),
      date: sessionForm.date,
      pages,
      minutes,
      note: sessionForm.note.trim(),
    };

    updateBook(book.id, (old) => {
      const nextPage = clamp(
        old.currentPage - (editing?.pages ?? 0) + pages,
        0,
        old.totalPages
      );
      const isDone = nextPage >= old.totalPages;

      return {
        ...old,
        currentPage: nextPage,
        status: isDone ? "completed" : "currently-reading",
        startedAt: old.startedAt || session.date,
        completedAt: isDone ? old.completedAt || today : "",
        updatedAt: today,
        sessions: editing
          ? old.sessions.map((item) => (item.id === editing.id ? session : item))
          : [...old.sessions, session],
      };
    });

    setShowSessionForm(false);
    notify(
      completed
        ? "Congratulations! You completed this book."
        : editing
          ? "Reading session updated."
          : "Reading session saved."
    );
  }

  function deleteSession(bookId: string, sessionId: string) {
    const book = data.books.find((item) => item.id === bookId);
    if (!book) return;

    const session = book.sessions.find((item) => item.id === sessionId);
    if (!session) return;

    const snapshot = book;

    updateBook(bookId, (old) => {
      const currentPage = clamp(
        old.currentPage - session.pages,
        0,
        old.totalPages
      );

      return {
        ...old,
        sessions: old.sessions.filter((item) => item.id !== sessionId),
        currentPage,
        status:
          currentPage >= old.totalPages
            ? "completed"
            : currentPage > 0
              ? "currently-reading"
              : old.status === "completed"
                ? "currently-reading"
                : old.status,
        completedAt: currentPage >= old.totalPages ? old.completedAt : "",
        updatedAt: today,
      };
    });

    notify("Session deleted and progress recalculated.", {
      label: "Undo",
      run: () => updateBook(bookId, () => snapshot),
    });
  }

  /* --------------------------------- Notes -------------------------------- */

  function addNote(bookId: string, page: number, text: string, kind: NoteKind) {
    const note: BookNote = {
      id: createId(),
      page,
      text,
      kind,
      createdAt: new Date().toISOString(),
    };

    updateBook(bookId, (old) => ({
      ...old,
      notes: [...old.notes, note],
      updatedAt: todayString(),
    }));

    notify(kind === "quote" ? "Quote saved." : "Note saved.");
  }

  function deleteNote(bookId: string, noteId: string) {
    const book = data.books.find((item) => item.id === bookId);
    if (!book) return;

    const snapshot = book;

    updateBook(bookId, (old) => ({
      ...old,
      notes: old.notes.filter((note) => note.id !== noteId),
      updatedAt: todayString(),
    }));

    notify("Note deleted.", {
      label: "Undo",
      run: () => updateBook(bookId, () => snapshot),
    });
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify("Copied to clipboard.");
    } catch {
      notify("Could not copy. Select the text and copy it manually.");
    }
  }

  /* ------------------------------- Goals ---------------------------------- */

  function saveDailyGoal() {
    const value = Number(goalInput);

    if (!Number.isInteger(value) || value < 1 || value > 10000) {
      notify("Daily goal must be between 1 and 10,000 pages.");
      return;
    }

    setData((old) => ({ ...old, dailyGoal: value }));
    notify("Daily reading goal updated.");
  }

  function saveYearlyGoal() {
    const value = Number(yearlyInput);

    if (!Number.isInteger(value) || value < 1 || value > 1000) {
      notify("Yearly goal must be between 1 and 1,000 books.");
      return;
    }

    setData((old) => ({ ...old, yearlyGoal: value }));
    notify("Yearly reading challenge updated.");
  }

  /* -------------------------------- Timer --------------------------------- */

  const timerBook = timer
    ? data.books.find((book) => book.id === timer.bookId)
    : undefined;

  const timerElapsed = timer
    ? timer.elapsedMs +
      (timer.running && timer.startedAt ? Math.max(0, now - timer.startedAt) : 0)
    : 0;

  const timerCandidates = data.books.filter(
    (book) => book.status !== "completed"
  );

  function startTimer() {
    const bookId =
      timerPick && timerCandidates.some((book) => book.id === timerPick)
        ? timerPick
        : timerCandidates.find((book) => book.status === "currently-reading")
            ?.id ?? timerCandidates[0]?.id;

    if (!bookId) {
      notify("Add a book you haven't finished to start the timer.");
      return;
    }

    const stamp = Date.now();

    setNow(stamp);
    setTimer({ bookId, running: true, startedAt: stamp, elapsedMs: 0 });
  }

  function toggleTimer() {
    if (!timer) return;

    const stamp = Date.now();

    setNow(stamp);

    if (timer.running) {
      setTimer({
        ...timer,
        running: false,
        startedAt: null,
        elapsedMs:
          timer.elapsedMs + (timer.startedAt ? stamp - timer.startedAt : 0),
      });
    } else {
      setTimer({ ...timer, running: true, startedAt: stamp });
    }
  }

  function finishTimer() {
    if (!timer) return;

    const total =
      timer.elapsedMs +
      (timer.running && timer.startedAt ? Date.now() - timer.startedAt : 0);

    const minutes = clamp(Math.max(1, Math.round(total / 60000)), 1, 1440);
    const bookId = timer.bookId;

    setTimer(null);
    setTimerOpen(false);
    openSessionForm(
      data.books.some((book) => book.id === bookId) ? bookId : undefined,
      { minutes }
    );
  }

  function discardTimer() {
    if (!window.confirm("Discard the running timer without saving a session?")) {
      return;
    }

    setTimer(null);
  }

  /* ------------------------------- Import/export ------------------------- */

  function exportBackup() {
    const backup = {
      ...data,
      exportedAt: new Date().toISOString(),
      app: "ToolsAB Reading Progress Tracker",
    };

    downloadFile(
      "toolsab-reading-backup.json",
      JSON.stringify(backup, null, 2),
      "application/json"
    );

    notify("Reading library backup downloaded.");
  }

  function exportCsv() {
    const rows = [
      [
        "Title",
        "Author",
        "Category",
        "Format",
        "Tags",
        "Status",
        "Current Page",
        "Total Pages",
        "Progress",
        "Rating",
        "Favorite",
        "Started",
        "Completed",
        "Pages Read in Sessions",
        "Reading Minutes",
      ],
      ...data.books.map((book) => [
        book.title,
        book.author,
        book.category,
        formatLabel(book.format),
        book.tags.join("; "),
        statusLabel(book.status),
        book.currentPage,
        book.totalPages,
        `${getProgress(book)}%`,
        book.rating,
        book.favorite ? "Yes" : "No",
        book.startedAt,
        book.completedAt,
        book.sessions.reduce((sum, item) => sum + item.pages, 0),
        book.sessions.reduce((sum, item) => sum + item.minutes, 0),
      ]),
    ];

    downloadFile(
      "toolsab-reading-library.csv",
      rows.map((row) => row.map(escapeCsv).join(",")).join("\n"),
      "text/csv;charset=utf-8"
    );
    notify("Reading library exported as CSV.");
  }

  function exportSessionsCsv() {
    const rows = [
      ["Date", "Book", "Pages", "Minutes", "Note"],
      ...allSessions
        .slice()
        .reverse()
        .map((session) => [
          session.date,
          session.bookTitle,
          session.pages,
          session.minutes,
          session.note,
        ]),
    ];

    downloadFile(
      "toolsab-reading-sessions.csv",
      rows.map((row) => row.map(escapeCsv).join(",")).join("\n"),
      "text/csv;charset=utf-8"
    );
    notify("Reading sessions exported as CSV.");
  }

  function exportNotesMarkdown() {
    const lines: string[] = ["# Reading notes & highlights", ""];

    data.books
      .filter((book) => book.notes.length > 0)
      .forEach((book) => {
        lines.push(
          `## ${book.title}${book.author ? ` — ${book.author}` : ""}`,
          ""
        );

        [...book.notes]
          .sort((a, b) => a.page - b.page)
          .forEach((note) => {
            const text = note.text.replace(/\n/g, "\n> ");

            lines.push(
              note.kind === "quote"
                ? `> ${text}`
                : `- **${note.kind === "idea" ? "Idea" : "Note"}:** ${note.text}`,
              `  *(page ${note.page})*`,
              ""
            );
          });
      });

    if (lines.length <= 2) {
      notify("You have no notes to export yet.");
      return;
    }

    downloadFile(
      "toolsab-reading-notes.md",
      lines.join("\n"),
      "text/markdown;charset=utf-8"
    );
    notify("Notes exported as Markdown.");
  }

  async function importBackup(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      notify("File is too large. Please choose a file under 5 MB.");
      return;
    }

    try {
      const text = await file.text();
      const normalized = normalizeData(JSON.parse(text));

      if (!normalized) throw new Error("Invalid backup format.");

      if (normalized.books.length === 0) {
        throw new Error("No valid books were found in this file.");
      }

      setPendingImport({ fileName: file.name, data: normalized });
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Could not import this backup."
      );
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  function confirmImport(mode: "replace" | "merge") {
    if (!pendingImport) return;

    const incoming = pendingImport.data;

    if (mode === "replace") {
      setData({ ...incoming, theme: data.theme });
      notify(`${incoming.books.length} book(s) imported. Library replaced.`);
    } else {
      const keyOf = (book: Book) =>
        `${book.title.toLowerCase()}|${book.author.toLowerCase()}`;

      const existingKeys = new Set(data.books.map(keyOf));
      const existingIds = new Set(data.books.map((book) => book.id));

      const additions = incoming.books.filter(
        (book) => !existingKeys.has(keyOf(book)) && !existingIds.has(book.id)
      );

      updateBooks((books) => [...additions, ...books]);
      notify(
        `${additions.length} new book(s) merged, ${
          incoming.books.length - additions.length
        } duplicate(s) skipped.`
      );
    }

    setSelectedBookId(null);
    setPendingImport(null);
  }

  /* ----------------------------- Keyboard shortcuts ---------------------- */

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

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

      if (document.querySelector(".rpt-modal")) return;

      if (event.key === "/") {
        event.preventDefault();
        setActiveTab("library");
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        openAddBook();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------- UI ---------------------------------- */

  if (!hydrated) {
    return (
      <ToolShell title="Reading Progress Tracker" onReset={reset} wide>
        <div className="rpt rpt-loading">
          <div className="rpt-spinner" />
          <p>Loading your reading library...</p>
        </div>
        <ReadingStyles />
      </ToolShell>
    );
  }

  const dailyPercent = clamp(
    Math.round((todayPages / Math.max(1, data.dailyGoal)) * 100),
    0,
    100
  );

  const yearlyPercent = clamp(
    Math.round((completedThisYear / Math.max(1, data.yearlyGoal)) * 100),
    0,
    100
  );

  const yearStart = `${currentYear}-01-01`;
  const dayOfYear = daysBetween(yearStart, today) + 1;
  const expectedBooks = (data.yearlyGoal * dayOfYear) / 365;
  const paceDiff = completedThisYear - expectedBooks;

  const yearlyMessage =
    completedThisYear >= data.yearlyGoal
      ? "Challenge complete. Amazing work!"
      : paceDiff >= 0.5
        ? `You're about ${Math.floor(paceDiff)} book${
            Math.floor(paceDiff) === 1 ? "" : "s"
          } ahead of schedule.`
        : paceDiff <= -0.5
          ? `You're ${Math.ceil(Math.abs(paceDiff))} book${
              Math.ceil(Math.abs(paceDiff)) === 1 ? "" : "s"
            } behind schedule. You can catch up!`
          : "You're right on schedule.";

  const statusCounts = (status: string) =>
    status === "all"
      ? data.books.length
      : data.books.filter((book) => book.status === status).length;

  return (
    <ToolShell title="Reading Progress Tracker" onReset={reset} wide>
      <div className="rpt" data-theme={data.theme}>
        <div className="rpt-header">
          <div>
            <div className="rpt-eyebrow">
              <Icon name="book" size={15} />
              PERSONAL READING SPACE
            </div>
            <h1>Reading Progress Tracker</h1>
            <p>
              {greeting()}.{" "}
              {analytics.streak > 0
                ? `You're on a ${analytics.streak}-day reading streak. Keep it going.`
                : "Log a session today to start a new reading streak."}
            </p>
          </div>

          <div className="rpt-header-actions">
            <button
              type="button"
              className="rpt-icon-btn rpt-theme-btn"
              aria-label={
                data.theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              title={data.theme === "dark" ? "Light mode" : "Dark mode"}
              onClick={() =>
                setData((old) => ({
                  ...old,
                  theme: old.theme === "dark" ? "light" : "dark",
                }))
              }
            >
              <Icon name={data.theme === "dark" ? "sun" : "moon"} size={18} />
            </button>
            <button
              type="button"
              className="rpt-btn rpt-btn-light"
              onClick={exportBackup}
            >
              <Icon name="download" size={16} />
              Backup
            </button>
            <button
              type="button"
              className="rpt-btn rpt-btn-primary"
              onClick={openAddBook}
            >
              <Icon name="plus" size={17} />
              Add a Book
            </button>
          </div>
        </div>

        {/* Dashboard cards */}
        <div className="rpt-stats">
          <StatCard
            icon="book"
            label="Total Books"
            value={data.books.length}
            detail={`${wishlistBooks} on your wishlist`}
          />
          <StatCard
            icon="bookOpen"
            label="Currently Reading"
            value={readingBooks}
            detail={`${completedBooks} finished overall`}
          />
          <StatCard
            icon="flame"
            label="Reading Streak"
            value={`${analytics.streak} ${analytics.streak === 1 ? "day" : "days"}`}
            detail={`Best streak: ${analytics.longestStreak} days`}
            highlight={analytics.streak > 0}
          />
          <StatCard
            icon="target"
            label="Pages Read"
            value={analytics.totalPages.toLocaleString()}
            detail={`${formatMinutes(analytics.totalMinutes)} of reading`}
          />
        </div>

        {/* Goals */}
        <div className="rpt-goals">
          <section className="rpt-goal-panel">
            <Ring value={dailyPercent}>
              <strong>{dailyPercent}%</strong>
              <span>today</span>
            </Ring>

            <div className="rpt-goal-copy">
              <span className="rpt-small-label">TODAY&apos;S READING GOAL</span>
              <h2>
                {todayPages.toLocaleString()}{" "}
                <span>/ {data.dailyGoal.toLocaleString()} pages</span>
              </h2>
              <p>
                {todayPages >= data.dailyGoal
                  ? "You reached your daily goal. Great work!"
                  : `${Math.max(0, data.dailyGoal - todayPages)} more pages to reach your goal.`}{" "}
                {formatMinutes(todayMinutes)} read today.
              </p>

              <div className="rpt-goal-input">
                <input
                  id="rpt-daily-goal"
                  aria-label="Daily page goal"
                  type="number"
                  min="1"
                  max="10000"
                  value={goalInput}
                  onChange={(event) => setGoalInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveDailyGoal();
                  }}
                />
                <span>pages / day</span>
                <button type="button" onClick={saveDailyGoal}>
                  Save
                </button>
              </div>
            </div>
          </section>

          <section className="rpt-goal-panel rpt-goal-yearly">
            <Ring value={yearlyPercent}>
              <strong>{completedThisYear}</strong>
              <span>of {data.yearlyGoal}</span>
            </Ring>

            <div className="rpt-goal-copy">
              <span className="rpt-small-label">
                {currentYear} READING CHALLENGE
              </span>
              <h2>
                {completedThisYear}{" "}
                <span>/ {data.yearlyGoal} books this year</span>
              </h2>
              <p>{yearlyMessage}</p>

              <div className="rpt-goal-input">
                <input
                  id="rpt-yearly-goal"
                  aria-label="Yearly book goal"
                  type="number"
                  min="1"
                  max="1000"
                  value={yearlyInput}
                  onChange={(event) => setYearlyInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveYearlyGoal();
                  }}
                />
                <span>books / year</span>
                <button type="button" onClick={saveYearlyGoal}>
                  Save
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Navigation */}
        <div className="rpt-tabs" role="tablist" aria-label="Reading sections">
          {(
            [
              ["library", "My Library", "book", data.books.length],
              ["sessions", "Sessions", "clock", analytics.sessionCount],
              ["notes", "Notes & Quotes", "note", analytics.totalNotes],
              ["insights", "Insights", "chart", null],
            ] as [TabKey, string, string, number | null][]
          ).map(([key, label, icon, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              className={activeTab === key ? "active" : ""}
              onClick={() => setActiveTab(key)}
            >
              <Icon name={icon} size={16} />
              {label}
              {count !== null && count > 0 && (
                <em className="rpt-tab-count">{count}</em>
              )}
            </button>
          ))}
        </div>

        {/* Library */}
        {activeTab === "library" && (
          <section className="rpt-section">
            <div className="rpt-section-heading">
              <div>
                <h2>Your Book Library</h2>
                <p>
                  Manage your books and update your reading progress. Press{" "}
                  <kbd>/</kbd> to search or <kbd>N</kbd> to add a book.
                </p>
              </div>
              <button
                type="button"
                className="rpt-btn rpt-btn-primary"
                onClick={openAddBook}
              >
                <Icon name="plus" size={16} />
                Add Book
              </button>
            </div>

            <div className="rpt-chips" role="group" aria-label="Filter by status">
              {[{ value: "all", label: "All" }, ...STATUSES].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={statusFilter === item.value ? "active" : ""}
                  onClick={() => setStatusFilter(item.value)}
                >
                  {item.label}
                  <em>{statusCounts(item.value)}</em>
                </button>
              ))}
            </div>

            <div className="rpt-filters">
              <div className="rpt-search">
                <Icon name="search" size={17} />
                <input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search title, author, category or tag..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="rpt-filter-control">
                <select
                  aria-label="Filter by category"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {allTags.length > 0 && (
                <div className="rpt-filter-control">
                  <select
                    aria-label="Filter by tag"
                    value={tagFilter}
                    onChange={(event) => setTagFilter(event.target.value)}
                  >
                    <option value="all">All tags</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>
                        #{tag}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rpt-filter-control">
                <Icon name="filter" size={16} />
                <select
                  aria-label="Sort books"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="recent">Recently updated</option>
                  <option value="title">Title A–Z</option>
                  <option value="author">Author A–Z</option>
                  <option value="progress">Highest progress</option>
                  <option value="rating">Top rated</option>
                  <option value="pages">Most pages</option>
                  <option value="oldest">Oldest added</option>
                </select>
              </div>

              <button
                type="button"
                className={`rpt-toggle ${favoritesOnly ? "active" : ""}`}
                aria-pressed={favoritesOnly}
                onClick={() => setFavoritesOnly((value) => !value)}
              >
                <Icon
                  name="heart"
                  size={16}
                  fill={favoritesOnly ? "currentColor" : "none"}
                />
                Favorites
              </button>

              <div className="rpt-segment" role="group" aria-label="View mode">
                <button
                  type="button"
                  aria-label="Grid view"
                  className={data.view === "grid" ? "active" : ""}
                  onClick={() => setData((old) => ({ ...old, view: "grid" }))}
                >
                  <Icon name="grid" size={16} />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  className={data.view === "list" ? "active" : ""}
                  onClick={() => setData((old) => ({ ...old, view: "list" }))}
                >
                  <Icon name="list" size={16} />
                </button>
              </div>
            </div>

            {filteredBooks.length === 0 ? (
              <div className="rpt-empty">
                <div className="rpt-empty-icon">
                  <Icon name="bookOpen" size={30} />
                </div>
                <h3>
                  {data.books.length === 0
                    ? "Your reading library is empty"
                    : "No matching books found"}
                </h3>
                <p>
                  {data.books.length === 0
                    ? "Add your first book to start tracking pages, reading time, streaks and progress. You can even search millions of books online to fill in the details."
                    : "Try changing your search or filters."}
                </p>
                {data.books.length === 0 && (
                  <button
                    type="button"
                    className="rpt-btn rpt-btn-primary"
                    onClick={openAddBook}
                  >
                    <Icon name="plus" size={16} />
                    Add Your First Book
                  </button>
                )}
              </div>
            ) : (
              <div className={`rpt-book-grid ${data.view}`}>
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    view={data.view}
                    estimate={estimateFinish(book)}
                    today={today}
                    onEdit={() => openEditBook(book)}
                    onDelete={() => deleteBook(book)}
                    onOpen={() => setSelectedBookId(book.id)}
                    onLog={() => openSessionForm(book.id)}
                    onFavorite={() => toggleFavorite(book)}
                    onStatusChange={(status) => updateBookStatus(book, status)}
                    onPageChange={(page) => updateCurrentPage(book, page)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Sessions */}
        {activeTab === "sessions" && (
          <section className="rpt-section">
            <div className="rpt-section-heading">
              <div>
                <h2>Reading Sessions</h2>
                <p>Review your reading activity and logged pages.</p>
              </div>
              <div className="rpt-heading-actions">
                <button
                  type="button"
                  className="rpt-btn rpt-btn-light"
                  disabled={allSessions.length === 0}
                  onClick={exportSessionsCsv}
                >
                  <Icon name="download" size={16} />
                  CSV
                </button>
                <button
                  type="button"
                  className="rpt-btn rpt-btn-primary"
                  disabled={data.books.length === 0}
                  onClick={() => openSessionForm()}
                >
                  <Icon name="plus" size={16} />
                  Log a Session
                </button>
              </div>
            </div>

            <div className="rpt-session-summary">
              <div>
                <span>Pages today</span>
                <strong>{todayPages}</strong>
              </div>
              <div>
                <span>Reading time today</span>
                <strong>{formatMinutes(todayMinutes)}</strong>
              </div>
              <div>
                <span>Total reading time</span>
                <strong>{formatMinutes(analytics.totalMinutes)}</strong>
              </div>
              <div>
                <span>Total sessions</span>
                <strong>{analytics.sessionCount}</strong>
              </div>
            </div>

            {allSessions.length > 0 && (
              <div className="rpt-session-filter">
                <label htmlFor="rpt-session-book">Show sessions for</label>
                <div className="rpt-filter-control">
                  <select
                    id="rpt-session-book"
                    value={sessionBookFilter}
                    onChange={(event) => {
                      setSessionBookFilter(event.target.value);
                      setSessionLimit(25);
                    }}
                  >
                    <option value="all">All books</option>
                    {data.books
                      .filter((book) => book.sessions.length > 0)
                      .map((book) => (
                        <option key={book.id} value={book.id}>
                          {book.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {visibleSessions.length === 0 ? (
              <div className="rpt-empty">
                <div className="rpt-empty-icon">
                  <Icon name="clock" size={30} />
                </div>
                <h3>No reading sessions yet</h3>
                <p>
                  Log a session after reading to record pages and time. Your
                  daily goal, streak and charts use these recorded sessions.
                </p>
                {data.books.length > 0 && (
                  <button
                    type="button"
                    className="rpt-btn rpt-btn-primary"
                    onClick={() => openSessionForm()}
                  >
                    Log Your First Session
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="rpt-session-list">
                  {visibleSessions.slice(0, sessionLimit).map((session) => (
                    <div className="rpt-session-row" key={session.id}>
                      <div className="rpt-session-date">
                        <strong>{dateLabel(session.date)}</strong>
                        <span>{session.bookTitle}</span>
                      </div>
                      <div className="rpt-session-metric">
                        <strong>{session.pages}</strong>
                        <span>pages</span>
                      </div>
                      <div className="rpt-session-metric">
                        <strong>{formatMinutes(session.minutes)}</strong>
                        <span>
                          {session.minutes > 0
                            ? `${Math.round((session.pages / session.minutes) * 60)} pages/hr`
                            : "reading time"}
                        </span>
                      </div>
                      <div className="rpt-session-note">
                        {session.note || "No session note"}
                      </div>
                      <div className="rpt-row-actions">
                        <button
                          type="button"
                          className="rpt-icon-btn"
                          title="Edit session"
                          aria-label={`Edit session for ${session.bookTitle}`}
                          onClick={() => {
                            const book = data.books.find(
                              (item) => item.id === session.bookId
                            );
                            if (book) openEditSession(book.id, session);
                          }}
                        >
                          <Icon name="edit" size={15} />
                        </button>
                        <button
                          type="button"
                          className="rpt-icon-btn rpt-danger"
                          title="Delete session"
                          aria-label={`Delete session for ${session.bookTitle}`}
                          onClick={() => deleteSession(session.bookId, session.id)}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {visibleSessions.length > sessionLimit && (
                  <div className="rpt-load-more">
                    <button
                      type="button"
                      className="rpt-btn rpt-btn-light"
                      onClick={() => setSessionLimit((value) => value + 25)}
                    >
                      Show more ({visibleSessions.length - sessionLimit} left)
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* Notes */}
        {activeTab === "notes" && (
          <section className="rpt-section">
            <div className="rpt-section-heading">
              <div>
                <h2>Notes, Quotes & Ideas</h2>
                <p>Everything you captured while reading, in one place.</p>
              </div>
              <button
                type="button"
                className="rpt-btn rpt-btn-light"
                disabled={allNotes.length === 0}
                onClick={exportNotesMarkdown}
              >
                <Icon name="download" size={16} />
                Export Markdown
              </button>
            </div>

            <div className="rpt-notes-toolbar">
              <div className="rpt-search">
                <Icon name="search" size={17} />
                <input
                  type="search"
                  placeholder="Search your notes..."
                  value={noteSearch}
                  onChange={(event) => setNoteSearch(event.target.value)}
                />
              </div>
              <div className="rpt-chips">
                {[{ value: "all", label: "All" }, ...NOTE_KINDS].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={noteKindFilter === item.value ? "active" : ""}
                    onClick={() => setNoteKindFilter(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="rpt-empty">
                <div className="rpt-empty-icon">
                  <Icon name="quote" size={30} />
                </div>
                <h3>
                  {allNotes.length === 0
                    ? "No notes yet"
                    : "No notes match your search"}
                </h3>
                <p>
                  {allNotes.length === 0
                    ? "Open any book and save quotes, ideas and thoughts as you read. They will all appear here."
                    : "Try a different keyword or filter."}
                </p>
              </div>
            ) : (
              <div className="rpt-notes-list rpt-notes-all">
                {filteredNotes.map((note) => (
                  <div className={`rpt-note-item ${note.kind}`} key={note.id}>
                    <div>
                      <div className="rpt-note-meta">
                        <span className={`rpt-note-kind ${note.kind}`}>
                          <Icon
                            name={
                              note.kind === "quote"
                                ? "quote"
                                : note.kind === "idea"
                                  ? "bulb"
                                  : "note"
                            }
                            size={12}
                          />
                          {note.kind}
                        </span>
                        <button
                          type="button"
                          className="rpt-link"
                          onClick={() => setSelectedBookId(note.bookId)}
                        >
                          {note.bookTitle}
                        </button>
                        <span>Page {note.page}</span>
                      </div>
                      <p>{note.text}</p>
                      <small>
                        {note.createdAt
                          ? dateLabel(note.createdAt.slice(0, 10))
                          : ""}
                      </small>
                    </div>
                    <div className="rpt-row-actions">
                      <button
                        type="button"
                        className="rpt-icon-btn"
                        aria-label="Copy note"
                        title="Copy"
                        onClick={() => void copyText(note.text)}
                      >
                        <Icon name="copy" size={15} />
                      </button>
                      <button
                        type="button"
                        className="rpt-icon-btn rpt-danger"
                        aria-label="Delete note"
                        title="Delete"
                        onClick={() => deleteNote(note.bookId, note.id)}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Insights */}
        {activeTab === "insights" && (
          <section className="rpt-section">
            <div className="rpt-section-heading">
              <div>
                <h2>Your Reading Insights</h2>
                <p>A deeper look at your habits, pace and progress.</p>
              </div>
              <button
                type="button"
                className="rpt-btn rpt-btn-light"
                onClick={exportCsv}
                disabled={data.books.length === 0}
              >
                <Icon name="download" size={16} />
                Export CSV
              </button>
            </div>

            <div className="rpt-stat-detail-grid">
              <div className="rpt-stat-detail">
                <span>Total pages logged</span>
                <strong>{analytics.totalPages.toLocaleString()}</strong>
              </div>
              <div className="rpt-stat-detail">
                <span>Total reading time</span>
                <strong>{formatMinutes(analytics.totalMinutes)}</strong>
              </div>
              <div className="rpt-stat-detail">
                <span>Reading speed</span>
                <strong>
                  {analytics.speed > 0 ? `${Math.round(analytics.speed)} pg/hr` : "—"}
                </strong>
              </div>
              <div className="rpt-stat-detail">
                <span>Recent pace (14 days)</span>
                <strong>{analytics.globalPace.toFixed(1)} pg/day</strong>
              </div>
              <div className="rpt-stat-detail">
                <span>Average pages per session</span>
                <strong>
                  {analytics.sessionCount
                    ? Math.round(analytics.totalPages / analytics.sessionCount)
                    : 0}
                </strong>
              </div>
              <div className="rpt-stat-detail">
                <span>Average session length</span>
                <strong>
                  {analytics.sessionCount
                    ? formatMinutes(analytics.totalMinutes / analytics.sessionCount)
                    : "0 min"}
                </strong>
              </div>
              <div className="rpt-stat-detail">
                <span>Longest session</span>
                <strong>{formatMinutes(analytics.longestSession)}</strong>
              </div>
              <div className="rpt-stat-detail">
                <span>Best day</span>
                <strong>
                  {analytics.bestDayPages > 0
                    ? `${analytics.bestDayPages} pages`
                    : "—"}
                </strong>
                {analytics.bestDayDate && (
                  <small>{dateLabel(analytics.bestDayDate)}</small>
                )}
              </div>
            </div>

            <div className="rpt-chart-card">
              <div className="rpt-chart-heading">
                <div>
                  <h3>Pages read</h3>
                  <p>Based on your saved reading sessions.</p>
                </div>
                <div className="rpt-chart-side">
                  <div className="rpt-segment">
                    {[7, 30, 90].map((days) => (
                      <button
                        key={days}
                        type="button"
                        className={rangeDays === days ? "active text" : "text"}
                        onClick={() => setRangeDays(days)}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                  <span className="rpt-chart-total">
                    {rangeTotal.toLocaleString()} pages
                  </span>
                </div>
              </div>

              <div
                className={`rpt-week-chart ${rangeDays > 7 ? "dense" : ""}`}
                style={{
                  gridTemplateColumns: `repeat(${rangeDays}, minmax(0, 1fr))`,
                }}
              >
                {rangeSeries.map((day, index) => (
                  <div
                    className="rpt-chart-column"
                    key={day.date}
                    title={`${dateLabel(day.date)}: ${day.pages} pages`}
                  >
                    {rangeDays <= 30 && <strong>{day.pages || ""}</strong>}
                    <div className="rpt-chart-bar-area">
                      <div
                        className="rpt-chart-bar"
                        style={{
                          height: `${Math.max(
                            day.pages > 0 ? 5 : 0,
                            (day.pages / rangeMax) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span>
                      {rangeDays === 90
                        ? index % 15 === 0
                          ? shortDateLabel(day.date)
                          : ""
                        : rangeDays === 30
                          ? index % 5 === 0
                            ? day.label
                            : ""
                          : day.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rpt-chart-card">
              <div className="rpt-chart-heading">
                <div>
                  <h3>Reading activity</h3>
                  <p>
                    The last 18 weeks. Darker squares mean you got closer to or
                    beyond your daily goal.
                  </p>
                </div>
              </div>
              <Heatmap
                pagesByDate={analytics.pagesByDate}
                today={today}
                goal={data.dailyGoal}
              />
              <div className="rpt-heat-legend">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <i key={level} className={`rpt-heat l${level}`} />
                ))}
                <span>More</span>
              </div>
            </div>

            <div className="rpt-two-col">
              <div className="rpt-chart-card">
                <div className="rpt-chart-heading">
                  <div>
                    <h3>Library overview</h3>
                    <p>Books grouped by their current status.</p>
                  </div>
                </div>

                <div className="rpt-status-overview">
                  {STATUSES.map((status) => {
                    const count = statusCounts(status.value);
                    const percentage = data.books.length
                      ? (count / data.books.length) * 100
                      : 0;

                    return (
                      <div className="rpt-status-line" key={status.value}>
                        <div>
                          <span>{status.label}</span>
                          <strong>{count}</strong>
                        </div>
                        <div className="rpt-status-track">
                          <div
                            className={`rpt-status-fill ${status.value}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rpt-chart-card">
                <div className="rpt-chart-heading">
                  <div>
                    <h3>Favorite categories</h3>
                    <p>What you collect the most.</p>
                  </div>
                </div>

                {categorySlices.length === 0 ? (
                  <p className="rpt-muted rpt-pad">Add books to see this chart.</p>
                ) : (
                  <div className="rpt-donut-wrap">
                    <Donut slices={categorySlices} />
                    <ul className="rpt-legend">
                      {categorySlices.map((slice) => (
                        <li key={slice.label}>
                          <i style={{ background: slice.color }} />
                          <span>{slice.label}</span>
                          <strong>{slice.value}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="rpt-two-col">
              <div className="rpt-chart-card">
                <div className="rpt-chart-heading">
                  <div>
                    <h3>Books finished in {currentYear}</h3>
                    <p>Month by month.</p>
                  </div>
                  <span className="rpt-chart-total">
                    {completedThisYear} / {data.yearlyGoal}
                  </span>
                </div>

                <div className="rpt-month-chart">
                  {monthlyCompleted.map((count, index) => (
                    <div className="rpt-chart-column" key={index}>
                      <strong>{count || ""}</strong>
                      <div className="rpt-chart-bar-area short">
                        <div
                          className="rpt-chart-bar"
                          style={{
                            height: `${Math.max(
                              count > 0 ? 8 : 0,
                              (count / Math.max(1, ...monthlyCompleted)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span>
                        {new Date(2000, index, 1).toLocaleDateString(undefined, {
                          month: "narrow",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rpt-chart-card">
                <div className="rpt-chart-heading">
                  <div>
                    <h3>Your ratings</h3>
                    <p>
                      {ratingStats.rated > 0
                        ? `Average ${ratingStats.average.toFixed(1)} / 5 across ${ratingStats.rated} rated book${
                            ratingStats.rated === 1 ? "" : "s"
                          }.`
                        : "Rate your books to see the distribution."}
                    </p>
                  </div>
                </div>

                <div className="rpt-status-overview">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingStats.counts[star - 1];
                    const percentage = ratingStats.rated
                      ? (count / ratingStats.rated) * 100
                      : 0;

                    return (
                      <div className="rpt-status-line" key={star}>
                        <div>
                          <span>
                            {star} star{star === 1 ? "" : "s"}
                          </span>
                          <strong>{count}</strong>
                        </div>
                        <div className="rpt-status-track">
                          <div
                            className="rpt-status-fill rating"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rpt-chart-card">
              <div className="rpt-chart-heading">
                <div>
                  <h3>Achievements</h3>
                  <p>
                    {unlockedCount} of {achievements.length} unlocked. Keep
                    reading to earn them all.
                  </p>
                </div>
                <span className="rpt-chart-total">
                  <Icon name="trophy" size={14} /> {unlockedCount}
                </span>
              </div>

              <div className="rpt-badges">
                {achievements.map((item) => {
                  const unlocked = item.value >= item.target;
                  const percent = clamp(
                    Math.round((item.value / Math.max(1, item.target)) * 100),
                    0,
                    100
                  );

                  return (
                    <div
                      className={`rpt-badge ${unlocked ? "unlocked" : ""}`}
                      key={item.id}
                    >
                      <div className="rpt-badge-icon">
                        <Icon name={item.icon} size={18} />
                      </div>
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                        <div className="rpt-badge-track">
                          <div style={{ width: `${percent}%` }} />
                        </div>
                        <small>
                          {unlocked
                            ? "Unlocked"
                            : `${Math.min(item.value, item.target).toLocaleString()} / ${item.target.toLocaleString()}`}
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Book details */}
        {selectedBook && (
          <BookDetail
            key={selectedBook.id}
            book={selectedBook}
            today={today}
            estimate={estimateFinish(selectedBook)}
            onClose={() => setSelectedBookId(null)}
            onLog={() => openSessionForm(selectedBook.id)}
            onEdit={() => openEditBook(selectedBook)}
            onFavorite={() => toggleFavorite(selectedBook)}
            onRate={(rating) =>
              updateBook(selectedBook.id, (old) => ({
                ...old,
                rating: old.rating === rating ? 0 : rating,
                updatedAt: todayString(),
              }))
            }
            onReview={(review) =>
              updateBook(selectedBook.id, (old) => ({ ...old, review }))
            }
            onTarget={(targetDate) =>
              updateBook(selectedBook.id, (old) => ({ ...old, targetDate }))
            }
            onStatus={(status) => updateBookStatus(selectedBook, status)}
            onAddNote={(page, text, kind) =>
              addNote(selectedBook.id, page, text, kind)
            }
            onDeleteNote={(noteId) => deleteNote(selectedBook.id, noteId)}
            onEditSession={(session) => openEditSession(selectedBook.id, session)}
            onDeleteSession={(sessionId) =>
              deleteSession(selectedBook.id, sessionId)
            }
            onCopy={(text) => void copyText(text)}
            notify={notify}
          />
        )}

        {/* Add/edit book modal */}
        {showBookForm && (
          <Modal
            title={editingBookId ? "Edit Book" : "Add a New Book"}
            onClose={() => setShowBookForm(false)}
          >
            <form className="rpt-form" onSubmit={handleBookSubmit}>
              {!editingBookId && (
                <div className="rpt-online">
                  <div className="rpt-online-head">
                    <Icon name="sparkle" size={16} />
                    <strong>Quick fill from Open Library</strong>
                  </div>
                  <div className="rpt-online-search">
                    <input
                      value={onlineQuery}
                      onChange={(event) => setOnlineQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void searchOnline();
                        }
                      }}
                      placeholder="Search by title or author..."
                      aria-label="Search books online"
                    />
                    <button
                      type="button"
                      className="rpt-btn rpt-btn-primary"
                      disabled={onlineLoading}
                      onClick={() => void searchOnline()}
                    >
                      {onlineLoading ? "Searching..." : "Search"}
                    </button>
                  </div>
                  {onlineError && (
                    <p className="rpt-online-error">{onlineError}</p>
                  )}
                  {onlineResults.length > 0 && (
                    <div className="rpt-online-results">
                      {onlineResults.map((result) => (
                        <button
                          type="button"
                          key={result.key}
                          onClick={() => applyOnlineResult(result)}
                        >
                          <span className="rpt-online-cover">
                            {result.coverUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={result.coverUrl}
                                alt=""
                                loading="lazy"
                              />
                            ) : (
                              <Icon name="book" size={18} />
                            )}
                          </span>
                          <span className="rpt-online-info">
                            <strong>{result.title}</strong>
                            <small>
                              {[
                                result.author,
                                result.year ? String(result.year) : "",
                                result.pages ? `${result.pages} pages` : "",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </small>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Field label="Book title *">
                <input
                    required
                  value={bookForm.title}
                  onChange={(event) =>
                    setBookForm((old) => ({ ...old, title: event.target.value }))
                  }
                  placeholder="e.g. Atomic Habits"
                />
              </Field>

              <Field label="Author">
                <input
                  value={bookForm.author}
                  onChange={(event) =>
                    setBookForm((old) => ({ ...old, author: event.target.value }))
                  }
                  placeholder="Author's name"
                />
              </Field>

              <div className="rpt-form-row">
                <Field label="Category">
                  <select
                    value={bookForm.category}
                    onChange={(event) =>
                      setBookForm((old) => ({
                        ...old,
                        category: event.target.value,
                      }))
                    }
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Format">
                  <select
                    value={bookForm.format}
                    onChange={(event) =>
                      setBookForm((old) => ({
                        ...old,
                        format: event.target.value as BookFormat,
                      }))
                    }
                  >
                    {FORMATS.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="rpt-form-row">
                <Field label="Reading status">
                  <select
                    value={bookForm.status}
                    onChange={(event) =>
                      setBookForm((old) => ({
                        ...old,
                        status: event.target.value as ReadingStatus,
                      }))
                    }
                  >
                    {STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Finish by (optional)">
                  <input
                    type="date"
                    value={bookForm.targetDate}
                    onChange={(event) =>
                      setBookForm((old) => ({
                        ...old,
                        targetDate: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              <div className="rpt-form-row">
                <Field label="Total pages *">
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    required
                    value={bookForm.totalPages}
                    onChange={(event) =>
                      setBookForm((old) => ({
                        ...old,
                        totalPages: event.target.value,
                      }))
                    }
                    placeholder="320"
                  />
                </Field>

                <Field label="Current page">
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    value={bookForm.currentPage}
                    onChange={(event) =>
                      setBookForm((old) => ({
                        ...old,
                        currentPage: event.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </Field>
              </div>

              <Field label="Tags (comma separated)">
                <input
                  value={bookForm.tags}
                  onChange={(event) =>
                    setBookForm((old) => ({ ...old, tags: event.target.value }))
                  }
                  placeholder="e.g. habits, productivity, 2026 favorites"
                />
              </Field>

              <Field label="Book cover image URL (optional)">
                <input
                  type="url"
                  value={bookForm.coverUrl}
                  onChange={(event) =>
                    setBookForm((old) => ({
                      ...old,
                      coverUrl: event.target.value,
                    }))
                  }
                  placeholder="https://example.com/book-cover.jpg"
                />
                <small>
                  Use a direct HTTP or HTTPS image URL. Leave it empty to use a
                  generated cover.
                </small>
              </Field>

              <Field label="Your rating">
                <RatingPicker
                  value={bookForm.rating}
                  onChange={(rating) =>
                    setBookForm((old) => ({ ...old, rating }))
                  }
                />
              </Field>

              <Field label="Description (optional)">
                <textarea
                  rows={3}
                  value={bookForm.description}
                  onChange={(event) =>
                    setBookForm((old) => ({
                      ...old,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Add a short description or your reading goals..."
                />
              </Field>

              {bookError && (
                <div className="rpt-form-error" role="alert">
                  {bookError}
                </div>
              )}

              <div className="rpt-form-actions">
                <button
                  type="button"
                  className="rpt-btn rpt-btn-light"
                  onClick={() => setShowBookForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="rpt-btn rpt-btn-primary">
                  {editingBookId ? "Save Changes" : "Add Book"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Add / edit reading session modal */}
        {showSessionForm && (
          <Modal
            title={editingSessionId ? "Edit Reading Session" : "Log a Reading Session"}
            onClose={() => setShowSessionForm(false)}
          >
            <form className="rpt-form" onSubmit={handleSessionSubmit}>
              <Field label="Select book *">
                <select
                  required
                  disabled={!!editingSessionId}
                  value={sessionBookId}
                  onChange={(event) => setSessionBookId(event.target.value)}
                >
                  <option value="">Choose a book</option>
                  {data.books
                    .filter(
                      (book) =>
                        book.status !== "completed" || book.id === sessionBookId
                    )
                    .map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title} ({book.currentPage}/{book.totalPages})
                      </option>
                    ))}
                </select>
              </Field>

              {(() => {
                const book = data.books.find((item) => item.id === sessionBookId);
                if (!book) return null;

                const editing = editingSessionId
                  ? book.sessions.find((item) => item.id === editingSessionId)
                  : undefined;

                return (
                  <div className="rpt-session-hint">
                    <strong>{book.title}</strong>
                    <span>
                      {book.totalPages - book.currentPage + (editing?.pages ?? 0)}{" "}
                      pages available to log
                    </span>
                  </div>
                );
              })()}

              <div className="rpt-form-row">
                <Field label="Date *">
                  <input
                    type="date"
                    required
                    max={today}
                    value={sessionForm.date}
                    onChange={(event) =>
                      setSessionForm((old) => ({
                        ...old,
                        date: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Pages read *">
                  <input
                    type="number"
                    required
                    min="1"
                    value={sessionForm.pages}
                    onChange={(event) =>
                      setSessionForm((old) => ({
                        ...old,
                        pages: event.target.value,
                      }))
                    }
                    placeholder="15"
                  />
                </Field>
              </div>

              <Field label="Reading time (minutes) *">
                <input
                  type="number"
                  required
                  min="1"
                  max="1440"
                  value={sessionForm.minutes}
                  onChange={(event) =>
                    setSessionForm((old) => ({
                      ...old,
                      minutes: event.target.value,
                    }))
                  }
                  placeholder="30"
                />
                <div className="rpt-presets">
                  {MINUTE_PRESETS.map((minutes) => (
                    <button
                      type="button"
                      key={minutes}
                      className={
                        sessionForm.minutes === String(minutes) ? "active" : ""
                      }
                      onClick={() =>
                        setSessionForm((old) => ({
                          ...old,
                          minutes: String(minutes),
                        }))
                      }
                    >
                      {minutes}m
                    </button>
                  ))}
                  {Number(sessionForm.pages) > 0 &&
                    Number(sessionForm.minutes) > 0 && (
                      <span className="rpt-pace-preview">
                        ≈{" "}
                        {Math.round(
                          (Number(sessionForm.pages) /
                            Number(sessionForm.minutes)) *
                            60
                        )}{" "}
                        pages/hr
                      </span>
                    )}
                </div>
              </Field>

              <Field label="Session note (optional)">
                <textarea
                  rows={3}
                  value={sessionForm.note}
                  onChange={(event) =>
                    setSessionForm((old) => ({ ...old, note: event.target.value }))
                  }
                  placeholder="What did you read or learn today?"
                />
              </Field>

              {sessionError && (
                <div className="rpt-form-error" role="alert">
                  {sessionError}
                </div>
              )}

              <div className="rpt-form-actions">
                <button
                  type="button"
                  className="rpt-btn rpt-btn-light"
                  onClick={() => setShowSessionForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="rpt-btn rpt-btn-primary">
                  {editingSessionId ? "Save Changes" : "Save Session"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Import choice modal */}
        {pendingImport && (
          <Modal title="Import backup" onClose={() => setPendingImport(null)}>
            <div className="rpt-import">
              <p>
                <strong>{pendingImport.fileName}</strong> contains{" "}
                <strong>{pendingImport.data.books.length}</strong> book(s). How
                would you like to import them?
              </p>
              <div className="rpt-import-options">
                <button type="button" onClick={() => confirmImport("merge")}>
                  <strong>Merge with my library</strong>
                  <span>
                    Keeps your current books and adds only the new ones.
                    Duplicates (same title and author) are skipped.
                  </span>
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => confirmImport("replace")}
                >
                  <strong>Replace my library</strong>
                  <span>
                    Removes all current books, sessions and notes and uses this
                    backup instead.
                  </span>
                </button>
              </div>
              <div className="rpt-form-actions">
                <button
                  type="button"
                  className="rpt-btn rpt-btn-light"
                  onClick={() => setPendingImport(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}

        <div className="rpt-privacy">
          <Icon name="check" size={16} />
          <span>
            Your library is saved privately in this browser. Export a backup
            before clearing browser data or switching devices.
          </span>
        </div>

        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importBackup(file);
          }}
        />

        <div className="rpt-data-actions">
          <button type="button" onClick={() => importRef.current?.click()}>
            <Icon name="upload" size={15} />
            Import JSON backup
          </button>
          <button type="button" onClick={exportBackup}>
            <Icon name="download" size={15} />
            Export JSON backup
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={data.books.length === 0}
          >
            <Icon name="download" size={15} />
            Library CSV
          </button>
          <button
            type="button"
            onClick={exportSessionsCsv}
            disabled={allSessions.length === 0}
          >
            <Icon name="download" size={15} />
            Sessions CSV
          </button>
          <button
            type="button"
            onClick={exportNotesMarkdown}
            disabled={allNotes.length === 0}
          >
            <Icon name="download" size={15} />
            Notes (Markdown)
          </button>
        </div>

        {/* Floating reading timer */}
        <div className="rpt-timer">
          {timerOpen && (
            <div className="rpt-timer-panel" role="dialog" aria-label="Reading timer">
              <div className="rpt-timer-head">
                <strong>Reading timer</strong>
                <button
                  type="button"
                  className="rpt-icon-btn"
                  aria-label="Close timer"
                  onClick={() => setTimerOpen(false)}
                >
                  <Icon name="close" size={15} />
                </button>
              </div>

              {timer ? (
                <>
                  <div className="rpt-timer-book">
                    {timerBook ? timerBook.title : "Book removed"}
                  </div>
                  <div className={`rpt-timer-clock ${timer.running ? "live" : ""}`}>
                    {formatClock(timerElapsed)}
                  </div>
                  <div className="rpt-timer-actions">
                    <button
                      type="button"
                      className="rpt-btn rpt-btn-light"
                      onClick={toggleTimer}
                    >
                      <Icon name={timer.running ? "pause" : "play"} size={15} />
                      {timer.running ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      className="rpt-btn rpt-btn-primary"
                      onClick={finishTimer}
                    >
                      <Icon name="stop" size={15} />
                      Finish & log
                    </button>
                  </div>
                  <button
                    type="button"
                    className="rpt-link rpt-timer-discard"
                    onClick={discardTimer}
                  >
                    Discard timer
                  </button>
                </>
              ) : timerCandidates.length === 0 ? (
                <p className="rpt-muted">
                  Add a book you haven&apos;t finished to use the timer.
                </p>
              ) : (
                <>
                  <label htmlFor="rpt-timer-book" className="rpt-timer-label">
                    What are you reading?
                  </label>
                  <select
                    id="rpt-timer-book"
                    value={
                      timerCandidates.some((book) => book.id === timerPick)
                        ? timerPick
                        : (
                            timerCandidates.find(
                              (book) => book.status === "currently-reading"
                            ) ?? timerCandidates[0]
                          ).id
                    }
                    onChange={(event) => setTimerPick(event.target.value)}
                  >
                    {timerCandidates.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rpt-btn rpt-btn-primary rpt-timer-start"
                    onClick={startTimer}
                  >
                    <Icon name="play" size={15} />
                    Start reading
                  </button>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            className={`rpt-timer-fab ${timer?.running ? "live" : ""}`}
            aria-label="Open reading timer"
            onClick={() => setTimerOpen((open) => !open)}
          >
            <Icon name="clock" size={18} />
            {timer ? formatClock(timerElapsed) : "Timer"}
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="rpt-toast" role="status" key={toast.id}>
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="rpt-toast-action"
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              className="rpt-toast-close"
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
      </div>

      <ReadingStyles />
    </ToolShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Book detail                                                                */
/* -------------------------------------------------------------------------- */

function BookDetail({
  book,
  today,
  estimate,
  onClose,
  onLog,
  onEdit,
  onFavorite,
  onRate,
  onReview,
  onTarget,
  onStatus,
  onAddNote,
  onDeleteNote,
  onEditSession,
  onDeleteSession,
  onCopy,
  notify,
}: {
  book: Book;
  today: string;
  estimate: Estimate | null;
  onClose: () => void;
  onLog: () => void;
  onEdit: () => void;
  onFavorite: () => void;
  onRate: (rating: number) => void;
  onReview: (review: string) => void;
  onTarget: (date: string) => void;
  onStatus: (status: ReadingStatus) => void;
  onAddNote: (page: number, text: string, kind: NoteKind) => void;
  onDeleteNote: (noteId: string) => void;
  onEditSession: (session: ReadingSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onCopy: (text: string) => void;
  notify: (message: string) => void;
}) {
  const [noteText, setNoteText] = useState("");
  const [notePage, setNotePage] = useState(String(Math.max(1, book.currentPage)));
  const [noteKind, setNoteKind] = useState<NoteKind>("note");
  const [review, setReview] = useState(book.review);

  const remaining = book.totalPages - book.currentPage;
  const bookMinutes = book.sessions.reduce((sum, item) => sum + item.minutes, 0);
  const bookPages = book.sessions.reduce((sum, item) => sum + item.pages, 0);

  const daysLeft = book.targetDate ? daysBetween(today, book.targetDate) + 1 : null;
  const requiredPace =
    daysLeft !== null && daysLeft > 0 && remaining > 0
      ? Math.ceil(remaining / daysLeft)
      : null;

  const sessions = [...book.sessions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
  );

  function submitNote() {
    const text = noteText.trim();
    const page = Number(notePage);

    if (!text) {
      notify("Write a note before saving.");
      return;
    }

    if (!Number.isInteger(page) || page < 0 || page > book.totalPages) {
      notify("Enter a valid page number for this note.");
      return;
    }

    onAddNote(page, text, noteKind);
    setNoteText("");
    setNotePage(String(Math.max(1, book.currentPage)));
  }

  return (
    <Modal title={book.title} onClose={onClose} wide>
      <div className="rpt-detail">
        <div className="rpt-detail-top">
          <BookCover book={book} large />
          <div className="rpt-detail-info">
            <div className="rpt-detail-tags">
              <span className="rpt-category">{book.category}</span>
              <span className="rpt-format">{formatLabel(book.format)}</span>
            </div>
            <h3>{book.title}</h3>
            <p>{book.author || "Author not specified"}</p>

            <div className="rpt-detail-badges">
              <StatusBadge status={book.status} />
              {book.tags.map((tag) => (
                <span className="rpt-tag" key={tag}>
                  #{tag}
                </span>
              ))}
            </div>

            <div className="rpt-detail-progress">
              <div>
                <strong>{getProgress(book)}%</strong>
                <span>
                  {book.currentPage} of {book.totalPages} pages
                </span>
              </div>
              <ProgressBar value={getProgress(book)} />
            </div>

            <div className="rpt-detail-actions">
              <button
                type="button"
                className="rpt-btn rpt-btn-primary"
                disabled={book.status === "completed"}
                onClick={onLog}
              >
                <Icon name="plus" size={16} />
                Log Reading
              </button>
              <button
                type="button"
                className="rpt-btn rpt-btn-light"
                onClick={onEdit}
              >
                <Icon name="edit" size={16} />
                Edit
              </button>
              <button
                type="button"
                className={`rpt-btn rpt-btn-light rpt-fav ${book.favorite ? "active" : ""}`}
                aria-pressed={book.favorite}
                onClick={onFavorite}
              >
                <Icon
                  name="heart"
                  size={16}
                  fill={book.favorite ? "currentColor" : "none"}
                />
                {book.favorite ? "Favorite" : "Favorite"}
              </button>
            </div>
          </div>
        </div>

        {book.description && (
          <div className="rpt-detail-block">
            <h4>About this book</h4>
            <p>{book.description}</p>
          </div>
        )}

        <div className="rpt-detail-block">
          <h4>Reading plan</h4>
          <div className="rpt-plan">
            <div className="rpt-plan-item">
              <span>Status</span>
              <select
                aria-label="Change status"
                value={book.status}
                onChange={(event) => onStatus(event.target.value as ReadingStatus)}
              >
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rpt-plan-item">
              <span>Finish by</span>
              <input
                type="date"
                aria-label="Target finish date"
                value={book.targetDate}
                onChange={(event) => onTarget(event.target.value)}
              />
            </div>
            <div className="rpt-plan-item">
              <span>Pace needed</span>
              <strong>
                {book.status === "completed"
                  ? "Finished"
                  : requiredPace !== null
                    ? `${requiredPace} pages/day`
                    : daysLeft !== null && daysLeft <= 0 && remaining > 0
                      ? "Past due date"
                      : "Set a date"}
              </strong>
            </div>
            <div className="rpt-plan-item">
              <span>Estimated finish</span>
              <strong>
                {book.status === "completed"
                  ? dateLabel(book.completedAt)
                  : estimate
                    ? `${dateLabel(estimate.date)}`
                    : "Log sessions to estimate"}
              </strong>
              {estimate && (
                <small>
                  {estimate.days} day{estimate.days === 1 ? "" : "s"} at{" "}
                  {estimate.pace.toFixed(1)} pages/day
                  {estimate.personal ? "" : " (your overall pace)"}
                </small>
              )}
            </div>
          </div>
        </div>

        <div className="rpt-detail-block">
          <h4>Reading details</h4>
          <div className="rpt-detail-meta">
            <span>
              Started: <strong>{dateLabel(book.startedAt)}</strong>
            </span>
            <span>
              Completed: <strong>{dateLabel(book.completedAt)}</strong>
            </span>
            <span>
              Sessions: <strong>{book.sessions.length}</strong>
            </span>
            <span>
              Time read: <strong>{formatMinutes(bookMinutes)}</strong>
            </span>
            <span>
              Speed:{" "}
              <strong>
                {bookMinutes > 0
                  ? `${Math.round((bookPages / bookMinutes) * 60)} pages/hr`
                  : "—"}
              </strong>
            </span>
            <span>
              Pages left: <strong>{Math.max(0, remaining)}</strong>
            </span>
          </div>
        </div>

        <div className="rpt-detail-block">
          <h4>Your rating & review</h4>
          <RatingPicker value={book.rating} onChange={onRate} />
          <textarea
            className="rpt-review"
            rows={3}
            placeholder="Write a short review or what this book meant to you..."
            value={review}
            onChange={(event) => setReview(event.target.value)}
            onBlur={() => {
              if (review !== book.review) onReview(review.trim());
            }}
          />
        </div>

        <div className="rpt-detail-block">
          <h4>Notes, quotes & ideas</h4>
          <div className="rpt-note-form">
            <div className="rpt-note-page">
              <label htmlFor="rpt-note-page">Page</label>
              <input
                id="rpt-note-page"
                type="number"
                min="0"
                max={book.totalPages}
                value={notePage}
                onChange={(event) => setNotePage(event.target.value)}
              />
            </div>
            <div className="rpt-note-page">
              <label htmlFor="rpt-note-kind">Type</label>
              <select
                id="rpt-note-kind"
                value={noteKind}
                onChange={(event) => setNoteKind(event.target.value as NoteKind)}
              >
                {NOTE_KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rpt-note-text">
              <label htmlFor="rpt-note-text">Your note or highlight</label>
              <textarea
                id="rpt-note-text"
                rows={2}
                placeholder="Write an idea, quote, or thought..."
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="rpt-btn rpt-btn-primary"
              onClick={submitNote}
            >
              Save
            </button>
          </div>

          {book.notes.length === 0 ? (
            <p className="rpt-muted rpt-pad">
              No notes yet. Add your first note above.
            </p>
          ) : (
            <div className="rpt-notes-list">
              {[...book.notes]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((note) => (
                  <div className={`rpt-note-item ${note.kind}`} key={note.id}>
                    <div>
                      <div className="rpt-note-meta">
                        <span className={`rpt-note-kind ${note.kind}`}>
                          {note.kind}
                        </span>
                        <span>Page {note.page}</span>
                      </div>
                      <p>{note.text}</p>
                      <small>
                        {note.createdAt
                          ? dateLabel(note.createdAt.slice(0, 10))
                          : ""}
                      </small>
                    </div>
                    <div className="rpt-row-actions">
                      <button
                        type="button"
                        className="rpt-icon-btn"
                        aria-label="Copy note"
                        onClick={() => onCopy(note.text)}
                      >
                        <Icon name="copy" size={14} />
                      </button>
                      <button
                        type="button"
                        className="rpt-icon-btn rpt-danger"
                        aria-label="Delete note"
                        onClick={() => onDeleteNote(note.id)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="rpt-detail-block">
          <h4>Sessions for this book</h4>
          {sessions.length === 0 ? (
            <p className="rpt-muted">
              No sessions logged yet. Use &ldquo;Log Reading&rdquo; to add one.
            </p>
          ) : (
            <div className="rpt-mini-sessions">
              {sessions.slice(0, 6).map((session) => (
                <div key={session.id} className="rpt-mini-session">
                  <div>
                    <strong>{dateLabel(session.date)}</strong>
                    <span>
                      {session.pages} pages · {formatMinutes(session.minutes)}
                      {session.note ? ` · ${session.note}` : ""}
                    </span>
                  </div>
                  <div className="rpt-row-actions">
                    <button
                      type="button"
                      className="rpt-icon-btn"
                      aria-label="Edit session"
                      onClick={() => onEditSession(session)}
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      type="button"
                      className="rpt-icon-btn rpt-danger"
                      aria-label="Delete session"
                      onClick={() => onDeleteSession(session.id)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {sessions.length > 6 && (
                <p className="rpt-muted">
                  Showing the latest 6 of {sessions.length} sessions. See all in
                  the Sessions tab.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Small Components                                                           */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon,
  label,
  value,
  detail,
  highlight = false,
}: {
  icon: string;
  label: string;
  value: string | number;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rpt-stat-card ${highlight ? "highlight" : ""}`}>
      <div className="rpt-stat-icon">
        <Icon name={icon} size={20} />
      </div>
      <div className="rpt-stat-value">{value}</div>
      <div className="rpt-stat-label">{label}</div>
      <div className="rpt-stat-sub">{detail}</div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="rpt-progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    >
      <div style={{ width: `${value}%` }} />
    </div>
  );
}

function StatusBadge({ status }: { status: ReadingStatus }) {
  return (
    <span className={`rpt-status-badge ${status}`}>{statusLabel(status)}</span>
  );
}

function Ring({
  value,
  size = 104,
  stroke = 10,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = clamp(value, 0, 100);

  return (
    <div className="rpt-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle
          className="rpt-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="rpt-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="rpt-ring-center">{children}</div>
    </div>
  );
}

function Donut({
  slices,
}: {
  slices: { label: string; value: number; color: string }[];
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg
      viewBox="0 0 120 120"
      className="rpt-donut"
      role="img"
      aria-label="Books by category"
    >
      <circle
        className="rpt-ring-track"
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        strokeWidth="16"
      />
      {total > 0 &&
        slices.map((slice) => {
          const length = (slice.value / total) * circumference;
          const element = (
            <circle
              key={slice.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="16"
              strokeDasharray={`${Math.max(0, length - 1.5)} ${circumference - Math.max(0, length - 1.5)}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );

          offset += length;
          return element;
        })}
      <text
        x="60"
        y="58"
        textAnchor="middle"
        className="rpt-donut-total"
      >
        {total}
      </text>
      <text x="60" y="73" textAnchor="middle" className="rpt-donut-label">
        books
      </text>
    </svg>
  );
}

function Heatmap({
  pagesByDate,
  today,
  goal,
  weeks = 18,
}: {
  pagesByDate: Map<string, number>;
  today: string;
  goal: number;
  weeks?: number;
}) {
  const cells = useMemo(() => {
    const dayOfWeek = parseDate(today).getDay();
    const start = addDays(today, -dayOfWeek - (weeks - 1) * 7);

    return Array.from({ length: weeks * 7 }, (_, index) => {
      const date = addDays(start, index);
      const future = date > today;
      const pages = pagesByDate.get(date) ?? 0;
      let level = 0;

      if (!future && pages > 0) {
        const ratio = pages / Math.max(1, goal);
        level = ratio < 0.5 ? 1 : ratio < 1 ? 2 : ratio < 1.5 ? 3 : 4;
      }

      return { date, future, pages, level };
    });
  }, [pagesByDate, today, goal, weeks]);

  return (
    <div className="rpt-heatmap-scroll">
      <div
        className="rpt-heatmap"
        style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}
      >
        {cells.map((cell) => (
          <div
            key={cell.date}
            className={`rpt-heat l${cell.level} ${cell.future ? "future" : ""}`}
            title={
              cell.future
                ? ""
                : `${dateLabel(cell.date)}: ${cell.pages} page${cell.pages === 1 ? "" : "s"}`
            }
          />
        ))}
      </div>
    </div>
  );
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span
      className="rpt-stars"
      role="img"
      aria-label={`Rated ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={value >= star ? "on" : ""}>
          <Icon
            name="star"
            size={size}
            fill={value >= star ? "currentColor" : "none"}
          />
        </span>
      ))}
    </span>
  );
}

function RatingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="rpt-rating-picker">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type="button"
          key={star}
          aria-label={`Rate ${star} out of 5`}
          aria-pressed={value === star}
          className={value >= star ? "selected" : ""}
          onClick={() => onChange(value === star ? 0 : star)}
        >
          <Icon name="star" size={22} />
        </button>
      ))}
      <span>{value ? `${value}/5` : "Not rated"}</span>
    </div>
  );
}

function BookCover({
  book,
  large = false,
}: {
  book: Book;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [book.coverUrl]);

  return (
    <div className={`rpt-cover ${large ? "large" : ""}`}>
      {book.coverUrl && !failed ? (
        // External image URLs are user supplied; failed images fall back to a generated cover.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverUrl}
          alt={`Cover of ${book.title}`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="rpt-cover-placeholder">
          <Icon name="bookOpen" size={large ? 38 : 28} />
          <span>{book.title.slice(0, 30)}</span>
        </div>
      )}
    </div>
  );
}

function PageInput({
  id,
  value,
  max,
  onCommit,
}: {
  id: string;
  value: number;
  max: number;
  onCommit: (page: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit() {
    const parsed = Number(draft);

    if (draft.trim() === "" || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }

    const next = clamp(Math.floor(parsed), 0, max);

    setDraft(String(next));
    if (next !== value) onCommit(next);
  }

  return (
    <input
      id={id}
      type="number"
      min="0"
      max={max}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
          (event.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

function BookCard({
  book,
  view,
  estimate,
  today,
  onEdit,
  onDelete,
  onOpen,
  onLog,
  onFavorite,
  onStatusChange,
  onPageChange,
}: {
  book: Book;
  view: ViewMode;
  estimate: Estimate | null;
  today: string;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
  onLog: () => void;
  onFavorite: () => void;
  onStatusChange: (status: ReadingStatus) => void;
  onPageChange: (page: number) => void;
}) {
  const progress = getProgress(book);
  const overdue =
    !!book.targetDate && book.status !== "completed" && book.targetDate < today;

  return (
    <article className={`rpt-book-card ${view}`}>
      <button
        type="button"
        className={`rpt-fav-btn ${book.favorite ? "active" : ""}`}
        aria-label={
          book.favorite
            ? `Remove ${book.title} from favorites`
            : `Add ${book.title} to favorites`
        }
        aria-pressed={book.favorite}
        onClick={onFavorite}
      >
        <Icon
          name="heart"
          size={16}
          fill={book.favorite ? "currentColor" : "none"}
        />
      </button>

      <button
        type="button"
        className="rpt-book-main"
        onClick={onOpen}
        aria-label={`View details for ${book.title}`}
      >
        <BookCover book={book} />
        <div className="rpt-book-info">
          <span className="rpt-category">
            {book.category} · {formatLabel(book.format)}
          </span>
          <h3>{book.title}</h3>
          <p>{book.author || "Author not specified"}</p>
          <div className="rpt-card-badges">
            <StatusBadge status={book.status} />
            {book.rating > 0 && <Stars value={book.rating} size={12} />}
          </div>
          {book.tags.length > 0 && (
            <div className="rpt-card-tags">
              {book.tags.slice(0, 3).map((tag) => (
                <span className="rpt-tag" key={tag}>
                  #{tag}
                </span>
              ))}
              {book.tags.length > 3 && (
                <span className="rpt-tag">+{book.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </button>

      <div className="rpt-book-progress">
        <div className="rpt-book-progress-label">
          <span>Reading progress</span>
          <strong>{progress}%</strong>
        </div>
        <ProgressBar value={progress} />
        <div className="rpt-page-count">
          <span>
            {book.currentPage} of {book.totalPages} pages
          </span>
          <span>{book.totalPages - book.currentPage} left</span>
        </div>
        {book.status !== "completed" && (estimate || book.targetDate) && (
          <div className={`rpt-eta ${overdue ? "overdue" : ""}`}>
            <Icon name="calendar" size={12} />
            {overdue
              ? `Past due (${shortDateLabel(book.targetDate)})`
              : book.targetDate
                ? `Finish by ${shortDateLabel(book.targetDate)}`
                : estimate
                  ? `Done ~${shortDateLabel(estimate.date)}`
                  : ""}
          </div>
        )}
      </div>

      {book.status !== "completed" ? (
        <div className="rpt-page-update">
          <label htmlFor={`page-${book.id}`}>Update current page</label>
          <div>
            <PageInput
              id={`page-${book.id}`}
              value={book.currentPage}
              max={book.totalPages}
              onCommit={onPageChange}
            />
            <button type="button" onClick={onLog}>
              Log session
            </button>
            {book.status !== "currently-reading" && (
              <button
                type="button"
                onClick={() => onStatusChange("currently-reading")}
              >
                Start
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rpt-page-update rpt-finished">
          <span>
            <Icon name="check" size={14} /> Finished{" "}
            {book.completedAt ? dateLabel(book.completedAt) : ""}
          </span>
        </div>
      )}

      <div className="rpt-book-footer">
        <span>
          {book.sessions.length}{" "}
          {book.sessions.length === 1 ? "session" : "sessions"}
        </span>
        <div>
          <button
            type="button"
            className="rpt-icon-btn"
            title="Edit book"
            aria-label={`Edit ${book.title}`}
            onClick={onEdit}
          >
            <Icon name="edit" size={16} />
          </button>
          <button
            type="button"
            className="rpt-icon-btn rpt-danger"
            title="Delete book"
            aria-label={`Delete ${book.title}`}
            onClick={onDelete}
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rpt-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

const modalStack: string[] = [];
let originalBodyOverflow = "";
let originalBodyPadding = "";

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const idRef = useRef(createId());
  const closeRef = useRef(onClose);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<string | null>(null);

  /* Read the theme from the surrounding tracker so the portal can reuse it */
  useLayoutEffect(() => {
    const host = anchorRef.current?.closest(".rpt");
    setTheme(host?.getAttribute("data-theme") ?? "light");
  }, []);

  /* Focus the dialog without scrolling the page, and restore focus on close */
  useEffect(() => {
    if (theme === null) return;

    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus({ preventScroll: true });

    return () => {
      previous?.focus?.({ preventScroll: true });
    };
  }, [theme]);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const id = idRef.current;

    if (modalStack.length === 0) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      originalBodyOverflow = document.body.style.overflow;
      originalBodyPadding = document.body.style.paddingRight;
      document.body.style.overflow = "hidden";

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    modalStack.push(id);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && modalStack[modalStack.length - 1] === id) {
        closeRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);

      const index = modalStack.indexOf(id);
      if (index >= 0) modalStack.splice(index, 1);

      if (modalStack.length === 0) {
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.paddingRight = originalBodyPadding;
      }
    };
  }, []);

  return (
    <>
      <span ref={anchorRef} hidden />
      {theme !== null &&
        createPortal(
          <div className="rpt rpt-portal" data-theme={theme}>
            <div
              className="rpt-modal-backdrop"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
              }}
            >
              <div
                ref={dialogRef}
                tabIndex={-1}
                className={`rpt-modal ${wide ? "wide" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-label={title}
              >
        <div className="rpt-modal-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="rpt-icon-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <Icon name="close" size={19} />
          </button>
        </div>
                <div className="rpt-modal-content">{children}</div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

function ReadingStyles() {
  return (
    <style jsx global>{`
      .rpt {
        --rpt-orange: #ff5a1f;
        --rpt-orange-dark: #e94b13;
        --rpt-accent-soft: #fff0e9;
        --rpt-accent-border: #ffd7c7;
        --rpt-ink: #20242d;
        --rpt-muted: #737b89;
        --rpt-border: #e9eaf0;
        --rpt-bg: #f7f8fa;
        --rpt-card: #ffffff;
        --rpt-card-2: #fbfbfc;
        --rpt-hover: #f6f7f9;
        --rpt-input: #ffffff;
        --rpt-track: #f0f1f4;
        --rpt-shadow: 0 3px 14px rgba(25, 32, 45, 0.04);
        --rpt-goal-bg: linear-gradient(115deg, #fff7f2, #fffdfb);
        --rpt-goal-border: #f2d8cb;
        --rpt-goal-label: #a45b3d;
        --rpt-goal-text: #856c60;
        --rpt-note-bg: #fffaf7;
        --rpt-note-border: #f5e5dc;
        --rpt-heat-0: #eef0f4;
        --rpt-heat-1: #ffd9c9;
        --rpt-heat-2: #ffb08c;
        --rpt-heat-3: #ff824f;
        --rpt-heat-4: #e94b13;
        color: var(--rpt-ink);
        width: 100%;
        font-size: 14px;
        position: relative;
      }

      .rpt[data-theme="dark"] {
        --rpt-orange: #ff6a33;
        --rpt-orange-dark: #ff7f50;
        --rpt-accent-soft: #3a2218;
        --rpt-accent-border: #5b3524;
        --rpt-ink: #eceef4;
        --rpt-muted: #9aa3b5;
        --rpt-border: #272d3e;
        --rpt-bg: #0f1320;
        --rpt-card: #161b2b;
        --rpt-card-2: #1a2032;
        --rpt-hover: #20273b;
        --rpt-input: #111627;
        --rpt-track: #252c40;
        --rpt-shadow: 0 3px 18px rgba(0, 0, 0, 0.3);
        --rpt-goal-bg: linear-gradient(115deg, #231c1d, #181c2c);
        --rpt-goal-border: #4a3228;
        --rpt-goal-label: #e0906f;
        --rpt-goal-text: #b79b8d;
        --rpt-note-bg: #1c2133;
        --rpt-note-border: #2c3349;
        --rpt-heat-0: #212839;
        --rpt-heat-1: #5a3123;
        --rpt-heat-2: #94462a;
        --rpt-heat-3: #d4592a;
        --rpt-heat-4: #ff7a45;
        background: var(--rpt-bg);
        padding: 22px;
        border-radius: 20px;
        color-scheme: dark;
      }

      .rpt * {
        box-sizing: border-box;
      }

      .rpt button {
        font-family: inherit;
      }

      .rpt kbd {
        display: inline-block;
        min-width: 18px;
        padding: 1px 5px;
        border: 1px solid var(--rpt-border);
        border-bottom-width: 2px;
        border-radius: 5px;
        background: var(--rpt-card-2);
        color: var(--rpt-ink);
        font-family: inherit;
        font-size: 10px;
        font-weight: 700;
        text-align: center;
      }

      .rpt-loading {
        min-height: 300px;
        display: grid;
        place-content: center;
        justify-items: center;
        color: #737b89;
        gap: 14px;
      }

      .rpt-spinner {
        width: 34px;
        height: 34px;
        border: 3px solid #ffe0d5;
        border-top-color: #ff5a1f;
        border-radius: 50%;
        animation: rpt-spin 0.8s linear infinite;
      }

      @keyframes rpt-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes rpt-pop {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }

      @keyframes rpt-pulse {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(255, 90, 31, 0.45);
        }
        50% {
          box-shadow: 0 0 0 9px rgba(255, 90, 31, 0);
        }
      }

      .rpt-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 22px;
        margin-bottom: 24px;
      }

      .rpt-eyebrow {
        display: flex;
        align-items: center;
        gap: 7px;
        color: var(--rpt-orange);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1.1px;
        margin-bottom: 10px;
      }

      .rpt-header h1 {
        margin: 0;
        font-size: clamp(25px, 3.2vw, 35px);
        line-height: 1.15;
        letter-spacing: -1.2px;
        font-weight: 800;
        color: var(--rpt-ink);
      }

      .rpt-header p {
        color: var(--rpt-muted);
        margin: 9px 0 0;
        line-height: 1.6;
        max-width: 620px;
      }

      .rpt-header-actions {
        display: flex;
        align-items: center;
        gap: 9px;
        flex-shrink: 0;
      }

      .rpt-theme-btn {
        width: 41px;
        height: 41px;
        border-radius: 10px;
      }

      .rpt-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 1px solid transparent;
        border-radius: 10px;
        padding: 10px 15px;
        min-height: 41px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: 0.2s ease;
        white-space: nowrap;
      }

      .rpt-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .rpt-btn-primary {
        color: white;
        background: var(--rpt-orange);
        box-shadow: 0 4px 14px rgba(255, 90, 31, 0.22);
      }

      .rpt-btn-primary:hover:not(:disabled) {
        background: var(--rpt-orange-dark);
        transform: translateY(-1px);
      }

      .rpt-btn-light {
        background: var(--rpt-card);
        color: var(--rpt-ink);
        border-color: var(--rpt-border);
      }

      .rpt-btn-light:hover:not(:disabled) {
        border-color: var(--rpt-accent-border);
        background: var(--rpt-accent-soft);
      }

      .rpt-btn.rpt-fav.active {
        color: #e5484d;
        border-color: #f5c1c3;
      }

      .rpt-link {
        border: 0;
        background: transparent;
        padding: 0;
        color: var(--rpt-orange);
        font-weight: 700;
        font-size: inherit;
        cursor: pointer;
        text-align: left;
      }

      .rpt-link:hover {
        text-decoration: underline;
      }

      .rpt-toast {
        position: fixed;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%);
        z-index: 10100;
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: min(92vw, 520px);
        padding: 12px 14px;
        border-radius: 12px;
        background: #1d2230;
        color: #f2f4f8;
        font-size: 13px;
        box-shadow: 0 14px 40px rgba(0, 0, 0, 0.28);
        animation: rpt-pop 0.2s ease;
      }

      .rpt-toast-action {
        border: 0;
        background: transparent;
        color: #ff9a73;
        font-weight: 800;
        font-size: 13px;
        cursor: pointer;
      }

      .rpt-toast-close {
        display: grid;
        place-items: center;
        border: 0;
        background: transparent;
        color: #9aa3b5;
        cursor: pointer;
      }

      .rpt-stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 13px;
        margin-bottom: 17px;
      }

      .rpt-stat-card {
        background: var(--rpt-card);
        border: 1px solid var(--rpt-border);
        border-radius: 14px;
        padding: 17px;
        min-width: 0;
        box-shadow: var(--rpt-shadow);
      }

      .rpt-stat-card.highlight {
        border-color: var(--rpt-accent-border);
        background: linear-gradient(135deg, var(--rpt-card), var(--rpt-accent-soft));
      }

      .rpt-stat-icon {
        width: 35px;
        height: 35px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        background: var(--rpt-accent-soft);
        color: var(--rpt-orange);
        margin-bottom: 12px;
      }

      .rpt-stat-value {
        font-size: 27px;
        font-weight: 800;
        letter-spacing: -0.7px;
        line-height: 1.2;
        overflow-wrap: anywhere;
      }

      .rpt-stat-label {
        font-size: 13px;
        font-weight: 700;
        margin-top: 5px;
      }

      .rpt-stat-sub {
        font-size: 11px;
        color: var(--rpt-muted);
        margin-top: 4px;
      }

      .rpt-goals {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 22px;
      }

      .rpt-goal-panel {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 20px;
        border: 1px solid var(--rpt-goal-border);
        border-radius: 15px;
        background: var(--rpt-goal-bg);
        min-width: 0;
      }

      .rpt-goal-yearly {
        border-color: var(--rpt-border);
        background: var(--rpt-card);
      }

      .rpt-ring {
        position: relative;
        flex-shrink: 0;
      }

      .rpt-ring svg {
        display: block;
      }

      .rpt-ring-track {
        stroke: var(--rpt-track);
        fill: none;
      }

      .rpt-ring-fill {
        stroke: var(--rpt-orange);
        transition: stroke-dashoffset 0.5s ease;
      }

      .rpt-ring-center {
        position: absolute;
        inset: 0;
        display: grid;
        place-content: center;
        justify-items: center;
        text-align: center;
      }

      .rpt-ring-center strong {
        font-size: 21px;
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -0.5px;
      }

      .rpt-ring-center span {
        font-size: 10px;
        color: var(--rpt-muted);
        margin-top: 2px;
      }

      .rpt-goal-copy {
        min-width: 0;
        flex: 1;
      }

      .rpt-small-label {
        display: block;
        font-size: 10px;
        font-weight: 800;
        color: var(--rpt-goal-label);
        letter-spacing: 0.8px;
        margin-bottom: 5px;
      }

      .rpt-goal-yearly .rpt-small-label {
        color: var(--rpt-muted);
      }

      .rpt-goal-copy h2 {
        margin: 0;
        font-size: 21px;
        font-weight: 800;
        color: var(--rpt-ink);
      }

      .rpt-goal-copy h2 span {
        color: var(--rpt-muted);
        font-size: 13px;
        font-weight: 600;
      }

      .rpt-goal-copy p {
        color: var(--rpt-goal-text);
        font-size: 12px;
        margin: 5px 0 11px;
        line-height: 1.5;
      }

      .rpt-goal-yearly .rpt-goal-copy p {
        color: var(--rpt-muted);
      }

      .rpt-goal-input {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--rpt-border);
        border-radius: 9px;
        background: var(--rpt-input);
        overflow: hidden;
        max-width: 100%;
      }

      .rpt-goal-input input {
        width: 58px;
        min-width: 0;
        border: 0;
        outline: 0;
        padding: 8px 7px 8px 10px;
        font-weight: 700;
        background: transparent;
        color: var(--rpt-ink);
        font-size: 13px;
      }

      .rpt-goal-input span {
        font-size: 11px;
        color: var(--rpt-muted);
        padding-right: 8px;
        white-space: nowrap;
      }

      .rpt-goal-input button {
        align-self: stretch;
        padding: 0 12px;
        background: var(--rpt-orange);
        color: white;
        border: 0;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
      }

      .rpt-tabs {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px;
        border: 1px solid var(--rpt-border);
        background: var(--rpt-card-2);
        border-radius: 12px;
        margin-bottom: 20px;
        overflow-x: auto;
      }

      .rpt-tabs button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        white-space: nowrap;
        border: 0;
        border-radius: 8px;
        padding: 10px 15px;
        background: transparent;
        color: var(--rpt-muted);
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        flex: 1 0 auto;
      }

      .rpt-tabs button.active {
        background: var(--rpt-card);
        color: var(--rpt-orange);
        box-shadow: 0 1px 6px rgba(20, 30, 40, 0.1);
      }

      .rpt-tab-count {
        font-style: normal;
        min-width: 20px;
        padding: 1px 6px;
        border-radius: 20px;
        background: var(--rpt-track);
        color: var(--rpt-muted);
        font-size: 10px;
      }

      .rpt-tabs button.active .rpt-tab-count {
        background: var(--rpt-accent-soft);
        color: var(--rpt-orange);
      }

      .rpt-section {
        background: var(--rpt-card);
        border: 1px solid var(--rpt-border);
        border-radius: 15px;
        padding: 21px;
        min-width: 0;
        box-shadow: var(--rpt-shadow);
      }

      .rpt-section-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        margin-bottom: 18px;
      }

      .rpt-heading-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }

      .rpt-section-heading h2 {
        font-size: 19px;
        font-weight: 800;
        margin: 0;
        letter-spacing: -0.4px;
        color: var(--rpt-ink);
      }

      .rpt-section-heading p {
        color: var(--rpt-muted);
        margin: 5px 0 0;
        font-size: 12px;
        line-height: 1.6;
      }

      .rpt-chips {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }

      .rpt-chips button {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        border: 1px solid var(--rpt-border);
        background: var(--rpt-card);
        color: var(--rpt-muted);
        border-radius: 30px;
        padding: 7px 13px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: 0.2s;
      }

      .rpt-chips button em {
        font-style: normal;
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 20px;
        background: var(--rpt-track);
      }

      .rpt-chips button:hover {
        border-color: var(--rpt-accent-border);
      }

      .rpt-chips button.active {
        background: var(--rpt-orange);
        border-color: var(--rpt-orange);
        color: white;
      }

      .rpt-chips button.active em {
        background: rgba(255, 255, 255, 0.25);
      }

      .rpt-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        margin-bottom: 18px;
      }

      .rpt-filters .rpt-search {
        flex: 1 1 240px;
      }

      .rpt-filters .rpt-filter-control {
        flex: 0 1 165px;
      }

      .rpt-notes-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }

      .rpt-notes-toolbar .rpt-search {
        flex: 1 1 240px;
      }

      .rpt-notes-toolbar .rpt-chips {
        margin: 0;
      }

      .rpt-search,
      .rpt-filter-control {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--rpt-border);
        border-radius: 9px;
        padding: 0 10px;
        min-height: 40px;
        color: var(--rpt-muted);
        background: var(--rpt-input);
      }

      .rpt-search:focus-within,
      .rpt-filter-control:focus-within {
        border-color: var(--rpt-orange);
        box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.1);
      }

      .rpt-search input {
        width: 100%;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--rpt-ink);
        font-size: 12px;
      }

      .rpt-filter-control select {
        width: 100%;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--rpt-ink);
        font-size: 12px;
        padding: 9px 0;
      }

      .rpt-filter-control select option {
        background: var(--rpt-card);
        color: var(--rpt-ink);
      }

      .rpt-toggle {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: 40px;
        padding: 0 13px;
        border: 1px solid var(--rpt-border);
        border-radius: 9px;
        background: var(--rpt-input);
        color: var(--rpt-muted);
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }

      .rpt-toggle.active {
        color: #e5484d;
        border-color: #f5c1c3;
        background: rgba(229, 72, 77, 0.08);
      }

      .rpt-segment {
        display: inline-flex;
        padding: 3px;
        border: 1px solid var(--rpt-border);
        border-radius: 9px;
        background: var(--rpt-card-2);
        gap: 2px;
      }

      .rpt-segment button {
        display: grid;
        place-items: center;
        min-width: 34px;
        height: 32px;
        padding: 0 8px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--rpt-muted);
        cursor: pointer;
      }

      .rpt-segment button.text {
        font-size: 11px;
        font-weight: 800;
      }

      .rpt-segment button.active {
        background: var(--rpt-card);
        color: var(--rpt-orange);
        box-shadow: 0 1px 5px rgba(20, 30, 40, 0.12);
      }

      .rpt-book-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .rpt-book-grid.list {
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .rpt-book-card {
        position: relative;
        min-width: 0;
        padding: 14px;
        border: 1px solid var(--rpt-border);
        border-radius: 12px;
        background: var(--rpt-card);
        transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
        animation: rpt-pop 0.25s ease both;
      }

      .rpt-book-card:hover {
        border-color: var(--rpt-accent-border);
        box-shadow: 0 8px 24px rgba(36, 37, 43, 0.08);
        transform: translateY(-1px);
      }

      .rpt-book-card.list {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr) auto;
        align-items: center;
        gap: 18px;
        padding-right: 52px;
      }

      .rpt-book-card.list .rpt-book-progress,
      .rpt-book-card.list .rpt-page-update,
      .rpt-book-card.list .rpt-book-footer {
        margin-top: 0;
      }

      .rpt-book-card.list .rpt-book-footer {
        border-top: 0;
        padding-top: 0;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
      }

      .rpt-fav-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 2;
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: var(--rpt-muted);
        cursor: pointer;
        transition: 0.2s;
      }

      .rpt-fav-btn:hover {
        background: rgba(229, 72, 77, 0.1);
        color: #e5484d;
      }

      .rpt-fav-btn.active {
        color: #e5484d;
      }

      .rpt-book-main {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        width: 100%;
        text-align: left;
        border: 0;
        background: transparent;
        padding: 0 26px 0 0;
        cursor: pointer;
        min-width: 0;
        color: inherit;
      }

      .rpt-cover {
        width: 68px;
        height: 94px;
        flex-shrink: 0;
        overflow: hidden;
        border-radius: 6px;
        background: var(--rpt-accent-soft);
        box-shadow: 1px 3px 9px rgba(30, 30, 30, 0.18);
      }

      .rpt-cover.large {
        width: 120px;
        height: 165px;
        border-radius: 9px;
      }

      .rpt-cover img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }

      .rpt-cover-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 8px;
        text-align: center;
        color: #d95b2b;
        background: linear-gradient(145deg, #fff1e9, #ffe0d1);
      }

      .rpt[data-theme="dark"] .rpt-cover-placeholder {
        background: linear-gradient(145deg, #3a2218, #2b1a18);
        color: #ff8f66;
      }

      .rpt-cover-placeholder span {
        font-size: 9px;
        font-weight: 800;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }

      .rpt-book-info {
        flex: 1;
        min-width: 0;
      }

      .rpt-category {
        color: #bd633f;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.2px;
      }

      .rpt[data-theme="dark"] .rpt-category {
        color: #ff9a73;
      }

      .rpt-format {
        color: var(--rpt-muted);
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 20px;
        background: var(--rpt-track);
      }

      .rpt-book-info h3 {
        margin: 6px 0 4px;
        font-size: 14px;
        font-weight: 800;
        line-height: 1.35;
        overflow-wrap: anywhere;
        color: var(--rpt-ink);
      }

      .rpt-book-info p {
        color: var(--rpt-muted);
        font-size: 11px;
        margin: 0 0 8px;
      }

      .rpt-card-badges {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }

      .rpt-card-tags,
      .rpt-detail-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 8px;
      }

      .rpt-detail-badges {
        margin-top: 0;
        align-items: center;
      }

      .rpt-tag {
        padding: 2px 8px;
        border-radius: 20px;
        background: var(--rpt-track);
        color: var(--rpt-muted);
        font-size: 10px;
        font-weight: 700;
      }

      .rpt-stars {
        display: inline-flex;
        gap: 1px;
        color: var(--rpt-track);
      }

      .rpt-stars .on {
        color: #f2a900;
      }

      .rpt-stars > span {
        display: grid;
      }

      .rpt-status-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 20px;
        padding: 5px 8px;
        font-size: 9px;
        font-weight: 800;
      }

      .rpt-status-badge.want-to-read {
        color: #536a9b;
        background: #edf2ff;
      }

      .rpt-status-badge.currently-reading {
        color: #a85b22;
        background: #fff0e1;
      }

      .rpt-status-badge.on-hold {
        color: #856b9e;
        background: #f3edfa;
      }

      .rpt-status-badge.completed {
        color: #27815a;
        background: #e7f7ef;
      }

      .rpt[data-theme="dark"] .rpt-status-badge.want-to-read {
        color: #9db4f0;
        background: #212a47;
      }

      .rpt[data-theme="dark"] .rpt-status-badge.currently-reading {
        color: #ffb27d;
        background: #3a2a1b;
      }

      .rpt[data-theme="dark"] .rpt-status-badge.on-hold {
        color: #c8a9e6;
        background: #2d2340;
      }

      .rpt[data-theme="dark"] .rpt-status-badge.completed {
        color: #6fddae;
        background: #173528;
      }

      .rpt-book-progress {
        margin-top: 17px;
      }

      .rpt-book-progress-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 7px;
        font-size: 11px;
      }

      .rpt-book-progress-label span {
        color: var(--rpt-muted);
      }

      .rpt-book-progress-label strong {
        color: var(--rpt-orange);
      }

      .rpt-progress {
        width: 100%;
        height: 7px;
        border-radius: 20px;
        overflow: hidden;
        background: var(--rpt-track);
      }

      .rpt-progress > div {
        height: 100%;
        background: linear-gradient(90deg, #ff7b49, #ff5a1f);
        border-radius: inherit;
        transition: width 0.25s ease;
      }

      .rpt-page-count {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-top: 7px;
        color: var(--rpt-muted);
        font-size: 10px;
      }

      .rpt-eta {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: 8px;
        padding: 3px 8px;
        border-radius: 20px;
        background: var(--rpt-accent-soft);
        color: var(--rpt-orange);
        font-size: 10px;
        font-weight: 700;
      }

      .rpt-eta.overdue {
        background: rgba(229, 72, 77, 0.12);
        color: #e5484d;
      }

      .rpt-page-update {
        margin-top: 13px;
      }

      .rpt-page-update label {
        display: block;
        color: var(--rpt-muted);
        font-size: 10px;
        margin-bottom: 5px;
      }

      .rpt-page-update > div {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .rpt-page-update input {
        width: 70px;
        min-width: 0;
        border: 1px solid var(--rpt-border);
        border-radius: 7px;
        padding: 7px 8px;
        font-size: 11px;
        color: var(--rpt-ink);
        background: var(--rpt-input);
      }

      .rpt-page-update button {
        border: 1px solid var(--rpt-accent-border);
        color: var(--rpt-orange);
        background: var(--rpt-accent-soft);
        border-radius: 7px;
        padding: 6px 10px;
        font-size: 10px;
        font-weight: 800;
        cursor: pointer;
      }

      .rpt-page-update.rpt-finished {
        display: flex;
        align-items: center;
      }

      .rpt-finished span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #27815a;
        font-size: 11px;
        font-weight: 700;
      }

      .rpt-book-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid var(--rpt-border);
        padding-top: 10px;
        margin-top: 13px;
        color: var(--rpt-muted);
        font-size: 10px;
      }

      .rpt-book-footer > div {
        display: flex;
        gap: 5px;
      }

      .rpt-icon-btn {
        display: inline-grid;
        place-items: center;
        width: 31px;
        height: 31px;
        border: 1px solid var(--rpt-border);
        border-radius: 8px;
        color: var(--rpt-muted);
        background: var(--rpt-card);
        cursor: pointer;
        transition: 0.2s;
        flex-shrink: 0;
      }

      .rpt-icon-btn:hover {
        background: var(--rpt-hover);
        color: var(--rpt-ink);
      }

      .rpt-icon-btn.rpt-danger {
        color: #c84a45;
      }

      .rpt-icon-btn.rpt-danger:hover {
        background: rgba(229, 72, 77, 0.1);
        border-color: #f5c8c5;
      }

      .rpt-empty {
        text-align: center;
        padding: 48px 15px;
        border: 1px dashed var(--rpt-border);
        border-radius: 12px;
        background: var(--rpt-card-2);
      }

      .rpt-empty-icon {
        width: 55px;
        height: 55px;
        display: grid;
        place-items: center;
        border-radius: 15px;
        color: var(--rpt-orange);
        background: var(--rpt-accent-soft);
        margin: 0 auto 14px;
      }

      .rpt-empty h3 {
        font-size: 16px;
        margin: 0;
        color: var(--rpt-ink);
      }

      .rpt-empty p {
        color: var(--rpt-muted);
        font-size: 12px;
        max-width: 440px;
        line-height: 1.6;
        margin: 8px auto 17px;
      }

      .rpt-session-summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 16px;
      }

      .rpt-session-summary > div {
        border: 1px solid var(--rpt-border);
        background: var(--rpt-card-2);
        border-radius: 10px;
        padding: 13px;
      }

      .rpt-session-summary span {
        display: block;
        color: var(--rpt-muted);
        font-size: 10px;
      }

      .rpt-session-summary strong {
        display: block;
        font-size: 18px;
        margin-top: 6px;
      }

      .rpt-session-filter {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
        font-size: 12px;
        color: var(--rpt-muted);
      }

      .rpt-session-filter .rpt-filter-control {
        flex: 0 1 260px;
      }

      .rpt-session-list {
        border: 1px solid var(--rpt-border);
        border-radius: 10px;
        overflow: hidden;
      }

      .rpt-session-row {
        display: grid;
        grid-template-columns: 1.4fr 0.6fr 0.9fr 1.4fr auto;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--rpt-border);
      }

      .rpt-session-row:hover {
        background: var(--rpt-hover);
      }

      .rpt-session-row:last-child {
        border-bottom: 0;
      }

      .rpt-session-date strong,
      .rpt-session-date span {
        display: block;
      }

      .rpt-session-date strong {
        font-size: 12px;
      }

      .rpt-session-date span {
        font-size: 10px;
        color: var(--rpt-muted);
        margin-top: 4px;
      }

      .rpt-session-metric strong,
      .rpt-session-metric span {
        display: block;
      }

      .rpt-session-metric strong {
        font-size: 13px;
      }

      .rpt-session-metric span {
        color: var(--rpt-muted);
        font-size: 10px;
      }

      .rpt-session-note {
        font-size: 11px;
        color: var(--rpt-muted);
        overflow-wrap: anywhere;
      }

      .rpt-row-actions {
        display: flex;
        gap: 5px;
        flex-shrink: 0;
      }

      .rpt-load-more {
        display: flex;
        justify-content: center;
        margin-top: 14px;
      }

      .rpt-stat-detail-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 16px;
      }

      .rpt-stat-detail {
        background: var(--rpt-card-2);
        border: 1px solid var(--rpt-border);
        border-radius: 10px;
        padding: 14px;
      }

      .rpt-stat-detail span {
        display: block;
        color: var(--rpt-muted);
        font-size: 10px;
        line-height: 1.5;
      }

      .rpt-stat-detail strong {
        display: block;
        margin-top: 7px;
        font-size: 19px;
      }

      .rpt-stat-detail small {
        display: block;
        margin-top: 3px;
        color: var(--rpt-muted);
        font-size: 10px;
      }

      .rpt-chart-card {
        padding: 17px;
        border: 1px solid var(--rpt-border);
        border-radius: 11px;
        margin-top: 13px;
        background: var(--rpt-card);
        min-width: 0;
      }

      .rpt-two-col {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 13px;
      }

      .rpt-chart-heading {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 10px;
      }

      .rpt-chart-heading h3 {
        font-size: 14px;
        margin: 0;
        color: var(--rpt-ink);
      }

      .rpt-chart-heading p {
        color: var(--rpt-muted);
        font-size: 11px;
        margin: 5px 0 0;
        line-height: 1.5;
      }

      .rpt-chart-side {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }

      .rpt-chart-total {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--rpt-orange);
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
      }

      .rpt-week-chart,
      .rpt-month-chart {
        display: grid;
        align-items: end;
        gap: 10px;
        height: 180px;
        margin-top: 20px;
      }

      .rpt-week-chart.dense {
        gap: 3px;
      }

      .rpt-month-chart {
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 6px;
        height: 150px;
      }

      .rpt-chart-column {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
        min-width: 0;
      }

      .rpt-chart-column > strong {
        font-size: 10px;
        color: var(--rpt-muted);
        min-height: 12px;
      }

      .rpt-week-chart.dense .rpt-chart-column > strong {
        font-size: 8px;
      }

      .rpt-chart-bar-area {
        width: 100%;
        height: 125px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        background: var(--rpt-card-2);
        border-radius: 7px 7px 0 0;
        overflow: hidden;
      }

      .rpt-chart-bar-area.short {
        height: 90px;
      }

      .rpt-chart-bar {
        width: min(45px, 70%);
        min-height: 0;
        background: linear-gradient(180deg, #ff9b72, #ff5a1f);
        border-radius: 6px 6px 0 0;
        transition: height 0.25s;
      }

      .rpt-week-chart.dense .rpt-chart-bar {
        width: 100%;
        border-radius: 3px 3px 0 0;
      }

      .rpt-chart-column > span {
        color: var(--rpt-muted);
        font-size: 10px;
        height: 12px;
        white-space: nowrap;
      }

      .rpt-heatmap-scroll {
        overflow-x: auto;
        padding: 18px 0 4px;
      }

      .rpt-heatmap {
        display: grid;
        grid-template-rows: repeat(7, 1fr);
        grid-auto-flow: column;
        gap: 4px;
        min-width: 420px;
      }

      .rpt-heat {
        aspect-ratio: 1;
        border-radius: 4px;
        background: var(--rpt-heat-0);
      }

      .rpt-heat.l1 {
        background: var(--rpt-heat-1);
      }
      .rpt-heat.l2 {
        background: var(--rpt-heat-2);
      }
      .rpt-heat.l3 {
        background: var(--rpt-heat-3);
      }
      .rpt-heat.l4 {
        background: var(--rpt-heat-4);
      }
      .rpt-heat.future {
        background: transparent;
      }

      .rpt-heat-legend {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 5px;
        margin-top: 10px;
        font-size: 10px;
        color: var(--rpt-muted);
      }

      .rpt-heat-legend .rpt-heat {
        display: inline-block;
        width: 12px;
        aspect-ratio: auto;
        height: 12px;
      }

      .rpt-status-overview {
        display: grid;
        gap: 14px;
        margin-top: 20px;
      }

      .rpt-status-line > div:first-child {
        display: flex;
        justify-content: space-between;
        margin-bottom: 7px;
        font-size: 11px;
      }

      .rpt-status-line > div:first-child span {
        color: var(--rpt-muted);
      }

      .rpt-status-track {
        height: 7px;
        background: var(--rpt-track);
        border-radius: 20px;
        overflow: hidden;
      }

      .rpt-status-fill {
        height: 100%;
        border-radius: inherit;
        background: #a6b5d5;
        transition: width 0.3s;
      }

      .rpt-status-fill.currently-reading {
        background: #ff965f;
      }

      .rpt-status-fill.on-hold {
        background: #a68bc1;
      }

      .rpt-status-fill.completed {
        background: #51b889;
      }

      .rpt-status-fill.want-to-read {
        background: #8ba7e5;
      }

      .rpt-status-fill.rating {
        background: #f2a900;
      }

      .rpt-donut-wrap {
        display: flex;
        align-items: center;
        gap: 18px;
        margin-top: 14px;
        flex-wrap: wrap;
      }

      .rpt-donut {
        width: 150px;
        height: 150px;
        flex-shrink: 0;
      }

      .rpt-donut-total {
        fill: var(--rpt-ink);
        font-size: 22px;
        font-weight: 800;
      }

      .rpt-donut-label {
        fill: var(--rpt-muted);
        font-size: 9px;
      }

      .rpt-legend {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 8px;
        flex: 1;
        min-width: 140px;
      }

      .rpt-legend li {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
      }

      .rpt-legend i {
        width: 10px;
        height: 10px;
        border-radius: 3px;
        flex-shrink: 0;
      }

      .rpt-legend span {
        flex: 1;
        color: var(--rpt-muted);
      }

      .rpt-badges {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 11px;
        margin-top: 16px;
      }

      .rpt-badge {
        display: flex;
        gap: 12px;
        padding: 13px;
        border: 1px solid var(--rpt-border);
        border-radius: 12px;
        background: var(--rpt-card-2);
        opacity: 0.72;
        min-width: 0;
      }

      .rpt-badge.unlocked {
        opacity: 1;
        border-color: var(--rpt-accent-border);
        background: linear-gradient(135deg, var(--rpt-card), var(--rpt-accent-soft));
      }

      .rpt-badge-icon {
        width: 38px;
        height: 38px;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        border-radius: 11px;
        background: var(--rpt-track);
        color: var(--rpt-muted);
      }

      .rpt-badge.unlocked .rpt-badge-icon {
        background: var(--rpt-orange);
        color: white;
      }

      .rpt-badge strong,
      .rpt-badge span,
      .rpt-badge small {
        display: block;
      }

      .rpt-badge strong {
        font-size: 12px;
      }

      .rpt-badge span {
        font-size: 10px;
        color: var(--rpt-muted);
        margin-top: 2px;
      }

      .rpt-badge small {
        font-size: 10px;
        color: var(--rpt-muted);
        margin-top: 5px;
        font-weight: 700;
      }

      .rpt-badge.unlocked small {
        color: var(--rpt-orange);
      }

      .rpt-badge-track {
        height: 4px;
        border-radius: 10px;
        background: var(--rpt-track);
        margin-top: 8px;
        overflow: hidden;
      }

      .rpt-badge-track > div {
        height: 100%;
        background: var(--rpt-orange);
        border-radius: inherit;
      }

      .rpt-privacy {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-top: 19px;
        padding: 12px 14px;
        border: 1px solid #e0ece3;
        border-radius: 10px;
        color: #5d7365;
        background: #f6fbf7;
        font-size: 11px;
        line-height: 1.5;
      }

      .rpt[data-theme="dark"] .rpt-privacy {
        border-color: #23392d;
        background: #14231c;
        color: #8dc3a2;
      }

      .rpt-privacy svg {
        color: #319265;
        flex-shrink: 0;
      }

      .rpt-data-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px 17px;
        margin-top: 13px;
        padding-bottom: 60px;
      }

      .rpt-data-actions button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 0;
        border: 0;
        background: transparent;
        color: var(--rpt-muted);
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }

      .rpt-data-actions button:hover:not(:disabled) {
        color: var(--rpt-orange);
      }

      .rpt-data-actions button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* Timer */

      .rpt-timer {
        position: fixed;
        right: 22px;
        bottom: 22px;
        z-index: 9000;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
      }

      .rpt-timer-fab {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 18px;
        border: 0;
        border-radius: 40px;
        background: var(--rpt-orange);
        color: white;
        font-size: 13px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        cursor: pointer;
        box-shadow: 0 10px 28px rgba(255, 90, 31, 0.38);
        transition: transform 0.2s;
      }

      .rpt-timer-fab:hover {
        transform: translateY(-2px);
      }

      .rpt-timer-fab.live {
        animation: rpt-pulse 2s infinite;
      }

      .rpt-timer-panel {
        width: 270px;
        padding: 16px;
        border: 1px solid var(--rpt-border);
        border-radius: 16px;
        background: var(--rpt-card);
        box-shadow: 0 20px 55px rgba(0, 0, 0, 0.22);
        animation: rpt-pop 0.2s ease;
        display: grid;
        gap: 10px;
      }

      .rpt-timer-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .rpt-timer-head strong {
        font-size: 14px;
      }

      .rpt-timer-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--rpt-muted);
      }

      .rpt-timer-panel select {
        width: 100%;
        padding: 10px;
        border: 1px solid var(--rpt-border);
        border-radius: 9px;
        background: var(--rpt-input);
        color: var(--rpt-ink);
        font-size: 12px;
      }

      .rpt-timer-book {
        font-size: 12px;
        color: var(--rpt-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rpt-timer-clock {
        font-size: 40px;
        font-weight: 800;
        text-align: center;
        letter-spacing: -1px;
        font-variant-numeric: tabular-nums;
        color: var(--rpt-ink);
      }

      .rpt-timer-clock.live {
        color: var(--rpt-orange);
      }

      .rpt-timer-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .rpt-timer-actions .rpt-btn {
        padding: 10px 8px;
      }

      .rpt-timer-start {
        width: 100%;
      }

      .rpt-timer-discard {
        text-align: center;
        color: var(--rpt-muted);
        font-size: 11px;
        font-weight: 600;
      }

      /* Modals */

      .rpt.rpt-portal,
      .rpt.rpt-portal[data-theme="dark"] {
        position: static;
        width: 0;
        height: 0;
        padding: 0;
        background: transparent;
        border-radius: 0;
      }

      .rpt-modal:focus {
        outline: none;
      }

      .rpt-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10000;
        overflow: auto;
        overscroll-behavior: contain;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(14, 17, 26, 0.6);
        backdrop-filter: blur(4px);
      }

      .rpt-modal {
        width: min(100%, 580px);
        max-height: min(92vh, 880px);
        display: flex;
        flex-direction: column;
        background: var(--rpt-card);
        color: var(--rpt-ink);
        border: 1px solid var(--rpt-border);
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
        animation: rpt-pop 0.2s ease;
      }

      .rpt-modal.wide {
        width: min(100%, 800px);
      }

      .rpt-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 17px 20px;
        border-bottom: 1px solid var(--rpt-border);
        flex-shrink: 0;
      }

      .rpt-modal-header h2 {
        font-size: 17px;
        font-weight: 800;
        margin: 0;
        overflow-wrap: anywhere;
        color: var(--rpt-ink);
      }

      .rpt-modal-content {
        padding: 20px;
        overflow-y: auto;
        overscroll-behavior: contain;
      }

      .rpt-form {
        display: grid;
        gap: 14px;
      }

      .rpt-field {
        display: grid;
        gap: 6px;
        min-width: 0;
      }

      .rpt-field > label {
        font-size: 12px;
        font-weight: 700;
        color: var(--rpt-ink);
      }

      .rpt-field input,
      .rpt-field select,
      .rpt-field textarea,
      .rpt-note-page input,
      .rpt-note-page select,
      .rpt-note-text textarea,
      .rpt-plan-item input,
      .rpt-plan-item select,
      .rpt-review {
        width: 100%;
        min-width: 0;
        padding: 10px 11px;
        border: 1px solid var(--rpt-border);
        border-radius: 8px;
        background: var(--rpt-input);
        color: var(--rpt-ink);
        font: inherit;
        font-size: 12px;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      .rpt-field input:focus,
      .rpt-field select:focus,
      .rpt-field textarea:focus,
      .rpt-note-page input:focus,
      .rpt-note-page select:focus,
      .rpt-note-text textarea:focus,
      .rpt-plan-item input:focus,
      .rpt-plan-item select:focus,
      .rpt-review:focus,
      .rpt-timer-panel select:focus {
        border-color: var(--rpt-orange);
        box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
      }

      .rpt-field select option,
      .rpt-note-page select option,
      .rpt-plan-item select option,
      .rpt-timer-panel select option {
        background: var(--rpt-card);
        color: var(--rpt-ink);
      }

      .rpt-field small {
        color: var(--rpt-muted);
        font-size: 10px;
        line-height: 1.5;
      }

      .rpt-form-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .rpt-presets {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
      }

      .rpt-presets button {
        padding: 5px 10px;
        border: 1px solid var(--rpt-border);
        border-radius: 20px;
        background: var(--rpt-card);
        color: var(--rpt-muted);
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }

      .rpt-presets button.active,
      .rpt-presets button:hover {
        border-color: var(--rpt-orange);
        color: var(--rpt-orange);
        background: var(--rpt-accent-soft);
      }

      .rpt-pace-preview {
        margin-left: auto;
        color: var(--rpt-orange);
        font-size: 11px;
        font-weight: 700;
      }

      .rpt-rating-picker {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .rpt-rating-picker button {
        display: grid;
        place-items: center;
        padding: 3px;
        border: 0;
        background: transparent;
        color: var(--rpt-track);
        cursor: pointer;
        transition: transform 0.15s;
      }

      .rpt-rating-picker button:hover {
        transform: scale(1.15);
      }

      .rpt-rating-picker button.selected {
        color: #f2a900;
      }

      .rpt-rating-picker button.selected svg {
        fill: #f6c04a;
      }

      .rpt-rating-picker span {
        margin-left: 8px;
        color: var(--rpt-muted);
        font-size: 11px;
      }

      .rpt-form-error {
        color: #b83b36;
        background: #fff1f0;
        border: 1px solid #f3cdca;
        border-radius: 8px;
        padding: 9px 11px;
        font-size: 11px;
      }

      .rpt[data-theme="dark"] .rpt-form-error {
        background: #3a1f20;
        border-color: #5c2d2f;
        color: #ff9a96;
      }

      .rpt-form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        border-top: 1px solid var(--rpt-border);
        padding-top: 14px;
        margin-top: 3px;
      }

      .rpt-session-hint {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        background: var(--rpt-accent-soft);
        border: 1px solid var(--rpt-accent-border);
        border-radius: 8px;
        padding: 10px;
        font-size: 11px;
      }

      .rpt-session-hint span {
        color: var(--rpt-orange);
        font-weight: 700;
      }

      .rpt-online {
        padding: 14px;
        border: 1px solid var(--rpt-accent-border);
        border-radius: 12px;
        background: var(--rpt-accent-soft);
        display: grid;
        gap: 10px;
      }

      .rpt-online-head {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--rpt-orange);
        font-size: 12px;
      }

      .rpt-online-search {
        display: flex;
        gap: 8px;
      }

      .rpt-online-search input {
        flex: 1;
        min-width: 0;
        padding: 10px 11px;
        border: 1px solid var(--rpt-border);
        border-radius: 8px;
        background: var(--rpt-input);
        color: var(--rpt-ink);
        font-size: 12px;
        outline: none;
      }

      .rpt-online-search input:focus {
        border-color: var(--rpt-orange);
      }

      .rpt-online-error {
        margin: 0;
        font-size: 11px;
        color: var(--rpt-muted);
      }

      .rpt-online-results {
        display: grid;
        gap: 6px;
      }

      .rpt-online-results button {
        display: flex;
        align-items: center;
        gap: 11px;
        width: 100%;
        padding: 8px;
        border: 1px solid var(--rpt-border);
        border-radius: 9px;
        background: var(--rpt-card);
        color: var(--rpt-ink);
        text-align: left;
        cursor: pointer;
      }

      .rpt-online-results button:hover {
        border-color: var(--rpt-orange);
      }

      .rpt-online-cover {
        width: 34px;
        height: 48px;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        border-radius: 4px;
        overflow: hidden;
        background: var(--rpt-track);
        color: var(--rpt-muted);
      }

      .rpt-online-cover img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .rpt-online-info {
        min-width: 0;
      }

      .rpt-online-info strong,
      .rpt-online-info small {
        display: block;
      }

      .rpt-online-info strong {
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rpt-online-info small {
        font-size: 10px;
        color: var(--rpt-muted);
        margin-top: 3px;
      }

      .rpt-import p {
        margin: 0 0 14px;
        line-height: 1.6;
        font-size: 13px;
      }

      .rpt-import-options {
        display: grid;
        gap: 10px;
        margin-bottom: 16px;
      }

      .rpt-import-options button {
        display: grid;
        gap: 4px;
        padding: 14px;
        border: 1px solid var(--rpt-border);
        border-radius: 11px;
        background: var(--rpt-card-2);
        color: var(--rpt-ink);
        text-align: left;
        cursor: pointer;
      }

      .rpt-import-options button:hover {
        border-color: var(--rpt-orange);
      }

      .rpt-import-options button.danger:hover {
        border-color: #e5484d;
      }

      .rpt-import-options span {
        font-size: 11px;
        color: var(--rpt-muted);
        line-height: 1.5;
      }

      .rpt-detail-top {
        display: flex;
        gap: 20px;
      }

      .rpt-detail-tags {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .rpt-detail-info {
        flex: 1;
        min-width: 0;
      }

      .rpt-detail-info h3 {
        margin: 7px 0 4px;
        font-size: 20px;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }

      .rpt-detail-info > p {
        color: var(--rpt-muted);
        font-size: 12px;
        margin: 0 0 10px;
      }

      .rpt-detail-progress {
        margin-top: 15px;
      }

      .rpt-detail-progress > div:first-child {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 7px;
      }

      .rpt-detail-progress strong {
        color: var(--rpt-orange);
        font-size: 14px;
      }

      .rpt-detail-progress span {
        color: var(--rpt-muted);
        font-size: 11px;
      }

      .rpt-detail-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }

      .rpt-detail-block {
        border-top: 1px solid var(--rpt-border);
        padding-top: 16px;
        margin-top: 19px;
      }

      .rpt-detail-block h4 {
        font-size: 13px;
        margin: 0 0 12px;
      }

      .rpt-detail-block > p {
        color: var(--rpt-muted);
        font-size: 12px;
        line-height: 1.7;
        white-space: pre-wrap;
      }

      .rpt-detail-meta {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        color: var(--rpt-muted);
        font-size: 11px;
      }

      .rpt-detail-meta strong {
        color: var(--rpt-ink);
      }

      .rpt-plan {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      .rpt-plan-item {
        padding: 11px;
        border: 1px solid var(--rpt-border);
        border-radius: 10px;
        background: var(--rpt-card-2);
        min-width: 0;
      }

      .rpt-plan-item > span {
        display: block;
        margin-bottom: 7px;
        color: var(--rpt-muted);
        font-size: 10px;
      }

      .rpt-plan-item > strong {
        display: block;
        font-size: 12px;
      }

      .rpt-plan-item small {
        display: block;
        margin-top: 4px;
        color: var(--rpt-muted);
        font-size: 10px;
        line-height: 1.4;
      }

      .rpt-review {
        margin-top: 12px;
        resize: vertical;
        line-height: 1.6;
      }

      .rpt-note-form {
        display: grid;
        grid-template-columns: 80px 100px 1fr auto;
        gap: 10px;
        align-items: end;
      }

      .rpt-note-page,
      .rpt-note-text {
        min-width: 0;
      }

      .rpt-note-page label,
      .rpt-note-text label {
        display: block;
        font-size: 10px;
        font-weight: 700;
        color: var(--rpt-muted);
        margin-bottom: 6px;
      }

      .rpt-note-text textarea {
        resize: vertical;
      }

      .rpt-muted {
        color: var(--rpt-muted);
        font-size: 11px;
      }

      .rpt-pad {
        padding: 10px 0 0;
      }

      .rpt-notes-list {
        display: grid;
        gap: 9px;
        margin-top: 13px;
      }

      .rpt-notes-all {
        margin-top: 0;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .rpt-note-item {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
        background: var(--rpt-note-bg);
        border: 1px solid var(--rpt-note-border);
        border-radius: 10px;
      }

      .rpt-note-item.quote {
        border-left: 3px solid var(--rpt-orange);
      }

      .rpt-note-item.quote p {
        font-style: italic;
      }

      .rpt-note-item > div:first-child {
        min-width: 0;
        flex: 1;
      }

      .rpt-note-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 10px;
        color: var(--rpt-muted);
      }

      .rpt-note-kind {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 20px;
        background: var(--rpt-accent-soft);
        color: var(--rpt-orange);
        font-weight: 800;
        text-transform: capitalize;
      }

      .rpt-note-kind.idea {
        background: rgba(242, 169, 0, 0.14);
        color: #c98a00;
      }

      .rpt-note-kind.note {
        background: rgba(109, 124, 255, 0.14);
        color: #6d7cff;
      }

      .rpt-note-item p {
        margin: 7px 0;
        font-size: 12px;
        line-height: 1.6;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .rpt-note-item small {
        color: var(--rpt-muted);
        font-size: 9px;
      }

      .rpt-mini-sessions {
        display: grid;
        gap: 8px;
      }

      .rpt-mini-session {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        border: 1px solid var(--rpt-border);
        border-radius: 9px;
        background: var(--rpt-card-2);
      }

      .rpt-mini-session div:first-child {
        min-width: 0;
      }

      .rpt-mini-session strong,
      .rpt-mini-session span {
        display: block;
      }

      .rpt-mini-session strong {
        font-size: 12px;
      }

      .rpt-mini-session span {
        font-size: 10px;
        color: var(--rpt-muted);
        margin-top: 3px;
        overflow-wrap: anywhere;
      }

      @media (max-width: 1000px) {
        .rpt-book-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .rpt-book-grid.list {
          grid-template-columns: 1fr;
        }

        .rpt-book-card.list {
          grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
        }

        .rpt-goals {
          grid-template-columns: 1fr;
        }

        .rpt-stat-detail-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .rpt-badges {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .rpt-plan {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .rpt-notes-all {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 760px) {
        .rpt-stats {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .rpt-two-col {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 650px) {
        .rpt[data-theme="dark"] {
          padding: 14px;
          border-radius: 14px;
        }

        .rpt-header {
          align-items: flex-start;
          flex-direction: column;
        }

        .rpt-header-actions {
          width: 100%;
        }

        .rpt-header-actions .rpt-btn {
          flex: 1;
        }

        .rpt-stats {
          gap: 9px;
        }

        .rpt-stat-card {
          padding: 13px;
        }

        .rpt-stat-value {
          font-size: 22px;
        }

        .rpt-goal-panel {
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
          padding: 15px;
        }

        .rpt-section {
          padding: 14px;
        }

        .rpt-section-heading {
          align-items: flex-start;
          flex-direction: column;
        }

        .rpt-section-heading > .rpt-btn,
        .rpt-heading-actions {
          width: 100%;
        }

        .rpt-heading-actions .rpt-btn {
          flex: 1;
        }

        .rpt-filters .rpt-filter-control {
          flex: 1 1 140px;
        }

        .rpt-book-grid {
          grid-template-columns: 1fr;
        }

        .rpt-book-card.list {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .rpt-book-card.list .rpt-book-progress,
        .rpt-book-card.list .rpt-page-update {
          margin-top: 4px;
        }

        .rpt-book-card.list .rpt-book-footer {
          flex-direction: row;
          align-items: center;
          border-top: 1px solid var(--rpt-border);
          padding-top: 10px;
        }

        .rpt-session-summary {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .rpt-session-row {
          grid-template-columns: 1fr 1fr auto;
          gap: 9px;
        }

        .rpt-session-date {
          grid-column: 1 / 3;
        }

        .rpt-session-note {
          grid-column: 1 / 3;
        }

        .rpt-session-row > .rpt-row-actions {
          grid-column: 3;
          grid-row: 1;
        }

        .rpt-chart-heading {
          flex-direction: column;
        }

        .rpt-chart-side {
          width: 100%;
          justify-content: space-between;
        }

        .rpt-note-form {
          grid-template-columns: 1fr 1fr;
        }

        .rpt-note-form .rpt-note-text,
        .rpt-note-form > .rpt-btn {
          grid-column: 1 / -1;
        }

        .rpt-detail-top {
          gap: 13px;
        }

        .rpt-cover.large {
          width: 90px;
          height: 125px;
        }

        .rpt-detail-info h3 {
          font-size: 16px;
        }

        .rpt-detail-meta {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .rpt-modal-content {
          padding: 15px;
        }

        .rpt-badges {
          grid-template-columns: 1fr;
        }

        .rpt-timer {
          right: 14px;
          bottom: 14px;
        }
      }

      @media (max-width: 420px) {
        .rpt-stats {
          grid-template-columns: 1fr;
        }

        .rpt-form-row {
          grid-template-columns: 1fr;
        }

        .rpt-detail-top {
          flex-direction: column;
        }

        .rpt-detail-actions .rpt-btn {
          flex: 1;
        }

        .rpt-plan {
          grid-template-columns: 1fr;
        }

        .rpt-stat-detail-grid {
          grid-template-columns: 1fr;
        }

        .rpt-timer-panel {
          width: min(270px, calc(100vw - 28px));
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .rpt *,
        .rpt-modal,
        .rpt-toast {
          animation: none !important;
          transition: none !important;
        }
      }
    `}</style>
  );
}