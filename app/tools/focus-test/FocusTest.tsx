"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ToolShell from "../ToolShell";

type Phase = "ready" | "playing" | "complete";

type Round = {
  title: string;
  category: string;
  instruction: string;
  target: string;
  targetLabel: string;
  distractors: string[];
  gridSize: number;
  targetCount: number;
  cells: string[];
};

type RoundResult = {
  hits: number;
  mistakes: number;
  targetCount: number;
  timeUsed: number;
  category: string;
  target: string;
};

type Variant = {
  target: string;
  distractors: string[];
  targetLabel: string;
};

const ROUND_TIME = 25;
const BEST_KEY = "toolsab-focus-test-best-v1";

const ROUND_CONFIG = [
  { name: "Warm-up", gridSize: 5, targetCount: 6 },
  { name: "Stay focused", gridSize: 6, targetCount: 9 },
  { name: "Concentration", gridSize: 7, targetCount: 12 },
];

const VARIANT_CATEGORIES: Record<string, Variant[]> = {
  letters: [
    { target: "O", distractors: ["Q", "C", "0", "G"], targetLabel: "letter O" },
    { target: "E", distractors: ["F", "P", "B", "R"], targetLabel: "letter E" },
    { target: "I", distractors: ["L", "J", "T", "1"], targetLabel: "letter I" },
    { target: "C", distractors: ["G", "O", "Q", "U"], targetLabel: "letter C" },
    { target: "S", distractors: ["5", "Z", "8", "B"], targetLabel: "letter S" },
    { target: "A", distractors: ["V", "R", "4", "M"], targetLabel: "letter A" },
  ],
  numbers: [
    { target: "6", distractors: ["8", "9", "5", "0"], targetLabel: "number 6" },
    { target: "3", distractors: ["8", "5", "9", "2"], targetLabel: "number 3" },
    { target: "7", distractors: ["1", "T", "Z", "J"], targetLabel: "number 7" },
    { target: "5", distractors: ["S", "6", "3", "2"], targetLabel: "number 5" },
    { target: "8", distractors: ["B", "3", "6", "9"], targetLabel: "number 8" },
    { target: "1", distractors: ["I", "L", "7", "T"], targetLabel: "number 1" },
  ],
  shapes: [
    { target: "△", distractors: ["▽", "◇", "○", "◁"], targetLabel: "upright triangle" },
    { target: "▽", distractors: ["△", "◇", "○", "▷"], targetLabel: "downward triangle" },
    { target: "■", distractors: ["□", "▪", "◆", "▫"], targetLabel: "filled square" },
    { target: "●", distractors: ["○", "◐", "◑", "◒"], targetLabel: "filled circle" },
    { target: "★", distractors: ["☆", "✦", "✧", "✩"], targetLabel: "filled star" },
    { target: "◆", distractors: ["◇", "■", "□", "▪"], targetLabel: "filled diamond" },
  ],
  symbols: [
    { target: "+", distractors: ["×", "÷", "−", "="], targetLabel: "plus sign" },
    { target: "↑", distractors: ["↓", "→", "←", "↕"], targetLabel: "upward arrow" },
    { target: "♥", distractors: ["♡", "♦", "♠", "♣"], targetLabel: "filled heart" },
    { target: "♠", distractors: ["♣", "♥", "♡", "♦"], targetLabel: "spade" },
  ],
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function createRounds(): Round[] {
  const allCategories = Object.keys(VARIANT_CATEGORIES);
  const selectedCategories = shuffle(allCategories).slice(0, ROUND_CONFIG.length);

  return ROUND_CONFIG.map((config, i) => {
    const cat = selectedCategories[i];
    const variant = pickRandom(VARIANT_CATEGORIES[cat]);
    const total = config.gridSize * config.gridSize;
    const targets = Array(config.targetCount).fill(variant.target);
    const distractors = Array.from(
      { length: total - config.targetCount },
      () => pickRandom(variant.distractors)
    );

    return {
      title: `Round ${i + 1} — ${config.name}`,
      category: cat,
      instruction: `Find every ${variant.targetLabel}.`,
      target: variant.target,
      targetLabel: variant.targetLabel,
      distractors: variant.distractors,
      gridSize: config.gridSize,
      targetCount: config.targetCount,
      cells: shuffle([...targets, ...distractors]),
    };
  });
}

export default function FocusTest() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [hits, setHits] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_TIME);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [best, setBest] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  // Random preview on every load
  const [previewCells, setPreviewCells] = useState<string[]>([]);
  const [previewTarget, setPreviewTarget] = useState("");
  const [previewLabel, setPreviewLabel] = useState("");

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(BEST_KEY) || 0));
    } catch {
      // ignore
    }

    const all = Object.values(VARIANT_CATEGORIES).flat();
    const v = pickRandom(all);
    setPreviewTarget(v.target);
    setPreviewLabel(v.targetLabel);
    const targets = Array(5).fill(v.target);
    const distractors = Array.from({ length: 4 }, () => pickRandom(v.distractors));
    setPreviewCells(shuffle([...targets, ...distractors]));
  }, []);

  const round = rounds[roundIndex];

  const finishRound = useCallback(
    (finalHits = hits, finalMistakes = mistakes) => {
      if (phase !== "playing" || !round) return;

      const result: RoundResult = {
        hits: finalHits,
        mistakes: finalMistakes,
        targetCount: round.targetCount,
        timeUsed: ROUND_TIME - secondsLeft,
        category: round.category,
        target: round.target,
      };

      setResults((prev) => [...prev, result]);

      if (roundIndex === rounds.length - 1) {
        setPhase("complete");
      } else {
        setRoundIndex((prev) => prev + 1);
        setSelected([]);
        setHits(0);
        setMistakes(0);
        setSecondsLeft(ROUND_TIME);
      }
    },
    [phase, round, hits, mistakes, secondsLeft, roundIndex, rounds.length]
  );

  useEffect(() => {
    if (phase !== "playing") return;
    if (secondsLeft <= 0) {
      finishRound();
      return;
    }
    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [phase, secondsLeft, finishRound]);

  const startTest = () => {
    setRounds(createRounds());
    setRoundIndex(0);
    setSelected([]);
    setHits(0);
    setMistakes(0);
    setSecondsLeft(ROUND_TIME);
    setResults([]);
    setPhase("playing");
  };

  const resetTest = () => {
    setPhase("ready");
    setRounds([]);
    setRoundIndex(0);
    setSelected([]);
    setHits(0);
    setMistakes(0);
    setSecondsLeft(ROUND_TIME);
    setResults([]);
  };

  const chooseCell = (index: number) => {
    if (phase !== "playing" || selected.includes(index) || !round) return;

    const nextSelected = [...selected, index];
    setSelected(nextSelected);

    if (round.cells[index] === round.target) {
      const nextHits = hits + 1;
      setHits(nextHits);
      if (nextHits === round.targetCount) {
        finishRound(nextHits, mistakes);
      }
    } else {
      setMistakes((prev) => prev + 1);
    }
  };

  const totalHits = results.reduce((sum, r) => sum + r.hits, 0);
  const totalTargets = results.reduce((sum, r) => sum + r.targetCount, 0);
  const totalMistakes = results.reduce((sum, r) => sum + r.mistakes, 0);

  const currentHits = phase === "playing" ? hits : 0;
  const currentMistakes = phase === "playing" ? mistakes : 0;

  const liveHits = totalHits + currentHits;
  const liveMistakes = totalMistakes + currentMistakes;
  const liveScore = Math.max(0, liveHits * 10 - liveMistakes * 2);

  const finalAccuracy =
    totalHits + totalMistakes > 0
      ? Math.round((totalHits / (totalHits + totalMistakes)) * 100)
      : 0;

  const finalScore = Math.max(0, totalHits * 10 - totalMistakes * 2);

  const perfectRounds = results.filter((r) => r.mistakes === 0).length;

  useEffect(() => {
    if (phase !== "complete") return;
    setBest((prev) => {
      if (finalScore <= prev) return prev;
      try {
        localStorage.setItem(BEST_KEY, String(finalScore));
      } catch {
        // ignore
      }
      return finalScore;
    });
  }, [phase, finalScore]);

  const resultMessage = useMemo(() => {
    if (finalAccuracy >= 95 && totalMistakes <= 2) return "Excellent attention to detail!";
    if (finalAccuracy >= 80) return "Good focus. You spotted most of the targets.";
    if (finalAccuracy >= 60) return "A little more care may help improve your accuracy.";
    return "This challenge was difficult. Try again at your own pace.";
  }, [finalAccuracy, totalMistakes]);

  const categoryLabel = (cat: string) =>
    cat.charAt(0).toUpperCase() + cat.slice(1);

  return (
    <ToolShell title="Focus and Concentration Test" onReset={resetTest} wide>
      <div className="focus">
        {/* HEADER */}
        <header className="focus-head">
          <div className="focus-head-text">
            <span className="focus-eyebrow">ATTENTION · PRO</span>
            <h2>Focus & Concentration Test</h2>
          </div>
          <div className="focus-best">
            <span className="focus-best-label">BEST</span>
            <strong className="focus-best-value">{best.toLocaleString()}</strong>
          </div>
        </header>

        {/* STAT BAR */}
        <div className="focus-bar">
          <div className="focus-bar-cell">
            <span>ROUND</span>
            <strong>
              {phase === "ready" ? "—" : `${Math.min(roundIndex + 1, rounds.length)}/${rounds.length}`}
            </strong>
          </div>
          <div className="focus-bar-sep" />
          <div className={`focus-bar-cell ${secondsLeft <= 5 && phase === "playing" ? "is-urgent" : ""}`}>
            <span>TIME</span>
            <strong>
              {phase === "playing" ? `00:${String(secondsLeft).padStart(2, "0")}` : "00:25"}
            </strong>
          </div>
          <div className="focus-bar-sep" />
          <div className="focus-bar-cell">
            <span>SCORE</span>
            <strong className="focus-bar-score">{liveScore.toLocaleString()}</strong>
          </div>
        </div>

        {/* STAGE */}
        <div className="focus-stage">
          <div className="focus-stage-top">
            <span className={`focus-pill focus-pill-${phase}`}>
              <span className="focus-pill-dot" />
              {phase === "ready" ? "READY" : phase === "playing" ? "PLAYING" : "COMPLETE"}
            </span>
            {phase === "playing" && round && (
              <span className="focus-pill focus-pill-cat">
                {categoryLabel(round.category)}
              </span>
            )}
          </div>

          {phase === "playing" && (
            <div className="focus-timer-bar">
              <div
                className={`focus-timer-fill ${secondsLeft <= 5 ? "is-urgent" : ""}`}
                style={{ width: `${(secondsLeft / ROUND_TIME) * 100}%` }}
              />
            </div>
          )}

          {/* READY */}
          {phase === "ready" && (
            <div className="focus-ready">
              {previewCells.length > 0 && (
                <div className="focus-preview" aria-hidden="true">
                  {previewCells.map((sym, i) => (
                    <span key={i} className={sym === previewTarget ? "is-target" : ""}>
                      {sym}
                    </span>
                  ))}
                </div>
              )}
              <h3>Ready to test your focus?</h3>
              <p>
                Find every matching symbol before the timer runs out. Each round
                gets harder and uses a different set of symbols.
              </p>
              <div className="focus-info">
                <div><strong>3</strong><span>Rounds</span></div>
                <div><strong>25s</strong><span>Each</span></div>
                <div><strong>Random</strong><span>Symbols</span></div>
              </div>
            </div>
          )}

          {/* PLAYING */}
          {phase === "playing" && round && (
            <>
              <div className="focus-target-row">
                <div className="focus-target-badge">
                  <span className="focus-target-symbol">{round.target}</span>
                  <div className="focus-target-text">
                    <span className="focus-target-eyebrow">TARGET</span>
                    <span className="focus-target-label">{round.targetLabel}</span>
                  </div>
                </div>
                <div className="focus-live-stats">
                  <span><b>{hits}</b>/{round.targetCount} found</span>
                  <span><b>{mistakes}</b> mistakes</span>
                  <span><b>{round.targetCount - hits}</b> left</span>
                </div>
              </div>

              <div
                className="focus-grid"
                style={{
                  gridTemplateColumns: `repeat(${round.gridSize}, minmax(0, 1fr))`,
                }}
              >
                {round.cells.map((symbol, index) => {
                  const isSelected = selected.includes(index);
                  const isTarget = symbol === round.target;
                  return (
                    <button
                      key={index}
                      type="button"
                      className={`focus-cell ${
                        isSelected ? (isTarget ? "is-correct" : "is-wrong") : ""
                      }`}
                      onClick={() => chooseCell(index)}
                      disabled={isSelected}
                      aria-label={`Grid item ${index + 1}: ${symbol}`}
                    >
                      {symbol}
                      {isSelected && isTarget && <span className="focus-mark">✓</span>}
                      {isSelected && !isTarget && <span className="focus-mark">×</span>}
                    </button>
                  );
                })}
              </div>

              <div className="focus-progress">
                <div style={{ width: `${(roundIndex / rounds.length) * 100}%` }} />
              </div>
            </>
          )}

          {/* COMPLETE */}
          {phase === "complete" && (
            <div className="focus-complete">
              <div className="focus-result-icon">✓</div>
              <h3>Challenge complete</h3>
              <div className="focus-final-score">
                <strong>{finalScore.toLocaleString()}</strong>
                <span>points</span>
              </div>
              <div className="focus-result-stats">
                <div><strong>{totalHits}/{totalTargets}</strong><span>Found</span></div>
                <div><strong>{totalMistakes}</strong><span>Mistakes</span></div>
                <div><strong>{finalAccuracy}%</strong><span>Accuracy</span></div>
              </div>
            </div>
          )}
        </div>

        {/* ACTION ROW */}
        <div className="focus-action">
          <div className={`focus-msg ${phase === "complete" ? "is-done" : ""}`} role="status" aria-live="polite">
            <span className="focus-msg-icon">
              {phase === "ready" ? "◆" : phase === "playing" ? "◉" : "✓"}
            </span>
            <span>
              {phase === "ready"
                ? "Click Start to begin. Symbols change every play."
                : phase === "playing" && round
                  ? round.instruction
                  : resultMessage}
            </span>
          </div>
          <div className="focus-action-btns">
            {phase === "ready" && (
              <button className="focus-btn focus-btn-pri" onClick={startTest}>
                Start <span>→</span>
              </button>
            )}
            {phase === "complete" && (
              <button className="focus-btn focus-btn-pri" onClick={startTest}>
                Play again <span>↻</span>
              </button>
            )}
          </div>
        </div>

        {/* EXPANDABLE: ROUND BREAKDOWN */}
        {phase === "complete" && results.length > 0 && (
          <>
            <button
              type="button"
              className="focus-expand"
              onClick={() => setShowInfo((v) => !v)}
              aria-expanded={showInfo}
            >
              <span>Round breakdown · {perfectRounds} perfect</span>
              <span className="focus-expand-chev">{showInfo ? "−" : "+"}</span>
            </button>
            {showInfo && (
              <div className="focus-panel">
                {results.map((r, i) => (
                  <div className="focus-round-row" key={i}>
                    <div className="focus-round-main">
                      <span className="focus-round-symbol">{r.target}</span>
                      <div>
                        <strong>Round {i + 1} · {categoryLabel(r.category)}</strong>
                        <span className="focus-round-meta">
                          {r.hits}/{r.targetCount} found · {r.mistakes} mistakes
                        </span>
                      </div>
                    </div>
                    <span className={`focus-round-badge ${r.mistakes === 0 ? "is-perfect" : ""}`}>
                      {r.mistakes === 0 ? "Perfect" : `${Math.round((r.hits / r.targetCount) * 100)}%`}
                    </span>
                  </div>
                ))}
                <p className="focus-disclaimer">
                  This is an informal attention game, not a clinical assessment
                  of concentration or cognitive ability. Scores can vary with
                  practice, fatigue, and device input.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .focus {
          --focus-primary: #ff5a1f;
          --focus-primary-dark: #e64a14;
          --focus-primary-soft: #fff3ed;
          --focus-primary-surface: #fff7f3;
          --focus-primary-hover: #ffb69d;
          --focus-text: var(--text-main, #172033);
          --focus-muted: var(--text-muted, #596579);
          --focus-border: var(--border-color, #e8ebf1);
          --focus-surface: var(--card-bg, #ffffff);
          --focus-soft: #fafbfc;

          color: var(--focus-text);
          width: 100%;
          max-width: 620px;
          margin: 0 auto;
        }

        /* HEADER */
        .focus-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .focus-head-text { min-width: 0; }
        .focus-eyebrow {
          display: block;
          color: var(--focus-primary);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          margin-bottom: 3px;
        }
        .focus-head h2 {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.2;
          margin: 0;
        }
        .focus-best {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
          padding: 8px 12px;
          border: 1px solid var(--focus-border);
          border-radius: 10px;
          background: linear-gradient(145deg, #fff3ed, #fffaf7);
        }
        .focus-best-label {
          font-size: 8px;
          font-weight: 800;
          color: var(--focus-muted);
          letter-spacing: 1px;
        }
        .focus-best-value {
          font-size: 16px;
          font-weight: 800;
          color: var(--focus-primary);
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }

        /* STAT BAR */
        .focus-bar {
          display: flex;
          align-items: stretch;
          border: 1px solid var(--focus-border);
          border-radius: 11px;
          background: var(--focus-surface);
          overflow: hidden;
          margin-bottom: 12px;
        }
        .focus-bar-cell {
          flex: 1;
          min-width: 0;
          padding: 9px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .focus-bar-cell > span {
          font-size: 8px;
          font-weight: 800;
          color: var(--focus-muted);
          letter-spacing: 0.9px;
        }
        .focus-bar-cell strong {
          font-size: 15px;
          font-weight: 800;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
          color: var(--focus-text);
        }
        .focus-bar-score { color: var(--focus-primary) !important; }
        .focus-bar-cell.is-urgent strong { color: #b42318; }
        .focus-bar-sep {
          width: 1px;
          background: var(--focus-border);
          flex-shrink: 0;
        }

        /* STAGE */
        .focus-stage {
          padding: 14px;
          border: 1px solid var(--focus-border);
          border-radius: 16px;
          background: radial-gradient(circle at 50% 20%, #ffffff 0%, #fafbfc 75%);
          box-shadow: 0 6px 20px rgba(23, 32, 51, 0.05);
          min-height: 340px;
          display: flex;
          flex-direction: column;
        }
        .focus-stage-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .focus-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.4px;
          white-space: nowrap;
          background: var(--focus-primary-soft);
          color: var(--focus-primary);
        }
        .focus-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--focus-primary);
          box-shadow: 0 0 0 2px rgba(255, 90, 31, 0.15);
        }
        .focus-pill-complete {
          background: #ecfdf5;
          color: #15803d;
        }
        .focus-pill-complete .focus-pill-dot { background: #16a34a; }
        .focus-pill-cat {
          background: #f3f4f6;
          color: var(--focus-muted);
        }

        /* Timer bar */
        .focus-timer-bar {
          height: 4px;
          border-radius: 99px;
          background: #eeeff5;
          overflow: hidden;
          margin-bottom: 10px;
        }
        .focus-timer-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff7a47, #ff5a1f);
          transition: width 1000ms linear;
        }
        .focus-timer-fill.is-urgent {
          background: linear-gradient(90deg, #f87171, #dc2626);
        }

        /* READY */
        .focus-ready {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 10px;
        }
        .focus-preview {
          display: grid;
          grid-template-columns: repeat(3, 40px);
          gap: 6px;
          margin-bottom: 16px;
        }
        .focus-preview span {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border: 1px solid var(--focus-border);
          border-radius: 9px;
          background: var(--focus-soft);
          color: var(--focus-muted);
          font-size: 19px;
          font-weight: 700;
        }
        .focus-preview .is-target {
          border-color: var(--focus-primary-hover);
          background: var(--focus-primary-soft);
          color: var(--focus-primary-dark);
        }
        .focus-ready h3 {
          margin: 0 0 6px;
          font-size: 17px;
          font-weight: 800;
        }
        .focus-ready p {
          max-width: 420px;
          margin: 0 0 12px;
          color: var(--focus-muted);
          font-size: 12px;
          line-height: 1.6;
        }
        .focus-info {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          max-width: 340px;
          width: 100%;
          border: 1px solid var(--focus-border);
          border-radius: 10px;
          overflow: hidden;
        }
        .focus-info > div {
          padding: 10px 6px;
          border-right: 1px solid var(--focus-border);
          text-align: center;
        }
        .focus-info > div:last-child { border-right: 0; }
        .focus-info strong,
        .focus-info span { display: block; }
        .focus-info strong {
          font-size: 14px;
          font-weight: 800;
          color: var(--focus-text);
        }
        .focus-info span {
          margin-top: 2px;
          color: var(--focus-muted);
          font-size: 9px;
        }

        /* TARGET ROW */
        .focus-target-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 10px;
          margin-bottom: 10px;
          border: 1px solid var(--focus-primary-hover);
          border-radius: 10px;
          background: var(--focus-primary-soft);
          flex-wrap: wrap;
        }
        .focus-target-badge {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .focus-target-symbol {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: #fff;
          color: var(--focus-primary);
          font-size: 22px;
          font-weight: 800;
          border: 1px solid var(--focus-primary-hover);
        }
        .focus-target-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .focus-target-eyebrow {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.6px;
          color: var(--focus-primary-dark);
          opacity: 0.7;
        }
        .focus-target-label {
          font-size: 12px;
          font-weight: 800;
          color: var(--focus-primary-dark);
        }
        .focus-live-stats {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: var(--focus-muted);
          font-weight: 600;
        }
        .focus-live-stats b {
          color: var(--focus-text);
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }

        /* GRID */
        .focus-grid {
          display: grid;
          gap: 6px;
          width: min(100%, 420px, 42vh);
          aspect-ratio: 1;
          margin: 0 auto;
        }
        .focus-cell {
          position: relative;
          display: grid;
          place-items: center;
          aspect-ratio: 1;
          min-width: 0;
          padding: 0;
          border: 1px solid #e3e4ee;
          border-radius: 9px;
          background: #f7f8fc;
          color: var(--focus-text);
          font-size: clamp(16px, 2.8vw, 24px);
          font-weight: 700;
          cursor: pointer;
          transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
        }
        .focus-cell:hover:not(:disabled) {
          z-index: 1;
          transform: scale(1.04);
          border-color: var(--focus-primary-hover);
          background: var(--focus-primary-surface);
        }
        .focus-cell:focus-visible {
          outline: 3px solid var(--focus-primary-hover);
          outline-offset: 2px;
        }
        .focus-cell.is-correct {
          border-color: #16a34a;
          background: #eaf8f1;
          color: #15803d;
          cursor: default;
          animation: focusPop 0.25s ease;
        }
        .focus-cell.is-wrong {
          border-color: #dc2626;
          background: #fef2f2;
          color: #b42318;
          cursor: default;
          animation: focusShake 0.25s ease;
        }
        @keyframes focusPop {
          0% { transform: scale(0.85); }
          55% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes focusShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        .focus-mark {
          position: absolute;
          top: 1px;
          right: 4px;
          font-size: 10px;
          font-weight: 900;
          opacity: 0.8;
        }

        /* Overall progress */
        .focus-progress {
          height: 4px;
          margin-top: 10px;
          border-radius: 99px;
          background: #eeeff5;
          overflow: hidden;
        }
        .focus-progress > div {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff7a47, #ff5a1f);
          transition: width 250ms ease;
        }

        /* COMPLETE */
        .focus-complete {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 10px;
        }
        .focus-result-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #ecfdf5;
          color: #15803d;
          font-size: 22px;
          font-weight: 800;
        }
        .focus-complete h3 {
          margin: 10px 0 4px;
          font-size: 16px;
          font-weight: 800;
        }
        .focus-final-score {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin: 4px 0 10px;
        }
        .focus-final-score strong {
          font-size: 40px;
          font-weight: 800;
          letter-spacing: -1.5px;
          color: var(--focus-primary);
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .focus-final-score span {
          color: var(--focus-muted);
          font-size: 12px;
          font-weight: 700;
        }
        .focus-result-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          max-width: 340px;
          width: 100%;
          border: 1px solid var(--focus-border);
          border-radius: 10px;
          overflow: hidden;
        }
        .focus-result-stats > div {
          padding: 9px 6px;
          border-right: 1px solid var(--focus-border);
          text-align: center;
        }
        .focus-result-stats > div:last-child { border-right: 0; }
        .focus-result-stats strong,
        .focus-result-stats span { display: block; }
        .focus-result-stats strong {
          font-size: 14px;
          font-weight: 800;
          color: var(--focus-text);
        }
        .focus-result-stats span {
          margin-top: 2px;
          color: var(--focus-muted);
          font-size: 9px;
        }

        /* ACTION */
        .focus-action {
          display: flex;
          align-items: stretch;
          gap: 8px;
          margin-top: 10px;
        }
        .focus-msg {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 11px;
          border-radius: 9px;
          background: var(--focus-soft);
          color: var(--focus-muted);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.4;
          min-height: 40px;
          min-width: 0;
        }
        .focus-msg-icon {
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
        .focus-msg.is-done {
          background: #ecfdf5;
          color: #166534;
        }
        .focus-msg.is-done .focus-msg-icon {
          background: #dcfce7;
          color: #15803d;
        }
        .focus-action-btns {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }
        .focus-btn {
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
          white-space: nowrap;
        }
        .focus-btn-pri {
          border: 1px solid #e74e1b;
          background: linear-gradient(135deg, #ff682f, #e94b18);
          color: #fff;
          box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
          transition: background 150ms ease, transform 150ms ease, box-shadow 150ms ease;
        }
        .focus-btn-pri:hover {
          background: linear-gradient(135deg, #f45a25, #d94112);
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(255, 90, 31, 0.28);
        }

        /* EXPANDABLE */
        .focus-expand {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          padding: 9px 12px;
          border: 1px solid var(--focus-border);
          border-radius: 9px;
          background: transparent;
          color: var(--focus-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          transition: color 0.15s ease, border-color 0.15s ease;
        }
        .focus-expand:hover {
          color: var(--focus-primary);
          border-color: var(--focus-primary-hover);
        }
        .focus-expand-chev {
          font-size: 14px;
          font-weight: 500;
          color: var(--focus-primary);
          flex-shrink: 0;
        }
        .focus-panel {
          margin-top: 8px;
          padding: 12px 14px;
          border: 1px solid var(--focus-border);
          border-radius: 11px;
          background: var(--focus-soft);
        }
        .focus-round-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          gap: 10px;
          border-bottom: 1px solid var(--focus-border);
        }
        .focus-round-row:first-child { padding-top: 0; }
        .focus-round-row:last-of-type { border-bottom: 0; padding-bottom: 0; }
        .focus-round-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .focus-round-symbol {
          display: grid;
          place-items: center;
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          border-radius: 7px;
          background: var(--focus-primary-soft);
          color: var(--focus-primary);
          font-size: 15px;
          font-weight: 800;
        }
        .focus-round-main > div {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }
        .focus-round-main strong {
          font-size: 11px;
          font-weight: 800;
          color: var(--focus-text);
        }
        .focus-round-meta {
          font-size: 10px;
          color: var(--focus-muted);
        }
        .focus-round-badge {
          padding: 3px 8px;
          border-radius: 999px;
          background: #f3f4f6;
          color: var(--focus-muted);
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .focus-round-badge.is-perfect {
          background: #eaf8f0;
          color: #18794a;
        }
        .focus-disclaimer {
          margin: 10px 0 0;
          padding-top: 10px;
          border-top: 1px solid var(--focus-border);
          color: var(--focus-muted);
          font-size: 10px;
          line-height: 1.6;
        }

        /* RESPONSIVE */
        @media (max-height: 720px) {
          .focus-grid { width: min(100%, 360px, 38vh); }
          .focus-stage { min-height: 300px; }
        }
        @media (max-width: 480px) {
          .focus-head { flex-wrap: wrap; }
          .focus-best-value { font-size: 14px; }
          .focus-bar-cell { padding: 8px 8px; }
          .focus-bar-cell strong { font-size: 13px; }
          .focus-stage { padding: 11px; }
          .focus-grid { gap: 4px; }
          .focus-cell { border-radius: 7px; }
          .focus-target-row { flex-direction: column; align-items: flex-start; }
          .focus-live-stats { width: 100%; justify-content: space-between; }
          .focus-action { flex-direction: column; }
          .focus-action-btns { justify-content: flex-end; }
        }
        @media (prefers-reduced-motion: reduce) {
          .focus-cell.is-correct,
          .focus-cell.is-wrong,
          .focus-btn-pri,
          .focus-cell,
          .focus-timer-fill,
          .focus-progress > div {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </ToolShell>
  );
}