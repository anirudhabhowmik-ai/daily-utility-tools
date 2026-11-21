"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ToolShell from "../ToolShell";

/* =========================================================
   Types & constants
========================================================= */

type GameStatus =
  | "idle" //      waiting for the player to start
  | "waiting" //   red screen, random delay running
  | "ready" //     green screen, clock is running
  | "too-early" // clicked during red
  | "result" //    showing the reaction for this round
  | "finished"; // all rounds done

type Stats = {
  best: number | null; //    best single reaction ever
  bestAvg: number | null; // best 5-round average ever
  games: number; //          completed runs
};

const TOTAL_ROUNDS = 5;
const MIN_DELAY = 1500;
const MAX_DELAY = 4500;
const INPUT_LOCK_MS = 350; // ignore accidental double-taps on result screens
const LEGACY_BEST_KEY = "reaction-speed-best";
const STATS_KEY = "reaction-speed-stats-v2";

const DEFAULT_STATS: Stats = { best: null, bestAvg: null, games: 0 };

const TIERS = [
  { max: 200, key: 1, label: "Lightning", emoji: "⚡", color: "#16a34a" },
  { max: 250, key: 2, label: "Great", emoji: "🚀", color: "#2563eb" },
  { max: 300, key: 3, label: "Good", emoji: "👍", color: "#ca8a04" },
  { max: 400, key: 4, label: "Average", emoji: "🙂", color: "#ea580c" },
  { max: Infinity, key: 5, label: "Slow", emoji: "🐢", color: "#7c3aed" },
] as const;

const RANKS = [
  { max: 190, title: "Reflex Legend", blurb: "Faster than almost anyone you will meet." },
  { max: 230, title: "Fighter Pilot", blurb: "Elite reflexes. Your hands beat your thoughts." },
  { max: 270, title: "Sharp Shooter", blurb: "Quick and consistent. Clearly above average." },
  { max: 320, title: "Steady Hands", blurb: "Solid, typical human reflexes. Room to grow." },
  { max: 400, title: "Warming Up", blurb: "A bit slow today. Try again after a deep breath." },
  { max: Infinity, title: "Slow Starter", blurb: "Rest your eyes, relax your hand, and go again." },
] as const;

const CONFETTI_COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  delay: (i % 7) * 0.07,
  duration: 1.8 + (i % 5) * 0.28,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  rotate: (i * 47) % 360,
  size: 6 + (i % 3) * 3,
}));

/* =========================================================
   Helpers
========================================================= */

function getTier(ms: number) {
  return TIERS.find((t) => ms < t.max) ?? TIERS[TIERS.length - 1];
}

function getRank(avg: number) {
  return RANKS.find((r) => avg < r.max) ?? RANKS[RANKS.length - 1];
}

/** Very rough "faster than X% of players" ballpark. Not real leaderboard data. */
function estimatePercentile(avg: number) {
  const pts: [number, number][] = [
    [150, 99],
    [180, 96],
    [200, 90],
    [230, 72],
    [250, 55],
    [280, 35],
    [320, 18],
    [400, 6],
    [500, 2],
  ];
  if (avg <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1];
    const [x2, y2] = pts[i];
    if (avg <= x2) return Math.round(y1 + ((avg - x1) / (x2 - x1)) * (y2 - y1));
  }
  return 1;
}

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const num = (v: unknown) =>
        typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
      return {
        best: num(p?.best),
        bestAvg: num(p?.bestAvg),
        games: typeof p?.games === "number" && p.games > 0 ? Math.floor(p.games) : 0,
      };
    }
    // Migrate the old single "best" value if present.
    const legacy = Number(localStorage.getItem(LEGACY_BEST_KEY));
    if (Number.isFinite(legacy) && legacy > 0) {
      return { ...DEFAULT_STATS, best: legacy };
    }
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_STATS;
}

/* =========================================================
   Component
========================================================= */

export default function ReactionSpeedTest() {
  const [status, setStatus] = useState<GameStatus>("idle");
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [streak, setStreak] = useState(0);
  const [falseStarts, setFalseStarts] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [recordRound, setRecordRound] = useState(false); // this round beat the personal best
  const [recordAvg, setRecordAvg] = useState(false); //   this run beat the best average
  const [copied, setCopied] = useState(false);

  // Refs hold the "live" game state so event handlers never see stale values.
  const statusRef = useRef<GameStatus>("idle");
  const roundRef = useRef(0);
  const timesRef = useRef<number[]>([]);
  const statsRef = useRef<Stats>(DEFAULT_STATS);
  const soundRef = useRef(false);
  const startRef = useRef<number | null>(null);
  const enteredAtRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  /* ---------------------------------------------------------
     Mount / unmount
     NOTE: mountedRef MUST be set back to true here. React Strict Mode
     runs mount -> unmount -> mount in development, and without this the
     timer callback would think the component is gone and never turn green.
  --------------------------------------------------------- */
  useEffect(() => {
    mountedRef.current = true;

    const loaded = loadStats();
    statsRef.current = loaded;
    setStats(loaded);

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      audioRef.current?.close().catch(() => {});
      audioRef.current = null;
    };
  }, []);

  /* ---------------------------------------------------------
     Small utilities
  --------------------------------------------------------- */

  const go = useCallback((next: GameStatus) => {
    statusRef.current = next;
    enteredAtRef.current = performance.now();
    setStatus(next);
  }, []);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const setRoundBoth = useCallback((value: number) => {
    roundRef.current = value;
    setRound(value);
  }, []);

  const persist = useCallback((patch: Partial<Stats>) => {
    const next = { ...statsRef.current, ...patch };
    statsRef.current = next;
    setStats(next);
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(next));
    } catch {
      /* continue without saving */
    }
  }, []);

  const beep = useCallback((freq: number, duration = 0.12, type: OscillatorType = "sine") => {
    if (!soundRef.current) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioRef.current ?? (audioRef.current = new Ctx());
      if (ctx.state === "suspended") void ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    } catch {
      /* audio is optional */
    }
  }, []);

  /* ---------------------------------------------------------
     Game flow
  --------------------------------------------------------- */

  const startRound = useCallback(() => {
    clearTimer();
    startRef.current = null;
    setCurrentTime(null);
    setRecordRound(false);
    go("waiting");

    const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);

    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current || statusRef.current !== "waiting") return;
      startRef.current = performance.now(); // start the clock first, then the beep
      go("ready");
      beep(740, 0.1);
    }, delay);
  }, [beep, clearTimer, go]);

  const startGame = useCallback(() => {
    clearTimer();
    timesRef.current = [];
    setTimes([]);
    setStreak(0);
    setFalseStarts(0);
    setRecordAvg(false);
    setRoundBoth(1);
    startRound();
  }, [clearTimer, setRoundBoth, startRound]);

  const recordReaction = useCallback(
    (elapsed: number) => {
      const next = [...timesRef.current, elapsed];
      timesRef.current = next;
      setTimes(next);
      setCurrentTime(elapsed);
      setStreak((s) => (elapsed < 250 ? s + 1 : 0));

      const prevBest = statsRef.current.best;
      if (prevBest === null || elapsed < prevBest) {
        persist({ best: elapsed });
        setRecordRound(true);
      }

      beep(elapsed < 250 ? 880 : 520, 0.12);
      go("result");
    },
    [beep, go, persist]
  );

  const finishGame = useCallback(() => {
    const t = timesRef.current;
    if (t.length === 0) return;
    const avg = Math.round(t.reduce((a, b) => a + b, 0) / t.length);
    const prevAvg = statsRef.current.bestAvg;
    const isRecord = prevAvg === null || avg < prevAvg;

    persist({
      games: statsRef.current.games + 1,
      bestAvg: isRecord ? avg : prevAvg,
    });
    setRecordAvg(isRecord);
    beep(isRecord ? 988 : 660, 0.25);
    go("finished");
  }, [beep, go, persist]);

  /** One action for every input method: tap, click, Space, Enter. */
  const handlePress = useCallback(() => {
    const current = statusRef.current;
    const locked = performance.now() - enteredAtRef.current < INPUT_LOCK_MS;

    switch (current) {
      case "idle":
        startGame();
        break;

      case "waiting":
        clearTimer();
        setFalseStarts((n) => n + 1);
        setStreak(0);
        beep(160, 0.25, "sawtooth");
        go("too-early");
        break;

      case "ready": {
        if (startRef.current === null) return;
        const elapsed = Math.round(performance.now() - startRef.current);
        startRef.current = null;
        recordReaction(elapsed);
        break;
      }

      case "too-early":
        if (locked) return;
        startRound();
        break;

      case "result":
        if (locked) return;
        if (roundRef.current >= TOTAL_ROUNDS) {
          finishGame();
        } else {
          setRoundBoth(roundRef.current + 1);
          startRound();
        }
        break;

      case "finished":
        if (locked) return;
        startGame();
        break;
    }
  }, [beep, clearTimer, finishGame, go, recordReaction, setRoundBoth, startGame, startRound]);

  const resetGame = useCallback(() => {
    clearTimer();
    startRef.current = null;
    timesRef.current = [];
    setTimes([]);
    setCurrentTime(null);
    setStreak(0);
    setFalseStarts(0);
    setRecordRound(false);
    setRecordAvg(false);
    setRoundBoth(0);
    go("idle");
  }, [clearTimer, go, setRoundBoth]);

  const clearRecords = () => {
    persist({ ...DEFAULT_STATS });
    try {
      localStorage.removeItem(LEGACY_BEST_KEY);
    } catch {
      /* ignore */
    }
  };

  const toggleSound = () => {
    const next = !soundRef.current;
    soundRef.current = next;
    setSoundOn(next);
    if (next) beep(660, 0.12); // confirms sound works and unlocks audio
  };

  /* ---------------------------------------------------------
     Keyboard: Space / Enter act exactly like a tap on the arena.
  --------------------------------------------------------- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code !== "Space" && e.code !== "Enter") return;

      // Don't hijack Space/Enter on other buttons, inputs, selects, etc.
      const target = e.target as HTMLElement | null;
      if (target && target !== document.body && target !== screenRef.current) return;

      e.preventDefault();
      handlePress();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlePress]);

  /* ---------------------------------------------------------
     Derived values
  --------------------------------------------------------- */

  const average =
    times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  const fastest = times.length > 0 ? Math.min(...times) : null;
  const slowest = times.length > 0 ? Math.max(...times) : null;
  const consistency =
    times.length > 1 && average !== null
      ? Math.round(
          Math.sqrt(times.reduce((sum, t) => sum + (t - average) ** 2, 0) / times.length)
        )
      : null;

  const chartMax = Math.max(400, ...times);
  const rank = average !== null ? getRank(average) : null;
  const percentile = average !== null ? estimatePercentile(average) : null;
  const lastTier = currentTime !== null ? getTier(currentTime) : null;

  const copyResult = async () => {
    if (average === null) return;
    const text = [
      `⚡ Reaction Speed Test: ${average} ms average (${rank?.title})`,
      `Rounds: ${times.join(" · ")} ms`,
      `Fastest: ${fastest} ms | Consistency: ±${consistency ?? 0} ms`,
      "Can you beat it?",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) setCopied(false);
      }, 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const screenClass = [
    "rs-screen",
    `rs-${status}`,
    status === "result" && lastTier ? `rs-tier-${lastTier.key}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const srStatus: Record<GameStatus, string> = {
    idle: "Ready. Press the arena, Space or Enter to start.",
    waiting: "Wait for green. Do not click yet.",
    ready: "Go! Click now!",
    "too-early": "Too early. Press to retry this round.",
    result: currentTime !== null ? `Reaction time ${currentTime} milliseconds.` : "",
    finished: average !== null ? `Run complete. Average ${average} milliseconds.` : "",
  };

  /* ---------------------------------------------------------
     Arena content
  --------------------------------------------------------- */

  const renderArena = () => {
    switch (status) {
      case "idle":
        return (
          <>
            <span className="rs-icon">⚡</span>
            <strong>Ready when you are</strong>
            <span>Tap, click or press Space to start</span>
            <span className="rs-sub">
              {TOTAL_ROUNDS} rounds. Wait for green, then react.
            </span>
          </>
        );

      case "waiting":
        return (
          <>
            <span className="rs-ring" aria-hidden="true" />
            <strong>Wait for green…</strong>
            <span>Hold still. Clicking now counts as a false start.</span>
          </>
        );

      case "ready":
        return (
          <>
            <strong className="rs-go">CLICK!</strong>
            <span>Now, as fast as you can</span>
          </>
        );

      case "too-early":
        return (
          <>
            <span className="rs-icon">✋</span>
            <strong>Too soon!</strong>
            <span>You jumped the gun before it turned green.</span>
            <span className="rs-sub rs-hint">Tap to retry round {round}</span>
          </>
        );

      case "result":
        return (
          <>
            <span className="rs-result-emoji">{lastTier?.emoji}</span>
            <strong className="rs-big">
              {currentTime}
              <small> ms</small>
            </strong>
            <span className="rs-tier-label">{lastTier?.label}</span>
            {recordRound && <span className="rs-badge">★ New personal best</span>}
            <span className="rs-sub rs-hint">
              {round >= TOTAL_ROUNDS ? "Tap to see your results" : `Tap for round ${round + 1}`}
            </span>
          </>
        );

      case "finished":
        return (
          <>
            <span className="rs-icon">🏆</span>
            <strong className="rs-big">
              {average}
              <small> ms</small>
            </strong>
            <span className="rs-tier-label">{rank?.title}</span>
            {recordAvg && <span className="rs-badge">★ New best average</span>}
            <span className="rs-sub rs-hint">Tap to play again</span>
            <div className="rs-confetti" aria-hidden="true">
              {recordAvg &&
                CONFETTI.map((c, i) => (
                  <i
                    key={i}
                    style={{
                      left: `${c.left}%`,
                      width: c.size,
                      height: c.size * 1.6,
                      background: c.color,
                      animationDelay: `${c.delay}s`,
                      animationDuration: `${c.duration}s`,
                      transform: `rotate(${c.rotate}deg)`,
                    }}
                  />
                ))}
            </div>
          </>
        );
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <ToolShell title="Reaction Speed Test" onReset={resetGame} wide>
      <div className="rs-game">
        {/* Header */}
        <div className="rs-header">
          <div className="rs-header-text">
            <span className="rs-eyebrow">REACTION LAB</span>
            <h2>How fast are your reflexes?</h2>
            <p>
              Wait for the screen to turn green, then react. Five rounds give you an average,
              a rank and a personal best to beat.
            </p>
          </div>

          <div className="rs-round">
            <span>ROUND</span>
            <strong>
              {Math.min(round, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
            </strong>
            <div className="rs-pips" aria-hidden="true">
              {Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
                const t = times[i];
                const active = t === undefined && i === times.length && round > 0 && status !== "finished";
                return (
                  <i
                    key={i}
                    className={active ? "rs-pip rs-pip-active" : "rs-pip"}
                    style={t !== undefined ? { background: getTier(t).color } : undefined}
                  />
                );
              })}
            </div>
            {streak > 1 && <span className="rs-streak">🔥 {streak} fast in a row</span>}
          </div>
        </div>

        {/* Arena */}
        <div
          ref={screenRef}
          role="button"
          tabIndex={0}
          className={screenClass}
          aria-label="Reaction arena"
          onPointerDown={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            e.preventDefault();
            handlePress();
          }}
        >
          {renderArena()}
        </div>
        <span className="rs-sr" aria-live="polite">
          {srStatus[status]}
        </span>

        {/* Toolbar */}
        <div className="rs-toolbar">
          <span className="rs-keys">
            <kbd>Space</kbd> / <kbd>Enter</kbd> / tap
          </span>
          <div className="rs-toolbar-actions">
            <button
              type="button"
              className={soundOn ? "rs-chip rs-chip-on" : "rs-chip"}
              onClick={toggleSound}
              aria-pressed={soundOn}
            >
              {soundOn ? "🔊 Sound on" : "🔇 Sound off"}
            </button>
            {(stats.best !== null || stats.games > 0) && (
              <button type="button" className="rs-chip" onClick={clearRecords}>
                Clear records
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="rs-stats">
          <div className="rs-stat">
            <span>Last reaction</span>
            <strong>{currentTime !== null ? `${currentTime} ms` : "—"}</strong>
          </div>
          <div className="rs-stat rs-stat-accent">
            <span>This run average</span>
            <strong>{average !== null ? `${average} ms` : "—"}</strong>
          </div>
          <div className="rs-stat">
            <span>Personal best</span>
            <strong>{stats.best !== null ? `${stats.best} ms` : "—"}</strong>
          </div>
          <div className="rs-stat">
            <span>Best average</span>
            <strong>{stats.bestAvg !== null ? `${stats.bestAvg} ms` : "—"}</strong>
          </div>
        </div>

        {/* Chart */}
        {times.length > 0 && (
          <div className="rs-panel">
            <div className="rs-panel-head">
              <h3>Your rounds</h3>
              {falseStarts > 0 && (
                <span className="rs-note">
                  {falseStarts} false start{falseStarts > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="rs-chart">
              {average !== null && times.length > 1 && (
                <div className="rs-avg-line" style={{ bottom: `${(average / chartMax) * 100}%` }}>
                  <span>avg {average}</span>
                </div>
              )}
              {Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
                const t = times[i];
                const tier = t !== undefined ? getTier(t) : null;
                return (
                  <div className="rs-bar-col" key={i}>
                    <div className="rs-bar-track">
                      {t !== undefined && tier && (
                        <div
                          className="rs-bar"
                          style={{
                            height: `${Math.max(6, (t / chartMax) * 100)}%`,
                            background: tier.color,
                          }}
                          title={`${t} ms – ${tier.label}`}
                        >
                          <span>{t}</span>
                        </div>
                      )}
                    </div>
                    <small>R{i + 1}</small>
                  </div>
                );
              })}
            </div>

            {times.length > 1 && (
              <div className="rs-insights">
                <div className="rs-insight">
                  <span>Fastest</span>
                  <strong>{fastest} ms</strong>
                </div>
                <div className="rs-insight">
                  <span>Slowest</span>
                  <strong>{slowest} ms</strong>
                </div>
                <div className="rs-insight">
                  <span>Consistency</span>
                  <strong>±{consistency} ms</strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completion */}
        {status === "finished" && average !== null && rank && percentile !== null && (
          <div className="rs-completion">
            <div className="rs-completion-main">
              <span className="rs-rank-tag">YOUR RANK</span>
              <h3>{rank.title}</h3>
              <p>{rank.blurb}</p>
              <p className="rs-percentile">
                Roughly faster than <b>{percentile}%</b> of players{" "}
                <em>(ballpark estimate, not live data)</em>
              </p>
            </div>
            <div className="rs-completion-actions">
              <button type="button" className="rs-primary-btn" onClick={startGame}>
                Play again
              </button>
              <button type="button" className="rs-secondary-btn" onClick={copyResult}>
                {copied ? "Copied ✓" : "Copy result"}
              </button>
            </div>
          </div>
        )}

        {/* How to play */}
        <div className="rs-panel">
          <h3>How to play</h3>
          <ol>
            <li>Tap on blue color arena, where it's written "Ready when you are" (or press Space / Enter) to begin.</li>
            <li>The screen stays red for a random 1.5 to 4.5 seconds. Don't click while it's red.</li>
            <li>The moment it turns green, react as fast as you can.</li>
            <li>Finish all five rounds to get your average, rank and consistency.</li>
          </ol>

          <div className="rs-legend">
            {TIERS.map((t, i) => (
              <span className="rs-legend-item" key={t.key}>
                <b style={{ color: t.color }}>●</b> {t.label}{" "}
                {i === 0
                  ? "< 200 ms"
                  : t.max === Infinity
                  ? "400 ms+"
                  : `< ${t.max} ms`}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .rs-game {
          display: grid;
          gap: 20px;
          width: 100%;
          min-width: 0;
        }

        /* Header */
        .rs-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }
        .rs-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.4px;
          color: var(--tool-primary, #2563eb);
        }
        .rs-header h2 {
          margin: 7px 0;
          font-size: 24px;
          font-weight: 850;
          letter-spacing: -0.4px;
          color: var(--tool-text, #0f172a);
        }
        .rs-header p {
          margin: 0;
          max-width: 560px;
          font-size: 14px;
          line-height: 1.65;
          color: var(--tool-muted, #64748b);
        }
        .rs-round {
          flex-shrink: 0;
          min-width: 130px;
          padding: 12px 14px;
          text-align: center;
          border: 1px solid var(--tool-border, #e2e8f0);
          border-radius: 14px;
          background: var(--tool-card, #fff);
        }
        .rs-round > span:first-child {
          display: block;
          font-size: 10px;
          letter-spacing: 1px;
          font-weight: 800;
          color: var(--tool-muted, #64748b);
        }
        .rs-round strong {
          display: block;
          margin: 4px 0 8px;
          font-size: 18px;
          color: var(--tool-text, #0f172a);
        }
        .rs-pips {
          display: flex;
          justify-content: center;
          gap: 6px;
        }
        .rs-pip {
          width: 14px;
          height: 6px;
          border-radius: 4px;
          background: var(--tool-border, #e2e8f0);
          transition: background-color 0.25s ease;
        }
        .rs-pip-active {
          background: var(--tool-primary, #2563eb);
          animation: rs-blink 1s ease-in-out infinite;
        }
        .rs-streak {
          display: inline-block;
          margin-top: 9px;
          padding: 3px 9px;
          border-radius: 20px;
          background: #fef3c7;
          color: #b45309;
          font-size: 10px;
          font-weight: 800;
        }

        /* Arena */
        .rs-screen {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          min-height: 320px;
          padding: 28px 24px;
          border-radius: 20px;
          color: #fff;
          text-align: center;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
          outline: none;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
          transition: background-color 0.12s ease;
        }
        .rs-screen::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.16), transparent 60%);
        }
        .rs-screen:focus-visible {
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.45), 0 10px 30px rgba(15, 23, 42, 0.18);
        }
        .rs-screen > * {
          position: relative;
        }
        .rs-screen strong {
          font-size: clamp(26px, 5vw, 38px);
          font-weight: 850;
          letter-spacing: -0.5px;
        }
        .rs-screen span {
          font-size: 14px;
          opacity: 0.92;
        }
        .rs-sub {
          font-size: 12px !important;
          opacity: 0.75 !important;
        }
        .rs-hint {
          margin-top: 6px;
          font-weight: 700;
          opacity: 0.9 !important;
        }
        .rs-icon {
          font-size: 42px !important;
          line-height: 1;
        }

        .rs-idle {
          background-color: #1e293b;
        }
        .rs-waiting {
          background-color: #dc2626;
        }
        .rs-ready {
          background-color: #16a34a;
          animation: rs-pop 0.18s ease;
        }
        .rs-too-early {
          background-color: #92400e;
        }
        .rs-finished {
          background-color: #0f172a;
        }
        .rs-tier-1 {
          background-color: #15803d;
        }
        .rs-tier-2 {
          background-color: #1d4ed8;
        }
        .rs-tier-3 {
          background-color: #a16207;
        }
        .rs-tier-4 {
          background-color: #c2410c;
        }
        .rs-tier-5 {
          background-color: #6d28d9;
        }
        .rs-result {
          animation: rs-pop 0.2s ease;
        }

        .rs-go {
          font-size: clamp(48px, 12vw, 88px) !important;
          letter-spacing: 2px !important;
        }
        .rs-big {
          font-size: clamp(54px, 11vw, 92px) !important;
          line-height: 1;
          letter-spacing: -2px !important;
        }
        .rs-big small {
          font-size: 0.32em;
          font-weight: 700;
          letter-spacing: 0;
          opacity: 0.8;
        }
        .rs-result-emoji {
          font-size: 34px !important;
          line-height: 1;
        }
        .rs-tier-label {
          font-size: 17px !important;
          font-weight: 800;
          letter-spacing: 0.3px;
        }
        .rs-badge {
          padding: 5px 12px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.35);
          font-size: 12px !important;
          font-weight: 800;
          opacity: 1 !important;
        }

        .rs-ring {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          border: 4px solid rgba(255, 255, 255, 0.35);
          border-top-color: #fff;
          animation: rs-spin 1.1s linear infinite;
        }

        .rs-confetti {
          position: absolute !important;
          inset: 0;
          pointer-events: none;
        }
        .rs-confetti i {
          position: absolute;
          top: -14px;
          border-radius: 2px;
          animation-name: rs-fall;
          animation-timing-function: ease-in;
          animation-fill-mode: forwards;
        }

        @keyframes rs-pop {
          0% {
            transform: scale(0.985);
          }
          60% {
            transform: scale(1.012);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes rs-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes rs-blink {
          50% {
            opacity: 0.35;
          }
        }
        @keyframes rs-fall {
          0% {
            opacity: 1;
            translate: 0 0;
          }
          100% {
            opacity: 0;
            translate: 24px 380px;
          }
        }

        .rs-sr {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
          white-space: nowrap;
        }

        /* Toolbar */
        .rs-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: -6px;
        }
        .rs-keys {
          font-size: 12px;
          color: var(--tool-muted, #64748b);
        }
        .rs-keys kbd {
          padding: 2px 7px;
          border: 1px solid var(--tool-border, #e2e8f0);
          border-bottom-width: 2px;
          border-radius: 6px;
          background: var(--tool-card, #fff);
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          color: var(--tool-text, #0f172a);
        }
        .rs-toolbar-actions {
          display: flex;
          gap: 8px;
        }
        .rs-chip {
          height: 32px;
          padding: 0 12px;
          border: 1px solid var(--tool-border, #e2e8f0);
          border-radius: 20px;
          background: var(--tool-card, #fff);
          color: var(--tool-muted, #64748b);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.15s ease;
        }
        .rs-chip:hover {
          border-color: #cbd5e1;
          color: var(--tool-text, #0f172a);
        }
        .rs-chip-on {
          border-color: #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
        }

        /* Stats */
        .rs-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }
        .rs-stat {
          min-width: 0;
          padding: 15px 13px;
          border: 1px solid var(--tool-border, #e2e8f0);
          border-radius: 13px;
          background: var(--tool-card, #fff);
        }
        .rs-stat span {
          display: block;
          font-size: 11px;
          color: var(--tool-muted, #64748b);
        }
        .rs-stat strong {
          display: block;
          margin-top: 7px;
          font-size: 20px;
          font-weight: 800;
          color: var(--tool-text, #0f172a);
          overflow-wrap: anywhere;
        }
        .rs-stat-accent {
          border-color: #bfdbfe;
          background: #eff6ff;
        }
        .rs-stat-accent strong {
          color: #1d4ed8;
        }

        /* Panels */
        .rs-panel {
          padding: 18px;
          border: 1px solid var(--tool-border, #e2e8f0);
          border-radius: 14px;
          background: var(--tool-card, #fff);
        }
        .rs-panel h3 {
          margin: 0 0 14px;
          font-size: 16px;
          font-weight: 800;
          color: var(--tool-text, #0f172a);
        }
        .rs-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .rs-panel-head h3 {
          margin-bottom: 14px;
        }
        .rs-note {
          margin-bottom: 14px;
          padding: 3px 9px;
          border-radius: 20px;
          background: #fff1e6;
          color: #c2410c;
          font-size: 11px;
          font-weight: 800;
        }

        /* Chart */
        .rs-chart {
          position: relative;
          display: grid;
          grid-template-columns: repeat(${TOTAL_ROUNDS}, minmax(0, 1fr));
          gap: 12px;
          height: 170px;
          padding-bottom: 20px;
        }
        .rs-bar-col {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 0;
        }
        .rs-bar-track {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          width: 100%;
          flex: 1;
          border-radius: 8px;
          background: var(--tool-panel, #f1f5f9);
        }
        .rs-bar {
          position: relative;
          width: 100%;
          border-radius: 8px;
          animation: rs-grow 0.45s ease both;
          transform-origin: bottom;
        }
        .rs-bar span {
          position: absolute;
          top: -18px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 11px;
          font-weight: 800;
          color: var(--tool-text, #0f172a);
        }
        .rs-bar-col small {
          position: absolute;
          bottom: -18px;
          font-size: 10px;
          font-weight: 700;
          color: var(--tool-muted, #64748b);
        }
        .rs-avg-line {
          position: absolute;
          left: 0;
          right: 0;
          z-index: 2;
          margin-bottom: 20px;
          border-top: 2px dashed rgba(37, 99, 235, 0.65);
          pointer-events: none;
        }
        .rs-avg-line span {
          position: absolute;
          right: 0;
          top: -18px;
          padding: 1px 6px;
          border-radius: 5px;
          background: #1d4ed8;
          color: #fff;
          font-size: 9px;
          font-weight: 800;
        }
        @keyframes rs-grow {
          from {
            transform: scaleY(0);
          }
          to {
            transform: scaleY(1);
          }
        }

        .rs-insights {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 18px;
        }
        .rs-insight {
          padding: 11px;
          border-radius: 10px;
          background: var(--tool-panel, #f8fafc);
          text-align: center;
        }
        .rs-insight span {
          display: block;
          font-size: 11px;
          color: var(--tool-muted, #64748b);
        }
        .rs-insight strong {
          display: block;
          margin-top: 4px;
          font-size: 15px;
          font-weight: 800;
          color: var(--tool-text, #0f172a);
        }

        /* Completion */
        .rs-completion {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px;
          padding: 22px;
          border: 1px solid #bfdbfe;
          border-radius: 16px;
          background: linear-gradient(120deg, #eff6ff, #f5f3ff);
        }
        .rs-rank-tag {
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 1.3px;
          color: #4f46e5;
        }
        .rs-completion h3 {
          margin: 5px 0 6px;
          font-size: 26px;
          font-weight: 850;
          letter-spacing: -0.5px;
          color: #1e1b4b;
        }
        .rs-completion p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          color: #475569;
        }
        .rs-percentile {
          margin-top: 6px !important;
          font-size: 13px !important;
        }
        .rs-percentile em {
          color: #94a3b8;
          font-size: 11px;
        }
        .rs-completion-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .rs-primary-btn,
        .rs-secondary-btn {
          min-height: 46px;
          padding: 0 22px;
          border-radius: 11px;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
          transition: 0.15s ease;
        }
        .rs-primary-btn {
          border: 0;
          background: var(--tool-primary, #2563eb);
          color: #fff;
        }
        .rs-primary-btn:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }
        .rs-secondary-btn {
          border: 1px solid #c7d2fe;
          background: #fff;
          color: #3730a3;
        }
        .rs-secondary-btn:hover {
          background: #eef2ff;
        }

        /* How to play */
        .rs-panel ol {
          margin: 0;
          padding-left: 20px;
          color: var(--tool-muted, #64748b);
          font-size: 14px;
          line-height: 1.9;
        }
        .rs-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--tool-border, #e2e8f0);
        }
        .rs-legend-item {
          font-size: 12px;
          color: var(--tool-muted, #64748b);
        }

        /* Responsive */
        @media (max-width: 640px) {
          .rs-header {
            flex-direction: column;
          }
          .rs-round {
            width: 100%;
          }
          .rs-screen {
            min-height: 260px;
          }
          .rs-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }
          .rs-stat strong {
            font-size: 17px;
          }
          .rs-chart {
            gap: 7px;
          }
          .rs-completion {
            flex-direction: column;
            align-items: stretch;
          }
          .rs-completion-actions .rs-primary-btn,
          .rs-completion-actions .rs-secondary-btn {
            flex: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .rs-screen,
          .rs-ready,
          .rs-result,
          .rs-bar,
          .rs-pip-active,
          .rs-ring {
            animation: none !important;
            transition: none !important;
          }
          .rs-confetti {
            display: none;
          }
        }
      `}</style>
    </ToolShell>
  );
}