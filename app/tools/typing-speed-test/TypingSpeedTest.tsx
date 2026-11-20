"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ToolShell from "../ToolShell";

type Duration = 15 | 30 | 60 | 120;
type PassageDifficulty = "easy" | "medium" | "hard";

type Passage = {
  text: string;
  difficulty: PassageDifficulty;
};

type SessionEntry = {
  wpm: number;
  accuracy: number;
  cpm: number;
  duration: Duration;
  timestamp: number;
};

type BestByDuration = Record<Duration, number>;

const DURATIONS: Duration[] = [15, 30, 60, 120];

const PASSAGES: Passage[] = [
  {
    text: "The best way to improve your skills is to practise regularly and focus on making steady progress. Take your time, stay consistent, and remember that small improvements can lead to excellent results.",
    difficulty: "medium",
  },
  {
    text: "Technology continues to change the way people learn, communicate, and work. A simple idea can become something useful when creativity, patience, and careful planning come together.",
    difficulty: "medium",
  },
  {
    text: "Reading every day can introduce you to new ideas and help you discover different ways of thinking. Choose a topic that interests you and make time to explore it.",
    difficulty: "medium",
  },
  {
    text: "A peaceful morning gives you an opportunity to plan your day with a clear mind. Set realistic goals, organize your tasks, and give your attention to one thing at a time.",
    difficulty: "medium",
  },
  {
    text: "Good design is not only about appearance. It is also about making things easier to understand and use. Clear choices, thoughtful details, and simple layouts can make a big difference.",
    difficulty: "medium",
  },
  {
    text: "Learning a new skill takes time, effort, and patience. Mistakes are a natural part of the process, so use them as opportunities to learn and become more confident.",
    difficulty: "medium",
  },
  {
    text: "The sun rises in the east and sets in the west. Each new day is a chance to begin again and make steady progress.",
    difficulty: "easy",
  },
  {
    text: "Small steps lead to big results. Take your time, stay focused, and keep moving forward one day at a time.",
    difficulty: "easy",
  },
  {
    text: "Cryptography relies on complex mathematical algorithms to secure communications and protect sensitive information from unauthorized access.",
    difficulty: "hard",
  },
  {
    text: "Quantum mechanics describes the behavior of particles at atomic and subatomic scales, challenging classical intuitions about determinism and observation.",
    difficulty: "hard",
  },
];

const BEST_KEY = "toolsab-typing-speed-best-v1";
const BEST_BY_DURATION_KEY = "toolsab-typing-speed-best-by-duration-v1";
const BEST_STREAK_KEY = "toolsab-typing-speed-best-streak-v1";

function calculateStreak(typed: string, passage: string): number {
  let streak = 0;
  for (let i = typed.length - 1; i >= 0; i--) {
    if (typed[i] === passage[i]) streak++;
    else break;
  }
  return streak;
}

function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diffMin = Math.floor((now - ts) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Pick a random passage index that is DIFFERENT from the current one.
 * This guarantees the user never sees the same text twice in a row
 * when they click "Try again" or "New passage".
 */
function pickRandomPassageIndex(currentIndex: number): number {
  if (PASSAGES.length <= 1) return currentIndex;
  let next = currentIndex;
  while (next === currentIndex) {
    next = Math.floor(Math.random() * PASSAGES.length);
  }
  return next;
}

function Sparkline({ samples }: { samples: number[] }) {
  if (samples.length < 2) return null;
  const max = Math.max(...samples, 1);
  const width = 100;
  const height = 26;
  const points = samples
    .map((v, i) => {
      const x = (i / (samples.length - 1)) * width;
      const y = height - (v / max) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="#ff5a1f"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function TypingSpeedTest() {
  const [duration, setDuration] = useState<Duration>(60);
  const [remaining, setRemaining] = useState<number>(60);
  const [passageIndex, setPassageIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [bestWpm, setBestWpm] = useState(0);
  const [bestByDuration, setBestByDuration] = useState<BestByDuration>({
    15: 0,
    30: 0,
    60: 0,
    120: 0,
  });
  const [bestStreak, setBestStreak] = useState(0);
  const [hasLoadedBest, setHasLoadedBest] = useState(false);

  const [wpmSamples, setWpmSamples] = useState<number[]>([]);
  const [sessionHistory, setSessionHistory] = useState<SessionEntry[]>([]);
  const [maxStreak, setMaxStreak] = useState(0);
  const [capsLock, setCapsLock] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentWpmRef = useRef(0);

  const currentPassage = PASSAGES[passageIndex];
  const passageText = currentPassage.text;

  const elapsedSeconds = duration - remaining;

  const stats = useMemo(() => {
    let correctCharacters = 0;
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === passageText[i]) correctCharacters++;
    }

    const incorrectCharacters = typedText.length - correctCharacters;
    const accuracy =
      typedText.length > 0
        ? (correctCharacters / typedText.length) * 100
        : 100;

    const elapsedMinutes = elapsedSeconds / 60;
    const wpm =
      elapsedMinutes > 0
        ? Math.round(correctCharacters / 5 / elapsedMinutes)
        : 0;
    const cpm =
      elapsedMinutes > 0
        ? Math.round(correctCharacters / elapsedMinutes)
        : 0;
    const progress = (typedText.length / passageText.length) * 100;

    return {
      correctCharacters,
      incorrectCharacters,
      accuracy,
      wpm,
      cpm,
      progress: Math.min(progress, 100),
    };
  }, [typedText, passageText, elapsedSeconds]);

  const currentStreak = useMemo(
    () => calculateStreak(typedText, passageText),
    [typedText, passageText]
  );

  const consistency = useMemo(() => {
    if (wpmSamples.length < 3) return null;
    const mean = wpmSamples.reduce((a, b) => a + b, 0) / wpmSamples.length;
    if (mean === 0) return 0;
    const variance =
      wpmSamples.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
      wpmSamples.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, Math.min(100, Math.round((1 - stdDev / mean) * 100)));
  }, [wpmSamples]);

  const achievements = useMemo(() => {
    const list: { id: string; icon: string; label: string }[] = [];
    if (sessionHistory.length > 0)
      list.push({ id: "first", icon: "🎯", label: "First test" });

    const bestWpmEver = sessionHistory.reduce(
      (max, s) => Math.max(max, s.wpm),
      bestWpm
    );
    if (bestWpmEver >= 40)
      list.push({ id: "wpm40", icon: "⚡", label: "40+ WPM" });
    if (bestWpmEver >= 60)
      list.push({ id: "wpm60", icon: "🚀", label: "60+ WPM" });
    if (bestWpmEver >= 80)
      list.push({ id: "wpm80", icon: "🏆", label: "80+ WPM" });

    const bestAcc = sessionHistory.reduce(
      (max, s) => Math.max(max, s.accuracy),
      0
    );
    if (bestAcc >= 98)
      list.push({ id: "acc98", icon: "🎯", label: "98%+ accuracy" });
    if (bestAcc >= 100)
      list.push({ id: "acc100", icon: "💯", label: "Perfect accuracy" });

    if (sessionHistory.some((s) => s.duration === 120))
      list.push({ id: "endurance", icon: "🛡️", label: "Endurance 120s" });

    if (bestStreak >= 50)
      list.push({ id: "streak50", icon: "🔥", label: "50-streak" });
    if (bestStreak >= 100)
      list.push({ id: "streak100", icon: "💎", label: "100-streak" });

    return list;
  }, [sessionHistory, bestWpm, bestStreak]);

  // Load saved bests.
  useEffect(() => {
    try {
      const savedBest = window.localStorage.getItem(BEST_KEY);
      const parsedBest = savedBest ? Number(savedBest) : 0;
      if (Number.isFinite(parsedBest) && parsedBest > 0)
        setBestWpm(parsedBest);

      const savedByDuration = window.localStorage.getItem(
        BEST_BY_DURATION_KEY
      );
      if (savedByDuration) {
        const parsed = JSON.parse(savedByDuration) as Record<string, unknown>;
        if (parsed && typeof parsed === "object") {
          setBestByDuration({
            15: Number(parsed["15"]) || 0,
            30: Number(parsed["30"]) || 0,
            60: Number(parsed["60"]) || 0,
            120: Number(parsed["120"]) || 0,
          });
        }
      }

      const savedStreak = window.localStorage.getItem(BEST_STREAK_KEY);
      const parsedStreak = savedStreak ? Number(savedStreak) : 0;
      if (Number.isFinite(parsedStreak) && parsedStreak > 0)
        setBestStreak(parsedStreak);
    } catch {
      // Ignore
    } finally {
      setHasLoadedBest(true);
    }
  }, []);

  // Save bests.
  useEffect(() => {
    if (!hasLoadedBest) return;
    try {
      window.localStorage.setItem(BEST_KEY, String(bestWpm));
      window.localStorage.setItem(
        BEST_BY_DURATION_KEY,
        JSON.stringify(bestByDuration)
      );
      window.localStorage.setItem(BEST_STREAK_KEY, String(bestStreak));
    } catch {
      // Ignore
    }
  }, [bestWpm, bestByDuration, bestStreak, hasLoadedBest]);

  // Countdown timer.
  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setIsRunning(false);
          setIsFinished(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  // Track WPM reference for sampler.
  useEffect(() => {
    currentWpmRef.current = stats.wpm;
  }, [stats.wpm]);

  // Sample WPM once per second.
  useEffect(() => {
    if (!isRunning) return;
    const sampler = window.setInterval(() => {
      setWpmSamples((prev) => [...prev, currentWpmRef.current]);
    }, 1000);
    return () => window.clearInterval(sampler);
  }, [isRunning]);

  // Track max streak during the test.
  useEffect(() => {
    setMaxStreak((prev) => Math.max(prev, currentStreak));
  }, [currentStreak]);

  // On finish, commit scores/history.
  useEffect(() => {
    if (!isFinished) return;
    setBestWpm((prev) => Math.max(prev, stats.wpm));
    setBestByDuration((prev) => ({
      ...prev,
      [duration]: Math.max(prev[duration], stats.wpm),
    }));
    setBestStreak((prev) => Math.max(prev, maxStreak));
    setSessionHistory((prev) =>
      [
        {
          wpm: stats.wpm,
          accuracy: stats.accuracy,
          cpm: stats.cpm,
          duration,
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, 8)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished]);

  const resetTest = useCallback(() => {
    setTypedText("");
    setRemaining(duration);
    setIsRunning(false);
    setIsFinished(false);
    setWpmSamples([]);
    setMaxStreak(0);
    textareaRef.current?.focus();
  }, [duration]);

  const handleDurationChange = (nextDuration: Duration) => {
    setDuration(nextDuration);
    setRemaining(nextDuration);
    setTypedText("");
    setIsRunning(false);
    setIsFinished(false);
    setWpmSamples([]);
    setMaxStreak(0);
  };

  const handleInput = (value: string) => {
    if (isFinished || value.length > passageText.length) return;
    setTypedText(value);

    if (!isRunning && value.length > 0) {
      setIsRunning(true);
      setWpmSamples([]);
      setMaxStreak(0);
    }

    if (value.length === passageText.length) {
      setIsRunning(false);
      setIsFinished(true);
    }
  };

  /**
   * "New passage" — always picks a random passage different from current.
   */
  const nextPassage = () => {
    setPassageIndex((current) => pickRandomPassageIndex(current));
    setTypedText("");
    setRemaining(duration);
    setIsRunning(false);
    setIsFinished(false);
    setWpmSamples([]);
    setMaxStreak(0);
    textareaRef.current?.focus();
  };

  /**
   * "Try again" — was previously re-using the same passage.
   * Now picks a fresh random passage so every attempt feels new.
   */
  const startAgain = () => {
    setPassageIndex((current) => pickRandomPassageIndex(current));
    setTypedText("");
    setRemaining(duration);
    setIsRunning(false);
    setIsFinished(false);
    setWpmSamples([]);
    setMaxStreak(0);
    textareaRef.current?.focus();
  };

  const getCharacterClass = (index: number) => {
    if (index >= typedText.length) {
      return index === typedText.length ? "current" : "untyped";
    }
    return typedText[index] === passageText[index] ? "correct" : "incorrect";
  };

  const handleCapsCheck = (e: React.KeyboardEvent) => {
    setCapsLock(e.getModifierState?.("CapsLock") ?? false);
  };

  const timerPercentage = (remaining / duration) * 100;
  const difficultyLabel =
    currentPassage.difficulty.charAt(0).toUpperCase() +
    currentPassage.difficulty.slice(1);

  return (
    <ToolShell title="Typing Speed Test" onReset={resetTest} wide>
      <div className="tt">
        {/* HEADER */}
        <header className="tt-head">
          <div className="tt-head-text">
            <span className="tt-eyebrow">TYPING PERFORMANCE · PRO</span>
            <h2>Typing Speed Test</h2>
          </div>
          <div className="tt-best">
            <span className="tt-best-label">BEST WPM</span>
            <strong className="tt-best-value">{bestWpm}</strong>
          </div>
        </header>

        {/* STAT BAR */}
        <div className="tt-bar">
          <div className="tt-bar-cell tt-bar-primary">
            <span>WPM</span>
            <strong>{stats.wpm}</strong>
          </div>
          <div className="tt-bar-sep" />
          <div className="tt-bar-cell">
            <span>ACCURACY</span>
            <strong>{stats.accuracy.toFixed(0)}%</strong>
          </div>
          <div className="tt-bar-sep" />
          <div className="tt-bar-cell">
            <span>CPM</span>
            <strong>{stats.cpm}</strong>
          </div>
          <div className="tt-bar-sep" />
          <div className="tt-bar-cell">
            <span>STREAK</span>
            <strong className={currentStreak > 0 ? "tt-streak-on" : ""}>
              {currentStreak}
            </strong>
          </div>
        </div>

        {/* STAGE */}
        <div className="tt-stage">
          <div className="tt-stage-top">
            <span
              className={`tt-pill ${
                remaining <= 10 && isRunning ? "tt-pill-urgent" : ""
              }`}
            >
              <span className="tt-pill-dot" />
              {isFinished
                ? "FINISHED"
                : isRunning
                  ? `${remaining}s left`
                  : "READY"}
            </span>

            <div className="tt-stage-top-right">
              {capsLock && isRunning && (
                <span className="tt-caps">⇪ CAPS ON</span>
              )}
              <span className="tt-pill tt-pill-diff">
                {difficultyLabel} · #{passageIndex + 1}/{PASSAGES.length}
              </span>
            </div>
          </div>

          <div className="tt-timer-track">
            <div
              className={`tt-timer-fill ${
                remaining <= 10 && isRunning ? "tt-timer-urgent" : ""
              }`}
              style={{ width: `${timerPercentage}%` }}
            />
          </div>

          {isRunning && wpmSamples.length > 1 && (
            <div className="tt-sparkline">
              <Sparkline samples={wpmSamples} />
            </div>
          )}

          <div
            className="tt-passage-box"
            onClick={() => textareaRef.current?.focus()}
          >
            <div className="tt-passage-label">
              <span>PASSAGE</span>
              <span>
                {typedText.length} / {passageText.length}
              </span>
            </div>

            <div className="tt-passage" aria-label="Text to type">
              {passageText.split("").map((character, index) => (
                <span
                  key={index}
                  className={`tt-character ${getCharacterClass(index)}`}
                >
                  {character === " " ? "\u00A0" : character}
                </span>
              ))}
            </div>
          </div>

          <div className="tt-progress-track">
            <div
              className="tt-progress-fill"
              style={{ width: `${stats.progress}%` }}
            />
          </div>

          <label className="tt-input-label" htmlFor="tt-typing-input">
            YOUR TYPING AREA
          </label>

          <textarea
            id="tt-typing-input"
            ref={textareaRef}
            className="tt-textarea"
            value={typedText}
            onChange={(event) => handleInput(event.target.value)}
            onKeyDown={handleCapsCheck}
            onKeyUp={handleCapsCheck}
            onPaste={(event) => event.preventDefault()}
            onDrop={(event) => event.preventDefault()}
            disabled={isFinished}
            placeholder={
              isFinished
                ? "Test finished. Start again to try a new passage."
                : "Start typing here to begin the timer..."
            }
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            rows={3}
            aria-describedby="tt-input-help"
          />

          <div className="tt-input-footer">
            <span id="tt-input-help">
              {isFinished
                ? "Test completed. Review your results below."
                : isRunning
                  ? "Timer is running — keep typing."
                  : typedText.length > 0
                    ? "Ready to continue."
                    : "The timer starts with your first character."}
            </span>
            <span>{Math.round(stats.progress)}% done</span>
          </div>
        </div>

        {/* ACTION ROW */}
        <div className="tt-action">
          <div
            className={`tt-msg ${isFinished ? "tt-msg-done" : ""}`}
            role="status"
            aria-live="polite"
          >
            <span className="tt-msg-icon">{isFinished ? "✓" : "⌨"}</span>
            <div className="tt-msg-content">
              {isFinished ? (
                <>
                  <span>
                    {stats.wpm} WPM · {stats.accuracy.toFixed(1)}% accuracy
                    {consistency !== null && ` · ${consistency}% consistent`}
                  </span>
                  {sessionHistory.length > 0 && (
                    <span className="tt-msg-meta">
                      New best: {bestByDuration[duration]} WPM in {duration}s
                    </span>
                  )}
                </>
              ) : (
                <span>
                  {isRunning
                    ? "Keep typing. Your timer is running."
                    : "Pick a duration, then start typing to begin."}
                </span>
              )}
            </div>
          </div>

          <div className="tt-action-btns">
            {/* Always-visible: New passage (disabled while typing) */}
            {!isFinished && (
              <button
                type="button"
                className="tt-btn tt-btn-sec"
                onClick={nextPassage}
                disabled={isRunning}
              >
                New passage
              </button>
            )}

            {isFinished && (
              <>
                <button
                  type="button"
                  className="tt-btn tt-btn-sec"
                  onClick={nextPassage}
                >
                  New passage
                </button>
                <button
                  type="button"
                  className="tt-btn tt-btn-pri"
                  onClick={startAgain}
                >
                  Try again <span aria-hidden="true">↻</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* DURATION STRIP */}
        <div className="tt-duration-strip" role="group" aria-label="Duration">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              className={`tt-duration-btn ${
                duration === d ? "is-active" : ""
              }`}
              onClick={() => handleDurationChange(d)}
              disabled={isRunning}
              aria-pressed={duration === d}
            >
              <span className="tt-duration-name">{d}s</span>
              <span className="tt-duration-best">
                Best {bestByDuration[d] || "—"}
              </span>
            </button>
          ))}
        </div>

        {/* EXPANDABLE: HISTORY */}
        {sessionHistory.length > 0 && (
          <>
            <button
              type="button"
              className="tt-expand"
              onClick={() => setShowHistory((v) => !v)}
              aria-expanded={showHistory}
            >
              <span>
                History · {sessionHistory.length}{" "}
                {sessionHistory.length === 1 ? "attempt" : "attempts"}
                {consistency !== null && ` · ${consistency}% consistent`}
              </span>
              <span className="tt-expand-chev">
                {showHistory ? "−" : "+"}
              </span>
            </button>

            {showHistory && (
              <div className="tt-panel">
                {achievements.length > 0 && (
                  <div className="tt-achievements">
                    {achievements.map((a) => (
                      <span key={a.id} className="tt-achievement">
                        <span className="tt-ach-icon">{a.icon}</span>
                        {a.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="tt-history">
                  {sessionHistory.map((entry, index) => (
                    <div className="tt-history-row" key={index}>
                      <div className="tt-history-main">
                        <strong>{entry.wpm} WPM</strong>
                        <span className="tt-history-meta">
                          {entry.accuracy.toFixed(0)}% acc · {entry.duration}s
                        </span>
                      </div>
                      <span className="tt-history-time">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* EXPANDABLE: TIPS */}
        <button
          type="button"
          className="tt-expand"
          onClick={() => setShowTips((v) => !v)}
          aria-expanded={showTips}
        >
          <span>Quick tips to type faster</span>
          <span className="tt-expand-chev">{showTips ? "−" : "+"}</span>
        </button>

        {showTips && (
          <div className="tt-panel">
            <div className="tt-tip">
              <span>01</span>
              <p>
                <strong>Accuracy first.</strong> Speed follows naturally when
                you stop making typos.
              </p>
            </div>
            <div className="tt-tip">
              <span>02</span>
              <p>
                <strong>Look ahead.</strong> Read one or two words beyond where
                you are typing.
              </p>
            </div>
            <div className="tt-tip">
              <span>03</span>
              <p>
                <strong>Use home row.</strong> Keep fingers on ASDF and JKL; to
                reduce movement.
              </p>
            </div>
            <div className="tt-tip">
              <span>04</span>
              <p>
                <strong>Stay relaxed.</strong> Tension slows you down — shake
                out your hands between attempts.
              </p>
            </div>
            <div className="tt-tip">
              <span>05</span>
              <p>
                <strong>Practise daily.</strong> Short 60-second sessions build
                muscle memory faster than occasional long ones.
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .tt {
          --tt-primary: #ff5a1f;
          --tt-primary-dark: #e64a14;
          --tt-primary-soft: #fff3ed;
          --tt-primary-surface: #fff7f3;
          --tt-primary-hover: #ffb69d;
          --tt-text: var(--text-main, #172033);
          --tt-muted: var(--text-muted, #596579);
          --tt-border: var(--border-color, #e8ebf1);
          --tt-surface: var(--card-bg, #ffffff);
          --tt-soft: #fafbfc;

          color: var(--tt-text);
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
        }

        .tt-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .tt-head-text {
          min-width: 0;
        }

        .tt-eyebrow {
          display: block;
          color: var(--tt-primary);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          margin-bottom: 3px;
        }

        .tt-head h2 {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.2;
          margin: 0;
        }

        .tt-best {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
          padding: 8px 12px;
          border: 1px solid var(--tt-border);
          border-radius: 10px;
          background: linear-gradient(145deg, #fff3ed, #fffaf7);
        }

        .tt-best-label {
          font-size: 8px;
          font-weight: 800;
          color: var(--tt-muted);
          letter-spacing: 1px;
        }

        .tt-best-value {
          font-size: 18px;
          font-weight: 800;
          color: var(--tt-primary);
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }

        .tt-bar {
          display: flex;
          align-items: stretch;
          border: 1px solid var(--tt-border);
          border-radius: 11px;
          background: var(--tt-surface);
          overflow: hidden;
          margin-bottom: 12px;
        }

        .tt-bar-cell {
          flex: 1;
          min-width: 0;
          padding: 9px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .tt-bar-cell > span {
          font-size: 8px;
          font-weight: 800;
          color: var(--tt-muted);
          letter-spacing: 0.9px;
        }

        .tt-bar-cell strong {
          font-size: 16px;
          font-weight: 800;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
          color: var(--tt-text);
        }

        .tt-bar-primary {
          background: var(--tt-primary-soft);
        }

        .tt-bar-primary strong {
          color: var(--tt-primary);
          font-size: 18px;
        }

        .tt-bar-sep {
          width: 1px;
          background: var(--tt-border);
          flex-shrink: 0;
        }

        .tt-streak-on {
          color: var(--tt-primary) !important;
        }

        .tt-stage {
          padding: 14px;
          border: 1px solid var(--tt-border);
          border-radius: 16px;
          background: radial-gradient(
            circle at 50% 20%,
            #ffffff 0%,
            #fafbfc 75%
          );
          box-shadow: 0 6px 20px rgba(23, 32, 51, 0.05);
        }

        .tt-stage-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .tt-stage-top-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .tt-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.4px;
          white-space: nowrap;
          background: var(--tt-primary-soft);
          color: var(--tt-primary);
        }

        .tt-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--tt-primary);
          box-shadow: 0 0 0 2px rgba(255, 90, 31, 0.15);
        }

        .tt-pill-urgent {
          background: #fef2f2;
          color: #b42318;
          animation: ttPulse 1s ease-in-out infinite;
        }

        .tt-pill-urgent .tt-pill-dot {
          background: #ef4444;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
        }

        @keyframes ttPulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .tt-pill-diff {
          background: #f3f4f6;
          color: var(--tt-muted);
        }

        .tt-caps {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 999px;
          background: #fef3c7;
          color: #b45309;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.4px;
          white-space: nowrap;
          animation: ttPulse 1.4s ease-in-out infinite;
        }

        .tt-timer-track {
          height: 5px;
          border-radius: 99px;
          background: #eeeff5;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .tt-timer-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff7a47, #ff5a1f);
          transition: width 300ms linear;
        }

        .tt-timer-urgent {
          background: linear-gradient(90deg, #f87171, #dc2626);
        }

        .tt-sparkline {
          height: 26px;
          margin-bottom: 8px;
          opacity: 0.8;
        }

        .tt-sparkline :global(svg) {
          width: 100%;
          height: 100%;
          display: block;
        }

        .tt-passage-box {
          padding: 14px;
          border: 1px solid var(--tt-border);
          border-radius: 11px;
          background: var(--tt-soft);
          margin-bottom: 10px;
          cursor: text;
        }

        .tt-passage-label {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
          color: var(--tt-muted);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.9px;
        }

        .tt-passage {
          color: var(--tt-muted);
          font-size: clamp(13px, 1.4vw, 15px);
          line-height: 1.9;
          font-weight: 500;
          overflow-wrap: anywhere;
        }

        .tt-character.correct {
          color: #15803d;
          background: #dcfce7;
          border-radius: 2px;
        }

        .tt-character.incorrect {
          color: #dc2626;
          background: #fee2e2;
          border-radius: 2px;
          text-decoration: underline;
          text-decoration-color: #dc2626;
        }

        .tt-character.current {
          color: var(--tt-primary);
          background: var(--tt-primary-soft);
          border-radius: 2px;
          outline: 1px solid var(--tt-primary-hover);
        }

        .tt-progress-track {
          height: 4px;
          border-radius: 99px;
          background: #eeeff5;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .tt-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ff7a47, #ff5a1f);
          transition: width 150ms ease;
        }

        .tt-input-label {
          display: block;
          margin-bottom: 6px;
          color: var(--tt-muted);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .tt-textarea {
          width: 100%;
          min-height: 92px;
          display: block;
          resize: vertical;
          padding: 11px 13px;
          border: 1px solid #dce1e9;
          border-radius: 10px;
          outline: none;
          background: #fff;
          color: var(--tt-text);
          font: inherit;
          font-size: 14px;
          line-height: 1.7;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }

        .tt-textarea::placeholder {
          color: #94a3b8;
        }

        .tt-textarea:focus {
          border-color: var(--tt-primary);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.13);
        }

        .tt-textarea:disabled {
          cursor: not-allowed;
          background: var(--tt-soft);
          color: var(--tt-muted);
        }

        .tt-input-footer {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 6px;
          color: var(--tt-muted);
          font-size: 10px;
          line-height: 1.4;
        }

        .tt-action {
          display: flex;
          align-items: stretch;
          gap: 8px;
          margin-top: 10px;
        }

        .tt-msg {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 11px;
          border-radius: 9px;
          background: var(--tt-soft);
          color: var(--tt-muted);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.4;
          min-height: 40px;
          min-width: 0;
        }

        .tt-msg-icon {
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

        .tt-msg-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }

        .tt-msg-meta {
          color: var(--tt-muted);
          font-size: 10px;
          opacity: 0.85;
        }

        .tt-msg-done {
          background: #ecfdf5;
          color: #166534;
        }

        .tt-msg-done .tt-msg-icon {
          background: #dcfce7;
          color: #15803d;
        }

        .tt-action-btns {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }

        .tt-btn {
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

        .tt-btn:focus-visible {
          outline: 3px solid var(--tt-primary-hover);
          outline-offset: 3px;
        }

        .tt-btn:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .tt-btn-pri {
          border: 1px solid #e74e1b;
          background: linear-gradient(135deg, #ff682f, #e94b18);
          color: #fff;
          box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
        }

        .tt-btn-pri:hover:not(:disabled) {
          background: linear-gradient(135deg, #f45a25, #d94112);
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(255, 90, 31, 0.28);
        }

        .tt-btn-sec {
          border: 1px solid var(--tt-border);
          background: #fff;
          color: var(--tt-muted);
        }

        .tt-btn-sec:hover:not(:disabled) {
          border-color: var(--tt-primary-hover);
          color: var(--tt-primary);
          background: var(--tt-primary-surface);
        }

        .tt-duration-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
          margin-top: 12px;
        }

        .tt-duration-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 6px;
          border: 1px solid var(--tt-border);
          border-radius: 10px;
          background: var(--tt-surface);
          color: var(--tt-text);
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .tt-duration-btn:hover:not(:disabled) {
          border-color: var(--tt-primary-hover);
          background: var(--tt-primary-surface);
        }

        .tt-duration-btn:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .tt-duration-btn.is-active {
          border-color: var(--tt-primary);
          background: var(--tt-primary-soft);
          box-shadow: inset 0 0 0 1px var(--tt-primary);
        }

        .tt-duration-name {
          font-size: 13px;
          font-weight: 800;
        }

        .tt-duration-btn.is-active .tt-duration-name {
          color: var(--tt-primary);
        }

        .tt-duration-best {
          font-size: 8px;
          color: var(--tt-muted);
          font-weight: 600;
          letter-spacing: 0.2px;
        }

        .tt-duration-btn.is-active .tt-duration-best {
          color: var(--tt-primary);
          opacity: 0.8;
        }

        .tt-expand {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          padding: 9px 12px;
          border: 1px solid var(--tt-border);
          border-radius: 9px;
          background: transparent;
          color: var(--tt-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .tt-expand:hover {
          color: var(--tt-primary);
          border-color: var(--tt-primary-hover);
        }

        .tt-expand-chev {
          font-size: 14px;
          font-weight: 500;
          color: var(--tt-primary);
          flex-shrink: 0;
        }

        .tt-panel {
          margin-top: 8px;
          padding: 12px 14px;
          border: 1px solid var(--tt-border);
          border-radius: 11px;
          background: var(--tt-soft);
        }

        .tt-achievements {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--tt-border);
        }

        .tt-achievement {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          border-radius: 999px;
          background: var(--tt-primary-soft);
          color: var(--tt-primary);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2px;
        }

        .tt-ach-icon {
          font-size: 11px;
        }

        .tt-history {
          display: grid;
          gap: 5px;
          max-height: 240px;
          overflow-y: auto;
        }

        .tt-history-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 10px;
          border-radius: 8px;
          background: var(--tt-surface);
          gap: 8px;
        }

        .tt-history-main {
          display: flex;
          align-items: baseline;
          gap: 8px;
          min-width: 0;
          flex-wrap: wrap;
        }

        .tt-history-main strong {
          font-size: 12px;
          font-weight: 800;
          color: var(--tt-text);
          font-variant-numeric: tabular-nums;
        }

        .tt-history-meta {
          color: var(--tt-muted);
          font-size: 10px;
        }

        .tt-history-time {
          color: var(--tt-muted);
          font-size: 10px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .tt-tip {
          display: flex;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px solid var(--tt-border);
        }

        .tt-tip:first-child {
          padding-top: 0;
        }

        .tt-tip:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .tt-tip > span {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 26px;
          border-radius: 7px;
          background: var(--tt-primary-soft);
          color: var(--tt-primary);
          font-size: 9px;
          font-weight: 900;
        }

        .tt-tip p {
          margin: 0;
          color: var(--tt-muted);
          font-size: 11px;
          line-height: 1.5;
        }

        .tt-tip strong {
          color: var(--tt-text);
        }

        @media (max-width: 480px) {
          .tt-head {
            flex-wrap: wrap;
          }

          .tt-best-value {
            font-size: 16px;
          }

          .tt-bar-cell {
            padding: 8px 8px;
          }

          .tt-bar-cell strong {
            font-size: 14px;
          }

          .tt-bar-primary strong {
            font-size: 16px;
          }

          .tt-stage {
            padding: 11px;
          }

          .tt-passage-box {
            padding: 11px;
          }

          .tt-passage {
            font-size: 12px;
            line-height: 1.8;
          }

          .tt-action {
            flex-direction: column;
          }

          .tt-action-btns {
            justify-content: flex-end;
          }

          .tt-duration-strip {
            gap: 4px;
          }

          .tt-duration-name {
            font-size: 12px;
          }

          .tt-duration-best {
            font-size: 7px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .tt-character,
          .tt-timer-fill,
          .tt-progress-fill,
          .tt-btn,
          .tt-duration-btn,
          .tt-pill-urgent,
          .tt-caps {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </ToolShell>
  );
}