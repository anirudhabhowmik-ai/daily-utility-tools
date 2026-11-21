"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ToolShell from "../ToolShell";

/* ---------------------------------------------------------------- types */

type CardStatus = "new" | "known" | "review";
type Filter = "all" | "new" | "known" | "review" | "due" | "mastered";
type StudyMode = "flip" | "type" | "quiz";
type SortKey = "due" | "newest" | "oldest" | "az" | "mastery";
type Tone = "idle" | "active" | "success" | "warn";

type Flashcard = {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  hint: string;
  tags: string[];
  status: CardStatus;
  mastery: number; // 0..5
  seen: number;
  correct: number;
  wrong: number;
  lastReviewed: number | null;
  nextDue: number | null;
  createdAt: number;
};

type Deck = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
};

type StudySession = {
  id: string;
  date: string;
  startedAt: number;
  endedAt: number;
  reviewed: number;
  correct: number;
  wrong: number;
  deckId: string;
};

type Settings = {
  dailyGoal: number;
  autoAdvance: boolean;
  soundOn: boolean;
  showHints: boolean;
};

type Persisted = {
  version: 2;
  decks: Deck[];
  cards: Flashcard[];
  sessions: StudySession[];
  settings: Settings;
  activeDeckId: string;
};

type ConfirmDialog = {
  kind: "confirm";
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
};

type PromptDialog = {
  kind: "prompt";
  title: string;
  body?: string;
  initialValue: string;
  confirmLabel: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
};

type Dialog = ConfirmDialog | PromptDialog | null;

/* ------------------------------------------------------------ constants */

const STORAGE_KEY = "toolsab-flashcard-maker-v2";
const LEGACY_KEY = "toolsab-flashcard-maker-v1";

const DECK_COLORS = [
  "#ff5a1f",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
];

const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 20,
  autoAdvance: true,
  soundOn: true,
  showHints: true,
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "due", label: "Due now" },
  { id: "new", label: "New" },
  { id: "review", label: "Review" },
  { id: "known", label: "Known" },
  { id: "mastered", label: "Mastered" },
];

const STUDY_MODES: { id: StudyMode; label: string; icon: string; hint: string }[] = [
  { id: "flip", label: "Flip", icon: "🔄", hint: "Reveal answer" },
  { id: "type", label: "Type", icon: "⌨️", hint: "Self-test" },
  { id: "quiz", label: "Quiz", icon: "🎯", hint: "Choose answer" },
];

const MASTERY_LABELS = ["New", "Learning", "Familiar", "Strong", "Confident", "Mastered"];
const MASTERY_DAYS = [0, 1, 2, 4, 8, 16, 32];

/* -------------------------------------------------------------- helpers */

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function isDue(card: Flashcard, now = Date.now()) {
  if (card.status === "known" && card.mastery >= 5) return false;
  if (card.nextDue === null) return card.status === "new" || card.status === "review";
  return card.nextDue <= now;
}

function nextDueDate(mastery: number) {
  const days = MASTERY_DAYS[Math.min(MASTERY_DAYS.length - 1, mastery)];
  return Date.now() + days * 86400000;
}

function isFlashcard(value: unknown): value is Flashcard {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.deckId === "string" &&
    typeof v.question === "string" &&
    typeof v.answer === "string" &&
    (v.status === "new" || v.status === "known" || v.status === "review")
  );
}

function isDeck(value: unknown): value is Deck {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.color === "string" &&
    typeof v.createdAt === "number"
  );
}

function isSession(value: unknown): value is StudySession {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.date === "string" &&
    typeof v.reviewed === "number"
  );
}

/* ------------------------------------------------------------ component */

export default function FlashcardMaker() {
  const [hydrated, setHydrated] = useState(false);

  /* ---- data ---- */
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeDeckId, setActiveDeckId] = useState<string>("");

  /* ---- editor ---- */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [editorDeckId, setEditorDeckId] = useState("");

  /* ---- study ---- */
  const [filter, setFilter] = useState<Filter>("all");
  const [mode, setMode] = useState<StudyMode>("flip");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [quizChoices, setQuizChoices] = useState<string[]>([]);
  const [quizPicked, setQuizPicked] = useState<string | null>(null);
  const [deckOrder, setDeckOrder] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [search, setSearch] = useState("");

  /* ---- session ---- */
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [sessionReviewed, setSessionReviewed] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);

  /* ---- ui ---- */
  const [notice, setNotice] = useState("");
  const [tone, setTone] = useState<Tone>("idle");
  const [showStats, setShowStats] = useState(true);
  const [showLibrary, setShowLibrary] = useState(true);
  const [showBackup, setShowBackup] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  /* ---- dialogs (custom UI, not window.confirm/prompt) ---- */
  const [dialog, setDialog] = useState<Dialog>(null);
  const [promptValue, setPromptValue] = useState("");

  /* ---- undo ---- */
  const undoRef = useRef<{ cards: Flashcard[]; label: string } | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  /* ---- refs ---- */
  const cardsRef = useRef<Flashcard[]>([]);
  const noticeTimerRef = useRef<number | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const baseTitleRef = useRef<string>("");
  const sessionRef = useRef({
    start: null as number | null,
    reviewed: 0,
    correct: 0,
    wrong: 0,
    deckId: "",
  });

  /* Keep cardsRef in sync for saveUndo / beforeunload. */
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  /* Keep sessionRef in sync. */
  useEffect(() => {
    sessionRef.current = {
      start: sessionStart,
      reviewed: sessionReviewed,
      correct: sessionCorrect,
      wrong: sessionWrong,
      deckId: activeDeckId,
    };
  }, [sessionStart, sessionReviewed, sessionCorrect, sessionWrong, activeDeckId]);

  /* -------------------------------------------------------------- hydrate */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const data = JSON.parse(saved) as Partial<Persisted>;

        if (Array.isArray(data.decks)) {
          const validDecks = data.decks.filter(isDeck);
          if (validDecks.length > 0) setDecks(validDecks);
        }
        if (Array.isArray(data.cards)) {
          setCards(data.cards.filter(isFlashcard));
        }
        if (Array.isArray(data.sessions)) {
          setSessions(data.sessions.filter(isSession));
        }
        if (data.settings && typeof data.settings === "object") {
          setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        }
        if (typeof data.activeDeckId === "string" && data.activeDeckId) {
          setActiveDeckId(data.activeDeckId);
        }
      } else {
        // Migrate v1
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          try {
            const arr = JSON.parse(legacy);
            if (Array.isArray(arr)) {
              const defaultDeckId = createId();
              const migrated: Flashcard[] = arr
                .filter(
                  (item: unknown): item is {
                    id: string;
                    question: string;
                    answer: string;
                    status: CardStatus;
                  } =>
                    !!item &&
                    typeof item === "object" &&
                    typeof (item as Record<string, unknown>).id === "string" &&
                    typeof (item as Record<string, unknown>).question === "string" &&
                    typeof (item as Record<string, unknown>).answer === "string"
                )
                .map((item) => ({
                  id: createId(),
                  deckId: defaultDeckId,
                  question: item.question,
                  answer: item.answer,
                  hint: "",
                  tags: [],
                  status: item.status ?? "new",
                  mastery: item.status === "known" ? 3 : 0,
                  seen: 0,
                  correct: 0,
                  wrong: 0,
                  lastReviewed: null,
                  nextDue: null,
                  createdAt: Date.now(),
                }));
              if (migrated.length > 0) {
                setDecks([
                  {
                    id: defaultDeckId,
                    name: "My deck",
                    color: DECK_COLORS[0],
                    createdAt: Date.now(),
                  },
                ]);
                setCards(migrated);
                setActiveDeckId(defaultDeckId);
              }
            }
          } catch {
            /* ignore migration errors */
          }
        }
      }
    } catch {
      setNotice("Saved data could not be loaded. You can still create new cards.");
    } finally {
      setHydrated(true);
    }
  }, []);

  /* Bootstrap a default deck if none exist after hydration. */
  useEffect(() => {
    if (!hydrated) return;
    if (decks.length === 0) {
      const id = createId();
      const deck: Deck = {
        id,
        name: "My deck",
        color: DECK_COLORS[0],
        createdAt: Date.now(),
      };
      setDecks([deck]);
      setActiveDeckId(id);
    } else if (!activeDeckId || !decks.some((d) => d.id === activeDeckId)) {
      setActiveDeckId(decks[0].id);
    }
  }, [hydrated, decks, activeDeckId]);

  /* ---------------------------------------------------------- persistence */

  useEffect(() => {
    if (!hydrated || decks.length === 0) return;
    const payload: Persisted = {
      version: 2,
      decks,
      cards,
      sessions,
      settings,
      activeDeckId,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      setNotice("Browser storage is full. Export a backup and remove older cards.");
    }
  }, [hydrated, decks, cards, sessions, settings, activeDeckId]);

  /* -------------------------------------------------------- tab title */

  useEffect(() => {
    baseTitleRef.current = document.title;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const active = decks.find((d) => d.id === activeDeckId);
    if (active && sessionStart !== null) {
      document.title = `Studying · ${active.name}`;
    } else if (baseTitleRef.current) {
      document.title = baseTitleRef.current;
    }
  }, [hydrated, decks, activeDeckId, sessionStart]);

  /* -------------------------------------------------------------- sound */

  const playBeep = useCallback(
    (kind: "correct" | "wrong") => {
      if (!settings.soundOn) return;
      try {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctor) return;
        if (!audioRef.current) audioRef.current = new Ctor();
        const ctx = audioRef.current;
        if (ctx.state === "suspended") void ctx.resume();

        const notes = kind === "correct" ? [659.25, 880] : [329.63, 261.63];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = ctx.currentTime + i * 0.09;
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.3);
        });
      } catch {
        /* audio is a bonus */
      }
    },
    [settings.soundOn]
  );

  /* -------------------------------------------------------------- derive */

  const activeDeck = decks.find((d) => d.id === activeDeckId) ?? decks[0];

  const deckCards = useMemo(
    () => cards.filter((c) => c.deckId === activeDeckId),
    [cards, activeDeckId]
  );

  const searchedCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return deckCards;
    return deckCards.filter((c) => {
      const hay = `${c.question} ${c.answer} ${c.hint} ${c.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [deckCards, search]);

  const filteredCards = useMemo(() => {
    let filtered = searchedCards.filter((card) => {
      if (filter === "all") return true;
      if (filter === "due") return isDue(card);
      if (filter === "mastered") return card.mastery >= 5;
      return card.status === filter;
    });

    if (deckOrder.length > 0) {
      const orderMap = new Map(deckOrder.map((id, i) => [id, i]));
      filtered = [...filtered].sort(
        (a, b) =>
          (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER)
      );
      return filtered;
    }

    switch (sortKey) {
      case "due":
        return [...filtered].sort((a, b) => {
          const aDue = a.nextDue ?? 0;
          const bDue = b.nextDue ?? 0;
          if (aDue === bDue) return a.createdAt - b.createdAt;
          return aDue - bDue;
        });
      case "newest":
        return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
      case "oldest":
        return [...filtered].sort((a, b) => a.createdAt - b.createdAt);
      case "az":
        return [...filtered].sort((a, b) => a.question.localeCompare(b.question));
      case "mastery":
        return [...filtered].sort((a, b) => a.mastery - b.mastery);
      default:
        return filtered;
    }
  }, [searchedCards, filter, deckOrder, sortKey]);

  const currentCard = filteredCards[currentIndex];

  const todayKey = getLocalDateKey();
  const todaySessions = useMemo(
    () => sessions.filter((s) => s.date === todayKey),
    [sessions, todayKey]
  );
  const todayReviewed = todaySessions.reduce((t, s) => t + s.reviewed, 0);
  const todayCorrect = todaySessions.reduce((t, s) => t + s.correct, 0);
  const todayWrong = todaySessions.reduce((t, s) => t + s.wrong, 0);

  const goalProgress = Math.min(100, (todayReviewed / Math.max(1, settings.dailyGoal)) * 100);

  const totalMastered = deckCards.filter((c) => c.mastery >= 5).length;
  const masteredPercent =
    deckCards.length > 0 ? Math.round((totalMastered / deckCards.length) * 100) : 0;

  const accuracyToday =
    todayReviewed > 0 ? Math.round((todayCorrect / todayReviewed) * 100) : 0;

  const dueCount = deckCards.filter((c) => isDue(c)).length;

  const streaks = useMemo(() => {
    const days = new Set(sessions.map((s) => s.date));
    let current = 0;
    const cursor = new Date();
    if (!days.has(getLocalDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(getLocalDateKey(cursor))) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    const sorted = [...days].sort();
    let best = 0;
    let run = 0;
    let prev: string | null = null;
    for (const day of sorted) {
      if (prev) {
        const a = new Date(`${prev}T00:00:00`).getTime();
        const b = new Date(`${day}T00:00:00`).getTime();
        run = Math.round((b - a) / 86400000) === 1 ? run + 1 : 1;
      } else run = 1;
      best = Math.max(best, run);
      prev = day;
    }
    return { current, best: Math.max(best, current) };
  }, [sessions]);

  const weekly = useMemo(() => {
    const days: { key: string; label: string; total: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = getLocalDateKey(date);
      const total = sessions
        .filter((s) => s.date === key)
        .reduce((sum, s) => sum + s.reviewed, 0);
      days.push({
        key,
        label: new Intl.DateTimeFormat(undefined, { weekday: "short" })
          .format(date)
          .slice(0, 2),
        total,
        isToday: i === 0,
      });
    }
    return days;
  }, [sessions]);

  const weekMax = Math.max(...weekly.map((d) => d.total), settings.dailyGoal) * 1.1;

  const deckStats = useMemo(() => {
    return decks.map((deck) => {
      const deckCardsLocal = cards.filter((c) => c.deckId === deck.id);
      const mastered = deckCardsLocal.filter((c) => c.mastery >= 5).length;
      const due = deckCardsLocal.filter((c) => isDue(c)).length;
      return {
        ...deck,
        total: deckCardsLocal.length,
        mastered,
        due,
      };
    });
  }, [decks, cards]);

  /* -------------------------------------------------------------- notices */

  const flashNotice = useCallback((msg: string, kind: Tone = "idle") => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    setNotice(msg);
    setTone(kind);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
      setTone("idle");
      noticeTimerRef.current = null;
    }, 3200);
  }, []);

  /* -------------------------------------------------------------- undo */

  const saveUndo = useCallback((label: string) => {
    undoRef.current = { cards: [...cardsRef.current], label };
    setCanUndo(true);
  }, []);

  const undo = useCallback(() => {
    if (!undoRef.current) return;
    setCards(undoRef.current.cards);
    flashNotice(`Undid: ${undoRef.current.label}`, "warn");
    undoRef.current = null;
    setCanUndo(false);
  }, [flashNotice]);

  /* -------------------------------------------------------------- dialog helpers */

  const openConfirm = useCallback(
    (cfg: Omit<ConfirmDialog, "kind" | "cancelLabel"> & { cancelLabel?: string }) => {
      setDialog({ kind: "confirm", ...cfg });
    },
    []
  );

  const openPrompt = useCallback(
    (cfg: Omit<PromptDialog, "kind">) => {
      setPromptValue(cfg.initialValue);
      setDialog({ kind: "prompt", ...cfg });
    },
    []
  );

  const closeDialog = useCallback(() => {
    setDialog(null);
    setPromptValue("");
  }, []);

  /* ---------------------------------------------------------- editor actions */

  const resetEditor = useCallback(() => {
    setEditingId(null);
    setQuestion("");
    setAnswer("");
    setHint("");
    setTagInput("");
    setEditorDeckId(activeDeckId);
  }, [activeDeckId]);

  useEffect(() => {
    if (decks.length === 0) return;
    if (!editorDeckId || !decks.some((d) => d.id === editorDeckId)) {
      setEditorDeckId(activeDeckId || decks[0].id);
    }
  }, [decks, activeDeckId, editorDeckId]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const q = question.trim();
      const a = answer.trim();
      if (!q || !a) {
        flashNotice("Please enter both a question and an answer.", "warn");
        return;
      }
      const tags = tagInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8);

      const targetDeck = decks.find((d) => d.id === editorDeckId) ?? decks[0];
      if (!targetDeck) {
        flashNotice("Create a deck first.", "warn");
        return;
      }

      if (editingId) {
        saveUndo("Edit card");
        setCards((prev) =>
          prev.map((c) =>
            c.id === editingId
              ? { ...c, question: q, answer: a, hint: hint.trim(), tags, deckId: targetDeck.id }
              : c
          )
        );
        flashNotice("Flashcard updated.", "success");
      } else {
        const card: Flashcard = {
          id: createId(),
          deckId: targetDeck.id,
          question: q,
          answer: a,
          hint: hint.trim(),
          tags,
          status: "new",
          mastery: 0,
          seen: 0,
          correct: 0,
          wrong: 0,
          lastReviewed: null,
          nextDue: null,
          createdAt: Date.now(),
        };
        setCards((prev) => [card, ...prev]);
        setFilter("all");
        setDeckOrder([]);
        setCurrentIndex(0);
        setFlipped(false);
        flashNotice("Flashcard added.", "success");
      }
      resetEditor();
    },
    [question, answer, hint, tagInput, editingId, decks, editorDeckId, saveUndo, flashNotice, resetEditor]
  );

  const editCard = useCallback(
    (card: Flashcard) => {
      setEditingId(card.id);
      setQuestion(card.question);
      setAnswer(card.answer);
      setHint(card.hint);
      setTagInput(card.tags.join(", "));
      setEditorDeckId(card.deckId);
      setNotice("");
      document.getElementById("fc-editor")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    },
    []
  );

  const deleteCard = useCallback(
    (id: string) => {
      openConfirm({
        title: "Delete this flashcard?",
        body: "This will remove the card from your deck. You can undo this action once with the Undo button.",
        confirmLabel: "Delete card",
        danger: true,
        onConfirm: () => {
          saveUndo("Delete card");
          setCards((prev) => prev.filter((c) => c.id !== id));
          setDeckOrder([]);
          setCurrentIndex(0);
          setFlipped(false);
          if (editingId === id) resetEditor();
          flashNotice("Flashcard deleted.", "success");
        },
      });
    },
    [openConfirm, saveUndo, editingId, resetEditor, flashNotice]
  );

  /* ------------------------------------------------------------ study actions */

  const recordReview = useCallback((correct: boolean) => {
    setSessionReviewed((v) => v + 1);
    if (correct) setSessionCorrect((v) => v + 1);
    else setSessionWrong((v) => v + 1);
  }, []);

  const applyMastery = useCallback((cardId: string, correct: boolean) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const mastery = correct
          ? Math.min(5, c.mastery + 1)
          : Math.max(0, c.mastery - 1);
        return {
          ...c,
          mastery,
          status: correct
            ? mastery >= 3
              ? "known"
              : "new"
            : "review",
          seen: c.seen + 1,
          correct: c.correct + (correct ? 1 : 0),
          wrong: c.wrong + (correct ? 0 : 1),
          lastReviewed: Date.now(),
          nextDue: correct ? nextDueDate(mastery) : Date.now(),
        };
      })
    );
  }, []);

  const markCard = useCallback(
    (correct: boolean) => {
      if (!currentCard) return;
      applyMastery(currentCard.id, correct);
      recordReview(correct);
      playBeep(correct ? "correct" : "wrong");
      flashNotice(
        correct ? "Marked as known." : "Marked for review.",
        correct ? "success" : "warn"
      );
      setFlipped(false);
      setTypedAnswer("");
      setQuizPicked(null);

      if (settings.autoAdvance && currentIndex < filteredCards.length - 1) {
        setCurrentIndex((v) => v + 1);
      }
    },
    [
      currentCard,
      applyMastery,
      recordReview,
      playBeep,
      flashNotice,
      settings.autoAdvance,
      currentIndex,
      filteredCards.length,
    ]
  );

  const goToCard = useCallback(
    (index: number) => {
      if (filteredCards.length === 0) return;
      const clamped = Math.max(0, Math.min(index, filteredCards.length - 1));
      setCurrentIndex(clamped);
      setFlipped(false);
      setTypedAnswer("");
      setQuizPicked(null);
    },
    [filteredCards.length]
  );

  const changeFilter = useCallback((next: Filter) => {
    setFilter(next);
    setCurrentIndex(0);
    setFlipped(false);
    setTypedAnswer("");
    setQuizPicked(null);
    setDeckOrder([]);
  }, []);

  const shuffleDeck = useCallback(() => {
    if (filteredCards.length < 2) return;
    const shuffled = shuffleArray(filteredCards.map((c) => c.id));
    setDeckOrder(shuffled);
    setCurrentIndex(0);
    setFlipped(false);
    setTypedAnswer("");
    setQuizPicked(null);
    flashNotice("Deck shuffled.", "success");
  }, [filteredCards, flashNotice]);

  const handleModeChange = useCallback((next: StudyMode) => {
    setMode(next);
    setFlipped(false);
    setTypedAnswer("");
    setQuizPicked(null);
  }, []);

  /* ------------------------------------------------------- quiz choices */

  useEffect(() => {
    if (!currentCard || mode !== "quiz") {
      setQuizChoices([]);
      setQuizPicked(null);
      return;
    }
    const others = deckCards
      .filter((c) => c.id !== currentCard.id && c.answer !== currentCard.answer)
      .map((c) => c.answer);
    const uniqueOthers = Array.from(new Set(others));
    const picks = shuffleArray(uniqueOthers).slice(0, 3);
    const options = shuffleArray([currentCard.answer, ...picks]);
    setQuizChoices(options);
    setQuizPicked(null);
    setTypedAnswer("");
    setFlipped(false);
  }, [currentCard, mode, deckCards]);

  /* ------------------------------------------------------ session mgmt */

  const startSessionIfNeeded = useCallback(() => {
    if (sessionRef.current.start === null) setSessionStart(Date.now());
  }, []);

  const finishSessionIfActive = useCallback(() => {
    const snap = sessionRef.current;
    if (snap.start === null) return;
    if (snap.reviewed === 0) {
      setSessionStart(null);
      return;
    }
    const endedAt = Date.now();
    const entry: StudySession = {
      id: createId(),
      date: getLocalDateKey(new Date(endedAt)),
      startedAt: snap.start,
      endedAt,
      reviewed: snap.reviewed,
      correct: snap.correct,
      wrong: snap.wrong,
      deckId: snap.deckId,
    };
    setSessions((prev) => [entry, ...prev]);
    setSessionStart(null);
    setSessionReviewed(0);
    setSessionCorrect(0);
    setSessionWrong(0);
  }, []);

  /* Auto-commit session on tab close so streaks aren't lost. */
  useEffect(() => {
    const onBeforeUnload = () => {
      const snap = sessionRef.current;
      if (snap.start !== null && snap.reviewed > 0) {
        const endedAt = Date.now();
        const entry: StudySession = {
          id: createId(),
          date: getLocalDateKey(new Date(endedAt)),
          startedAt: snap.start,
          endedAt,
          reviewed: snap.reviewed,
          correct: snap.correct,
          wrong: snap.wrong,
          deckId: snap.deckId,
        };
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const data = raw ? JSON.parse(raw) : null;
          if (data && Array.isArray(data.sessions)) {
            data.sessions = [entry, ...data.sessions];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          }
        } catch {
          /* best-effort */
        }
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  /* --------------------------------------------------------------- decks */

  const addDeck = useCallback(() => {
    openPrompt({
      title: "Create a new deck",
      body: "Give it a name. You can rename or delete it later.",
      initialValue: "",
      confirmLabel: "Create deck",
      placeholder: "e.g. Biology — Chapter 4",
      onConfirm: (raw) => {
        const name = raw.trim();
        if (!name) {
          flashNotice("Deck name cannot be empty.", "warn");
          return;
        }
        const id = createId();
        const deck: Deck = {
          id,
          name,
          color: DECK_COLORS[decks.length % DECK_COLORS.length],
          createdAt: Date.now(),
        };
        setDecks((prev) => [...prev, deck]);
        setActiveDeckId(id);
        flashNotice(`Deck "${name}" created.`, "success");
      },
    });
  }, [decks, openPrompt, flashNotice]);

  const renameDeck = useCallback(
    (id: string) => {
      const deck = decks.find((d) => d.id === id);
      if (!deck) return;
      openPrompt({
        title: "Rename deck",
        initialValue: deck.name,
        confirmLabel: "Save name",
        placeholder: deck.name,
        onConfirm: (raw) => {
          const name = raw.trim();
          if (!name) {
            flashNotice("Deck name cannot be empty.", "warn");
            return;
          }
          setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
          flashNotice("Deck renamed.", "success");
        },
      });
    },
    [decks, openPrompt, flashNotice]
  );

  const deleteDeck = useCallback(
    (id: string) => {
      if (decks.length <= 1) {
        flashNotice("Keep at least one deck.", "warn");
        return;
      }
      const deck = decks.find((d) => d.id === id);
      if (!deck) return;
      openConfirm({
        title: `Delete deck "${deck.name}"?`,
        body: "All cards inside this deck will be permanently removed. Study sessions stay in your history.",
        confirmLabel: "Delete deck",
        danger: true,
        onConfirm: () => {
          setDecks((prev) => prev.filter((d) => d.id !== id));
          setCards((prev) => prev.filter((c) => c.deckId !== id));
          if (activeDeckId === id) {
            const next = decks.find((d) => d.id !== id);
            if (next) setActiveDeckId(next.id);
          }
          flashNotice("Deck deleted.", "success");
        },
      });
    },
    [decks, activeDeckId, openConfirm, flashNotice]
  );

  const resetDeckProgress = useCallback(() => {
    openConfirm({
      title: "Reset progress for this deck?",
      body: "Mastery, seen counts and due dates will be cleared. You can undo once.",
      confirmLabel: "Reset progress",
      danger: true,
      onConfirm: () => {
        saveUndo("Reset deck progress");
        setCards((prev) =>
          prev.map((c) =>
            c.deckId === activeDeckId
              ? {
                  ...c,
                  mastery: 0,
                  status: "new",
                  seen: 0,
                  correct: 0,
                  wrong: 0,
                  lastReviewed: null,
                  nextDue: null,
                }
              : c
          )
        );
        flashNotice("Deck progress reset.", "success");
      },
    });
  }, [activeDeckId, openConfirm, saveUndo, flashNotice]);

  /* ----------------------------------------------------------- import/export */

  const exportJSON = useCallback(() => {
    if (cards.length === 0) {
      flashNotice("Add some flashcards before exporting.", "warn");
      return;
    }
    const blob = new Blob(
      [JSON.stringify({ version: 2, decks, cards, sessions, settings }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `toolsab-flashcards-${getLocalDateKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    flashNotice("Exported JSON backup.", "success");
  }, [cards, decks, sessions, settings, flashNotice]);

  const exportCSV = useCallback(() => {
    if (deckCards.length === 0) {
      flashNotice("This deck has no cards to export.", "warn");
      return;
    }
    const rows = [
      ["question", "answer", "hint", "tags", "mastery", "status"],
      ...deckCards.map((c) => [
        c.question,
        c.answer,
        c.hint,
        c.tags.join("|"),
        String(c.mastery),
        c.status,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `toolsab-deck-${getLocalDateKey()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    flashNotice("Exported CSV.", "success");
  }, [deckCards, flashNotice]);

  const importFiles = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const isJSON = file.name.endsWith(".json");
        const isCSV = file.name.endsWith(".csv");
        const targetDeck = decks.find((d) => d.id === editorDeckId) ?? decks[0];
        if (!targetDeck) throw new Error("No deck");

        const imported: Flashcard[] = [];

        if (isJSON) {
          const parsed = JSON.parse(text) as unknown;
          const arr = Array.isArray(parsed)
            ? parsed
            : (parsed as { cards?: unknown })?.cards;
          if (!Array.isArray(arr)) throw new Error("Invalid JSON");
          for (const item of arr) {
            const v = item as Record<string, unknown>;
            if (
              !v ||
              typeof v.question !== "string" ||
              typeof v.answer !== "string" ||
              !v.question.trim() ||
              !v.answer.trim()
            )
              continue;
            imported.push({
              id: createId(),
              deckId: targetDeck.id,
              question: v.question.trim(),
              answer: v.answer.trim(),
              hint: typeof v.hint === "string" ? v.hint : "",
              tags: Array.isArray(v.tags)
                ? v.tags.filter((t): t is string => typeof t === "string").slice(0, 8)
                : [],
              status:
                v.status === "known" || v.status === "review" ? v.status : "new",
              mastery:
                typeof v.mastery === "number"
                  ? Math.max(0, Math.min(5, Math.round(v.mastery)))
                  : 0,
              seen: 0,
              correct: 0,
              wrong: 0,
              lastReviewed: null,
              nextDue: null,
              createdAt: Date.now(),
            });
          }
        } else if (isCSV) {
          const lines = text.split(/\r?\n/).filter(Boolean);
          if (lines.length < 2) throw new Error("Empty CSV");
          const parseCSVLine = (line: string): string[] => {
            const out: string[] = [];
            let cur = "";
            let inQ = false;
            for (let i = 0; i < line.length; i += 1) {
              const ch = line[i];
              if (inQ) {
                if (ch === '"' && line[i + 1] === '"') {
                  cur += '"';
                  i += 1;
                } else if (ch === '"') inQ = false;
                else cur += ch;
              } else if (ch === '"') inQ = true;
              else if (ch === ",") {
                out.push(cur);
                cur = "";
              } else cur += ch;
            }
            out.push(cur);
            return out;
          };
          const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
          const qIdx = header.indexOf("question");
          const aIdx = header.indexOf("answer");
          const hIdx = header.indexOf("hint");
          const tIdx = header.indexOf("tags");
          if (qIdx === -1 || aIdx === -1) throw new Error("Missing columns");
          for (let i = 1; i < lines.length; i += 1) {
            const cols = parseCSVLine(lines[i]);
            const q = (cols[qIdx] ?? "").trim();
            const a = (cols[aIdx] ?? "").trim();
            if (!q || !a) continue;
            imported.push({
              id: createId(),
              deckId: targetDeck.id,
              question: q,
              answer: a,
              hint: hIdx >= 0 ? (cols[hIdx] ?? "").trim() : "",
              tags:
                tIdx >= 0
                  ? (cols[tIdx] ?? "")
                      .split("|")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .slice(0, 8)
                  : [],
              status: "new",
              mastery: 0,
              seen: 0,
              correct: 0,
              wrong: 0,
              lastReviewed: null,
              nextDue: null,
              createdAt: Date.now(),
            });
          }
        } else {
          throw new Error("Unknown file type");
        }

        if (imported.length === 0) throw new Error("Nothing to import");
        setCards((prev) => [...imported, ...prev]);
        setActiveDeckId(targetDeck.id);
        setFilter("all");
        setDeckOrder([]);
        setCurrentIndex(0);
        setFlipped(false);
        flashNotice(`${imported.length} card(s) imported.`, "success");
      } catch {
        flashNotice("Import failed — file format not recognised.", "warn");
      } finally {
        event.target.value = "";
      }
    },
    [decks, editorDeckId, flashNotice]
  );

  /* ----------------------------------------------------------- reset all */

  const resetAll = useCallback(() => {
    if (cards.length === 0 && decks.length <= 1) {
      flashNotice("Nothing to reset.", "warn");
      return;
    }
    openConfirm({
      title: "Delete everything?",
      body: "Every deck, card and study session will be permanently removed. Export a backup first if you want to keep your data.",
      confirmLabel: "Delete everything",
      danger: true,
      onConfirm: () => {
        setDecks([]);
        setCards([]);
        setSessions([]);
        setActiveDeckId("");
        setCurrentIndex(0);
        setFlipped(false);
        resetEditor();
        flashNotice("Everything reset.", "success");
      },
    });
  }, [cards.length, decks.length, openConfirm, resetEditor, flashNotice]);

  /* ------------------------------------------------------ keyboard */

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      /* If a dialog is open, let the dialog own the keyboard. */
      if (dialog !== null) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        if (event.key === "Escape") {
          (target as HTMLInputElement | HTMLTextAreaElement).blur();
        }
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        if (currentCard && mode === "flip") {
          startSessionIfNeeded();
          setFlipped((v) => !v);
        }
        return;
      }
      if (event.key === "1") {
        if (currentCard) markCard(true);
        return;
      }
      if (event.key === "2") {
        if (currentCard) markCard(false);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToCard(currentIndex + 1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToCard(currentIndex - 1);
        return;
      }
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        shuffleDeck();
        return;
      }
      if (event.key.toLowerCase() === "e" && currentCard) {
        event.preventDefault();
        editCard(currentCard);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentCard, mode, markCard, goToCard, currentIndex, shuffleDeck, editCard, dialog, startSessionIfNeeded]);

  /* ---------------------------------------------------------- render */

  const noticeIcon =
    tone === "success"
      ? "✓"
      : tone === "warn"
      ? "!"
      : tone === "active"
      ? "◉"
      : "◆";

  const sessionLive = sessionReviewed > 0 && sessionStart !== null;

  const typeCorrect =
    currentCard &&
    mode === "type" &&
    typedAnswer.trim().length > 0 &&
    typedAnswer.trim().toLowerCase() === currentCard.answer.trim().toLowerCase();

  const dialogConfirm = () => {
    if (!dialog) return;
    if (dialog.kind === "confirm") {
      dialog.onConfirm();
      closeDialog();
    } else {
      dialog.onConfirm(promptValue);
      closeDialog();
    }
  };

  return (
    <ToolShell title="Flashcard Maker" onReset={resetAll} wide>
      <div className="fc">
        {/* HEADER */}
        <header className="fc-head">
          <div className="fc-head-text">
            <span className="fc-eyebrow">MEMORY ENGINE · PRO</span>
            <h2>Flashcard Maker</h2>
          </div>
          <div className="fc-best">
            <span className="fc-best-label">STREAK</span>
            <strong className="fc-best-value">🔥 {streaks.current}</strong>
          </div>
        </header>

        {/* STAT BAR */}
        <div className="fc-bar">
          <div className="fc-bar-cell">
            <span>REVIEWED TODAY</span>
            <strong>{todayReviewed}</strong>
          </div>
          <div className="fc-bar-sep" />
          <div className="fc-bar-cell">
            <span>ACCURACY</span>
            <strong>{accuracyToday}%</strong>
          </div>
          <div className="fc-bar-sep" />
          <div className="fc-bar-cell">
            <span>DUE NOW</span>
            <strong>{dueCount}</strong>
          </div>
          <div className="fc-bar-sep" />
          <div className="fc-bar-cell">
            <span>MASTERED</span>
            <strong>{masteredPercent}%</strong>
          </div>
        </div>

        {/* DECK SELECTOR */}
        <div className="fc-decks" role="tablist" aria-label="Decks">
          {deckStats.map((deck) => (
            <button
              key={deck.id}
              role="tab"
              aria-selected={activeDeckId === deck.id}
              className={`fc-deck ${activeDeckId === deck.id ? "is-active" : ""}`}
              onClick={() => {
                if (activeDeckId === deck.id) return;
                finishSessionIfActive();
                setActiveDeckId(deck.id);
                setCurrentIndex(0);
                setFlipped(false);
                setDeckOrder([]);
                setTypedAnswer("");
                setQuizPicked(null);
              }}
            >
              <span
                className="fc-deck-dot"
                style={{ background: deck.color }}
              />
              <span className="fc-deck-name">{deck.name}</span>
              <span className="fc-deck-meta">
                {deck.total} {deck.total === 1 ? "card" : "cards"}
                {deck.due > 0 && <span className="fc-deck-due">{deck.due} due</span>}
              </span>
            </button>
          ))}
          <button type="button" className="fc-deck-add" onClick={addDeck} aria-label="Create deck">
            + New deck
          </button>
        </div>

        {/* ACTIVE DECK TOOLS */}
        {activeDeck && (
          <div className="fc-deck-tools">
            <span className="fc-deck-tools-name">{activeDeck.name}</span>
            <div className="fc-deck-tools-btns">
              <button type="button" className="fc-mini-btn" onClick={() => renameDeck(activeDeck.id)}>
                Rename
              </button>
              <button type="button" className="fc-mini-btn" onClick={resetDeckProgress}>
                Reset progress
              </button>
              <button
                type="button"
                className="fc-mini-btn fc-mini-btn-danger"
                onClick={() => deleteDeck(activeDeck.id)}
              >
                Delete deck
              </button>
            </div>
          </div>
        )}

        {/* GOAL RING + SESSION */}
        <div className="fc-goal">
          <div className="fc-goal-ring-wrap">
            <svg className="fc-goal-ring" viewBox="0 0 80 80" aria-hidden="true">
              <circle cx="40" cy="40" r="34" className="fc-goal-ring-track" />
              <circle
                cx="40"
                cy="40"
                r="34"
                className="fc-goal-ring-fill"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 * (1 - goalProgress / 100)}
                transform="rotate(-90 40 40)"
              />
            </svg>
            <div className="fc-goal-ring-center">
              <strong>{Math.round(goalProgress)}%</strong>
              <span>{todayReviewed}/{settings.dailyGoal}</span>
            </div>
          </div>
          <div className="fc-goal-text">
            <div className="fc-goal-top">
              <span>Daily review goal · {settings.dailyGoal} cards</span>
              <select
                className="fc-goal-select"
                value={settings.dailyGoal}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, dailyGoal: Number(e.target.value) }))
                }
                aria-label="Daily goal"
              >
                {[5, 10, 15, 20, 30, 50, 75, 100].map((n) => (
                  <option key={n} value={n}>{n} cards</option>
                ))}
              </select>
            </div>
            <div className="fc-goal-track">
              <div
                className={`fc-goal-fill ${goalProgress >= 100 ? "is-done" : ""}`}
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <p className="fc-goal-meta">
              {goalProgress >= 100
                ? "Goal reached — nice work 🎉"
                : `${Math.max(0, settings.dailyGoal - todayReviewed)} reviews to go`}
              {sessionLive && (
                <span className="fc-goal-live">
                  {" "}· Session: {sessionReviewed} reviewed ({sessionCorrect} ✓ / {sessionWrong} ✗)
                </span>
              )}
            </p>
          </div>
          {sessionLive && (
            <button type="button" className="fc-mini-btn" onClick={finishSessionIfActive}>
              End session
            </button>
          )}
        </div>

        {/* EDITOR */}
        <section id="fc-editor" className="fc-editor">
          <div className="fc-editor-head">
            <div>
              <h3>{editingId ? "Edit flashcard" : "Create a flashcard"}</h3>
              <p>Question on one side, answer on the other. Tags help you filter later.</p>
            </div>
            {editingId && (
              <button type="button" className="fc-mini-btn" onClick={resetEditor}>
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="fc-form">
            <label className="fc-field">
              <span>Question / front</span>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="What is the capital of France?"
              />
            </label>
            <label className="fc-field">
              <span>Answer / back</span>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Paris"
              />
            </label>
            <div className="fc-row">
              <label className="fc-field">
                <span>Hint (optional)</span>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  maxLength={200}
                  placeholder="City on the Seine"
                />
              </label>
              <label className="fc-field">
                <span>Tags (comma separated)</span>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  maxLength={200}
                  placeholder="geography, europe"
                />
              </label>
            </div>
            <div className="fc-row">
              <label className="fc-field">
                <span>Deck</span>
                <select
                  value={editorDeckId}
                  onChange={(e) => setEditorDeckId(e.target.value)}
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="fc-form-actions">
              <button type="submit" className="fc-btn fc-btn-pri">
                {editingId ? "Save changes" : "Add flashcard"}
              </button>
              {!editingId && (
                <button type="button" className="fc-btn fc-btn-ghost" onClick={resetEditor}>
                  Clear
                </button>
              )}
              {canUndo && (
                <button type="button" className="fc-btn fc-btn-ghost" onClick={undo}>
                  ↶ Undo
                </button>
              )}
            </div>
          </form>
        </section>

        {/* STUDY */}
        <section className="fc-study">
          <div className="fc-study-head">
            <div>
              <h3>Study session</h3>
              <p>Filter the deck, pick a study mode, and mark cards as you go.</p>
            </div>
            <div className="fc-study-head-right">
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…  ( / )"
                className="fc-search"
                aria-label="Search cards"
              />
              <button
                type="button"
                className="fc-mini-btn"
                onClick={shuffleDeck}
                disabled={filteredCards.length < 2}
              >
                Shuffle
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="fc-filters" role="tablist" aria-label="Filter cards">
            {FILTERS.map((f) => {
              const count =
                f.id === "all"
                  ? deckCards.length
                  : f.id === "due"
                  ? deckCards.filter((c) => isDue(c)).length
                  : f.id === "mastered"
                  ? deckCards.filter((c) => c.mastery >= 5).length
                  : deckCards.filter((c) => c.status === f.id).length;
              return (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={filter === f.id}
                  className={`fc-filter ${filter === f.id ? "is-active" : ""}`}
                  onClick={() => changeFilter(f.id)}
                >
                  {f.label}
                  <span className="fc-filter-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <div className="fc-sort">
            <span>Sort:</span>
            <select
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value as SortKey);
                setDeckOrder([]);
                setCurrentIndex(0);
              }}
              className="fc-sort-select"
              aria-label="Sort cards"
              disabled={deckOrder.length > 0}
            >
              <option value="due">Due first</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="az">A → Z</option>
              <option value="mastery">Lowest mastery</option>
            </select>
            {deckOrder.length > 0 && (
              <span className="fc-sort-hint">Shuffled order active</span>
            )}
          </div>

          {/* Study mode tabs */}
          <div className="fc-mode-strip" role="tablist" aria-label="Study mode">
            {STUDY_MODES.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={mode === m.id}
                className={`fc-mode-btn ${mode === m.id ? "is-active" : ""}`}
                onClick={() => handleModeChange(m.id)}
              >
                <span className="fc-mode-icon">{m.icon}</span>
                <span className="fc-mode-name">{m.label}</span>
                <span className="fc-mode-hint">{m.hint}</span>
              </button>
            ))}
          </div>

          {/* Card area */}
          {currentCard ? (
            <div className="fc-card-wrap">
              <div className="fc-card-top">
                <span className="fc-card-count">
                  Card {currentIndex + 1} of {filteredCards.length}
                </span>
                <div className="fc-card-badges">
                  <span className={`fc-badge fc-badge-${currentCard.status}`}>
                    {currentCard.status === "known"
                      ? "Known"
                      : currentCard.status === "review"
                      ? "Review"
                      : "New"}
                  </span>
                  <span className="fc-badge fc-badge-mastery">
                    Lv {currentCard.mastery} · {MASTERY_LABELS[currentCard.mastery]}
                  </span>
                  {currentCard.nextDue !== null && (
                    <span className="fc-badge fc-badge-due">
                      Due {new Date(currentCard.nextDue).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </div>

              {/* FLIP MODE */}
              {mode === "flip" && (
                <div
                  className="fc-flip-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    startSessionIfNeeded();
                    setFlipped((v) => !v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      startSessionIfNeeded();
                      setFlipped((v) => !v);
                    }
                  }}
                  aria-label={flipped ? "Answer shown — activate to see question" : "Question shown — activate to reveal answer"}
                >
                  <span className="fc-flip-side">
                    {flipped ? "ANSWER" : "QUESTION"}
                  </span>
                  <p className="fc-flip-text">
                    {flipped ? currentCard.answer : currentCard.question}
                  </p>
                  {settings.showHints && currentCard.hint && !flipped && (
                    <p className="fc-flip-hint">Hint: {currentCard.hint}</p>
                  )}
                  <span className="fc-flip-help">
                    {flipped ? "Click to see the question" : "Click or press Space to reveal"}
                  </span>
                </div>
              )}

              {/* TYPE MODE */}
              {mode === "type" && (
                <div className="fc-type-card">
                  <span className="fc-flip-side">QUESTION</span>
                  <p className="fc-flip-text">{currentCard.question}</p>
                  {settings.showHints && currentCard.hint && (
                    <p className="fc-flip-hint">Hint: {currentCard.hint}</p>
                  )}
                  <input
                    type="text"
                    className={`fc-type-input ${typedAnswer ? (typeCorrect ? "is-correct" : "is-wrong") : ""}`}
                    value={typedAnswer}
                    onChange={(e) => {
                      startSessionIfNeeded();
                      setTypedAnswer(e.target.value);
                    }}
                    placeholder="Type your answer…"
                    aria-label="Your answer"
                  />
                  {typedAnswer && (
                    <div className={`fc-type-result ${typeCorrect ? "is-correct" : "is-wrong"}`}>
                      {typeCorrect
                        ? "✓ Correct — nice!"
                        : `✗ Not quite. The answer is: ${currentCard.answer}`}
                    </div>
                  )}
                </div>
              )}

              {/* QUIZ MODE */}
              {mode === "quiz" && (
                <div className="fc-quiz-card">
                  <span className="fc-flip-side">CHOOSE THE ANSWER</span>
                  <p className="fc-flip-text">{currentCard.question}</p>
                  <div className="fc-quiz-grid">
                    {quizChoices.map((choice, i) => {
                      const picked = quizPicked === choice;
                      const isCorrect = choice === currentCard.answer;
                      const show = quizPicked !== null;
                      return (
                        <button
                          key={`${choice}-${i}`}
                          type="button"
                          className={`fc-quiz-choice ${picked ? "is-picked" : ""} ${
                            show && isCorrect ? "is-correct" : ""
                          } ${show && picked && !isCorrect ? "is-wrong" : ""}`}
                          disabled={show}
                          onClick={() => {
                            startSessionIfNeeded();
                            setQuizPicked(choice);
                          }}
                        >
                          <span className="fc-quiz-letter">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="fc-quiz-text">{choice}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Progress */}
              <div className="fc-progress">
                <div className="fc-progress-top">
                  <span>Deck progress</span>
                  <span>{filteredCards.length > 0 ? Math.round(((currentIndex + 1) / filteredCards.length) * 100) : 0}%</span>
                </div>
                <div className="fc-progress-track">
                  <div
                    className="fc-progress-fill"
                    style={{
                      width: `${filteredCards.length > 0 ? ((currentIndex + 1) / filteredCards.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Nav */}
              <div className="fc-nav">
                <button
                  type="button"
                  className="fc-btn fc-btn-sec"
                  onClick={() => goToCard(currentIndex - 1)}
                  disabled={currentIndex === 0}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className="fc-btn fc-btn-sec"
                  onClick={() => goToCard(currentIndex + 1)}
                  disabled={currentIndex === filteredCards.length - 1}
                >
                  Next →
                </button>
              </div>

              {/* Mark buttons */}
              <div className="fc-mark">
                <button
                  type="button"
                  className="fc-mark-btn fc-mark-known"
                  onClick={() => markCard(true)}
                >
                  ✓ I know this <kbd>1</kbd>
                </button>
                <button
                  type="button"
                  className="fc-mark-btn fc-mark-review"
                  onClick={() => markCard(false)}
                >
                  ↻ Needs review <kbd>2</kbd>
                </button>
              </div>
            </div>
          ) : (
            <div className="fc-empty">
              <div className="fc-empty-icon">📚</div>
              <h4>
                {deckCards.length === 0
                  ? "This deck is empty"
                  : "No cards match this filter"}
              </h4>
              <p>
                {deckCards.length === 0
                  ? "Create your first card above — it will show up here ready to study."
                  : "Try another filter, clear the search, or add more cards."}
              </p>
              {deckCards.length > 0 && (
                <button
                  type="button"
                  className="fc-btn fc-btn-pri"
                  onClick={() => {
                    changeFilter("all");
                    setSearch("");
                  }}
                >
                  Show all cards
                </button>
              )}
            </div>
          )}
        </section>

        {/* INSIGHTS */}
        <button
          type="button"
          className="fc-expand"
          onClick={() => setShowStats((v) => !v)}
          aria-expanded={showStats}
        >
          <span>Insights · 7-day reviews · {streaks.current} day streak</span>
          <span className="fc-expand-chev">{showStats ? "−" : "+"}</span>
        </button>

        {showStats && (
          <div className="fc-panel">
            <div className="fc-week">
              <div className="fc-week-bars">
                {weekly.map((day) => {
                  const height = weekMax > 0 ? Math.max(3, (day.total / weekMax) * 100) : 3;
                  return (
                    <div className="fc-week-col" key={day.key}>
                      <div
                        className={`fc-week-bar ${day.isToday ? "is-today" : ""} ${day.total > 0 ? "has-value" : ""}`}
                        style={{ height: `${height}%` }}
                        title={`${day.label}: ${day.total} reviewed`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="fc-week-labels">
                {weekly.map((day) => (
                  <span key={day.key} className={day.isToday ? "is-today" : undefined}>
                    {day.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="fc-week-foot">
              <span>Best day: {Math.max(...weekly.map((d) => d.total))} reviews</span>
              <span>This week: {weekly.reduce((s, d) => s + d.total, 0)} reviews</span>
              <span>Accuracy today: {accuracyToday}%</span>
            </div>
          </div>
        )}

        {/* LIBRARY */}
        <button
          type="button"
          className="fc-expand"
          onClick={() => setShowLibrary((v) => !v)}
          aria-expanded={showLibrary}
        >
          <span>
            Library · {deckCards.length} {deckCards.length === 1 ? "card" : "cards"} in this deck
          </span>
          <span className="fc-expand-chev">{showLibrary ? "−" : "+"}</span>
        </button>

        {showLibrary && (
          <div className="fc-panel">
            {deckCards.length === 0 ? (
              <p className="fc-empty-line">Your saved cards will appear here.</p>
            ) : (
              <div className="fc-library">
                {deckCards
                  .slice()
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((card) => (
                    <div key={card.id} className="fc-library-row">
                      <div className="fc-library-main">
                        <p className="fc-library-q">{card.question}</p>
                        <p className="fc-library-a">{card.answer}</p>
                        <div className="fc-library-meta">
                          <span className={`fc-badge fc-badge-${card.status}`}>
                            {card.status === "known"
                              ? "Known"
                              : card.status === "review"
                              ? "Review"
                              : "New"}
                          </span>
                          <span className="fc-badge fc-badge-mastery">
                            Lv {card.mastery}
                          </span>
                          {card.tags.map((tag) => (
                            <span key={tag} className="fc-tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="fc-library-actions">
                        <button
                          type="button"
                          className="fc-mini-btn"
                          onClick={() => editCard(card)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="fc-mini-btn fc-mini-btn-danger"
                          onClick={() => deleteCard(card.id)}
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

        {/* BACKUP */}
        <button
          type="button"
          className="fc-expand"
          onClick={() => setShowBackup((v) => !v)}
          aria-expanded={showBackup}
        >
          <span>Backup &amp; import · JSON or CSV</span>
          <span className="fc-expand-chev">{showBackup ? "−" : "+"}</span>
        </button>

        {showBackup && (
          <div className="fc-panel">
            <p className="fc-panel-note">
              Export everything as a JSON backup, or export the current deck as CSV.
              CSV imports expect columns <code>question, answer</code> (optional{" "}
              <code>hint, tags</code>). Tags in CSV are separated by <code>|</code>.
            </p>
            <div className="fc-backup-actions">
              <button type="button" className="fc-btn fc-btn-pri" onClick={exportJSON} disabled={cards.length === 0}>
                Export JSON
              </button>
              <button type="button" className="fc-btn fc-btn-sec" onClick={exportCSV} disabled={deckCards.length === 0}>
                Export CSV
              </button>
              <label className="fc-btn fc-btn-sec fc-file-label">
                Import file
                <input
                  type="file"
                  accept=".json,.csv,application/json,text/csv"
                  onChange={importFiles}
                  className="fc-file-input"
                />
              </label>
            </div>
          </div>
        )}

        {/* HELP */}
        <button
          type="button"
          className="fc-expand"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
        >
          <span>How to use</span>
          <span className="fc-expand-chev">{showHelp ? "−" : "+"}</span>
        </button>

        {showHelp && (
          <div className="fc-panel">
            <div className="fc-step">
              <span>01</span>
              <div>
                <strong>Create cards</strong>
                <p>Add a question, an answer, and optional hint or tags. Cards are filed into the selected deck.</p>
              </div>
            </div>
            <div className="fc-step">
              <span>02</span>
              <div>
                <strong>Pick a study mode</strong>
                <p>Flip for quick recall, Type to self-test, or Quiz to choose among plausible answers.</p>
              </div>
            </div>
            <div className="fc-step">
              <span>03</span>
              <div>
                <strong>Mark honestly</strong>
                <p>"I know this" raises a card's mastery and pushes its next review further out. "Needs review" resets it to now.</p>
              </div>
            </div>
            <div className="fc-step">
              <span>04</span>
              <div>
                <strong>Track your streak</strong>
                <p>Each study session counts toward your daily goal, your 7-day chart, and your streak.</p>
              </div>
            </div>
            <div className="fc-step">
              <span>05</span>
              <div>
                <strong>Shortcuts</strong>
                <p>
                  <kbd>Space</kbd> flip · <kbd>1</kbd> known · <kbd>2</kbd> review ·{" "}
                  <kbd>←/→</kbd> navigate · <kbd>S</kbd> shuffle · <kbd>E</kbd> edit ·{" "}
                  <kbd>/</kbd> search
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notice */}
        {notice && (
          <div className={`fc-notice fc-notice-${tone}`} role="status" aria-live="polite">
            <span className="fc-notice-icon">{noticeIcon}</span>
            <span>{notice}</span>
          </div>
        )}

        <p className="fc-note">
          Everything is stored in this browser only. Export a backup before clearing site data.
        </p>

        {/* CUSTOM DIALOG (confirm + prompt) */}
        {dialog && (
          <div
            className="fc-dialog-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fc-dialog-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeDialog();
            }}
          >
            <div className="fc-dialog">
              <h4 id="fc-dialog-title" className="fc-dialog-title">
                {dialog.title}
              </h4>
              {dialog.kind === "confirm" && dialog.body && (
                <p className="fc-dialog-body">{dialog.body}</p>
              )}

              {dialog.kind === "prompt" && (
                <label className="fc-field" style={{ marginTop: 10 }}>
                  {dialog.body && <p className="fc-dialog-body" style={{ margin: 0 }}>{dialog.body}</p>}
                  <input
                    type="text"
                    autoFocus
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        dialogConfirm();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        closeDialog();
                      }
                    }}
                    placeholder={dialog.placeholder}
                    maxLength={80}
                    aria-label="Value"
                  />
                </label>
              )}

              <div className="fc-dialog-actions">
                <button
                  type="button"
                  className="fc-btn fc-btn-ghost"
                  onClick={closeDialog}
                >
                  {dialog.kind === "confirm" ? dialog.cancelLabel ?? "Cancel" : "Cancel"}
                </button>
                <button
                  type="button"
                  autoFocus={dialog.kind === "confirm"}
                  className={`fc-btn ${dialog.kind === "confirm" && dialog.danger ? "fc-btn-danger" : "fc-btn-pri"}`}
                  onClick={dialogConfirm}
                >
                  {dialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .fc {
          --fc-primary: #ff5a1f;
          --fc-primary-dark: #e64a14;
          --fc-primary-soft: #fff3ed;
          --fc-primary-surface: #fff7f3;
          --fc-primary-hover: #ffb69d;
          --fc-text: var(--text-main, #172033);
          --fc-muted: var(--text-muted, #596579);
          --fc-border: var(--border-color, #e8ebf1);
          --fc-surface: var(--card-bg, #ffffff);
          --fc-soft: #fafbfc;

          color: var(--fc-text);
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
        }

        /* header */
        .fc-head {
          display: flex; justify-content: space-between; align-items: center;
          gap: 12px; margin-bottom: 12px;
        }
        .fc-head-text { min-width: 0; }
        .fc-eyebrow {
          display: block; color: var(--fc-primary); font-size: 10px;
          font-weight: 800; letter-spacing: 1.2px; margin-bottom: 3px;
        }
        .fc-head h2 {
          font-size: 20px; font-weight: 800; letter-spacing: -0.5px;
          line-height: 1.2; margin: 0;
        }
        .fc-best {
          display: flex; flex-direction: column; align-items: flex-end; gap: 1px;
          padding: 8px 12px; border: 1px solid var(--fc-border);
          border-radius: 10px; background: linear-gradient(145deg, #fff3ed, #fffaf7);
          flex-shrink: 0;
        }
        .fc-best-label {
          font-size: 8px; font-weight: 800; color: var(--fc-muted); letter-spacing: 1px;
        }
        .fc-best-value {
          font-size: 18px; font-weight: 800; color: var(--fc-primary);
          line-height: 1.1; font-variant-numeric: tabular-nums;
        }

        /* stat bar */
        .fc-bar {
          display: flex; align-items: stretch; border: 1px solid var(--fc-border);
          border-radius: 11px; background: var(--fc-surface); overflow: hidden;
          margin-bottom: 12px;
        }
        .fc-bar-cell {
          flex: 1; min-width: 0; padding: 9px 12px;
          display: flex; flex-direction: column; gap: 3px;
        }
        .fc-bar-cell > span {
          font-size: 8px; font-weight: 800; color: var(--fc-muted); letter-spacing: 0.9px;
        }
        .fc-bar-cell strong {
          font-size: 15px; font-weight: 800; line-height: 1.1;
          font-variant-numeric: tabular-nums; color: var(--fc-text);
        }
        .fc-bar-sep { width: 1px; background: var(--fc-border); flex-shrink: 0; }

        /* decks */
        .fc-decks {
          display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;
        }
        .fc-deck {
          flex: 0 1 auto; display: flex; align-items: center; gap: 6px;
          padding: 7px 12px; border-radius: 10px;
          border: 1px solid var(--fc-border); background: var(--fc-surface);
          color: var(--fc-text); font-size: 11px; font-weight: 700;
          cursor: pointer; transition: all 150ms ease; min-width: 0;
        }
        .fc-deck:hover { border-color: var(--fc-primary-hover); background: var(--fc-primary-surface); }
        .fc-deck.is-active {
          border-color: var(--fc-primary); background: var(--fc-primary-soft);
          color: var(--fc-primary); box-shadow: inset 0 0 0 1px var(--fc-primary);
        }
        .fc-deck-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .fc-deck-name {
          max-width: 130px; overflow: hidden; text-overflow: ellipsis;
          white-space: nowrap; font-weight: 800;
        }
        .fc-deck-meta {
          font-size: 9px; color: var(--fc-muted); font-weight: 700;
          display: inline-flex; align-items: center; gap: 5px;
        }
        .fc-deck.is-active .fc-deck-meta { color: var(--fc-primary); opacity: 0.8; }
        .fc-deck-due {
          font-size: 8px; padding: 1px 5px; border-radius: 999px;
          background: var(--fc-primary); color: #fff; font-weight: 800;
        }
        .fc-deck-add {
          padding: 7px 12px; border-radius: 10px; border: 1px dashed var(--fc-border);
          background: transparent; color: var(--fc-muted); font-size: 11px; font-weight: 800;
          cursor: pointer; transition: all 150ms ease;
        }
        .fc-deck-add:hover { color: var(--fc-primary); border-color: var(--fc-primary-hover); }

        .fc-deck-tools {
          display: flex; justify-content: space-between; align-items: center;
          gap: 10px; flex-wrap: wrap; margin-bottom: 12px;
          padding: 6px 10px; border-radius: 9px; background: var(--fc-soft);
          border: 1px solid var(--fc-border);
        }
        .fc-deck-tools-name { font-size: 11px; font-weight: 800; color: var(--fc-text); }
        .fc-deck-tools-btns { display: flex; gap: 6px; flex-wrap: wrap; }

        .fc-mini-btn {
          padding: 5px 10px; border-radius: 7px; border: 1px solid var(--fc-border);
          background: #fff; color: var(--fc-text); font-size: 10px; font-weight: 800;
          cursor: pointer; transition: all 150ms ease; white-space: nowrap;
        }
        .fc-mini-btn:hover:not(:disabled) {
          border-color: var(--fc-primary-hover); color: var(--fc-primary);
          background: var(--fc-primary-surface);
        }
        .fc-mini-btn:disabled { cursor: not-allowed; opacity: 0.45; }
        .fc-mini-btn-danger { color: #b91c1c; border-color: #fecaca; }
        .fc-mini-btn-danger:hover:not(:disabled) {
          background: #fef2f2; border-color: #fca5a5; color: #991b1b;
        }

        /* goal */
        .fc-goal {
          display: flex; align-items: center; gap: 12px;
          padding: 12px; border: 1px solid var(--fc-border); border-radius: 12px;
          background: var(--fc-surface); margin-bottom: 12px; flex-wrap: wrap;
        }
        .fc-goal-ring-wrap {
          position: relative; width: 72px; height: 72px; flex-shrink: 0;
          display: grid; place-items: center;
        }
        .fc-goal-ring { position: absolute; inset: 0; width: 100%; height: 100%; }
        .fc-goal-ring-track { fill: none; stroke: #eef0f5; stroke-width: 8; }
        .fc-goal-ring-fill {
          fill: none; stroke: var(--fc-primary); stroke-width: 8;
          stroke-linecap: round; transition: stroke-dashoffset 300ms ease;
        }
        .fc-goal-ring-center {
          position: relative; z-index: 1; display: flex;
          flex-direction: column; align-items: center; line-height: 1;
        }
        .fc-goal-ring-center strong {
          font-size: 14px; font-weight: 900; color: var(--fc-text);
          font-variant-numeric: tabular-nums;
        }
        .fc-goal-ring-center span {
          font-size: 8px; color: var(--fc-muted); font-weight: 700; margin-top: 2px;
        }
        .fc-goal-text { flex: 1; min-width: 180px; }
        .fc-goal-top {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px; font-size: 10px; font-weight: 700; color: var(--fc-muted);
          margin-bottom: 6px;
        }
        .fc-goal-select {
          border: 1px dashed transparent; background: transparent;
          color: var(--fc-primary); font: inherit; font-weight: 800;
          padding: 0 2px; border-radius: 5px; cursor: pointer; outline: none;
          transition: all 150ms ease;
        }
        .fc-goal-select:hover {
          border-color: var(--fc-primary-hover); background: var(--fc-primary-surface);
        }
        .fc-goal-select:focus-visible {
          border-color: var(--fc-primary); background: var(--fc-primary-soft);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
        }
        .fc-goal-track {
          height: 7px; border-radius: 999px; background: #eef0f5; overflow: hidden;
        }
        .fc-goal-fill {
          height: 100%; border-radius: inherit;
          background: linear-gradient(90deg, #ff8a4c, #ff5a1f);
          transition: width 260ms ease;
        }
        .fc-goal-fill.is-done {
          background: linear-gradient(90deg, #34d399, #10b981);
        }
        .fc-goal-meta {
          margin: 6px 0 0; font-size: 10px; color: var(--fc-muted); font-weight: 600;
        }
        .fc-goal-live { color: var(--fc-primary); font-weight: 800; }

        /* editor */
        .fc-editor {
          padding: 14px; border: 1px solid var(--fc-border);
          border-radius: 12px; background: var(--fc-surface); margin-bottom: 12px;
        }
        .fc-editor-head {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 10px; margin-bottom: 10px;
        }
        .fc-editor-head h3 { margin: 0 0 2px; font-size: 13px; font-weight: 800; }
        .fc-editor-head p { margin: 0; font-size: 10px; color: var(--fc-muted); }
        .fc-form { display: grid; gap: 8px; }
        .fc-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .fc-field { display: flex; flex-direction: column; gap: 4px; }
        .fc-field > span {
          font-size: 9px; font-weight: 800; letter-spacing: 0.5px;
          color: var(--fc-muted); text-transform: uppercase;
        }
        .fc-field textarea,
        .fc-field input,
        .fc-field select {
          width: 100%; padding: 8px 10px; border-radius: 8px;
          border: 1px solid var(--fc-border); background: #fff;
          color: var(--fc-text); font-size: 12px; font-weight: 600;
          outline: none; font-family: inherit;
          transition: border-color 150ms ease, box-shadow 150ms ease;
          resize: vertical;
        }
        .fc-field textarea:focus,
        .fc-field input:focus,
        .fc-field select:focus {
          border-color: var(--fc-primary);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
        }
        .fc-form-actions { display: flex; gap: 6px; flex-wrap: wrap; }

        .fc-btn {
          min-height: 36px; padding: 0 14px; border-radius: 9px;
          display: inline-flex; align-items: center; justify-content: center;
          gap: 6px; font-size: 11px; font-weight: 800; cursor: pointer;
          white-space: nowrap; transition: all 150ms ease;
          border: 1px solid transparent;
        }
        .fc-btn:focus-visible { outline: 3px solid var(--fc-primary-hover); outline-offset: 2px; }
        .fc-btn:disabled { cursor: not-allowed; opacity: 0.45; }
        .fc-btn-pri {
          border: 1px solid #e74e1b; background: linear-gradient(135deg, #ff682f, #e94b18);
          color: #fff; box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
        }
        .fc-btn-pri:hover:not(:disabled) {
          background: linear-gradient(135deg, #f45a25, #d94112);
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(255, 90, 31, 0.28);
        }
        .fc-btn-danger {
          border: 1px solid #b91c1c; background: linear-gradient(135deg, #ef4444, #b91c1c);
          color: #fff; box-shadow: 0 3px 10px rgba(185, 28, 28, 0.2);
        }
        .fc-btn-danger:hover:not(:disabled) {
          background: linear-gradient(135deg, #dc2626, #991b1b);
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(185, 28, 28, 0.28);
        }
        .fc-btn-sec {
          border: 1px solid var(--fc-border); background: #fff; color: var(--fc-text);
        }
        .fc-btn-sec:hover:not(:disabled) {
          border-color: var(--fc-primary-hover); color: var(--fc-primary);
          background: var(--fc-primary-surface);
        }
        .fc-btn-ghost {
          border: 1px solid transparent; background: transparent; color: var(--fc-muted);
        }
        .fc-btn-ghost:hover:not(:disabled) {
          color: var(--fc-primary); background: var(--fc-primary-surface);
        }

        /* study */
        .fc-study {
          padding: 14px; border: 1px solid var(--fc-border);
          border-radius: 12px; background: var(--fc-surface); margin-bottom: 12px;
        }
        .fc-study-head {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 10px; margin-bottom: 10px; flex-wrap: wrap;
        }
        .fc-study-head h3 { margin: 0 0 2px; font-size: 13px; font-weight: 800; }
        .fc-study-head p { margin: 0; font-size: 10px; color: var(--fc-muted); }
        .fc-study-head-right {
          display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
        }
        .fc-search {
          padding: 7px 11px; border-radius: 8px; border: 1px solid var(--fc-border);
          background: #fff; color: var(--fc-text); font-size: 11px; font-weight: 600;
          outline: none; min-width: 140px; transition: all 150ms ease;
        }
        .fc-search:focus {
          border-color: var(--fc-primary); box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
        }

        .fc-filters {
          display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px;
        }
        .fc-filter {
          padding: 5px 9px; border-radius: 999px; border: 1px solid var(--fc-border);
          background: var(--fc-surface); color: var(--fc-muted);
          font-size: 10px; font-weight: 800; cursor: pointer;
          display: inline-flex; align-items: center; gap: 5px;
          transition: all 150ms ease;
        }
        .fc-filter:hover { border-color: var(--fc-primary-hover); color: var(--fc-primary); }
        .fc-filter.is-active {
          border-color: var(--fc-primary); background: var(--fc-primary-soft);
          color: var(--fc-primary); box-shadow: inset 0 0 0 1px var(--fc-primary);
        }
        .fc-filter-count {
          font-size: 8px; padding: 1px 5px; border-radius: 999px;
          background: rgba(0, 0, 0, 0.06); color: inherit; font-weight: 800;
        }
        .fc-filter.is-active .fc-filter-count {
          background: rgba(255, 90, 31, 0.15);
        }

        .fc-sort {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; font-weight: 700; color: var(--fc-muted);
          margin-bottom: 10px; flex-wrap: wrap;
        }
        .fc-sort-select {
          padding: 4px 8px; border-radius: 6px; border: 1px solid var(--fc-border);
          background: #fff; color: var(--fc-text); font-size: 10px; font-weight: 700;
          outline: none; cursor: pointer;
        }
        .fc-sort-hint { color: var(--fc-primary); font-weight: 800; }

        .fc-mode-strip {
          display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px; margin-bottom: 10px;
        }
        .fc-mode-btn {
          display: flex; flex-direction: column; align-items: center; gap: 1px;
          padding: 8px 6px; border: 1px solid var(--fc-border); border-radius: 10px;
          background: var(--fc-surface); color: var(--fc-text); cursor: pointer;
          transition: all 150ms ease;
        }
        .fc-mode-btn:hover { border-color: var(--fc-primary-hover); background: var(--fc-primary-surface); }
        .fc-mode-btn.is-active {
          border-color: var(--fc-primary); background: var(--fc-primary-soft);
          box-shadow: inset 0 0 0 1px var(--fc-primary);
        }
        .fc-mode-icon { font-size: 14px; line-height: 1.2; }
        .fc-mode-name { font-size: 11px; font-weight: 800; }
        .fc-mode-btn.is-active .fc-mode-name { color: var(--fc-primary); }
        .fc-mode-hint { font-size: 9px; font-weight: 600; color: var(--fc-muted); }

        .fc-card-wrap {
          padding: 12px; border-radius: 12px;
          background: linear-gradient(180deg, #fafbfc 0%, #f5f7fa 100%);
          border: 1px solid var(--fc-border);
        }
        .fc-card-top {
          display: flex; justify-content: space-between; align-items: center;
          gap: 8px; flex-wrap: wrap; margin-bottom: 8px;
        }
        .fc-card-count { font-size: 10px; font-weight: 800; color: var(--fc-muted); }
        .fc-card-badges { display: flex; gap: 4px; flex-wrap: wrap; }
        .fc-badge {
          padding: 2px 7px; border-radius: 999px;
          font-size: 8px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase;
        }
        .fc-badge-new { background: #dbeafe; color: #1e40af; }
        .fc-badge-known { background: #dcfce7; color: #166534; }
        .fc-badge-review { background: #fef3c7; color: #b45309; }
        .fc-badge-mastery { background: var(--fc-primary-soft); color: var(--fc-primary); }
        .fc-badge-due { background: #e0e7ff; color: #4338ca; }

        .fc-flip-card,
        .fc-type-card,
        .fc-quiz-card {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; padding: 26px 18px; min-height: 240px;
          border-radius: 12px; border: 1px solid var(--fc-border); background: #fff;
          box-shadow: 0 2px 8px rgba(23, 32, 51, 0.04);
        }
        .fc-flip-card {
          cursor: pointer; transition: all 200ms ease;
        }
        .fc-flip-card:hover {
          border-color: var(--fc-primary-hover);
          box-shadow: 0 4px 16px rgba(255, 90, 31, 0.12);
        }
        .fc-flip-side {
          font-size: 9px; font-weight: 800; letter-spacing: 1.5px;
          color: var(--fc-primary); margin-bottom: 14px; text-transform: uppercase;
        }
        .fc-flip-text {
          font-size: 18px; font-weight: 700; line-height: 1.4;
          color: var(--fc-text); margin: 0; max-width: 100%;
          word-break: break-word; white-space: pre-wrap;
        }
        .fc-flip-hint {
          font-size: 11px; color: var(--fc-muted); font-style: italic;
          margin: 12px 0 0; font-weight: 600;
        }
        .fc-flip-help {
          font-size: 10px; color: var(--fc-muted); margin-top: 20px; font-weight: 600;
        }

        .fc-type-input {
          width: 100%; max-width: 340px; margin-top: 16px;
          padding: 10px 14px; border-radius: 9px;
          border: 2px solid var(--fc-border); background: #fff;
          color: var(--fc-text); font-size: 14px; font-weight: 600;
          outline: none; text-align: center; transition: all 150ms ease;
        }
        .fc-type-input:focus {
          border-color: var(--fc-primary); box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
        }
        .fc-type-input.is-correct { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12); }
        .fc-type-input.is-wrong { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12); }
        .fc-type-result {
          margin-top: 12px; font-size: 12px; font-weight: 700;
          padding: 8px 14px; border-radius: 9px;
        }
        .fc-type-result.is-correct { background: #dcfce7; color: #166534; }
        .fc-type-result.is-wrong { background: #fee2e2; color: #991b1b; }

        .fc-quiz-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
          width: 100%; margin-top: 16px;
        }
        .fc-quiz-choice {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; border-radius: 9px;
          border: 2px solid var(--fc-border); background: #fff;
          color: var(--fc-text); font-size: 12px; font-weight: 700;
          cursor: pointer; text-align: left; transition: all 150ms ease;
        }
        .fc-quiz-choice:hover:not(:disabled) {
          border-color: var(--fc-primary-hover); background: var(--fc-primary-surface);
        }
        .fc-quiz-choice.is-correct {
          border-color: #10b981; background: #dcfce7; color: #166534;
        }
        .fc-quiz-choice.is-wrong {
          border-color: #ef4444; background: #fee2e2; color: #991b1b;
        }
        .fc-quiz-choice.is-picked:not(.is-correct) {
          border-color: #ef4444; background: #fee2e2;
        }
        .fc-quiz-choice:disabled { cursor: default; }
        .fc-quiz-letter {
          flex-shrink: 0; width: 20px; height: 20px; border-radius: 6px;
          background: var(--fc-primary-soft); color: var(--fc-primary);
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 900;
        }
        .fc-quiz-text { flex: 1; min-width: 0; word-break: break-word; }

        .fc-progress { margin-top: 12px; }
        .fc-progress-top {
          display: flex; justify-content: space-between;
          font-size: 10px; font-weight: 700; color: var(--fc-muted); margin-bottom: 5px;
        }
        .fc-progress-track {
          height: 6px; border-radius: 999px; background: #eef0f5; overflow: hidden;
        }
        .fc-progress-fill {
          height: 100%; border-radius: inherit;
          background: linear-gradient(90deg, #ff8a4c, #ff5a1f);
          transition: width 260ms ease;
        }

        .fc-nav {
          display: flex; justify-content: space-between; gap: 8px; margin-top: 12px;
        }

        .fc-mark {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 8px; margin-top: 12px;
        }
        .fc-mark-btn {
          padding: 11px 14px; border-radius: 9px; border: none;
          font-size: 12px; font-weight: 800; color: #fff;
          cursor: pointer; display: inline-flex; align-items: center;
          justify-content: center; gap: 8px;
          transition: all 150ms ease;
        }
        .fc-mark-known {
          background: linear-gradient(135deg, #10b981, #059669);
        }
        .fc-mark-known:hover { background: linear-gradient(135deg, #059669, #047857); transform: translateY(-1px); }
        .fc-mark-review {
          background: linear-gradient(135deg, #f59e0b, #d97706);
        }
        .fc-mark-review:hover { background: linear-gradient(135deg, #d97706, #b45309); transform: translateY(-1px); }
        .fc-mark-btn kbd {
          padding: 1px 6px; border-radius: 4px; background: rgba(255, 255, 255, 0.25);
          font-size: 9px; font-weight: 800;
        }

        .fc-empty {
          padding: 28px 20px; text-align: center;
          border: 1px dashed var(--fc-border); border-radius: 12px; background: var(--fc-soft);
        }
        .fc-empty-icon {
          font-size: 30px; width: 56px; height: 56px; border-radius: 14px;
          background: #fff; display: inline-flex; align-items: center;
          justify-content: center; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
        .fc-empty h4 { margin: 10px 0 4px; font-size: 13px; font-weight: 800; }
        .fc-empty p { margin: 0 0 10px; font-size: 10px; color: var(--fc-muted); line-height: 1.5; }

        /* expandables */
        .fc-expand {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          gap: 10px; margin-top: 10px; padding: 9px 12px;
          border: 1px solid var(--fc-border); border-radius: 9px;
          background: transparent; color: var(--fc-muted); font-size: 11px;
          font-weight: 700; text-align: left; cursor: pointer;
          transition: all 150ms ease;
        }
        .fc-expand:hover { color: var(--fc-primary); border-color: var(--fc-primary-hover); }
        .fc-expand-chev { font-size: 14px; font-weight: 500; color: var(--fc-primary); flex-shrink: 0; }
        .fc-panel {
          margin-top: 8px; padding: 12px 14px;
          border: 1px solid var(--fc-border); border-radius: 11px;
          background: var(--fc-soft);
        }
        .fc-panel-note {
          margin: 0 0 10px; font-size: 10px; line-height: 1.6; color: var(--fc-muted);
        }
        .fc-panel-note code {
          background: rgba(255, 90, 31, 0.1); color: var(--fc-primary);
          padding: 1px 5px; border-radius: 4px; font-size: 9px; font-weight: 800;
        }

        /* weekly */
        .fc-week { padding-bottom: 2px; }
        .fc-week-bars {
          display: grid; grid-template-columns: repeat(7, 1fr);
          gap: 6px; height: 84px; align-items: end;
        }
        .fc-week-col { height: 100%; display: flex; align-items: flex-end; justify-content: center; }
        .fc-week-bar {
          width: 100%; max-width: 26px; border-radius: 5px 5px 3px 3px;
          background: #e9edf3; transition: height 300ms ease, background 200ms ease;
        }
        .fc-week-bar.has-value { background: linear-gradient(180deg, #ffb08c, #ff5a1f); }
        .fc-week-bar.is-today { box-shadow: 0 0 0 2px rgba(255, 90, 31, 0.22); }
        .fc-week-labels {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;
          margin-top: 5px; font-size: 9px; font-weight: 800;
          color: var(--fc-muted); text-align: center; letter-spacing: 0.3px;
        }
        .fc-week-labels .is-today { color: var(--fc-primary); }
        .fc-week-foot {
          display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px;
          margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--fc-border);
          font-size: 10px; font-weight: 700; color: var(--fc-muted);
        }

        /* library */
        .fc-library { display: grid; gap: 6px; max-height: 320px; overflow-y: auto; }
        .fc-library-row {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 10px; padding: 9px 11px; border-radius: 8px; background: #fff;
          border: 1px solid var(--fc-border);
        }
        .fc-library-main { min-width: 0; flex: 1; }
        .fc-library-q {
          margin: 0; font-size: 11px; font-weight: 800; color: var(--fc-text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .fc-library-a {
          margin: 3px 0 6px; font-size: 10px; color: var(--fc-muted);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .fc-library-meta { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
        .fc-library-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .fc-tag {
          padding: 2px 7px; border-radius: 999px;
          background: #f1f5f9; color: #475569; font-size: 8px; font-weight: 800;
        }
        .fc-empty-line {
          margin: 0; padding: 16px; border-radius: 9px; background: #fff;
          color: var(--fc-muted); font-size: 11px; font-weight: 600;
          text-align: center; line-height: 1.6;
        }

        /* backup */
        .fc-backup-actions { display: flex; flex-wrap: wrap; gap: 6px; }
        .fc-file-label { position: relative; overflow: hidden; cursor: pointer; }
        .fc-file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

        /* help steps */
        .fc-step {
          display: flex; gap: 10px; padding: 9px 0;
          border-bottom: 1px solid var(--fc-border);
        }
        .fc-step:first-child { padding-top: 0; }
        .fc-step:last-child { padding-bottom: 0; border-bottom: 0; }
        .fc-step > span {
          width: 26px; height: 26px; flex: 0 0 26px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 7px; background: var(--fc-primary-soft);
          color: var(--fc-primary); font-size: 9px; font-weight: 900;
        }
        .fc-step strong {
          display: block; font-size: 11px; font-weight: 800;
          margin-bottom: 2px; color: var(--fc-text);
        }
        .fc-step p { margin: 0; font-size: 10px; line-height: 1.5; color: var(--fc-muted); }
        .fc-step kbd {
          display: inline-block; padding: 1px 5px; border-radius: 4px;
          border: 1px solid var(--fc-border); background: #fff;
          font-size: 9px; font-weight: 800; color: var(--fc-text);
        }

        /* notice */
        .fc-notice {
          display: flex; align-items: center; gap: 8px;
          margin-top: 10px; padding: 10px 12px; border-radius: 9px;
          font-size: 11px; font-weight: 600; background: var(--fc-soft);
          color: var(--fc-muted);
        }
        .fc-notice-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 18px; height: 18px; flex: 0 0 18px; border-radius: 50%;
          background: #e2e8f0; color: #475569; font-size: 10px; font-weight: 900;
        }
        .fc-notice-active { background: var(--fc-primary-soft); color: var(--fc-primary-dark); }
        .fc-notice-active .fc-notice-icon { background: #ffe2d5; color: var(--fc-primary); }
        .fc-notice-success { background: #ecfdf5; color: #166534; }
        .fc-notice-success .fc-notice-icon { background: #dcfce7; color: #15803d; }
        .fc-notice-warn { background: #fffbeb; color: #b45309; }
        .fc-notice-warn .fc-notice-icon { background: #fef3c7; color: #b45309; }

        .fc-note {
          margin: 12px 0 0; text-align: center; font-size: 10px;
          line-height: 1.7; color: var(--fc-muted);
        }

        /* custom dialog */
        .fc-dialog-backdrop {
          position: fixed; inset: 0; z-index: 60;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          background: rgba(23, 32, 51, 0.5);
          backdrop-filter: blur(3px);
          animation: fcFade 160ms ease-out;
        }
        .fc-dialog {
          width: 100%; max-width: 380px;
          padding: 18px 18px 14px;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 20px 50px rgba(23, 32, 51, 0.25);
          border: 1px solid var(--fc-border);
          animation: fcPop 200ms ease-out;
        }
        .fc-dialog-title {
          margin: 0 0 6px;
          font-size: 15px; font-weight: 800; color: var(--fc-text);
        }
        .fc-dialog-body {
          margin: 0;
          font-size: 12px; line-height: 1.55; color: var(--fc-muted);
        }
        .fc-dialog-actions {
          display: flex; justify-content: flex-end; gap: 8px;
          margin-top: 16px; padding-top: 12px;
          border-top: 1px solid var(--fc-border);
        }

        @keyframes fcFade {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes fcPop {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* responsive */
        @media (max-width: 520px) {
          .fc-head { flex-wrap: wrap; }
          .fc-bar-cell { padding: 8px; }
          .fc-bar-cell strong { font-size: 13px; }
          .fc-row { grid-template-columns: 1fr; }
          .fc-quiz-grid { grid-template-columns: 1fr; }
          .fc-mark { grid-template-columns: 1fr; }
          .fc-week-bars { height: 72px; }
          .fc-goal { flex-direction: column; align-items: stretch; }
          .fc-goal-ring-wrap { margin: 0 auto; }
        }

        @media (prefers-reduced-motion: reduce) {
          .fc-goal-fill,
          .fc-progress-fill,
          .fc-week-bar,
          .fc-goal-ring-fill,
          .fc-btn-pri,
          .fc-mark-btn,
          .fc-flip-card,
          .fc-dialog-backdrop,
          .fc-dialog {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </ToolShell>
  );
}