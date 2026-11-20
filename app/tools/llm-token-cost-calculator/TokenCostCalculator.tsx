
"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import ToolShell from "../ToolShell";

/* =========================================================
   Types and defaults
========================================================= */

type Currency = "USD" | "EUR" | "GBP" | "INR";
type InputMode = "characters" | "tokens";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
};

const DEFAULTS = {
  provider: "Custom provider",
  model: "Custom AI model",
  currency: "USD" as Currency,
  inputMode: "characters" as InputMode,

  promptChars: 4000,
  outputChars: 2000,
  charsPerToken: 4,
  inputTokens: 1000,
  outputTokens: 500,

  inputRate: 3,
  outputRate: 15,
  cachedInputRate: 0.3,
  cachePercent: 0,

  monthlyRequests: 100,
  daysPerMonth: 30,
  retryPercent: 0,
  budget: 100,

  imagesPerRequest: 0,
  imagePrice: 0,

  audioInputTokens: 0,
  audioOutputTokens: 0,
  audioInputRate: 0,
  audioOutputRate: 0,

  videoMinutes: 0,
  videoPricePerMinute: 0,

  embeddingTokens: 0,
  embeddingRate: 0,

  toolCalls: 0,
  toolPricePerThousand: 0,

  extraCostPerRequest: 0,

  comparisonEnabled: false,
  comparisonModel: "Alternative model",
  comparisonInputRate: 1,
  comparisonOutputRate: 5,
  comparisonCachedInputRate: 0.1,
};

type Values = typeof DEFAULTS;
type ValueKey = keyof Values;

const PRESETS = [
  { label: "Budget example", input: 0.15, output: 0.6, cached: 0.075 },
  { label: "Mid-range example", input: 3, output: 15, cached: 0.3 },
  { label: "Premium example", input: 5, output: 20, cached: 0.5 },
];

function safe(value: number, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1_000_000_000_000, Math.max(0, value));
}

function integer(value: number, fallback = 0) {
  return Math.floor(safe(value, fallback));
}

function formatNumber(value: number, decimals = 2) {
  if (!Number.isFinite(value)) return "0";

  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCurrency(value: number, currency: Currency) {
  const symbol = CURRENCY_SYMBOLS[currency];

  if (!Number.isFinite(value)) return `${symbol}0.00`;

  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);
  const decimals = absoluteValue > 0 && absoluteValue < 0.01 ? 6 : 2;

  return `${sign}${symbol}${absoluteValue.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/* =========================================================
   Reusable input components
========================================================= */

function NumericInput({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = "any",
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  suffix?: string;
  hint?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));

  // Sync externally changed values, such as presets and reset.
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function handleChange(next: string) {
    setDraft(next);

    // Allow temporary empty and partially typed values.
    if (
      next.trim() === "" ||
      next === "-" ||
      next === "." ||
      next === "-."
    ) {
      return;
    }

    const parsed = Number(next);

    if (Number.isFinite(parsed)) {
      onChange(parsed);
    }
  }

  function handleBlur() {
    if (draft.trim() === "") {
      const bounded = Math.max(min, Math.min(max ?? Infinity, 0));
      onChange(bounded);
      setDraft(String(bounded));
      return;
    }

    const parsed = Number(draft);

    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }

    const bounded = Math.max(
      min,
      max === undefined ? parsed : Math.min(max, parsed),
    );

    onChange(bounded);
    setDraft(String(bounded));
  }

  return (
    <div className="tc-field">
      <div className="tc-label-row">
        <label className="tc-label" htmlFor={id}>
          {label}
        </label>

        {suffix && <span className="tc-field-unit">{suffix}</span>}
      </div>

      <input
        id={id}
        className="tc-input"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
      />

      {hint && <p className="tc-hint">{hint}</p>}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();

  return (
    <div className="tc-field">
      <div className="tc-label-row">
        <label className="tc-label" htmlFor={id}>
          {label}
        </label>
      </div>

      <input
        id={id}
        className="tc-input"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <div className="tc-field">
      <div className="tc-label-row">
        <label className="tc-label" htmlFor={id}>
          {label}
        </label>
      </div>

      <select
        id={id}
        className="tc-input tc-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

function Switch({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}) {
  const id = useId();

  return (
    <label className="tc-switch-row" htmlFor={id}>
      <span className="tc-switch-copy">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>

      <input
        id={id}
        className="tc-switch-native"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />

      <span className="tc-switch-track" aria-hidden="true">
        <span />
      </span>
    </label>
  );
}

/* =========================================================
   Main component
========================================================= */

export default function TokenCostCalculator() {
  const [v, setV] = useState<Values>({ ...DEFAULTS });
  const [copied, setCopied] = useState(false);

  function update<K extends ValueKey>(key: K, value: Values[K]) {
    setV((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  /* =======================================================
     Calculations
  ======================================================= */

  const calculations = useMemo(() => {
    const charsPerToken = Math.max(0.1, safe(v.charsPerToken, 4));

    const inputTokenCount =
      v.inputMode === "characters"
        ? Math.ceil(safe(v.promptChars) / charsPerToken)
        : integer(v.inputTokens);

    const outputTokenCount =
      v.inputMode === "characters"
        ? Math.ceil(safe(v.outputChars) / charsPerToken)
        : integer(v.outputTokens);

    const audioInputTokenCount = integer(v.audioInputTokens);
    const audioOutputTokenCount = integer(v.audioOutputTokens);
    const embeddingTokenCount = integer(v.embeddingTokens);

    const imageCount = integer(v.imagesPerRequest);
    const toolCallCount = integer(v.toolCalls);

    const cacheRatio = Math.min(100, safe(v.cachePercent)) / 100;
    const retryRatio = Math.min(100, safe(v.retryPercent)) / 100;

    const cachedInputTokens = inputTokenCount * cacheRatio;
    const regularInputTokens = inputTokenCount - cachedInputTokens;

    const standardInputCost =
      (regularInputTokens * safe(v.inputRate)) / 1_000_000;

    const cachedInputCost =
      (cachedInputTokens * safe(v.cachedInputRate)) / 1_000_000;

    const outputCost =
      (outputTokenCount * safe(v.outputRate)) / 1_000_000;

    const textCost =
      standardInputCost + cachedInputCost + outputCost;

    const imageCost = imageCount * safe(v.imagePrice);

    const audioInputCost =
      (audioInputTokenCount * safe(v.audioInputRate)) / 1_000_000;

    const audioOutputCost =
      (audioOutputTokenCount * safe(v.audioOutputRate)) / 1_000_000;

    const audioCost = audioInputCost + audioOutputCost;

    const videoCost =
      safe(v.videoMinutes) * safe(v.videoPricePerMinute);

    const embeddingCost =
      (embeddingTokenCount * safe(v.embeddingRate)) / 1_000_000;

    const toolCost =
      (toolCallCount * safe(v.toolPricePerThousand)) / 1000;

    const extraCost = safe(v.extraCostPerRequest);

    const nonTextCost =
      imageCost +
      audioCost +
      videoCost +
      embeddingCost +
      toolCost +
      extraCost;

    const baseRequestCost = textCost + nonTextCost;

    // Retry percentage represents additional average billed attempts.
    // Example: 10% retry overhead = 1.1 attempts per application request.
    const attemptsPerRequest = 1 + retryRatio;

    const effectiveRequestCost =
      baseRequestCost * attemptsPerRequest;

    const requests = integer(v.monthlyRequests);
    const days = Math.max(1, Math.min(31, integer(v.daysPerMonth, 30)));

    const monthlyCost = effectiveRequestCost * requests;
    const dailyCost = monthlyCost / days;
    const yearlyCost = monthlyCost * 12;

    const monthlyAttempts = requests * attemptsPerRequest;

    const monthlyInputTokens = inputTokenCount * monthlyAttempts;
    const monthlyOutputTokens = outputTokenCount * monthlyAttempts;

    const monthlyAudioInputTokens =
      audioInputTokenCount * monthlyAttempts;

    const monthlyAudioOutputTokens =
      audioOutputTokenCount * monthlyAttempts;

    const monthlyEmbeddingTokens =
      embeddingTokenCount * monthlyAttempts;

    const monthlyImages = imageCount * monthlyAttempts;

    const monthlyVideoMinutes =
      safe(v.videoMinutes) * monthlyAttempts;

    const monthlyToolCalls = toolCallCount * monthlyAttempts;

    const budget = safe(v.budget);

    const budgetUsage =
      budget > 0 ? (monthlyCost / budget) * 100 : 0;

    const budgetRemaining = budget - monthlyCost;

    const costPerThousandRequests = effectiveRequestCost * 1000;
    const costPerMillionRequests = effectiveRequestCost * 1_000_000;

    /* Alternative model comparison.
       The alternative model has its own input, output and cached
       input rates. Other usage charges remain unchanged.
    */

    const alternativeStandardInputCost =
      (regularInputTokens * safe(v.comparisonInputRate)) / 1_000_000;

    const alternativeCachedInputCost =
      (cachedInputTokens * safe(v.comparisonCachedInputRate)) /
      1_000_000;

    const alternativeOutputCost =
      (outputTokenCount * safe(v.comparisonOutputRate)) / 1_000_000;

    const alternativeTextCost =
      alternativeStandardInputCost +
      alternativeCachedInputCost +
      alternativeOutputCost;

    const alternativeRequestCost =
      (alternativeTextCost + nonTextCost) * attemptsPerRequest;

    const alternativeMonthlyCost =
      alternativeRequestCost * requests;

    const comparisonDifference =
      monthlyCost - alternativeMonthlyCost;

    const comparisonDifferencePercent =
      monthlyCost > 0
        ? (comparisonDifference / monthlyCost) * 100
        : 0;

    return {
      inputTokenCount,
      outputTokenCount,
      audioInputTokenCount,
      audioOutputTokenCount,
      embeddingTokenCount,

      cachedInputTokens,
      regularInputTokens,

      standardInputCost,
      cachedInputCost,
      outputCost,
      textCost,

      imageCost,
      audioInputCost,
      audioOutputCost,
      audioCost,
      videoCost,
      embeddingCost,
      toolCost,
      extraCost,
      nonTextCost,

      baseRequestCost,
      effectiveRequestCost,
      attemptsPerRequest,

      monthlyCost,
      dailyCost,
      yearlyCost,
      monthlyAttempts,

      monthlyInputTokens,
      monthlyOutputTokens,
      monthlyAudioInputTokens,
      monthlyAudioOutputTokens,
      monthlyEmbeddingTokens,
      monthlyImages,
      monthlyVideoMinutes,
      monthlyToolCalls,

      budgetUsage,
      budgetRemaining,

      costPerThousandRequests,
      costPerMillionRequests,

      alternativeStandardInputCost,
      alternativeCachedInputCost,
      alternativeOutputCost,
      alternativeTextCost,
      alternativeRequestCost,
      alternativeMonthlyCost,
      comparisonDifference,
      comparisonDifferencePercent,

      requests,
      days,
    };
  }, [v]);

  /* =======================================================
     Presets and reset
  ======================================================= */

  function applyPreset(index: number) {
    const preset = PRESETS[index];
    if (!preset) return;

    setV((previous) => ({
      ...previous,
      inputRate: preset.input,
      outputRate: preset.output,
      cachedInputRate: preset.cached,
    }));
  }

  function reset() {
    setV({ ...DEFAULTS });
    setCopied(false);
  }

  /* =======================================================
     Complete report
  ======================================================= */

  const report = useMemo(() => {
    const lines = [
      "AI API COST ESTIMATE",
      "========================================",
      `Provider: ${v.provider || "Not specified"}`,
      `Model: ${v.model || "Not specified"}`,
      `Currency: ${v.currency}`,
      `Input mode: ${v.inputMode}`,
      "",
      "TEXT USAGE",
      `Prompt characters: ${v.promptChars}`,
      `Output characters: ${v.outputChars}`,
      `Characters per token: ${v.charsPerToken}`,
      `Input tokens per request: ${calculations.inputTokenCount}`,
      `Output tokens per request: ${calculations.outputTokenCount}`,
      `Regular input tokens: ${formatNumber(calculations.regularInputTokens, 2)}`,
      `Cached input tokens: ${formatNumber(calculations.cachedInputTokens, 2)}`,
      "",
      "TEXT PRICING",
      `Input price per 1M: ${formatCurrency(v.inputRate, v.currency)}`,
      `Output price per 1M: ${formatCurrency(v.outputRate, v.currency)}`,
      `Cached input price per 1M: ${formatCurrency(v.cachedInputRate, v.currency)}`,
      `Cache percentage: ${v.cachePercent}%`,
      "",
      "OTHER USAGE",
      `Images per request: ${v.imagesPerRequest}`,
      `Image price per image: ${formatCurrency(v.imagePrice, v.currency)}`,
      `Audio input tokens: ${v.audioInputTokens}`,
      `Audio output tokens: ${v.audioOutputTokens}`,
      `Audio input rate per 1M: ${formatCurrency(v.audioInputRate, v.currency)}`,
      `Audio output rate per 1M: ${formatCurrency(v.audioOutputRate, v.currency)}`,
      `Video minutes per request: ${v.videoMinutes}`,
      `Video price per minute: ${formatCurrency(v.videoPricePerMinute, v.currency)}`,
      `Embedding tokens per request: ${v.embeddingTokens}`,
      `Embedding rate per 1M: ${formatCurrency(v.embeddingRate, v.currency)}`,
      `Tool calls per request: ${v.toolCalls}`,
      `Tool price per 1,000 calls: ${formatCurrency(v.toolPricePerThousand, v.currency)}`,
      `Other cost per request: ${formatCurrency(v.extraCostPerRequest, v.currency)}`,
      "",
      "PER-REQUEST COST BREAKDOWN",
      `Standard input: ${formatCurrency(calculations.standardInputCost, v.currency)}`,
      `Cached input: ${formatCurrency(calculations.cachedInputCost, v.currency)}`,
      `Text output: ${formatCurrency(calculations.outputCost, v.currency)}`,
      `Images: ${formatCurrency(calculations.imageCost, v.currency)}`,
      `Audio input: ${formatCurrency(calculations.audioInputCost, v.currency)}`,
      `Audio output: ${formatCurrency(calculations.audioOutputCost, v.currency)}`,
      `Video: ${formatCurrency(calculations.videoCost, v.currency)}`,
      `Embeddings: ${formatCurrency(calculations.embeddingCost, v.currency)}`,
      `Tools: ${formatCurrency(calculations.toolCost, v.currency)}`,
      `Additional charges: ${formatCurrency(calculations.extraCost, v.currency)}`,
      `Base request cost: ${formatCurrency(calculations.baseRequestCost, v.currency)}`,
      `Effective request cost: ${formatCurrency(calculations.effectiveRequestCost, v.currency)}`,
      "",
      "MONTHLY COST SUMMARY",
      `Monthly requests: ${calculations.requests}`,
      `Days per month: ${calculations.days}`,
      `Retry overhead: ${v.retryPercent}%`,
      `Average attempts per request: ${formatNumber(calculations.attemptsPerRequest, 2)}`,
      `Monthly API attempts: ${formatNumber(calculations.monthlyAttempts, 2)}`,
      `Monthly cost: ${formatCurrency(calculations.monthlyCost, v.currency)}`,
      `Daily average: ${formatCurrency(calculations.dailyCost, v.currency)}`,
      `Yearly projection: ${formatCurrency(calculations.yearlyCost, v.currency)}`,
      `Cost per 1,000 requests: ${formatCurrency(calculations.costPerThousandRequests, v.currency)}`,
      `Cost per 1 million requests: ${formatCurrency(calculations.costPerMillionRequests, v.currency)}`,
      "",
      "MONTHLY USAGE VOLUME",
      `Text input tokens: ${formatNumber(calculations.monthlyInputTokens, 0)}`,
      `Text output tokens: ${formatNumber(calculations.monthlyOutputTokens, 0)}`,
      `Audio input tokens: ${formatNumber(calculations.monthlyAudioInputTokens, 0)}`,
      `Audio output tokens: ${formatNumber(calculations.monthlyAudioOutputTokens, 0)}`,
      `Embedding tokens: ${formatNumber(calculations.monthlyEmbeddingTokens, 0)}`,
      `Images: ${formatNumber(calculations.monthlyImages, 2)}`,
      `Video minutes: ${formatNumber(calculations.monthlyVideoMinutes, 2)}`,
      `Tool calls: ${formatNumber(calculations.monthlyToolCalls, 2)}`,
      "",
      "BUDGET",
      `Monthly budget: ${formatCurrency(v.budget, v.currency)}`,
      `Budget usage: ${formatNumber(calculations.budgetUsage, 2)}%`,
      `Budget remaining: ${formatCurrency(calculations.budgetRemaining, v.currency)}`,
    ];

    if (v.comparisonEnabled) {
      lines.push(
        "",
        "ALTERNATIVE MODEL COMPARISON",
        `Alternative model: ${v.comparisonModel || "Alternative model"}`,
        `Alternative input rate per 1M: ${formatCurrency(v.comparisonInputRate, v.currency)}`,
        `Alternative cached input rate per 1M: ${formatCurrency(v.comparisonCachedInputRate, v.currency)}`,
        `Alternative output rate per 1M: ${formatCurrency(v.comparisonOutputRate, v.currency)}`,
        `Alternative monthly cost: ${formatCurrency(calculations.alternativeMonthlyCost, v.currency)}`,
        `Difference: ${formatCurrency(calculations.comparisonDifference, v.currency)}`,
        `Difference percentage: ${formatNumber(calculations.comparisonDifferencePercent, 2)}%`,
      );
    }

    lines.push(
      "",
      "IMPORTANT",
      "All prices are user-entered estimates. Verify provider billing rules,",
      "current rates, token counts, cached-token eligibility and actual usage.",
      "Currency selection changes the display symbol only; it does not convert rates.",
    );

    return lines.join("\n");
  }, [v, calculations]);

  async function copyReport() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is unavailable");
      }

      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const symbol = CURRENCY_SYMBOLS[v.currency];

  return (
    <ToolShell title="AI API Cost Planner Pro" onReset={reset} wide>
      <div className="token-pro">
        <style jsx global>{`
          .token-pro {
            --accent: #ff5a1f;
            --navy: #172033;
            --muted: #788397;
            --border: #e5eaf2;
            width: 100%;
            min-width: 0;
            color: var(--navy);
            box-sizing: border-box;
            font-family: inherit;
          }

          .token-pro *,
          .token-pro *::before,
          .token-pro *::after {
            box-sizing: border-box;
          }

          .tc-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(310px, 370px);
            gap: 20px;
            align-items: start;
          }

          .tc-main,
          .tc-sidebar {
            display: flex;
            flex-direction: column;
            gap: 16px;
            min-width: 0;
          }

          .tc-sidebar {
            position: sticky;
            top: 18px;
          }

          .tc-card {
            background: linear-gradient(180deg, #fff 0%, #fcfdff 100%);
            border: 1px solid var(--border);
            border-radius: 18px;
            padding: 22px;
            box-shadow: 0 5px 18px rgba(15, 23, 42, 0.035);
            min-width: 0;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }

          .tc-card:hover {
            border-color: #d5dfed;
            box-shadow: 0 9px 26px rgba(15, 23, 42, 0.055);
          }

          .tc-heading {
            font-size: 16px;
            font-weight: 760;
            margin: 0 0 6px;
            color: var(--navy);
            letter-spacing: -0.025em;
          }

          .tc-subheading {
            font-size: 12px;
            font-weight: 800;
            margin: 20px 0 12px;
            color: var(--navy);
          }

          .tc-description {
            color: #64748b;
            font-size: 13px;
            line-height: 1.7;
            margin: 0 0 18px;
          }

          .tc-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 17px 15px;
            align-items: start;
          }

          .tc-field {
            display: grid;
            grid-template-rows: 32px 46px minmax(18px, auto);
            align-content: start;
            min-width: 0;
          }

          .tc-label-row {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 8px;
            min-width: 0;
            margin: 0;
          }

          .tc-label {
            display: flex;
            align-items: flex-end;
            min-width: 0;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.01em;
            color: #475569;
            margin: 0 0 8px;
            line-height: 1.35;
          }

          .tc-field-unit {
            flex: 0 0 auto;
            color: #8492a6;
            font-size: 10px;
            font-weight: 700;
            line-height: 1.35;
            margin: 0 0 9px;
            white-space: nowrap;
          }

          .tc-input {
            display: block;
            width: 100%;
            min-width: 0;
            height: 46px;
            padding: 0 13px;
            border: 1px solid #d8e0eb;
            border-radius: 11px;
            background: #fff;
            color: #172033;
            font-size: 14px;
            font-family: inherit;
            font-weight: 550;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
            outline: none;
            transition:
              border-color 0.18s ease,
              box-shadow 0.18s ease,
              background 0.18s ease;
          }

          .tc-input:hover {
            border-color: #aebed2;
          }

          .tc-input:focus {
            outline: none;
            border-color: #ff5a1f;
            box-shadow: 0 0 0 4px rgba(255, 90, 31, 0.13);
          }

          .tc-input::placeholder {
            color: #94a3b8;
            font-weight: 450;
          }

          .tc-select {
            appearance: none;
            -webkit-appearance: none;
            cursor: pointer;
            padding-right: 38px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 13px center;
          }

          .tc-static {
            display: flex;
            align-items: center;
            color: #64748b;
            background: #f8fafc;
            font-size: 12px;
            font-weight: 600;
          }

          .tc-hint {
            color: #8492a6;
            font-size: 11px;
            line-height: 1.5;
            margin: 7px 0 0;
            min-height: 18px;
          }

          .tc-tabs {
            display: flex;
            gap: 6px;
            padding: 5px;
            background: #f2f4f7;
            border-radius: 11px;
            margin-bottom: 18px;
          }

          .tc-tab {
            flex: 1;
            min-width: 0;
            min-height: 40px;
            padding: 7px 10px;
            border: 0;
            background: transparent;
            border-radius: 8px;
            color: #697488;
            font-size: 11px;
            font-weight: 750;
            cursor: pointer;
            transition: 0.18s ease;
          }

          .tc-tab.active {
            background: #fff;
            color: var(--accent);
            box-shadow: 0 2px 6px rgba(16, 24, 40, 0.08);
          }

          .tc-preset-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 9px;
          }

          .tc-preset {
            min-height: 67px;
            padding: 11px;
            border: 1px solid var(--border);
            background: #fff;
            border-radius: 11px;
            color: var(--navy);
            text-align: left;
            font-size: 11px;
            font-weight: 800;
            cursor: pointer;
            transition: 0.18s ease;
          }

          .tc-preset:hover {
            border-color: var(--accent);
            color: var(--accent);
            background: #fff8f4;
          }

          .tc-preset small {
            display: block;
            font-size: 10px;
            font-weight: 550;
            color: var(--muted);
            margin-top: 6px;
          }

          .tc-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 45px;
            padding: 10px 14px;
            width: 100%;
            border-radius: 10px;
            border: 1px solid #dce2eb;
            background: #fff;
            color: #344054;
            font-size: 12px;
            font-weight: 800;
            cursor: pointer;
            transition: 0.18s ease;
          }

          .tc-button:hover {
            border-color: var(--accent);
            color: var(--accent);
          }

          .tc-button.primary {
            color: #fff;
            border-color: var(--accent);
            background: linear-gradient(135deg, #ff6b35, #ff5a1f);
            box-shadow: 0 4px 12px rgba(255, 90, 31, 0.16);
          }

          .tc-button.primary:hover {
            background: #e94b13;
            color: #fff;
          }

          .tc-button-row {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
            margin-top: 15px;
          }

          .tc-hero {
            padding: 22px;
            border-radius: 14px;
            background: linear-gradient(135deg, #202c43, #111a2c);
            color: #fff;
          }

          .tc-hero-label {
            color: #c1c9d7;
            font-size: 11px;
            font-weight: 700;
          }

          .tc-hero-value {
            display: block;
            font-size: clamp(27px, 4vw, 36px);
            font-weight: 850;
            letter-spacing: -1.3px;
            margin: 9px 0 7px;
            overflow-wrap: anywhere;
          }

          .tc-hero-sub {
            color: #bdc7d8;
            font-size: 11px;
            line-height: 1.6;
          }

          .tc-stat-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
            margin-top: 13px;
          }

          .tc-stat {
            padding: 13px;
            background: #f7f8fa;
            border: 1px solid #edf0f4;
            border-radius: 11px;
            min-width: 0;
          }

          .tc-stat-label {
            display: block;
            font-size: 10px;
            color: var(--muted);
            margin-bottom: 7px;
          }

          .tc-stat-value {
            display: block;
            font-size: 16px;
            font-weight: 850;
            overflow-wrap: anywhere;
          }

          .tc-breakdown {
            display: grid;
            gap: 13px;
          }

          .tc-break-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            font-size: 11px;
          }

          .tc-break-row span:first-child {
            color: #707b8e;
          }

          .tc-break-row strong {
            text-align: right;
            font-weight: 800;
            overflow-wrap: anywhere;
          }

          .tc-divider {
            height: 1px;
            background: #edf0f4;
            margin: 2px 0;
          }

          .tc-total {
            padding: 13px;
            background: #fff7f3;
            border: 1px solid #ffe2d6;
            border-radius: 10px;
          }

          .tc-total .tc-break-row span,
          .tc-total .tc-break-row strong {
            color: #b54b23;
            font-weight: 850;
          }

          .tc-budget-track {
            height: 9px;
            border-radius: 30px;
            background: #edf0f4;
            overflow: hidden;
            margin: 12px 0;
          }

          .tc-budget-fill {
            height: 100%;
            border-radius: inherit;
            background: var(--accent);
            transition: width 0.2s ease;
          }

          .tc-budget-fill.over {
            background: #d92d20;
          }

          .tc-budget-meta {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            color: var(--muted);
            font-size: 10px;
          }

          .tc-note {
            background: #fff8f4;
            border: 1px solid #ffe2d5;
            border-radius: 10px;
            padding: 13px;
            color: #85462f;
            font-size: 11px;
            line-height: 1.7;
          }

          .tc-info {
            background: #f4f7fb;
            border: 1px solid #e5ebf3;
            border-radius: 10px;
            padding: 13px;
            color: #586579;
            font-size: 11px;
            line-height: 1.7;
          }

          .tc-provider-tag {
            display: inline-flex;
            align-items: center;
            padding: 5px 9px;
            background: #fff1e9;
            color: #bd4d22;
            border-radius: 30px;
            font-size: 10px;
            font-weight: 850;
            margin-bottom: 11px;
          }

          .tc-summary-list {
            display: grid;
            gap: 11px;
          }

          .tc-summary-item {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 10px;
            font-size: 11px;
          }

          .tc-summary-item span {
            color: var(--muted);
          }

          .tc-summary-item strong {
            text-align: right;
            overflow-wrap: anywhere;
          }

          .tc-switch-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            cursor: pointer;
            padding: 12px 0;
          }

          .tc-switch-copy {
            display: grid;
            gap: 4px;
          }

          .tc-switch-copy strong {
            font-size: 12px;
            color: var(--navy);
          }

          .tc-switch-copy small {
            font-size: 10px;
            color: var(--muted);
            line-height: 1.5;
          }

          .tc-switch-native {
            position: absolute;
            width: 1px;
            height: 1px;
            opacity: 0;
            pointer-events: none;
          }

          .tc-switch-track {
            width: 42px;
            height: 24px;
            flex: 0 0 42px;
            border-radius: 30px;
            padding: 3px;
            background: #d5dbe5;
            transition: background 0.2s ease;
          }

          .tc-switch-track span {
            display: block;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #fff;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            transition: transform 0.2s ease;
          }

          .tc-switch-native:checked + .tc-switch-track {
            background: var(--accent);
          }

          .tc-switch-native:checked + .tc-switch-track span {
            transform: translateX(18px);
          }

          .tc-switch-native:focus-visible + .tc-switch-track {
            outline: 3px solid rgba(255, 90, 31, 0.2);
            outline-offset: 3px;
          }

          .tc-positive {
            color: #167647;
          }

          .tc-negative {
            color: #b42318;
          }

          @media (max-width: 1050px) {
            .tc-layout {
              grid-template-columns: minmax(0, 1fr);
            }

            .tc-sidebar {
              position: static;
            }
          }

          @media (max-width: 600px) {
            .tc-card {
              padding: 17px;
              border-radius: 15px;
            }

            .tc-grid {
              grid-template-columns: minmax(0, 1fr);
              gap: 14px;
            }

            .tc-preset-grid {
              grid-template-columns: 1fr;
            }

            .tc-button-row {
              grid-template-columns: 1fr;
            }

            .tc-hero-value {
              font-size: 28px;
            }

            .tc-tabs {
              flex-direction: column;
            }

            .tc-tab {
              width: 100%;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .token-pro * {
              transition: none !important;
              scroll-behavior: auto !important;
            }
          }
        `}</style>

        <div className="tc-layout">
          {/* =================================================
              LEFT SIDE: INPUT CONFIGURATION
          ================================================= */}

          <main className="tc-main">
            {/* Provider and model */}

            <section className="tc-card">
              <h3 className="tc-heading">Provider and model details</h3>

              <p className="tc-description">
                Enter the provider, model and currency used for this estimate.
                You can use any provider or custom pricing structure.
              </p>

              <div className="tc-grid">
                <TextInput
                  label="AI provider"
                  value={v.provider}
                  onChange={(value) => update("provider", value)}
                  placeholder="e.g. OpenAI, Anthropic, Google"
                />

                <TextInput
                  label="Model name"
                  value={v.model}
                  onChange={(value) => update("model", value)}
                  placeholder="Enter model name"
                />

                <SelectInput
                  label="Currency"
                  value={v.currency}
                  onChange={(value) => update("currency", value as Currency)}
                >
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="EUR">EUR - Euro (€)</option>
                  <option value="GBP">GBP - British Pound (£)</option>
                  <option value="INR">INR - Indian Rupee (₹)</option>
                </SelectInput>

                <div className="tc-field">
                  <div className="tc-label-row">
                    <label className="tc-label">Pricing convention</label>
                  </div>
                  <div className="tc-input tc-static">
                    Per million tokens / applicable unit
                  </div>
                </div>
              </div>

              <div className="tc-info" style={{ marginTop: 15 }}>
                Currency selection changes the display symbol only. It does
                not convert prices using live exchange rates. Enter all rates
                in the selected currency.
              </div>
            </section>

            {/* Text tokens */}

            <section className="tc-card">
              <h3 className="tc-heading">Text token usage</h3>

              <p className="tc-description">
                Estimate text tokens from character counts or enter exact token
                counts from your API usage data.
              </p>

              <div className="tc-tabs">
                <button
                  type="button"
                  className={`tc-tab ${
                    v.inputMode === "characters" ? "active" : ""
                  }`}
                  onClick={() => update("inputMode", "characters")}
                >
                  Estimate from characters
                </button>

                <button
                  type="button"
                  className={`tc-tab ${
                    v.inputMode === "tokens" ? "active" : ""
                  }`}
                  onClick={() => update("inputMode", "tokens")}
                >
                  Enter exact tokens
                </button>
              </div>

              {v.inputMode === "characters" ? (
                <div className="tc-grid">
                  <NumericInput
                    label="Prompt characters"
                    value={v.promptChars}
                    onChange={(value) => update("promptChars", value)}
                    step={1}
                    suffix="chars"
                    hint="Include system instructions, conversation history and user messages."
                  />

                  <NumericInput
                    label="Expected response characters"
                    value={v.outputChars}
                    onChange={(value) => update("outputChars", value)}
                    step={1}
                    suffix="chars"
                    hint="Expected length of the generated response."
                  />

                  <NumericInput
                    label="Characters per token"
                    value={v.charsPerToken}
                    onChange={(value) => update("charsPerToken", value)}
                    min={0.1}
                    step={0.1}
                    hint="A rough estimate. Actual tokenization depends on the language and tokenizer."
                  />
                </div>
              ) : (
                <div className="tc-grid">
                  <NumericInput
                    label="Input tokens per request"
                    value={v.inputTokens}
                    onChange={(value) => update("inputTokens", value)}
                    step={1}
                    suffix="tokens"
                    hint="Total prompt, system and conversation-context tokens."
                  />

                  <NumericInput
                    label="Output tokens per request"
                    value={v.outputTokens}
                    onChange={(value) => update("outputTokens", value)}
                    step={1}
                    suffix="tokens"
                    hint="Expected generated tokens per request."
                  />
                </div>
              )}

              <div className="tc-stat-grid">
                <div className="tc-stat">
                  <span className="tc-stat-label">Estimated input tokens</span>
                  <strong className="tc-stat-value">
                    {calculations.inputTokenCount.toLocaleString()}
                  </strong>
                </div>

                <div className="tc-stat">
                  <span className="tc-stat-label">Estimated output tokens</span>
                  <strong className="tc-stat-value">
                    {calculations.outputTokenCount.toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="tc-note" style={{ marginTop: 15 }}>
                <strong>Token estimation limitation:</strong> Character
                conversion is approximate. English, code, non-English
                languages, punctuation and model tokenizers can produce
                different token counts. Exact API-reported token counts are
                preferable.
              </div>
            </section>

            {/* Text pricing */}

            <section className="tc-card">
              <h3 className="tc-heading">Text API pricing</h3>

              <p className="tc-description">
                Enter your provider&apos;s prices per one million text tokens.
              </p>

              <div className="tc-grid">
                <NumericInput
                  label="Input price"
                  value={v.inputRate}
                  onChange={(value) => update("inputRate", value)}
                  suffix={`${symbol} / 1M`}
                  hint="Standard input token rate."
                />

                <NumericInput
                  label="Output price"
                  value={v.outputRate}
                  onChange={(value) => update("outputRate", value)}
                  suffix={`${symbol} / 1M`}
                  hint="Generated output token rate."
                />

                <NumericInput
                  label="Cached input price"
                  value={v.cachedInputRate}
                  onChange={(value) => update("cachedInputRate", value)}
                  suffix={`${symbol} / 1M`}
                  hint="Discounted cached input rate."
                />

                <NumericInput
                  label="Cached input percentage"
                  value={v.cachePercent}
                  onChange={(value) =>
                    update("cachePercent", Math.min(100, safe(value)))
                  }
                  max={100}
                  suffix="%"
                  hint="Share of input tokens assumed to receive the cached rate."
                />
              </div>

              <h4 className="tc-subheading">Example pricing presets</h4>

              <div className="tc-preset-grid">
                {PRESETS.map((preset, index) => (
                  <button
                    type="button"
                    key={preset.label}
                    className="tc-preset"
                    onClick={() => applyPreset(index)}
                  >
                    {preset.label}
                    <small>
                      {symbol}
                      {preset.input} input · {symbol}
                      {preset.output} output
                    </small>
                  </button>
                ))}
              </div>

              <p className="tc-hint" style={{ marginTop: 10 }}>
                Presets are illustrative only. They are not live prices or
                verified prices for a particular provider or model.
              </p>
            </section>

            {/* Image usage */}

            <section className="tc-card">
              <h3 className="tc-heading">Image usage and generation</h3>

              <p className="tc-description">
                Estimate image-related costs using a per-image price. This can
                represent image generation or image processing, depending on
                the price you enter.
              </p>

              <div className="tc-grid">
                <NumericInput
                  label="Images per API request"
                  value={v.imagesPerRequest}
                  onChange={(value) => update("imagesPerRequest", integer(value))}
                  step={1}
                  suffix="images"
                  hint="Average number of billable images per application request."
                />

                <NumericInput
                  label="Price per image"
                  value={v.imagePrice}
                  onChange={(value) => update("imagePrice", value)}
                  suffix={symbol}
                  hint="Enter the applicable cost for one image."
                />
              </div>

              <div className="tc-info" style={{ marginTop: 14 }}>
                Image pricing can depend on resolution, quality, dimensions,
                input-image processing and provider-specific billing units.
                Use the effective price for your chosen image operation.
              </div>
            </section>

            {/* Audio usage */}

            <section className="tc-card">
              <h3 className="tc-heading">Audio usage</h3>

              <p className="tc-description">
                Estimate audio input and output when your provider bills these
                operations by audio tokens.
              </p>

              <div className="tc-grid">
                <NumericInput
                  label="Audio input tokens"
                  value={v.audioInputTokens}
                  onChange={(value) => update("audioInputTokens", integer(value))}
                  step={1}
                  suffix="tokens"
                />

                <NumericInput
                  label="Audio output tokens"
                  value={v.audioOutputTokens}
                  onChange={(value) => update("audioOutputTokens", integer(value))}
                  step={1}
                  suffix="tokens"
                />

                <NumericInput
                  label="Audio input rate"
                  value={v.audioInputRate}
                  onChange={(value) => update("audioInputRate", value)}
                  suffix={`${symbol} / 1M`}
                  hint="Price per million audio input tokens."
                />

                <NumericInput
                  label="Audio output rate"
                  value={v.audioOutputRate}
                  onChange={(value) => update("audioOutputRate", value)}
                  suffix={`${symbol} / 1M`}
                  hint="Price per million audio output tokens."
                />
              </div>

              <div className="tc-info" style={{ marginTop: 14 }}>
                Some audio APIs bill by minute, character, second or task rather
                than tokens. If your provider uses a different unit, convert
                your expected usage into an equivalent cost and enter it under
                additional charges.
              </div>
            </section>

            {/* Video usage */}

            <section className="tc-card">
              <h3 className="tc-heading">Video processing</h3>

              <p className="tc-description">
                Estimate video-related processing costs using a per-minute
                rate.
              </p>

              <div className="tc-grid">
                <NumericInput
                  label="Video minutes per request"
                  value={v.videoMinutes}
                  onChange={(value) => update("videoMinutes", value)}
                  suffix="minutes"
                  step={0.1}
                />

                <NumericInput
                  label="Price per video minute"
                  value={v.videoPricePerMinute}
                  onChange={(value) => update("videoPricePerMinute", value)}
                  suffix={`${symbol} / min`}
                />
              </div>

              <p className="tc-hint" style={{ marginTop: 10 }}>
                Use this for a provider&apos;s per-minute processing charge. If
                video is billed by frames, tokens or another unit, convert the
                usage to its equivalent price first.
              </p>
            </section>

            {/* Embeddings */}

            <section className="tc-card">
              <h3 className="tc-heading">Embedding usage</h3>

              <p className="tc-description">
                Calculate embedding API costs independently from normal
                conversational input tokens.
              </p>

              <div className="tc-grid">
                <NumericInput
                  label="Embedding tokens per request"
                  value={v.embeddingTokens}
                  onChange={(value) => update("embeddingTokens", integer(value))}
                  step={1}
                  suffix="tokens"
                />

                <NumericInput
                  label="Embedding price"
                  value={v.embeddingRate}
                  onChange={(value) => update("embeddingRate", value)}
                  suffix={`${symbol} / 1M`}
                  hint="Price per million embedding tokens."
                />
              </div>
            </section>

            {/* Tools */}

            <section className="tc-card">
              <h3 className="tc-heading">Tool calls and web search</h3>

              <p className="tc-description">
                Add separate charges for tool calls, web search or other
                metered operations.
              </p>

              <div className="tc-grid">
                <NumericInput
                  label="Billable tool calls per request"
                  value={v.toolCalls}
                  onChange={(value) => update("toolCalls", integer(value))}
                  step={1}
                  suffix="calls"
                />

                <NumericInput
                  label="Price per 1,000 tool calls"
                  value={v.toolPricePerThousand}
                  onChange={(value) =>
                    update("toolPricePerThousand", value)
                  }
                  suffix={`${symbol} / 1K`}
                />
              </div>

              <div className="tc-info" style={{ marginTop: 14 }}>
                Use this section for separately billed calls. Do not add a
                charge here if the same operation is already included in
                another entered price.
              </div>
            </section>

            {/* Monthly planning */}

            <section className="tc-card">
              <h3 className="tc-heading">Monthly usage and budget planning</h3>

              <p className="tc-description">
                Set your expected application traffic, retries and spending
                limit.
              </p>

              <div className="tc-grid">
                <NumericInput
                  label="Monthly application requests"
                  value={v.monthlyRequests}
                  onChange={(value) => update("monthlyRequests", integer(value))}
                  step={1}
                  hint="Expected application requests before retry overhead."
                />

                <NumericInput
                  label="Days per month"
                  value={v.daysPerMonth}
                  onChange={(value) =>
                    update(
                      "daysPerMonth",
                      Math.min(31, Math.max(1, integer(value, 30))),
                    )
                  }
                  min={1}
                  max={31}
                  step={1}
                />

                <NumericInput
                  label="Retry overhead"
                  value={v.retryPercent}
                  onChange={(value) =>
                    update("retryPercent", Math.min(100, safe(value)))
                  }
                  max={100}
                  suffix="%"
                  hint="Additional average billed attempts. 10% means 1.1 attempts per request."
                />

                <NumericInput
                  label="Monthly spending budget"
                  value={v.budget}
                  onChange={(value) => update("budget", value)}
                  suffix={symbol}
                  hint="Your target monthly spending limit."
                />

                <NumericInput
                  label="Additional cost per request"
                  value={v.extraCostPerRequest}
                  onChange={(value) => update("extraCostPerRequest", value)}
                  suffix={symbol}
                  hint="Any other per-request charge not included above."
                />
              </div>

              <div className="tc-note" style={{ marginTop: 15 }}>
                <strong>Retry assumption:</strong> The calculator applies
                retry overhead to the entire request cost, assuming each
                additional attempt repeats the same usage. Actual retry
                charges can differ when failed requests use fewer tokens or
                are not billed.
              </div>
            </section>

            {/* Model comparison */}

            <section className="tc-card">
              <h3 className="tc-heading">Compare another text model</h3>

              <p className="tc-description">
                Compare the text-token cost of an alternative model using the
                same input and output usage. Other usage charges remain
                unchanged in both estimates.
              </p>

              <Switch
                label="Enable model comparison"
                checked={v.comparisonEnabled}
                onChange={(checked) => update("comparisonEnabled", checked)}
                description="Show a second model estimate in the dashboard."
              />

              {v.comparisonEnabled && (
                <div className="tc-grid" style={{ marginTop: 12 }}>
                  <TextInput
                    label="Alternative model name"
                    value={v.comparisonModel}
                    onChange={(value) => update("comparisonModel", value)}
                  />

                  <div />

                  <NumericInput
                    label="Alternative input price"
                    value={v.comparisonInputRate}
                    onChange={(value) => update("comparisonInputRate", value)}
                    suffix={`${symbol} / 1M`}
                  />

                  <NumericInput
                    label="Alternative cached input price"
                    value={v.comparisonCachedInputRate}
                    onChange={(value) =>
                      update("comparisonCachedInputRate", value)
                    }
                    suffix={`${symbol} / 1M`}
                    hint="Cached input price for the alternative model."
                  />

                  <NumericInput
                    label="Alternative output price"
                    value={v.comparisonOutputRate}
                    onChange={(value) => update("comparisonOutputRate", value)}
                    suffix={`${symbol} / 1M`}
                  />
                </div>
              )}
            </section>

            {/* Methodology */}

            <section className="tc-card">
              <h3 className="tc-heading">Calculation methodology</h3>

              <div className="tc-summary-list">
                <div className="tc-summary-item">
                  <span>Standard text input</span>
                  <strong>Regular input tokens × input rate ÷ 1M</strong>
                </div>

                <div className="tc-summary-item">
                  <span>Cached text input</span>
                  <strong>Cached tokens × cached rate ÷ 1M</strong>
                </div>

                <div className="tc-summary-item">
                  <span>Text output</span>
                  <strong>Output tokens × output rate ÷ 1M</strong>
                </div>

                <div className="tc-summary-item">
                  <span>Image usage</span>
                  <strong>Images × price per image</strong>
                </div>

                <div className="tc-summary-item">
                  <span>Audio usage</span>
                  <strong>Audio input cost + audio output cost</strong>
                </div>

                <div className="tc-summary-item">
                  <span>Video usage</span>
                  <strong>Minutes × price per minute</strong>
                </div>

                <div className="tc-summary-item">
                  <span>Embedding usage</span>
                  <strong>Embedding tokens × rate ÷ 1M</strong>
                </div>

                <div className="tc-summary-item">
                  <span>Tool usage</span>
                  <strong>Calls × rate ÷ 1,000</strong>
                </div>

                <div className="tc-summary-item">
                  <span>Monthly estimate</span>
                  <strong>Effective request cost × monthly requests</strong>
                </div>
              </div>

              <div className="tc-info" style={{ marginTop: 15 }}>
                The calculator uses the pricing units described beside each
                input. It does not automatically fetch provider prices or
                tokenize text with a provider-specific tokenizer. Avoid
                entering the same usage charge in multiple sections.
              </div>
            </section>
          </main>

          {/* =================================================
              RIGHT SIDE: LIVE RESULTS
          ================================================= */}

          <aside className="tc-sidebar">
            {/* Main result */}

            <section className="tc-card">
              <div className="tc-provider-tag">LIVE COST ESTIMATE</div>

              <div className="tc-hero">
                <span className="tc-hero-label">
                  Estimated monthly API cost
                </span>

                <strong className="tc-hero-value">
                  {formatCurrency(calculations.monthlyCost, v.currency)}
                </strong>

                <span className="tc-hero-sub">
                  {calculations.requests.toLocaleString()} application
                  requests per month, including modeled retry overhead.
                </span>
              </div>

              <div className="tc-stat-grid">
                <div className="tc-stat">
                  <span className="tc-stat-label">Cost per request</span>
                  <strong className="tc-stat-value">
                    {formatCurrency(
                      calculations.effectiveRequestCost,
                      v.currency,
                    )}
                  </strong>
                </div>

                <div className="tc-stat">
                  <span className="tc-stat-label">Daily average</span>
                  <strong className="tc-stat-value">
                    {formatCurrency(calculations.dailyCost, v.currency)}
                  </strong>
                </div>

                <div className="tc-stat">
                  <span className="tc-stat-label">Yearly projection</span>
                  <strong className="tc-stat-value">
                    {formatCurrency(calculations.yearlyCost, v.currency)}
                  </strong>
                </div>

                <div className="tc-stat">
                  <span className="tc-stat-label">Per 1,000 requests</span>
                  <strong className="tc-stat-value">
                    {formatCurrency(
                      calculations.costPerThousandRequests,
                      v.currency,
                    )}
                  </strong>
                </div>

                <div className="tc-stat" style={{ gridColumn: "1 / -1" }}>
                  <span className="tc-stat-label">Per 1 million requests</span>
                  <strong className="tc-stat-value">
                    {formatCurrency(
                      calculations.costPerMillionRequests,
                      v.currency,
                    )}
                  </strong>
                </div>
              </div>
            </section>

            {/* Cost breakdown */}

            <section className="tc-card">
              <h3 className="tc-heading">Per-request cost breakdown</h3>

              <p className="tc-description">
                Detailed estimated charges before and after retry overhead.
              </p>

              <div className="tc-breakdown">
                <div className="tc-break-row">
                  <span>Standard text input</span>
                  <strong>
                    {formatCurrency(calculations.standardInputCost, v.currency)}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Cached text input</span>
                  <strong>
                    {formatCurrency(calculations.cachedInputCost, v.currency)}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Text output</span>
                  <strong>
                    {formatCurrency(calculations.outputCost, v.currency)}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Image usage</span>
                  <strong>
                    {formatCurrency(calculations.imageCost, v.currency)}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Audio input</span>
                  <strong>
                    {formatCurrency(calculations.audioInputCost, v.currency)}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Audio output</span>
                  <strong>
                    {formatCurrency(calculations.audioOutputCost, v.currency)}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Video usage</span>
                  <strong>
                    {formatCurrency(calculations.videoCost, v.currency)}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Embeddings</span>
                  <strong>
                    {formatCurrency(calculations.embeddingCost, v.currency)}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Tool calls</span>
                  <strong>
                    {formatCurrency(calculations.toolCost, v.currency)}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Additional charges</span>
                  <strong>
                    {formatCurrency(calculations.extraCost, v.currency)}
                  </strong>
                </div>

                <div className="tc-divider" />

                <div className="tc-break-row">
                  <span>Base request cost</span>
                  <strong>
                    {formatCurrency(calculations.baseRequestCost, v.currency)}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Retry overhead</span>
                  <strong>
                    {formatCurrency(
                      calculations.effectiveRequestCost -
                        calculations.baseRequestCost,
                      v.currency,
                    )}
                  </strong>
                </div>

                <div className="tc-total">
                  <div className="tc-break-row">
                    <span>Effective request total</span>
                    <strong>
                      {formatCurrency(
                        calculations.effectiveRequestCost,
                        v.currency,
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            {/* Budget tracker */}

            <section className="tc-card">
              <h3 className="tc-heading">Monthly budget tracker</h3>

              <p className="tc-description">
                Compare estimated spending with your budget.
              </p>

              <div className="tc-break-row">
                <span>Estimated spending</span>
                <strong>
                  {formatCurrency(calculations.monthlyCost, v.currency)}
                </strong>
              </div>

              <div className="tc-budget-track">
                <div
                  className={`tc-budget-fill ${
                    calculations.budgetUsage > 100 ? "over" : ""
                  }`}
                  style={{
                    width: `${Math.min(100, calculations.budgetUsage)}%`,
                  }}
                />
              </div>

              <div className="tc-budget-meta">
                <span>
                  {v.budget > 0
                    ? `${formatNumber(calculations.budgetUsage, 1)}% used`
                    : "No budget set"}
                </span>

                <span>
                  Budget: {formatCurrency(v.budget, v.currency)}
                </span>
              </div>

              <div
                className="tc-note"
                style={{
                  marginTop: 14,
                  background:
                    calculations.budgetUsage > 100
                      ? "#fff2f0"
                      : "#f3faf5",
                  borderColor:
                    calculations.budgetUsage > 100
                      ? "#ffd3cd"
                      : "#d9efdf",
                  color:
                    calculations.budgetUsage > 100
                      ? "#b42318"
                      : "#267044",
                }}
              >
                {v.budget <= 0
                  ? "Enter a positive monthly budget to track spending."
                  : calculations.budgetUsage > 100
                    ? `Estimated spending exceeds your budget by ${formatCurrency(
                        Math.abs(calculations.budgetRemaining),
                        v.currency,
                      )}.`
                    : `Estimated remaining budget: ${formatCurrency(
                        calculations.budgetRemaining,
                        v.currency,
                      )}.`}
              </div>
            </section>

            {/* Monthly volume */}

            <section className="tc-card">
              <h3 className="tc-heading">Monthly usage volume</h3>

              <p className="tc-description">
                Estimated usage including retry overhead.
              </p>

              <div className="tc-breakdown">
                <div className="tc-break-row">
                  <span>Text input tokens</span>
                  <strong>
                    {Math.round(calculations.monthlyInputTokens).toLocaleString()}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Text output tokens</span>
                  <strong>
                    {Math.round(calculations.monthlyOutputTokens).toLocaleString()}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Audio input tokens</span>
                  <strong>
                    {Math.round(calculations.monthlyAudioInputTokens).toLocaleString()}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Audio output tokens</span>
                  <strong>
                    {Math.round(calculations.monthlyAudioOutputTokens).toLocaleString()}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Embedding tokens</span>
                  <strong>
                    {Math.round(calculations.monthlyEmbeddingTokens).toLocaleString()}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Images</span>
                  <strong>{formatNumber(calculations.monthlyImages, 2)}</strong>
                </div>

                <div className="tc-break-row">
                  <span>Video minutes</span>
                  <strong>
                    {formatNumber(calculations.monthlyVideoMinutes, 2)}
                  </strong>
                </div>

                <div className="tc-break-row">
                  <span>Tool calls</span>
                  <strong>
                    {formatNumber(calculations.monthlyToolCalls, 2)}
                  </strong>
                </div>

                <div className="tc-divider" />

                <div className="tc-break-row">
                  <span>Total API attempts</span>
                  <strong>
                    {formatNumber(calculations.monthlyAttempts, 2)}
                  </strong>
                </div>
              </div>
            </section>

            {/* Model comparison */}

            {v.comparisonEnabled && (
              <section className="tc-card">
                <h3 className="tc-heading">Model cost comparison</h3>

                <p className="tc-description">
                  Same usage, alternative text pricing and unchanged non-text
                  costs.
                </p>

                <div className="tc-breakdown">
                  <div className="tc-break-row">
                    <span>Current model</span>
                    <strong>
                      {formatCurrency(calculations.monthlyCost, v.currency)}
                    </strong>
                  </div>

                  <div className="tc-break-row">
                    <span>{v.comparisonModel || "Alternative model"}</span>
                    <strong>
                      {formatCurrency(
                        calculations.alternativeMonthlyCost,
                        v.currency,
                      )}
                    </strong>
                  </div>

                  <div className="tc-divider" />

                  <div className="tc-break-row">
                    <span>
                      {calculations.comparisonDifference >= 0
                        ? "Potential monthly saving"
                        : "Additional monthly cost"}
                    </span>

                    <strong
                      className={
                        calculations.comparisonDifference >= 0
                          ? "tc-positive"
                          : "tc-negative"
                      }
                    >
                      {formatCurrency(
                        Math.abs(calculations.comparisonDifference),
                        v.currency,
                      )}
                    </strong>
                  </div>

                  <div className="tc-break-row">
                    <span>Difference percentage</span>
                    <strong>
                      {formatNumber(
                        Math.abs(calculations.comparisonDifferencePercent),
                        2,
                      )}
                      %
                    </strong>
                  </div>
                </div>

                <p className="tc-hint" style={{ marginTop: 12 }}>
                  This comparison uses separate input, cached-input and output
                  rates for the alternative model. Non-text charges are held
                  constant.
                </p>
              </section>
            )}

            {/* Summary */}

            <section className="tc-card">
              <h3 className="tc-heading">Estimate summary</h3>

              <div className="tc-summary-list">
                <div className="tc-summary-item">
                  <span>Provider</span>
                  <strong>{v.provider || "Not specified"}</strong>
                </div>

                <div className="tc-summary-item">
                  <span>Model</span>
                  <strong>{v.model || "Not specified"}</strong>
                </div>

                <div className="tc-summary-item">
                  <span>Input / output</span>
                  <strong>
                    {calculations.inputTokenCount.toLocaleString()} /{" "}
                    {calculations.outputTokenCount.toLocaleString()}
                  </strong>
                </div>

                <div className="tc-summary-item">
                  <span>Cache assumption</span>
                  <strong>{v.cachePercent}%</strong>
                </div>

                <div className="tc-summary-item">
                  <span>Retry overhead</span>
                  <strong>{v.retryPercent}%</strong>
                </div>

                <div className="tc-summary-item">
                  <span>Monthly requests</span>
                  <strong>{calculations.requests.toLocaleString()}</strong>
                </div>

                <div className="tc-summary-item">
                  <span>Monthly API attempts</span>
                  <strong>{formatNumber(calculations.monthlyAttempts, 2)}</strong>
                </div>
              </div>

              <button
                type="button"
                className="tc-button primary"
                style={{ marginTop: 18 }}
                onClick={() => void copyReport()}
              >
                {copied ? "Report copied!" : "Copy complete cost report"}
              </button>

              <div className="tc-button-row">
                <button
                  type="button"
                  className="tc-button"
                  onClick={() => void copyReport()}
                >
                  Copy estimate
                </button>

                <button
                  type="button"
                  className="tc-button"
                  onClick={reset}
                >
                  Reset calculator
                </button>
              </div>
            </section>

            <div className="tc-info">
              <strong>Important billing note:</strong> This is a configurable
              estimate, not an official provider invoice. Actual charges may
              vary due to tokenizer behavior, cached-token eligibility,
              image resolution, audio duration, video processing, billing
              tiers, failed requests, minimum charges, taxes and provider
              pricing rules. Verify your rates and usage against your
              provider&apos;s official pricing and billing records.
            </div>
          </aside>
        </div>
      </div>
    </ToolShell>
  );
}
