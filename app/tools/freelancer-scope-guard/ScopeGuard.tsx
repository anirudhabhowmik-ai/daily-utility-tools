"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ToolShell from "../ToolShell";

/* =========================================================
   Types & Constants
========================================================= */

type Section = "deliverables" | "exclusions" | "assumptions" | "changes";
type Status = "pending" | "agreed" | "completed";
type Priority = "low" | "medium" | "high";
type SortOption = "newest" | "priority" | "hours" | "status";
type StatusFilter = "all" | Status;

type ScopeItem = {
  id: string;
  section: Section;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  hours: number;
  createdAt: string;
};

type ProjectInfo = {
  name: string;
  client: string;
  owner: string;
  deadline: string;
  projectType: string;
};

type ItemForm = {
  section: Section;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  hours: string;
};

/** Template entries omit fields generated at insert time. */
type TemplateEntry = Omit<ScopeItem, "id" | "status" | "createdAt">;

const STORAGE_KEY = "scope-guard-pro-v2";

const SECTIONS: {
  id: Section;
  label: string;
  description: string;
  icon: string;
}[] = [
  { id: "deliverables", label: "Deliverables",    description: "What is included in the project",           icon: "✓" },
  { id: "exclusions",   label: "Exclusions",      description: "What is specifically not included",         icon: "−" },
  { id: "assumptions",  label: "Assumptions",     description: "Conditions and expectations",               icon: "◇" },
  { id: "changes",      label: "Change requests", description: "Additional or modified requirements",       icon: "↗" },
];

const DEFAULT_PROJECT: ProjectInfo = {
  name: "",
  client: "",
  owner: "",
  deadline: "",
  projectType: "Website",
};

const DEFAULT_FORM: ItemForm = {
  section: "deliverables",
  title: "",
  description: "",
  status: "pending",
  priority: "medium",
  hours: "0",
};

const TEMPLATES: Record<"website" | "software", TemplateEntry[]> = {
  website: [
    {
      section: "deliverables",
      title: "Homepage Design",
      description: "Wireframe, UI design, and responsive layout for homepage.",
      priority: "high",
      hours: 12,
    },
    {
      section: "deliverables",
      title: "Contact Form Setup",
      description: "Form creation, validation, and email integration.",
      priority: "medium",
      hours: 4,
    },
    {
      section: "exclusions",
      title: "Copywriting",
      description: "Client is responsible for providing all final text content.",
      priority: "medium",
      hours: 0,
    },
    {
      section: "assumptions",
      title: "Client Feedback",
      description: "Feedback rounds limited to 2 revisions per page.",
      priority: "low",
      hours: 0,
    },
  ],
  software: [
    {
      section: "deliverables",
      title: "User Authentication",
      description: "Login, signup, password reset, and session management.",
      priority: "high",
      hours: 20,
    },
    {
      section: "deliverables",
      title: "Database Schema",
      description: "Relational database design and migrations.",
      priority: "high",
      hours: 10,
    },
    {
      section: "exclusions",
      title: "Third-party API Fees",
      description: "Costs for external APIs (e.g., Stripe, SendGrid) are not included.",
      priority: "medium",
      hours: 0,
    },
    {
      section: "changes",
      title: "Mobile App Version",
      description: "Requested to build a React Native app version.",
      priority: "high",
      hours: 80,
    },
  ],
};

/* Sort priority maps — hoisted so they aren't recreated each render. */
const PRIORITY_ORDER: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
const STATUS_ORDER: Record<Status, number> = { pending: 3, agreed: 2, completed: 1 };

/* =========================================================
   Helpers
========================================================= */

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function safeHours(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 100_000);
}

function formatHours(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 hrs";
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} hrs`;
}

function escapeCsv(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sectionLabel(section: Section) {
  return SECTIONS.find((item) => item.id === section)?.label ?? section;
}

function statusLabel(status: Status) {
  if (status === "agreed") return "Agreed";
  if (status === "completed") return "Completed";
  return "Pending";
}

/**
 * Returns the number of whole calendar days from today (UTC midnight)
 * to the given "YYYY-MM-DD" deadline (UTC midnight). Negative if overdue.
 * Returns null if no valid deadline is set.
 */
function daysUntil(deadline: string): number | null {
  if (!deadline) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);
  if (!match) return null;

  const [, y, m, d] = match;
  const target = Date.UTC(Number(y), Number(m) - 1, Number(d));
  if (!Number.isFinite(target)) return null;

  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.round((target - today) / 86_400_000);
}

/* =========================================================
   Main Component
========================================================= */

export default function ScopeGuard() {
  const nextId = useRef(0);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [project, setProject] = useState<ProjectInfo>(DEFAULT_PROJECT);
  const [tasks, setTasks] = useState<ScopeItem[]>([]);
  const [form, setForm] = useState<ItemForm>(DEFAULT_FORM);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Section | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  /* ---------------------------------------------------------
     Load saved project (with light validation)
  --------------------------------------------------------- */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.project && typeof parsed.project === "object") {
          setProject({ ...DEFAULT_PROJECT, ...parsed.project });
        }
        if (Array.isArray(parsed?.tasks)) {
          // Coerce any malformed legacy rows so calculations stay numeric.
          const cleaned: ScopeItem[] = parsed.tasks
            .filter((t: unknown): t is Record<string, unknown> =>
              typeof t === "object" && t !== null
            )
            .map((t:any) => ({
              id: String(t.id ?? createId()),
              section: (["deliverables", "exclusions", "assumptions", "changes"] as Section[]).includes(
                t.section as Section
              )
                ? (t.section as Section)
                : "deliverables",
              title: String(t.title ?? ""),
              description: String(t.description ?? ""),
              status: (["pending", "agreed", "completed"] as Status[]).includes(t.status as Status)
                ? (t.status as Status)
                : "pending",
              priority: (["low", "medium", "high"] as Priority[]).includes(t.priority as Priority)
                ? (t.priority as Priority)
                : "medium",
              hours: safeHours((t.hours as number) ?? 0),
              createdAt:
                typeof t.createdAt === "string" && !Number.isNaN(Date.parse(t.createdAt))
                  ? t.createdAt
                  : new Date().toISOString(),
            }));
          setTasks(cleaned);
        }
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  /* ---------------------------------------------------------
     Persist project
  --------------------------------------------------------- */
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ project, tasks }));
    } catch {
      /* ignore */
    }
  }, [project, tasks, loaded]);

  /* ---------------------------------------------------------
     Derived values
  --------------------------------------------------------- */

  const daysRemaining = useMemo(() => daysUntil(project.deadline), [project.deadline]);

  const stats = useMemo(() => {
    const count = tasks.length;
    const agreed = tasks.filter((t) => t.status === "agreed").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const pending = tasks.filter((t) => t.status === "pending").length;

    const deliverables = tasks.filter((t) => t.section === "deliverables");
    const changes = tasks.filter((t) => t.section === "changes");

    const sumHours = (arr: ScopeItem[]) =>
      arr.reduce((total, item) => total + (Number.isFinite(item.hours) ? item.hours : 0), 0);

    const deliverableHours = sumHours(deliverables);
    const approvedChangeHours = sumHours(changes.filter((t) => t.status !== "pending"));
    const plannedHours = deliverableHours + approvedChangeHours;

    // Progress counts both agreed and completed as "confirmed".
    const confirmed = agreed + completed;
    const progress = count ? Math.round((confirmed / count) * 100) : 0;

    return {
      count,
      agreed,
      completed,
      pending,
      confirmed,
      progress,
      plannedHours,
      deliverableHours,
      approvedChangeHours,
    };
  }, [tasks]);

  const insights = useMemo(() => {
    const list: { type: "warning" | "success" | "info"; text: string }[] = [];

    const highRiskPending = tasks.filter(
      (t) => t.priority === "high" && t.status === "pending"
    );
    if (highRiskPending.length > 0) {
      list.push({
        type: "warning",
        text: `${highRiskPending.length} high-priority item(s) are still pending approval.`,
      });
    }

    if (
      daysRemaining !== null &&
      daysRemaining >= 0 &&
      daysRemaining <= 7 &&
      stats.pending > 0
    ) {
      list.push({
        type: "warning",
        text: `Deadline is in ${daysRemaining} day(s), but ${stats.pending} item(s) are unapproved.`,
      });
    }

    if (daysRemaining !== null && daysRemaining < 0 && stats.pending > 0) {
      list.push({
        type: "warning",
        text: `Deadline passed ${Math.abs(daysRemaining)} day(s) ago with ${stats.pending} unapproved item(s).`,
      });
    }

    if (
      stats.deliverableHours > 0 &&
      stats.approvedChangeHours >= stats.deliverableHours * 0.5
    ) {
      list.push({
        type: "warning",
        text: "Change requests equal or exceed 50% of original deliverable hours. Scope creep risk!",
      });
    }

    if (stats.count > 0 && !tasks.some((t) => t.section === "exclusions")) {
      list.push({
        type: "info",
        text: "No exclusions defined. Add what is NOT included to protect your scope.",
      });
    }

    if (stats.count > 0 && stats.pending === 0) {
      list.push({
        type: "success",
        text: "All scope items are agreed or completed. Project is fully aligned!",
      });
    }

    return list;
  }, [tasks, stats, daysRemaining]);

  const sectionCounts = useMemo(() => {
    const result = {} as Record<Section, number>;
    SECTIONS.forEach((s) => {
      result[s.id] = tasks.filter((t) => t.section === s.id).length;
    });
    return result;
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = tasks.filter((task) => {
      const matchesSection = filter === "all" || task.section === filter;
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query);
      return matchesSection && matchesStatus && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "priority":
          return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        case "hours":
          return b.hours - a.hours;
        case "status":
          return STATUS_ORDER[b.status] - STATUS_ORDER[a.status];
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [tasks, filter, statusFilter, search, sortBy]);

  /* ---------------------------------------------------------
     Actions
  --------------------------------------------------------- */

  const updateProject = (field: keyof ProjectInfo, value: string) => {
    setProject((p) => ({ ...p, [field]: value }));
  };

  const reset = () => {
    if (!confirm("Are you sure you want to reset all project data? This cannot be undone.")) return;
    setProject(DEFAULT_PROJECT);
    setTasks([]);
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setFilter("all");
    setStatusFilter("all");
    setSearch("");
    nextId.current = 0;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const loadTemplate = (type: keyof typeof TEMPLATES) => {
    const template = TEMPLATES[type];
    const existingKeys = new Set(tasks.map((t) => `${t.section}::${t.title.toLowerCase()}`));

    const newTasks: ScopeItem[] = template
      .filter((t) => !existingKeys.has(`${t.section}::${t.title.toLowerCase()}`))
      .map((t) => ({
        ...t,
        id: createId(),
        status: "pending",
        createdAt: new Date().toISOString(),
      }));

    if (newTasks.length === 0) return;
    setTasks((current) => [...current, ...newTasks]);
  };

  const updateForm = <K extends keyof ItemForm>(field: K, value: ItemForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveItem = () => {
    const title = form.title.trim();
    if (!title) return;

    const item: ScopeItem = {
      id: editingId ?? `${createId()}-${nextId.current++}`,
      section: form.section,
      title,
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      hours: safeHours(form.hours),
      createdAt: new Date().toISOString(),
    };

    if (editingId) {
      setTasks((current) =>
        current.map((t) => (t.id === editingId ? { ...t, ...item, createdAt: t.createdAt } : t))
      );
    } else {
      setTasks((current) => [...current, item]);
    }
    setForm(DEFAULT_FORM);
    setEditingId(null);
  };

  const editItem = (item: ScopeItem) => {
    setForm({
      section: item.section,
      title: item.title,
      description: item.description,
      status: item.status,
      priority: item.priority,
      hours: String(item.hours),
    });
    setEditingId(item.id);
    document
      .getElementById("scope-item-form")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const cancelEdit = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
  };

  const deleteItem = (id: string) => {
    setTasks((current) => current.filter((item) => item.id !== id));
    if (editingId === id) cancelEdit();
  };

  const updateStatus = (id: string, status: Status) => {
    setTasks((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  const clearCompleted = () => {
    setTasks((current) => current.filter((item) => item.status !== "completed"));
  };

  const confirmVisible = () => {
    const ids = new Set(visibleTasks.map((item) => item.id));
    setTasks((current) =>
      current.map((item) =>
        ids.has(item.id) && item.status === "pending"
          ? { ...item, status: "agreed" }
          : item
      )
    );
  };

  /* ---------------------------------------------------------
     Exports
  --------------------------------------------------------- */

  const exportText = () => {
    const lines: string[] = [
      "PROJECT SCOPE DOCUMENT",
      "========================================",
      "",
      `Project: ${project.name || "Not specified"}`,
      `Client: ${project.client || "Not specified"}`,
      `Owner: ${project.owner || "Not specified"}`,
      `Deadline: ${project.deadline || "Not specified"}`,
      `Exported: ${new Date().toLocaleString()}`,
      "",
      "SUMMARY",
      "----------------------------------------",
      `Total Items: ${stats.count}`,
      `Agreed: ${stats.agreed} | Pending: ${stats.pending} | Completed: ${stats.completed}`,
      `Planned Hours: ${formatHours(stats.plannedHours)}`,
      "",
    ];

    SECTIONS.forEach((section) => {
      const sectionTasks = tasks.filter((t) => t.section === section.id);
      lines.push(section.label.toUpperCase());
      lines.push("----------------------------------------");
      if (!sectionTasks.length) lines.push("No items added.");
      sectionTasks.forEach((item) => {
        lines.push(`[${statusLabel(item.status).toUpperCase()}] ${item.title}`);
        if (item.description) lines.push(`  Details: ${item.description}`);
        lines.push(`  Priority: ${item.priority} | Hours: ${item.hours}`);
      });
      lines.push("");
    });

    downloadFile("scope-document.txt", lines.join("\n"), "text/plain");
  };

  const exportMarkdown = () => {
    const lines = [
      `# Project Scope: ${project.name || "Untitled"}`,
      `**Client:** ${project.client || "N/A"} | **Deadline:** ${project.deadline || "N/A"}`,
      `**Status:** ${stats.progress}% confirmed (${stats.confirmed}/${stats.count} items)`,
      "",
    ];
    SECTIONS.forEach((section) => {
      lines.push(`## ${section.label}`);
      const sectionTasks = tasks.filter((t) => t.section === section.id);
      if (!sectionTasks.length) lines.push("*No items added.*");
      sectionTasks.forEach((item) => {
        const check = item.status === "completed" ? "x" : item.status === "agreed" ? "/" : " ";
        lines.push(`- [${check}] **${item.title}** (${item.priority} priority, ${item.hours}h)`);
        if (item.description) lines.push(`  > ${item.description}`);
      });
      lines.push("");
    });
    downloadFile("scope-document.md", lines.join("\n"), "text/markdown");
  };

  const exportCsv = () => {
    const rows = [
      ["Project", "Client", "Section", "Title", "Description", "Status", "Priority", "Hours"],
      ...tasks.map((t) => [
        project.name,
        project.client,
        sectionLabel(t.section),
        t.title,
        t.description,
        statusLabel(t.status),
        t.priority,
        String(t.hours),
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    downloadFile("scope-items.csv", "\uFEFF" + csv, "text/csv");
  };

  const exportPdf = async () => {
    if (!pdfRef.current || pdfBusy) return;
    setPdfBusy(true);
    try {
      // Dynamic import: html2pdf.js touches `window`, so it must not load during SSR.
      const html2pdf = (await import("html2pdf.js")).default;

      const safeName =
        (project.name || "scope-document")
          .trim()
          .replace(/[^\w\-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase() || "scope-document";

      // Loosely typed: some html2pdf.js typings omit `pagebreak`, though it works at runtime.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options: any = {
        margin: [10, 10, 12, 10], // top, left, bottom, right (mm)
        filename: `${safeName}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: [".pdf-item", ".pdf-heading"] },
      };

      await html2pdf().set(options).from(pdfRef.current).save();
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Could not generate the PDF. Please try again.");
    } finally {
      setPdfBusy(false);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <ToolShell title="Project Scope Guard Pro" onReset={reset} wide>
      <div className="sg-root">
        {/* Hero */}
        <header className="sg-hero">
          <div className="sg-hero-content">
            <div className="sg-eyebrow">
              <span className="sg-eyebrow-dot" />
              PROJECT MANAGEMENT WORKSPACE
              <span className="sg-pro-badge">PRO</span>
            </div>
            <h2>Keep your project scope under control</h2>
            <p>
              Define deliverables, document exclusions, track approvals and manage change
              requests before they become scope creep.
            </p>
            <div className="sg-hero-tags">
              <span>Risk Assessment</span>
              <span>Smart Insights</span>
              <span>Effort Estimation</span>
            </div>
          </div>
          <div className="sg-hero-graphic" aria-hidden="true">
            <div className="sg-hero-circle sg-hero-circle-one" />
            <div className="sg-hero-circle sg-hero-circle-two" />
            <div className="sg-hero-symbol">◎</div>
            <div className="sg-hero-mini-card">
              <span className="sg-mini-check">✓</span>
              <span>
                <b>Scope organized</b>
                <small>Pro Workspace</small>
              </span>
            </div>
          </div>
        </header>

        {/* Layout Grid */}
        <div className="sg-layout">
          {/* LEFT: Inputs & Register */}
          <main className="sg-main">
            {/* Project Details */}
            <section className="sg-card sg-no-print">
              <button
                type="button"
                className="sg-section-heading sg-heading-button"
                onClick={() => setShowProjectDetails(!showProjectDetails)}
              >
                <span className="sg-heading-left">
                  <span className="sg-step">01</span>
                  <span>
                    <strong>Project details</strong>
                    <small>Setup your project information</small>
                  </span>
                </span>
                <span className="sg-collapse">
                  {showProjectDetails ? "Hide −" : "Show +"}
                </span>
              </button>

              {showProjectDetails && (
                <div className="sg-project-grid">
                  <label className="sg-field sg-field-wide">
                    Project name
                    <input
                      value={project.name}
                      onChange={(e) => updateProject("name", e.target.value)}
                      placeholder="e.g. Business website redesign"
                    />
                  </label>
                  <label className="sg-field">
                    Client / company
                    <input
                      value={project.client}
                      onChange={(e) => updateProject("client", e.target.value)}
                      placeholder="Client name"
                    />
                  </label>
                  <label className="sg-field">
                    Project owner
                    <input
                      value={project.owner}
                      onChange={(e) => updateProject("owner", e.target.value)}
                      placeholder="Project manager"
                    />
                  </label>
                  <label className="sg-field">
                    Project type
                    <select
                      value={project.projectType}
                      onChange={(e) => updateProject("projectType", e.target.value)}
                    >
                      <option>Website</option>
                      <option>Software development</option>
                      <option>Mobile application</option>
                      <option>Marketing campaign</option>
                      <option>Design project</option>
                      <option>Consulting</option>
                    </select>
                  </label>
                  <label className="sg-field">
                    Target deadline
                    <input
                      type="date"
                      value={project.deadline}
                      onChange={(e) => updateProject("deadline", e.target.value)}
                    />
                  </label>
                </div>
              )}
            </section>

            {/* Add / Edit Item */}
            <section className="sg-card sg-form-card sg-no-print" id="scope-item-form">
              <div className="sg-section-heading">
                <span className="sg-heading-left">
                  <span className="sg-step">02</span>
                  <span>
                    <strong>{editingId ? "Edit scope item" : "Build your scope"}</strong>
                    <small>
                      {editingId
                        ? "Update the details of this item"
                        : "Add deliverables, exclusions and requirements"}
                    </small>
                  </span>
                </span>
                {editingId && <span className="sg-editing-badge">EDITING</span>}
              </div>

              <div className="sg-form-grid">
                <label className="sg-field">
                  Scope section
                  <select
                    value={form.section}
                    onChange={(e) => updateForm("section", e.target.value as Section)}
                  >
                    {SECTIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sg-field">
                  Item title
                  <input
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveItem();
                      }
                    }}
                    placeholder="e.g. Homepage design"
                  />
                </label>
                <label className="sg-field sg-field-wide">
                  Description / details
                  <textarea
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    placeholder="Describe exactly what is included, expected or excluded..."
                    rows={3}
                  />
                </label>
                <label className="sg-field">
                  Approval status
                  <select
                    value={form.status}
                    onChange={(e) => updateForm("status", e.target.value as Status)}
                  >
                    <option value="pending">Pending</option>
                    <option value="agreed">Agreed</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
                <label className="sg-field">
                  Priority
                  <select
                    value={form.priority}
                    onChange={(e) => updateForm("priority", e.target.value as Priority)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="sg-field">
                  Estimated effort (hours)
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    step="0.5"
                    value={form.hours}
                    onChange={(e) => updateForm("hours", e.target.value)}
                    placeholder="0"
                  />
                </label>
              </div>

              <div className="sg-form-actions">
                {editingId && (
                  <button type="button" className="sg-btn sg-btn-light" onClick={cancelEdit}>
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  className="sg-btn sg-btn-primary"
                  onClick={saveItem}
                  disabled={!form.title.trim()}
                >
                  {editingId ? "Save changes" : "+ Add scope item"}
                </button>
              </div>
            </section>

            {/* Scope Breakdown / Templates */}
            <section className="sg-section-overview sg-no-print">
              <div className="sg-overview-heading">
                <div>
                  <div className="sg-overline">ORGANIZE YOUR WORK</div>
                  <h3>Scope breakdown</h3>
                </div>
                <div className="sg-template-actions">
                  <span className="sg-overline" style={{ marginRight: 8 }}>
                    Quick Templates:
                  </span>
                  <button
                    type="button"
                    className="sg-btn sg-btn-light sg-btn-small"
                    onClick={() => loadTemplate("website")}
                  >
                    + Web Design
                  </button>
                  <button
                    type="button"
                    className="sg-btn sg-btn-light sg-btn-small"
                    onClick={() => loadTemplate("software")}
                  >
                    + Software
                  </button>
                </div>
              </div>
              <div className="sg-section-grid">
                {SECTIONS.map((section, index) => (
                  <button
                    type="button"
                    key={section.id}
                    className={`sg-section-tile ${filter === section.id ? "sg-tile-active" : ""}`}
                    onClick={() => setFilter(filter === section.id ? "all" : section.id)}
                  >
                    <div className="sg-tile-top">
                      <span className={`sg-tile-icon sg-tile-icon-${index}`}>{section.icon}</span>
                      <span className="sg-tile-count">{sectionCounts[section.id]}</span>
                    </div>
                    <strong>{section.label}</strong>
                    <span className="sg-tile-description">{section.description}</span>
                    <span className="sg-tile-link">
                      {filter === section.id ? "Viewing section" : "View items"} <b>→</b>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Scope Register */}
            <section className="sg-card sg-register-card">
              <div className="sg-list-heading sg-no-print">
                <div>
                  <div className="sg-overline">PROJECT TRACKING</div>
                  <h3>Scope register</h3>
                  <p>
                    {visibleTasks.length} of {tasks.length} items displayed
                  </p>
                </div>
                <div className="sg-list-actions">
                  <button
                    type="button"
                    className="sg-btn sg-btn-light sg-btn-small"
                    onClick={confirmVisible}
                    disabled={!visibleTasks.some((i) => i.status === "pending")}
                  >
                    ✓ Agree visible
                  </button>
                  <button
                    type="button"
                    className="sg-btn sg-btn-light sg-btn-small"
                    onClick={clearCompleted}
                    disabled={!tasks.some((i) => i.status === "completed")}
                  >
                    Clear completed
                  </button>
                </div>
              </div>

              <div className="sg-filter-row sg-no-print">
                <div className="sg-search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search items..."
                  />
                  {search && (
                    <button type="button" onClick={() => setSearch("")}>
                      ×
                    </button>
                  )}
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="sg-filter-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="agreed">Agreed</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as Section | "all")}
                  className="sg-filter-select"
                >
                  <option value="all">All Sections</option>
                  {SECTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="sg-filter-select"
                  style={{ width: 130 }}
                >
                  <option value="newest">Newest first</option>
                  <option value="priority">By Priority</option>
                  <option value="hours">By Hours</option>
                  <option value="status">By Status</option>
                </select>
              </div>

              {visibleTasks.length > 0 ? (
                <div className="sg-item-list">
                  {visibleTasks.map((item) => (
                    <article className="sg-item" key={item.id}>
                      <div
                        className={`sg-item-accent ${
                          item.status === "agreed"
                            ? "sg-accent-green"
                            : item.status === "completed"
                            ? "sg-accent-blue"
                            : ""
                        }`}
                      />
                      <div className="sg-item-main">
                        <div className="sg-item-title-row">
                          <span className={`sg-priority sg-priority-${item.priority}`}>
                            <i />
                            {item.priority}
                          </span>
                          <span className="sg-item-section">{sectionLabel(item.section)}</span>
                        </div>
                        <h4>{item.title}</h4>
                        {item.description && (
                          <p className="sg-item-description">{item.description}</p>
                        )}
                        <div className="sg-item-meta">
                          <span className="sg-meta-hours">◷ {formatHours(item.hours)}</span>
                          <span className="sg-meta-separator">•</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="sg-item-controls sg-no-print">
                        <select
                          value={item.status}
                          onChange={(e) => updateStatus(item.id, e.target.value as Status)}
                          className={`sg-status sg-status-${item.status}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="agreed">Agreed</option>
                          <option value="completed">Completed</option>
                        </select>
                        <div className="sg-item-buttons">
                          <button
                            type="button"
                            className="sg-icon-button"
                            onClick={() => editItem(item)}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="sg-icon-button sg-delete-button"
                            onClick={() => deleteItem(item.id)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="sg-empty sg-no-print">
                  <div className="sg-empty-icon">▤</div>
                  <h4>
                    {tasks.length === 0 ? "Your scope register is empty" : "No matching items"}
                  </h4>
                  <p>
                    {tasks.length === 0
                      ? "Start by adding your first deliverable or use a quick template above."
                      : "Try clearing your filters."}
                  </p>
                </div>
              )}
            </section>
          </main>

          {/* RIGHT: Sticky Dashboard */}
          <aside className="sg-sidebar sg-no-print">
            {/* Dashboard Stats */}
            <section className="sg-card">
              <div className="sg-provider-tag">LIVE DASHBOARD</div>
              <div className="sg-hero-stat">
                <span className="sg-hero-stat-label">Scope items tracked</span>
                <strong className="sg-hero-stat-value">{stats.count}</strong>
                <span className="sg-hero-stat-sub">{project.name || "Untitled project"}</span>
              </div>
              <div className="sg-mini-stat-grid">
                <div className="sg-mini-stat sg-mini-stat-orange">
                  <span className="sg-mini-stat-label">Agreed</span>
                  <strong>{stats.agreed}</strong>
                </div>
                <div className="sg-mini-stat sg-mini-stat-yellow">
                  <span className="sg-mini-stat-label">Pending</span>
                  <strong>{stats.pending}</strong>
                </div>
                <div className="sg-mini-stat sg-mini-stat-green">
                  <span className="sg-mini-stat-label">Completed</span>
                  <strong>{stats.completed}</strong>
                </div>
                <div className="sg-mini-stat sg-mini-stat-navy">
                  <span className="sg-mini-stat-label">Planned</span>
                  <strong className="sg-mini-stat-hours">{formatHours(stats.plannedHours)}</strong>
                </div>
              </div>
            </section>

            {/* Smart Insights */}
            <section className="sg-card">
              <h3 className="sg-card-heading">Smart insights</h3>
              <p className="sg-card-description">
                Automated risk assessment based on your project data.
              </p>
              <div className="sg-insights-list">
                {insights.length > 0 ? (
                  insights.map((insight, idx) => (
                    <div key={idx} className={`sg-insight-item sg-insight-${insight.type}`}>
                      <span className="sg-insight-icon">
                        {insight.type === "warning" ? "⚠️" : insight.type === "success" ? "✅" : "ℹ️"}
                      </span>
                      <span>{insight.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="sg-insight-item sg-insight-info">
                    <span className="sg-insight-icon">ℹ️</span>
                    <span>No alerts. Add items to see insights.</span>
                  </div>
                )}
              </div>
            </section>

            {/* Progress & Effort */}
            <section className="sg-card">
              <h3 className="sg-card-heading">Progress & timeline</h3>
              <div className="sg-progress-percentage-row">
                <strong>{stats.progress}%</strong>
                <span>CONFIRMED</span>
                {daysRemaining !== null && (
                  <span
                    className={`sg-deadline-badge ${
                      daysRemaining < 0 ? "sg-urgent" : daysRemaining <= 7 ? "sg-urgent" : ""
                    }`}
                  >
                    {daysRemaining < 0
                      ? `${Math.abs(daysRemaining)} day(s) overdue`
                      : daysRemaining === 0
                      ? "Due today"
                      : `${daysRemaining} day(s) left`}
                  </span>
                )}
              </div>
              <div className="sg-progress-track">
                <div className="sg-progress-fill" style={{ width: `${stats.progress}%` }} />
              </div>

              <div className="sg-effort-breakdown" style={{ marginTop: 20 }}>
                <div>
                  <span>Deliverables</span>
                  <strong>{formatHours(stats.deliverableHours)}</strong>
                </div>
                <div>
                  <span>Approved Changes</span>
                  <strong>{formatHours(stats.approvedChangeHours)}</strong>
                </div>
                <div className="sg-effort-total">
                  <span>Total Planned</span>
                  <strong>{formatHours(stats.plannedHours)}</strong>
                </div>
              </div>
            </section>

            {/* Export */}
            <section className="sg-card sg-export-card">
              <h3 className="sg-card-heading">Export & share</h3>
              <p className="sg-card-description">
                Download your project scope in various formats.
              </p>
              <div className="sg-export-actions">
                <button
                  type="button"
                  className="sg-btn sg-btn-primary"
                  onClick={exportCsv}
                  disabled={tasks.length === 0}
                >
                  ↓ Export CSV
                </button>
                <button
                  type="button"
                  className="sg-btn sg-btn-light"
                  onClick={exportMarkdown}
                  disabled={tasks.length === 0}
                >
                  ↓ Export Markdown
                </button>
                <button
                  type="button"
                  className="sg-btn sg-btn-light"
                  onClick={exportText}
                  disabled={tasks.length === 0}
                >
                  ↓ Export Plain Text
                </button>
                <button
                  type="button"
                  className="sg-btn sg-btn-light"
                  onClick={exportPdf}
                  disabled={tasks.length === 0 || pdfBusy}
                >
                  {pdfBusy ? "Generating PDF…" : "↓ Download PDF"}
                </button>
              </div>
            </section>

            <div className="sg-storage-notice">
              <span className="sg-storage-icon">✓</span>
              <div>
                <strong>Private browser storage</strong>
                <p>Your project is automatically saved locally. No account needed.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* =====================================================
          Hidden, off-screen report used only for PDF generation.
          Uses inline styles + plain hex colors on purpose:
          html2canvas can't reliably read styled-jsx or modern
          CSS color functions.
      ===================================================== */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-10000px", top: 0, width: "794px", pointerEvents: "none" }}
      >
        <div
          ref={pdfRef}
          style={{
            width: "794px",
            padding: "24px 28px",
            background: "#ffffff",
            color: "#172033",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "12px",
            lineHeight: 1.5,
            boxSizing: "border-box",
          }}
        >
          <div style={{ borderBottom: "3px solid #ff5a1f", paddingBottom: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#ff5a1f", fontWeight: 700 }}>
              PROJECT SCOPE DOCUMENT
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 8px" }}>
              {project.name || "Untitled project"}
            </div>
            <table style={{ width: "100%", fontSize: 11, color: "#475467", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "2px 0" }}><b>Client:</b> {project.client || "Not specified"}</td>
                  <td style={{ padding: "2px 0" }}><b>Owner:</b> {project.owner || "Not specified"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "2px 0" }}><b>Type:</b> {project.projectType}</td>
                  <td style={{ padding: "2px 0" }}><b>Deadline:</b> {project.deadline || "Not specified"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "2px 0" }} colSpan={2}>
                    <b>Generated:</b> {new Date().toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 6, margin: "0 -6px 14px" }}>
            <tbody>
              <tr>
                {[
                  ["Total items", String(stats.count)],
                  ["Agreed", String(stats.agreed)],
                  ["Pending", String(stats.pending)],
                  ["Completed", String(stats.completed)],
                  ["Planned hours", formatHours(stats.plannedHours)],
                ].map(([label, value]) => (
                  <td
                    key={label}
                    style={{
                      border: "1px solid #e7eaf0",
                      background: "#f7f8fa",
                      borderRadius: 6,
                      padding: "8px 10px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 9, color: "#778195", fontWeight: 700 }}>
                      {label.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{value}</div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          {SECTIONS.map((section) => {
            const sectionTasks = tasks.filter((t) => t.section === section.id);
            return (
              <div key={section.id} style={{ marginBottom: 16 }}>
                <div
                  className="pdf-heading"
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    borderBottom: "1px solid #e7eaf0",
                    paddingBottom: 4,
                    marginBottom: 8,
                  }}
                >
                  {section.label}{" "}
                  <span style={{ color: "#9aa3b1", fontWeight: 600, fontSize: 11 }}>
                    ({sectionTasks.length})
                  </span>
                </div>

                {sectionTasks.length === 0 && (
                  <div style={{ color: "#9aa3b1", fontStyle: "italic", fontSize: 11 }}>
                    No items added.
                  </div>
                )}

                {sectionTasks.map((item) => (
                  <div
                    key={item.id}
                    className="pdf-item"
                    style={{
                      border: "1px solid #e7eaf0",
                      borderLeft: `4px solid ${
                        item.status === "agreed"
                          ? "#3b9a65"
                          : item.status === "completed"
                          ? "#4779c5"
                          : "#e0a526"
                      }`,
                      borderRadius: 6,
                      padding: "8px 12px",
                      marginBottom: 6,
                      background: "#ffffff",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <td style={{ fontSize: 13, fontWeight: 800, verticalAlign: "top" }}>
                            {item.title}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontSize: 10,
                              fontWeight: 800,
                              verticalAlign: "top",
                              whiteSpace: "nowrap",
                              color:
                                item.status === "agreed"
                                  ? "#247548"
                                  : item.status === "completed"
                                  ? "#2459a3"
                                  : "#986313",
                            }}
                          >
                            {statusLabel(item.status).toUpperCase()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {item.description && (
                      <div style={{ fontSize: 11, color: "#475467", margin: "4px 0", whiteSpace: "pre-wrap" }}>
                        {item.description}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: "#778195" }}>
                      Priority: <b style={{ textTransform: "capitalize" }}>{item.priority}</b>
                      {"  |  "}Effort: <b>{formatHours(item.hours)}</b>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          <div
            style={{
              marginTop: 14,
              paddingTop: 8,
              borderTop: "1px solid #e7eaf0",
              fontSize: 9,
              color: "#9aa3b1",
              textAlign: "center",
            }}
          >
            Generated by Project Scope Guard Pro
          </div>
        </div>
      </div>

      {/* =====================================================
          Premium Styles
      ===================================================== */}
      <style jsx global>{`
        .sg-root {
          --sg-orange: #ff5a1f;
          --sg-orange-dark: #e94b13;
          --sg-navy: #172033;
          --sg-muted: #778195;
          --sg-border: #e7eaf0;
          --sg-bg: #f7f8fa;
          color: var(--sg-navy);
          display: flex;
          flex-direction: column;
          gap: 19px;
          width: 100%;
          min-width: 0;
        }
        .sg-root,
        .sg-root * {
          box-sizing: border-box;
        }

        /* Hero */
        .sg-hero {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          min-height: 220px;
          padding: 30px 34px;
          overflow: hidden;
          border-radius: 17px;
          background: radial-gradient(circle at 83% 15%, rgba(255, 90, 31, 0.2), transparent 28%),
            linear-gradient(115deg, #172033 0%, #202e46 65%, #273650 100%);
          color: #fff;
          isolation: isolate;
        }
        .sg-hero-content {
          position: relative;
          z-index: 2;
          max-width: 690px;
        }
        .sg-eyebrow {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 13px;
          color: #ffb08f;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 1.65px;
        }
        .sg-eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--sg-orange);
          box-shadow: 0 0 0 4px rgba(255, 90, 31, 0.15);
        }
        .sg-pro-badge {
          background: var(--sg-orange);
          color: #fff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          letter-spacing: 0.5px;
          margin-left: 5px;
        }
        .sg-hero h2 {
          max-width: 600px;
          margin: 0 0 10px;
          color: #fff;
          font-size: clamp(23px, 3vw, 31px);
          line-height: 1.2;
          font-weight: 850;
          letter-spacing: -0.8px;
        }
        .sg-hero p {
          max-width: 650px;
          margin: 0;
          color: #c6cfdd;
          font-size: 13px;
          line-height: 1.75;
        }
        .sg-hero-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 19px;
        }
        .sg-hero-tags span {
          padding: 6px 10px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.06);
          color: #e3e8f0;
          font-size: 10px;
          font-weight: 650;
        }
        .sg-hero-graphic {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 190px;
          height: 160px;
        }
        .sg-hero-circle {
          position: absolute;
          border: 1px solid rgba(255, 155, 116, 0.2);
          border-radius: 50%;
        }
        .sg-hero-circle-one {
          width: 150px;
          height: 150px;
        }
        .sg-hero-circle-two {
          width: 112px;
          height: 112px;
          border-color: rgba(255, 155, 116, 0.35);
        }
        .sg-hero-symbol {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 75px;
          height: 75px;
          border: 1px solid rgba(255, 160, 125, 0.35);
          border-radius: 22px;
          background: rgba(255, 90, 31, 0.16);
          color: #ff966e;
          font-size: 48px;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);
        }
        .sg-hero-mini-card {
          position: absolute;
          right: -5px;
          bottom: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          background: #fff;
          color: var(--sg-navy);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        .sg-mini-check {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 25px;
          height: 25px;
          border-radius: 7px;
          background: #eaf7ef;
          color: #27814d;
          font-weight: 900;
        }
        .sg-hero-mini-card b,
        .sg-hero-mini-card small {
          display: block;
          white-space: nowrap;
        }
        .sg-hero-mini-card b {
          font-size: 10px;
          font-weight: 850;
        }
        .sg-hero-mini-card small {
          margin-top: 3px;
          color: var(--sg-muted);
          font-size: 9px;
        }

        /* Layout Grid */
        .sg-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(310px, 380px);
          gap: 20px;
          align-items: start;
        }
        .sg-main,
        .sg-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        .sg-sidebar {
          position: sticky;
          top: 18px;
        }

        /* Cards */
        .sg-card {
          min-width: 0;
          padding: 23px;
          border: 1px solid var(--sg-border);
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 3px 13px rgba(23, 32, 51, 0.035);
        }
        .sg-card-heading {
          margin: 0 0 5px;
          color: var(--sg-navy);
          font-size: 15px;
          font-weight: 850;
          letter-spacing: -0.2px;
        }
        .sg-card-description {
          margin: 0 0 14px;
          color: var(--sg-muted);
          font-size: 11px;
          line-height: 1.6;
        }
        .sg-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 21px;
          color: var(--sg-navy);
        }
        .sg-heading-left {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }
        .sg-heading-left > span:last-child {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .sg-heading-left strong {
          color: var(--sg-navy);
          font-size: 15px;
          font-weight: 850;
        }
        .sg-heading-left small {
          color: var(--sg-muted);
          font-size: 11px;
          font-weight: 500;
        }
        .sg-heading-button {
          width: 100%;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          text-align: left;
        }
        .sg-step {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 31px;
          height: 31px;
          border: 1px solid #ffded0;
          border-radius: 9px;
          background: #fff2ec;
          color: var(--sg-orange);
          font-size: 11px;
          font-weight: 900;
        }
        .sg-collapse {
          color: #687387;
          font-size: 11px;
          font-weight: 750;
          white-space: nowrap;
        }
        .sg-overline {
          margin-bottom: 6px;
          color: #9aa3b1;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 1.2px;
        }

        /* Forms */
        .sg-project-grid,
        .sg-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }
        .sg-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
          color: #354157;
          font-size: 11px;
          font-weight: 800;
        }
        .sg-field-wide {
          grid-column: 1 / -1;
        }
        .sg-field input,
        .sg-field select,
        .sg-field textarea {
          display: block;
          width: 100%;
          min-width: 0;
          height: 48px;
          padding: 0 14px;
          border: 1px solid #dfe4ec;
          border-radius: 9px;
          background-color: #fff;
          color: var(--sg-navy);
          font-family: inherit;
          font-size: 13px;
          font-weight: 550;
          outline: none;
          transition: 0.18s ease;
        }
        .sg-field select {
          cursor: pointer;
        }
        .sg-field textarea {
          height: auto;
          min-height: 100px;
          padding: 13px 14px;
          resize: vertical;
          line-height: 1.6;
        }
        .sg-field input:focus,
        .sg-field select:focus,
        .sg-field textarea:focus {
          border-color: var(--sg-orange);
          background: #fffdfc;
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.11);
        }

        /* Buttons */
        .sg-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 43px;
          padding: 0 17px;
          border: 1px solid transparent;
          border-radius: 9px;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          font-weight: 850;
          transition: 0.18s ease;
        }
        .sg-btn:disabled {
          opacity: 0.42;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .sg-btn-primary {
          border-color: var(--sg-orange);
          background: var(--sg-orange);
          color: #fff;
          box-shadow: 0 3px 8px rgba(255, 90, 31, 0.12);
        }
        .sg-btn-primary:hover:not(:disabled) {
          background: var(--sg-orange-dark);
          transform: translateY(-1px);
        }
        .sg-btn-light {
          border-color: #dfe4ec;
          background: #fff;
          color: #354157;
        }
        .sg-btn-light:hover:not(:disabled) {
          border-color: #c4cbd7;
          background: #f8f9fb;
        }
        .sg-btn-small {
          min-height: 36px;
          padding: 0 12px;
          font-size: 10px;
        }
        .sg-form-actions {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 21px;
          padding-top: 17px;
          border-top: 1px solid #f0f1f4;
        }
        .sg-editing-badge {
          padding: 6px 10px;
          border: 1px solid #ffdfd2;
          border-radius: 20px;
          background: #fff2ec;
          color: #d94c19;
          font-size: 9px;
          font-weight: 850;
        }

        /* Sidebar Dashboard */
        .sg-provider-tag {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          margin-bottom: 12px;
          border-radius: 30px;
          background: #fff1e9;
          color: #bd4d22;
          font-size: 10px;
          font-weight: 850;
        }
        .sg-hero-stat {
          padding: 18px;
          border-radius: 13px;
          background: linear-gradient(135deg, #202c43, #111a2c);
          color: #fff;
        }
        .sg-hero-stat-label {
          display: block;
          color: #c1c9d7;
          font-size: 10px;
          font-weight: 700;
        }
        .sg-hero-stat-value {
          display: block;
          margin: 7px 0 5px;
          font-size: clamp(28px, 4vw, 36px);
          font-weight: 850;
          letter-spacing: -1.3px;
          line-height: 1.1;
        }
        .sg-hero-stat-sub {
          display: block;
          color: #bdc7d8;
          font-size: 10px;
        }
        .sg-mini-stat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 12px;
        }
        .sg-mini-stat {
          padding: 11px;
          border: 1px solid #edf0f4;
          border-radius: 10px;
          background: #f7f8fa;
          min-width: 0;
        }
        .sg-mini-stat-label {
          display: block;
          margin-bottom: 5px;
          color: var(--sg-muted);
          font-size: 9px;
          font-weight: 650;
        }
        .sg-mini-stat strong {
          display: block;
          color: var(--sg-navy);
          font-size: 17px;
          font-weight: 850;
          line-height: 1.2;
        }
        .sg-mini-stat-hours {
          font-size: 13px !important;
        }
        .sg-mini-stat-orange {
          border-color: #ffe2d6;
          background: #fff7f3;
        }
        .sg-mini-stat-orange strong {
          color: var(--sg-orange);
        }
        .sg-mini-stat-yellow {
          border-color: #f5e7c6;
          background: #fffbf0;
        }
        .sg-mini-stat-yellow strong {
          color: #a96b13;
        }
        .sg-mini-stat-green {
          border-color: #d9efdf;
          background: #f4fbf6;
        }
        .sg-mini-stat-green strong {
          color: #27814d;
        }
        .sg-mini-stat-navy {
          border-color: #e1e6ee;
          background: #f4f6fa;
        }

        /* Insights */
        .sg-insights-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sg-insight-item {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 11px 13px;
          border-radius: 9px;
          font-size: 11px;
          line-height: 1.5;
        }
        .sg-insight-warning {
          background: #fff5f4;
          border: 1px solid #ffd3cd;
          color: #b42318;
        }
        .sg-insight-success {
          background: #f4fbf6;
          border: 1px solid #d9efdf;
          color: #267044;
        }
        .sg-insight-info {
          background: #f4f7fb;
          border: 1px solid #e5ebf3;
          color: #475467;
        }
        .sg-insight-icon {
          flex-shrink: 0;
          font-size: 13px;
        }

        /* Progress */
        .sg-progress-percentage-row {
          display: flex;
          align-items: baseline;
          gap: 7px;
          margin: 6px 0 0;
        }
        .sg-progress-percentage-row strong {
          color: var(--sg-orange);
          font-size: 28px;
          line-height: 1;
          font-weight: 900;
        }
        .sg-progress-percentage-row span {
          color: #9aa3b1;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.8px;
        }
        .sg-deadline-badge {
          margin-left: auto;
          background: #edf0f4;
          color: #475467;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
        }
        .sg-deadline-badge.sg-urgent {
          background: #fff0ed;
          color: #c33c2e;
        }
        .sg-progress-track {
          height: 9px;
          margin: 12px 0;
          overflow: hidden;
          border-radius: 20px;
          background: #edf0f4;
        }
        .sg-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff5a1f, #ff966f);
          transition: width 0.35s ease;
        }

        /* Effort */
        .sg-effort-breakdown {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }
        .sg-effort-breakdown > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid #edf0f4;
          color: var(--sg-muted);
          font-size: 11px;
        }
        .sg-effort-breakdown strong {
          color: var(--sg-navy);
          font-size: 11px;
          font-weight: 850;
        }
        .sg-effort-breakdown .sg-effort-total {
          padding-top: 4px;
          border-bottom: 0;
          color: var(--sg-navy);
          font-weight: 850;
        }
        .sg-effort-breakdown .sg-effort-total strong {
          color: var(--sg-orange);
          font-size: 17px;
        }

        /* Section Tiles */
        .sg-section-overview {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }
        .sg-overview-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sg-template-actions {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .sg-section-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .sg-section-tile {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          min-height: 160px;
          padding: 16px;
          border: 1px solid var(--sg-border);
          border-radius: 12px;
          background: #fff;
          text-align: left;
          cursor: pointer;
          transition: 0.2s ease;
        }
        .sg-section-tile:hover,
        .sg-tile-active {
          border-color: #ffb99e;
          background: #fff9f6;
          box-shadow: 0 5px 14px rgba(255, 90, 31, 0.07);
          transform: translateY(-2px);
        }
        .sg-tile-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 3px;
        }
        .sg-tile-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 33px;
          height: 33px;
          border-radius: 9px;
          background: #fff0e9;
          color: var(--sg-orange);
          font-size: 17px;
          font-weight: 900;
        }
        .sg-tile-icon-1 {
          background: #fff2ec;
          color: #d65b38;
        }
        .sg-tile-icon-2 {
          background: #f0efff;
          color: #7162bb;
        }
        .sg-tile-icon-3 {
          background: #edf3ff;
          color: #4774ba;
        }
        .sg-tile-count {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 25px;
          height: 25px;
          padding: 0 6px;
          border-radius: 7px;
          background: #f2f4f7;
          color: #586477;
          font-size: 10px;
          font-weight: 850;
        }
        .sg-section-tile strong {
          color: var(--sg-navy);
          font-size: 12px;
          font-weight: 850;
        }
        .sg-tile-description {
          min-height: 30px;
          color: var(--sg-muted);
          font-size: 10px;
          line-height: 1.5;
        }
        .sg-tile-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-top: auto;
          padding-top: 9px;
          border-top: 1px solid #f0f1f4;
          color: #818b9b;
          font-size: 9px;
          font-weight: 750;
        }
        .sg-tile-link b {
          color: var(--sg-orange);
          font-size: 14px;
        }

        /* Register */
        .sg-list-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 17px;
        }
        .sg-list-heading h3 {
          margin: 0 0 5px;
          color: var(--sg-navy);
          font-size: 15px;
          font-weight: 850;
        }
        .sg-list-heading p {
          margin: 0;
          color: var(--sg-muted);
          font-size: 11px;
        }
        .sg-list-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }
        .sg-filter-row {
          display: flex;
          gap: 10px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .sg-search {
          display: flex;
          align-items: center;
          gap: 9px;
          flex: 1;
          min-width: 200px;
          height: 44px;
          padding: 0 12px;
          border: 1px solid #dfe4ec;
          border-radius: 9px;
          background: #fff;
          transition: 0.2s;
        }
        .sg-search:focus-within {
          border-color: var(--sg-orange);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.09);
        }
        .sg-search input {
          flex: 1;
          border: 0;
          outline: 0;
          background: transparent;
          font-size: 12px;
        }
        .sg-filter-select {
          height: 44px;
          padding: 0 11px;
          border: 1px solid #dfe4ec;
          border-radius: 9px;
          background: #fff;
          font-size: 11px;
          font-weight: 650;
          cursor: pointer;
        }
        .sg-item-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .sg-item {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 15px 16px 18px;
          border: 1px solid #e9ecf1;
          border-radius: 11px;
          background: #fff;
          transition: 0.2s;
        }
        .sg-item:hover {
          border-color: #f1b59e;
          box-shadow: 0 4px 12px rgba(23, 32, 51, 0.035);
        }
        .sg-item-accent {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 3px;
          background: #e6eaf0;
        }
        .sg-accent-green {
          background: #3b9a65;
        }
        .sg-accent-blue {
          background: #4779c5;
        }
        .sg-item-main {
          flex: 1;
          min-width: 0;
        }
        .sg-item-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 7px;
        }
        .sg-priority {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 7px;
          border-radius: 5px;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
        }
        .sg-priority i {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
        }
        .sg-priority-low {
          background: #edf7f0;
          color: #27814d;
        }
        .sg-priority-medium {
          background: #fff6e7;
          color: #a96b13;
        }
        .sg-priority-high {
          background: #fff0ed;
          color: #c33c2e;
        }
        .sg-item-section {
          color: #8992a2;
          font-size: 9px;
          font-weight: 750;
        }
        .sg-item h4 {
          margin: 0;
          font-size: 13px;
          font-weight: 850;
        }
        .sg-item-description {
          margin: 6px 0 0;
          color: #697386;
          font-size: 11px;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .sg-item-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          color: #929baa;
          font-size: 9px;
        }
        .sg-meta-hours {
          color: #5d687b;
          font-weight: 750;
        }
        .sg-item-controls {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-shrink: 0;
        }
        .sg-status {
          min-width: 108px;
          height: 35px;
          padding: 0 9px;
          border: 1px solid #e1e5eb;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }
        .sg-status-pending {
          border-color: #f1dfb8;
          background: #fff8e9;
          color: #986313;
        }
        .sg-status-agreed {
          border-color: #d3eadb;
          background: #eef8f1;
          color: #247548;
        }
        .sg-status-completed {
          border-color: #d5e3fa;
          background: #eef4ff;
          color: #2459a3;
        }
        .sg-item-buttons {
          display: flex;
          gap: 5px;
        }
        .sg-icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border: 1px solid #e4e8ee;
          border-radius: 8px;
          background: #fff;
          color: #5e687a;
          font-size: 16px;
          cursor: pointer;
        }
        .sg-icon-button:hover {
          background: #f4f6f9;
        }
        .sg-delete-button:hover {
          border-color: #f0c3c0;
          background: #fff5f4;
          color: #c63830;
        }

        /* Empty State */
        .sg-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 45px 15px;
          text-align: center;
        }
        .sg-empty-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 54px;
          margin-bottom: 14px;
          border-radius: 15px;
          background: #fff2ec;
          color: var(--sg-orange);
          font-size: 25px;
        }
        .sg-empty h4 {
          margin: 0 0 7px;
          font-size: 14px;
          font-weight: 850;
        }
        .sg-empty p {
          max-width: 420px;
          margin: 0;
          color: var(--sg-muted);
          font-size: 11px;
          line-height: 1.65;
        }

        /* Export & Storage */
        .sg-export-card {
          border-color: #f2d9cd !important;
          background: linear-gradient(110deg, #fff9f6, #fff5ef) !important;
        }
        .sg-export-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 14px;
        }
        .sg-export-actions .sg-btn {
          width: 100%;
        }
        .sg-storage-notice {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 14px 16px;
          border: 1px solid #e2e9e5;
          border-radius: 10px;
          background: #f7faf8;
        }
        .sg-storage-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #e3f2e8;
          color: #28814c;
          font-size: 12px;
          font-weight: 900;
        }
        .sg-storage-notice strong {
          display: block;
          margin-bottom: 3px;
          color: #45614f;
          font-size: 10px;
          font-weight: 850;
        }
        .sg-storage-notice p {
          margin: 0;
          color: #637469;
          font-size: 10px;
          line-height: 1.65;
        }

        /* Responsive */
        @media (max-width: 1050px) {
          .sg-layout {
            grid-template-columns: minmax(0, 1fr);
          }
          .sg-sidebar {
            position: static;
          }
        }
        @media (max-width: 600px) {
          .sg-hero {
            padding: 22px 19px;
          }
          .sg-hero h2 {
            font-size: 23px;
          }
          .sg-hero-graphic {
            display: none;
          }
          .sg-card {
            padding: 17px;
          }
          .sg-project-grid,
          .sg-form-grid,
          .sg-section-grid {
            grid-template-columns: 1fr;
          }
          .sg-field-wide {
            grid-column: auto;
          }
          .sg-list-heading {
            flex-direction: column;
            align-items: flex-start;
          }
          .sg-list-actions {
            width: 100%;
          }
          .sg-list-actions .sg-btn {
            flex: 1;
          }
          .sg-filter-row {
            flex-direction: column;
          }
          .sg-filter-select {
            width: 100%;
          }
          .sg-item {
            flex-direction: column;
            align-items: flex-start;
          }
          .sg-item-controls {
            width: 100%;
            justify-content: space-between;
          }
          .sg-template-actions {
            flex-direction: column;
            align-items: flex-start;
            margin-top: 10px;
          }
        }
      `}</style>
    </ToolShell>
  );
}