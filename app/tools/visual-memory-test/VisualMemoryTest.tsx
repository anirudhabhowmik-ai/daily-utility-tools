"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ToolShell from "../ToolShell";

type Difficulty = "easy" | "medium" | "hard";
type Phase = "ready" | "showing" | "answer" | "success" | "mistake" | "finished";

type DifficultyConfig = {
  label: string;
  rows: number;
  columns: number;
  startingTiles: number;
  displayTime: number;
};

type HistoryEntry = {
  level: number;
  tiles: number;
  correct: boolean;
};

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { label: "Easy", rows: 3, columns: 3, startingTiles: 3, displayTime: 2200 },
  medium: { label: "Medium", rows: 4, columns: 4, startingTiles: 5, displayTime: 2600 },
  hard: { label: "Hard", rows: 5, columns: 5, startingTiles: 7, displayTime: 3000 },
};

const BEST_SCORE_KEY = "toolsab-visual-memory-best-v1";

function createPattern(totalCells: number, tileCount: number): number[] {
  const available = Array.from({ length: totalCells }, (_, index) => index);

  for (let i = available.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [available[i], available[randomIndex]] = [
      available[randomIndex],
      available[i],
    ];
  }

  return available.slice(0, Math.min(tileCount, totalCells));
}

export default function VisualMemoryTest() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<Phase>("ready");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [bestScore, setBestScore] = useState(0);
  const [pattern, setPattern] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [roundMessage, setRoundMessage] = useState("");
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [roundId, setRoundId] = useState(0);

  const [showHelp, setShowHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const config = DIFFICULTIES[difficulty];
  const totalCells = config.rows * config.columns;
  const tileCount = Math.min(
    config.startingTiles + Math.floor((level - 1) / 2),
    totalCells - 1
  );

  const isPlaying = phase !== "ready" && phase !== "finished";

  const accuracy =
    history.length > 0
      ? Math.round(
          (history.filter((entry) => entry.correct).length / history.length) * 100
        )
      : 0;

  // Load the saved best score.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BEST_SCORE_KEY);
      const parsed = stored ? Number(stored) : 0;
      if (Number.isFinite(parsed) && parsed >= 0) {
        setBestScore(parsed);
      }
    } catch {
      // Game remains playable if storage is unavailable.
    }
  }, []);

  // Save the best score locally.
  useEffect(() => {
    if (score <= bestScore) return;
    setBestScore(score);
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(score));
    } catch {
      // Storage may be disabled by the browser.
    }
  }, [score, bestScore]);

  // Automatically hide the pattern after the memorization period.
  useEffect(() => {
    if (phase !== "showing") return;

    const timer = window.setTimeout(() => {
      setSelected([]);
      setPhase("answer");
    }, config.displayTime);

    return () => window.clearTimeout(timer);
  }, [phase, config.displayTime, pattern]);

  const startRound = useCallback(
    (currentLevel: number, currentDifficulty: Difficulty) => {
      const currentConfig = DIFFICULTIES[currentDifficulty];
      const cells = currentConfig.rows * currentConfig.columns;
      const count = Math.min(
        currentConfig.startingTiles + Math.floor((currentLevel - 1) / 2),
        cells - 1
      );

      setPattern(createPattern(cells, count));
      setSelected([]);
      setRoundMessage("");
      setPhase("showing");
      setRoundId((prev) => prev + 1);
    },
    []
  );

  const startGame = () => {
    setLevel(1);
    setScore(0);
    setLives(3);
    setStreak(0);
    setHistory([]);
    setSelected([]);
    setPattern([]);
    setShowHistory(false);
    startRound(1, difficulty);
  };

  const changeDifficulty = (nextDifficulty: Difficulty) => {
    if (isPlaying) return;
    setDifficulty(nextDifficulty);
    setLevel(1);
    setScore(0);
    setLives(3);
    setStreak(0);
    setHistory([]);
    setPattern([]);
    setSelected([]);
    setRoundMessage("");
    setPhase("ready");
  };

  const handleTileClick = (index: number) => {
    if (phase !== "answer" || selected.includes(index)) return;

    if (!pattern.includes(index)) {
      const remainingLives = lives - 1;
      setLives(remainingLives);
      setStreak(0);
      setHistory((prev) => [
        ...prev,
        { level, tiles: pattern.length, correct: false },
      ]);
      setRoundMessage(
        remainingLives > 0
          ? "Incorrect tile. You can try this level again."
          : "You have used all your lives."
      );
      setPhase(remainingLives > 0 ? "mistake" : "finished");
      if (remainingLives <= 0) setShowHistory(true);
      return;
    }

    const nextSelected = [...selected, index];
    setSelected(nextSelected);

    if (nextSelected.length === pattern.length) {
      const earnedPoints = 10 + level * 2;
      setScore((previous) => previous + earnedPoints);
      setStreak((prev) => prev + 1);
      setHistory((prev) => [
        ...prev,
        { level, tiles: pattern.length, correct: true },
      ]);
      setRoundMessage(`Great memory! You earned ${earnedPoints} points.`);
      setPhase("success");
    }
  };

  const retryLevel = () => startRound(level, difficulty);

  const nextLevel = () => {
    const next = level + 1;
    setLevel(next);
    startRound(next, difficulty);
  };

  const resetGame = () => {
    setLevel(1);
    setScore(0);
    setLives(3);
    setStreak(0);
    setHistory([]);
    setPattern([]);
    setSelected([]);
    setRoundMessage("");
    setPhase("ready");
  };

  const phaseLabel =
    phase === "showing"
      ? "MEMORIZE"
      : phase === "answer"
        ? "YOUR TURN"
        : phase === "success"
          ? "CORRECT"
          : phase === "mistake"
            ? "TRY AGAIN"
            : phase === "finished"
              ? "GAME OVER"
              : "READY";

  const displayMessage =
    phase === "ready"
      ? "Choose a difficulty below and start when you're ready."
      : phase === "showing"
        ? "Memorize the highlighted tiles."
        : phase === "answer"
          ? "Select every highlighted tile. Avoid selecting any extra tile."
          : roundMessage;

  return (
    <ToolShell title="Visual Memory Test" onReset={resetGame} wide>
      <div className="vmt">
        {/* HEADER */}
        <header className="vmt-head">
          <div className="vmt-head-text">
            <span className="vmt-eyebrow">BRAIN TRAINING · PRO</span>
            <h2>Visual Memory Test</h2>
          </div>
          <div className="vmt-best">
            <span className="vmt-best-label">BEST</span>
            <strong className="vmt-best-value">{bestScore}</strong>
          </div>
        </header>

        {/* STAT BAR */}
        <div className="vmt-bar">
          <div className="vmt-bar-cell">
            <span>SCORE</span>
            <strong>{score}</strong>
          </div>
          <div className="vmt-bar-sep" />
          <div className="vmt-bar-cell">
            <span>LEVEL</span>
            <strong>{level}</strong>
          </div>
          <div className="vmt-bar-sep" />
          <div className="vmt-bar-cell">
            <span>TILES</span>
            <strong>{tileCount}</strong>
          </div>
          <div className="vmt-bar-sep" />
          <div className="vmt-bar-cell">
            <span>LIVES</span>
            <strong className="vmt-hearts">
              {Array.from({ length: 3 }, (_, i) => (
                <span
                  key={i}
                  className={i < lives ? "vmt-heart on" : "vmt-heart"}
                  aria-hidden="true"
                >
                  ♥
                </span>
              ))}
            </strong>
          </div>
        </div>

        {/* STAGE */}
        <div className="vmt-stage">
          <div className="vmt-stage-top">
            <span className={`vmt-pill vmt-pill-${phase}`}>
              <span className="vmt-pill-dot" />
              {phaseLabel}
            </span>
            {streak > 0 && (
              <span className="vmt-pill vmt-pill-streak">🔥 {streak}</span>
            )}
          </div>

          {phase === "showing" && (
            <div
              className="vmt-countdown-track"
              key={roundId}
              aria-hidden="true"
            >
              <div
                className="vmt-countdown-fill"
                style={{ animationDuration: `${config.displayTime}ms` }}
              />
            </div>
          )}

          <div
            className="vmt-board"
            style={{
              gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))`,
            }}
            role="group"
            aria-label={`${config.rows} by ${config.columns} visual memory grid`}
          >
            {Array.from({ length: totalCells }, (_, index) => {
              const isPatternTile = pattern.includes(index);
              const isSelected = selected.includes(index);
              const revealPattern = phase === "showing";
              const revealAnswer =
                phase === "success" ||
                phase === "mistake" ||
                phase === "finished";

              const isRevealed =
                (revealPattern && isPatternTile) ||
                (revealAnswer && isPatternTile) ||
                isSelected;

              return (
                <button
                  key={index}
                  type="button"
                  className={[
                    "vmt-tile",
                    isRevealed ? "is-revealed" : "",
                    isSelected ? "is-selected" : "",
                    revealAnswer && isPatternTile ? "is-answer" : "",
                    revealAnswer && !isPatternTile && selected.includes(index)
                      ? "is-wrong"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleTileClick(index)}
                  disabled={phase !== "answer" || isSelected}
                  aria-label={`Grid tile ${index + 1}${
                    isRevealed ? ", highlighted" : ""
                  }`}
                  aria-pressed={isSelected}
                >
                  {isRevealed ? <span aria-hidden="true">✦</span> : null}
                </button>
              );
            })}
          </div>

          {(phase === "showing" || phase === "answer" || phase === "ready") && (
            <div className="vmt-stage-info">
              {phase === "showing" && (
                <span className="vmt-stage-hint">
                  Look carefully — the pattern will hide shortly.
                </span>
              )}
              {phase === "answer" && (
                <div className="vmt-progress-wrap">
                  <div className="vmt-progress-label">
                    <span>Selected</span>
                    <strong>
                      {selected.length} / {pattern.length}
                    </strong>
                  </div>
                  <div className="vmt-progress-track">
                    <div
                      className="vmt-progress-fill"
                      style={{
                        width: `${(selected.length / pattern.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {phase === "ready" && (
                <span className="vmt-stage-hint">
                  {tileCount} tiles to memorize · {config.rows} ×{" "}
                  {config.columns} grid
                </span>
              )}
            </div>
          )}
        </div>

        {/* ACTION ROW */}
        <div className="vmt-action">
          <div
            className={`vmt-msg vmt-msg-${phase}`}
            role="status"
            aria-live="polite"
          >
            <span className="vmt-msg-icon">
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
            <div className="vmt-msg-content">
              <span>{displayMessage}</span>
              {phase === "finished" && history.length > 0 && (
                <span className="vmt-msg-meta">
                  Accuracy: {accuracy}% · {history.length}{" "}
                  {history.length === 1 ? "round" : "rounds"} played
                </span>
              )}
            </div>
          </div>

          <div className="vmt-action-btns">
            {phase !== "ready" && (
              <button
                type="button"
                className="vmt-btn vmt-btn-sec"
                onClick={resetGame}
              >
                Reset
              </button>
            )}

            {phase === "ready" && (
              <button
                type="button"
                className="vmt-btn vmt-btn-pri"
                onClick={startGame}
              >
                Start <span aria-hidden="true">→</span>
              </button>
            )}

            {phase === "success" && (
              <button
                type="button"
                className="vmt-btn vmt-btn-pri"
                onClick={nextLevel}
              >
                Continue <span aria-hidden="true">→</span>
              </button>
            )}

            {phase === "mistake" && (
              <button
                type="button"
                className="vmt-btn vmt-btn-pri"
                onClick={retryLevel}
              >
                Retry <span aria-hidden="true">↻</span>
              </button>
            )}

            {phase === "finished" && (
              <button
                type="button"
                className="vmt-btn vmt-btn-pri"
                onClick={startGame}
              >
                Play again <span aria-hidden="true">↻</span>
              </button>
            )}
          </div>
        </div>

        {/* DIFFICULTY STRIP */}
        <div className="vmt-diff-strip" role="group" aria-label="Difficulty">
          {(["easy", "medium", "hard"] as Difficulty[]).map((option) => (
            <button
              key={option}
              type="button"
              className={`vmt-diff-btn ${
                difficulty === option ? "is-active" : ""
              }`}
              onClick={() => changeDifficulty(option)}
              disabled={isPlaying}
              aria-pressed={difficulty === option}
            >
              <span className="vmt-diff-name">
                {DIFFICULTIES[option].label}
              </span>
              <span className="vmt-diff-meta">
                {DIFFICULTIES[option].rows}×{DIFFICULTIES[option].columns} ·{" "}
                {(DIFFICULTIES[option].displayTime / 1000).toFixed(1)}s
              </span>
            </button>
          ))}
        </div>

        {/* EXPANDABLE: HOW TO PLAY */}
        <button
          type="button"
          className="vmt-expand"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
        >
          <span>How to play</span>
          <span className="vmt-expand-chev">{showHelp ? "−" : "+"}</span>
        </button>

        {showHelp && (
          <div className="vmt-panel">
            <div className="vmt-step">
              <span>01</span>
              <div>
                <strong>Study the pattern</strong>
                <p>
                  A group of squares lights up briefly. Note their positions on
                  the grid.
                </p>
              </div>
            </div>
            <div className="vmt-step">
              <span>02</span>
              <div>
                <strong>Remember the positions</strong>
                <p>
                  The highlighted squares disappear. Try to remember where each
                  one appeared.
                </p>
              </div>
            </div>
            <div className="vmt-step">
              <span>03</span>
              <div>
                <strong>Recreate the pattern</strong>
                <p>
                  Select all the correct squares. Complete levels to increase
                  your score.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* EXPANDABLE: HISTORY */}
        {history.length > 0 && (
          <>
            <button
              type="button"
              className="vmt-expand"
              onClick={() => setShowHistory((v) => !v)}
              aria-expanded={showHistory}
            >
              <span>
                Round history · {accuracy}% accuracy · {history.length}{" "}
                {history.length === 1 ? "round" : "rounds"}
              </span>
              <span className="vmt-expand-chev">
                {showHistory ? "−" : "+"}
              </span>
            </button>

            {showHistory && (
              <div className="vmt-panel vmt-panel-history">
                {history.map((entry, index) => (
                  <div className="vmt-history-row" key={index}>
                    <div className="vmt-history-level">
                      <span>Level {entry.level}</span>
                      <small>{entry.tiles} tiles</small>
                    </div>
                    <span
                      className={`vmt-history-status ${
                        entry.correct ? "is-correct" : "is-wrong"
                      }`}
                    >
                      {entry.correct ? "Correct" : "Wrong"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TIPS (static, below fold) */}
        <section className="vmt-tips">
          <h3>Tips to improve your visual memory</h3>
          <ul>
            <li>
              <strong>Group nearby squares:</strong> Remember tiles as small
              shapes or clusters instead of isolated positions.
            </li>
            <li>
              <strong>Use a scanning strategy:</strong> Mentally scan the grid
              from left to right or top to bottom.
            </li>
            <li>
              <strong>Practice regularly:</strong> Short, consistent sessions
              can help you become more familiar with visual patterns.
            </li>
            <li>
              <strong>Increase difficulty gradually:</strong> Start with an
              easier grid before moving to larger patterns.
            </li>
          </ul>
        </section>

        {/* FAQ (static, below fold) */}
        <section className="vmt-faq">
          <h3>Frequently asked questions</h3>

          <details>
            <summary>What is a Visual Memory Test?</summary>
            <p>
              A Visual Memory Test is a game that challenges your ability to
              remember visual information, such as the positions of objects,
              shapes or highlighted squares. This game uses a grid pattern to
              test visual recall.
            </p>
          </details>

          <details>
            <summary>How does this visual memory game work?</summary>
            <p>
              The game briefly highlights a selection of grid squares. When
              they disappear, you must select the same positions from memory.
              Each completed level increases the challenge.
            </p>
          </details>

          <details>
            <summary>Can I play this game on my phone?</summary>
            <p>
              Yes. The game is designed to work on desktop computers, tablets
              and mobile phones using a responsive grid and touch-friendly
              controls.
            </p>
          </details>

          <details>
            <summary>Is my score saved?</summary>
            <p>
              Your best score is stored locally in your browser using
              localStorage. It is not sent to a server. Clearing browser data
              may remove your saved score.
            </p>
          </details>

          <details>
            <summary>Is the Visual Memory Test free?</summary>
            <p>
              Yes. You can play the Visual Memory Test for free without creating
              an account or installing an application.
            </p>
          </details>

          <details>
            <summary>Does this game measure my actual memory ability?</summary>
            <p>
              This is an informal memory game for entertainment and practice.
              Your score is not a clinical assessment or a medical measurement
              of memory ability.
            </p>
          </details>
        </section>
      </div>

      <style jsx>{`
        .vmt {
          --vmt-primary: #ff5a1f;
          --vmt-primary-dark: #e64a14;
          --vmt-primary-soft: #fff3ed;
          --vmt-primary-surface: #fff7f3;
          --vmt-primary-hover: #ffb69d;
          --vmt-text: var(--text-main, #172033);
          --vmt-muted: var(--text-muted, #596579);
          --vmt-border: var(--border-color, #e8ebf1);
          --vmt-surface: var(--card-bg, #ffffff);
          --vmt-soft: #fafbfc;

          color: var(--vmt-text);
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
        }

        /* =========================================
           HEADER
        ========================================= */
        .vmt-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .vmt-head-text {
          min-width: 0;
        }

        .vmt-eyebrow {
          display: block;
          color: var(--vmt-primary);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          margin-bottom: 3px;
        }

        .vmt-head h2 {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.2;
          margin: 0;
        }

        .vmt-best {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
          padding: 8px 12px;
          border: 1px solid var(--vmt-border);
          border-radius: 10px;
          background: linear-gradient(145deg, #fff3ed, #fffaf7);
        }

        .vmt-best-label {
          font-size: 8px;
          font-weight: 800;
          color: var(--vmt-muted);
          letter-spacing: 1px;
        }

        .vmt-best-value {
          font-size: 17px;
          font-weight: 800;
          color: var(--vmt-primary);
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }

        /* =========================================
           STAT BAR
        ========================================= */
        .vmt-bar {
          display: flex;
          align-items: stretch;
          border: 1px solid var(--vmt-border);
          border-radius: 11px;
          background: var(--vmt-surface);
          overflow: hidden;
          margin-bottom: 12px;
        }

        .vmt-bar-cell {
          flex: 1;
          min-width: 0;
          padding: 9px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .vmt-bar-cell > span {
          font-size: 8px;
          font-weight: 800;
          color: var(--vmt-muted);
          letter-spacing: 0.9px;
        }

        .vmt-bar-cell strong {
          font-size: 15px;
          font-weight: 800;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }

        .vmt-bar-sep {
          width: 1px;
          background: var(--vmt-border);
          flex-shrink: 0;
        }

        .vmt-hearts {
          display: flex;
          gap: 2px;
        }

        .vmt-heart {
          color: #d9dbe4;
          font-size: 13px;
        }

        .vmt-heart.on {
          color: #e34d70;
        }

        /* =========================================
           STAGE
        ========================================= */
        .vmt-stage {
          position: relative;
          padding: 14px;
          border: 1px solid var(--vmt-border);
          border-radius: 16px;
          background: radial-gradient(
            circle at 50% 30%,
            #ffffff 0%,
            #fafbfc 75%
          );
          box-shadow: 0 6px 20px rgba(23, 32, 51, 0.05);
        }

        .vmt-stage-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .vmt-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5px;
          white-space: nowrap;
          background: var(--vmt-primary-soft);
          color: var(--vmt-primary);
        }

        .vmt-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--vmt-primary);
          box-shadow: 0 0 0 2px rgba(255, 90, 31, 0.15);
        }

        .vmt-pill-showing {
          background: var(--vmt-primary-soft);
          color: var(--vmt-primary);
        }

        .vmt-pill-answer {
          background: #ecfdf5;
          color: #15803d;
        }

        .vmt-pill-answer .vmt-pill-dot {
          background: #16a34a;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15);
        }

        .vmt-pill-success {
          background: #ecfdf5;
          color: #15803d;
        }

        .vmt-pill-success .vmt-pill-dot {
          background: #16a34a;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15);
        }

        .vmt-pill-mistake,
        .vmt-pill-finished {
          background: #fef2f2;
          color: #b42318;
        }

        .vmt-pill-mistake .vmt-pill-dot,
        .vmt-pill-finished .vmt-pill-dot {
          background: #ef4444;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
        }

        .vmt-pill-streak {
          background: #fef3c7;
          color: #b45309;
        }

        /* Countdown bar */
        .vmt-countdown-track {
          height: 5px;
          margin-bottom: 10px;
          overflow: hidden;
          border-radius: 99px;
          background: #f3f4f6;
        }

        .vmt-countdown-fill {
          width: 100%;
          height: 100%;
          transform-origin: left;
          background: linear-gradient(90deg, #ff7a47, #ff5a1f);
          animation: vmtCountdown linear forwards;
        }

        @keyframes vmtCountdown {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }

        /* BOARD */
        .vmt-board {
          display: grid;
          gap: 8px;
          width: 100%;
          max-width: min(340px, 40vh);
          aspect-ratio: 1;
          margin: 0 auto;
        }

        .vmt-tile {
          display: grid;
          place-items: center;
          min-width: 0;
          padding: 0;
          border: 1px solid #e3e4ee;
          border-radius: 11px;
          background: #f0f1f7;
          color: white;
          font-size: clamp(14px, 2.4vw, 22px);
          cursor: default;
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            transform 0.15s ease,
            box-shadow 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .vmt-tile:disabled {
          opacity: 1;
        }

        .vmt-tile:not(:disabled) {
          cursor: pointer;
        }

        .vmt-tile:not(:disabled):hover {
          border-color: var(--vmt-primary-hover);
          background: var(--vmt-primary-surface);
          transform: scale(0.96);
        }

        .vmt-tile:focus-visible {
          outline: 3px solid var(--vmt-primary-hover);
          outline-offset: 3px;
        }

        .vmt-tile.is-revealed:not(.is-answer) {
          border-color: var(--vmt-primary-dark);
          background: linear-gradient(145deg, #ff7a47, #e64a14);
          box-shadow: 0 4px 12px rgba(255, 90, 31, 0.22);
          animation: vmtTilePop 0.25s ease;
        }

        @keyframes vmtTilePop {
          0% {
            transform: scale(0.88);
          }
          55% {
            transform: scale(1.04);
          }
          100% {
            transform: scale(1);
          }
        }

        .vmt-tile.is-selected {
          border-color: #3d9e70;
          background: linear-gradient(145deg, #42b77e, #249563);
          box-shadow: 0 4px 12px rgba(36, 149, 99, 0.2);
        }

        .vmt-tile.is-answer {
          border-color: #3d9e70;
          background: linear-gradient(145deg, #42b77e, #249563);
        }

        .vmt-tile.is-wrong {
          border-color: #dc5367;
          background: #dc5367;
        }

        /* Stage info row */
        .vmt-stage-info {
          margin-top: 10px;
          min-height: 28px;
        }

        .vmt-stage-hint {
          display: block;
          text-align: center;
          color: var(--vmt-muted);
          font-size: 10px;
          font-weight: 600;
        }

        .vmt-progress-wrap {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .vmt-progress-label {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: var(--vmt-muted);
          font-size: 9px;
          font-weight: 700;
        }

        .vmt-progress-label strong {
          color: var(--vmt-text);
          font-variant-numeric: tabular-nums;
        }

        .vmt-progress-track {
          height: 5px;
          border-radius: 99px;
          background: #eeeff5;
          overflow: hidden;
        }

        .vmt-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff7a47, #ff5a1f);
          transition: width 0.2s ease;
        }

        /* =========================================
           ACTION ROW
        ========================================= */
        .vmt-action {
          display: flex;
          align-items: stretch;
          gap: 8px;
          margin-top: 10px;
        }

        .vmt-msg {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 11px;
          border-radius: 9px;
          background: var(--vmt-soft);
          color: var(--vmt-muted);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.4;
          min-height: 40px;
          min-width: 0;
        }

        .vmt-msg-icon {
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

        .vmt-msg-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }

        .vmt-msg-meta {
          color: var(--vmt-muted);
          font-size: 10px;
          opacity: 0.85;
        }

        .vmt-msg-success {
          background: #ecfdf5;
          color: #166534;
        }

        .vmt-msg-success .vmt-msg-icon {
          background: #dcfce7;
          color: #15803d;
        }

        .vmt-msg-mistake,
        .vmt-msg-finished {
          background: #fef2f2;
          color: #b91c1c;
        }

        .vmt-msg-mistake .vmt-msg-icon,
        .vmt-msg-finished .vmt-msg-icon {
          background: #fee2e2;
          color: #dc2626;
        }

        .vmt-action-btns {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }

        .vmt-btn {
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

        .vmt-btn:focus-visible {
          outline: 3px solid var(--vmt-primary-hover);
          outline-offset: 3px;
        }

        .vmt-btn-pri {
          border: 1px solid #e74e1b;
          background: linear-gradient(135deg, #ff682f, #e94b18);
          color: #fff;
          box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
        }

        .vmt-btn-pri:hover {
          background: linear-gradient(135deg, #f45a25, #d94112);
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(255, 90, 31, 0.28);
        }

        .vmt-btn-sec {
          border: 1px solid var(--vmt-border);
          background: #fff;
          color: #4e5261;
        }

        .vmt-btn-sec:hover {
          border-color: var(--vmt-primary-hover);
          color: var(--vmt-primary);
          background: var(--vmt-primary-surface);
        }

        /* =========================================
           DIFFICULTY STRIP
        ========================================= */
        .vmt-diff-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          margin-top: 12px;
        }

        .vmt-diff-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 9px 8px;
          border: 1px solid var(--vmt-border);
          border-radius: 10px;
          background: var(--vmt-surface);
          color: var(--vmt-text);
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .vmt-diff-btn:hover:not(:disabled) {
          border-color: var(--vmt-primary-hover);
          background: var(--vmt-primary-surface);
        }

        .vmt-diff-btn:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .vmt-diff-btn.is-active {
          border-color: var(--vmt-primary);
          background: var(--vmt-primary-soft);
          box-shadow: inset 0 0 0 1px var(--vmt-primary);
        }

        .vmt-diff-name {
          font-size: 12px;
          font-weight: 800;
        }

        .vmt-diff-btn.is-active .vmt-diff-name {
          color: var(--vmt-primary);
        }

        .vmt-diff-meta {
          font-size: 9px;
          color: var(--vmt-muted);
          font-weight: 600;
        }

        .vmt-diff-btn.is-active .vmt-diff-meta {
          color: var(--vmt-primary);
          opacity: 0.8;
        }

        /* =========================================
           EXPANDABLE
        ========================================= */
        .vmt-expand {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          padding: 9px 12px;
          border: 1px solid var(--vmt-border);
          border-radius: 9px;
          background: transparent;
          color: var(--vmt-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .vmt-expand:hover {
          color: var(--vmt-primary);
          border-color: var(--vmt-primary-hover);
        }

        .vmt-expand-chev {
          font-size: 14px;
          font-weight: 500;
          color: var(--vmt-primary);
          flex-shrink: 0;
        }

        .vmt-panel {
          margin-top: 8px;
          padding: 12px 14px;
          border: 1px solid var(--vmt-border);
          border-radius: 11px;
          background: var(--vmt-soft);
        }

        .vmt-step {
          display: flex;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px solid var(--vmt-border);
        }

        .vmt-step:first-child {
          padding-top: 0;
        }

        .vmt-step:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .vmt-step > span {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 26px;
          border-radius: 7px;
          background: var(--vmt-primary-soft);
          color: var(--vmt-primary);
          font-size: 9px;
          font-weight: 900;
        }

        .vmt-step strong {
          display: block;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 2px;
        }

        .vmt-step p {
          color: var(--vmt-muted);
          font-size: 10px;
          line-height: 1.5;
          margin: 0;
        }

        .vmt-panel-history {
          display: grid;
          gap: 5px;
          max-height: 180px;
          overflow-y: auto;
        }

        .vmt-history-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 10px;
          border-radius: 8px;
          background: var(--vmt-surface);
        }

        .vmt-history-level {
          display: flex;
          flex-direction: column;
          gap: 1px;
          font-size: 11px;
          font-weight: 700;
        }

        .vmt-history-level small {
          color: var(--vmt-muted);
          font-size: 9px;
          font-weight: 500;
        }

        .vmt-history-status {
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .vmt-history-status.is-correct {
          background: #eaf8f0;
          color: #18794a;
        }

        .vmt-history-status.is-wrong {
          background: #fff0f1;
          color: #bd3e52;
        }

        /* =========================================
           TIPS + FAQ
        ========================================= */
        .vmt-tips,
        .vmt-faq {
          margin-top: 18px;
          padding: 16px;
          border: 1px solid var(--vmt-border);
          border-radius: 14px;
          background: var(--vmt-surface);
        }

        .vmt-tips h3,
        .vmt-faq h3 {
          margin: 0 0 10px;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -0.2px;
        }

        .vmt-tips ul {
          display: grid;
          gap: 10px;
          margin: 0;
          padding-left: 18px;
          color: var(--vmt-muted);
          font-size: 12px;
          line-height: 1.7;
        }

        .vmt-tips li::marker {
          color: var(--vmt-primary);
        }

        .vmt-tips strong {
          color: var(--vmt-text);
        }

        .vmt-faq details {
          padding: 11px 0;
          border-bottom: 1px solid var(--vmt-border);
        }

        .vmt-faq details:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .vmt-faq summary {
          position: relative;
          padding-right: 25px;
          color: var(--vmt-text);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.5;
          cursor: pointer;
          list-style: none;
        }

        .vmt-faq summary::-webkit-details-marker {
          display: none;
        }

        .vmt-faq summary::after {
          position: absolute;
          right: 0;
          content: "+";
          color: var(--vmt-primary);
          font-size: 17px;
          font-weight: 500;
        }

        .vmt-faq details[open] summary::after {
          content: "−";
        }

        .vmt-faq details p {
          margin: 8px 0 0;
          color: var(--vmt-muted);
          font-size: 11px;
          line-height: 1.7;
        }

        /* =========================================
           RESPONSIVE
        ========================================= */
        @media (max-height: 720px) {
          .vmt-board {
            max-width: min(340px, 36vh);
          }
        }

        @media (max-height: 620px) {
          .vmt-board {
            max-width: min(340px, 32vh);
          }

          .vmt-head h2 {
            font-size: 17px;
          }
        }

        @media (max-width: 480px) {
          .vmt-head {
            flex-wrap: wrap;
          }

          .vmt-best-value {
            font-size: 15px;
          }

          .vmt-bar-cell {
            padding: 8px 8px;
          }

          .vmt-bar-cell strong {
            font-size: 13px;
          }

          .vmt-stage {
            padding: 11px;
          }

          .vmt-board {
            gap: 6px;
          }

          .vmt-tile {
            border-radius: 8px;
          }

          .vmt-diff-strip {
            gap: 4px;
          }

          .vmt-diff-btn {
            padding: 7px 6px;
          }

          .vmt-diff-name {
            font-size: 11px;
          }

          .vmt-diff-meta {
            font-size: 8px;
          }

          .vmt-action {
            flex-direction: column;
          }

          .vmt-action-btns {
            justify-content: flex-end;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .vmt-tile,
          .vmt-btn,
          .vmt-progress-fill,
          .vmt-countdown-fill {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </ToolShell>
  );
}