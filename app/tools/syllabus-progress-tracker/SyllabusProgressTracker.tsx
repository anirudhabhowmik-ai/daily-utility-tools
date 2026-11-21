"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ----------------------------- Types ----------------------------- */

type TopicStatus = "not-started" | "in-progress" | "completed";
type Priority = "high" | "medium" | "low";
type ViewMode = "dashboard" | "editor";
type StatusFilter = "all" | TopicStatus;
type PriorityFilter = "all" | Priority;
type SortKey = "priority" | "name" | "target";

type Topic = {
  id: string;
  name: string;
  status: TopicStatus;
  priority: Priority;
  targetDate: string;
  notes: string;
};

type Subject = {
  id: string;
  name: string;
  topics: Topic[];
};

type StudyPlan = {
  id: string;
  name: string;
  examDate: string;
  description: string;
  subjects: Subject[];
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
};

type Activity = {
  id: string;
  planId: string;
  planName: string;
  type: "created" | "completed" | "milestone";
  detail: string;
  date: number;
};

type NewActivity = Omit<Activity, "id" | "date">;

type DialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone: "danger" | "primary";
  onConfirm: () => void;
};

type FocusItem = {
  plan: StudyPlan;
  subject: Subject;
  topic: Topic;
  reason: "overdue" | "today" | "soon" | "high" | "active";
  days: number | null;
  rank: number;
};

/* --------------------------- Constants --------------------------- */

const STORAGE_KEY = "toolsab-syllabus-progress-tracker";
const ACTIVITY_KEY = `${STORAGE_KEY}-activity`;
const PREFS_KEY = `${STORAGE_KEY}-prefs`;

const LEVEL_TITLES = ["Freshman", "Sophomore", "Junior", "Senior", "Scholar", "Master", "Dean"];
const XP_PER_LEVEL = 200;
const CONFETTI_COLORS = ["#ff5a1f", "#ffb020", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

const STATUSES: TopicStatus[] = ["not-started", "in-progress", "completed"];

const statusLabels: Record<TopicStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  completed: "Completed",
};

const priorityLabels: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const activityIcons: Record<Activity["type"], string> = {
  created: "🌱",
  completed: "✅",
  milestone: "🏆",
};

/* ---------------------------- Helpers ---------------------------- */

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const createTopic = (): Topic => ({
  id: createId(),
  name: "",
  status: "not-started",
  priority: "medium",
  targetDate: "",
  notes: "",
});

const createSubject = (): Subject => ({
  id: createId(),
  name: "",
  topics: [createTopic()],
});

const createPlan = (): StudyPlan => ({
  id: createId(),
  name: "My Study Plan",
  examDate: "",
  description: "",
  subjects: [createSubject()],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  favorite: false,
});

const toISO = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const isoFromToday = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toISO(date);
};

const mk = (
  name: string,
  status: TopicStatus,
  priority: Priority,
  targetDate = "",
  notes = ""
): Topic => ({ id: createId(), name, status, priority, targetDate, notes });

const createSamplePlan = (): StudyPlan => ({
  ...createPlan(),
  name: "Semester Exam Prep",
  description: "A sample plan that shows subjects, topics, priorities and deadlines.",
  examDate: isoFromToday(30),
  subjects: [
    {
      id: createId(),
      name: "Mathematics",
      topics: [
        mk("Algebra: equations and inequalities", "completed", "high", isoFromToday(-5)),
        mk("Functions and graphs", "in-progress", "high", isoFromToday(-1), "Revisit domain and range problems."),
        mk("Differentiation basics", "not-started", "medium", isoFromToday(4)),
        mk("Integration basics", "not-started", "medium", isoFromToday(9)),
      ],
    },
    {
      id: createId(),
      name: "Physics",
      topics: [
        mk("Kinematics", "completed", "medium", isoFromToday(-3)),
        mk("Newton laws of motion", "in-progress", "high", isoFromToday(0)),
        mk("Work, energy and power", "not-started", "medium", isoFromToday(6)),
        mk("Waves and sound", "not-started", "low", isoFromToday(12)),
      ],
    },
    {
      id: createId(),
      name: "Chemistry",
      topics: [
        mk("Atomic structure", "completed", "low", isoFromToday(-6)),
        mk("Chemical bonding", "not-started", "high", isoFromToday(3)),
        mk("Introduction to organic chemistry", "not-started", "medium", isoFromToday(14)),
      ],
    },
  ],
});

const formatDate = (value: string | number) => {
  if (!value) return "Not set";
  const date = typeof value === "number" ? new Date(value) : new Date(`${value}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const daysUntil = (value: string) => {
  if (!value) return null;
  const target = new Date(`${value}T12:00:00`);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
};

const timeAgo = (timestamp: number) => {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
};

const dayKey = (value: number | Date) => new Date(value).toDateString();

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function getProgress(topics: Topic[]) {
  const named = topics.filter((topic) => topic.name.trim());
  if (named.length === 0) return 0;
  const completed = named.filter((topic) => topic.status === "completed").length;
  return Math.round((completed / named.length) * 100);
}

function getAllTopics(plan: StudyPlan) {
  return plan.subjects.flatMap((subject) => subject.topics.filter((topic) => topic.name.trim()));
}

const isOverdue = (topic: Topic) =>
  topic.name.trim() !== "" &&
  topic.status !== "completed" &&
  !!topic.targetDate &&
  (daysUntil(topic.targetDate) ?? 0) < 0;

const statusBadge = (status: TopicStatus) =>
  status === "completed" ? "badge-green" : status === "in-progress" ? "badge-blue" : "badge-gray";

const priorityBadge = (priority: Priority) =>
  priority === "high" ? "badge-red" : priority === "medium" ? "badge-yellow" : "badge-gray";

const urgencyClass = (days: number | null) =>
  days === null ? "none" : days < 0 ? "past" : days <= 7 ? "urgent" : days <= 21 ? "soon" : "calm";

const examText = (days: number | null) =>
  days === null ? "" : days < 0 ? "Exam passed" : days === 0 ? "Exam today" : `${days} days to exam`;

function isValidPlan(value: unknown): value is StudyPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as StudyPlan;
  return (
    typeof plan.id === "string" &&
    typeof plan.name === "string" &&
    typeof plan.examDate === "string" &&
    typeof plan.description === "string" &&
    Array.isArray(plan.subjects) &&
    plan.subjects.every(
      (subject) =>
        subject &&
        typeof subject.id === "string" &&
        typeof subject.name === "string" &&
        Array.isArray(subject.topics) &&
        subject.topics.every(
          (topic) =>
            topic &&
            typeof topic.id === "string" &&
            typeof topic.name === "string" &&
            STATUSES.includes(topic.status) &&
            ["high", "medium", "low"].includes(topic.priority) &&
            typeof topic.targetDate === "string" &&
            typeof topic.notes === "string"
        )
    )
  );
}

const normalizePlan = (plan: StudyPlan): StudyPlan => ({
  ...plan,
  id: plan.id || createId(),
  createdAt: plan.createdAt || Date.now(),
  updatedAt: plan.updatedAt || plan.createdAt || Date.now(),
  favorite: Boolean(plan.favorite),
  subjects: plan.subjects.map((subject) => ({
    ...subject,
    id: subject.id || createId(),
    topics: subject.topics.map((topic) => ({ ...topic, id: topic.id || createId() })),
  })),
});

const reidPlan = (plan: StudyPlan, resetProgress: boolean): StudyPlan => ({
  ...plan,
  id: createId(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  favorite: false,
  subjects: plan.subjects.map((subject) => ({
    ...subject,
    id: createId(),
    topics: subject.topics.map((topic) => ({
      ...topic,
      id: createId(),
      status: resetProgress ? "not-started" : topic.status,
    })),
  })),
});

const downloadFile = (name: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "study-plan";

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

function Ring({ value, size = 64, stroke = 7 }: { value: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length - (length * value) / 100}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: Math.round(size * 0.27),
          letterSpacing: "-0.5px",
        }}
      >
        {value}%
      </div>
    </div>
  );
}

/* --------------------------- Component --------------------------- */

export default function SyllabusProgressTracker() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [dark, setDark] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<ViewMode>("dashboard");

  const [draft, setDraft] = useState<StudyPlan | null>(null);
  const [baseline, setBaseline] = useState("");
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [bulk, setBulk] = useState<{ subjectId: string; text: string } | null>(null);

  const [planSearch, setPlanSearch] = useState("");
  const [topicSearch, setTopicSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [hideCompleted, setHideCompleted] = useState(false);

  const [notice, setNotice] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  /* ----------------------- Persistence ----------------------- */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setPlans(parsed.filter(isValidPlan).map(normalizePlan));
      }

      const savedActivity = localStorage.getItem(ACTIVITY_KEY);
      if (savedActivity) {
        const parsed = JSON.parse(savedActivity);
        if (Array.isArray(parsed)) {
          setActivity(
            parsed.filter(
              (item) => item && typeof item.detail === "string" && typeof item.date === "number"
            )
          );
        }
      }

      const savedPrefs = localStorage.getItem(PREFS_KEY);
      if (savedPrefs) {
        setDark(Boolean(JSON.parse(savedPrefs).dark));
      } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        setDark(true);
      }
    } catch {
      setNotice("Some saved data could not be loaded.");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    } catch {
      setNotice("Your browser storage is full. Export your plans to keep a backup.");
    }
  }, [plans, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity.slice(0, 100)));
    } catch {
      /* ignore */
    }
  }, [activity, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ dark }));
    } catch {
      /* ignore */
    }
  }, [dark, loaded]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!celebrate) return;
    const timeout = window.setTimeout(() => setCelebrate(false), 3200);
    return () => window.clearTimeout(timeout);
  }, [celebrate]);

  useEffect(() => {
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (dialog.tone === "danger" ? cancelRef : confirmRef).current?.focus({ preventScroll: true });

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialog(null);
    };
    window.addEventListener("keydown", handler);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handler);
    };
  }, [dialog]);

  /* ----------------------- Derived data ----------------------- */

  const allTopics = useMemo(() => plans.flatMap(getAllTopics), [plans]);
  const totalTopics = allTopics.length;
  const completedTopics = allTopics.filter((t) => t.status === "completed").length;
  const inProgressTopics = allTopics.filter((t) => t.status === "in-progress").length;
  const globalProgress = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const overdueTopics = allTopics.filter(isOverdue).length;

  const perfectPlans = plans.filter((plan) => {
    const topics = getAllTopics(plan);
    return topics.length >= 3 && getProgress(topics) === 100;
  }).length;

  const totalXp = useMemo(() => {
    let xp = plans.length * 50 + perfectPlans * 100;
    allTopics.forEach((topic) => {
      if (topic.status === "completed") xp += 25;
      else if (topic.status === "in-progress") xp += 10;
      if (topic.priority === "high" && topic.status !== "not-started") xp += 5;
    });
    return xp;
  }, [plans.length, perfectPlans, allTopics]);

  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const levelProgress = ((totalXp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

  const streak = useMemo(() => {
    const days = new Set(
      activity.filter((item) => item.type !== "created").map((item) => dayKey(item.date))
    );
    const cursor = new Date();
    if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (days.has(dayKey(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [activity]);

  const upcomingExams = useMemo(
    () =>
      plans
        .filter((plan) => plan.examDate)
        .map((plan) => ({ plan, days: daysUntil(plan.examDate) ?? -1 }))
        .filter((item) => item.days >= 0)
        .sort((a, b) => a.days - b.days),
    [plans]
  );

  const focusItems = useMemo(() => {
    const items: FocusItem[] = [];
    plans.forEach((plan) =>
      plan.subjects.forEach((subject) =>
        subject.topics.forEach((topic) => {
          if (!topic.name.trim()) return;
          if (topic.status === "completed") return;
          const days = topic.targetDate ? daysUntil(topic.targetDate) : null;
          let reason: FocusItem["reason"] | null = null;
          let rank = 9;
          if (days !== null && days < 0) {
            reason = "overdue";
            rank = 0;
          } else if (days === 0) {
            reason = "today";
            rank = 1;
          } else if (days !== null && days <= 3) {
            reason = "soon";
            rank = 2;
          } else if (topic.priority === "high") {
            reason = "high";
            rank = 3;
          } else if (topic.status === "in-progress") {
            reason = "active";
            rank = 4;
          }
          if (reason) items.push({ plan, subject, topic, reason, days, rank });
        })
      )
    );
    return items.sort((a, b) => a.rank - b.rank || (a.days ?? 99) - (b.days ?? 99)).slice(0, 6);
  }, [plans]);

  const badges = [
    { icon: "🌱", name: "First plan", hint: "Create a study plan", earned: plans.length >= 1 },
    { icon: "📚", name: "Collector", hint: "Create 3 study plans", earned: plans.length >= 3 },
    { icon: "✅", name: "Finisher", hint: "Complete 5 topics", earned: completedTopics >= 5 },
    { icon: "🏆", name: "Master", hint: "Complete 25 topics", earned: completedTopics >= 25 },
    { icon: "🎯", name: "Planner", hint: "Set an exam date", earned: plans.some((plan) => plan.examDate) },
    { icon: "⭐", name: "Favorited", hint: "Favorite a plan", earned: plans.some((plan) => plan.favorite) },
    { icon: "🔥", name: "On a roll", hint: "Reach a 3-day streak", earned: streak >= 3 },
    { icon: "💯", name: "Perfect plan", hint: "Finish every topic in a plan", earned: perfectPlans >= 1 },
  ];

  const planCards = useMemo(() => {
    const query = planSearch.toLowerCase().trim();
    return plans
      .filter((plan) => !query || `${plan.name} ${plan.description}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return Number(b.favorite) - Number(a.favorite);
        return b.updatedAt - a.updatedAt;
      });
  }, [plans, planSearch]);

  const isNewDraft = draft ? !plans.some((plan) => plan.id === draft.id) : false;
  const dirty = useMemo(() => (draft ? JSON.stringify(draft) !== baseline : false), [draft, baseline]);

  const draftTopics = useMemo(() => (draft ? getAllTopics(draft) : []), [draft]);
  const draftNamed = draftTopics;
  const draftCompleted = draftNamed.filter((t) => t.status === "completed").length;
  const draftInProgress = draftNamed.filter((t) => t.status === "in-progress").length;
  const draftProgress = getProgress(draftNamed);
  const draftDays = draft ? daysUntil(draft.examDate) : null;
  const draftRemaining = draftNamed.length - draftCompleted;

  const paceText = (() => {
    if (!draftNamed.length) return "Add topics to see your study pace.";
    if (draftRemaining === 0) return "Every topic is completed. Great work!";
    if (draftDays === null) return "Set an exam date to see how many topics you need per day.";
    if (draftDays < 0) return "The exam date has passed. Update it to plan your next steps.";
    if (draftDays === 0) return `Exam day! ${plural(draftRemaining, "topic")} still open.`;
    const perDay = draftRemaining / draftDays;
    return perDay >= 1
      ? `About ${Math.ceil(perDay)} topics per day keeps you on track for the exam.`
      : `About 1 topic every ${Math.max(1, Math.round(1 / perDay))} days keeps you on track.`;
  })();

  const filteredSubjects = useMemo(() => {
    if (!draft) return [];
    const query = topicSearch.toLowerCase().trim();

    return draft.subjects
      .map((subject) => ({
        ...subject,
        topics: subject.topics
          .filter((topic) => {
            if (!topic.name.trim()) return false;
            const matchesSearch =
              !query ||
              topic.name.toLowerCase().includes(query) ||
              topic.notes.toLowerCase().includes(query) ||
              subject.name.toLowerCase().includes(query);
            const matchesStatus = statusFilter === "all" || topic.status === statusFilter;
            const matchesPriority = priorityFilter === "all" || topic.priority === priorityFilter;
            const matchesHidden = !hideCompleted || topic.status !== "completed";
            return matchesSearch && matchesStatus && matchesPriority && matchesHidden;
          })
          .sort((a, b) => {
            if (sortKey === "name") return a.name.localeCompare(b.name);
            if (sortKey === "target") {
              if (!a.targetDate) return 1;
              if (!b.targetDate) return -1;
              return a.targetDate.localeCompare(b.targetDate);
            }
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }),
      }))
      .filter((subject) => (subjectFilter === "all" || subject.id === subjectFilter) && subject.topics.length > 0);
  }, [draft, topicSearch, statusFilter, priorityFilter, subjectFilter, sortKey, hideCompleted]);

  /* -------------------------- Helpers -------------------------- */

  const askConfirm = (options: DialogState) => setDialog(options);

  const pushActivity = (entries: NewActivity[]) => {
    if (!entries.length) return;
    const now = Date.now();
    setActivity((previous) =>
      [...entries.map((entry, index) => ({ ...entry, id: createId(), date: now - index })), ...previous].slice(0, 100)
    );
  };

  const completionEntries = (before: StudyPlan | undefined, after: StudyPlan): NewActivity[] => {
    const previousStatus = new Map<string, TopicStatus>(
      before ? getAllTopics(before).map((topic) => [topic.id, topic.status]) : []
    );
    const finished = getAllTopics(after).filter(
      (topic) => topic.status === "completed" && previousStatus.get(topic.id) !== "completed"
    );
    const entries: NewActivity[] = [];

    if (finished.length > 0 && finished.length <= 3) {
      finished.forEach((topic) =>
        entries.push({ planId: after.id, planName: after.name, type: "completed", detail: `Completed ${topic.name}` })
      );
    } else if (finished.length > 3) {
      entries.push({
        planId: after.id,
        planName: after.name,
        type: "completed",
        detail: `Completed ${plural(finished.length, "topic")}`,
      });
    }

    const afterTopics = getAllTopics(after);
    const beforeProgress = before ? getProgress(getAllTopics(before)) : 0;
    if (afterTopics.length > 0 && getProgress(afterTopics) === 100 && beforeProgress < 100) {
      entries.push({ planId: after.id, planName: after.name, type: "milestone", detail: "Finished every topic in the plan" });
      setCelebrate(true);
    }
    return entries;
  };

  /* ---------------------- Dashboard actions ---------------------- */

  const startNewPlan = () => {
    const plan = createPlan();
    setDraft(plan);
    setBaseline(JSON.stringify(plan));
    setExpandedSubjects({ [plan.subjects[0].id]: true });
    setBulk(null);
    resetFilters();
    setMode("editor");
    setNotice("");
  };

  const openPlan = (plan: StudyPlan) => {
    const copy: StudyPlan = JSON.parse(JSON.stringify(plan));
    setDraft(copy);
    setBaseline(JSON.stringify(copy));
    setExpandedSubjects(Object.fromEntries(copy.subjects.map((subject) => [subject.id, true])));
    setBulk(null);
    resetFilters();
    setMode("editor");
    setNotice("");
  };

  const resetFilters = () => {
    setTopicSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setSubjectFilter("all");
    setHideCompleted(false);
  };

  const addSample = () => {
    const plan = createSamplePlan();
    setPlans((previous) => [plan, ...previous]);
    pushActivity([{ planId: plan.id, planName: plan.name, type: "created", detail: "Added the sample plan" }]);
    setNotice("Sample plan added. Open it to explore.");
  };

  const toggleFavorite = (id: string) =>
    setPlans((previous) => previous.map((plan) => (plan.id === id ? { ...plan, favorite: !plan.favorite } : plan)));

  const duplicatePlan = (plan: StudyPlan) => {
    const copy = { ...reidPlan(plan, true), name: `${plan.name} (copy)` };
    setPlans((previous) => [copy, ...previous]);
    pushActivity([{ planId: copy.id, planName: copy.name, type: "created", detail: "Duplicated a plan" }]);
    setNotice("Plan duplicated with progress reset.");
  };

  const deletePlan = (plan: StudyPlan) =>
    askConfirm({
      title: "Delete this study plan?",
      message: `"${plan.name}" and its ${plural(getAllTopics(plan).length, "topic")} will be permanently removed. Export it first if you want a backup.`,
      confirmLabel: "Delete plan",
      tone: "danger",
      onConfirm: () => {
        setPlans((previous) => previous.filter((item) => item.id !== plan.id));
        setNotice("Study plan deleted.");
      },
    });

  const advanceTopic = (planId: string, subjectId: string, topicId: string, status: TopicStatus) => {
    const plan = plans.find((item) => item.id === planId);
    if (!plan) return;
    const updated: StudyPlan = {
      ...plan,
      updatedAt: Date.now(),
      subjects: plan.subjects.map((subject) =>
        subject.id === subjectId
          ? { ...subject, topics: subject.topics.map((topic) => (topic.id === topicId ? { ...topic, status } : topic)) }
          : subject
      ),
    };
    setPlans((previous) => previous.map((item) => (item.id === planId ? updated : item)));
    pushActivity(completionEntries(plan, updated));
  };

  const clearActivity = () =>
    askConfirm({
      title: "Clear recent activity?",
      message: "This removes the activity list and resets your streak. Your plans are not affected.",
      confirmLabel: "Clear activity",
      tone: "danger",
      onConfirm: () => {
        setActivity([]);
        setNotice("Activity cleared.");
      },
    });

  /* ------------------------ Import / export ------------------------ */

  const exportPlan = (plan: StudyPlan) =>
    downloadFile(`${slugify(plan.name)}.json`, JSON.stringify(plan, null, 2), "application/json");

  const exportAll = () => {
    if (!plans.length) {
      setNotice("There are no plans to export yet.");
      return;
    }
    downloadFile("syllabus-tracker-backup.json", JSON.stringify(plans, null, 2), "application/json");
  };

  const exportCsv = (plan: StudyPlan) => {
    const rows = [["Subject", "Topic", "Status", "Priority", "Target date", "Notes"]];
    plan.subjects.forEach((subject) =>
      subject.topics
        .filter((topic) => topic.name.trim())
        .forEach((topic) =>
          rows.push([
            subject.name,
            topic.name,
            statusLabels[topic.status],
            priorityLabels[topic.priority],
            topic.targetDate,
            topic.notes,
          ])
        )
    );
    downloadFile(`${slugify(plan.name)}.csv`, rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
  };

  const importPlans = (value: unknown) => {
    const imported = Array.isArray(value) ? value : [value];

    if (!imported.length || !imported.every(isValidPlan)) {
      setNotice("Invalid JSON file. Please import a file exported from this tool.");
      return;
    }

    const prepared = imported.map((raw) => reidPlan(normalizePlan(raw as StudyPlan), false));
    setPlans((previous) => [...prepared, ...previous]);
    setShowImport(false);
    setImportText("");
    setNotice(`${plural(prepared.length, "study plan")} imported successfully.`);
  };

  const handleImportText = () => {
    try {
      importPlans(JSON.parse(importText));
    } catch {
      setNotice("The JSON text is not valid.");
    }
  };

  const handleImportFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importPlans(JSON.parse(String(reader.result)));
      } catch {
        setNotice("Could not read this JSON file.");
      }
    };
    reader.readAsText(file);
  };

  /* -------------------------- Editor actions -------------------------- */

  const updateDraft = (changes: Partial<StudyPlan>) =>
    setDraft((previous) => (previous ? { ...previous, ...changes } : previous));

  const updateSubject = (subjectId: string, changes: Partial<Subject>) =>
    setDraft((previous) =>
      previous
        ? {
            ...previous,
            subjects: previous.subjects.map((subject) => (subject.id === subjectId ? { ...subject, ...changes } : subject)),
          }
        : previous
    );

  const updateTopic = (subjectId: string, topicId: string, changes: Partial<Topic>) =>
    setDraft((previous) =>
      previous
        ? {
            ...previous,
            subjects: previous.subjects.map((subject) =>
              subject.id === subjectId
                ? {
                    ...subject,
                    topics: subject.topics.map((topic) => (topic.id === topicId ? { ...topic, ...changes } : topic)),
                  }
                : subject
            ),
          }
        : previous
    );

  const addSubject = () => {
    const subject = createSubject();
    setDraft((previous) => (previous ? { ...previous, subjects: [...previous.subjects, subject] } : previous));
    setExpandedSubjects((previous) => ({ ...previous, [subject.id]: true }));
  };

  const deleteSubject = (subject: Subject) =>
    askConfirm({
      title: "Delete this subject?",
      message: `"${subject.name || "Untitled subject"}" and its ${plural(subject.topics.length, "topic")} will be removed from this plan.`,
      confirmLabel: "Delete subject",
      tone: "danger",
      onConfirm: () =>
        setDraft((previous) =>
          previous ? { ...previous, subjects: previous.subjects.filter((item) => item.id !== subject.id) } : previous
        ),
    });

  const addTopic = (subjectId: string) => {
    setDraft((previous) =>
      previous
        ? {
            ...previous,
            subjects: previous.subjects.map((subject) =>
              subject.id === subjectId ? { ...subject, topics: [...subject.topics, createTopic()] } : subject
            ),
          }
        : previous
    );
    setExpandedSubjects((previous) => ({ ...previous, [subjectId]: true }));
  };

  const deleteTopic = (subjectId: string, topicId: string) =>
    setDraft((previous) =>
      previous
        ? {
            ...previous,
            subjects: previous.subjects.map((subject) =>
              subject.id === subjectId
                ? { ...subject, topics: subject.topics.filter((topic) => topic.id !== topicId) }
                : subject
            ),
          }
        : previous
    );

  const markSubjectDone = (subject: Subject) => {
    updateSubject(subject.id, {
      topics: subject.topics.map((topic) => (topic.name.trim() ? { ...topic, status: "completed" as TopicStatus } : topic)),
    });
    setNotice(`Marked every topic in ${subject.name || "this subject"} as completed. Save the plan to keep it.`);
  };

  const addBulkTopics = () => {
    if (!bulk || !draft) return;
    const names = bulk.text
      .split("\n")
      .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
      .filter(Boolean)
      .slice(0, 100);

    if (!names.length) {
      setNotice("Type or paste at least one topic, one per line.");
      return;
    }

    const subject = draft.subjects.find((item) => item.id === bulk.subjectId);
    if (!subject) return;
    const existing = subject.topics.filter((topic) => topic.name.trim() || topic.notes.trim() || topic.targetDate);
    const created = names.map((name) => ({ ...createTopic(), name }));
    updateSubject(subject.id, { topics: [...existing, ...created] });
    setBulk(null);
    setNotice(`${plural(created.length, "topic")} added. Save the plan to keep them.`);
  };

  const jumpToTopic = (subjectId: string, topicId: string) => {
    setExpandedSubjects((previous) => ({ ...previous, [subjectId]: true }));
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const element = document.getElementById(`topic-${topicId}`);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
        element?.focus({ preventScroll: true });
      }, 60);
    });
  };

  const savePlan = () => {
    if (!draft) return;

    const name = draft.name.trim();
    if (!name) {
      setNotice("Please enter a study plan name.");
      return;
    }

    const subjects: Subject[] = [];
    for (let i = 0; i < draft.subjects.length; i++) {
      const subject = draft.subjects[i];
      const topics = subject.topics
        .filter((topic) => topic.name.trim())
        .map((topic) => ({ ...topic, name: topic.name.trim(), notes: topic.notes.trim() }));

      if (!subject.name.trim()) {
        if (topics.length) {
          setNotice(`Please name subject ${i + 1} or remove it.`);
          return;
        }
        continue;
      }
      subjects.push({ ...subject, name: subject.name.trim(), topics });
    }

    if (!subjects.length) {
      setNotice("Add at least one named subject before saving.");
      return;
    }

    const cleaned: StudyPlan = {
      ...draft,
      name,
      description: draft.description.trim(),
      subjects,
      updatedAt: Date.now(),
    };

    const previous = plans.find((plan) => plan.id === cleaned.id);
    const entries: NewActivity[] = [];
    if (!previous) entries.push({ planId: cleaned.id, planName: cleaned.name, type: "created", detail: "Created the plan" });
    entries.push(...completionEntries(previous, cleaned));
    pushActivity(entries);

    setPlans((current) =>
      current.some((plan) => plan.id === cleaned.id)
        ? current.map((plan) => (plan.id === cleaned.id ? cleaned : plan))
        : [cleaned, ...current]
    );
    setDraft(null);
    setMode("dashboard");
    setNotice("Study plan saved successfully.");
  };

  const goDashboard = () => {
    const leave = () => {
      setMode("dashboard");
      setDraft(null);
      setBulk(null);
      setNotice("");
    };

    if (mode === "editor" && dirty) {
      askConfirm({
        title: "Leave without saving?",
        message: "Your changes to this plan will be lost.",
        confirmLabel: "Leave",
        cancelLabel: "Keep editing",
        tone: "danger",
        onConfirm: leave,
      });
      return;
    }
    leave();
  };

  /* ---------------------------- Render ---------------------------- */

  const focusLabel = (item: FocusItem) => {
    if (item.reason === "overdue") return `Overdue by ${plural(Math.abs(item.days ?? 0), "day")}`;
    if (item.reason === "today") return "Due today";
    if (item.reason === "soon") return `Due in ${plural(item.days ?? 0, "day")}`;
    if (item.reason === "high") return "High priority";
    return "In progress";
  };

  const focusBadge = (item: FocusItem) =>
    item.reason === "overdue" ? "badge-red" : item.reason === "today" || item.reason === "soon" ? "badge-yellow" : item.reason === "high" ? "badge-red" : "badge-blue";

  return (
    <div className={`spt ${dark ? "dark" : ""}`}>
      <style jsx>{`
        .spt,
        .modal-root {
          --primary: #ff5a1f;
          --primary-soft: #fff1ea;
          --primary-line: #ffd3c1;
          --text: #172033;
          --muted: #64748b;
          --border: #e5e9f1;
          --card: #ffffff;
          --soft: #f4f6fb;
          --input: #f8fafc;
          --good: #16a34a;
          --good-soft: #ecfdf5;
          --bad: #dc2626;
          --bad-soft: #fef2f2;
          --warn: #b45309;
          --warn-soft: #fffbeb;
          --blue: #1d4ed8;
          --blue-soft: #eff6ff;
          --shadow: 0 1px 2px rgba(23, 32, 51, 0.04), 0 8px 24px rgba(23, 32, 51, 0.06);
          color: var(--text);
          width: 100%;
          font-family: inherit;
          position: relative;
        }
        .spt.dark,
        .modal-root.dark {
          --primary-soft: rgba(255, 90, 31, 0.14);
          --primary-line: rgba(255, 90, 31, 0.45);
          --text: #e8ecf5;
          --muted: #94a3b8;
          --border: #263046;
          --card: #121a2b;
          --soft: #0c1322;
          --input: #0c1322;
          --good: #4ade80;
          --good-soft: rgba(34, 197, 94, 0.12);
          --bad: #f87171;
          --bad-soft: rgba(239, 68, 68, 0.12);
          --warn: #fbbf24;
          --warn-soft: rgba(217, 119, 6, 0.16);
          --blue: #93c5fd;
          --blue-soft: rgba(59, 130, 246, 0.14);
          --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.25);
        }
        .spt.dark {
          background: #0a101e;
          border-radius: 20px;
          padding: 20px;
        }
        .spt *,
        .modal-root * {
          box-sizing: border-box;
        }
        .spt button,
        .modal-root button {
          font-family: inherit;
        }
        .spt button:focus-visible,
        .modal-root button:focus-visible,
        .spt input:focus-visible,
        .spt select:focus-visible,
        .spt textarea:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        /* Hero */
        .hero { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 22px; }
        .hero h2 { margin: 0 0 8px; font-size: clamp(26px, 4.4vw, 36px); line-height: 1.15; font-weight: 800; letter-spacing: -0.8px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .hero p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.65; max-width: 620px; }
        .pro { background: linear-gradient(135deg, #ff5a1f, #ffb020); color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 0.6px; padding: 4px 9px; border-radius: 999px; box-shadow: 0 4px 12px rgba(255, 90, 31, 0.35); }
        .hero-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

        /* Surfaces */
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 22px; margin-bottom: 16px; box-shadow: var(--shadow); }
        .card h3, .card h4, .card h5 { margin: 0; }
        .stack > * + * { margin-top: 16px; }
        .sub { margin: 4px 0 0; font-size: 13px; color: var(--muted); line-height: 1.55; }
        .row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .between { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .two > .card { margin-bottom: 0; }
        .section { margin-bottom: 16px; }

        /* Buttons */
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 11px; padding: 10px 16px; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; border: 1px solid transparent; transition: transform 0.12s, background 0.15s, border-color 0.15s, box-shadow 0.15s; }
        .btn:active:not(:disabled) { transform: translateY(1px); }
        .btn-primary { background: linear-gradient(135deg, #ff5a1f, #ff7a3d); color: #fff; box-shadow: 0 6px 16px rgba(255, 90, 31, 0.32); }
        .btn-primary:hover:not(:disabled) { box-shadow: 0 8px 20px rgba(255, 90, 31, 0.42); }
        .btn-secondary { background: var(--card); color: var(--text); border-color: var(--border); }
        .btn-secondary:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
        .btn-danger { background: var(--card); color: var(--bad); border-color: var(--border); }
        .btn-danger:hover:not(:disabled) { border-color: var(--bad); background: var(--bad-soft); }
        .btn-danger-solid { background: #dc2626; color: #fff; box-shadow: 0 6px 16px rgba(220, 38, 38, 0.3); }
        .btn-sm { padding: 7px 11px; font-size: 12px; }
        .btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .link-btn { background: none; border: 0; padding: 0; font-weight: 700; font-size: 12px; cursor: pointer; color: var(--primary); }
        .link-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Fields */
        .field { display: flex; flex-direction: column; gap: 7px; }
        .label { font-size: 12px; font-weight: 700; }
        .input, .textarea, .select { width: 100%; border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font: inherit; font-size: 13px; color: var(--text); background: var(--input); transition: border-color 0.15s, box-shadow 0.15s; }
        .textarea { resize: vertical; min-height: 76px; line-height: 1.5; }
        .input:focus, .textarea:focus, .select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.14); }
        .input::placeholder, .textarea::placeholder { color: #94a3b8; }
        .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .span-2 { grid-column: span 2; }
        .filters { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }

        /* Toast */
        .toast { position: sticky; top: 12px; z-index: 20; background: var(--card); border: 1px solid var(--primary-line); border-left: 4px solid var(--primary); color: var(--text); padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 600; margin-bottom: 16px; box-shadow: var(--shadow); animation: toast-in 0.25s ease-out; }
        @keyframes toast-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

        /* Level strip + stats */
        .strip { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; background: linear-gradient(120deg, #1b2438, #2a1a14); color: #fff; border-radius: 18px; padding: 18px 22px; margin-bottom: 16px; box-shadow: var(--shadow); }
        .strip-level { font-size: 13px; color: #cbd5e1; }
        .strip-level strong { display: block; font-size: 20px; color: #fff; letter-spacing: -0.3px; }
        .xp { flex: 1; min-width: 160px; }
        .xp-bar { height: 8px; border-radius: 99px; background: rgba(255, 255, 255, 0.15); overflow: hidden; }
        .xp-fill { height: 100%; background: linear-gradient(90deg, #ff5a1f, #ffb020); border-radius: 99px; transition: width 0.5s; }
        .xp small { display: block; margin-top: 6px; font-size: 11px; color: #94a3b8; }
        .strip-pill { background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 8px 14px; font-size: 12px; color: #cbd5e1; text-align: center; }
        .strip-pill strong { display: block; font-size: 17px; color: #fff; }
        .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
        .stats.three { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 0; }
        .stat { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
        .stat span { display: block; font-size: 12px; color: var(--muted); }
        .stat strong { display: block; margin-top: 4px; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .stat.good { background: var(--good-soft); }
        .stat.good span, .stat.good strong { color: var(--good); }
        .stat.blue { background: var(--blue-soft); }
        .stat.blue span, .stat.blue strong { color: var(--blue); }
        .stat.bad strong { color: var(--bad); }

        /* Focus */
        .focus-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid var(--border); }
        .focus-row:first-of-type { border-top: 0; }
        .focus-main { min-width: 0; }
        .focus-main b { display: block; font-size: 14px; margin-bottom: 3px; }
        .focus-main small { font-size: 12px; color: var(--muted); }

        /* Plan cards */
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .plan-card { margin: 0; display: flex; flex-direction: column; position: relative; overflow: hidden; transition: transform 0.15s, box-shadow 0.15s; }
        .plan-card:hover { transform: translateY(-2px); }
        .plan-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent, var(--primary)); }
        .plan-card.urgent { --accent: #ef4444; }
        .plan-card.soon { --accent: #ffb020; }
        .plan-card.calm { --accent: #22c55e; }
        .plan-card.past { --accent: #94a3b8; }
        .plan-top { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
        .plan-body { display: flex; gap: 16px; align-items: center; margin: 14px 0; }
        .plan-body .clamp { margin: 0 0 10px; }
        .star { background: none; border: 0; font-size: 20px; cursor: pointer; line-height: 1; color: #cbd5e1; }
        .star.on { color: #ffb020; }
        .clamp { font-size: 13px; color: var(--muted); line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .meta { display: flex; gap: 8px; flex-wrap: wrap; }
        .pill { background: var(--soft); color: var(--muted); border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; }
        .pill.accent { background: var(--primary-soft); color: var(--primary); }
        .pill.red { background: var(--bad-soft); color: var(--bad); }
        .card-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border); }
        .empty { text-align: center; padding: 44px 20px; }
        .empty-icon { font-size: 38px; }
        .bar { height: 7px; background: var(--soft); border-radius: 99px; overflow: hidden; margin-top: 6px; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, #ff5a1f, #ffb020); border-radius: 99px; transition: width 0.3s; }

        /* Feed + badges */
        .feed { display: flex; gap: 12px; padding: 10px 0; border-top: 1px solid var(--border); font-size: 13px; }
        .feed:first-of-type { border-top: 0; }
        .feed-icon { width: 32px; height: 32px; flex-shrink: 0; border-radius: 50%; background: var(--primary-soft); display: flex; align-items: center; justify-content: center; font-size: 15px; }
        .feed b { display: block; font-size: 13px; }
        .feed small { color: var(--muted); font-size: 11px; }
        .badges { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        .bd { border: 1px solid var(--border); border-radius: 14px; padding: 14px; text-align: center; opacity: 0.5; filter: grayscale(1); }
        .bd.earned { opacity: 1; filter: none; background: var(--primary-soft); border-color: var(--primary-line); }
        .bd .icon { font-size: 26px; }
        .bd strong { display: block; font-size: 13px; margin-top: 4px; }
        .bd span { font-size: 11px; color: var(--muted); }

        /* Editor */
        .insight { display: flex; gap: 12px; align-items: center; background: var(--primary-soft); border: 1px solid var(--primary-line); border-radius: 14px; padding: 12px 16px; font-size: 13px; font-weight: 600; }
        .subject-card { border-left: 4px solid var(--primary-line); }
        .topic-card { border: 1px solid var(--border); border-left: 4px solid var(--border); border-radius: 12px; padding: 14px; background: var(--soft); margin-top: 10px; }
        .topic-card.in-progress { border-left-color: #3b82f6; }
        .topic-card.completed { border-left-color: #22c55e; }
        .topic-head { display: flex; gap: 8px; align-items: center; }
        .x-btn { background: none; border: 0; padding: 0 8px; font-size: 20px; color: var(--bad); cursor: pointer; line-height: 1; }
        .seg { display: flex; gap: 4px; background: var(--card); border: 1px solid var(--border); border-radius: 11px; padding: 4px; margin-top: 12px; }
        .seg button { flex: 1; border: 0; background: transparent; color: var(--muted); padding: 7px 6px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .seg button.on.not-started { background: var(--soft); color: var(--text); }
        .seg button.on.in-progress { background: #3b82f6; color: #fff; }
        .seg button.on.completed { background: #16a34a; color: #fff; }
        .topic-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
        .badge { padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; display: inline-block; }
        .badge-gray { background: var(--soft); color: var(--muted); }
        .badge-blue { background: var(--blue-soft); color: var(--blue); }
        .badge-green { background: var(--good-soft); color: var(--good); }
        .badge-red { background: var(--bad-soft); color: var(--bad); }
        .badge-yellow { background: var(--warn-soft); color: var(--warn); }
        .overview { display: flex; gap: 22px; align-items: center; flex-wrap: wrap; }
        .overview-info { flex: 1; min-width: 220px; }
        .row-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: start; border-top: 1px solid var(--border); padding: 14px 0; }
        .row-item:first-child { border-top: 0; }
        .dashed-box { border: 1px dashed var(--border); padding: 20px; border-radius: 12px; text-align: center; font-size: 13px; color: var(--muted); margin: 0; }
        .savebar { position: sticky; bottom: 12px; z-index: 10; display: flex; justify-content: space-between; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 12px 14px; box-shadow: 0 12px 32px rgba(23, 32, 51, 0.16); margin-top: 24px; }
        .dirty { font-size: 12px; font-weight: 700; color: var(--muted); display: flex; align-items: center; gap: 8px; }
        .dirty::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; }
        .dirty.on { color: var(--warn); }
        .dirty.on::before { background: #ffb020; }

        /* Switch */
        .switch-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; background: var(--soft); border: 1px solid var(--border); border-radius: 14px; padding: 12px 16px; margin-top: 12px; }
        .switch-row strong { display: block; font-size: 13px; }
        .switch-row span { display: block; margin-top: 2px; font-size: 12px; color: var(--muted); }
        .switch { position: relative; flex-shrink: 0; width: 48px; height: 28px; border: 0; border-radius: 999px; background: #cbd5e1; cursor: pointer; transition: background 0.2s; }
        .spt.dark .switch { background: #334155; }
        .switch.on { background: linear-gradient(135deg, #ff5a1f, #ff7a3d); }
        .switch i { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25); transition: transform 0.2s; }
        .switch.on i { transform: translateX(20px); }

        .tips { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.75; color: var(--muted); }
        .tips b { color: var(--text); }
        .note { margin: 16px 0 0; padding-top: 16px; border-top: 1px solid var(--border); font-size: 11px; line-height: 1.6; color: var(--muted); }

        /* Celebration */
        .confetti { position: absolute; inset: 0 0 auto 0; height: 0; pointer-events: none; z-index: 30; }
        .confetti i { position: absolute; top: -10px; width: 8px; height: 14px; border-radius: 2px; opacity: 0; animation: fall 2.6s ease-in forwards; }
        @keyframes fall { 0% { opacity: 1; transform: translateY(0) rotate(0deg); } 100% { opacity: 0; transform: translateY(520px) rotate(540deg); } }

        /* Dialog */
        .modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(10, 16, 30, 0.55); backdrop-filter: blur(4px); animation: fade-in 0.15s ease-out; }
        .modal { width: 100%; max-width: 400px; background: var(--card); color: var(--text); border: 1px solid var(--border); border-radius: 20px; padding: 26px 24px 22px; text-align: center; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35); animation: pop-in 0.18s ease-out; }
        .modal-icon { width: 52px; height: 52px; margin: 0 auto 14px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; background: var(--primary-soft); }
        .modal-icon.danger { background: var(--bad-soft); }
        .modal h3 { margin: 0 0 8px; font-size: 18px; letter-spacing: -0.3px; }
        .modal p { margin: 0 0 22px; font-size: 13px; line-height: 1.6; color: var(--muted); }
        .modal-actions { display: flex; gap: 10px; }
        .modal-actions .btn { flex: 1; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pop-in { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

        @media (max-width: 900px) {
          .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .badges { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 768px) {
          .hero { flex-direction: column; }
          .hero-actions { justify-content: flex-start; }
          .grid, .two { grid-template-columns: 1fr; }
          .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .row-item { grid-template-columns: 1fr; }
        }
        @media (max-width: 520px) {
          .card { padding: 16px; }
          .form-grid, .topic-grid, .filters { grid-template-columns: 1fr; }
          .span-2 { grid-column: span 1; }
          .stats.three { grid-template-columns: 1fr; }
          .seg button { font-size: 11px; padding: 7px 2px; }
          .savebar .btn { flex: 1; }
          .plan-body { flex-direction: column; align-items: flex-start; }
        }
        @media (prefers-reduced-motion: reduce) {
          .confetti { display: none; }
          .plan-card, .btn, .switch, .switch i { transition: none; }
        }
        @media print {
          .no-print, .confetti, .toast { display: none !important; }
        }
      `}</style>

      {celebrate && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 30 }).map((_, index) => (
            <i
              key={index}
              style={{
                left: `${(index * 37) % 100}%`,
                background: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
                animationDelay: `${(index % 8) * 0.12}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* ------------------------------ Header ------------------------------ */}
      <div className="hero no-print">
        <div>
          <h2>
            Syllabus Progress Tracker <span className="pro">PRO</span>
          </h2>
          <p>Plan every subject, focus on what is due next, and watch your exam readiness grow.</p>
        </div>

        <div className="hero-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setDark((previous) => !previous)} aria-label="Toggle dark mode">
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
          {mode === "editor" && (
            <button type="button" className="btn btn-secondary" onClick={goDashboard}>
              ← Back to dashboard
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}

      {/* ----------------------------- Dashboard ----------------------------- */}
      {mode === "dashboard" && (
        <div>
          <div className="strip">
            <div className="strip-level">
              Level {level}
              <strong>{levelTitle}</strong>
            </div>
            <div className="xp">
              <div className="xp-bar">
                <div className="xp-fill" style={{ width: `${levelProgress}%` }} />
              </div>
              <small>
                {totalXp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP to level {level + 1}
              </small>
            </div>
            <div className="strip-pill">
              <strong>🔥 {streak}</strong>day streak
            </div>
            <div className="strip-pill">
              <strong>
                {badges.filter((badge) => badge.earned).length}/{badges.length}
              </strong>
              badges
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <span>Study plans</span>
              <strong>{plans.length}</strong>
            </div>
            <div className="stat">
              <span>Topics completed</span>
              <strong>
                {completedTopics}/{totalTopics}
              </strong>
            </div>
            <div className="stat">
              <span>Overdue topics</span>
              <strong style={{ color: overdueTopics ? "var(--bad)" : undefined }}>{overdueTopics}</strong>
            </div>
            <div className="stat">
              <span>Overall progress</span>
              <strong>{globalProgress}%</strong>
            </div>
          </div>

          {plans.length > 0 && (
            <div className="card">
              <div className="between" style={{ marginBottom: 6 }}>
                <div>
                  <h3 style={{ fontSize: 17 }}>Today focus</h3>
                  <p className="sub">The topics that need your attention first, across every plan.</p>
                </div>
                <span className="pill accent">{inProgressTopics} in progress</span>
              </div>

              {focusItems.length === 0 ? (
                <p className="dashed-box" style={{ marginTop: 12 }}>
                  {"You're all caught up. Nothing is overdue, due soon or marked high priority."}
                </p>
              ) : (
                focusItems.map((item) => (
                  <div className="focus-row" key={item.topic.id}>
                    <div className="focus-main">
                      <b>{item.topic.name}</b>
                      <small>
                        {item.plan.name} · {item.subject.name}
                      </small>
                      <div style={{ marginTop: 6 }}>
                        <span className={`badge ${focusBadge(item)}`}>{focusLabel(item)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`btn btn-sm ${item.topic.status === "in-progress" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() =>
                        advanceTopic(
                          item.plan.id,
                          item.subject.id,
                          item.topic.id,
                          item.topic.status === "in-progress" ? "completed" : "in-progress"
                        )
                      }
                    >
                      {item.topic.status === "in-progress" ? "Mark done" : "Start"}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="row section no-print">
            <button type="button" className="btn btn-primary" onClick={startNewPlan}>
              + Create study plan
            </button>
            <button type="button" className="btn btn-secondary" onClick={addSample}>
              Add sample plan
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
              Import JSON file
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowImport((previous) => !previous)}>
              Paste JSON
            </button>
            <button type="button" className="btn btn-secondary" onClick={exportAll}>
              Backup all
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={(event) => {
                handleImportFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>

          {showImport && (
            <div className="card stack">
              <div>
                <h3 style={{ fontSize: 16 }}>Import study plan JSON</h3>
                <p className="sub">Paste a plan or backup file exported from this tool.</p>
              </div>
              <textarea
                className="textarea"
                rows={6}
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder="Paste JSON here..."
              />
              <div className="row">
                <button type="button" className="btn btn-primary" onClick={handleImportText} disabled={!importText.trim()}>
                  Import plan
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowImport(false);
                    setImportText("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="between" style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Your study plans</h3>
            <input
              type="search"
              className="input"
              style={{ maxWidth: 280, minWidth: 0, flex: "1 1 180px" }}
              placeholder="Search study plans..."
              value={planSearch}
              onChange={(event) => setPlanSearch(event.target.value)}
              aria-label="Search study plans"
            />
          </div>

          {planCards.length === 0 ? (
            <div className="card empty">
              <div className="empty-icon">📚</div>
              <h3 style={{ margin: "12px 0 4px", fontSize: 17 }}>
                {plans.length === 0 ? "No study plans yet" : "No matching plans"}
              </h3>
              <p className="sub" style={{ maxWidth: 420, margin: "0 auto 18px" }}>
                {plans.length === 0
                  ? "Create a plan, or add a ready-made sample to see how tracking works."
                  : "Try another search term."}
              </p>
              {plans.length === 0 && (
                <div className="row" style={{ justifyContent: "center" }}>
                  <button type="button" className="btn btn-primary" onClick={startNewPlan}>
                    Create your first plan
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={addSample}>
                    Add sample plan
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid">
              {planCards.map((plan) => {
                const topics = getAllTopics(plan);
                const progress = getProgress(topics);
                const completed = topics.filter((t) => t.status === "completed").length;
                const days = daysUntil(plan.examDate);
                const overdue = topics.filter(isOverdue).length;
                return (
                  <div className={`card plan-card ${urgencyClass(days)}`} key={plan.id}>
                    <div className="plan-top">
                      <h4 style={{ fontSize: 17, lineHeight: 1.3 }}>{plan.name}</h4>
                      <button
                        type="button"
                        className={`star ${plan.favorite ? "on" : ""}`}
                        onClick={() => toggleFavorite(plan.id)}
                        aria-label={plan.favorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        {plan.favorite ? "★" : "☆"}
                      </button>
                    </div>

                    <div className="plan-body">
                      <Ring value={progress} size={74} stroke={8} />
                      <div style={{ minWidth: 0 }}>
                        <p className="clamp" style={{ minHeight: 40 }}>
                          {plan.description || "No description added."}
                        </p>
                        <div className="meta">
                          <span className="pill accent">{plural(plan.subjects.length, "subject")}</span>
                          <span className="pill">
                            {completed}/{topics.length} topics
                          </span>
                          {days !== null && <span className="pill">📅 {examText(days)}</span>}
                          {overdue > 0 && <span className="pill red">{overdue} overdue</span>}
                        </div>
                      </div>
                    </div>

                    <div className="card-actions no-print">
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => openPlan(plan)}>
                        Open plan
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => duplicatePlan(plan)}>
                        Duplicate
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => exportPlan(plan)}>
                        Export
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => deletePlan(plan)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="two" style={{ marginTop: 22, marginBottom: 16 }}>
            <div className="card">
              <div className="between" style={{ marginBottom: 6 }}>
                <h3 style={{ fontSize: 16 }}>Recent activity</h3>
                {activity.length > 0 && (
                  <button type="button" className="link-btn" onClick={clearActivity}>
                    Clear
                  </button>
                )}
              </div>
              {activity.length === 0 ? (
                <p className="dashed-box" style={{ marginTop: 10 }}>
                  Complete a topic and it will show up here.
                </p>
              ) : (
                activity.slice(0, 6).map((item) => (
                  <div className="feed" key={item.id}>
                    <div className="feed-icon">{activityIcons[item.type]}</div>
                    <div>
                      <b>{item.detail}</b>
                      <small>
                        {item.planName} · {timeAgo(item.date)}
                      </small>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>Upcoming exams</h3>
              {upcomingExams.length === 0 ? (
                <p className="dashed-box" style={{ marginTop: 10 }}>
                  Set an exam date on a plan to start the countdown.
                </p>
              ) : (
                upcomingExams.slice(0, 5).map(({ plan, days }) => (
                  <div key={plan.id} className="focus-row">
                    <div className="focus-main">
                      <b>{plan.name}</b>
                      <small>
                        {formatDate(plan.examDate)} · {getProgress(getAllTopics(plan))}% ready
                      </small>
                    </div>
                    <span className={`badge ${days <= 7 ? "badge-red" : days <= 21 ? "badge-yellow" : "badge-green"}`}>
                      {days === 0 ? "Today" : `${days} days`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>Badges</h3>
            <div className="badges">
              {badges.map((badge) => (
                <div className={`bd ${badge.earned ? "earned" : ""}`} key={badge.name}>
                  <div className="icon">{badge.icon}</div>
                  <strong>{badge.name}</strong>
                  <span>{badge.hint}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ Editor ------------------------------ */}
      {mode === "editor" && draft && (
        <div>
          <div className="card stack">
            <div>
              <h3 style={{ fontSize: 17 }}>{isNewDraft ? "New study plan" : "Study plan details"}</h3>
              <p className="sub">Name your plan, describe it, and set the exam date.</p>
            </div>

            <div className="form-grid">
              <div className="field span-2">
                <label className="label" htmlFor="plan-name">
                  Study plan name
                </label>
                <input
                  id="plan-name"
                  className="input"
                  value={draft.name}
                  onChange={(event) => updateDraft({ name: event.target.value })}
                  placeholder="Example: Class 12 Final Exam"
                  maxLength={100}
                />
              </div>

              <div className="field span-2">
                <label className="label" htmlFor="plan-description">
                  Description (optional)
                </label>
                <textarea
                  id="plan-description"
                  className="textarea"
                  rows={2}
                  value={draft.description}
                  onChange={(event) => updateDraft({ description: event.target.value })}
                  placeholder="Add a short note about this plan..."
                  maxLength={300}
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="exam-date">
                  Exam date (optional)
                </label>
                <input
                  id="exam-date"
                  type="date"
                  className="input"
                  value={draft.examDate}
                  onChange={(event) => updateDraft({ examDate: event.target.value })}
                />
              </div>
            </div>

            <div className="insight">
              <span style={{ fontSize: 20 }}>🎯</span>
              <span>
                {draftDays !== null && draftDays >= 0 && <b>{examText(draftDays)}. </b>}
                {paceText}
              </span>
            </div>
          </div>

          <div className="between" style={{ marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17 }}>Subjects and topics</h3>
              <p className="sub">Add subjects, then add the topics under each one.</p>
            </div>
            <div className="row no-print">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setExpandedSubjects(Object.fromEntries(draft.subjects.map((s) => [s.id, true])))}
              >
                Expand all
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setExpandedSubjects(Object.fromEntries(draft.subjects.map((s) => [s.id, false])))}
              >
                Collapse all
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={addSubject}>
                + Add subject
              </button>
            </div>
          </div>

          {draft.subjects.map((subject, subjectIndex) => {
            const namedTopics = subject.topics.filter((topic) => topic.name.trim());
            const subjectProgress = getProgress(namedTopics);
            const isExpanded = expandedSubjects[subject.id] ?? true;
            return (
              <div className="card subject-card" key={subject.id}>
                <div className="between" style={{ alignItems: "flex-end" }}>
                  <div className="field" style={{ flex: 1, minWidth: 220 }}>
                    <label className="label" htmlFor={`subject-${subject.id}`}>
                      Subject {subjectIndex + 1}
                    </label>
                    <input
                      id={`subject-${subject.id}`}
                      className="input"
                      value={subject.name}
                      onChange={(event) => updateSubject(subject.id, { name: event.target.value })}
                      placeholder="Example: Mathematics"
                    />
                  </div>
                  <div className="row no-print">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setExpandedSubjects((previous) => ({ ...previous, [subject.id]: !isExpanded }))}
                    >
                      {isExpanded ? "Collapse" : "Expand"}
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteSubject(subject)}>
                      Delete
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div className="between" style={{ fontSize: 12, fontWeight: 700 }}>
                    <span>
                      Subject progress · {namedTopics.filter((t) => t.status === "completed").length}/{namedTopics.length} topics
                    </span>
                    <span style={{ color: "var(--primary)" }}>{subjectProgress}%</span>
                  </div>
                  <div className="bar">
                    <div className="bar-fill" style={{ width: `${subjectProgress}%` }} />
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 16 }}>
                    <div className="between no-print" style={{ marginBottom: 6 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 800 }}>Topics</h4>
                      <div className="row" style={{ gap: 14 }}>
                        <button type="button" className="link-btn" onClick={() => markSubjectDone(subject)} disabled={!namedTopics.length}>
                          Mark all done
                        </button>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setBulk(bulk?.subjectId === subject.id ? null : { subjectId: subject.id, text: "" })}
                        >
                          ⚡ Paste topics
                        </button>
                        <button type="button" className="link-btn" onClick={() => addTopic(subject.id)}>
                          + Add topic
                        </button>
                      </div>
                    </div>

                    {bulk?.subjectId === subject.id && (
                      <div className="stack no-print" style={{ margin: "10px 0 14px" }}>
                        <p className="sub">Paste one topic per line. Bullets and numbers are removed for you.</p>
                        <textarea
                          className="textarea"
                          rows={5}
                          value={bulk.text}
                          onChange={(event) => setBulk({ subjectId: subject.id, text: event.target.value })}
                          placeholder={"Chapter 1: Real numbers\nChapter 2: Polynomials\nChapter 3: Linear equations"}
                          aria-label="Topics to add, one per line"
                        />
                        <div className="row">
                          <button type="button" className="btn btn-primary btn-sm" onClick={addBulkTopics} disabled={!bulk.text.trim()}>
                            Add topics
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setBulk(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {subject.topics.map((topic, topicIndex) => {
                      const days = topic.targetDate ? daysUntil(topic.targetDate) : null;
                      return (
                        <div className={`topic-card ${topic.status}`} key={topic.id}>
                          <div className="topic-head">
                            <input
                              id={`topic-${topic.id}`}
                              className="input"
                              value={topic.name}
                              onChange={(event) => updateTopic(subject.id, topic.id, { name: event.target.value })}
                              placeholder={`Topic ${topicIndex + 1}, for example: Algebra - Chapter 1`}
                              aria-label={`Topic ${topicIndex + 1} name`}
                            />
                            <button
                              type="button"
                              className="x-btn no-print"
                              onClick={() => deleteTopic(subject.id, topic.id)}
                              aria-label={`Remove topic ${topicIndex + 1}`}
                            >
                              ×
                            </button>
                          </div>

                          <div className="seg" role="group" aria-label="Study status">
                            {STATUSES.map((status) => (
                              <button
                                type="button"
                                key={status}
                                className={topic.status === status ? `on ${status}` : ""}
                                aria-pressed={topic.status === status}
                                onClick={() => updateTopic(subject.id, topic.id, { status })}
                              >
                                {statusLabels[status]}
                              </button>
                            ))}
                          </div>

                          <div className="topic-grid">
                            <div className="field">
                              <label className="label" htmlFor={`priority-${topic.id}`}>
                                Priority
                              </label>
                              <select
                                id={`priority-${topic.id}`}
                                className="select"
                                value={topic.priority}
                                onChange={(event) => updateTopic(subject.id, topic.id, { priority: event.target.value as Priority })}
                              >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                            <div className="field">
                              <label className="label" htmlFor={`target-${topic.id}`}>
                                Target date (optional)
                              </label>
                              <input
                                id={`target-${topic.id}`}
                                type="date"
                                className="input"
                                value={topic.targetDate}
                                onChange={(event) => updateTopic(subject.id, topic.id, { targetDate: event.target.value })}
                              />
                            </div>
                          </div>

                          <div className="field" style={{ marginTop: 12 }}>
                            <label className="label" htmlFor={`notes-${topic.id}`}>
                              Notes (optional)
                            </label>
                            <textarea
                              id={`notes-${topic.id}`}
                              className="textarea"
                              style={{ minHeight: 56 }}
                              rows={2}
                              value={topic.notes}
                              onChange={(event) => updateTopic(subject.id, topic.id, { notes: event.target.value })}
                              placeholder="Add revision notes..."
                            />
                          </div>

                          <div className="row" style={{ marginTop: 12, gap: 8 }}>
                            <span className={`badge ${priorityBadge(topic.priority)}`}>{priorityLabels[topic.priority]} priority</span>
                            {topic.targetDate && (
                              <span className={`badge ${isOverdue(topic) ? "badge-red" : "badge-gray"}`}>
                                📅 {formatDate(topic.targetDate)}
                                {isOverdue(topic) ? ` · overdue ${plural(Math.abs(days ?? 0), "day")}` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {subject.topics.length === 0 && <p className="dashed-box">No topics added yet.</p>}

                    <button
                      type="button"
                      className="btn btn-secondary no-print"
                      style={{ width: "100%", borderStyle: "dashed", marginTop: 12 }}
                      onClick={() => addTopic(subject.id)}
                    >
                      + Add another topic
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {draft.subjects.length === 0 && (
            <div className="card empty">
              <p className="sub" style={{ marginBottom: 14 }}>
                No subjects yet. Add a subject to get started.
              </p>
              <button type="button" className="btn btn-primary" onClick={addSubject}>
                + Add first subject
              </button>
            </div>
          )}

          {/* Progress overview */}
          <div className="card" style={{ marginTop: 24 }}>
            <div className="between" style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 16 }}>Progress overview</h3>
              <div className="row no-print">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => exportCsv(draft)} disabled={!draftNamed.length}>
                  Export CSV
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                  Print
                </button>
              </div>
            </div>

            <div className="overview">
              <Ring value={draftProgress} size={120} stroke={11} />
              <div className="overview-info">
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                  {draftCompleted} of {draftNamed.length} topics completed
                </p>
                <div className="bar" style={{ height: 10, marginTop: 10 }}>
                  <div className="bar-fill" style={{ width: `${draftProgress}%` }} />
                </div>
                <div className="stats three" style={{ marginTop: 16 }}>
                  <div className="stat good">
                    <span>Completed</span>
                    <strong>{draftCompleted}</strong>
                  </div>
                  <div className="stat blue">
                    <span>In progress</span>
                    <strong>{draftInProgress}</strong>
                  </div>
                  <div className="stat">
                    <span>Not started</span>
                    <strong>{draftNamed.length - draftCompleted - draftInProgress}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card no-print">
            <div>
              <h3 style={{ fontSize: 16 }}>Find and filter topics</h3>
              <p className="sub">Search by name, filter by status, priority or subject, and update status in one click.</p>
            </div>

            <input
              type="search"
              className="input"
              style={{ marginTop: 12 }}
              placeholder="Search topics, notes or subjects..."
              value={topicSearch}
              onChange={(event) => setTopicSearch(event.target.value)}
              aria-label="Search topics"
            />

            <div className="filters">
              <div className="field">
                <label className="label" htmlFor="filter-status">
                  Status
                </label>
                <select id="filter-status" className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                  <option value="all">All statuses</option>
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="filter-priority">
                  Priority
                </label>
                <select id="filter-priority" className="select" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}>
                  <option value="all">All priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="filter-subject">
                  Subject
                </label>
                <select id="filter-subject" className="select" value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
                  <option value="all">All subjects</option>
                  {draft.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name || "Untitled"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="filter-sort">
                  Sort by
                </label>
                <select id="filter-sort" className="select" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                  <option value="priority">Priority</option>
                  <option value="name">Name A-Z</option>
                  <option value="target">Target date</option>
                </select>
              </div>
            </div>

            <div className="switch-row">
              <div>
                <strong id="spt-hide-label">Hide completed topics</strong>
                <span>Focus on what is still left to study.</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={hideCompleted}
                aria-labelledby="spt-hide-label"
                className={`switch ${hideCompleted ? "on" : ""}`}
                onClick={() => setHideCompleted((previous) => !previous)}
              >
                <i />
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="between" style={{ marginBottom: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 800 }}>Matching topics</h4>
                <button type="button" className="link-btn" onClick={resetFilters}>
                  Clear filters
                </button>
              </div>

              {filteredSubjects.length === 0 ? (
                <p className="dashed-box">No topics match your current filters.</p>
              ) : (
                filteredSubjects.map((subject) => (
                  <div key={subject.id} style={{ marginBottom: 16 }}>
                    <h5 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800 }}>{subject.name || "Untitled"}</h5>
                    {subject.topics.map((topic) => (
                      <div className="row-item" key={topic.id}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>{topic.name}</p>
                          {topic.notes && <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--muted)" }}>{topic.notes}</p>}
                          <div className="row" style={{ gap: 8, marginTop: 6 }}>
                            <span className={`badge ${statusBadge(topic.status)}`}>{statusLabels[topic.status]}</span>
                            <span className={`badge ${priorityBadge(topic.priority)}`}>{priorityLabels[topic.priority]}</span>
                            {topic.targetDate && (
                              <span className={`badge ${isOverdue(topic) ? "badge-red" : "badge-gray"}`}>📅 {formatDate(topic.targetDate)}</span>
                            )}
                          </div>
                        </div>

                        <div className="row">
                          <select
                            className="select"
                            style={{ width: "auto", padding: "6px 10px" }}
                            value={topic.status}
                            onChange={(event) => updateTopic(subject.id, topic.id, { status: event.target.value as TopicStatus })}
                            aria-label={`Status for ${topic.name}`}
                          >
                            <option value="not-started">Not Started</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => jumpToTopic(subject.id, topic.id)}>
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="savebar no-print">
            <span className={`dirty ${dirty ? "on" : ""}`}>{dirty ? "Unsaved changes" : "No changes yet"}</span>
            <div className="row">
              <button type="button" className="btn btn-secondary" onClick={goDashboard}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={savePlan}>
                Save study plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ Footer ------------------------------ */}
      <div className="card no-print" style={{ marginTop: 28 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>How to get the most from Syllabus Tracker Pro</h3>
        <ol className="tips">
          <li>
            <b>Create a plan</b> for each exam and set the exam date to see the daily pace you need.
          </li>
          <li>
            <b>Paste topics</b> straight from your syllabus, one per line, instead of typing them one by one.
          </li>
          <li>
            <b>Add target dates</b> so overdue topics and today focus can guide your next session.
          </li>
          <li>
            <b>Start and finish topics</b> from the dashboard without opening the plan.
          </li>
          <li>
            <b>Duplicate a plan</b> to reuse it next term with progress reset, and export it as JSON or CSV.
          </li>
        </ol>
        <p className="note">
          Your plans, activity and preferences are saved in this browser using local storage. Clearing browser data or
          switching devices may remove them. Use Backup all to keep a copy.
        </p>
      </div>

      {/* ----------------------------- Dialog ----------------------------- */}
      {dialog &&
        typeof document !== "undefined" &&
        createPortal(
          <div className={`modal-root ${dark ? "dark" : ""}`}>
            <div className="modal-backdrop" onClick={() => setDialog(null)}>
              <div
                className="modal"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="spt-dialog-title"
                aria-describedby="spt-dialog-message"
                onClick={(event) => event.stopPropagation()}
              >
                <div className={`modal-icon ${dialog.tone}`}>{dialog.tone === "danger" ? "⚠️" : "✅"}</div>
                <h3 id="spt-dialog-title">{dialog.title}</h3>
                <p id="spt-dialog-message">{dialog.message}</p>
                <div className="modal-actions">
                  <button type="button" ref={cancelRef} className="btn btn-secondary" onClick={() => setDialog(null)}>
                    {dialog.cancelLabel || "Cancel"}
                  </button>
                  <button
                    type="button"
                    ref={confirmRef}
                    className={`btn ${dialog.tone === "danger" ? "btn-danger-solid" : "btn-primary"}`}
                    onClick={() => {
                      const run = dialog.onConfirm;
                      setDialog(null);
                      run();
                    }}
                  >
                    {dialog.confirmLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}