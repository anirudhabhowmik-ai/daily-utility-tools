"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Difficulty = "easy" | "medium" | "hard";
type Phase = "ready" | "showing" | "recall" | "correct" | "wrong" | "finished";

const DIFFICULTY: Record<
  Difficulty,
  { label: string; startingDigits: number; lives: number; accent: string }
> = {
  easy: { label: "Easy", startingDigits: 3, lives: 4, accent: "#16a34a" },
  medium: { label: "Medium", startingDigits: 4, lives: 3, accent: "#ff5a1f" },
  hard: { label: "Hard", startingDigits: 5, lives: 2, accent: "#dc2626" },
};

const BEST_SCORE_KEY = "number-memory-test-best-v1";

function createNumber(length: number): string {
  let result = "";

  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }

  return result;
}

function getDisplayDuration(length: number): number {
  // Display time grows with number length, capped at 6.5s.
  return Math.min(6500, 1800 + Math.max(0, length - 3) * 350);
}

function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function NumberMemoryTest() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [phase, setPhase] = useState<Phase>("ready");
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(DIFFICULTY.medium.lives);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [number, setNumber] = useState("");
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [showNumber, setShowNumber] = useState(false);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<
    { level: number; digits: number; correct: boolean; time: number }[]
  >([]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const digits = useMemo(
    () => DIFFICULTY[difficulty].startingDigits + level - 1,
    [difficulty, level]
  );

  const displayDuration = useMemo(
    () => getDisplayDuration(digits),
    [digits]
  );

  const clearGameTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(BEST_SCORE_KEY);
      if (saved !== null) {
        const parsed = Number(saved);
        if (Number.isFinite(parsed) && parsed >= 0) {
          setBestScore(parsed);
        }
      }
    } catch {
      // The game still works if browser storage is unavailable.
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === "recall") {
      inputRef.current?.focus();
    }
  }, [phase]);

  const updateBestScore = useCallback((newScore: number) => {
    setBestScore((previous) => {
      if (newScore <= previous) return previous;

      try {
        window.localStorage.setItem(BEST_SCORE_KEY, String(newScore));
      } catch {
        // Best score remains available for this session.
      }

      return newScore;
    });
  }, []);

  const startRound = useCallback(
    (currentLevel: number, currentDifficulty: Difficulty) => {
      clearGameTimer();

      const digitCount =
        DIFFICULTY[currentDifficulty].startingDigits + currentLevel - 1;
      const nextNumber = createNumber(digitCount);

      setNumber(nextNumber);
      setAnswer("");
      setMessage("");
      setShowNumber(true);
      setPhase("showing");

      timerRef.current = setTimeout(() => {
        setShowNumber(false);
        setPhase("recall");
        timerRef.current = null;
      }, getDisplayDuration(digitCount));
    },
    [clearGameTimer]
  );

  const startGame = useCallback(() => {
    clearGameTimer();

    setLevel(1);
    setLives(DIFFICULTY[difficulty].lives);
    setScore(0);
    setStreak(0);
    setHistory([]);
    setAnswer("");
    setMessage("");
    setNumber("");
    setShowNumber(false);

    startRound(1, difficulty);
  }, [clearGameTimer, difficulty, startRound]);

  const submitAnswer = useCallback(() => {
    if (phase !== "recall" || answer.trim() === "") return;

    const cleanedAnswer = answer.trim();

    if (!/^\d+$/.test(cleanedAnswer)) {
      setMessage("Please enter numbers only.");
      return;
    }

    clearGameTimer();

    const isCorrect = cleanedAnswer === number;

    setHistory((prev) => [
      ...prev,
      { level, digits, correct: isCorrect, time: displayDuration },
    ]);

    if (isCorrect) {
      const newScore = score + digits;
      setScore(newScore);
      updateBestScore(newScore);
      setStreak((s) => s + 1);
      setMessage("Correct! You remembered the number.");
      setPhase("correct");
      return;
    }

    const remainingLives = lives - 1;
    setLives(remainingLives);
    setStreak(0);
    setMessage(`Not quite. The correct number was ${number}.`);

    if (remainingLives <= 0) {
      setPhase("finished");
    } else {
      setPhase("wrong");
    }
  }, [
    answer,
    clearGameTimer,
    digits,
    displayDuration,
    level,
    lives,
    number,
    phase,
    score,
    updateBestScore,
  ]);

  const continueAfterCorrect = useCallback(() => {
    const nextLevel = level + 1;
    setLevel(nextLevel);
    startRound(nextLevel, difficulty);
  }, [difficulty, level, startRound]);

  const retryAfterWrong = useCallback(() => {
    startRound(level, difficulty);
  }, [difficulty, level, startRound]);

  const changeDifficulty = (nextDifficulty: Difficulty) => {
    clearGameTimer();
    setDifficulty(nextDifficulty);
    setPhase("ready");
    setLevel(1);
    setLives(DIFFICULTY[nextDifficulty].lives);
    setScore(0);
    setStreak(0);
    setHistory([]);
    setNumber("");
    setAnswer("");
    setMessage("");
    setShowNumber(false);
  };

  const resetBestScore = () => {
    try {
      window.localStorage.removeItem(BEST_SCORE_KEY);
    } catch {
      // Ignore storage errors.
    }
    setBestScore(0);
  };

  const resetGame = () => {
    clearGameTimer();
    setPhase("ready");
    setLevel(1);
    setLives(DIFFICULTY[difficulty].lives);
    setScore(0);
    setStreak(0);
    setHistory([]);
    setNumber("");
    setAnswer("");
    setMessage("");
    setShowNumber(false);
  };

  const isPlaying = phase !== "ready" && phase !== "finished";

  const accuracy =
    history.length > 0
      ? Math.round(
          (history.filter((h) => h.correct).length / history.length) * 100
        )
      : 0;

  const livesTotal = DIFFICULTY[difficulty].lives;

  return (
    <main className="nmt-page">
      <div className="nmt-container">
        {/* HEADER */}
        <header className="nmt-header">
          <div className="nmt-header-text">
            <span className="nmt-eyebrow">BRAIN TRAINING · PRO</span>
            <h1>Number Memory Test</h1>
            <p>
              Memorize a number before it disappears. Each correct answer
              adds a digit — how far can your memory stretch?
            </p>
          </div>
          <div className="nmt-header-icon">🧠</div>
        </header>

        {/* GAME CARD */}
        <section className="nmt-game-card" aria-label="Number memory game">
          {/* STATS BAR */}
          <div className="nmt-stats">
            <div className="nmt-stat">
              <span>Level</span>
              <strong>{level}</strong>
            </div>
            <div className="nmt-stat">
              <span>Score</span>
              <strong>{score}</strong>
            </div>
            <div className="nmt-stat">
              <span>Best</span>
              <strong>{bestScore}</strong>
            </div>
            <div className="nmt-stat">
              <span>Lives</span>
              <strong className="nmt-lives">
                {Array.from({ length: livesTotal }).map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < lives ? "nmt-heart-full" : "nmt-heart-empty"
                    }
                  >
                    ♥
                  </span>
                ))}
              </strong>
            </div>
          </div>

          {/* GAME AREA */}
          <div
            className={`nmt-game-area ${
              phase === "correct"
                ? "nmt-area-correct"
                : phase === "wrong" || phase === "finished"
                ? "nmt-area-error"
                : ""
            }`}
          >
            {/* READY */}
            {phase === "ready" && (
              <div className="nmt-intro">
                <div className="nmt-intro-icon">🧠</div>
                <h2>Ready to train your memory?</h2>
                <p>
                  A number will appear on screen. Memorize it, then type it
                  back after it disappears. Every correct answer grows the
                  challenge by one digit.
                </p>

                <div className="nmt-detail-grid">
                  <div className="nmt-detail-row">
                    <span>Starting digits</span>
                    <strong>{DIFFICULTY[difficulty].startingDigits}</strong>
                  </div>
                  <div className="nmt-detail-row">
                    <span>Lives</span>
                    <strong>{DIFFICULTY[difficulty].lives}</strong>
                  </div>
                  <div className="nmt-detail-row">
                    <span>Display time</span>
                    <strong>
                      {formatTime(
                        getDisplayDuration(
                          DIFFICULTY[difficulty].startingDigits
                        )
                      )}
                    </strong>
                  </div>
                </div>

                <button className="nmt-primary-btn" onClick={startGame}>
                  Start Test
                </button>
              </div>
            )}

            {/* SHOWING */}
            {phase === "showing" && (
              <div className="nmt-challenge">
                <span className="nmt-step-label">MEMORIZE THIS NUMBER</span>
                <div
                  className="nmt-number"
                  aria-live="polite"
                  style={{ letterSpacing: digits > 7 ? "4px" : "7px" }}
                >
                  {showNumber ? number : ""}
                </div>
                <p>
                  Remember all <strong>{digits}</strong> digits
                </p>
                <div className="nmt-progress-track">
                  <div
                    className="nmt-progress-bar"
                    style={
                      {
                        animationDuration: `${displayDuration}ms`,
                      } as React.CSSProperties
                    }
                  />
                </div>
                <div className="nmt-progress-meta">
                  <span>Disappears in</span>
                  <strong>{formatTime(displayDuration)}</strong>
                </div>
              </div>
            )}

            {/* RECALL */}
            {phase === "recall" && (
              <div className="nmt-challenge">
                <span className="nmt-step-label">YOUR TURN</span>
                <div className="nmt-hidden-number">?</div>
                <h2>What was the number?</h2>
                <p>
                  Enter the {digits}-digit number you just saw.
                </p>

                <form
                  className="nmt-answer-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitAnswer();
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={digits}
                    value={answer}
                    onChange={(event) => {
                      setAnswer(
                        event.target.value.replace(/\D/g, "").slice(0, digits)
                      );
                      setMessage("");
                    }}
                    placeholder={`${digits} digits`}
                    aria-label="Enter the number you memorized"
                  />
                  <button
                    className="nmt-primary-btn"
                    type="submit"
                    disabled={answer.length !== digits}
                  >
                    Check Answer
                  </button>
                </form>
                {message && <p className="nmt-inline-message">{message}</p>}
              </div>
            )}

            {/* CORRECT */}
            {phase === "correct" && (
              <div className="nmt-result">
                <div className="nmt-result-icon success">✓</div>
                <span className="nmt-step-label">WELL DONE</span>
                <h2>That&apos;s correct!</h2>
                <p>{message}</p>
                <div className="nmt-answer-reveal">{number}</div>
                <div className="nmt-points-badge">+{digits} points</div>
                {streak > 1 && (
                  <div className="nmt-streak-badge">🔥 {streak} in a row</div>
                )}
                <button
                  className="nmt-primary-btn"
                  onClick={continueAfterCorrect}
                >
                  Next Level
                </button>
              </div>
            )}

            {/* WRONG */}
            {phase === "wrong" && (
              <div className="nmt-result">
                <div className="nmt-result-icon error">✕</div>
                <span className="nmt-step-label">TRY AGAIN</span>
                <h2>Not quite!</h2>
                <p>{message}</p>
                <div className="nmt-answer-reveal">{number}</div>
                <p>
                  You have <strong>{lives}</strong>{" "}
                  {lives === 1 ? "life" : "lives"} remaining.
                </p>
                <button
                  className="nmt-primary-btn"
                  onClick={retryAfterWrong}
                >
                  Try This Level Again
                </button>
              </div>
            )}

            {/* FINISHED */}
            {phase === "finished" && (
              <div className="nmt-result">
                <div className="nmt-result-icon finished">🏁</div>
                <span className="nmt-step-label">TEST COMPLETE</span>
                <h2>Game over</h2>
                <p>{message}</p>

                <div className="nmt-final-grid">
                  <div className="nmt-final-score">
                    <span>Final score</span>
                    <strong>{score}</strong>
                  </div>
                  <div className="nmt-final-score">
                    <span>Accuracy</span>
                    <strong>{accuracy}%</strong>
                  </div>
                </div>

                <p className="nmt-best-line">
                  Best score: <strong>{bestScore}</strong>
                </p>

                <button className="nmt-primary-btn" onClick={startGame}>
                  Play Again
                </button>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="nmt-game-footer">
            <div className="nmt-difficulty">
              <span>Difficulty</span>
              <div className="nmt-difficulty-options">
                {(["easy", "medium", "hard"] as Difficulty[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={difficulty === item ? "active" : ""}
                    style={
                      difficulty === item
                        ? { color: DIFFICULTY[item].accent }
                        : undefined
                    }
                    onClick={() => changeDifficulty(item)}
                    disabled={isPlaying}
                    aria-pressed={difficulty === item}
                  >
                    {DIFFICULTY[item].label}
                  </button>
                ))}
              </div>
            </div>
            {phase !== "ready" && (
              <button
                type="button"
                className="nmt-reset-btn"
                onClick={resetGame}
              >
                Reset game
              </button>
            )}
          </div>
        </section>

        {/* HISTORY */}
        {history.length > 0 && (
          <section className="nmt-history">
            <h2>Round history</h2>
            <div className="nmt-history-list">
              {history.map((h, i) => (
                <div className="nmt-history-item" key={i}>
                  <span>Level {h.level}</span>
                  <div className="nmt-history-meta">
                    <span className="nmt-history-digits">{h.digits} digits</span>
                    <span
                      className={
                        h.correct
                          ? "nmt-history-status correct"
                          : "nmt-history-status wrong"
                      }
                    >
                      {h.correct ? "Correct" : "Wrong"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* HOW TO PLAY */}
        <section className="nmt-how">
          <h2>How to play</h2>
          <ol>
            <li>Choose Easy, Medium, or Hard difficulty.</li>
            <li>Press Start Test to display a number.</li>
            <li>Memorize the number before it disappears.</li>
            <li>Enter the number correctly to advance to the next level.</li>
            <li>
              Each new level adds one more digit. You lose a life for each
              incorrect answer.
            </li>
          </ol>
        </section>

        {/* TIPS */}
        <section className="nmt-tips">
          <h2>Tips to improve your number memory</h2>
          <ul>
            <li>
              Break long numbers into smaller groups of two or three digits.
            </li>
            <li>Repeat the number silently while it is displayed.</li>
            <li>Practice regularly and gradually increase the difficulty.</li>
            <li>Focus on accuracy before trying to memorize numbers faster.</li>
          </ul>
        </section>

        {/* WHY BUILD */}
        <section className="nmt-tips">
          <h2>Why Build This?</h2>
          <ul>
            <li>
              It will increase memory power.
            </li>
            <li>It can help in exam preparation.</li>
            <li>It will make you feel positive energy.</li>
          </ul>
        </section>

        <div className="nmt-storage-note">
          Your best score is saved locally in this browser. It is not
          uploaded to a server and may not appear on another device or
          browser.
        </div>

        {bestScore > 0 && (
          <button
            className="nmt-clear-best"
            type="button"
            onClick={resetBestScore}
          >
            Clear saved best score
          </button>
        )}
      </div>

      <style jsx>{`
        .nmt-page {
          width: 100%;
          color: var(--tool-text, #172033);
          padding: 28px 16px 48px;
        }

        .nmt-container {
          width: 100%;
          max-width: 850px;
          margin: 0 auto;
        }

        /* Header */

        .nmt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 28px;
          padding: 21px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 14px;
          background: var(--tool-surface, #f8fafc);
        }

        .nmt-header-text {
          min-width: 0;
        }

        .nmt-eyebrow {
          display: block;
          margin-bottom: 6px;
          color: var(--tool-primary, #ff5a1f);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        .nmt-step-label {
          display: block;
          color: #635bdb;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .nmt-header h1 {
          margin: 0 0 6px;
          font-size: clamp(24px, 4vw, 32px);
          line-height: 1.2;
          letter-spacing: -0.8px;
        }

        .nmt-header p {
          max-width: 560px;
          margin: 0;
          color: var(--tool-muted, #64748b);
          font-size: 13px;
          line-height: 1.65;
        }

        .nmt-header-icon {
          display: grid;
          flex: 0 0 auto;
          place-items: center;
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: var(--tool-card, #fff);
          font-size: 28px;
        }

        /* Game card */

        .nmt-game-card {
          overflow: hidden;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 16px;
          background: var(--tool-card, #fff);
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
        }

        /* Stats */

        .nmt-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border-bottom: 1px solid var(--tool-border, #e5e7eb);
          background: var(--tool-surface, #f8fafc);
        }

        .nmt-stat {
          min-width: 0;
          padding: 16px 8px;
          text-align: center;
          border-right: 1px solid var(--tool-border, #e5e7eb);
        }

        .nmt-stat:last-child {
          border-right: 0;
        }

        .nmt-stat span {
          display: block;
          margin-bottom: 5px;
          color: var(--tool-muted, #64748b);
          font-size: 11px;
          font-weight: 600;
        }

        .nmt-stat strong {
          display: block;
          font-size: 20px;
          line-height: 1.2;
          color: var(--tool-text, #172033);
        }

        .nmt-lives {
          display: flex;
          justify-content: center;
          gap: 2px;
          font-size: 17px !important;
          letter-spacing: 0 !important;
        }

        .nmt-heart-full {
          color: #e34e65;
        }

        .nmt-heart-empty {
          color: #cbd5e1;
        }

        /* Game area */

        .nmt-game-area {
          min-height: 365px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 35px 22px;
          text-align: center;
          transition: background 0.3s ease;
        }

        .nmt-area-correct {
          background: linear-gradient(
            180deg,
            rgba(22, 163, 74, 0.04),
            transparent
          );
        }

        .nmt-area-error {
          background: linear-gradient(
            180deg,
            rgba(220, 38, 38, 0.04),
            transparent
          );
        }

        .nmt-intro,
        .nmt-challenge,
        .nmt-result {
          width: 100%;
          max-width: 470px;
          margin: 0 auto;
        }

        .nmt-intro-icon {
          margin-bottom: 12px;
          font-size: 44px;
        }

        .nmt-intro h2,
        .nmt-result h2,
        .nmt-challenge h2 {
          margin: 8px 0;
          font-size: 23px;
          letter-spacing: -0.4px;
          color: var(--tool-text, #172033);
        }

        .nmt-intro p,
        .nmt-result p,
        .nmt-challenge p {
          margin: 0;
          color: var(--tool-muted, #64748b);
          font-size: 14px;
          line-height: 1.65;
        }

        .nmt-detail-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 18px;
        }

        .nmt-detail-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 11px 10px;
          border-radius: 9px;
          background: var(--tool-surface, #f7f8fc);
          color: var(--tool-muted, #64748b);
          font-size: 11px;
        }

        .nmt-detail-row strong {
          color: var(--tool-text, #172033);
          font-size: 15px;
        }

        /* Primary button */

        .nmt-primary-btn {
          display: inline-flex;
          min-height: 48px;
          align-items: center;
          justify-content: center;
          width: 100%;
          margin-top: 20px;
          padding: 12px 20px;
          border: 0;
          border-radius: 10px;
          background: var(--tool-primary, #ff5a1f);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
        }

        .nmt-primary-btn:hover:not(:disabled) {
          background: #ee4305;
          transform: translateY(-1px);
        }

        .nmt-primary-btn:disabled {
          cursor: not-allowed;
          opacity: 0.45;
          transform: none;
        }

        /* Showing number */

        .nmt-number {
          min-height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 20px 0 8px;
          color: var(--tool-text, #172033);
          font-size: clamp(36px, 9vw, 58px);
          font-weight: 800;
          letter-spacing: 7px;
          overflow-wrap: anywhere;
        }

        .nmt-progress-track {
          height: 5px;
          overflow: hidden;
          margin-top: 22px;
          border-radius: 99px;
          background: #ececf5;
        }

        .nmt-progress-bar {
          width: 100%;
          height: 100%;
          transform-origin: left;
          background: var(--tool-primary, #ff5a1f);
          animation: nmt-countdown linear forwards;
        }

        @keyframes nmt-countdown {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }

        .nmt-progress-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
          color: var(--tool-muted, #64748b);
          font-size: 11px;
        }

        .nmt-progress-meta strong {
          color: var(--tool-text, #172033);
        }

        /* Recall */

        .nmt-hidden-number {
          display: flex;
          width: 100px;
          height: 100px;
          align-items: center;
          justify-content: center;
          margin: 15px auto;
          border-radius: 22px;
          background: #f0efff;
          color: #6259d9;
          font-size: 55px;
          font-weight: 800;
        }

        .nmt-answer-form {
          display: grid;
          gap: 12px;
          margin-top: 22px;
        }

        .nmt-answer-form input {
          width: 100%;
          min-height: 52px;
          padding: 12px 16px;
          border: 1px solid var(--tool-border, #dce0eb);
          border-radius: 10px;
          outline: none;
          background: #fff;
          color: var(--tool-text, #202b40);
          text-align: center;
          font-size: 21px;
          font-weight: 700;
          letter-spacing: 4px;
        }

        .nmt-answer-form input:focus {
          border-color: var(--tool-primary, #ff5a1f);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .nmt-answer-form .nmt-primary-btn {
          margin-top: 0;
        }

        .nmt-inline-message {
          color: #d04b5e !important;
          font-size: 13px !important;
          margin-top: 10px !important;
        }

        /* Result */

        .nmt-result-icon {
          display: flex;
          width: 58px;
          height: 58px;
          align-items: center;
          justify-content: center;
          margin: 0 auto 15px;
          border-radius: 50%;
          font-size: 28px;
          font-weight: 800;
        }

        .nmt-result-icon.success {
          background: #e6f8ee;
          color: #16854b;
        }

        .nmt-result-icon.error {
          background: #fff0f1;
          color: #d94d5e;
        }

        .nmt-result-icon.finished {
          background: #f0efff;
        }

        .nmt-answer-reveal {
          margin: 16px 0;
          padding: 14px;
          border: 1px dashed #c9c5f4;
          border-radius: 10px;
          background: #f7f6ff;
          color: #5148c2;
          font-size: 25px;
          font-weight: 800;
          letter-spacing: 5px;
          overflow-wrap: anywhere;
        }

        .nmt-points-badge {
          display: inline-block;
          margin: 6px 0;
          padding: 6px 14px;
          border-radius: 20px;
          background: #e6f8ee;
          color: #16854b;
          font-size: 13px;
          font-weight: 800;
        }

        .nmt-streak-badge {
          display: inline-block;
          margin: 6px 8px;
          padding: 6px 14px;
          border-radius: 20px;
          background: #fef3c7;
          color: #b45309;
          font-size: 13px;
          font-weight: 800;
        }

        .nmt-final-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin: 20px 0 8px;
        }

        .nmt-final-score {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 16px;
          border-radius: 12px;
          background: var(--tool-surface, #f6f5ff);
        }

        .nmt-final-score span {
          color: var(--tool-muted, #72798c);
          font-size: 12px;
        }

        .nmt-final-score strong {
          color: var(--tool-primary, #5148c2);
          font-size: 30px;
          line-height: 1.1;
        }

        .nmt-best-line {
          margin: 8px 0 0 !important;
          font-weight: 700;
        }

        /* Footer */

        .nmt-game-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 20px;
          border-top: 1px solid var(--tool-border, #e5e7eb);
          background: var(--tool-surface, #f8fafc);
        }

        .nmt-difficulty {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
        }

        .nmt-difficulty > span {
          color: var(--tool-muted, #64748b);
          font-size: 12px;
          font-weight: 700;
        }

        .nmt-difficulty-options {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 4px;
          border-radius: 9px;
          background: #eeeef5;
        }

        .nmt-difficulty-options button {
          padding: 7px 12px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: var(--tool-muted, #70788a);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .nmt-difficulty-options button.active {
          background: #fff;
          box-shadow: 0 1px 4px rgba(20, 30, 60, 0.1);
        }

        .nmt-difficulty-options button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .nmt-reset-btn,
        .nmt-clear-best {
          border: 0;
          background: transparent;
          color: var(--tool-primary, #ff5a1f);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        /* History */

        .nmt-history {
          margin-top: 24px;
          padding: 18px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 14px;
          background: var(--tool-card, #fff);
        }

        .nmt-history h2 {
          margin: 0 0 13px;
          font-size: 16px;
          font-weight: 800;
        }

        .nmt-history-list {
          display: grid;
          gap: 6px;
          max-height: 220px;
          overflow-y: auto;
        }

        .nmt-history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--tool-surface, #f8fafc);
          font-size: 13px;
        }

        .nmt-history-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nmt-history-digits {
          color: var(--tool-muted, #64748b);
          font-size: 11px;
        }

        .nmt-history-status {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .nmt-history-status.correct {
          background: #e6f8ee;
          color: #16854b;
        }

        .nmt-history-status.wrong {
          background: #fff0f1;
          color: #d94d5e;
        }

        /* How to / Tips */

        .nmt-how,
        .nmt-tips {
          margin-top: 24px;
          padding: 20px 22px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 14px;
          background: var(--tool-card, #fff);
        }

        .nmt-how h2,
        .nmt-tips h2 {
          margin: 0 0 12px;
          font-size: 17px;
        }

        .nmt-how ol,
        .nmt-tips ul {
          margin: 0;
          padding-left: 22px;
          color: var(--tool-muted, #64748b);
          font-size: 13px;
          line-height: 1.85;
        }

        .nmt-storage-note {
          margin: 20px 0 8px;
          color: var(--tool-muted, #82899a);
          text-align: center;
          font-size: 12px;
          line-height: 1.6;
        }

        .nmt-clear-best {
          display: block;
          margin: 0 auto;
          color: var(--tool-muted, #8b91a0);
        }

        /* Responsive */

        @media (max-width: 560px) {
          .nmt-page {
            padding: 16px 10px 32px;
          }

          .nmt-header {
            flex-direction: column;
            align-items: flex-start;
            padding: 16px;
            margin-bottom: 20px;
          }

          .nmt-header-icon {
            display: none;
          }

          .nmt-game-area {
            min-height: 340px;
            padding: 28px 16px;
          }

          .nmt-stat {
            padding: 12px 4px;
          }

          .nmt-stat span {
            font-size: 10px;
          }

          .nmt-stat strong {
            font-size: 17px;
          }

          .nmt-lives {
            font-size: 14px !important;
          }

          .nmt-detail-grid {
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .nmt-detail-row {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }

          .nmt-detail-row strong {
            font-size: 13px;
          }

          .nmt-final-grid {
            grid-template-columns: 1fr;
          }

          .nmt-game-footer {
            align-items: flex-start;
            flex-direction: column;
          }

          .nmt-how,
          .nmt-tips,
          .nmt-history {
            padding: 16px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nmt-progress-bar {
            animation: none;
          }

          .nmt-primary-btn {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}