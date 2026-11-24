"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ToolShell from "../ToolShell";

type SessionStatus = "Upcoming" | "Completed" | "Cancelled";

type StudySession = {
  id: string;
  title: string;
  subject: string;
  date: string;
  startTime: string;
  duration: number;
  leader: string;
  location: string;
  participants: string[];
  topics: string[];
  agenda: string[];
  notes: string;
  actionItems: string[];
  actionsDone: string[];
  status: SessionStatus;
  createdAt: number;
};

const STORAGE_KEY = "toolsab-study-group-sessions-v1";

const statusOptions: SessionStatus[] = ["Upcoming", "Completed", "Cancelled"];

const pad = (n: number) => String(n).padStart(2, "0");

const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const today = () => toKey(new Date());

const createId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const splitLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const formatDuration = (minutes: number) => {
  const safe = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
  const hours = Math.floor(safe / 60);
  const remaining = safe % 60;
  if (!hours) return `${remaining} min`;
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
};

const formatDate = (value: string) => {
  if (!value) return "Date not set";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Date not set";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const buildStart = (date: string, time: string) =>
  new Date(`${date}T${time || "00:00"}:00`);

const isValidDateTime = (date: string, time: string) => {
  if (!date || !time) return false;
  const d = buildStart(date, time);
  return !Number.isNaN(d.getTime());
};

const startOf = (s: StudySession) => buildStart(s.date, s.startTime);

const endOf = (s: StudySession) => {
  const start = startOf(s).getTime();
  const mins = Number.isFinite(s.duration) && s.duration > 0 ? s.duration : 0;
  return new Date(start + mins * 60_000);
};

const escapeCsv = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`;

const countdown = (ms: number) => {
  const mins = Math.max(0, Math.ceil(ms / 60_000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
};

const subjectHue = (subject: string) => {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = (hash * 31 + subject.charCodeAt(i)) % 360;
  }
  return hash;
};

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];

const dedupeLines = (arr: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

const dedupeNames = (names: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
};

function normalize(item: unknown): StudySession | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.title !== "string" ||
    typeof o.subject !== "string" ||
    typeof o.date !== "string" ||
    typeof o.startTime !== "string" ||
    typeof o.status !== "string" ||
    !statusOptions.includes(o.status as SessionStatus)
  ) {
    return null;
  }

  const duration =
    typeof o.duration === "number" &&
    Number.isFinite(o.duration) &&
    o.duration >= 5 &&
    o.duration <= 1440
      ? Math.round(o.duration)
      : 60;

  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(o.date);
  const timeOk = /^\d{2}:\d{2}$/.test(o.startTime);
  if (!dateOk || !timeOk) return null;
  if (!isValidDateTime(o.date, o.startTime)) return null;

  const actionItems = dedupeLines(toStringArray(o.actionItems));

  return {
    id: o.id,
    title: o.title,
    subject: o.subject,
    date: o.date,
    startTime: o.startTime,
    duration,
    leader: typeof o.leader === "string" ? o.leader : "",
    location: typeof o.location === "string" ? o.location : "",
    participants: dedupeNames(toStringArray(o.participants)),
    topics: toStringArray(o.topics),
    agenda: toStringArray(o.agenda),
    notes: typeof o.notes === "string" ? o.notes : "",
    actionItems,
    actionsDone: toStringArray(o.actionsDone).filter((a) =>
      actionItems.includes(a)
    ),
    status: o.status as SessionStatus,
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

const icsDateUtc = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(
    d.getUTCDate()
  )}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(
    d.getUTCSeconds()
  )}Z`;

const icsDateLocal = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(
    d.getHours()
  )}${pad(d.getMinutes())}00`;

const icsText = (v: string) =>
  v
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

// RFC 5545 line folding: 75 octets max, continuation lines start with a space.
const foldIcsLine = (line: string) => {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  const limit = 73; // leave 2 for potential multi-byte chars safety margin on first line
  for (const ch of line) {
    const charBytes = new TextEncoder().encode(ch).length;
    if (currentBytes + charBytes > limit) {
      parts.push(current);
      current = ch;
      currentBytes = charBytes;
    } else {
      current += ch;
      currentBytes += charBytes;
    }
  }
  if (current) parts.push(current);
  return parts.join("\r\n ");
};

const emptyForm = {
  title: "",
  subject: "",
  date: today(),
  startTime: "10:00",
  duration: "60",
  leader: "",
  location: "",
  participants: "",
  topics: "",
  agenda: "",
  notes: "",
  actionItems: "",
  status: "Upcoming" as SessionStatus,
};

export default function StudyGroupSessionPlanner() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState("soonest");
  const [openIds, setOpenIds] = useState<string[]>([]);

  const [now, setNow] = useState(() => Date.now());
  const [undo, setUndo] = useState<StudySession | null>(null);
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
          setSessions(
            parsed.map(normalize).filter((x): x is StudySession => x !== null)
          );
        }
      }
    } catch {
      setSessions([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      setError("Your browser could not save the latest changes.");
    }
  }, [sessions, hydrated]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Refresh "now" when the tab regains focus, so countdowns / overdue badges
  // are correct after the device has been asleep or backgrounded.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const flash = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  };

  const clearUndo = () => {
    setUndo(null);
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
  };

  const resetForm = () => {
    setForm({ ...emptyForm, date: today() });
    setEditingId(null);
    setError("");
  };

  const updateForm = <K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K]
  ) => setForm((current) => ({ ...current, [key]: value }));

  const scrollToForm = () =>
    setTimeout(
      () =>
        document
          .getElementById("sgp-form-anchor")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50
    );

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
    scrollToForm();
  };

  const formConflicts = useMemo(() => {
    const minutes = Number(form.duration);
    if (
      !form.date ||
      !form.startTime ||
      !Number.isFinite(minutes) ||
      minutes <= 0
    )
      return [];
    if (!isValidDateTime(form.date, form.startTime)) return [];
    const start = buildStart(form.date, form.startTime).getTime();
    const end = start + minutes * 60_000;
    return sessions.filter(
      (s) =>
        s.id !== editingId &&
        s.status !== "Cancelled" &&
        startOf(s).getTime() < end &&
        endOf(s).getTime() > start
    );
  }, [form.date, form.startTime, form.duration, sessions, editingId]);

  const saveSession = () => {
    const title = form.title.trim();
    const subject = form.subject.trim();
    const minutes = Number(form.duration);

    if (!title) return setError("Please enter a session title.");
    if (!subject) return setError("Please enter a subject.");
    if (!form.date || !form.startTime)
      return setError("Please choose a date and start time.");
    if (!isValidDateTime(form.date, form.startTime))
      return setError("Please choose a valid date and start time.");
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440) {
      return setError("Enter a session duration between 5 and 1,440 minutes.");
    }

    const participants = dedupeNames(
      form.participants
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    );

    const existing = sessions.find((item) => item.id === editingId);
    const actionItems = dedupeLines(splitLines(form.actionItems));

    const session: StudySession = {
      id: editingId ?? createId(),
      title,
      subject,
      date: form.date,
      startTime: form.startTime,
      duration: minutes,
      leader: form.leader.trim(),
      location: form.location.trim(),
      participants,
      topics: splitLines(form.topics),
      agenda: splitLines(form.agenda),
      notes: form.notes.trim(),
      actionItems,
      actionsDone: (existing?.actionsDone ?? []).filter((a) =>
        actionItems.includes(a)
      ),
      status: form.status,
      createdAt: existing?.createdAt ?? Date.now(),
    };

    if (editingId) {
      setSessions((current) =>
        current.map((item) => (item.id === editingId ? session : item))
      );
      flash("Session updated");
    } else {
      setSessions((current) => [session, ...current]);
      flash("Session planned");
    }

    clearUndo();
    setOpenIds((ids) => (ids.includes(session.id) ? ids : [...ids, session.id]));
    setShowForm(false);
    resetForm();
  };

  const editSession = (session: StudySession) => {
    setForm({
      title: session.title,
      subject: session.subject,
      date: session.date,
      startTime: session.startTime,
      duration: String(session.duration),
      leader: session.leader,
      location: session.location,
      participants: session.participants.join(", "),
      topics: session.topics.join("\n"),
      agenda: session.agenda.join("\n"),
      notes: session.notes,
      actionItems: session.actionItems.join("\n"),
      status: session.status,
    });
    setEditingId(session.id);
    setShowForm(true);
    setError("");
    scrollToForm();
  };

  const repeatWeekly = (session: StudySession) => {
    const base = new Date(`${session.date}T00:00:00`);
    if (Number.isNaN(base.getTime())) return;
    // Guard against DST shifts: rebuild date components at noon, add 7 days,
    // then format back to YYYY-MM-DD.
    const noon = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      12,
      0,
      0
    );
    noon.setDate(noon.getDate() + 7);
    const copy: StudySession = {
      ...session,
      id: createId(),
      date: toKey(noon),
      status: "Upcoming",
      actionsDone: [],
      createdAt: Date.now(),
    };
    setSessions((current) => [copy, ...current]);
    clearUndo();
    flash(`Repeated for ${formatDate(copy.date)}`);
  };

  const deleteSession = (session: StudySession) => {
    setSessions((current) => current.filter((item) => item.id !== session.id));
    setOpenIds((ids) => ids.filter((id) => id !== session.id));
    if (editingId === session.id) {
      resetForm();
      setShowForm(false);
    }
    setUndo(session);
    setToast("");
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };

  const undoDelete = () => {
    if (!undo) return;
    const restored = undo;
    setSessions((current) => [restored, ...current]);
    setUndo(null);
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    flash("Session restored");
  };

  const updateStatus = (id: string, status: SessionStatus) =>
    setSessions((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );

  const toggleAction = (id: string, action: string) =>
    setSessions((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              actionsDone: item.actionsDone.includes(action)
                ? item.actionsDone.filter((a) => a !== action)
                : [...item.actionsDone, action],
            }
          : item
      )
    );

  const toggleOpen = (id: string) =>
    setOpenIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );

  const copyInvite = async (s: StudySession) => {
    const lines = [
      `📚 ${s.title}`,
      `Subject: ${s.subject}`,
      `When: ${formatDate(s.date)} at ${s.startTime} (${formatDuration(
        s.duration
      )})`,
      s.location ? `Where: ${s.location}` : "",
      s.leader ? `Leader: ${s.leader}` : "",
      s.participants.length ? `Who: ${s.participants.join(", ")}` : "",
      s.agenda.length
        ? `\nAgenda:\n${s.agenda.map((a, i) => `${i + 1}. ${a}`).join("\n")}`
        : "",
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      flash("Invite copied to clipboard");
    } catch {
      flash("Could not copy. Your browser blocked clipboard access.");
    }
  };

  const exportIcs = (s: StudySession) => {
    const rawLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ToolsAB//Study Group Planner//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${s.id}@toolsab`,
      `DTSTAMP:${icsDateUtc(new Date())}`,
      `DTSTART:${icsDateLocal(startOf(s))}`,
      `DTEND:${icsDateLocal(endOf(s))}`,
      `SUMMARY:${icsText(s.title)}`,
      s.location ? `LOCATION:${icsText(s.location)}` : "",
      `DESCRIPTION:${icsText(
        [
          `Subject: ${s.subject}`,
          s.agenda.length ? `Agenda: ${s.agenda.join("; ")}` : "",
          s.notes,
        ]
          .filter(Boolean)
          .join("\n")
      )}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean);

    const ics = rawLines.map(foldIcsLine).join("\r\n");
    downloadFile(
      ics,
      `${s.title.replace(/[^\w]+/g, "-").toLowerCase() || "session"}.ics`,
      "text/calendar"
    );
  };

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(sessions.map((s) => s.subject.trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sessions
      .filter((s) => {
        if (filterStatus !== "All" && s.status !== filterStatus) return false;
        if (filterSubject !== "All" && s.subject !== filterSubject) return false;
        if (filterDay && s.date !== filterDay) return false;
        if (!query) return true;
        return [
          s.title,
          s.subject,
          s.leader,
          s.location,
          s.participants.join(" "),
          s.topics.join(" "),
          s.agenda.join(" "),
          s.notes,
          s.actionItems.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        if (sortOrder === "title") return a.title.localeCompare(b.title);
        const diff = startOf(a).getTime() - startOf(b).getTime();
        return sortOrder === "latest" ? -diff : diff;
      });
  }, [sessions, search, filterStatus, filterSubject, filterDay, sortOrder]);

  const upcomingList = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "Upcoming" && endOf(s).getTime() >= now)
        .sort((a, b) => startOf(a).getTime() - startOf(b).getTime()),
    [sessions, now]
  );
  const nextSession = upcomingList[0];

  const stats = useMemo(() => {
    const completed = sessions.filter((s) => s.status === "Completed");
    const minutes = completed.reduce(
      (sum, s) => sum + (Number.isFinite(s.duration) ? s.duration : 0),
      0
    );
    const totalActions = sessions.reduce(
      (sum, s) => sum + s.actionItems.length,
      0
    );
    const doneActions = sessions.reduce(
      (sum, s) => sum + s.actionsDone.length,
      0
    );
    return {
      total: sessions.length,
      upcoming: upcomingList.length,
      completed: completed.length,
      minutes,
      openTasks: totalActions - doneActions,
      taskPct: totalActions
        ? Math.round((doneActions / totalActions) * 100)
        : 0,
    };
  }, [sessions, upcomingList]);

  const week = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const key = toKey(d);
      return {
        key,
        weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
        day: d.getDate(),
        count: sessions.filter((s) => s.date === key && s.status !== "Cancelled")
          .length,
        isToday: i === 0,
      };
    });
  }, [sessions]);

  const subjectStats = useMemo(() => {
    const map: Record<string, number> = {};
    sessions
      .filter((s) => s.status !== "Cancelled")
      .forEach((s) => {
        const mins = Number.isFinite(s.duration) ? s.duration : 0;
        map[s.subject] = (map[s.subject] || 0) + mins;
      });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [sessions]);

  const members = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    sessions
      .filter((s) => s.status !== "Cancelled")
      .forEach((s) => {
        s.participants.forEach((name) => {
          const key = name.toLowerCase();
          const entry = map.get(key) ?? { name, count: 0 };
          entry.count += 1;
          map.set(key, entry);
        });
      });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [sessions]);

  const exportCsv = () => {
    if (!sessions.length) return;
    const headers = [
      "Title",
      "Subject",
      "Date",
      "Start time",
      "Duration (minutes)",
      "Status",
      "Leader",
      "Location",
      "Participants",
      "Topics",
      "Agenda",
      "Notes",
      "Action items",
      "Completed action items",
    ];
    const rows = sessions.map((s) =>
      [
        s.title,
        s.subject,
        s.date,
        s.startTime,
        s.duration,
        s.status,
        s.leader,
        s.location,
        s.participants.join("; "),
        s.topics.join("; "),
        s.agenda.join("; "),
        s.notes,
        s.actionItems.join("; "),
        s.actionsDone.join("; "),
      ]
        .map(escapeCsv)
        .join(",")
    );
    downloadFile(
      [headers.map(escapeCsv).join(","), ...rows].join("\n"),
      "toolsab-study-group-sessions.csv",
      "text/csv;charset=utf-8"
    );
  };

  const exportJson = () => {
    if (!sessions.length) return;
    downloadFile(
      JSON.stringify(sessions, null, 2),
      "toolsab-study-group-sessions.json",
      "application/json"
    );
  };

  const importJson = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error("Invalid");
        const incoming = parsed
          .map(normalize)
          .filter((x): x is StudySession => x !== null);
        if (!incoming.length) return flash("No valid sessions found in that file");
        setSessions((current) => {
          const ids = new Set(current.map((s) => s.id));
          return [...current, ...incoming.filter((s) => !ids.has(s.id))];
        });
        clearUndo();
        flash(`Imported ${incoming.length} sessions`);
      } catch {
        flash("Could not read that JSON file");
      }
    };
    reader.onerror = () => flash("Could not read that JSON file");
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const clearAll = () => {
    if (!sessions.length) return;
    if (
      !window.confirm(
        "Delete all study sessions? This action cannot be undone."
      )
    )
      return;
    setSessions([]);
    setOpenIds([]);
    setShowForm(false);
    resetForm();
    clearUndo();
    setToast("");
    flash("All sessions deleted");
  };

  if (!hydrated) {
    return (
      <ToolShell title="Study Group Session Planner" onReset={resetForm}>
        <div style={{ padding: 35, textAlign: "center", color: "#737b88" }}>
          Loading your study sessions...
        </div>
      </ToolShell>
    );
  }

  const maxSubject = Math.max(1, ...subjectStats.map(([, m]) => m));
  const nextStart = nextSession ? startOf(nextSession).getTime() : 0;
  const nextLive = nextSession && nextStart <= now;

  return (
    <ToolShell
      title="Study Group Session Planner"
      onReset={() => {
        resetForm();
        setShowForm(false);
      }}
      wide
    >
      <div className="sgp">
        <style>{`
          .sgp { --a:#ff5a1f; --a2:#ff8a3d; --ink:#171a21; --muted:#6f7785; --line:#e8eaf0; color:var(--ink); width:100%; }
          .sgp * { box-sizing:border-box; }
          .sgp button,.sgp input,.sgp select,.sgp textarea { font:inherit; }
          .sgp button:disabled { opacity:.45; cursor:not-allowed; }
          .sgp-hero { position:relative; overflow:hidden; border-radius:22px; padding:26px; margin-bottom:18px; color:#fff;
            background:radial-gradient(120% 140% at 0% 0%,#2a2f3d 0%,#171a21 60%); box-shadow:0 18px 40px -22px #171a21aa;
            display:grid; grid-template-columns:1fr minmax(240px,320px); gap:24px; align-items:center; }
          .sgp-hero::after { content:""; position:absolute; width:320px; height:320px; right:-90px; top:-120px; background:radial-gradient(circle,#ff5a1f66,transparent 65%); pointer-events:none; }
          .sgp-hero > * { position:relative; z-index:1; }
          .sgp-eyebrow { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#ffb08f; font-weight:700; margin-bottom:8px; }
          .sgp-hero h2 { font-size:26px; line-height:1.2; margin:0 0 8px; letter-spacing:-.7px; }
          .sgp-hero p { margin:0 0 18px; color:#b9bfcc; font-size:14px; line-height:1.65; max-width:500px; }
          .sgp-actions { display:flex; gap:9px; flex-wrap:wrap; }
          .sgp-btn { border:1px solid var(--line); background:#fff; color:var(--ink); border-radius:11px; padding:10px 15px; cursor:pointer; font-size:13px; font-weight:650; transition:.15s ease; }
          .sgp-btn:hover:not(:disabled) { border-color:#ffb397; background:#fff8f5; transform:translateY(-1px); }
          .sgp-btn.primary { background:linear-gradient(135deg,var(--a),var(--a2)); color:#fff; border-color:transparent; box-shadow:0 8px 18px -8px #ff5a1fcc; }
          .sgp-btn.primary:hover:not(:disabled) { filter:brightness(1.05); background:linear-gradient(135deg,var(--a),var(--a2)); }
          .sgp-btn.ghost { background:#ffffff14; color:#fff; border-color:#ffffff30; }
          .sgp-btn.ghost:hover:not(:disabled) { background:#ffffff26; border-color:#ffffff50; }
          .sgp-btn.danger { color:#c43c32; }
          .sgp-next { background:#ffffff0f; border:1px solid #ffffff1c; border-radius:18px; padding:18px; backdrop-filter:blur(6px); }
          .sgp-next-label { font-size:11px; color:#ffb08f; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin-bottom:8px; }
          .sgp-next-title { font-size:16px; font-weight:750; margin-bottom:4px; overflow-wrap:anywhere; }
          .sgp-next-meta { font-size:12px; color:#b9bfcc; line-height:1.6; }
          .sgp-next-count { font-size:30px; font-weight:800; letter-spacing:-1px; margin:10px 0 2px; background:linear-gradient(135deg,#fff,#ffc7ad); -webkit-background-clip:text; background-clip:text; color:transparent; }
          .sgp-live { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#7ff0bd; }
          .sgp-live::before { content:""; width:8px; height:8px; border-radius:50%; background:#34d399; box-shadow:0 0 0 4px #34d39933; }
          .sgp-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-bottom:18px; }
          .sgp-stat { border:1px solid var(--line); border-radius:16px; padding:16px; background:#fff; min-width:0; box-shadow:0 1px 2px #1b1f2a08; }
          .sgp-stat-label { font-size:12px; color:var(--muted); margin-bottom:9px; }
          .sgp-stat-value { font-size:25px; font-weight:750; letter-spacing:-.8px; }
          .sgp-stat-sub { color:var(--muted); font-size:11px; margin-top:5px; }
          .sgp-panel { border:1px solid var(--line); border-radius:18px; padding:18px; background:#fff; margin-bottom:18px; box-shadow:0 1px 2px #1b1f2a08; }
          .sgp-panel-title { font-size:15px; font-weight:750; margin:0 0 4px; }
          .sgp-panel-sub { font-size:12px; color:var(--muted); margin:0 0 16px; }
          .sgp-week { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:8px; }
          .sgp-day { border:1px solid var(--line); background:#fff; border-radius:14px; padding:10px 4px; cursor:pointer; text-align:center; transition:.15s; }
          .sgp-day:hover { border-color:#ffb397; background:#fff8f5; }
          .sgp-day.on { background:linear-gradient(135deg,var(--a),var(--a2)); border-color:transparent; color:#fff; }
          .sgp-day small { display:block; font-size:10px; opacity:.75; text-transform:uppercase; letter-spacing:.05em; }
          .sgp-day b { display:block; font-size:17px; margin:3px 0; }
          .sgp-day span { display:inline-block; min-width:18px; font-size:10px; font-weight:700; border-radius:999px; padding:2px 6px; background:#f2f4f7; color:#59616d; }
          .sgp-day.on span { background:#ffffff33; color:#fff; }
          .sgp-day.today b { text-decoration:underline; text-decoration-color:var(--a); text-underline-offset:4px; }
          .sgp-day span.zero { background:transparent; opacity:.4; }
          .sgp-form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:13px; }
          .sgp-field { display:flex; flex-direction:column; gap:6px; min-width:0; }
          .sgp-field.full { grid-column:1/-1; }
          .sgp-field label { font-size:12px; font-weight:700; color:#454b55; }
          .sgp-field input,.sgp-field select,.sgp-field textarea,.sgp-search,.sgp-filter { width:100%; min-width:0; border:1px solid #dfe2e8; border-radius:10px; background:#fff; padding:10px 11px; color:var(--ink); outline:none; font-size:13px; transition:.15s; }
          .sgp-field textarea { min-height:80px; resize:vertical; }
          .sgp-field input:focus,.sgp-field select:focus,.sgp-field textarea:focus,.sgp-search:focus,.sgp-filter:focus { border-color:var(--a); box-shadow:0 0 0 3px #ff5a1f1c; }
          .sgp-hint { color:var(--muted); font-size:11px; line-height:1.5; }
          .sgp-warn { background:#fff8e6; border:1px solid #ffe2a0; color:#7a5a05; border-radius:11px; padding:10px 13px; font-size:12px; line-height:1.55; margin-top:13px; }
          .sgp-form-actions { display:flex; justify-content:flex-end; gap:9px; margin-top:16px; flex-wrap:wrap; }
          .sgp-error { color:#c43c32; font-size:12px; margin-top:10px; }
          .sgp-toolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:14px; }
          .sgp-search-wrap { flex:1 1 220px; }
          .sgp-filter { width:auto; min-width:135px; }
          .sgp-list-head { display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:12px; flex-wrap:wrap; }
          .sgp-list-head h3 { font-size:15px; margin:0; }
          .sgp-count { color:var(--muted); font-size:12px; }
          .sgp-chip { display:inline-flex; align-items:center; gap:6px; border:1px solid #ffc5ae; background:#fff5f0; color:#c94717; border-radius:999px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer; margin-left:8px; }
          .sgp-session { border:1px solid var(--line); border-left:4px solid hsl(var(--h) 75% 55%); border-radius:14px; padding:15px; margin-bottom:10px; background:#fff; transition:.15s; }
          .sgp-session:hover { box-shadow:0 10px 24px -18px #171a2188; }
          .sgp-session.done { background:#fbfcfb; }
          .sgp-session.cancelled { opacity:.7; }
          .sgp-session-top { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
          .sgp-session-title { font-size:15px; font-weight:750; margin:0 0 6px; overflow-wrap:anywhere; }
          .sgp-session-sub { font-size:12px; color:var(--muted); line-height:1.7; }
          .sgp-badges { display:flex; gap:7px; flex-wrap:wrap; margin-top:9px; align-items:center; }
          .sgp-badge { display:inline-flex; align-items:center; border-radius:999px; padding:4px 9px; background:#fff1eb; color:#c94717; font-size:11px; font-weight:700; }
          .sgp-badge.subject { background:hsl(var(--h) 80% 94%); color:hsl(var(--h) 60% 32%); }
          .sgp-badge.completed { background:#eaf7ef; color:#287447; }
          .sgp-badge.cancelled { background:#f2f3f5; color:#66707d; }
          .sgp-badge.neutral { background:#f2f4f7; color:#555e6b; }
          .sgp-badge.alert { background:#fff0f0; color:#c43c32; }
          .sgp-session-buttons { display:flex; gap:6px; flex-wrap:wrap; }
          .sgp-small-btn { border:1px solid var(--line); background:#fff; border-radius:8px; padding:7px 10px; cursor:pointer; font-size:11px; font-weight:600; color:#535b67; }
          .sgp-small-btn:hover { background:#fff5f0; border-color:#ffc5ae; }
          .sgp-session-details { border-top:1px solid var(--line); margin-top:13px; padding-top:13px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
          .sgp-detail-label { font-size:11px; font-weight:700; color:var(--muted); margin-bottom:5px; text-transform:uppercase; letter-spacing:.05em; }
          .sgp-detail-value { font-size:12px; line-height:1.6; color:#424a55; overflow-wrap:anywhere; white-space:pre-wrap; }
          .sgp-detail-value ul,.sgp-detail-value ol { margin:4px 0 0; padding-left:18px; }
          .sgp-detail-value li { margin:3px 0; }
          .sgp-tasks { display:flex; flex-direction:column; gap:6px; }
          .sgp-task { display:flex; gap:9px; align-items:flex-start; font-size:12px; line-height:1.5; cursor:pointer; padding:7px 9px; border-radius:9px; border:1px solid var(--line); }
          .sgp-task:hover { background:#fff8f5; }
          .sgp-task input { margin-top:2px; accent-color:var(--a); }
          .sgp-task.done span { text-decoration:line-through; color:var(--muted); }
          .sgp-progress { height:6px; background:#f0f1f4; border-radius:20px; overflow:hidden; margin-bottom:8px; }
          .sgp-progress div { height:100%; background:linear-gradient(90deg,var(--a),var(--a2)); border-radius:20px; transition:width .3s; }
          .sgp-session-footer { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:12px; }
          .sgp-seg { display:inline-flex; background:#f3f4f7; border-radius:10px; padding:3px; gap:2px; }
          .sgp-seg button { border:none; background:transparent; border-radius:8px; padding:6px 11px; font-size:11px; font-weight:700; color:#66707d; cursor:pointer; }
          .sgp-seg button.on { background:#fff; color:var(--ink); box-shadow:0 1px 4px #0002; }
          .sgp-empty { border:1px dashed #dfe2e8; border-radius:14px; padding:35px 18px; text-align:center; color:var(--muted); font-size:13px; line-height:1.7; }
          .sgp-grid2 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; margin-bottom:18px; }
          .sgp-grid2 .sgp-panel { margin-bottom:0; }
          .sgp-bars { display:flex; flex-direction:column; gap:12px; }
          .sgp-bar-row { display:grid; grid-template-columns:minmax(80px,130px) 1fr 58px; gap:10px; align-items:center; font-size:12px; }
          .sgp-bar-label { overflow-wrap:anywhere; color:#4e5662; }
          .sgp-bar-track { height:9px; background:#f0f1f4; border-radius:20px; overflow:hidden; }
          .sgp-bar-fill { height:100%; border-radius:20px; transition:width .3s; }
          .sgp-bar-count { text-align:right; color:var(--muted); white-space:nowrap; }
          .sgp-avatar { width:26px; height:26px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; margin-right:8px; background:hsl(var(--h) 80% 92%); color:hsl(var(--h) 60% 30%); flex-shrink:0; }
          .sgp-member { display:flex; align-items:center; }
          .sgp-toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%); background:#171a21; color:#fff; padding:11px 16px; border-radius:12px; font-size:13px; display:flex; gap:14px; align-items:center; box-shadow:0 14px 34px -12px #000a; z-index:60; max-width:calc(100vw - 32px); }
          .sgp-toast button { background:none; border:none; color:#ffb08f; font-weight:700; cursor:pointer; font-size:13px; padding:0; }
          .sgp-toast .sgp-toast-msg { color:#e6e8ee; }
          @media(max-width:860px) { .sgp-hero { grid-template-columns:1fr; } .sgp-grid2 { grid-template-columns:1fr; } }
          @media(max-width:760px) { .sgp-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } }
          @media(max-width:520px) {
            .sgp-hero { padding:20px; border-radius:18px; } .sgp-hero h2 { font-size:21px; }
            .sgp-stats { gap:8px; } .sgp-stat { padding:12px; } .sgp-stat-value { font-size:21px; }
            .sgp-form-grid { grid-template-columns:1fr; } .sgp-field.full { grid-column:auto; }
            .sgp-session-top { flex-direction:column; } .sgp-session-details { grid-template-columns:1fr; }
            .sgp-filter { flex:1 1 130px; } .sgp-week { gap:4px; } .sgp-day { padding:8px 2px; }
            .sgp-bar-row { grid-template-columns:85px 1fr 52px; gap:7px; }
          }
        `}</style>

        <section className="sgp-hero">
          <div>
            <div className="sgp-eyebrow">Study group command center</div>
            <h2>Make every group study session count</h2>
            <p>
              Plan sessions, keep your group organized, track follow-up tasks, and
              never walk into a study meeting unprepared.
            </p>
            <div className="sgp-actions">
              <button className="sgp-btn primary" onClick={openNewForm}>
                + Plan a session
              </button>
              <button
                className="sgp-btn ghost"
                onClick={exportCsv}
                disabled={!sessions.length}
              >
                Export CSV
              </button>
              <button
                className="sgp-btn ghost"
                onClick={exportJson}
                disabled={!sessions.length}
              >
                Export JSON
              </button>
              <button
                className="sgp-btn ghost"
                onClick={() => fileRef.current?.click()}
              >
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

          <div className="sgp-next">
            {nextSession ? (
              <>
                <div className="sgp-next-label">
                  {nextLive ? "Happening now" : "Next session"}
                </div>
                <div className="sgp-next-title">{nextSession.title}</div>
                <div className="sgp-next-meta">
                  {nextSession.subject} · {formatDate(nextSession.date)} ·{" "}
                  {nextSession.startTime}
                  {nextSession.location ? ` · ${nextSession.location}` : ""}
                </div>
                {nextLive ? (
                  <div className="sgp-live" style={{ marginTop: 14 }}>
                    In progress · ends in{" "}
                    {countdown(endOf(nextSession).getTime() - now)}
                  </div>
                ) : (
                  <>
                    <div className="sgp-next-count">
                      in {countdown(nextStart - now)}
                    </div>
                    <div className="sgp-next-meta">
                      {nextSession.participants.length}{" "}
                      {nextSession.participants.length === 1
                        ? "participant"
                        : "participants"}{" "}
                      · {formatDuration(nextSession.duration)}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="sgp-next-label">Next session</div>
                <div className="sgp-next-title">Nothing scheduled</div>
                <div className="sgp-next-meta">
                  Plan your next group study to see a live countdown here.
                </div>
              </>
            )}
          </div>
        </section>

        <div className="sgp-stats">
          <div className="sgp-stat">
            <div className="sgp-stat-label">Upcoming sessions</div>
            <div className="sgp-stat-value">{stats.upcoming}</div>
            <div className="sgp-stat-sub">{stats.total} saved in total</div>
          </div>
          <div className="sgp-stat">
            <div className="sgp-stat-label">Completed sessions</div>
            <div className="sgp-stat-value">{stats.completed}</div>
            <div className="sgp-stat-sub">Marked as completed</div>
          </div>
          <div className="sgp-stat">
            <div className="sgp-stat-label">Time studied together</div>
            <div className="sgp-stat-value">
              {formatDuration(stats.minutes)}
            </div>
            <div className="sgp-stat-sub">From completed sessions</div>
          </div>
          <div className="sgp-stat">
            <div className="sgp-stat-label">Open action items</div>
            <div className="sgp-stat-value">{stats.openTasks}</div>
            <div className="sgp-stat-sub">
              {stats.taskPct}% of all tasks done
            </div>
          </div>
        </div>

        <section className="sgp-panel">
          <h3 className="sgp-panel-title">Next 7 days</h3>
          <p className="sgp-panel-sub">Tap a day to see only its sessions.</p>
          <div className="sgp-week">
            {week.map((d) => (
              <button
                key={d.key}
                className={`sgp-day${filterDay === d.key ? " on" : ""}${
                  d.isToday ? " today" : ""
                }`}
                onClick={() => setFilterDay(filterDay === d.key ? null : d.key)}
                aria-pressed={filterDay === d.key}
              >
                <small>{d.isToday ? "Today" : d.weekday}</small>
                <b>{d.day}</b>
                <span className={d.count ? "" : "zero"}>{d.count}</span>
              </button>
            ))}
          </div>
        </section>

        <div id="sgp-form-anchor" />
        {showForm && (
          <section className="sgp-panel">
            <h3 className="sgp-panel-title">
              {editingId ? "Edit study session" : "Plan a study session"}
            </h3>
            <p className="sgp-panel-sub">Fields marked * are required.</p>

            <div className="sgp-form-grid">
              <div className="sgp-field">
                <label htmlFor="sgp-title">Session title *</label>
                <input
                  id="sgp-title"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="e.g. Biology exam preparation"
                  maxLength={100}
                />
              </div>
              <div className="sgp-field">
                <label htmlFor="sgp-subject">Subject *</label>
                <input
                  id="sgp-subject"
                  value={form.subject}
                  onChange={(e) => updateForm("subject", e.target.value)}
                  placeholder="e.g. Biology"
                  maxLength={60}
                  list="sgp-subject-list"
                />
                <datalist id="sgp-subject-list">
                  {subjects.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div className="sgp-field">
                <label htmlFor="sgp-date">Session date *</label>
                <input
                  id="sgp-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => updateForm("date", e.target.value)}
                />
              </div>
              <div className="sgp-field">
                <label htmlFor="sgp-time">Start time *</label>
                <input
                  id="sgp-time"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => updateForm("startTime", e.target.value)}
                />
              </div>
              <div className="sgp-field">
                <label htmlFor="sgp-duration">Duration in minutes *</label>
                <input
                  id="sgp-duration"
                  type="number"
                  min="5"
                  max="1440"
                  step="5"
                  value={form.duration}
                  onChange={(e) => updateForm("duration", e.target.value)}
                />
                <div className="sgp-session-buttons">
                  {[30, 45, 60, 90, 120].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="sgp-small-btn"
                      onClick={() => updateForm("duration", String(m))}
                    >
                      {formatDuration(m)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sgp-field">
                <label htmlFor="sgp-location">Location or meeting link</label>
                <input
                  id="sgp-location"
                  value={form.location}
                  onChange={(e) => updateForm("location", e.target.value)}
                  placeholder="Library room 3, or a video call link"
                  maxLength={200}
                />
              </div>
              <div className="sgp-field">
                <label htmlFor="sgp-leader">Session leader</label>
                <input
                  id="sgp-leader"
                  value={form.leader}
                  onChange={(e) => updateForm("leader", e.target.value)}
                  placeholder="Who will guide the session?"
                  maxLength={60}
                />
              </div>
              <div className="sgp-field">
                <label htmlFor="sgp-status">Session status</label>
                <select
                  id="sgp-status"
                  value={form.status}
                  onChange={(e) =>
                    updateForm("status", e.target.value as SessionStatus)
                  }
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sgp-field full">
                <label htmlFor="sgp-participants">Participants</label>
                <input
                  id="sgp-participants"
                  value={form.participants}
                  onChange={(e) => updateForm("participants", e.target.value)}
                  placeholder="Enter names separated by commas"
                />
                <span className="sgp-hint">
                  Example: Alex, Sam, Priya, Jordan
                </span>
              </div>
              <div className="sgp-field">
                <label htmlFor="sgp-topics">Topics to cover</label>
                <textarea
                  id="sgp-topics"
                  value={form.topics}
                  onChange={(e) => updateForm("topics", e.target.value)}
                  placeholder={
                    "One topic per line\nChapter 1: Introduction\nChapter 2: Key concepts"
                  }
                />
              </div>
              <div className="sgp-field">
                <label htmlFor="sgp-agenda">Session agenda</label>
                <textarea
                  id="sgp-agenda"
                  value={form.agenda}
                  onChange={(e) => updateForm("agenda", e.target.value)}
                  placeholder={
                    "One item per line, in order\n10 min – Review previous topics\n30 min – Discuss new material"
                  }
                />
              </div>
              <div className="sgp-field full">
                <label htmlFor="sgp-notes">Session notes</label>
                <textarea
                  id="sgp-notes"
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  placeholder="Meeting details, preparation notes, or anything the group should remember."
                />
              </div>
              <div className="sgp-field full">
                <label htmlFor="sgp-actions">Action items for next time</label>
                <textarea
                  id="sgp-actions"
                  value={form.actionItems}
                  onChange={(e) => updateForm("actionItems", e.target.value)}
                  placeholder={
                    "One action item per line\nRead chapter 3\nComplete the practice worksheet"
                  }
                />
                <span className="sgp-hint">
                  You can tick these off from the session card once they are
                  done. Duplicate lines are removed automatically.
                </span>
              </div>
            </div>

            {formConflicts.length > 0 && (
              <div className="sgp-warn">
                <strong>Schedule overlap:</strong> this time clashes with{" "}
                {formConflicts
                  .map((s) => `"${s.title}" (${s.startTime})`)
                  .join(", ")}
                .
              </div>
            )}
            {error && <div className="sgp-error">{error}</div>}

            <div className="sgp-form-actions">
              <button
                className="sgp-btn"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancel
              </button>
              <button className="sgp-btn primary" onClick={saveSession}>
                {editingId ? "Save changes" : "Save session"}
              </button>
            </div>
          </section>
        )}

        <section className="sgp-panel">
          <div className="sgp-toolbar">
            <div className="sgp-search-wrap">
              <input
                className="sgp-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sessions, topics, people, or notes..."
                aria-label="Search study sessions"
              />
            </div>
            <select
              className="sgp-filter"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              aria-label="Filter by subject"
            >
              <option value="All">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <select
              className="sgp-filter"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              aria-label="Sort sessions"
            >
              <option value="soonest">Soonest first</option>
              <option value="latest">Latest first</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>

          <div className="sgp-list-head">
            <div className="sgp-seg" role="tablist" aria-label="Filter by status">
              {["All", ...statusOptions].map((status) => (
                <button
                  key={status}
                  className={filterStatus === status ? "on" : ""}
                  onClick={() => setFilterStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>
            <span className="sgp-count">
              Showing {filteredSessions.length} of {sessions.length}
              {filterDay && (
                <button className="sgp-chip" onClick={() => setFilterDay(null)}>
                  {formatDate(filterDay)} ✕
                </button>
              )}
            </span>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="sgp-empty">
              {sessions.length === 0 ? (
                <>
                  <strong>No study sessions planned yet.</strong>
                  <br />
                  Create your first session to organize your next group study.
                  <br />
                  <button
                    className="sgp-btn primary"
                    style={{ marginTop: 13 }}
                    onClick={openNewForm}
                  >
                    Plan your first session
                  </button>
                </>
              ) : (
                <>
                  <strong>No matching sessions found.</strong>
                  <br />
                  Try changing your search or filters.
                </>
              )}
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isOpen = openIds.includes(session.id);
              const overdue =
                session.status === "Upcoming" && endOf(session).getTime() < now;
              const doneCount = session.actionsDone.length;
              const total = session.actionItems.length;
              return (
                <article
                  className={`sgp-session${
                    session.status === "Completed" ? " done" : ""
                  }${session.status === "Cancelled" ? " cancelled" : ""}`}
                  key={session.id}
                  style={{ ["--h" as string]: subjectHue(session.subject) }}
                >
                  <div className="sgp-session-top">
                    <div>
                      <h4 className="sgp-session-title">{session.title}</h4>
                      <div className="sgp-session-sub">
                        {formatDate(session.date)} · {session.startTime} ·{" "}
                        {formatDuration(session.duration)}
                        {session.location ? ` · ${session.location}` : ""}
                      </div>
                      <div className="sgp-badges">
                        <span className="sgp-badge subject">
                          {session.subject}
                        </span>
                        <span
                          className={`sgp-badge ${
                            session.status === "Completed"
                              ? "completed"
                              : session.status === "Cancelled"
                              ? "cancelled"
                              : ""
                          }`}
                        >
                          {session.status}
                        </span>
                        {overdue && (
                          <span className="sgp-badge alert">
                            Past due, update status
                          </span>
                        )}
                        <span className="sgp-badge neutral">
                          {session.participants.length}{" "}
                          {session.participants.length === 1
                            ? "participant"
                            : "participants"}
                        </span>
                        {total > 0 && (
                          <span className="sgp-badge neutral">
                            {doneCount}/{total} tasks
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="sgp-session-buttons">
                      <button
                        className="sgp-small-btn"
                        onClick={() => toggleOpen(session.id)}
                      >
                        {isOpen ? "Hide details" : "View details"}
                      </button>
                      <button
                        className="sgp-small-btn"
                        onClick={() => editSession(session)}
                      >
                        Edit
                      </button>
                      <button
                        className="sgp-small-btn"
                        onClick={() => deleteSession(session)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="sgp-session-details">
                      <div>
                        <div className="sgp-detail-label">Session leader</div>
                        <div className="sgp-detail-value">
                          {session.leader || "Not assigned"}
                        </div>
                      </div>
                      <div>
                        <div className="sgp-detail-label">Participants</div>
                        <div className="sgp-detail-value">
                          {session.participants.length
                            ? session.participants.join(", ")
                            : "No participants added"}
                        </div>
                      </div>
                      <div>
                        <div className="sgp-detail-label">Topics</div>
                        <div className="sgp-detail-value">
                          {session.topics.length ? (
                            <ul>
                              {session.topics.map((t, i) => (
                                <li key={`${session.id}-t-${i}`}>{t}</li>
                              ))}
                            </ul>
                          ) : (
                            "No topics added"
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="sgp-detail-label">Agenda</div>
                        <div className="sgp-detail-value">
                          {session.agenda.length ? (
                            <ol>
                              {session.agenda.map((a, i) => (
                                <li key={`${session.id}-a-${i}`}>{a}</li>
                              ))}
                            </ol>
                          ) : (
                            "No agenda added"
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="sgp-detail-label">Session notes</div>
                        <div className="sgp-detail-value">
                          {session.notes || "No notes added"}
                        </div>
                      </div>
                      <div>
                        <div className="sgp-detail-label">
                          Action items for next time
                        </div>
                        {total === 0 ? (
                          <div className="sgp-detail-value">
                            No action items added
                          </div>
                        ) : (
                          <>
                            <div className="sgp-progress">
                              <div
                                style={{
                                  width: `${(doneCount / total) * 100}%`,
                                }}
                              />
                            </div>
                            <div className="sgp-tasks">
                              {session.actionItems.map((item, i) => {
                                const done =
                                  session.actionsDone.includes(item);
                                return (
                                  <label
                                    key={`${session.id}-x-${i}`}
                                    className={`sgp-task${done ? " done" : ""}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={done}
                                      onChange={() =>
                                        toggleAction(session.id, item)
                                      }
                                    />
                                    <span>{item}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="sgp-session-footer">
                    <div
                      className="sgp-seg"
                      aria-label={`Update status for ${session.title}`}
                    >
                      {statusOptions.map((status) => (
                        <button
                          key={status}
                          className={session.status === status ? "on" : ""}
                          onClick={() => updateStatus(session.id, status)}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                    <div className="sgp-session-buttons">
                      <button
                        className="sgp-small-btn"
                        onClick={() => copyInvite(session)}
                      >
                        Copy invite
                      </button>
                      <button
                        className="sgp-small-btn"
                        onClick={() => exportIcs(session)}
                      >
                        Add to calendar
                      </button>
                      <button
                        className="sgp-small-btn"
                        onClick={() => repeatWeekly(session)}
                      >
                        Repeat next week
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <div className="sgp-grid2">
          <section className="sgp-panel">
            <h3 className="sgp-panel-title">Study time by subject</h3>
            <p className="sgp-panel-sub">
              Planned and completed sessions, excluding cancelled
            </p>
            {subjectStats.length === 0 ? (
              <div className="sgp-empty">
                Subject breakdown appears after you plan a session.
              </div>
            ) : (
              <div className="sgp-bars">
                {subjectStats.map(([subject, minutes]) => (
                  <div
                    className="sgp-bar-row"
                    key={subject}
                    style={{ ["--h" as string]: subjectHue(subject) }}
                  >
                    <span className="sgp-bar-label">{subject}</span>
                    <div className="sgp-bar-track">
                      <div
                        className="sgp-bar-fill"
                        style={{
                          width: `${(minutes / maxSubject) * 100}%`,
                          background: `hsl(${subjectHue(subject)} 75% 55%)`,
                        }}
                      />
                    </div>
                    <span className="sgp-bar-count">
                      {formatDuration(minutes)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="sgp-panel">
            <h3 className="sgp-panel-title">Most active members</h3>
            <p className="sgp-panel-sub">Sessions each person is part of</p>
            {members.length === 0 ? (
              <div className="sgp-empty">
                Add participants to your sessions to see who shows up the most.
              </div>
            ) : (
              <div className="sgp-bars">
                {members.map((m) => (
                  <div
                    className="sgp-bar-row"
                    key={m.name.toLowerCase()}
                    style={{ ["--h" as string]: subjectHue(m.name) }}
                  >
                    <span className="sgp-bar-label sgp-member">
                      <span className="sgp-avatar">
                        {m.name.slice(0, 1).toUpperCase()}
                      </span>
                      {m.name}
                    </span>
                    <div className="sgp-bar-track">
                      <div
                        className="sgp-bar-fill"
                        style={{
                          width: `${(m.count / members[0].count) * 100}%`,
                          background:
                            "linear-gradient(90deg,#3b4254,#171a21)",
                        }}
                      />
                    </div>
                    <span className="sgp-bar-count">
                      {m.count} {m.count === 1 ? "session" : "sessions"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="sgp-actions" style={{ justifyContent: "flex-end" }}>
          <button
            className="sgp-btn danger"
            onClick={clearAll}
            disabled={!sessions.length}
          >
            Clear all sessions
          </button>
        </div>

        {(undo || toast) && (
          <div className="sgp-toast" role="status">
            <span className="sgp-toast-msg">
              {undo ? "Session deleted" : toast}
            </span>
            {undo && <button onClick={undoDelete}>Undo</button>}
          </div>
        )}
      </div>
    </ToolShell>
  );
}