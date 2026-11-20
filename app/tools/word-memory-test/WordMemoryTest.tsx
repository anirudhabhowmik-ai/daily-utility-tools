"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ToolShell from "../ToolShell";

type Difficulty = "easy" | "medium" | "hard";
type Phase = "ready" | "showing" | "answer" | "success" | "mistake" | "finished";

type DifficultyConfig = {
  label: string;
  startingWords: number;
  maxWords: number;
  displayTime: number;
};

type HistoryEntry = {
  level: number;
  difficulty: Difficulty;
  words: number;
  correct: number;
  perfect: boolean;
  timestamp: number;
};

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { label: "Easy", startingWords: 3, maxWords: 7, displayTime: 6000 },
  medium: { label: "Medium", startingWords: 4, maxWords: 9, displayTime: 5000 },
  hard: { label: "Hard", startingWords: 5, maxWords: 11, displayTime: 4000 },
};

const WORD_BANK = [
  "Apple", "Bridge", "Cloud", "Garden", "Window", "River", "Camera",
  "Planet", "Bottle", "Forest", "Pencil", "Castle", "Orange", "Rocket",
  "Mirror", "Mountain", "Guitar", "Lantern", "Ocean", "Diamond", "Puzzle",
  "Candle", "Village", "Butterfly", "Compass", "Thunder", "Blanket",
  "Library", "Rainbow", "Helmet", "Keyboard", "Elephant", "Whistle",
  "Bicycle", "Harvest", "Notebook", "Coconut", "Feather", "Sunshine",
  "Backpack", "Waterfall", "Telescope", "Dolphin", "Chocolate", "Volcano",
  "Satellite", "Pyramid", "Lighthouse", "Strawberry", "Adventure",
  "Treasure", "Parachute", "Starlight", "Seashell", "Fountain",
  "Fireplace", "Sailboat", "Caterpillar", "Meadow", "Teapot",
  "Snowflake", "Footprint", "Carousel", "Moonlight", "Train",
];

const STARTING_LIVES = 3;
const BEST_KEY = "toolsab-word-memory-best-v1";
const BEST_STREAK_KEY = "toolsab-word-memory-best-streak-v1";

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function formatTimestamp(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function WordMemoryTest() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<Phase>("ready");

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [bestScore, setBestScore] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [hasLoadedBest, setHasLoadedBest] = useState(false);

  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [message, setMessage] = useState(
    "Memorize the words and identify them after they disappear."
  );

  const [showHelp, setShowHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const config = DIFFICULTIES[difficulty];

  const wordCount = Math.min(
    config.startingWords + Math.floor((level - 1) / 2),
    config.maxWords
  );

  const isPlaying =
    phase === "showing" ||
    phase === "answer" ||
    phase === "success" ||
    phase === "mistake";

  const targetSet = useMemo(() => new Set(targetWords), [targetWords]);

  const correctCount = useMemo(
    () => targetWords.filter((w) => selectedWords.includes(w)).length,
    [targetWords, selectedWords]
  );

  const missedWords = useMemo(
    () => targetWords.filter((w) => !selectedWords.includes(w)),
    [targetWords, selectedWords]
  );

  const perfectCount = useMemo(
    () => history.filter((h) => h.perfect).length,
    [history]
  );

  const achievements = useMemo(() => {
    const list: { id: string; icon: string; label: string }[] = [];
    if (history.length > 0)
      list.push({ id: "first", icon: "🎯", label: "First round" });

    const maxLevel = history.reduce((m, h) => Math.max(m, h.level), 0);
    if (maxLevel >= 3)
      list.push({ id: "lvl3", icon: "🎓", label: "Level 3" });
    if (maxLevel >= 5)
      list.push({ id: "lvl5", icon: "📚", label: "Level 5" });
    if (maxLevel >= 10)
      list.push({ id: "lvl10", icon: "🏆", label: "Level 10" });

    if (perfectCount >= 1)
      list.push({ id: "perfect1", icon: "💯", label: "Perfect round" });
    if (perfectCount >= 5)
      list.push({ id: "perfect5", icon: "⭐", label: "5 perfect" });

    if (bestStreak >= 3)
      list.push({ id: "s3", icon: "🔥", label: "3-streak" });
    if (bestStreak >= 5)
      list.push({ id: "s5", icon: "🚀", label: "5-streak" });
    if (bestStreak >= 10)
      list.push({ id: "s10", icon: "💎", label: "10-streak" });

    return list;
  }, [history, perfectCount, bestStreak]);

  // Load saved bests.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(BEST_KEY);
      const parsed = saved ? Number(saved) : 0;
      if (Number.isFinite(parsed) && parsed > 0) setBestScore(parsed);

      const savedStreak = window.localStorage.getItem(BEST_STREAK_KEY);
      const parsedStreak = savedStreak ? Number(savedStreak) : 0;
      if (Number.isFinite(parsedStreak) && parsedStreak > 0)
        setBestStreak(parsedStreak);
    } catch {
      // Ignore storage errors.
    } finally {
      setHasLoadedBest(true);
    }
  }, []);

  // Save bests.
  useEffect(() => {
    if (!hasLoadedBest) return;
    try {
      window.localStorage.setItem(BEST_KEY, String(bestScore));
      window.localStorage.setItem(BEST_STREAK_KEY, String(bestStreak));
    } catch {
      // Ignore.
    }
  }, [bestScore, bestStreak, hasLoadedBest]);

  const prepareRound = useCallback(
    (nextLevel: number) => {
      const nextWordCount = Math.min(
        DIFFICULTIES[difficulty].startingWords +
          Math.floor((nextLevel - 1) / 2),
        DIFFICULTIES[difficulty].maxWords
      );

      const shuffledBank = shuffle(WORD_BANK);
      const nextTargets = shuffledBank.slice(0, nextWordCount);
      const distractors = shuffledBank.slice(
        nextWordCount,
        nextWordCount + 4
      );

      setTargetWords(nextTargets);
      setOptions(shuffle([...nextTargets, ...distractors]));
      setSelectedWords([]);
      setCountdown(Math.ceil(DIFFICULTIES[difficulty].displayTime / 1000));
      setRemainingMs(DIFFICULTIES[difficulty].displayTime);
      setMessage("Memorize these words carefully.");
      setPhase("showing");
    },
    [difficulty]
  );

  const startGame = useCallback(() => {
    setLevel(1);
    setScore(0);
    setLives(STARTING_LIVES);
    setStreak(0);
    setSelectedWords([]);
    prepareRound(1);
  }, [prepareRound]);

  const resetGame = useCallback(() => {
    setPhase("ready");
    setLevel(1);
    setScore(0);
    setLives(STARTING_LIVES);
    setStreak(0);
    setTargetWords([]);
    setOptions([]);
    setSelectedWords([]);
    setCountdown(0);
    setRemainingMs(0);
    setMessage("Memorize the words and identify them after they disappear.");
  }, []);

  const changeDifficulty = (next: Difficulty) => {
    if (isPlaying) return;
    setDifficulty(next);
    setPhase("ready");
    setLevel(1);
    setScore(0);
    setLives(STARTING_LIVES);
    setStreak(0);
    setTargetWords([]);
    setOptions([]);
    setSelectedWords([]);
    setCountdown(0);
    setRemainingMs(0);
    setMessage("Memorize the words and identify them after they disappear.");
  };

  // Countdown timer for showing phase.
  useEffect(() => {
    if (phase !== "showing") return;

    const endsAt = Date.now() + config.displayTime;
    setRemainingMs(config.displayTime);

    const interval = window.setInterval(() => {
      const msLeft = Math.max(0, endsAt - Date.now());
      setRemainingMs(msLeft);
      setCountdown(Math.ceil(msLeft / 1000));

      if (msLeft <= 0) {
        window.clearInterval(interval);
        setCountdown(0);
        setSelectedWords([]);
        setMessage("Select every word you remember from the original list.");
        setPhase("answer");
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [phase, config.displayTime]);

  // Auto-advance after success.
  useEffect(() => {
    if (phase !== "success") return;
    const timer = window.setTimeout(() => {
      const nextLevel = level + 1;
      setLevel(nextLevel);
      prepareRound(nextLevel);
    }, 1300);
    return () => window.clearTimeout(timer);
  }, [phase, level, prepareRound]);

  // Auto-replay after mistake.
  useEffect(() => {
    if (phase !== "mistake") return;
    const timer = window.setTimeout(() => {
      setSelectedWords([]);
      setCountdown(Math.ceil(config.displayTime / 1000));
      setRemainingMs(config.displayTime);
      setMessage("Watch the words again, then try once more.");
      setPhase("showing");
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [phase, config.displayTime]);

  const toggleWord = (word: string) => {
    if (phase !== "answer") return;
    setSelectedWords((current) =>
      current.includes(word)
        ? current.filter((item) => item !== word)
        : [...current, word]
    );
  };

  const submitAnswer = useCallback(() => {
    if (phase !== "answer") return;

    const selectedSet = new Set(selectedWords);
    const allCorrect =
      selectedSet.size === targetSet.size &&
      [...targetSet].every((word) => selectedSet.has(word));

    const matchedCount = targetWords.filter((w) =>
      selectedSet.has(w)
    ).length;

    setHistory((prev) =>
      [
        {
          level,
          difficulty,
          words: targetWords.length,
          correct: matchedCount,
          perfect: allCorrect,
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, 8)
    );

    if (allCorrect) {
      const roundPoints = 10 + level * 2;
      const nextScore = score + roundPoints;
      const nextStreak = streak + 1;

      setScore(nextScore);
      setBestScore((prev) => Math.max(prev, nextScore));
      setStreak(nextStreak);
      setBestStreak((prev) => Math.max(prev, nextStreak));
      setMessage(`Perfect! You remembered all ${targetWords.length} words.`);
      setPhase("success");
      return;
    }

    const remainingLives = lives - 1;
    setLives(remainingLives);
    setStreak(0);

    if (remainingLives <= 0) {
      setMessage("Game over! You have used all your lives.");
      setPhase("finished");
    } else {
      setMessage("Not quite! The original words will be shown again.");
      setPhase("mistake");
    }
  }, [
    phase,
    selectedWords,
    targetSet,
    targetWords,
    level,
    difficulty,
    score,
    streak,
    lives,
  ]);

  // Keyboard: Enter to submit.
  useEffect(() => {
    if (phase !== "answer") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && selectedWords.length === targetWords.length) {
        e.preventDefault();
        submitAnswer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, selectedWords.length, targetWords.length, submitAnswer]);

  const statusText: Record<Phase, string> = {
    ready: "READY",
    showing: "MEMORIZE",
    answer: "YOUR TURN",
    success: "CORRECT",
    mistake: "TRY AGAIN",
    finished: "GAME OVER",
  };

  const canSubmit =
    phase === "answer" && selectedWords.length === targetWords.length;

  return (
    <ToolShell title="Word Memory Test" onReset={resetGame} wide>
      <div className="wm">
        {/* HEADER */}
        <header className="wm-head">
          <div className="wm-head-text">
            <span className="wm-eyebrow">WORD RECOGNITION · PRO</span>
            <h2>Word Memory Test</h2>
          </div>
          <div className="wm-best">
            <span className="wm-best-label">BEST</span>
            <strong className="wm-best-value">
              {bestScore.toLocaleString()}
            </strong>
          </div>
        </header>

        {/* STAT BAR */}
        <div className="wm-bar">
          <div className="wm-bar-cell">
            <span>LEVEL</span>
            <strong>{level}</strong>
          </div>
          <div className="wm-bar-sep" />
          <div className="wm-bar-cell">
            <span>SCORE</span>
            <strong>{score.toLocaleString()}</strong>
          </div>
          <div className="wm-bar-sep" />
          <div className="wm-bar-cell">
            <span>WORDS</span>
            <strong>{targetWords.length || wordCount}</strong>
          </div>
          <div className="wm-bar-sep" />
          <div className="wm-bar-cell">
            <span>LIVES</span>
            <strong className="wm-hearts">
              {Array.from({ length: STARTING_LIVES }, (_, i) => (
                <span
                  key={i}
                  className={i < lives ? "wm-heart on" : "wm-heart"}
                  aria-hidden="true"
                >
                  ♥
                </span>
              ))}
            </strong>
          </div>
        </div>

        {/* STAGE */}
        <div className="wm-stage">
          <div className="wm-stage-top">
            <span className={`wm-pill wm-pill-${phase}`}>
              <span className="wm-pill-dot" />
              {statusText[phase]}
            </span>
            <div className="wm-stage-right">
              {streak > 0 && (
                <span className="wm-pill wm-pill-streak">🔥 {streak}</span>
              )}
              {phase === "showing" && (
                <span className="wm-pill wm-pill-countdown">
                  {countdown}s
                </span>
              )}
            </div>
          </div>

          {phase === "showing" && (
            <div className="wm-progress-track">
              <div
                className="wm-progress-fill"
                style={{
                  width: `${Math.min(
                    100,
                    ((config.displayTime - remainingMs) /
                      config.displayTime) *
                      100
                  )}%`,
                }}
              />
            </div>
          )}

          {/* READY */}
          {phase === "ready" && (
            <div className="wm-ready">
              <div className="wm-ready-icon">Aa</div>
              <h3>Ready to test your memory?</h3>
              <p>
                A list of words will appear for a few seconds. Then you&apos;ll
                pick them out of a larger shuffled set.
              </p>
            </div>
          )}

          {/* SHOWING */}
          {phase === "showing" && (
            <div className="wm-showing">
              <div className="wm-word-grid">
                {targetWords.map((word, i) => (
                  <div
                    className="wm-word-card"
                    key={word}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {word}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ANSWER */}
          {phase === "answer" && (
            <div className="wm-answer">
              <div className="wm-answer-instruction">
                <strong>Select the original words</strong>
                <span>
                  {selectedWords.length} / {targetWords.length} selected
                </span>
              </div>
              <div className="wm-word-options">
                {options.map((word) => {
                  const selected = selectedWords.includes(word);
                  return (
                    <button
                      key={word}
                      type="button"
                      className={`wm-option ${selected ? "selected" : ""}`}
                      onClick={() => toggleWord(word)}
                      aria-pressed={selected}
                    >
                      <span className="wm-option-check">
                        {selected ? "✓" : ""}
                      </span>
                      <span className="wm-option-text">{word}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUCCESS */}
          {phase === "success" && (
            <div className="wm-feedback wm-feedback-success">
              <div className="wm-feedback-icon">✓</div>
              <h3>Perfect recall!</h3>
              <p>
                You identified all {targetWords.length} words. +{10 + level * 2}{" "}
                points.
              </p>
              <div className="wm-next-note">Loading level {level + 1}...</div>
            </div>
          )}

          {/* MISTAKE */}
          {phase === "mistake" && (
            <div className="wm-feedback wm-feedback-mistake">
              <div className="wm-feedback-icon">!</div>
              <h3>Almost there!</h3>
              <p>
                You found {correctCount} of {targetWords.length} words.{" "}
                {lives} {lives === 1 ? "life" : "lives"} remaining.
              </p>
              {missedWords.length > 0 && (
                <div className="wm-missed">
                  <span className="wm-missed-label">You missed:</span>
                  <div className="wm-missed-list">
                    {missedWords.map((w) => (
                      <span key={w} className="wm-missed-word">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="wm-next-note">Replaying in a moment...</div>
            </div>
          )}

          {/* FINISHED */}
          {phase === "finished" && (
            <div className="wm-feedback wm-feedback-finished">
              <div className="wm-feedback-icon">★</div>
              <h3>Game over</h3>
              <p>
                You reached level {level} with{" "}
                {score.toLocaleString()} points.
              </p>
              <div className="wm-final-score">
                <span>FINAL SCORE</span>
                <strong>{score.toLocaleString()}</strong>
              </div>
            </div>
          )}
        </div>

        {/* ACTION ROW */}
        <div className="wm-action">
          <div
            className={`wm-msg wm-msg-${phase}`}
            role="status"
            aria-live="polite"
          >
            <span className="wm-msg-icon">
              {phase === "success"
                ? "✓"
                : phase === "mistake" || phase === "finished"
                  ? "!"
                  : phase === "showing"
                    ? "◉"
                    : phase === "answer"
                      ? "↗"
                      : "◆"}
            </span>
            <span>{message}</span>
          </div>

          <div className="wm-action-btns">
            {phase === "ready" && (
              <button className="wm-btn wm-btn-pri" onClick={startGame}>
                Start test <span aria-hidden="true">→</span>
              </button>
            )}

            {phase === "answer" && (
              <>
                <button
                  className="wm-btn wm-btn-sec"
                  onClick={() => setSelectedWords([])}
                  disabled={selectedWords.length === 0}
                >
                  Clear
                </button>
                <button
                  className={`wm-btn wm-btn-pri ${
                    canSubmit ? "wm-btn-ready" : ""
                  }`}
                  onClick={submitAnswer}
                  disabled={!canSubmit}
                >
                  Check answer <span aria-hidden="true">→</span>
                </button>
              </>
            )}

            {phase === "finished" && (
              <button className="wm-btn wm-btn-pri" onClick={startGame}>
                Play again <span aria-hidden="true">↻</span>
              </button>
            )}
          </div>
        </div>

        {/* DIFFICULTY STRIP */}
        <div
          className="wm-diff-strip"
          role="group"
          aria-label="Difficulty"
        >
          {(Object.keys(DIFFICULTIES) as Difficulty[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`wm-diff-btn ${
                difficulty === item ? "is-active" : ""
              }`}
              onClick={() => changeDifficulty(item)}
              disabled={isPlaying}
              aria-pressed={difficulty === item}
            >
              <span className="wm-diff-name">{DIFFICULTIES[item].label}</span>
              <span className="wm-diff-meta">
                {DIFFICULTIES[item].startingWords}+ words
              </span>
            </button>
          ))}
        </div>

        {/* EXPANDABLE: HISTORY */}
        {history.length > 0 && (
          <>
            <button
              type="button"
              className="wm-expand"
              onClick={() => setShowHistory((v) => !v)}
              aria-expanded={showHistory}
            >
              <span>
                History · {history.length} round
                {history.length === 1 ? "" : "s"} · {perfectCount} perfect
              </span>
              <span className="wm-expand-chev">
                {showHistory ? "−" : "+"}
              </span>
            </button>

            {showHistory && (
              <div className="wm-panel">
                {achievements.length > 0 && (
                  <div className="wm-achievements">
                    {achievements.map((a) => (
                      <span key={a.id} className="wm-achievement">
                        <span className="wm-ach-icon">{a.icon}</span>
                        {a.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="wm-history">
                  {history.map((h, i) => (
                    <div className="wm-history-row" key={i}>
                      <div className="wm-history-main">
                        <strong>
                          L{h.level} · {DIFFICULTIES[h.difficulty].label}
                        </strong>
                        <span className="wm-history-meta">
                          {h.correct}/{h.words} correct
                        </span>
                      </div>
                      <span
                        className={`wm-history-status ${
                          h.perfect ? "is-perfect" : "is-partial"
                        }`}
                      >
                        {h.perfect ? "Perfect" : "Partial"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* EXPANDABLE: HELP */}
        <button
          type="button"
          className="wm-expand"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
        >
          <span>How to play</span>
          <span className="wm-expand-chev">{showHelp ? "−" : "+"}</span>
        </button>

        {showHelp && (
          <div className="wm-panel">
            <div className="wm-step">
              <span>01</span>
              <div>
                <strong>Memorize</strong>
                <p>Read the list of words before the timer runs out.</p>
              </div>
            </div>
            <div className="wm-step">
              <span>02</span>
              <div>
                <strong>Recognize</strong>
                <p>Select the original words from the shuffled options.</p>
              </div>
            </div>
            <div className="wm-step">
              <span>03</span>
              <div>
                <strong>Advance</strong>
                <p>Get every word right to reach the next level.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .wm {
          --wm-primary: #ff5a1f;
          --wm-primary-dark: #e64a14;
          --wm-primary-soft: #fff3ed;
          --wm-primary-surface: #fff7f3;
          --wm-primary-hover: #ffb69d;
          --wm-text: var(--text-main, #172033);
          --wm-muted: var(--text-muted, #596579);
          --wm-border: var(--border-color, #e8ebf1);
          --wm-surface: var(--card-bg, #ffffff);
          --wm-soft: #fafbfc;

          color: var(--wm-text);
          width: 100%;
          max-width: 620px;
          margin: 0 auto;
        }

        /* HEADER */
        .wm-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .wm-head-text {
          min-width: 0;
        }

        .wm-eyebrow {
          display: block;
          color: var(--wm-primary);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          margin-bottom: 3px;
        }

        .wm-head h2 {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.2;
          margin: 0;
        }

        .wm-best {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
          padding: 8px 12px;
          border: 1px solid var(--wm-border);
          border-radius: 10px;
          background: linear-gradient(145deg, #fff3ed, #fffaf7);
        }

        .wm-best-label {
          font-size: 8px;
          font-weight: 800;
          color: var(--wm-muted);
          letter-spacing: 1px;
        }

        .wm-best-value {
          font-size: 18px;
          font-weight: 800;
          color: var(--wm-primary);
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }

        /* STAT BAR */
        .wm-bar {
          display: flex;
          align-items: stretch;
          border: 1px solid var(--wm-border);
          border-radius: 11px;
          background: var(--wm-surface);
          overflow: hidden;
          margin-bottom: 12px;
        }

        .wm-bar-cell {
          flex: 1;
          min-width: 0;
          padding: 9px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .wm-bar-cell > span {
          font-size: 8px;
          font-weight: 800;
          color: var(--wm-muted);
          letter-spacing: 0.9px;
        }

        .wm-bar-cell strong {
          font-size: 16px;
          font-weight: 800;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
          color: var(--wm-text);
        }

        .wm-bar-sep {
          width: 1px;
          background: var(--wm-border);
          flex-shrink: 0;
        }

        .wm-hearts {
          display: flex;
          gap: 2px;
        }

        .wm-heart {
          color: #d9dbe4;
          font-size: 13px;
        }

        .wm-heart.on {
          color: #e34d70;
        }

        /* STAGE */
        .wm-stage {
          position: relative;
          padding: 14px;
          border: 1px solid var(--wm-border);
          border-radius: 16px;
          background: radial-gradient(
            circle at 50% 20%,
            #ffffff 0%,
            #fafbfc 75%
          );
          box-shadow: 0 6px 20px rgba(23, 32, 51, 0.05);
          min-height: 300px;
          display: flex;
          flex-direction: column;
        }

        .wm-stage-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .wm-stage-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .wm-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.4px;
          white-space: nowrap;
          background: var(--wm-primary-soft);
          color: var(--wm-primary);
        }

        .wm-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--wm-primary);
          box-shadow: 0 0 0 2px rgba(255, 90, 31, 0.15);
        }

        .wm-pill-showing {
          background: var(--wm-primary-soft);
          color: var(--wm-primary);
        }

        .wm-pill-answer {
          background: #ecfdf5;
          color: #15803d;
        }

        .wm-pill-answer .wm-pill-dot {
          background: #16a34a;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15);
        }

        .wm-pill-success {
          background: #ecfdf5;
          color: #15803d;
        }

        .wm-pill-success .wm-pill-dot {
          background: #16a34a;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15);
        }

        .wm-pill-mistake,
        .wm-pill-finished {
          background: #fef2f2;
          color: #b42318;
        }

        .wm-pill-mistake .wm-pill-dot,
        .wm-pill-finished .wm-pill-dot {
          background: #ef4444;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
        }

        .wm-pill-streak {
          background: #fef3c7;
          color: #b45309;
        }

        .wm-pill-countdown {
          background: var(--wm-primary);
          color: #fff;
          min-width: 42px;
          justify-content: center;
          font-variant-numeric: tabular-nums;
        }

        /* Progress bar during showing */
        .wm-progress-track {
          height: 4px;
          border-radius: 99px;
          background: #eeeff5;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .wm-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff7a47, #ff5a1f);
          transition: width 100ms linear;
        }

        /* READY */
        .wm-ready {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 20px 10px;
        }

        .wm-ready-icon {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: var(--wm-primary-soft);
          color: var(--wm-primary);
          font-size: 24px;
          font-weight: 900;
        }

        .wm-ready h3 {
          margin: 14px 0 6px;
          font-size: 18px;
          font-weight: 800;
          color: var(--wm-text);
        }

        .wm-ready p {
          max-width: 380px;
          margin: 0;
          color: var(--wm-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        /* SHOWING */
        .wm-showing {
          flex: 1;
        }

        .wm-word-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(min(100%, 130px), 1fr)
          );
          gap: 8px;
        }

        .wm-word-card {
          min-height: 56px;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--wm-primary-hover);
          border-radius: 10px;
          background: var(--wm-primary-soft);
          color: var(--wm-primary-dark);
          text-align: center;
          font-size: 13px;
          font-weight: 800;
          animation: wmAppear 220ms ease both;
          overflow-wrap: anywhere;
        }

        @keyframes wmAppear {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ANSWER */
        .wm-answer {
          flex: 1;
        }

        .wm-answer-instruction {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--wm-border);
        }

        .wm-answer-instruction strong {
          font-size: 12px;
          font-weight: 800;
          color: var(--wm-text);
        }

        .wm-answer-instruction span {
          color: var(--wm-muted);
          font-size: 10px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        .wm-word-options {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(min(100%, 150px), 1fr)
          );
          gap: 6px;
        }

        .wm-option {
          min-width: 0;
          min-height: 44px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--wm-border);
          border-radius: 9px;
          background: #fff;
          color: var(--wm-text);
          text-align: left;
          cursor: pointer;
          transition: border-color 120ms ease, background 120ms ease,
            transform 120ms ease;
        }

        .wm-option:hover {
          border-color: var(--wm-primary-hover);
          background: var(--wm-primary-surface);
        }

        .wm-option.selected {
          border-color: var(--wm-primary);
          background: var(--wm-primary-soft);
          color: var(--wm-primary-dark);
          box-shadow: inset 0 0 0 1px var(--wm-primary);
        }

        .wm-option-check {
          width: 18px;
          height: 18px;
          display: flex;
          flex: 0 0 18px;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          border-radius: 5px;
          background: #fff;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
        }

        .wm-option.selected .wm-option-check {
          border-color: var(--wm-primary);
          background: var(--wm-primary);
        }

        .wm-option-text {
          font-size: 12px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        /* FEEDBACK (success / mistake / finished) */
        .wm-feedback {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 20px 10px;
        }

        .wm-feedback-icon {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 24px;
          font-weight: 900;
        }

        .wm-feedback-success .wm-feedback-icon {
          background: #dcfce7;
          color: #15803d;
        }

        .wm-feedback-mistake .wm-feedback-icon,
        .wm-feedback-finished .wm-feedback-icon {
          background: #fee2e2;
          color: #dc2626;
        }

        .wm-feedback h3 {
          margin: 12px 0 5px;
          font-size: 18px;
          font-weight: 800;
          color: var(--wm-text);
        }

        .wm-feedback p {
          max-width: 380px;
          margin: 0;
          color: var(--wm-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .wm-missed {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 9px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          max-width: 400px;
        }

        .wm-missed-label {
          display: block;
          font-size: 9px;
          font-weight: 800;
          color: #b45309;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .wm-missed-list {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          justify-content: center;
        }

        .wm-missed-word {
          padding: 3px 8px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid #fbbf24;
          color: #b45309;
          font-size: 11px;
          font-weight: 700;
        }

        .wm-next-note {
          margin-top: 14px;
          padding: 8px 14px;
          border-radius: 8px;
          background: var(--wm-soft);
          color: var(--wm-muted);
          font-size: 11px;
          font-weight: 700;
        }

        .wm-final-score {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 14px;
          padding: 12px 20px;
          border-radius: 10px;
          background: var(--wm-primary-soft);
        }

        .wm-final-score span {
          font-size: 9px;
          font-weight: 800;
          color: var(--wm-muted);
          letter-spacing: 1px;
        }

        .wm-final-score strong {
          font-size: 26px;
          font-weight: 900;
          color: var(--wm-primary);
          font-variant-numeric: tabular-nums;
        }

        /* ACTION ROW */
        .wm-action {
          display: flex;
          align-items: stretch;
          gap: 8px;
          margin-top: 10px;
        }

        .wm-msg {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 11px;
          border-radius: 9px;
          background: var(--wm-soft);
          color: var(--wm-muted);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.4;
          min-height: 40px;
          min-width: 0;
        }

        .wm-msg-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #475569;
          font-size: 10px;
          font-weight: 900;
        }

        .wm-msg-success {
          background: #ecfdf5;
          color: #166534;
        }

        .wm-msg-success .wm-msg-icon {
          background: #dcfce7;
          color: #15803d;
        }

        .wm-msg-mistake,
        .wm-msg-finished {
          background: #fef2f2;
          color: #b91c1c;
        }

        .wm-msg-mistake .wm-msg-icon,
        .wm-msg-finished .wm-msg-icon {
          background: #fee2e2;
          color: #dc2626;
        }

        .wm-action-btns {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }

        .wm-btn {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 9px;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background 150ms ease,
            transform 150ms ease,
            box-shadow 150ms ease,
            border-color 150ms ease,
            color 150ms ease;
          white-space: nowrap;
        }

        .wm-btn:focus-visible {
          outline: 3px solid var(--wm-primary-hover);
          outline-offset: 3px;
        }

        .wm-btn:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .wm-btn-pri {
          border: 1px solid #e74e1b;
          background: linear-gradient(135deg, #ff682f, #e94b18);
          color: #fff;
          box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
        }

        .wm-btn-pri:hover:not(:disabled) {
          background: linear-gradient(135deg, #f45a25, #d94112);
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(255, 90, 31, 0.28);
        }

        .wm-btn-pri.wm-btn-ready {
          animation: wmReady 1.4s ease-in-out infinite;
        }

        @keyframes wmReady {
          0%,
          100% {
            box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
          }
          50% {
            box-shadow: 0 3px 16px rgba(255, 90, 31, 0.45);
          }
        }

        .wm-btn-sec {
          border: 1px solid var(--wm-border);
          background: #fff;
          color: var(--wm-muted);
        }

        .wm-btn-sec:hover:not(:disabled) {
          border-color: var(--wm-primary-hover);
          color: var(--wm-primary);
          background: var(--wm-primary-surface);
        }

        /* DIFFICULTY STRIP */
        .wm-diff-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          margin-top: 12px;
        }

        .wm-diff-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 6px;
          border: 1px solid var(--wm-border);
          border-radius: 10px;
          background: var(--wm-surface);
          color: var(--wm-text);
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .wm-diff-btn:hover:not(:disabled) {
          border-color: var(--wm-primary-hover);
          background: var(--wm-primary-surface);
        }

        .wm-diff-btn:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .wm-diff-btn.is-active {
          border-color: var(--wm-primary);
          background: var(--wm-primary-soft);
          box-shadow: inset 0 0 0 1px var(--wm-primary);
        }

        .wm-diff-name {
          font-size: 12px;
          font-weight: 800;
        }

        .wm-diff-btn.is-active .wm-diff-name {
          color: var(--wm-primary);
        }

        .wm-diff-meta {
          font-size: 9px;
          color: var(--wm-muted);
          font-weight: 600;
        }

        .wm-diff-btn.is-active .wm-diff-meta {
          color: var(--wm-primary);
          opacity: 0.8;
        }

        /* EXPANDABLE */
        .wm-expand {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          padding: 9px 12px;
          border: 1px solid var(--wm-border);
          border-radius: 9px;
          background: transparent;
          color: var(--wm-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .wm-expand:hover {
          color: var(--wm-primary);
          border-color: var(--wm-primary-hover);
        }

        .wm-expand-chev {
          font-size: 14px;
          font-weight: 500;
          color: var(--wm-primary);
          flex-shrink: 0;
        }

        .wm-panel {
          margin-top: 8px;
          padding: 12px 14px;
          border: 1px solid var(--wm-border);
          border-radius: 11px;
          background: var(--wm-soft);
        }

        /* Achievements */
        .wm-achievements {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--wm-border);
        }

        .wm-achievement {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          border-radius: 999px;
          background: var(--wm-primary-soft);
          color: var(--wm-primary);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2px;
        }

        .wm-ach-icon {
          font-size: 11px;
        }

        /* History */
        .wm-history {
          display: grid;
          gap: 5px;
          max-height: 220px;
          overflow-y: auto;
        }

        .wm-history-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 10px;
          border-radius: 8px;
          background: var(--wm-surface);
          gap: 8px;
        }

        .wm-history-main {
          display: flex;
          align-items: baseline;
          gap: 8px;
          min-width: 0;
          flex-wrap: wrap;
        }

        .wm-history-main strong {
          font-size: 11px;
          font-weight: 800;
          color: var(--wm-text);
        }

        .wm-history-meta {
          color: var(--wm-muted);
          font-size: 10px;
        }

        .wm-history-status {
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .wm-history-status.is-perfect {
          background: #eaf8f0;
          color: #18794a;
        }

        .wm-history-status.is-partial {
          background: #fff0f1;
          color: #bd3e52;
        }

        /* Help steps */
        .wm-step {
          display: flex;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px solid var(--wm-border);
        }

        .wm-step:first-child {
          padding-top: 0;
        }

        .wm-step:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .wm-step > span {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 26px;
          border-radius: 7px;
          background: var(--wm-primary-soft);
          color: var(--wm-primary);
          font-size: 9px;
          font-weight: 900;
        }

        .wm-step strong {
          display: block;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 2px;
          color: var(--wm-text);
        }

        .wm-step p {
          margin: 0;
          color: var(--wm-muted);
          font-size: 10px;
          line-height: 1.5;
        }

        /* RESPONSIVE */
        @media (max-width: 480px) {
          .wm-head {
            flex-wrap: wrap;
          }

          .wm-best-value {
            font-size: 16px;
          }

          .wm-bar-cell {
            padding: 8px 8px;
          }

          .wm-bar-cell strong {
            font-size: 14px;
          }

          .wm-stage {
            padding: 11px;
            min-height: 280px;
          }

          .wm-word-card {
            min-height: 48px;
            font-size: 12px;
          }

          .wm-word-options {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .wm-action {
            flex-direction: column;
          }

          .wm-action-btns {
            justify-content: flex-end;
          }

          .wm-diff-strip {
            gap: 4px;
          }

          .wm-diff-name {
            font-size: 11px;
          }

          .wm-diff-meta {
            font-size: 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .wm-word-card,
          .wm-btn-pri.wm-btn-ready,
          .wm-progress-fill {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </ToolShell>
  );
}