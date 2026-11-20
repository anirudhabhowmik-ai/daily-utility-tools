"use client";

import { useEffect, useMemo, useState } from "react";
import ToolShell from "../ToolShell";

type TestMode = "number" | "odd" | "match";
type Phase = "ready" | "testing" | "feedback" | "complete";

type Plate = {
  number: string;
  options: string[];
  background: string;
  foreground: string;
  accent: string;
};

type Color = { hue: number; sat: number; light: number };

const TOTAL = 10;

const PLATES: Plate[] = [
  { number: "12", options: ["12", "17", "21", "I can't see a number"], background: "#b7a95c", foreground: "#a66c55", accent: "#c5b86d" },
  { number: "8", options: ["3", "8", "6", "I can't see a number"], background: "#8b9d54", foreground: "#b96b63", accent: "#a4a95c" },
  { number: "6", options: ["5", "6", "9", "I can't see a number"], background: "#b4a75d", foreground: "#a85d59", accent: "#c3b66e" },
  { number: "29", options: ["29", "70", "25", "I can't see a number"], background: "#9b9d56", foreground: "#b46d69", accent: "#b8a95f" },
  { number: "57", options: ["35", "57", "51", "I can't see a number"], background: "#b2a35e", foreground: "#a65f62", accent: "#c2b36c" },
  { number: "5", options: ["2", "5", "8", "I can't see a number"], background: "#9a9d5b", foreground: "#b86c5f", accent: "#b5a85f" },
  { number: "3", options: ["3", "8", "5", "I can't see a number"], background: "#b7a65d", foreground: "#a65e58", accent: "#c2b76c" },
  { number: "15", options: ["15", "75", "17", "I can't see a number"], background: "#929d59", foreground: "#b66c68", accent: "#b8ad62" },
  { number: "74", options: ["21", "74", "71", "I can't see a number"], background: "#b5a45c", foreground: "#a85e60", accent: "#c4b46c" },
  { number: "26", options: ["26", "28", "76", "I can't see a number"], background: "#9aa05b", foreground: "#b66c63", accent: "#b9ab61" },
];

const DIGITS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
};

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function isNumberDot(number: string, row: number, col: number) {
  const digitWidth = 5;
  const gap = 1;
  const totalWidth = number.length * digitWidth + (number.length - 1) * gap;
  const startCol = Math.floor((13 - totalWidth) / 2);
  const relativeCol = col - startCol;
  if (relativeCol < 0 || relativeCol >= totalWidth) return false;
  const digitIndex = Math.floor(relativeCol / (digitWidth + gap));
  const digitCol = relativeCol % (digitWidth + gap);
  if (digitIndex >= number.length || digitCol >= digitWidth) return false;
  const digit = DIGITS[number[digitIndex]];
  const digitRow = Math.min(6, Math.floor((row / 13) * 7));
  return digit[digitRow][digitCol] === "1";
}

function ColorPlate({ plate, index }: { plate: Plate; index: number }) {
  const random = seededRandom(index + 101);
  const dots = [];
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      const numberDot = isNumberDot(plate.number, row, col);
      const x = 13 + col * 19.5 + (random() - 0.5) * 5;
      const y = 13 + row * 19.5 + (random() - 0.5) * 5;
      const radius = 5.4 + random() * 3.2;
      const color = numberDot
        ? random() > 0.25 ? plate.foreground : plate.accent
        : random() > 0.16 ? plate.background : plate.accent;
      dots.push(
        <circle key={`${row}-${col}`} cx={x} cy={y} r={radius} fill={color} opacity={0.88 + random() * 0.12} />
      );
    }
  }
  return (
    <svg viewBox="0 0 270 270" role="img" aria-label="Color dot pattern. Identify the number you can see." className="cbt-plate">
      <circle cx="135" cy="135" r="130" fill="#eee8d7" />
      {dots}
    </svg>
  );
}

function generateOddRound(seed: number, level: number) {
  const rng = seededRandom(Math.max(1, seed));
  const baseHue = Math.floor(rng() * 360);
  const baseSat = 50 + Math.floor(rng() * 25);
  const baseLight = 45 + Math.floor(rng() * 20);
  const variance = Math.max(5, 28 - level * 2);
  const sign = rng() > 0.5 ? 1 : -1;
  const oddHue = (baseHue + variance * sign + 360) % 360;
  const oddIndex = Math.floor(rng() * 9);
  return { baseHue, baseSat, baseLight, oddHue, oddIndex };
}

function generateMatchRound(seed: number, level: number) {
  const rng = seededRandom(Math.max(1, seed));
  const targetHue = Math.floor(rng() * 360);
  const targetSat = 55 + Math.floor(rng() * 20);
  const targetLight = 45 + Math.floor(rng() * 15);
  const variance = Math.max(8, 32 - level * 2);
  const correctIndex = Math.floor(rng() * 4);
  const options: Color[] = Array.from({ length: 4 }, (_, i) => {
    if (i === correctIndex) return { hue: targetHue, sat: targetSat, light: targetLight };
    const sign = rng() > 0.5 ? 1 : -1;
    const shift = variance + rng() * 10;
    return {
      hue: (targetHue + shift * sign + 360) % 360,
      sat: targetSat,
      light: targetLight,
    };
  });
  return { target: { hue: targetHue, sat: targetSat, light: targetLight }, options, correctIndex };
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const rng = seededRandom(Math.max(1, seed));
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const MODE_META: Record<TestMode, { icon: string; label: string; description: string }> = {
  number: { icon: "🔢", label: "Number plates", description: "Identify the hidden number in each color dot pattern." },
  odd: { icon: "🎯", label: "Odd one out", description: "Find the tile with a slightly different shade." },
  match: { icon: "🎨", label: "Color match", description: "Pick the swatch that exactly matches the target." },
};

export default function ColorBlindnessTest() {
  const [mode, setMode] = useState<TestMode>("number");
  const [phase, setPhase] = useState<Phase>("ready");
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [bestByMode, setBestByMode] = useState<Record<TestMode, number>>({ number: 0, odd: 0, match: 0 });
  const [feedback, setFeedback] = useState<{ correct: boolean; picked: string | number } | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  // Session seed: shuffled plate order + unique color rounds per run.
  // Starts at 1 for SSR/hydration consistency, then randomizes on mount + every Start.
  const [sessionSeed, setSessionSeed] = useState(1);

  useEffect(() => {
    // Fresh seed on page load — every reload gives a new test
    setSessionSeed(Math.floor(Math.random() * 1e9) + 1);

    try {
      setBestByMode({
        number: Number(localStorage.getItem("toolsab-color-test-best") || 0),
        odd: Number(localStorage.getItem("toolsab-color-test-best-odd") || 0),
        match: Number(localStorage.getItem("toolsab-color-test-best-match") || 0),
      });
    } catch {
      // Ignore
    }
  }, []);

  // Shuffle plate ORDER by session seed — plates themselves are unchanged
  const activePlates = useMemo(
    () => shuffleWithSeed(PLATES, sessionSeed),
    [sessionSeed]
  );

  const best = bestByMode[mode];
  const progress = phase === "complete" ? 100 : (current / TOTAL) * 100;
  const isTesting = phase === "testing" || phase === "feedback";

  const currentRound = useMemo(() => {
    if (mode === "number") {
      return { kind: "number" as const, plate: activePlates[current] };
    }
    if (mode === "odd") {
      return {
        kind: "odd" as const,
        ...generateOddRound(sessionSeed + current * 9973, current + 1),
      };
    }
    return {
      kind: "match" as const,
      ...generateMatchRound(sessionSeed + current * 9973 + 5000, current + 1),
    };
  }, [mode, current, sessionSeed, activePlates]);

  const question =
    mode === "number" ? "What number do you see?"
    : mode === "odd" ? "Which tile is different?"
    : "Which color matches the target?";

  function startTest() {
    // New seed → new shuffled plate order AND new odd/match colors
    setSessionSeed(Math.floor(Math.random() * 1e9) + 1);
    setCurrent(0);
    setScore(0);
    setFeedback(null);
    setPhase("testing");
  }

  function resetTest() {
    setCurrent(0);
    setScore(0);
    setFeedback(null);
    setPhase("ready");
  }

  function changeMode(next: TestMode) {
    if (isTesting) return;
    setMode(next);
    setPhase("ready");
    setCurrent(0);
    setScore(0);
    setFeedback(null);
  }

  function chooseAnswer(picked: string | number) {
    if (feedback) return;
    let correct = false;
    if (currentRound.kind === "number") {
      correct = picked === currentRound.plate.number;
    } else if (currentRound.kind === "odd") {
      correct = picked === currentRound.oddIndex;
    } else {
      correct = picked === currentRound.correctIndex;
    }
    if (correct) setScore((s) => s + 1);
    setFeedback({ correct, picked });
    setPhase("feedback");
  }

  function continueTest() {
    if (current === TOTAL - 1) {
      const finalScore = score;
      if (finalScore > best) {
        setBestByMode((prev) => ({ ...prev, [mode]: finalScore }));
        try {
          const key = mode === "number" ? "toolsab-color-test-best" : `toolsab-color-test-best-${mode}`;
          localStorage.setItem(key, String(finalScore));
        } catch {
          // Ignore
        }
      }
      setPhase("complete");
      return;
    }
    setCurrent((v) => v + 1);
    setFeedback(null);
    setPhase("testing");
  }

  const resultMessage =
    score >= 9 ? "You identified nearly all of the patterns."
    : score >= 7 ? "You identified most of the patterns."
    : score >= 4 ? "Some patterns were difficult to identify."
    : "Many patterns were difficult to identify.";

  const feedbackText = feedback
    ? feedback.correct
      ? mode === "number" ? "Correct answer!" : "Well spotted!"
      : mode === "number"
        ? `The number was ${currentRound.kind === "number" ? currentRound.plate.number : ""}.`
        : "The correct one is now highlighted."
    : "";

  return (
    <ToolShell title="Color Vision Test" onReset={resetTest} wide>
      <div className="cbt">
        <header className="cbt-head">
          <div className="cbt-head-text">
            <span className="cbt-eyebrow">COLOR VISION · PRO</span>
            <h2>Color Vision Test</h2>
          </div>
          <div className="cbt-best">
            <span className="cbt-best-label">BEST</span>
            <strong className="cbt-best-value">{best}/{TOTAL}</strong>
          </div>
        </header>

        <div className="cbt-bar">
          <div className="cbt-bar-cell">
            <span>MODE</span>
            <strong className="cbt-bar-mode">{MODE_META[mode].label}</strong>
          </div>
          <div className="cbt-bar-sep" />
          <div className="cbt-bar-cell">
            <span>ROUND</span>
            <strong>{phase === "ready" ? "—" : `${Math.min(current + 1, TOTAL)}/${TOTAL}`}</strong>
          </div>
          <div className="cbt-bar-sep" />
          <div className="cbt-bar-cell">
            <span>SCORE</span>
            <strong className="cbt-bar-score">{score}</strong>
          </div>
        </div>

        <div className="cbt-stage">
          <div className="cbt-stage-top">
            <span className={`cbt-pill cbt-pill-${phase}`}>
              <span className="cbt-pill-dot" />
              {phase === "ready" ? "READY" : phase === "testing" ? "TESTING" : phase === "feedback" ? (feedback?.correct ? "CORRECT" : "REVIEW") : "COMPLETE"}
            </span>
            {isTesting && (
              <span className="cbt-pill cbt-pill-plate">
                Plate {current + 1}/{TOTAL}
              </span>
            )}
          </div>

          {isTesting && (
            <div className="cbt-progress-track">
              <div className="cbt-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}

          {phase === "ready" && (
            <div className="cbt-ready">
              <div className="cbt-preview">
                <div className="cbt-preview-dot dot-one" />
                <div className="cbt-preview-dot dot-two" />
                <div className="cbt-preview-dot dot-three" />
                <div className="cbt-preview-dot dot-four" />
                <div className="cbt-preview-dot dot-five" />
                <div className="cbt-preview-dot dot-six" />
                <strong>12</strong>
              </div>
              <h3>{MODE_META[mode].label}</h3>
              <p>{MODE_META[mode].description}</p>
              <div className="cbt-info-grid">
                <div><strong>{TOTAL}</strong><span>Rounds</span></div>
                <div><strong>2–4</strong><span>Minutes</span></div>
                <div><strong>Free</strong><span>No sign-up</span></div>
              </div>
            </div>
          )}

          {isTesting && currentRound.kind === "number" && (
            <>
              <div className="cbt-prompt">{question}</div>
              <div className="cbt-plate-wrap">
                <ColorPlate plate={currentRound.plate} index={current} />
              </div>
              <div className="cbt-options">
                {currentRound.plate.options.map((option) => {
                  const isPicked = feedback?.picked === option;
                  const isCorrectAnswer = feedback && option === currentRound.plate.number;
                  const cls = isPicked ? (feedback!.correct ? "is-correct" : "is-wrong") : feedback && isCorrectAnswer && !feedback.correct ? "is-reveal" : "";
                  return (
                    <button key={option} className={`cbt-option ${cls}`} disabled={!!feedback} onClick={() => chooseAnswer(option)}>
                      {option}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {isTesting && currentRound.kind === "odd" && (
            <>
              <div className="cbt-prompt">{question}</div>
              <div className="cbt-odd-grid">
                {Array.from({ length: 9 }, (_, i) => {
                  const isOdd = i === currentRound.oddIndex;
                  const hue = isOdd ? currentRound.oddHue : currentRound.baseHue;
                  const color = `hsl(${hue}, ${currentRound.baseSat}%, ${currentRound.baseLight}%)`;
                  const isPicked = feedback?.picked === i;
                  const cls = isPicked ? (feedback!.correct ? "is-correct" : "is-wrong") : feedback && isOdd && !feedback.correct ? "is-reveal" : "";
                  return (
                    <button key={i} className={`cbt-odd-tile ${cls}`} style={{ background: color }} disabled={!!feedback} onClick={() => chooseAnswer(i)} aria-label={`Tile ${i + 1}`} />
                  );
                })}
              </div>
            </>
          )}

          {isTesting && currentRound.kind === "match" && (
            <>
              <div className="cbt-prompt">{question}</div>
              <div className="cbt-match-row">
                <div className="cbt-match-target-wrap">
                  <span className="cbt-match-label">TARGET</span>
                  <div className="cbt-match-target" style={{ background: `hsl(${currentRound.target.hue}, ${currentRound.target.sat}%, ${currentRound.target.light}%)` }} />
                </div>
                <div className="cbt-match-arrow" aria-hidden="true">→</div>
                <div className="cbt-match-options">
                  {currentRound.options.map((opt, i) => {
                    const isPicked = feedback?.picked === i;
                    const isCorrect = i === currentRound.correctIndex;
                    const cls = isPicked ? (feedback!.correct ? "is-correct" : "is-wrong") : feedback && isCorrect && !feedback.correct ? "is-reveal" : "";
                    return (
                      <button key={i} className={`cbt-match-option ${cls}`} style={{ background: `hsl(${opt.hue}, ${opt.sat}%, ${opt.light}%)` }} disabled={!!feedback} onClick={() => chooseAnswer(i)} aria-label={`Option ${i + 1}`} />
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {phase === "complete" && (
            <div className="cbt-complete">
              <div className="cbt-result-icon">✓</div>
              <h3>{MODE_META[mode].label} complete</h3>
              <div className="cbt-score">
                <strong>{score}</strong>
                <span>/ {TOTAL}</span>
              </div>
              <div className="cbt-result-track">
                <div style={{ width: `${(score / TOTAL) * 100}%` }} />
              </div>
              <p className="cbt-result-msg">{resultMessage}</p>
            </div>
          )}
        </div>

        <div className="cbt-action">
          <div className={`cbt-msg cbt-msg-${phase} ${feedback && !feedback.correct ? "is-error" : ""}`} role="status" aria-live="polite">
            <span className="cbt-msg-icon">
              {phase === "complete" || (feedback && feedback.correct) ? "✓" : feedback && !feedback.correct ? "!" : "◆"}
            </span>
            <span>
              {phase === "ready" ? "Select a mode below, then start."
                : phase === "testing" ? question
                : phase === "feedback" ? feedbackText
                : resultMessage}
            </span>
          </div>
          <div className="cbt-action-btns">
            {phase === "ready" && (
              <button className="cbt-btn cbt-btn-pri" onClick={startTest}>Start <span>→</span></button>
            )}
            {phase === "feedback" && (
              <button className="cbt-btn cbt-btn-pri" onClick={continueTest}>
                {current === TOTAL - 1 ? "See results" : "Next"} <span>→</span>
              </button>
            )}
            {phase === "complete" && (
              <button className="cbt-btn cbt-btn-pri" onClick={startTest}>Try again <span>↻</span></button>
            )}
          </div>
        </div>

        <div className="cbt-mode-strip" role="group" aria-label="Test mode">
          {(Object.keys(MODE_META) as TestMode[]).map((m) => (
            <button key={m} type="button" className={`cbt-mode-btn ${mode === m ? "is-active" : ""}`} onClick={() => changeMode(m)} disabled={isTesting} aria-pressed={mode === m}>
              <span className="cbt-mode-icon">{MODE_META[m].icon}</span>
              <span className="cbt-mode-name">{MODE_META[m].label}</span>
              <span className="cbt-mode-best">Best {bestByMode[m]}/{TOTAL}</span>
            </button>
          ))}
        </div>

        <button type="button" className="cbt-expand" onClick={() => setShowInfo((v) => !v)} aria-expanded={showInfo}>
          <span>About this test & disclaimer</span>
          <span className="cbt-expand-chev">{showInfo ? "−" : "+"}</span>
        </button>

        {showInfo && (
          <div className="cbt-panel">
            <p>
              This activity uses original, Ishihara-inspired color patterns and is not a validated clinical color vision test. Your score cannot confirm or rule out color vision deficiency.
            </p>
            <p>
              Screen quality, brightness, ambient lighting, and display settings can all affect what you see. For the most consistent experience, use a well-lit room and don&apos;t change your screen brightness mid-test.
            </p>
            <p>
              <strong>This is not a medical diagnosis.</strong> If you have concerns about your color vision, consult an eye-care professional for a proper assessment.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .cbt {
          --cbt-primary: #ff5a1f;
          --cbt-primary-dark: #e64a14;
          --cbt-primary-soft: #fff3ed;
          --cbt-primary-surface: #fff7f3;
          --cbt-primary-hover: #ffb69d;
          --cbt-text: var(--text-main, #172033);
          --cbt-muted: var(--text-muted, #596579);
          --cbt-border: var(--border-color, #e8ebf1);
          --cbt-surface: var(--card-bg, #ffffff);
          --cbt-soft: #fafbfc;

          color: var(--cbt-text);
          width: 100%;
          max-width: 620px;
          margin: 0 auto;
        }

        .cbt-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .cbt-head-text { min-width: 0; }

        .cbt-eyebrow {
          display: block;
          color: var(--cbt-primary);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          margin-bottom: 3px;
        }

        .cbt-head h2 {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.2;
          margin: 0;
        }

        .cbt-best {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
          padding: 8px 12px;
          border: 1px solid var(--cbt-border);
          border-radius: 10px;
          background: linear-gradient(145deg, #fff3ed, #fffaf7);
        }

        .cbt-best-label {
          font-size: 8px;
          font-weight: 800;
          color: var(--cbt-muted);
          letter-spacing: 1px;
        }

        .cbt-best-value {
          font-size: 16px;
          font-weight: 800;
          color: var(--cbt-primary);
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }

        .cbt-bar {
          display: flex;
          align-items: stretch;
          border: 1px solid var(--cbt-border);
          border-radius: 11px;
          background: var(--cbt-surface);
          overflow: hidden;
          margin-bottom: 12px;
        }

        .cbt-bar-cell {
          flex: 1;
          min-width: 0;
          padding: 9px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .cbt-bar-cell > span {
          font-size: 8px;
          font-weight: 800;
          color: var(--cbt-muted);
          letter-spacing: 0.9px;
        }

        .cbt-bar-cell strong {
          font-size: 14px;
          font-weight: 800;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
          color: var(--cbt-text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cbt-bar-mode, .cbt-bar-score {
          color: var(--cbt-primary) !important;
        }

        .cbt-bar-sep {
          width: 1px;
          background: var(--cbt-border);
          flex-shrink: 0;
        }

        .cbt-stage {
          padding: 14px;
          border: 1px solid var(--cbt-border);
          border-radius: 16px;
          background: radial-gradient(circle at 50% 20%, #ffffff 0%, #fafbfc 75%);
          box-shadow: 0 6px 20px rgba(23, 32, 51, 0.05);
          min-height: 360px;
          display: flex;
          flex-direction: column;
        }

        .cbt-stage-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .cbt-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.4px;
          white-space: nowrap;
          background: var(--cbt-primary-soft);
          color: var(--cbt-primary);
        }

        .cbt-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--cbt-primary);
          box-shadow: 0 0 0 2px rgba(255, 90, 31, 0.15);
        }

        .cbt-pill-feedback .cbt-pill-dot { background: #16a34a; }

        .cbt-pill-complete {
          background: #ecfdf5;
          color: #15803d;
        }

        .cbt-pill-complete .cbt-pill-dot { background: #16a34a; }

        .cbt-pill-plate {
          background: #f3f4f6;
          color: var(--cbt-muted);
        }

        .cbt-progress-track {
          height: 4px;
          border-radius: 99px;
          background: #eeeff5;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .cbt-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff7a47, #ff5a1f);
          transition: width 200ms ease;
        }

        .cbt-prompt {
          text-align: center;
          font-size: 14px;
          font-weight: 800;
          color: var(--cbt-text);
          margin-bottom: 10px;
          letter-spacing: -0.2px;
        }

        .cbt-ready {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 10px;
        }

        .cbt-preview {
          position: relative;
          width: 88px;
          height: 88px;
          border-radius: 50%;
          overflow: hidden;
          background: #a8a65e;
          flex-shrink: 0;
        }

        .cbt-preview strong {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: #a45f5c;
          font-size: 34px;
          letter-spacing: 1px;
          font-weight: 800;
        }

        .cbt-preview-dot {
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #c0b46b;
        }

        .dot-one { top: 8px; left: 13px; }
        .dot-two { top: 48px; left: 6px; }
        .dot-three { top: 15px; right: 9px; }
        .dot-four { bottom: 6px; right: 15px; }
        .dot-five { bottom: 18px; left: 28px; }
        .dot-six { top: 33px; right: 2px; }

        .cbt-ready h3 {
          margin: 14px 0 6px;
          font-size: 18px;
          font-weight: 800;
          color: var(--cbt-text);
        }

        .cbt-ready p {
          max-width: 420px;
          margin: 0;
          color: var(--cbt-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .cbt-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          max-width: 340px;
          width: 100%;
          margin: 14px 0 0;
          border: 1px solid var(--cbt-border);
          border-radius: 10px;
          overflow: hidden;
        }

        .cbt-info-grid > div {
          padding: 10px 6px;
          border-right: 1px solid var(--cbt-border);
          text-align: center;
        }

        .cbt-info-grid > div:last-child { border-right: 0; }

        .cbt-info-grid strong,
        .cbt-info-grid span { display: block; }

        .cbt-info-grid strong {
          font-size: 15px;
          font-weight: 800;
          color: var(--cbt-text);
        }

        .cbt-info-grid span {
          margin-top: 2px;
          color: var(--cbt-muted);
          font-size: 10px;
        }

        .cbt-plate-wrap {
          display: flex;
          justify-content: center;
          flex: 1;
          align-items: center;
          padding: 4px;
        }

        .cbt-plate-wrap :global(.cbt-plate) {
          display: block;
          width: min(100%, 240px);
          height: auto;
          max-height: min(240px, 34vh);
          border-radius: 50%;
        }

        .cbt-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
          margin-top: 8px;
        }

        .cbt-option {
          min-height: 38px;
          padding: 8px 10px;
          border: 1px solid var(--cbt-border);
          border-radius: 8px;
          background: #fff;
          color: var(--cbt-text);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 120ms ease, background 120ms ease;
        }

        .cbt-option:hover:not(:disabled) {
          border-color: var(--cbt-primary-hover);
          background: var(--cbt-primary-surface);
        }

        .cbt-option:disabled { cursor: default; opacity: 1; }

        .cbt-option.is-correct {
          border-color: #16a34a;
          background: #eaf8f1;
          color: #087548;
        }

        .cbt-option.is-wrong {
          border-color: #dc2626;
          background: #fef2f2;
          color: #a52c2c;
        }

        .cbt-option.is-reveal {
          border-color: #16a34a;
          background: #ecfdf5;
          color: #087548;
          animation: cbtPulse 1s ease-in-out infinite;
        }

        @keyframes cbtPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.3); }
          50% { box-shadow: 0 0 0 4px rgba(22, 163, 74, 0); }
        }

        .cbt-odd-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          width: min(100%, 220px);
          aspect-ratio: 1;
          margin: 0 auto;
          flex: 1;
          max-height: min(280px, 36vh);
        }

        .cbt-odd-tile {
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          padding: 0;
          transition: transform 120ms ease, border-color 120ms ease;
        }

        .cbt-odd-tile:hover:not(:disabled) { transform: scale(0.96); }
        .cbt-odd-tile:disabled { cursor: default; }

        .cbt-odd-tile.is-correct {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
        }

        .cbt-odd-tile.is-wrong {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
        }

        .cbt-odd-tile.is-reveal {
          border-color: #16a34a;
          animation: cbtReveal 1s ease-in-out infinite;
        }

        @keyframes cbtReveal {
          0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
        }

        .cbt-match-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          flex: 1;
          justify-content: center;
        }

        .cbt-match-target-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .cbt-match-label {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1px;
          color: var(--cbt-muted);
        }

        .cbt-match-target {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          border: 3px solid var(--cbt-border);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .cbt-match-arrow {
          font-size: 16px;
          color: var(--cbt-muted);
        }

        .cbt-match-options {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          width: 100%;
          max-width: 340px;
        }

        .cbt-match-option {
          aspect-ratio: 1;
          border-radius: 10px;
          border: 2px solid transparent;
          cursor: pointer;
          padding: 0;
          transition: transform 120ms ease, border-color 120ms ease;
        }

        .cbt-match-option:hover:not(:disabled) { transform: scale(0.95); }
        .cbt-match-option:disabled { cursor: default; }

        .cbt-match-option.is-correct {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
        }

        .cbt-match-option.is-wrong {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
        }

        .cbt-match-option.is-reveal {
          border-color: #16a34a;
          animation: cbtReveal 1s ease-in-out infinite;
        }

        .cbt-complete {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 10px;
        }

        .cbt-result-icon {
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

        .cbt-complete h3 {
          margin: 12px 0 6px;
          font-size: 17px;
          font-weight: 800;
        }

        .cbt-score {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin: 4px 0 8px;
        }

        .cbt-score strong {
          font-size: 42px;
          font-weight: 800;
          letter-spacing: -1.5px;
          color: var(--cbt-primary);
          line-height: 1;
        }

        .cbt-score span {
          color: var(--cbt-muted);
          font-size: 14px;
          font-weight: 700;
        }

        .cbt-result-track {
          width: 60%;
          max-width: 260px;
          height: 8px;
          border-radius: 99px;
          background: #eeeff5;
          overflow: hidden;
        }

        .cbt-result-track > div {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff7a47, #ff5a1f);
        }

        .cbt-result-msg {
          margin: 10px 0 0;
          color: var(--cbt-muted);
          font-size: 12px;
          max-width: 340px;
        }

        .cbt-action {
          display: flex;
          align-items: stretch;
          gap: 8px;
          margin-top: 10px;
        }

        .cbt-msg {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 11px;
          border-radius: 9px;
          background: var(--cbt-soft);
          color: var(--cbt-muted);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.4;
          min-height: 40px;
          min-width: 0;
        }

        .cbt-msg-icon {
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

        .cbt-msg-complete,
        .cbt-msg-feedback:not(.is-error) {
          background: #ecfdf5;
          color: #166534;
        }

        .cbt-msg-complete .cbt-msg-icon,
        .cbt-msg-feedback:not(.is-error) .cbt-msg-icon {
          background: #dcfce7;
          color: #15803d;
        }

        .cbt-msg.is-error {
          background: #fef2f2;
          color: #b91c1c;
        }

        .cbt-msg.is-error .cbt-msg-icon {
          background: #fee2e2;
          color: #dc2626;
        }

        .cbt-action-btns {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }

        .cbt-btn {
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

        .cbt-btn-pri {
          border: 1px solid #e74e1b;
          background: linear-gradient(135deg, #ff682f, #e94b18);
          color: #fff;
          box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
          transition: background 150ms ease, transform 150ms ease, box-shadow 150ms ease;
        }

        .cbt-btn-pri:hover {
          background: linear-gradient(135deg, #f45a25, #d94112);
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(255, 90, 31, 0.28);
        }

        .cbt-mode-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          margin-top: 12px;
        }

        .cbt-mode-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 6px;
          border: 1px solid var(--cbt-border);
          border-radius: 10px;
          background: var(--cbt-surface);
          color: var(--cbt-text);
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .cbt-mode-btn:hover:not(:disabled) {
          border-color: var(--cbt-primary-hover);
          background: var(--cbt-primary-surface);
        }

        .cbt-mode-btn:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .cbt-mode-btn.is-active {
          border-color: var(--cbt-primary);
          background: var(--cbt-primary-soft);
          box-shadow: inset 0 0 0 1px var(--cbt-primary);
        }

        .cbt-mode-icon {
          font-size: 16px;
          line-height: 1;
        }

        .cbt-mode-name {
          font-size: 11px;
          font-weight: 800;
        }

        .cbt-mode-btn.is-active .cbt-mode-name {
          color: var(--cbt-primary);
        }

        .cbt-mode-best {
          font-size: 8px;
          color: var(--cbt-muted);
          font-weight: 600;
        }

        .cbt-mode-btn.is-active .cbt-mode-best {
          color: var(--cbt-primary);
          opacity: 0.8;
        }

        .cbt-expand {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          padding: 9px 12px;
          border: 1px solid var(--cbt-border);
          border-radius: 9px;
          background: transparent;
          color: var(--cbt-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .cbt-expand:hover {
          color: var(--cbt-primary);
          border-color: var(--cbt-primary-hover);
        }

        .cbt-expand-chev {
          font-size: 14px;
          font-weight: 500;
          color: var(--cbt-primary);
          flex-shrink: 0;
        }

        .cbt-panel {
          margin-top: 8px;
          padding: 12px 14px;
          border: 1px solid var(--cbt-border);
          border-radius: 11px;
          background: var(--cbt-soft);
        }

        .cbt-panel p {
          margin: 0 0 8px;
          color: var(--cbt-muted);
          font-size: 11px;
          line-height: 1.6;
        }

        .cbt-panel p:last-child { margin-bottom: 0; }
        .cbt-panel strong { color: var(--cbt-text); }

        @media (max-height: 720px) {
          .cbt-plate-wrap :global(.cbt-plate) { max-height: min(200px, 30vh); }
          .cbt-odd-grid { max-height: min(240px, 32vh); }
          .cbt-stage { min-height: 320px; }
        }

        @media (max-width: 480px) {
          .cbt-head { flex-wrap: wrap; }
          .cbt-best-value { font-size: 14px; }
          .cbt-bar-cell { padding: 8px 8px; }
          .cbt-bar-cell strong { font-size: 12px; }
          .cbt-stage { padding: 11px; min-height: 340px; }
          .cbt-odd-grid { gap: 4px; }
          .cbt-match-options { gap: 6px; }
          .cbt-action { flex-direction: column; }
          .cbt-action-btns { justify-content: flex-end; }
          .cbt-mode-name { font-size: 10px; }
          .cbt-option { font-size: 11px; min-height: 36px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cbt-option.is-reveal,
          .cbt-odd-tile.is-reveal,
          .cbt-match-option.is-reveal {
            animation: none;
          }
          .cbt-btn-pri,
          .cbt-option,
          .cbt-odd-tile,
          .cbt-match-option,
          .cbt-progress-fill {
            transition: none;
          }
        }
      `}</style>
    </ToolShell>
  );
}