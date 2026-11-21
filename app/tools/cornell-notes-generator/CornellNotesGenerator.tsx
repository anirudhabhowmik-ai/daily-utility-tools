"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ----------------------------- Types ----------------------------- */

type CornellRow = {
  id: string;
  cue: string;
  notes: string;
};

type CornellDocument = {
  id: string;
  title: string;
  course: string;
  date: string;
  rows: CornellRow[];
  summary: string;
  createdAt: number;
  updatedAt: number;
};

type ViewMode = "editor" | "study";

type DialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone: "danger" | "primary";
  onConfirm: () => void;
};

type PdfOptions = {
  margin?: number | number[];
  filename?: string;
  image?: { type?: "jpeg" | "png" | "webp"; quality?: number };
  html2canvas?: Record<string, unknown>;
  jsPDF?: Record<string, unknown>;
  pagebreak?: {
    mode?: string | string[];
    before?: string | string[];
    after?: string | string[];
    avoid?: string | string[];
  };
};

// We define a local interface for the html2pdf fluent API because the
// published types for html2pdf.js are inaccurate (they think it's async).
type Html2PdfWorker = {
  set: (options: PdfOptions) => Html2PdfWorker;
  from: (element: HTMLElement) => Html2PdfWorker;
  save: () => Promise<void>;
};

type Html2PdfFactory = () => Html2PdfWorker;

/* --------------------------- Constants --------------------------- */

const STORAGE_KEY = "toolsab-cornell-notes-v2";
const PREFS_KEY = "toolsab-cornell-prefs";

const SAMPLE_DOCUMENT = {
  title: "Introduction to Photosynthesis",
  course: "Biology",
  rows: [
    {
      cue: "What is photosynthesis?",
      notes:
        "The process by which green plants and some other organisms use sunlight to synthesize nutrients from carbon dioxide and water.",
    },
    {
      cue: "Where does it occur?",
      notes:
        "In the chloroplasts of plant cells, primarily in the leaves. Chlorophyll is the pigment that captures light energy.",
    },
    {
      cue: "What are the inputs and outputs?",
      notes:
        "Inputs: sunlight, water (H2O), carbon dioxide (CO2). Outputs: glucose (C6H12O6) and oxygen (O2).",
    },
  ],
  summary:
    "Photosynthesis is how plants convert light energy into chemical energy stored in glucose. It requires sunlight, water, and CO2, and produces oxygen as a byproduct.",
};

/* ---------------------------- Helpers ---------------------------- */

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createRow(cue = "", notes = ""): CornellRow {
  return { id: createId(), cue, notes };
}

function createDocument(): CornellDocument {
  const now = Date.now();
  return {
    id: createId(),
    title: "Untitled Cornell Notes",
    course: "",
    date: today(),
    rows: [createRow()],
    summary: "",
    createdAt: now,
    updatedAt: now,
  };
}

function createSampleDocument(): CornellDocument {
  const now = Date.now();
  return {
    id: createId(),
    title: SAMPLE_DOCUMENT.title,
    course: SAMPLE_DOCUMENT.course,
    date: today(),
    rows: SAMPLE_DOCUMENT.rows.map((row) =>
      createRow(row.cue, row.notes)
    ),
    summary: SAMPLE_DOCUMENT.summary,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeDocument(value: unknown): CornellDocument | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Record<string, unknown>;

  const title =
    typeof item.title === "string" && item.title.trim()
      ? item.title.trim().slice(0, 150)
      : "Untitled Cornell Notes";

  const rows = Array.isArray(item.rows)
    ? item.rows
        .filter(
          (row): row is Record<string, unknown> =>
            !!row && typeof row === "object"
        )
        .map((row) => ({
          id:
            typeof row.id === "string" && row.id
              ? row.id
              : createId(),
          cue: typeof row.cue === "string" ? row.cue.slice(0, 3000) : "",
          notes:
            typeof row.notes === "string"
              ? row.notes.slice(0, 10000)
              : "",
        }))
        .slice(0, 500)
    : [createRow()];

  const createdAt =
    typeof item.createdAt === "number" &&
    Number.isFinite(item.createdAt)
      ? item.createdAt
      : Date.now();

  return {
    id:
      typeof item.id === "string" && item.id
        ? item.id
        : createId(),
    title,
    course:
      typeof item.course === "string" ? item.course.slice(0, 150) : "",
    date:
      typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
        ? item.date
        : today(),
    rows: rows.length > 0 ? rows : [createRow()],
    summary:
      typeof item.summary === "string"
        ? item.summary.slice(0, 10000)
        : "",
    createdAt,
    updatedAt:
      typeof item.updatedAt === "number" &&
      Number.isFinite(item.updatedAt)
        ? item.updatedAt
        : createdAt,
  };
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function relativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "cornell-notes"
  );
}

/* --------------------------- Component --------------------------- */

export default function CornellNotesGenerator() {
  const [documents, setDocuments] = useState<CornellDocument[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("editor");
  const [notice, setNotice] = useState("");
  const [showDocumentList, setShowDocumentList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dark, setDark] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [revealNotes, setRevealNotes] = useState<Record<string, boolean>>({});
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const printAreaRef = useRef<HTMLElement>(null);

  /* ----------------------- Persistence ----------------------- */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed
            .map(normalizeDocument)
            .filter((item): item is CornellDocument => item !== null);
          setDocuments(valid);
          if (valid.length > 0) setActiveId(valid[0].id);
        }
      }

      const prefs = localStorage.getItem(PREFS_KEY);
      if (prefs) {
        const parsed = JSON.parse(prefs);
        if (typeof parsed.dark === "boolean") setDark(parsed.dark);
      } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        setDark(true);
      }
    } catch {
      setNotice(
        "Previously saved notes could not be loaded. You can still create new notes."
      );
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch {
      setNotice("Browser storage is full. Export your notes to keep a backup.");
    }
  }, [documents, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PREFS_KEY, JSON.stringify({ dark }));
  }, [dark, hydrated]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (dialog.tone === "danger" ? cancelRef : confirmRef).current?.focus({
      preventScroll: true,
    });

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDialog(null);
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [dialog]);

  /* ----------------------- Derived data ----------------------- */

  const activeDocument = useMemo(
    () => documents.find((item) => item.id === activeId) || null,
    [documents, activeId]
  );

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...documents].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!query) return sorted;
    return sorted.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.course.toLowerCase().includes(query) ||
        doc.summary.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  const totalCues = useMemo(
    () =>
      documents.reduce(
        (sum, doc) =>
          sum + doc.rows.filter((r) => r.cue.trim() || r.notes.trim()).length,
        0
      ),
    [documents]
  );

  const totalWords = useMemo(
    () =>
      documents.reduce((sum, doc) => {
        const rowWords = doc.rows.reduce(
          (s, r) => s + countWords(r.cue) + countWords(r.notes),
          0
        );
        return sum + rowWords + countWords(doc.summary);
      }, 0),
    [documents]
  );

  /* -------------------------- Actions -------------------------- */

  const updateDocument = useCallback(
    (id: string, updater: (document: CornellDocument) => CornellDocument) => {
      setDocuments((current) =>
        current.map((document) =>
          document.id === id
            ? { ...updater(document), updatedAt: Date.now() }
            : document
        )
      );
    },
    []
  );

  const createNewDocument = useCallback(() => {
    const document = createDocument();
    setDocuments((current) => [document, ...current]);
    setActiveId(document.id);
    setViewMode("editor");
    setShowDocumentList(false);
    setNotice("New Cornell notes created.");
    setTimeout(() => titleInputRef.current?.focus(), 50);
  }, []);

  const loadSample = useCallback(() => {
    const sample = createSampleDocument();
    setDocuments((current) => [sample, ...current]);
    setActiveId(sample.id);
    setViewMode("editor");
    setNotice("Sample document loaded — explore and edit it freely.");
  }, []);

  const deleteDocument = useCallback(
    (id: string) => {
      const document = documents.find((item) => item.id === id);
      if (!document) return;

      setDialog({
        title: "Delete this document?",
        message: `"${document.title}" will be permanently removed. This cannot be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
        onConfirm: () => {
          const remaining = documents.filter((item) => item.id !== id);
          setDocuments(remaining);
          if (activeId === id) {
            setActiveId(remaining[0]?.id || null);
          }
          setViewMode("editor");
          setNotice("Note document deleted.");
        },
      });
    },
    [documents, activeId]
  );

  const duplicateDocument = useCallback(
    (id: string) => {
      const doc = documents.find((item) => item.id === id);
      if (!doc) return;
      const copy: CornellDocument = {
        ...doc,
        id: createId(),
        title: `${doc.title} (Copy)`,
        rows: doc.rows.map((r) => ({ ...r, id: createId() })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setDocuments((current) => [copy, ...current]);
      setActiveId(copy.id);
      setViewMode("editor");
      setNotice("Document duplicated.");
    },
    [documents]
  );

  const updateField = useCallback(
    (field: "title" | "course" | "date" | "summary", value: string) => {
      if (!activeDocument) return;
      updateDocument(activeDocument.id, (document) => ({
        ...document,
        [field]: value,
      }));
    },
    [activeDocument, updateDocument]
  );

  const updateRow = useCallback(
    (rowId: string, field: "cue" | "notes", value: string) => {
      if (!activeDocument) return;
      updateDocument(activeDocument.id, (document) => ({
        ...document,
        rows: document.rows.map((row) =>
          row.id === rowId ? { ...row, [field]: value } : row
        ),
      }));
    },
    [activeDocument, updateDocument]
  );

  const addRow = useCallback(() => {
    if (!activeDocument) return;
    updateDocument(activeDocument.id, (document) => ({
      ...document,
      rows: [...document.rows, createRow()],
    }));
  }, [activeDocument, updateDocument]);

  const removeRow = useCallback(
    (rowId: string) => {
      if (!activeDocument) return;
      updateDocument(activeDocument.id, (document) => {
        const remaining = document.rows.filter((row) => row.id !== rowId);
        return {
          ...document,
          rows: remaining.length > 0 ? remaining : [createRow()],
        };
      });
    },
    [activeDocument, updateDocument]
  );

  const moveRow = useCallback(
    (rowId: string, direction: -1 | 1) => {
      if (!activeDocument) return;
      updateDocument(activeDocument.id, (document) => {
        const index = document.rows.findIndex((row) => row.id === rowId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= document.rows.length) {
          return document;
        }
        const rows = [...document.rows];
        [rows[index], rows[target]] = [rows[target], rows[index]];
        return { ...document, rows };
      });
    },
    [activeDocument, updateDocument]
  );

  const exportDocument = useCallback((document: CornellDocument) => {
    const payload = {
      app: "ToolsAB Cornell Notes Generator",
      version: 2,
      exportedAt: new Date().toISOString(),
      document,
    };
    downloadFile(
      `${safeFilename(document.title)}.json`,
      JSON.stringify(payload, null, 2)
    );
    setNotice("Cornell notes downloaded as a JSON file.");
  }, []);

  const exportAllDocuments = useCallback(() => {
    if (documents.length === 0) {
      setNotice("There are no notes to export.");
      return;
    }
    const payload = {
      app: "ToolsAB Cornell Notes Generator",
      version: 2,
      exportedAt: new Date().toISOString(),
      documents,
    };
    downloadFile(
      "toolsab-cornell-notes-backup.json",
      JSON.stringify(payload, null, 2)
    );
    setNotice("All Cornell notes downloaded successfully.");
  }, [documents]);

  const importDocuments = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed: unknown = JSON.parse(text);

        let source: unknown[];

        if (Array.isArray(parsed)) {
          source = parsed;
        } else if (
          parsed &&
          typeof parsed === "object" &&
          Array.isArray((parsed as { documents?: unknown }).documents)
        ) {
          source = (parsed as { documents: unknown[] }).documents;
        } else if (parsed && typeof parsed === "object" && "document" in parsed) {
          source = [(parsed as { document: unknown }).document];
        } else {
          throw new Error("This file does not contain valid Cornell notes.");
        }

        const imported = source
          .map(normalizeDocument)
          .filter((item): item is CornellDocument => item !== null);

        if (imported.length === 0) {
          throw new Error("No valid note documents were found.");
        }

        setDocuments((current) => {
          const existingIds = new Set(current.map((item) => item.id));
          const unique = imported.map((item) => {
            if (existingIds.has(item.id)) {
              return { ...item, id: createId() };
            }
            existingIds.add(item.id);
            return item;
          });
          setActiveId(unique[0].id);
          setViewMode("editor");
          setNotice(
            `${unique.length} note document${
              unique.length === 1 ? "" : "s"
            } imported successfully.`
          );
          return [...unique, ...current];
        });
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "Unable to import this file."
        );
      } finally {
        event.target.value = "";
      }
    },
    []
  );

  /* ----------------------- Save as PDF ----------------------- */

  const saveAsPdf = useCallback(async () => {
    if (!activeDocument || !printAreaRef.current) return;
    if (isExportingPdf) return;

    setIsExportingPdf(true);

    const element = printAreaRef.current;
    const filename = `${safeFilename(activeDocument.title)}.pdf`;

    // Temporarily force light, print-friendly colors so the PDF is readable.
    const restore = forceLightForPdf(element);

    try {
      // Cast the imported module to our local factory type because the
      // published html2pdf.js types are incorrect.
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default as unknown as Html2PdfFactory;

      const options: PdfOptions = {
        margin: [10, 10, 10, 10],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          windowWidth: element.scrollWidth,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: { mode: ["css", "legacy"] },
      };

      await html2pdf().set(options).from(element).save();
      setNotice("PDF saved successfully.");
    } catch {
      setNotice("Unable to save PDF. Please try again.");
    } finally {
      restore();
      setIsExportingPdf(false);
    }
  }, [activeDocument, isExportingPdf]);

  const toggleReveal = (rowId: string) =>
    setRevealNotes((current) => ({ ...current, [rowId]: !current[rowId] }));

  /* ------------------------ Render ------------------------ */

  if (!hydrated) {
    return (
      <div className="cn-loading">
        Loading your Cornell notes...
        <style jsx>{`
          .cn-loading {
            padding: 48px 20px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`cn ${dark ? "dark" : ""}`}>
      <style jsx global>{`
        .cn,
        .cn-modal-root {
          --primary: #ff5a1f;
          --primary-hover: #e64a12;
          --primary-soft: #fff1ea;
          --primary-line: #ffd3c1;
          --primary-glow: rgba(255, 90, 31, 0.35);
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
          --shadow:
            0 1px 2px rgba(23, 32, 51, 0.04),
            0 8px 24px rgba(23, 32, 51, 0.06);
          color: var(--text);
          width: 100%;
          font-family: inherit;
        }
        .cn.dark,
        .cn-modal-root.dark {
          --primary: #ff7a3d;
          --primary-hover: #ff5a1f;
          --primary-soft: rgba(255, 90, 31, 0.14);
          --primary-line: rgba(255, 90, 31, 0.45);
          --primary-glow: rgba(255, 90, 31, 0.45);
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
          --shadow:
            0 1px 2px rgba(0, 0, 0, 0.3),
            0 8px 24px rgba(0, 0, 0, 0.25);
        }
        .cn.dark {
          background: #0a101e;
          border-radius: 20px;
          padding: 20px;
        }
        .cn *,
        .cn-modal-root * {
          box-sizing: border-box;
        }
        .cn button,
        .cn-modal-root button {
          font-family: inherit;
        }
        .cn button:focus-visible,
        .cn-modal-root button:focus-visible,
        .cn input:focus-visible,
        .cn select:focus-visible,
        .cn textarea:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        /* Hero */
        .hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 22px;
          flex-wrap: wrap;
        }
        .hero h2 {
          margin: 0 0 8px;
          font-size: clamp(24px, 4vw, 34px);
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -0.7px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .hero p {
          margin: 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.65;
          max-width: 640px;
        }
        .pro {
          background: linear-gradient(135deg, #ff5a1f, #ffb020);
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.6px;
          padding: 4px 9px;
          border-radius: 999px;
          box-shadow: 0 4px 12px var(--primary-glow);
        }
        .hero-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        /* Surfaces */
        .card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: var(--shadow);
        }
        .row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .between {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 11px;
          padding: 10px 16px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
          border: 1px solid transparent;
          transition:
            transform 0.12s,
            background 0.15s,
            border-color 0.15s,
            box-shadow 0.15s;
        }
        .btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .btn-primary {
          background: linear-gradient(135deg, #ff5a1f, #ff7a3d);
          color: #fff;
          box-shadow: 0 6px 16px var(--primary-glow);
        }
        .btn-primary:hover:not(:disabled) {
          box-shadow: 0 8px 20px var(--primary-glow);
        }
        .btn-secondary {
          background: var(--card);
          color: var(--text);
          border-color: var(--border);
        }
        .btn-secondary:hover:not(:disabled) {
          border-color: var(--primary);
          color: #fff;
        }
        .btn-dark {
          background: #172033;
          color: #fff;
        }
        .cn.dark .btn-dark {
          background: var(--card);
          border-color: var(--border);
          color: var(--text);
        }
        .btn-dark:hover:not(:disabled) {
          background: #0f172a;
        }
        .cn.dark .btn-dark:hover:not(:disabled) {
          border-color: var(--primary);
          color: var(--primary);
        }
        .btn-warn {
          background: var(--primary-soft);
          color: var(--primary);
          border-color: var(--primary-line);
        }
        .btn-warn:hover:not(:disabled) {
          background: var(--primary-line);
        }
        .btn-danger {
          background: var(--card);
          color: var(--bad);
          border-color: var(--border);
        }
        .btn-danger:hover:not(:disabled) {
          border-color: var(--bad);
          background: var(--bad-soft);
        }
        .btn-danger-solid {
          background: #dc2626;
          color: #fff;
          box-shadow: 0 6px 16px rgba(220, 38, 38, 0.3);
        }
        .btn-sm {
          padding: 7px 11px;
          font-size: 12px;
        }
        .btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* Fields */
        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .label {
          font-size: 12px;
          font-weight: 700;
        }
        .input,
        .textarea,
        .select {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 12px;
          font: inherit;
          font-size: 13px;
          color: var(--text);
          background: var(--input);
          transition:
            border-color 0.15s,
            box-shadow 0.15s;
        }
        .textarea {
          resize: vertical;
          min-height: 76px;
          line-height: 1.55;
        }
        .input:focus,
        .textarea:focus,
        .select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.14);
          outline: none;
        }
        .input::placeholder,
        .textarea::placeholder {
          color: #94a3b8;
        }

        /* Toast */
        .toast {
          position: sticky;
          top: 12px;
          z-index: 30;
          background: var(--card);
          border: 1px solid var(--primary-line);
          border-left: 4px solid var(--primary);
          color: var(--text);
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 16px;
          box-shadow: var(--shadow);
          animation: toast-in 0.25s ease-out;
        }
        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Stats */
        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }
        .stat {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          box-shadow: var(--shadow);
        }
        .stat span {
          display: block;
          font-size: 12px;
          color: var(--muted);
          font-weight: 600;
        }
        .stat strong {
          display: block;
          margin-top: 4px;
          font-size: 22px;
          font-weight: 800;
        }
        .stat.accent {
          background: var(--primary-soft);
          border-color: var(--primary-line);
        }
        .stat.accent span,
        .stat.accent strong {
          color: var(--primary);
        }
        .stat.good {
          background: var(--good-soft);
          border-color: var(--good);
        }
        .stat.good span,
        .stat.good strong {
          color: var(--good);
        }

        /* Document toolbar */
        .toolbar {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .toolbar-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        /* Document list */
        .doc-item {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border-radius: 12px;
          border: 1px solid var(--border);
          padding: 12px;
          background: var(--card);
          transition: border-color 0.15s, background 0.15s;
        }
        .doc-item.active {
          border-color: var(--primary);
          background: var(--primary-soft);
        }
        .doc-title-btn {
          flex: 1;
          min-width: 0;
          text-align: left;
          background: none;
          border: 0;
          padding: 0;
          cursor: pointer;
          color: inherit;
        }
        .doc-title-btn .t {
          display: block;
          font-size: 13px;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .doc-title-btn .m {
          display: block;
          margin-top: 4px;
          font-size: 11px;
          color: var(--muted);
        }

        /* Mode banner */
        .mode-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px;
          line-height: 1.55;
          border: 1px solid var(--primary-line);
          background: var(--primary-soft);
          color: var(--primary);
        }
        .mode-banner.study {
          border-color: var(--warn);
          background: var(--warn-soft);
          color: var(--warn);
        }
        .mode-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        /* Cornell grid */
        .cornell {
          border-radius: 16px;
          border: 1px solid var(--border);
          background: var(--card);
          overflow: hidden;
          box-shadow: var(--shadow);
        }
        .cornell-header {
          border-bottom: 2px solid var(--text);
          padding: 20px 18px;
          text-align: center;
        }
        .cornell-kicker {
          margin: 0;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--primary);
        }
        .cornell-title {
          margin: 10px 0 0;
          font-size: clamp(20px, 3vw, 26px);
          font-weight: 800;
          word-break: break-word;
        }
        .cornell-meta {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 4px 20px;
          margin-top: 10px;
          font-size: 12px;
          color: var(--muted);
        }
        .cornell-cols {
          display: grid;
          grid-template-columns: 34% 66%;
          border-bottom: 2px solid var(--text);
          background: var(--soft);
        }
        .cornell-cols > div {
          padding: 10px 14px;
        }
        .cornell-cols .col-left {
          border-right: 2px solid var(--text);
        }
        .col-heading {
          margin: 0;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .col-sub {
          margin: 3px 0 0;
          font-size: 11px;
          color: var(--muted);
        }
        .cornell-row {
          display: grid;
          grid-template-columns: 34% 66%;
          border-bottom: 1px solid var(--border);
        }
        .cornell-row .cell-left {
          border-right: 2px solid var(--text);
          min-width: 0;
          padding: 12px 14px;
        }
        .cornell-row .cell-right {
          min-width: 0;
          padding: 12px 14px;
        }
        .row-tools {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          margin-bottom: 6px;
        }
        .row-index {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .row-tools-btns {
          display: flex;
          gap: 2px;
        }
        .icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: 1px solid transparent;
          background: transparent;
          font-size: 12px;
          color: var(--muted);
          cursor: pointer;
          transition: all 0.15s;
        }
        .icon-btn:hover:not(:disabled) {
          background: var(--soft);
          border-color: var(--border);
          color: var(--text);
        }
        .icon-btn.danger:hover:not(:disabled) {
          background: var(--bad-soft);
          border-color: var(--bad);
          color: var(--bad);
        }
        .icon-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .cell-textarea {
          width: 100%;
          border: 0;
          background: transparent;
          padding: 0;
          font: inherit;
          font-size: 13px;
          line-height: 1.6;
          color: var(--text);
          resize: vertical;
          outline: none;
        }
        .cell-textarea::placeholder {
          color: #94a3b8;
        }
        .study-cue {
          min-height: 60px;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .study-note-hidden {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80px;
          border-radius: 10px;
          border: 1px dashed var(--primary-line);
          background: var(--primary-soft);
          padding: 16px;
          text-align: center;
          font-size: 12px;
          color: var(--primary);
        }
        .study-note-visible {
          min-height: 80px;
          border-radius: 10px;
          padding: 12px;
          background: var(--soft);
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .reveal-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 8px;
          border: 1px solid var(--primary-line);
          background: var(--primary-soft);
          color: var(--primary);
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 8px;
        }
        .reveal-btn:hover {
          background: var(--primary-line);
        }
        .summary-block {
          border-top: 2px solid var(--text);
        }
        .summary-head {
          background: var(--soft);
          padding: 10px 14px;
        }
        .summary-body {
          padding: 14px;
        }
        .empty-dot {
          color: var(--muted);
          font-style: italic;
        }

        /* Empty state */
        .empty-state {
          border-radius: 16px;
          border: 1px dashed var(--border);
          background: var(--soft);
          padding: 48px 24px;
          text-align: center;
        }
        .empty-state .emoji {
          font-size: 40px;
        }
        .empty-state h3 {
          margin: 12px 0 0;
          font-size: 18px;
        }
        .empty-state p {
          margin: 8px auto 0;
          max-width: 420px;
          font-size: 13px;
          line-height: 1.6;
          color: var(--muted);
        }
        .empty-actions {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        /* Instructions */
        .instructions h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
        }
        .instructions ol {
          margin: 14px 0 0;
          padding-left: 20px;
          font-size: 13px;
          line-height: 1.75;
          color: var(--muted);
        }
        .instructions b {
          color: var(--text);
        }
        .note {
          margin: 14px 0 0;
          padding-top: 14px;
          border-top: 1px solid var(--border);
          font-size: 11px;
          line-height: 1.6;
          color: var(--muted);
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(10, 16, 30, 0.55);
          backdrop-filter: blur(4px);
          animation: fade-in 0.15s ease-out;
        }
        .modal {
          width: 100%;
          max-width: 460px;
          background: var(--card);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
          animation: pop-in 0.18s ease-out;
        }
        .modal h3 {
          margin: 0 0 12px;
          font-size: 19px;
          text-align: center;
        }
        .modal-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 14px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          background: var(--primary-soft);
        }
        .modal-icon.danger {
          background: var(--bad-soft);
        }
        .modal p {
          text-align: center;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.55;
          margin: 0 0 22px;
        }
        .modal-actions {
          display: flex;
          gap: 10px;
        }
        .modal-actions .btn {
          flex: 1;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes pop-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 900px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .cn.dark {
            padding: 12px;
          }
          .hero {
            flex-direction: column;
          }
          .hero-actions {
            justify-content: flex-start;
          }
          .stats {
            grid-template-columns: 1fr;
          }
          .cornell-cols,
          .cornell-row {
            grid-template-columns: 100%;
          }
          .cornell-cols .col-left,
          .cornell-row .cell-left {
            border-right: 0;
            border-bottom: 2px solid var(--text);
          }
          .cornell-row .cell-left {
            border-bottom-width: 1px;
          }
          .modal-actions {
            flex-direction: column-reverse;
          }
          .modal-actions .btn {
            width: 100%;
          }
        }
      `}</style>

      {/* Header */}
      <div className="hero">
        <div>
          <h2>
            Cornell Notes Generator <span className="pro">PRO</span>
          </h2>
          <p>
            Capture lessons using the proven Cornell method — cues on the
            left, detailed notes on the right, and a summary at the bottom.
            Study, save as PDF, and back up your notes in one place.
          </p>
        </div>
        <div className="hero-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setDark((v) => !v)}
            aria-label="Toggle dark mode"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={createNewDocument}
          >
            + New notes
          </button>
        </div>
      </div>

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}

      {/* Stats */}
      {documents.length > 0 && (
        <div className="stats">
          <div className="stat accent">
            <span>Documents</span>
            <strong>{documents.length}</strong>
          </div>
          <div className="stat">
            <span>Cue / note rows</span>
            <strong>{totalCues}</strong>
          </div>
          <div className="stat">
            <span>Total words</span>
            <strong>{totalWords}</strong>
          </div>
          <div className="stat good">
            <span>Active document</span>
            <strong style={{ fontSize: 14, marginTop: 8 }}>
              {activeDocument ? relativeTime(activeDocument.updatedAt) : "—"}
            </strong>
          </div>
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">📝</div>
          <h3>Create your first Cornell note</h3>
          <p>
            Start a fresh document using the Cornell note-taking method, or
            load a sample document to see how it works before you begin.
          </p>
          <div className="empty-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={createNewDocument}
            >
              Create first document
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadSample}
            >
              Load sample notes
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Document toolbar */}
          <div className="card toolbar" style={{ marginBottom: 16 }}>
            <div className="toolbar-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDocumentList((v) => !v)}
              >
                {showDocumentList ? "Hide documents" : "📁 My documents"}
                <span
                  style={{
                    marginLeft: 6,
                    background: "var(--soft)",
                    borderRadius: 999,
                    padding: "1px 8px",
                    fontSize: 11,
                    border: "1px solid var(--border)",
                  }}
                >
                  {documents.length}
                </span>
              </button>

              <select
                value={activeId || ""}
                onChange={(e) => {
                  setActiveId(e.target.value);
                  setViewMode("editor");
                  setRevealNotes({});
                }}
                className="select"
                style={{ flex: 1, minWidth: 180 }}
                aria-label="Select note document"
              >
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>

              <div style={{ flex: 1 }} />

              <button
                type="button"
                className={`btn ${
                  viewMode === "editor" ? "btn-warn" : "btn-primary"
                }`}
                onClick={() => {
                  setViewMode((v) => (v === "editor" ? "study" : "editor"));
                  setRevealNotes({});
                }}
              >
                {viewMode === "editor" ? "🎴 Study mode" : "✏️ Edit notes"}
              </button>

              <button
                type="button"
                className="btn btn-dark"
                onClick={saveAsPdf}
                disabled={isExportingPdf}
              >
                {isExportingPdf ? "Saving…" : "📄 Save as PDF"}
              </button>
            </div>

            {showDocumentList && (
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div className="between">
                  <input
                    type="search"
                    className="input"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1, minWidth: 160 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={createNewDocument}
                  >
                    + New
                  </button>
                </div>

                {filteredDocuments.length === 0 ? (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--muted)",
                      textAlign: "center",
                      padding: 16,
                      margin: 0,
                    }}
                  >
                    No documents match your search.
                  </p>
                ) : (
                  filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className={`doc-item ${
                        activeId === doc.id ? "active" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="doc-title-btn"
                        onClick={() => {
                          setActiveId(doc.id);
                          setViewMode("editor");
                          setShowDocumentList(false);
                          setRevealNotes({});
                        }}
                      >
                        <span className="t">{doc.title}</span>
                        <span className="m">
                          {doc.course || "No course"} ·{" "}
                          {formatDate(doc.date)} · {relativeTime(doc.updatedAt)}
                        </span>
                      </button>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => duplicateDocument(doc.id)}
                          title="Duplicate"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteDocument(doc.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {activeDocument && (
            <>
              {/* Document info */}
              <div
                className="card"
                style={{
                  display: "grid",
                  gap: 14,
                  gridTemplateColumns: "1fr",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  }}
                >
                  <label className="field" style={{ gridColumn: "1 / -1" }}>
                    <span className="label">Topic or lesson title</span>
                    <input
                      ref={titleInputRef}
                      maxLength={150}
                      value={activeDocument.title}
                      onChange={(e) => updateField("title", e.target.value)}
                      placeholder="Example: Introduction to Photosynthesis"
                      className="input"
                    />
                  </label>
                  <label className="field">
                    <span className="label">Course or subject</span>
                    <input
                      maxLength={150}
                      value={activeDocument.course}
                      onChange={(e) => updateField("course", e.target.value)}
                      placeholder="Example: Biology"
                      className="input"
                    />
                  </label>
                  <label className="field">
                    <span className="label">Date</span>
                    <input
                      type="date"
                      value={activeDocument.date}
                      onChange={(e) => updateField("date", e.target.value)}
                      className="input"
                    />
                  </label>
                </div>
              </div>

              {/* Mode banner */}
              <div
                className={`mode-banner ${
                  viewMode === "study" ? "study" : ""
                }`}
                style={{ marginBottom: 16 }}
              >
                <span className="mode-icon">
                  {viewMode === "editor" ? "✏️" : "🎴"}
                </span>
                <div>
                  {viewMode === "editor" ? (
                    <>
                      <strong>Editing mode:</strong> write keywords or
                      questions in the Cues column and detailed explanations
                      in the Notes column. Add a summary at the bottom when
                      you finish.
                    </>
                  ) : (
                    <>
                      <strong>Study mode:</strong> the cues are visible but
                      your notes are hidden. Try to recall each answer, then
                      use Reveal to check yourself before moving on.
                    </>
                  )}
                </div>
              </div>

              {/* Cornell document */}
              <section ref={printAreaRef} className="cornell">
                <div className="cornell-header">
                  <p className="cornell-kicker">Cornell Note-Taking System</p>
                  <h2 className="cornell-title">
                    {activeDocument.title || "Untitled Cornell Notes"}
                  </h2>
                  <div className="cornell-meta">
                    {activeDocument.course && (
                      <span>
                        <strong>Course:</strong> {activeDocument.course}
                      </span>
                    )}
                    {activeDocument.date && (
                      <span>
                        <strong>Date:</strong>{" "}
                        {formatDate(activeDocument.date)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="cornell-cols">
                  <div className="col-left">
                    <p className="col-heading">Cues / Questions</p>
                    <p className="col-sub">Keywords and recall prompts</p>
                  </div>
                  <div>
                    <p className="col-heading">Notes</p>
                    <p className="col-sub">Main ideas and explanations</p>
                  </div>
                </div>

                <div>
                  {activeDocument.rows.map((row, index) => {
                    const revealed = !!revealNotes[row.id];
                    return (
                      <div key={row.id} className="cornell-row">
                        <div className="cell-left">
                          <div className="row-tools">
                            <span className="row-index">Cue {index + 1}</span>
                            {viewMode === "editor" && (
                              <div className="row-tools-btns">
                                <button
                                  type="button"
                                  className="icon-btn"
                                  title="Move up"
                                  onClick={() => moveRow(row.id, -1)}
                                  disabled={index === 0}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  title="Move down"
                                  onClick={() => moveRow(row.id, 1)}
                                  disabled={
                                    index === activeDocument.rows.length - 1
                                  }
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn danger"
                                  title="Remove row"
                                  onClick={() => removeRow(row.id)}
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>

                          {viewMode === "editor" ? (
                            <textarea
                              rows={4}
                              maxLength={3000}
                              value={row.cue}
                              onChange={(e) =>
                                updateRow(row.id, "cue", e.target.value)
                              }
                              placeholder="Write a question, keyword, or prompt..."
                              className="cell-textarea"
                            />
                          ) : (
                            <div className="study-cue">
                              {row.cue || (
                                <span className="empty-dot">
                                  No cue entered
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="cell-right">
                          <div className="row-tools">
                            <span className="row-index">Notes {index + 1}</span>
                            {viewMode === "study" && (
                              <button
                                type="button"
                                className="reveal-btn"
                                onClick={() => toggleReveal(row.id)}
                              >
                                {revealed ? "🙈 Hide notes" : "👁 Reveal notes"}
                              </button>
                            )}
                          </div>

                          {viewMode === "editor" ? (
                            <textarea
                              rows={5}
                              maxLength={10000}
                              value={row.notes}
                              onChange={(e) =>
                                updateRow(row.id, "notes", e.target.value)
                              }
                              placeholder="Write the main ideas, explanations, facts, examples, or important details..."
                              className="cell-textarea"
                            />
                          ) : revealed ? (
                            <div className="study-note-visible">
                              {row.notes || (
                                <span className="empty-dot">
                                  No notes entered for this cue yet.
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="study-note-hidden">
                              Notes are hidden. Try to recall the answer,
                              then tap Reveal.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="summary-block">
                  <div className="summary-head">
                    <p className="col-heading">Summary</p>
                    <p className="col-sub">
                      Summarize the main lesson in your own words.
                    </p>
                  </div>
                  <div className="summary-body">
                    {viewMode === "editor" ? (
                      <textarea
                        rows={5}
                        maxLength={10000}
                        value={activeDocument.summary}
                        onChange={(e) =>
                          updateField("summary", e.target.value)
                        }
                        placeholder="Write a short summary of the most important ideas from this lesson. What should you remember?"
                        className="textarea"
                      />
                    ) : (
                      <div className="study-note-visible">
                        {activeDocument.summary || (
                          <span className="empty-dot">
                            No summary has been written yet.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    padding: "10px 14px",
                    textAlign: "center",
                    fontSize: 11,
                    color: "var(--muted)",
                  }}
                >
                  Cornell Notes · ToolsAB
                </div>
              </section>

              {/* Editor controls */}
              <div className="row" style={{ marginTop: 16, marginBottom: 16 }}>
                {viewMode === "editor" && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={addRow}
                  >
                    + Add cue and notes row
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => exportDocument(activeDocument)}
                >
                  ⬇ Export this document
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => duplicateDocument(activeDocument.id)}
                >
                  📋 Duplicate
                </button>
                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={saveAsPdf}
                  disabled={isExportingPdf}
                >
                  {isExportingPdf ? "Saving PDF…" : "📄 Save as PDF"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Backup & restore */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="between">
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
              Backup and restore
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: "var(--muted)",
                lineHeight: 1.5,
              }}
            >
              Download all your note documents as a JSON backup, or import a
              previous backup. Imported documents are added to your existing
              collection.
            </p>
          </div>
        </div>

        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          onChange={importDocuments}
          style={{ display: "none" }}
        />

        <div className="row" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="btn btn-dark"
            onClick={exportAllDocuments}
            disabled={documents.length === 0}
          >
            ⬇ Export all notes
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => importRef.current?.click()}
          >
            ⬆ Import JSON
          </button>
        </div>

        <p className="note">
          Notes are stored in this browser on this device. They do not
          automatically sync to other devices. Export backups regularly,
          especially before clearing browser data.
        </p>
      </div>

      {/* Instructions */}
      <div className="card instructions" style={{ marginTop: 16 }}>
        <h3>How to use the Cornell note-taking method</h3>
        <ol>
          <li>
            <b>Write notes in the right column.</b> During a lesson or while
            reading, record the main ideas, explanations, facts, definitions,
            and examples. Use your own words where possible.
          </li>
          <li>
            <b>Add cues and questions in the left column.</b> After reviewing,
            write short questions, keywords, or prompts that help you recall
            the information.
          </li>
          <li>
            <b>Write a summary at the bottom.</b> Compress the main points of
            the lesson into a few sentences focused on what you should
            remember.
          </li>
          <li>
            <b>Practise with study mode.</b> Hide the notes column and use the
            cues to test your memory. Reveal notes only after you have tried
            to recall them.
          </li>
          <li>
            <b>Save a PDF.</b> Use Save as PDF to download a clean, printable
            copy of your notes for revision or filing.
          </li>
        </ol>
        <p className="note">
          Everything is stored locally in your browser — no account and no
          server. Export a JSON backup if you want to keep a portable copy or
          move your notes to another device.
        </p>
      </div>

      {/* Custom Dialog */}
      {dialog &&
        typeof document !== "undefined" &&
        createPortal(
          <div className={`cn-modal-root ${dark ? "dark" : ""}`}>
            <div className="modal-backdrop" onClick={() => setDialog(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className={`modal-icon ${dialog.tone}`}>
                  {dialog.tone === "danger" ? "⚠️" : "✅"}
                </div>
                <h3>{dialog.title}</h3>
                <p>{dialog.message}</p>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDialog(null)}
                    ref={cancelRef}
                  >
                    {dialog.cancelLabel || "Cancel"}
                  </button>
                  <button
                    type="button"
                    className={`btn ${
                      dialog.tone === "danger"
                        ? "btn-danger-solid"
                        : "btn-primary"
                    }`}
                    ref={confirmRef}
                    onClick={() => {
                      const fn = dialog.onConfirm;
                      setDialog(null);
                      fn();
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

/* ----------------------- PDF color override ----------------------- */

/**
 * html2canvas does not resolve CSS custom properties (var(--x)).
 * To ensure the exported PDF is always readable, we temporarily apply
 * concrete light-mode colors to the print area and restore them after.
 */
function forceLightForPdf(element: HTMLElement): () => void {
  const original = element.getAttribute("style") || "";

  element.style.setProperty("--text", "#172033");
  element.style.setProperty("--muted", "#64748b");
  element.style.setProperty("--border", "#e5e9f1");
  element.style.setProperty("--card", "#ffffff");
  element.style.setProperty("--soft", "#f4f6fb");
  element.style.setProperty("--input", "#ffffff");
  element.style.setProperty("--primary", "#ff5a1f");
  element.style.setProperty("--primary-soft", "#fff1ea");
  element.style.setProperty("--primary-line", "#ffd3c1");
  element.style.setProperty("--good", "#16a34a");
  element.style.setProperty("--good-soft", "#ecfdf5");
  element.style.setProperty("--warn", "#b45309");
  element.style.setProperty("--warn-soft", "#fffbeb");
  element.style.setProperty("--bad", "#dc2626");
  element.style.setProperty("--bad-soft", "#fef2f2");
  element.style.background = "#ffffff";
  element.style.color = "#172033";
  element.style.boxShadow = "none";

  // Force any textareas in the area to render as plain blocks during capture
  // (html2canvas renders textarea content poorly); we swap them for divs.
  const textareas = Array.from(
    element.querySelectorAll<HTMLTextAreaElement>("textarea")
  );
  const swaps: { ta: HTMLTextAreaElement; div: HTMLDivElement }[] = [];

  textareas.forEach((ta) => {
    const div = document.createElement("div");
    div.textContent = ta.value || " ";
    div.style.cssText =
      "white-space:pre-wrap;word-break:break-word;font-size:13px;" +
      "line-height:1.6;color:#172033;min-height:1.6em;";
    ta.style.display = "none";
    ta.parentNode?.insertBefore(div, ta.nextSibling);
    swaps.push({ ta, div });
  });

  return () => {
    swaps.forEach(({ ta, div }) => {
      ta.style.display = "";
      div.remove();
    });
    element.setAttribute("style", original);
  };
}