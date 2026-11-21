"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ----------------------------- Types ----------------------------- */

type WordStatus = "new" | "learning" | "mastered";
type View = "library" | "flashcards" | "quiz";
type SortKey = "newest" | "oldest" | "alphabetical";

type VocabularyWord = {
  id: string;
  word: string;
  meaning: string;
  example: string;
  synonyms: string;
  antonyms: string;
  notes: string;
  category: string;
  status: WordStatus;
  createdAt: number;
  updatedAt: number;
  masteredAt?: string;
};

type QuizQuestion = {
  wordId: string;
  correctMeaning: string;
  options: string[];
};

type DialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone: "danger" | "primary";
  onConfirm: () => void;
};

/* --------------------------- Constants --------------------------- */

const STORAGE_KEY = "toolsab-vocabulary-builder-v2";
const GOAL_KEY = "toolsab-vocabulary-builder-goal-v2";

const DEFAULT_CATEGORIES = [
  "Daily English",
  "Academic",
  "Business",
  "IELTS",
  "TOEFL",
  "Competitive Exams",
  "Other",
];

const EMPTY_FORM = {
  word: "",
  meaning: "",
  example: "",
  synonyms: "",
  antonyms: "",
  notes: "",
  category: "Daily English",
  status: "new" as WordStatus,
};

const STATUS_LABELS: Record<WordStatus, string> = {
  new: "New",
  learning: "Learning",
  mastered: "Mastered",
};

const LEVEL_TITLES = [
  "Beginner",
  "Apprentice",
  "Scholar",
  "Expert",
  "Wordsmith",
];
const XP_PER_LEVEL = 250;

/* ---------------------------- Helpers ---------------------------- */

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeWord(value: unknown): VocabularyWord | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Record<string, unknown>;
  const word = typeof item.word === "string" ? item.word.trim() : "";
  const meaning = typeof item.meaning === "string" ? item.meaning.trim() : "";

  if (!word || !meaning) return null;

  const allowedStatuses: WordStatus[] = ["new", "learning", "mastered"];
  const status = allowedStatuses.includes(item.status as WordStatus)
    ? (item.status as WordStatus)
    : "new";

  const category =
    typeof item.category === "string" && item.category.trim()
      ? item.category.trim().slice(0, 50)
      : "Other";

  const createdAt =
    typeof item.createdAt === "number" && Number.isFinite(item.createdAt)
      ? item.createdAt
      : Date.now();

  return {
    id: typeof item.id === "string" && item.id ? item.id : createId(),
    word: word.slice(0, 100),
    meaning: meaning.slice(0, 1000),
    example:
      typeof item.example === "string" ? item.example.slice(0, 1000) : "",
    synonyms:
      typeof item.synonyms === "string" ? item.synonyms.slice(0, 500) : "",
    antonyms:
      typeof item.antonyms === "string" ? item.antonyms.slice(0, 500) : "",
    notes: typeof item.notes === "string" ? item.notes.slice(0, 1000) : "",
    category,
    status,
    createdAt,
    updatedAt:
      typeof item.updatedAt === "number" && Number.isFinite(item.updatedAt)
        ? item.updatedAt
        : createdAt,
    masteredAt:
      typeof item.masteredAt === "string" ? item.masteredAt : undefined,
  };
}

function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getPercent(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

const downloadFile = (name: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

const dayKey = (value: number | Date) => new Date(value).toDateString();

/* --------------------------- Component --------------------------- */

export default function VocabularyBuilder() {
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [dark, setDark] = useState(false);
  const [view, setView] = useState<View>("library");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [flashcardIds, setFlashcardIds] = useState<string[]>([]);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const [dailyGoal, setDailyGoal] = useState(5);
  const [dailyGoalInput, setDailyGoalInput] = useState("5");

  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const importRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const todayKey = getTodayKey();

  /* ----------------------- Persistence ----------------------- */

  useEffect(() => {
    try {
      const savedWords = localStorage.getItem(STORAGE_KEY);
      if (savedWords) {
        const parsed: unknown = JSON.parse(savedWords);
        if (Array.isArray(parsed)) {
          setWords(
            parsed
              .map(normalizeWord)
              .filter((item): item is VocabularyWord => item !== null),
          );
        }
      }

      const savedGoal = localStorage.getItem(GOAL_KEY);
      if (savedGoal) {
        const parsedGoal = Number(savedGoal);
        if (Number.isFinite(parsedGoal) && parsedGoal >= 1) {
          const safeGoal = Math.min(100, Math.floor(parsedGoal));
          setDailyGoal(safeGoal);
          setDailyGoalInput(String(safeGoal));
        }
      }

      const savedPrefs = localStorage.getItem("toolsab-vocabulary-prefs");
      if (savedPrefs) {
        setDark(Boolean(JSON.parse(savedPrefs).dark));
      } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        setDark(true);
      }
    } catch {
      setNotice("Saved data could not be loaded. You can still add new words.");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    } catch {
      setNotice("Browser storage is full. Export your words to keep a backup.");
    }
  }, [words, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(GOAL_KEY, String(dailyGoal));
    localStorage.setItem("toolsab-vocabulary-prefs", JSON.stringify({ dark }));
  }, [dailyGoal, dark, hydrated]);

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

  const masteredCount = words.filter(
    (item) => item.status === "mastered",
  ).length;
  const learningCount = words.filter(
    (item) => item.status === "learning",
  ).length;
  const newCount = words.filter((item) => item.status === "new").length;
  const overallProgress = getPercent(masteredCount, words.length);

  const learnedToday = words.filter(
    (item) => item.masteredAt === todayKey,
  ).length;
  const dailyProgress = getPercent(learnedToday, dailyGoal);

  const totalXp = useMemo(() => {
    let xp = words.length * 15;
    words.forEach((word) => {
      if (word.status === "learning") xp += 10;
      if (word.status === "mastered") xp += 35;
    });
    return xp;
  }, [words]);

  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const levelProgress = ((totalXp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

  const streak = useMemo(() => {
    const days = new Set(
      words
        .filter((w) => w.status === "mastered" && w.masteredAt)
        .map((w) => w.masteredAt),
    );
    const cursor = new Date();
    if (!days.has(getTodayKey())) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (
      days.has(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`,
      )
    ) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [words]);

  const categories = useMemo(() => {
    return Array.from(
      new Set([...DEFAULT_CATEGORIES, ...words.map((item) => item.category)]),
    ).sort((a, b) => a.localeCompare(b));
  }, [words]);

  const filteredWords = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = words.filter((item) => {
      const matchesSearch =
        !query ||
        item.word.toLowerCase().includes(query) ||
        item.meaning.toLowerCase().includes(query) ||
        item.example.toLowerCase().includes(query) ||
        item.synonyms.toLowerCase().includes(query) ||
        item.antonyms.toLowerCase().includes(query) ||
        item.notes.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    if (sortBy === "alphabetical") {
      result.sort((a, b) => a.word.localeCompare(b.word));
    } else if (sortBy === "oldest") {
      result.sort((a, b) => a.createdAt - b.createdAt);
    } else {
      result.sort((a, b) => b.createdAt - a.createdAt);
    }

    return result;
  }, [words, search, statusFilter, categoryFilter, sortBy]);

  const currentCard = useMemo(() => {
    const id = flashcardIds[selectedCardIndex];
    return words.find((item) => item.id === id) || null;
  }, [flashcardIds, selectedCardIndex, words]);

  const currentQuestion = quizQuestions[quizIndex];

  /* -------------------------- Actions -------------------------- */

  const askConfirm = (options: DialogState) => setDialog(options);

  const updateWordStatus = useCallback(
    (id: string, status: WordStatus) => {
      setWords((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          return {
            ...item,
            status,
            updatedAt: Date.now(),
            masteredAt:
              status === "mastered"
                ? item.status === "mastered"
                  ? item.masteredAt || todayKey
                  : todayKey
                : undefined,
          };
        }),
      );
    },
    [todayKey],
  );

  const openAddForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setNotice("");
  };

  const openEditForm = (item: VocabularyWord) => {
    setForm({
      word: item.word,
      meaning: item.meaning,
      example: item.example,
      synonyms: item.synonyms,
      antonyms: item.antonyms,
      notes: item.notes,
      category: item.category,
      status: item.status,
    });
    setEditingId(item.id);
    setShowForm(true);
    setView("library");
  };

  const saveWord = (e: React.FormEvent) => {
    e.preventDefault();
    const word = form.word.trim();
    const meaning = form.meaning.trim();

    if (!word || !meaning) {
      setNotice("Please enter both a word and its meaning.");
      return;
    }

    const duplicate = words.find(
      (item) =>
        item.word.toLowerCase() === word.toLowerCase() && item.id !== editingId,
    );

    if (duplicate) {
      setNotice(`"${word}" is already in your vocabulary list.`);
      return;
    }

    const now = Date.now();

    if (editingId) {
      setWords((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                ...form,
                word,
                meaning,
                updatedAt: now,
                masteredAt:
                  form.status === "mastered"
                    ? item.masteredAt || todayKey
                    : undefined,
              }
            : item,
        ),
      );
      setNotice("Word updated successfully.");
    } else {
      const newWord: VocabularyWord = {
        id: createId(),
        ...form,
        word,
        meaning,
        createdAt: now,
        updatedAt: now,
        masteredAt: form.status === "mastered" ? todayKey : undefined,
      };
      setWords((current) => [newWord, ...current]);
      setNotice("Word added to your vocabulary.");
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const deleteWord = (id: string) => {
    const item = words.find((w) => w.id === id);
    if (!item) return;

    askConfirm({
      title: "Delete this word?",
      message: `"${item.word}" will be removed from your vocabulary list.`,
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: () => {
        setWords((current) => current.filter((w) => w.id !== id));
        setNotice("Word deleted.");
      },
    });
  };

  const startFlashcards = () => {
    if (words.length === 0) {
      setNotice("Add some words before starting flashcards.");
      return;
    }
    const eligible = words.filter((item) => item.status !== "mastered");
    const deck = eligible.length > 0 ? eligible : words;
    setFlashcardIds(shuffle(deck.map((item) => item.id)));
    setSelectedCardIndex(0);
    setCardRevealed(false);
    setView("flashcards");
  };

  const nextCard = () => {
    setCardRevealed(false);
    setSelectedCardIndex((c) => Math.min(c + 1, flashcardIds.length - 1));
  };

  const prevCard = () => {
    setCardRevealed(false);
    setSelectedCardIndex((c) => Math.max(0, c - 1));
  };

  const startQuiz = () => {
    if (words.length < 4) {
      setNotice("You need at least 4 words to start a quiz.");
      return;
    }

    const selected = shuffle(words).slice(0, Math.min(10, words.length));
    const questions = selected.map((item) => {
      const otherMeanings = shuffle(
        words
          .filter((other) => other.id !== item.id)
          .map((other) => other.meaning)
          .filter((meaning) => meaning !== item.meaning),
      ).slice(0, 3);
      return {
        wordId: item.id,
        correctMeaning: item.meaning,
        options: shuffle([item.meaning, ...otherMeanings]),
      };
    });

    setQuizQuestions(questions);
    setQuizIndex(0);
    setQuizAnswer(null);
    setQuizScore(0);
    setQuizFinished(false);
    setView("quiz");
  };

  const answerQuestion = (answer: string) => {
    if (quizAnswer || !currentQuestion) return;
    setQuizAnswer(answer);
    if (answer === currentQuestion.correctMeaning) setQuizScore((s) => s + 1);
  };

  const nextQuestion = () => {
    if (quizIndex + 1 >= quizQuestions.length) {
      setQuizFinished(true);
      return;
    }
    setQuizIndex((c) => c + 1);
    setQuizAnswer(null);
  };

  const saveGoal = () => {
    const parsed = Number(dailyGoalInput);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      setNotice("Please enter a goal between 1 and 100.");
      return;
    }
    setDailyGoal(parsed);
    setNotice("Daily goal updated.");
  };

  const exportWords = () => {
    const data = {
      app: "ToolsAB Vocabulary Builder",
      version: 2,
      exportedAt: new Date().toISOString(),
      words,
    };
    downloadFile(
      "vocabulary-backup.json",
      JSON.stringify(data, null, 2),
      "application/json",
    );
    setNotice("Backup downloaded.");
  };

  const importWords = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const source = Array.isArray(parsed)
        ? parsed
        : parsed &&
            typeof parsed === "object" &&
            Array.isArray((parsed as any).words)
          ? (parsed as any).words
          : null;

      if (!source) throw new Error("Invalid file. Expected a word list.");

      const imported = source
        .map(normalizeWord)
        .filter(
          (item: VocabularyWord | null): item is VocabularyWord =>
            item !== null,
        );

      if (imported.length === 0) throw new Error("No valid words found.");

      setWords((current) => {
        const existing = new Set(
          current.map((item) => item.word.toLowerCase()),
        );
        const unique = imported.filter((item: any) => {
          const key = item.word.toLowerCase();
          if (existing.has(key)) return false;
          existing.add(key);
          return true;
        });
        if (unique.length === 0) {
          setNotice("All imported words already exist.");
          return current;
        }
        setNotice(
          `${unique.length} word${unique.length === 1 ? "" : "s"} imported.`,
        );
        return [...unique, ...current];
      });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Import failed.");
    } finally {
      event.target.value = "";
    }
  };

  /* ------------------------ Keyboard nav ------------------------ */

  useEffect(() => {
    if (view !== "flashcards" || !currentCard) return;

    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === " " && !cardRevealed) {
        e.preventDefault();
        setCardRevealed(true);
      } else if (cardRevealed) {
        if (e.key === "1") {
          updateWordStatus(currentCard.id, "new");
          nextCard();
        }
        if (e.key === "2") {
          updateWordStatus(currentCard.id, "learning");
          nextCard();
        }
        if (e.key === "3") {
          updateWordStatus(currentCard.id, "mastered");
          nextCard();
        }
      }
      if (e.key === "ArrowRight") nextCard();
      if (e.key === "ArrowLeft") prevCard();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, currentCard, cardRevealed, updateWordStatus]);

  if (!hydrated) {
    return (
      <div className="vt-loading">
        Loading your vocabulary...
        <style jsx>{`
          .vt-loading {
            padding: 40px 20px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`vt ${dark ? "dark" : ""}`}>
      <style jsx>{`
        .vt,
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
          --shadow:
            0 1px 2px rgba(23, 32, 51, 0.04), 0 8px 24px rgba(23, 32, 51, 0.06);
          color: var(--text);
          width: 100%;
          font-family: inherit;
          position: relative;
        }
        .vt.dark,
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
          --shadow:
            0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.25);
        }
        .vt.dark {
          background: #0a101e;
          border-radius: 20px;
          padding: 20px;
        }
        .vt *,
        .modal-root * {
          box-sizing: border-box;
        }
        .vt button,
        .modal-root button {
          font-family: inherit;
        }
        .vt button:focus-visible,
        .modal-root button:focus-visible,
        .vt input:focus-visible,
        .vt select:focus-visible,
        .vt textarea:focus-visible {
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
        }
        .hero h2 {
          margin: 0 0 8px;
          font-size: clamp(26px, 4.4vw, 36px);
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -0.8px;
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
          max-width: 620px;
        }
        .pro {
          background: linear-gradient(135deg, #ff5a1f, #ffb020);
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.6px;
          padding: 4px 9px;
          border-radius: 999px;
          box-shadow: 0 4px 12px rgba(255, 90, 31, 0.35);
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
          padding: 22px;
          margin-bottom: 16px;
          box-shadow: var(--shadow);
        }
        .stack > * + * {
          margin-top: 16px;
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
          box-shadow: 0 6px 16px rgba(255, 90, 31, 0.32);
        }
        .btn-primary:hover:not(:disabled) {
          box-shadow: 0 8px 20px rgba(255, 90, 31, 0.42);
        }
        .btn-secondary {
          background: var(--card);
          color: var(--text);
          border-color: var(--border);
        }
        .btn-secondary:hover:not(:disabled) {
          border-color: var(--primary);
          color: var(--primary);
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
        .link-btn {
          background: none;
          border: 0;
          padding: 0;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          color: var(--primary);
        }
        .link-btn:disabled {
          opacity: 0.4;
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
          line-height: 1.5;
        }
        .input:focus,
        .textarea:focus,
        .select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.14);
        }
        .input::placeholder,
        .textarea::placeholder {
          color: #94a3b8;
        }

        /* Toast */
        .toast {
          position: sticky;
          top: 12px;
          z-index: 20;
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
          font-size: 24px;
          font-weight: 800;
        }
        .stat.good {
          background: var(--good-soft);
          border-color: var(--good);
        }
        .stat.good span,
        .stat.good strong {
          color: var(--good);
        }
        .stat.warn {
          background: var(--warn-soft);
          border-color: var(--warn);
        }
        .stat.warn span,
        .stat.warn strong {
          color: var(--warn);
        }
        .stat.blue {
          background: var(--blue-soft);
          border-color: var(--blue);
        }
        .stat.blue span,
        .stat.blue strong {
          color: var(--blue);
        }

        .strip {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
          background: linear-gradient(120deg, #1b2438, #2a1a14);
          color: #fff;
          border-radius: 18px;
          padding: 18px 22px;
          margin-bottom: 16px;
          box-shadow: var(--shadow);
        }
        .strip-level {
          font-size: 13px;
          color: #cbd5e1;
        }
        .strip-level strong {
          display: block;
          font-size: 20px;
          color: #fff;
          letter-spacing: -0.3px;
        }
        .xp {
          flex: 1;
          min-width: 160px;
        }
        .xp-bar {
          height: 8px;
          border-radius: 99px;
          background: rgba(255, 255, 255, 0.15);
          overflow: hidden;
        }
        .xp-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff5a1f, #ffb020);
          border-radius: 99px;
          transition: width 0.5s;
        }
        .xp small {
          display: block;
          margin-top: 6px;
          font-size: 11px;
          color: #94a3b8;
        }
        .strip-pill {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 8px 14px;
          font-size: 12px;
          color: #cbd5e1;
          text-align: center;
        }
        .strip-pill strong {
          display: block;
          font-size: 17px;
          color: #fff;
        }

        /* Navigation */
        .tabs {
          display: flex;
          gap: 4px;
          background: var(--soft);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 16px;
          border: 1px solid var(--border);
        }
        .tabs button {
          flex: 1;
          border: 0;
          background: transparent;
          color: var(--muted);
          padding: 10px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tabs button:hover {
          color: var(--text);
        }
        .tabs button.on {
          background: var(--card);
          color: var(--primary);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        }

        /* Progress bars */
        .bar {
          height: 8px;
          background: var(--soft);
          border-radius: 99px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff5a1f, #ffb020);
          border-radius: 99px;
          transition: width 0.3s;
        }
        .bar-fill.green {
          background: linear-gradient(90deg, #16a34a, #4ade80);
        }

        /* Library */
        .word-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .word-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }
        .word-top h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          word-break: break-word;
        }
        .word-top p {
          margin: 4px 0 0;
          font-size: 13px;
          color: var(--muted);
          line-height: 1.5;
        }
        .badge {
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 800;
          display: inline-block;
          flex-shrink: 0;
        }
        .badge-new {
          background: var(--soft);
          color: var(--muted);
          border: 1px solid var(--border);
        }
        .badge-learning {
          background: var(--warn-soft);
          color: var(--warn);
          border: 1px solid var(--warn);
        }
        .badge-mastered {
          background: var(--good-soft);
          color: var(--good);
          border: 1px solid var(--good);
        }
        .badge-accent {
          background: var(--primary-soft);
          color: var(--primary);
          border: 1px solid var(--primary-line);
        }

        .example-box {
          background: var(--soft);
          border-radius: 10px;
          padding: 12px;
          border: 1px solid var(--border);
        }
        .example-box p:first-child {
          margin: 0;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--muted);
        }
        .example-box p:last-child {
          margin: 6px 0 0;
          font-size: 13px;
          font-style: italic;
          line-height: 1.5;
        }

        .meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12px;
          color: var(--muted);
        }
        .meta-row b {
          color: var(--text);
        }

        .word-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          border-top: 1px solid var(--border);
          padding-top: 12px;
          margin-top: 4px;
        }

        .empty {
          text-align: center;
          padding: 44px 20px;
          border: 1px dashed var(--border);
          border-radius: 16px;
          background: var(--soft);
        }
        .empty-icon {
          font-size: 38px;
        }

        /* Flashcards */
        .flashcard {
          max-width: 640px;
          margin: 0 auto;
        }
        .fc-header {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--muted);
          font-weight: 600;
          margin-bottom: 8px;
        }
        .fc-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          min-height: 220px;
          padding: 20px 0;
        }
        .fc-word {
          font-size: 32px;
          font-weight: 800;
          margin: 16px 0;
          word-break: break-word;
          line-height: 1.2;
        }
        .fc-answer {
          background: var(--primary-soft);
          border-radius: 14px;
          padding: 16px;
          text-align: left;
          width: 100%;
          margin-top: 16px;
        }
        .fc-answer p:first-child {
          margin: 0 0 4px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--primary);
          letter-spacing: 0.5px;
        }
        .fc-answer p {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
        }
        .fc-grades {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 16px;
        }
        .fc-grades button {
          padding: 12px 8px;
          border-radius: 10px;
          border: 1px solid transparent;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .fc-grades .g-new {
          background: var(--soft);
          color: var(--muted);
          border-color: var(--border);
        }
        .fc-grades .g-new:hover {
          background: var(--bad-soft);
          color: var(--bad);
          border-color: var(--bad);
        }
        .fc-grades .g-learning {
          background: var(--warn-soft);
          color: var(--warn);
          border-color: var(--warn);
        }
        .fc-grades .g-learning:hover {
          filter: brightness(0.95);
        }
        .fc-grades .g-mastered {
          background: var(--good-soft);
          color: var(--good);
          border-color: var(--good);
        }
        .fc-grades .g-mastered:hover {
          filter: brightness(0.95);
        }

        /* Quiz */
        .quiz-card {
          max-width: 640px;
          margin: 0 auto;
        }
        .quiz-opt {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          width: 100%;
          text-align: left;
          padding: 14px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--card);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          margin-top: 10px;
        }
        .quiz-opt:hover:not(:disabled) {
          border-color: var(--primary-line);
          background: var(--primary-soft);
        }
        .quiz-opt.correct {
          border-color: var(--good);
          background: var(--good-soft);
          color: var(--good);
        }
        .quiz-opt.wrong {
          border-color: var(--bad);
          background: var(--bad-soft);
          color: var(--bad);
        }
        .quiz-opt:disabled {
          cursor: default;
        }
        .quiz-letter {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--soft);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          color: var(--muted);
          flex-shrink: 0;
        }
        .quiz-feedback {
          margin-top: 16px;
          padding: 12px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
        }
        .quiz-feedback.good {
          background: var(--good-soft);
          color: var(--good);
        }
        .quiz-feedback.bad {
          background: var(--warn-soft);
          color: var(--warn);
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
          max-width: 480px;
          background: var(--card);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
          animation: pop-in 0.18s ease-out;
        }
        .modal h3 {
          margin: 0 0 16px;
          font-size: 20px;
        }
        .modal-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          background: var(--primary-soft);
        }
        .modal-icon.danger {
          background: var(--bad-soft);
        }
        .modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 24px;
        }
        .modal-actions .btn {
          flex: 1;
        }

        .tips {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          line-height: 1.75;
          color: var(--muted);
        }
        .tips b {
          color: var(--text);
        }
        .note {
          margin: 16px 0 0;
          padding-top: 16px;
          border-top: 1px solid var(--border);
          font-size: 11px;
          line-height: 1.6;
          color: var(--muted);
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

        @media (max-width: 768px) {
          .hero {
            flex-direction: column;
          }
          .hero-actions {
            justify-content: flex-start;
          }
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .fc-word {
            font-size: 26px;
          }
        }
        @media (max-width: 520px) {
          .card {
            padding: 16px;
          }
          .stats {
            grid-template-columns: 1fr;
          }
          .fc-grades {
            grid-template-columns: 1fr;
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
            Vocabulary Builder <span className="pro">PRO</span>
          </h2>
          <p>
            Build your word collection, practise with flashcards and quizzes,
            and track your learning streak.
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
            onClick={openAddForm}
          >
            + Add a word
          </button>
        </div>
      </div>

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}

      {/* Level Bar */}
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
          <strong>{words.length}</strong>words saved
        </div>
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="stat blue">
          <span>Total words</span>
          <strong>{words.length}</strong>
        </div>
        <div className="stat">
          <span>New</span>
          <strong>{newCount}</strong>
        </div>
        <div className="stat warn">
          <span>Learning</span>
          <strong>{learningCount}</strong>
        </div>
        <div className="stat good">
          <span>Mastered</span>
          <strong>{masteredCount}</strong>
        </div>
      </div>

      {/* Progress + Goal */}
      <div className="card stack">
        <div className="between">
          <div>
            <h3 style={{ fontSize: 16 }}>Overall progress</h3>
            <p className="note" style={{ margin: 0, border: 0, padding: 0 }}>
              {masteredCount} of {words.length} words mastered
            </p>
          </div>
          <span
            style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)" }}
          >
            {overallProgress}%
          </span>
        </div>
        <div className="bar">
          <div className="bar-fill" style={{ width: `${overallProgress}%` }} />
        </div>

        <div className="between" style={{ marginTop: 16 }}>
          <div>
            <h3 style={{ fontSize: 16 }}>Today's goal</h3>
            <p className="note" style={{ margin: 0, border: 0, padding: 0 }}>
              {learnedToday} of {dailyGoal} words mastered today
            </p>
          </div>
          <div className="row">
            <input
              type="number"
              min="1"
              max="100"
              value={dailyGoalInput}
              onChange={(e) => setDailyGoalInput(e.target.value)}
              className="input"
              style={{ width: 80 }}
              aria-label="Daily goal"
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={saveGoal}
            >
              Save goal
            </button>
          </div>
        </div>
        <div className="bar" style={{ marginTop: 8 }}>
          <div
            className="bar-fill green"
            style={{ width: `${Math.min(dailyProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="tabs">
        <button
          type="button"
          className={view === "library" ? "on" : ""}
          onClick={() => setView("library")}
        >
          📚 Word library
        </button>
        <button
          type="button"
          className={view === "flashcards" ? "on" : ""}
          onClick={() => setView("flashcards")}
        >
          🎴 Flashcards
        </button>
        <button
          type="button"
          className={view === "quiz" ? "on" : ""}
          onClick={() => setView("quiz")}
        >
          🧠 Practice quiz
        </button>
      </div>

      {/* Add/Edit Modal */}
      {showForm &&
        typeof document !== "undefined" &&
        createPortal(
          <div className={`modal-root ${dark ? "dark" : ""}`}>
            <div className="modal-backdrop" onClick={() => setShowForm(false)}>
              <div
                className="modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 600 }}
              >
                <h3>{editingId ? "Edit word" : "Add a new word"}</h3>
                <form
                  onSubmit={saveWord}
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <div className="field">
                      <label className="label">Word *</label>
                      <input
                        required
                        className="input"
                        value={form.word}
                        onChange={(e) =>
                          setForm({ ...form, word: e.target.value })
                        }
                        placeholder="e.g. Resilient"
                      />
                    </div>
                    <div className="field">
                      <label className="label">Meaning *</label>
                      <input
                        required
                        className="input"
                        value={form.meaning}
                        onChange={(e) =>
                          setForm({ ...form, meaning: e.target.value })
                        }
                        placeholder="Able to recover quickly"
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="label">Example sentence</label>
                    <textarea
                      className="textarea"
                      rows={2}
                      value={form.example}
                      onChange={(e) =>
                        setForm({ ...form, example: e.target.value })
                      }
                      placeholder="She was resilient during tough times."
                    />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <div className="field">
                      <label className="label">Synonyms</label>
                      <input
                        className="input"
                        value={form.synonyms}
                        onChange={(e) =>
                          setForm({ ...form, synonyms: e.target.value })
                        }
                        placeholder="Strong, tough"
                      />
                    </div>
                    <div className="field">
                      <label className="label">Antonyms</label>
                      <input
                        className="input"
                        value={form.antonyms}
                        onChange={(e) =>
                          setForm({ ...form, antonyms: e.target.value })
                        }
                        placeholder="Fragile, weak"
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <div className="field">
                      <label className="label">Category</label>
                      <select
                        className="select"
                        value={form.category}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value })
                        }
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label className="label">Status</label>
                      <select
                        className="select"
                        value={form.status}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            status: e.target.value as WordStatus,
                          })
                        }
                      >
                        <option value="new">New</option>
                        <option value="learning">Learning</option>
                        <option value="mastered">Mastered</option>
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label className="label">Notes (optional)</label>
                    <textarea
                      className="textarea"
                      rows={2}
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                      placeholder="Any personal reminders..."
                    />
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingId ? "Save changes" : "Add word"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Library View */}
      {view === "library" && (
        <div>
          <div
            className="card"
            style={{
              padding: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              type="search"
              className="input"
              style={{ flex: "1 1 200px" }}
              placeholder="Search words, meanings, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="select"
              style={{ flex: "0 1 150px" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="learning">Learning</option>
              <option value="mastered">Mastered</option>
            </select>
            <select
              className="select"
              style={{ flex: "0 1 160px" }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="select"
              style={{ flex: "0 1 150px" }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
            >
              <option value="newest">Recently added</option>
              <option value="oldest">Oldest first</option>
              <option value="alphabetical">A-Z</option>
            </select>
          </div>

          {filteredWords.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📚</div>
              <h3 style={{ marginTop: 12, fontSize: 18 }}>
                {words.length === 0
                  ? "Your library is empty"
                  : "No matching words"}
              </h3>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: 13,
                  marginTop: 8,
                  marginBottom: 16,
                }}
              >
                {words.length === 0
                  ? "Start building your vocabulary by adding your first word."
                  : "Try changing your search or filters."}
              </p>
              {words.length === 0 && (
                <button className="btn btn-primary" onClick={openAddForm}>
                  Add your first word
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 16,
              }}
            >
              {filteredWords.map((item) => (
                <div
                  className="card word-card"
                  key={item.id}
                  style={{ margin: 0 }}
                >
                  <div className="word-top">
                    <div>
                      <h3>{item.word}</h3>
                      <p>{item.meaning}</p>
                    </div>
                    <span className={`badge badge-${item.status}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  {item.example && (
                    <div className="example-box">
                      <p>Example</p>
                      <p>"{item.example}"</p>
                    </div>
                  )}
                  {(item.synonyms || item.antonyms) && (
                    <div className="meta-row">
                      {item.synonyms && (
                        <span>
                          <b>Syn:</b> {item.synonyms}
                        </span>
                      )}
                      {item.antonyms && (
                        <span>
                          <b>Ant:</b> {item.antonyms}
                        </span>
                      )}
                    </div>
                  )}
                  {item.notes && (
                    <p
                      className="note"
                      style={{ margin: 0, border: 0, padding: 0 }}
                    >
                      {item.notes}
                    </p>
                  )}

                  <div className="word-actions">
                    <span className="badge badge-accent">{item.category}</span>
                    <div style={{ flex: 1 }} />
                    <select
                      className="select"
                      style={{
                        width: "auto",
                        padding: "6px 8px",
                        fontSize: 11,
                        minHeight: "auto",
                      }}
                      value={item.status}
                      onChange={(e) =>
                        updateWordStatus(item.id, e.target.value as WordStatus)
                      }
                    >
                      <option value="new">New</option>
                      <option value="learning">Learning</option>
                      <option value="mastered">Mastered</option>
                    </select>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditForm(item)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteWord(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Flashcards View */}
      {view === "flashcards" && (
        <div>
          {flashcardIds.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🎴</div>
              <h3 style={{ marginTop: 12, fontSize: 18 }}>
                Ready to practise?
              </h3>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: 13,
                  marginTop: 8,
                  marginBottom: 16,
                }}
              >
                Start a flashcard session using your saved vocabulary. We'll
                exclude mastered words if possible.
              </p>
              <button
                className="btn btn-primary"
                onClick={startFlashcards}
                disabled={words.length === 0}
              >
                Start flashcards
              </button>
            </div>
          ) : currentCard ? (
            <div className="card flashcard">
              <div className="fc-header">
                <span>
                  Card {selectedCardIndex + 1} of {flashcardIds.length}
                </span>
                <span>{currentCard.category}</span>
              </div>
              <div className="bar">
                <div
                  className="bar-fill"
                  style={{
                    width: `${((selectedCardIndex + 1) / flashcardIds.length) * 100}%`,
                  }}
                />
              </div>

              <div className="fc-body">
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--muted)",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  What does this word mean?
                </p>
                <h3 className="fc-word">{currentCard.word}</h3>

                {cardRevealed ? (
                  <div className="fc-answer">
                    <p>Meaning</p>
                    <p>{currentCard.meaning}</p>
                    {currentCard.example && (
                      <>
                        <p style={{ marginTop: 12 }}>Example</p>
                        <p
                          style={{ fontStyle: "italic", color: "var(--muted)" }}
                        >
                          "{currentCard.example}"
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 20 }}
                    onClick={() => setCardRevealed(true)}
                  >
                    Reveal meaning (Space)
                  </button>
                )}

                {cardRevealed && (
                  <div className="fc-grades" style={{ width: "100%" }}>
                    <button
                      className="g-new"
                      onClick={() => {
                        updateWordStatus(currentCard.id, "new");
                        nextCard();
                      }}
                    >
                      1. Need practice
                    </button>
                    <button
                      className="g-learning"
                      onClick={() => {
                        updateWordStatus(currentCard.id, "learning");
                        nextCard();
                      }}
                    >
                      2. Getting there
                    </button>
                    <button
                      className="g-mastered"
                      onClick={() => {
                        updateWordStatus(currentCard.id, "mastered");
                        nextCard();
                      }}
                    >
                      3. I know it
                    </button>
                  </div>
                )}
              </div>

              <div
                className="between"
                style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={prevCard}
                  disabled={selectedCardIndex === 0}
                >
                  Previous
                </button>
                <button
                  className="link-btn"
                  onClick={() => setFlashcardIds([])}
                >
                  End session
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={nextCard}
                  disabled={selectedCardIndex === flashcardIds.length - 1}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="empty">
              <div className="empty-icon">🎉</div>
              <h3 style={{ marginTop: 12, fontSize: 18 }}>Session complete!</h3>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: 13,
                  marginTop: 8,
                  marginBottom: 16,
                }}
              >
                You've reviewed all the cards in this deck.
              </p>
              <button className="btn btn-primary" onClick={startFlashcards}>
                Practise again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quiz View */}
      {view === "quiz" && (
        <div className="quiz-card">
          {quizFinished ? (
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>🎉</div>
              <h3 style={{ fontSize: 24, marginTop: 12 }}>Quiz Completed!</h3>
              <p style={{ fontSize: 14, color: "var(--muted)" }}>
                You answered {quizScore} out of {quizQuestions.length}{" "}
                correctly.
              </p>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: "var(--primary)",
                  margin: "20px 0",
                }}
              >
                {getPercent(quizScore, quizQuestions.length)}%
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  marginBottom: 20,
                }}
              >
                {quizScore === quizQuestions.length
                  ? "Perfect score! Excellent work."
                  : quizScore >= quizQuestions.length / 2
                    ? "Good effort. Keep practising to improve."
                    : "Keep learning. Review your vocabulary and try again."}
              </p>
              <div className="row" style={{ justifyContent: "center" }}>
                <button className="btn btn-primary" onClick={startQuiz}>
                  Try another quiz
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setQuizQuestions([]);
                    setQuizFinished(false);
                    setView("library");
                  }}
                >
                  Back to library
                </button>
              </div>
            </div>
          ) : quizQuestions.length === 0 ? (
            <div className="card empty">
              <div className="empty-icon">🧠</div>
              <h3 style={{ marginTop: 12, fontSize: 18 }}>
                Test your vocabulary
              </h3>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: 13,
                  marginTop: 8,
                  marginBottom: 16,
                }}
              >
                Answer multiple-choice questions using your saved words. Each
                quiz contains up to 10 questions.
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  marginBottom: 16,
                }}
              >
                You need at least 4 words saved to start.
              </p>
              <button
                className="btn btn-primary"
                onClick={startQuiz}
                disabled={words.length < 4}
              >
                Start quiz
              </button>
            </div>
          ) : currentQuestion ? (
            <div className="card">
              <div
                className="between"
                style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}
              >
                <span>
                  Question {quizIndex + 1} of {quizQuestions.length}
                </span>
                <span>Score: {quizScore}</span>
              </div>
              <div className="bar" style={{ marginTop: 10, marginBottom: 24 }}>
                <div
                  className="bar-fill"
                  style={{
                    width: `${((quizIndex + 1) / quizQuestions.length) * 100}%`,
                  }}
                />
              </div>
              <p
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--muted)",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                Choose the correct meaning
              </p>
              <h3
                style={{
                  textAlign: "center",
                  fontSize: 28,
                  margin: "16px 0 24px",
                }}
              >
                {words.find((w) => w.id === currentQuestion.wordId)?.word ||
                  "..."}
              </h3>

              <div>
                {currentQuestion.options.map((option, i) => {
                  const isCorrect = option === currentQuestion.correctMeaning;
                  const isSelected = option === quizAnswer;
                  let cls = "";
                  if (quizAnswer) {
                    if (isCorrect) cls = "correct";
                    else if (isSelected) cls = "wrong";
                  }
                  return (
                    <button
                      key={i}
                      className={`quiz-opt ${cls}`}
                      disabled={!!quizAnswer}
                      onClick={() => answerQuestion(option)}
                    >
                      <span className="quiz-letter">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>

              {quizAnswer && (
                <div
                  className={`quiz-feedback ${quizAnswer === currentQuestion.correctMeaning ? "good" : "bad"}`}
                >
                  {quizAnswer === currentQuestion.correctMeaning
                    ? "✅ Correct! Well done."
                    : `❌ Not quite. The correct meaning is: ${currentQuestion.correctMeaning}`}
                </div>
              )}

              <div style={{ textAlign: "right", marginTop: 20 }}>
                <button
                  className="btn btn-primary"
                  onClick={nextQuestion}
                  disabled={!quizAnswer}
                >
                  {quizIndex + 1 === quizQuestions.length
                    ? "See results"
                    : "Next question →"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Import/Export */}
      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Backup & Restore</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
          Export your words as a JSON file to keep a backup. You can import a
          backup on any device. Duplicate words are skipped.
        </p>
        <div className="row" style={{ marginTop: 16 }}>
          <button
            className="btn btn-primary"
            onClick={exportWords}
            disabled={words.length === 0}
          >
            Export vocabulary
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => importRef.current?.click()}
          >
            Import JSON
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={importWords}
          />
        </div>
        <p className="note">
          Your vocabulary is stored locally in this browser. Clearing browser
          data or switching devices will remove it. Keep backups safe.
        </p>
      </div>

      {/* Custom Dialog */}
      {dialog &&
        typeof document !== "undefined" &&
        createPortal(
          <div className={`modal-root ${dark ? "dark" : ""}`}>
            <div className="modal-backdrop" onClick={() => setDialog(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className={`modal-icon ${dialog.tone}`}>
                  {dialog.tone === "danger" ? "⚠️" : "✅"}
                </div>
                <h3 style={{ textAlign: "center" }}>{dialog.title}</h3>
                <p
                  style={{
                    textAlign: "center",
                    color: "var(--muted)",
                    fontSize: 14,
                    margin: "12px 0 20px",
                  }}
                >
                  {dialog.message}
                </p>
                <div className="modal-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setDialog(null)}
                    ref={cancelRef}
                  >
                    {dialog.cancelLabel || "Cancel"}
                  </button>
                  <button
                    className={`btn ${dialog.tone === "danger" ? "btn-danger-solid" : "btn-primary"}`}
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
          document.body,
        )}
    </div>
  );
}
