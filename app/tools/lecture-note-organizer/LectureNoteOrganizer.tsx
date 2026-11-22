"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import ToolShell from "../ToolShell";

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type NoteColor = "none" | "orange" | "violet" | "emerald" | "blue" | "rose" | "amber";
type FilterType = "all" | "pinned" | "review" | "archived" | "trash";
type SortType = "updated" | "created" | "title" | "lecture";
type ViewMode = "edit" | "split" | "preview";
type Accent = "orange" | "violet" | "emerald" | "blue";

type Version = { id: string; at: string; title: string; content: string; label?: string };

type LectureNote = {
  id: string;
  title: string;
  subject: string;
  lecturer: string;
  lectureDate: string;
  tags: string[];
  content: string;
  color: NoteColor;
  pinned: boolean;
  archived: boolean;
  deletedAt: string | null;
  reviewedAt: string | null;
  reviewCount: number;
  versions: Version[];
  createdAt: string;
  updatedAt: string;
};

type Settings = {
  theme: "light" | "dark";
  accent: Accent;
  sort: SortType;
  mode: ViewMode;
  compact: boolean;
  focusToday: { date: string; count: number };
};

type Card = { q: string; a: string; from: string };
type Notice = { text: string; action?: { label: string; run: () => void } } | null;

const STORAGE_KEY = "toolsab-lecture-notes-v2";
const LEGACY_KEY = "toolsab-lecture-notes-v1";
const SETTINGS_KEY = "toolsab-lecture-notes-settings-v1";
const MAX_VERSIONS = 12;
const SNAPSHOT_MS = 5 * 60_000;
const TRASH_DAYS = 30;
const REVIEW_DAYS = 7;
const STORAGE_LIMIT_KB = 4800;

const COLORS: Record<NoteColor, string> = {
  none: "",
  orange: "#ff5a1f",
  violet: "#7c5cff",
  emerald: "#12b886",
  blue: "#339af0",
  rose: "#f06595",
  amber: "#f59f00",
};
const COLOR_KEYS = Object.keys(COLORS) as NoteColor[];

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  accent: "orange",
  sort: "updated",
  mode: "split",
  compact: false,
  focusToday: { date: "", count: 0 },
};

const TEMPLATES = [
  { id: "blank", icon: "✎", name: "Blank note", desc: "Start with an empty page.", title: "Untitled lecture", content: "" },
  {
    id: "cornell",
    icon: "▦",
    name: "Cornell method",
    desc: "Cues, notes and a summary.",
    title: "Cornell notes",
    content: "## Cues and questions\n- \n\n## Notes\n- \n\n## Summary\n",
  },
  {
    id: "outline",
    icon: "☰",
    name: "Lecture outline",
    desc: "Concepts, definitions and takeaways.",
    title: "Lecture outline",
    content:
      "## Main concepts\n- \n\n## Key definitions\n- **Term**: \n\n## Examples\n- \n\n## Key takeaways\n- ==Most important idea==\n\n## To do after class\n- [ ] Review slides\n- [ ] Read chapter\n",
  },
  {
    id: "exam",
    icon: "✓",
    name: "Exam review",
    desc: "Checklist plus flashcard questions.",
    title: "Exam review",
    content:
      "## Topics to cover\n- [ ] Topic one\n- [ ] Topic two\n\n## Practice questions\nQ: What is the main idea of this topic?\nA: Write the answer here.\n\nQ: \nA: \n",
  },
  {
    id: "cards",
    icon: "❖",
    name: "Flashcard deck",
    desc: "Term :: definition pairs.",
    title: "Flashcard deck",
    content: "## Terms\nTerm one :: Definition one\nTerm two :: Definition two\n",
  },
];

const SHORTCUTS: [string, string][] = [
  ["Alt + N", "New note"],
  ["Alt + F", "Toggle focus mode"],
  ["Ctrl/⌘ + S", "Save now"],
  ["Ctrl/⌘ + B", "Bold"],
  ["Ctrl/⌘ + I", "Italic"],
  ["Ctrl/⌘ + K", "Insert link"],
  ["/", "Search notes"],
  ["Enter in a list", "Continue the list"],
  ["Esc", "Close dialogs, leave focus mode"],
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function today() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function createNote(overrides: Partial<LectureNote> = {}): LectureNote {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: "Untitled lecture",
    subject: "",
    lecturer: "",
    lectureDate: today(),
    tags: [],
    content: "",
    color: "none",
    pinned: false,
    archived: false,
    deletedAt: null,
    reviewedAt: null,
    reviewCount: 0,
    versions: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function isVersion(value: unknown): value is Version {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.at === "string" && typeof v.content === "string" && typeof v.title === "string";
}

function normalizeNote(raw: unknown): LectureNote | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.title !== "string" || typeof r.content !== "string") return null;
  const base = createNote();
  const str = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
  return {
    ...base,
    id: r.id,
    title: r.title,
    content: r.content,
    subject: str(r.subject),
    lecturer: str(r.lecturer),
    lectureDate: str(r.lectureDate, base.lectureDate),
    tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === "string") : [],
    color: COLOR_KEYS.includes(r.color as NoteColor) ? (r.color as NoteColor) : "none",
    pinned: r.pinned === true,
    archived: r.archived === true,
    deletedAt: typeof r.deletedAt === "string" ? r.deletedAt : null,
    reviewedAt: typeof r.reviewedAt === "string" ? r.reviewedAt : null,
    reviewCount: typeof r.reviewCount === "number" ? r.reviewCount : 0,
    versions: Array.isArray(r.versions) ? r.versions.filter(isVersion).slice(-MAX_VERSIONS) : [],
    createdAt: str(r.createdAt, base.createdAt),
    updatedAt: str(r.updatedAt, base.updatedAt),
  };
}

function readNotes(): LectureNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeNote).filter((n): n is LectureNote => n !== null);
  } catch {
    return [];
  }
}

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function formatDate(value: string) {
  if (!value) return "No date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function relativeTime(iso: string | null) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}

function wordCount(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function needsReview(note: LectureNote) {
  if (!note.content.trim()) return false;
  if (!note.reviewedAt) return true;
  return Date.now() - new Date(note.reviewedAt).getTime() > REVIEW_DAYS * 86_400_000;
}

function slugify(value: string) {
  return value.replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "-").toLowerCase() || "lecture-note";
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
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] as string));
}

/* ------------------------------------------------------------------ */
/* Markdown (safe, dependency-free)                                    */
/* ------------------------------------------------------------------ */

function inlineMd(text: string) {
  return text
    .split(/(`[^`]+`)/g)
    .map((part) => {
      if (part.length > 1 && part.startsWith("`") && part.endsWith("`")) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      }
      let s = escapeHtml(part);
      s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
      s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
      s = s.replace(/==([^=]+)==/g, "<mark>$1</mark>");
      s = s.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );
      return s;
    })
    .join("");
}

function renderMarkdown(src: string, interactive = true) {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: "ul" | "ol" | null = null;

  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map(inlineMd).join("<br/>")}</p>`);
    para = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  const openList = (type: "ul" | "ol") => {
    if (list !== type) {
      closeList();
      out.push(`<${type}>`);
      list = type;
    }
  };
  const splitRow = (row: string) =>
    row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^```/.test(line)) {
      flushPara();
      closeList();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }
    if (!line.trim()) {
      flushPara();
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushPara();
      closeList();
      const level = heading[1].length;
      out.push(`<h${level} id="lno-h-${i}">${inlineMd(heading[2])}</h${level}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushPara();
      closeList();
      out.push("<hr/>");
      continue;
    }
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])
    ) {
      flushPara();
      closeList();
      const head = splitRow(line);
      let html = `<div class="lno-table-wrap"><table><thead><tr>${head.map((c) => `<th>${inlineMd(c)}</th>`).join("")}</tr></thead><tbody>`;
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        html += `<tr>${splitRow(lines[i]).map((c) => `<td>${inlineMd(c)}</td>`).join("")}</tr>`;
        i++;
      }
      i--;
      out.push(`${html}</tbody></table></div>`);
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushPara();
      closeList();
      out.push(`<blockquote>${inlineMd(quote[1])}</blockquote>`);
      continue;
    }
    const indentOf = (l: string) => (l.match(/^\s*/)?.[0].length ?? 0) * 8;
    const task = line.match(/^(\s*)[-*+]\s+\[( |x|X)\]\s+(.*)$/);
    if (task) {
      flushPara();
      openList("ul");
      const done = task[2].toLowerCase() === "x";
      out.push(
        `<li class="task" style="margin-left:${indentOf(task[1])}px"><input type="checkbox" data-line="${i}" ${done ? "checked" : ""} ${interactive ? "" : "disabled"} /> <span class="${done ? "done" : ""}">${inlineMd(task[3])}</span></li>`
      );
      continue;
    }
    const bullet = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (bullet) {
      flushPara();
      openList("ul");
      out.push(`<li style="margin-left:${indentOf(bullet[1])}px">${inlineMd(bullet[2])}</li>`);
      continue;
    }
    const ordered = line.match(/^(\s*)\d+[.)]\s+(.*)$/);
    if (ordered) {
      flushPara();
      openList("ol");
      out.push(`<li style="margin-left:${indentOf(ordered[1])}px">${inlineMd(ordered[2])}</li>`);
      continue;
    }
    closeList();
    para.push(line);
  }
  flushPara();
  closeList();
  return out.join("\n");
}

function extractOutline(content: string) {
  const items: { line: number; level: number; text: string }[] = [];
  let fenced = false;
  content.split("\n").forEach((line, index) => {
    if (/^```/.test(line)) fenced = !fenced;
    if (fenced) return;
    const m = line.match(/^(#{1,4})\s+(.*)$/);
    if (m) items.push({ line: index, level: m[1].length, text: m[2].trim() });
  });
  return items;
}

function extractCards(note: LectureNote): Card[] {
  const lines = note.content.split("\n");
  const cards: Card[] = [];
  const qRe = /^\s*(?:[-*]\s*)?(?:Q|Question)\s*[:：]\s*(.*)$/i;
  const aRe = /^\s*(?:[-*]\s*)?(?:A|Answer)\s*[:：]\s*(.*)$/i;
  for (let i = 0; i < lines.length; i++) {
    const qm = lines[i].match(qRe);
    if (qm) {
      const answer: string[] = [];
      let j = i + 1;
      const am = j < lines.length ? lines[j].match(aRe) : null;
      if (am) {
        answer.push(am[1]);
        j++;
        while (j < lines.length && lines[j].trim() && !qRe.test(lines[j])) answer.push(lines[j++].trim());
      }
      if (qm[1].trim() && answer.join("").trim()) {
        cards.push({ q: qm[1].trim(), a: answer.join(" ").trim(), from: note.title });
      }
      i = Math.max(i, j - 1);
      continue;
    }
    const dm = lines[i].match(/^\s*(?:[-*]\s*)?(.{2,80}?)\s*::\s*(.+)$/);
    if (dm) cards.push({ q: dm[1].trim(), a: dm[2].trim(), from: note.title });
  }
  return cards;
}

function buildMarkdown(note: LectureNote) {
  return [
    `# ${note.title || "Untitled lecture"}`,
    "",
    `Subject: ${note.subject || "Not specified"}`,
    `Lecturer: ${note.lecturer || "Not specified"}`,
    `Date: ${formatDate(note.lectureDate)}`,
    `Tags: ${note.tags.join(", ") || "None"}`,
    "",
    "---",
    "",
    note.content,
  ].join("\n");
}

const DOC_CSS = `
body{font-family:Georgia,'Times New Roman',serif;max-width:820px;margin:40px auto;padding:0 24px;color:#222;line-height:1.7}
h1,h2,h3,h4{font-family:Arial,sans-serif;line-height:1.25}
.meta{color:#666;font-size:13px;margin-bottom:26px;font-family:Arial,sans-serif}
pre{background:#f4f4f6;padding:14px;border-radius:8px;white-space:pre-wrap}
code{background:#f1f1f4;padding:1px 5px;border-radius:4px}
blockquote{border-left:3px solid #ff5a1f;margin:12px 0;padding:2px 14px;color:#555}
mark{background:#fff2a8}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:7px 10px;text-align:left}th{background:#f6f6f8}
li.task{list-style:none}
@media print{body{margin:0}}
`;

function buildHtmlDocument(note: LectureNote) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(note.title || "Untitled lecture")}</title><style>${DOC_CSS}</style></head><body><h1>${escapeHtml(
    note.title || "Untitled lecture"
  )}</h1><div class="meta">Subject: ${escapeHtml(note.subject || "Not specified")} · Lecturer: ${escapeHtml(
    note.lecturer || "Not specified"
  )} · Date: ${escapeHtml(formatDate(note.lectureDate))}${
    note.tags.length ? ` · Tags: ${escapeHtml(note.tags.map((t) => `#${t}`).join(" "))}` : ""
  }</div>${renderMarkdown(note.content, false)}</body></html>`;
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

/* Renders dialogs and toasts on document.body so `position: fixed` always
   covers the viewport, even if a parent has transform/overflow styles. */
function Portal({ theme, accent, children }: { theme: string; accent: string; children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="lno lno-portal" data-theme={theme} data-accent={accent}>
      {children}
    </div>,
    document.body
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="lno-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`lno-modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="lno-modal-head">
          <h3>{title}</h3>
          <button className="lno-icon-btn" onClick={onClose} aria-label="Close dialog">×</button>
        </div>
        <div className="lno-modal-body">{children}</div>
      </div>
    </div>
  );
}

function FlashcardStudy({ cards, title, onClose }: { cards: Card[]; title: string; onClose: () => void }) {
  const [deck, setDeck] = useState<Card[]>(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [missed, setMissed] = useState<Card[]>([]);
  const done = index >= deck.length;

  const answer = useCallback(
    (ok: boolean) => {
      if (index >= deck.length) return;
      if (ok) setKnown((k) => k + 1);
      else setMissed((m) => [...m, deck[index]]);
      setFlipped(false);
      setIndex((i) => i + 1);
    },
    [deck, index]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const onButton = event.target instanceof HTMLButtonElement;
      if ((event.key === " " || event.key === "Enter") && !onButton) {
        event.preventDefault();
        setFlipped((f) => !f);
      } else if (event.key === "ArrowRight") answer(true);
      else if (event.key === "ArrowLeft") answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer]);

  const restart = (next: Card[]) => {
    setDeck(next);
    setIndex(0);
    setFlipped(false);
    setKnown(0);
    setMissed([]);
  };

  return (
    <Modal title={`Study · ${title}`} onClose={onClose}>
      {done ? (
        <div className="lno-study-done">
          <div className="lno-empty-icon">✓</div>
          <h4>Session complete</h4>
          <p>
            You knew {known} of {deck.length} cards.
          </p>
          <div className="lno-modal-actions">
            {missed.length > 0 && (
              <button className="lno-btn lno-btn-primary" onClick={() => restart(missed)}>
                Retry {missed.length} missed
              </button>
            )}
            <button className="lno-btn lno-btn-secondary" onClick={() => restart([...cards].sort(() => Math.random() - 0.5))}>
              Shuffle and restart
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="lno-progress">
            <span style={{ width: `${(index / deck.length) * 100}%` }} />
          </div>
          <div className="lno-study-meta">
            <span>
              Card {index + 1} of {deck.length}
            </span>
            <span>{deck[index].from}</span>
          </div>
          <button className={`lno-flashcard ${flipped ? "flipped" : ""}`} onClick={() => setFlipped((f) => !f)}>
            <small>{flipped ? "Answer" : "Question"}</small>
            <strong>{flipped ? deck[index].a : deck[index].q}</strong>
            <em>{flipped ? "" : "Click or press space to reveal"}</em>
          </button>
          <div className="lno-modal-actions">
            <button className="lno-btn lno-btn-secondary" onClick={() => answer(false)}>← Study again</button>
            <button className="lno-btn lno-btn-primary" onClick={() => answer(true)}>I knew it →</button>
          </div>
        </>
      )}
    </Modal>
  );
}

function HistoryModal({
  note,
  onRestore,
  onSnapshot,
  onClose,
}: {
  note: LectureNote;
  onRestore: (version: Version) => void;
  onSnapshot: () => void;
  onClose: () => void;
}) {
  const versions = [...note.versions].reverse();
  const [selected, setSelected] = useState<string>(versions[0]?.id ?? "");
  const active = versions.find((v) => v.id === selected);

  return (
    <Modal title="Version history" onClose={onClose} wide>
      <div className="lno-history">
        <div className="lno-history-list">
          <button className="lno-btn lno-btn-secondary" onClick={onSnapshot}>Save a version now</button>
          {versions.map((v) => (
            <button key={v.id} className={selected === v.id ? "active" : ""} onClick={() => setSelected(v.id)}>
              <strong>{v.label || "Auto snapshot"}</strong>
              <small>
                {relativeTime(v.at)} · {wordCount(v.content)} words
              </small>
            </button>
          ))}
          {!versions.length && <p className="lno-muted-small">Versions appear here as you write. The last {MAX_VERSIONS} are kept.</p>}
        </div>
        <div className="lno-history-preview">
          {active ? (
            <>
              <div className="lno-history-head">
                <div>
                  <strong>{active.title || "Untitled lecture"}</strong>
                  <small>{new Date(active.at).toLocaleString()}</small>
                </div>
                <button className="lno-btn lno-btn-primary" onClick={() => onRestore(active)}>Restore this version</button>
              </div>
              <pre>{active.content || "(empty)"}</pre>
            </>
          ) : (
            <p className="lno-muted-small">Select a version to preview it.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function LectureNoteOrganizer() {
  const [notes, setNotes] = useState<LectureNote[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [activeTag, setActiveTag] = useState("");
  const [tagInput, setTagInput] = useState("");

  const [notice, setNotice] = useState<Notice>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [storageKb, setStorageKb] = useState(0);

  const [focusMode, setFocusMode] = useState(false);
  const [inspector, setInspector] = useState(true);
  const [exportMenu, setExportMenu] = useState(false);
  const [listening, setListening] = useState(false);

  const [modal, setModal] = useState<null | "new" | "workspace" | "history">(null);
  const [study, setStudy] = useState<{ title: string; cards: Card[] } | null>(null);
  const [timer, setTimer] = useState({ mode: "focus" as "focus" | "break", left: 25 * 60, running: false });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const notesRef = useRef<LectureNote[]>([]);
  const filteredNotesRef = useRef<LectureNote[]>([]);
  const selectedIdRef = useRef("");
  const hydratedRef = useRef(false);
  const actionsRef = useRef<{ openNew: () => void; toggleFocus: () => void; saveNow: () => void }>({
    openNew: () => {},
    toggleFocus: () => {},
    saveNow: () => {},
  });

  notesRef.current = notes;
  selectedIdRef.current = selectedId;
  hydratedRef.current = hydrated;

  /* ---------- notices ---------- */

  const notify = useCallback((text: string, action?: { label: string; run: () => void }) => {
    setNotice({ text, action });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), notice.action ? 6000 : 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  /* ---------- persistence ---------- */

  const persist = useCallback(
    (list: LectureNote[]) => {
      try {
        const json = JSON.stringify(list);
        localStorage.setItem(STORAGE_KEY, json);
        setStorageKb(Math.round(json.length / 1024));
        setSavedAt(new Date());
      } catch {
        notify("Unable to save. Browser storage may be full. Export a backup and remove old versions or notes.");
      }
    },
    [notify]
  );

  useEffect(() => {
    const saved = readNotes().filter(
      (n) => !(n.deletedAt && Date.now() - new Date(n.deletedAt).getTime() > TRASH_DAYS * 86_400_000)
    );
    setNotes(saved);
    setSettings(readSettings());
    setSelectedId(saved.find((n) => !n.deletedAt && !n.archived)?.id ?? "");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timeout = window.setTimeout(() => persist(notes), 350);
    return () => window.clearTimeout(timeout);
  }, [notes, hydrated, persist]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* settings are non-critical */
    }
  }, [settings, hydrated]);

  useEffect(() => {
    const flush = () => {
      if (hydratedRef.current) persist(notesRef.current);
    };
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [persist]);

  const updateSettings = (changes: Partial<Settings>) => setSettings((s) => ({ ...s, ...changes }));

  /* ---------- derived data ---------- */

  const liveNotes = useMemo(() => notes.filter((n) => !n.deletedAt), [notes]);

  const selectedNote = useMemo(() => notes.find((n) => n.id === selectedId) ?? null, [notes, selectedId]);
  const locked = !!selectedNote?.deletedAt;

  const subjects = useMemo(() => {
    const map = new Map<string, number>();
    liveNotes.forEach((n) => {
      const s = n.subject.trim();
      if (s) map.set(s, (map.get(s) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [liveNotes]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    liveNotes.forEach((n) => n.tags.forEach((t) => map.set(t, (map.get(t) ?? 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 14);
  }, [liveNotes]);

  const counts = useMemo(
    () => ({
      all: notes.filter((n) => !n.deletedAt && !n.archived).length,
      pinned: notes.filter((n) => !n.deletedAt && !n.archived && n.pinned).length,
      review: notes.filter((n) => !n.deletedAt && !n.archived && needsReview(n)).length,
      archived: notes.filter((n) => !n.deletedAt && n.archived).length,
      trash: notes.filter((n) => n.deletedAt).length,
    }),
    [notes]
  );

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = notes.filter((note) => {
      if (filter === "trash") {
        if (!note.deletedAt) return false;
      } else {
        if (note.deletedAt) return false;
        if (filter === "archived" ? !note.archived : note.archived) return false;
        if (filter === "pinned" && !note.pinned) return false;
        if (filter === "review" && !needsReview(note)) return false;
      }
      if (subjectFilter !== "all" && note.subject.trim() !== subjectFilter) return false;
      if (activeTag && !note.tags.some((t) => t.toLowerCase() === activeTag.toLowerCase())) return false;
      if (!query) return true;
      return [note.title, note.subject, note.lecturer, note.content, note.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    return list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      switch (settings.sort) {
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "lecture":
          return (b.lectureDate || "").localeCompare(a.lectureDate || "");
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [notes, search, filter, subjectFilter, activeTag, settings.sort]);

  // Keep the editor in sync when the user changes the visible list (not while typing).
  useEffect(() => {
    if (!hydratedRef.current) return;
    const id = selectedIdRef.current;
    const visible = filteredNotesRef.current;
    if (id && visible.some((n) => n.id === id)) return;
    setSelectedId(visible[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, subjectFilter, activeTag, search]);

  filteredNotesRef.current = filteredNotes;

  const totalWords = useMemo(() => liveNotes.reduce((t, n) => t + wordCount(n.content), 0), [liveNotes]);
  const focusToday = settings.focusToday.date === today() ? settings.focusToday.count : 0;

  const previewHtml = useMemo(
    () => renderMarkdown(selectedNote?.content ?? "", !locked),
    [selectedNote?.content, locked]
  );
  const outline = useMemo(() => extractOutline(selectedNote?.content ?? ""), [selectedNote?.content]);
  const cards = useMemo(() => (selectedNote ? extractCards(selectedNote) : []), [selectedNote]);
  const tasks = useMemo(() => {
    const text = selectedNote?.content ?? "";
    const total = (text.match(/^\s*[-*+]\s+\[[ xX]\]/gm) ?? []).length;
    const done = (text.match(/^\s*[-*+]\s+\[[xX]\]/gm) ?? []).length;
    return { total, done };
  }, [selectedNote?.content]);

  const selectedWords = selectedNote ? wordCount(selectedNote.content) : 0;
  const readingMinutes = Math.max(1, Math.ceil(selectedWords / 200));

  /* ---------- note mutations ---------- */

  const patchNote = useCallback((id: string, changes: Partial<LectureNote>, touch = true) => {
    setNotes((current) =>
      current.map((note) => {
        if (note.id !== id) return note;
        let versions = note.versions;
        if (changes.content !== undefined && changes.content !== note.content && note.content.trim()) {
          const last = versions[versions.length - 1];
          if (!last || Date.now() - new Date(last.at).getTime() > SNAPSHOT_MS) {
            versions = [
              ...versions,
              { id: createId(), at: new Date().toISOString(), title: note.title, content: note.content },
            ].slice(-MAX_VERSIONS);
          }
        }
        return { ...note, ...changes, versions, updatedAt: touch ? new Date().toISOString() : note.updatedAt };
      })
    );
  }, []);

  const updateSelected = (changes: Partial<LectureNote>, touch = true) => {
    if (!selectedNote || locked) return;
    patchNote(selectedNote.id, changes, touch);
  };

  const leaveView = (id: string) => {
    const list = filteredNotesRef.current;
    const index = list.findIndex((n) => n.id === id);
    const next = list[index + 1] ?? list[index - 1];
    setSelectedId(next?.id ?? "");
  };

  const addNote = (templateId = "blank") => {
    const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
    const note = createNote({
      title: template.title,
      content: template.content,
      subject: subjectFilter !== "all" ? subjectFilter : "",
    });
    setNotes((current) => [note, ...current]);
    setSelectedId(note.id);
    setFilter("all");
    setSearch("");
    setActiveTag("");
    setTagInput("");
    setModal(null);
    notify("New lecture note created.");
  };

  const moveToTrash = () => {
    if (!selectedNote || locked) return;
    const id = selectedNote.id;
    leaveView(id);
    patchNote(id, { deletedAt: new Date().toISOString() }, false);
    notify("Moved to trash.", {
      label: "Undo",
      run: () => {
        patchNote(id, { deletedAt: null }, false);
        setSelectedId(id);
      },
    });
  };

  const restoreFromTrash = () => {
    if (!selectedNote) return;
    leaveView(selectedNote.id);
    patchNote(selectedNote.id, { deletedAt: null }, false);
    notify("Note restored.");
  };

  const deleteForever = () => {
    if (!selectedNote) return;
    if (!window.confirm(`Permanently delete "${selectedNote.title || "Untitled lecture"}"? This cannot be undone.`)) return;
    const id = selectedNote.id;
    leaveView(id);
    setNotes((current) => current.filter((n) => n.id !== id));
    notify("Note deleted permanently.");
  };

  const emptyTrash = () => {
    if (!counts.trash) return;
    if (!window.confirm(`Permanently delete ${counts.trash} trashed note(s)? This cannot be undone.`)) return;
    setNotes((current) => current.filter((n) => !n.deletedAt));
    setSelectedId("");
    notify("Trash emptied.");
  };

  const togglePin = () => {
    if (!selectedNote || locked) return;
    const next = !selectedNote.pinned;
    if (!next && filter === "pinned") leaveView(selectedNote.id);
    patchNote(selectedNote.id, { pinned: next }, false);
    notify(next ? "Note pinned." : "Note unpinned.");
  };

  const toggleArchive = () => {
    if (!selectedNote || locked) return;
    const next = !selectedNote.archived;
    leaveView(selectedNote.id);
    patchNote(selectedNote.id, { archived: next }, false);
    notify(next ? "Note archived." : "Note restored from archive.");
  };

  const markReviewed = () => {
    if (!selectedNote || locked) return;
    if (filter === "review") leaveView(selectedNote.id);
    patchNote(
      selectedNote.id,
      { reviewedAt: new Date().toISOString(), reviewCount: selectedNote.reviewCount + 1 },
      false
    );
    notify("Marked as reviewed. We will remind you again in a week.");
  };

  const duplicateNote = () => {
    if (!selectedNote || locked) return;
    const copy = createNote({
      ...selectedNote,
      id: createId(),
      title: `${selectedNote.title || "Untitled lecture"} (Copy)`,
      pinned: false,
      archived: false,
      versions: [],
      reviewedAt: null,
      reviewCount: 0,
    });
    setNotes((current) => [copy, ...current]);
    setSelectedId(copy.id);
    setFilter("all");
    notify("Note duplicated.");
  };

  const addTag = () => {
    if (!selectedNote || locked) return;
    const incoming = tagInput.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
    if (!incoming.length) return;
    const merged = [...selectedNote.tags];
    incoming.forEach((tag) => {
      if (!merged.some((t) => t.toLowerCase() === tag.toLowerCase())) merged.push(tag);
    });
    updateSelected({ tags: merged });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    if (!selectedNote || locked) return;
    updateSelected({ tags: selectedNote.tags.filter((t) => t !== tag) });
  };

  const saveVersion = () => {
    if (!selectedNote) return;
    const id = selectedNote.id;
    setNotes((current) =>
      current.map((n) =>
        n.id === id
          ? {
              ...n,
              versions: [
                ...n.versions,
                { id: createId(), at: new Date().toISOString(), title: n.title, content: n.content, label: "Manual save" },
              ].slice(-MAX_VERSIONS),
            }
          : n
      )
    );
    notify("Version saved.");
  };

  const restoreVersion = (version: Version) => {
    if (!selectedNote) return;
    if (selectedNote.deletedAt) return notify("Restore this note from the trash before restoring a version.");
    const id = selectedNote.id;
    setNotes((current) =>
      current.map((n) =>
        n.id === id
          ? {
              ...n,
              title: version.title,
              content: version.content,
              updatedAt: new Date().toISOString(),
              versions: [
                ...n.versions,
                { id: createId(), at: new Date().toISOString(), title: n.title, content: n.content, label: "Before restore" },
              ].slice(-MAX_VERSIONS),
            }
          : n
      )
    );
    setModal(null);
    notify("Version restored.");
  };

  /* ---------- editor helpers ---------- */

  const applyEdit = (fn: (value: string, start: number, end: number) => { text: string; start: number; end: number }) => {
    const ta = textareaRef.current;
    const id = selectedIdRef.current;
    if (!ta || !id || locked) return;
    const result = fn(ta.value, ta.selectionStart, ta.selectionEnd);
    patchNote(id, { content: result.text });
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(result.start, result.end);
    });
  };

  const wrapSelection = (before: string, after: string, placeholder: string) =>
    applyEdit((v, s, e) => {
      const selected = v.slice(s, e) || placeholder;
      return {
        text: v.slice(0, s) + before + selected + after + v.slice(e),
        start: s + before.length,
        end: s + before.length + selected.length,
      };
    });

  const prefixLines = (prefix: string | ((i: number) => string), strip: RegExp) =>
    applyEdit((v, s, e) => {
      const lineStart = v.lastIndexOf("\n", s - 1) + 1;
      const rawEnd = v.indexOf("\n", e);
      const lineEnd = rawEnd === -1 ? v.length : rawEnd;
      const block = v.slice(lineStart, lineEnd).split("\n");
      const allHave = block.every((l) => strip.test(l));
      const next = block
        .map((l, i) => (allHave ? l.replace(strip, "") : (typeof prefix === "function" ? prefix(i) : prefix) + l.replace(strip, "")))
        .join("\n");
      return { text: v.slice(0, lineStart) + next + v.slice(lineEnd), start: lineStart, end: lineStart + next.length };
    });

  const insertBlock = (block: string) =>
    applyEdit((v, s, e) => {
      const before = v.slice(0, e);
      const pad = before && !before.endsWith("\n") ? "\n" : "";
      const text = before + pad + block + v.slice(e);
      const pos = (before + pad + block).length;
      void s;
      return { text, start: pos, end: pos };
    });

  const insertInline = (value: string) => {
    const ta = textareaRef.current;
    const id = selectedIdRef.current;
    if (!id) return;
    if (!ta) {
      const current = notesRef.current.find((n) => n.id === id);
      if (current) patchNote(id, { content: `${current.content}${current.content && !current.content.endsWith("\n") ? "\n" : ""}${value}` });
      return;
    }
    applyEdit((v, s, e) => ({ text: v.slice(0, s) + value + v.slice(e), start: s + value.length, end: s + value.length }));
  };

  const heading = (level: number) =>
    applyEdit((v, s, e) => {
      const lineStart = v.lastIndexOf("\n", s - 1) + 1;
      const rawEnd = v.indexOf("\n", e);
      const lineEnd = rawEnd === -1 ? v.length : rawEnd;
      const marker = `${"#".repeat(level)} `;
      const block = v.slice(lineStart, lineEnd).split("\n");
      const same = block.every((l) => l.startsWith(marker));
      const next = block.map((l) => (same ? l.slice(marker.length) : marker + l.replace(/^#{1,6}\s+/, ""))).join("\n");
      return { text: v.slice(0, lineStart) + next + v.slice(lineEnd), start: lineStart, end: lineStart + next.length };
    });

  const formatActions: { label: string; title: string; run: () => void; strong?: boolean }[] = [
    { label: "H1", title: "Heading 1", run: () => heading(1) },
    { label: "H2", title: "Heading 2", run: () => heading(2) },
    { label: "H3", title: "Heading 3", run: () => heading(3) },
    { label: "B", title: "Bold (Ctrl+B)", run: () => wrapSelection("**", "**", "bold text"), strong: true },
    { label: "I", title: "Italic (Ctrl+I)", run: () => wrapSelection("*", "*", "italic text") },
    { label: "▰", title: "Highlight", run: () => wrapSelection("==", "==", "important") },
    { label: "•", title: "Bullet list", run: () => prefixLines("- ", /^-\s(?!\[)/) },
    { label: "1.", title: "Numbered list", run: () => prefixLines((i) => `${i + 1}. `, /^\d+[.)]\s/) },
    { label: "☑", title: "Checklist", run: () => prefixLines("- [ ] ", /^-\s\[[ xX]\]\s/) },
    { label: "❝", title: "Quote", run: () => prefixLines("> ", /^>\s?/) },
    { label: "</>", title: "Code block", run: () => wrapSelection("```\n", "\n```", "code") },
    { label: "🔗", title: "Link (Ctrl+K)", run: () => wrapSelection("[", "](https://)", "link text") },
    { label: "▦", title: "Table", run: () => insertBlock("\n| Term | Definition |\n| --- | --- |\n|  |  |\n") },
    { label: "Q/A", title: "Flashcard question", run: () => insertBlock("\nQ: \nA: \n") },
    { label: "🗓", title: "Insert today's date", run: () => insertInline(formatDate(today())) },
  ];

  const onEditorKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === "b") {
      event.preventDefault();
      wrapSelection("**", "**", "bold text");
      return;
    }
    if (mod && event.key.toLowerCase() === "i") {
      event.preventDefault();
      wrapSelection("*", "*", "italic text");
      return;
    }
    if (mod && event.key.toLowerCase() === "k") {
      event.preventDefault();
      wrapSelection("[", "](https://)", "link text");
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && !mod && !event.altKey && !event.nativeEvent.isComposing) {
      const ta = event.currentTarget;
      const { selectionStart: s, selectionEnd: e, value } = ta;
      if (s !== e) return;
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      const line = value.slice(lineStart, s);
      const m = line.match(/^(\s*)((?:[-*+]\s\[[ xX]\]\s)|(?:[-*+]\s)|(?:(\d+)([.)])\s))(.*)$/);
      if (!m) return;
      event.preventDefault();
      if (!m[5].trim()) {
        applyEdit((v) => ({ text: v.slice(0, lineStart) + v.slice(s), start: lineStart, end: lineStart }));
        return;
      }
      let marker = m[2];
      if (m[3]) marker = `${parseInt(m[3], 10) + 1}${m[4]} `;
      else marker = marker.replace(/\[[xX]\]/, "[ ]");
      const insert = `\n${m[1]}${marker}`;
      applyEdit((v) => ({
        text: v.slice(0, s) + insert + v.slice(e),
        start: s + insert.length,
        end: s + insert.length,
      }));
    }
  };

  const jumpToLine = (line: number) => {
    const ta = textareaRef.current;
    if (ta && selectedNote) {
      const before = selectedNote.content.split("\n").slice(0, line).join("\n");
      const offset = before.length + (line > 0 ? 1 : 0);
      const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 22;
      ta.focus();
      ta.setSelectionRange(offset, offset);
      ta.scrollTop = Math.max(0, line * lineHeight - 60);
    }
    document.getElementById(`lno-h-${line}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onPreviewClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLInputElement) || !target.dataset.line || !selectedNote || locked) return;
    const lines = selectedNote.content.split("\n");
    const index = Number(target.dataset.line);
    lines[index] = lines[index].replace(/\[( |x|X)\]/, (_m, c: string) => (c === " " ? "[x]" : "[ ]"));
    patchNote(selectedNote.id, { content: lines.join("\n") });
  };

  const toggleDictation = () => {
    const w = window as unknown as Record<string, unknown>;
    const SR = (w.SpeechRecognition || w.webkitSpeechRecognition) as
      | (new () => {
          continuous: boolean;
          interimResults: boolean;
          lang: string;
          onresult: (e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void;
          onend: () => void;
          onerror: () => void;
          start: () => void;
          stop: () => void;
        })
      | undefined;

    if (!SR) {
      notify("Voice dictation is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    if (!selectedNote || locked) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) text += event.results[i][0].transcript;
      }
      if (text.trim()) insertInline(`${text.trim()} `);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      notify("Dictation stopped. Check microphone permission.");
    };
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
    notify("Listening… speak to add text at the cursor.");
  };

  useEffect(() => () => recognitionRef.current?.stop(), []);

  /* ---------- export / import ---------- */

  const exportNote = (kind: "md" | "txt" | "html" | "json") => {
    if (!selectedNote) return;
    const name = slugify(selectedNote.title);
    if (kind === "md") downloadFile(`${name}.md`, buildMarkdown(selectedNote), "text/markdown;charset=utf-8");
    if (kind === "txt") downloadFile(`${name}.txt`, buildMarkdown(selectedNote), "text/plain;charset=utf-8");
    if (kind === "html") downloadFile(`${name}.html`, buildHtmlDocument(selectedNote), "text/html;charset=utf-8");
    if (kind === "json") downloadFile(`${name}.json`, JSON.stringify([selectedNote], null, 2), "application/json;charset=utf-8");
    setExportMenu(false);
    notify(`Exported as .${kind}`);
  };

  const exportAllJson = () => {
    if (!notes.length) return notify("There are no notes to export.");
    downloadFile(`toolsab-lecture-notes-${today()}.json`, JSON.stringify(notes, null, 2), "application/json;charset=utf-8");
    notify("Full backup downloaded.");
  };

  const exportAllMarkdown = () => {
    if (!liveNotes.length) return notify("There are no notes to export.");
    downloadFile(
      `toolsab-lecture-notes-${today()}.md`,
      liveNotes.map(buildMarkdown).join("\n\n\n"),
      "text/markdown;charset=utf-8"
    );
    notify("All notes exported as one Markdown file.");
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    const added: LectureNote[] = [];
    const existing = new Set(notesRef.current.map((n) => n.id));
    let skipped = 0;
    let failed = 0;

    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        if (file.name.toLowerCase().endsWith(".json")) {
          const data: unknown = JSON.parse(text);
          (Array.isArray(data) ? data : [data]).forEach((raw) => {
            const note = normalizeNote(raw);
            if (!note) return failed++;
            if (existing.has(note.id)) return skipped++;
            existing.add(note.id);
            added.push(note);
          });
        } else {
          const heading = text.match(/^#\s+(.+)$/m);
          added.push(createNote({ title: heading?.[1].trim() || file.name.replace(/\.[^.]+$/, ""), content: text }));
        }
      } catch {
        failed++;
      }
    }

    if (added.length) {
      setNotes((current) => [...added, ...current]);
      setSelectedId(added[0].id);
      setFilter("all");
    }
    event.target.value = "";
    notify(
      `Imported ${added.length} note(s)${skipped ? `, ${skipped} already existed` : ""}${failed ? `, ${failed} failed` : ""}.`
    );
  };

  const copyNote = async () => {
    if (!selectedNote) return;
    const text = buildMarkdown(selectedNote);
    try {
      await navigator.clipboard.writeText(text);
      notify("Note copied to clipboard.");
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      notify(ok ? "Note copied to clipboard." : "Could not copy this note.");
    }
  };

  const printNote = () => {
    if (!selectedNote) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return notify("Allow pop-ups to print this note.");
    win.document.write(buildHtmlDocument(selectedNote));
    win.document.close();
    win.focus();
    win.print();
  };

  const clearEverything = () => {
    if (!window.confirm("Delete ALL notes and settings from this browser? Export a backup first. This cannot be undone.")) return;
    setNotes([]);
    setSelectedId("");
    setSettings(DEFAULT_SETTINGS);
    setModal(null);
    notify("All data cleared.");
  };

  const resetView = () => {
    setSearch("");
    setFilter("all");
    setSubjectFilter("all");
    setActiveTag("");
    setTagInput("");
    setSelectedId(notes.find((n) => !n.archived && !n.deletedAt)?.id ?? "");
    notify("View filters reset.");
  };

  /* ---------- study + timer ---------- */

  const startStudy = (scope: "note" | "all") => {
    const source = scope === "note" && selectedNote ? [selectedNote] : liveNotes.filter((n) => !n.archived);
    const deck = source.flatMap(extractCards);
    if (!deck.length) {
      notify("No flashcards yet. Add lines like “Q: … / A: …” or “Term :: Definition”.");
      return;
    }
    setStudy({ title: scope === "note" && selectedNote ? selectedNote.title || "Untitled lecture" : "All notes", cards: deck });
  };

  const allCardCount = useMemo(() => liveNotes.filter((n) => !n.archived).reduce((t, n) => t + extractCards(n).length, 0), [liveNotes]);

  useEffect(() => {
    if (!timer.running) return;
    const id = window.setInterval(() => {
      setTimer((t) => (t.running && t.left > 0 ? { ...t, left: t.left - 1 } : t));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timer.running]);

  useEffect(() => {
    if (!timer.running || timer.left > 0) return;
    if (timer.mode === "focus") {
      setSettings((s) => ({
        ...s,
        focusToday: { date: today(), count: (s.focusToday.date === today() ? s.focusToday.count : 0) + 1 },
      }));
      notify("Focus session complete. Take a 5 minute break.");
      setTimer({ mode: "break", left: 5 * 60, running: false });
    } else {
      notify("Break over. Ready for another focus session?");
      setTimer({ mode: "focus", left: 25 * 60, running: false });
    }
  }, [timer, notify]);

  const timerLabel = `${String(Math.floor(timer.left / 60)).padStart(2, "0")}:${String(timer.left % 60).padStart(2, "0")}`;

  /* ---------- global shortcuts ---------- */

  actionsRef.current = {
    openNew: () => setModal("new"),
    toggleFocus: () => setFocusMode((f) => !f),
    saveNow: () => {
      persist(notesRef.current);
      notify("Saved.");
    },
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        actionsRef.current.saveNow();
      } else if (event.altKey && event.code === "KeyN") {
        event.preventDefault();
        actionsRef.current.openNew();
      } else if (event.altKey && event.code === "KeyF") {
        event.preventDefault();
        actionsRef.current.toggleFocus();
      } else if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "Escape") {
        setExportMenu(false);
        setFocusMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!modal && !study) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [modal, study]);

  useEffect(() => {
    if (!exportMenu) return;
    const close = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest?.(".lno-menu-wrap")) setExportMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [exportMenu]);

  /* ---------- render ---------- */

  if (!hydrated) {
    return (
      <ToolShell title="Lecture Note Organizer" onReset={() => {}} wide>
        <div className="lno-loading">Loading your notes...</div>
        <style jsx global>{`
          .lno-loading { padding: 45px 20px; text-align: center; color: #8a909b; font-size: 13px; }
        `}</style>
      </ToolShell>
    );
  }

  const mode = settings.mode;
  const navItems: { id: FilterType; label: string; icon: string }[] = [
    { id: "all", label: "All notes", icon: "▤" },
    { id: "pinned", label: "Pinned", icon: "★" },
    { id: "review", label: "Needs review", icon: "↻" },
    { id: "archived", label: "Archived", icon: "▣" },
    { id: "trash", label: "Trash", icon: "⌫" },
  ];
  const viewTitle = navItems.find((n) => n.id === filter)?.label ?? "All notes";
  const storagePct = Math.min(100, Math.round((storageKb / STORAGE_LIMIT_KB) * 100));

  return (
    <ToolShell title="Lecture Note Organizer" onReset={resetView} wide>
      <div className={`lno ${focusMode ? "is-focus" : ""}`} data-theme={settings.theme} data-accent={settings.accent}>
        <div className="lno-topbar">
          <div>
            <div className="lno-eyebrow">Study workspace</div>
            <h2>Lecture notes, organized.</h2>
            <p>Write in Markdown, review with flashcards, and keep every class in one place.</p>
          </div>
          <div className="lno-top-actions">
            <div className={`lno-timer ${timer.mode}`} title="Pomodoro focus timer">
              <button
                className="lno-timer-mode"
                onClick={() => setTimer({ mode: timer.mode === "focus" ? "break" : "focus", left: timer.mode === "focus" ? 5 * 60 : 25 * 60, running: false })}
              >
                {timer.mode === "focus" ? "Focus" : "Break"}
              </button>
              <strong>{timerLabel}</strong>
              <button onClick={() => setTimer((t) => ({ ...t, running: !t.running }))} aria-label={timer.running ? "Pause timer" : "Start timer"}>
                {timer.running ? "❚❚" : "▶"}
              </button>
              <button onClick={() => setTimer({ mode: timer.mode, left: timer.mode === "focus" ? 25 * 60 : 5 * 60, running: false })} aria-label="Reset timer">
                ↺
              </button>
            </div>
            <button className="lno-btn lno-btn-secondary" onClick={() => startStudy("all")} title="Study flashcards from all notes">
              ❖ Study{allCardCount ? ` (${allCardCount})` : ""}
            </button>
            <button
              className="lno-btn lno-btn-secondary lno-square"
              onClick={() => updateSettings({ theme: settings.theme === "light" ? "dark" : "light" })}
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
            >
              {settings.theme === "light" ? "☾" : "☀"}
            </button>
            <button className="lno-btn lno-btn-secondary lno-square" onClick={() => setModal("workspace")} aria-label="Workspace settings" title="Settings, backup and shortcuts">
              ⚙
            </button>
            <button className="lno-btn lno-btn-primary" onClick={() => setModal("new")}>
              ＋ New note
            </button>
          </div>
        </div>

        <div className="lno-stats">
          {[
            { icon: "▤", value: liveNotes.length, label: "Notes" },
            { icon: "◈", value: subjects.length, label: "Subjects" },
            { icon: "⌑", value: totalWords.toLocaleString(), label: "Words written" },
            { icon: "↻", value: counts.review, label: "Due for review" },
            { icon: "◔", value: focusToday, label: "Focus sessions today" },
          ].map((s) => (
            <div className="lno-stat" key={s.label}>
              <span className="lno-stat-icon">{s.icon}</span>
              <div>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="lno-workspace">
          <aside className="lno-sidebar">
            <div className="lno-sidebar-heading">
              <span>My notebook</span>
              <button className="lno-icon-btn" onClick={() => setModal("new")} aria-label="Create note" title="Create note">＋</button>
            </div>

            <div className="lno-search">
              <span>⌕</span>
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…  ( / )"
                aria-label="Search notes"
              />
              {search && <button onClick={() => setSearch("")} aria-label="Clear search">×</button>}
            </div>

            <div className="lno-filter-label">Views</div>
            <div className="lno-nav">
              {navItems.map((item) => (
                <button key={item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>
                  <span>{item.icon}</span> {item.label} <small>{counts[item.id]}</small>
                </button>
              ))}
            </div>

            <div className="lno-filter-label">Subjects</div>
            <div className="lno-subjects">
              <button className={subjectFilter === "all" ? "selected" : ""} onClick={() => setSubjectFilter("all")}>
                <span className="lno-subject-dot all-dot" /> <span className="lno-subject-name">All subjects</span>
              </button>
              {subjects.map(([subject, count]) => (
                <button key={subject} className={subjectFilter === subject ? "selected" : ""} onClick={() => setSubjectFilter(subject)} title={subject}>
                  <span className="lno-subject-dot" />
                  <span className="lno-subject-name">{subject}</span>
                  <small>{count}</small>
                </button>
              ))}
              {!subjects.length && <p className="lno-muted-small">Add a subject to a note to see it here.</p>}
            </div>

            {tagCounts.length > 0 && (
              <>
                <div className="lno-filter-label">Tags</div>
                <div className="lno-tag-cloud">
                  {tagCounts.map(([tag, count]) => (
                    <button key={tag} className={activeTag.toLowerCase() === tag.toLowerCase() ? "active" : ""} onClick={() => setActiveTag(activeTag.toLowerCase() === tag.toLowerCase() ? "" : tag)}>
                      #{tag} <small>{count}</small>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="lno-storage-note">
              <div className="lno-storage-top">
                <strong>Saved on this device</strong>
                <small>{storageKb} KB used</small>
              </div>
              <div className="lno-meter"><span style={{ width: `${storagePct}%` }} className={storagePct > 80 ? "warn" : ""} /></div>
              <small>Notes stay in this browser. Export a backup from Settings.</small>
            </div>
          </aside>

          <section className="lno-list-panel">
            <div className="lno-list-header">
              <div>
                <h3>{viewTitle}</h3>
                <span>
                  {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
                  {activeTag ? ` · #${activeTag}` : ""}
                </span>
              </div>
              <div className="lno-list-tools">
                <select value={settings.sort} onChange={(e) => updateSettings({ sort: e.target.value as SortType })} aria-label="Sort notes">
                  <option value="updated">Recently edited</option>
                  <option value="created">Recently created</option>
                  <option value="lecture">Lecture date</option>
                  <option value="title">Title A–Z</option>
                </select>
                <button className={`lno-icon-btn ${settings.compact ? "on" : ""}`} onClick={() => updateSettings({ compact: !settings.compact })} aria-label="Toggle compact list" title="Compact list">
                  ☰
                </button>
              </div>
            </div>

            {filter === "trash" && counts.trash > 0 && (
              <div className="lno-trash-bar">
                <span>Notes are deleted forever after {TRASH_DAYS} days.</span>
                <button onClick={emptyTrash}>Empty trash</button>
              </div>
            )}

            <div className="lno-note-list">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  className={`lno-note-card ${selectedId === note.id ? "selected" : ""} ${settings.compact ? "compact" : ""}`}
                  style={{ "--note": COLORS[note.color] || "transparent" } as CSSProperties}
                  onClick={() => setSelectedId(note.id)}
                >
                  <div className="lno-note-card-top">
                    <span className="lno-note-subject">{note.subject || "Uncategorized"}</span>
                    <span className="lno-note-card-icons">
                      {needsReview(note) && !note.deletedAt && !note.archived && <span title="Due for review" className="due">↻</span>}
                      {note.pinned && <span title="Pinned">★</span>}
                      {note.archived && <span title="Archived">▣</span>}
                    </span>
                  </div>
                  <strong>{note.title || "Untitled lecture"}</strong>
                  {!settings.compact && <p>{note.content.trim().slice(0, 110) || "No content yet. Open to start writing…"}</p>}
                  <div className="lno-note-card-bottom">
                    <span>{formatDate(note.lectureDate)}</span>
                    <span>{wordCount(note.content)} words</span>
                  </div>
                  {!settings.compact && note.tags.length > 0 && (
                    <div className="lno-card-tags">
                      {note.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}
                      {note.tags.length > 3 && <span>+{note.tags.length - 3}</span>}
                    </div>
                  )}
                </button>
              ))}

              {!filteredNotes.length && (
                <div className="lno-empty-list">
                  <span>▤</span>
                  <strong>{search || activeTag || subjectFilter !== "all" ? "No matching notes" : filter === "trash" ? "Trash is empty" : "Nothing here yet"}</strong>
                  <p>
                    {search || activeTag || subjectFilter !== "all"
                      ? "Try a different search or clear your filters."
                      : filter === "review"
                      ? "Notes you have not reviewed in a week show up here."
                      : "Create a note to start organizing your lectures."}
                  </p>
                  {search || activeTag || subjectFilter !== "all" ? (
                    <button className="lno-btn lno-btn-secondary" onClick={() => { setSearch(""); setSubjectFilter("all"); setActiveTag(""); }}>
                      Clear filters
                    </button>
                  ) : filter === "all" ? (
                    <button className="lno-btn lno-btn-primary" onClick={() => setModal("new")}>Create your first note</button>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          <main className="lno-editor">
            {selectedNote ? (
              <>
                {locked && (
                  <div className="lno-deleted-banner">
                    <span>This note is in the trash. Restore it to edit.</span>
                    <div>
                      <button className="lno-btn lno-btn-secondary" onClick={restoreFromTrash}>Restore</button>
                      <button className="lno-btn lno-btn-danger" onClick={deleteForever}>Delete forever</button>
                    </div>
                  </div>
                )}

                <div className="lno-editor-toolbar">
                  <div className="lno-save-status">
                    <span /> {savedAt ? `Saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Autosaved locally"}
                  </div>
                  <div className="lno-editor-actions">
                    <button className={`lno-tool-action ${selectedNote.pinned ? "is-active" : ""}`} onClick={togglePin} disabled={locked} title="Pin note">
                      ★ <span>{selectedNote.pinned ? "Pinned" : "Pin"}</span>
                    </button>
                    <button className="lno-tool-action good" onClick={markReviewed} disabled={locked} title="Mark as reviewed">
                      ✓ <span>Reviewed</span>
                    </button>
                    <button className="lno-tool-action" onClick={() => setModal("history")} title="Version history">
                      ◷ <span>History</span>
                    </button>
                    <button className="lno-tool-action" onClick={duplicateNote} disabled={locked} title="Duplicate note">▢ <span>Duplicate</span></button>
                    <button className="lno-tool-action" onClick={toggleArchive} disabled={locked} title="Archive or restore">
                      ▣ <span>{selectedNote.archived ? "Unarchive" : "Archive"}</span>
                    </button>
                    <button className="lno-tool-action danger" onClick={moveToTrash} disabled={locked} title="Move to trash">⌫ <span>Trash</span></button>
                    <span className="lno-divider" />
                    <button className={`lno-tool-action ${focusMode ? "is-active" : ""}`} onClick={() => setFocusMode((f) => !f)} title="Focus mode (Alt+F)">
                      ⤢ <span>Focus</span>
                    </button>
                    <button className={`lno-tool-action lno-inspector-toggle ${inspector ? "is-active" : ""}`} onClick={() => setInspector((i) => !i)} title="Toggle insights panel">
                      ◫ <span>Insights</span>
                    </button>
                  </div>
                </div>

                <div className="lno-editor-body">
                  <div className="lno-editor-content">
                    <input
                      className="lno-title-input"
                      value={selectedNote.title}
                      onChange={(e) => updateSelected({ title: e.target.value })}
                      placeholder="Lecture title…"
                      aria-label="Lecture title"
                      readOnly={locked}
                    />

                    <div className="lno-meta-grid">
                      <label>
                        <span>Subject</span>
                        <input
                          value={selectedNote.subject}
                          onChange={(e) => updateSelected({ subject: e.target.value })}
                          placeholder="e.g. Biology"
                          list="lno-subject-suggestions"
                          readOnly={locked}
                        />
                        <datalist id="lno-subject-suggestions">
                          {subjects.map(([s]) => <option key={s} value={s} />)}
                        </datalist>
                      </label>
                      <label>
                        <span>Lecturer</span>
                        <input value={selectedNote.lecturer} onChange={(e) => updateSelected({ lecturer: e.target.value })} placeholder="Lecturer name" readOnly={locked} />
                      </label>
                      <label>
                        <span>Lecture date</span>
                        <input type="date" value={selectedNote.lectureDate} onChange={(e) => updateSelected({ lectureDate: e.target.value })} readOnly={locked} />
                      </label>
                      <div className="lno-color-field">
                        <span>Color</span>
                        <div>
                          {COLOR_KEYS.map((c) => (
                            <button
                              key={c}
                              className={`lno-swatch ${selectedNote.color === c ? "on" : ""} ${c === "none" ? "none" : ""}`}
                              style={{ background: COLORS[c] || undefined }}
                              onClick={() => updateSelected({ color: c }, false)}
                              aria-label={`Color ${c}`}
                              title={c === "none" ? "No color" : c}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="lno-tags-section">
                      <span className="lno-field-label">Tags</span>
                      <div className="lno-tags-row">
                        {selectedNote.tags.map((tag) => (
                          <span className="lno-tag" key={tag}>
                            #{tag}
                            {!locked && <button onClick={() => removeTag(tag)} aria-label={`Remove ${tag} tag`}>×</button>}
                          </span>
                        ))}
                        {!locked && (
                          <form className="lno-tag-form" onSubmit={(e) => { e.preventDefault(); addTag(); }}>
                            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="+ Add tag" aria-label="Add a tag" />
                          </form>
                        )}
                      </div>
                    </div>

                    <div className="lno-format-bar">
                      <div className="lno-format-buttons">
                        {formatActions.map((a) => (
                          <button key={a.title} title={a.title} aria-label={a.title} onClick={a.run} disabled={locked || mode === "preview"} className={a.strong ? "strong" : ""}>
                            {a.label}
                          </button>
                        ))}
                        <button title="Dictate with your voice" aria-label="Dictate with your voice" className={listening ? "listening" : ""} onClick={toggleDictation} disabled={locked}>
                          {listening ? "● Stop" : "🎤"}
                        </button>
                      </div>
                      <div className="lno-segmented" role="tablist" aria-label="Editor view">
                        {(["edit", "split", "preview"] as ViewMode[]).map((m) => (
                          <button key={m} className={mode === m ? "on" : ""} onClick={() => updateSettings({ mode: m })} role="tab" aria-selected={mode === m}>
                            {m === "edit" ? "Write" : m === "split" ? "Split" : "Preview"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`lno-pane lno-pane-${mode}`}>
                      {mode !== "preview" && (
                        <textarea
                          ref={textareaRef}
                          className="lno-content-input"
                          value={selectedNote.content}
                          onChange={(e) => updateSelected({ content: e.target.value })}
                          onKeyDown={onEditorKeyDown}
                          readOnly={locked}
                          spellCheck
                          aria-label="Lecture note content"
                          placeholder={`Start writing your lecture notes…

Markdown works here:
# Heading   **bold**   *italic*   ==highlight==
- bullet list     - [ ] checklist
Q: Question for a flashcard
A: Its answer
Term :: Definition`}
                        />
                      )}
                      {mode !== "edit" && (
                        <div className="lno-preview" onClick={onPreviewClick}>
                          {selectedNote.content.trim() ? (
                            <div className="lno-md" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                          ) : (
                            <p className="lno-muted-small">Nothing to preview yet.</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="lno-editor-footer">
                      <div>
                        <span>{selectedWords.toLocaleString()} words</span>
                        <span>{selectedNote.content.length.toLocaleString()} characters</span>
                        <span>About {readingMinutes} min read</span>
                        {tasks.total > 0 && <span>{tasks.done}/{tasks.total} tasks done</span>}
                      </div>
                      <div className="lno-export-actions">
                        <button onClick={copyNote}>Copy</button>
                        <button onClick={printNote}>Print / PDF</button>
                        <div className="lno-menu-wrap">
                          <button className="lno-export-primary" onClick={() => setExportMenu((o) => !o)} aria-expanded={exportMenu}>
                            ↓ Export ▾
                          </button>
                          {exportMenu && (
                            <div className="lno-menu">
                              <button onClick={() => exportNote("md")}>Markdown (.md)</button>
                              <button onClick={() => exportNote("html")}>Web page (.html)</button>
                              <button onClick={() => exportNote("txt")}>Plain text (.txt)</button>
                              <button onClick={() => exportNote("json")}>Backup (.json)</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {inspector && !focusMode && (
                    <aside className="lno-inspector">
                      <section>
                        <h4>Outline</h4>
                        {outline.length ? (
                          <div className="lno-outline">
                            {outline.map((o) => (
                              <button key={o.line} style={{ paddingLeft: 8 + (o.level - 1) * 12 }} onClick={() => jumpToLine(o.line)}>
                                {o.text}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="lno-muted-small">Add headings with # to build an outline.</p>
                        )}
                      </section>

                      <section>
                        <h4>Flashcards</h4>
                        <p className="lno-muted-small">
                          {cards.length ? `${cards.length} card${cards.length === 1 ? "" : "s"} found in this note.` : "Use “Q: / A:” or “Term :: Definition” lines."}
                        </p>
                        <button className="lno-btn lno-btn-primary lno-block" onClick={() => startStudy("note")} disabled={!cards.length}>
                          Study this note
                        </button>
                      </section>

                      {tasks.total > 0 && (
                        <section>
                          <h4>Checklist</h4>
                          <div className="lno-progress"><span style={{ width: `${(tasks.done / tasks.total) * 100}%` }} /></div>
                          <p className="lno-muted-small">{tasks.done} of {tasks.total} complete</p>
                        </section>
                      )}

                      <section>
                        <h4>Review</h4>
                        <dl>
                          <div><dt>Last reviewed</dt><dd>{relativeTime(selectedNote.reviewedAt)}</dd></div>
                          <div><dt>Times reviewed</dt><dd>{selectedNote.reviewCount}</dd></div>
                          <div><dt>Last edited</dt><dd>{relativeTime(selectedNote.updatedAt)}</dd></div>
                          <div><dt>Versions kept</dt><dd>{selectedNote.versions.length}</dd></div>
                        </dl>
                      </section>
                    </aside>
                  )}
                </div>
              </>
            ) : (
              <div className="lno-editor-empty">
                <div className="lno-empty-icon">✎</div>
                <h3>Select a lecture note</h3>
                <p>Choose a note from your notebook, or start a new one from a template.</p>
                <button className="lno-btn lno-btn-primary" onClick={() => setModal("new")}>＋ Create a note</button>
              </div>
            )}
          </main>
        </div>

        {/* ---------- dialogs ---------- */}
        <Portal theme={settings.theme} accent={settings.accent}>

        {modal === "new" && (
          <Modal title="Create a note" onClose={() => setModal(null)}>
            <div className="lno-templates">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => addNote(t.id)}>
                  <span>{t.icon}</span>
                  <div>
                    <strong>{t.name}</strong>
                    <small>{t.desc}</small>
                  </div>
                </button>
              ))}
            </div>
          </Modal>
        )}

        {modal === "history" && selectedNote && (
          <HistoryModal note={selectedNote} onRestore={restoreVersion} onSnapshot={saveVersion} onClose={() => setModal(null)} />
        )}

        {modal === "workspace" && (
          <Modal title="Workspace settings" onClose={() => setModal(null)} wide>
            <div className="lno-settings">
              <section>
                <h4>Appearance</h4>
                <div className="lno-setting-row">
                  <span>Theme</span>
                  <div className="lno-segmented">
                    {(["light", "dark"] as const).map((t) => (
                      <button key={t} className={settings.theme === t ? "on" : ""} onClick={() => updateSettings({ theme: t })}>{t === "light" ? "Light" : "Dark"}</button>
                    ))}
                  </div>
                </div>
                <div className="lno-setting-row">
                  <span>Accent color</span>
                  <div className="lno-accents">
                    {(["orange", "violet", "emerald", "blue"] as Accent[]).map((a) => (
                      <button
                        key={a}
                        className={settings.accent === a ? "on" : ""}
                        style={{ background: COLORS[a] }}
                        onClick={() => updateSettings({ accent: a })}
                        aria-label={`${a} accent`}
                      />
                    ))}
                  </div>
                </div>
                <div className="lno-setting-row">
                  <span>Compact note list</span>
                  <div className="lno-segmented">
                    <button className={!settings.compact ? "on" : ""} onClick={() => updateSettings({ compact: false })}>Detailed</button>
                    <button className={settings.compact ? "on" : ""} onClick={() => updateSettings({ compact: true })}>Compact</button>
                  </div>
                </div>
              </section>

              <section>
                <h4>Backup and import</h4>
                <p className="lno-muted-small">Your notes live in this browser only. Download a backup before clearing browser data or switching devices.</p>
                <div className="lno-modal-actions left">
                  <button className="lno-btn lno-btn-primary" onClick={exportAllJson}>Full backup (.json)</button>
                  <button className="lno-btn lno-btn-secondary" onClick={exportAllMarkdown}>All notes (.md)</button>
                  <button className="lno-btn lno-btn-secondary" onClick={() => importRef.current?.click()}>Import files…</button>
                  <input ref={importRef} type="file" accept=".json,.md,.markdown,.txt" multiple hidden onChange={handleImport} />
                </div>
                <div className="lno-meter big"><span style={{ width: `${storagePct}%` }} className={storagePct > 80 ? "warn" : ""} /></div>
                <p className="lno-muted-small">{storageKb} KB of about 5 MB browser storage used.</p>
              </section>

              <section>
                <h4>Keyboard shortcuts</h4>
                <dl className="lno-shortcuts">
                  {SHORTCUTS.map(([keys, label]) => (
                    <div key={keys}><dt><kbd>{keys}</kbd></dt><dd>{label}</dd></div>
                  ))}
                </dl>
              </section>

              <section>
                <h4>Danger zone</h4>
                <button className="lno-btn lno-btn-danger" onClick={clearEverything}>Delete all notes and settings</button>
              </section>
            </div>
          </Modal>
        )}

        {study && <FlashcardStudy cards={study.cards} title={study.title} onClose={() => setStudy(null)} />}

        {notice && (
          <div className="lno-toast" role="status">
            <span>{notice.text}</span>
            {notice.action && (
              <button onClick={() => { notice.action?.run(); setNotice(null); }}>{notice.action.label}</button>
            )}
          </div>
        )}
        </Portal>
      </div>

      <style jsx global>{`
        .lno {
          --accent: #ff5a1f;
          --accent-2: #ff8a4c;
          --bg: #ffffff;
          --bg-2: #fbfbfc;
          --bg-3: #f2f3f6;
          --ink: #20232b;
          --ink-2: #454a55;
          --muted: #858b98;
          --line: #eceef2;
          --field: #ffffff;
          --accent-soft: color-mix(in srgb, var(--accent) 11%, var(--bg));
          --accent-line: color-mix(in srgb, var(--accent) 40%, var(--bg));
          color: var(--ink);
          width: 100%;
          font-family: inherit;
        }
        .lno[data-accent="violet"] { --accent: #7c5cff; --accent-2: #a08bff; }
        .lno[data-accent="emerald"] { --accent: #12b886; --accent-2: #38d9a9; }
        .lno[data-accent="blue"] { --accent: #339af0; --accent-2: #74c0fc; }
        .lno[data-theme="dark"] {
          --bg: #15171d; --bg-2: #111318; --bg-3: #1d2028; --ink: #eceef3; --ink-2: #c3c8d3;
          --muted: #8d94a3; --line: #272b35; --field: #1a1d25;
          background: #0e1015; padding: 18px; border-radius: 18px; color-scheme: dark;
        }
        .lno * { box-sizing: border-box; }
        .lno.lno-portal { background: transparent !important; padding: 0 !important; border-radius: 0 !important; width: 0; height: 0; overflow: visible; }
        :where(.lno) button, :where(.lno) input, :where(.lno) textarea, :where(.lno) select { font: inherit; color: inherit; }
        .lno button { cursor: pointer; }
        .lno button:disabled { cursor: not-allowed; opacity: .4; }
        .lno button:focus-visible, .lno input:focus-visible, .lno select:focus-visible, .lno textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

        .lno-topbar { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 22px; flex-wrap: wrap; }
        .lno-eyebrow { color: var(--accent); font-size: 12px; font-weight: 800; letter-spacing: .2px; margin-bottom: 6px; }
        .lno-topbar h2 { font-size: clamp(22px, 3vw, 30px); letter-spacing: -1px; margin: 0 0 5px; font-weight: 800; }
        .lno-topbar p { color: var(--muted); font-size: 13px; margin: 0; line-height: 1.5; }
        .lno-top-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .lno-btn { border: 1px solid transparent; border-radius: 9px; padding: 9px 14px; font-size: 12px; font-weight: 750; transition: .18s ease; white-space: nowrap; }
        .lno-btn.lno-square { padding: 9px 11px; font-size: 14px; line-height: 1; }
        .lno-btn.lno-block { width: 100%; margin-top: 8px; }
        .lno-btn-primary { color: #fff !important; background: var(--accent); box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 28%, transparent); }
        .lno-btn-primary:hover:not(:disabled) { background: var(--accent-2); transform: translateY(-1px); }
        .lno-btn-secondary { background: var(--bg); border-color: var(--line); color: var(--ink-2); }
        .lno-btn-secondary:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
        .lno-btn-danger { background: transparent; border-color: #e5484d66; color: #e5484d; }
        .lno-btn-danger:hover:not(:disabled) { background: #e5484d; color: #fff; }

        .lno-timer { display: flex; align-items: center; gap: 4px; padding: 4px 6px 4px 4px; border: 1px solid var(--line); border-radius: 9px; background: var(--bg); }
        .lno-timer strong { font-variant-numeric: tabular-nums; font-size: 13px; min-width: 46px; text-align: center; }
        .lno-timer button { border: 0; background: transparent; padding: 5px 7px; border-radius: 6px; font-size: 11px; color: var(--ink-2); }
        .lno-timer button:hover { background: var(--bg-3); }
        .lno-timer .lno-timer-mode { background: var(--accent-soft); color: var(--accent); font-weight: 800; }
        .lno-timer.break .lno-timer-mode { background: #12b8861f; color: #12b886; }

        .lno-stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 17px; }
        .lno-stat { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--bg); border: 1px solid var(--line); border-radius: 12px; min-width: 0; }
        .lno-stat-icon { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; flex-shrink: 0; color: var(--accent); background: var(--accent-soft); font-size: 17px; }
        .lno-stat strong { display: block; font-size: 20px; line-height: 1.15; letter-spacing: -.5px; }
        .lno-stat div span { display: block; color: var(--muted); font-size: 11px; margin-top: 4px; }

        .lno-workspace { display: grid; grid-template-columns: 215px minmax(220px, 285px) minmax(0, 1fr); min-height: 720px; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: var(--bg); }
        .lno.is-focus .lno-workspace { grid-template-columns: 1fr; }
        .lno.is-focus .lno-sidebar, .lno.is-focus .lno-list-panel, .lno.is-focus .lno-stats, .lno.is-focus .lno-topbar { display: none; }

        .lno-sidebar { padding: 17px 12px; background: var(--bg-2); border-right: 1px solid var(--line); display: flex; flex-direction: column; min-width: 0; }
        .lno-sidebar-heading { display: flex; justify-content: space-between; align-items: center; padding: 0 5px 13px; color: var(--muted); font-size: 11px; font-weight: 800; }
        .lno-icon-btn { border: 0; background: var(--accent-soft); color: var(--accent) !important; border-radius: 7px; width: 27px; height: 27px; font-size: 16px; line-height: 1; }
        .lno-icon-btn.on { background: var(--accent); color: #fff !important; }
        .lno-search { display: flex; align-items: center; gap: 7px; padding: 8px 9px; background: var(--field); border: 1px solid var(--line); border-radius: 8px; color: var(--muted); }
        .lno-search:focus-within { border-color: var(--accent-line); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent); }
        .lno-search input { width: 100%; min-width: 0; border: 0; outline: 0 !important; font-size: 12px; background: transparent; }
        .lno-search button { border: 0; background: transparent; color: var(--muted); font-size: 17px; padding: 0; }
        .lno-filter-label { color: var(--muted); font-size: 10px; font-weight: 800; margin: 22px 6px 8px; }
        .lno-nav, .lno-subjects { display: grid; gap: 2px; }
        .lno-nav button, .lno-subjects button { display: flex; align-items: center; gap: 9px; width: 100%; padding: 8px; border: 0; border-radius: 7px; color: var(--ink-2); background: transparent; text-align: left; font-size: 12px; min-width: 0; }
        .lno-nav button > span { width: 15px; text-align: center; font-size: 13px; }
        .lno-nav button small, .lno-subjects button small { margin-left: auto; color: var(--muted); font-size: 10px; }
        .lno-nav button:hover, .lno-subjects button:hover { background: var(--bg-3); }
        .lno-nav button.active { color: var(--accent); background: var(--accent-soft); font-weight: 800; }
        .lno-subjects button.selected { background: var(--bg-3); font-weight: 700; }
        .lno-subject-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
        .all-dot { background: var(--muted); }
        .lno-subject-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lno-muted-small { color: var(--muted); font-size: 11px; line-height: 1.55; margin: 0; padding: 0 2px; }
        .lno-tag-cloud { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 4px; }
        .lno-tag-cloud button { border: 1px solid var(--line); background: var(--bg); border-radius: 999px; padding: 3px 8px; font-size: 10px; color: var(--ink-2); }
        .lno-tag-cloud button small { color: var(--muted); margin-left: 2px; }
        .lno-tag-cloud button.active, .lno-tag-cloud button:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
        .lno-storage-note { margin-top: auto; padding-top: 14px; border-top: 1px solid var(--line); display: grid; gap: 6px; }
        .lno-storage-top { display: flex; justify-content: space-between; gap: 6px; align-items: baseline; }
        .lno-storage-note strong { font-size: 10px; }
        .lno-storage-note small { color: var(--muted); font-size: 9px; line-height: 1.4; }
        .lno-meter { height: 5px; border-radius: 9px; background: var(--bg-3); overflow: hidden; }
        .lno-meter.big { height: 8px; margin: 14px 0 6px; }
        .lno-meter span { display: block; height: 100%; background: var(--accent); border-radius: 9px; }
        .lno-meter span.warn { background: #e5484d; }

        .lno-list-panel { border-right: 1px solid var(--line); min-width: 0; display: flex; flex-direction: column; }
        .lno-list-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 16px 12px 13px; border-bottom: 1px solid var(--line); }
        .lno-list-header h3 { font-size: 14px; margin: 0 0 3px; }
        .lno-list-header > div:first-child > span { font-size: 11px; color: var(--muted); }
        .lno-list-tools { display: flex; gap: 5px; align-items: center; }
        .lno-list-tools select { max-width: 112px; border: 1px solid var(--line); background: var(--field); border-radius: 6px; padding: 5px 4px; color: var(--ink-2); font-size: 10px; }
        .lno-list-tools .lno-icon-btn { background: var(--bg-3); color: var(--ink-2) !important; }
        .lno-trash-bar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; background: #e5484d12; color: #c2383c; font-size: 10px; }
        .lno-trash-bar button { border: 0; background: #e5484d; color: #fff !important; border-radius: 5px; padding: 4px 8px; font-size: 10px; font-weight: 700; }
        .lno-note-list { padding: 10px; display: grid; align-content: start; gap: 8px; overflow-y: auto; max-height: 660px; }
        .lno-note-card { display: block; width: 100%; padding: 12px 12px 12px 13px; border: 1px solid var(--line); border-left: 3px solid var(--note, transparent); border-radius: 9px; background: var(--bg); text-align: left; transition: border-color .15s, background .15s; min-width: 0; }
        .lno-note-card:hover { border-color: var(--accent-line); border-left-color: var(--note, var(--accent-line)); }
        .lno-note-card.selected { border-color: var(--accent); border-left-color: var(--note, var(--accent)); background: var(--accent-soft); }
        .lno-note-card.compact { padding: 9px 11px; }
        .lno-note-card-top { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 7px; }
        .lno-note-subject { color: var(--accent); background: var(--accent-soft); border-radius: 4px; padding: 3px 6px; font-size: 10px; font-weight: 700; max-width: 72%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lno-note-card.selected .lno-note-subject { background: var(--bg); }
        .lno-note-card-icons { color: #e69a20; font-size: 11px; display: flex; gap: 4px; }
        .lno-note-card-icons .due { color: var(--accent); }
        .lno-note-card > strong { display: block; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lno-note-card > p { color: var(--muted); font-size: 11px; line-height: 1.5; margin: 6px 0 9px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
        .lno-note-card-bottom { display: flex; justify-content: space-between; gap: 5px; color: var(--muted); font-size: 10px; margin-top: 6px; }
        .lno-card-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
        .lno-card-tags span { color: var(--ink-2); background: var(--bg-3); padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .lno-empty-list { text-align: center; padding: 45px 12px; color: var(--muted); }
        .lno-empty-list > span { display: block; font-size: 25px; opacity: .5; margin-bottom: 10px; }
        .lno-empty-list strong { display: block; color: var(--ink-2); font-size: 13px; }
        .lno-empty-list p { font-size: 11px; line-height: 1.6; margin: 7px 0 14px; }

        .lno-editor { min-width: 0; display: flex; flex-direction: column; }
        .lno-deleted-banner { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 10px 17px; background: #e5484d14; color: #c2383c; font-size: 12px; font-weight: 600; }
        .lno-deleted-banner > div { display: flex; gap: 6px; }
        .lno-editor-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; min-height: 54px; padding: 8px 17px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
        .lno-save-status { color: var(--muted); font-size: 11px; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
        .lno-save-status span { width: 6px; height: 6px; border-radius: 50%; background: #25b77a; }
        .lno-editor-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 3px; }
        .lno-divider { width: 1px; height: 18px; background: var(--line); margin: 0 4px; }
        .lno-tool-action { border: 0; background: transparent; color: var(--ink-2); padding: 6px 8px; border-radius: 6px; font-size: 12px; }
        .lno-tool-action span { font-size: 11px; }
        .lno-tool-action:hover:not(:disabled) { background: var(--bg-3); }
        .lno-tool-action.is-active { color: var(--accent); background: var(--accent-soft); }
        .lno-tool-action.good:hover:not(:disabled) { color: #12b886; background: #12b8861a; }
        .lno-tool-action.danger:hover:not(:disabled) { color: #e5484d; background: #e5484d1a; }

        .lno-editor-body { display: flex; flex: 1; min-height: 0; }
        .lno-editor-content { padding: 22px 25px 17px; display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .lno-title-input { width: 100%; border: 0; outline: 0 !important; padding: 0; font-size: clamp(21px, 2.4vw, 28px); font-weight: 800; letter-spacing: -.8px; background: transparent; }
        .lno-title-input::placeholder { color: var(--muted); opacity: .6; }
        .lno-meta-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 20px 0 16px; align-items: end; }
        .lno-meta-grid label, .lno-color-field { display: block; min-width: 0; }
        .lno-meta-grid label > span, .lno-color-field > span, .lno-field-label { display: block; color: var(--muted); font-size: 11px; font-weight: 700; margin-bottom: 6px; }
        .lno-meta-grid input { width: 100%; min-width: 0; padding: 8px 9px; border: 1px solid var(--line); border-radius: 7px; font-size: 12px; outline: none; background: var(--field); }
        .lno-meta-grid input:focus { border-color: var(--accent-line); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent); }
        .lno-color-field > div { display: flex; gap: 6px; align-items: center; min-height: 33px; }
        .lno-swatch { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--bg); box-shadow: 0 0 0 1px var(--line); padding: 0; }
        .lno-swatch.none { background: linear-gradient(135deg, var(--bg) 45%, #e5484d 46% 54%, var(--bg) 55%); }
        .lno-swatch.on { box-shadow: 0 0 0 2px var(--ink); }
        .lno-tags-section { margin-bottom: 16px; }
        .lno-tags-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 26px; }
        .lno-tag { display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 5px; color: var(--accent); background: var(--accent-soft); font-size: 11px; }
        .lno-tag button { border: 0; background: transparent; color: var(--accent); padding: 0; font-size: 14px; line-height: 10px; }
        .lno-tag-form input { width: 105px; border: 0; background: transparent; outline: none; padding: 5px 3px; font-size: 11px; }

        .lno-format-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 6px; border: 1px solid var(--line); border-bottom: 0; border-radius: 9px 9px 0 0; background: var(--bg-2); }
        .lno-format-buttons { display: flex; flex-wrap: wrap; gap: 2px; }
        .lno-format-buttons button { border: 0; background: transparent; min-width: 28px; height: 28px; padding: 0 6px; border-radius: 6px; font-size: 12px; color: var(--ink-2); }
        .lno-format-buttons button.strong { font-weight: 900; }
        .lno-format-buttons button:hover:not(:disabled) { background: var(--bg-3); color: var(--accent); }
        .lno-format-buttons button.listening { background: #e5484d; color: #fff; }
        .lno-segmented { display: inline-flex; padding: 2px; background: var(--bg-3); border-radius: 8px; gap: 2px; }
        .lno-segmented button { border: 0; background: transparent; padding: 5px 11px; border-radius: 6px; font-size: 11px; font-weight: 700; color: var(--muted); }
        .lno-segmented button.on { background: var(--bg); color: var(--accent); box-shadow: 0 1px 3px #0001; }

        .lno-pane { display: grid; flex: 1; min-height: 340px; border: 1px solid var(--line); border-radius: 0 0 9px 9px; overflow: hidden; }
        .lno-pane-split { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
        .lno-pane-split .lno-content-input { border-right: 1px solid var(--line); }
        .lno-content-input { width: 100%; height: 100%; min-height: 340px; resize: none; border: 0; outline: none; padding: 16px; background: var(--field); font-size: 13px; line-height: 1.8; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
        .lno-content-input::placeholder { color: var(--muted); opacity: .7; }
        .lno-preview { overflow: auto; padding: 16px 20px; background: var(--bg); max-height: 560px; }

        .lno-md { font-size: 13.5px; line-height: 1.75; overflow-wrap: anywhere; }
        .lno-md h1, .lno-md h2, .lno-md h3, .lno-md h4 { margin: 1.1em 0 .4em; line-height: 1.25; letter-spacing: -.3px; }
        .lno-md h1 { font-size: 22px; } .lno-md h2 { font-size: 18px; } .lno-md h3 { font-size: 15px; } .lno-md h4 { font-size: 13px; }
        .lno-md > :first-child { margin-top: 0; }
        .lno-md p { margin: .55em 0; }
        .lno-md ul, .lno-md ol { margin: .5em 0; padding-left: 22px; }
        .lno-md li.task { list-style: none; }
        .lno-md li.task input { accent-color: var(--accent); margin-right: 6px; cursor: pointer; }
        .lno-md li.task .done { text-decoration: line-through; color: var(--muted); }
        .lno-md blockquote { margin: .5em 0; padding: 2px 12px; border-left: 3px solid var(--accent); color: var(--ink-2); background: var(--accent-soft); border-radius: 0 6px 6px 0; }
        .lno-md code { background: var(--bg-3); padding: 1px 5px; border-radius: 4px; font-size: 12px; }
        .lno-md pre { background: var(--bg-3); padding: 12px; border-radius: 8px; overflow: auto; }
        .lno-md pre code { background: transparent; padding: 0; }
        .lno-md mark { background: color-mix(in srgb, #ffd43b 55%, transparent); color: inherit; padding: 0 2px; border-radius: 3px; }
        .lno-md a { color: var(--accent); }
        .lno-md hr { border: 0; border-top: 1px solid var(--line); margin: 1.2em 0; }
        .lno-table-wrap { overflow-x: auto; margin: .6em 0; }
        .lno-md table { border-collapse: collapse; width: 100%; font-size: 12.5px; }
        .lno-md th, .lno-md td { border: 1px solid var(--line); padding: 6px 10px; text-align: left; }
        .lno-md th { background: var(--bg-3); }

        .lno-editor-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 13px; flex-wrap: wrap; }
        .lno-editor-footer > div:first-child { display: flex; flex-wrap: wrap; gap: 12px; color: var(--muted); font-size: 11px; }
        .lno-export-actions { display: flex; align-items: center; gap: 6px; }
        .lno-export-actions > button, .lno-menu-wrap > button { border: 1px solid var(--line); background: var(--bg); color: var(--ink-2); border-radius: 6px; padding: 7px 10px; font-size: 11px; font-weight: 700; }
        .lno-export-actions > button:hover, .lno-menu-wrap > button:hover { border-color: var(--accent); color: var(--accent); }
        .lno-export-actions .lno-export-primary { border-color: var(--accent); background: var(--accent); color: #fff !important; }
        .lno-menu-wrap { position: relative; }
        .lno-menu { position: absolute; right: 0; bottom: calc(100% + 6px); min-width: 170px; background: var(--bg); border: 1px solid var(--line); border-radius: 9px; box-shadow: 0 12px 34px #0003; padding: 4px; z-index: 20; }
        .lno-menu button { display: block; width: 100%; text-align: left; border: 0; background: transparent; padding: 8px 10px; border-radius: 6px; font-size: 12px; }
        .lno-menu button:hover { background: var(--bg-3); color: var(--accent); }

        .lno-inspector { width: 215px; flex-shrink: 0; border-left: 1px solid var(--line); background: var(--bg-2); padding: 18px 14px; overflow-y: auto; max-height: 800px; }
        .lno-inspector section { margin-bottom: 22px; }
        .lno-inspector h4 { margin: 0 0 9px; font-size: 11px; color: var(--muted); font-weight: 800; }
        .lno-outline { display: grid; gap: 1px; }
        .lno-outline button { border: 0; background: transparent; text-align: left; padding: 5px 8px; font-size: 11px; border-radius: 5px; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lno-outline button:hover { background: var(--bg-3); color: var(--accent); }
        .lno-inspector dl { margin: 0; display: grid; gap: 7px; }
        .lno-inspector dl > div { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; }
        .lno-inspector dt { color: var(--muted); } .lno-inspector dd { margin: 0; font-weight: 700; }
        .lno-progress { height: 6px; background: var(--bg-3); border-radius: 9px; overflow: hidden; margin-bottom: 8px; }
        .lno-progress span { display: block; height: 100%; background: var(--accent); transition: width .25s ease; }

        .lno-editor-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; min-height: 450px; padding: 30px; text-align: center; }
        .lno-empty-icon { display: grid; place-items: center; width: 55px; height: 55px; border-radius: 16px; background: var(--accent-soft); color: var(--accent); font-size: 25px; margin: 0 auto; }
        .lno-editor-empty h3 { margin: 17px 0 6px; font-size: 17px; }
        .lno-editor-empty p { max-width: 300px; color: var(--muted); font-size: 12px; line-height: 1.6; margin: 0 0 17px; }

        .lno-overlay { position: fixed; inset: 0; z-index: 9999; background: #0a0c1099; backdrop-filter: blur(3px); display: grid; place-items: center; padding: 16px; }
        .lno-modal { width: 100%; max-width: 520px; max-height: 88vh; display: flex; flex-direction: column; background: var(--bg); color: var(--ink); border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 24px 70px #0005; animation: lno-pop .16s ease-out; }
        .lno-modal.wide { max-width: 780px; }
        .lno-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--line); }
        .lno-modal-head h3 { margin: 0; font-size: 15px; }
        .lno-modal-body { padding: 18px 20px 20px; overflow-y: auto; }
        .lno-modal-actions { display: flex; gap: 8px; justify-content: center; margin-top: 16px; flex-wrap: wrap; }
        .lno-modal-actions.left { justify-content: flex-start; }
        @keyframes lno-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }

        .lno-templates { display: grid; gap: 8px; }
        .lno-templates button { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 11px; background: var(--bg); text-align: left; }
        .lno-templates button:hover { border-color: var(--accent); background: var(--accent-soft); }
        .lno-templates button > span { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 10px; background: var(--accent-soft); color: var(--accent); font-size: 18px; flex-shrink: 0; }
        .lno-templates strong, .lno-templates small { display: block; }
        .lno-templates strong { font-size: 13px; } .lno-templates small { color: var(--muted); font-size: 11px; margin-top: 3px; }

        .lno-flashcard { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; width: 100%; min-height: 220px; margin-top: 14px; padding: 28px; border: 1px solid var(--line); border-radius: 16px; background: var(--bg-2); text-align: center; transition: background .2s, border-color .2s; }
        .lno-flashcard.flipped { background: var(--accent-soft); border-color: var(--accent-line); }
        .lno-flashcard small { color: var(--accent); font-weight: 800; font-size: 11px; }
        .lno-flashcard strong { font-size: 19px; line-height: 1.45; font-weight: 700; overflow-wrap: anywhere; }
        .lno-flashcard em { color: var(--muted); font-size: 11px; font-style: normal; min-height: 14px; }
        .lno-study-meta { display: flex; justify-content: space-between; color: var(--muted); font-size: 11px; }
        .lno-study-done { text-align: center; padding: 14px 0; }
        .lno-study-done h4 { margin: 16px 0 4px; font-size: 17px; } .lno-study-done p { color: var(--muted); font-size: 13px; margin: 0; }

        .lno-history { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 16px; min-height: 320px; }
        .lno-history-list { display: grid; align-content: start; gap: 6px; }
        .lno-history-list > button:not(.lno-btn) { border: 1px solid var(--line); background: var(--bg); border-radius: 8px; padding: 9px 11px; text-align: left; }
        .lno-history-list > button.active { border-color: var(--accent); background: var(--accent-soft); }
        .lno-history-list strong, .lno-history-list small { display: block; }
        .lno-history-list strong { font-size: 12px; } .lno-history-list small { color: var(--muted); font-size: 10px; margin-top: 3px; }
        .lno-history-preview { min-width: 0; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }
        .lno-history-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--line); background: var(--bg-2); }
        .lno-history-head small { display: block; color: var(--muted); font-size: 10px; margin-top: 2px; }
        .lno-history-preview pre { margin: 0; padding: 14px; overflow: auto; max-height: 380px; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12px; line-height: 1.7; font-family: ui-monospace, Menlo, Consolas, monospace; }

        .lno-settings { display: grid; gap: 24px; }
        .lno-settings h4 { margin: 0 0 10px; font-size: 13px; }
        .lno-setting-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 12px; }
        .lno-accents { display: flex; gap: 8px; }
        .lno-accents button { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--bg); box-shadow: 0 0 0 1px var(--line); }
        .lno-accents button.on { box-shadow: 0 0 0 2px var(--ink); }
        .lno-shortcuts { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 18px; }
        .lno-shortcuts > div { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; }
        .lno-shortcuts dd { margin: 0; color: var(--muted); text-align: right; }
        .lno-shortcuts dt { margin: 0; }
        .lno kbd { background: var(--bg-3); border: 1px solid var(--line); border-radius: 5px; padding: 2px 6px; font-size: 11px; font-family: inherit; white-space: nowrap; }

        .lno-toast { position: fixed; z-index: 10000; bottom: 22px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 14px; padding: 11px 17px; border-radius: 10px; color: #fff; background: #252a33; box-shadow: 0 8px 28px #0004; font-size: 12px; max-width: calc(100vw - 32px); }
        .lno-toast button { border: 0; background: transparent; color: var(--accent-2) !important; font-weight: 800; padding: 0; }

        @media (prefers-reduced-motion: reduce) { .lno *, .lno-modal { animation: none !important; transition: none !important; } }

        @media (max-width: 1280px) {
          .lno-editor-body { flex-direction: column; }
          .lno-inspector { width: auto; border-left: 0; border-top: 1px solid var(--line); max-height: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 18px; }
          .lno-inspector section { margin-bottom: 0; }
        }
        @media (max-width: 1050px) {
          .lno-workspace { grid-template-columns: 185px minmax(200px, 245px) minmax(0, 1fr); }
          .lno-editor-content { padding: 19px 17px 15px; }
          .lno-tool-action span { display: none; }
          .lno-meta-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .lno-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 760px) {
          .lno-topbar { align-items: flex-start; flex-direction: column; }
          .lno-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .lno-workspace { grid-template-columns: 1fr; }
          .lno-sidebar { border-right: 0; border-bottom: 1px solid var(--line); }
          .lno-nav { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .lno-subjects { display: flex; flex-wrap: wrap; }
          .lno-subjects button { width: auto; max-width: 48%; }
          .lno-list-panel { border-right: 0; border-bottom: 1px solid var(--line); }
          .lno-note-list { max-height: 320px; }
          .lno-editor-toolbar { padding: 8px 12px; }
          .lno-editor-content { padding: 18px 14px; }
          .lno-pane-split { grid-template-columns: 1fr; }
          .lno-pane-split .lno-content-input { border-right: 0; border-bottom: 1px solid var(--line); min-height: 240px; }
          .lno-history { grid-template-columns: 1fr; }
          .lno-shortcuts { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .lno-top-actions { width: 100%; }
          .lno-tool-action span { display: inline; }
          .lno-editor-actions { width: 100%; justify-content: flex-start; }
          .lno-meta-grid { grid-template-columns: 1fr; }
          .lno-editor-footer { align-items: flex-start; flex-direction: column; }
          .lno-export-actions { width: 100%; flex-wrap: wrap; }
        }
      `}</style>
    </ToolShell>
  );
}