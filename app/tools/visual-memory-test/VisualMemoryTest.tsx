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

  const config = DIFFICULTIES[difficulty];
  const totalCells = config.rows * config.columns;
  const tileCount = Math.min(
    config.startingTiles + Math.floor((level - 1) / 2),
    totalCells - 1
  );

  const isPlaying = phase !== "ready" && phase !== "finished";

  const progressText = useMemo(() => {
    if (phase === "showing") return "Memorize the highlighted tiles";
    if (phase === "answer") return "Select the tiles you remember";
    if (phase === "success") return "Pattern remembered correctly!";
    if (phase === "mistake") return "That pattern was not quite right";
    if (phase === "finished") return "Game completed";
    return "Ready to test your visual memory?";
  }, [phase]);

  // Load the saved best score.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BEST_SCORE_KEY);
      const parsed = stored ? Number(stored) : 0;
      if (Number.isFinite(parsed) && parsed >= 0) {
        setBestScore(parsed);
      }
    } catch {
      // The game remains playable when browser storage is unavailable.
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

  const accuracy =
    history.length > 0
      ? Math.round(
          (history.filter((entry) => entry.correct).length / history.length) * 100
        )
      : 0;

  return (
    <ToolShell title="Visual Memory Test" onReset={resetGame} wide>
      <div className="vmt">
        {/* HEADER */}
        <div className="vmt-header">
          <div className="vmt-header-text">
            <div className="vmt-eyebrow">BRAIN TRAINING · PRO</div>
            <h1>Visual Memory Test</h1>
            <p className="vmt-intro">
              Memorize the highlighted tiles, then recreate the pattern from
              memory. How far can you go?
            </p>
          </div>

          <div className="vmt-header-mark" aria-hidden="true">
            <span>▦</span>
          </div>
        </div>

        {/* STATS */}
        <div className="vmt-stats">
          <div className="vmt-stat">
            <span className="vmt-stat-label">SCORE</span>
            <strong>{score}</strong>
          </div>
          <div className="vmt-stat">
            <span className="vmt-stat-label">BEST SCORE</span>
            <strong>{bestScore}</strong>
          </div>
          <div className="vmt-stat">
            <span className="vmt-stat-label">LEVEL</span>
            <strong>{level}</strong>
          </div>
          <div className="vmt-stat">
            <span className="vmt-stat-label">LIVES</span>
            <strong
              className="vmt-lives"
              aria-label={`${lives} lives remaining`}
            >
              {"♥".repeat(lives)}
              <span>{"♡".repeat(3 - lives)}</span>
            </strong>
          </div>
        </div>

        {/* GAME CARD */}
        <div className="vmt-game-card">
          <div className="vmt-game-top">
            <div>
              <span className="vmt-level-label">LEVEL {level}</span>
              <h2>{progressText}</h2>
            </div>

            <div className="vmt-game-badges">
              {streak > 0 && (
                <span className="vmt-streak-badge">🔥 {streak} streak</span>
              )}
              <span
                className={`vmt-phase-badge vmt-phase-${phase}`}
                aria-live="polite"
              >
                {phase === "showing"
                  ? "MEMORIZE"
                  : phase === "answer"
                    ? "YOUR TURN"
                    : phase === "success"
                      ? "CORRECT"
                      : phase === "mistake"
                        ? "TRY AGAIN"
                        : phase === "finished"
                          ? "FINISHED"
                          : "READY"}
              </span>
            </div>
          </div>

          {/* COUNTDOWN BAR DURING SHOWING */}
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

          {/* BOARD */}
          <div className="vmt-board-wrap">
            <div
              className={`vmt-board vmt-board-${difficulty}`}
              style={
                { "--vmt-columns": config.columns } as React.CSSProperties
              }
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
                      revealAnswer &&
                      !isPatternTile &&
                      selected.includes(index)
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
          </div>

          {/* PROGRESS */}
          <div className="vmt-progress-row">
            <span>
              {phase === "showing"
                ? "Look carefully..."
                : phase === "answer"
                  ? `${selected.length} of ${pattern.length} tiles selected`
                  : phase === "success"
                    ? "Level completed"
                    : phase === "mistake"
                      ? "One life used"
                      : phase === "finished"
                        ? "Your final result"
                        : `${tileCount} tiles to memorize`}
            </span>

            {phase === "answer" && (
              <span className="vmt-progress-count">
                {selected.length}/{pattern.length}
              </span>
            )}
          </div>

          {phase === "answer" && (
            <div
              className="vmt-progress-track"
              role="progressbar"
              aria-label="Pattern selection progress"
              aria-valuemin={0}
              aria-valuemax={pattern.length}
              aria-valuenow={selected.length}
            >
              <div
                className="vmt-progress-fill"
                style={{
                  width: `${(selected.length / pattern.length) * 100}%`,
                }}
              />
            </div>
          )}

          {/* FEEDBACK */}
          {(phase === "success" ||
            phase === "mistake" ||
            phase === "finished") && (
            <div
              className={`vmt-feedback ${
                phase === "success" ? "is-success" : "is-error"
              }`}
              role="status"
            >
              <strong>
                {phase === "success"
                  ? "Excellent!"
                  : phase === "finished"
                    ? "Game over"
                    : "Not quite!"}
              </strong>
              <span>{roundMessage}</span>
              {phase === "finished" && history.length > 0 && (
                <span className="vmt-feedback-meta">
                  Accuracy: {accuracy}% · {history.length}{" "}
                  {history.length === 1 ? "round" : "rounds"} played
                </span>
              )}
            </div>
          )}

          {/* ACTIONS */}
          <div className="vmt-actions">
            {phase === "ready" && (
              <button
                type="button"
                className="vmt-primary-btn"
                onClick={startGame}
              >
                Start game <span aria-hidden="true">→</span>
              </button>
            )}

            {phase === "success" && (
              <button
                type="button"
                className="vmt-primary-btn"
                onClick={nextLevel}
              >
                Continue to level {level + 1}{" "}
                <span aria-hidden="true">→</span>
              </button>
            )}

            {phase === "mistake" && (
              <button
                type="button"
                className="vmt-primary-btn"
                onClick={retryLevel}
              >
                Retry this level <span aria-hidden="true">↻</span>
              </button>
            )}

            {phase === "finished" && (
              <button
                type="button"
                className="vmt-primary-btn"
                onClick={startGame}
              >
                Play again <span aria-hidden="true">↻</span>
              </button>
            )}

            {phase !== "ready" && (
              <button
                type="button"
                className="vmt-secondary-btn"
                onClick={resetGame}
              >
                Reset game
              </button>
            )}
          </div>

          <p className="vmt-game-note">
            {phase === "showing"
              ? "The highlighted tiles will disappear shortly."
              : phase === "answer"
                ? "Select every highlighted tile. Avoid selecting any extra tile."
                : phase === "ready"
                  ? "Choose a difficulty below and start when you are ready."
                  : "Your best score is saved in this browser."}
          </p>
        </div>

        {/* DIFFICULTY */}
        <section className="vmt-settings">
          <div>
            <h2>Choose your difficulty</h2>
            <p>
              Higher difficulty means a larger grid and more tiles to remember.
            </p>
          </div>

          <div className="vmt-difficulty-options">
            {(["easy", "medium", "hard"] as Difficulty[]).map((option) => (
              <button
                key={option}
                type="button"
                className={`vmt-difficulty-btn ${
                  difficulty === option ? "is-active" : ""
                }`}
                onClick={() => changeDifficulty(option)}
                disabled={isPlaying}
                aria-pressed={difficulty === option}
              >
                <strong>{DIFFICULTIES[option].label}</strong>
                <span>
                  {DIFFICULTIES[option].rows} × {DIFFICULTIES[option].columns}{" "}
                  grid
                </span>
              </button>
            ))}
          </div>

          {isPlaying && (
            <p className="vmt-settings-note">
              Finish or reset your current game to change difficulty.
            </p>
          )}
        </section>

        {/* HISTORY */}
        {history.length > 0 && (
          <section className="vmt-history">
            <div className="vmt-history-heading">
              <h2>Round history</h2>
              <span className="vmt-history-summary">
                {accuracy}% accuracy · {history.length}{" "}
                {history.length === 1 ? "round" : "rounds"}
              </span>
            </div>
            <div className="vmt-history-list">
              {history.map((entry, index) => (
                <div className="vmt-history-item" key={index}>
                  <span>Level {entry.level}</span>
                  <div className="vmt-history-meta">
                    <span className="vmt-history-tiles">
                      {entry.tiles} tiles
                    </span>
                    <span
                      className={`vmt-history-status ${
                        entry.correct ? "is-correct" : "is-wrong"
                      }`}
                    >
                      {entry.correct ? "Correct" : "Wrong"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* HOW TO PLAY */}
        <section className="vmt-how">
          <h2>How to play the Visual Memory Test</h2>

          <div className="vmt-how-grid">
            <article>
              <span className="vmt-step-number">01</span>
              <h3>Study the pattern</h3>
              <p>
                A group of squares lights up briefly. Pay attention to their
                positions on the grid.
              </p>
            </article>

            <article>
              <span className="vmt-step-number">02</span>
              <h3>Remember the positions</h3>
              <p>
                The highlighted squares disappear. Try to remember exactly
                where each one appeared.
              </p>
            </article>

            <article>
              <span className="vmt-step-number">03</span>
              <h3>Recreate the pattern</h3>
              <p>
                Select all the correct squares. Complete levels to increase
                your score and challenge your memory.
              </p>
            </article>
          </div>
        </section>

        {/* TIPS */}
        <section className="vmt-tips">
          <h2>Tips to improve your visual memory</h2>
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

        {/* FAQ */}
        <section className="vmt-faq">
          <h2>Frequently asked questions</h2>

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
          width: 100%;
          max-width: 100%;
          color: var(--vmt-text);
        }

        /* =========================================
           HEADER
        ========================================= */
        .vmt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 26px;
        }

        .vmt-header-text {
          min-width: 0;
        }

        .vmt-eyebrow {
          margin-bottom: 9px;
          color: var(--vmt-primary);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.13em;
        }

        .vmt-header h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 39px);
          line-height: 1.15;
          letter-spacing: -0.055em;
          font-weight: 800;
          color: var(--vmt-text);
        }

        .vmt-intro {
          max-width: 610px;
          margin: 11px 0 0;
          color: var(--vmt-muted);
          font-size: 14px;
          line-height: 1.7;
        }

        .vmt-header-mark {
          display: grid;
          place-items: center;
          width: 68px;
          height: 68px;
          flex-shrink: 0;
          border-radius: 20px;
          background: linear-gradient(145deg, #fff3ed, #fffaf7);
          color: var(--vmt-primary);
          font-size: 36px;
        }

        /* =========================================
           STATS
        ========================================= */
        .vmt-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .vmt-stat {
          min-width: 0;
          padding: 15px 17px;
          border: 1px solid var(--vmt-border);
          border-radius: 14px;
          background: var(--vmt-surface);
        }

        .vmt-stat-label {
          display: block;
          margin-bottom: 7px;
          color: var(--vmt-muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.09em;
        }

        .vmt-stat strong {
          display: block;
          font-size: 23px;
          font-weight: 800;
          letter-spacing: -0.04em;
          font-variant-numeric: tabular-nums;
          color: var(--vmt-text);
        }

        .vmt-stat .vmt-lives {
          color: #e34d70;
          font-size: 18px;
          letter-spacing: 2px;
          white-space: nowrap;
        }

        .vmt-lives span {
          color: #d9dbe4;
        }

        /* =========================================
           GAME CARD
        ========================================= */
        .vmt-game-card {
          padding: 24px;
          border: 1px solid var(--vmt-border);
          border-radius: 20px;
          background: var(--vmt-surface);
          box-shadow: 0 12px 40px rgba(23, 32, 51, 0.06);
        }

        .vmt-game-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }

        .vmt-level-label {
          color: var(--vmt-primary);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .vmt-game-top h2 {
          margin: 7px 0 0;
          font-size: 19px;
          line-height: 1.35;
          font-weight: 750;
          letter-spacing: -0.035em;
          color: var(--vmt-text);
        }

        .vmt-game-badges {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .vmt-phase-badge {
          padding: 7px 10px;
          border-radius: 999px;
          background: var(--vmt-primary-soft);
          color: var(--vmt-primary);
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.07em;
          white-space: nowrap;
        }

        .vmt-phase-success {
          background: #ecfdf5;
          color: #15803d;
        }

        .vmt-phase-mistake,
        .vmt-phase-finished {
          background: #fef2f2;
          color: #b42318;
        }

        .vmt-streak-badge {
          padding: 7px 10px;
          border-radius: 999px;
          background: #fef3c7;
          color: #b45309;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        /* Countdown bar */
        .vmt-countdown-track {
          height: 5px;
          margin-top: 14px;
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

        /* =========================================
           BOARD
        ========================================= */
        .vmt-board-wrap {
          display: grid;
          place-items: center;
          margin: 24px 0 18px;
          padding: 22px 12px;
          border: 1px solid #f1f2f6;
          border-radius: 17px;
          background: radial-gradient(circle at 50% 45%, #ffffff 0%, #fafbfc 75%);
        }

        .vmt-board {
          display: grid;
          grid-template-columns: repeat(var(--vmt-columns), minmax(0, 1fr));
          gap: 9px;
          width: min(100%, 350px);
          aspect-ratio: 1;
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
          font-size: clamp(16px, 3vw, 24px);
          cursor: default;
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            transform 0.15s ease,
            box-shadow 0.15s ease;
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

        /* =========================================
           PROGRESS
        ========================================= */
        .vmt-progress-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: var(--vmt-muted);
          font-size: 12px;
        }

        .vmt-progress-count {
          color: var(--vmt-primary);
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }

        .vmt-progress-track {
          height: 7px;
          margin-top: 10px;
          overflow: hidden;
          border-radius: 99px;
          background: #eeeff5;
        }

        .vmt-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff7a47, #ff5a1f);
          transition: width 0.2s ease;
        }

        /* =========================================
           FEEDBACK
        ========================================= */
        .vmt-feedback {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 17px;
          padding: 13px 15px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.5;
        }

        .vmt-feedback.is-success {
          background: #eaf8f0;
          color: #18794a;
        }

        .vmt-feedback.is-error {
          background: #fff0f1;
          color: #bd3e52;
        }

        .vmt-feedback strong {
          font-size: 14px;
        }

        .vmt-feedback-meta {
          margin-top: 4px;
          font-size: 12px;
          opacity: 0.85;
        }

        /* =========================================
           ACTIONS
        ========================================= */
        .vmt-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }

        .vmt-primary-btn,
        .vmt-secondary-btn {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 9px;
          min-height: 45px;
          padding: 0 19px;
          border-radius: 11px;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            background 0.18s ease,
            box-shadow 0.18s ease;
        }

        .vmt-primary-btn {
          border: 1px solid #e74e1b;
          background: linear-gradient(135deg, #ff682f, #e94b18);
          color: white;
          box-shadow: 0 4px 12px rgba(255, 90, 31, 0.2);
        }

        .vmt-primary-btn:hover {
          transform: translateY(-2px);
          background: linear-gradient(135deg, #f45a25, #d94112);
          box-shadow: 0 7px 17px rgba(255, 90, 31, 0.27);
        }

        .vmt-secondary-btn {
          border: 1px solid var(--vmt-border);
          background: white;
          color: #4e5261;
        }

        .vmt-secondary-btn:hover {
          background: #f7f7fb;
        }

        .vmt-game-note {
          margin: 15px 0 0;
          color: var(--vmt-muted);
          font-size: 11px;
          line-height: 1.6;
        }

        /* =========================================
           SHARED SECTION CARD
        ========================================= */
        .vmt-settings,
        .vmt-how,
        .vmt-tips,
        .vmt-faq,
        .vmt-history {
          margin-top: 25px;
          padding: 23px;
          border: 1px solid var(--vmt-border);
          border-radius: 18px;
          background: var(--vmt-surface);
        }

        .vmt-settings h2,
        .vmt-how h2,
        .vmt-tips h2,
        .vmt-faq h2,
        .vmt-history h2 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.035em;
          color: var(--vmt-text);
        }

        /* Difficulty */
        .vmt-settings > div:first-child p {
          margin: 7px 0 0;
          color: var(--vmt-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .vmt-difficulty-options {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 17px;
        }

        .vmt-difficulty-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 5px;
          min-width: 0;
          padding: 13px;
          border: 1px solid var(--vmt-border);
          border-radius: 12px;
          background: white;
          text-align: left;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .vmt-difficulty-btn strong {
          font-size: 13px;
          color: var(--vmt-text);
        }

        .vmt-difficulty-btn span {
          color: var(--vmt-muted);
          font-size: 11px;
        }

        .vmt-difficulty-btn.is-active {
          border-color: var(--vmt-primary);
          background: var(--vmt-primary-soft);
          color: var(--vmt-primary);
          box-shadow: inset 0 0 0 1px var(--vmt-primary);
        }

        .vmt-difficulty-btn.is-active strong {
          color: var(--vmt-primary);
        }

        .vmt-difficulty-btn:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .vmt-settings-note {
          margin: 12px 0 0;
          color: var(--vmt-muted);
          font-size: 11px;
        }

        /* History */
        .vmt-history-heading {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 14px;
        }

        .vmt-history-summary {
          color: var(--vmt-muted);
          font-size: 11px;
          font-weight: 700;
        }

        .vmt-history-list {
          display: grid;
          gap: 6px;
          max-height: 240px;
          overflow-y: auto;
        }

        .vmt-history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-radius: 9px;
          background: var(--vmt-soft);
          font-size: 13px;
        }

        .vmt-history-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .vmt-history-tiles {
          color: var(--vmt-muted);
          font-size: 11px;
        }

        .vmt-history-status {
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .vmt-history-status.is-correct {
          background: #eaf8f0;
          color: #18794a;
        }

        .vmt-history-status.is-wrong {
          background: #fff0f1;
          color: #bd3e52;
        }

        /* How to play */
        .vmt-how-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 15px;
          margin-top: 18px;
        }

        .vmt-how-grid article {
          padding: 16px;
          border: 1px solid var(--vmt-border);
          border-radius: 13px;
          background: #fcfcff;
        }

        .vmt-step-number {
          display: inline-flex;
          margin-bottom: 13px;
          color: var(--vmt-primary);
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.1em;
        }

        .vmt-how-grid h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 750;
          color: var(--vmt-text);
        }

        .vmt-how-grid p {
          margin: 7px 0 0;
          color: var(--vmt-muted);
          font-size: 12px;
          line-height: 1.65;
        }

        /* Tips */
        .vmt-tips ul {
          display: grid;
          gap: 12px;
          margin: 17px 0 0;
          padding-left: 19px;
          color: var(--vmt-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .vmt-tips li::marker {
          color: var(--vmt-primary);
        }

        .vmt-tips strong {
          color: var(--vmt-text);
        }

        /* FAQ */
        .vmt-faq details {
          padding: 15px 0;
          border-bottom: 1px solid var(--vmt-border);
        }

        .vmt-faq details:first-of-type {
          margin-top: 8px;
        }

        .vmt-faq details:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .vmt-faq summary {
          position: relative;
          padding-right: 25px;
          color: var(--vmt-text);
          font-size: 13px;
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
          font-size: 19px;
          font-weight: 500;
        }

        .vmt-faq details[open] summary::after {
          content: "−";
        }

        .vmt-faq details p {
          margin: 10px 0 0;
          color: var(--vmt-muted);
          font-size: 12px;
          line-height: 1.75;
        }

        /* =========================================
           RESPONSIVE
        ========================================= */
        @media (max-width: 650px) {
          .vmt-header-mark {
            width: 52px;
            height: 52px;
            border-radius: 15px;
            font-size: 27px;
          }

          .vmt-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
          }

          .vmt-stat {
            padding: 12px;
          }

          .vmt-stat strong {
            font-size: 20px;
          }

          .vmt-game-card,
          .vmt-settings,
          .vmt-how,
          .vmt-tips,
          .vmt-faq,
          .vmt-history {
            padding: 17px;
            border-radius: 15px;
          }

          .vmt-game-top {
            flex-direction: column;
          }

          .vmt-game-badges {
            align-self: flex-start;
          }

          .vmt-board {
            width: min(100%, 310px);
            gap: 7px;
          }

          .vmt-tile {
            border-radius: 8px;
          }

          .vmt-how-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 390px) {
          .vmt-header-mark {
            width: 44px;
            height: 44px;
            font-size: 23px;
          }

          .vmt-difficulty-options {
            gap: 6px;
          }

          .vmt-difficulty-btn {
            padding: 10px 8px;
          }

          .vmt-difficulty-btn strong {
            font-size: 12px;
          }

          .vmt-difficulty-btn span {
            font-size: 10px;
          }

          .vmt-actions > button {
            flex: 1 1 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .vmt *,
          .vmt *::before,
          .vmt *::after {
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
    </ToolShell>
  );
}