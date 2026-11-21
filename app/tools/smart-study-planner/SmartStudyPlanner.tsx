"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ToolShell from "../ToolShell";

/* ---------------------------------------------------------------- types */

type Priority = "High" | "Medium" | "Low";
type Status = "Pending" | "In progress" | "Completed";
type Recurrence = "once" | "daily" | "weekly";
type View = "dashboard" | "today" | "week" | "all";
type Tone = "idle" | "active" | "success" | "warn";
type FocusMode = "focus" | "break";

type Subtask = { id: string; title: string; done: boolean };
type HistoryEntry = {
  date: string;
  minutes: number;
  kind?: "focus" | "complete";
};

type StudyTask = {
  id: string;
  subject: string;
  topic: string;
  notes: string;
  tags: string[];
  dueDate: string;
  minutes: number;
  trackedMinutes: number;
  priority: Priority;
  status: Status;
  recurrence: Recurrence;
  subtasks: Subtask[];
  pinned: boolean;
  createdAt: number;
  completedAt: number | null;
  history: HistoryEntry[];
};

type Settings = {
  dailyMinutes: number;
  planDays: number;
  autoRollover: boolean;
  restDays: number[];
  focusMinutes: number;
  breakMinutes: number;
};

type Persisted = { version: 2; tasks: StudyTask[]; settings: Settings };
type PlannedSlice = {
  task: StudyTask;
  allocated: number;
  remainingAfter: number;
  recurringInstance?: boolean;
};
type PlanDay = {
  date: string;
  slices: PlannedSlice[];
  totalMinutes: number;
  rest: boolean;
};
type ConfirmState = {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
} | null;

/* ------------------------------------------------------------ constants */

const STORAGE_KEY = "toolsab-smart-study-planner-v2";
const LEGACY_KEY = "toolsab-smart-study-planner-v1";

const DAILY_OPTIONS = [30, 60, 90, 120, 180, 240, 300, 360, 480, 600, 720];
const PLAN_DAY_OPTIONS = [1, 3, 5, 7, 14];
const FOCUS_OPTIONS = [15, 20, 25, 30, 45, 50, 60, 90];
const BREAK_OPTIONS = [3, 5, 10, 15, 20];
const PRIORITIES: Priority[] = ["High", "Medium", "Low"];
const STATUSES: Status[] = ["Pending", "In progress", "Completed"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const RECURRENCES: { id: Recurrence; label: string }[] = [
  { id: "once", label: "Once" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
];

const DEFAULT_SETTINGS: Settings = {
  dailyMinutes: 180,
  planDays: 7,
  autoRollover: false,
  restDays: [],
  focusMinutes: 25,
  breakMinutes: 5,
};

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/* -------------------------------------------------------------- helpers */

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toDateString(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function todayString() {
  return toDateString(new Date());
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

function weekdayOf(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).getDay();
}

function formatDate(value: string) {
  if (!value) return "No deadline";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatWeekday(dateStr: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" })
    .format(new Date(`${dateStr}T00:00:00`))
    .slice(0, 3);
}

function getDaysUntil(dueDate: string, referenceDate: string) {
  if (!dueDate) return 999;
  const due = new Date(`${dueDate}T00:00:00`).getTime();
  const ref = new Date(`${referenceDate}T00:00:00`).getTime();
  return Math.round((due - ref) / 86400000);
}

function priorityWeight(priority: Priority) {
  if (priority === "High") return 30;
  if (priority === "Medium") return 20;
  return 10;
}

function taskScore(task: StudyTask, referenceDate: string) {
  const daysUntil = getDaysUntil(task.dueDate, referenceDate);
  const urgency = task.dueDate ? Math.max(-10, 14 - daysUntil) * 5 : 0;
  const pinnedBoost = task.pinned ? 100 : 0;
  const recurringBoost =
    task.recurrence === "daily" ? 6 : task.recurrence === "weekly" ? 3 : 0;
  return priorityWeight(task.priority) + urgency + pinnedBoost + recurringBoost;
}

function formatDuration(value: number) {
  if (value <= 0) return "0 min";
  const hours = Math.floor(value / 60);
  const mins = Math.round(value % 60);
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function isOverdue(task: StudyTask) {
  return (
    task.status !== "Completed" &&
    task.dueDate !== "" &&
    getDaysUntil(task.dueDate, todayString()) < 0
  );
}

function remainingMinutesOf(task: StudyTask) {
  return Math.max(0, task.minutes - task.trackedMinutes);
}

function sanitizeSettings(raw: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== "object") return out;
  const s = raw as Record<string, unknown>;
  if (typeof s.dailyMinutes === "number" && Number.isFinite(s.dailyMinutes))
    out.dailyMinutes = Math.max(15, Math.min(1440, Math.round(s.dailyMinutes)));
  if (typeof s.planDays === "number" && Number.isFinite(s.planDays))
    out.planDays = Math.max(1, Math.min(14, Math.round(s.planDays)));
  if (typeof s.autoRollover === "boolean") out.autoRollover = s.autoRollover;
  if (Array.isArray(s.restDays))
    out.restDays = Array.from(
      new Set(
        s.restDays.filter(
          (d): d is number => Number.isInteger(d) && d >= 0 && d <= 6,
        ),
      ),
    );
  if (typeof s.focusMinutes === "number" && Number.isFinite(s.focusMinutes))
    out.focusMinutes = Math.max(5, Math.min(120, Math.round(s.focusMinutes)));
  if (typeof s.breakMinutes === "number" && Number.isFinite(s.breakMinutes))
    out.breakMinutes = Math.max(1, Math.min(60, Math.round(s.breakMinutes)));
  return out;
}

function sanitizeTask(raw: unknown): StudyTask | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (
    typeof t.id !== "string" ||
    typeof t.subject !== "string" ||
    typeof t.topic !== "string" ||
    typeof t.minutes !== "number" ||
    !PRIORITIES.includes(t.priority as Priority) ||
    !STATUSES.includes(t.status as Status)
  ) {
    return null;
  }
  const minutes = Math.max(5, Math.min(1440, Math.round(t.minutes)));
  return {
    id: t.id,
    subject: t.subject,
    topic: t.topic,
    notes: typeof t.notes === "string" ? t.notes : "",
    tags: Array.isArray(t.tags)
      ? t.tags.filter((x): x is string => typeof x === "string").slice(0, 10)
      : [],
    dueDate: typeof t.dueDate === "string" ? t.dueDate : "",
    minutes,
    trackedMinutes:
      typeof t.trackedMinutes === "number" && Number.isFinite(t.trackedMinutes)
        ? Math.max(0, Math.round(t.trackedMinutes))
        : 0,
    priority: t.priority as Priority,
    status: t.status as Status,
    recurrence:
      t.recurrence === "daily" || t.recurrence === "weekly"
        ? t.recurrence
        : "once",
    subtasks: Array.isArray(t.subtasks)
      ? (t.subtasks as unknown[])
          .map((s) => {
            if (!s || typeof s !== "object") return null;
            const so = s as Record<string, unknown>;
            if (typeof so.title !== "string") return null;
            return {
              id: typeof so.id === "string" ? so.id : createId(),
              title: so.title,
              done: so.done === true,
            };
          })
          .filter((s): s is Subtask => s !== null)
      : [],
    pinned: t.pinned === true,
    createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
    completedAt: typeof t.completedAt === "number" ? t.completedAt : null,
    history: Array.isArray(t.history)
      ? (t.history as unknown[])
          .map((h) => {
            if (!h || typeof h !== "object") return null;
            const ho = h as Record<string, unknown>;
            if (typeof ho.date !== "string" || typeof ho.minutes !== "number")
              return null;
            const entry: HistoryEntry = { date: ho.date, minutes: ho.minutes };
            if (ho.kind === "focus" || ho.kind === "complete")
              entry.kind = ho.kind;
            return entry;
          })
          .filter((h): h is HistoryEntry => h !== null)
      : [],
  };
}

/* ------------------------------------------------------------ scheduler */

function recurringDueOn(task: StudyTask, date: string) {
  if (task.recurrence === "daily") return true;
  if (task.recurrence === "weekly") {
    const anchor = task.dueDate || toDateString(new Date(task.createdAt));
    return weekdayOf(anchor) === weekdayOf(date);
  }
  return false;
}

function buildPlan(
  tasks: StudyTask[],
  startDate: string,
  dailyMinutes: number,
  planDays: number,
  restDays: number[],
): PlanDay[] {
  const remaining = new Map<string, number>();
  const active = tasks.filter((t) => t.status !== "Completed");
  for (const t of active) {
    if (t.recurrence === "once") remaining.set(t.id, remainingMinutesOf(t));
  }

  const days: PlanDay[] = [];

  for (let dayOffset = 0; dayOffset < planDays; dayOffset += 1) {
    const date = addDays(startDate, dayOffset);

    if (restDays.includes(weekdayOf(date))) {
      days.push({ date, slices: [], totalMinutes: 0, rest: true });
      continue;
    }

    let budget = dailyMinutes;
    const slices: PlannedSlice[] = [];

    const ranked = active
      .map((t) => ({ task: t, score: taskScore(t, date) }))
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.task.createdAt - b.task.createdAt;
      });

    for (const { task } of ranked) {
      if (budget <= 0) break;

      if (task.recurrence !== "once") {
        if (!recurringDueOn(task, date)) continue;
        if (task.history.some((h) => h.date === date && h.kind === "complete"))
          continue;
        const allocated = Math.min(task.minutes, budget);
        if (allocated <= 0) continue;
        slices.push({
          task,
          allocated,
          remainingAfter: 0,
          recurringInstance: true,
        });
        budget -= allocated;
        continue;
      }

      const remainingMinutes = remaining.get(task.id) ?? 0;
      if (remainingMinutes <= 0) continue;
      const allocated = Math.min(remainingMinutes, budget);
      if (allocated <= 0) continue;
      slices.push({
        task,
        allocated,
        remainingAfter: remainingMinutes - allocated,
      });
      remaining.set(task.id, remainingMinutes - allocated);
      budget -= allocated;
    }

    const totalMinutes = slices.reduce((s, x) => s + x.allocated, 0);
    days.push({ date, slices, totalMinutes, rest: false });
  }

  return days;
}

/* ------------------------------------------------------------ component */

export default function SmartStudyPlanner() {
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const [view, setView] = useState<View>("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [sortKey, setSortKey] = useState<
    "score" | "due" | "created" | "subject"
  >("score");

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [recurrence, setRecurrence] = useState<Recurrence>("once");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const [planStart, setPlanStart] = useState(todayString());

  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [focusPick, setFocusPick] = useState("");
  const [focusMode, setFocusMode] = useState<FocusMode>("focus");
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusTotal, setFocusTotal] = useState(25 * 60);
  const [focusRemaining, setFocusRemaining] = useState(25 * 60);
  const [focusKey, setFocusKey] = useState(0);

  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [undoBuffer, setUndoBuffer] = useState<{
    tasks: StudyTask[];
    label: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [tone, setTone] = useState<Tone>("idle");
  const [showHelp, setShowHelp] = useState(false);
  const [mounted, setMounted] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const tasksRef = useRef<StudyTask[]>([]);
  const endAtRef = useRef(0);
  const sessionRef = useRef({
    taskId: null as string | null,
    mode: "focus" as FocusMode,
    total: 25 * 60,
    remaining: 25 * 60,
  });
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  sessionRef.current = {
    taskId: focusTaskId,
    mode: focusMode,
    total: focusTotal,
    remaining: focusRemaining,
  };

  /* ---------------------------------------------------------- notifications */

  const flash = useCallback((message: string, kind: Tone = "idle") => {
    if (noticeTimerRef.current !== null)
      window.clearTimeout(noticeTimerRef.current);
    setNotice(message);
    setTone(kind);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
      setTone("idle");
      noticeTimerRef.current = null;
    }, 4200);
  }, []);

  /* -------------------------------------------------------------- hydrate */

  useEffect(() => {
    let loadedTasks: StudyTask[] = [];
    let loadedSettings: Settings = DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as Partial<Persisted>;
        if (Array.isArray(data.tasks))
          loadedTasks = data.tasks
            .map(sanitizeTask)
            .filter((t): t is StudyTask => t !== null);
        if (data.settings) loadedSettings = sanitizeSettings(data.settings);
      } else {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy) as {
            tasks?: unknown[];
            dailyMinutes?: number;
          };
          if (Array.isArray(parsed.tasks))
            loadedTasks = parsed.tasks
              .map(sanitizeTask)
              .filter((t): t is StudyTask => t !== null);
          if (typeof parsed.dailyMinutes === "number")
            loadedSettings = sanitizeSettings({
              ...DEFAULT_SETTINGS,
              dailyMinutes: parsed.dailyMinutes,
            });
        }
      }
    } catch {
      /* ignore */
    }

    if (loadedSettings.autoRollover) {
      const today = todayString();
      let moved = 0;
      loadedTasks = loadedTasks.map((t) => {
        if (
          t.status !== "Completed" &&
          t.dueDate &&
          getDaysUntil(t.dueDate, today) < 0
        ) {
          moved += 1;
          return { ...t, dueDate: today };
        }
        return t;
      });
      if (moved > 0)
        window.setTimeout(
          () =>
            flash(
              `${moved} overdue task${moved === 1 ? "" : "s"} moved to today.`,
              "warn",
            ),
          0,
        );
    }

    setTasks(loadedTasks);
    setSettings(loadedSettings);
    setFocusTotal(loadedSettings.focusMinutes * 60);
    setFocusRemaining(loadedSettings.focusMinutes * 60);
    setReady(true);
  }, [flash]);

  /* ---------------------------------------------------------- persistence */

  useEffect(() => {
    if (!ready) return;
    try {
      const payload: Persisted = { version: 2, tasks, settings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [tasks, settings, ready]);

  /* --------------------------------------------------------------- undo */

  const snapshotForUndo = useCallback((label: string) => {
    setUndoBuffer({ tasks: [...tasksRef.current], label });
  }, []);

  const undoLast = useCallback(() => {
    if (!undoBuffer) return;
    setTasks(undoBuffer.tasks);
    flash(`Undone: ${undoBuffer.label}`, "warn");
    setUndoBuffer(null);
  }, [undoBuffer, flash]);

  /* -------------------------------------------------------------- form */

  const resetForm = useCallback(() => {
    setEditingId(null);
    setSubject("");
    setTopic("");
    setNotes("");
    setTagInput("");
    setDueDate("");
    setMinutes("60");
    setPriority("Medium");
    setRecurrence("once");
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const s = subject.trim();
      const t = topic.trim();
      const mins = Number(minutes);
      if (!s || !t) return flash("Subject and topic are required.", "warn");
      if (!Number.isFinite(mins) || mins < 5 || mins > 1440)
        return flash("Study time must be between 5 and 1,440 minutes.", "warn");
      const tags = tagInput
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 10);

      if (editingId) {
        snapshotForUndo("Edit task");
        setTasks((prev) =>
          prev.map((task) =>
            task.id === editingId
              ? {
                  ...task,
                  subject: s,
                  topic: t,
                  notes: notes.trim(),
                  tags,
                  dueDate,
                  minutes: Math.round(mins),
                  priority,
                  recurrence,
                }
              : task,
          ),
        );
        flash("Task updated.", "success");
      } else {
        const newTask: StudyTask = {
          id: createId(),
          subject: s,
          topic: t,
          notes: notes.trim(),
          tags,
          dueDate,
          minutes: Math.round(mins),
          trackedMinutes: 0,
          priority,
          status: "Pending",
          recurrence,
          subtasks: [],
          pinned: false,
          createdAt: Date.now(),
          completedAt: null,
          history: [],
        };
        setTasks((prev) => [newTask, ...prev]);
        flash("Task added.", "success");
      }
      resetForm();
      setShowEditor(false);
    },
    [
      subject,
      topic,
      notes,
      tagInput,
      dueDate,
      minutes,
      priority,
      recurrence,
      editingId,
      snapshotForUndo,
      flash,
      resetForm,
    ],
  );

  const startEdit = useCallback((task: StudyTask) => {
    setEditingId(task.id);
    setSubject(task.subject);
    setTopic(task.topic);
    setNotes(task.notes);
    setTagInput(task.tags.join(", "));
    setDueDate(task.dueDate);
    setMinutes(String(task.minutes));
    setPriority(task.priority);
    setRecurrence(task.recurrence);
    setShowEditor(true);
  }, []);

  const openNewTask = useCallback(() => {
    resetForm();
    setShowEditor(true);
  }, [resetForm]);

  /* ----------------------------------------------------------- task ops */

  const updateStatus = useCallback(
    (id: string, status: Status) => {
      const target = tasksRef.current.find((t) => t.id === id);
      if (!target || target.status === status) return;
      snapshotForUndo("Change status");

      const today = todayString();
      const completing = status === "Completed";
      const recurring = target.recurrence !== "once";

      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== id) return task;

          if (completing) {
            const remainder = remainingMinutesOf(task);
            const history: HistoryEntry[] = [
              ...task.history,
              { date: today, minutes: remainder, kind: "complete" },
            ];

            if (task.recurrence !== "once") {
              const step = task.recurrence === "daily" ? 1 : 7;
              let nextDue = task.dueDate;
              if (nextDue) {
                nextDue = addDays(nextDue, step);
                let guard = 0;
                while (getDaysUntil(nextDue, today) < 0 && guard < 400) {
                  nextDue = addDays(nextDue, step);
                  guard += 1;
                }
              }
              return {
                ...task,
                status: "Pending" as Status,
                trackedMinutes: 0,
                completedAt: Date.now(),
                dueDate: nextDue,
                subtasks: task.subtasks.map((s) => ({ ...s, done: false })),
                history,
              };
            }

            return { ...task, status, completedAt: Date.now(), history };
          }

          let history = task.history;
          if (task.status === "Completed") {
            const idx = [...task.history]
              .reverse()
              .findIndex((h) => h.kind === "complete");
            if (idx !== -1) {
              const realIdx = task.history.length - 1 - idx;
              history = task.history.filter((_, i) => i !== realIdx);
            }
          }
          return { ...task, status, completedAt: null, history };
        }),
      );

      if (completing && recurring)
        flash("Session logged — the next one is scheduled.", "success");
      else if (completing) flash("Marked complete.", "success");
      else if (status === "In progress") flash("In progress.", "active");
      else flash("Reopened.", "warn");
    },
    [snapshotForUndo, flash],
  );

  const togglePin = useCallback(
    (id: string) => {
      snapshotForUndo("Pin task");
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)),
      );
    },
    [snapshotForUndo],
  );

  const deleteTask = useCallback(
    (id: string) => {
      const target = tasksRef.current.find((t) => t.id === id);
      if (!target) return;
      setConfirm({
        title: "Delete this task?",
        body: `"${target.topic}" will be removed from your planner. You can undo once with the Undo button that appears.`,
        confirmLabel: "Delete task",
        danger: true,
        onConfirm: () => {
          snapshotForUndo("Delete task");
          setTasks((prev) => prev.filter((t) => t.id !== id));
          if (sessionRef.current.taskId === id) {
            setFocusRunning(false);
            setFocusTaskId(null);
          }
          flash("Task deleted.", "success");
        },
      });
    },
    [snapshotForUndo, flash],
  );

  const addSubtask = useCallback((taskId: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: [
                ...t.subtasks,
                { id: createId(), title: clean, done: false },
              ],
            }
          : t,
      ),
    );
  }, []);

  const toggleSubtask = useCallback((taskId: string, subId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subId ? { ...s, done: !s.done } : s,
              ),
            }
          : t,
      ),
    );
  }, []);

  const removeSubtask = useCallback((taskId: string, subId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subId) }
          : t,
      ),
    );
  }, []);

  const rollOverdueForward = useCallback(() => {
    const overdue = tasksRef.current.filter(isOverdue);
    if (overdue.length === 0) return flash("No overdue tasks to move.", "warn");
    setConfirm({
      title: `Move ${overdue.length} overdue task${overdue.length === 1 ? "" : "s"} forward?`,
      body: "Their deadlines will be set to today so they stop ranking as missed.",
      confirmLabel: "Move forward",
      onConfirm: () => {
        snapshotForUndo("Roll over overdue tasks");
        setTasks((prev) =>
          prev.map((t) =>
            isOverdue(t) ? { ...t, dueDate: todayString() } : t,
          ),
        );
        flash("Overdue tasks moved to today.", "success");
      },
    });
  }, [snapshotForUndo, flash]);

  const resetAll = useCallback(() => {
    if (tasks.length === 0) return flash("Planner is already empty.", "warn");
    setConfirm({
      title: "Reset the planner?",
      body: "Every task, note, subtask and study record will be permanently deleted from this browser.",
      confirmLabel: "Reset everything",
      danger: true,
      onConfirm: () => {
        setTasks([]);
        resetForm();
        setSettings(DEFAULT_SETTINGS);
        setPlanStart(todayString());
        setFocusRunning(false);
        setFocusTaskId(null);
        setFocusMode("focus");
        setFocusTotal(DEFAULT_SETTINGS.focusMinutes * 60);
        setFocusRemaining(DEFAULT_SETTINGS.focusMinutes * 60);
        flash("Planner reset.", "success");
      },
    });
  }, [tasks.length, resetForm, flash]);

  /* ------------------------------------------------------------ focus timer */

  const logFocus = useCallback((taskId: string, mins: number) => {
    if (mins <= 0) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              trackedMinutes: t.trackedMinutes + mins,
              status:
                t.status === "Pending" ? ("In progress" as Status) : t.status,
              history: [
                ...t.history,
                { date: todayString(), minutes: mins, kind: "focus" as const },
              ],
            }
          : t,
      ),
    );
  }, []);

  const beginCountdown = useCallback((seconds: number) => {
    endAtRef.current = Date.now() + seconds * 1000;
    setFocusTotal(seconds);
    setFocusRemaining(seconds);
    setFocusRunning(true);
    setFocusKey((k) => k + 1);
  }, []);

  const finishSession = useCallback(() => {
    const s = sessionRef.current;
    if (!s.taskId) {
      setFocusRunning(false);
      return;
    }
    if (s.mode === "focus") {
      const logged = Math.round(s.total / 60);
      logFocus(s.taskId, logged);
      flash(
        `Focus session complete — ${logged} min logged. Break time!`,
        "success",
      );
      setFocusMode("break");
      beginCountdown(settings.breakMinutes * 60);
    } else {
      flash("Break over. Ready for another round?", "active");
      setFocusMode("focus");
      setFocusRunning(false);
      setFocusTotal(settings.focusMinutes * 60);
      setFocusRemaining(settings.focusMinutes * 60);
    }
  }, [
    logFocus,
    flash,
    beginCountdown,
    settings.breakMinutes,
    settings.focusMinutes,
  ]);

  finishRef.current = finishSession;

  useEffect(() => {
    if (!focusRunning) return;
    const id = window.setInterval(() => {
      const rem = Math.max(
        0,
        Math.ceil((endAtRef.current - Date.now()) / 1000),
      );
      setFocusRemaining(rem);
      if (rem <= 0) {
        window.clearInterval(id);
        finishRef.current();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [focusRunning, focusKey]);

  const startFocus = useCallback(
    (taskId: string) => {
      if (sessionRef.current.taskId && sessionRef.current.taskId !== taskId) {
        return flash("Stop the current focus session first.", "warn");
      }
      setFocusTaskId(taskId);
      setFocusPick(taskId);
      setFocusMode("focus");
      beginCountdown(settings.focusMinutes * 60);
    },
    [beginCountdown, settings.focusMinutes, flash],
  );

  const pauseFocus = useCallback(() => setFocusRunning(false), []);

  const resumeFocus = useCallback(() => {
    endAtRef.current = Date.now() + sessionRef.current.remaining * 1000;
    setFocusRunning(true);
    setFocusKey((k) => k + 1);
  }, []);

  const stopFocus = useCallback(() => {
    const s = sessionRef.current;
    setFocusRunning(false);
    if (s.taskId && s.mode === "focus") {
      const elapsedMinutes = Math.floor((s.total - s.remaining) / 60);
      if (elapsedMinutes >= 1) {
        logFocus(s.taskId, elapsedMinutes);
        flash(`Session stopped — ${elapsedMinutes} min logged.`, "success");
      } else {
        flash("Session stopped.", "idle");
      }
    }
    setFocusTaskId(null);
    setFocusMode("focus");
    setFocusTotal(settings.focusMinutes * 60);
    setFocusRemaining(settings.focusMinutes * 60);
  }, [logFocus, flash, settings.focusMinutes]);

  /* ------------------------------------------------------------ backup */

  const exportBackup = useCallback(() => {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      tasks,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `study-planner-backup-${todayString()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    flash("Backup downloaded.", "success");
  }, [tasks, settings, flash]);

  const handleImportFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as Partial<Persisted>;
        if (!Array.isArray(data.tasks)) throw new Error("No tasks found");
        const imported = data.tasks
          .map(sanitizeTask)
          .filter((t): t is StudyTask => t !== null);
        const importedSettings = data.settings
          ? sanitizeSettings(data.settings)
          : settings;
        setConfirm({
          title: `Import ${imported.length} task${imported.length === 1 ? "" : "s"}?`,
          body: "This replaces everything currently in the planner. You can undo the task change once afterwards.",
          confirmLabel: "Replace planner",
          onConfirm: () => {
            snapshotForUndo("Import backup");
            setTasks(imported);
            setSettings(importedSettings);
            setFocusRunning(false);
            setFocusTaskId(null);
            setFocusMode("focus");
            setFocusTotal(importedSettings.focusMinutes * 60);
            setFocusRemaining(importedSettings.focusMinutes * 60);
            flash("Backup imported.", "success");
          },
        });
      } catch {
        flash("That file is not a valid planner backup.", "warn");
      }
    },
    [settings, snapshotForUndo, flash],
  );

  /* --------------------------------------------------------------- keyboard */

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (confirm) return setConfirm(null);
        if (showEditor) {
          setShowEditor(false);
          resetForm();
          return;
        }
      }
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
        return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (showEditor || confirm) return;

      if (event.key === "/") {
        event.preventDefault();
        setView("all");
        window.setTimeout(() => searchRef.current?.focus(), 0);
      } else if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        openNewTask();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [confirm, showEditor, resetForm, openNewTask]);

  /* -------------------------------------------------------- derived data */

  const today = todayString();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter)
        return false;
      if (!q) return true;
      const hay =
        `${t.subject} ${t.topic} ${t.notes} ${t.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
    switch (sortKey) {
      case "score":
        list = [...list].sort(
          (a, b) => taskScore(b, today) - taskScore(a, today),
        );
        break;
      case "due":
        list = [...list].sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        });
        break;
      case "created":
        list = [...list].sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "subject":
        list = [...list].sort((a, b) => a.subject.localeCompare(b.subject));
        break;
    }
    return list;
  }, [tasks, search, statusFilter, priorityFilter, sortKey, today]);

  const planByDay = useMemo(
    () =>
      buildPlan(
        tasks,
        planStart,
        settings.dailyMinutes,
        settings.planDays,
        settings.restDays,
      ),
    [
      tasks,
      planStart,
      settings.dailyMinutes,
      settings.planDays,
      settings.restDays,
    ],
  );

  const todayPlan = useMemo(
    () =>
      buildPlan(tasks, today, settings.dailyMinutes, 1, settings.restDays)[0],
    [tasks, today, settings.dailyMinutes, settings.restDays],
  );
  const plannedToday = todayPlan?.totalMinutes ?? 0;

  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const overdueCount = tasks.filter(isOverdue).length;
  const completionPercent =
    tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const studiedMinutes = tasks.reduce(
    (sum, t) => sum + t.history.reduce((s, h) => s + h.minutes, 0),
    0,
  );

  const weekly = useMemo(() => {
    const days: {
      key: string;
      label: string;
      total: number;
      isToday: boolean;
    }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = addDays(todayString(), -i);
      const total = tasks.reduce(
        (sum, task) =>
          sum +
          task.history
            .filter((h) => h.date === date)
            .reduce((s, h) => s + h.minutes, 0),
        0,
      );
      days.push({
        key: date,
        label: formatWeekday(date),
        total,
        isToday: i === 0,
      });
    }
    return days;
  }, [tasks]);

  const weekMax =
    Math.max(...weekly.map((d) => d.total), settings.dailyMinutes) * 1.1;

  const subjectStats = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const t of tasks) {
      const entry = map.get(t.subject) ?? { total: 0, done: 0 };
      entry.total += t.minutes;
      entry.done +=
        t.status === "Completed" && t.recurrence === "once"
          ? t.minutes
          : Math.min(t.minutes, t.trackedMinutes);
      map.set(t.subject, entry);
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [tasks]);

  const streak = useMemo(() => {
    const studiedDays = new Set<string>();
    for (const task of tasks)
      for (const h of task.history) studiedDays.add(h.date);
    let count = 0;
    let cursor = todayString();
    if (!studiedDays.has(cursor)) cursor = addDays(cursor, -1);
    while (studiedDays.has(cursor)) {
      count += 1;
      cursor = addDays(cursor, -1);
    }
    return count;
  }, [tasks]);

  const onTimeRate = useMemo(() => {
    const completed = tasks.filter(
      (t) => t.status === "Completed" && t.completedAt,
    );
    if (completed.length === 0) return 100;
    const onTime = completed.filter((t) => {
      if (!t.dueDate) return true;
      return (
        new Date(t.completedAt!).getTime() <=
        new Date(`${t.dueDate}T23:59:59`).getTime()
      );
    }).length;
    return Math.round((onTime / completed.length) * 100);
  }, [tasks]);

  const activeTasks = tasks.filter((t) => t.status !== "Completed");
  const focusTask = focusTaskId
    ? (tasks.find((t) => t.id === focusTaskId) ?? null)
    : null;
  const idleSeconds = settings.focusMinutes * 60;
  const displaySeconds = focusTaskId ? focusRemaining : idleSeconds;
  const displayTotal = focusTaskId ? focusTotal : idleSeconds;
  const ringProgress =
    focusTaskId && displayTotal > 0
      ? (displayTotal - displaySeconds) / displayTotal
      : 0;
  const sessionStarted = focusTaskId !== null && focusRemaining < focusTotal;

  const statusIcon =
    tone === "success"
      ? "✓"
      : tone === "warn"
        ? "!"
        : tone === "active"
          ? "◉"
          : "◆";

  const viewTabs: { id: View; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "today", label: "Today" },
    { id: "week", label: "Plan" },
    { id: "all", label: "All tasks" },
  ];

  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => {
    setSettings((s) => ({ ...s, [key]: value }));
    if (!focusTaskId && key === "focusMinutes") {
      setFocusTotal((value as number) * 60);
      setFocusRemaining((value as number) * 60);
    }
  };

  const toggleRestDay = (day: number) => {
    setSettings((s) => ({
      ...s,
      restDays: s.restDays.includes(day)
        ? s.restDays.filter((d) => d !== day)
        : [...s.restDays, day],
    }));
  };

  /* -------------------------------------------------------------- render */

  const renderTaskCard = (task: StudyTask, plannedMinutes?: number) => {
    const days = getDaysUntil(task.dueDate, today);
    const overdue = isOverdue(task);
    const doneSubs = task.subtasks.filter((s) => s.done).length;
    const subProgress =
      task.subtasks.length > 0
        ? Math.round((doneSubs / task.subtasks.length) * 100)
        : 0;
    const trackedPercent =
      task.minutes > 0
        ? Math.min(100, Math.round((task.trackedMinutes / task.minutes) * 100))
        : 0;
    const isFocused = focusTaskId === task.id;

    return (
      <article
        key={task.id}
        className={`ps-task ps-task-${task.priority.toLowerCase()} ${
          task.status === "Completed" ? "is-complete" : ""
        } ${isFocused ? "is-focused" : ""}`}
      >
        <div className="ps-task-top">
          <div className="ps-task-badges">
            <span className="ps-badge ps-badge-subject">{task.subject}</span>
            <span
              className={`ps-badge ps-badge-${task.priority.toLowerCase()}`}
            >
              {task.priority}
            </span>
            {task.pinned && (
              <span className="ps-badge ps-badge-pin">Pinned</span>
            )}
            {overdue && (
              <span className="ps-badge ps-badge-overdue">Overdue</span>
            )}
            {task.recurrence !== "once" && (
              <span className="ps-badge ps-badge-recurring">
                {task.recurrence === "daily" ? "Daily" : "Weekly"}
              </span>
            )}
            {isFocused && (
              <span className="ps-badge ps-badge-plan">Focusing</span>
            )}
            {typeof plannedMinutes === "number" && plannedMinutes > 0 && (
              <span className="ps-badge ps-badge-plan">
                {formatDuration(plannedMinutes)} planned
              </span>
            )}
          </div>

          <div className="ps-task-actions">
            <button
              type="button"
              className={`ps-icon-btn ${task.pinned ? "is-on" : ""}`}
              onClick={() => togglePin(task.id)}
              aria-label={task.pinned ? "Unpin task" : "Pin task"}
              title={task.pinned ? "Unpin" : "Pin to top"}
            >
              📌
            </button>
            <button
              type="button"
              className="ps-icon-btn"
              onClick={() => startEdit(task)}
              aria-label="Edit task"
              title="Edit"
            >
              ✎
            </button>
            <button
              type="button"
              className="ps-icon-btn ps-icon-danger"
              onClick={() => deleteTask(task.id)}
              aria-label="Delete task"
              title="Delete"
            >
              🗑
            </button>
          </div>
        </div>

        <h4
          className={`ps-task-title ${task.status === "Completed" ? "is-struck" : ""}`}
        >
          {task.topic}
        </h4>
        {task.notes && <p className="ps-task-notes">{task.notes}</p>}

        <div className="ps-task-meta">
          <span>⏱ {formatDuration(task.minutes)}</span>
          <span>
            📅{" "}
            {task.dueDate
              ? days < 0
                ? `${Math.abs(days)}d overdue`
                : days === 0
                  ? "Due today"
                  : days === 1
                    ? "Due tomorrow"
                    : `Due in ${days}d`
              : "No deadline"}
          </span>
        </div>

        {task.trackedMinutes > 0 && task.status !== "Completed" && (
          <div className="ps-tracked">
            <div className="ps-subtasks-head">
              <span>
                Studied · {formatDuration(task.trackedMinutes)} of{" "}
                {formatDuration(task.minutes)}
              </span>
              <span>{trackedPercent}%</span>
            </div>
            <div className="ps-subtask-bar">
              <div
                className="ps-subtask-fill"
                style={{ width: `${trackedPercent}%` }}
              />
            </div>
          </div>
        )}

        {task.subtasks.length > 0 && (
          <div className="ps-subtasks">
            <div className="ps-subtasks-head">
              <span>
                Subtasks · {doneSubs}/{task.subtasks.length}
              </span>
              <span>{subProgress}%</span>
            </div>
            <div className="ps-subtask-bar">
              <div
                className="ps-subtask-fill"
                style={{ width: `${subProgress}%` }}
              />
            </div>
            <ul className="ps-subtask-list">
              {task.subtasks.map((st) => (
                <li key={st.id} className="ps-subtask-row">
                  <label className="ps-subtask-check">
                    <input
                      type="checkbox"
                      checked={st.done}
                      onChange={() => toggleSubtask(task.id, st.id)}
                    />
                    <span className={st.done ? "is-struck" : ""}>
                      {st.title}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="ps-subtask-remove"
                    onClick={() => removeSubtask(task.id, st.id)}
                    aria-label="Remove subtask"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <SubtaskAdder onAdd={(title) => addSubtask(task.id, title)} />
          </div>
        )}
        {task.subtasks.length === 0 && (
          <SubtaskAdder
            onAdd={(title) => addSubtask(task.id, title)}
            placeholder="Add subtask…"
          />
        )}

        {task.tags.length > 0 && (
          <div className="ps-tags">
            {task.tags.map((tag) => (
              <span key={tag} className="ps-tag">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="ps-task-foot">
          <div
            className="ps-status-group"
            role="group"
            aria-label="Task status"
          >
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={`ps-status-btn ${task.status === s ? "is-active" : ""}`}
                aria-pressed={task.status === s}
                onClick={() => updateStatus(task.id, s)}
              >
                {s === "Completed" ? "✓ Completed" : s}
              </button>
            ))}
          </div>
          {task.status !== "Completed" && (
            <button
              type="button"
              className="ps-mini-btn"
              onClick={() => startFocus(task.id)}
              disabled={isFocused}
            >
              ▶ Focus
            </button>
          )}
        </div>
      </article>
    );
  };

  /* --------------------------------------------------------- portal modals */

  const editorModal =
    showEditor && mounted
      ? createPortal(
          <div
            className="ps-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="planner-editor"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowEditor(false);
                resetForm();
              }
            }}
          >
            <div className="ps-modal">
              <div className="ps-modal-head">
                <h3 id="planner-editor">
                  {editingId ? "Edit task" : "New study task"}
                </h3>
                <button
                  type="button"
                  className="ps-icon-btn"
                  onClick={() => {
                    setShowEditor(false);
                    resetForm();
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className="ps-modal-body">
                <div className="ps-form-grid">
                  <label className="ps-field">
                    <span>Subject</span>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Mathematics"
                      maxLength={60}
                      required
                      autoFocus
                    />
                  </label>
                  <label className="ps-field">
                    <span>Topic / task</span>
                    <input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Algebra practice"
                      maxLength={100}
                      required
                    />
                  </label>
                  <label className="ps-field">
                    <span>Deadline (optional)</span>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </label>
                  <label className="ps-field">
                    <span>Study time (minutes)</span>
                    <input
                      type="number"
                      min={5}
                      max={1440}
                      step={5}
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      required
                    />
                  </label>
                  <label className="ps-field">
                    <span>Priority</span>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ps-field">
                    <span>Recurrence</span>
                    <select
                      value={recurrence}
                      onChange={(e) =>
                        setRecurrence(e.target.value as Recurrence)
                      }
                    >
                      {RECURRENCES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ps-field ps-field-wide">
                    <span>Notes (optional)</span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Anything you want to remember about this task"
                    />
                  </label>
                  <label className="ps-field ps-field-wide">
                    <span>Tags (comma separated)</span>
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      maxLength={200}
                      placeholder="algebra, practice"
                    />
                  </label>
                </div>
                <div className="ps-modal-actions">
                  <button
                    type="button"
                    className="ps-btn ps-btn-ghost"
                    onClick={() => {
                      setShowEditor(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="ps-btn ps-btn-pri">
                    {editingId ? "Save changes" : "Add task"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null;

  const confirmModal =
    confirm && mounted
      ? createPortal(
          <div
            className="ps-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ps-confirm-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setConfirm(null);
            }}
          >
            <div className="ps-modal ps-modal-sm">
              <div className="ps-modal-head">
                <h3 id="ps-confirm-title">{confirm.title}</h3>
                <button
                  type="button"
                  className="ps-icon-btn"
                  onClick={() => setConfirm(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="ps-modal-text">{confirm.body}</p>
              <div className="ps-modal-actions">
                <button
                  type="button"
                  className="ps-btn ps-btn-ghost"
                  onClick={() => setConfirm(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`ps-btn ${confirm.danger ? "ps-btn-danger" : "ps-btn-pri"}`}
                  onClick={() => {
                    confirm.onConfirm();
                    setConfirm(null);
                  }}
                >
                  {confirm.confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  /* -------------------------------------------------------------- main */

  return (
    <ToolShell title="Smart study planner" onReset={resetAll} wide>
      <div className="ps-wrapper">
        {/* HEADER */}
        <div className="ps-header">
          <div>
            <span className="ps-eyebrow">STUDY WORKSPACE</span>
            <h2>Plan your study time</h2>
            <p>
              Smart daily plans ranked by priority and deadline, a built-in
              focus timer, and progress tracking that stays in this browser.
            </p>
          </div>
          <div className="ps-header-stats">
            <div className="ps-header-stat">
              <span>Streak</span>
              <strong>🔥 {streak}</strong>
            </div>
            <div className="ps-header-stat">
              <span>On time</span>
              <strong>{onTimeRate}%</strong>
            </div>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="ps-stat-grid">
          <div className="ps-stat">
            <span>Tasks</span>
            <strong>{tasks.length}</strong>
            <small>{activeTasks.length} active</small>
          </div>
          <div className="ps-stat">
            <span>Completed</span>
            <strong>{completedTasks}</strong>
            <small>{completionPercent}% of all tasks</small>
          </div>
          <div className="ps-stat">
            <span>Overdue</span>
            <strong className={overdueCount > 0 ? "is-warn" : ""}>
              {overdueCount}
            </strong>
            <small>
              {overdueCount > 0 ? "Needs attention" : "All on track"}
            </small>
          </div>
          <div className="ps-stat">
            <span>Studied</span>
            <strong>{formatDuration(studiedMinutes)}</strong>
            <small>All time</small>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="ps-main-grid">
          <div className="ps-primary-column">
            <section className="ps-card">
              <div className="ps-tabs" role="tablist" aria-label="Planner view">
                {viewTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={view === tab.id}
                    className={
                      view === tab.id ? "ps-tab ps-tab-active" : "ps-tab"
                    }
                    onClick={() => setView(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {view === "dashboard" && (
                <div className="ps-tab-content">
                  <div className="ps-section">
                    <div className="ps-section-head">
                      <div>
                        <h3>Today at a glance</h3>
                        <p>
                          Top tasks ranked by urgency, priority and pinning.
                        </p>
                      </div>
                      <span className="ps-badge ps-badge-plan">
                        {formatDuration(plannedToday)} /{" "}
                        {formatDuration(settings.dailyMinutes)}
                      </span>
                    </div>

                    <div className="ps-gauge">
                      <div
                        className="ps-gauge-fill"
                        style={{
                          width: `${Math.min(100, (plannedToday / settings.dailyMinutes) * 100)}%`,
                        }}
                      />
                    </div>

                    {todayPlan?.rest ? (
                      <p className="ps-empty-line">
                        Today is a rest day. Enjoy the break.
                      </p>
                    ) : todayPlan && todayPlan.slices.length > 0 ? (
                      <ul className="ps-today-list">
                        {todayPlan.slices.slice(0, 5).map((slice) => (
                          <li key={slice.task.id} className="ps-today-item">
                            <div className="ps-today-info">
                              <strong>{slice.task.topic}</strong>
                              <span>
                                {slice.task.subject} ·{" "}
                                {formatDuration(slice.allocated)}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="ps-mini-btn"
                              onClick={() => startFocus(slice.task.id)}
                            >
                              ▶ Focus
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="ps-empty-line">
                        Add a task to generate your daily plan.
                      </p>
                    )}
                  </div>

                  <div className="ps-section">
                    <div className="ps-section-head">
                      <div>
                        <h3>7-day study time</h3>
                        <p>
                          Minutes studied per day (focus sessions and
                          completions).
                        </p>
                      </div>
                    </div>
                    <div className="ps-week">
                      <div className="ps-week-bars">
                        {weekly.map((day) => {
                          const h =
                            weekMax > 0
                              ? Math.max(3, (day.total / weekMax) * 100)
                              : 3;
                          return (
                            <div className="ps-week-col" key={day.key}>
                              <div
                                className={`ps-week-bar ${day.isToday ? "is-today" : ""} ${
                                  day.total > 0 ? "has-value" : ""
                                }`}
                                style={{ height: `${h}%` }}
                                title={`${day.label}: ${formatDuration(day.total)}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="ps-week-labels">
                        {weekly.map((d) => (
                          <span
                            key={d.key}
                            className={d.isToday ? "is-today" : undefined}
                          >
                            {d.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {subjectStats.length > 0 && (
                    <div className="ps-section">
                      <div className="ps-section-head">
                        <div>
                          <h3>Workload by subject</h3>
                          <p>Studied time against planned time.</p>
                        </div>
                      </div>
                      <ul className="ps-subject-list">
                        {subjectStats.map((s) => {
                          const pct =
                            s.total > 0
                              ? Math.min(
                                  100,
                                  Math.round((s.done / s.total) * 100),
                                )
                              : 0;
                          return (
                            <li key={s.name} className="ps-subject-row">
                              <div className="ps-subject-top">
                                <strong>{s.name}</strong>
                                <span>
                                  {formatDuration(s.done)} /{" "}
                                  {formatDuration(s.total)}
                                </span>
                              </div>
                              <div className="ps-subtask-bar">
                                <div
                                  className="ps-subtask-fill"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {overdueCount > 0 && (
                    <div className="ps-alert">
                      <div>
                        <strong>
                          {overdueCount} overdue task
                          {overdueCount === 1 ? "" : "s"}
                        </strong>
                        <p>
                          Move them to today so the planner can re-rank them.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="ps-btn ps-btn-pri"
                        onClick={rollOverdueForward}
                      >
                        Roll forward
                      </button>
                    </div>
                  )}
                </div>
              )}

              {view === "today" && (
                <div className="ps-tab-content">
                  <div className="ps-section-head">
                    <div>
                      <h3>Today's plan</h3>
                      <p>
                        {formatDate(today)} ·{" "}
                        {formatDuration(settings.dailyMinutes)} available
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ps-btn ps-btn-pri"
                      onClick={openNewTask}
                    >
                      + New task
                    </button>
                  </div>

                  {todayPlan?.rest ? (
                    <p className="ps-empty-line">
                      Today is a rest day. Change rest days in Planner settings.
                    </p>
                  ) : todayPlan && todayPlan.slices.length > 0 ? (
                    <div className="ps-today-grid">
                      {todayPlan.slices.map((slice, i) => (
                        <div key={slice.task.id} className="ps-today-card">
                          <span className="ps-today-index">{i + 1}</span>
                          <div className="ps-today-body">
                            <strong>{slice.task.topic}</strong>
                            <span className="ps-today-meta">
                              {slice.task.subject} ·{" "}
                              {formatDuration(slice.allocated)}
                              {slice.recurringInstance && " · recurring"}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="ps-mini-btn"
                            onClick={() => startFocus(slice.task.id)}
                          >
                            ▶ Focus
                          </button>
                          <button
                            type="button"
                            className="ps-mini-btn"
                            onClick={() =>
                              updateStatus(slice.task.id, "Completed")
                            }
                          >
                            Done
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="ps-empty-line">
                      Nothing planned for today. Add tasks or check the Plan
                      tab.
                    </p>
                  )}
                </div>
              )}

              {view === "week" && (
                <div className="ps-tab-content">
                  <div className="ps-section-head">
                    <div>
                      <h3>Multi-day plan</h3>
                      <p>
                        {settings.planDays} day
                        {settings.planDays === 1 ? "" : "s"} from{" "}
                        {formatDate(planStart)} ·{" "}
                        {formatDuration(settings.dailyMinutes)} per day
                      </p>
                    </div>
                  </div>
                  <div className="ps-weekplan">
                    {planByDay.map((day) => (
                      <div key={day.date} className="ps-weekplan-col">
                        <div className="ps-weekplan-head">
                          <span>{formatWeekday(day.date)}</span>
                          <strong>{day.date.slice(5)}</strong>
                        </div>
                        <div className="ps-weekplan-body">
                          {day.rest ? (
                            <span className="ps-weekplan-empty">Rest day</span>
                          ) : day.slices.length === 0 ? (
                            <span className="ps-weekplan-empty">Free</span>
                          ) : (
                            day.slices.map((s) => (
                              <div
                                key={`${day.date}-${s.task.id}`}
                                className="ps-weekplan-item"
                              >
                                <span className="ps-weekplan-topic">
                                  {s.task.topic}
                                </span>
                                <span className="ps-weekplan-min">
                                  {formatDuration(s.allocated)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="ps-weekplan-foot">
                          {formatDuration(day.totalMinutes)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === "all" && (
                <div className="ps-tab-content">
                  <div className="ps-toolbar">
                    <input
                      ref={searchRef}
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search tasks…  ( / )"
                      className="ps-search"
                      aria-label="Search tasks"
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as "all" | Status)
                      }
                      className="ps-select"
                      aria-label="Filter by status"
                    >
                      <option value="all">All statuses</option>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <select
                      value={priorityFilter}
                      onChange={(e) =>
                        setPriorityFilter(e.target.value as "all" | Priority)
                      }
                      className="ps-select"
                      aria-label="Filter by priority"
                    >
                      <option value="all">All priorities</option>
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <select
                      value={sortKey}
                      onChange={(e) =>
                        setSortKey(e.target.value as typeof sortKey)
                      }
                      className="ps-select"
                      aria-label="Sort tasks"
                    >
                      <option value="score">Smart order</option>
                      <option value="due">Due date</option>
                      <option value="created">Newest</option>
                      <option value="subject">Subject A–Z</option>
                    </select>
                    <button
                      type="button"
                      className="ps-btn ps-btn-pri"
                      onClick={openNewTask}
                    >
                      + New
                    </button>
                  </div>

                  {filtered.length === 0 ? (
                    <div className="ps-empty">
                      <span className="ps-empty-icon">📚</span>
                      <h4>
                        {tasks.length === 0
                          ? "Your planner is empty"
                          : "No tasks match your filters"}
                      </h4>
                      <p>
                        {tasks.length === 0
                          ? "Add your first subject and topic to get started."
                          : "Try clearing the search or switching the filters."}
                      </p>
                    </div>
                  ) : (
                    <div className="ps-task-list">
                      {filtered.map((task) => renderTaskCard(task))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          <div className="ps-side-column">
            {/* FOCUS TIMER */}
            <section className="ps-card">
              <div className="ps-card-heading">
                <div>
                  <span className="ps-step">⏱</span>
                  <h3>Focus timer</h3>
                </div>
                <span className="ps-badge ps-badge-plan">
                  {focusMode === "focus" ? "Focus" : "Break"}
                </span>
              </div>

              <div className="ps-timer">
                <div className="ps-ring">
                  <svg viewBox="0 0 120 120" aria-hidden="true">
                    <circle
                      className="ps-ring-track"
                      cx="60"
                      cy="60"
                      r={RING_RADIUS}
                    />
                    <circle
                      className={`ps-ring-fill ${focusMode === "break" ? "is-break" : ""}`}
                      cx="60"
                      cy="60"
                      r={RING_RADIUS}
                      strokeDasharray={RING_CIRCUMFERENCE}
                      strokeDashoffset={RING_CIRCUMFERENCE * (1 - ringProgress)}
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="ps-ring-label">
                    <strong>{formatClock(displaySeconds)}</strong>
                    <span>
                      {focusRunning
                        ? "Running"
                        : focusTaskId
                          ? "Paused"
                          : "Ready"}
                    </span>
                  </div>
                </div>

                {focusTask ? (
                  <p className="ps-timer-task">
                    <strong>{focusTask.topic}</strong>
                    <span>
                      {focusTask.subject} ·{" "}
                      {formatDuration(focusTask.trackedMinutes)} studied
                    </span>
                  </p>
                ) : (
                  <label className="ps-field ps-field-full">
                    <span>Task to focus on</span>
                    <select
                      value={focusPick}
                      onChange={(e) => setFocusPick(e.target.value)}
                      disabled={activeTasks.length === 0}
                    >
                      <option value="">
                        {activeTasks.length === 0
                          ? "No active tasks"
                          : "Choose a task…"}
                      </option>
                      {activeTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.subject} — {t.topic}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="ps-timer-actions">
                  {!focusTaskId && (
                    <button
                      type="button"
                      className="ps-btn ps-btn-pri ps-btn-wide"
                      disabled={!focusPick}
                      onClick={() => focusPick && startFocus(focusPick)}
                    >
                      ▶ Start {settings.focusMinutes}-min focus
                    </button>
                  )}
                  {focusTaskId && focusRunning && (
                    <button
                      type="button"
                      className="ps-btn ps-btn-sec ps-btn-wide"
                      onClick={pauseFocus}
                    >
                      ❚❚ Pause
                    </button>
                  )}
                  {focusTaskId && !focusRunning && (
                    <button
                      type="button"
                      className="ps-btn ps-btn-pri ps-btn-wide"
                      onClick={() => {
                        if (focusRemaining >= focusTotal)
                          beginCountdown(focusTotal);
                        else resumeFocus();
                      }}
                    >
                      ▶ {sessionStarted ? "Resume" : "Start"}
                    </button>
                  )}
                  {focusTaskId && (
                    <button
                      type="button"
                      className="ps-btn ps-btn-sec ps-btn-wide"
                      onClick={stopFocus}
                    >
                      ■ Stop &amp; log
                    </button>
                  )}
                </div>
              </div>

              <div className="ps-note-box">
                <strong>How it counts</strong>
                <span>
                  Finished and stopped sessions add studied minutes to the task,
                  which shrinks what the plan still schedules for it.
                </span>
              </div>
            </section>

            {/* SETTINGS */}
            <section className="ps-card">
              <div className="ps-card-heading">
                <div>
                  <span className="ps-step">⚙</span>
                  <h3>Planner settings</h3>
                </div>
              </div>

              <div className="ps-tab-content">
                <div className="ps-form-grid">
                  <label className="ps-field">
                    <span>Daily study time</span>
                    <select
                      value={settings.dailyMinutes}
                      onChange={(e) =>
                        updateSetting("dailyMinutes", Number(e.target.value))
                      }
                    >
                      {DAILY_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {formatDuration(n)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ps-field">
                    <span>Plan horizon</span>
                    <select
                      value={settings.planDays}
                      onChange={(e) =>
                        updateSetting("planDays", Number(e.target.value))
                      }
                    >
                      {PLAN_DAY_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n} day{n === 1 ? "" : "s"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ps-field">
                    <span>Focus length</span>
                    <select
                      value={settings.focusMinutes}
                      onChange={(e) =>
                        updateSetting("focusMinutes", Number(e.target.value))
                      }
                      disabled={focusTaskId !== null}
                    >
                      {FOCUS_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n} min
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ps-field">
                    <span>Break length</span>
                    <select
                      value={settings.breakMinutes}
                      onChange={(e) =>
                        updateSetting("breakMinutes", Number(e.target.value))
                      }
                      disabled={focusTaskId !== null}
                    >
                      {BREAK_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n} min
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ps-field ps-field-wide">
                    <span>Plan start date</span>
                    <div className="ps-inline">
                      <input
                        type="date"
                        value={planStart}
                        onChange={(e) =>
                          setPlanStart(e.target.value || todayString())
                        }
                      />
                      <button
                        type="button"
                        className="ps-mini-btn"
                        onClick={() => setPlanStart(todayString())}
                      >
                        Today
                      </button>
                    </div>
                  </label>
                </div>

                <div className="ps-field ps-field-full">
                  <span>Rest days (no study scheduled)</span>
                  <div className="ps-chips" role="group" aria-label="Rest days">
                    {WEEKDAYS.map((label, day) => (
                      <button
                        key={label}
                        type="button"
                        className={`ps-chip ${settings.restDays.includes(day) ? "is-active" : ""}`}
                        aria-pressed={settings.restDays.includes(day)}
                        onClick={() => toggleRestDay(day)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ps-toggle-list">
                  <label className="ps-switch">
                    <span>
                      <strong>Auto-move overdue tasks</strong>
                      <small>
                        When the planner opens, set missed deadlines to today
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.autoRollover}
                      onChange={(e) =>
                        updateSetting("autoRollover", e.target.checked)
                      }
                    />
                    <span className="ps-switch-track" aria-hidden="true">
                      <span className="ps-switch-thumb" />
                    </span>
                  </label>
                </div>
              </div>
            </section>

            {/* BACKUP */}
            <section className="ps-card">
              <div className="ps-card-heading">
                <div>
                  <span className="ps-step">⇅</span>
                  <h3>Backup &amp; data</h3>
                </div>
              </div>

              <p className="ps-card-copy">
                Everything is stored in this browser only. Download a backup
                before clearing site data or switching devices.
              </p>

              <button
                type="button"
                className="ps-btn ps-btn-pri ps-btn-wide"
                onClick={exportBackup}
                disabled={tasks.length === 0}
              >
                ↓ Download backup (JSON)
              </button>
              <button
                type="button"
                className="ps-btn ps-btn-sec ps-btn-wide ps-stack-gap"
                onClick={() => importRef.current?.click()}
              >
                ↑ Import backup
              </button>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                hidden
              />
            </section>

            {/* HELP */}
            <section className="ps-card">
              <button
                type="button"
                className="ps-advanced-button"
                onClick={() => setShowHelp((v) => !v)}
                aria-expanded={showHelp}
              >
                {showHelp ? "Hide" : "Show"} how the smart plan works
                <span>{showHelp ? "−" : "+"}</span>
              </button>

              {showHelp && (
                <div className="ps-help">
                  {[
                    [
                      "Priority weight",
                      "High = 30 points, Medium = 20, Low = 10.",
                    ],
                    [
                      "Urgency bonus",
                      "The closer a deadline, the higher the bonus. Overdue tasks get the biggest bonus, so they surface first.",
                    ],
                    [
                      "Pinned & recurring",
                      "Pinned tasks jump the queue (+100). Daily and weekly tasks get a small boost so they surface on their days.",
                    ],
                    [
                      "Adaptive scheduling",
                      "Each day's budget goes to the highest-scoring tasks. Time you already studied is subtracted, and leftovers carry into the next day. Rest days are skipped.",
                    ],
                    [
                      "Recurring tasks",
                      "Completing a daily or weekly task logs the session and schedules the next one instead of closing it.",
                    ],
                  ].map(([title, body], index) => (
                    <div className="ps-help-step" key={title}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{title}</strong>
                        <p>{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* STATUS */}
        {notice && (
          <div
            className={`ps-notice ps-notice-${tone}`}
            role="status"
            aria-live="polite"
          >
            <span className="ps-notice-icon">{statusIcon}</span>
            <span>{notice}</span>
            {undoBuffer && (
              <button type="button" className="ps-undo-btn" onClick={undoLast}>
                Undo
              </button>
            )}
          </div>
        )}

        <div className="ps-footer-note">
          <strong>Shortcuts:</strong> <kbd>N</kbd> new task · <kbd>/</kbd>{" "}
          search · <kbd>Esc</kbd> close dialogs. Your data never leaves this
          device.
        </div>
      </div>

      {editorModal}
      {confirmModal}

      <style jsx global>{`
        /* ============================================================
           DESIGN TOKENS — declared at :root so they're available to
           portals mounted on document.body (e.g. modals).
           ============================================================ */
        :global(:root) {
          --ps-primary: #ff5a1f;
          --ps-primary-dark: #e64a14;
          --ps-primary-soft: #fff3ed;
          --ps-primary-hover: #ffb69d;
          --ps-text: var(--tool-text, #172033);
          --ps-muted: var(--tool-muted, #64748b);
          --ps-border: var(--tool-border, #e5e7eb);
          --ps-card: var(--tool-card, #ffffff);
          --ps-surface: var(--tool-surface, #f8fafc);
        }

        @media (prefers-color-scheme: dark) {
          :global(:root) {
            --ps-text: #e5e7eb;
            --ps-muted: #94a3b8;
            --ps-border: #334155;
            --ps-card: #0f172a;
            --ps-surface: #1e293b;
          }
        }

        /* ============================================================
           WRAPPER
           ============================================================ */
        .ps-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          min-width: 0;
          color: var(--ps-text);
          font-family: inherit;
        }

        /* ============================================================
           HEADER
           ============================================================ */
        .ps-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 21px;
          border: 1px solid var(--ps-border);
          border-radius: 13px;
          background: var(--ps-surface);
        }
        .ps-eyebrow {
          display: block;
          margin-bottom: 6px;
          color: var(--ps-muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
        }
        .ps-header h2 {
          margin: 0;
          font-size: 21px;
          font-weight: 800;
          line-height: 1.3;
        }
        .ps-header p {
          max-width: 560px;
          margin: 6px 0 0;
          color: var(--ps-muted);
          font-size: 13px;
          line-height: 1.6;
        }
        .ps-header-stats {
          display: flex;
          flex: 0 0 auto;
          gap: 8px;
        }
        .ps-header-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 70px;
          padding: 10px 14px;
          border-radius: 13px;
          background: var(--ps-card);
        }
        .ps-header-stat span {
          color: var(--ps-muted);
          font-size: 10px;
          font-weight: 700;
        }
        .ps-header-stat strong {
          color: var(--ps-primary);
          font-size: 18px;
          font-weight: 800;
          line-height: 1.3;
          font-variant-numeric: tabular-nums;
        }

        /* ============================================================
           STAT CARDS
           ============================================================ */
        .ps-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }
        .ps-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          padding: 14px 16px;
          border: 1px solid var(--ps-border);
          border-radius: 13px;
          background: var(--ps-card);
        }
        .ps-stat span {
          color: var(--ps-muted);
          font-size: 10px;
          font-weight: 700;
        }
        .ps-stat strong {
          font-size: 19px;
          font-weight: 800;
          line-height: 1.2;
          font-variant-numeric: tabular-nums;
          overflow-wrap: anywhere;
        }
        .ps-stat strong.is-warn {
          color: #dc2626;
        }
        .ps-stat small {
          color: var(--ps-muted);
          font-size: 10px;
        }

        /* ============================================================
           MAIN LAYOUT
           ============================================================ */
        .ps-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.9fr);
          align-items: start;
          gap: 20px;
          width: 100%;
          min-width: 0;
        }
        .ps-primary-column,
        .ps-side-column {
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 0;
        }
        .ps-card {
          min-width: 0;
          padding: 19px;
          border: 1px solid var(--ps-border);
          border-radius: 13px;
          background: var(--ps-card);
        }
        .ps-card-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 17px;
        }
        .ps-card-heading > div {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .ps-card-heading h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
        }
        .ps-card-copy {
          margin: -5px 0 15px;
          color: var(--ps-muted);
          font-size: 12px;
          line-height: 1.6;
        }
        .ps-step {
          display: grid;
          place-items: center;
          width: 24px;
          height: 24px;
          border-radius: 7px;
          background: var(--ps-surface);
          color: var(--ps-muted);
          font-size: 12px;
          font-weight: 800;
        }

        /* ============================================================
           TABS
           ============================================================ */
        .ps-tabs {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 5px;
          margin-bottom: 20px;
          padding: 4px;
          border-radius: 9px;
          background: var(--ps-surface);
        }
        .ps-tab {
          min-width: 0;
          padding: 9px 5px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: var(--ps-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .ps-tab-active {
          background: var(--ps-card);
          color: var(--ps-text);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .ps-tab-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        .ps-section {
          padding: 14px;
          border-radius: 10px;
          background: var(--ps-surface);
        }
        .ps-section-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .ps-section-head h3 {
          margin: 0 0 3px;
          font-size: 13px;
          font-weight: 800;
        }
        .ps-section-head p {
          margin: 0;
          color: var(--ps-muted);
          font-size: 10px;
        }

        /* ============================================================
           BADGES
           ============================================================ */
        .ps-badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.3px;
          white-space: nowrap;
        }
        .ps-badge-subject {
          background: #eef2ff;
          color: #4338ca;
        }
        .ps-badge-high {
          background: #fee2e2;
          color: #b91c1c;
        }
        .ps-badge-medium {
          background: #fef3c7;
          color: #b45309;
        }
        .ps-badge-low {
          background: #e2e8f0;
          color: #475569;
        }
        .ps-badge-pin {
          background: var(--ps-primary-soft);
          color: var(--ps-primary);
        }
        .ps-badge-overdue {
          background: #fee2e2;
          color: #b91c1c;
        }
        .ps-badge-recurring {
          background: #e0f2fe;
          color: #0369a1;
        }
        .ps-badge-plan {
          background: #ecfdf5;
          color: #166534;
        }

        /* ============================================================
           GAUGE + LISTS
           ============================================================ */
        .ps-gauge {
          height: 8px;
          margin-bottom: 12px;
          overflow: hidden;
          border-radius: 999px;
          background: #e2e8f0;
        }
        .ps-gauge-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff8a4c, #ff5a1f);
          transition: width 260ms ease;
        }
        .ps-today-list {
          display: grid;
          gap: 6px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .ps-today-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 9px 11px;
          border: 1px solid var(--ps-border);
          border-radius: 8px;
          background: var(--ps-card);
        }
        .ps-today-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .ps-today-info strong {
          font-size: 12px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }
        .ps-today-info span {
          color: var(--ps-muted);
          font-size: 10px;
        }
        .ps-today-grid {
          display: grid;
          gap: 8px;
        }
        .ps-today-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 12px;
          border: 1px solid var(--ps-border);
          border-radius: 10px;
          background: var(--ps-card);
        }
        .ps-today-index {
          display: inline-flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--ps-primary-soft);
          color: var(--ps-primary);
          font-size: 11px;
          font-weight: 800;
        }
        .ps-today-body {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .ps-today-body strong {
          font-size: 12px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }
        .ps-today-meta {
          color: var(--ps-muted);
          font-size: 10px;
        }

        /* ============================================================
           WEEKLY CHART
           ============================================================ */
        .ps-week-bars {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          height: 90px;
          align-items: end;
        }
        .ps-week-col {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          height: 100%;
        }
        .ps-week-bar {
          width: 100%;
          max-width: 26px;
          border-radius: 5px 5px 3px 3px;
          background: #dfe5ee;
          transition: height 300ms ease;
        }
        .ps-week-bar.has-value {
          background: linear-gradient(180deg, #ffb08c, #ff5a1f);
        }
        .ps-week-bar.is-today {
          box-shadow: 0 0 0 2px rgba(255, 90, 31, 0.22);
        }
        .ps-week-labels {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-top: 6px;
          color: var(--ps-muted);
          font-size: 10px;
          font-weight: 700;
          text-align: center;
        }
        .ps-week-labels .is-today {
          color: var(--ps-primary);
        }

        /* ============================================================
           SUBJECTS
           ============================================================ */
        .ps-subject-list {
          display: grid;
          gap: 11px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .ps-subject-top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 5px;
          font-size: 11px;
        }
        .ps-subject-top strong {
          font-weight: 700;
          overflow-wrap: anywhere;
        }
        .ps-subject-top span {
          color: var(--ps-muted);
          font-size: 10px;
          white-space: nowrap;
        }
        .ps-alert {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 13px 14px;
          border: 1px solid #fde68a;
          border-radius: 10px;
          background: #fffbeb;
        }
        .ps-alert strong {
          display: block;
          margin-bottom: 2px;
          color: #92400e;
          font-size: 12px;
        }
        .ps-alert p {
          margin: 0;
          color: #b45309;
          font-size: 10px;
        }

        /* ============================================================
           PLAN COLUMNS
           ============================================================ */
        .ps-weekplan {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
          gap: 8px;
        }
        .ps-weekplan-col {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--ps-border);
          border-radius: 10px;
          background: var(--ps-card);
        }
        .ps-weekplan-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 10px;
          background: var(--ps-primary-soft);
          color: var(--ps-primary);
          font-size: 10px;
          font-weight: 800;
        }
        .ps-weekplan-body {
          display: grid;
          flex: 1;
          gap: 4px;
          align-content: start;
          min-height: 90px;
          padding: 6px;
        }
        .ps-weekplan-empty {
          padding: 14px 0;
          color: var(--ps-muted);
          font-size: 10px;
          text-align: center;
        }
        .ps-weekplan-item {
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: 5px 7px;
          border-radius: 6px;
          background: var(--ps-surface);
        }
        .ps-weekplan-topic {
          overflow: hidden;
          font-size: 10px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ps-weekplan-min {
          color: var(--ps-muted);
          font-size: 9px;
        }
        .ps-weekplan-foot {
          padding: 7px 10px;
          border-top: 1px solid var(--ps-border);
          background: var(--ps-surface);
          font-size: 10px;
          font-weight: 700;
          text-align: right;
        }

        /* ============================================================
           TOOLBAR
           ============================================================ */
        .ps-toolbar {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
        }
        .ps-search {
          flex: 1;
          min-width: 140px;
          padding: 8px 12px;
          border: 1px solid var(--ps-border, #e5e7eb);
          border-radius: 8px;
          background: var(--ps-card, #ffffff);
          color: var(--ps-text, #172033);
          font-size: 11px;
          outline: none;
        }
        .ps-search:focus,
        .ps-select:focus,
        .ps-field input:focus,
        .ps-field select:focus,
        .ps-field textarea:focus {
          border-color: var(--ps-primary, #ff5a1f);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.15);
        }
        .ps-select {
          padding: 8px 10px;
          border: 1px solid var(--ps-border, #e5e7eb);
          border-radius: 8px;
          background: var(--ps-card, #ffffff);
          color: var(--ps-text, #172033);
          font-size: 11px;
          font-weight: 600;
          outline: none;
          cursor: pointer;
        }

        /* ============================================================
           TASK CARDS
           ============================================================ */
        .ps-task-list {
          display: grid;
          gap: 10px;
        }
        .ps-task {
          position: relative;
          padding: 14px 14px 14px 18px;
          border: 1px solid var(--ps-border);
          border-radius: 12px;
          background: var(--ps-card);
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }
        .ps-task::before {
          content: "";
          position: absolute;
          top: 12px;
          bottom: 12px;
          left: 6px;
          width: 3px;
          border-radius: 3px;
          background: var(--ps-border);
        }
        .ps-task-high::before {
          background: #ef4444;
        }
        .ps-task-medium::before {
          background: #f59e0b;
        }
        .ps-task-low::before {
          background: #94a3b8;
        }
        .ps-task:hover {
          border-color: var(--ps-primary-hover);
          box-shadow: 0 4px 16px rgba(23, 32, 51, 0.06);
        }
        .ps-task.is-complete {
          border-color: #d1fae5;
          background: #f7fdf9;
          opacity: 0.88;
        }
        .ps-task.is-focused {
          border-color: var(--ps-primary);
          box-shadow:
            0 0 0 2px var(--ps-primary-soft),
            0 4px 16px rgba(255, 90, 31, 0.12);
        }
        .ps-task-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .ps-task-badges {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .ps-task-actions {
          display: flex;
          flex-shrink: 0;
          gap: 4px;
        }
        .ps-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: 1px solid var(--ps-border);
          border-radius: 7px;
          background: var(--ps-card);
          color: var(--ps-muted);
          font-size: 12px;
          cursor: pointer;
        }
        .ps-icon-btn:hover {
          border-color: var(--ps-primary-hover);
          color: var(--ps-primary);
        }
        .ps-icon-btn.is-on {
          border-color: var(--ps-primary);
          background: var(--ps-primary-soft);
        }
        .ps-icon-danger {
          border-color: #fecaca;
          color: #b91c1c;
        }
        .ps-icon-danger:hover {
          border-color: #fca5a5;
          background: #fef2f2;
          color: #b91c1c;
        }
        .ps-task-title {
          margin: 0 0 4px;
          font-size: 14px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }
        .ps-task-title.is-struck {
          color: var(--ps-muted);
          text-decoration: line-through;
        }
        .ps-task-notes {
          margin: 0 0 8px;
          color: var(--ps-muted);
          font-size: 11px;
          line-height: 1.55;
          overflow-wrap: anywhere;
        }
        .ps-task-meta {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 10px;
          color: var(--ps-muted);
          font-size: 10px;
          font-weight: 600;
        }
        .ps-tracked,
        .ps-subtasks {
          margin-bottom: 10px;
          padding: 9px 11px;
          border-radius: 9px;
          background: var(--ps-surface);
        }
        .ps-subtasks-head {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          color: var(--ps-muted);
          font-size: 10px;
          font-weight: 700;
        }
        .ps-subtask-bar {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: #dfe5ee;
        }
        .ps-subtasks .ps-subtask-bar {
          margin-bottom: 7px;
        }
        .ps-subtask-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff8a4c, #ff5a1f);
          transition: width 220ms ease;
        }
        .ps-subtask-list {
          display: grid;
          gap: 4px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .ps-subtask-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;
          font-size: 11px;
        }
        .ps-subtask-check {
          display: flex;
          flex: 1;
          align-items: center;
          gap: 7px;
          min-width: 0;
          cursor: pointer;
        }
        .ps-subtask-check input {
          accent-color: var(--ps-primary);
        }
        .ps-subtask-check .is-struck {
          color: var(--ps-muted);
          text-decoration: line-through;
        }
        .ps-subtask-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border: 0;
          border-radius: 4px;
          background: transparent;
          color: var(--ps-muted);
          font-size: 15px;
          line-height: 1;
          cursor: pointer;
        }
        .ps-subtask-remove:hover {
          background: #fee2e2;
          color: #b91c1c;
        }
        .ps-tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .ps-tag {
          padding: 2px 8px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 9px;
          font-weight: 700;
        }
        .ps-task-foot {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          padding-top: 11px;
          border-top: 1px solid var(--ps-border);
        }
        .ps-status-group {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .ps-status-btn {
          padding: 5px 10px;
          border: 1px solid var(--ps-border);
          border-radius: 7px;
          background: var(--ps-card);
          color: var(--ps-muted);
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
        }
        .ps-status-btn:hover {
          border-color: var(--ps-primary-hover);
          color: var(--ps-primary);
        }
        .ps-status-btn.is-active {
          border-color: var(--ps-primary);
          background: var(--ps-primary-soft);
          color: var(--ps-primary);
        }

        /* ============================================================
           BUTTONS
           ============================================================ */
        .ps-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 34px;
          padding: 0 14px;
          border: 1px solid transparent;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          cursor: pointer;
          transition: all 150ms ease;
        }
        .ps-btn:focus-visible,
        .ps-btn-pri:focus-visible {
          outline: 3px solid var(--ps-primary-hover);
          outline-offset: 2px;
        }
        .ps-btn-pri {
          border-color: #e74e1b;
          background: linear-gradient(135deg, #ff682f, #e94b18);
          color: #fff;
          box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
        }
        .ps-btn-pri:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(255, 90, 31, 0.28);
        }
        .ps-btn-pri:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }
        .ps-btn-sec {
          border-color: var(--ps-border);
          background: var(--ps-surface);
          color: var(--ps-text);
        }
        .ps-btn-sec:hover {
          border-color: var(--ps-primary-hover);
          color: var(--ps-primary);
        }
        .ps-btn-danger {
          border-color: #b91c1c;
          background: linear-gradient(135deg, #ef4444, #b91c1c);
          color: #fff;
        }
        .ps-btn-ghost {
          background: transparent;
          color: var(--ps-muted);
        }
        .ps-btn-ghost:hover {
          background: var(--ps-primary-soft);
          color: var(--ps-primary);
        }
        .ps-btn-wide {
          width: 100%;
        }
        .ps-mini-btn {
          padding: 6px 10px;
          border: 1px solid var(--ps-border);
          border-radius: 7px;
          background: var(--ps-card);
          color: var(--ps-text);
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
        }
        .ps-mini-btn:hover:not(:disabled) {
          border-color: var(--ps-primary-hover);
          color: var(--ps-primary);
        }
        .ps-mini-btn:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }
        .ps-stack-gap {
          margin-top: 9px;
        }

        /* ============================================================
           EMPTY STATES
           ============================================================ */
        .ps-empty {
          padding: 30px 20px;
          border: 1px dashed var(--ps-border);
          border-radius: 12px;
          background: var(--ps-surface);
          text-align: center;
        }
        .ps-empty-icon {
          display: block;
          margin-bottom: 8px;
          font-size: 30px;
        }
        .ps-empty h4 {
          margin: 0 0 4px;
          font-size: 13px;
          font-weight: 800;
        }
        .ps-empty p {
          margin: 0;
          color: var(--ps-muted);
          font-size: 11px;
        }
        .ps-empty-line {
          margin: 0;
          padding: 18px 14px;
          border-radius: 10px;
          background: var(--ps-card);
          color: var(--ps-muted);
          font-size: 11px;
          font-weight: 600;
          text-align: center;
        }

        /* ============================================================
           TIMER
           ============================================================ */
        .ps-timer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .ps-ring {
          position: relative;
          width: 150px;
          height: 150px;
        }
        .ps-ring svg {
          display: block;
          width: 100%;
          height: 100%;
        }
        .ps-ring-track {
          fill: none;
          stroke: #e2e8f0;
          stroke-width: 8;
        }
        .ps-ring-fill {
          fill: none;
          stroke: var(--ps-primary);
          stroke-width: 8;
          stroke-linecap: round;
          transition: stroke-dashoffset 300ms linear;
        }
        .ps-ring-fill.is-break {
          stroke: #16a34a;
        }
        .ps-ring-label {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }
        .ps-ring-label strong {
          font-size: 26px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }
        .ps-ring-label span {
          color: var(--ps-muted);
          font-size: 10px;
          font-weight: 700;
        }
        .ps-timer-task {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin: 0;
          text-align: center;
        }
        .ps-timer-task strong {
          font-size: 13px;
          overflow-wrap: anywhere;
        }
        .ps-timer-task span {
          color: var(--ps-muted);
          font-size: 10px;
        }
        .ps-timer-actions {
          display: grid;
          gap: 8px;
          width: 100%;
        }
        .ps-note-box {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 15px;
          padding: 12px;
          border-radius: 8px;
          background: var(--ps-surface);
        }
        .ps-note-box strong {
          font-size: 11px;
        }
        .ps-note-box span {
          color: var(--ps-muted);
          font-size: 10px;
          line-height: 1.6;
        }

        /* ============================================================
           FORMS — with explicit fallbacks so the modal portal renders
           ============================================================ */
        .ps-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .ps-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }
        .ps-field-wide {
          grid-column: 1 / -1;
        }
        .ps-field-full {
          grid-column: 1 / -1;
        }
        .ps-field > span {
          color: var(--ps-muted, #64748b);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .ps-field input,
        .ps-field select,
        .ps-field textarea {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--ps-border, #e5e7eb);
          border-radius: 8px;
          background: var(--ps-card, #ffffff);
          color: var(--ps-text, #172033);
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          outline: none;
          resize: vertical;
        }
        .ps-field input::placeholder,
        .ps-field textarea::placeholder {
          color: var(--ps-muted, #94a3b8);
          opacity: 0.85;
        }
        .ps-field input[type="number"] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
        .ps-field input[type="number"]::-webkit-outer-spin-button,
        .ps-field input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .ps-inline {
          display: flex;
          gap: 6px;
          align-items: stretch;
        }
        .ps-inline input {
          flex: 1;
        }
        .ps-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .ps-chip {
          padding: 5px 11px;
          border: 1px solid var(--ps-border);
          border-radius: 999px;
          background: var(--ps-card);
          color: var(--ps-muted);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }
        .ps-chip:hover {
          border-color: var(--ps-primary-hover);
          color: var(--ps-primary);
        }
        .ps-chip.is-active {
          border-color: var(--ps-primary);
          background: var(--ps-primary-soft);
          color: var(--ps-primary);
        }
        .ps-toggle-list {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--ps-border);
        }
        .ps-switch {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
        }
        .ps-switch > span:first-child {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .ps-switch strong {
          font-size: 11px;
        }
        .ps-switch small {
          color: var(--ps-muted);
          font-size: 10px;
          line-height: 1.4;
        }
        .ps-switch input {
          display: none;
        }
        .ps-switch-track {
          position: relative;
          display: inline-block;
          width: 36px;
          height: 20px;
          border-radius: 999px;
          background: #cbd5e1;
          transition: background 150ms ease;
          flex-shrink: 0;
        }
        .ps-switch-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          transition: transform 150ms ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        .ps-switch input:checked + .ps-switch-track {
          background: var(--ps-primary);
        }
        .ps-switch input:checked + .ps-switch-track .ps-switch-thumb {
          transform: translateX(16px);
        }

        /* ============================================================
           HELP
           ============================================================ */
        .ps-advanced-button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--ps-border);
          border-radius: 9px;
          background: transparent;
          color: var(--ps-muted);
          font-size: 11px;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
        }
        .ps-advanced-button:hover {
          color: var(--ps-primary);
          border-color: var(--ps-primary-hover);
        }
        .ps-advanced-button span {
          color: var(--ps-primary);
          font-size: 14px;
        }
        .ps-help {
          margin-top: 10px;
        }
        .ps-help-step {
          display: flex;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px solid var(--ps-border);
        }
        .ps-help-step:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }
        .ps-help-step > span {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 7px;
          background: var(--ps-primary-soft);
          color: var(--ps-primary);
          font-size: 9px;
          font-weight: 900;
        }
        .ps-help-step strong {
          display: block;
          font-size: 11px;
          margin-bottom: 2px;
        }
        .ps-help-step p {
          margin: 0;
          color: var(--ps-muted);
          font-size: 10px;
          line-height: 1.5;
        }

        /* ============================================================
           NOTICE
           ============================================================ */
        .ps-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 9px;
          background: var(--ps-surface);
          color: var(--ps-muted);
          font-size: 11px;
          font-weight: 600;
        }
        .ps-notice-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #475569;
          font-size: 10px;
          font-weight: 900;
        }
        .ps-notice-active {
          background: var(--ps-primary-soft);
          color: var(--ps-primary-dark);
        }
        .ps-notice-active .ps-notice-icon {
          background: #ffe2d5;
          color: var(--ps-primary);
        }
        .ps-notice-success {
          background: #ecfdf5;
          color: #166534;
        }
        .ps-notice-success .ps-notice-icon {
          background: #dcfce7;
          color: #15803d;
        }
        .ps-notice-warn {
          background: #fffbeb;
          color: #b45309;
        }
        .ps-notice-warn .ps-notice-icon {
          background: #fef3c7;
          color: #b45309;
        }
        .ps-undo-btn {
          margin-left: auto;
          padding: 3px 10px;
          border: 1px solid currentColor;
          border-radius: 6px;
          background: transparent;
          color: inherit;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .ps-footer-note {
          color: var(--ps-muted);
          font-size: 11px;
          line-height: 1.7;
          text-align: center;
        }
        .ps-footer-note kbd {
          display: inline-block;
          padding: 1px 6px;
          border: 1px solid var(--ps-border);
          border-radius: 4px;
          background: var(--ps-surface);
          font-size: 10px;
          font-weight: 800;
        }

        /* ============================================================
           MODAL — portal styles
           The backdrop redeclares the tokens as a safety net, so the
           modal renders correctly even if :root tokens are missing.
           ============================================================ */
        .ps-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 16px;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          animation: psFadeIn 160ms ease-out;
          font-family: inherit;

          --ps-text: #172033;
          --ps-muted: #64748b;
          --ps-border: #e5e7eb;
          --ps-card: #ffffff;
          --ps-surface: #f8fafc;
          --ps-primary: #ff5a1f;
          --ps-primary-dark: #e64a14;
          --ps-primary-soft: #fff3ed;
          --ps-primary-hover: #ffb69d;
        }

        @media (prefers-color-scheme: dark) {
          .ps-modal-backdrop {
            --ps-text: #e5e7eb;
            --ps-muted: #94a3b8;
            --ps-border: #334155;
            --ps-card: #0f172a;
            --ps-surface: #1e293b;
          }
        }

        .ps-modal {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 580px;
          max-height: calc(100dvh - 32px);
          overflow: hidden;
          border: 1px solid var(--ps-border, #e5e7eb);
          border-radius: 16px;
          background: var(--ps-card, #ffffff);
          color: var(--ps-text, #172033);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
          animation: psSlideUp 220ms cubic-bezier(0.2, 0.9, 0.3, 1);
        }

        /* Explicit modal field overrides — these are the rules that
           make the popup form fields visible. They use hardcoded
           fallbacks so nothing relies on inherited tokens. */
        .ps-modal .ps-field > span {
          color: var(--ps-muted, #64748b);
        }
        .ps-modal .ps-field input,
        .ps-modal .ps-field select,
        .ps-modal .ps-field textarea {
          background: var(--ps-card, #ffffff);
          color: var(--ps-text, #172033);
          border: 1px solid var(--ps-border, #e5e7eb);
        }
        .ps-modal .ps-field input::placeholder,
        .ps-modal .ps-field textarea::placeholder {
          color: var(--ps-muted, #94a3b8);
          opacity: 0.85;
        }
        .ps-modal .ps-field input:focus,
        .ps-modal .ps-field select:focus,
        .ps-modal .ps-field textarea:focus {
          border-color: var(--ps-primary, #ff5a1f);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.15);
        }

        .ps-modal-sm {
          max-width: 420px;
        }

        @media (min-width: 640px) {
          .ps-modal-backdrop {
            align-items: center;
          }
        }

        .ps-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 16px 18px 12px;
          border-bottom: 1px solid var(--ps-border, #e5e7eb);
        }
        .ps-modal-head h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          color: var(--ps-text, #172033);
        }

        .ps-modal-body {
          overflow-y: auto;
          padding: 16px 18px;
        }

        .ps-modal-text {
          padding: 12px 18px 0;
          margin: 0;
          color: var(--ps-muted, #64748b);
          font-size: 12px;
          line-height: 1.55;
        }

        .ps-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 18px 16px;
          border-top: 1px solid var(--ps-border, #e5e7eb);
          background: var(--ps-surface, #f8fafc);
        }

        @keyframes psFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes psSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ps-modal-backdrop,
          .ps-modal {
            animation: none;
          }
        }

        /* ============================================================
           RESPONSIVE
           ============================================================ */
        @media (max-width: 900px) {
          .ps-main-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .ps-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .ps-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .ps-header-stats {
            align-self: stretch;
            justify-content: flex-start;
          }
          .ps-form-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .ps-tabs {
            overflow-x: auto;
            display: flex;
            flex-wrap: nowrap;
          }
          .ps-tab {
            flex: 1 0 auto;
          }
        }
      `}</style>
    </ToolShell>
  );
}

/* ------------------------------------------------------ small components */

function SubtaskAdder({
  onAdd,
  placeholder = "Add subtask…",
}: {
  onAdd: (title: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = value.trim();
        if (!t) return;
        onAdd(t);
        setValue("");
      }}
      style={{ display: "flex", gap: 4, marginTop: 6 }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        maxLength={120}
        style={{
          flex: 1,
          padding: "5px 8px",
          borderRadius: 6,
          border: "1px solid var(--ps-border, #e5e7eb)",
          background: "var(--ps-card, #fff)",
          color: "inherit",
          fontSize: 10,
          outline: "none",
        }}
      />
      <button
        type="submit"
        style={{
          padding: "5px 10px",
          borderRadius: 6,
          border: "1px solid var(--ps-primary, #ff5a1f)",
          background: "var(--ps-primary-soft, #fff3ed)",
          color: "var(--ps-primary, #ff5a1f)",
          fontSize: 10,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Add
      </button>
    </form>
  );
}
