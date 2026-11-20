"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ToolShell from "../ToolShell";

type Difficulty = "easy" | "medium" | "hard";
type Phase = "ready" | "showing" | "input" | "success" | "mistake" | "finished";

type DifficultyConfig = {
  label: string;
  gridSize: number;
  displaySpeed: number;
};

type HistoryEntry = {
  level: number;
  sequenceLength: number;
  correct: boolean;
};

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { label: "Easy", gridSize: 3, displaySpeed: 850 },
  medium: { label: "Medium", gridSize: 4, displaySpeed: 700 },
  hard: { label: "Hard", gridSize: 5, displaySpeed: 550 },
};

const STARTING_LIVES = 3;
const STORAGE_KEY = "toolsab-sequence-memory-best-v1";

export default function SequenceMemoryTest() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<Phase>("ready");

  const [sequence, setSequence] = useState<number[]>([]);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [activeTile, setActiveTile] = useState<number | null>(null);
  const [userProgress, setUserProgress] = useState(0);

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [bestScore, setBestScore] = useState(0);
  const [bestLevel, setBestLevel] = useState(0);
  const [hasLoadedBest, setHasLoadedBest] = useState(false);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [showHelp, setShowHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [message, setMessage] = useState(
    "Watch the sequence carefully, then repeat it."
  );

  const config = DIFFICULTIES[difficulty];
  const tileCount = config.gridSize * config.gridSize;
  const isGameActive = phase === "showing" || phase === "input";

  const tiles = useMemo(
    () => Array.from({ length: tileCount }, (_, i) => i),
    [tileCount]
  );

  const accuracy =
    history.length > 0
      ? Math.round(
          (history.filter((entry) => entry.correct).length / history.length) * 100
        )
      : 0;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? Number(saved) : 0;
      if (Number.isFinite(parsed) && parsed > 0) setBestScore(parsed);
    } catch {
      // ignore
    } finally {
      setHasLoadedBest(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedBest) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(bestScore));
    } catch {
      // ignore
    }
  }, [bestScore, hasLoadedBest]);

  const randomTile = useCallback(
    () => Math.floor(Math.random() * tileCount),
    [tileCount]
  );

  const startGame = useCallback(() => {
    setLevel(1);
    setScore(0);
    setLives(STARTING_LIVES);
    setUserProgress(0);
    setPlaybackIndex(0);
    setActiveTile(null);
    setStreak(0);
    setHistory([]);
    setSequence([randomTile()]);
    setMessage("Memorize the highlighted tile.");
    setPhase("showing");
    setShowHistory(false);
  }, [randomTile]);

  const resetGame = useCallback(() => {
    setPhase("ready");
    setSequence([]);
    setPlaybackIndex(0);
    setActiveTile(null);
    setUserProgress(0);
    setLevel(1);
    setScore(0);
    setLives(STARTING_LIVES);
    setStreak(0);
    setHistory([]);
    setMessage("Watch the sequence carefully, then repeat it.");
  }, []);

  const changeDifficulty = (next: Difficulty) => {
    if (isGameActive || phase === "success" || phase === "mistake") return;
    setDifficulty(next);
    setPhase("ready");
    setSequence([]);
    setPlaybackIndex(0);
    setActiveTile(null);
    setUserProgress(0);
    setLevel(1);
    setScore(0);
    setLives(STARTING_LIVES);
    setStreak(0);
    setHistory([]);
    setMessage("Watch the sequence carefully, then repeat it.");
  };

  useEffect(() => {
    if (phase !== "showing") return;
    if (playbackIndex >= sequence.length) {
      const timer = window.setTimeout(() => {
        setActiveTile(null);
        setUserProgress(0);
        setMessage("Your turn! Repeat the sequence in the same order.");
        setPhase("input");
      }, 550);
      return () => window.clearTimeout(timer);
    }
    const tile = sequence[playbackIndex];
    setActiveTile(tile);
    const timer = window.setTimeout(() => {
      setActiveTile(null);
      setPlaybackIndex((current) => current + 1);
    }, config.displaySpeed);
    return () => window.clearTimeout(timer);
  }, [phase, playbackIndex, sequence, config.displaySpeed]);

  useEffect(() => {
    if (phase !== "success") return;
    const timer = window.setTimeout(() => {
      const nextSequence = [...sequence, randomTile()];
      setLevel((current) => current + 1);
      setSequence(nextSequence);
      setPlaybackIndex(0);
      setUserProgress(0);
      setActiveTile(null);
      setMessage("New round! Watch the longer sequence.");
      setPhase("showing");
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [phase, sequence, randomTile]);

  useEffect(() => {
    if (phase !== "mistake") return;
    const timer = window.setTimeout(() => {
      setPlaybackIndex(0);
      setUserProgress(0);
      setActiveTile(null);
      setMessage("Watch again. You can do this!");
      setPhase("showing");
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const handleTileClick = (tile: number) => {
    if (phase !== "input") return;
    const expectedTile = sequence[userProgress];

    if (tile !== expectedTile) {
      const remainingLives = lives - 1;
      setLives(remainingLives);
      setActiveTile(tile);
      setStreak(0);
      setHistory((prev) => [
        ...prev,
        { level, sequenceLength: sequence.length, correct: false },
      ]);
      if (remainingLives <= 0) {
        setMessage("Game over! You have used all your lives.");
        setPhase("finished");
        setShowHistory(true);
      } else {
        setMessage("Not quite! The sequence will play again.");
        setPhase("mistake");
      }
      return;
    }

    const nextProgress = userProgress + 1;
    setUserProgress(nextProgress);

    if (nextProgress === sequence.length) {
      const roundPoints = 10 + level * 2;
      const nextScore = score + roundPoints;
      setScore(nextScore);
      setBestScore((current) => Math.max(current, nextScore));
      setBestLevel((current) => Math.max(current, level));
      setStreak((prev) => prev + 1);
      setHistory((prev) => [
        ...prev,
        { level, sequenceLength: sequence.length, correct: true },
      ]);
      setActiveTile(tile);
      setMessage(`Correct! +${roundPoints} points.`);
      setPhase("success");
    } else {
      setActiveTile(tile);
      window.setTimeout(() => {
        setActiveTile((current) => (current === tile ? null : current));
      }, 180);
    }
  };

  const statusText = {
    ready: "READY",
    showing: "WATCH",
    input: "YOUR TURN",
    success: "CORRECT",
    mistake: "TRY AGAIN",
    finished: "GAME OVER",
  }[phase];

  return (
    <ToolShell title="Sequence Memory Test" onReset={resetGame} wide>
      <div className="sm">
        {/* HEADER */}
        <header className="sm-head">
          <div className="sm-head-text">
            <span className="sm-eyebrow">BRAIN TRAINING · PRO</span>
            <h2>Sequence Memory Test</h2>
          </div>
          <div className="sm-best">
            <span className="sm-best-label">BEST</span>
            <strong className="sm-best-value">{bestScore.toLocaleString()}</strong>
            {bestLevel > 0 && (
              <span className="sm-best-sub">Level {bestLevel}</span>
            )}
          </div>
        </header>

        {/* STAT BAR — one continuous strip */}
        <div className="sm-bar">
          <div className="sm-bar-cell">
            <span>LEVEL</span>
            <strong>{level}</strong>
          </div>
          <div className="sm-bar-sep" />
          <div className="sm-bar-cell">
            <span>SCORE</span>
            <strong>{score.toLocaleString()}</strong>
          </div>
          <div className="sm-bar-sep" />
          <div className="sm-bar-cell">
            <span>SEQUENCE</span>
            <strong>{sequence.length || 0}</strong>
          </div>
          <div className="sm-bar-sep" />
          <div className="sm-bar-cell">
            <span>LIVES</span>
            <strong className="sm-hearts">
              {Array.from({ length: STARTING_LIVES }, (_, i) => (
                <span
                  key={i}
                  className={i < lives ? "sm-heart on" : "sm-heart"}
                  aria-hidden="true"
                >
                  ♥
                </span>
              ))}
            </strong>
          </div>
        </div>

        {/* STAGE — board area with floating pills */}
        <div className="sm-stage">
          <div className="sm-stage-top">
            <span className={`sm-pill sm-pill-${phase}`}>
              <span className="sm-pill-dot" />
              {statusText}
            </span>
            {streak > 0 && (
              <span className="sm-pill sm-pill-streak">🔥 {streak}</span>
            )}
          </div>

          <div
            className="sm-board"
            style={{
              gridTemplateColumns: `repeat(${config.gridSize}, minmax(0, 1fr))`,
            }}
            aria-label={`${config.gridSize} by ${config.gridSize} memory game board`}
          >
            {tiles.map((tile) => {
              const isActive = activeTile === tile;
              return (
                <button
                  key={tile}
                  type="button"
                  className={`sm-tile ${isActive ? "is-active" : ""}`}
                  onClick={() => handleTileClick(tile)}
                  disabled={phase !== "input"}
                  aria-label={`Tile ${tile + 1}`}
                  aria-pressed={isActive}
                >
                  <span>{tile + 1}</span>
                </button>
              );
            })}
          </div>

          {isGameActive && (
            <div className="sm-progress">
              <div className="sm-progress-label">
                <span>
                  {phase === "showing" ? "Playback" : "Your progress"}
                </span>
                <strong>
                  {phase === "showing"
                    ? `${Math.min(playbackIndex + 1, sequence.length)}/${sequence.length}`
                    : `${userProgress}/${sequence.length}`}
                </strong>
              </div>
              <div className="sm-progress-track">
                <div
                  className="sm-progress-fill"
                  style={{
                    width: `${
                      phase === "showing"
                        ? (playbackIndex / Math.max(sequence.length, 1)) * 100
                        : (userProgress / Math.max(sequence.length, 1)) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ACTION ROW — message + CTA inline */}
        <div className="sm-action">
          <div className={`sm-msg sm-msg-${phase}`} role="status" aria-live="polite">
            <span className="sm-msg-icon">
              {phase === "success"
                ? "✓"
                : phase === "mistake" || phase === "finished"
                  ? "!"
                  : phase === "showing"
                    ? "◉"
                    : phase === "input"
                      ? "↗"
                      : "◆"}
            </span>
            <span>{message}</span>
          </div>

          {phase === "ready" && (
            <button className="sm-cta" onClick={startGame}>
              Start <span aria-hidden="true">→</span>
            </button>
          )}
          {phase === "finished" && (
            <button className="sm-cta" onClick={startGame}>
              Play again <span aria-hidden="true">↻</span>
            </button>
          )}
        </div>

        {/* DIFFICULTY STRIP — 3 buttons below board */}
        <div className="sm-diff-strip" role="group" aria-label="Difficulty">
          {(Object.keys(DIFFICULTIES) as Difficulty[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`sm-diff-btn ${difficulty === item ? "is-active" : ""}`}
              onClick={() => changeDifficulty(item)}
              disabled={
                isGameActive || phase === "success" || phase === "mistake"
              }
              aria-pressed={difficulty === item}
            >
              <span className="sm-diff-name">{DIFFICULTIES[item].label}</span>
              <span className="sm-diff-meta">
                {DIFFICULTIES[item].gridSize}×{DIFFICULTIES[item].gridSize} ·{" "}
                {DIFFICULTIES[item].displaySpeed}ms
              </span>
            </button>
          ))}
        </div>

        {/* EXPANDABLE: HOW TO PLAY */}
        <button
          type="button"
          className="sm-expand"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
        >
          <span>How to play</span>
          <span className="sm-expand-chev">{showHelp ? "−" : "+"}</span>
        </button>

        {showHelp && (
          <div className="sm-panel">
            <div className="sm-step">
              <span>01</span>
              <div>
                <strong>Watch</strong>
                <p>Tiles light up one by one. Note the order.</p>
              </div>
            </div>
            <div className="sm-step">
              <span>02</span>
              <div>
                <strong>Remember</strong>
                <p>Keep the exact order of the highlighted tiles.</p>
              </div>
            </div>
            <div className="sm-step">
              <span>03</span>
              <div>
                <strong>Repeat</strong>
                <p>Tap the same tiles in the same order.</p>
              </div>
            </div>
          </div>
        )}

        {/* EXPANDABLE: HISTORY */}
        {history.length > 0 && (
          <>
            <button
              type="button"
              className="sm-expand"
              onClick={() => setShowHistory((v) => !v)}
              aria-expanded={showHistory}
            >
              <span>
                Round history · {accuracy}% accuracy · {history.length}{" "}
                {history.length === 1 ? "round" : "rounds"}
              </span>
              <span className="sm-expand-chev">{showHistory ? "−" : "+"}</span>
            </button>

            {showHistory && (
              <div className="sm-panel sm-panel-history">
                {history.map((entry, index) => (
                  <div className="sm-history-row" key={index}>
                    <div className="sm-history-level">
                      <span>Level {entry.level}</span>
                      <small>{entry.sequenceLength} tiles</small>
                    </div>
                    <span
                      className={`sm-history-status ${
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
      </div>

      <style jsx>{`
        .sm {
          --sm-primary: #ff5a1f;
          --sm-primary-dark: #e64a14;
          --sm-primary-soft: #fff3ed;
          --sm-primary-surface: #fff7f3;
          --sm-primary-hover: #ffb69d;
          --sm-text: var(--text-main, #172033);
          --sm-muted: var(--text-muted, #596579);
          --sm-border: var(--border-color, #e8ebf1);
          --sm-surface: var(--card-bg, #ffffff);
          --sm-soft: #fafbfc;

          color: var(--sm-text);
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
        }

        /* HEADER */
        .sm-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .sm-head-text {
          min-width: 0;
        }

        .sm-eyebrow {
          display: block;
          color: var(--sm-primary);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          margin-bottom: 3px;
        }

        .sm-head h2 {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.2;
          margin: 0;
        }

        .sm-best {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
          padding: 8px 12px;
          border: 1px solid var(--sm-border);
          border-radius: 10px;
          background: linear-gradient(145deg, #fff3ed, #fffaf7);
        }

        .sm-best-label {
          font-size: 8px;
          font-weight: 800;
          color: var(--sm-muted);
          letter-spacing: 1px;
        }

        .sm-best-value {
          font-size: 17px;
          font-weight: 800;
          color: var(--sm-primary);
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }

        .sm-best-sub {
          color: var(--sm-muted);
          font-size: 9px;
        }

        /* STAT BAR — continuous strip */
        .sm-bar {
          display: flex;
          align-items: stretch;
          border: 1px solid var(--sm-border);
          border-radius: 11px;
          background: var(--sm-surface);
          overflow: hidden;
          margin-bottom: 12px;
        }

        .sm-bar-cell {
          flex: 1;
          min-width: 0;
          padding: 9px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .sm-bar-cell > span {
          font-size: 8px;
          font-weight: 800;
          color: var(--sm-muted);
          letter-spacing: 0.9px;
        }

        .sm-bar-cell strong {
          font-size: 15px;
          font-weight: 800;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }

        .sm-bar-sep {
          width: 1px;
          background: var(--sm-border);
          flex-shrink: 0;
        }

        .sm-hearts {
          display: flex;
          gap: 2px;
        }

        .sm-heart {
          color: #d9dbe4;
          font-size: 13px;
        }

        .sm-heart.on {
          color: #e34d70;
        }

        /* STAGE — board wrapper with floating pills */
        .sm-stage {
          position: relative;
          padding: 14px;
          border: 1px solid var(--sm-border);
          border-radius: 16px;
          background: radial-gradient(
            circle at 50% 30%,
            #ffffff 0%,
            #fafbfc 75%
          );
          box-shadow: 0 6px 20px rgba(23, 32, 51, 0.05);
        }

        .sm-stage-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .sm-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5px;
          white-space: nowrap;
          background: var(--sm-primary-soft);
          color: var(--sm-primary);
        }

        .sm-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--sm-primary);
          box-shadow: 0 0 0 2px rgba(255, 90, 31, 0.15);
        }

        .sm-pill-showing {
          background: var(--sm-primary-soft);
          color: var(--sm-primary);
        }

        .sm-pill-input {
          background: #ecfdf5;
          color: #15803d;
        }

        .sm-pill-input .sm-pill-dot {
          background: #16a34a;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15);
        }

        .sm-pill-success {
          background: #ecfdf5;
          color: #15803d;
        }

        .sm-pill-success .sm-pill-dot {
          background: #16a34a;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15);
        }

        .sm-pill-mistake,
        .sm-pill-finished {
          background: #fef2f2;
          color: #b42318;
        }

        .sm-pill-mistake .sm-pill-dot,
        .sm-pill-finished .sm-pill-dot {
          background: #ef4444;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
        }

        .sm-pill-streak {
          background: #fef3c7;
          color: #b45309;
        }

        /* BOARD — fits in viewport */
        .sm-board {
          display: grid;
          gap: 8px;
          width: 100%;
          max-width: min(340px, 40vh);
          aspect-ratio: 1;
          margin: 0 auto;
        }

        .sm-tile {
          border: 1px solid #e3e4ee;
          border-radius: 11px;
          background: #f0f1f7;
          color: #94a3b8;
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: default;
          transition:
            background 120ms ease,
            border-color 120ms ease,
            transform 120ms ease,
            box-shadow 120ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .sm-tile:disabled {
          opacity: 1;
        }

        .sm-tile:not(:disabled) {
          cursor: pointer;
        }

        .sm-tile:not(:disabled):hover {
          border-color: var(--sm-primary-hover);
          background: var(--sm-primary-surface);
        }

        .sm-tile:focus-visible {
          outline: 3px solid var(--sm-primary-hover);
          outline-offset: 3px;
        }

        .sm-tile span {
          font-size: clamp(10px, 2vw, 15px);
          font-weight: 700;
          opacity: 0.55;
        }

        .sm-tile.is-active {
          background: linear-gradient(145deg, #ff7a47, #e64a14);
          border-color: var(--sm-primary-dark);
          color: #fff;
          box-shadow:
            0 0 0 3px rgba(255, 90, 31, 0.18),
            0 6px 14px rgba(255, 90, 31, 0.28);
          transform: scale(0.96);
          animation: smPop 0.22s ease;
        }

        @keyframes smPop {
          0% {
            transform: scale(0.85);
          }
          55% {
            transform: scale(1);
          }
          100% {
            transform: scale(0.96);
          }
        }

        .sm-tile.is-active span {
          opacity: 1;
        }

        /* PROGRESS */
        .sm-progress {
          margin-top: 10px;
        }

        .sm-progress-label {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: var(--sm-muted);
          font-size: 9px;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .sm-progress-label strong {
          color: var(--sm-text);
          font-variant-numeric: tabular-nums;
        }

        .sm-progress-track {
          height: 5px;
          border-radius: 99px;
          background: #eeeff5;
          overflow: hidden;
        }

        .sm-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff7a47, #ff5a1f);
          transition: width 180ms ease;
        }

        /* ACTION ROW */
        .sm-action {
          display: flex;
          align-items: stretch;
          gap: 8px;
          margin-top: 10px;
        }

        .sm-msg {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 11px;
          border-radius: 9px;
          background: var(--sm-soft);
          color: var(--sm-muted);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.4;
          min-height: 40px;
        }

        .sm-msg-icon {
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

        .sm-msg-success {
          background: #ecfdf5;
          color: #166534;
        }

        .sm-msg-success .sm-msg-icon {
          background: #dcfce7;
          color: #15803d;
        }

        .sm-msg-mistake,
        .sm-msg-finished {
          background: #fef2f2;
          color: #b91c1c;
        }

        .sm-msg-mistake .sm-msg-icon,
        .sm-msg-finished .sm-msg-icon {
          background: #fee2e2;
          color: #dc2626;
        }

        .sm-cta {
          flex: 0 0 auto;
          min-height: 40px;
          padding: 0 16px;
          border: 1px solid #e74e1b;
          border-radius: 9px;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #ff682f, #e94b18);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
          transition: background 150ms ease, transform 150ms ease,
            box-shadow 150ms ease;
          white-space: nowrap;
        }

        .sm-cta:hover {
          background: linear-gradient(135deg, #f45a25, #d94112);
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(255, 90, 31, 0.28);
        }

        .sm-cta:focus-visible {
          outline: 3px solid var(--sm-primary-hover);
          outline-offset: 3px;
        }

        /* DIFFICULTY STRIP */
        .sm-diff-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          margin-top: 12px;
        }

        .sm-diff-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 9px 8px;
          border: 1px solid var(--sm-border);
          border-radius: 10px;
          background: var(--sm-surface);
          color: var(--sm-text);
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .sm-diff-btn:hover:not(:disabled) {
          border-color: var(--sm-primary-hover);
          background: var(--sm-primary-surface);
        }

        .sm-diff-btn:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .sm-diff-btn.is-active {
          border-color: var(--sm-primary);
          background: var(--sm-primary-soft);
          box-shadow: inset 0 0 0 1px var(--sm-primary);
        }

        .sm-diff-name {
          font-size: 12px;
          font-weight: 800;
        }

        .sm-diff-btn.is-active .sm-diff-name {
          color: var(--sm-primary);
        }

        .sm-diff-meta {
          font-size: 9px;
          color: var(--sm-muted);
          font-weight: 600;
        }

        .sm-diff-btn.is-active .sm-diff-meta {
          color: var(--sm-primary);
          opacity: 0.8;
        }

        /* EXPANDABLE TOGGLE */
        .sm-expand {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          padding: 9px 12px;
          border: 1px solid var(--sm-border);
          border-radius: 9px;
          background: transparent;
          color: var(--sm-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .sm-expand:hover {
          color: var(--sm-primary);
          border-color: var(--sm-primary-hover);
        }

        .sm-expand-chev {
          font-size: 14px;
          font-weight: 500;
          color: var(--sm-primary);
        }

        /* EXPANDABLE PANEL */
        .sm-panel {
          margin-top: 8px;
          padding: 12px 14px;
          border: 1px solid var(--sm-border);
          border-radius: 11px;
          background: var(--sm-soft);
        }

        .sm-step {
          display: flex;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px solid var(--sm-border);
        }

        .sm-step:first-child {
          padding-top: 0;
        }

        .sm-step:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .sm-step > span {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 26px;
          border-radius: 7px;
          background: var(--sm-primary-soft);
          color: var(--sm-primary);
          font-size: 9px;
          font-weight: 900;
        }

        .sm-step strong {
          display: block;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 2px;
        }

        .sm-step p {
          color: var(--sm-muted);
          font-size: 10px;
          line-height: 1.5;
          margin: 0;
        }

        /* HISTORY PANEL */
        .sm-panel-history {
          display: grid;
          gap: 5px;
          max-height: 180px;
          overflow-y: auto;
        }

        .sm-history-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 10px;
          border-radius: 8px;
          background: var(--sm-surface);
        }

        .sm-history-level {
          display: flex;
          flex-direction: column;
          gap: 1px;
          font-size: 11px;
          font-weight: 700;
        }

        .sm-history-level small {
          color: var(--sm-muted);
          font-size: 9px;
          font-weight: 500;
        }

        .sm-history-status {
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .sm-history-status.is-correct {
          background: #eaf8f0;
          color: #18794a;
        }

        .sm-history-status.is-wrong {
          background: #fff0f1;
          color: #bd3e52;
        }

        /* RESPONSIVE */
        @media (max-height: 720px) {
          .sm-board {
            max-width: min(340px, 36vh);
          }
        }

        @media (max-height: 620px) {
          .sm-board {
            max-width: min(340px, 32vh);
          }

          .sm-head h2 {
            font-size: 17px;
          }
        }

        @media (max-width: 480px) {
          .sm-head {
            flex-wrap: wrap;
          }

          .sm-best-value {
            font-size: 15px;
          }

          .sm-bar-cell {
            padding: 8px 8px;
          }

          .sm-bar-cell strong {
            font-size: 13px;
          }

          .sm-stage {
            padding: 11px;
          }

          .sm-board {
            gap: 6px;
          }

          .sm-tile {
            border-radius: 8px;
          }

          .sm-diff-strip {
            gap: 4px;
          }

          .sm-diff-btn {
            padding: 7px 6px;
          }

          .sm-diff-name {
            font-size: 11px;
          }

          .sm-diff-meta {
            font-size: 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sm-tile,
          .sm-cta,
          .sm-progress-fill {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </ToolShell>
  );
}