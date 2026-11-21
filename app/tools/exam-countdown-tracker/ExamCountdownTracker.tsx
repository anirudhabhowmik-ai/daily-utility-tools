"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ToolShell from "../ToolShell";

/* ---------------------------------------------------------------- types */

type ExamType = "exam" | "quiz" | "assignment" | "practical" | "other";
type Priority = "High" | "Medium" | "Low";
type Tone = "idle" | "active" | "success" | "warn";
type SortKey = "next" | "weight" | "priority";
type View = "list" | "calendar";

type ChecklistItem = {
  id: string;
  title: string;
  done: boolean;
};

type Exam = {
  id: string;
  name: string;
  subject: string;
  type: ExamType;
  date: string;
  time: string;
  duration: number;
  location: string;
  seat: string;
  weight: number;
  priority: Priority;
  notes: string;
  checklist: ChecklistItem[];
  studyMinutes: number;
  targetStudyMinutes: number;
  studiedDates: string[];
  reminderDays: number;
  createdAt: number;
};

type Persisted = {
  version: 2;
  exams: Exam[];
};

type ConfirmState = {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
} | null;

/* ------------------------------------------------------------ constants */

const STORAGE_KEY = "toolsab-exam-countdown-tracker-v2";
const LEGACY_KEY = "toolsab-exam-countdown-tracker-v1";

const EXAM_TYPES: { id: ExamType; label: string; icon: string }[] = [
  { id: "exam", label: "Exam", icon: "📝" },
  { id: "quiz", label: "Quiz", icon: "❓" },
  { id: "assignment", label: "Assignment", icon: "📄" },
  { id: "practical", label: "Practical", icon: "🔬" },
  { id: "other", label: "Other", icon: "📌" },
];

const PRIORITIES: Priority[] = ["High", "Medium", "Low"];
const REMINDER_OPTIONS = [0, 1, 2, 3, 7, 14];
const QUICK_ADD_MINUTES = [10, 15, 25, 30, 50];

/* -------------------------------------------------------------- helpers */

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getExamDateTime(exam: Exam) {
  return new Date(`${exam.date}T${exam.time || "09:00"}:00`);
}

function formatExamDate(exam: Exam) {
  const date = getExamDateTime(exam);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getCountdown(target: Date, nowMs: number) {
  const diff = target.getTime() - nowMs;
  if (diff <= 0)
    return { passed: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const total = Math.floor(diff / 1000);
  return {
    passed: false,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function daysUntil(target: Date) {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const targetStart = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  ).getTime();
  return Math.round((targetStart - todayStart) / 86400000);
}

function formatDuration(mins: number) {
  if (mins <= 0) return "0 min";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

function createEmptyForm() {
  return {
    name: "",
    subject: "",
    type: "exam" as ExamType,
    date: getToday(),
    time: "09:00",
    duration: 0,
    location: "",
    seat: "",
    weight: 0,
    priority: "Medium" as Priority,
    notes: "",
    reminderDays: 7,
    targetStudyMinutes: 0,
  };
}

function sanitizeExam(raw: unknown): Exam | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  if (
    typeof e.id !== "string" ||
    typeof e.name !== "string" ||
    typeof e.subject !== "string" ||
    typeof e.date !== "string" ||
    typeof e.time !== "string"
  ) {
    return null;
  }
  const type: ExamType =
    e.type === "quiz" ||
    e.type === "assignment" ||
    e.type === "practical" ||
    e.type === "other"
      ? e.type
      : "exam";
  const priority: Priority =
    e.priority === "High" || e.priority === "Low" ? e.priority : "Medium";
  return {
    id: e.id,
    name: e.name,
    subject: e.subject,
    type,
    date: e.date,
    time: e.time,
    duration:
      typeof e.duration === "number" ? Math.max(0, Math.round(e.duration)) : 0,
    location: typeof e.location === "string" ? e.location : "",
    seat: typeof e.seat === "string" ? e.seat : "",
    weight:
      typeof e.weight === "number"
        ? Math.max(0, Math.min(100, Math.round(e.weight)))
        : 0,
    priority,
    notes: typeof e.notes === "string" ? e.notes : "",
    checklist: Array.isArray(e.checklist)
      ? (e.checklist as unknown[])
          .map((c) => {
            if (!c || typeof c !== "object") return null;
            const co = c as Record<string, unknown>;
            if (typeof co.title !== "string") return null;
            return {
              id: typeof co.id === "string" ? co.id : createId(),
              title: co.title,
              done: co.done === true,
            };
          })
          .filter((c): c is ChecklistItem => c !== null)
      : [],
    studyMinutes:
      typeof e.studyMinutes === "number"
        ? Math.max(0, Math.round(e.studyMinutes))
        : 0,
    targetStudyMinutes:
      typeof e.targetStudyMinutes === "number"
        ? Math.max(0, Math.round(e.targetStudyMinutes))
        : 0,
    studiedDates: Array.isArray(e.studiedDates)
      ? e.studiedDates.filter((d): d is string => typeof d === "string")
      : [],
    reminderDays:
      typeof e.reminderDays === "number"
        ? Math.max(0, Math.min(30, Math.round(e.reminderDays)))
        : 7,
    createdAt: typeof e.createdAt === "number" ? e.createdAt : Date.now(),
  };
}

/* ------------------------------------------------------------ component */

export default function ExamCountdownTracker() {
  const [loaded, setLoaded] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [now, setNow] = useState(0);
  const [mounted, setMounted] = useState(false);

  /* ---- views ---- */
  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [sortKey, setSortKey] = useState<SortKey>("next");
  const [search, setSearch] = useState("");

  /* ---- form ---- */
  const [form, setForm] = useState(createEmptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  /* ---- calendar ---- */
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  });
  const [calendarSelected, setCalendarSelected] = useState<string | null>(null);

  /* ---- ui ---- */
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [undoBuffer, setUndoBuffer] = useState<{
    exams: Exam[];
    label: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [tone, setTone] = useState<Tone>("idle");
  const [showHelp, setShowHelp] = useState(false);

  const noticeTimerRef = useRef<number | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const examsRef = useRef<Exam[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    examsRef.current = exams;
  }, [exams]);

  /* -------------------------------------------------------------- flash */

  const flash = useCallback((message: string, kind: Tone = "idle") => {
    if (noticeTimerRef.current !== null)
      window.clearTimeout(noticeTimerRef.current);
    setNotice(message);
    setTone(kind);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
      setTone("idle");
      noticeTimerRef.current = null;
    }, 3800);
  }, []);

  /* -------------------------------------------------------------- hydrate */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as Partial<Persisted>;
        if (Array.isArray(data.exams)) {
          setExams(
            data.exams.map(sanitizeExam).filter((e): e is Exam => e !== null),
          );
        }
      } else {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed)) {
            setExams(
              parsed.map(sanitizeExam).filter((e): e is Exam => e !== null),
            );
          }
        }
      }
    } catch {
      /* ignore */
    }
    setNow(Date.now());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      const payload: Persisted = { version: 2, exams };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [exams, loaded]);

  /* -------------------------------------------------------------- tick */

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  /* -------------------------------------------------------------- undo */

  const snapshotForUndo = useCallback((label: string) => {
    setUndoBuffer({ exams: [...examsRef.current], label });
  }, []);

  const undoLast = useCallback(() => {
    if (!undoBuffer) return;
    setExams(undoBuffer.exams);
    flash(`Undone: ${undoBuffer.label}`, "warn");
    setUndoBuffer(null);
  }, [undoBuffer, flash]);

  /* -------------------------------------------------------------- derived */

  const sortedExams = useMemo(() => {
    const list = [...exams];
    if (sortKey === "next") {
      list.sort(
        (a, b) => getExamDateTime(a).getTime() - getExamDateTime(b).getTime(),
      );
    } else if (sortKey === "weight") {
      list.sort((a, b) => b.weight - a.weight);
    } else if (sortKey === "priority") {
      const order: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
      list.sort((a, b) => order[a.priority] - order[b.priority]);
    }
    return list;
  }, [exams, sortKey]);

  const upcomingExams = useMemo(
    () => sortedExams.filter((e) => getExamDateTime(e).getTime() > now),
    [sortedExams, now],
  );
  const pastExams = useMemo(
    () => sortedExams.filter((e) => getExamDateTime(e).getTime() <= now),
    [sortedExams, now],
  );
  const nextExam = upcomingExams[0];

  const visibleExams = useMemo(() => {
    let base =
      filter === "upcoming"
        ? upcomingExams
        : filter === "past"
          ? pastExams
          : sortedExams;
    if (view === "calendar" && calendarSelected) {
      base = base.filter((e) => e.date === calendarSelected);
    }
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((e) =>
      `${e.name} ${e.subject} ${e.location} ${e.seat} ${e.notes}`
        .toLowerCase()
        .includes(q),
    );
  }, [
    filter,
    view,
    calendarSelected,
    upcomingExams,
    pastExams,
    sortedExams,
    search,
  ]);

  const totalWeightUpcoming = useMemo(
    () => upcomingExams.reduce((s, e) => s + e.weight, 0),
    [upcomingExams],
  );

  const totalRemainingPrep = useMemo(
    () =>
      upcomingExams.reduce(
        (s, e) => s + Math.max(0, (e.targetStudyMinutes || 0) - e.studyMinutes),
        0,
      ),
    [upcomingExams],
  );

  const totalChecklist = exams.reduce((s, e) => s + e.checklist.length, 0);
  const doneChecklist = exams.reduce(
    (s, e) => s + e.checklist.filter((c) => c.done).length,
    0,
  );
  const overallPrep =
    totalChecklist > 0 ? Math.round((doneChecklist / totalChecklist) * 100) : 0;

  const totalStudyMinutes = exams.reduce((s, e) => s + e.studyMinutes, 0);

  const studyStreak = useMemo(() => {
    const days = new Set<string>();
    for (const e of exams) for (const d of e.studiedDates) days.add(d);
    let count = 0;
    let cursor = getToday();
    if (!days.has(cursor)) cursor = addDays(cursor, -1);
    while (days.has(cursor)) {
      count += 1;
      cursor = addDays(cursor, -1);
    }
    return count;
  }, [exams]);

  const urgency = useCallback(
    (exam: Exam): { label: string; cls: string } => {
      const target = getExamDateTime(exam);
      if (target.getTime() <= now)
        return { label: "Passed", cls: "ps-tag-past" };
      const days = daysUntil(target);
      if (days === 0) return { label: "Today", cls: "ps-tag-today" };
      if (days === 1) return { label: "Tomorrow", cls: "ps-tag-tomorrow" };
      if (days <= exam.reminderDays || days <= 7)
        return { label: `${days} days`, cls: "ps-tag-soon" };
      return { label: `${days} days`, cls: "ps-tag-future" };
    },
    [now],
  );

  /* -------------------------------------------------------------- form */

  const updateField = <K extends keyof ReturnType<typeof createEmptyForm>>(
    field: K,
    value: ReturnType<typeof createEmptyForm>[K],
  ) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const resetForm = useCallback(() => {
    setForm(createEmptyForm());
    setEditingId(null);
    setShowForm(false);
  }, []);

  const openNew = useCallback(() => {
    resetForm();
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [resetForm]);

  const openEdit = useCallback((exam: Exam) => {
    setForm({
      name: exam.name,
      subject: exam.subject,
      type: exam.type,
      date: exam.date,
      time: exam.time,
      duration: exam.duration,
      location: exam.location,
      seat: exam.seat,
      weight: exam.weight,
      priority: exam.priority,
      notes: exam.notes,
      reminderDays: exam.reminderDays,
      targetStudyMinutes: exam.targetStudyMinutes,
    });
    setEditingId(exam.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    const subject = form.subject.trim();
    if (!name || !subject || !form.date || !form.time) {
      flash("Name, subject, date and time are required.", "warn");
      return;
    }
    const dateCheck = new Date(`${form.date}T${form.time}:00`);
    if (Number.isNaN(dateCheck.getTime())) {
      flash("That date/time could not be parsed.", "warn");
      return;
    }

    if (editingId) {
      snapshotForUndo("Edit exam");
      setExams((prev) =>
        prev.map((e) =>
          e.id === editingId
            ? {
                ...e,
                name,
                subject,
                type: form.type,
                date: form.date,
                time: form.time,
                duration: form.duration,
                location: form.location.trim(),
                seat: form.seat.trim(),
                weight: form.weight,
                priority: form.priority,
                notes: form.notes.trim(),
                reminderDays: form.reminderDays,
                targetStudyMinutes: form.targetStudyMinutes,
              }
            : e,
        ),
      );
      flash("Exam updated.", "success");
    } else {
      const exam: Exam = {
        id: createId(),
        name,
        subject,
        type: form.type,
        date: form.date,
        time: form.time,
        duration: form.duration,
        location: form.location.trim(),
        seat: form.seat.trim(),
        weight: form.weight,
        priority: form.priority,
        notes: form.notes.trim(),
        checklist: [],
        studyMinutes: 0,
        targetStudyMinutes: form.targetStudyMinutes,
        studiedDates: [],
        reminderDays: form.reminderDays,
        createdAt: Date.now(),
      };
      setExams((prev) => [...prev, exam]);
      flash("Exam added.", "success");
    }
    resetForm();
  };

  /* -------------------------------------------------------------- per-exam ops */

  const deleteExam = useCallback(
    (id: string) => {
      const target = examsRef.current.find((e) => e.id === id);
      if (!target) return;
      setConfirm({
        title: "Delete this exam?",
        body: `"${target.name}" will be removed along with its checklist and study log. You can undo once with the Undo button.`,
        confirmLabel: "Delete exam",
        danger: true,
        onConfirm: () => {
          snapshotForUndo("Delete exam");
          setExams((prev) => prev.filter((e) => e.id !== id));
          if (editingId === id) resetForm();
          flash("Exam deleted.", "success");
        },
      });
    },
    [snapshotForUndo, editingId, resetForm, flash],
  );

  const addChecklist = useCallback((examId: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    setExams((prev) =>
      prev.map((e) =>
        e.id === examId
          ? {
              ...e,
              checklist: [
                ...e.checklist,
                { id: createId(), title: clean, done: false },
              ],
            }
          : e,
      ),
    );
  }, []);

  const toggleChecklist = useCallback((examId: string, itemId: string) => {
    setExams((prev) =>
      prev.map((e) =>
        e.id === examId
          ? {
              ...e,
              checklist: e.checklist.map((c) =>
                c.id === itemId ? { ...c, done: !c.done } : c,
              ),
            }
          : e,
      ),
    );
  }, []);

  const removeChecklist = useCallback((examId: string, itemId: string) => {
    setExams((prev) =>
      prev.map((e) =>
        e.id === examId
          ? { ...e, checklist: e.checklist.filter((c) => c.id !== itemId) }
          : e,
      ),
    );
  }, []);

  /**
   * Log study time. `minutes` can be negative to correct a mistake.
   * Pushes an undo snapshot so a mis-tap is recoverable.
   */
  const logStudy = useCallback(
    (examId: string, minutes: number) => {
      if (minutes === 0) return;
      const target = examsRef.current.find((e) => e.id === examId);
      if (!target) return;

      const newTotal = Math.max(0, target.studyMinutes + minutes);
      const delta = newTotal - target.studyMinutes;

      snapshotForUndo(
        delta > 0 ? `Logged +${delta} min` : `Adjusted -${Math.abs(delta)} min`,
      );

      setExams((prev) =>
        prev.map((e) =>
          e.id === examId
            ? {
                ...e,
                studyMinutes: newTotal,
                studiedDates:
                  delta > 0
                    ? Array.from(new Set([...e.studiedDates, getToday()]))
                    : e.studiedDates,
              }
            : e,
        ),
      );

      const remaining =
        target.targetStudyMinutes > 0
          ? Math.max(0, target.targetStudyMinutes - newTotal)
          : 0;

      if (delta > 0) {
        if (
          target.targetStudyMinutes > 0 &&
          newTotal >= target.targetStudyMinutes
        ) {
          flash(`🎯 Target reached for ${target.name}!`, "success");
        } else if (remaining > 0) {
          flash(
            `+${delta} min logged · ${formatDuration(remaining)} remaining`,
            "success",
          );
        } else {
          flash(`+${delta} min logged.`, "success");
        }
      } else {
        flash(`Adjusted by ${delta} min.`, "warn");
      }
    },
    [snapshotForUndo, flash],
  );

  /* -------------------------------------------------------------- backup */

  const exportJSON = useCallback(() => {
    const payload = { version: 2, exportedAt: new Date().toISOString(), exams };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `exam-tracker-${getToday()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    flash("Backup downloaded.", "success");
  }, [exams, flash]);

  const exportCSV = useCallback(() => {
    if (exams.length === 0) return flash("No exams to export.", "warn");
    const rows = [
      [
        "Name",
        "Subject",
        "Type",
        "Date",
        "Time",
        "Duration",
        "Location",
        "Seat",
        "Weight",
        "Priority",
        "Studied (min)",
        "Target (min)",
        "Remaining (min)",
        "Checklist",
        "Notes",
      ],
      ...exams.map((e) => [
        e.name,
        e.subject,
        e.type,
        e.date,
        e.time,
        e.duration,
        e.location,
        e.seat,
        e.weight,
        e.priority,
        e.studyMinutes,
        e.targetStudyMinutes,
        Math.max(0, e.targetStudyMinutes - e.studyMinutes),
        `${e.checklist.filter((c) => c.done).length}/${e.checklist.length}`,
        e.notes,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `exam-tracker-${getToday()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    flash("CSV exported.", "success");
  }, [exams, flash]);

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as { exams?: unknown };
        if (!Array.isArray(data.exams)) throw new Error("No exams");
        const imported = data.exams
          .map(sanitizeExam)
          .filter((e): e is Exam => e !== null);
        if (imported.length === 0) throw new Error("Empty");
        setConfirm({
          title: `Import ${imported.length} exam${imported.length === 1 ? "" : "s"}?`,
          body: "This replaces everything currently in the tracker. You can undo once afterwards.",
          confirmLabel: "Replace tracker",
          onConfirm: () => {
            snapshotForUndo("Import backup");
            setExams(imported);
            flash("Backup imported.", "success");
          },
        });
      } catch {
        flash("That file is not a valid exam tracker backup.", "warn");
      }
    },
    [snapshotForUndo, flash],
  );

  /* -------------------------------------------------------------- reset */

  const resetAll = useCallback(() => {
    if (exams.length === 0) {
      resetForm();
      return;
    }
    setConfirm({
      title: "Reset the tracker?",
      body: "Every exam, checklist and study log will be permanently deleted from this browser.",
      confirmLabel: "Reset everything",
      danger: true,
      onConfirm: () => {
        setExams([]);
        resetForm();
        setFilter("upcoming");
        setSearch("");
        setCalendarSelected(null);
        flash("Tracker reset.", "success");
      },
    });
  }, [exams.length, resetForm, flash]);

  /* -------------------------------------------------------------- keyboard */

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (confirm) return setConfirm(null);
        if (showForm) {
          resetForm();
          return;
        }
      }
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
        return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (showForm || confirm) return;

      if (event.key === "/") {
        event.preventDefault();
        setView("list");
        window.setTimeout(() => searchRef.current?.focus(), 0);
      } else if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        openNew();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [confirm, showForm, resetForm, openNew]);

  /* -------------------------------------------------------------- calendar */

  const calendarDays = useMemo(() => {
    const [yStr, mStr] = calendarMonth.split("-");
    const year = Number(yStr);
    const month = Number(mStr) - 1;
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startWeekday = first.getDay();
    const days: {
      date: string;
      day: number;
      isCurrent: boolean;
      count: number;
      isToday: boolean;
    }[] = [];

    for (let i = 0; i < startWeekday; i += 1) {
      days.push({
        date: "",
        day: 0,
        isCurrent: false,
        count: 0,
        isToday: false,
      });
    }
    const today = getToday();
    for (let d = 1; d <= last.getDate(); d += 1) {
      const key = `${year}-${pad(month + 1)}-${pad(d)}`;
      const count = exams.filter((e) => e.date === key).length;
      days.push({
        date: key,
        day: d,
        isCurrent: true,
        count,
        isToday: key === today,
      });
    }
    while (days.length % 7 !== 0) {
      days.push({
        date: "",
        day: 0,
        isCurrent: false,
        count: 0,
        isToday: false,
      });
    }
    return days;
  }, [calendarMonth, exams]);

  const shiftMonth = (delta: number) => {
    const [yStr, mStr] = calendarMonth.split("-");
    const d = new Date(Number(yStr), Number(mStr) - 1 + delta, 1);
    setCalendarMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };

  /* -------------------------------------------------------------- render helpers */

  const countdownDisplay = (exam: Exam, compact = false) => {
    const c = getCountdown(getExamDateTime(exam), now);
    if (c.passed) {
      return (
        <div
          className={`ps-countdown ps-countdown-passed ${compact ? "is-compact" : ""}`}
        >
          <span>Exam has passed</span>
        </div>
      );
    }
    const units = [
      { label: "Days", value: c.days },
      { label: "Hrs", value: c.hours },
      { label: "Min", value: c.minutes },
      { label: "Sec", value: c.seconds },
    ];
    return (
      <div className={`ps-countdown ${compact ? "is-compact" : ""}`}>
        {units.map((u) => (
          <div key={u.label} className="ps-countdown-cell">
            <strong>{pad(u.value)}</strong>
            <span>{u.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderExamCard = (exam: Exam) => {
    const urgencyInfo = urgency(exam);
    const typeInfo =
      EXAM_TYPES.find((t) => t.id === exam.type) ?? EXAM_TYPES[0];

    const hasTarget = exam.targetStudyMinutes > 0;
    const remaining = Math.max(0, exam.targetStudyMinutes - exam.studyMinutes);
    const studyPct = hasTarget
      ? Math.min(
          100,
          Math.round((exam.studyMinutes / exam.targetStudyMinutes) * 100),
        )
      : 0;
    const targetReached =
      hasTarget && exam.studyMinutes >= exam.targetStudyMinutes;
    const daysLeft = daysUntil(getExamDateTime(exam));
    const behindSchedule = hasTarget && !targetReached && daysLeft <= 2;

    const done = exam.checklist.filter((x) => x.done).length;
    const prepPct =
      exam.checklist.length > 0
        ? Math.round((done / exam.checklist.length) * 100)
        : 0;

    return (
      <article
        key={exam.id}
        className={`ps-exam ps-exam-${exam.priority.toLowerCase()}`}
      >
        <header className="ps-exam-head">
          <div className="ps-exam-badges">
            <span className="ps-badge ps-badge-type">
              {typeInfo.icon} {typeInfo.label}
            </span>
            <span className={`ps-badge ps-tag ${urgencyInfo.cls}`}>
              {urgencyInfo.label}
            </span>
            {exam.weight > 0 && (
              <span className="ps-badge ps-badge-weight">
                {exam.weight}% weight
              </span>
            )}
            <span
              className={`ps-badge ps-badge-priority-${exam.priority.toLowerCase()}`}
            >
              {exam.priority}
            </span>
            {targetReached && (
              <span className="ps-badge ps-badge-ready">Prepared ✓</span>
            )}
            {behindSchedule && (
              <span className="ps-badge ps-badge-behind">Behind prep</span>
            )}
          </div>
          <div className="ps-exam-actions">
            <button
              type="button"
              className="ps-icon-btn"
              onClick={() => openEdit(exam)}
              aria-label="Edit exam"
              title="Edit"
            >
              ✎
            </button>
            <button
              type="button"
              className="ps-icon-btn ps-icon-danger"
              onClick={() => deleteExam(exam.id)}
              aria-label="Delete exam"
              title="Delete"
            >
              🗑
            </button>
          </div>
        </header>

        <h4 className="ps-exam-title">{exam.name}</h4>
        <p className="ps-exam-subject">{exam.subject}</p>

        <div className="ps-exam-meta">
          <span>📅 {formatExamDate(exam)}</span>
          {exam.duration > 0 && <span>⏱ {formatDuration(exam.duration)}</span>}
          {exam.location && <span>📍 {exam.location}</span>}
          {exam.seat && <span>🪑 {exam.seat}</span>}
        </div>

        <div className="ps-exam-countdown">{countdownDisplay(exam, true)}</div>

        {/* STUDY TRACKER — the key fix */}
        <div className="ps-study">
          <div className="ps-study-head">
            <span>
              Studied · <strong>{formatDuration(exam.studyMinutes)}</strong>
              {hasTarget && (
                <>
                  {" "}
                  of <strong>{formatDuration(exam.targetStudyMinutes)}</strong>
                </>
              )}
            </span>
            <div className="ps-study-btns">
              {QUICK_ADD_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="ps-mini-btn"
                  onClick={() => logStudy(exam.id, m)}
                  aria-label={`Log ${m} minutes of study`}
                >
                  +{m}m
                </button>
              ))}
              <button
                type="button"
                className="ps-mini-btn"
                onClick={() => {
                  const input = window.prompt(
                    `How many minutes to log for "${exam.name}"?\n(Use a negative number to correct a mistake.)`,
                    "60",
                  );
                  if (input === null) return;
                  const parsed = Number(input);
                  if (!Number.isFinite(parsed) || parsed === 0) return;
                  logStudy(exam.id, Math.round(parsed));
                }}
                aria-label="Log custom minutes"
              >
                +custom
              </button>
              {exam.studyMinutes > 0 && (
                <button
                  type="button"
                  className="ps-mini-btn ps-mini-danger"
                  onClick={() =>
                    logStudy(exam.id, -Math.min(5, exam.studyMinutes))
                  }
                  aria-label="Subtract 5 minutes to correct a mistake"
                  title="Correct by -5m (use +custom for other amounts)"
                >
                  −5m
                </button>
              )}
            </div>
          </div>

          {hasTarget && (
            <div className="ps-study-progress">
              <div className="ps-study-progress-bar">
                <div
                  className={`ps-study-progress-fill ${targetReached ? "is-done" : ""}`}
                  style={{ width: `${studyPct}%` }}
                />
              </div>
              <div className="ps-study-progress-meta">
                {targetReached ? (
                  <span className="ps-study-done">🎯 Target reached</span>
                ) : (
                  <span>
                    <strong>{formatDuration(remaining)}</strong> of prep
                    remaining
                  </span>
                )}
                <span>{studyPct}% complete</span>
              </div>
              {!targetReached && daysLeft > 0 && daysLeft <= 14 && (
                <p className="ps-study-hint">
                  Suggested:{" "}
                  <strong>
                    {Math.ceil(remaining / Math.max(1, daysLeft))} min/day
                  </strong>{" "}
                  for the next {daysLeft} day{daysLeft === 1 ? "" : "s"}
                </p>
              )}
            </div>
          )}

          {!hasTarget && (
            <p className="ps-study-hint ps-study-hint-muted">
              Tip: set a target prep time when editing this exam to track
              remaining study.
            </p>
          )}
        </div>

        {exam.checklist.length > 0 && (
          <div className="ps-checklist">
            <div className="ps-checklist-head">
              <span>
                Prep checklist · {done}/{exam.checklist.length}
              </span>
              <span>{prepPct}%</span>
            </div>
            <div className="ps-progress-bar">
              <div
                className="ps-progress-fill"
                style={{ width: `${prepPct}%` }}
              />
            </div>
            <ul className="ps-checklist-list">
              {exam.checklist.map((item) => (
                <li key={item.id} className="ps-checklist-row">
                  <label className="ps-checklist-check">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleChecklist(exam.id, item.id)}
                    />
                    <span className={item.done ? "is-struck" : ""}>
                      {item.title}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="ps-checklist-remove"
                    onClick={() => removeChecklist(exam.id, item.id)}
                    aria-label="Remove checklist item"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <ChecklistAdder onAdd={(t) => addChecklist(exam.id, t)} />
          </div>
        )}
        {exam.checklist.length === 0 && (
          <ChecklistAdder onAdd={(t) => addChecklist(exam.id, t)} />
        )}

        {exam.notes && (
          <div className="ps-exam-notes">
            <span>NOTES</span>
            <p>{exam.notes}</p>
          </div>
        )}
      </article>
    );
  };

  /* -------------------------------------------------------------- modal */

  const modal =
    showForm && mounted
      ? createPortal(
          <div
            className="ps-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ps-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) resetForm();
            }}
          >
            <div className="ps-modal">
              <div className="ps-modal-head">
                <h3 id="ps-modal-title">
                  {editingId ? "Edit exam" : "Add a new exam"}
                </h3>
                <button
                  type="button"
                  className="ps-icon-btn"
                  onClick={resetForm}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className="ps-modal-body">
                <div className="ps-form-grid">
                  <label className="ps-field ps-field-wide">
                    <span>Exam name *</span>
                    <input
                      required
                      maxLength={80}
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="e.g. Semester 2 Final Examination"
                      autoFocus
                    />
                  </label>

                  <label className="ps-field">
                    <span>Subject *</span>
                    <input
                      required
                      maxLength={60}
                      value={form.subject}
                      onChange={(e) => updateField("subject", e.target.value)}
                      placeholder="e.g. Mathematics"
                    />
                  </label>

                  <label className="ps-field">
                    <span>Type</span>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        updateField("type", e.target.value as ExamType)
                      }
                    >
                      {EXAM_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.icon} {t.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="ps-field">
                    <span>Exam date *</span>
                    <input
                      required
                      type="date"
                      value={form.date}
                      onChange={(e) => updateField("date", e.target.value)}
                    />
                  </label>

                  <label className="ps-field">
                    <span>Start time *</span>
                    <input
                      required
                      type="time"
                      value={form.time}
                      onChange={(e) => updateField("time", e.target.value)}
                    />
                  </label>

                  <label className="ps-field">
                    <span>Duration (minutes)</span>
                    <input
                      type="number"
                      min={0}
                      max={600}
                      step={5}
                      value={form.duration || ""}
                      onChange={(e) =>
                        updateField("duration", Number(e.target.value) || 0)
                      }
                      placeholder="e.g. 120"
                    />
                  </label>

                  <label className="ps-field">
                    <span>Weight (% of grade)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.weight || ""}
                      onChange={(e) =>
                        updateField(
                          "weight",
                          Math.max(
                            0,
                            Math.min(100, Number(e.target.value) || 0),
                          ),
                        )
                      }
                      placeholder="e.g. 40"
                    />
                  </label>

                  <label className="ps-field ps-field-wide">
                    <span>Target prep time (minutes)</span>
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      step={5}
                      value={form.targetStudyMinutes || ""}
                      onChange={(e) =>
                        updateField(
                          "targetStudyMinutes",
                          Math.max(0, Number(e.target.value) || 0),
                        )
                      }
                      placeholder="e.g. 240 (4 hours)"
                    />
                    <small
                      style={{
                        fontSize: 10,
                        color: "var(--ps-muted)",
                        marginTop: 2,
                      }}
                    >
                      How much study time do you want to put in before this
                      exam? Logging study reduces the remaining amount. Set 0 to
                      skip this feature.
                    </small>
                  </label>

                  <label className="ps-field">
                    <span>Location</span>
                    <input
                      maxLength={100}
                      value={form.location}
                      onChange={(e) => updateField("location", e.target.value)}
                      placeholder="e.g. Room 204"
                    />
                  </label>

                  <label className="ps-field">
                    <span>Seat / desk</span>
                    <input
                      maxLength={30}
                      value={form.seat}
                      onChange={(e) => updateField("seat", e.target.value)}
                      placeholder="e.g. B-12"
                    />
                  </label>

                  <label className="ps-field">
                    <span>Priority</span>
                    <select
                      value={form.priority}
                      onChange={(e) =>
                        updateField("priority", e.target.value as Priority)
                      }
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="ps-field">
                    <span>Urgency reminder</span>
                    <select
                      value={form.reminderDays}
                      onChange={(e) =>
                        updateField("reminderDays", Number(e.target.value))
                      }
                    >
                      {REMINDER_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n === 0
                            ? "Off"
                            : `${n} day${n === 1 ? "" : "s"} before`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="ps-field ps-field-wide">
                    <span>Notes</span>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={form.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      placeholder="Materials to bring, preparation reminders, allowed items…"
                    />
                  </label>
                </div>

                <div className="ps-modal-actions">
                  <button
                    type="button"
                    className="ps-btn ps-btn-ghost"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="ps-btn ps-btn-pri">
                    {editingId ? "Save changes" : "Add exam"}
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

  /* -------------------------------------------------------------- render */

  const statusIcon =
    tone === "success"
      ? "✓"
      : tone === "warn"
        ? "!"
        : tone === "active"
          ? "◉"
          : "◆";

  return (
    <ToolShell title="Exam countdown tracker" onReset={resetAll} wide>
      <div className="ps-wrapper">
        {/* HEADER */}
        <header className="ps-header">
          <div>
            <span className="ps-eyebrow">EXAM TRACKER · PRO</span>
            <h2>Exam countdown tracker</h2>
            <p>
              Track every exam, quiz and deadline. See exactly how long until
              each one, and how prepared you are.
            </p>
          </div>
          <div className="ps-header-stats">
            <div className="ps-mini-stat">
              <span>STREAK</span>
              <strong>🔥 {studyStreak}</strong>
            </div>
            <div className="ps-mini-stat">
              <span>PREP</span>
              <strong>{overallPrep}%</strong>
            </div>
          </div>
        </header>

        {/* STAT BAR */}
        <div className="ps-bar">
          <div className="ps-bar-cell">
            <span>TOTAL</span>
            <strong>{exams.length}</strong>
          </div>
          <div className="ps-bar-sep" />
          <div className="ps-bar-cell">
            <span>UPCOMING</span>
            <strong>{upcomingExams.length}</strong>
          </div>
          <div className="ps-bar-sep" />
          <div className="ps-bar-cell">
            <span>WEIGHT LEFT</span>
            <strong>{totalWeightUpcoming}%</strong>
          </div>
          <div className="ps-bar-sep" />
          <div className="ps-bar-cell">
            <span>PREP LEFT</span>
            <strong>{formatDuration(totalRemainingPrep)}</strong>
          </div>
        </div>

        {/* HERO: NEXT EXAM */}
        {nextExam &&
          (() => {
            const heroHasTarget = nextExam.targetStudyMinutes > 0;
            const heroRemaining = Math.max(
              0,
              nextExam.targetStudyMinutes - nextExam.studyMinutes,
            );
            const heroDays = Math.max(1, daysUntil(getExamDateTime(nextExam)));
            const heroDaily = heroHasTarget
              ? Math.ceil(heroRemaining / heroDays)
              : 0;
            const heroTargetReached =
              heroHasTarget &&
              nextExam.studyMinutes >= nextExam.targetStudyMinutes;

            return (
              <section className="ps-hero">
                <div className="ps-hero-top">
                  <div>
                    <span className="ps-hero-eyebrow">YOUR NEXT EXAM</span>
                    <h3>{nextExam.name}</h3>
                    <p>
                      {nextExam.subject} · {formatExamDate(nextExam)}
                      {nextExam.location && ` · ${nextExam.location}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ps-btn ps-btn-pri"
                    onClick={openNew}
                  >
                    + New exam
                  </button>
                </div>

                <div className="ps-hero-ring-wrap">
                  <div className="ps-hero-ring">
                    <svg viewBox="0 0 200 200" aria-hidden="true">
                      <defs>
                        <linearGradient
                          id="psRingGrad"
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
                        className="ps-hero-ring-track"
                        cx="100"
                        cy="100"
                        r="86"
                      />
                      <circle
                        className="ps-hero-ring-fill"
                        cx="100"
                        cy="100"
                        r="86"
                        strokeDasharray={2 * Math.PI * 86}
                        strokeDashoffset={
                          2 *
                          Math.PI *
                          86 *
                          (1 -
                            Math.min(
                              1,
                              getCountdown(getExamDateTime(nextExam), now)
                                .days / 90,
                            ))
                        }
                        transform="rotate(-90 100 100)"
                      />
                    </svg>
                    <div className="ps-hero-ring-center">
                      <strong>
                        {getCountdown(getExamDateTime(nextExam), now).days}
                      </strong>
                      <span>days to go</span>
                    </div>
                  </div>
                  <div className="ps-hero-details">
                    {countdownDisplay(nextExam)}
                    {heroHasTarget && (
                      <p className="ps-hero-suggest">
                        {heroTargetReached ? (
                          <>
                            🎯 <strong>Prep target reached</strong> ·{" "}
                            {formatDuration(nextExam.studyMinutes)} studied
                          </>
                        ) : (
                          <>
                            Prep:{" "}
                            <strong>
                              {formatDuration(heroRemaining)} remaining
                            </strong>{" "}
                            · suggested <strong>{heroDaily} min/day</strong> for
                            the next {heroDays} day{heroDays === 1 ? "" : "s"}
                          </>
                        )}
                      </p>
                    )}
                    {!heroHasTarget && (
                      <p className="ps-hero-suggest">
                        Tip: set a target prep time on this exam to see
                        remaining study and a daily suggestion.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            );
          })()}

        {/* TOOLBAR */}
        <div className="ps-toolbar">
          <div className="ps-tabs" role="tablist" aria-label="Filter">
            {(["upcoming", "past", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                className={`ps-tab ${filter === f ? "ps-tab-active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="ps-tabs" role="tablist" aria-label="View">
            {(["list", "calendar"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                className={`ps-tab ${view === v ? "ps-tab-active" : ""}`}
                onClick={() => setView(v)}
              >
                {v === "list" ? "📋 List" : "📅 Calendar"}
              </button>
            ))}
          </div>
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…  ( / )"
            className="ps-search"
            aria-label="Search exams"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="ps-select"
            aria-label="Sort exams"
          >
            <option value="next">Next up</option>
            <option value="weight">Highest weight</option>
            <option value="priority">Priority</option>
          </select>
          <button type="button" className="ps-btn ps-btn-pri" onClick={openNew}>
            + New exam
          </button>
        </div>

        {/* CALENDAR */}
        {view === "calendar" && (
          <section className="ps-calendar">
            <div className="ps-calendar-head">
              <button
                type="button"
                className="ps-mini-btn"
                onClick={() => shiftMonth(-1)}
              >
                ←
              </button>
              <strong>
                {new Date(`${calendarMonth}-01T00:00:00`).toLocaleDateString(
                  undefined,
                  {
                    month: "long",
                    year: "numeric",
                  },
                )}
              </strong>
              <button
                type="button"
                className="ps-mini-btn"
                onClick={() => shiftMonth(1)}
              >
                →
              </button>
            </div>
            <div className="ps-calendar-weekdays">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="ps-calendar-grid">
              {calendarDays.map((day, i) => (
                <button
                  key={i}
                  type="button"
                  className={`ps-calendar-day ${day.isCurrent ? "" : "is-empty"} ${
                    day.isToday ? "is-today" : ""
                  } ${day.count > 0 ? "has-exam" : ""} ${
                    calendarSelected === day.date ? "is-selected" : ""
                  }`}
                  onClick={() => {
                    if (!day.isCurrent) return;
                    setCalendarSelected((prev) =>
                      prev === day.date ? null : day.date,
                    );
                  }}
                  disabled={!day.isCurrent}
                >
                  <span>{day.day || ""}</span>
                  {day.count > 0 && (
                    <span className="ps-calendar-dot">{day.count}</span>
                  )}
                </button>
              ))}
            </div>
            {calendarSelected && (
              <p className="ps-calendar-note">
                Showing exams on {calendarSelected}.{" "}
                <button
                  type="button"
                  className="ps-link"
                  onClick={() => setCalendarSelected(null)}
                >
                  Clear
                </button>
              </p>
            )}
          </section>
        )}

        {/* EXAM LIST */}
        {visibleExams.length === 0 ? (
          <section className="ps-empty">
            <span className="ps-empty-icon">📚</span>
            <h4>
              {search
                ? "No matching exams"
                : filter === "past"
                  ? "No past exams"
                  : "No upcoming exams yet"}
            </h4>
            <p>
              {search
                ? "Try a different search term."
                : "Add an exam with its date and time to see the live countdown."}
            </p>
            {!search && filter !== "past" && (
              <button
                type="button"
                className="ps-btn ps-btn-pri"
                onClick={openNew}
              >
                Add your first exam
              </button>
            )}
          </section>
        ) : (
          <section className="ps-exam-list">
            {visibleExams.map((exam) => renderExamCard(exam))}
          </section>
        )}

        {/* FOOTER */}
        <div className="ps-footer">
          <button
            type="button"
            className="ps-advanced-button"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
          >
            {showHelp ? "Hide" : "Show"} how it works
            <span>{showHelp ? "−" : "+"}</span>
          </button>
          {showHelp && (
            <div className="ps-help">
              <div className="ps-help-step">
                <span>01</span>
                <div>
                  <strong>Add an exam</strong>
                  <p>
                    Click "New exam" and fill in the details. Only name,
                    subject, date and time are required.
                  </p>
                </div>
              </div>
              <div className="ps-help-step">
                <span>02</span>
                <div>
                  <strong>Set a target prep time</strong>
                  <p>
                    Enter how many minutes you want to study for this exam.
                    Logging study reduces the remaining amount and shows a
                    progress bar.
                  </p>
                </div>
              </div>
              <div className="ps-help-step">
                <span>03</span>
                <div>
                  <strong>Log study time</strong>
                  <p>
                    Use the +10m / +15m / +25m / +30m / +50m buttons on each
                    card. The target-reached state shows 🎯. A −5m button
                    corrects small mistakes; +custom accepts any amount
                    including negatives.
                  </p>
                </div>
              </div>
              <div className="ps-help-step">
                <span>04</span>
                <div>
                  <strong>Suggested daily minutes</strong>
                  <p>
                    When remaining prep is more than zero and the exam is within
                    14 days, the card shows how many minutes per day would reach
                    the target.
                  </p>
                </div>
              </div>
              <div className="ps-help-step">
                <span>05</span>
                <div>
                  <strong>Backup</strong>
                  <p>
                    Everything is in this browser. Export JSON regularly if you
                    want to keep your data forever.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="ps-backup-row">
            <button
              type="button"
              className="ps-btn ps-btn-sec"
              onClick={exportJSON}
              disabled={exams.length === 0}
            >
              ↓ Export JSON
            </button>
            <button
              type="button"
              className="ps-btn ps-btn-sec"
              onClick={exportCSV}
              disabled={exams.length === 0}
            >
              ↓ Export CSV
            </button>
            <button
              type="button"
              className="ps-btn ps-btn-sec"
              onClick={() => importRef.current?.click()}
            >
              ↑ Import
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImport}
              hidden
            />
          </div>
        </div>

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

        <p className="ps-note">
          Your exam list is stored in this browser only. Countdowns use your
          device's local date and time.
        </p>
      </div>

      {modal}
      {confirmModal}

      <style jsx global>{`
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

        .ps-wrapper {
          display: flex;
          flex-direction: column;
          gap: 18px;
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          color: var(--ps-text);
          font-family: inherit;
        }

        .ps-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }
        .ps-eyebrow {
          display: block;
          color: var(--ps-primary);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          margin-bottom: 3px;
        }
        .ps-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }
        .ps-header p {
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--ps-muted);
          max-width: 520px;
          line-height: 1.5;
        }
        .ps-header-stats {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .ps-mini-stat {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
          padding: 8px 12px;
          border: 1px solid var(--ps-border);
          border-radius: 10px;
          background: linear-gradient(145deg, #fff3ed, #fffaf7);
        }
        .ps-mini-stat > span {
          font-size: 8px;
          font-weight: 800;
          color: var(--ps-muted);
          letter-spacing: 1px;
        }
        .ps-mini-stat strong {
          font-size: 16px;
          font-weight: 800;
          color: var(--ps-primary);
          font-variant-numeric: tabular-nums;
          line-height: 1.1;
        }

        .ps-bar {
          display: flex;
          align-items: stretch;
          border: 1px solid var(--ps-border);
          border-radius: 11px;
          background: var(--ps-card);
          overflow: hidden;
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
        }
        .ps-bar-sep {
          width: 1px;
          background: var(--ps-border);
          flex-shrink: 0;
        }

        .ps-hero {
          padding: 16px;
          border: 1px solid var(--ps-primary-hover);
          border-radius: 14px;
          background: linear-gradient(145deg, #fff7f3, #fff);
          box-shadow: 0 10px 30px rgba(255, 90, 31, 0.12);
        }
        .ps-hero-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }
        .ps-hero-eyebrow {
          display: block;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.2px;
          color: var(--ps-primary);
          margin-bottom: 4px;
        }
        .ps-hero h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
        }
        .ps-hero p {
          margin: 3px 0 0;
          font-size: 11px;
          color: var(--ps-muted);
        }
        .ps-hero-ring-wrap {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 14px;
          flex-wrap: wrap;
        }
        .ps-hero-ring {
          position: relative;
          width: 160px;
          height: 160px;
          flex-shrink: 0;
        }
        .ps-hero-ring svg {
          width: 100%;
          height: 100%;
        }
        .ps-hero-ring-track {
          fill: none;
          stroke: #ffe2d5;
          stroke-width: 12;
        }
        .ps-hero-ring-fill {
          fill: none;
          stroke: url(#psRingGrad);
          stroke-width: 12;
          stroke-linecap: round;
          transition: stroke-dashoffset 400ms ease;
        }
        .ps-hero-ring-center {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .ps-hero-ring-center strong {
          font-size: 34px;
          font-weight: 900;
          line-height: 1;
          font-variant-numeric: tabular-nums;
          color: var(--ps-primary);
        }
        .ps-hero-ring-center span {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.6px;
          color: var(--ps-muted);
          text-transform: uppercase;
          margin-top: 4px;
        }
        .ps-hero-details {
          flex: 1;
          min-width: 240px;
        }
        .ps-hero-suggest {
          margin: 10px 0 0;
          font-size: 11px;
          color: var(--ps-muted);
          line-height: 1.5;
        }

        .ps-countdown {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }
        .ps-countdown.is-compact {
          gap: 5px;
        }
        .ps-countdown-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 6px;
          border-radius: 9px;
          background: #fff;
          border: 1px solid var(--ps-border);
        }
        .ps-countdown.is-compact .ps-countdown-cell {
          padding: 6px 4px;
          border-radius: 7px;
        }
        .ps-countdown-cell strong {
          font-size: 18px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          color: var(--ps-primary);
          line-height: 1;
        }
        .ps-countdown.is-compact .ps-countdown-cell strong {
          font-size: 14px;
        }
        .ps-countdown-cell span {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.6px;
          color: var(--ps-muted);
          text-transform: uppercase;
          margin-top: 3px;
        }
        .ps-countdown-passed {
          padding: 14px;
          text-align: center;
          border-radius: 9px;
          background: var(--ps-surface);
          border: 1px solid var(--ps-border);
          font-size: 11px;
          font-weight: 700;
          color: var(--ps-muted);
        }

        .ps-toolbar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .ps-tabs {
          display: flex;
          gap: 3px;
          padding: 3px;
          border-radius: 9px;
          background: var(--ps-surface);
          border: 1px solid var(--ps-border);
        }
        .ps-tab {
          padding: 6px 11px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: var(--ps-muted);
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }
        .ps-tab-active {
          background: #fff;
          color: var(--ps-primary);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .ps-search {
          flex: 1;
          min-width: 140px;
          padding: 8px 12px;
          border: 1px solid var(--ps-border);
          border-radius: 9px;
          background: #fff;
          color: var(--ps-text);
          font-size: 11px;
          outline: none;
        }
        .ps-search:focus,
        .ps-select:focus {
          border-color: var(--ps-primary);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
        }
        .ps-select {
          padding: 8px 10px;
          border: 1px solid var(--ps-border);
          border-radius: 9px;
          background: #fff;
          color: var(--ps-text);
          font-size: 11px;
          font-weight: 700;
          outline: none;
          cursor: pointer;
        }

        .ps-calendar {
          padding: 14px;
          border: 1px solid var(--ps-border);
          border-radius: 12px;
          background: var(--ps-card);
        }
        .ps-calendar-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .ps-calendar-head strong {
          font-size: 13px;
          font-weight: 800;
        }
        .ps-calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 6px;
        }
        .ps-calendar-weekdays span {
          font-size: 9px;
          font-weight: 800;
          text-align: center;
          color: var(--ps-muted);
          letter-spacing: 0.5px;
        }
        .ps-calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        .ps-calendar-day {
          position: relative;
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 8px;
          border: 1px solid var(--ps-border);
          background: #fff;
          color: var(--ps-text);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .ps-calendar-day.is-empty {
          background: transparent;
          border-color: transparent;
          cursor: default;
        }
        .ps-calendar-day.has-exam {
          border-color: var(--ps-primary);
          background: var(--ps-primary-soft);
          color: var(--ps-primary);
        }
        .ps-calendar-day.is-today {
          box-shadow: inset 0 0 0 2px var(--ps-primary);
        }
        .ps-calendar-day.is-selected {
          background: var(--ps-primary);
          color: #fff;
        }
        .ps-calendar-dot {
          position: absolute;
          bottom: 3px;
          font-size: 8px;
          font-weight: 900;
          background: var(--ps-primary);
          color: #fff;
          border-radius: 999px;
          padding: 0 4px;
        }
        .ps-calendar-day.is-selected .ps-calendar-dot {
          background: #fff;
          color: var(--ps-primary);
        }
        .ps-calendar-note {
          margin: 10px 0 0;
          font-size: 10px;
          color: var(--ps-muted);
        }
        .ps-link {
          border: 0;
          background: transparent;
          color: var(--ps-primary);
          font-weight: 800;
          cursor: pointer;
          text-decoration: underline;
        }

        .ps-exam-list {
          display: grid;
          gap: 12px;
        }
        .ps-exam {
          position: relative;
          padding: 14px;
          border: 1px solid var(--ps-border);
          border-radius: 12px;
          background: var(--ps-card);
          box-shadow: 0 2px 8px rgba(23, 32, 51, 0.04);
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }
        .ps-exam::before {
          content: "";
          position: absolute;
          top: 12px;
          bottom: 12px;
          left: 6px;
          width: 3px;
          border-radius: 3px;
          background: #94a3b8;
        }
        .ps-exam-high::before {
          background: #ef4444;
        }
        .ps-exam-medium::before {
          background: #f59e0b;
        }
        .ps-exam-low::before {
          background: #94a3b8;
        }
        .ps-exam:hover {
          border-color: var(--ps-primary-hover);
          box-shadow: 0 6px 20px rgba(255, 90, 31, 0.08);
        }
        .ps-exam-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .ps-exam-badges {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .ps-exam-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }

        .ps-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .ps-badge-type {
          background: #eef2ff;
          color: #4338ca;
        }
        .ps-badge-weight {
          background: var(--ps-primary-soft);
          color: var(--ps-primary);
        }
        .ps-badge-priority-high {
          background: #fee2e2;
          color: #b91c1c;
        }
        .ps-badge-priority-medium {
          background: #fef3c7;
          color: #b45309;
        }
        .ps-badge-priority-low {
          background: #e2e8f0;
          color: #475569;
        }
        .ps-badge-ready {
          background: #dcfce7;
          color: #166534;
        }
        .ps-badge-behind {
          background: #fee2e2;
          color: #b91c1c;
        }

        .ps-tag {
          background: #f1f5f9;
          color: #475569;
        }
        .ps-tag-today {
          background: #fee2e2;
          color: #b91c1c;
        }
        .ps-tag-tomorrow {
          background: #fef3c7;
          color: #b45309;
        }
        .ps-tag-soon {
          background: var(--ps-primary-soft);
          color: var(--ps-primary);
        }
        .ps-tag-future {
          background: #ecfdf5;
          color: #166534;
        }
        .ps-tag-past {
          background: #e2e8f0;
          color: #475569;
        }

        .ps-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 7px;
          border: 1px solid var(--ps-border);
          background: #fff;
          color: var(--ps-muted);
          cursor: pointer;
          font-size: 12px;
          transition: all 150ms ease;
        }
        .ps-icon-btn:hover {
          border-color: var(--ps-primary-hover);
          color: var(--ps-primary);
          background: var(--ps-primary-soft);
        }
        .ps-icon-danger {
          color: #b91c1c;
          border-color: #fecaca;
        }
        .ps-icon-danger:hover {
          background: #fef2f2;
          border-color: #fca5a5;
        }

        .ps-exam-title {
          margin: 0 0 2px;
          font-size: 15px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }
        .ps-exam-subject {
          margin: 0 0 8px;
          font-size: 11px;
          font-weight: 700;
          color: var(--ps-primary);
        }
        .ps-exam-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 14px;
          margin-bottom: 10px;
          font-size: 10px;
          color: var(--ps-muted);
          font-weight: 600;
        }
        .ps-exam-countdown {
          margin-bottom: 12px;
        }

        .ps-checklist {
          margin-bottom: 10px;
          padding: 10px;
          border-radius: 9px;
          background: var(--ps-surface);
        }
        .ps-checklist-head {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          font-weight: 800;
          color: var(--ps-muted);
          letter-spacing: 0.4px;
          margin-bottom: 5px;
        }
        .ps-progress-bar {
          height: 5px;
          border-radius: 999px;
          background: #dfe5ee;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .ps-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff8a4c, #ff5a1f);
          transition: width 220ms ease;
        }
        .ps-checklist-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 4px;
        }
        .ps-checklist-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;
          font-size: 11px;
        }
        .ps-checklist-check {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          cursor: pointer;
          min-width: 0;
        }
        .ps-checklist-check input {
          accent-color: var(--ps-primary);
        }
        .ps-checklist-check .is-struck {
          color: var(--ps-muted);
          text-decoration: line-through;
        }
        .ps-checklist-remove {
          width: 18px;
          height: 18px;
          border: 0;
          border-radius: 4px;
          background: transparent;
          color: var(--ps-muted);
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
        }
        .ps-checklist-remove:hover {
          background: #fee2e2;
          color: #b91c1c;
        }

        /* study log */
        .ps-study {
          margin-bottom: 10px;
          padding: 10px;
          border-radius: 9px;
          background: var(--ps-surface);
        }
        .ps-study-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          color: var(--ps-muted);
          font-weight: 700;
          flex-wrap: wrap;
        }
        .ps-study-head strong {
          color: var(--ps-text);
        }
        .ps-study-btns {
          display: flex;
          gap: 3px;
          flex-wrap: wrap;
        }
        .ps-mini-btn {
          padding: 5px 9px;
          border-radius: 7px;
          border: 1px solid var(--ps-border);
          background: #fff;
          color: var(--ps-text);
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: all 150ms ease;
        }
        .ps-mini-btn:hover {
          border-color: var(--ps-primary-hover);
          color: var(--ps-primary);
          background: var(--ps-primary-soft);
        }
        .ps-mini-danger {
          color: #b91c1c;
          border-color: #fecaca;
        }
        .ps-mini-danger:hover {
          background: #fef2f2;
          border-color: #fca5a5;
          color: #991b1b;
        }

        .ps-study-progress {
          margin-top: 8px;
        }
        .ps-study-progress-bar {
          height: 6px;
          border-radius: 999px;
          background: #dfe5ee;
          overflow: hidden;
        }
        .ps-study-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff8a4c, #ff5a1f);
          transition: width 220ms ease;
        }
        .ps-study-progress-fill.is-done {
          background: linear-gradient(90deg, #34d399, #10b981);
        }
        .ps-study-progress-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 4px;
          font-size: 10px;
          color: var(--ps-muted);
          font-weight: 700;
        }
        .ps-study-progress-meta strong {
          color: var(--ps-text);
        }
        .ps-study-done {
          color: #166534;
          font-weight: 800;
        }
        .ps-study-hint {
          margin: 6px 0 0;
          font-size: 10px;
          color: var(--ps-muted);
          line-height: 1.5;
        }
        .ps-study-hint strong {
          color: var(--ps-primary);
        }
        .ps-study-hint-muted {
          font-style: italic;
          opacity: 0.85;
        }

        .ps-exam-notes {
          padding: 8px 10px;
          border-radius: 8px;
          background: #fffbeb;
          border: 1px solid #fde68a;
        }
        .ps-exam-notes span {
          display: block;
          font-size: 8px;
          font-weight: 800;
          color: #b45309;
          letter-spacing: 0.6px;
          margin-bottom: 3px;
        }
        .ps-exam-notes p {
          margin: 0;
          font-size: 10px;
          line-height: 1.5;
          color: #78350f;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .ps-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 34px;
          padding: 0 14px;
          border-radius: 9px;
          border: 1px solid transparent;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          cursor: pointer;
          transition: all 150ms ease;
        }
        .ps-btn:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }
        .ps-btn-pri {
          border-color: #e74e1b;
          background: linear-gradient(135deg, #ff682f, #e94b18);
          color: #fff;
          box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
        }
        .ps-btn-pri:hover:not(:disabled) {
          background: linear-gradient(135deg, #f45a25, #d94112);
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(255, 90, 31, 0.28);
        }
        .ps-btn-sec {
          border-color: var(--ps-border);
          background: #fff;
          color: var(--ps-text);
        }
        .ps-btn-sec:hover:not(:disabled) {
          border-color: var(--ps-primary-hover);
          color: var(--ps-primary);
          background: var(--ps-primary-soft);
        }
        .ps-btn-ghost {
          border-color: transparent;
          background: transparent;
          color: var(--ps-muted);
        }
        .ps-btn-ghost:hover {
          color: var(--ps-primary);
          background: var(--ps-primary-soft);
        }
        .ps-btn-danger {
          border-color: #b91c1c;
          background: linear-gradient(135deg, #ef4444, #b91c1c);
          color: #fff;
        }

        .ps-empty {
          padding: 32px 20px;
          text-align: center;
          border: 1px dashed var(--ps-border);
          border-radius: 12px;
          background: var(--ps-surface);
        }
        .ps-empty-icon {
          display: block;
          font-size: 32px;
          margin-bottom: 8px;
        }
        .ps-empty h4 {
          margin: 0 0 4px;
          font-size: 13px;
          font-weight: 800;
        }
        .ps-empty p {
          margin: 0 0 12px;
          font-size: 11px;
          color: var(--ps-muted);
        }

        .ps-footer {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
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
          margin-top: 8px;
        }
        .ps-help-step {
          display: flex;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px solid var(--ps-border);
        }
        .ps-help-step:last-child {
          border-bottom: 0;
        }
        .ps-help-step > span {
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
        .ps-help-step strong {
          display: block;
          font-size: 11px;
          margin-bottom: 2px;
        }
        .ps-help-step p {
          margin: 0;
          font-size: 10px;
          color: var(--ps-muted);
          line-height: 1.5;
        }

        .ps-backup-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

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
          flex-shrink: 0;
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
          border-radius: 6px;
          border: 1px solid currentColor;
          background: transparent;
          color: inherit;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .ps-note {
          margin: 8px 0 0;
          text-align: center;
          font-size: 10px;
          color: var(--ps-muted);
          line-height: 1.6;
        }

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
          animation: psFadeIn 160ms ease-out;
          font-family: inherit;
          --ps-text: #172033;
          --ps-muted: #64748b;
          --ps-border: #e5e7eb;
          --ps-card: #ffffff;
          --ps-surface: #f8fafc;
          --ps-primary: #ff5a1f;
          --ps-primary-soft: #fff3ed;
          --ps-primary-hover: #ffb69d;
          --ps-primary-dark: #e64a14;
        }
        @media (min-width: 640px) {
          .ps-modal-backdrop {
            align-items: center;
          }
        }
        .ps-modal {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 620px;
          max-height: calc(100dvh - 32px);
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid var(--ps-border);
          background: var(--ps-card);
          color: var(--ps-text);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
          animation: psSlideUp 220ms cubic-bezier(0.2, 0.9, 0.3, 1);
        }
        .ps-modal-sm {
          max-width: 420px;
        }
        .ps-modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 16px 18px 12px;
          border-bottom: 1px solid var(--ps-border);
        }
        .ps-modal-head h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          color: var(--ps-text);
        }
        .ps-modal-body {
          overflow-y: auto;
          padding: 16px 18px;
        }
        .ps-modal-text {
          padding: 12px 18px 0;
          margin: 0;
          font-size: 12px;
          color: var(--ps-muted);
          line-height: 1.55;
        }
        .ps-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 18px 16px;
          border-top: 1px solid var(--ps-border);
          background: var(--ps-surface);
        }

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
        .ps-field > span {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--ps-muted);
        }
        .ps-field input,
        .ps-field select,
        .ps-field textarea {
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--ps-border);
          background: #fff;
          color: var(--ps-text);
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          outline: none;
          resize: vertical;
        }
        .ps-field input::placeholder,
        .ps-field textarea::placeholder {
          color: var(--ps-muted);
          opacity: 0.7;
        }
        .ps-field input:focus,
        .ps-field select:focus,
        .ps-field textarea:focus {
          border-color: var(--ps-primary);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.15);
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
          .ps-hero-ring-fill,
          .ps-countdown-cell,
          .ps-modal-backdrop,
          .ps-modal,
          .ps-progress-fill,
          .ps-study-progress-fill {
            transition: none;
            animation: none;
          }
        }

        @media (max-width: 640px) {
          .ps-form-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .ps-hero-ring-wrap {
            flex-direction: column;
          }
          .ps-calendar-day {
            font-size: 10px;
          }
          .ps-bar-cell {
            padding: 8px;
          }
          .ps-bar-cell strong {
            font-size: 13px;
          }
        }
      `}</style>
    </ToolShell>
  );
}

/* ------------------------------------------------------ small components */

function ChecklistAdder({
  onAdd,
  placeholder = "Add checklist item…",
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
          background: "#fff",
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
