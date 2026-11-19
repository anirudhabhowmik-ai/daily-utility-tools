"use client";

import { useMemo, useState } from "react";
import ToolShell, { NumberField, Result } from "../ToolShell";

/* ------------------------------------------------------------------ */
/* Types and defaults                                                  */
/* ------------------------------------------------------------------ */

type Values = {
  stairs: number;
  tread: number;
  riser: number;
  stairWidth: number;
  nosing: number;

  landingRun: number;
  additionalLandingArea: number;

  rollWidth: number;
  seamAllowance: number;
  patternRepeat: number;
  patternCuts: number;

  waste: number;

  carpetPrice: number;
  paddingEnabled: boolean;
  paddingPrice: number;
  laborPerStep: number;
  laborPerSqFt: number;
  extraCost: number;
  taxRate: number;
  currency: string;
};

const DEFAULTS: Values = {
  stairs: 12,
  tread: 10,
  riser: 7.5,
  stairWidth: 36,
  nosing: 1,

  landingRun: 0,
  additionalLandingArea: 0,

  rollWidth: 144,
  seamAllowance: 2,
  patternRepeat: 0,
  patternCuts: 1,

  waste: 10,

  carpetPrice: 0,
  paddingEnabled: false,
  paddingPrice: 0,
  laborPerStep: 0,
  laborPerSqFt: 0,
  extraCost: 0,
  taxRate: 0,
  currency: "USD",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const fmt = (value: number, digits = 2) =>
  Number.isFinite(value)
    ? value.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "0.00";

const money = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${fmt(value)}`;
  }
};

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="sc-field">
      <span className="sc-label">{label}</span>
      <select
        className="sc-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function CustomField({
  hint,
  children,
}: {
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sc-field">
      {children}
      {hint && <span className="sc-field-hint">{hint}</span>}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div className={`sc-metric${accent ? " sc-accent" : ""}`}>
      <div className="sc-metric-label">{label}</div>
      <div className="sc-metric-value">{value}</div>
      {detail && <div className="sc-metric-detail">{detail}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const css = `
.sc-root {
  width: 100%;
  min-width: 0;
  color: #172033;
  font-family: inherit;
  container-type: inline-size;
}

.sc-root * {
  box-sizing: border-box;
}

.sc-intro {
  color: #64748b;
  font-size: 13px;
  line-height: 1.75;
  margin: 0 0 22px;
}

.sc-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.sc-main,
.sc-aside {
  display: flex;
  flex-direction: column;
  gap: 17px;
  min-width: 0;
}

/* PREMIUM SHADOW */
.sc-card {
  min-width: 0;
  padding: 22px;
  border: 1px solid #e5eaf2;
  border-radius: 17px;
  background: linear-gradient(180deg, #ffffff, #fcfdff);
  box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

.sc-card:hover {
  box-shadow: 0 20px 40px -5px rgba(15, 23, 42, 0.12), 0 8px 20px -2px rgba(15, 23, 42, 0.06);
  transform: translateY(-2px);
}

.sc-heading {
  margin: 0 0 6px;
  color: #172033;
  font-size: 16px;
  font-weight: 760;
  letter-spacing: -.025em;
}

.sc-description {
  margin: 0 0 19px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.7;
}

.sc-section-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  margin-right: 8px;
  border-radius: 8px;
  background: #fff0e9;
  color: #ed541e;
  font-size: 12px;
  font-weight: 800;
  vertical-align: middle;
}

.sc-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 17px 15px;
  align-items: start;
}

.sc-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.sc-label {
  min-height: 17px;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.sc-field-hint {
  font-size: 11px;
  color: #718096;
  line-height: 1.5;
  margin-top: 2px;
}

.sc-select {
  width: 100%;
  height: 46px;
  padding: 0 38px 0 13px;
  border: 1px solid #d8e0eb;
  border-radius: 11px;
  background-color: #fff;
  color: #172033;
  font-family: inherit;
  font-size: 14px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 13px center;
  transition: border-color .18s ease, box-shadow .18s ease;
}

.sc-select:focus {
  outline: none;
  border-color: #ff5a1f;
  box-shadow: 0 0 0 4px rgba(255, 90, 31, .12);
}

.sc-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: fit-content;
  margin: 2px 0 18px;
  color: #334155;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  user-select: none;
}

.sc-toggle input {
  appearance: none;
  position: relative;
  flex: 0 0 46px;
  width: 46px;
  height: 27px;
  margin: 0;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #e2e8f0;
  cursor: pointer;
  transition: background .2s ease, border-color .2s ease;
}

.sc-toggle input::before {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 4px rgba(15, 23, 42, .2);
  transition: transform .2s ease;
}

.sc-toggle input:checked {
  background: #ff5a1f;
  border-color: #ff5a1f;
}

.sc-toggle input:checked::before {
  transform: translateX(19px);
}

.sc-toggle input:focus-visible {
  outline: 3px solid rgba(255, 90, 31, .2);
  outline-offset: 3px;
}

.sc-hint {
  margin-top: 15px;
  padding: 12px 14px;
  border: 1px solid #e8edf4;
  border-radius: 11px;
  background: #f8fafc;
  color: #64748b;
  font-size: 11px;
  line-height: 1.7;
}

.sc-hint strong {
  color: #334155;
}

.sc-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 11px;
}

.sc-metric {
  min-width: 0;
  padding: 15px;
  border: 1px solid #e8edf4;
  border-radius: 13px;
  background: #f8fafc;
}

.sc-metric.sc-accent {
  border-color: #ffd1c0;
  background: linear-gradient(135deg, #fff2ec, #fffaf7);
}

.sc-metric-label {
  margin-bottom: 8px;
  color: #718096;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: .045em;
  text-transform: uppercase;
}

.sc-metric-value {
  color: #172033;
  font-size: 21px;
  font-weight: 820;
  line-height: 1.25;
  letter-spacing: -.035em;
  overflow-wrap: anywhere;
}

.sc-accent .sc-metric-value {
  color: #e94f18;
}

.sc-metric-detail {
  margin-top: 6px;
  color: #8290a3;
  font-size: 10px;
  line-height: 1.5;
}

.sc-breakdown-title {
  margin: 22px 0 8px;
  color: #172033;
  font-size: 14px;
  font-weight: 750;
}

.sc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #edf1f6;
  color: #475569;
  font-size: 12px;
}

.sc-row:last-child {
  border-bottom: none;
}

.sc-row strong {
  color: #1e293b;
  font-size: 13px;
  font-weight: 750;
  text-align: right;
}

.sc-row-total {
  margin-top: 5px;
  padding-top: 16px;
  border-top: 1px solid #e5eaf2;
  border-bottom: none;
}

.sc-row-total strong {
  color: #e94f18;
  font-size: 18px;
}

.sc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.sc-button {
  min-height: 42px;
  padding: 10px 16px;
  border: 1px solid #d6dfeb;
  border-radius: 11px;
  background: white;
  color: #334155;
  font-family: inherit;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease, transform .18s ease, box-shadow .18s ease;
}

.sc-button:hover {
  border-color: #ffb69d;
  background: #fff7f3;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 90, 31, 0.08);
}

.sc-button-primary {
  border-color: #ff5a1f;
  background: linear-gradient(135deg, #ff6b35, #ff5a1f);
  color: #fff;
  box-shadow: 0 4px 14px rgba(255, 90, 31, .25);
}

.sc-button-primary:hover {
  border-color: #e94712;
  background: linear-gradient(135deg, #f4511e, #e94712);
  color: #fff;
  box-shadow: 0 6px 20px rgba(255, 90, 31, .35);
}

.sc-warning {
  padding: 14px;
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fff5f5;
  color: #b42318;
  font-size: 12px;
  line-height: 1.7;
}

.sc-note {
  margin-top: 15px;
  color: #8492a6;
  font-size: 11px;
  line-height: 1.7;
}

/* ENHANCED PREMIUM ASIDE SHADOW */
.sc-aside > .sc-card {
  border-color: #ffd8ca;
  box-shadow: 0 15px 35px -5px rgba(255, 90, 31, 0.1), 0 5px 15px -2px rgba(255, 90, 31, 0.05);
}

.sc-aside > .sc-card:hover {
  box-shadow: 0 25px 50px -5px rgba(255, 90, 31, 0.15), 0 10px 25px -2px rgba(255, 90, 31, 0.08);
  transform: none; /* Prevents the sticky panel from jumping on hover */
}

@container (min-width: 900px) {
  .sc-layout {
    grid-template-columns: minmax(0, 1fr) 360px;
  }

  .sc-aside {
    position: sticky;
    top: 16px;
  }
}

@media (max-width: 520px) {
  .sc-card {
    padding: 17px;
    border-radius: 15px;
  }

  .sc-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }

  .sc-metric-value {
    font-size: 19px;
  }

  .sc-actions .sc-button {
    flex: 1;
  }
}

@media print {
  .sc-actions,
  .sc-button {
    display: none !important;
  }

  .sc-layout {
    grid-template-columns: 1fr;
  }

  .sc-aside {
    position: static;
  }

  .sc-card {
    box-shadow: none;
    break-inside: avoid;
  }
}
`;

/* ------------------------------------------------------------------ */
/* Main calculator                                                     */
/* ------------------------------------------------------------------ */

export default function StairCarpetCalculator() {
  const [v, setV] = useState<Values>({ ...DEFAULTS });
  const [copied, setCopied] = useState(false);

  const update = <K extends keyof Values>(
    key: K,
    value: Values[K],
  ) => {
    setV((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const reset = () => {
    setV({ ...DEFAULTS });
    setCopied(false);
  };

  /* ---------------------------------------------------------------- */
  /* Calculations                                                      */
  /* ---------------------------------------------------------------- */

  const calc = useMemo(() => {
    const stairCount = Math.max(0, v.stairs);
    const tread = Math.max(0, v.tread);
    const riser = Math.max(0, v.riser);
    const stairWidth = Math.max(0, v.stairWidth);
    const nosing = Math.max(0, v.nosing);

    // Carpet follows the tread, riser and additional nosing allowance.
    const surfaceLengthPerStep = tread + riser + nosing;
    const stairRun = stairCount * surfaceLengthPerStep;

    // Combined landing run is measured along the direction of travel.
    const landingRun = Math.max(0, v.landingRun);

    // Pattern matching allowance for separate carpet cuts.
    const patternAllowance =
      Math.max(0, v.patternRepeat) *
      Math.max(0, Math.floor(v.patternCuts) - 1);

    const totalRun = stairRun + landingRun + patternAllowance;

    // Stair and combined landing surface area.
    const stairArea = (stairRun * stairWidth) / 144;
    const landingRunArea = (landingRun * stairWidth) / 144;

    // Additional flat landing area is entered directly in sq ft.
    const additionalLandingArea = Math.max(0, v.additionalLandingArea);

    const baseArea = stairArea + landingRunArea + additionalLandingArea;

    // Allow for seam overlap when multiple carpet strips are required.
    const rollWidth = Math.max(0, v.rollWidth);
    const seamAllowance = Math.max(0, v.seamAllowance);

    const strips =
      rollWidth > 0 ? Math.max(1, Math.ceil(stairWidth / rollWidth)) : 0;

    const seamArea =
      strips > 1
        ? ((strips - 1) * seamAllowance * (stairRun + landingRun)) / 144
        : 0;

    const areaWithSeams = baseArea + seamArea;
    const wasteMultiplier = 1 + Math.max(0, v.waste) / 100;
    const requiredArea = areaWithSeams * wasteMultiplier;

    // Total linear roll length:
    // Each strip needs the full stair and landing run.
    const stairRollLength = totalRun * strips;

    // Extra landing area is converted into roll length.
    const additionalLandingRollLength =
      rollWidth > 0 ? (additionalLandingArea * 144) / rollWidth : 0;

    const rawRollLength = stairRollLength + additionalLandingRollLength;
    const rollLengthWithWaste = rawRollLength * wasteMultiplier;
    const linearFeet = rollLengthWithWaste / 12;

    // Actual purchased material area based on the roll dimensions.
    const purchasedArea = (rollWidth * rollLengthWithWaste) / 144;
    const extraMaterial = Math.max(0, purchasedArea - requiredArea);

    const carpetCost = purchasedArea * Math.max(0, v.carpetPrice);
    const paddingCost = v.paddingEnabled
      ? requiredArea * Math.max(0, v.paddingPrice)
      : 0;

    const laborCost =
      stairCount * Math.max(0, v.laborPerStep) +
      requiredArea * Math.max(0, v.laborPerSqFt);

    const subtotal =
      carpetCost + paddingCost + laborCost + Math.max(0, v.extraCost);

    const tax = subtotal * (Math.max(0, v.taxRate) / 100);
    const totalCost = subtotal + tax;

    return {
      stairRun,
      landingRun,
      patternAllowance,
      totalRun,
      stairArea,
      landingRunArea,
      additionalLandingArea,
      baseArea,
      seamArea,
      requiredArea,
      strips,
      rawRollLength,
      rollLengthWithWaste,
      linearFeet,
      purchasedArea,
      extraMaterial,
      carpetCost,
      paddingCost,
      laborCost,
      subtotal,
      tax,
      totalCost,
    };
  }, [v]);

  /* ---------------------------------------------------------------- */
  /* Validation                                                        */
  /* ---------------------------------------------------------------- */

  const valid =
    Number.isFinite(v.stairs) &&
    v.stairs >= 1 &&
    Number.isInteger(v.stairs) &&
    v.tread > 0 &&
    v.riser > 0 &&
    v.stairWidth > 0 &&
    v.nosing >= 0 &&
    v.landingRun >= 0 &&
    v.additionalLandingArea >= 0 &&
    v.rollWidth > 0 &&
    v.seamAllowance >= 0 &&
    v.patternRepeat >= 0 &&
    v.patternCuts >= 1 &&
    Number.isInteger(v.patternCuts) &&
    v.waste >= 0 &&
    v.waste <= 100 &&
    v.carpetPrice >= 0 &&
    v.paddingPrice >= 0 &&
    v.laborPerStep >= 0 &&
    v.laborPerSqFt >= 0 &&
    v.extraCost >= 0 &&
    v.taxRate >= 0;

  /* ---------------------------------------------------------------- */
  /* Copyable summary                                                  */
  /* ---------------------------------------------------------------- */

  const summaryText = () => {
    return [
      "STAIR CARPET ESTIMATE",
      "---------------------",
      `Number of steps: ${v.stairs}`,
      `Tread depth: ${fmt(v.tread)} in`,
      `Riser height: ${fmt(v.riser)} in`,
      `Stair width: ${fmt(v.stairWidth)} in`,
      `Nosing allowance: ${fmt(v.nosing)} in`,
      `Combined landing run: ${fmt(v.landingRun)} in`,
      `Additional landing area: ${fmt(v.additionalLandingArea)} sq ft`,
      "",
      `Net carpet surface: ${fmt(calc.baseArea)} sq ft`,
      `Seam allowance area: ${fmt(calc.seamArea)} sq ft`,
      `Waste allowance: ${v.waste}%`,
      `Estimated carpet required: ${fmt(calc.requiredArea)} sq ft`,
      `Carpet strips: ${calc.strips}`,
      `Roll width: ${fmt(v.rollWidth)} in`,
      `Estimated roll length: ${fmt(calc.linearFeet)} linear ft`,
      `Estimated purchased material: ${fmt(calc.purchasedArea)} sq ft`,
      "",
      `Carpet material: ${money(calc.carpetCost, v.currency)}`,
      `Padding: ${money(calc.paddingCost, v.currency)}`,
      `Installation labor: ${money(calc.laborCost, v.currency)}`,
      `Other costs: ${money(v.extraCost, v.currency)}`,
      `Tax: ${money(calc.tax, v.currency)}`,
      `Estimated total: ${money(calc.totalCost, v.currency)}`,
      "",
      "Confirm actual measurements and roll layout with your installer before ordering.",
    ].join("\n");
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    // FIXED: Added `wide` so the calculator spans the full width of the ToolShell
    <ToolShell title="Advanced Stair Carpet Calculator" onReset={reset} wide>
      <style>{css}</style>

      <div className="sc-root">
        <p className="sc-intro">
          Calculate stair carpet requirements, landing coverage, roll length,
          carpet strips, pattern allowances, waste, padding and estimated
          installation costs.
        </p>

        <div className="sc-layout">
          <div className="sc-main">
            {/* Stair dimensions */}
            <section className="sc-card">
              <h3 className="sc-heading">
                <span className="sc-section-number">1</span>
                Stair dimensions
              </h3>

              <p className="sc-description">
                Enter the number of steps and the dimensions of each stair.
                Measurements are entered in inches.
              </p>

              <div className="sc-grid">
                <NumberField
                  label="Number of steps"
                  value={v.stairs}
                  min={1}
                  step={1}
                  onChange={(x) => update("stairs", Math.max(1, Math.floor(x)))}
                />

                <NumberField
                  label="Tread depth (in)"
                  value={v.tread}
                  min={0.1}
                  onChange={(x) => update("tread", x)}
                />

                <NumberField
                  label="Riser height (in)"
                  value={v.riser}
                  min={0.1}
                  onChange={(x) => update("riser", x)}
                />

                <NumberField
                  label="Stair width (in)"
                  value={v.stairWidth}
                  min={0.1}
                  onChange={(x) => update("stairWidth", x)}
                />

                <NumberField
                  label="Extra nosing allowance per step (in)"
                  value={v.nosing}
                  min={0}
                  onChange={(x) => update("nosing", x)}
                />
              </div>

              <div className="sc-hint">
                <strong>Measurement tip:</strong> Measure the horizontal tread
                and vertical riser separately. The nosing allowance is an
                additional amount beyond those measurements. Use zero if it is
                already included in your tread measurement.
              </div>
            </section>

            {/* Landings */}
            <section className="sc-card">
              <h3 className="sc-heading">
                <span className="sc-section-number">2</span>
                Landings and additional areas
              </h3>

              <p className="sc-description">
                Include intermediate or top/bottom landing runs, plus any
                separate flat areas that need carpet.
              </p>

              <div className="sc-grid">
                <CustomField hint="Length along the direction of travel.">
                  <NumberField
                    label="Combined landing run (in)"
                    value={v.landingRun}
                    min={0}
                    onChange={(x) => update("landingRun", x)}
                  />
                </CustomField>

                <CustomField hint="Enter the area separately to avoid double-counting the landing run.">
                  <NumberField
                    label="Additional flat landing area (sq ft)"
                    value={v.additionalLandingArea}
                    min={0}
                    onChange={(x) => update("additionalLandingArea", x)}
                  />
                </CustomField>
              </div>
            </section>

            {/* Roll layout */}
            <section className="sc-card">
              <h3 className="sc-heading">
                <span className="sc-section-number">3</span>
                Carpet roll and cutting layout
              </h3>

              <p className="sc-description">
                Roll width determines how many strips are needed across the
                stair width. Multiple strips may require seams and additional
                material.
              </p>

              <div className="sc-grid">
                <CustomField hint="Common roll widths include 12 ft (144 in).">
                  <NumberField
                    label="Carpet roll width (in)"
                    value={v.rollWidth}
                    min={0.1}
                    onChange={(x) => update("rollWidth", x)}
                  />
                </CustomField>

                <CustomField hint="Applied when multiple strips are needed.">
                  <NumberField
                    label="Seam overlap allowance (in)"
                    value={v.seamAllowance}
                    min={0}
                    onChange={(x) => update("seamAllowance", x)}
                  />
                </CustomField>

                <CustomField hint="Enter 0 for plain or non-matching carpet.">
                  <NumberField
                    label="Pattern repeat (in)"
                    value={v.patternRepeat}
                    min={0}
                    onChange={(x) => update("patternRepeat", x)}
                  />
                </CustomField>

                <CustomField hint="Pattern allowance is added between separate cuts.">
                  <NumberField
                    label="Number of separate pattern cuts"
                    value={v.patternCuts}
                    min={1}
                    step={1}
                    onChange={(x) => update("patternCuts", Math.max(1, Math.floor(x)))}
                  />
                </CustomField>
              </div>

              <div className="sc-hint">
                <strong>Roll layout:</strong> The calculator estimates the
                number of strips required across the stair width. It assumes the
                carpet can be cut from the entered roll width and that the
                strips can be installed along the calculated run.
              </div>
            </section>

            {/* Waste */}
            <section className="sc-card">
              <h3 className="sc-heading">
                <span className="sc-section-number">4</span>
                Waste and material allowance
              </h3>

              <p className="sc-description">
                Add extra material for cutting, trimming, fitting and
                installation losses.
              </p>

              <div className="sc-grid">
                <CustomField hint="A planning allowance, not a fixed industry standard.">
                  <NumberField
                    label="Waste allowance (%)"
                    value={v.waste}
                    min={0}
                    max={100}
                    onChange={(x) => update("waste", x)}
                  />
                </CustomField>
              </div>
            </section>

            {/* Pricing */}
            <section className="sc-card">
              <h3 className="sc-heading">
                <span className="sc-section-number">5</span>
                Material and installation costs
              </h3>

              <p className="sc-description">
                Add your carpet price, optional underlay, labor, additional
                expenses and applicable tax.
              </p>

              <div className="sc-grid">
                <SelectField
                  label="Currency"
                  value={v.currency}
                  onChange={(x) => update("currency", x)}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AED">AED</option>
                </SelectField>

                <NumberField
                  label={`Carpet price per sq ft (${v.currency})`}
                  value={v.carpetPrice}
                  min={0}
                  onChange={(x) => update("carpetPrice", x)}
                />

                <NumberField
                  label={`Installation labor per step (${v.currency})`}
                  value={v.laborPerStep}
                  min={0}
                  onChange={(x) => update("laborPerStep", x)}
                />

                <NumberField
                  label={`Additional labor per sq ft (${v.currency})`}
                  value={v.laborPerSqFt}
                  min={0}
                  onChange={(x) => update("laborPerSqFt", x)}
                />

                <CustomField hint="Adhesive, stair rods, trims or other extras.">
                  <NumberField
                    label={`Other expenses (${v.currency})`}
                    value={v.extraCost}
                    min={0}
                    onChange={(x) => update("extraCost", x)}
                  />
                </CustomField>

                <NumberField
                  label="Tax / GST (%)"
                  value={v.taxRate}
                  min={0}
                  onChange={(x) => update("taxRate", x)}
                />
              </div>

              <label className="sc-toggle">
                <input
                  type="checkbox"
                  checked={v.paddingEnabled}
                  onChange={(e) => update("paddingEnabled", e.target.checked)}
                />
                <span>Include carpet padding / underlay</span>
              </label>

              {v.paddingEnabled && (
                <div className="sc-grid">
                  <NumberField
                    label={`Padding price per sq ft (${v.currency})`}
                    value={v.paddingPrice}
                    min={0}
                    onChange={(x) => update("paddingPrice", x)}
                  />
                </div>
              )}
            </section>

            {/* Measurement notes */}
            <section className="sc-card">
              <h3 className="sc-heading">Measurement and installation notes</h3>

              <div className="sc-note">
                <strong>Before ordering carpet:</strong>
                <ul style={{ paddingLeft: 19, marginTop: 8 }}>
                  <li>
                    Measure every stair, including irregular or winding steps,
                    separately.
                  </li>
                  <li>
                    Confirm whether the carpet will cover the full stair width
                    or only a central runner.
                  </li>
                  <li>
                    Check the actual roll width and usable width with the carpet
                    supplier.
                  </li>
                  <li>
                    Confirm pattern repeat and matching requirements with the
                    manufacturer.
                  </li>
                  <li>
                    Consider stair turns, winders, nosing profiles, trimming and
                    installation methods.
                  </li>
                  <li>
                    Padding requirements and installation methods vary by carpet
                    type and manufacturer.
                  </li>
                </ul>
              </div>
            </section>
          </div>

          {/* Results */}
          <aside className="sc-aside">
            <section className="sc-card">
              <h3 className="sc-heading">Carpet estimate</h3>

              <p className="sc-description">
                Your estimate updates automatically when you change the
                measurements or pricing.
              </p>

              {!valid ? (
                <div className="sc-warning">
                  Please enter valid positive stair dimensions, carpet roll
                  width, and non-negative cost and allowance values. Waste must
                  be between 0% and 100%.
                </div>
              ) : (
                <>
                  <div className="sc-metrics">
                    <Metric
                      label="Net carpet area"
                      value={`${fmt(calc.baseArea)} sq ft`}
                      detail="Before seam and waste allowances"
                    />

                    <Metric
                      label="Carpet required"
                      value={`${fmt(calc.requiredArea)} sq ft`}
                      detail="Including seam and waste allowances"
                      accent
                    />

                    <Metric
                      label="Roll length"
                      value={`${fmt(calc.linearFeet)} ft`}
                      detail={`${fmt(calc.rollLengthWithWaste)} inches`}
                    />

                    <Metric
                      label="Carpet strips"
                      value={`${calc.strips}`}
                      detail={`Roll width: ${fmt(v.rollWidth)} inches`}
                    />
                  </div>

                  <h4 className="sc-breakdown-title">Material breakdown</h4>

                  <div className="sc-row">
                    <span>Stair surface area</span>
                    <strong>{fmt(calc.stairArea)} sq ft</strong>
                  </div>

                  <div className="sc-row">
                    <span>Landing run area</span>
                    <strong>{fmt(calc.landingRunArea)} sq ft</strong>
                  </div>

                  <div className="sc-row">
                    <span>Additional landing area</span>
                    <strong>{fmt(calc.additionalLandingArea)} sq ft</strong>
                  </div>

                  <div className="sc-row">
                    <span>Seam allowance</span>
                    <strong>{fmt(calc.seamArea)} sq ft</strong>
                  </div>

                  <div className="sc-row">
                    <span>Pattern allowance</span>
                    <strong>{fmt(calc.patternAllowance)} in</strong>
                  </div>

                  <div className="sc-row">
                    <span>Waste allowance</span>
                    <strong>{fmt(v.waste)}%</strong>
                  </div>

                  <div className="sc-row">
                    <span>Estimated purchased area</span>
                    <strong>{fmt(calc.purchasedArea)} sq ft</strong>
                  </div>

                  <div className="sc-row">
                    <span>Extra roll material</span>
                    <strong>{fmt(calc.extraMaterial)} sq ft</strong>
                  </div>

                  <h4 className="sc-breakdown-title">Cost breakdown</h4>

                  <div className="sc-row">
                    <span>Carpet material</span>
                    <strong>{money(calc.carpetCost, v.currency)}</strong>
                  </div>

                  {v.paddingEnabled && (
                    <div className="sc-row">
                      <span>Padding / underlay</span>
                      <strong>{money(calc.paddingCost, v.currency)}</strong>
                    </div>
                  )}

                  <div className="sc-row">
                    <span>Installation labor</span>
                    <strong>{money(calc.laborCost, v.currency)}</strong>
                  </div>

                  <div className="sc-row">
                    <span>Other expenses</span>
                    <strong>{money(v.extraCost, v.currency)}</strong>
                  </div>

                  <div className="sc-row">
                    <span>Subtotal</span>
                    <strong>{money(calc.subtotal, v.currency)}</strong>
                  </div>

                  <div className="sc-row">
                    <span>Tax ({fmt(v.taxRate)}%)</span>
                    <strong>{money(calc.tax, v.currency)}</strong>
                  </div>

                  <div className="sc-row sc-row-total">
                    <span>
                      <strong>Estimated total</strong>
                    </span>
                    <strong>{money(calc.totalCost, v.currency)}</strong>
                  </div>

                  <div className="sc-actions">
                    <button
                      type="button"
                      className="sc-button sc-button-primary"
                      onClick={copySummary}
                    >
                      {copied ? "Copied!" : "Copy estimate"}
                    </button>

                    <button
                      type="button"
                      className="sc-button"
                      onClick={() => window.print()}
                    >
                      Print
                    </button>
                  </div>
                </>
              )}
            </section>
          </aside>
        </div>

        <div style={{ marginTop: 22 }}>
          <Result>
            This calculator provides an approximate planning estimate. Stair
            carpet installation can require additional material due to winding
            stairs, pattern matching, seams, trimming, carpet direction and
            installation techniques. Verify the final cutting plan and material
            quantity with your carpet supplier or professional installer before
            ordering.
          </Result>
        </div>
      </div>
    </ToolShell>
  );
}