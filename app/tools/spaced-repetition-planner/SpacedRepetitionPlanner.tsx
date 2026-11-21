"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FormEvent, ChangeEvent } from "react";
import { createPortal } from "react-dom";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Difficulty = "easy" | "medium" | "hard";

type Revision = {
  id: string;
  interval: number;
  dueDate: string;
  completed: boolean;
  completedAt: string | null;
  rating: "again" | "hard" | "good" | "easy" | null;
};

type Topic = {
  id: string;
  title: string;
  subject: string;
  learnedDate: string;
  notes: string;
  createdAt: number;
  difficulty: Difficulty;
  revisions: Revision[];
};

type Filter = "all" | "today" | "overdue" | "upcoming" | "completed";

type SortKey =
  | "next"
  | "created"
  | "title"
  | "progress"
  | "overdue";

type TopicForm = {
  title: string;
  subject: string;
  learnedDate: string;
  notes: string;
  difficulty: Difficulty;
  intervals: number[];
};

type Snapshot = {
  topics: Topic[];
  label: string;
};

const STORAGE_KEY = "toolsab-spaced-repetition-planner-v2";

const BASE_INTERVALS = [1, 3, 7, 14, 30, 60];

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1.5,
  medium: 1,
  hard: 0.6,
};

const SUBJECTS = [
  "General",
  "Mathematics",
  "Science",
  "History",
  "Language",
  "Programming",
  "Exam Preparation",
  "Other",
];

const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: "easy", label: "Easy", hint: "Stretch intervals (×1.5)" },
  { id: "medium", label: "Medium", hint: "Standard intervals" },
  { id: "hard", label: "Hard", hint: "Shorten intervals (×0.6)" },
];

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All topics" },
  { id: "today", label: "Due today" },
  { id: "overdue", label: "Overdue" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
];

const RATINGS: {
  id: NonNullable<Revision["rating"]>;
  label: string;
  weight: number;
}[] = [
  { id: "again", label: "Again", weight: 0.4 },
  { id: "hard", label: "Hard", weight: 0.7 },
  { id: "good", label: "Good", weight: 1 },
  { id: "easy", label: "Easy", weight: 1.3 },
];

const WEEKDAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function addDays(value: string, days: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function diffDays(a: string, b: string) {
  const ms = parseDate(a).getTime() - parseDate(b).getTime();
  return Math.round(ms / 86_400_000);
}

function formatDate(value: string) {
  if (!value) return "Not set";

  return parseDate(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelative(value: string, today: string) {
  if (!value) return "";
  const delta = diffDays(value, today);
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  if (delta > 0) return `In ${delta} days`;
  return `${Math.abs(delta)} days overdue`;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = parseDate(value);

  return !Number.isNaN(date.getTime()) && dateKey(date) === value;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createForm(): TopicForm {
  return {
    title: "",
    subject: "General",
    learnedDate: dateKey(),
    notes: "",
    difficulty: "medium",
    intervals: [...BASE_INTERVALS],
  };
}

/* ------------------------------------------------------------------ */
/* Data validation                                                     */
/* ------------------------------------------------------------------ */

const VALID_RATINGS = new Set<NonNullable<Revision["rating"]>>([
  "again",
  "hard",
  "good",
  "easy",
]);

function sanitizeDifficulty(value: unknown): Difficulty {
  return value === "easy" || value === "hard" || value === "medium"
    ? value
    : "medium";
}

function sanitizeInterval(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(3650, Math.max(0, Math.round(value)));
}

function sanitizeTopic(value: unknown): Topic | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;

  if (
    typeof raw.id !== "string" ||
    typeof raw.title !== "string" ||
    !raw.title.trim() ||
    typeof raw.learnedDate !== "string" ||
    !isValidDate(raw.learnedDate)
  ) {
    return null;
  }

  const revisions: Revision[] = Array.isArray(raw.revisions)
    ? raw.revisions
        .filter(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object"
        )
        .map((item) => {
          const rating = item.rating;
          const validRating =
            typeof rating === "string" &&
            VALID_RATINGS.has(rating as NonNullable<Revision["rating"]>)
              ? (rating as NonNullable<Revision["rating"]>)
              : null;

          return {
            id:
              typeof item.id === "string" ? item.id : createId(),
            interval: sanitizeInterval(item.interval),
            dueDate:
              typeof item.dueDate === "string" &&
              isValidDate(item.dueDate)
                ? item.dueDate
                : (raw.learnedDate as string),
            completed: item.completed === true,
            completedAt:
              typeof item.completedAt === "string" &&
              isValidDate(item.completedAt)
                ? item.completedAt
                : null,
            rating: validRating,
          };
        })
    : [];

  return {
    id: raw.id,
    title: raw.title.trim().slice(0, 120),
    subject:
      typeof raw.subject === "string"
        ? raw.subject.slice(0, 60)
        : "General",
    learnedDate: raw.learnedDate,
    notes:
      typeof raw.notes === "string"
        ? raw.notes.slice(0, 2000)
        : "",
    createdAt:
      typeof raw.createdAt === "number" &&
      Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : Date.now(),
    difficulty: sanitizeDifficulty(raw.difficulty),
    revisions,
  };
}

/* ------------------------------------------------------------------ */
/* Scheduling helpers                                                  */
/* ------------------------------------------------------------------ */

function scaledIntervals(
  intervals: number[],
  difficulty: Difficulty
): number[] {
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty] ?? 1;

  const cleaned = intervals
    .map((value) => Math.max(0, Math.round(value)))
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .sort((a, b) => a - b);

  if (!cleaned.length) return [...BASE_INTERVALS];

  const scaled = cleaned.map((value) =>
    Math.max(1, Math.round(value * multiplier))
  );

  for (let i = 1; i < scaled.length; i++) {
    if (scaled[i] <= scaled[i - 1]) {
      scaled[i] = scaled[i - 1] + 1;
    }
  }

  return scaled;
}

function createRevisions(
  learnedDate: string,
  intervals: number[],
  difficulty: Difficulty
): Revision[] {
  return scaledIntervals(intervals, difficulty).map((interval) => ({
    id: createId(),
    interval,
    dueDate: addDays(learnedDate, interval),
    completed: false,
    completedAt: null,
    rating: null,
  }));
}

function getRevisionStatus(revision: Revision, today: string) {
  if (revision.completed) return "completed" as const;
  if (revision.dueDate < today) return "overdue" as const;
  if (revision.dueDate === today) return "today" as const;
  return "upcoming" as const;
}

function getTopicProgress(topic: Topic) {
  const total = topic.revisions.length;

  const completed = topic.revisions.filter(
    (revision) => revision.completed
  ).length;

  return {
    total,
    completed,
    remaining: total - completed,
    percentage: total
      ? Math.round((completed / total) * 100)
      : 0,
  };
}

function getNextRevision(topic: Topic) {
  return topic.revisions
    .filter((revision) => !revision.completed)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
}

function getOverdueCount(topic: Topic, today: string) {
  return topic.revisions.filter(
    (revision) => !revision.completed && revision.dueDate < today
  ).length;
}

function getDueTodayCount(topic: Topic, today: string) {
  return topic.revisions.filter(
    (revision) => !revision.completed && revision.dueDate === today
  ).length;
}

function topicMatchesFilter(topic: Topic, filter: Filter, today: string) {
  if (filter === "all") return true;
  if (filter === "today") return getDueTodayCount(topic, today) > 0;
  if (filter === "overdue") return getOverdueCount(topic, today) > 0;
  if (filter === "upcoming")
    return topic.revisions.some(
      (revision) => !revision.completed && revision.dueDate > today
    );
  if (filter === "completed")
    return (
      topic.revisions.length > 0 &&
      topic.revisions.every((revision) => revision.completed)
    );
  return true;
}

function cloneTopic(topic: Topic): Topic {
  return {
    ...topic,
    revisions: topic.revisions.map((revision) => ({ ...revision })),
  };
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function SpacedRepetitionPlanner() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [ready, setReady] = useState(false);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("next");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TopicForm>(createForm());

  const [notice, setNotice] = useState("");
  const [undoBuffer, setUndoBuffer] = useState<Snapshot | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  /* Custom Calendar state */
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const today = dateKey();

  /* ------------------------------ Storage */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed?.topics)) {
          setTopics(
            parsed.topics
              .map(sanitizeTopic)
              .filter((item: Topic | null): item is Topic => item !== null)
          );
        } else if (Array.isArray(parsed)) {
          setTopics(
            parsed
              .map(sanitizeTopic)
              .filter((item: Topic | null): item is Topic => item !== null)
          );
        }
      }
    } catch {
      // Ignore invalid saved data.
    }

    setReady(true);
  }, []);

  const flash = useCallback((message: string) => {
    setNotice(message);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setNotice("");
      timerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    if (!ready) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 2, topics })
      );
    } catch {
      flash("Could not save data. Check your browser storage.");
    }
  }, [ready, topics, flash]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /* ------------------------------ Modal lifecycle */

  useEffect(() => {
    if (!showForm) {
      setShowCalendar(false);
      return;
    }

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [showForm]);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(createForm());
    setShowCalendar(false);
  }, []);

  useEffect(() => {
    if (!showForm) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeForm();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm, closeForm]);

  // Click outside to close calendar
  useEffect(() => {
    if (!showCalendar) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [showCalendar]);

  /* ------------------------------ Undo */

  const saveUndo = useCallback(
    (label: string) => {
      setUndoBuffer({ topics: topics.map(cloneTopic), label });
    },
    [topics]
  );

  const undo = useCallback(() => {
    if (!undoBuffer) return;
    setTopics(undoBuffer.topics);
    flash(`Undone: ${undoBuffer.label}`);
    setUndoBuffer(null);
  }, [undoBuffer, flash]);

  /* ------------------------------ Derived data */

  const allRevisions = useMemo(
    () =>
      topics.flatMap((topic) =>
        topic.revisions.map((revision) => ({
          ...revision,
          topicId: topic.id,
          topicTitle: topic.title,
          subject: topic.subject,
        }))
      ),
    [topics]
  );

  const pendingRevisions = useMemo(
    () => allRevisions.filter((revision) => !revision.completed),
    [allRevisions]
  );

  const dueToday = useMemo(
    () => pendingRevisions.filter((revision) => revision.dueDate === today),
    [pendingRevisions, today]
  );

  const overdue = useMemo(
    () => pendingRevisions.filter((revision) => revision.dueDate < today),
    [pendingRevisions, today]
  );

  const completedCount = useMemo(
    () => allRevisions.filter((revision) => revision.completed).length,
    [allRevisions]
  );

  const totalCount = allRevisions.length;

  const overallProgress = totalCount
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  const subjects = useMemo(
    () => Array.from(new Set(topics.map((topic) => topic.subject))).sort(),
    [topics]
  );

  const visibleTopics = useMemo(() => {
    let result = [...topics];

    if (subjectFilter !== "all") {
      result = result.filter(
        (topic) => topic.subject === subjectFilter
      );
    }

    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (topic) =>
          topic.title.toLowerCase().includes(query) ||
          topic.subject.toLowerCase().includes(query) ||
          topic.notes.toLowerCase().includes(query)
      );
    }

    result = result.filter((topic) =>
      topicMatchesFilter(topic, filter, today)
    );

    result.sort((a, b) => {
      const aNext = getNextRevision(a);
      const bNext = getNextRevision(b);

      if (sortKey === "title") {
        return a.title.localeCompare(b.title);
      }

      if (sortKey === "created") {
        return b.createdAt - a.createdAt;
      }

      if (sortKey === "progress") {
        return (
          getTopicProgress(b).percentage -
          getTopicProgress(a).percentage
        );
      }

      if (sortKey === "overdue") {
        const diff =
          getOverdueCount(b, today) - getOverdueCount(a, today);
        if (diff !== 0) return diff;
      }

      if (!aNext && !bNext) return b.createdAt - a.createdAt;
      if (!aNext) return 1;
      if (!bNext) return -1;

      const cmp = aNext.dueDate.localeCompare(bNext.dueDate);
      if (cmp !== 0) return cmp;
      return b.createdAt - a.createdAt;
    });

    return result;
  }, [topics, filter, search, subjectFilter, sortKey, today]);

  /* ------------------------------ Analytics */

  const analytics = useMemo(() => {
    const total = allRevisions.length;
    const completed = allRevisions.filter((r) => r.completed);
    const completedOnTime = completed.filter(
      (r) => r.completedAt && r.completedAt <= r.dueDate
    ).length;
    const completedLate = completed.length - completedOnTime;

    const ratingCounts: Record<NonNullable<Revision["rating"]>, number> = {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    };
    completed.forEach((r) => {
      if (r.rating) ratingCounts[r.rating]++;
    });

    const ratedTotal =
      ratingCounts.again +
      ratingCounts.hard +
      ratingCounts.good +
      ratingCounts.easy;

    const retention = ratedTotal
      ? Math.round(
          ((ratingCounts.good + ratingCounts.easy) / ratedTotal) * 100
        )
      : 0;

    const lateness = completed
      .filter((r) => r.completedAt)
      .map((r) => diffDays(r.completedAt as string, r.dueDate));
    const avgLateness = lateness.length
      ? Math.round(
          (lateness.reduce((a, b) => a + b, 0) / lateness.length) * 10
        ) / 10
      : 0;

    const bySubject = new Map<
      string,
      { total: number; completed: number }
    >();
    allRevisions.forEach((revision) => {
      const entry =
        bySubject.get(revision.subject) || { total: 0, completed: 0 };
      entry.total += 1;
      if (revision.completed) entry.completed += 1;
      bySubject.set(revision.subject, entry);
    });

    const subjectRows = Array.from(bySubject.entries())
      .map(([subject, value]) => ({
        subject,
        total: value.total,
        completed: value.completed,
        rate: value.total
          ? Math.round((value.completed / value.total) * 100)
          : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      completedOnTime,
      completedLate,
      ratingCounts,
      retention,
      avgLateness,
      subjectRows,
    };
  }, [allRevisions]);

  /* ------------------------------ Form */

  const openNew = useCallback(() => {
    setEditingId(null);
    setForm(createForm());
    setShowForm(true);
  }, []);

  const openEdit = useCallback((topic: Topic) => {
    setEditingId(topic.id);

    const rawIntervals = topic.revisions
      .map((r) => r.interval)
      .sort((a, b) => a - b);

    setForm({
      title: topic.title,
      subject: topic.subject,
      learnedDate: topic.learnedDate,
      notes: topic.notes,
      difficulty: topic.difficulty,
      intervals: rawIntervals.length
        ? rawIntervals
        : [...BASE_INTERVALS],
    });

    setShowForm(true);
  }, []);

  /* ------------------------------ Custom Calendar Logic */

  const handlePrevMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
    );
  };

  const handleSelectDate = (dateStr: string) => {
    setForm((prev) => ({ ...prev, learnedDate: dateStr }));
    setShowCalendar(false);
  };

  const handleClearDate = () => {
    setForm((prev) => ({ ...prev, learnedDate: "" }));
    setShowCalendar(false);
  };

  const handleTodayDate = () => {
    setForm((prev) => ({ ...prev, learnedDate: today }));
    setShowCalendar(false);
  };

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { date: string; day: number; disabled: boolean }[] = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ date: "", day: 0, disabled: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
      cells.push({
        date: dateStr,
        day: d,
        disabled: dateStr > today,
      });
    }
    return cells;
  }, [calendarMonth, today]);

  /* ------------------------------ Submit */

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();

    if (!title) {
      flash("Please enter a topic name.");
      return;
    }

    if (!isValidDate(form.learnedDate)) {
      flash("Please select a valid learning date.");
      return;
    }

    if (form.learnedDate > today) {
      flash("The learning date cannot be in the future.");
      return;
    }

    if (
      form.intervals.length === 0 ||
      form.intervals.some((i) => !Number.isFinite(i) || i < 0)
    ) {
      flash("Please add at least one valid interval (days).");
      return;
    }

    if (editingId) {
      saveUndo("Edit topic");

      setTopics((previous) =>
        previous.map((topic) => {
          if (topic.id !== editingId) return topic;

          const intervalsUnchanged =
            topic.revisions
              .map((r) => r.interval)
              .sort((a, b) => a - b)
              .join(",") ===
            scaledIntervals(form.intervals, form.difficulty)
              .sort((a, b) => a - b)
              .join(",");

          return {
            ...topic,
            title,
            subject: form.subject,
            notes: form.notes.trim(),
            difficulty: form.difficulty,
            revisions: intervalsUnchanged
              ? topic.revisions
              : createRevisions(
                  topic.learnedDate,
                  form.intervals,
                  form.difficulty
                ),
          };
        })
      );

      flash("Topic updated.");
    } else {
      saveUndo("Add topic");

      const topic: Topic = {
        id: createId(),
        title,
        subject: form.subject,
        learnedDate: form.learnedDate,
        notes: form.notes.trim(),
        createdAt: Date.now(),
        difficulty: form.difficulty,
        revisions: createRevisions(
          form.learnedDate,
          form.intervals,
          form.difficulty
        ),
      };

      setTopics((previous) => [topic, ...previous]);

      flash("Topic added and revision schedule created.");
    }

    closeForm();
  }

  /* ------------------------------ Revision actions */

  const toggleRevision = useCallback(
    (topicId: string, revisionId: string) => {
      saveUndo("Toggle revision");

      setTopics((previous) =>
        previous.map((topic) => {
          if (topic.id !== topicId) return topic;

          return {
            ...topic,
            revisions: topic.revisions.map((revision) => {
              if (revision.id !== revisionId) return revision;

              const completed = !revision.completed;

              return {
                ...revision,
                completed,
                completedAt: completed ? today : null,
                rating: completed ? revision.rating : null,
              };
            }),
          };
        })
      );

      flash("Revision status updated.");
    },
    [today, saveUndo, flash]
  );

  const rateRevision = useCallback(
    (
      topicId: string,
      revisionId: string,
      rating: NonNullable<Revision["rating"]>
    ) => {
      saveUndo("Rate revision");

      setTopics((previous) =>
        previous.map((topic) => {
          if (topic.id !== topicId) return topic;

          return {
            ...topic,
            revisions: topic.revisions.map((revision) =>
              revision.id === revisionId
                ? {
                    ...revision,
                    completed: true,
                    completedAt: revision.completedAt ?? today,
                    rating,
                  }
                : revision
            ),
          };
        })
      );

      flash(`Revision rated "${rating}".`);
    },
    [today, saveUndo, flash]
  );

  const postponeRevision = useCallback(
    (topicId: string, revisionId: string) => {
      saveUndo("Postpone revision");

      setTopics((previous) =>
        previous.map((topic) => {
          if (topic.id !== topicId) return topic;

          return {
            ...topic,
            revisions: topic.revisions.map((revision) => {
              if (revision.id !== revisionId) return revision;
              if (revision.completed) return revision;

              const base =
                revision.dueDate < today ? today : revision.dueDate;

              return {
                ...revision,
                dueDate: addDays(base, 1),
              };
            }),
          };
        })
      );

      flash("Revision postponed by one day.");
    },
    [today, saveUndo, flash]
  );

  const deleteTopic = useCallback(
    (id: string) => {
      const topic = topics.find((item) => item.id === id);
      if (!topic) return;

      if (
        !window.confirm(
          `Delete "${topic.title}" and its revision history?`
        )
      ) {
        return;
      }

      saveUndo("Delete topic");
      setTopics((previous) => previous.filter((item) => item.id !== id));
      flash("Topic deleted.");
    },
    [topics, saveUndo, flash]
  );

  /* ------------------------------ Bulk actions */

  const completeAllDueToday = useCallback(() => {
    if (!dueToday.length) {
      flash("No revisions due today.");
      return;
    }

    saveUndo("Complete all due today");

    const dueIds = new Set(
      dueToday.map((r) => `${r.topicId}:${r.id}`)
    );

    setTopics((previous) =>
      previous.map((topic) => ({
        ...topic,
        revisions: topic.revisions.map((revision) => {
          if (!dueIds.has(`${topic.id}:${revision.id}`)) return revision;
          if (revision.completed) return revision;
          return {
            ...revision,
            completed: true,
            completedAt: today,
            rating: revision.rating,
          };
        }),
      }))
    );

    flash(`Marked ${dueIds.size} revision(s) as done.`);
  }, [dueToday, today, saveUndo, flash]);

  /* ------------------------------ Backup */

  function exportBackup() {
    const content = JSON.stringify(
      {
        version: 2,
        exportedAt: new Date().toISOString(),
        topics,
      },
      null,
      2
    );

    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `spaced-repetition-backup-${today}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    flash("Backup downloaded.");
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());

      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.topics)
          ? parsed.topics
          : null;

      if (!list) throw new Error("Invalid backup");

      const imported = list
        .map(sanitizeTopic)
        .filter((item: Topic | null): item is Topic => item !== null);

      if (!imported.length) throw new Error("No valid topics");

      if (
        !window.confirm(
          `Import ${imported.length} topics? This will replace your current planner.`
        )
      ) {
        return;
      }

      saveUndo("Import backup");
      setTopics(imported);
      flash("Backup imported successfully.");
    } catch {
      flash("This is not a valid Spaced Repetition Planner backup.");
    }
  }

  /* ------------------------------ Reset */

  function resetPlanner() {
    if (!topics.length) return;

    if (
      !window.confirm(
        "Delete all topics and revision history? This cannot be undone."
      )
    ) {
      return;
    }

    saveUndo("Clear planner");
    setTopics([]);
    setFilter("all");
    setSearch("");
    setSubjectFilter("all");
    setSortKey("next");

    flash("Planner cleared.");
  }

  /* ------------------------------ Keyboard shortcuts */

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (
        target &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "/" && !showForm) {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (event.key.toLowerCase() === "n" && !showForm) {
        event.preventDefault();
        openNew();
      }

      if (event.key.toLowerCase() === "u" && !showForm && undoBuffer) {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showForm, undoBuffer, undo, openNew]);

  /* ------------------------------ Loading */

  if (!ready) {
    return (
      <div className="srp-loading">
        Loading your revision planner...
        <style jsx>{`
          .srp-loading {
            padding: 40px 20px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* UI                                                                */
  /* ---------------------------------------------------------------- */

  return (
    <div className="srp">
      <div className="srp-header">
        <div>
          <div className="srp-eyebrow">LEARN • REVIEW • REMEMBER</div>
          <h2>Spaced Repetition Planner</h2>
          <p>
            Schedule revision sessions using proven spaced repetition
            intervals. Add a topic, choose its difficulty, and the
            planner builds an adaptive review timeline for you.
          </p>
        </div>

        <button className="srp-primary" onClick={openNew}>
          + Add topic
        </button>
      </div>

      {/* Statistics */}

      <div className="srp-stats">
        <div className="srp-stat">
          <span className="srp-stat-icon">📚</span>
          <div>
            <strong>{topics.length}</strong>
            <span>Total topics</span>
          </div>
        </div>

        <div className="srp-stat">
          <span className="srp-stat-icon">📅</span>
          <div>
            <strong>{dueToday.length}</strong>
            <span>Due today</span>
          </div>
        </div>

        <div className="srp-stat">
          <span className="srp-stat-icon">⏰</span>
          <div>
            <strong>{overdue.length}</strong>
            <span>Overdue revisions</span>
          </div>
        </div>

        <div className="srp-stat">
          <span className="srp-stat-icon">✅</span>
          <div>
            <strong>{completedCount}</strong>
            <span>Completed revisions</span>
          </div>
        </div>
      </div>

      {/* Progress */}

      <section className="srp-progress-card">
        <div className="srp-progress-heading">
          <div>
            <h3>Overall revision progress</h3>
            <p>
              {completedCount} of {totalCount} revision sessions completed
            </p>
          </div>
          <strong>{overallProgress}%</strong>
        </div>

        <div
          className="srp-progress-track"
          role="progressbar"
          aria-valuenow={overallProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall revision progress"
        >
          <div style={{ width: `${overallProgress}%` }} />
        </div>

        <div className="srp-progress-actions">
          <button
            className="srp-secondary"
            onClick={completeAllDueToday}
            disabled={!dueToday.length}
          >
            ✓ Complete all due today ({dueToday.length})
          </button>
          <button
            className="srp-secondary"
            onClick={() => setShowAnalytics((v) => !v)}
            aria-expanded={showAnalytics}
          >
            {showAnalytics ? "Hide analytics" : "Show analytics"}
          </button>
        </div>

        {showAnalytics && (
          <div className="srp-analytics">
            <div className="srp-analytics-grid">
              <div>
                <span>On-time completions</span>
                <strong>{analytics.completedOnTime}</strong>
              </div>
              <div>
                <span>Late completions</span>
                <strong>{analytics.completedLate}</strong>
              </div>
              <div>
                <span>Retention (good/easy)</span>
                <strong>{analytics.retention}%</strong>
              </div>
              <div>
                <span>Avg. days late</span>
                <strong>{analytics.avgLateness}</strong>
              </div>
            </div>

            <div className="srp-rating-breakdown">
              {RATINGS.map((rating) => (
                <div key={rating.id}>
                  <span>{rating.label}</span>
                  <strong>{analytics.ratingCounts[rating.id]}</strong>
                </div>
              ))}
            </div>

            {analytics.subjectRows.length > 0 && (
              <div className="srp-subject-breakdown">
                <strong>By subject</strong>
                {analytics.subjectRows.map((row) => (
                  <div className="srp-subject-row" key={row.subject}>
                    <span>{row.subject}</span>
                    <div className="srp-progress-track">
                      <div style={{ width: `${row.rate}%` }} />
                    </div>
                    <small>
                      {row.completed}/{row.total} · {row.rate}%
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Today's revisions */}

      <section className="srp-today-card">
        <div className="srp-section-heading">
          <div>
            <h3>Today's revision sessions</h3>
            <p>{formatDate(today)}</p>
          </div>
          <span className="srp-count">{dueToday.length} due</span>
        </div>

        {dueToday.length === 0 ? (
          <div className="srp-empty-small">
            <span>🎉</span>
            <div>
              <strong>No revisions due today</strong>
              <p>
                You're all caught up. Add another topic or check your
                upcoming schedule.
              </p>
            </div>
          </div>
        ) : (
          <div className="srp-today-list">
            {dueToday.map((revision) => (
              <div
                className="srp-today-item"
                key={`${revision.topicId}:${revision.id}`}
              >
                <div>
                  <strong>{revision.topicTitle}</strong>
                  <span>
                    {revision.subject} · Day {revision.interval} revision
                  </span>
                </div>
                <div className="srp-today-actions">
                  {RATINGS.map((rating) => (
                    <button
                      key={rating.id}
                      className={`srp-rating-btn srp-rating-${rating.id}`}
                      onClick={() =>
                        rateRevision(
                          revision.topicId,
                          revision.id,
                          rating.id
                        )
                      }
                      title={`Rate this revision: ${rating.label}`}
                    >
                      {rating.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Topic list */}

      <section className="srp-topics-section">
        <div className="srp-section-heading">
          <div>
            <h3>Your learning topics</h3>
            <p>Manage topics and follow their revision schedules.</p>
          </div>
        </div>

        <div className="srp-controls">
          <input
            ref={searchRef}
            className="srp-search"
            type="search"
            placeholder="Search topics, subjects or notes... ( / )"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search topics"
          />

          <select
            className="srp-select"
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
            aria-label="Filter by subject"
          >
            <option value="all">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>

          <select
            className="srp-select"
            value={sortKey}
            onChange={(event) =>
              setSortKey(event.target.value as SortKey)
            }
            aria-label="Sort topics"
          >
            <option value="next">Next due date</option>
            <option value="created">Newest created</option>
            <option value="title">Title A–Z</option>
            <option value="progress">Most progress</option>
            <option value="overdue">Most overdue</option>
          </select>
        </div>

        <div className="srp-filters">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              className={`srp-filter ${
                filter === item.id ? "active" : ""
              }`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {visibleTopics.length === 0 ? (
          <div className="srp-empty">
            <span>🧠</span>
            <h3>No topics found</h3>
            <p>
              {topics.length === 0
                ? "Start by adding something you want to remember. Your revision schedule will be created automatically."
                : "Try another filter or search term."}
            </p>
            {topics.length === 0 && (
              <button className="srp-primary" onClick={openNew}>
                Add your first topic
              </button>
            )}
          </div>
        ) : (
          <div className="srp-topic-list">
            {visibleTopics.map((topic) => {
              const progress = getTopicProgress(topic);
              const nextRevision = getNextRevision(topic);

              return (
                <article className="srp-topic-card" key={topic.id}>
                  <div className="srp-topic-top">
                    <div className="srp-topic-info">
                      <div className="srp-topic-badges">
                        <span className="srp-subject">
                          {topic.subject}
                        </span>
                        <span
                          className={`srp-difficulty srp-difficulty-${topic.difficulty}`}
                        >
                          {topic.difficulty}
                        </span>
                      </div>
                      <h4>{topic.title}</h4>
                      <p>
                        Learned on {formatDate(topic.learnedDate)}
                      </p>
                      {topic.notes && (
                        <p className="srp-notes">{topic.notes}</p>
                      )}
                    </div>

                    <div className="srp-topic-actions">
                      <button
                        onClick={() => openEdit(topic)}
                        aria-label={`Edit ${topic.title}`}
                      >
                        Edit
                      </button>
                      <button
                        className="srp-delete"
                        onClick={() => deleteTopic(topic.id)}
                        aria-label={`Delete ${topic.title}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="srp-topic-progress">
                    <div>
                      <span>
                        {progress.completed}/{progress.total} revisions
                        completed
                      </span>
                      <strong>{progress.percentage}%</strong>
                    </div>
                    <div className="srp-progress-track">
                      <div
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="srp-next">
                    {nextRevision ? (
                      <>
                        <span>Next revision</span>
                        <strong>
                          {formatDate(nextRevision.dueDate)}
                          {nextRevision.dueDate < today && (
                            <em>Overdue</em>
                          )}
                          {nextRevision.dueDate === today && (
                            <em className="srp-due-today">Today</em>
                          )}
                        </strong>
                      </>
                    ) : (
                      <strong className="srp-finished">
                        All revision sessions completed
                      </strong>
                    )}
                  </div>

                  <div className="srp-schedule">
                    {topic.revisions.map((revision) => {
                      const status = getRevisionStatus(revision, today);

                      return (
                        <div
                          className={`srp-revision ${
                            status === "completed"
                              ? "is-completed"
                              : status === "overdue"
                              ? "is-overdue"
                              : status === "today"
                              ? "is-today"
                              : ""
                          }`}
                          key={revision.id}
                        >
                          <div className="srp-revision-top">
                            <span>Day {revision.interval}</span>
                            <span className="srp-revision-status">
                              {status === "completed"
                                ? revision.rating
                                  ? `Completed (${revision.rating})`
                                  : "Completed"
                                : status === "overdue"
                                ? "Overdue"
                                : status === "today"
                                ? "Due today"
                                : formatRelative(revision.dueDate, today)}
                            </span>
                          </div>

                          <strong>{formatDate(revision.dueDate)}</strong>

                          <div className="srp-revision-actions">
                            <button
                              className={
                                revision.completed
                                  ? "srp-undo-btn"
                                  : "srp-mark-btn"
                              }
                              onClick={() =>
                                toggleRevision(topic.id, revision.id)
                              }
                            >
                              {revision.completed
                                ? "Undo"
                                : "Mark done"}
                            </button>

                            {!revision.completed && (
                              <button
                                className="srp-postpone-btn"
                                onClick={() =>
                                  postponeRevision(
                                    topic.id,
                                    revision.id
                                  )
                                }
                                title="Move this revision one day later"
                              >
                                +1 day
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Information and backup */}

      <section className="srp-help">
        <button
          className="srp-help-toggle"
          onClick={() => setShowHelp((previous) => !previous)}
          aria-expanded={showHelp}
        >
          <span>How does spaced repetition work?</span>
          <span>{showHelp ? "−" : "+"}</span>
        </button>

        {showHelp && (
          <div className="srp-help-content">
            <p>
              Spaced repetition is a learning method that asks you to
              review information at planned intervals instead of trying
              to learn everything in one sitting.
            </p>

            <p>
              When you add a topic, this planner creates revision
              sessions based on your chosen intervals (by default 1, 3,
              7, 14, 30 and 60 days after your learning date). The
              difficulty setting scales those intervals: easy ×1.5,
              medium ×1, hard ×0.6.
            </p>

            <ol>
              <li>Add a topic and select when you first learned it.</li>
              <li>Choose a difficulty to stretch or shorten intervals.</li>
              <li>Check the sessions scheduled for today.</li>
              <li>Review the material, then rate it Again / Hard / Good / Easy.</li>
              <li>Use the upcoming and overdue filters to plan your work.</li>
            </ol>

            <p>
              If you miss a session, you can move its date one day
              later. You can also edit the topic details without losing
              its revision history. Your ratings feed the retention
              score in the analytics panel.
            </p>
          </div>
        )}
      </section>

      <section className="srp-backup">
        <div>
          <strong>Your data stays in this browser</strong>
          <p>
            Your topics are saved locally on this device. Download a
            backup before clearing browser data or changing devices.
          </p>
        </div>

        <div className="srp-backup-actions">
          <button onClick={exportBackup}>Export backup</button>
          <button onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <button
            className="srp-undo"
            onClick={undo}
            disabled={!undoBuffer}
            title="Undo last change (U)"
          >
            ↶ Undo
          </button>
          <button className="srp-reset" onClick={resetPlanner}>
            Clear planner
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={importBackup}
        />
      </section>

      {/* Add / edit modal */}

      {showForm &&
        createPortal(
          <div
            className="srp-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeForm();
            }}
          >
            <div
              className="srp-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="srp-modal-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="srp-modal-header">
                <div>
                  <span className="srp-eyebrow">YOUR LEARNING PLAN</span>
                  <h3 id="srp-modal-title">
                    {editingId ? "Edit topic" : "Add a new topic"}
                  </h3>
                </div>
                <button
                  type="button"
                  className="srp-close"
                  onClick={closeForm}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <form onSubmit={submitForm} className="srp-form">
                <div className="srp-field">
                  <label htmlFor="srp-title">Topic name *</label>
                  <input
                    id="srp-title"
                    autoFocus
                    required
                    maxLength={120}
                    placeholder="e.g. Photosynthesis"
                    value={form.title}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        title: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="srp-form-row">
                  <div className="srp-field">
                    <label htmlFor="srp-subject">Subject</label>
                    <select
                      id="srp-subject"
                      value={form.subject}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          subject: event.target.value,
                        }))
                      }
                    >
                      {SUBJECTS.map((subject) => (
                        <option key={subject} value={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="srp-field">
                    <label htmlFor="srp-difficulty">Difficulty</label>
                    <select
                      id="srp-difficulty"
                      value={form.difficulty}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          difficulty: event.target
                            .value as Difficulty,
                        }))
                      }
                    >
                      {DIFFICULTIES.map((difficulty) => (
                        <option
                          key={difficulty.id}
                          value={difficulty.id}
                        >
                          {difficulty.label} — {difficulty.hint}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!editingId && (
                  <div className="srp-field srp-date-field" ref={calendarRef}>
                    <label>Date first learned *</label>
                    <div className="srp-date-input-wrapper">
                      <input
                        type="text"
                        readOnly
                        placeholder="Select a date"
                        value={
                          form.learnedDate
                            ? formatDate(form.learnedDate)
                            : ""
                        }
                        onClick={() => {
                          setShowCalendar(!showCalendar);
                          if (form.learnedDate) {
                            setCalendarMonth(parseDate(form.learnedDate));
                          } else {
                            setCalendarMonth(new Date());
                          }
                        }}
                      />
                      <svg
                        className="srp-calendar-icon"
                        onClick={() => {
                          setShowCalendar(!showCalendar);
                          if (form.learnedDate) {
                            setCalendarMonth(parseDate(form.learnedDate));
                          } else {
                            setCalendarMonth(new Date());
                          }
                        }}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>

                    {showCalendar && (
                      <div className="srp-calendar">
                        <div className="srp-calendar-header">
                          <button
                            type="button"
                            className="srp-calendar-nav"
                            onClick={handlePrevMonth}
                          >
                            ←
                          </button>
                          <strong>
                            {calendarMonth.toLocaleDateString(undefined, {
                              month: "long",
                              year: "numeric",
                            })}
                          </strong>
                          <button
                            type="button"
                            className="srp-calendar-nav"
                            onClick={handleNextMonth}
                          >
                            →
                          </button>
                        </div>
                        <div className="srp-calendar-grid">
                          {WEEKDAYS_SHORT.map((day) => (
                            <span key={day} className="srp-calendar-day-name">
                              {day}
                            </span>
                          ))}
                          {calendarCells.map((cell, i) =>
                            cell.day === 0 ? (
                              <span key={`empty-${i}`} />
                            ) : (
                              <button
                                key={cell.date}
                                type="button"
                                disabled={cell.disabled}
                                className={`srp-calendar-day ${
                                  form.learnedDate === cell.date
                                    ? "selected"
                                    : ""
                                } ${cell.date === today ? "today" : ""}`}
                                onClick={() => handleSelectDate(cell.date)}
                              >
                                {cell.day}
                              </button>
                            )
                          )}
                        </div>
                        <div className="srp-calendar-footer">
                          <button
                            type="button"
                            onClick={handleClearDate}
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={handleTodayDate}
                          >
                            Today
                          </button>
                        </div>
                      </div>
                    )}
                    <small>
                      Your revision dates will be calculated from this
                      date.
                    </small>
                  </div>
                )}

                <div className="srp-field">
                  <label htmlFor="srp-notes">Notes (optional)</label>
                  <textarea
                    id="srp-notes"
                    rows={3}
                    maxLength={2000}
                    placeholder="Add a short note about what you want to remember..."
                    value={form.notes}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        notes: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="srp-field">
                  <label>Revision intervals (days after learning)</label>
                  <div className="srp-intervals">
                    {form.intervals.map((interval, index) => (
                      <div
                        className="srp-interval-row"
                        key={index}
                      >
                        <span className="srp-interval-label">
                          Review {index + 1}
                        </span>
                        <div className="srp-interval-input">
                          <input
                            type="number"
                            min={0}
                            max={3650}
                            value={interval}
                            onChange={(event) => {
                              const value = Number(
                                event.target.value
                              );
                              if (!Number.isFinite(value)) return;
                              setForm((previous) => ({
                                ...previous,
                                intervals: previous.intervals.map(
                                  (v, i) =>
                                    i === index ? value : v
                                ),
                              }));
                            }}
                            aria-label={`Interval ${
                              index + 1
                            } in days`}
                          />
                          <span className="srp-interval-suffix">
                            days
                          </span>
                        </div>
                        <button
                          type="button"
                          className="srp-interval-remove"
                          onClick={() =>
                            setForm((previous) => ({
                              ...previous,
                              intervals:
                                previous.intervals.filter(
                                  (_, i) => i !== index
                                ),
                            }))
                          }
                          disabled={form.intervals.length <= 1}
                          aria-label={`Remove interval ${
                            index + 1
                          }`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="srp-interval-actions">
                    <button
                      type="button"
                      className="srp-secondary"
                      onClick={() =>
                        setForm((previous) => {
                          const last =
                            previous.intervals[
                              previous.intervals.length - 1
                            ] ?? 1;
                          return {
                            ...previous,
                            intervals: [
                              ...previous.intervals,
                              Math.min(3650, last * 2 || 1),
                            ],
                          };
                        })
                      }
                    >
                      + Add interval
                    </button>
                    <button
                      type="button"
                      className="srp-secondary"
                      onClick={() =>
                        setForm((previous) => ({
                          ...previous,
                          intervals: [...BASE_INTERVALS],
                        }))
                      }
                    >
                      Reset to defaults
                    </button>
                  </div>
                </div>

                <div className="srp-schedule-preview">
                  <strong>Your revision schedule</strong>
                  <div className="srp-preview-grid">
                    {scaledIntervals(
                      form.intervals,
                      form.difficulty
                    ).map((interval) => (
                      <div
                        className="srp-preview-item"
                        key={interval}
                      >
                        <span>Day {interval}</span>
                        <small>
                          {formatDate(
                            addDays(form.learnedDate, interval)
                          )}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="srp-modal-actions">
                  <button
                    type="button"
                    className="srp-cancel"
                    onClick={closeForm}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="srp-primary">
                    {editingId ? "Save changes" : "Create schedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Toast */}

      {notice && (
        <div className="srp-toast" role="status" aria-live="polite">
          {notice}
          {undoBuffer && (
            <button className="srp-toast-undo" onClick={undo}>
              Undo
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        .srp {
          --srp-primary: #ff5a1f;
          --srp-primary-dark: #e64a14;
          --srp-text: #172033;
          --srp-muted: #64748b;
          --srp-border: #e5e9f1;
          --srp-bg: #f8fafc;
          color: var(--srp-text);
          width: 100%;
          font-family: inherit;
        }

        .srp * {
          box-sizing: border-box;
        }

        .srp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
        }

        .srp-eyebrow {
          display: block;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: var(--srp-primary);
          margin-bottom: 7px;
        }

        .srp-header h2 {
          font-size: clamp(24px, 4vw, 32px);
          line-height: 1.2;
          margin: 0 0 9px;
          font-weight: 800;
          letter-spacing: -0.7px;
        }

        .srp-header p {
          margin: 0;
          color: var(--srp-muted);
          font-size: 14px;
          line-height: 1.65;
          max-width: 650px;
        }

        .srp-primary {
          border: 0;
          border-radius: 10px;
          background: var(--srp-primary);
          color: white;
          padding: 12px 17px;
          font-weight: 750;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
        }

        .srp-primary:hover {
          background: var(--srp-primary-dark);
        }

        .srp-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .srp-secondary {
          border: 1px solid var(--srp-border);
          background: white;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 750;
          color: var(--srp-text);
          cursor: pointer;
        }

        .srp-secondary:hover {
          border-color: var(--srp-primary);
          color: var(--srp-primary);
        }

        .srp-secondary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .srp-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .srp-stat {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          border: 1px solid var(--srp-border);
          border-radius: 13px;
          padding: 17px;
          min-width: 0;
        }

        .srp-stat-icon {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border-radius: 11px;
          background: #f0efff;
          font-size: 19px;
          flex-shrink: 0;
        }

        .srp-stat strong,
        .srp-stat span:last-child {
          display: block;
        }

        .srp-stat strong {
          font-size: 23px;
          line-height: 1.2;
          font-weight: 800;
        }

        .srp-stat div span {
          font-size: 11px;
          color: var(--srp-muted);
          margin-top: 4px;
        }

        .srp-progress-card,
        .srp-today-card,
        .srp-topics-section,
        .srp-help,
        .srp-backup {
          background: white;
          border: 1px solid var(--srp-border);
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .srp-progress-heading,
        .srp-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .srp-progress-heading h3,
        .srp-section-heading h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
        }

        .srp-progress-heading p,
        .srp-section-heading p {
          margin: 5px 0 0;
          color: var(--srp-muted);
          font-size: 12px;
          line-height: 1.5;
        }

        .srp-progress-heading > strong {
          font-size: 25px;
          color: var(--srp-primary);
        }

        .srp-progress-track {
          width: 100%;
          height: 9px;
          border-radius: 20px;
          overflow: hidden;
          background: #edf0f6;
          margin-top: 15px;
        }

        .srp-progress-track > div {
          height: 100%;
          border-radius: inherit;
          background: var(--srp-primary);
          transition: width 0.25s ease;
        }

        .srp-progress-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 15px;
        }

        .srp-analytics {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px dashed var(--srp-border);
        }

        .srp-analytics-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .srp-analytics-grid div {
          background: var(--srp-bg);
          border-radius: 9px;
          padding: 10px;
        }

        .srp-analytics-grid span {
          display: block;
          font-size: 10px;
          color: var(--srp-muted);
          font-weight: 700;
        }

        .srp-analytics-grid strong {
          display: block;
          font-size: 18px;
          margin-top: 4px;
          font-weight: 800;
        }

        .srp-rating-breakdown {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .srp-rating-breakdown div {
          flex: 1;
          min-width: 70px;
          background: var(--srp-bg);
          border-radius: 8px;
          padding: 8px 10px;
          text-align: center;
        }

        .srp-rating-breakdown span {
          display: block;
          font-size: 10px;
          color: var(--srp-muted);
        }

        .srp-rating-breakdown strong {
          display: block;
          font-size: 15px;
          margin-top: 3px;
        }

        .srp-subject-breakdown {
          margin-top: 15px;
        }

        .srp-subject-breakdown > strong {
          display: block;
          font-size: 11px;
          margin-bottom: 8px;
        }

        .srp-subject-row {
          display: grid;
          grid-template-columns: minmax(80px, 140px) 1fr auto;
          align-items: center;
          gap: 10px;
          margin-bottom: 7px;
          font-size: 10px;
        }

        .srp-subject-row .srp-progress-track {
          margin-top: 0;
          height: 6px;
        }

        .srp-count {
          padding: 6px 10px;
          background: #f0efff;
          color: var(--srp-primary);
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
        }

        .srp-empty-small {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 20px 0 2px;
        }

        .srp-empty-small > span {
          font-size: 25px;
        }

        .srp-empty-small strong {
          font-size: 13px;
        }

        .srp-empty-small p {
          font-size: 12px;
          color: var(--srp-muted);
          margin: 4px 0 0;
          line-height: 1.5;
        }

        .srp-today-list {
          margin-top: 14px;
        }

        .srp-today-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 0;
          border-top: 1px solid var(--srp-border);
          flex-wrap: wrap;
        }

        .srp-today-item strong,
        .srp-today-item span {
          display: block;
        }

        .srp-today-item strong {
          font-size: 13px;
        }

        .srp-today-item span {
          font-size: 11px;
          color: var(--srp-muted);
          margin-top: 4px;
        }

        .srp-today-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .srp-rating-btn {
          border: 0;
          border-radius: 7px;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          color: white;
        }

        .srp-rating-again {
          background: #dc3f4b;
        }

        .srp-rating-hard {
          background: #f59e0b;
        }

        .srp-rating-good {
          background: #10b981;
        }

        .srp-rating-easy {
          background: #3b82f6;
        }

        .srp-complete-btn,
        .srp-mark-btn {
          border: 0;
          border-radius: 8px;
          padding: 8px 11px;
          background: #e8f8ef;
          color: #147a42;
          font-weight: 750;
          font-size: 11px;
          cursor: pointer;
        }

        .srp-controls {
          display: flex;
          gap: 10px;
          margin-top: 17px;
          flex-wrap: wrap;
        }

        .srp-search,
        .srp-select {
          min-height: 42px;
          border: 1px solid var(--srp-border);
          border-radius: 9px;
          background: white;
          padding: 0 12px;
          color: var(--srp-text);
          font-size: 12px;
          outline: none;
        }

        .srp-search {
          flex: 1;
          min-width: 160px;
        }

        .srp-select {
          min-width: 150px;
        }

        .srp-search:focus,
        .srp-select:focus {
          border-color: var(--srp-primary);
          box-shadow: 0 0 0 3px rgba(91, 85, 217, 0.1);
        }

        .srp-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin: 13px 0 17px;
        }

        .srp-filter {
          border: 1px solid var(--srp-border);
          background: white;
          border-radius: 20px;
          padding: 8px 12px;
          color: var(--srp-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .srp-filter.active {
          color: white;
          background: var(--srp-primary);
          border-color: var(--srp-primary);
        }

        .srp-empty {
          text-align: center;
          padding: 35px 15px;
          border: 1px dashed var(--srp-border);
          border-radius: 12px;
        }

        .srp-empty > span {
          font-size: 35px;
        }

        .srp-empty h3 {
          font-size: 16px;
          margin: 10px 0 5px;
        }

        .srp-empty p {
          color: var(--srp-muted);
          font-size: 12px;
          line-height: 1.6;
          max-width: 430px;
          margin: 0 auto 15px;
        }

        .srp-topic-list {
          display: grid;
          gap: 13px;
        }

        .srp-topic-card {
          border: 1px solid var(--srp-border);
          border-radius: 12px;
          padding: 17px;
          min-width: 0;
        }

        .srp-topic-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .srp-topic-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .srp-subject {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 5px;
          background: #f0efff;
          color: var(--srp-primary);
          font-size: 10px;
          font-weight: 800;
        }

        .srp-difficulty {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 5px;
          font-size: 10px;
          font-weight: 800;
          text-transform: capitalize;
        }

        .srp-difficulty-easy {
          background: #e8f8ef;
          color: #147a42;
        }

        .srp-difficulty-medium {
          background: #fff4e5;
          color: #b45309;
        }

        .srp-difficulty-hard {
          background: #fdecec;
          color: #c24136;
        }

        .srp-topic-info h4 {
          font-size: 16px;
          margin: 8px 0 4px;
          overflow-wrap: anywhere;
        }

        .srp-topic-info p {
          color: var(--srp-muted);
          font-size: 11px;
          margin: 0;
        }

        .srp-topic-info .srp-notes {
          margin-top: 7px;
          line-height: 1.5;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .srp-topic-actions {
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }

        .srp-topic-actions button {
          border: 1px solid var(--srp-border);
          background: white;
          padding: 7px 9px;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 700;
          color: var(--srp-text);
          cursor: pointer;
        }

        .srp-topic-actions .srp-delete {
          color: #dc3f4b;
        }

        .srp-topic-progress {
          margin-top: 17px;
        }

        .srp-topic-progress > div:first-child {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 10px;
          color: var(--srp-muted);
        }

        .srp-topic-progress strong {
          color: var(--srp-primary);
        }

        .srp-topic-progress .srp-progress-track {
          height: 6px;
          margin-top: 8px;
        }

        .srp-next {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          margin-top: 15px;
          padding: 10px 12px;
          background: var(--srp-bg);
          border-radius: 8px;
          font-size: 11px;
          flex-wrap: wrap;
        }

        .srp-next > span {
          color: var(--srp-muted);
        }

        .srp-next strong {
          font-size: 11px;
        }

        .srp-next em {
          font-style: normal;
          margin-left: 7px;
          color: #c24136;
          font-size: 9px;
          font-weight: 800;
        }

        .srp-next em.srp-due-today {
          color: #147a42;
        }

        .srp-finished {
          color: #147a42;
        }

        .srp-schedule {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
          margin-top: 13px;
        }

        .srp-revision {
          min-width: 0;
          border: 1px solid var(--srp-border);
          border-radius: 9px;
          padding: 10px;
          background: white;
        }

        .srp-revision.is-completed {
          border-color: #b9e8cc;
          background: #f3fbf6;
        }

        .srp-revision.is-overdue {
          border-color: #f3c4c4;
          background: #fff8f8;
        }

        .srp-revision.is-today {
          border-color: #c8c5ff;
          background: #f7f6ff;
        }

        .srp-revision-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 5px;
          margin-bottom: 7px;
        }

        .srp-revision-top > span:first-child {
          font-size: 11px;
          font-weight: 800;
        }

        .srp-revision-status {
          color: var(--srp-muted);
          font-size: 9px;
          text-align: right;
        }

        .is-completed .srp-revision-status {
          color: #147a42;
        }

        .is-overdue .srp-revision-status {
          color: #c24136;
        }

        .srp-revision > strong {
          font-size: 11px;
          display: block;
        }

        .srp-revision-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 9px;
        }

        .srp-revision-actions button {
          border: 0;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 9px;
          font-weight: 750;
          cursor: pointer;
        }

        .srp-revision-actions .srp-undo-btn {
          background: #e8edf4;
          color: #475569;
        }

        .srp-postpone-btn {
          background: #f1f3f8;
          color: #475569;
        }

        .srp-help-toggle {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 0;
          background: none;
          padding: 0;
          color: var(--srp-text);
          font-weight: 800;
          font-size: 13px;
          text-align: left;
          cursor: pointer;
        }

        .srp-help-toggle span:last-child {
          font-size: 20px;
          color: var(--srp-primary);
        }

        .srp-help-content {
          border-top: 1px solid var(--srp-border);
          margin-top: 14px;
          padding-top: 13px;
          color: var(--srp-muted);
          font-size: 12px;
          line-height: 1.7;
        }

        .srp-help-content p {
          margin: 0 0 10px;
        }

        .srp-help-content ol {
          padding-left: 20px;
          margin: 8px 0 12px;
        }

        .srp-backup {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        .srp-backup strong {
          font-size: 12px;
        }

        .srp-backup p {
          font-size: 11px;
          color: var(--srp-muted);
          line-height: 1.5;
          margin: 5px 0 0;
          max-width: 460px;
        }

        .srp-backup-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .srp-backup-actions button {
          background: white;
          border: 1px solid var(--srp-border);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 10px;
          font-weight: 750;
          cursor: pointer;
          color: var(--srp-text);
        }

        .srp-backup-actions .srp-reset {
          color: #dc3f4b;
        }

        .srp-backup-actions button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* ----------------------------- Modal ----------------------------- */

        .srp-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.62);
          overflow-y: auto;
        }

        .srp-modal {
          width: 100%;
          max-width: 620px;
          max-height: calc(100dvh - 40px);
          overflow-y: auto;
          overscroll-behavior: contain;
          background: white;
          border-radius: 16px;
          padding: 26px 26px 22px;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.28);
          isolation: isolate; /* Creates stacking context for the calendar */
        }

        .srp-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 22px;
        }

        .srp-modal-header h3 {
          font-size: 22px;
          margin: 4px 0 0;
          font-weight: 800;
        }

        .srp-close {
          border: 0;
          background: #f1f3f8;
          border-radius: 8px;
          width: 34px;
          height: 34px;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
          color: var(--srp-text);
          flex-shrink: 0;
        }

        .srp-close:hover {
          background: #e6e9f2;
        }

        .srp-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .srp-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .srp-field > label,
        .srp-field > span {
          font-size: 12px;
          font-weight: 750;
          color: var(--srp-text);
        }

        /* 
          Force explicit border styles so global CSS resets 
          (like Tailwind's Preflight) cannot hide the borders.
        */
        .srp-field input,
        .srp-field select,
        .srp-field textarea,
        .srp-interval-input input {
          width: 100%;
          min-height: 44px;
          border-width: 1px !important;
          border-style: solid !important;
          border-color: #cbd5e1 !important; /* Darker gray for clear visibility */
          border-radius: 9px;
          padding: 10px 12px;
          font: inherit;
          font-size: 13px;
          color: var(--srp-text);
          background-color: #f8fafc; /* Light gray background so it stands out */
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
        }

        .srp-field input[type="number"] {
          padding-right: 8px;
        }

        .srp-field textarea {
          resize: vertical;
          min-height: 88px;
          line-height: 1.5;
        }

        .srp-field input::placeholder,
        .srp-field textarea::placeholder {
          color: #94a3b8;
        }

        .srp-field input:focus,
        .srp-field select:focus,
        .srp-field textarea:focus,
        .srp-interval-input input:focus {
          border-color: var(--srp-primary) !important;
          background-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(91, 85, 217, 0.12);
        }

        .srp-field small {
          display: block;
          color: var(--srp-muted);
          font-size: 11px;
          line-height: 1.45;
        }

        .srp-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        /* Custom Date Picker */

        .srp-date-field {
          position: relative;
        }

        .srp-date-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .srp-date-input-wrapper input {
          cursor: pointer;
          padding-right: 40px;
        }

        .srp-calendar-icon {
          position: absolute;
          right: 12px;
          width: 18px;
          height: 18px;
          color: var(--srp-muted);
          cursor: pointer;
        }

        .srp-calendar {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          z-index: 50;
          background: white;
          border: 1px solid var(--srp-border);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          width: 300px;
        }

        .srp-calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .srp-calendar-header strong {
          font-size: 13px;
          font-weight: 800;
        }

        .srp-calendar-nav {
          border: 0;
          background: transparent;
          font-size: 14px;
          cursor: pointer;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          color: var(--srp-muted);
        }

        .srp-calendar-nav:hover {
          background: #f1f3f8;
          color: var(--srp-text);
        }

        .srp-calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .srp-calendar-day-name {
          text-align: center;
          font-size: 10px;
          font-weight: 750;
          color: var(--srp-muted);
          padding: 4px 0;
        }

        .srp-calendar-day {
          height: 32px;
          border: 1px solid transparent;
          background: transparent;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          color: var(--srp-text);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .srp-calendar-day:hover:not(:disabled) {
          background: #f1f3f8;
        }

        .srp-calendar-day.today {
          font-weight: 800;
          color: var(--srp-primary);
          border-color: var(--srp-primary);
        }

        .srp-calendar-day.selected {
          background: var(--srp-primary);
          color: white;
          font-weight: 800;
          border-color: var(--srp-primary);
        }

        .srp-calendar-day:disabled {
          color: #cbd5e1;
          cursor: not-allowed;
          text-decoration: line-through;
        }

        .srp-calendar-footer {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          border-top: 1px solid var(--srp-border);
          padding-top: 10px;
        }

        .srp-calendar-footer button {
          border: 0;
          background: transparent;
          font-size: 11px;
          font-weight: 750;
          color: var(--srp-primary);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .srp-calendar-footer button:hover {
          background: #f0efff;
        }

        /* Interval editor */

        .srp-intervals {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: var(--srp-bg);
          border: 1px solid var(--srp-border);
          border-radius: 10px;
        }

        .srp-interval-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .srp-interval-label {
          font-size: 11px;
          color: var(--srp-muted);
          font-weight: 700;
          min-width: 62px;
        }

        .srp-interval-input {
          flex: 1;
          display: flex;
          align-items: center;
          position: relative;
          min-width: 0;
        }

        .srp-interval-input input {
          flex: 1;
          min-height: 40px;
          padding: 8px 44px 8px 12px;
          font-variant-numeric: tabular-nums;
        }

        /* Hide native number spinners to prevent overlap with the "days" suffix */
        .srp-interval-input input::-webkit-outer-spin-button,
        .srp-interval-input input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .srp-interval-input input[type="number"] {
          -moz-appearance: textfield;
          appearance: textfield;
        }

        .srp-interval-suffix {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 11px;
          color: var(--srp-muted);
          pointer-events: none;
          font-weight: 600;
        }

        .srp-interval-remove {
          border: 1px solid var(--srp-border);
          background: white;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
          color: #dc3f4b;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .srp-interval-remove:hover:not(:disabled) {
          background: #fdecec;
          border-color: #f3c4c4;
        }

        .srp-interval-remove:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          color: var(--srp-muted);
        }

        .srp-interval-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }

        /* Schedule preview */

        .srp-schedule-preview {
          background: var(--srp-bg);
          border: 1px solid var(--srp-border);
          border-radius: 10px;
          padding: 14px;
        }

        .srp-schedule-preview > strong {
          font-size: 12px;
          font-weight: 750;
          display: block;
          margin-bottom: 10px;
          color: var(--srp-text);
        }

        .srp-preview-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .srp-preview-item {
          background: white;
          border: 1px solid var(--srp-border);
          border-radius: 8px;
          padding: 9px 10px;
          min-width: 0;
        }

        .srp-preview-item > span {
          display: block;
          font-size: 11px;
          font-weight: 800;
          color: var(--srp-text);
        }

        .srp-preview-item > small {
          display: block;
          font-size: 10px;
          color: var(--srp-muted);
          margin-top: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Modal actions */

        .srp-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          border-top: 1px solid var(--srp-border);
          padding-top: 16px;
          margin-top: 2px;
        }

        .srp-cancel {
          border: 1px solid var(--srp-border);
          background: white;
          border-radius: 9px;
          padding: 11px 16px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          color: var(--srp-text);
        }

        .srp-cancel:hover {
          border-color: #cbd2df;
          background: #f8fafc;
        }

        .srp-modal-actions .srp-primary {
          padding: 11px 18px;
          border-radius: 9px;
          font-size: 12px;
        }

        /* Toast */

        .srp-toast {
          position: fixed;
          z-index: 2147483001;
          left: 50%;
          bottom: 22px;
          transform: translateX(-50%);
          background: #172033;
          color: white;
          padding: 12px 17px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 650;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
          max-width: calc(100% - 30px);
          text-align: center;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .srp-toast-undo {
          border: 0;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        button:focus-visible {
          outline: 3px solid rgba(91, 85, 217, 0.35);
          outline-offset: 2px;
        }

        @media (max-width: 700px) {
          .srp-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .srp-header {
            flex-direction: column;
          }

          .srp-header > button {
            width: 100%;
          }

          .srp-schedule {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .srp-backup {
            align-items: flex-start;
          }

          .srp-analytics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .srp-form-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .srp-modal-backdrop {
            padding: 12px;
            align-items: flex-start;
          }

          .srp-modal {
            padding: 20px 18px 18px;
            max-height: calc(100dvh - 24px);
          }

          .srp-modal-actions {
            flex-direction: column-reverse;
          }

          .srp-modal-actions .srp-primary,
          .srp-modal-actions .srp-cancel {
            width: 100%;
          }

          .srp-interval-row {
            flex-wrap: wrap;
          }

          .srp-interval-label {
            min-width: 100%;
          }

          .srp-preview-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .srp-calendar {
            width: 100%;
            left: 0;
            right: 0;
          }
        }

        @media (max-width: 460px) {
          .srp-progress-card,
          .srp-today-card,
          .srp-topics-section,
          .srp-help,
          .srp-backup {
            padding: 14px;
          }

          .srp-controls {
            flex-direction: column;
          }

          .srp-select {
            width: 100%;
          }

          .srp-topic-card {
            padding: 13px;
          }

          .srp-topic-top {
            flex-direction: column;
          }

          .srp-topic-actions {
            justify-content: flex-start;
          }

          .srp-schedule {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .srp-preview-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .srp-progress-track > div,
          .srp-field input,
          .srp-field select,
          .srp-field textarea,
          .srp-interval-input input {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}