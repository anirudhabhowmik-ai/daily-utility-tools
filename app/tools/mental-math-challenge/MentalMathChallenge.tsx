"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import ToolShell from "../ToolShell";

type Difficulty = "easy" | "medium" | "hard";
type Phase = "ready" | "playing" | "complete";
type Operator = "+" | "−" | "×" | "÷";

type Question = {
  expression: string;
  answer: number;
};

type Feedback = {
  correct: boolean;
  expected: number;
  points: number;
};

type BestScores = Record<Difficulty, number>;

type StoredData = {
  best: BestScores;
  bestStreak: number;
  gamesPlayed: number;
};

const GAME_TIME = 60;
const BASE_POINTS = 10;
const PENALTY = 2;
const STORAGE_KEY = "toolsab-mental-math-pro-v1";

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const DIFFICULTIES: Record<
  Difficulty,
  { label: string; description: string; meta: string }
> = {
  easy: {
    label: "Easy",
    description: "Addition & subtraction",
    meta: "Numbers up to 30",
  },
  medium: {
    label: "Medium",
    description: "All four operations",
    meta: "Numbers up to 160",
  },
  hard: {
    label: "Hard",
    description: "Big numbers & multiplication",
    meta: "Numbers up to 1500",
  },
};

const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard"];

const EMPTY_BEST: BestScores = { easy: 0, medium: 0, hard: 0 };

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function streakBonus(streak: number): number {
  if (streak >= 10) return 10;
  if (streak >= 5) return 5;
  if (streak >= 3) return 2;
  return 0;
}

function buildQuestion(difficulty: Difficulty): Question {
  let a = 0;
  let b = 0;
  let answer = 0;

  const operations: Operator[] =
    difficulty === "easy" ? ["+", "−"] : ["+", "−", "×", "÷"];

  const operator = operations[randomInt(0, operations.length - 1)];

  if (difficulty === "easy") {
    if (operator === "+") {
      a = randomInt(2, 20);
      b = randomInt(2, 20);
      answer = a + b;
    } else {
      a = randomInt(6, 30);
      b = randomInt(1, a - 1);
      answer = a - b;
    }
  }

  if (difficulty === "medium") {
    if (operator === "+") {
      a = randomInt(12, 99);
      b = randomInt(12, 99);
      answer = a + b;
    } else if (operator === "−") {
      a = randomInt(30, 160);
      b = randomInt(5, a - 5);
      answer = a - b;
    } else if (operator === "×") {
      a = randomInt(3, 12);
      b = randomInt(3, 12);
      answer = a * b;
    } else {
      b = randomInt(2, 12);
      answer = randomInt(2, 12);
      a = b * answer;
    }
  }

  if (difficulty === "hard") {
    if (operator === "+") {
      a = randomInt(120, 999);
      b = randomInt(120, 999);
      answer = a + b;
    } else if (operator === "−") {
      a = randomInt(300, 1500);
      b = randomInt(50, a - 50);
      answer = a - b;
    } else if (operator === "×") {
      a = randomInt(12, 35);
      b = randomInt(4, 19);
      answer = a * b;
    } else {
      b = randomInt(4, 19);
      answer = randomInt(12, 50);
      a = b * answer;
    }
  }

  return { expression: `${a} ${operator} ${b}`, answer };
}

function createQuestion(difficulty: Difficulty, previous?: string): Question {
  let next = buildQuestion(difficulty);
  let guard = 0;
  while (previous && next.expression === previous && guard < 8) {
    next = buildQuestion(difficulty);
    guard += 1;
  }
  return next;
}

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getRank(score: number): { title: string; note: string } {
  if (score >= 350)
    return {
      title: "Math Machine",
      note: "Elite speed and precision. That was outstanding.",
    };
  if (score >= 220)
    return {
      title: "Human Calculator",
      note: "Excellent work — you handled a serious volume of calculations.",
    };
  if (score >= 130)
    return {
      title: "Sharp Thinker",
      note: "Strong performance. A little more speed and you'll break 220.",
    };
  if (score >= 60)
    return {
      title: "Solid Effort",
      note: "Good foundation. Keep drilling and the numbers will come faster.",
    };
  return {
    title: "Warming Up",
    note: "Every round builds the muscle. Try again and beat your best.",
  };
}

export default function MentalMathChallenge() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<Phase>("ready");
  const [question, setQuestion] = useState<Question>(() =>
    createQuestion("easy"),
  );
  const [answerInput, setAnswerInput] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [msLeft, setMsLeft] = useState(GAME_TIME * 1000);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const [bestScores, setBestScores] = useState<BestScores>(EMPTY_BEST);
  const [globalBestStreak, setGlobalBestStreak] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);

  const [soundOn, setSoundOn] = useState(true);

  const deadlineRef = useRef(0);
  const savedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const secondsLeft = Math.ceil(msLeft / 1000);
  const ringProgress = Math.max(0, Math.min(1, msLeft / (GAME_TIME * 1000)));
  const ringOffset = RING_CIRCUMFERENCE * (1 - ringProgress);

  const accuracy =
    answered > 0 ? Math.round((correctCount / answered) * 100) : 0;
  const rank = getRank(score);

  /* ------------------------------------------------------------------ */
  /* Storage                                                            */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<StoredData> | null;
      const best: Partial<BestScores> = parsed?.best ?? {};

      setBestScores({
        easy: Number(best.easy) || 0,
        medium: Number(best.medium) || 0,
        hard: Number(best.hard) || 0,
      });
      setGlobalBestStreak(Number(parsed?.bestStreak) || 0);
      setGamesPlayed(Number(parsed?.gamesPlayed) || 0);
    } catch {
      /* storage unavailable — the game still works */
    }
  }, []);

  useEffect(() => {
    if (phase !== "complete" || savedRef.current) return;
    savedRef.current = true;

    const nextBest: BestScores = {
      ...bestScores,
      [difficulty]: Math.max(bestScores[difficulty] ?? 0, score),
    };
    const nextGlobalStreak = Math.max(globalBestStreak, bestStreak);
    const nextGames = gamesPlayed + 1;

    setBestScores(nextBest);
    setGlobalBestStreak(nextGlobalStreak);
    setGamesPlayed(nextGames);

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          best: nextBest,
          bestStreak: nextGlobalStreak,
          gamesPlayed: nextGames,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [
    phase,
    score,
    difficulty,
    bestStreak,
    bestScores,
    globalBestStreak,
    gamesPlayed,
  ]);

  /* ------------------------------------------------------------------ */
  /* Timer                                                              */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (phase !== "playing") return;

    const tick = () => {
      setMsLeft(Math.max(0, deadlineRef.current - Date.now()));
    };

    tick();
    const id = window.setInterval(tick, 100);

    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "playing" && msLeft <= 0) {
      setPhase("complete");
      setFeedback(null);
    }
  }, [phase, msLeft]);

  /* ------------------------------------------------------------------ */
  /* Sound                                                              */
  /* ------------------------------------------------------------------ */

  const playSound = useCallback(
    (kind: "correct" | "wrong" | "complete") => {
      if (!soundOn) return;
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctor) return;

        if (!audioRef.current) audioRef.current = new Ctor();
        const ctx = audioRef.current;
        if (ctx.state === "suspended") void ctx.resume();

        const notes =
          kind === "correct"
            ? [740, 980]
            : kind === "wrong"
              ? [220, 165]
              : [523, 659, 784, 1046];

        const now = ctx.currentTime;

        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + index * 0.085;

          osc.type = kind === "wrong" ? "triangle" : "sine";
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.09, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.26);
        });
      } catch {
        /* audio is a bonus, never block gameplay */
      }
    },
    [soundOn],
  );

  useEffect(() => {
    return () => {
      audioRef.current?.close().catch(() => undefined);
      audioRef.current = null;
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Focus & keyboard                                                   */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (phase === "playing" && !feedback) {
      inputRef.current?.focus();
    }
  }, [phase, feedback]);

  /* ------------------------------------------------------------------ */
  /* Game flow                                                          */
  /* ------------------------------------------------------------------ */

  const resetRoundStats = () => {
    setAnswerInput("");
    setFeedback(null);
    setMsLeft(GAME_TIME * 1000);
    setScore(0);
    setAnswered(0);
    setCorrectCount(0);
    setMistakes(0);
    setStreak(0);
    setBestStreak(0);
  };

  const startGame = () => {
    savedRef.current = false;
    setQuestion(createQuestion(difficulty));
    resetRoundStats();
    deadlineRef.current = Date.now() + GAME_TIME * 1000;
    setPhase("playing");
  };

  const resetGame = () => {
    savedRef.current = false;
    setPhase("ready");
    setQuestion(createQuestion(difficulty));
    resetRoundStats();
  };

  const resolveAnswer = useCallback(
    (correct: boolean) => {
      setAnswered((previous) => previous + 1);

      if (correct) {
        const nextStreak = streak + 1;
        const gained = BASE_POINTS + streakBonus(nextStreak);

        setScore((previous) => previous + gained);
        setCorrectCount((previous) => previous + 1);
        setStreak(nextStreak);
        setBestStreak((previous) => Math.max(previous, nextStreak));
        setFeedback({
          correct: true,
          expected: question.answer,
          points: gained,
        });
        playSound("correct");
      } else {
        const lost = Math.min(PENALTY, score);

        setScore((previous) => Math.max(0, previous - PENALTY));
        setMistakes((previous) => previous + 1);
        setStreak(0);
        setFeedback({
          correct: false,
          expected: question.answer,
          points: -lost,
        });
        playSound("wrong");
      }
    },
    [streak, score, question.answer, playSound],
  );

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (phase !== "playing" || feedback || msLeft <= 0) return;

    const trimmed = answerInput.trim();
    if (!/^-?\d+$/.test(trimmed)) return;

    const submitted = Number(trimmed);
    if (!Number.isSafeInteger(submitted)) return;

    resolveAnswer(submitted === question.answer);
  };

  const handleSkip = () => {
    if (phase !== "playing" || feedback || msLeft <= 0) return;
    resolveAnswer(false);
  };

  const nextQuestion = useCallback(() => {
    if (phase !== "playing" || !feedback) return;
    setQuestion((previous) => createQuestion(difficulty, previous.expression));
    setAnswerInput("");
    setFeedback(null);
  }, [phase, feedback, difficulty]);

  useEffect(() => {
    if (phase !== "playing" || !feedback) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        nextQuestion();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, feedback, nextQuestion]);

  const isAnswerValid = /^-?\d+$/.test(answerInput.trim());
  const isWarning = secondsLeft <= 10 && phase === "playing";

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <ToolShell title="Mental Math Challenge" onReset={resetGame} wide>
      <div className="mm-tool">
        <div className="mm-header">
          <div className="mm-header-main">
            <span className="mm-eyebrow">QUICK THINKING CHALLENGE</span>
            <h2>How fast can you solve the math?</h2>
            <p>
              Solve as many arithmetic questions as you can before the 60-second
              timer runs out. Streaks multiply your score.
            </p>
          </div>

          <div className="mm-best-card">
            <span>PERSONAL BEST</span>
            <strong>{bestScores[difficulty].toLocaleString()}</strong>
            <small>{DIFFICULTIES[difficulty].label} mode</small>
          </div>
        </div>

        {/* ---------------------------- READY ---------------------------- */}
        {phase === "ready" && (
          <section className="mm-panel mm-ready">
            <div className="mm-hero" aria-hidden="true">
              <div className="mm-hero-glow" />
              <div className="mm-hero-row">
                <span className="mm-hero-q">48 + 27</span>
                <span className="mm-hero-eq">=</span>
                <span className="mm-hero-a">75</span>
              </div>
            </div>

            <h3 className="mm-ready-title">
              Ready for a mental math challenge?
            </h3>
            <p className="mm-ready-text">
              Pick a difficulty, solve each question in your head, and see how
              many points you can bank in a single minute. Consecutive correct
              answers unlock bonus points.
            </p>

            <div className="mm-difficulty">
              <span className="mm-section-label">SELECT DIFFICULTY</span>
              <div className="mm-difficulty-grid">
                {DIFFICULTY_ORDER.map((level) => {
                  const active = difficulty === level;
                  return (
                    <button
                      type="button"
                      key={level}
                      className={`mm-diff-card ${active ? "is-active" : ""}`}
                      onClick={() => setDifficulty(level)}
                      aria-pressed={active}
                    >
                      <div className="mm-diff-head">
                        <strong>{DIFFICULTIES[level].label}</strong>
                        <span className="mm-diff-check" aria-hidden="true">
                          ✓
                        </span>
                      </div>
                      <span className="mm-diff-desc">
                        {DIFFICULTIES[level].description}
                      </span>
                      <span className="mm-diff-meta">
                        {DIFFICULTIES[level].meta}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mm-info-grid">
              <div className="mm-info-item">
                <strong>60s</strong>
                <span>Time limit</span>
              </div>
              <div className="mm-info-item">
                <strong>+10</strong>
                <span>Correct answer</span>
              </div>
              <div className="mm-info-item">
                <strong>−2</strong>
                <span>Wrong / skip</span>
              </div>
              <div className="mm-info-item">
                <strong>+10</strong>
                <span>Streak bonus</span>
              </div>
            </div>

            <div className="mm-actions">
              <button
                type="button"
                className="mm-btn mm-btn-primary"
                onClick={startGame}
              >
                Start challenge <span aria-hidden="true">→</span>
              </button>
            </div>

            {gamesPlayed > 0 && (
              <p className="mm-career">
                {gamesPlayed.toLocaleString()}{" "}
                {gamesPlayed === 1 ? "round" : "rounds"} played · best streak{" "}
                {globalBestStreak}
              </p>
            )}
          </section>
        )}

        {/* --------------------------- PLAYING --------------------------- */}
        {phase === "playing" && (
          <section className="mm-panel mm-game">
            <div className="mm-hud">
              <div className="mm-hud-stat">
                <span>SCORE</span>
                <strong key={`score-${score}`} className="mm-pop">
                  {score}
                </strong>
              </div>

              <div
                className={`mm-ring ${isWarning ? "is-warning" : ""}`}
                aria-live="polite"
              >
                <svg viewBox="0 0 120 120" className="mm-ring-svg">
                  <circle
                    cx="60"
                    cy="60"
                    r={RING_RADIUS}
                    className="mm-ring-track"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={RING_RADIUS}
                    className="mm-ring-progress"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="mm-ring-text">
                  <strong>{formatTime(secondsLeft)}</strong>
                  <span>TIME LEFT</span>
                </div>
              </div>

              <div className="mm-hud-stat mm-hud-right">
                <span>STREAK</span>
                <strong key={`streak-${streak}`} className="mm-pop">
                  {streak} <small aria-hidden="true">🔥</small>
                </strong>
              </div>
            </div>

            <div className="mm-question-card">
              <span className="mm-eyebrow">
                {DIFFICULTIES[difficulty].label.toUpperCase()} QUESTION
              </span>

              <div className="mm-expression">
                <span>{question.expression}</span>
                <em>=</em>
                <b
                  className={
                    feedback ? (feedback.correct ? "is-ok" : "is-bad") : ""
                  }
                >
                  {feedback ? question.answer : "?"}
                </b>
              </div>

              <form className="mm-answer" onSubmit={submitAnswer}>
                <div className="mm-answer-row">
                  <input
                    ref={inputRef}
                    id="mental-math-answer"
                    className="mm-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Your answer"
                    aria-label="Your answer"
                    value={answerInput}
                    onChange={(event) => setAnswerInput(event.target.value)}
                    disabled={!!feedback || msLeft <= 0}
                  />
                  <button
                    type="submit"
                    className="mm-btn mm-btn-primary mm-submit"
                    disabled={!!feedback || !isAnswerValid || msLeft <= 0}
                  >
                    Submit
                  </button>
                </div>

                {!feedback ? (
                  <div className="mm-answer-meta">
                    <span>Press Enter to submit</span>
                    <button
                      type="button"
                      className="mm-skip"
                      onClick={handleSkip}
                    >
                      Skip (−2)
                    </button>
                  </div>
                ) : (
                  <div
                    className={`mm-feedback ${
                      feedback.correct ? "is-correct" : "is-wrong"
                    }`}
                    role="status"
                  >
                    <div className="mm-feedback-body">
                      <span className="mm-feedback-icon" aria-hidden="true">
                        {feedback.correct ? "✓" : "✕"}
                      </span>
                      <div>
                        <strong>
                          {feedback.correct ? "Correct!" : "Not quite"}
                        </strong>
                        <span>
                          {feedback.correct
                            ? `You earned ${feedback.points} points.`
                            : `The answer was ${feedback.expected}. ${feedback.points} pts.`}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mm-btn mm-btn-primary mm-next"
                      onClick={nextQuestion}
                    >
                      Next question <span aria-hidden="true">→</span>
                    </button>
                  </div>
                )}
              </form>

              <div className="mm-live-stats">
                <div>
                  <span>Answered</span>
                  <strong>{answered}</strong>
                </div>
                <div>
                  <span>Correct</span>
                  <strong>{correctCount}</strong>
                </div>
                <div>
                  <span>Incorrect</span>
                  <strong>{mistakes}</strong>
                </div>
              </div>
            </div>

            <p className="mm-game-hint">
              Solve in your head. Three correct in a row starts a streak bonus.
            </p>
          </section>
        )}

        {/* --------------------------- COMPLETE -------------------------- */}
        {phase === "complete" && (
          <section className="mm-panel mm-results">
            <div className="mm-rank">
              <span className="mm-rank-badge" aria-hidden="true">
                ★
              </span>
              <span className="mm-rank-title">{rank.title}</span>
            </div>

            <span className="mm-eyebrow">CHALLENGE COMPLETED</span>
            <h3 className="mm-results-title">Your mental math results</h3>

            <div className="mm-final-score">
              <strong>{score.toLocaleString()}</strong>
              <span>points</span>
            </div>

            <p className="mm-result-message">{rank.note}</p>

            <div className="mm-accuracy">
              <div className="mm-accuracy-head">
                <span>Accuracy</span>
                <strong>{accuracy}%</strong>
              </div>
              <div className="mm-accuracy-track">
                <div
                  className="mm-accuracy-fill"
                  style={{ width: `${accuracy}%` }}
                />
              </div>
            </div>

            <div className="mm-result-grid">
              <div>
                <strong>{answered}</strong>
                <span>Answered</span>
              </div>
              <div>
                <strong>{correctCount}</strong>
                <span>Correct</span>
              </div>
              <div>
                <strong>{mistakes}</strong>
                <span>Incorrect</span>
              </div>
              <div>
                <strong>{bestStreak}</strong>
                <span>Best streak</span>
              </div>
              <div>
                <strong>{accuracy}%</strong>
                <span>Accuracy</span>
              </div>
              <div>
                <strong>{bestScores[difficulty].toLocaleString()}</strong>
                <span>Personal best</span>
              </div>
            </div>

            <div className="mm-result-note">
              <strong>How your score works</strong>
              <p>
                Each correct answer is worth 10 points. Reach a streak of 3, 5
                or 10 correct answers in a row to earn a bonus of +2, +5 or +10
                per question. Wrong answers and skips cost 2 points and reset
                your streak. Your score can never drop below zero.
              </p>
            </div>

            <div className="mm-actions">
              <button
                type="button"
                className="mm-btn mm-btn-primary"
                onClick={startGame}
              >
                Play again <span aria-hidden="true">↻</span>
              </button>
              <button
                type="button"
                className="mm-btn mm-btn-ghost"
                onClick={resetGame}
              >
                Change difficulty
              </button>
            </div>
          </section>
        )}

        <div className="mm-footer">
          <span aria-hidden="true">ⓘ</span>
          <p>
            Your best scores, best streak and rounds played are saved locally in
            this browser when storage is available.
          </p>
          <button
            type="button"
            className="mm-sound"
            onClick={() => setSoundOn((previous) => !previous)}
            aria-pressed={soundOn}
          >
            {soundOn ? "🔊 Sound on" : "🔇 Sound off"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .mm-tool {
          --mm: #ff682f;
          --mm-dark: #e04f16;
          --mm-deep: #b83c0c;
          --mm-soft: #fff3ed;
          --mm-soft-2: #ffe7db;
          --mm-line: #ffd9c8;
          --mm-ink: #16202e;
          --mm-muted: #6b7684;
          --mm-border: #edf0f4;
          width: 100%;
          color: var(--mm-ink);
        }

        /* ---------------------------- HEADER --------------------------- */

        .mm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 22px;
          border: 1px solid var(--mm-border);
          border-radius: 20px;
          background:
            radial-gradient(
              120% 140% at 0% 0%,
              rgba(255, 104, 47, 0.11),
              transparent 62%
            ),
            linear-gradient(180deg, #fffdfc, #fafbfd);
        }

        .mm-eyebrow {
          display: inline-block;
          color: var(--mm);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        .mm-header h2 {
          margin: 9px 0 7px;
          font-size: clamp(21px, 3vw, 27px);
          letter-spacing: -0.7px;
          line-height: 1.2;
        }

        .mm-header p {
          margin: 0;
          max-width: 560px;
          color: var(--mm-muted);
          font-size: 14px;
          line-height: 1.6;
        }

        .mm-best-card {
          min-width: 134px;
          padding: 14px 16px;
          border: 1px solid var(--mm-line);
          border-radius: 14px;
          background: linear-gradient(160deg, #ffffff, var(--mm-soft));
          text-align: center;
          box-shadow: 0 12px 26px -18px rgba(255, 104, 47, 0.95);
        }

        .mm-best-card span,
        .mm-best-card strong,
        .mm-best-card small {
          display: block;
        }

        .mm-best-card span {
          color: var(--mm-muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.8px;
        }

        .mm-best-card strong {
          margin-top: 5px;
          color: var(--mm-deep);
          font-size: 26px;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.5px;
        }

        .mm-best-card small {
          margin-top: 2px;
          color: var(--mm-muted);
          font-size: 11px;
          text-transform: capitalize;
        }

        /* ----------------------------- PANEL --------------------------- */

        .mm-panel {
          margin-top: 20px;
          padding: 28px 22px;
          border: 1px solid var(--mm-border);
          border-radius: 20px;
          background: #ffffff;
        }

        .mm-ready,
        .mm-results {
          text-align: center;
        }

        /* ----------------------------- HERO ---------------------------- */

        .mm-hero {
          position: relative;
          display: grid;
          place-items: center;
          margin: 0 auto 22px;
          padding: 22px;
          max-width: 320px;
          border: 1px solid var(--mm-line);
          border-radius: 18px;
          background: linear-gradient(160deg, #fffaf7, var(--mm-soft));
          overflow: hidden;
          animation: mm-float 5.5s ease-in-out infinite;
        }

        .mm-hero-glow {
          position: absolute;
          inset: -40% -10% auto -10%;
          height: 140px;
          background: radial-gradient(
            circle at 50% 50%,
            rgba(255, 104, 47, 0.35),
            transparent 70%
          );
          pointer-events: none;
        }

        .mm-hero-row {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .mm-hero-q {
          color: var(--mm-ink);
        }

        .mm-hero-eq {
          color: #b9c2cd;
          font-style: normal;
        }

        .mm-hero-a {
          padding: 2px 12px;
          border-radius: 10px;
          background: linear-gradient(135deg, #ff8b5c, var(--mm));
          color: #ffffff;
          box-shadow: 0 10px 20px -12px rgba(255, 104, 47, 1);
        }

        @keyframes mm-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        .mm-ready-title,
        .mm-results-title {
          margin: 0 0 9px;
          font-size: 22px;
          letter-spacing: -0.4px;
        }

        .mm-ready-text {
          max-width: 540px;
          margin: 0 auto;
          color: var(--mm-muted);
          font-size: 14px;
          line-height: 1.7;
        }

        /* -------------------------- DIFFICULTY ------------------------- */

        .mm-difficulty {
          max-width: 640px;
          margin: 26px auto 0;
          text-align: left;
        }

        .mm-section-label {
          display: block;
          margin-bottom: 10px;
          color: var(--mm-muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.1px;
        }

        .mm-difficulty-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .mm-diff-card {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 14px;
          border: 1px solid var(--mm-border);
          border-radius: 13px;
          background: #ffffff;
          color: var(--mm-ink);
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.18s ease,
            background 0.18s ease,
            box-shadow 0.18s ease,
            transform 0.18s ease;
        }

        .mm-diff-card:hover {
          border-color: var(--mm-line);
          transform: translateY(-1px);
        }

        .mm-diff-card.is-active {
          border-color: var(--mm);
          background: linear-gradient(160deg, #ffffff, var(--mm-soft));
          box-shadow:
            0 0 0 3px rgba(255, 104, 47, 0.14),
            0 14px 26px -20px rgba(255, 104, 47, 1);
        }

        .mm-diff-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .mm-diff-head strong {
          font-size: 14px;
        }

        .mm-diff-check {
          display: grid;
          place-items: center;
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff8b5c, var(--mm));
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          opacity: 0;
          transform: scale(0.6);
          transition:
            opacity 0.18s ease,
            transform 0.18s ease;
        }

        .mm-diff-card.is-active .mm-diff-check {
          opacity: 1;
          transform: scale(1);
        }

        .mm-diff-desc {
          color: var(--mm-muted);
          font-size: 11.5px;
          line-height: 1.45;
        }

        .mm-diff-meta {
          color: #9aa4b1;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.2px;
        }

        /* ---------------------------- INFO ----------------------------- */

        .mm-info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          max-width: 560px;
          margin: 24px auto 0;
          border: 1px solid var(--mm-border);
          border-radius: 14px;
          overflow: hidden;
        }

        .mm-info-item {
          padding: 14px 6px;
          border-right: 1px solid var(--mm-border);
          background: #fcfdfe;
        }

        .mm-info-item:last-child {
          border-right: 0;
        }

        .mm-info-item strong,
        .mm-info-item span {
          display: block;
        }

        .mm-info-item strong {
          color: var(--mm-deep);
          font-size: 18px;
          font-variant-numeric: tabular-nums;
        }

        .mm-info-item span {
          margin-top: 4px;
          color: var(--mm-muted);
          font-size: 11px;
        }

        /* --------------------------- BUTTONS --------------------------- */

        .mm-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-top: 24px;
        }

        .mm-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 48px;
          padding: 0 24px;
          border: 0;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease,
            opacity 0.18s ease,
            border-color 0.18s ease;
        }

        .mm-btn-primary {
          background: linear-gradient(
            135deg,
            #ff8b5c,
            var(--mm) 55%,
            var(--mm-dark)
          );
          color: #ffffff;
          box-shadow:
            0 14px 26px -16px rgba(255, 104, 47, 1),
            inset 0 1px 0 rgba(255, 255, 255, 0.28);
        }

        .mm-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 18px 30px -16px rgba(255, 104, 47, 1),
            inset 0 1px 0 rgba(255, 255, 255, 0.28);
        }

        .mm-btn-primary:disabled {
          opacity: 0.42;
          cursor: not-allowed;
          box-shadow: none;
        }

        .mm-btn-ghost {
          border: 1px solid var(--mm-border);
          background: #ffffff;
          color: var(--mm-ink);
        }

        .mm-btn-ghost:hover {
          border-color: var(--mm-line);
          background: var(--mm-soft);
          color: var(--mm-deep);
        }

        .mm-career {
          margin: 16px 0 0;
          color: #9aa4b1;
          font-size: 12px;
        }

        /* ----------------------------- HUD ----------------------------- */

        .mm-game {
          padding: 22px;
        }

        .mm-hud {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
        }

        .mm-hud-stat span,
        .mm-hud-stat strong {
          display: block;
        }

        .mm-hud-stat span {
          color: var(--mm-muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.9px;
        }

        .mm-hud-stat strong {
          margin-top: 3px;
          font-size: 24px;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.5px;
        }

        .mm-hud-stat strong small {
          font-size: 14px;
        }

        .mm-hud-right {
          text-align: right;
        }

        .mm-pop {
          animation: mm-pop 0.34s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes mm-pop {
          0% {
            transform: scale(1);
          }
          45% {
            transform: scale(1.18);
            color: var(--mm);
          }
          100% {
            transform: scale(1);
          }
        }

        .mm-ring {
          position: relative;
          width: 108px;
          height: 108px;
          justify-self: center;
        }

        .mm-ring-svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        .mm-ring-track {
          fill: none;
          stroke: #f1f3f7;
          stroke-width: 7;
        }

        .mm-ring-progress {
          fill: none;
          stroke: var(--mm);
          stroke-width: 7;
          stroke-linecap: round;
          transform: rotate(-90deg);
          transform-origin: 50% 50%;
          transition:
            stroke-dashoffset 0.12s linear,
            stroke 0.3s ease;
        }

        .mm-ring.is-warning .mm-ring-progress {
          stroke: #e23b3b;
        }

        .mm-ring.is-warning {
          animation: mm-pulse 1s ease-in-out infinite;
        }

        @keyframes mm-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.045);
          }
        }

        .mm-ring-text {
          position: absolute;
          inset: 0;
          display: grid;
          place-content: center;
          text-align: center;
          gap: 1px;
        }

        .mm-ring-text strong {
          font-size: 20px;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.5px;
        }

        .mm-ring.is-warning .mm-ring-text strong {
          color: #d13737;
        }

        .mm-ring-text span {
          color: var(--mm-muted);
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: 0.9px;
        }

        /* -------------------------- QUESTION --------------------------- */

        .mm-question-card {
          max-width: 540px;
          margin: 24px auto 0;
          padding: 24px 18px;
          border: 1px solid var(--mm-border);
          border-radius: 18px;
          background:
            radial-gradient(
              100% 120% at 50% 0%,
              rgba(255, 104, 47, 0.07),
              transparent 60%
            ),
            #fbfcfe;
          text-align: center;
        }

        .mm-expression {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          margin: 14px 0 22px;
          font-size: clamp(34px, 6.5vw, 50px);
          font-weight: 800;
          letter-spacing: -1.5px;
          font-variant-numeric: tabular-nums;
        }

        .mm-expression span {
          color: var(--mm-ink);
        }

        .mm-expression em {
          color: #b9c2cd;
          font-style: normal;
        }

        .mm-expression b {
          display: inline-grid;
          place-items: center;
          min-width: 1.35em;
          padding: 0 10px;
          border-radius: 12px;
          background: var(--mm-soft-2);
          color: var(--mm-dark);
          transition:
            background 0.2s ease,
            color 0.2s ease;
        }

        .mm-expression b.is-ok {
          background: #e6f8ee;
          color: #0b7d4c;
        }

        .mm-expression b.is-bad {
          background: #ffecec;
          color: #c53a3a;
        }

        /* --------------------------- ANSWER ---------------------------- */

        .mm-answer {
          max-width: 380px;
          margin: 0 auto;
          text-align: left;
        }

        .mm-answer-row {
          display: flex;
          gap: 8px;
        }

        .mm-input {
          flex: 1;
          min-width: 0;
          min-height: 50px;
          padding: 0 14px;
          border: 1px solid #dde3eb;
          border-radius: 12px;
          background: #ffffff;
          color: var(--mm-ink);
          font-size: 17px;
          font-variant-numeric: tabular-nums;
          outline: none;
          transition:
            border-color 0.16s ease,
            box-shadow 0.16s ease;
        }

        .mm-input::placeholder {
          color: #a9b2bf;
          font-size: 14px;
        }

        .mm-input:focus {
          border-color: var(--mm);
          box-shadow: 0 0 0 4px rgba(255, 104, 47, 0.15);
        }

        .mm-input:disabled {
          background: #f6f8fa;
          color: var(--mm-muted);
        }

        .mm-submit {
          flex: 0 0 auto;
          min-height: 50px;
          padding: 0 20px;
        }

        .mm-answer-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 9px;
          color: #9aa4b1;
          font-size: 11.5px;
        }

        .mm-skip {
          border: 0;
          background: none;
          padding: 4px 2px;
          color: var(--mm-muted);
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          border-radius: 6px;
          transition: color 0.16s ease;
        }

        .mm-skip:hover {
          color: var(--mm-dark);
          text-decoration: underline;
        }

        /* -------------------------- FEEDBACK --------------------------- */

        .mm-feedback {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 12px;
          padding: 13px;
          border-radius: 13px;
        }

        .mm-feedback.is-correct {
          background: #eafaf1;
          border: 1px solid #c7ecd9;
          color: #0b7d4c;
        }

        .mm-feedback.is-wrong {
          background: #fff3ef;
          border: 1px solid #ffd8c8;
          color: #b8431c;
        }

        .mm-feedback-body {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .mm-feedback-icon {
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          font-size: 13px;
          font-weight: 800;
          color: #ffffff;
        }

        .mm-feedback.is-correct .mm-feedback-icon {
          background: #12a566;
        }

        .mm-feedback.is-wrong .mm-feedback-icon {
          background: var(--mm);
        }

        .mm-feedback strong,
        .mm-feedback span {
          display: block;
        }

        .mm-feedback strong {
          font-size: 13.5px;
        }

        .mm-feedback-body span {
          margin-top: 3px;
          font-size: 12px;
          opacity: 0.85;
        }

        .mm-next {
          width: 100%;
          min-height: 44px;
        }

        /* ------------------------- LIVE STATS -------------------------- */

        .mm-live-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          max-width: 380px;
          margin: 22px auto 0;
          text-align: center;
        }

        .mm-live-stats span,
        .mm-live-stats strong {
          display: block;
        }

        .mm-live-stats span {
          color: var(--mm-muted);
          font-size: 11px;
        }

        .mm-live-stats strong {
          margin-top: 3px;
          font-size: 18px;
          font-variant-numeric: tabular-nums;
        }

        .mm-game-hint {
          margin: 16px 0 0;
          color: #9aa4b1;
          font-size: 12px;
          text-align: center;
        }

        /* --------------------------- RESULTS --------------------------- */

        .mm-rank {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          padding: 6px 14px 6px 7px;
          border: 1px solid var(--mm-line);
          border-radius: 999px;
          background: var(--mm-soft);
        }

        .mm-rank-badge {
          display: grid;
          place-items: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff8b5c, var(--mm));
          color: #ffffff;
          font-size: 11px;
        }

        .mm-rank-title {
          color: var(--mm-deep);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .mm-final-score {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 8px;
          margin: 16px 0 4px;
        }

        .mm-final-score strong {
          font-size: clamp(42px, 8vw, 54px);
          letter-spacing: -2px;
          font-variant-numeric: tabular-nums;
          background: linear-gradient(135deg, var(--mm), var(--mm-deep));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .mm-final-score span {
          color: var(--mm-muted);
          font-size: 14px;
        }

        .mm-result-message {
          max-width: 480px;
          margin: 0 auto;
          color: var(--mm-muted);
          font-size: 14px;
          line-height: 1.65;
        }

        .mm-accuracy {
          max-width: 420px;
          margin: 22px auto 0;
          text-align: left;
        }

        .mm-accuracy-head {
          display: flex;
          justify-content: space-between;
          margin-bottom: 7px;
          color: var(--mm-muted);
          font-size: 12px;
          font-weight: 700;
        }

        .mm-accuracy-head strong {
          color: var(--mm-ink);
        }

        .mm-accuracy-track {
          height: 9px;
          border-radius: 999px;
          background: #f1f3f7;
          overflow: hidden;
        }

        .mm-accuracy-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            #ff9a6b,
            var(--mm),
            var(--mm-dark)
          );
          transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .mm-result-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          max-width: 520px;
          margin: 22px auto;
          border: 1px solid var(--mm-border);
          border-radius: 14px;
          overflow: hidden;
        }

        .mm-result-grid > div {
          padding: 15px 8px;
          border-right: 1px solid var(--mm-border);
          border-bottom: 1px solid var(--mm-border);
          background: #fcfdfe;
        }

        .mm-result-grid > div:nth-child(3n) {
          border-right: 0;
        }

        .mm-result-grid > div:nth-last-child(-n + 3) {
          border-bottom: 0;
        }

        .mm-result-grid strong,
        .mm-result-grid span {
          display: block;
        }

        .mm-result-grid strong {
          font-size: 19px;
          font-variant-numeric: tabular-nums;
        }

        .mm-result-grid span {
          margin-top: 4px;
          color: var(--mm-muted);
          font-size: 11.5px;
        }

        .mm-result-note {
          max-width: 520px;
          margin: 20px auto 0;
          padding: 14px 15px;
          border: 1px solid var(--mm-border);
          border-radius: 13px;
          background: #fbfcfe;
          text-align: left;
        }

        .mm-result-note strong {
          color: #334155;
          font-size: 12.5px;
        }

        .mm-result-note p {
          margin: 6px 0 0;
          color: var(--mm-muted);
          font-size: 12px;
          line-height: 1.7;
        }

        /* ---------------------------- FOOTER --------------------------- */

        .mm-footer {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid var(--mm-border);
          color: var(--mm-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .mm-footer p {
          flex: 1 1 240px;
          margin: 0;
        }

        .mm-sound {
          flex: 0 0 auto;
          padding: 6px 12px;
          border: 1px solid var(--mm-border);
          border-radius: 999px;
          background: #ffffff;
          color: var(--mm-muted);
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition:
            border-color 0.16s ease,
            color 0.16s ease,
            background 0.16s ease;
        }

        .mm-sound:hover {
          border-color: var(--mm-line);
          background: var(--mm-soft);
          color: var(--mm-deep);
        }

        /* --------------------------- RESPONSIVE ------------------------ */

        @media (max-width: 720px) {
          .mm-info-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .mm-info-item:nth-child(2) {
            border-right: 0;
          }

          .mm-info-item:nth-child(1),
          .mm-info-item:nth-child(2) {
            border-bottom: 1px solid var(--mm-border);
          }
        }

        @media (max-width: 600px) {
          .mm-header {
            flex-direction: column;
            align-items: flex-start;
            padding: 17px;
          }

          .mm-best-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            width: 100%;
            text-align: left;
          }

          .mm-best-card strong {
            margin: 0;
          }

          .mm-best-card small {
            display: none;
          }

          .mm-panel {
            padding: 22px 13px;
          }

          .mm-difficulty-grid {
            grid-template-columns: 1fr;
          }

          .mm-game {
            padding: 15px 11px;
          }

          .mm-ring {
            width: 90px;
            height: 90px;
          }

          .mm-ring-text strong {
            font-size: 17px;
          }

          .mm-hud-stat strong {
            font-size: 21px;
          }

          .mm-question-card {
            padding: 20px 12px;
          }

          .mm-answer-row {
            flex-direction: column;
          }

          .mm-submit {
            width: 100%;
          }

          .mm-result-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .mm-result-grid > div:nth-child(3n) {
            border-right: 1px solid var(--mm-border);
          }

          .mm-result-grid > div:nth-child(2n) {
            border-right: 0;
          }

          .mm-result-grid > div:nth-last-child(-n + 3) {
            border-bottom: 1px solid var(--mm-border);
          }

          .mm-result-grid > div:nth-last-child(-n + 2) {
            border-bottom: 0;
          }

          .mm-actions {
            flex-direction: column;
          }

          .mm-actions .mm-btn {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mm-hero,
          .mm-ring.is-warning,
          .mm-pop {
            animation: none !important;
          }

          .mm-ring-progress,
          .mm-accuracy-fill {
            transition: none !important;
          }
        }
      `}</style>
    </ToolShell>
  );
}
