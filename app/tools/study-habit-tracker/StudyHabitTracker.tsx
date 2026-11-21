"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ToolShell from "../ToolShell";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Frequency = "daily" | "weekly" | "weekdays" | "weekends" | "custom";
type Category = "study" | "reading" | "practice" | "revision" | "health" | "other";
type View = "today" | "week" | "month" | "insights";
type Filter = "all" | "done" | "pending";
type SortKey = "created" | "name" | "streak" | "completion";

type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: Category;
  targetMinutes: number;
  frequency: Frequency;
  customDays: number[];
  anchorDay: number;
  note: string;
  createdAt: number;
  archived: boolean;
};

type HabitLog = Record<string, string[]>;

type HabitForm = {
  name: string;
  icon: string;
  color: string;
  category: Category;
  targetMinutes: number;
  frequency: Frequency;
  customDays: number[];
  anchorDay: number;
  note: string;
};

type Snapshot = {
  habits: Habit[];
  logs: HabitLog;
  forgiven: HabitLog;
  label: string;
};

const STORAGE_KEY = "toolsab-study-habit-tracker-v2";

const ICONS = [
  "📚", "📖", "✏️", "🎯", "🧠", "🌱", "💡", "🔬",
  "🎨", "🎵", "💪", "🧘", "📝", "🗂️", "⚡", "🏆",
];

const COLORS = [
  "#ff5a1f", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#ef4444",
];

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: "study", label: "Study", icon: "📚" },
  { id: "reading", label: "Reading", icon: "📖" },
  { id: "practice", label: "Practice", icon: "🎯" },
  { id: "revision", label: "Revision", icon: "🔁" },
  { id: "health", label: "Health", icon: "💪" },
  { id: "other", label: "Other", icon: "📌" },
];

const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: "daily", label: "Every day" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekends", label: "Weekends" },
  { id: "weekly", label: "Once a week" },
  { id: "custom", label: "Specific days" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function createEmptyForm(): HabitForm {
  return {
    name: "",
    icon: "📚",
    color: COLORS[0],
    category: "study",
    targetMinutes: 30,
    frequency: "daily",
    customDays: [1, 2, 3, 4, 5],
    anchorDay: new Date().getDay(),
    note: "",
  };
}

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function shiftDate(value: string, amount: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

function weekdayOf(value: string) {
  return parseDate(value).getDay();
}

function formatDate(value: string) {
  return parseDate(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ------------------------------------------------------------------ */
/* Habit helpers                                                       */
/* ------------------------------------------------------------------ */

function habitActiveOn(habit: Habit, date: string) {
  if (date < dateKey(new Date(habit.createdAt))) return false;

  const day = weekdayOf(date);

  switch (habit.frequency) {
    case "daily":
      return true;
    case "weekdays":
      return day >= 1 && day <= 5;
    case "weekends":
      return day === 0 || day === 6;
    case "weekly":
      return day === habit.anchorDay;
    case "custom":
      return habit.customDays.includes(day);
    default:
      return true;
  }
}

function isDoneOn(
  id: string,
  logs: HabitLog,
  forgiven: HabitLog,
  date: string
) {
  return (
    (logs[date] || []).includes(id) ||
    (forgiven[date] || []).includes(id)
  );
}

function currentStreak(
  habit: Habit,
  logs: HabitLog,
  forgiven: HabitLog,
  upTo: string
) {
  let cursor = upTo;
  let count = 0;
  let checked = 0;

  if (
    cursor === dateKey() &&
    !isDoneOn(habit.id, logs, forgiven, cursor)
  ) {
    cursor = shiftDate(cursor, -1);
  }

  while (checked < 730) {
    checked++;

    if (!habitActiveOn(habit, cursor)) {
      cursor = shiftDate(cursor, -1);
      continue;
    }

    if (!isDoneOn(habit.id, logs, forgiven, cursor)) break;

    count++;
    cursor = shiftDate(cursor, -1);
  }

  return count;
}

function bestStreak(
  habit: Habit,
  logs: HabitLog,
  forgiven: HabitLog
) {
  const completedDates = new Set<string>();

  Object.entries(logs).forEach(([date, ids]) => {
    if (ids.includes(habit.id)) completedDates.add(date);
  });

  Object.entries(forgiven).forEach(([date, ids]) => {
    if (ids.includes(habit.id)) completedDates.add(date);
  });

  if (!completedDates.size) return 0;

  const startKey = dateKey(new Date(habit.createdAt));
  const dates = Array.from(completedDates).sort();
  const last = dates[dates.length - 1];

  if (last < startKey) return 0;

  let cursor = startKey;
  let best = 0;
  let run = 0;
  let iterations = 0;

  while (cursor <= last && iterations < 10000) {
    iterations++;

    if (habitActiveOn(habit, cursor)) {
      if (completedDates.has(cursor)) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }

    cursor = shiftDate(cursor, 1);
  }

  return best;
}

function completionForDate(
  habits: Habit[],
  logs: HabitLog,
  forgiven: HabitLog,
  date: string
) {
  // Future dates have nothing to complete yet.
  if (date > dateKey()) {
    return { done: 0, forgiven: 0, total: 0, rate: 0 };
  }

  const scheduled = habits.filter((habit) => habitActiveOn(habit, date));
  const logIds = new Set(logs[date] || []);
  const forgivenIds = new Set(forgiven[date] || []);

  let done = 0;
  let forgivenCount = 0;

  for (const habit of scheduled) {
    if (logIds.has(habit.id)) {
      done++;
    } else if (forgivenIds.has(habit.id)) {
      forgivenCount++;
    }
  }

  return {
    done,
    forgiven: forgivenCount,
    total: scheduled.length,
    rate: scheduled.length
      ? Math.round((done / scheduled.length) * 100)
      : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Data validation                                                     */
/* ------------------------------------------------------------------ */

function sanitizeHabit(value: unknown): Habit | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;

  if (
    typeof raw.id !== "string" ||
    typeof raw.name !== "string" ||
    !raw.name.trim()
  ) {
    return null;
  }

  const frequencies: Frequency[] = [
    "daily", "weekly", "weekdays", "weekends", "custom",
  ];

  const categories: Category[] = [
    "study", "reading", "practice", "revision", "health", "other",
  ];

  const createdAt =
    typeof raw.createdAt === "number" &&
    Number.isFinite(raw.createdAt)
      ? raw.createdAt
      : Date.now();

  return {
    id: raw.id,
    name: raw.name.trim().slice(0, 60),
    icon: typeof raw.icon === "string" ? raw.icon : "📚",
    color: typeof raw.color === "string" ? raw.color : COLORS[0],
    category: categories.includes(raw.category as Category)
      ? (raw.category as Category)
      : "study",
    targetMinutes:
      typeof raw.targetMinutes === "number" &&
      Number.isFinite(raw.targetMinutes)
        ? Math.min(1440, Math.max(1, Math.round(raw.targetMinutes)))
        : 30,
    frequency: frequencies.includes(raw.frequency as Frequency)
      ? (raw.frequency as Frequency)
      : "daily",
    customDays: Array.isArray(raw.customDays)
      ? Array.from(
          new Set(
            raw.customDays.filter(
              (day): day is number =>
                typeof day === "number" &&
                Number.isInteger(day) &&
                day >= 0 &&
                day <= 6
            )
          )
        )
      : [],
    anchorDay:
      typeof raw.anchorDay === "number" &&
      raw.anchorDay >= 0 &&
      raw.anchorDay <= 6
        ? raw.anchorDay
        : new Date(createdAt).getDay(),
    note: typeof raw.note === "string" ? raw.note.slice(0, 200) : "",
    createdAt,
    archived: raw.archived === true,
  };
}

function sanitizeLog(value: unknown): HabitLog {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: HabitLog = {};

  for (const [date, ids] of Object.entries(value)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(ids)) {
      result[date] = Array.from(
        new Set(ids.filter((id): id is string => typeof id === "string"))
      );
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* Forgiveness component                                               */
/* ------------------------------------------------------------------ */

function ForgiveList({
  habits,
  logs,
  forgiven,
  onForgive,
}: {
  habits: Habit[];
  logs: HabitLog;
  forgiven: HabitLog;
  onForgive: (habitId: string, date: string) => void;
}) {
  const [selectedHabit, setSelectedHabit] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    shiftDate(dateKey(), -1)
  );

  const eligibleHabits = habits.filter(
    (habit) =>
      habitActiveOn(habit, selectedDate) &&
      !isDoneOn(habit.id, logs, forgiven, selectedDate)
  );

  return (
    <div className="hx-forgive-form">
      <label className="hx-field">
        <span>Habit</span>
        <select
          value={selectedHabit}
          onChange={(event) => setSelectedHabit(event.target.value)}
        >
          <option value="">Choose a habit</option>
          {eligibleHabits.map((habit) => (
            <option key={habit.id} value={habit.id}>
              {habit.icon} {habit.name}
            </option>
          ))}
        </select>
      </label>

      <label className="hx-field">
        <span>Missed date</span>
        <input
          type="date"
          value={selectedDate}
          max={shiftDate(dateKey(), -1)}
          onChange={(event) => setSelectedDate(event.target.value)}
        />
      </label>

      <button
        type="button"
        className="hx-btn hx-btn-pri"
        disabled={!selectedHabit}
        onClick={() => {
          onForgive(selectedHabit, selectedDate);
          setSelectedHabit("");
        }}
      >
        Forgive missed day
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function StudyHabitTracker() {
  const [ready, setReady] = useState(false);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog>({});
  const [forgiven, setForgiven] = useState<HabitLog>({});

  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [view, setView] = useState<View>("today");

  const [filter, setFilter] = useState<Filter>("all");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HabitForm>(createEmptyForm());

  const [notice, setNotice] = useState("");
  const [undoBuffer, setUndoBuffer] = useState<Snapshot | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = dateKey();
  const isFutureDate = selectedDate > today;

  /* ------------------------------ Modal lifecycle */

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(createEmptyForm());
  }, []);

  // Prevent background scrolling while the popup is open.
  useEffect(() => {
    if (!showForm) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showForm]);

  // Escape closes the popup.
  useEffect(() => {
    if (!showForm) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeForm();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showForm, closeForm]);

  /* ------------------------------ Toast */

  const flash = useCallback((message: string) => {
    setNotice(message);

    if (noticeTimer.current) clearTimeout(noticeTimer.current);

    noticeTimer.current = setTimeout(() => {
      setNotice("");
      noticeTimer.current = null;
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  /* ------------------------------ Load */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        setHabits(
          Array.isArray(parsed.habits)
            ? parsed.habits
                .map(sanitizeHabit)
                .filter((item: Habit | null): item is Habit => item !== null)
            : []
        );

        setLogs(sanitizeLog(parsed.logs));
        setForgiven(sanitizeLog(parsed.forgiven));
      }
    } catch {
      // Start with an empty tracker if stored data is invalid.
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 2,
          habits,
          logs,
          forgiven,
        })
      );
    } catch {
      flash("Could not save data. Check your browser storage.");
    }
  }, [ready, habits, logs, forgiven, flash]);

  /* ------------------------------ Undo */

  const saveUndo = useCallback(
    (label: string) => {
      setUndoBuffer({
        habits: habits.map((habit) => ({ ...habit })),
        logs: { ...logs },
        forgiven: { ...forgiven },
        label,
      });
    },
    [habits, logs, forgiven]
  );

  const undo = useCallback(() => {
    if (!undoBuffer) return;

    setHabits(undoBuffer.habits);
    setLogs(undoBuffer.logs);
    setForgiven(undoBuffer.forgiven);

    flash(`Undone: ${undoBuffer.label}`);
    setUndoBuffer(null);
  }, [undoBuffer, flash]);

  /* ------------------------------ Derived values */

  const activeHabits = useMemo(
    () => habits.filter((habit) => !habit.archived),
    [habits]
  );

  const archivedHabits = useMemo(
    () => habits.filter((habit) => habit.archived),
    [habits]
  );

  const habitsForDay = useMemo(
    () =>
      activeHabits.filter((habit) =>
        habitActiveOn(habit, selectedDate)
      ),
    [activeHabits, selectedDate]
  );

  const completedIds = useMemo(
    () =>
      new Set(
        habitsForDay
          .filter((habit) =>
            isDoneOn(habit.id, logs, forgiven, selectedDate)
          )
          .map((habit) => habit.id)
      ),
    [habitsForDay, logs, forgiven, selectedDate]
  );

  const visibleHabits = useMemo(() => {
    let result = habitsForDay.filter((habit) => {
      const done = completedIds.has(habit.id);

      if (filter === "done" && !done) return false;
      if (filter === "pending" && done) return false;

      if (
        categoryFilter !== "all" &&
        habit.category !== categoryFilter
      ) {
        return false;
      }

      const query = search.trim().toLowerCase();

      if (
        query &&
        !`${habit.name} ${habit.note}`.toLowerCase().includes(query)
      ) {
        return false;
      }

      return true;
    });

    if (sortKey === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortKey === "streak") {
      result.sort(
        (a, b) =>
          currentStreak(b, logs, forgiven, selectedDate) -
          currentStreak(a, logs, forgiven, selectedDate)
      );
    } else if (sortKey === "completion") {
      result.sort(
        (a, b) =>
          bestStreak(b, logs, forgiven) -
          bestStreak(a, logs, forgiven)
      );
    } else {
      result.sort((a, b) => b.createdAt - a.createdAt);
    }

    return result;
  }, [
    habitsForDay,
    completedIds,
    filter,
    categoryFilter,
    search,
    sortKey,
    logs,
    forgiven,
    selectedDate,
  ]);

  const stats = completionForDate(
    activeHabits,
    logs,
    forgiven,
    selectedDate
  );

  const totalTargetMinutes = habitsForDay.reduce(
    (sum, habit) => sum + habit.targetMinutes,
    0
  );

  // Only real check-ins count toward completed target minutes.
  const completedTargetMinutes = habitsForDay
    .filter((habit) => (logs[selectedDate] || []).includes(habit.id))
    .reduce((sum, habit) => sum + habit.targetMinutes, 0);

  const bestOverallStreak = activeHabits.reduce(
    (best, habit) =>
      Math.max(best, bestStreak(habit, logs, forgiven)),
    0
  );

  /* ------------------------------ Week */

  const weekDates = useMemo(() => {
    const weekday = weekdayOf(selectedDate);
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const monday = shiftDate(selectedDate, mondayOffset);

    return Array.from({ length: 7 }, (_, index) =>
      shiftDate(monday, index)
    );
  }, [selectedDate]);

  const weekStats = weekDates.map((date) => ({
    date,
    ...completionForDate(activeHabits, logs, forgiven, date),
  }));

  const weeklyTotal = weekStats.reduce((sum, day) => sum + day.total, 0);
  const weeklyDone = weekStats.reduce((sum, day) => sum + day.done, 0);
  const weeklyRate = weeklyTotal
    ? Math.round((weeklyDone / weeklyTotal) * 100)
    : 0;

  /* ------------------------------ Month */

  const monthInfo = useMemo(() => {
    const date = parseDate(selectedDate);
    const year = date.getFullYear();
    const month = date.getMonth();

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);

    const cells: { date: string; day: number; today: boolean }[] = [];

    for (let i = 0; i < first.getDay(); i++) {
      cells.push({ date: "", day: 0, today: false });
    }

    for (let day = 1; day <= last.getDate(); day++) {
      const key = `${year}-${pad(month + 1)}-${pad(day)}`;

      cells.push({
        date: key,
        day,
        today: key === today,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ date: "", day: 0, today: false });
    }

    return {
      title: date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
      cells,
    };
  }, [selectedDate, today]);

  /* ------------------------------ Insights */

  const insights = useMemo(() => {
    const dates = Array.from({ length: 30 }, (_, index) =>
      shiftDate(today, index - 29)
    );

    let totalDone = 0;
    let totalPossible = 0;
    let perfectDays = 0;

    const weekdayTotals: Record<number, { done: number; total: number }> = {};

    dates.forEach((date) => {
      const result = completionForDate(activeHabits, logs, forgiven, date);

      totalDone += result.done;
      totalPossible += result.total;

      if (result.total > 0 && result.done === result.total) {
        perfectDays++;
      }

      const weekday = weekdayOf(date);

      if (!weekdayTotals[weekday]) {
        weekdayTotals[weekday] = { done: 0, total: 0 };
      }

      weekdayTotals[weekday].done += result.done;
      weekdayTotals[weekday].total += result.total;
    });

    let bestWeekday = -1;
    let bestRate = -1;

    Object.entries(weekdayTotals).forEach(([key, value]) => {
      const rate = value.total ? value.done / value.total : 0;

      if (rate > bestRate) {
        bestRate = rate;
        bestWeekday = Number(key);
      }
    });

    const ranking = activeHabits
      .map((habit) => {
        const appearances = dates.filter((date) =>
          habitActiveOn(habit, date)
        ).length;

        const completions = dates.filter(
          (date) =>
            habitActiveOn(habit, date) &&
            (logs[date] || []).includes(habit.id)
        ).length;

        return {
          habit,
          appearances,
          completions,
          rate: appearances
            ? Math.round((completions / appearances) * 100)
            : 0,
          current: currentStreak(habit, logs, forgiven, today),
          best: bestStreak(habit, logs, forgiven),
        };
      })
      .sort((a, b) => b.rate - a.rate);

    const totalCheckins = Object.values(logs).reduce(
      (sum, ids) => sum + ids.length,
      0
    );

    return {
      rate30: totalPossible
        ? Math.round((totalDone / totalPossible) * 100)
        : 0,
      perfectDays,
      bestWeekday: bestWeekday === -1 ? "—" : WEEKDAYS[bestWeekday],
      ranking,
      totalCheckins,
    };
  }, [today, activeHabits, logs, forgiven]);

  /* ------------------------------ Form actions */

  const openNew = () => {
    setEditingId(null);
    setForm(createEmptyForm());
    setShowForm(true);
  };

  const openEdit = (habit: Habit) => {
    setEditingId(habit.id);

    setForm({
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      category: habit.category,
      targetMinutes: habit.targetMinutes,
      frequency: habit.frequency,
      customDays: [...habit.customDays],
      anchorDay: habit.anchorDay,
      note: habit.note,
    });

    setShowForm(true);
  };

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      flash("Please enter a habit name.");
      return;
    }

    if (
      !Number.isFinite(form.targetMinutes) ||
      form.targetMinutes < 1 ||
      form.targetMinutes > 1440
    ) {
      flash("Target time must be between 1 and 1,440 minutes.");
      return;
    }

    if (
      form.frequency === "custom" &&
      form.customDays.length === 0
    ) {
      flash("Please select at least one day.");
      return;
    }

    if (editingId) {
      saveUndo("Edit habit");

      setHabits((previous) =>
        previous.map((habit) =>
          habit.id === editingId
            ? {
                ...habit,
                ...form,
                name,
                targetMinutes: Math.round(form.targetMinutes),
                note: form.note.trim(),
              }
            : habit
        )
      );

      flash("Habit updated.");
    } else {
      const habit: Habit = {
        id: createId(),
        ...form,
        name,
        targetMinutes: Math.round(form.targetMinutes),
        note: form.note.trim(),
        createdAt: Date.now(),
        archived: false,
      };

      setHabits((previous) => [...previous, habit]);
      flash("New habit added.");
    }

    closeForm();
  };

  /* ------------------------------ Check-in */

  const toggleHabit = (habitId: string) => {
    if (isFutureDate) {
      flash("You cannot check in for a future date.");
      return;
    }

    saveUndo("Change habit check-in");

    const alreadyDone = isDoneOn(
      habitId,
      logs,
      forgiven,
      selectedDate
    );

    if (alreadyDone) {
      setLogs((previous) => ({
        ...previous,
        [selectedDate]: (previous[selectedDate] || []).filter(
          (id) => id !== habitId
        ),
      }));

      setForgiven((previous) => ({
        ...previous,
        [selectedDate]: (previous[selectedDate] || []).filter(
          (id) => id !== habitId
        ),
      }));

      flash("Check-in removed.");
    } else {
      setLogs((previous) => ({
        ...previous,
        [selectedDate]: Array.from(
          new Set([...(previous[selectedDate] || []), habitId])
        ),
      }));

      setForgiven((previous) => ({
        ...previous,
        [selectedDate]: (previous[selectedDate] || []).filter(
          (id) => id !== habitId
        ),
      }));

      flash("Habit completed!");
    }
  };

  const completeAll = () => {
    if (isFutureDate) return;

    const pending = habitsForDay.filter(
      (habit) => !isDoneOn(habit.id, logs, forgiven, selectedDate)
    );

    if (!pending.length) {
      flash("All scheduled habits are already complete.");
      return;
    }

    saveUndo("Complete all habits");

    setLogs((previous) => ({
      ...previous,
      [selectedDate]: Array.from(
        new Set([
          ...(previous[selectedDate] || []),
          ...pending.map((habit) => habit.id),
        ])
      ),
    }));

    setForgiven((previous) => ({
      ...previous,
      [selectedDate]: (previous[selectedDate] || []).filter(
        (id) => !pending.some((habit) => habit.id === id)
      ),
    }));

    flash("All scheduled habits completed!");
  };

  /* ------------------------------ Forgive */

  const forgiveDay = (habitId: string, date: string) => {
    if (date >= today) {
      flash("Only past dates can be forgiven.");
      return;
    }

    const habit = habits.find((item) => item.id === habitId);

    if (!habit || !habitActiveOn(habit, date)) {
      flash("This habit was not scheduled for that date.");
      return;
    }

    if (isDoneOn(habitId, logs, forgiven, date)) {
      flash("This habit is already completed for that date.");
      return;
    }

    saveUndo("Forgive missed day");

    setForgiven((previous) => ({
      ...previous,
      [date]: Array.from(new Set([...(previous[date] || []), habitId])),
    }));

    flash("Missed day forgiven.");
  };

  /* ------------------------------ Archive / delete */

  const archiveHabit = (id: string) => {
    const habit = habits.find((item) => item.id === id);
    if (!habit) return;

    saveUndo(habit.archived ? "Unarchive habit" : "Archive habit");

    setHabits((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, archived: !item.archived }
          : item
      )
    );

    flash(habit.archived ? "Habit restored." : "Habit archived.");
  };

  const deleteHabit = (id: string) => {
    const habit = habits.find((item) => item.id === id);
    if (!habit) return;

    if (!window.confirm(`Delete "${habit.name}" and its check-in history?`)) {
      return;
    }

    saveUndo("Delete habit");

    setHabits((previous) => previous.filter((item) => item.id !== id));

    const removeFromLogs = (source: HabitLog): HabitLog => {
      const result: HabitLog = {};

      Object.entries(source).forEach(([date, ids]) => {
        const remaining = ids.filter((item) => item !== id);
        if (remaining.length) result[date] = remaining;
      });

      return result;
    };

    setLogs((previous) => removeFromLogs(previous));
    setForgiven((previous) => removeFromLogs(previous));

    flash("Habit deleted.");
  };

  const resetAll = () => {
    if (!habits.length && !Object.keys(logs).length && !Object.keys(forgiven).length) {
      closeForm();
      return;
    }

    if (
      !window.confirm(
        "Reset the tracker? All habits and check-in history will be deleted."
      )
    ) {
      return;
    }

    saveUndo("Reset tracker");

    setHabits([]);
    setLogs({});
    setForgiven({});
    setSelectedDate(today);
    setFilter("all");
    setSearch("");
    setCategoryFilter("all");
    setShowArchived(false);
    closeForm();

    flash("Tracker reset.");
  };

  /* ------------------------------ Export / import */

  const downloadFile = (
    content: string,
    filename: string,
    type: string
  ) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportJSON = () => {
    downloadFile(
      JSON.stringify(
        {
          version: 2,
          exportedAt: new Date().toISOString(),
          habits,
          logs,
          forgiven,
        },
        null,
        2
      ),
      `study-habits-${today}.json`,
      "application/json"
    );

    flash("JSON backup downloaded.");
  };

  const exportCSV = () => {
    if (!habits.length) {
      flash("There are no habits to export.");
      return;
    }

    const rows = [
      [
        "Habit",
        "Category",
        "Frequency",
        "Target minutes",
        "Created date",
        "Current streak",
        "Best streak",
        "Archived",
      ],
      ...habits.map((habit) => [
        habit.name,
        habit.category,
        habit.frequency,
        String(habit.targetMinutes),
        dateKey(new Date(habit.createdAt)),
        String(currentStreak(habit, logs, forgiven, today)),
        String(bestStreak(habit, logs, forgiven)),
        habit.archived ? "Yes" : "No",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    downloadFile(
      csv,
      `study-habits-${today}.csv`,
      "text/csv;charset=utf-8"
    );

    flash("CSV file downloaded.");
  };

  const importJSON = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());

      if (!parsed || !Array.isArray(parsed.habits)) {
        throw new Error("Invalid backup");
      }

      const importedHabits = parsed.habits
        .map(sanitizeHabit)
        .filter((item: Habit | null): item is Habit => item !== null);

      if (!importedHabits.length) {
        throw new Error("No valid habits");
      }

      if (
        !window.confirm(
          `Import ${importedHabits.length} habits? This will replace your current tracker.`
        )
      ) {
        return;
      }

      saveUndo("Import backup");

      const validIds = new Set(importedHabits.map((habit:any) => habit.id));

      const cleanLog = (value: unknown): HabitLog => {
        const source = sanitizeLog(value);
        const result: HabitLog = {};

        Object.entries(source).forEach(([date, ids]) => {
          const valid = ids.filter((id) => validIds.has(id));
          if (valid.length) result[date] = valid;
        });

        return result;
      };

      setHabits(importedHabits);
      setLogs(cleanLog(parsed.logs));
      setForgiven(cleanLog(parsed.forgiven));

      flash("Backup imported successfully.");
    } catch {
      flash("This file is not a valid Study Habit Tracker backup.");
    }
  };

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

      if (event.key.toLowerCase() === "t") {
        setSelectedDate(today);
        setView("today");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [today, showForm]);

  /* ---------------------------------------------------------------- */
  /* Popup portal                                                      */
  /* ---------------------------------------------------------------- */

  const habitPopup = showForm
    ? createPortal(
        <div
          className="hx-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div
            className="hx-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hx-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="hx-modal-heading">
              <div>
                <span className="hx-eyebrow">YOUR ROUTINE</span>
                <h3 id="hx-modal-title">
                  {editingId ? "Edit habit" : "Create a habit"}
                </h3>
              </div>

              <button
                className="hx-icon-btn"
                onClick={closeForm}
                aria-label="Close popup"
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitForm}>
              <label className="hx-field">
                <span>Habit name *</span>
                <input
                  required
                  maxLength={60}
                  autoFocus
                  value={form.name}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Read 10 pages"
                />
              </label>

              <div className="hx-field">
                <span>Choose an icon</span>
                <div className="hx-icon-grid">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={`hx-icon-choice ${
                        form.icon === icon ? "is-active" : ""
                      }`}
                      onClick={() =>
                        setForm((previous) => ({ ...previous, icon }))
                      }
                      aria-pressed={form.icon === icon}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hx-field">
                <span>Choose a color</span>
                <div className="hx-color-grid">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`hx-color-choice ${
                        form.color === color ? "is-active" : ""
                      }`}
                      style={{ background: color }}
                      onClick={() =>
                        setForm((previous) => ({ ...previous, color }))
                      }
                      aria-label={`Choose ${color}`}
                      aria-pressed={form.color === color}
                    />
                  ))}
                </div>
              </div>

              <div className="hx-form-grid">
                <label className="hx-field">
                  <span>Category</span>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        category: event.target.value as Category,
                      }))
                    }
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="hx-field">
                  <span>Target time (minutes)</span>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    required
                    value={form.targetMinutes}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        targetMinutes: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>

              <label className="hx-field">
                <span>Frequency</span>
                <select
                  value={form.frequency}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      frequency: event.target.value as Frequency,
                    }))
                  }
                >
                  {FREQUENCIES.map((frequency) => (
                    <option key={frequency.id} value={frequency.id}>
                      {frequency.label}
                    </option>
                  ))}
                </select>
              </label>

              {form.frequency === "weekly" && (
                <div className="hx-field">
                  <span>Choose the weekly day</span>
                  <div className="hx-day-grid">
                    {WEEKDAYS.map((day, index) => (
                      <button
                        type="button"
                        key={day}
                        className={`hx-day-choice ${
                          form.anchorDay === index ? "is-active" : ""
                        }`}
                        onClick={() =>
                          setForm((previous) => ({
                            ...previous,
                            anchorDay: index,
                          }))
                        }
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.frequency === "custom" && (
                <div className="hx-field">
                  <span>Select the days for this habit</span>
                  <div className="hx-day-grid">
                    {WEEKDAYS.map((day, index) => {
                      const selected = form.customDays.includes(index);

                      return (
                        <button
                          type="button"
                          key={day}
                          className={`hx-day-choice ${
                            selected ? "is-active" : ""
                          }`}
                          onClick={() =>
                            setForm((previous) => ({
                              ...previous,
                              customDays: selected
                                ? previous.customDays.filter(
                                    (value) => value !== index
                                  )
                                : [...previous.customDays, index],
                            }))
                          }
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <label className="hx-field">
                <span>Note (optional)</span>
                <textarea
                  rows={3}
                  maxLength={200}
                  value={form.note}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      note: event.target.value,
                    }))
                  }
                  placeholder="Add a short reminder or reason for this habit"
                />
              </label>

              <div className="hx-modal-actions">
                <button
                  type="button"
                  className="hx-btn hx-btn-secondary"
                  onClick={closeForm}
                >
                  Cancel
                </button>

                <button type="submit" className="hx-btn hx-btn-pri">
                  {editingId ? "Save changes" : "Add habit"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )
    : null;

  /* ---------------------------------------------------------------- */
  /* Main UI                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <ToolShell title="Study habit tracker" onReset={resetAll} wide>
      <div className="hx-wrapper">
        <header className="hx-header">
          <div>
            <span className="hx-eyebrow">HABIT TRACKER</span>
            <h2>Study habit tracker</h2>
            <p>
              Build a routine, track your daily progress, and see how
              consistently you follow your study habits.
            </p>
          </div>

          <div className="hx-header-stats">
            <div className="hx-mini-stat">
              <span>BEST STREAK</span>
              <strong>🔥 {bestOverallStreak}</strong>
            </div>
            <div className="hx-mini-stat">
              <span>30-DAY RATE</span>
              <strong>{insights.rate30}%</strong>
            </div>
          </div>
        </header>

        <div className="hx-bar">
          <div className="hx-bar-cell">
            <span>ACTIVE HABITS</span>
            <strong>{activeHabits.length}</strong>
          </div>
          <div className="hx-bar-cell">
            <span>DONE</span>
            <strong>{stats.done}</strong>
          </div>
          <div className="hx-bar-cell">
            <span>WEEKLY RATE</span>
            <strong>{weeklyRate}%</strong>
          </div>
          <div className="hx-bar-cell">
            <span>PERFECT DAYS</span>
            <strong>{insights.perfectDays}</strong>
          </div>
        </div>

        <div className="hx-toolbar">
          <div className="hx-tabs">
            {(
              [
                ["today", "Today"],
                ["week", "Week"],
                ["month", "Month"],
                ["insights", "Insights"],
              ] as [View, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`hx-tab ${view === id ? "hx-tab-active" : ""}`}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            ref={searchRef}
            className="hx-search"
            type="search"
            placeholder="Search habits... ( / )"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search habits"
          />

          <select
            className="hx-select"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            aria-label="Sort habits"
          >
            <option value="created">Newest</option>
            <option value="name">Name A–Z</option>
            <option value="streak">Highest streak</option>
            <option value="completion">Best streak</option>
          </select>

          <button className="hx-btn hx-btn-pri" onClick={openNew}>
            + New habit
          </button>
        </div>

        {view === "today" && (
          <>
            <div className="hx-datebar">
              <div className="hx-date-controls">
                <button
                  className="hx-icon-btn"
                  onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
                  aria-label="Previous day"
                >
                  ←
                </button>

                <input
                  className="hx-date-input"
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />

                <button
                  className="hx-icon-btn"
                  disabled={selectedDate >= today}
                  onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
                  aria-label="Next day"
                >
                  →
                </button>

                <button
                  className="hx-mini-btn"
                  onClick={() => setSelectedDate(today)}
                >
                  Today
                </button>
              </div>

              <div className="hx-date-filters">
                <select
                  className="hx-select"
                  value={categoryFilter}
                  onChange={(event) =>
                    setCategoryFilter(event.target.value as Category | "all")
                  }
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.label}
                    </option>
                  ))}
                </select>

                <div className="hx-tabs">
                  {(["all", "pending", "done"] as Filter[]).map((item) => (
                    <button
                      key={item}
                      className={`hx-tab ${
                        filter === item ? "hx-tab-active" : ""
                      }`}
                      onClick={() => setFilter(item)}
                    >
                      {item === "all"
                        ? "All"
                        : item === "pending"
                          ? "Pending"
                          : "Done"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {archivedHabits.length > 0 && (
              <button
                className="hx-mini-btn"
                onClick={() => setShowArchived((value) => !value)}
              >
                {showArchived ? "Hide" : "Show"} archived habits (
                {archivedHabits.length})
              </button>
            )}

            <section className="hx-card hx-progress-card">
              <div className="hx-progress-head">
                <div>
                  <span className="hx-progress-eyebrow">
                    {formatDate(selectedDate)}
                  </span>
                  <h3>
                    {isFutureDate
                      ? "Future date — check-ins open when the day arrives"
                      : stats.total === 0
                        ? "No habits scheduled"
                        : stats.done === stats.total
                          ? "All done — great job! 🎉"
                          : stats.done + stats.forgiven === stats.total
                            ? `${stats.done} done · ${stats.forgiven} forgiven`
                            : `${stats.done} of ${stats.total} completed`}
                  </h3>
                </div>

                {stats.total > 0 &&
                  stats.done + stats.forgiven < stats.total && (
                    <button
                      className="hx-btn hx-btn-pri"
                      onClick={completeAll}
                      disabled={isFutureDate}
                    >
                      ✓ Complete all
                    </button>
                  )}
              </div>

              <div className="hx-progress-track">
                <div
                  className="hx-progress-fill"
                  style={{ width: `${stats.rate}%` }}
                />
              </div>

              <p className="hx-progress-meta">
                {stats.rate}% complete
                {stats.forgiven > 0
                  ? ` · ${stats.forgiven} forgiven`
                  : ""}
                {" · "}
                {completedTargetMinutes} of {totalTargetMinutes} target
                minutes
              </p>
            </section>

            {visibleHabits.length === 0 ? (
              <section className="hx-empty">
                <span>🌱</span>
                <h3>
                  {habits.length === 0
                    ? "No habits yet"
                    : habitsForDay.length === 0
                      ? "Nothing scheduled for this day"
                      : "No habits found"}
                </h3>
                <p>
                  {habits.length === 0
                    ? "Add your first habit to start building a consistent routine."
                    : habitsForDay.length === 0
                      ? "Your habit schedules do not include this date."
                      : "Try changing your filters or search."}
                </p>
                {habits.length === 0 && (
                  <button className="hx-btn hx-btn-pri" onClick={openNew}>
                    + Add first habit
                  </button>
                )}
              </section>
            ) : (
              <div className="hx-habit-list">
                {visibleHabits.map((habit) => {
                  const done = completedIds.has(habit.id);
                  const forgivenToday =
                    (forgiven[selectedDate] || []).includes(habit.id);
                  const streak = currentStreak(
                    habit,
                    logs,
                    forgiven,
                    selectedDate
                  );
                  const best = bestStreak(habit, logs, forgiven);
                  const category = CATEGORIES.find(
                    (item) => item.id === habit.category
                  );

                  return (
                    <article
                      key={habit.id}
                      className={`hx-habit ${done ? "is-done" : ""} ${
                        forgivenToday ? "is-forgiven" : ""
                      }`}
                      style={{ borderLeftColor: habit.color }}
                    >
                      <button
                        type="button"
                        className={`hx-check ${done ? "is-checked" : ""}`}
                        aria-label={`${done ? "Uncheck" : "Complete"} ${habit.name}`}
                        aria-pressed={done}
                        disabled={isFutureDate}
                        onClick={() => toggleHabit(habit.id)}
                      >
                        {done ? "✓" : ""}
                      </button>

                      <div className="hx-habit-body">
                        <div className="hx-habit-title">
                          <span className="hx-habit-icon">{habit.icon}</span>
                          <strong className={done ? "hx-strike" : ""}>
                            {habit.name}
                          </strong>
                          {category && (
                            <span className="hx-badge">
                              {category.icon} {category.label}
                            </span>
                          )}
                          {forgivenToday && (
                            <span className="hx-badge hx-forgiven-badge">
                              Forgiven
                            </span>
                          )}
                        </div>

                        {habit.note && (
                          <p className="hx-habit-note">{habit.note}</p>
                        )}

                        <div className="hx-meta">
                          <span>🎯 {habit.targetMinutes} min target</span>
                          <span>🔥 {streak} current</span>
                          <span>🏆 {best} best</span>
                          <span>
                            {FREQUENCIES.find(
                              (item) => item.id === habit.frequency
                            )?.label}
                          </span>
                        </div>
                      </div>

                      <div className="hx-actions">
                        <button
                          className="hx-icon-btn"
                          onClick={() => openEdit(habit)}
                          title="Edit habit"
                          aria-label={`Edit ${habit.name}`}
                        >
                          ✎
                        </button>
                        <button
                          className="hx-icon-btn"
                          onClick={() => archiveHabit(habit.id)}
                          title="Archive habit"
                          aria-label={`Archive ${habit.name}`}
                        >
                          ⏸
                        </button>
                        <button
                          className="hx-icon-btn hx-danger"
                          onClick={() => deleteHabit(habit.id)}
                          title="Delete habit"
                          aria-label={`Delete ${habit.name}`}
                        >
                          ×
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {showArchived && archivedHabits.length > 0 && (
              <section className="hx-card">
                <div className="hx-card-heading">
                  <div>
                    <h3>Archived habits</h3>
                    <p>Archived habits are hidden from your daily checklist.</p>
                  </div>
                </div>

                {archivedHabits.map((habit) => (
                  <div className="hx-archived-row" key={habit.id}>
                    <span>{habit.icon}</span>
                    <strong>{habit.name}</strong>
                    <button
                      className="hx-mini-btn"
                      onClick={() => archiveHabit(habit.id)}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {view === "week" && (
          <section className="hx-card">
            <div className="hx-card-heading">
              <div>
                <h3>This week</h3>
                <p>
                  {formatDate(weekDates[0])} – {formatDate(weekDates[6])}
                </p>
              </div>
              <span className="hx-badge hx-green-badge">
                {weeklyRate}% complete
              </span>
            </div>

            <div className="hx-week-chart">
              {weekStats.map((day) => (
                <button
                  type="button"
                  key={day.date}
                  className={`hx-week-column ${
                    selectedDate === day.date ? "is-selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedDate(day.date);
                    setView("today");
                  }}
                >
                  <span className="hx-week-day">
                    {parseDate(day.date).toLocaleDateString(undefined, {
                      weekday: "short",
                    })}
                  </span>
                  <div className="hx-week-track">
                    <div
                      className="hx-week-fill"
                      style={{ height: `${day.total ? day.rate : 0}%` }}
                    />
                  </div>
                  <strong>
                    {day.total ? `${day.done}/${day.total}` : "—"}
                  </strong>
                  <span className="hx-week-percent">
                    {day.total ? `${day.rate}%` : ""}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {view === "month" && (
          <section className="hx-card">
            <div className="hx-card-heading">
              <div>
                <h3>{monthInfo.title}</h3>
                <p>Select a day to open its checklist.</p>
              </div>

              <div className="hx-month-controls">
                <button
                  className="hx-icon-btn"
                  onClick={() => {
                    const date = parseDate(selectedDate);
                    date.setDate(1);
                    date.setMonth(date.getMonth() - 1);
                    setSelectedDate(dateKey(date));
                  }}
                  aria-label="Previous month"
                >
                  ←
                </button>
                <button
                  className="hx-icon-btn"
                  onClick={() => {
                    const date = parseDate(selectedDate);
                    date.setDate(1);
                    date.setMonth(date.getMonth() + 1);
                    setSelectedDate(dateKey(date));
                  }}
                  aria-label="Next month"
                >
                  →
                </button>
              </div>
            </div>

            <div className="hx-calendar">
              {WEEKDAYS.map((day) => (
                <span className="hx-calendar-heading" key={day}>
                  {day}
                </span>
              ))}

              {monthInfo.cells.map((cell, index) => {
                if (!cell.date) return <span key={`blank-${index}`} />;

                const result = completionForDate(
                  activeHabits,
                  logs,
                  forgiven,
                  cell.date
                );

                return (
                  <button
                    type="button"
                    key={cell.date}
                    className={`hx-calendar-day ${
                      cell.today ? "is-today" : ""
                    } ${
                      selectedDate === cell.date ? "is-selected" : ""
                    } ${
                      result.total > 0 && result.rate === 100
                        ? "is-complete"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedDate(cell.date);
                      setView("today");
                    }}
                    title={`${formatDate(cell.date)}: ${result.done}/${result.total} completed`}
                  >
                    <strong>{cell.day}</strong>
                    {result.total > 0 && (
                      <span>{result.done}/{result.total}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="hx-legend">
              <span className="hx-legend-dot" />
              All scheduled habits completed
            </p>
          </section>
        )}

        {view === "insights" && (
          <>
            <div className="hx-insight-grid">
              <div className="hx-card hx-insight">
                <span>30-DAY COMPLETION</span>
                <strong>{insights.rate30}%</strong>
                <small>Scheduled check-ins completed</small>
              </div>
              <div className="hx-card hx-insight">
                <span>PERFECT DAYS</span>
                <strong>{insights.perfectDays}</strong>
                <small>Days with every habit completed</small>
              </div>
              <div className="hx-card hx-insight">
                <span>BEST WEEKDAY</span>
                <strong>{insights.bestWeekday}</strong>
                <small>Your strongest weekday in this period</small>
              </div>
              <div className="hx-card hx-insight">
                <span>REAL CHECK-INS</span>
                <strong>{insights.totalCheckins}</strong>
                <small>Recorded completions, excluding forgiven days</small>
              </div>
            </div>

            <section className="hx-card">
              <div className="hx-card-heading">
                <div>
                  <h3>Habit ranking</h3>
                  <p>Completion rate over the last 30 days.</p>
                </div>
              </div>

              {insights.ranking.length === 0 ? (
                <p className="hx-empty-text">
                  Add a habit to see your insights.
                </p>
              ) : (
                <div className="hx-ranking">
                  {insights.ranking.map((item) => (
                    <div className="hx-ranking-row" key={item.habit.id}>
                      <span className="hx-ranking-icon">
                        {item.habit.icon}
                      </span>
                      <div className="hx-ranking-content">
                        <div className="hx-ranking-title">
                          <strong>{item.habit.name}</strong>
                          <b>{item.rate}%</b>
                        </div>
                        <div className="hx-ranking-track">
                          <div
                            style={{
                              width: `${item.rate}%`,
                              background: item.habit.color,
                            }}
                          />
                        </div>
                        <small>
                          {item.completions}/{item.appearances} scheduled days
                          · 🔥 {item.current} current · 🏆 {item.best} best
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="hx-card">
              <div className="hx-card-heading">
                <div>
                  <h3>Forgive a missed day</h3>
                  <p>
                    Mark a past scheduled day as forgiven to protect a streak.
                    Forgiven days do not count as real check-ins.
                  </p>
                </div>
              </div>

              <ForgiveList
                habits={activeHabits}
                logs={logs}
                forgiven={forgiven}
                onForgive={forgiveDay}
              />
            </section>
          </>
        )}

        <section className="hx-help-section">
          <button
            className="hx-help-toggle"
            onClick={() => setShowHelp((value) => !value)}
            aria-expanded={showHelp}
          >
            <span>How to use the study habit tracker</span>
            <strong>{showHelp ? "−" : "+"}</strong>
          </button>

          {showHelp && (
            <div className="hx-help-content">
              <div>
                <strong>1. Create your habits</strong>
                <p>
                  Add a name, category, icon, color, target time, and schedule.
                  You can choose daily, weekdays, weekends, weekly, or specific
                  days.
                </p>
              </div>
              <div>
                <strong>2. Check off completed habits</strong>
                <p>
                  Open the Today view and select the circle beside a habit
                  when you complete it. You can also review previous dates.
                </p>
              </div>
              <div>
                <strong>3. Review your progress</strong>
                <p>
                  The Week view compares daily completion. The Month view
                  provides a calendar overview, while Insights shows your
                  completion rate and habit rankings.
                </p>
              </div>
              <div>
                <strong>4. Manage your habits</strong>
                <p>
                  Edit a habit when your routine changes, archive habits you
                  no longer follow, or delete habits you do not need.
                </p>
              </div>
              <div>
                <strong>5. Back up your data</strong>
                <p>
                  Export a JSON backup to preserve your habits and check-ins.
                  You can import that backup later in this browser.
                </p>
              </div>
            </div>
          )}
        </section>

        <div className="hx-backup">
          <button
            className="hx-btn hx-btn-secondary"
            onClick={exportJSON}
            disabled={!habits.length}
          >
            ↓ Export JSON
          </button>
          <button
            className="hx-btn hx-btn-secondary"
            onClick={exportCSV}
            disabled={!habits.length}
          >
            ↓ Export CSV
          </button>
          <button
            className="hx-btn hx-btn-secondary"
            onClick={() => importRef.current?.click()}
          >
            ↑ Import backup
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={importJSON}
          />
          <button
            className="hx-btn hx-btn-secondary"
            onClick={undo}
            disabled={!undoBuffer}
          >
            ↶ Undo
          </button>
        </div>

        {notice && (
          <div className="hx-notice" role="status" aria-live="polite">
            <span>✓</span>
            {notice}
            {undoBuffer && (
              <button onClick={undo}>Undo</button>
            )}
          </div>
        )}

        <p className="hx-storage-note">
          Your habits and check-ins are saved in this browser on this device.
          They are not automatically synchronized with other devices.
          Export a backup if you want to keep a separate copy of your data.
        </p>
      </div>

      {/* The popup is intentionally rendered outside ToolShell. */}
      {habitPopup}

      <style jsx global>{`
        .hx-wrapper {
          --hx-orange: #ff5a1f;
          --hx-border: var(--tool-border, #e5e7eb);
          --hx-text: var(--tool-text, #172033);
          --hx-muted: var(--tool-muted, #64748b);
          --hx-card: var(--tool-card, #ffffff);
          --hx-surface: var(--tool-surface, #f8fafc);
          display: flex;
          flex-direction: column;
          gap: 15px;
          max-width: 960px;
          margin: 0 auto;
          color: var(--hx-text);
          font-family: inherit;
        }

        .hx-wrapper button,
        .hx-wrapper input,
        .hx-wrapper select,
        .hx-wrapper textarea,
        .hx-modal-backdrop button,
        .hx-modal-backdrop input,
        .hx-modal-backdrop select,
        .hx-modal-backdrop textarea {
          font: inherit;
        }

        .hx-header,
        .hx-header-stats,
        .hx-toolbar,
        .hx-datebar,
        .hx-date-controls,
        .hx-date-filters,
        .hx-actions,
        .hx-modal-heading,
        .hx-modal-actions,
        .hx-backup,
        .hx-card-heading,
        .hx-month-controls {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .hx-header {
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .hx-eyebrow {
          display: block;
          color: var(--hx-orange);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.3px;
          margin-bottom: 5px;
        }

        .hx-header h2 {
          font-size: 21px;
          line-height: 1.2;
          font-weight: 850;
          margin: 0;
        }

        .hx-header p {
          margin: 5px 0 0;
          color: var(--hx-muted);
          font-size: 12px;
          line-height: 1.6;
          max-width: 520px;
        }

        .hx-header-stats {
          flex-shrink: 0;
        }

        .hx-mini-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-end;
          padding: 9px 12px;
          border: 1px solid #fed7c7;
          border-radius: 10px;
          background: #fff7f2;
        }

        .hx-mini-stat span,
        .hx-bar-cell span {
          font-size: 8px;
          font-weight: 900;
          color: var(--hx-muted);
          letter-spacing: .8px;
        }

        .hx-mini-stat strong {
          font-size: 16px;
          color: var(--hx-orange);
        }

        .hx-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: var(--hx-card);
          border: 1px solid var(--hx-border);
          border-radius: 11px;
          overflow: hidden;
        }

        .hx-bar-cell {
          padding: 10px 13px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-right: 1px solid var(--hx-border);
        }

        .hx-bar-cell:last-child {
          border-right: 0;
        }

        .hx-bar-cell strong {
          font-size: 16px;
          font-weight: 850;
          font-variant-numeric: tabular-nums;
        }

        .hx-toolbar {
          flex-wrap: wrap;
        }

        .hx-tabs {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 3px;
          border-radius: 9px;
          border: 1px solid var(--hx-border);
          background: var(--hx-surface);
        }

        .hx-tab {
          border: 0;
          background: transparent;
          color: var(--hx-muted);
          border-radius: 7px;
          padding: 7px 11px;
          font-size: 11px !important;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .hx-tab-active {
          background: var(--hx-card);
          color: var(--hx-orange);
          box-shadow: 0 1px 4px #00000012;
        }

        .hx-search,
        .hx-select,
        .hx-date-input,
        .hx-field input,
        .hx-field select,
        .hx-field textarea {
          min-width: 0;
          border: 1px solid var(--hx-border);
          border-radius: 8px;
          background: var(--hx-card);
          color: var(--hx-text);
          padding: 9px 10px;
          font-size: 11px !important;
          outline: none;
        }

        .hx-search {
          flex: 1;
          min-width: 130px;
        }

        .hx-search:focus,
        .hx-select:focus,
        .hx-date-input:focus,
        .hx-field input:focus,
        .hx-field select:focus,
        .hx-field textarea:focus {
          border-color: var(--hx-orange);
          box-shadow: 0 0 0 3px #ff5a1f18;
        }

        .hx-datebar {
          justify-content: space-between;
          flex-wrap: wrap;
          padding: 10px;
          border: 1px solid var(--hx-border);
          border-radius: 10px;
          background: var(--hx-surface);
        }

        .hx-date-controls,
        .hx-date-filters {
          flex-wrap: wrap;
        }

        .hx-card {
          padding: 15px;
          background: var(--hx-card);
          border: 1px solid var(--hx-border);
          border-radius: 12px;
          min-width: 0;
        }

        .hx-card-heading {
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 13px;
          flex-wrap: wrap;
        }

        .hx-card-heading h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 850;
        }

        .hx-card-heading p {
          margin: 4px 0 0;
          font-size: 10px;
          line-height: 1.5;
          color: var(--hx-muted);
        }

        .hx-progress-card {
          background: linear-gradient(135deg, #fff8f4, #fff);
          border-color: #ffd3c1;
        }

        .hx-progress-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 13px;
        }

        .hx-progress-eyebrow {
          display: block;
          font-size: 10px;
          color: var(--hx-orange);
          font-weight: 850;
          margin-bottom: 4px;
        }

        .hx-progress-head h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 850;
        }

        .hx-progress-track,
        .hx-ranking-track {
          height: 9px;
          background: #ffe3d8;
          border-radius: 99px;
          overflow: hidden;
        }

        .hx-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff9a70, #ff5a1f);
          border-radius: inherit;
          transition: width .25s ease;
        }

        .hx-progress-meta {
          color: var(--hx-muted);
          font-size: 10px;
          margin: 8px 0 0;
          font-weight: 650;
        }

        .hx-habit-list {
          display: grid;
          gap: 8px;
        }

        .hx-habit {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--hx-card);
          border: 1px solid var(--hx-border);
          border-left: 4px solid var(--hx-orange);
          border-radius: 11px;
          min-width: 0;
        }

        .hx-habit.is-done {
          background: #f3fbf6;
          border-color: #ccebd8;
        }

        .hx-habit.is-forgiven {
          background: #fffbeb;
          border-color: #f5df9b;
        }

        .hx-check {
          width: 33px;
          height: 33px;
          flex: 0 0 33px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 2px solid #cbd5e1;
          background: var(--hx-card);
          color: transparent;
          font-size: 15px !important;
          font-weight: 900;
          cursor: pointer;
        }

        .hx-check.is-checked {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }

        .hx-check:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .hx-habit-body {
          flex: 1;
          min-width: 0;
        }

        .hx-habit-title {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .hx-habit-title strong {
          font-size: 13px;
          font-weight: 850;
          overflow-wrap: anywhere;
        }

        .hx-habit-icon {
          font-size: 17px;
        }

        .hx-strike {
          text-decoration: line-through;
          color: var(--hx-muted);
        }

        .hx-habit-note {
          margin: 5px 0;
          font-size: 10px;
          color: var(--hx-muted);
          overflow-wrap: anywhere;
        }

        .hx-meta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 5px;
          font-size: 10px;
          color: var(--hx-muted);
          font-weight: 650;
        }

        .hx-actions {
          flex-shrink: 0;
        }

        .hx-badge {
          display: inline-flex;
          padding: 3px 7px;
          border-radius: 99px;
          background: #eef2ff;
          color: #4338ca;
          font-size: 9px;
          font-weight: 800;
        }

        .hx-forgiven-badge {
          background: #fef3c7;
          color: #92400e;
        }

        .hx-green-badge {
          background: #dcfce7;
          color: #166534;
        }

        .hx-icon-btn {
          width: 29px;
          height: 29px;
          border: 1px solid var(--hx-border);
          background: var(--hx-card);
          color: var(--hx-muted);
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 13px !important;
        }

        .hx-icon-btn:hover {
          color: var(--hx-orange);
          border-color: #ffb69d;
          background: #fff5f0;
        }

        .hx-icon-btn:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .hx-danger {
          color: #dc2626;
        }

        .hx-danger:hover {
          color: #b91c1c;
          background: #fef2f2;
          border-color: #fecaca;
        }

        .hx-btn {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 8px;
          padding: 7px 13px;
          border: 1px solid transparent;
          font-size: 11px !important;
          font-weight: 850;
          cursor: pointer;
          white-space: nowrap;
        }

        .hx-btn-pri {
          background: linear-gradient(135deg, #ff713d, #e94b18);
          color: white;
          border-color: #e94b18;
        }

        .hx-btn-pri:hover {
          filter: brightness(.96);
        }

        .hx-btn-secondary {
          background: var(--hx-card);
          color: var(--hx-text);
          border-color: var(--hx-border);
        }

        .hx-btn-secondary:hover {
          border-color: #ffb69d;
          color: var(--hx-orange);
        }

        .hx-btn:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .hx-mini-btn {
          padding: 6px 10px;
          border: 1px solid var(--hx-border);
          border-radius: 7px;
          background: var(--hx-card);
          color: var(--hx-text);
          font-size: 10px !important;
          font-weight: 800;
          cursor: pointer;
        }

        .hx-mini-btn:hover {
          border-color: #ffb69d;
          color: var(--hx-orange);
        }

        .hx-empty {
          padding: 35px 18px;
          text-align: center;
          background: var(--hx-surface);
          border: 1px dashed var(--hx-border);
          border-radius: 12px;
        }

        .hx-empty > span {
          font-size: 30px;
        }

        .hx-empty h3 {
          margin: 8px 0 5px;
          font-size: 14px;
        }

        .hx-empty p,
        .hx-empty-text {
          color: var(--hx-muted);
          font-size: 11px;
          line-height: 1.5;
        }

        .hx-archived-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 0;
          border-top: 1px solid var(--hx-border);
          font-size: 12px;
        }

        .hx-archived-row strong {
          flex: 1;
        }

        .hx-week-chart {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 7px;
        }

        .hx-week-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 8px 4px;
          border: 1px solid transparent;
          border-radius: 9px;
          background: transparent;
          cursor: pointer;
          color: var(--hx-text);
        }

        .hx-week-column:hover,
        .hx-week-column.is-selected {
          background: #fff3ed;
          border-color: #ffb69d;
        }

        .hx-week-day,
        .hx-week-percent {
          color: var(--hx-muted);
          font-size: 10px;
          font-weight: 750;
        }

        .hx-week-column strong {
          font-size: 10px;
        }

        .hx-week-track {
          height: 95px;
          width: 100%;
          max-width: 28px;
          display: flex;
          align-items: flex-end;
          background: #f1f5f9;
          border-radius: 5px;
          overflow: hidden;
        }

        .hx-week-fill {
          width: 100%;
          background: linear-gradient(180deg, #ff9a70, #ff5a1f);
          border-radius: 5px;
        }

        .hx-calendar {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 5px;
        }

        .hx-calendar-heading {
          text-align: center;
          padding: 7px 0;
          font-size: 10px;
          color: var(--hx-muted);
          font-weight: 850;
        }

        .hx-calendar-day {
          min-height: 55px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border: 1px solid var(--hx-border);
          border-radius: 8px;
          background: var(--hx-card);
          color: var(--hx-text);
          cursor: pointer;
        }

        .hx-calendar-day strong {
          font-size: 12px;
        }

        .hx-calendar-day span {
          font-size: 9px;
          color: var(--hx-muted);
        }

        .hx-calendar-day.is-today {
          border-color: var(--hx-orange);
        }

        .hx-calendar-day.is-selected {
          background: #fff0e9;
          border-color: var(--hx-orange);
        }

        .hx-calendar-day.is-complete {
          background: #ecfdf5;
          border-color: #86efac;
        }

        .hx-legend {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--hx-muted);
          font-size: 10px;
          margin: 12px 0 0;
        }

        .hx-legend-dot {
          width: 9px;
          height: 9px;
          border-radius: 3px;
          background: #86efac;
        }

        .hx-month-controls {
          gap: 5px;
        }

        .hx-insight-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 9px;
        }

        .hx-insight {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .hx-insight span {
          font-size: 9px;
          font-weight: 900;
          color: var(--hx-muted);
        }

        .hx-insight strong {
          font-size: 23px;
          font-weight: 900;
        }

        .hx-insight small {
          color: var(--hx-muted);
          font-size: 9px;
          line-height: 1.4;
        }

        .hx-ranking {
          display: grid;
          gap: 14px;
        }

        .hx-ranking-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .hx-ranking-icon {
          font-size: 20px;
        }

        .hx-ranking-content {
          flex: 1;
          min-width: 0;
        }

        .hx-ranking-title {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .hx-ranking-title strong {
          overflow-wrap: anywhere;
        }

        .hx-ranking-title b {
          color: var(--hx-orange);
        }

        .hx-ranking-track {
          height: 7px;
          background: #eef0f5;
        }

        .hx-ranking-track > div {
          height: 100%;
          border-radius: inherit;
        }

        .hx-ranking-content small {
          display: block;
          margin-top: 5px;
          color: var(--hx-muted);
          font-size: 9px;
        }

        .hx-forgive-form {
          display: flex;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 10px;
        }

        .hx-forgive-form .hx-field {
          flex: 1;
          min-width: 150px;
        }

        .hx-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
          margin-bottom: 12px;
        }

        .hx-field > span {
          font-size: 10px;
          font-weight: 850;
          color: var(--hx-text);
        }

        .hx-field input,
        .hx-field select,
        .hx-field textarea {
          width: 100%;
          box-sizing: border-box;
        }

        .hx-field textarea {
          resize: vertical;
        }

        .hx-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .hx-icon-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .hx-icon-choice {
          width: 35px;
          height: 35px;
          border: 1px solid var(--hx-border);
          border-radius: 8px;
          background: var(--hx-card);
          font-size: 17px !important;
          cursor: pointer;
        }

        .hx-icon-choice.is-active,
        .hx-day-choice.is-active {
          border-color: var(--hx-orange);
          background: #fff0e9;
          box-shadow: inset 0 0 0 1px var(--hx-orange);
        }

        .hx-color-grid {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }

        .hx-color-choice {
          width: 24px;
          height: 24px;
          border: 2px solid transparent;
          border-radius: 50%;
          cursor: pointer;
        }

        .hx-color-choice.is-active {
          outline: 2px solid var(--hx-text);
          outline-offset: 3px;
        }

        .hx-day-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .hx-day-choice {
          min-width: 40px;
          padding: 8px;
          border: 1px solid var(--hx-border);
          border-radius: 7px;
          background: var(--hx-card);
          color: var(--hx-text);
          font-size: 10px !important;
          font-weight: 800;
          cursor: pointer;
        }

        .hx-help-section {
          border: 1px solid var(--hx-border);
          border-radius: 10px;
          overflow: hidden;
        }

        .hx-help-toggle {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 12px;
          border: 0;
          background: var(--hx-card);
          color: var(--hx-text);
          font-size: 11px;
          font-weight: 850;
          text-align: left;
          cursor: pointer;
        }

        .hx-help-toggle strong {
          color: var(--hx-orange);
          font-size: 17px;
        }

        .hx-help-content {
          display: grid;
          gap: 12px;
          padding: 13px;
          border-top: 1px solid var(--hx-border);
        }

        .hx-help-content strong {
          font-size: 11px;
        }

        .hx-help-content p {
          margin: 4px 0 0;
          font-size: 10px;
          line-height: 1.6;
          color: var(--hx-muted);
        }

        .hx-backup {
          flex-wrap: wrap;
        }

        .hx-notice {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 12px;
          border: 1px solid #bbf7d0;
          border-radius: 9px;
          background: #f0fdf4;
          color: #166534;
          font-size: 11px;
          font-weight: 750;
        }

        .hx-notice button {
          margin-left: auto;
          border: 0;
          background: transparent;
          color: #166534;
          text-decoration: underline;
          font-size: 10px;
          font-weight: 850;
          cursor: pointer;
        }

        .hx-storage-note {
          margin: 0;
          color: var(--hx-muted);
          font-size: 10px;
          line-height: 1.6;
        }

        /* Popup is portalled to document.body, outside ToolShell. */
        .hx-modal-backdrop {
          position: fixed !important;
          inset: 0 !important;
          z-index: 2147483000 !important;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(15, 23, 42, .72);
          overflow-y: auto;
          overscroll-behavior: contain;
          isolation: isolate;
          box-sizing: border-box;
        }

        .hx-modal {
          position: relative;
          z-index: 2147483001;
          width: min(100%, 540px);
          max-height: calc(100dvh - 32px);
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 19px;
          border: 1px solid #e5e7eb;
          border-radius: 15px;
          background: #ffffff;
          color: #172033;
          box-shadow: 0 25px 80px rgba(0, 0, 0, .3);
          box-sizing: border-box;
          animation: hx-modal-enter .18s ease-out;
        }

        @keyframes hx-modal-enter {
          from {
            opacity: 0;
            transform: translateY(12px) scale(.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .hx-modal-heading {
          justify-content: space-between;
          margin-bottom: 17px;
        }

        .hx-modal-heading h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
        }

        .hx-modal .hx-field > span {
          color: #172033;
        }

        .hx-modal .hx-field input,
        .hx-modal .hx-field select,
        .hx-modal .hx-field textarea {
          background: #ffffff;
          color: #172033;
          border-color: #dbe1e9;
        }

        .hx-modal .hx-icon-choice,
        .hx-modal .hx-day-choice {
          background: #ffffff;
          color: #172033;
        }

        .hx-modal .hx-icon-choice.is-active,
        .hx-modal .hx-day-choice.is-active {
          background: #fff0e9;
        }

        .hx-modal-actions {
          justify-content: flex-end;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
        }

        @media (max-width: 650px) {
          .hx-header h2 {
            font-size: 19px;
          }

          .hx-toolbar {
            align-items: stretch;
          }

          .hx-toolbar > .hx-tabs {
            width: 100%;
            justify-content: space-between;
          }

          .hx-toolbar > .hx-search {
            flex-basis: 100%;
          }

          .hx-datebar {
            align-items: flex-start;
          }

          .hx-date-controls,
          .hx-date-filters {
            width: 100%;
          }

          .hx-date-filters > .hx-tabs {
            flex: 1;
            justify-content: space-between;
          }

          .hx-insight-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .hx-habit {
            gap: 8px;
            padding: 10px;
          }

          .hx-actions {
            gap: 3px;
          }

          .hx-icon-btn {
            width: 27px;
            height: 27px;
          }

          .hx-meta {
            gap: 7px;
          }
        }

        @media (max-width: 420px) {
          .hx-header-stats {
            width: 100%;
          }

          .hx-mini-stat {
            flex: 1;
            align-items: flex-start;
          }

          .hx-bar-cell {
            padding: 9px 7px;
          }

          .hx-bar-cell span {
            font-size: 7px;
          }

          .hx-bar-cell strong {
            font-size: 14px;
          }

          .hx-habit {
            flex-wrap: wrap;
          }

          .hx-habit-body {
            flex-basis: calc(100% - 55px);
          }

          .hx-actions {
            margin-left: 43px;
          }

          .hx-form-grid {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .hx-calendar {
            gap: 3px;
          }

          .hx-calendar-day {
            min-height: 47px;
          }

          .hx-calendar-day span {
            font-size: 8px;
          }

          .hx-backup .hx-btn {
            flex: 1;
          }

          .hx-forgive-form {
            align-items: stretch;
          }

          .hx-forgive-form .hx-btn {
            width: 100%;
          }

          .hx-modal-backdrop {
            align-items: flex-end;
            padding: 8px;
          }

          .hx-modal {
            width: 100%;
            max-height: calc(100dvh - 16px);
            border-radius: 15px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hx-wrapper *,
          .hx-wrapper *::before,
          .hx-wrapper *::after,
          .hx-modal {
            transition-duration: .01ms !important;
            animation-duration: .01ms !important;
          }
        }
      `}</style>
    </ToolShell>
  );
}