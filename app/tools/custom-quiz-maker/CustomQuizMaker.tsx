"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ----------------------------- Types ----------------------------- */

type Difficulty = "easy" | "medium" | "hard";

type Question = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

type Quiz = {
  id: string;
  title: string;
  description: string;
  timeLimit: number;
  questions: Question[];
  createdAt: number;
  updatedAt: number;
  category: string;
  difficulty: Difficulty;
  passMark: number;
  favorite: boolean;
};

type Attempt = {
  id: string;
  quizId: string;
  quizTitle: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  duration: number;
  date: number;
  mode: PlayMode;
};

type ViewMode = "library" | "builder" | "intro" | "taking" | "results" | "stats";
type PlayMode = "exam" | "practice";
type ReviewFilter = "all" | "wrong" | "flagged";
type SortKey = "recent" | "name" | "favorites";

type DialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone: "danger" | "primary";
  onConfirm: () => void;
};

/* --------------------------- Constants --------------------------- */

const STORAGE_KEY = "toolsab-custom-quiz-maker";
const ATTEMPTS_KEY = `${STORAGE_KEY}-attempts`;
const PREFS_KEY = `${STORAGE_KEY}-prefs`;

const LEVEL_TITLES = ["Rookie", "Learner", "Scholar", "Expert", "Master", "Legend"];
const XP_PER_LEVEL = 150;
const RING_RADIUS = 54;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const CONFETTI_COLORS = ["#ff5a1f", "#ffb020", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

/* ---------------------------- Helpers ---------------------------- */

const createId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const createQuestion = (): Question => ({
  id: createId(),
  text: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  explanation: "",
});

const createQuiz = (): Quiz => ({
  id: createId(),
  title: "My New Quiz",
  description: "",
  timeLimit: 0,
  questions: [createQuestion()],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  category: "General",
  difficulty: "medium",
  passMark: 60,
  favorite: false,
});

const mk = (
  text: string,
  options: string[],
  correctAnswer: number,
  explanation: string
): Question => ({ id: createId(), text, options, correctAnswer, explanation });

const createSampleQuiz = (): Quiz => ({
  ...createQuiz(),
  title: "General Knowledge Starter",
  description: "A quick five-question warm-up to try the full quiz experience.",
  category: "General",
  difficulty: "easy",
  timeLimit: 3,
  passMark: 60,
  questions: [
    mk("What is the capital of Japan?", ["Seoul", "Tokyo", "Beijing", "Bangkok"], 1, "Tokyo has been the capital of Japan since 1868."),
    mk("Which planet is known as the Red Planet?", ["Venus", "Mars", "Jupiter", "Mercury"], 1, "Iron oxide on its surface gives Mars a reddish color."),
    mk("What is the chemical formula of water?", ["NaCl", "CO2", "H2O", "O2"], 2, "Each water molecule has two hydrogen atoms and one oxygen atom."),
    mk("How many continents are there on Earth?", ["5", "6", "7", "8"], 2, "The seven continents are Africa, Antarctica, Asia, Australia, Europe, North America and South America."),
    mk("Which is the largest ocean on Earth?", ["Atlantic", "Indian", "Arctic", "Pacific"], 3, "The Pacific covers about one third of the planet's surface."),
  ],
});

const formatTime = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
};

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const dayKey = (value: number | Date) => new Date(value).toDateString();

const shuffleArray = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const cleanQuestion = (question: Question): Question => {
  const kept = question.options
    .map((option, index) => ({ option: option.trim(), index }))
    .filter((item) => item.option);
  const correct = kept.findIndex((item) => item.index === question.correctAnswer);

  return {
    ...question,
    text: question.text.trim(),
    options: kept.map((item) => item.option),
    correctAnswer: correct >= 0 ? correct : 0,
    explanation: question.explanation.trim(),
  };
};

function isValidQuiz(value: unknown): value is Quiz {
  if (!value || typeof value !== "object") return false;
  const quiz = value as Quiz;

  return (
    typeof quiz.title === "string" &&
    typeof quiz.description === "string" &&
    typeof quiz.timeLimit === "number" &&
    Array.isArray(quiz.questions) &&
    quiz.questions.length > 0 &&
    quiz.questions.every(
      (question) =>
        question &&
        typeof question.text === "string" &&
        Array.isArray(question.options) &&
        question.options.length >= 2 &&
        question.options.length <= 6 &&
        question.options.every((option) => typeof option === "string") &&
        Number.isInteger(question.correctAnswer) &&
        question.correctAnswer >= 0 &&
        question.correctAnswer < question.options.length &&
        typeof question.explanation === "string"
    )
  );
}

const normalizeQuiz = (quiz: Quiz): Quiz => ({
  ...quiz,
  id: quiz.id || createId(),
  category:
    typeof quiz.category === "string" && quiz.category.trim()
      ? quiz.category.trim()
      : "General",
  difficulty: ["easy", "medium", "hard"].includes(quiz.difficulty)
    ? quiz.difficulty
    : "medium",
  passMark:
    typeof quiz.passMark === "number"
      ? Math.min(100, Math.max(1, Math.round(quiz.passMark)))
      : 60,
  favorite: Boolean(quiz.favorite),
  createdAt: quiz.createdAt || Date.now(),
  updatedAt: quiz.updatedAt || quiz.createdAt || Date.now(),
  questions: quiz.questions.map((question) =>
    cleanQuestion({ ...question, id: question.id || createId() })
  ),
});

const buildSession = (quiz: Quiz, shuffle: boolean): Quiz => {
  if (!shuffle) return quiz;

  const questions = shuffleArray(quiz.questions).map((question) => {
    const order = shuffleArray(question.options.map((_, index) => index));
    return {
      ...question,
      options: order.map((index) => question.options[index]),
      correctAnswer: order.indexOf(question.correctAnswer),
    };
  });

  return { ...quiz, questions };
};

const parseBulk = (text: string): Question[] =>
  text
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      let questionText = "";
      const options: string[] = [];
      let correct = -1;
      let answerLetter = "";
      let explanation = "";

      for (const line of lines) {
        const explanationMatch = line.match(/^explanation\s*[:-]\s*(.+)$/i);
        const answerMatch = line.match(/^answer\s*[:-]\s*\(?([A-Fa-f])\)?/i);
        const optionMatch = line.match(/^(\*?)\s*\(?([A-Fa-f])[).:]\s+(.+)$/);

        if (explanationMatch) {
          explanation = explanationMatch[1];
        } else if (answerMatch) {
          answerLetter = answerMatch[1].toUpperCase();
        } else if (optionMatch) {
          options.push(optionMatch[3]);
          if (optionMatch[1] === "*") correct = options.length - 1;
        } else if (!options.length) {
          const cleaned = line.replace(/^(\d+[).]|q\d*[:.)])\s*/i, "");
          questionText += (questionText ? " " : "") + cleaned;
        }
      }

      if (answerLetter && correct < 0) correct = answerLetter.charCodeAt(0) - 65;
      const finalOptions = options.slice(0, 6);
      if (!questionText || finalOptions.length < 2) return null;
      if (correct < 0 || correct >= finalOptions.length) correct = 0;

      return {
        id: createId(),
        text: questionText,
        options: finalOptions,
        correctAnswer: correct,
        explanation,
      } as Question;
    })
    .filter((question): question is Question => question !== null);

const csvCell = (value: string | number | boolean) =>
  `"${String(value).replace(/"/g, '""')}"`;

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
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "quiz";

/* --------------------------- Component --------------------------- */

export default function CustomQuizMaker() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [dark, setDark] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<ViewMode>("library");

  const [draft, setDraft] = useState<Quiz | null>(null);
  const [target, setTarget] = useState<Quiz | null>(null);
  const [play, setPlay] = useState<Quiz | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode>("exam");
  const [shuffle, setShuffle] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<Attempt | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortKey>("recent");
  const [notice, setNotice] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const finishedRef = useRef(false);
  const startedAtRef = useRef(0);
  const retryRef = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  /* ----------------------- Persistence ----------------------- */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setQuizzes(parsed.filter(isValidQuiz).map(normalizeQuiz));
        }
      }

      const savedAttempts = localStorage.getItem(ATTEMPTS_KEY);
      if (savedAttempts) {
        const parsed = JSON.parse(savedAttempts);
        if (Array.isArray(parsed)) {
          setAttempts(
            parsed.filter(
              (item) =>
                item &&
                typeof item.quizId === "string" &&
                typeof item.percentage === "number"
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(quizzes));
    } catch {
      setNotice("Your browser storage is full. Export your quizzes to keep a backup.");
    }
  }, [quizzes, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
    } catch {
      /* ignore */
    }
  }, [attempts, loaded]);

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

  /* ------------------------- Timer ------------------------- */

  useEffect(() => {
    if (!timerRunning || mode !== "taking") return;
    const interval = window.setInterval(() => {
      setRemainingTime((previous) => previous - 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning, mode]);

  useEffect(() => {
    if (mode === "taking" && timerRunning && remainingTime <= 0) {
      finishQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingTime, timerRunning, mode]);

  /* --------------------- Keyboard shortcuts --------------------- */

  useEffect(() => {
    if (mode !== "taking" || !play || dialog) return;

    const handler = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      if (element && ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) return;

      const question = play.questions[currentQuestion];
      if (!question) return;

      if (/^[1-6]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (index < question.options.length) selectAnswer(question.id, index);
      } else if (event.key === "ArrowRight") {
        setCurrentQuestion((previous) => Math.min(play.questions.length - 1, previous + 1));
      } else if (event.key === "ArrowLeft") {
        setCurrentQuestion((previous) => Math.max(0, previous - 1));
      } else if (event.key.toLowerCase() === "f") {
        toggleFlag(question.id);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, play, currentQuestion, answers, playMode, dialog]);

  /* ----------------------- Derived data ----------------------- */

  const totalXp = useMemo(
    () =>
      attempts.reduce(
        (total, attempt) => total + attempt.score * 10 + (attempt.passed ? 25 : 0),
        0
      ),
    [attempts]
  );
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const levelProgress = ((totalXp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

  const streak = useMemo(() => {
    const days = new Set(attempts.map((attempt) => dayKey(attempt.date)));
    const cursor = new Date();
    if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (days.has(dayKey(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [attempts]);

  const averageScore = attempts.length
    ? Math.round(attempts.reduce((total, a) => total + a.percentage, 0) / attempts.length)
    : 0;

  const bestByQuiz = useMemo(() => {
    const map: Record<string, { best: number; count: number }> = {};
    attempts.forEach((attempt) => {
      const entry = map[attempt.quizId] || { best: 0, count: 0 };
      entry.best = Math.max(entry.best, attempt.percentage);
      entry.count += 1;
      map[attempt.quizId] = entry;
    });
    return map;
  }, [attempts]);

  const badges = [
    { icon: "🚀", name: "First steps", hint: "Finish your first quiz", earned: attempts.length >= 1 },
    { icon: "🏗️", name: "Creator", hint: "Build 3 quizzes", earned: quizzes.length >= 3 },
    { icon: "🎯", name: "Perfectionist", hint: "Score 100% on any quiz", earned: attempts.some((a) => a.percentage === 100) },
    { icon: "🔥", name: "On fire", hint: "Reach a 3-day streak", earned: streak >= 3 },
    { icon: "📚", name: "Dedicated", hint: "Complete 10 attempts", earned: attempts.length >= 10 },
    { icon: "⚡", name: "Quick thinker", hint: "Pass a quiz in under 60 seconds", earned: attempts.some((a) => a.passed && a.duration < 60 && a.total >= 3) },
  ];

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(quizzes.map((quiz) => quiz.category).filter(Boolean)))],
    [quizzes]
  );

  const visibleQuizzes = useMemo(() => {
    const term = search.toLowerCase();
    const list = quizzes.filter(
      (quiz) =>
        (category === "All" || quiz.category === category) &&
        `${quiz.title} ${quiz.description} ${quiz.category}`.toLowerCase().includes(term)
    );

    return list.sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title);
      if (sort === "favorites") {
        return Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt;
      }
      return b.updatedAt - a.updatedAt;
    });
  }, [quizzes, search, category, sort]);

  const score = play
    ? play.questions.reduce(
        (total, question) => total + (answers[question.id] === question.correctAnswer ? 1 : 0),
        0
      )
    : 0;
  const totalQuestions = play?.questions.length || 0;
  const percentage = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;
  const passed = play ? percentage >= play.passMark : false;

  /* -------------------------- Navigation -------------------------- */

  const askConfirm = (options: DialogState) => setDialog(options);

  const goLibrary = () => {
    const leave = () => {
      setTimerRunning(false);
      setMode("library");
      setNotice("");
    };

    if (mode === "builder") {
      askConfirm({
        title: "Leave without saving?",
        message: "Your changes to this quiz will be lost.",
        confirmLabel: "Leave",
        cancelLabel: "Keep editing",
        tone: "danger",
        onConfirm: leave,
      });
      return;
    }

    if (mode === "taking") {
      askConfirm({
        title: "Leave this quiz?",
        message: "Your answers for this attempt will be lost.",
        confirmLabel: "Leave quiz",
        cancelLabel: "Keep going",
        tone: "danger",
        onConfirm: leave,
      });
      return;
    }

    leave();
  };

  /* ------------------------ Library actions ------------------------ */

  const startNewQuiz = () => {
    setDraft(createQuiz());
    setShowBulk(false);
    setBulkText("");
    setMode("builder");
  };

  const editQuiz = (quiz: Quiz) => {
    setDraft({
      ...quiz,
      questions: quiz.questions.map((question) => ({
        ...question,
        options: [...question.options],
      })),
    });
    setShowBulk(false);
    setBulkText("");
    setMode("builder");
  };

  const duplicateQuiz = (quiz: Quiz) => {
    const copy: Quiz = {
      ...quiz,
      id: createId(),
      title: `${quiz.title} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      favorite: false,
      questions: quiz.questions.map((question) => ({
        ...question,
        id: createId(),
        options: [...question.options],
      })),
    };
    setQuizzes((previous) => [copy, ...previous]);
    setNotice("Quiz duplicated.");
  };

  const toggleFavorite = (id: string) =>
    setQuizzes((previous) =>
      previous.map((quiz) => (quiz.id === id ? { ...quiz, favorite: !quiz.favorite } : quiz))
    );

  const deleteQuiz = (quiz: Quiz) =>
    askConfirm({
      title: "Delete this quiz?",
      message: `"${quiz.title}" and its ${quiz.questions.length} question${
        quiz.questions.length === 1 ? "" : "s"
      } will be permanently removed. Export it first if you want a backup.`,
      confirmLabel: "Delete quiz",
      tone: "danger",
      onConfirm: () => {
        setQuizzes((previous) => previous.filter((item) => item.id !== quiz.id));
        setNotice("Quiz deleted.");
      },
    });

  const addSample = () => {
    setQuizzes((previous) => [createSampleQuiz(), ...previous]);
    setNotice("Sample quiz added. Press Start quiz to try it.");
  };

  /* ------------------------ Import / export ------------------------ */

  const exportQuiz = (quiz: Quiz) =>
    downloadFile(`${slugify(quiz.title)}.json`, JSON.stringify(quiz, null, 2), "application/json");

  const exportAll = () => {
    if (!quizzes.length) {
      setNotice("There are no quizzes to export yet.");
      return;
    }
    downloadFile("quiz-maker-backup.json", JSON.stringify(quizzes, null, 2), "application/json");
  };

  const exportHistory = () => {
    const rows = [
      ["Date", "Quiz", "Mode", "Score", "Total", "Percentage", "Passed", "Seconds"],
      ...attempts.map((a) => [
        new Date(a.date).toISOString(),
        a.quizTitle,
        a.mode,
        a.score,
        a.total,
        a.percentage,
        a.passed,
        a.duration,
      ]),
    ];
    downloadFile(
      "quiz-history.csv",
      rows.map((row) => row.map(csvCell).join(",")).join("\n"),
      "text/csv"
    );
  };

  const importQuizObject = (value: unknown) => {
    const imported = Array.isArray(value) ? value : [value];

    if (!imported.length || !imported.every(isValidQuiz)) {
      setNotice("Invalid quiz file. Please use a JSON file exported from this tool.");
      return;
    }

    const prepared = imported.map((raw) => {
      const quiz = normalizeQuiz(raw as Quiz);
      return {
        ...quiz,
        id: createId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        questions: quiz.questions.map((question) => ({ ...question, id: createId() })),
      };
    });

    setQuizzes((previous) => [...prepared, ...previous]);
    setShowImport(false);
    setImportText("");
    setNotice(`${prepared.length} quiz${prepared.length === 1 ? "" : "zes"} imported successfully.`);
  };

  const importFromText = () => {
    try {
      importQuizObject(JSON.parse(importText));
    } catch {
      setNotice("The JSON text is not valid. Please check it and try again.");
    }
  };

  const handleFileImport = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importQuizObject(JSON.parse(String(reader.result)));
      } catch {
        setNotice("Could not read this JSON file.");
      }
    };
    reader.readAsText(file);
  };

  /* -------------------------- Builder -------------------------- */

  const updateDraft = (changes: Partial<Quiz>) =>
    setDraft((previous) => (previous ? { ...previous, ...changes } : previous));

  const updateQuestion = (questionId: string, changes: Partial<Question>) =>
    setDraft((previous) =>
      previous
        ? {
            ...previous,
            questions: previous.questions.map((question) =>
              question.id === questionId ? { ...question, ...changes } : question
            ),
          }
        : previous
    );

  const addQuestion = () =>
    setDraft((previous) =>
      previous ? { ...previous, questions: [...previous.questions, createQuestion()] } : previous
    );

  const deleteQuestion = (questionId: string) => {
    if (!draft) return;
    if (draft.questions.length === 1) {
      setNotice("A quiz must contain at least one question.");
      return;
    }
    updateDraft({ questions: draft.questions.filter((question) => question.id !== questionId) });
  };

  const duplicateQuestion = (question: Question) => {
    if (!draft) return;
    const index = draft.questions.findIndex((item) => item.id === question.id);
    const questions = [...draft.questions];
    questions.splice(index + 1, 0, {
      ...question,
      id: createId(),
      options: [...question.options],
    });
    updateDraft({ questions });
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    if (!draft) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= draft.questions.length) return;
    const questions = [...draft.questions];
    [questions[index], questions[targetIndex]] = [questions[targetIndex], questions[index]];
    updateDraft({ questions });
  };

  const addOption = (question: Question) => {
    if (question.options.length >= 6) return;
    updateQuestion(question.id, { options: [...question.options, ""] });
  };

  const removeOption = (question: Question, index: number) => {
    if (question.options.length <= 2) return;
    const options = question.options.filter((_, optionIndex) => optionIndex !== index);
    let correctAnswer = question.correctAnswer;
    if (index === correctAnswer) correctAnswer = 0;
    else if (index < correctAnswer) correctAnswer -= 1;
    updateQuestion(question.id, { options, correctAnswer });
  };

  const makeTrueFalse = (question: Question) =>
    updateQuestion(question.id, { options: ["True", "False"], correctAnswer: 0 });

  const addBulkQuestions = () => {
    if (!draft) return;
    const parsed = parseBulk(bulkText);
    if (!parsed.length) {
      setNotice("No questions found. Check the format shown above the text box.");
      return;
    }

    const onlyBlank =
      draft.questions.length === 1 &&
      !draft.questions[0].text.trim() &&
      draft.questions[0].options.every((option) => !option.trim());

    updateDraft({ questions: onlyBlank ? parsed : [...draft.questions, ...parsed] });
    setBulkText("");
    setShowBulk(false);
    setNotice(`${parsed.length} question${parsed.length === 1 ? "" : "s"} added. Please double-check the correct answers.`);
  };

  const saveDraft = () => {
    if (!draft) return;

    const title = draft.title.trim();
    if (!title) {
      setNotice("Please enter a quiz title.");
      return;
    }

    for (let i = 0; i < draft.questions.length; i++) {
      const question = draft.questions[i];
      if (!question.text.trim()) {
        setNotice(`Please enter the text for question ${i + 1}.`);
        return;
      }
      if (question.options.filter((option) => option.trim()).length < 2) {
        setNotice(`Question ${i + 1} needs at least two answer options.`);
        return;
      }
      if (!question.options[question.correctAnswer]?.trim()) {
        setNotice(`Please select a filled correct answer for question ${i + 1}.`);
        return;
      }
    }

    const cleaned: Quiz = {
      ...draft,
      title,
      description: draft.description.trim(),
      category: draft.category.trim() || "General",
      timeLimit: Math.max(0, draft.timeLimit),
      passMark: Math.min(100, Math.max(1, draft.passMark || 60)),
      updatedAt: Date.now(),
      questions: draft.questions.map(cleanQuestion),
    };

    setQuizzes((previous) =>
      previous.some((quiz) => quiz.id === cleaned.id)
        ? previous.map((quiz) => (quiz.id === cleaned.id ? cleaned : quiz))
        : [cleaned, ...previous]
    );
    setDraft(null);
    setMode("library");
    setNotice("Quiz saved successfully.");
  };

  /* ------------------------ Taking a quiz ------------------------ */

  const openIntro = (quiz: Quiz) => {
    setTarget(quiz);
    setShuffle(false);
    setPlayMode("exam");
    setMode("intro");
    setNotice("");
  };

  const startSession = (session: Quiz, selectedMode: PlayMode, isRetry = false) => {
    retryRef.current = isRetry;
    finishedRef.current = false;
    startedAtRef.current = Date.now();
    setPlay(session);
    setPlayMode(selectedMode);
    setAnswers({});
    setFlagged({});
    setCurrentQuestion(0);
    setRemainingTime(session.timeLimit > 0 ? session.timeLimit * 60 : 0);
    setTimerRunning(session.timeLimit > 0);
    setMode("taking");
    setNotice("");
  };

  const beginQuiz = () => {
    if (!target) return;
    startSession(buildSession(target, shuffle), playMode);
  };

  const tryAgain = () => {
    if (!play) return;
    const base = quizzes.find((quiz) => quiz.id === play.id) || play;
    startSession(buildSession(base, shuffle), playMode);
  };

  const retryWrong = () => {
    if (!play) return;
    const wrong = play.questions.filter((question) => answers[question.id] !== question.correctAnswer);
    if (!wrong.length) return;
    startSession({ ...play, questions: wrong, timeLimit: 0 }, playMode, true);
  };

  const selectAnswer = (questionId: string, index: number) => {
    if (playMode === "practice" && answers[questionId] !== undefined) return;
    setAnswers((previous) => ({ ...previous, [questionId]: index }));
  };

  const toggleFlag = (questionId: string) =>
    setFlagged((previous) => ({ ...previous, [questionId]: !previous[questionId] }));

  const finishQuiz = () => {
    if (!play || finishedRef.current) return;
    finishedRef.current = true;
    setDialog(null);
    setTimerRunning(false);

    const attempt: Attempt = {
      id: createId(),
      quizId: play.id,
      quizTitle: play.title,
      score,
      total: totalQuestions,
      percentage,
      passed,
      duration: Math.round((Date.now() - startedAtRef.current) / 1000),
      date: Date.now(),
      mode: playMode,
    };

    setLastAttempt(attempt);
    if (!retryRef.current) setAttempts((previous) => [attempt, ...previous].slice(0, 200));
    setReviewFilter("all");
    setMode("results");
  };

  const confirmFinish = () => {
    if (!play) return;
    const unanswered = play.questions.filter((question) => answers[question.id] === undefined).length;
    askConfirm({
      title: unanswered ? "Submit with unanswered questions?" : "Submit your answers?",
      message: unanswered
        ? `You have ${unanswered} unanswered question${
            unanswered === 1 ? "" : "s"
          }. They will be marked incorrect.`
        : "You have answered every question. Ready to see your results?",
      confirmLabel: "Submit quiz",
      cancelLabel: "Keep reviewing",
      tone: "primary",
      onConfirm: finishQuiz,
    });
  };

  const copyResult = async () => {
    if (!play) return;
    try {
      await navigator.clipboard.writeText(
        `I scored ${percentage}% (${score}/${totalQuestions}) on "${play.title}" 🎯 Can you beat me?`
      );
      setNotice("Result copied to your clipboard.");
    } catch {
      setNotice("Could not copy. Please copy the result manually.");
    }
  };

  const clearHistory = () =>
    askConfirm({
      title: "Clear all history?",
      message: "This removes every attempt, your XP, your level and your badge progress. This can't be undone.",
      confirmLabel: "Clear history",
      tone: "danger",
      onConfirm: () => {
        setAttempts([]);
        setNotice("History cleared.");
      },
    });

  /* ---------------------------- Render ---------------------------- */

  const currentQ = play?.questions[currentQuestion];
  const answeredCount = play
    ? play.questions.filter((question) => answers[question.id] !== undefined).length
    : 0;

  const reviewItems = play
    ? play.questions
        .map((question, index) => ({ question, index }))
        .filter(({ question }) => {
          if (reviewFilter === "wrong") return answers[question.id] !== question.correctAnswer;
          if (reviewFilter === "flagged") return flagged[question.id];
          return true;
        })
    : [];

  return (
    <div className={`cqm ${dark ? "dark" : ""}`}>
      <style jsx>{`
        .cqm,
        .modal-root {
          --primary: #ff5a1f;
          --primary-dark: #e94b18;
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
          --good-line: #86efac;
          --bad: #dc2626;
          --bad-soft: #fef2f2;
          --bad-line: #fca5a5;
          --shadow: 0 1px 2px rgba(23, 32, 51, 0.04), 0 8px 24px rgba(23, 32, 51, 0.06);
          color: var(--text);
          width: 100%;
          font-family: inherit;
          position: relative;
        }
        .cqm.dark,
        .modal-root.dark {
          --primary-soft: rgba(255, 90, 31, 0.14);
          --primary-line: rgba(255, 90, 31, 0.45);
          --text: #e8ecf5;
          --muted: #94a3b8;
          --border: #263046;
          --card: #121a2b;
          --soft: #0c1322;
          --input: #0c1322;
          --good-soft: rgba(34, 197, 94, 0.12);
          --good-line: rgba(34, 197, 94, 0.5);
          --bad-soft: rgba(239, 68, 68, 0.12);
          --bad-line: rgba(239, 68, 68, 0.5);
          --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.25);
        }
        .cqm.dark {
          background: #0a101e;
          border-radius: 20px;
          padding: 20px;
        }
        .cqm *,
        .modal-root * {
          box-sizing: border-box;
        }
        .cqm button,
        .modal-root button {
          font-family: inherit;
        }
        .cqm button:focus-visible,
        .modal-root button:focus-visible,
        .cqm input:focus-visible,
        .cqm select:focus-visible,
        .cqm textarea:focus-visible {
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
        .card h3,
        .card h4 {
          margin: 0;
        }
        .sub {
          margin: 4px 0 0;
          font-size: 13px;
          color: var(--muted);
          line-height: 1.55;
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
          transition: transform 0.12s, background 0.15s, border-color 0.15s, box-shadow 0.15s;
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
          border-color: var(--bad-line);
          background: var(--bad-soft);
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

        /* Form fields */
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
          transition: border-color 0.15s, box-shadow 0.15s;
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
        .form-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }
        .span-4 {
          grid-column: span 4;
        }

        /* Alerts */
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

        /* Progress strip */
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
        }
        .stat strong {
          display: block;
          margin-top: 4px;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        /* Library */
        .chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        .chip {
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--muted);
          border-radius: 999px;
          padding: 6px 13px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .chip.active {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .quiz-card {
          margin: 0;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .quiz-card:hover {
          transform: translateY(-2px);
        }
        .quiz-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--accent, var(--primary));
        }
        .quiz-card.easy {
          --accent: #22c55e;
        }
        .quiz-card.medium {
          --accent: #ffb020;
        }
        .quiz-card.hard {
          --accent: #ef4444;
        }
        .quiz-top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }
        .star {
          background: none;
          border: 0;
          font-size: 20px;
          cursor: pointer;
          line-height: 1;
          color: #cbd5e1;
        }
        .star.on {
          color: #ffb020;
        }
        .clamp {
          margin: 8px 0 14px;
          font-size: 13px;
          color: var(--muted);
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 40px;
        }
        .meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .pill {
          background: var(--soft);
          color: var(--muted);
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
        }
        .pill.accent {
          background: var(--primary-soft);
          color: var(--primary);
        }
        .best {
          margin-bottom: 14px;
          font-size: 12px;
          color: var(--muted);
        }
        .bar {
          height: 7px;
          background: var(--soft);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 6px;
        }
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff5a1f, #ffb020);
          border-radius: 99px;
          transition: width 0.3s;
        }
        .card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }
        .empty {
          text-align: center;
          padding: 44px 20px;
        }
        .empty-icon {
          font-size: 38px;
        }

        /* Builder */
        .q-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .opt-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 9px;
        }
        .opt-letter {
          display: flex;
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--soft);
          font-size: 12px;
          font-weight: 800;
          color: var(--muted);
        }
        .radio {
          width: 16px;
          height: 16px;
          accent-color: var(--primary);
          cursor: pointer;
        }
        .x-btn {
          background: none;
          border: 0;
          padding: 0 8px;
          font-size: 18px;
          color: var(--bad);
          cursor: pointer;
        }
        .x-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .dashed {
          width: 100%;
          border-style: dashed;
          padding: 16px;
          margin-bottom: 20px;
        }
        .savebar {
          position: sticky;
          bottom: 12px;
          z-index: 10;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 12px 32px rgba(23, 32, 51, 0.16);
        }
        .code {
          background: var(--soft);
          border: 1px dashed var(--border);
          border-radius: 10px;
          padding: 12px;
          font-size: 12px;
          line-height: 1.6;
          color: var(--muted);
          white-space: pre-wrap;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        /* Intro */
        .modes {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .mode {
          text-align: left;
          background: var(--card);
          color: var(--text);
          border: 2px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .mode.on {
          border-color: var(--primary);
          background: var(--primary-soft);
        }
        .mode strong {
          display: block;
          font-size: 14px;
          margin-bottom: 4px;
        }
        .mode span {
          font-size: 12px;
          color: var(--muted);
          line-height: 1.5;
        }
        .switch-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: var(--soft);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px 16px;
        }
        .switch-row strong {
          display: block;
          font-size: 13px;
        }
        .switch-row span {
          display: block;
          margin-top: 2px;
          font-size: 12px;
          color: var(--muted);
        }
        .switch {
          position: relative;
          flex-shrink: 0;
          width: 48px;
          height: 28px;
          border: 0;
          border-radius: 999px;
          background: #cbd5e1;
          cursor: pointer;
          transition: background 0.2s;
        }
        .cqm.dark .switch {
          background: #334155;
        }
        .switch.on {
          background: linear-gradient(135deg, #ff5a1f, #ff7a3d);
        }
        .switch i {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
          transition: transform 0.2s;
        }
        .switch.on i {
          transform: translateX(20px);
        }

        /* Taking */
        .timer {
          background: var(--primary-soft);
          color: var(--primary);
          padding: 8px 16px;
          border-radius: 12px;
          text-align: center;
        }
        .timer.low {
          background: var(--bad-soft);
          color: var(--bad);
        }
        .timer small {
          display: block;
          font-size: 11px;
          font-weight: 700;
        }
        .timer strong {
          font-size: 22px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }
        .progress {
          height: 8px;
          background: var(--soft);
          border-radius: 99px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff5a1f, #ffb020);
          transition: width 0.25s;
        }
        .progress-meta {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--muted);
          margin-top: 8px;
          font-weight: 600;
        }
        .answer {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--border);
          border-radius: 13px;
          padding: 14px;
          text-align: left;
          background: var(--card);
          color: var(--text);
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: border-color 0.15s, background 0.15s;
        }
        .answer:hover:not(:disabled) {
          border-color: var(--primary-line);
          background: var(--primary-soft);
        }
        .answer.selected {
          border-color: var(--primary);
          background: var(--primary-soft);
        }
        .answer.right {
          border-color: var(--good-line);
          background: var(--good-soft);
        }
        .answer.wrong {
          border-color: var(--bad-line);
          background: var(--bad-soft);
        }
        .answer:disabled {
          cursor: default;
        }
        .answer kbd {
          margin-left: auto;
          font-size: 10px;
          color: var(--muted);
          border: 1px solid var(--border);
          border-radius: 5px;
          padding: 1px 6px;
          font-family: inherit;
        }
        .flag {
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--muted);
          border-radius: 10px;
          padding: 6px 11px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .flag.on {
          background: #fff7e0;
          border-color: #ffb020;
          color: #b45309;
        }
        .feedback {
          background: var(--soft);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 13px;
          line-height: 1.55;
        }
        .feedback b {
          display: block;
          margin-bottom: 2px;
        }
        .jump {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .jump button {
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--muted);
        }
        .jump button.done {
          background: var(--primary-soft);
          border-color: var(--primary-line);
          color: var(--primary);
        }
        .jump button.now {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
        }
        .jump button.flagged::after {
          content: "";
          position: absolute;
          top: -3px;
          right: -3px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ffb020;
          border: 2px solid var(--card);
        }

        /* Results */
        .confetti {
          position: absolute;
          inset: 0 0 auto 0;
          height: 0;
          pointer-events: none;
          z-index: 30;
          overflow: visible;
        }
        .confetti i {
          position: absolute;
          top: -10px;
          width: 8px;
          height: 14px;
          border-radius: 2px;
          opacity: 0;
          animation: fall 2.6s ease-in forwards;
        }
        @keyframes fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(520px) rotate(540deg);
          }
        }
        .ring {
          position: relative;
          width: 150px;
          height: 150px;
          margin: 0 auto 20px;
        }
        .ring svg {
          transform: rotate(-90deg);
        }
        .ring-fill {
          animation: ring 1s ease-out forwards;
        }
        @keyframes ring {
          from {
            stroke-dashoffset: 339.292;
          }
        }
        .ring-text {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .ring-text strong {
          font-size: 34px;
          font-weight: 800;
          color: var(--primary);
          letter-spacing: -1px;
        }
        .ring-text span {
          font-size: 11px;
          font-weight: 700;
          color: var(--muted);
        }
        .verdict {
          display: inline-block;
          padding: 5px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 18px;
        }
        .verdict.pass {
          background: var(--good-soft);
          color: var(--good);
        }
        .verdict.fail {
          background: var(--bad-soft);
          color: var(--bad);
        }
        .tiles {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 22px;
        }
        .tile {
          border-radius: 13px;
          padding: 14px;
          background: var(--soft);
        }
        .tile strong {
          display: block;
          font-size: 22px;
          font-weight: 800;
        }
        .tile span {
          font-size: 12px;
          font-weight: 700;
          color: var(--muted);
        }
        .tile.good {
          background: var(--good-soft);
        }
        .tile.good strong {
          color: var(--good);
        }
        .tile.bad {
          background: var(--bad-soft);
        }
        .tile.bad strong {
          color: var(--bad);
        }
        .tabs {
          display: flex;
          gap: 6px;
          background: var(--soft);
          padding: 4px;
          border-radius: 12px;
        }
        .tabs button {
          border: 0;
          background: transparent;
          color: var(--muted);
          padding: 7px 14px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .tabs button.on {
          background: var(--card);
          color: var(--text);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        }
        .review-opt {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 500;
          margin-top: 8px;
        }
        .review-opt.right {
          border-color: var(--good-line);
          background: var(--good-soft);
          color: var(--good);
        }
        .review-opt.wrong {
          border-color: var(--bad-line);
          background: var(--bad-soft);
          color: var(--bad);
        }
        .tag {
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 800;
        }
        .tag.good {
          background: var(--good-soft);
          color: var(--good);
        }
        .tag.bad {
          background: var(--bad-soft);
          color: var(--bad);
        }

        /* Progress page */
        .badges {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .badge {
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px;
          text-align: center;
          opacity: 0.45;
          filter: grayscale(1);
        }
        .badge.earned {
          opacity: 1;
          filter: none;
          background: var(--primary-soft);
          border-color: var(--primary-line);
        }
        .badge .icon {
          font-size: 26px;
        }
        .badge strong {
          display: block;
          font-size: 13px;
          margin-top: 4px;
        }
        .badge span {
          font-size: 11px;
          color: var(--muted);
        }
        .history {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 11px 0;
          border-bottom: 1px solid var(--border);
          font-size: 13px;
        }
        .history:last-child {
          border-bottom: 0;
        }
        .history small {
          display: block;
          color: var(--muted);
          font-size: 11px;
          margin-top: 2px;
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

        /* Custom dialog */
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
          max-width: 400px;
          background: var(--card);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 26px 24px 22px;
          text-align: center;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
          animation: pop-in 0.18s ease-out;
        }
        .modal-icon {
          width: 52px;
          height: 52px;
          margin: 0 auto 14px;
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
        .modal h3 {
          margin: 0 0 8px;
          font-size: 18px;
          letter-spacing: -0.3px;
        }
        .modal p {
          margin: 0 0 22px;
          font-size: 13px;
          line-height: 1.6;
          color: var(--muted);
        }
        .modal-actions {
          display: flex;
          gap: 10px;
        }
        .modal-actions .btn {
          flex: 1;
        }
        .btn-danger-solid {
          background: var(--bad);
          color: #fff;
          box-shadow: 0 6px 16px rgba(220, 38, 38, 0.3);
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
          .grid,
          .modes {
            grid-template-columns: 1fr;
          }
          .stats,
          .tiles {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .form-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .span-4 {
            grid-column: span 2;
          }
          .badges {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 480px) {
          .card {
            padding: 16px;
          }
          .savebar .btn {
            flex: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .confetti,
          .ring-fill {
            display: none;
          }
          .quiz-card,
          .btn,
          .switch,
          .switch i {
            transition: none;
          }
        }
        @media print {
          .no-print,
          .confetti {
            display: none !important;
          }
        }
      `}</style>

      {/* ------------------------------ Header ------------------------------ */}
      <div className="hero no-print">
        <div>
          <h2>
            Custom Quiz Maker <span className="pro">PRO</span>
          </h2>
          <p>
            Build quizzes in minutes, practice with instant feedback, track your progress, and earn
            badges as you learn.
          </p>
        </div>

        <div className="hero-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setDark((previous) => !previous)}
            aria-label="Toggle dark mode"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
          {mode !== "stats" && mode !== "taking" && (
            <button type="button" className="btn btn-secondary" onClick={() => setMode("stats")}>
              📈 My progress
            </button>
          )}
          {mode !== "library" && (
            <button type="button" className="btn btn-secondary" onClick={goLibrary}>
              ← Back to quizzes
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="toast no-print" role="status">
          {notice}
        </div>
      )}

      {/* ----------------------------- Library ----------------------------- */}
      {mode === "library" && (
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
              <strong>{badges.filter((badge) => badge.earned).length}/{badges.length}</strong>badges
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <span>Quizzes</span>
              <strong>{quizzes.length}</strong>
            </div>
            <div className="stat">
              <span>Questions</span>
              <strong>{quizzes.reduce((total, quiz) => total + quiz.questions.length, 0)}</strong>
            </div>
            <div className="stat">
              <span>Attempts</span>
              <strong>{attempts.length}</strong>
            </div>
            <div className="stat">
              <span>Average score</span>
              <strong>{attempts.length ? `${averageScore}%` : "–"}</strong>
            </div>
          </div>

          <div className="row" style={{ marginBottom: 22 }}>
            <button type="button" className="btn btn-primary" onClick={startNewQuiz}>
              + Create a quiz
            </button>
            <button type="button" className="btn btn-secondary" onClick={addSample}>
              Add sample quiz
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
                handleFileImport(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>

          {showImport && (
            <div className="card stack">
              <div>
                <h3 style={{ fontSize: 16 }}>Import quiz from JSON</h3>
                <p className="sub">Paste a quiz or backup file that you previously exported from this tool.</p>
              </div>
              <textarea
                className="textarea"
                rows={6}
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder="Paste your quiz JSON here..."
              />
              <div className="row">
                <button type="button" className="btn btn-primary" onClick={importFromText} disabled={!importText.trim()}>
                  Import quiz
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
            <h3 style={{ margin: 0, fontSize: 18 }}>Your quizzes</h3>
            <div className="row" style={{ flex: "1 1 320px", justifyContent: "flex-end", flexWrap: "nowrap" }}>
              <select
                className="select"
                style={{ width: "auto" }}
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                aria-label="Sort quizzes"
              >
                <option value="recent">Recently updated</option>
                <option value="name">Name A–Z</option>
                <option value="favorites">Favorites first</option>
              </select>
              <input
                type="search"
                className="input"
                style={{ maxWidth: 260, minWidth: 0 }}
                placeholder="Search your quizzes..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {categories.length > 2 && (
            <div className="chips">
              {categories.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`chip ${category === item ? "active" : ""}`}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {visibleQuizzes.length === 0 ? (
            <div className="card empty">
              <div className="empty-icon">📝</div>
              <h3 style={{ margin: "12px 0 4px", fontSize: 17 }}>
                {quizzes.length === 0 ? "No quizzes yet" : "No matching quizzes"}
              </h3>
              <p className="sub" style={{ maxWidth: 420, margin: "0 auto 18px" }}>
                {quizzes.length === 0
                  ? "Create your first quiz, or add a ready-made sample to see how it works."
                  : "Try another search term or category."}
              </p>
              {quizzes.length === 0 && (
                <div className="row" style={{ justifyContent: "center" }}>
                  <button type="button" className="btn btn-primary" onClick={startNewQuiz}>
                    Create your first quiz
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={addSample}>
                    Add sample quiz
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid">
              {visibleQuizzes.map((quiz) => {
                const stat = bestByQuiz[quiz.id];
                return (
                  <div className={`card quiz-card ${quiz.difficulty}`} key={quiz.id}>
                    <div className="quiz-top">
                      <h4 style={{ fontSize: 17, lineHeight: 1.3 }}>{quiz.title}</h4>
                      <button
                        type="button"
                        className={`star ${quiz.favorite ? "on" : ""}`}
                        onClick={() => toggleFavorite(quiz.id)}
                        aria-label={quiz.favorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        {quiz.favorite ? "★" : "☆"}
                      </button>
                    </div>
                    <p className="clamp">{quiz.description || "No description added."}</p>

                    <div className="meta">
                      <span className="pill accent">{quiz.category}</span>
                      <span className="pill">{quiz.difficulty}</span>
                      <span className="pill">{quiz.questions.length} questions</span>
                      <span className="pill">{quiz.timeLimit ? `${quiz.timeLimit} min` : "No time limit"}</span>
                    </div>

                    <div className="best">
                      {stat ? (
                        <>
                          Best score <b>{stat.best}%</b> · {stat.count} attempt{stat.count === 1 ? "" : "s"}
                          <div className="bar">
                            <div className="bar-fill" style={{ width: `${stat.best}%` }} />
                          </div>
                        </>
                      ) : (
                        "Not attempted yet"
                      )}
                    </div>

                    <div className="card-actions">
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => openIntro(quiz)}>
                        Start quiz
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => editQuiz(quiz)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => duplicateQuiz(quiz)}>
                        Duplicate
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => exportQuiz(quiz)}>
                        Export
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteQuiz(quiz)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------- Builder ----------------------------- */}
      {mode === "builder" && draft && (
        <div>
          <div className="card stack">
            <div>
              <h3 style={{ fontSize: 17 }}>Quiz details</h3>
              <p className="sub">Give your quiz a name, a category and the rules for passing.</p>
            </div>

            <div className="form-grid">
              <div className="field span-4">
                <label className="label" htmlFor="quiz-title">Quiz title</label>
                <input
                  id="quiz-title"
                  className="input"
                  value={draft.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                  placeholder="Example: Basic Science Quiz"
                  maxLength={100}
                />
              </div>

              <div className="field span-4">
                <label className="label" htmlFor="quiz-description">Description (optional)</label>
                <textarea
                  id="quiz-description"
                  className="textarea"
                  rows={2}
                  value={draft.description}
                  onChange={(event) => updateDraft({ description: event.target.value })}
                  placeholder="What is this quiz about?"
                  maxLength={300}
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="quiz-category">Category</label>
                <input
                  id="quiz-category"
                  className="input"
                  list="cqm-categories"
                  value={draft.category}
                  onChange={(event) => updateDraft({ category: event.target.value })}
                  placeholder="Science, History..."
                  maxLength={30}
                />
                <datalist id="cqm-categories">
                  {categories
                    .filter((item) => item !== "All")
                    .map((item) => (
                      <option key={item} value={item} />
                    ))}
                </datalist>
              </div>

              <div className="field">
                <label className="label" htmlFor="quiz-difficulty">Difficulty</label>
                <select
                  id="quiz-difficulty"
                  className="select"
                  value={draft.difficulty}
                  onChange={(event) => updateDraft({ difficulty: event.target.value as Difficulty })}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor="quiz-time">Time limit (min, 0 = none)</label>
                <input
                  id="quiz-time"
                  type="number"
                  min={0}
                  max={180}
                  className="input"
                  value={draft.timeLimit}
                  onChange={(event) =>
                    updateDraft({
                      timeLimit: Math.min(180, Math.max(0, Number(event.target.value) || 0)),
                    })
                  }
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="quiz-pass">Pass mark (%)</label>
                <input
                  id="quiz-pass"
                  type="number"
                  min={1}
                  max={100}
                  className="input"
                  value={draft.passMark}
                  onChange={(event) =>
                    updateDraft({
                      passMark: Math.min(100, Math.max(1, Number(event.target.value) || 1)),
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="between" style={{ marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17 }}>Questions</h3>
              <p className="sub">Add at least two answer options and choose the correct one.</p>
            </div>
            <div className="row">
              <span className="pill accent">{draft.questions.length} questions</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowBulk((previous) => !previous)}>
                ⚡ Quick add from text
              </button>
            </div>
          </div>

          {showBulk && (
            <div className="card stack">
              <div>
                <h3 style={{ fontSize: 16 }}>Quick add from text</h3>
                <p className="sub">
                  Paste many questions at once. Separate questions with a blank line. Mark the correct answer
                  with * or add an Answer line.
                </p>
              </div>
              <div className="code">{`What is the capital of France?
A) Berlin
*B) Paris
C) Madrid
Explanation: Paris has been the capital since 987.

Which gas do plants absorb?
A) Oxygen
B) Carbon dioxide
C) Helium
Answer: B`}</div>
              <textarea
                className="textarea"
                rows={8}
                value={bulkText}
                onChange={(event) => setBulkText(event.target.value)}
                placeholder="Paste your questions here..."
              />
              <div className="row">
                <button type="button" className="btn btn-primary" onClick={addBulkQuestions} disabled={!bulkText.trim()}>
                  Add questions
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBulk(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {draft.questions.map((question, index) => (
            <div className="card stack" key={question.id}>
              <div className="q-head">
                <h4 style={{ fontSize: 15 }}>Question {index + 1}</h4>
                <div className="row" style={{ gap: 6 }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => makeTrueFalse(question)}>
                    True / False
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => duplicateQuestion(question)}>
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => moveQuestion(index, -1)}
                    disabled={index === 0}
                    aria-label="Move question up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => moveQuestion(index, 1)}
                    disabled={index === draft.questions.length - 1}
                    aria-label="Move question down"
                  >
                    ↓
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteQuestion(question.id)}>
                    Remove
                  </button>
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor={`question-${question.id}`}>Question text</label>
                <textarea
                  id={`question-${question.id}`}
                  className="textarea"
                  rows={2}
                  value={question.text}
                  onChange={(event) => updateQuestion(question.id, { text: event.target.value })}
                  placeholder="Enter your question..."
                />
              </div>

              <div>
                <div className="between" style={{ marginBottom: 4 }}>
                  <span className="label">Answer options</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    Select the circle next to the correct answer.
                  </span>
                </div>

                {question.options.map((option, optionIndex) => (
                  <div className="opt-row" key={optionIndex}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
                      <input
                        type="radio"
                        name={`correct-${question.id}`}
                        checked={question.correctAnswer === optionIndex}
                        onChange={() => updateQuestion(question.id, { correctAnswer: optionIndex })}
                        className="radio"
                        aria-label={`Mark option ${optionIndex + 1} as correct`}
                      />
                      <span className="opt-letter">{String.fromCharCode(65 + optionIndex)}</span>
                    </label>

                    <input
                      className="input"
                      value={option}
                      onChange={(event) => {
                        const options = [...question.options];
                        options[optionIndex] = event.target.value;
                        updateQuestion(question.id, { options });
                      }}
                      placeholder={`Answer option ${optionIndex + 1}`}
                      aria-label={`Answer option ${optionIndex + 1}`}
                    />

                    <button
                      type="button"
                      className="x-btn"
                      onClick={() => removeOption(question, optionIndex)}
                      disabled={question.options.length <= 2}
                      aria-label={`Remove option ${optionIndex + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}

                <div className="between" style={{ marginTop: 12 }}>
                  <button type="button" className="link-btn" onClick={() => addOption(question)} disabled={question.options.length >= 6}>
                    + Add answer option
                  </button>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    {question.options.length} of 6 options used
                  </span>
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor={`explanation-${question.id}`}>Explanation (optional)</label>
                <textarea
                  id={`explanation-${question.id}`}
                  className="textarea"
                  rows={2}
                  value={question.explanation}
                  onChange={(event) => updateQuestion(question.id, { explanation: event.target.value })}
                  placeholder="Explain why this answer is correct..."
                />
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-secondary dashed" onClick={addQuestion}>
            + Add another question
          </button>

          <div className="savebar">
            <button type="button" className="btn btn-secondary" onClick={goLibrary}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveDraft}>
              Save quiz
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------ Intro ------------------------------ */}
      {mode === "intro" && target && (
        <div className="card stack">
          <div>
            <h3 style={{ fontSize: 22, letterSpacing: -0.4 }}>{target.title}</h3>
            {target.description && <p className="sub">{target.description}</p>}
          </div>

          <div className="meta" style={{ marginBottom: 0 }}>
            <span className="pill accent">{target.category}</span>
            <span className="pill">{target.difficulty}</span>
            <span className="pill">{target.questions.length} questions</span>
            <span className="pill">{target.timeLimit ? `${target.timeLimit} min` : "No time limit"}</span>
            <span className="pill">Pass at {target.passMark}%</span>
          </div>

          <div>
            <p className="label" style={{ marginBottom: 10 }}>Choose a mode</p>
            <div className="modes">
              <button type="button" className={`mode ${playMode === "exam" ? "on" : ""}`} onClick={() => setPlayMode("exam")}>
                <strong>📝 Exam mode</strong>
                <span>Answer everything first. See your score and review at the end.</span>
              </button>
              <button type="button" className={`mode ${playMode === "practice" ? "on" : ""}`} onClick={() => setPlayMode("practice")}>
                <strong>💡 Practice mode</strong>
                <span>Get instant feedback and the explanation after every answer.</span>
              </button>
            </div>
          </div>

          <div className="switch-row">
            <div>
              <strong id="cqm-shuffle-label">Shuffle questions and answers</strong>
              <span>Get a different order every time you play.</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={shuffle}
              aria-labelledby="cqm-shuffle-label"
              className={`switch ${shuffle ? "on" : ""}`}
              onClick={() => setShuffle((previous) => !previous)}
            >
              <i />
            </button>
          </div>

          <div className="row">
            <button type="button" className="btn btn-primary" onClick={beginQuiz}>
              Start now
            </button>
            <button type="button" className="btn btn-secondary" onClick={goLibrary}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------ Taking ------------------------------ */}
      {mode === "taking" && play && currentQ && (
        <div>
          <div className="card">
            <div className="between" style={{ alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 18 }}>{play.title}</h3>
                <p className="sub">
                  {playMode === "practice" ? "Practice mode · instant feedback" : "Exam mode · results at the end"}
                </p>
              </div>
              {play.timeLimit > 0 && (
                <div className={`timer ${remainingTime <= 60 ? "low" : ""}`}>
                  <small>Time remaining</small>
                  <strong>{formatTime(remainingTime)}</strong>
                </div>
              )}
            </div>

            <div className="progress">
              <div
                className="progress-fill"
                style={{ width: `${((currentQuestion + 1) / play.questions.length) * 100}%` }}
              />
            </div>
            <div className="progress-meta">
              <span>Question {currentQuestion + 1} of {play.questions.length}</span>
              <span>{answeredCount} answered</span>
            </div>
          </div>

          <div className="card stack">
            <div className="between" style={{ alignItems: "flex-start" }}>
              <h3 style={{ fontSize: 17, lineHeight: 1.6, flex: 1 }}>{currentQ.text}</h3>
              <button
                type="button"
                className={`flag ${flagged[currentQ.id] ? "on" : ""}`}
                onClick={() => toggleFlag(currentQ.id)}
              >
                {flagged[currentQ.id] ? "⚑ Flagged" : "⚐ Flag"}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {currentQ.options.map((option, index) => {
                const selected = answers[currentQ.id] === index;
                const locked = playMode === "practice" && answers[currentQ.id] !== undefined;
                let state = selected ? "selected" : "";
                if (locked) {
                  if (index === currentQ.correctAnswer) state = "right";
                  else if (selected) state = "wrong";
                  else state = "";
                }

                return (
                  <button
                    type="button"
                    key={index}
                    className={`answer ${state}`}
                    onClick={() => selectAnswer(currentQ.id, index)}
                    disabled={locked}
                  >
                    <span className="opt-letter">{String.fromCharCode(65 + index)}</span>
                    <span>{option}</span>
                    {locked && index === currentQ.correctAnswer && <span style={{ marginLeft: "auto" }}>✓</span>}
                    {locked && selected && index !== currentQ.correctAnswer && <span style={{ marginLeft: "auto" }}>✕</span>}
                    {!locked && <kbd>{index + 1}</kbd>}
                  </button>
                );
              })}
            </div>

            {playMode === "practice" && answers[currentQ.id] !== undefined && (
              <div className="feedback">
                <b>
                  {answers[currentQ.id] === currentQ.correctAnswer
                    ? "Correct! 🎉"
                    : `Not quite. The correct answer is ${String.fromCharCode(65 + currentQ.correctAnswer)}.`}
                </b>
                {currentQ.explanation || "No explanation was added for this question."}
              </div>
            )}

            <div className="between" style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentQuestion((previous) => Math.max(0, previous - 1))}
                disabled={currentQuestion === 0}
              >
                Previous
              </button>

              {currentQuestion < play.questions.length - 1 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setCurrentQuestion((previous) => Math.min(play.questions.length - 1, previous + 1))}
                >
                  Next question
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={confirmFinish}>
                  Submit quiz
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <p className="label" style={{ margin: "0 0 12px" }}>Jump to a question</p>
            <div className="jump">
              {play.questions.map((question, index) => (
                <button
                  type="button"
                  key={question.id}
                  className={`${currentQuestion === index ? "now" : answers[question.id] !== undefined ? "done" : ""} ${
                    flagged[question.id] ? "flagged" : ""
                  }`}
                  onClick={() => setCurrentQuestion(index)}
                  aria-label={`Go to question ${index + 1}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <p className="note" style={{ marginTop: 14 }}>
              Shortcuts: press 1–6 to answer, ← → to move between questions and F to flag.
            </p>
          </div>

          <div style={{ textAlign: "right", marginBottom: 24 }}>
            <button type="button" className="link-btn" style={{ color: "var(--bad)", fontSize: 13 }} onClick={confirmFinish}>
              Finish quiz now
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------ Results ------------------------------ */}
      {mode === "results" && play && (
        <div>
          {passed && percentage >= 60 && (
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

          <div className="card" style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: 22, letterSpacing: -0.4 }}>
              {percentage === 100 ? "Perfect score! 🏆" : passed ? "Well done! 🎉" : "Keep practicing 📚"}
            </h3>
            <p className="sub" style={{ margin: "4px 0 22px" }}>
              Here is how you performed in {play.title}.
            </p>

            <div className="ring">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <circle cx="75" cy="75" r={RING_RADIUS} fill="none" stroke="var(--soft)" strokeWidth="12" />
                <circle
                  className="ring-fill"
                  cx="75"
                  cy="75"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="url(#cqm-grad)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={RING_LENGTH}
                  strokeDashoffset={RING_LENGTH - (RING_LENGTH * percentage) / 100}
                />
                <defs>
                  <linearGradient id="cqm-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ff5a1f" />
                    <stop offset="100%" stopColor="#ffb020" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="ring-text">
                <strong>{percentage}%</strong>
                <span>Your score</span>
              </div>
            </div>

            <span className={`verdict ${passed ? "pass" : "fail"}`}>
              {passed ? "Passed" : "Not passed"} · pass mark {play.passMark}%
            </span>

            <div className="tiles">
              <div className="tile good">
                <strong>{score}</strong>
                <span>Correct</span>
              </div>
              <div className="tile bad">
                <strong>{totalQuestions - score}</strong>
                <span>Incorrect</span>
              </div>
              <div className="tile">
                <strong>{totalQuestions}</strong>
                <span>Total</span>
              </div>
              <div className="tile">
                <strong>{formatTime(lastAttempt?.duration || 0)}</strong>
                <span>Time taken</span>
              </div>
            </div>

            {!retryRef.current && lastAttempt && (
              <p className="sub" style={{ margin: "-6px 0 20px" }}>
                +{lastAttempt.score * 10 + (lastAttempt.passed ? 25 : 0)} XP earned
              </p>
            )}

            <div className="row no-print" style={{ justifyContent: "center" }}>
              <button type="button" className="btn btn-primary" onClick={tryAgain}>
                Try again
              </button>
              {score < totalQuestions && (
                <button type="button" className="btn btn-secondary" onClick={retryWrong}>
                  Retry missed questions
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={copyResult}>
                Copy result
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
                Print
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setMode("library")}>
                Back to quizzes
              </button>
            </div>
          </div>

          <div className="between" style={{ margin: "8px 0 14px" }}>
            <h3 style={{ margin: 0, fontSize: 17 }}>Review your answers</h3>
            <div className="tabs no-print">
              {(["all", "wrong", "flagged"] as ReviewFilter[]).map((filter) => (
                <button
                  type="button"
                  key={filter}
                  className={reviewFilter === filter ? "on" : ""}
                  onClick={() => setReviewFilter(filter)}
                >
                  {filter === "all" ? "All" : filter === "wrong" ? "Incorrect" : "Flagged"}
                </button>
              ))}
            </div>
          </div>

          {reviewItems.length === 0 && (
            <div className="card empty" style={{ padding: 28 }}>
              <p className="sub" style={{ margin: 0 }}>Nothing to show in this view.</p>
            </div>
          )}

          {reviewItems.map(({ question, index }) => {
            const selected = answers[question.id];
            const isCorrect = selected === question.correctAnswer;

            return (
              <div className="card" key={question.id}>
                <div className="between" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>
                    Question {index + 1} {flagged[question.id] ? "· ⚑ flagged" : ""}
                  </span>
                  <span className={`tag ${isCorrect ? "good" : "bad"}`}>{isCorrect ? "Correct" : "Incorrect"}</span>
                </div>

                <h4 style={{ fontSize: 15, marginBottom: 10 }}>{question.text}</h4>

                {question.options.map((option, optionIndex) => {
                  const isAnswer = optionIndex === question.correctAnswer;
                  const isSelected = selected === optionIndex;
                  return (
                    <div
                      key={optionIndex}
                      className={`review-opt ${isAnswer ? "right" : isSelected ? "wrong" : ""}`}
                    >
                      <b style={{ marginRight: 8 }}>{String.fromCharCode(65 + optionIndex)}.</b>
                      {option}
                      {isAnswer && <b style={{ marginLeft: 8 }}>✓ Correct answer</b>}
                      {isSelected && !isAnswer && <b style={{ marginLeft: 8 }}>Your answer</b>}
                    </div>
                  );
                })}

                {selected === undefined && (
                  <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--bad)", fontWeight: 700 }}>
                    You did not answer this question.
                  </p>
                )}

                {question.explanation && (
                  <div className="feedback" style={{ marginTop: 14 }}>
                    <b style={{ color: "var(--primary)" }}>Explanation</b>
                    {question.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------ Progress ------------------------------ */}
      {mode === "stats" && (
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
                {totalXp} XP total · {XP_PER_LEVEL - (totalXp % XP_PER_LEVEL)} XP to level {level + 1}
              </small>
            </div>
            <div className="strip-pill">
              <strong>🔥 {streak}</strong>day streak
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <span>Attempts</span>
              <strong>{attempts.length}</strong>
            </div>
            <div className="stat">
              <span>Average score</span>
              <strong>{attempts.length ? `${averageScore}%` : "–"}</strong>
            </div>
            <div className="stat">
              <span>Best score</span>
              <strong>{attempts.length ? `${Math.max(...attempts.map((a) => a.percentage))}%` : "–"}</strong>
            </div>
            <div className="stat">
              <span>Pass rate</span>
              <strong>
                {attempts.length
                  ? `${Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100)}%`
                  : "–"}
              </strong>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 17, marginBottom: 14 }}>Badges</h3>
            <div className="badges">
              {badges.map((badge) => (
                <div className={`badge ${badge.earned ? "earned" : ""}`} key={badge.name}>
                  <div className="icon">{badge.icon}</div>
                  <strong>{badge.name}</strong>
                  <span>{badge.hint}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="between" style={{ marginBottom: 6 }}>
              <h3 style={{ fontSize: 17 }}>Recent attempts</h3>
              <div className="row">
                <button type="button" className="btn btn-secondary btn-sm" onClick={exportHistory} disabled={!attempts.length}>
                  Export CSV
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={clearHistory} disabled={!attempts.length}>
                  Clear history
                </button>
              </div>
            </div>

            {attempts.length === 0 ? (
              <p className="sub" style={{ padding: "18px 0" }}>
                No attempts yet. Finish a quiz and your results will show up here.
              </p>
            ) : (
              attempts.slice(0, 12).map((attempt) => (
                <div className="history" key={attempt.id}>
                  <div>
                    <b>{attempt.quizTitle}</b>
                    <small>
                      {formatDate(attempt.date)} · {attempt.mode} · {formatTime(attempt.duration)}
                    </small>
                  </div>
                  <span className={`tag ${attempt.passed ? "good" : "bad"}`}>
                    {attempt.percentage}% · {attempt.score}/{attempt.total}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ------------------------------ Footer ------------------------------ */}
      {(mode === "library" || mode === "builder") && (
        <div className="card no-print" style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>How to get the most from Quiz Maker Pro</h3>
          <ol className="tips">
            <li><b>Create or import</b> a quiz. Use Quick add to paste many questions at once.</li>
            <li><b>Add explanations</b> so Practice mode can teach, not just test.</li>
            <li><b>Start with Practice mode</b>, then switch to Exam mode with shuffle turned on.</li>
            <li><b>Flag</b> tricky questions while you play, then review them at the end.</li>
            <li><b>Retry missed questions</b> to turn mistakes into progress, and earn XP and badges.</li>
          </ol>
          <p className="note">
            Your quizzes, history and preferences are saved in this browser using local storage. Clearing browser
            data or switching browsers or devices may remove or hide them. Use Backup all to keep a copy.
          </p>
        </div>
      )}

      {/* ------------------------- Custom dialog ------------------------- */}
      {dialog &&
        typeof document !== "undefined" &&
        createPortal(
          <div className={`modal-root ${dark ? "dark" : ""}`}>
        <div className="modal-backdrop no-print" onClick={() => setDialog(null)}>
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cqm-dialog-title"
            aria-describedby="cqm-dialog-message"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`modal-icon ${dialog.tone}`}>{dialog.tone === "danger" ? "⚠️" : "✅"}</div>
            <h3 id="cqm-dialog-title">{dialog.title}</h3>
            <p id="cqm-dialog-message">{dialog.message}</p>
            <div className="modal-actions">
              <button
                type="button"
                ref={cancelRef}
                className="btn btn-secondary"
                onClick={() => setDialog(null)}
              >
                {dialog.cancelLabel || "Cancel"}
              </button>
              <button
                type="button"
                className={`btn ${dialog.tone === "danger" ? "btn-danger-solid" : "btn-primary"}`}
                ref={confirmRef}
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