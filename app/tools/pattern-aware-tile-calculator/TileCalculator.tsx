
"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import ToolShell, { Result } from "../ToolShell";

/* -------------------------------------------------------
   Types and defaults
------------------------------------------------------- */

type Unit = "ft" | "m" | "cm" | "in";
type TileUnit = "in" | "cm" | "mm";
type Pattern = "straight" | "offset" | "diagonal" | "herringbone";

type Room = {
  id: number;
  name: string;
  length: number;
  width: number;
};

type Values = {
  unit: Unit;
  tileUnit: TileUnit;
  rooms: Room[];
  excludedArea: number;
  additionalArea: number;
  tileLength: number;
  tileWidth: number;
  tileThickness: number;
  groutJoint: number;
  pattern: Pattern;
  waste: number;
  boxCoverage: number;
  tilesPerBox: number;
  pricePerBox: number;
  groutWaste: number;
  groutBagSize: number;
  groutPricePerBag: number;
  adhesiveCoverage: number;
  adhesiveBagSize: number;
  adhesivePricePerBag: number;
  laborRate: number;
  underlaymentRate: number;
  preparationCost: number;
  deliveryCost: number;
  taxRate: number;
  currency: string;
  showDetails: boolean;
};

const makeDefaults = (): Values => ({
  unit: "ft",
  tileUnit: "in",
  rooms: [{ id: 1, name: "Main room", length: 20, width: 12 }],
  excludedArea: 0,
  additionalArea: 0,
  tileLength: 12,
  tileWidth: 12,
  tileThickness: 8,
  groutJoint: 3,
  pattern: "straight",
  waste: 10,
  boxCoverage: 10,
  tilesPerBox: 0,
  pricePerBox: 0,
  groutWaste: 10,
  groutBagSize: 5,
  groutPricePerBag: 0,
  adhesiveCoverage: 50,
  adhesiveBagSize: 20,
  adhesivePricePerBag: 0,
  laborRate: 0,
  underlaymentRate: 0,
  preparationCost: 0,
  deliveryCost: 0,
  taxRate: 0,
  currency: "USD",
  showDetails: true,
});

const UNIT_TO_FEET: Record<Unit, number> = {
  ft: 1,
  m: 3.280839895,
  cm: 1 / 30.48,
  in: 1 / 12,
};

const UNIT_AREA_TO_SQFT: Record<Unit, number> = {
  ft: 1,
  m: 10.7639104,
  cm: 1 / 929.0304,
  in: 1 / 144,
};

const TILE_UNIT_TO_INCH: Record<TileUnit, number> = {
  in: 1,
  cm: 1 / 2.54,
  mm: 1 / 25.4,
};

const PATTERN_META: Record<
  Pattern,
  { label: string; waste: number; description: string }
> = {
  straight: {
    label: "Straight / grid",
    waste: 0,
    description: "Standard straight tile installation.",
  },
  offset: {
    label: "Offset / brick",
    waste: 10,
    description: "Brick-style staggered installation.",
  },
  diagonal: {
    label: "Diagonal",
    waste: 15,
    description: "Diagonal installation generally requires more cuts.",
  },
  herringbone: {
    label: "Herringbone",
    waste: 20,
    description: "Decorative herringbone installation with additional cuts.",
  },
};

/* -------------------------------------------------------
   Styles
------------------------------------------------------- */

const css = `
.tc-root {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  color: #172033;
  box-sizing: border-box;
}
.tc-root *, .tc-root *::before, .tc-root *::after {
  box-sizing: border-box;
}
.tc-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 22px;
  align-items: start;
  width: 100%;
  min-width: 0;
}
.tc-main, .tc-results {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  min-width: 0;
}
.tc-card {
  width: 100%;
  min-width: 0;
  padding: 22px;
  border: 1px solid #e5eaf2;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(15,23,42,.035);
  transition: border-color .2s ease, box-shadow .2s ease;
}
.tc-card:hover {
  border-color: #ffd0bf;
  box-shadow: 0 9px 26px rgba(15,23,42,.05);
}
.tc-heading {
  margin: 0 0 6px;
  color: #172033;
  font-size: 16px;
  font-weight: 780;
  letter-spacing: -.025em;
}
.tc-description {
  margin: 0 0 18px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.7;
}
.tc-grid {
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 17px 16px;
  align-items: start;
}
.tc-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.tc-label {
  display: flex;
  align-items: flex-end;
  min-height: 32px;
  margin: 0 0 8px;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
}
.tc-input, .tc-select {
  display: block;
  width: 100%;
  height: 46px;
  min-width: 0;
  padding: 0 13px;
  border: 1px solid #d8e0eb;
  border-radius: 11px;
  background: #fff;
  color: #172033;
  font-family: inherit;
  font-size: 14px;
  box-shadow: 0 1px 2px rgba(15,23,42,.025);
  transition: border-color .18s ease, box-shadow .18s ease;
}
.tc-input:hover, .tc-select:hover {
  border-color: #ffad91;
}
.tc-input:focus, .tc-select:focus {
  outline: none;
  border-color: #ff5a1f;
  box-shadow: 0 0 0 4px rgba(255,90,31,.13);
}
.tc-input::placeholder { color: #94a3b8; }
.tc-select {
  appearance: none;
  padding-right: 38px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 13px center;
}
.tc-hint {
  min-height: 30px;
  padding-top: 7px;
  color: #8492a6;
  font-size: 11px;
  line-height: 1.5;
}
.tc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.tc-btn {
  min-height: 42px;
  padding: 10px 16px;
  border: 1px solid #d6dfeb;
  border-radius: 11px;
  background: #fff;
  color: #334155;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15,23,42,.035);
  transition: transform .16s ease, background .16s ease,
    border-color .16s ease, box-shadow .16s ease;
}
.tc-btn:hover {
  transform: translateY(-1px);
  border-color: #ffb69d;
  background: #fff7f3;
  box-shadow: 0 4px 12px rgba(15,23,42,.07);
}
.tc-btn:focus-visible {
  outline: 3px solid rgba(255,90,31,.2);
  outline-offset: 2px;
}
.tc-btn:disabled {
  opacity: .45;
  cursor: not-allowed;
  transform: none;
}
.tc-btn-primary {
  border-color: #ff5a1f;
  background: linear-gradient(135deg,#ff6b35,#ff5a1f);
  color: #fff;
  box-shadow: 0 4px 10px rgba(255,90,31,.2);
}
.tc-btn-primary:hover {
  border-color: #e94712;
  background: linear-gradient(135deg,#f4511e,#e94712);
  color: #fff;
}
.tc-btn-danger {
  border-color: #fecaca;
  background: #fffafa;
  color: #dc2626;
}
.tc-btn-danger:hover {
  border-color: #fda4af;
  background: #fff1f2;
  color: #b91c1c;
}
.tc-room {
  display: grid;
  grid-template-columns: minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) 100px;
  gap: 12px;
  align-items: start;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px dashed #dce4ee;
}
.tc-room-remove {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.tc-room-remove .tc-label { visibility: hidden; }
.tc-room-remove .tc-btn {
  width: 100%;
  height: 46px;
  min-height: 46px;
  padding: 0 10px;
}
.tc-metric-grid {
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 11px;
}
.tc-metric {
  min-width: 0;
  padding: 15px;
  border: 1px solid #e8edf4;
  border-radius: 14px;
  background: #f8fafc;
}
.tc-metric.accent {
  border-color: #ffd1c0;
  background: linear-gradient(135deg,#fff3ed,#fffaf7);
}
.tc-metric.full { grid-column: 1 / -1; }
.tc-metric-label {
  margin-bottom: 8px;
  color: #718096;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: .045em;
  text-transform: uppercase;
}
.tc-metric-value {
  overflow-wrap: anywhere;
  color: #172033;
  font-size: 22px;
  font-weight: 820;
  letter-spacing: -.035em;
  line-height: 1.25;
}
.tc-metric.accent .tc-metric-value { color: #e94f18; }
.tc-metric-detail {
  margin-top: 7px;
  color: #718096;
  font-size: 11px;
  line-height: 1.45;
}
.tc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #edf1f6;
  color: #334155;
  font-size: 13px;
}
.tc-row:last-child { border-bottom: none; }
.tc-row strong {
  color: #1e293b;
  font-weight: 750;
  text-align: right;
}
.tc-row small {
  display: block;
  margin-top: 4px;
  color: #8290a3;
  font-size: 11px;
  line-height: 1.4;
}
.tc-section-title {
  margin: 22px 0 8px;
  color: #172033;
  font-size: 14px;
  font-weight: 780;
}
.tc-switch {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  min-height: 30px;
  margin: 17px 0 8px;
  color: #334155;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  user-select: none;
}
.tc-switch input {
  appearance: none;
  position: relative;
  flex: 0 0 44px;
  width: 44px;
  height: 26px;
  margin: 0;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #e2e8f0;
  cursor: pointer;
  transition: background .2s ease, border-color .2s ease;
}
.tc-switch input::before {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(15,23,42,.2);
  transition: transform .2s ease;
}
.tc-switch input:checked {
  border-color: #ff5a1f;
  background: #ff5a1f;
}
.tc-switch input:checked::before { transform: translateX(18px); }
.tc-switch input:focus-visible {
  outline: 3px solid rgba(255,90,31,.2);
  outline-offset: 3px;
}
.tc-info {
  margin-top: 14px;
  padding: 13px 15px;
  border: 1px solid #fed7c8;
  border-radius: 12px;
  background: #fff7f3;
  color: #9a3412;
  font-size: 12px;
  line-height: 1.65;
}
.tc-note {
  border-color: #f5dfaa;
  background: linear-gradient(135deg,#fffbeb,#fffdf6);
}
.tc-note .tc-heading { color: #92400e; }
.tc-note ul {
  margin: 0;
  padding-left: 20px;
  color: #795b20;
  font-size: 12px;
  line-height: 2;
}
.tc-warning {
  padding: 14px 15px;
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fff5f5;
  color: #b42318;
  font-size: 12px;
  line-height: 1.65;
}
.tc-success {
  padding: 12px 14px;
  border: 1px solid #bbf7d0;
  border-radius: 11px;
  background: #f0fdf4;
  color: #166534;
  font-size: 12px;
  line-height: 1.6;
}
.tc-results > .tc-card {
  border-color: #ffd8ca;
  box-shadow: 0 10px 30px rgba(255,90,31,.07);
}
.tc-results > .tc-card > .tc-heading { font-size: 17px; }
.tc-muted {
  color: #8492a6;
  font-size: 11px;
  line-height: 1.55;
}
@media (min-width:1100px) {
  .tc-layout {
    grid-template-columns: minmax(0,1fr) minmax(320px,350px);
  }
  .tc-results {
    position: sticky;
    top: 18px;
    align-self: start;
  }
}
@media (max-width:1099px) {
  .tc-room { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .tc-room .tc-field:first-child { grid-column: 1 / -1; }
  .tc-room-remove .tc-label { display: none; }
}
@media (max-width:600px) {
  .tc-card { padding: 17px; border-radius: 15px; }
  .tc-grid { grid-template-columns: minmax(0,1fr); gap: 14px; }
  .tc-room { grid-template-columns: minmax(0,1fr); }
  .tc-room .tc-field:first-child { grid-column: auto; }
  .tc-metric-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .tc-actions .tc-btn { flex: 1 1 auto; }
}
@media (max-width:360px) {
  .tc-metric-grid { grid-template-columns: minmax(0,1fr); }
  .tc-metric.full { grid-column: auto; }
}
@media (prefers-reduced-motion:reduce) {
  .tc-root * { transition: none !important; }
}
@media print {
  .tc-actions, .tc-btn, .tc-switch { display: none !important; }
  .tc-layout { display: block !important; }
  .tc-results { position: static !important; margin-top: 20px; }
  .tc-card { box-shadow: none; break-inside: avoid; }
}
`;

/* -------------------------------------------------------
   Reusable components
------------------------------------------------------- */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="tc-field">
      <div className="tc-label">{label}</div>
      {children}
      <div className="tc-hint">{hint || ""}</div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = "any",
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className="tc-input"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next === "" ? 0 : Number(next));
        }}
      />
    </Field>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        className="tc-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  children,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <select
        className="tc-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </Field>
  );
}

function Metric({
  label,
  value,
  detail,
  accent,
  full,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
  full?: boolean;
}) {
  return (
    <div
      className={[
        "tc-metric",
        accent ? "accent" : "",
        full ? "full" : "",
      ].filter(Boolean).join(" ")}
    >
      <div className="tc-metric-label">{label}</div>
      <div className="tc-metric-value">{value}</div>
      {detail && <div className="tc-metric-detail">{detail}</div>}
    </div>
  );
}

/* -------------------------------------------------------
   Main calculator
------------------------------------------------------- */

export default function TileCalculator() {
  const [v, setV] = useState<Values>(makeDefaults);
  const [copied, setCopied] = useState(false);

  const update = <K extends keyof Values,>(
    key: K,
    value: Values[K],
  ) => {
    setV((previous) => ({ ...previous, [key]: value }));
    setCopied(false);
  };

  const updateRoom = (id: number, patch: Partial<Room>) => {
    setV((previous) => ({
      ...previous,
      rooms: previous.rooms.map((room) =>
        room.id === id ? { ...room, ...patch } : room,
      ),
    }));
    setCopied(false);
  };

  const addRoom = () => {
    setV((previous) => ({
      ...previous,
      rooms: [
        ...previous.rooms,
        {
          id: Math.max(0, ...previous.rooms.map((room) => room.id)) + 1,
          name: `Area ${previous.rooms.length + 1}`,
          length: 10,
          width: 10,
        },
      ],
    }));
    setCopied(false);
  };

  const removeRoom = (id: number) => {
    setV((previous) => ({
      ...previous,
      rooms: previous.rooms.filter((room) => room.id !== id),
    }));
    setCopied(false);
  };

  const reset = () => {
    setV(makeDefaults());
    setCopied(false);
  };

  const money = (amount: number) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: v.currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${v.currency} ${amount.toFixed(2)}`;
    }
  };

  const fmt = (number: number) =>
    Number.isFinite(number)
      ? number.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0.00";

  const areaUnit =
    v.unit === "ft"
      ? "sq ft"
      : v.unit === "m"
        ? "sq m"
        : v.unit === "cm"
          ? "sq cm"
          : "sq in";

  /* -------------------------------------------------------
     Calculations
  ------------------------------------------------------- */

  const calc = useMemo(() => {
    const tileLengthIn = v.tileLength * TILE_UNIT_TO_INCH[v.tileUnit];
    const tileWidthIn = v.tileWidth * TILE_UNIT_TO_INCH[v.tileUnit];

    const tileLengthMm = tileLengthIn * 25.4;
    const tileWidthMm = tileWidthIn * 25.4;

    const tileAreaSqft = (tileLengthIn * tileWidthIn) / 144;

    const roomBreakdown = v.rooms.map((room) => {
      const lengthFt = room.length * UNIT_TO_FEET[v.unit];
      const widthFt = room.width * UNIT_TO_FEET[v.unit];

      return {
        ...room,
        areaSqft: lengthFt * widthFt,
      };
    });

    const roomArea = roomBreakdown.reduce(
      (total, room) => total + room.areaSqft,
      0,
    );

    const excludedSqft = v.excludedArea * UNIT_AREA_TO_SQFT[v.unit];
    const additionalSqft = v.additionalArea * UNIT_AREA_TO_SQFT[v.unit];

    const netArea = Math.max(
      0,
      roomArea - excludedSqft + additionalSqft,
    );

    const patternWaste = PATTERN_META[v.pattern].waste;

    // Compound the two allowances instead of adding percentage points.
    const totalWaste =
      ((1 + v.waste / 100) * (1 + patternWaste / 100) - 1) * 100;

    const orderArea = netArea * (1 + totalWaste / 100);

    // This is a theoretical area-based tile count, not a cutting plan.
    const exactTileCount =
      tileAreaSqft > 0 ? orderArea / tileAreaSqft : 0;

    const tileCount = Math.ceil(exactTileCount);

    // Box coverage printed by the manufacturer is authoritative.
    const exactBoxCount =
      v.boxCoverage > 0 ? orderArea / v.boxCoverage : 0;

    const boxCount = Math.ceil(exactBoxCount);
    const purchasedCoverage = boxCount * v.boxCoverage;
    const spareCoverage = Math.max(0, purchasedCoverage - orderArea);
    const tileCost = boxCount * v.pricePerBox;

    // Approximate grout consumption formula.
    // Tile dimensions, joint width and thickness are in millimeters.
    // The 1.6 factor is an assumed grout density coefficient.
    const groutConsumptionPerSqm =
      tileLengthMm > 0 && tileWidthMm > 0
        ? ((tileLengthMm + tileWidthMm) /
            (tileLengthMm * tileWidthMm)) *
          v.groutJoint *
          v.tileThickness *
          1.6
        : 0;

    const netAreaSqm = netArea / 10.7639104;
    const groutBaseKg = netAreaSqm * groutConsumptionPerSqm;
    const groutWithWasteKg =
      groutBaseKg * (1 + v.groutWaste / 100);

    const groutBags =
      v.groutBagSize > 0
        ? Math.ceil(groutWithWasteKg / v.groutBagSize)
        : 0;

    const groutPurchasedKg = groutBags * v.groutBagSize;
    const groutSpareKg = Math.max(
      0,
      groutPurchasedKg - groutWithWasteKg,
    );
    const groutCost = groutBags * v.groutPricePerBag;

    // Adhesive is used on the actual installation area, not on
    // extra tile material purchased for cuts and breakage.
    // Coverage is the manufacturer's stated coverage per bag.
    const adhesiveBags =
      v.adhesiveCoverage > 0
        ? Math.ceil(netArea / v.adhesiveCoverage)
        : 0;

    const adhesivePurchasedCoverage =
      adhesiveBags * v.adhesiveCoverage;

    const adhesiveSpareCoverage = Math.max(
      0,
      adhesivePurchasedCoverage - netArea,
    );

    const adhesiveCost = adhesiveBags * v.adhesivePricePerBag;

    // Labor and underlayment rates are entered per selected area unit.
    const selectedArea = netArea / UNIT_AREA_TO_SQFT[v.unit];

    const laborCost = selectedArea * v.laborRate;
    const underlaymentCost = selectedArea * v.underlaymentRate;

    const subtotal =
      tileCost +
      groutCost +
      adhesiveCost +
      underlaymentCost +
      laborCost +
      v.preparationCost +
      v.deliveryCost;

    const tax = subtotal * (v.taxRate / 100);
    const totalCost = subtotal + tax;

    const costPerArea =
      selectedArea > 0 ? totalCost / selectedArea : 0;

    const expectedCoverageFromTileCount =
      tileAreaSqft * v.tilesPerBox;

    const packagingDifference =
      v.tilesPerBox > 0
        ? Math.abs(expectedCoverageFromTileCount - v.boxCoverage)
        : 0;

    const packagingMismatch =
      v.tilesPerBox > 0 &&
      v.boxCoverage > 0 &&
      packagingDifference > Math.max(0.05, v.boxCoverage * 0.05);

    const tilesIncludedInBoxes =
      v.tilesPerBox > 0 ? boxCount * v.tilesPerBox : null;

    return {
      roomBreakdown,
      roomArea,
      excludedSqft,
      additionalSqft,
      netArea,
      tileLengthIn,
      tileWidthIn,
      tileLengthMm,
      tileWidthMm,
      tileAreaSqft,
      tileCount,
      exactTileCount,
      patternWaste,
      totalWaste,
      orderArea,
      exactBoxCount,
      boxCount,
      purchasedCoverage,
      spareCoverage,
      tileCost,
      groutConsumptionPerSqm,
      groutBaseKg,
      groutWithWasteKg,
      groutBags,
      groutPurchasedKg,
      groutSpareKg,
      groutCost,
      adhesiveBags,
      adhesivePurchasedCoverage,
      adhesiveSpareCoverage,
      adhesiveCost,
      laborCost,
      underlaymentCost,
      subtotal,
      tax,
      totalCost,
      selectedArea,
      costPerArea,
      expectedCoverageFromTileCount,
      packagingMismatch,
      packagingDifference,
      tilesIncludedInBoxes,
    };
  }, [v]);

  /* -------------------------------------------------------
     Validation
  ------------------------------------------------------- */

  const numericValues = [
    v.excludedArea,
    v.additionalArea,
    v.tileLength,
    v.tileWidth,
    v.tileThickness,
    v.groutJoint,
    v.waste,
    v.boxCoverage,
    v.tilesPerBox,
    v.pricePerBox,
    v.groutWaste,
    v.groutBagSize,
    v.groutPricePerBag,
    v.adhesiveCoverage,
    v.adhesiveBagSize,
    v.adhesivePricePerBag,
    v.laborRate,
    v.underlaymentRate,
    v.preparationCost,
    v.deliveryCost,
    v.taxRate,
    ...v.rooms.flatMap((room) => [room.length, room.width]),
  ];

  const allNumbersFinite = numericValues.every(Number.isFinite);

  const roomsValid =
    v.rooms.length > 0 &&
    v.rooms.length <= 100 &&
    v.rooms.every(
      (room) =>
        room.name.trim().length > 0 &&
        room.length > 0 &&
        room.width > 0 &&
        room.length <= 100000 &&
        room.width <= 100000,
    );

  const costs = [
    v.pricePerBox,
    v.groutPricePerBag,
    v.adhesivePricePerBag,
    v.laborRate,
    v.underlaymentRate,
    v.preparationCost,
    v.deliveryCost,
  ];

  const costsValid = costs.every((value) => value >= 0);

  const excludedAreaValid =
    v.excludedArea >= 0 &&
    calc.excludedSqft <= calc.roomArea;

  const nonNegativeInputs = [
    v.additionalArea,
    v.waste,
    v.groutWaste,
    v.tilesPerBox,
    v.taxRate,
  ].every((value) => value >= 0);

  const valid =
    allNumbersFinite &&
    roomsValid &&
    nonNegativeInputs &&
    v.tileLength > 0 &&
    v.tileWidth > 0 &&
    v.tileLength <= 5000 &&
    v.tileWidth <= 5000 &&
    v.tileThickness >= 0.1 &&
    v.tileThickness <= 100 &&
    v.groutJoint >= 0.1 &&
    v.groutJoint <= 20 &&
    v.waste <= 100 &&
    v.groutWaste <= 100 &&
    v.boxCoverage > 0 &&
    v.tilesPerBox <= 100000 &&
    Number.isInteger(v.tilesPerBox) &&
    v.groutBagSize > 0 &&
    v.adhesiveCoverage > 0 &&
    v.adhesiveBagSize > 0 &&
    v.taxRate <= 100 &&
    excludedAreaValid &&
    costsValid &&
    calc.netArea > 0 &&
    calc.tileAreaSqft > 0 &&
    Number.isFinite(calc.totalCost);

  const validationMessage = !allNumbersFinite
    ? "Please enter valid numeric values in all fields."
    : !roomsValid
      ? "Add at least one area and enter a name, length and width for every room. Room dimensions must be positive."
      : !excludedAreaValid
        ? "The excluded area cannot be greater than the combined measured floor area."
        : v.additionalArea < 0
          ? "Additional area cannot be negative."
          : v.tileLength <= 0 || v.tileWidth <= 0
            ? "Tile length and width must be greater than zero."
            : v.tileLength > 5000 || v.tileWidth > 5000
              ? "Tile dimensions are too large. Please check the selected tile unit."
              : v.tileThickness < 0.1 || v.tileThickness > 100
                ? "Tile thickness must be between 0.1 mm and 100 mm."
                : v.groutJoint < 0.1 || v.groutJoint > 20
                  ? "Grout joint width must be between 0.1 mm and 20 mm."
                  : v.boxCoverage <= 0
                    ? "Box coverage must be greater than zero."
                    : v.tilesPerBox < 0 ||
                        !Number.isInteger(v.tilesPerBox)
                      ? "Tiles per box must be a whole number. Enter 0 if unknown."
                      : v.groutBagSize <= 0
                        ? "Grout bag size must be greater than zero."
                        : v.adhesiveCoverage <= 0
                          ? "Adhesive coverage per bag must be greater than zero."
                          : v.adhesiveBagSize <= 0
                            ? "Adhesive bag size must be greater than zero."
                            : v.waste < 0 || v.waste > 100
                              ? "Additional tile waste must be between 0% and 100%."
                              : v.groutWaste < 0 || v.groutWaste > 100
                                ? "Grout waste must be between 0% and 100%."
                                : v.taxRate < 0 || v.taxRate > 100
                                  ? "Tax must be between 0% and 100%."
                                  : !nonNegativeInputs || !costsValid
                                    ? "Waste, tax and cost values cannot be negative."
                                    : calc.netArea <= 0
                                      ? "The net floor area must be greater than zero."
                                      : !Number.isFinite(calc.totalCost)
                                        ? "The calculated total is too large. Please check your inputs."
                                        : "Please check your calculator inputs.";

  /* -------------------------------------------------------
     Copy summary
  ------------------------------------------------------- */

  const summaryText = () =>
    [
      "PROFESSIONAL TILE INSTALLATION ESTIMATE",
      "----------------------------------------",
      "",
      `Areas measured: ${v.rooms.length}`,
      `Original floor area: ${fmt(calc.roomArea)} sq ft`,
      `Excluded area: ${fmt(calc.excludedSqft)} sq ft`,
      `Additional area: ${fmt(calc.additionalSqft)} sq ft`,
      `Net floor area: ${fmt(calc.netArea)} sq ft`,
      `Selected area: ${fmt(calc.selectedArea)} ${areaUnit}`,
      "",
      "TILE REQUIREMENTS",
      "----------------------------------------",
      `Tile size: ${v.tileLength} x ${v.tileWidth} ${v.tileUnit}`,
      `Tile thickness: ${v.tileThickness} mm`,
      `Grout joint: ${v.groutJoint} mm`,
      `Installation pattern: ${PATTERN_META[v.pattern].label}`,
      `Additional tile waste: ${v.waste}%`,
      `Pattern allowance: ${calc.patternWaste}%`,
      `Combined compounded allowance: ${fmt(calc.totalWaste)}%`,
      `Area to purchase: ${fmt(calc.orderArea)} sq ft`,
      `Theoretical individual tile count: ${calc.tileCount}`,
      `Tile boxes required: ${calc.boxCount}`,
      `Coverage per box: ${fmt(v.boxCoverage)} sq ft`,
      `Total purchased coverage: ${fmt(calc.purchasedCoverage)} sq ft`,
      v.tilesPerBox > 0
        ? `Tiles included in purchased boxes: ${calc.tilesIncludedInBoxes}`
        : "Tiles per box: Not supplied",
      "",
      "GROUT REQUIREMENTS",
      "----------------------------------------",
      `Estimated grout consumption: ${fmt(calc.groutConsumptionPerSqm)} kg/sq m`,
      `Grout before waste: ${fmt(calc.groutBaseKg)} kg`,
      `Grout with waste: ${fmt(calc.groutWithWasteKg)} kg`,
      `Grout bag size: ${v.groutBagSize} kg`,
      `Grout bags: ${calc.groutBags}`,
      `Purchased grout: ${fmt(calc.groutPurchasedKg)} kg`,
      `Grout cost: ${money(calc.groutCost)}`,
      "",
      "ADHESIVE REQUIREMENTS",
      "----------------------------------------",
      `Adhesive bag size: ${v.adhesiveBagSize} kg`,
      `Coverage per bag: ${fmt(v.adhesiveCoverage)} sq ft`,
      `Adhesive installation area: ${fmt(calc.netArea)} sq ft`,
      `Adhesive bags: ${calc.adhesiveBags}`,
      `Purchased adhesive coverage: ${fmt(calc.adhesivePurchasedCoverage)} sq ft`,
      `Adhesive cost: ${money(calc.adhesiveCost)}`,
      "",
      "PROJECT COST",
      "----------------------------------------",
      `Tile material: ${money(calc.tileCost)}`,
      `Grout: ${money(calc.groutCost)}`,
      `Tile adhesive: ${money(calc.adhesiveCost)}`,
      `Underlayment: ${money(calc.underlaymentCost)}`,
      `Installation labor: ${money(calc.laborCost)}`,
      `Floor preparation: ${money(v.preparationCost)}`,
      `Delivery: ${money(v.deliveryCost)}`,
      `Subtotal: ${money(calc.subtotal)}`,
      `Tax: ${money(calc.tax)}`,
      `Estimated total: ${money(calc.totalCost)}`,
      `Cost per ${areaUnit}: ${money(calc.costPerArea)}`,
      "",
      "Note: Estimates are approximate. Confirm product coverage and installation requirements with manufacturers and your installer.",
    ].join("\n");

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText());
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  /* -------------------------------------------------------
     Render
  ------------------------------------------------------- */

  return (
    <ToolShell
      title="Professional Tile Calculator"
      onReset={reset}
      wide
    >
      <style>{css}</style>

      <div className="tc-root">
        <p className="tc-description">
          Calculate tile quantities, grout, adhesive, installation
          materials and project costs. Add multiple rooms or sections
          to estimate your complete flooring project.
        </p>

        <div className="tc-layout">
          <div className="tc-main">

            {/* 1. Floor areas */}

            <section className="tc-card">
              <h3 className="tc-heading">1. Floor areas</h3>
              <p className="tc-description">
                Add every room or section that needs tile installation.
                All room measurements are combined automatically.
              </p>

              <div
                className="tc-grid"
                style={{ maxWidth: 390, marginBottom: 18 }}
              >
                <SelectInput
                  label="Room measurement unit"
                  value={v.unit}
                  onChange={(x) => update("unit", x as Unit)}
                >
                  <option value="ft">Feet (ft)</option>
                  <option value="m">Meters (m)</option>
                  <option value="cm">Centimeters (cm)</option>
                  <option value="in">Inches (in)</option>
                </SelectInput>
              </div>

              {v.rooms.map((room) => (
                <div className="tc-room" key={room.id}>
                  <TextInput
                    label="Area name"
                    value={room.name}
                    onChange={(x) => updateRoom(room.id, { name: x })}
                  />

                  <NumberInput
                    label={`Length (${v.unit})`}
                    value={room.length}
                    min={0.01}
                    onChange={(x) => updateRoom(room.id, { length: x })}
                  />

                  <NumberInput
                    label={`Width (${v.unit})`}
                    value={room.width}
                    min={0.01}
                    onChange={(x) => updateRoom(room.id, { width: x })}
                  />

                  <div className="tc-room-remove">
                    <div className="tc-label" aria-hidden="true">
                      &nbsp;
                    </div>
                    <button
                      type="button"
                      className="tc-btn tc-btn-danger"
                      disabled={v.rooms.length === 1}
                      onClick={() => removeRoom(room.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="tc-actions" style={{ marginBottom: 18 }}>
                <button
                  type="button"
                  className="tc-btn"
                  disabled={v.rooms.length >= 100}
                  onClick={addRoom}
                >
                  + Add another area
                </button>
              </div>

              <div className="tc-grid">
                <NumberInput
                  label={`Excluded area (${areaUnit})`}
                  value={v.excludedArea}
                  min={0}
                  onChange={(x) => update("excludedArea", x)}
                  hint="Area that will not receive tiles."
                />

                <NumberInput
                  label={`Additional area (${areaUnit})`}
                  value={v.additionalArea}
                  min={0}
                  onChange={(x) => update("additionalArea", x)}
                  hint="Add steps or other sections to be tiled."
                />
              </div>
            </section>

            {/* 2. Tile dimensions */}

            <section className="tc-card">
              <h3 className="tc-heading">
                2. Tile dimensions and grout joints
              </h3>
              <p className="tc-description">
                Enter the size and thickness of your tiles and the
                planned grout joint width.
              </p>

              <div className="tc-grid">
                <SelectInput
                  label="Tile measurement unit"
                  value={v.tileUnit}
                  onChange={(x) => update("tileUnit", x as TileUnit)}
                >
                  <option value="in">Inches (in)</option>
                  <option value="cm">Centimeters (cm)</option>
                  <option value="mm">Millimeters (mm)</option>
                </SelectInput>

                <NumberInput
                  label={`Tile length (${v.tileUnit})`}
                  value={v.tileLength}
                  min={0.01}
                  onChange={(x) => update("tileLength", x)}
                />

                <NumberInput
                  label={`Tile width (${v.tileUnit})`}
                  value={v.tileWidth}
                  min={0.01}
                  onChange={(x) => update("tileWidth", x)}
                />

                <NumberInput
                  label="Tile thickness (mm)"
                  value={v.tileThickness}
                  min={0.1}
                  max={100}
                  onChange={(x) => update("tileThickness", x)}
                  hint="Thickness of one tile."
                />

                <NumberInput
                  label="Grout joint width (mm)"
                  value={v.groutJoint}
                  min={0.1}
                  max={20}
                  onChange={(x) => update("groutJoint", x)}
                  hint="Use the joint width planned for installation."
                />
              </div>

              <div className="tc-info">
                Tile face area:{" "}
                <strong>{fmt(calc.tileAreaSqft)} sq ft</strong>
                <br />
                Tile dimensions:{" "}
                <strong>
                  {fmt(calc.tileLengthMm)} × {fmt(calc.tileWidthMm)} mm
                </strong>
                <br />
                Theoretical tile count is based on tile face area.
                Actual cutting and placement can change the quantity needed.
              </div>
            </section>

            {/* 3. Pattern and waste */}

            <section className="tc-card">
              <h3 className="tc-heading">
                3. Installation pattern and tile waste
              </h3>
              <p className="tc-description">
                Different installation patterns can require different
                cutting allowances. The pattern allowance is compounded
                with your additional waste percentage.
              </p>

              <div className="tc-grid">
                <SelectInput
                  label="Installation pattern"
                  value={v.pattern}
                  onChange={(x) => update("pattern", x as Pattern)}
                >
                  <option value="straight">Straight / grid</option>
                  <option value="offset">Offset / brick</option>
                  <option value="diagonal">Diagonal</option>
                  <option value="herringbone">Herringbone</option>
                </SelectInput>

                <NumberInput
                  label="Additional tile waste (%)"
                  value={v.waste}
                  min={0}
                  max={100}
                  onChange={(x) => update("waste", x)}
                  hint="Extra allowance for cuts and breakage."
                />
              </div>

              <div className="tc-info">
                <strong>{PATTERN_META[v.pattern].label}</strong>
                {" — "}
                {PATTERN_META[v.pattern].description}
                <br />
                Pattern allowance: <strong>{calc.patternWaste}%</strong>
                <br />
                Additional waste: <strong>{v.waste}%</strong>
                <br />
                Combined compounded allowance:{" "}
                <strong>{fmt(calc.totalWaste)}%</strong>
              </div>
            </section>

            {/* 4. Tile packaging */}

            <section className="tc-card">
              <h3 className="tc-heading">
                4. Tile packaging and pricing
              </h3>
              <p className="tc-description">
                Enter the coverage printed on the manufacturer's
                packaging. The calculator rounds up to complete boxes.
              </p>

              <div className="tc-grid">
                <NumberInput
                  label="Coverage per box (sq ft)"
                  value={v.boxCoverage}
                  min={0.01}
                  onChange={(x) => update("boxCoverage", x)}
                  hint="Use the coverage stated on the tile box."
                />

                <NumberInput
                  label="Tiles per box (optional)"
                  value={v.tilesPerBox}
                  min={0}
                  step={1}
                  onChange={(x) =>
                    update("tilesPerBox", Math.max(0, Math.floor(x)))
                  }
                  hint="Enter 0 if you only know box coverage."
                />

                <NumberInput
                  label={`Price per box (${v.currency})`}
                  value={v.pricePerBox}
                  min={0}
                  onChange={(x) => update("pricePerBox", x)}
                />

                <SelectInput
                  label="Currency"
                  value={v.currency}
                  onChange={(x) => update("currency", x)}
                >
                  <option value="USD">USD – US Dollar</option>
                  <option value="INR">INR – Indian Rupee</option>
                  <option value="EUR">EUR – Euro</option>
                  <option value="GBP">GBP – British Pound</option>
                  <option value="CAD">CAD – Canadian Dollar</option>
                  <option value="AUD">AUD – Australian Dollar</option>
                  <option value="AED">AED – UAE Dirham</option>
                </SelectInput>
              </div>

              {calc.packagingMismatch && (
                <div className="tc-warning" style={{ marginTop: 14 }}>
                  <strong>Packaging information may not match.</strong>{" "}
                  Based on the entered tile dimensions and tiles per box,
                  calculated coverage is{" "}
                  {fmt(calc.expectedCoverageFromTileCount)} sq ft,
                  but entered box coverage is {fmt(v.boxCoverage)} sq ft.
                  Check the manufacturer's packaging.
                </div>
              )}

              {!calc.packagingMismatch && v.tilesPerBox > 0 && (
                <div className="tc-success" style={{ marginTop: 14 }}>
                  Packaging check: the entered tile count and box
                  coverage are reasonably consistent.
                </div>
              )}
            </section>

            {/* 5. Grout */}

            <section className="tc-card">
              <h3 className="tc-heading">
                5. Grout quantity and pricing
              </h3>
              <p className="tc-description">
                Estimate grout consumption using tile dimensions,
                tile thickness and grout joint width. Enter your
                grout bag size and price to calculate purchase costs.
              </p>

              <div className="tc-grid">
                <NumberInput
                  label="Grout waste allowance (%)"
                  value={v.groutWaste}
                  min={0}
                  max={100}
                  onChange={(x) => update("groutWaste", x)}
                  hint="Extra allowance for mixing and application losses."
                />

                <NumberInput
                  label="Grout bag size (kg)"
                  value={v.groutBagSize}
                  min={0.01}
                  onChange={(x) => update("groutBagSize", x)}
                />

                <NumberInput
                  label={`Grout price per bag (${v.currency})`}
                  value={v.groutPricePerBag}
                  min={0}
                  onChange={(x) => update("groutPricePerBag", x)}
                />
              </div>

              <div className="tc-info">
                Estimated grout consumption:{" "}
                <strong>{fmt(calc.groutConsumptionPerSqm)} kg/sq m</strong>
                <br />
                Grout required before waste:{" "}
                <strong>{fmt(calc.groutBaseKg)} kg</strong>
                <br />
                Grout including waste:{" "}
                <strong>{fmt(calc.groutWithWasteKg)} kg</strong>
                <br />
                Estimated bags required: <strong>{calc.groutBags}</strong>
                <br />
                <span>
                  This is an approximate estimate. Actual grout consumption
                  varies with grout density, joint profile and product.
                </span>
              </div>
            </section>

            {/* 6. Adhesive */}

            <section className="tc-card">
              <h3 className="tc-heading">
                6. Tile adhesive quantity and pricing
              </h3>
              <p className="tc-description">
                Enter the coverage stated by your adhesive manufacturer.
                Adhesive is estimated for the actual floor area being tiled,
                not the extra tile material purchased for cutting.
              </p>

              <div className="tc-grid">
                <NumberInput
                  label="Coverage per adhesive bag (sq ft)"
                  value={v.adhesiveCoverage}
                  min={0.01}
                  onChange={(x) => update("adhesiveCoverage", x)}
                  hint="Use the manufacturer's stated coverage per bag."
                />

                <NumberInput
                  label="Adhesive bag size (kg)"
                  value={v.adhesiveBagSize}
                  min={0.01}
                  onChange={(x) => update("adhesiveBagSize", x)}
                />

                <NumberInput
                  label={`Adhesive price per bag (${v.currency})`}
                  value={v.adhesivePricePerBag}
                  min={0}
                  onChange={(x) => update("adhesivePricePerBag", x)}
                />
              </div>

              <div className="tc-info">
                Installation area: <strong>{fmt(calc.netArea)} sq ft</strong>
                <br />
                Adhesive bag size:{" "}
                <strong>{fmt(v.adhesiveBagSize)} kg</strong>
                <br />
                Coverage per bag:{" "}
                <strong>{fmt(v.adhesiveCoverage)} sq ft</strong>
                <br />
                Adhesive bags required:{" "}
                <strong>{calc.adhesiveBags}</strong>
                <br />
                Purchased coverage:{" "}
                <strong>{fmt(calc.adhesivePurchasedCoverage)} sq ft</strong>
                <br />
                Estimated spare coverage:{" "}
                <strong>{fmt(calc.adhesiveSpareCoverage)} sq ft</strong>
                <br />
                <span>
                  Bag weight is informational. The manufacturer's coverage
                  per bag determines the quantity.
                </span>
              </div>
            </section>

            {/* 7. Other costs */}

            <section className="tc-card">
              <h3 className="tc-heading">
                7. Installation and extra costs
              </h3>
              <p className="tc-description">
                Include labor, underlayment, floor preparation,
                delivery and applicable sales tax or GST.
              </p>

              <div className="tc-grid">
                <NumberInput
                  label={`Labor per ${areaUnit} (${v.currency})`}
                  value={v.laborRate}
                  min={0}
                  onChange={(x) => update("laborRate", x)}
                  hint="Labor rate per selected area unit."
                />

                <NumberInput
                  label={`Underlayment per ${areaUnit} (${v.currency})`}
                  value={v.underlaymentRate}
                  min={0}
                  onChange={(x) => update("underlaymentRate", x)}
                  hint="Material rate per selected area unit."
                />

                <NumberInput
                  label={`Floor preparation (${v.currency})`}
                  value={v.preparationCost}
                  min={0}
                  onChange={(x) => update("preparationCost", x)}
                />

                <NumberInput
                  label={`Delivery (${v.currency})`}
                  value={v.deliveryCost}
                  min={0}
                  onChange={(x) => update("deliveryCost", x)}
                />

                <NumberInput
                  label="Sales tax / GST (%)"
                  value={v.taxRate}
                  min={0}
                  max={100}
                  onChange={(x) => update("taxRate", x)}
                />
              </div>
            </section>

            {/* Notes */}

            <section className="tc-card tc-note">
              <h3 className="tc-heading">Important estimation notes</h3>
              <ul>
                <li>
                  Tile box quantities use the manufacturer's stated
                  coverage per box.
                </li>
                <li>
                  The individual tile count is a theoretical area-based
                  estimate. It is not a cutting or placement plan.
                </li>
                <li>
                  Pattern allowance and additional waste are compounded
                  to calculate the tile purchase area.
                </li>
                <li>
                  Grout quantity uses an approximate formula based on
                  tile dimensions, thickness and joint width.
                </li>
                <li>
                  Adhesive quantity uses the manufacturer's coverage
                  per bag and the actual installation area.
                </li>
                <li>
                  Adhesive bag weight is informational; coverage per bag
                  determines the number of bags.
                </li>
                <li>
                  Labor and underlayment rates use your selected
                  room measurement unit.
                </li>
                <li>
                  Actual material requirements depend on installation
                  technique, substrate, product specifications and cuts.
                </li>
              </ul>
            </section>
          </div>

          {/* RIGHT: RESULTS */}

          <div className="tc-results">
            <section className="tc-card">
              <h3 className="tc-heading">Your tile estimate</h3>
              <p className="tc-description">
                Your estimate updates automatically as you change
                the calculator inputs.
              </p>

              {!valid ? (
                <div className="tc-warning">
                  <strong>Check your inputs</strong>
                  <br />
                  {validationMessage}
                </div>
              ) : (
                <>
                  <div className="tc-metric-grid">
                    <Metric
                      label="Net floor area"
                      value={`${fmt(calc.selectedArea)} ${areaUnit}`}
                      detail={`${fmt(calc.netArea)} sq ft`}
                      accent
                      full
                    />

                    <Metric
                      label="Area to purchase"
                      value={`${fmt(calc.orderArea)} sq ft`}
                      detail={`${fmt(calc.totalWaste)}% combined allowance`}
                    />

                    <Metric
                      label="Estimated tiles"
                      value={calc.tileCount.toLocaleString("en-US")}
                      detail={`${fmt(calc.tileAreaSqft)} sq ft per tile`}
                    />

                    <Metric
                      label="Boxes required"
                      value={calc.boxCount.toLocaleString("en-US")}
                      detail={`${fmt(calc.purchasedCoverage)} sq ft purchased`}
                      accent
                    />

                    <Metric
                      label="Grout bags"
                      value={calc.groutBags.toLocaleString("en-US")}
                      detail={`${fmt(calc.groutWithWasteKg)} kg required`}
                    />

                    <Metric
                      label="Adhesive bags"
                      value={calc.adhesiveBags.toLocaleString("en-US")}
                      detail={`${fmt(calc.netArea)} sq ft installation area`}
                    />

                    <Metric
                      label="Estimated total cost"
                      value={money(calc.totalCost)}
                      detail={`${money(calc.costPerArea)} per ${areaUnit}`}
                      accent
                      full
                    />
                  </div>

                  <h4 className="tc-section-title">
                    Floor area breakdown
                  </h4>

                  <div className="tc-row">
                    <div>
                      <strong>Original floor area</strong>
                      <small>Combined room measurements</small>
                    </div>
                    <strong>{fmt(calc.roomArea)} sq ft</strong>
                  </div>

                  {calc.roomBreakdown.map((room) => (
                    <div className="tc-row" key={room.id}>
                      <div>
                        <strong>{room.name || "Unnamed area"}</strong>
                        <small>
                          {fmt(room.length)} × {fmt(room.width)} {v.unit}
                        </small>
                      </div>
                      <strong>{fmt(room.areaSqft)} sq ft</strong>
                    </div>
                  ))}

                  {calc.excludedSqft > 0 && (
                    <div className="tc-row">
                      <span>Excluded area</span>
                      <strong>-{fmt(calc.excludedSqft)} sq ft</strong>
                    </div>
                  )}

                  {calc.additionalSqft > 0 && (
                    <div className="tc-row">
                      <span>Additional area</span>
                      <strong>+{fmt(calc.additionalSqft)} sq ft</strong>
                    </div>
                  )}

                  <div className="tc-row">
                    <strong>Net floor area</strong>
                    <strong>{fmt(calc.netArea)} sq ft</strong>
                  </div>

                  <h4 className="tc-section-title">
                    Tile material requirements
                  </h4>

                  <div className="tc-row">
                    <span>Additional waste</span>
                    <strong>{v.waste}%</strong>
                  </div>

                  <div className="tc-row">
                    <span>Pattern allowance</span>
                    <strong>{calc.patternWaste}%</strong>
                  </div>

                  <div className="tc-row">
                    <span>Combined allowance</span>
                    <strong>{fmt(calc.totalWaste)}%</strong>
                  </div>

                  <div className="tc-row">
                    <span>Area to purchase</span>
                    <strong>{fmt(calc.orderArea)} sq ft</strong>
                  </div>

                  <div className="tc-row">
                    <span>Theoretical individual tile count</span>
                    <strong>{calc.tileCount.toLocaleString("en-US")}</strong>
                  </div>

                  <div className="tc-row">
                    <div>
                      <strong>Complete boxes</strong>
                      <small>
                        {fmt(calc.spareCoverage)} sq ft estimated spare
                      </small>
                    </div>
                    <strong>{calc.boxCount}</strong>
                  </div>

                  {v.tilesPerBox > 0 && (
                    <div className="tc-row">
                      <span>Tiles included in purchased boxes</span>
                      <strong>
                        {calc.tilesIncludedInBoxes?.toLocaleString("en-US")}
                      </strong>
                    </div>
                  )}

                  <h4 className="tc-section-title">
                    Grout requirements
                  </h4>

                  <div className="tc-row">
                    <span>Grout joint width</span>
                    <strong>{fmt(v.groutJoint)} mm</strong>
                  </div>

                  <div className="tc-row">
                    <span>Grout consumption</span>
                    <strong>
                      {fmt(calc.groutConsumptionPerSqm)} kg/sq m
                    </strong>
                  </div>

                  <div className="tc-row">
                    <span>Grout including waste</span>
                    <strong>{fmt(calc.groutWithWasteKg)} kg</strong>
                  </div>

                  <div className="tc-row">
                    <span>Grout bags required</span>
                    <strong>{calc.groutBags}</strong>
                  </div>

                  <div className="tc-row">
                    <span>Purchased grout</span>
                    <strong>{fmt(calc.groutPurchasedKg)} kg</strong>
                  </div>

                  <div className="tc-row">
                    <span>Estimated spare grout</span>
                    <strong>{fmt(calc.groutSpareKg)} kg</strong>
                  </div>

                  <h4 className="tc-section-title">
                    Adhesive requirements
                  </h4>

                  <div className="tc-row">
                    <span>Installation area</span>
                    <strong>{fmt(calc.netArea)} sq ft</strong>
                  </div>

                  <div className="tc-row">
                    <span>Adhesive bag size</span>
                    <strong>{fmt(v.adhesiveBagSize)} kg</strong>
                  </div>

                  <div className="tc-row">
                    <span>Coverage per bag</span>
                    <strong>{fmt(v.adhesiveCoverage)} sq ft</strong>
                  </div>

                  <div className="tc-row">
                    <span>Adhesive bags required</span>
                    <strong>{calc.adhesiveBags}</strong>
                  </div>

                  <div className="tc-row">
                    <span>Purchased coverage</span>
                    <strong>
                      {fmt(calc.adhesivePurchasedCoverage)} sq ft
                    </strong>
                  </div>

                  <div className="tc-row">
                    <span>Estimated spare coverage</span>
                    <strong>
                      {fmt(calc.adhesiveSpareCoverage)} sq ft
                    </strong>
                  </div>

                  <label className="tc-switch">
                    <input
                      type="checkbox"
                      checked={v.showDetails}
                      onChange={(e) => update("showDetails", e.target.checked)}
                    />
                    <span>Show detailed cost breakdown</span>
                  </label>

                  {v.showDetails && (
                    <>
                      <h4 className="tc-section-title">
                        Project cost breakdown
                      </h4>

                      <div className="tc-row">
                        <span>Tile material</span>
                        <strong>{money(calc.tileCost)}</strong>
                      </div>

                      <div className="tc-row">
                        <span>Grout</span>
                        <strong>{money(calc.groutCost)}</strong>
                      </div>

                      <div className="tc-row">
                        <span>Tile adhesive</span>
                        <strong>{money(calc.adhesiveCost)}</strong>
                      </div>

                      <div className="tc-row">
                        <span>Underlayment</span>
                        <strong>{money(calc.underlaymentCost)}</strong>
                      </div>

                      <div className="tc-row">
                        <span>Installation labor</span>
                        <strong>{money(calc.laborCost)}</strong>
                      </div>

                      <div className="tc-row">
                        <span>Floor preparation</span>
                        <strong>{money(v.preparationCost)}</strong>
                      </div>

                      <div className="tc-row">
                        <span>Delivery</span>
                        <strong>{money(v.deliveryCost)}</strong>
                      </div>

                      <div className="tc-row">
                        <span>Subtotal</span>
                        <strong>{money(calc.subtotal)}</strong>
                      </div>

                      <div className="tc-row">
                        <span>Tax ({v.taxRate}%)</span>
                        <strong>{money(calc.tax)}</strong>
                      </div>

                      <div className="tc-row">
                        <strong>Total project cost</strong>
                        <strong style={{ color: "#e94f18", fontSize: 17 }}>
                          {money(calc.totalCost)}
                        </strong>
                      </div>
                    </>
                  )}

                  <div className="tc-actions" style={{ marginTop: 17 }}>
                    <button
                      type="button"
                      className="tc-btn tc-btn-primary"
                      onClick={copySummary}
                    >
                      {copied ? "Copied!" : "Copy estimate"}
                    </button>

                    <button
                      type="button"
                      className="tc-btn"
                      onClick={() => window.print()}
                    >
                      Print estimate
                    </button>
                  </div>

                  <p className="tc-muted" style={{ marginTop: 12 }}>
                    Estimates are approximate. Confirm tile, grout and
                    adhesive quantities with manufacturer coverage
                    information and your installer.
                  </p>
                </>
              )}
            </section>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <Result>
            This calculator provides approximate tile, grout, adhesive
            and project cost estimates. Tile quantities use the entered
            tile dimensions and manufacturer box coverage. Grout
            consumption is estimated from tile dimensions, thickness
            and joint width. Adhesive quantities use the entered
            manufacturer coverage per bag and the actual installation
            area. Actual requirements depend on installation technique,
            substrate, product specifications and cutting. Confirm
            quantities with your tile supplier or installer before
            purchasing.
          </Result>
        </div>
      </div>
    </ToolShell>
  );
}
