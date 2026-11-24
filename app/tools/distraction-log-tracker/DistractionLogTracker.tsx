"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ToolShell from "../ToolShell";

type Distraction = {
  id: string;
  type: string;
  trigger: string;
  duration: number;
  date: string;
  time: string;
  impact: number;
  preventable: boolean;
  notes: string;
  createdAt: number;
};

const STORAGE_KEY = "toolsab-distraction-log-v1";
const LIMIT_KEY = "toolsab-distraction-limit-v1";
const PAGE_SIZE = 10;

const distractionTypes = [
  "Phone",
  "Social media",
  "Messaging",
  "Noise",
  "People",
  "Multitasking",
  "Tiredness",
  "Unexpected interruption",
  "Unplanned browsing",
  "Other",
];

const triggers = [
  "Boredom",
  "Habit",
  "Stress",
  "Curiosity",
  "External interruption",
  "Lack of clarity",
  "Low energy",
  "Procrastination",
  "Other",
];

const typeIcons: Record<string, string> = {
  Phone: "📱",
  "Social media": "💬",
  Messaging: "✉️",
  Noise: "🔊",
  People: "👥",
  Multitasking: "🔀",
  Tiredness: "😴",
  "Unexpected interruption": "⚡",
  "Unplanned browsing": "🌐",
  Other: "•••",
};

const impactLabels = ["", "Minor", "Low", "Moderate", "High", "Severe"];

const pad = (n: number) => String(n).padStart(2, "0");

const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const today = () => toKey(new Date());
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
};

const escapeCsv = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

const dayBlocks = [
  { id: "morning", label: "Morning", range: "5am – 12pm", from: 5, to: 12 },
  { id: "afternoon", label: "Afternoon", range: "12pm – 5pm", from: 12, to: 17 },
  { id: "evening", label: "Evening", range: "5pm – 9pm", from: 17, to: 21 },
  { id: "night", label: "Night", range: "9pm – 5am", from: 21, to: 29 },
];

const blockOf = (time: string) => {
  let h = Number(time.split(":")[0]);
  if (!Number.isFinite(h)) h = 0;
  if (h < 5) h += 24;
  return dayBlocks.find((b) => h >= b.from && h < b.to) ?? dayBlocks[0];
};

function normalize(item: unknown): Distraction | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.type !== "string" ||
    typeof o.trigger !== "string" ||
    typeof o.duration !== "number" ||
    typeof o.date !== "string"
  ) {
    return null;
  }
  return {
    id: o.id,
    type: o.type,
    trigger: o.trigger,
    duration: o.duration,
    date: o.date,
    time: typeof o.time === "string" && /^\d{2}:\d{2}$/.test(o.time) ? o.time : "12:00",
    impact: typeof o.impact === "number" ? clamp(Math.round(o.impact), 1, 5) : 3,
    preventable: typeof o.preventable === "boolean" ? o.preventable : false,
    notes: typeof o.notes === "string" ? o.notes : "",
    createdAt: typeof o.createdAt === "number" ? o.createdAt : Date.now(),
  };
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const groupSum = (
  list: Distraction[],
  key: (e: Distraction) => string,
  value: (e: Distraction) => number
) => {
  const map: Record<string, number> = {};
  list.forEach((e) => {
    const k = key(e);
    map[k] = (map[k] || 0) + value(e);
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
};

export default function DistractionLogTracker() {
  const [entries, setEntries] = useState<Distraction[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [type, setType] = useState("Phone");
  const [trigger, setTrigger] = useState("Habit");
  const [duration, setDuration] = useState("5");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(nowTime());
  const [impact, setImpact] = useState(3);
  const [preventable, setPreventable] = useState(false);
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterTrigger, setFilterTrigger] = useState("All");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const [dailyLimit, setDailyLimit] = useState(60);
  const [limitDraft, setLimitDraft] = useState("60");
  const [editingLimit, setEditingLimit] = useState(false);

  const [undo, setUndo] = useState<Distraction | null>(null);
  const [toast, setToast] = useState("");
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setEntries(
            parsed.map(normalize).filter((x): x is Distraction => x !== null)
          );
        }
      }
      const limit = Number(localStorage.getItem(LIMIT_KEY));
      if (Number.isFinite(limit) && limit > 0) {
        setDailyLimit(limit);
        setLimitDraft(String(limit));
      }
    } catch {
      setEntries([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      setError("Your browser could not save the latest changes.");
    }
  }, [entries, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LIMIT_KEY, String(dailyLimit));
    } catch {
      /* ignore */
    }
  }, [dailyLimit, hydrated]);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  useEffect(() => setVisible(PAGE_SIZE), [search, filterType, filterTrigger, filterPeriod, sortBy]);

  const flash = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  };

  const resetForm = () => {
    setType("Phone");
    setTrigger("Habit");
    setDuration("5");
    setDate(today());
    setTime(nowTime());
    setImpact(3);
    setPreventable(false);
    setNotes("");
    setEditingId(null);
    setError("");
  };

  const openNewForm = (presetType?: string) => {
    resetForm();
    if (presetType) setType(presetType);
    setShowForm(true);
    setTimeout(
      () => document.getElementById("dlt-form-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50
    );
  };

  const saveEntry = () => {
    const minutes = Number(duration);

    if (!date) {
      setError("Please choose a date.");
      return;
    }
    if (!time) {
      setError("Please choose a time.");
      return;
    }
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
      setError("Enter a duration between 1 and 1,440 minutes.");
      return;
    }

    const updated: Distraction = {
      id: editingId ?? makeId(),
      type,
      trigger,
      duration: Math.round(minutes),
      date,
      time,
      impact,
      preventable,
      notes: notes.trim(),
      createdAt: editingId
        ? entries.find((e) => e.id === editingId)?.createdAt ?? Date.now()
        : Date.now(),
    };

    if (editingId) {
      setEntries((c) => c.map((e) => (e.id === editingId ? updated : e)));
      flash("Entry updated");
    } else {
      setEntries((c) => [updated, ...c]);
      flash("Distraction logged");
    }

    setShowForm(false);
    resetForm();
  };

  const editEntry = (entry: Distraction) => {
    setType(entry.type);
    setTrigger(entry.trigger);
    setDuration(String(entry.duration));
    setDate(entry.date);
    setTime(entry.time);
    setImpact(entry.impact);
    setPreventable(entry.preventable);
    setNotes(entry.notes);
    setEditingId(entry.id);
    setError("");
    setShowForm(true);
    setTimeout(
      () => document.getElementById("dlt-form-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50
    );
  };

  const duplicateEntry = (entry: Distraction) => {
    const copy: Distraction = {
      ...entry,
      id: makeId(),
      date: today(),
      time: nowTime(),
      createdAt: Date.now(),
    };
    setEntries((c) => [copy, ...c]);
    flash("Entry duplicated for today");
  };

  const deleteEntry = (entry: Distraction) => {
    setEntries((c) => c.filter((e) => e.id !== entry.id));
    if (editingId === entry.id) {
      resetForm();
      setShowForm(false);
    }
    setUndo(entry);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };

  const undoDelete = () => {
    if (!undo) return;
    setEntries((c) => [undo, ...c]);
    setUndo(null);
    flash("Entry restored");
  };

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const query = search.trim().toLowerCase();

    const list = entries.filter((entry) => {
      if (filterType !== "All" && entry.type !== filterType) return false;
      if (filterTrigger !== "All" && entry.trigger !== filterTrigger) return false;

      if (filterPeriod !== "all") {
        const entryDate = new Date(`${entry.date}T00:00:00`);
        if (filterPeriod === "today" && entry.date !== today()) return false;
        if (filterPeriod === "7days" || filterPeriod === "30days") {
          const start = new Date(startOfToday);
          start.setDate(start.getDate() - (filterPeriod === "7days" ? 6 : 29));
          if (entryDate < start || entryDate > startOfToday) return false;
        }
      }

      if (query) {
        return [entry.type, entry.trigger, entry.notes, entry.date]
          .join(" ")
          .toLowerCase()
          .includes(query);
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === "longest") return b.duration - a.duration || b.createdAt - a.createdAt;
      if (sortBy === "impact") return b.impact - a.impact || b.duration - a.duration;
      const cmp = `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`);
      const result = cmp || b.createdAt - a.createdAt;
      return sortBy === "oldest" ? -result : result;
    });
  }, [entries, filterType, filterTrigger, filterPeriod, search, sortBy]);

  const stats = useMemo(() => {
    const total = filteredEntries.length;
    const minutes = filteredEntries.reduce((s, e) => s + e.duration, 0);
    const byType = groupSum(filteredEntries, (e) => e.type, () => 1);
    const preventableCount = filteredEntries.filter((e) => e.preventable).length;
    const avgImpact = total
      ? filteredEntries.reduce((s, e) => s + e.impact, 0) / total
      : 0;
    return {
      total,
      minutes,
      average: total ? Math.round(minutes / total) : 0,
      mostCommon: byType[0]?.[0] ?? "—",
      mostCommonCount: byType[0]?.[1] ?? 0,
      preventablePct: total ? Math.round((preventableCount / total) * 100) : 0,
      avgImpact,
    };
  }, [filteredEntries]);

  const categoryStats = useMemo(
    () => groupSum(filteredEntries, (e) => e.type, (e) => e.duration),
    [filteredEntries]
  );
  const triggerStats = useMemo(
    () => groupSum(filteredEntries, (e) => e.trigger, (e) => e.duration),
    [filteredEntries]
  );
  const blockStats = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEntries.forEach((e) => {
      const id = blockOf(e.time).id;
      map[id] = (map[id] || 0) + e.duration;
    });
    return dayBlocks.map((b) => ({ ...b, minutes: map[b.id] || 0 }));
  }, [filteredEntries]);

  const trend = useMemo(() => {
    const days: { key: string; label: string; minutes: number; count: number }[] = [];
    const base = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
      days.push({
        key: toKey(d),
        label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2),
        minutes: 0,
        count: 0,
      });
    }
    const lookup = new Map(days.map((d) => [d.key, d]));
    entries.forEach((e) => {
      const day = lookup.get(e.date);
      if (day) {
        day.minutes += e.duration;
        day.count += 1;
      }
    });
    return days;
  }, [entries]);

  const todayStats = useMemo(() => {
    const list = entries.filter((e) => e.date === today());
    const minutes = list.reduce((s, e) => s + e.duration, 0);
    const count = list.length;
    const ratio = dailyLimit ? minutes / dailyLimit : 0;
    const score = Math.round(clamp(100 - ratio * 70 - Math.max(0, count - 3) * 3, 0, 100));
    return { minutes, count, ratio, score };
  }, [entries, dailyLimit]);

  const insights = useMemo(() => {
    const list: { icon: string; title: string; text: string }[] = [];
    if (entries.length < 3) return list;

    const topTrigger = groupSum(entries, (e) => e.trigger, (e) => e.duration)[0];
    if (topTrigger) {
      list.push({
        icon: "🎯",
        title: "Biggest trigger",
        text: `${topTrigger[0]} has cost you ${formatDuration(topTrigger[1])} overall. Planning for it will have the largest payoff.`,
      });
    }

    const blocks = dayBlocks
      .map((b) => ({
        ...b,
        minutes: entries.filter((e) => blockOf(e.time).id === b.id).reduce((s, e) => s + e.duration, 0),
      }))
      .sort((a, b) => b.minutes - a.minutes);
    if (blocks[0].minutes > 0) {
      list.push({
        icon: "⏰",
        title: "Danger zone",
        text: `Most focus is lost in the ${blocks[0].label.toLowerCase()} (${blocks[0].range}). Protect that window with deep-work rules.`,
      });
    }

    const prevMin = entries.filter((e) => e.preventable).reduce((s, e) => s + e.duration, 0);
    const totalMin = entries.reduce((s, e) => s + e.duration, 0);
    if (prevMin > 0 && totalMin > 0) {
      list.push({
        icon: "🛡️",
        title: "Avoidable loss",
        text: `${Math.round((prevMin / totalMin) * 100)}% of lost time was marked preventable, about ${formatDuration(prevMin)} you could win back.`,
      });
    }

    const sum = (from: number, to: number) => {
      const base = new Date();
      let total = 0;
      entries.forEach((e) => {
        const diff = Math.round(
          (new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime() -
            new Date(`${e.date}T00:00:00`).getTime()) / 86_400_000
        );
        if (diff >= from && diff <= to) total += e.duration;
      });
      return total;
    };
    const thisWeek = sum(0, 6);
    const lastWeek = sum(7, 13);
    if (lastWeek > 0) {
      const change = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
      list.push({
        icon: change <= 0 ? "📉" : "📈",
        title: "Week over week",
        text:
          change === 0
            ? "Your distraction time is the same as last week."
            : `Distraction time is ${Math.abs(change)}% ${change < 0 ? "lower" : "higher"} than the previous 7 days.`,
      });
    }
    return list.slice(0, 4);
  }, [entries]);

  const exportCsv = () => {
    if (!entries.length) return;
    const headers = ["Date", "Time", "Distraction", "Trigger", "Duration (minutes)", "Impact (1-5)", "Preventable", "Notes"];
    const rows = entries.map((e) =>
      [e.date, e.time, e.type, e.trigger, e.duration, e.impact, e.preventable ? "Yes" : "No", e.notes]
        .map(escapeCsv)
        .join(",")
    );
    downloadFile(
      [headers.map(escapeCsv).join(","), ...rows].join("\n"),
      "toolsab-distraction-log.csv",
      "text/csv;charset=utf-8"
    );
  };

  const exportJson = () => {
    if (!entries.length) return;
    downloadFile(JSON.stringify(entries, null, 2), "toolsab-distraction-log.json", "application/json");
  };

  const importJson = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error("Invalid");
        const incoming = parsed.map(normalize).filter((x): x is Distraction => x !== null);
        if (!incoming.length) {
          flash("No valid entries found in that file");
          return;
        }
        setEntries((current) => {
          const ids = new Set(current.map((e) => e.id));
          return [...current, ...incoming.filter((e) => !ids.has(e.id))];
        });
        flash(`Imported ${incoming.length} entries`);
      } catch {
        flash("Could not read that JSON file");
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const clearAll = () => {
    if (!entries.length) return;
    if (!window.confirm("Delete all distraction records? This action cannot be undone.")) return;
    setEntries([]);
    resetForm();
    setShowForm(false);
    flash("All records deleted");
  };

  const saveLimit = () => {
    const n = Math.round(Number(limitDraft));
    if (!Number.isFinite(n) || n < 5 || n > 1440) {
      flash("Choose a daily limit between 5 and 1,440 minutes");
      return;
    }
    setDailyLimit(n);
    setEditingLimit(false);
    flash("Daily limit updated");
  };

  if (!hydrated) {
    return (
      <ToolShell title="Distraction Log Tracker" onReset={resetForm}>
        <div style={{ padding: 35, textAlign: "center", color: "#737b88" }}>
          Loading your distraction log...
        </div>
      </ToolShell>
    );
  }

  const scoreColor = todayStats.score >= 75 ? "#22b07d" : todayStats.score >= 45 ? "#f5a524" : "#e5484d";
  const scoreLabel =
    todayStats.count === 0
      ? "Clean slate"
      : todayStats.score >= 75
      ? "Locked in"
      : todayStats.score >= 45
      ? "Drifting"
      : "Needs a reset";
  const maxTrend = Math.max(1, ...trend.map((d) => d.minutes));
  const maxBlock = Math.max(1, ...blockStats.map((b) => b.minutes));
  const limitPct = Math.min(100, Math.round(todayStats.ratio * 100));
  const circumference = 2 * Math.PI * 44;
  const shown = filteredEntries.slice(0, visible);

  return (
    <ToolShell
      title="Distraction Log Tracker"
      onReset={() => {
        resetForm();
        setShowForm(false);
      }}
      wide
    >
      <div className="dlt">
        <style>{`
          .dlt {
            --dlt-accent:#ff5a1f; --dlt-accent2:#ff8a3d; --dlt-ink:#171a21;
            --dlt-muted:#6f7785; --dlt-line:#e8eaf0; --dlt-bg:#f7f8fb;
            color:var(--dlt-ink); width:100%;
          }
          .dlt * { box-sizing:border-box; }
          .dlt button,.dlt input,.dlt select,.dlt textarea { font:inherit; }
          .dlt button:disabled { opacity:.45; cursor:not-allowed; }
          .dlt-hero {
            position:relative; overflow:hidden; border-radius:22px; padding:26px;
            background:radial-gradient(120% 140% at 0% 0%,#2a2f3d 0%,#171a21 60%);
            color:#fff; margin-bottom:18px; box-shadow:0 18px 40px -22px #171a21aa;
            display:grid; grid-template-columns:1fr auto; gap:24px; align-items:center;
          }
          .dlt-hero::after {
            content:""; position:absolute; width:320px; height:320px; right:-90px; top:-120px;
            background:radial-gradient(circle,#ff5a1f66,transparent 65%); pointer-events:none;
          }
          .dlt-hero > * { position:relative; z-index:1; }
          .dlt-eyebrow { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#ffb08f; font-weight:700; margin-bottom:8px; }
          .dlt-hero h2 { font-size:26px; line-height:1.2; margin:0 0 8px; letter-spacing:-.7px; }
          .dlt-hero p { margin:0 0 18px; color:#b9bfcc; font-size:14px; line-height:1.65; max-width:520px; }
          .dlt-actions { display:flex; gap:9px; flex-wrap:wrap; }
          .dlt-btn {
            border:1px solid var(--dlt-line); background:#fff; color:var(--dlt-ink);
            border-radius:11px; padding:10px 15px; cursor:pointer; font-size:13px;
            font-weight:650; transition:.15s ease;
          }
          .dlt-btn:hover:not(:disabled) { border-color:#ffb397; background:#fff8f5; transform:translateY(-1px); }
          .dlt-btn.primary {
            background:linear-gradient(135deg,var(--dlt-accent),var(--dlt-accent2));
            color:#fff; border-color:transparent; box-shadow:0 8px 18px -8px #ff5a1fcc;
          }
          .dlt-btn.primary:hover:not(:disabled) { filter:brightness(1.05); background:linear-gradient(135deg,var(--dlt-accent),var(--dlt-accent2)); }
          .dlt-btn.ghost { background:#ffffff14; color:#fff; border-color:#ffffff30; }
          .dlt-btn.ghost:hover:not(:disabled) { background:#ffffff26; border-color:#ffffff50; }
          .dlt-btn.danger { color:#c43c32; }
          .dlt-btn.small { padding:7px 11px; font-size:12px; }
          .dlt-ring { display:flex; align-items:center; gap:16px; background:#ffffff0f; border:1px solid #ffffff1c; border-radius:18px; padding:16px 20px; backdrop-filter:blur(6px); }
          .dlt-ring-svg { position:relative; width:104px; height:104px; flex-shrink:0; }
          .dlt-ring-svg svg { transform:rotate(-90deg); }
          .dlt-ring-num { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
          .dlt-ring-num b { font-size:28px; letter-spacing:-1px; line-height:1; }
          .dlt-ring-num span { font-size:10px; color:#b9bfcc; margin-top:3px; }
          .dlt-ring-info { min-width:140px; }
          .dlt-ring-info strong { display:block; font-size:15px; margin-bottom:4px; }
          .dlt-ring-info small { color:#b9bfcc; font-size:12px; line-height:1.5; display:block; }
          .dlt-limit-edit { display:flex; gap:6px; margin-top:8px; }
          .dlt-limit-edit input { width:70px; border-radius:8px; border:1px solid #ffffff40; background:#ffffff14; color:#fff; padding:6px 8px; font-size:12px; outline:none; }
          .dlt-link { background:none; border:none; padding:0; color:#ffb08f; font-size:12px; cursor:pointer; margin-top:6px; text-decoration:underline; }
          .dlt-quick { display:flex; gap:8px; overflow-x:auto; padding:2px 2px 10px; margin-bottom:6px; scrollbar-width:thin; }
          .dlt-chip { flex-shrink:0; border:1px solid var(--dlt-line); background:#fff; border-radius:999px; padding:8px 13px; cursor:pointer; font-size:12px; font-weight:650; color:#464d59; transition:.15s; }
          .dlt-chip:hover { border-color:var(--dlt-accent); color:var(--dlt-accent); background:#fff8f5; }
          .dlt-quick-label { flex-shrink:0; font-size:12px; color:var(--dlt-muted); align-self:center; padding-right:2px; }
          .dlt-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-bottom:18px; }
          .dlt-stat { border:1px solid var(--dlt-line); border-radius:16px; padding:16px; background:#fff; min-width:0; box-shadow:0 1px 2px #1b1f2a08; }
          .dlt-stat-label { font-size:12px; color:var(--dlt-muted); margin-bottom:9px; }
          .dlt-stat-value { font-size:25px; font-weight:750; letter-spacing:-.8px; overflow-wrap:anywhere; }
          .dlt-stat-sub { color:var(--dlt-muted); font-size:11px; margin-top:5px; }
          .dlt-grid2 { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(0,1fr); gap:16px; margin-bottom:18px; }
          .dlt-panel { border:1px solid var(--dlt-line); border-radius:18px; padding:18px; background:#fff; margin-bottom:18px; box-shadow:0 1px 2px #1b1f2a08; }
          .dlt-grid2 .dlt-panel { margin-bottom:0; }
          .dlt-panel-title { font-size:15px; font-weight:750; margin:0 0 4px; }
          .dlt-panel-sub { font-size:12px; color:var(--dlt-muted); margin:0 0 16px; }
          .dlt-form-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:13px; }
          .dlt-field { display:flex; flex-direction:column; gap:6px; min-width:0; }
          .dlt-field.full { grid-column:1/-1; }
          .dlt-field label { font-size:12px; font-weight:700; color:#454b55; }
          .dlt-field input,.dlt-field select,.dlt-field textarea,.dlt-search,.dlt-filter {
            width:100%; min-width:0; border:1px solid #dfe2e8; border-radius:10px;
            background:#fff; padding:10px 11px; color:var(--dlt-ink); outline:none; font-size:13px; transition:.15s;
          }
          .dlt-field input:focus,.dlt-field select:focus,.dlt-field textarea:focus,.dlt-search:focus,.dlt-filter:focus { border-color:var(--dlt-accent); box-shadow:0 0 0 3px #ff5a1f1c; }
          .dlt-field textarea { min-height:84px; resize:vertical; }
          .dlt-impact { display:flex; gap:6px; }
          .dlt-impact button { flex:1; border:1px solid #dfe2e8; background:#fff; border-radius:9px; padding:9px 0; cursor:pointer; font-weight:700; font-size:13px; color:#59616d; transition:.15s; }
          .dlt-impact button.on { background:var(--dlt-accent); border-color:var(--dlt-accent); color:#fff; }
          .dlt-impact-label { font-size:11px; color:var(--dlt-muted); }
          .dlt-toggle { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:11px 14px; border:1px solid #dfe2e8; border-radius:12px; cursor:pointer; font-size:13px; user-select:none; background:#fff; transition:.15s; }
          .dlt-toggle:hover { border-color:#ffb397; }
          .dlt-toggle.on { border-color:#ffc5ae; background:#fff8f5; }
          .dlt-toggle-text { display:flex; flex-direction:column; gap:2px; min-width:0; }
          .dlt-toggle-text strong { font-size:13px; font-weight:700; color:#2b303a; }
          .dlt-toggle-text small { font-size:11px; color:var(--dlt-muted); line-height:1.4; }
          .dlt-switch { position:relative; width:46px; height:26px; flex-shrink:0; border:none; padding:0; border-radius:999px; background:#d5d9e1; cursor:pointer; transition:background .2s ease; }
          .dlt-switch::after { content:""; position:absolute; top:3px; left:3px; width:20px; height:20px; border-radius:50%; background:#fff; box-shadow:0 2px 5px #0003; transition:transform .2s ease; }
          .dlt-switch.on { background:linear-gradient(135deg,var(--dlt-accent),var(--dlt-accent2)); }
          .dlt-switch.on::after { transform:translateX(20px); }
          .dlt-switch:focus-visible { outline:none; box-shadow:0 0 0 3px #ff5a1f33; }
          .dlt-form-actions { display:flex; justify-content:flex-end; gap:9px; margin-top:16px; flex-wrap:wrap; }
          .dlt-error { color:#c43c32; font-size:12px; margin-top:10px; }
          .dlt-toolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:14px; }
          .dlt-search-wrap { flex:1 1 220px; }
          .dlt-filter { width:auto; min-width:130px; }
          .dlt-list-head { display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:12px; }
          .dlt-list-head h3 { font-size:15px; margin:0; }
          .dlt-count { color:var(--dlt-muted); font-size:12px; }
          .dlt-entry { border:1px solid var(--dlt-line); border-radius:14px; padding:14px; display:flex; gap:13px; margin-bottom:9px; background:#fff; transition:.15s; }
          .dlt-entry:hover { border-color:#ffd0bd; box-shadow:0 8px 22px -16px #ff5a1f88; }
          .dlt-entry-icon { width:42px; height:42px; border-radius:12px; background:#fff1eb; display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0; }
          .dlt-entry-main { min-width:0; flex:1; }
          .dlt-entry-top { display:flex; align-items:center; flex-wrap:wrap; gap:7px; margin-bottom:6px; }
          .dlt-entry-title { font-weight:700; font-size:14px; margin-right:2px; }
          .dlt-tag { display:inline-flex; align-items:center; border-radius:999px; padding:3px 9px; background:#f2f4f7; color:#555e6b; font-size:11px; font-weight:700; }
          .dlt-tag.warn { background:#fff1eb; color:#c94717; }
          .dlt-tag.good { background:#e8f7f1; color:#157a56; }
          .dlt-entry-meta { color:#59616d; font-size:12px; line-height:1.6; display:flex; gap:12px; flex-wrap:wrap; }
          .dlt-entry-notes { font-size:13px; line-height:1.55; margin:8px 0 0; white-space:pre-wrap; overflow-wrap:anywhere; color:#363c47; }
          .dlt-entry-actions { display:flex; align-items:flex-start; gap:6px; flex-shrink:0; }
          .dlt-icon-btn { border:1px solid var(--dlt-line); background:#fff; border-radius:8px; padding:6px 9px; cursor:pointer; font-size:12px; color:#535b67; }
          .dlt-icon-btn:hover { background:#fff5f0; border-color:#ffc5ae; }
          .dlt-empty { border:1px dashed #dfe2e8; border-radius:14px; padding:35px 18px; text-align:center; color:var(--dlt-muted); font-size:13px; line-height:1.7; }
          .dlt-more { text-align:center; margin-top:12px; }
          .dlt-trend { display:flex; align-items:flex-end; gap:6px; height:150px; }
          .dlt-trend-col { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; gap:6px; min-width:0; }
          .dlt-trend-bar { width:100%; max-width:26px; border-radius:7px 7px 3px 3px; background:linear-gradient(180deg,var(--dlt-accent2),var(--dlt-accent)); min-height:3px; transition:height .3s; }
          .dlt-trend-bar.empty { background:#eceef3; }
          .dlt-trend-bar.today { box-shadow:0 0 0 2px #ff5a1f33; }
          .dlt-trend-label { font-size:10px; color:var(--dlt-muted); }
          .dlt-limit-line { font-size:11px; color:var(--dlt-muted); margin-top:12px; display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap; }
          .dlt-bars { display:flex; flex-direction:column; gap:12px; }
          .dlt-bar-row { display:grid; grid-template-columns:minmax(90px,140px) 1fr 54px; gap:10px; align-items:center; font-size:12px; }
          .dlt-bar-label { overflow-wrap:anywhere; color:#4e5662; }
          .dlt-bar-track { height:9px; background:#f0f1f4; border-radius:20px; overflow:hidden; }
          .dlt-bar-fill { height:100%; background:linear-gradient(90deg,var(--dlt-accent),var(--dlt-accent2)); border-radius:20px; transition:width .3s; }
          .dlt-bar-fill.dark { background:linear-gradient(90deg,#3b4254,#171a21); }
          .dlt-bar-count { text-align:right; color:var(--dlt-muted); white-space:nowrap; }
          .dlt-insights { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:11px; }
          .dlt-insight { display:flex; gap:11px; border:1px solid #ffe2d5; background:linear-gradient(180deg,#fffaf7,#fff7f2); border-radius:14px; padding:13px 14px; }
          .dlt-insight-icon { font-size:20px; line-height:1.2; }
          .dlt-insight strong { display:block; font-size:13px; margin-bottom:3px; }
          .dlt-insight span { font-size:12px; color:#6a4a3b; line-height:1.55; }
          .dlt-block-note { font-size:11px; color:var(--dlt-muted); }
          .dlt-toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%); background:#171a21; color:#fff; padding:11px 16px; border-radius:12px; font-size:13px; display:flex; gap:14px; align-items:center; box-shadow:0 14px 34px -12px #000a; z-index:60; max-width:calc(100vw - 32px); }
          .dlt-toast button { background:none; border:none; color:#ffb08f; font-weight:700; cursor:pointer; font-size:13px; padding:0; }
          .dlt-tip { background:#fff7f2; border:1px solid #ffe2d5; border-radius:12px; padding:13px 15px; color:#78442f; font-size:12px; line-height:1.6; margin-top:16px; }
          @media(max-width:860px) {
            .dlt-hero { grid-template-columns:1fr; }
            .dlt-grid2 { grid-template-columns:1fr; }
            .dlt-grid2 .dlt-panel { margin-bottom:0; }
            .dlt-grid2 { gap:18px; }
            .dlt-form-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
          }
          @media(max-width:760px) { .dlt-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } .dlt-insights { grid-template-columns:1fr; } }
          @media(max-width:520px) {
            .dlt-hero { padding:20px; border-radius:18px; }
            .dlt-hero h2 { font-size:21px; }
            .dlt-stats { gap:8px; }
            .dlt-stat { padding:12px; }
            .dlt-stat-value { font-size:21px; }
            .dlt-form-grid { grid-template-columns:1fr; }
            .dlt-field.full { grid-column:auto; }
            .dlt-entry { flex-wrap:wrap; }
            .dlt-entry-actions { width:100%; justify-content:flex-end; }
            .dlt-filter { flex:1 1 130px; }
            .dlt-bar-row { grid-template-columns:90px 1fr 48px; gap:7px; }
            .dlt-ring { flex-direction:row; }
          }
        `}</style>

        <section className="dlt-hero">
          <div>
            <div className="dlt-eyebrow">Focus intelligence</div>
            <h2>Understand what interrupts your focus</h2>
            <p>
              Capture every distraction in seconds, then uncover the triggers,
              times, and habits that quietly drain your best hours.
            </p>
            <div className="dlt-actions">
              <button className="dlt-btn primary" onClick={() => openNewForm()}>
                + Log distraction
              </button>
              <button className="dlt-btn ghost" onClick={exportCsv} disabled={!entries.length}>
                Export CSV
              </button>
              <button className="dlt-btn ghost" onClick={exportJson} disabled={!entries.length}>
                Export JSON
              </button>
              <button className="dlt-btn ghost" onClick={() => fileRef.current?.click()}>
                Import JSON
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                style={{ display: "none" }}
                onChange={(e) => importJson(e.target.files?.[0])}
              />
            </div>
          </div>

          <div className="dlt-ring">
            <div className="dlt-ring-svg">
              <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true">
                <circle cx="52" cy="52" r="44" fill="none" stroke="#ffffff1f" strokeWidth="9" />
                <circle
                  cx="52"
                  cy="52"
                  r="44"
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - todayStats.score / 100)}
                  style={{ transition: "stroke-dashoffset .5s" }}
                />
              </svg>
              <div className="dlt-ring-num">
                <b>{todayStats.score}</b>
                <span>focus score</span>
              </div>
            </div>
            <div className="dlt-ring-info">
              <strong>{scoreLabel}</strong>
              <small>
                Today: {formatDuration(todayStats.minutes)} lost across {todayStats.count}{" "}
                {todayStats.count === 1 ? "distraction" : "distractions"}
              </small>
              <small>
                Daily limit: {formatDuration(dailyLimit)} ({limitPct}% used)
              </small>
              {editingLimit ? (
                <div className="dlt-limit-edit">
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={limitDraft}
                    onChange={(e) => setLimitDraft(e.target.value)}
                    aria-label="Daily limit in minutes"
                  />
                  <button className="dlt-btn small primary" onClick={saveLimit}>
                    Save
                  </button>
                </div>
              ) : (
                <button className="dlt-link" onClick={() => { setLimitDraft(String(dailyLimit)); setEditingLimit(true); }}>
                  Change daily limit
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="dlt-quick" aria-label="Quick log">
          <span className="dlt-quick-label">Quick log:</span>
          {distractionTypes.slice(0, 8).map((item) => (
            <button key={item} className="dlt-chip" onClick={() => openNewForm(item)}>
              {typeIcons[item]} {item}
            </button>
          ))}
        </div>

        <div className="dlt-stats">
          <div className="dlt-stat">
            <div className="dlt-stat-label">Distractions logged</div>
            <div className="dlt-stat-value">{stats.total}</div>
            <div className="dlt-stat-sub">For the selected view</div>
          </div>
          <div className="dlt-stat">
            <div className="dlt-stat-label">Time lost</div>
            <div className="dlt-stat-value">{formatDuration(stats.minutes)}</div>
            <div className="dlt-stat-sub">Avg {formatDuration(stats.average)} each</div>
          </div>
          <div className="dlt-stat">
            <div className="dlt-stat-label">Preventable</div>
            <div className="dlt-stat-value">{stats.preventablePct}%</div>
            <div className="dlt-stat-sub">
              Avg impact {stats.total ? stats.avgImpact.toFixed(1) : "—"} / 5
            </div>
          </div>
          <div className="dlt-stat">
            <div className="dlt-stat-label">Most common</div>
            <div className="dlt-stat-value" style={{ fontSize: stats.mostCommon.length > 12 ? 17 : 22 }}>
              {stats.mostCommon}
            </div>
            <div className="dlt-stat-sub">
              {stats.mostCommonCount
                ? `${stats.mostCommonCount} logged ${stats.mostCommonCount === 1 ? "time" : "times"}`
                : "No entries yet"}
            </div>
          </div>
        </div>

        {insights.length > 0 && (
          <section className="dlt-panel">
            <h3 className="dlt-panel-title">Smart insights</h3>
            <p className="dlt-panel-sub">Patterns found across your full history.</p>
            <div className="dlt-insights">
              {insights.map((item) => (
                <div className="dlt-insight" key={item.title}>
                  <div className="dlt-insight-icon">{item.icon}</div>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div id="dlt-form-anchor" />
        {showForm && (
          <section className="dlt-panel">
            <h3 className="dlt-panel-title">
              {editingId ? "Edit distraction entry" : "Log a distraction"}
            </h3>
            <p className="dlt-panel-sub">The more honest the detail, the better your insights.</p>
            <div className="dlt-form-grid">
              <div className="dlt-field">
                <label htmlFor="dlt-type">What distracted you?</label>
                <select id="dlt-type" value={type} onChange={(e) => setType(e.target.value)}>
                  {distractionTypes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="dlt-field">
                <label htmlFor="dlt-trigger">What triggered it?</label>
                <select id="dlt-trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
                  {triggers.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="dlt-field">
                <label htmlFor="dlt-duration">Time lost (minutes)</label>
                <input
                  id="dlt-duration"
                  type="number"
                  min="1"
                  max="1440"
                  step="1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>
              <div className="dlt-field">
                <label htmlFor="dlt-date">Date</label>
                <input id="dlt-date" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="dlt-field">
                <label htmlFor="dlt-time">Time of day</label>
                <input id="dlt-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div className="dlt-field">
                <label>
                  Impact on your work <span className="dlt-impact-label">({impactLabels[impact]})</span>
                </label>
                <div className="dlt-impact">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" className={impact === n ? "on" : ""} onClick={() => setImpact(n)} aria-pressed={impact === n}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="dlt-field full">
                <div
                  className={`dlt-toggle${preventable ? " on" : ""}`}
                  onClick={() => setPreventable((v) => !v)}
                >
                  <span className="dlt-toggle-text">
                    <strong>Preventable</strong>
                    <small>I could have avoided this with a small change</small>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={preventable}
                    aria-label="Mark as preventable"
                    className={`dlt-switch${preventable ? " on" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreventable((v) => !v);
                    }}
                  />
                </div>
              </div>
              <div className="dlt-field full">
                <label htmlFor="dlt-notes">Notes (optional)</label>
                <textarea
                  id="dlt-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What were you working on? What happened? Add any detail that may help you understand the interruption."
                />
              </div>
            </div>
            {error && <div className="dlt-error">{error}</div>}
            <div className="dlt-form-actions">
              <button className="dlt-btn" onClick={() => { resetForm(); setShowForm(false); }}>
                Cancel
              </button>
              <button className="dlt-btn primary" onClick={saveEntry}>
                {editingId ? "Save changes" : "Add to log"}
              </button>
            </div>
          </section>
        )}

        <div className="dlt-grid2">
          <section className="dlt-panel">
            <h3 className="dlt-panel-title">Last 14 days</h3>
            <p className="dlt-panel-sub">Minutes lost per day</p>
            <div className="dlt-trend">
              {trend.map((day, i) => (
                <div className="dlt-trend-col" key={day.key} title={`${day.key}: ${formatDuration(day.minutes)} (${day.count})`}>
                  <div
                    className={`dlt-trend-bar${day.minutes ? "" : " empty"}${i === trend.length - 1 ? " today" : ""}`}
                    style={{ height: day.minutes ? `${Math.max(6, (day.minutes / maxTrend) * 100)}%` : 3 }}
                  />
                  <span className="dlt-trend-label">{day.label}</span>
                </div>
              ))}
            </div>
            <div className="dlt-limit-line">
              <span>Peak day: {formatDuration(Math.max(0, ...trend.map((d) => d.minutes)))}</span>
              <span>14-day total: {formatDuration(trend.reduce((s, d) => s + d.minutes, 0))}</span>
            </div>
          </section>

          <section className="dlt-panel">
            <h3 className="dlt-panel-title">When you lose focus</h3>
            <p className="dlt-panel-sub">Time lost by part of the day</p>
            <div className="dlt-bars">
              {blockStats.map((b) => (
                <div className="dlt-bar-row" key={b.id}>
                  <span className="dlt-bar-label">
                    {b.label}
                    <br />
                    <span className="dlt-block-note">{b.range}</span>
                  </span>
                  <div className="dlt-bar-track">
                    <div className="dlt-bar-fill dark" style={{ width: `${(b.minutes / maxBlock) * 100}%` }} />
                  </div>
                  <span className="dlt-bar-count">{formatDuration(b.minutes)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div style={{ height: 18 }} />

        <section className="dlt-panel">
          <div className="dlt-toolbar">
            <div className="dlt-search-wrap">
              <input
                className="dlt-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search type, trigger, notes, or date..."
                aria-label="Search distraction entries"
              />
            </div>
            <select className="dlt-filter" value={filterType} onChange={(e) => setFilterType(e.target.value)} aria-label="Filter by distraction type">
              <option value="All">All types</option>
              {distractionTypes.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select className="dlt-filter" value={filterTrigger} onChange={(e) => setFilterTrigger(e.target.value)} aria-label="Filter by trigger">
              <option value="All">All triggers</option>
              {triggers.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select className="dlt-filter" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} aria-label="Filter by date range">
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
            </select>
            <select className="dlt-filter" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort entries">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="longest">Longest duration</option>
              <option value="impact">Highest impact</option>
            </select>
          </div>

          <div className="dlt-list-head">
            <h3>Your distraction log</h3>
            <span className="dlt-count">
              Showing {shown.length} of {filteredEntries.length}
              {filteredEntries.length !== entries.length ? ` (${entries.length} total)` : ""}
            </span>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="dlt-empty">
              {entries.length === 0 ? (
                <>
                  <strong>No distractions logged yet.</strong>
                  <br />
                  Add your first entry to start noticing what interrupts your focus.
                  <br />
                  <button className="dlt-btn primary" style={{ marginTop: 13 }} onClick={() => openNewForm()}>
                    Log your first distraction
                  </button>
                </>
              ) : (
                <>
                  <strong>No matching entries found.</strong>
                  <br />
                  Try changing your search or filters.
                </>
              )}
            </div>
          ) : (
            <>
              {shown.map((entry) => (
                <article className="dlt-entry" key={entry.id}>
                  <div className="dlt-entry-icon" aria-hidden="true">{typeIcons[entry.type] ?? "•"}</div>
                  <div className="dlt-entry-main">
                    <div className="dlt-entry-top">
                      <span className="dlt-entry-title">{entry.type}</span>
                      <span className="dlt-tag">{entry.trigger}</span>
                      <span className="dlt-tag warn">Impact {entry.impact}/5</span>
                      {entry.preventable && <span className="dlt-tag good">Preventable</span>}
                    </div>
                    <div className="dlt-entry-meta">
                      <span>
                        {new Date(`${entry.date}T00:00:00`).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {entry.time}
                      </span>
                      <span>
                        Time lost: <strong>{formatDuration(entry.duration)}</strong>
                      </span>
                    </div>
                    {entry.notes && <p className="dlt-entry-notes">{entry.notes}</p>}
                  </div>
                  <div className="dlt-entry-actions">
                    <button className="dlt-icon-btn" onClick={() => duplicateEntry(entry)} aria-label="Duplicate entry">
                      Repeat
                    </button>
                    <button className="dlt-icon-btn" onClick={() => editEntry(entry)} aria-label="Edit entry">
                      Edit
                    </button>
                    <button className="dlt-icon-btn" onClick={() => deleteEntry(entry)} aria-label="Delete entry">
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              {visible < filteredEntries.length && (
                <div className="dlt-more">
                  <button className="dlt-btn" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    Show more ({filteredEntries.length - visible} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <div className="dlt-grid2">
          <section className="dlt-panel">
            <h3 className="dlt-panel-title">Time lost by category</h3>
            <p className="dlt-panel-sub">Based on the current filters</p>
            {categoryStats.length === 0 ? (
              <div className="dlt-empty">Your category breakdown will appear after you log a distraction.</div>
            ) : (
              <div className="dlt-bars">
                {categoryStats.map(([category, minutes]) => (
                  <div className="dlt-bar-row" key={category}>
                    <span className="dlt-bar-label">{typeIcons[category] ?? "•"} {category}</span>
                    <div className="dlt-bar-track">
                      <div className="dlt-bar-fill" style={{ width: `${(minutes / stats.minutes) * 100}%` }} />
                    </div>
                    <span className="dlt-bar-count">{formatDuration(minutes)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="dlt-panel">
            <h3 className="dlt-panel-title">Time lost by trigger</h3>
            <p className="dlt-panel-sub">What sets distractions off</p>
            {triggerStats.length === 0 ? (
              <div className="dlt-empty">Trigger patterns will appear here.</div>
            ) : (
              <div className="dlt-bars">
                {triggerStats.map(([name, minutes]) => (
                  <div className="dlt-bar-row" key={name}>
                    <span className="dlt-bar-label">{name}</span>
                    <div className="dlt-bar-track">
                      <div className="dlt-bar-fill dark" style={{ width: `${(minutes / stats.minutes) * 100}%` }} />
                    </div>
                    <span className="dlt-bar-count">{formatDuration(minutes)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="dlt-tip">
          <strong>A small habit that helps:</strong> Log distractions honestly, even
          when they seem minor. After a few days, review your triggers and the
          times of day you drift, then design one small barrier for the biggest one.
        </div>

        <div className="dlt-actions" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button className="dlt-btn danger" onClick={clearAll} disabled={!entries.length}>
            Clear all records
          </button>
        </div>

        {(undo || toast) && (
          <div className="dlt-toast" role="status">
            {undo ? (
              <>
                <span>Entry deleted</span>
                <button onClick={undoDelete}>Undo</button>
              </>
            ) : (
              <span>{toast}</span>
            )}
          </div>
        )}
      </div>
    </ToolShell>
  );
}