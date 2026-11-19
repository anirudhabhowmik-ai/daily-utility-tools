
"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import ToolShell, { Result } from "../ToolShell";

/* ------------------------------------------------------------------ */
/* Constants and types                                                  */
/* ------------------------------------------------------------------ */

const SQFT_PER_SQM = 10.7639104;
const SQFT_PER_SQCM = 929.0304;
const SQFT_PER_SQIN = 144;
const FT_PER_M = 3.280839895;
const FT_PER_CM = 1 / 30.48;
const FT_PER_IN = 1 / 12;
const LITERS_PER_GALLON = 3.785411784;
const MIL_COVERAGE_CONSTANT = 1604;

type Unit = "ft" | "m" | "cm" | "in";
type Mode = "coverage" | "thickness";
type LayerKey = "primer" | "epoxy" | "topcoat";

type Room = {
  id: number;
  name: string;
  length: number;
  width: number;
};

type Layer = {
  enabled: boolean;
  coats: number;
  mode: Mode;
  coverage: number;
  mils: number;
  solids: number;
  kitSize: number;
  kitPrice: number;
};

type Values = {
  unit: Unit;
  currency: string;
  rooms: Room[];
  additionalArea: number;
  coveEnabled: boolean;
  coveLength: number;
  coveHeight: number;
  layers: Record<LayerKey, Layer>;
  flakeEnabled: boolean;
  flakeRate: number;
  flakeBagSize: number;
  flakeBagPrice: number;
  surfaceFactor: number;
  waste: number;
  taxRate: number;
  shipping: number;
  laborRate: number;
};

const UNIT_META: Record<
  Unit,
  { label: string; area: string; toFeet: number; toSqFt: number }
> = {
  ft: {
    label: "Feet (ft)",
    area: "sq ft",
    toFeet: 1,
    toSqFt: 1,
  },
  m: {
    label: "Meters (m)",
    area: "sq m",
    toFeet: FT_PER_M,
    toSqFt: SQFT_PER_SQM,
  },
  cm: {
    label: "Centimeters (cm)",
    area: "sq cm",
    toFeet: FT_PER_CM,
    toSqFt: SQFT_PER_SQCM,
  },
  in: {
    label: "Inches (in)",
    area: "sq in",
    toFeet: FT_PER_IN,
    toSqFt: SQFT_PER_SQIN,
  },
};

const makeDefaults = (): Values => ({
  unit: "ft",
  currency: "USD",
  rooms: [
    {
      id: 1,
      name: "Main floor",
      length: 20,
      width: 12,
    },
  ],
  additionalArea: 0,
  coveEnabled: false,
  coveLength: 0,
  coveHeight: 4,

  layers: {
    primer: {
      enabled: true,
      coats: 1,
      mode: "coverage",
      coverage: 300,
      mils: 4,
      solids: 100,
      kitSize: 3,
      kitPrice: 0,
    },
    epoxy: {
      enabled: true,
      coats: 2,
      mode: "coverage",
      coverage: 250,
      mils: 8,
      solids: 100,
      kitSize: 3,
      kitPrice: 0,
    },
    topcoat: {
      enabled: true,
      coats: 1,
      mode: "coverage",
      coverage: 300,
      mils: 3,
      solids: 60,
      kitSize: 1,
      kitPrice: 0,
    },
  },

  flakeEnabled: false,
  flakeRate: 25,
  flakeBagSize: 40,
  flakeBagPrice: 0,

  surfaceFactor: 1,
  waste: 10,
  taxRate: 0,
  shipping: 0,
  laborRate: 0,
});

const LAYER_META: {
  key: LayerKey;
  title: string;
  text: string;
}[] = [
  {
    key: "primer",
    title: "Epoxy primer",
    text: "Penetrating primer for compatible substrates. Follow the manufacturer's preparation instructions.",
  },
  {
    key: "epoxy",
    title: "Epoxy base coat",
    text: "The main build coat. Coverage depends on the formulation and specified film thickness.",
  },
  {
    key: "topcoat",
    title: "Protective topcoat",
    text: "Clear coat or polyurethane topcoat, if your coating system calls for one.",
  },
];

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

const css = `
.ec-root {
  grid-column: 1 / -1;
  width: 100%;
  max-width: none;
  min-width: 0;
  box-sizing: border-box;
  color: #172033;
  container-type: inline-size;
  font-family: inherit;
}

.ec-root * {
  box-sizing: border-box;
}

.ec-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  align-items: start;
  width: 100%;
}

.ec-main,
.ec-aside {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ec-aside {
  gap: 16px;
}

.ec-card {
  border: 1px solid #e5eaf2;
  border-radius: 18px;
  background: linear-gradient(180deg, #fff 0%, #fcfdff 100%);
  padding: 22px;
  min-width: 0;
  box-shadow: 0 5px 18px rgba(15, 23, 42, .035);
  transition: border-color .2s ease, box-shadow .2s ease;
}

.ec-card:hover {
  border-color: #ffd0bf;
  box-shadow: 0 9px 26px rgba(15, 23, 42, .055);
}

.ec-h {
  font-size: 16px;
  font-weight: 760;
  letter-spacing: -.025em;
  color: #172033;
  margin: 0 0 6px;
}

.ec-p {
  font-size: 13px;
  color: #64748b;
  line-height: 1.7;
  margin: 0 0 18px;
}

.ec-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 18px 16px;
  align-items: stretch;
}

/* Every field uses the same three rows:
   label, input, helper text. This keeps inputs aligned. */

.ec-field {
  display: grid;
  grid-template-rows: auto 46px minmax(30px, auto);
  align-content: start;
  min-width: 0;
}

.ec-label {
  display: flex;
  align-items: flex-end;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .01em;
  color: #475569;
  margin: 0 0 8px;
  line-height: 1.35;
  min-height: 32px;
}

.ec-input,
.ec-select {
  width: 100%;
  height: 46px;
  min-width: 0;
  padding: 0 13px;
  border: 1px solid #d8e0eb;
  border-radius: 11px;
  background: #fff;
  color: #172033;
  font-size: 14px;
  font-family: inherit;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .025);
  transition: border-color .18s ease, box-shadow .18s ease;
}

.ec-input:hover,
.ec-select:hover {
  border-color: #ffad91;
}

.ec-input:focus,
.ec-select:focus {
  outline: none;
  border-color: #ff5a1f;
  box-shadow: 0 0 0 4px rgba(255, 90, 31, .13);
}

.ec-input::placeholder {
  color: #94a3b8;
}

.ec-select {
  appearance: none;
  padding-right: 38px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 13px center;
}

.ec-hint {
  min-height: 30px;
  padding-top: 7px;
  font-size: 11px;
  color: #8492a6;
  line-height: 1.5;
}

/* Premium toggle switch */

.ec-check {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  font-weight: 650;
  color: #334155;
  margin: 2px 0 18px;
  cursor: pointer;
  min-height: 30px;
  width: fit-content;
  user-select: none;
}

.ec-check input {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  flex: 0 0 46px;
  width: 46px;
  height: 27px;
  margin: 0;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #e2e8f0;
  cursor: pointer;
  transition: background .2s ease, border-color .2s ease, box-shadow .2s ease;
}

.ec-check input::before {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, .2);
  transition: transform .2s ease;
}

.ec-check input:checked {
  background: #ff5a1f;
  border-color: #ff5a1f;
  box-shadow: 0 2px 7px rgba(255, 90, 31, .22);
}

.ec-check input:checked::before {
  transform: translateX(19px);
}

.ec-check input:focus-visible {
  outline: 3px solid rgba(255, 90, 31, .2);
  outline-offset: 3px;
}

.ec-btn {
  min-height: 42px;
  border: 1px solid #d6dfeb;
  background: #fff;
  color: #334155;
  border-radius: 11px;
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
  font-family: inherit;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .035);
  transition: transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease;
}

.ec-btn:hover {
  background: #fff7f3;
  border-color: #ffb69d;
  box-shadow: 0 4px 12px rgba(15, 23, 42, .07);
  transform: translateY(-1px);
}

.ec-btn:active {
  transform: translateY(0);
}

.ec-btn:focus-visible {
  outline: 3px solid rgba(255, 90, 31, .2);
  outline-offset: 2px;
}

.ec-btn:disabled {
  opacity: .45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.ec-btn-primary {
  background: linear-gradient(135deg, #ff6b35, #ff5a1f);
  border-color: #ff5a1f;
  color: #fff;
  box-shadow: 0 4px 10px rgba(255, 90, 31, .2);
}

.ec-btn-primary:hover {
  background: linear-gradient(135deg, #f4511e, #e94712);
  border-color: #e94712;
  color: #fff;
  box-shadow: 0 7px 16px rgba(255, 90, 31, .25);
}

.ec-btn-danger {
  color: #dc2626;
  border-color: #fecaca;
  background: #fffafa;
}

.ec-btn-danger:hover {
  color: #b91c1c;
  background: #fff1f2;
  border-color: #fda4af;
}

.ec-metric {
  padding: 16px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e8edf4;
  min-width: 0;
}

.ec-metric.accent {
  background: linear-gradient(135deg, #fff3ed, #fffaf7);
  border-color: #ffd1c0;
}

.ec-metric-l {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .035em;
  text-transform: uppercase;
  color: #718096;
  margin-bottom: 8px;
}

.ec-metric-v {
  font-size: 23px;
  line-height: 1.2;
  font-weight: 820;
  letter-spacing: -.035em;
  color: #172033;
  overflow-wrap: anywhere;
}

.ec-metric.accent .ec-metric-v {
  color: #e94f18;
}

.ec-metric-d {
  font-size: 11px;
  color: #718096;
  margin-top: 7px;
  line-height: 1.45;
}

.ec-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid #edf1f6;
  font-size: 13px;
  color: #334155;
}

.ec-row:last-child {
  border-bottom: none;
}

.ec-row strong {
  font-weight: 750;
  color: #1e293b;
}

.ec-row small {
  display: block;
  color: #8290a3;
  font-size: 11px;
  margin-top: 4px;
  line-height: 1.4;
}

/* Room layout and aligned Remove button */

.ec-room {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
  margin-bottom: 16px;
  padding: 0 0 16px;
  border-bottom: 1px dashed #dce4ee;
}

.ec-room .ec-field:first-child {
  grid-column: 1 / -1;
}

.ec-room-remove {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ec-room-remove .ec-label {
  visibility: hidden;
}

.ec-room-remove .ec-btn {
  width: 100%;
  height: 46px;
  min-height: 46px;
  padding: 0 12px;
}

.ec-warn {
  padding: 15px;
  background: #fff5f5;
  color: #b42318;
  border: 1px solid #fecaca;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.65;
}

.ec-note {
  background: linear-gradient(135deg, #fffbeb, #fffdf6);
  border-color: #f5dfaa;
}

.ec-note ul {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: #795b20;
  line-height: 2;
}

.ec-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.ec-aside > .ec-card {
  border-color: #ffd8ca;
  box-shadow: 0 10px 30px rgba(255, 90, 31, .07);
}

.ec-aside > .ec-card > .ec-h {
  font-size: 17px;
}

@container (min-width: 620px) {
  .ec-room {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) 104px;
    border-bottom: none;
    padding-bottom: 0;
  }

  .ec-room .ec-field:first-child {
    grid-column: auto;
  }
}

@container (min-width: 900px) {
  .ec-layout {
    grid-template-columns: minmax(0, 1fr) 340px;
  }

  .ec-aside {
    position: sticky;
    top: 16px;
  }
}

@media (max-width: 520px) {
  .ec-card {
    padding: 17px;
    border-radius: 15px;
  }

  .ec-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }

  .ec-metric-v {
    font-size: 21px;
  }

  .ec-room {
    grid-template-columns: minmax(0, 1fr);
  }

  .ec-room .ec-field:first-child {
    grid-column: auto;
  }

  .ec-actions .ec-btn {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ec-root * {
    transition: none !important;
    scroll-behavior: auto !important;
  }
}

@media print {
  .ec-actions,
  .ec-btn {
    display: none !important;
  }

  .ec-layout {
    grid-template-columns: 1fr;
  }

  .ec-aside {
    position: static;
  }

  .ec-card {
    box-shadow: none;
    break-inside: avoid;
  }
}
`;

/* ------------------------------------------------------------------ */
/* Reusable UI components                                               */
/* ------------------------------------------------------------------ */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <div className="ec-field">
      <label className="ec-label" htmlFor={id}>
        {label}
      </label>

      {typeof children === "function"
        ? children
        : children}

      {hint ? (
        <div className="ec-hint">{hint}</div>
      ) : (
        <div className="ec-hint" aria-hidden="true" />
      )}
    </div>
  );
}

function NumberField({
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
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  hint?: string;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));

  useEffect(() => {
    if (Number(text) !== value) {
      setText(String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="ec-field">
      <label className="ec-label" htmlFor={id}>
        {label}
      </label>

      <input
        id={id}
        className="ec-input"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);

          if (next.trim() === "") {
            onChange(0);
            return;
          }

          const n = Number(next);
          if (Number.isFinite(n)) {
            onChange(n);
          }
        }}
      />

      {hint ? (
        <div className="ec-hint">{hint}</div>
      ) : (
        <div className="ec-hint" aria-hidden="true" />
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();

  return (
    <div className="ec-field">
      <label className="ec-label" htmlFor={id}>
        {label}
      </label>

      <input
        id={id}
        className="ec-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <div className="ec-hint" aria-hidden="true" />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <div className="ec-field">
      <label className="ec-label" htmlFor={id}>
        {label}
      </label>

      <select
        id={id}
        className="ec-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>

      <div className="ec-hint" aria-hidden="true" />
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div className={`ec-metric${accent ? " accent" : ""}`}>
      <div className="ec-metric-l">{label}</div>
      <div className="ec-metric-v">{value}</div>
      {detail && <div className="ec-metric-d">{detail}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main calculator                                                      */
/* ------------------------------------------------------------------ */

export default function CoatingCalculator() {
  const [v, setV] = useState<Values>(makeDefaults);
  const [copied, setCopied] = useState(false);

  const update = <K extends keyof Values>(
    key: K,
    value: Values[K],
  ) => {
    setV((p) => ({ ...p, [key]: value }));
  };

  const updateLayer = (
    key: LayerKey,
    patch: Partial<Layer>,
  ) => {
    setV((p) => ({
      ...p,
      layers: {
        ...p.layers,
        [key]: {
          ...p.layers[key],
          ...patch,
        },
      },
    }));
  };

  const updateRoom = (
    id: number,
    patch: Partial<Room>,
  ) => {
    setV((p) => ({
      ...p,
      rooms: p.rooms.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      ),
    }));
  };

  const addRoom = () => {
    setV((p) => ({
      ...p,
      rooms: [
        ...p.rooms,
        {
          id: Date.now(),
          name: `Area ${p.rooms.length + 1}`,
          length: 10,
          width: 10,
        },
      ],
    }));
  };

  const removeRoom = (id: number) => {
    setV((p) => ({
      ...p,
      rooms: p.rooms.filter((r) => r.id !== id),
    }));
  };

  const reset = () => setV(makeDefaults);

  const money = (n: number) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: v.currency,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return n.toFixed(2);
    }
  };

  const fmt = (n: number) =>
    Number.isFinite(n) ? n.toFixed(2) : "0.00";

  const areaUnit = UNIT_META[v.unit].area;

  /* ---------------------------------------------------------------- */
  /* Calculations                                                       */
  /* ---------------------------------------------------------------- */

  const calc = useMemo(() => {
    const linearToFeet = UNIT_META[v.unit].toFeet;
    const areaToSqFt = UNIT_META[v.unit].toSqFt;

    // Convert every room's dimensions to square feet.
    const roomsSqft = v.rooms.reduce((sum, room) => {
      const lengthFt = room.length * linearToFeet;
      const widthFt = room.width * linearToFeet;

      return sum + lengthFt * widthFt;
    }, 0);

    // Additional area is entered in the selected square unit.
    const extraSqft = v.additionalArea * areaToSqFt;

    // Cove length uses the selected linear unit.
    // Cove height is always entered in inches.
    const coveSqft = v.coveEnabled
      ? v.coveLength *
        linearToFeet *
        (v.coveHeight / 12)
      : 0;

    const area = roomsSqft + extraSqft + coveSqft;
    const adjustedArea = area * v.surfaceFactor;

    const calculateLayer = (layer: Layer) => {
      const coverage =
        layer.mode === "thickness"
          ? layer.mils > 0 && layer.solids > 0
            ? (MIL_COVERAGE_CONSTANT *
                (layer.solids / 100)) /
              layer.mils
            : 0
          : layer.coverage;

      const required =
        layer.enabled &&
        layer.coats > 0 &&
        coverage > 0
          ? (adjustedArea *
              layer.coats *
              (1 + v.waste / 100)) /
            coverage
          : 0;

      const kits =
        required > 0 && layer.kitSize > 0
          ? Math.ceil(required / layer.kitSize)
          : 0;

      const purchased = kits * layer.kitSize;

      return {
        coverage,
        required,
        kits,
        purchased,
        leftover: Math.max(0, purchased - required),
        cost: kits * layer.kitPrice,
      };
    };

    const primer = calculateLayer(v.layers.primer);
    const epoxy = calculateLayer(v.layers.epoxy);
    const topcoat = calculateLayer(v.layers.topcoat);

    const flakeLb = v.flakeEnabled
      ? (area / 100) * v.flakeRate
      : 0;

    const flakeBags =
      flakeLb > 0 && v.flakeBagSize > 0
        ? Math.ceil(flakeLb / v.flakeBagSize)
        : 0;

    const flakeCost = flakeBags * v.flakeBagPrice;

    const totalRequired =
      primer.required +
      epoxy.required +
      topcoat.required;

    const totalPurchased =
      primer.purchased +
      epoxy.purchased +
      topcoat.purchased;

    const totalKits =
      primer.kits +
      epoxy.kits +
      topcoat.kits;

    const productCost =
      primer.cost +
      epoxy.cost +
      topcoat.cost +
      flakeCost;

    const tax = (productCost * v.taxRate) / 100;

    // Labor rate is charged per selected square unit.
    const areaInSelectedUnit = area / areaToSqFt;
    const labor = areaInSelectedUnit * v.laborRate;

    const totalCost =
      productCost +
      tax +
      v.shipping +
      labor;

    const costPerArea =
      areaInSelectedUnit > 0
        ? totalCost / areaInSelectedUnit
        : 0;

    return {
      area,
      areaInSelectedUnit,
      adjustedArea,
      roomsSqft,
      extraSqft,
      coveSqft,

      primer,
      epoxy,
      topcoat,

      flakeLb,
      flakeBags,
      flakeCost,

      totalRequired,
      totalPurchased,
      totalKits,

      productCost,
      tax,
      labor,
      totalCost,
      costPerArea,

      extra: Math.max(0, totalPurchased - totalRequired),
    };
  }, [v]);

  const toDisplay = (sqft: number) =>
    sqft / UNIT_META[v.unit].toSqFt;

  const anyLayer = Object.values(v.layers).some(
    (layer) => layer.enabled,
  );

  const valid =
    v.rooms.length > 0 &&
    v.rooms.every(
      (room) => room.length > 0 && room.width > 0,
    ) &&
    calc.area > 0 &&
    v.waste >= 0 &&
    v.waste <= 100 &&
    v.surfaceFactor > 0 &&
    v.taxRate >= 0 &&
    v.shipping >= 0 &&
    v.laborRate >= 0 &&
    anyLayer &&
    Object.values(v.layers).every(
      (layer) =>
        !layer.enabled ||
        (
          layer.kitSize > 0 &&
          layer.kitPrice >= 0 &&
          layer.coats > 0 &&
          (
            layer.mode === "coverage"
              ? layer.coverage > 0
              : layer.mils > 0 &&
                layer.solids > 0 &&
                layer.solids <= 100
          )
        ),
    ) &&
    (
      !v.flakeEnabled ||
      (
        v.flakeRate >= 0 &&
        v.flakeBagSize > 0 &&
        v.flakeBagPrice >= 0
      )
    );

  /* ---------------------------------------------------------------- */
  /* Copyable summary                                                   */
  /* ---------------------------------------------------------------- */

  const summaryText = () => {
    const lines = [
      "Epoxy floor coating estimate",
      `Area: ${fmt(toDisplay(calc.area))} ${areaUnit} (${fmt(calc.area)} sq ft)`,
      `Waste: ${v.waste}% | Surface factor: x${v.surfaceFactor}`,
      "",
    ];

    LAYER_META.forEach(({ key, title }) => {
      const data = calc[key];

      if (v.layers[key].enabled) {
        lines.push(
          `${title}: ${fmt(data.required)} gal -> ${data.kits} kit(s) of ${v.layers[key].kitSize} gal`,
        );
      }
    });

    if (v.flakeEnabled) {
      lines.push(
        `Decorative flake: ${fmt(calc.flakeLb)} lb -> ${calc.flakeBags} bag(s)`,
      );
    }

    lines.push("", `Products: ${money(calc.productCost)}`);

    if (calc.tax) lines.push(`Tax: ${money(calc.tax)}`);
    if (v.shipping) lines.push(`Shipping: ${money(v.shipping)}`);
    if (calc.labor) lines.push(`Labor: ${money(calc.labor)}`);

    lines.push(
      `Total: ${money(calc.totalCost)} (${money(calc.costPerArea)} per ${areaUnit})`,
    );

    return lines.join("\n");
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
  /* Layer UI                                                           */
  /* ---------------------------------------------------------------- */

  const renderLayer = (
    n: number,
    key: LayerKey,
    title: string,
    description: string,
  ) => {
    const layer = v.layers[key];
    const data = calc[key];

    return (
      <section className="ec-card" key={key}>
        <h3 className="ec-h">
          {n}. {title}
        </h3>

        <p className="ec-p">{description}</p>

        <label className="ec-check">
          <input
            type="checkbox"
            checked={layer.enabled}
            onChange={() =>
              updateLayer(key, {
                enabled: !layer.enabled,
              })
            }
          />
          <span>Include this layer</span>
        </label>

        {layer.enabled && (
          <div className="ec-grid">
            <NumberField
              label="Number of coats"
              value={layer.coats}
              min={1}
              step={1}
              onChange={(x) =>
                updateLayer(key, {
                  coats: Math.max(1, Math.floor(x)),
                })
              }
            />

            <SelectField
              label="Coverage method"
              value={layer.mode}
              onChange={(x) =>
                updateLayer(key, {
                  mode: x as Mode,
                })
              }
            >
              <option value="coverage">
                Manufacturer coverage
              </option>
              <option value="thickness">
                Film thickness (mils)
              </option>
            </SelectField>

            {layer.mode === "coverage" ? (
              <NumberField
                label="Coverage (sq ft / gal / coat)"
                value={layer.coverage}
                min={1}
                onChange={(x) =>
                  updateLayer(key, { coverage: x })
                }
                hint="Use the manufacturer's data sheet."
              />
            ) : (
              <>
                <NumberField
                  label="Dry film per coat (mils)"
                  value={layer.mils}
                  min={0.1}
                  onChange={(x) =>
                    updateLayer(key, { mils: x })
                  }
                  hint="1 mil = 0.001 inch."
                />

                <NumberField
                  label="Volume solids (%)"
                  value={layer.solids}
                  min={1}
                  max={100}
                  onChange={(x) =>
                    updateLayer(key, { solids: x })
                  }
                  hint={`Calculated coverage: ${fmt(data.coverage)} sq ft / gal`}
                />
              </>
            )}

            <NumberField
              label="Kit size (gallons)"
              value={layer.kitSize}
              min={0.01}
              onChange={(x) =>
                updateLayer(key, { kitSize: x })
              }
            />

            <NumberField
              label={`Price per kit (${v.currency})`}
              value={layer.kitPrice}
              min={0}
              onChange={(x) =>
                updateLayer(key, { kitPrice: x })
              }
            />
          </div>
        )}
      </section>
    );
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                             */
  /* ---------------------------------------------------------------- */

  return (
    <ToolShell
      title="Professional Epoxy Floor Coating Calculator"
      onReset={reset}
    >
      <style>{css}</style>

      <div className="ec-root">
        <p className="ec-p">
          Estimate primer, epoxy base, topcoat, decorative flake,
          product kits and project cost for one or more floor areas.
        </p>

        <div className="ec-layout">
          {/* LEFT: INPUTS */}

          <div className="ec-main">
            {/* Floor areas */}

            <section className="ec-card">
              <h3 className="ec-h">1. Floor areas</h3>

              <p className="ec-p">
                Add every room or section you want to coat.
                Each area is measured separately and then totaled.
              </p>

              <div
                className="ec-grid"
                style={{ marginBottom: 18, maxWidth: 390 }}
              >
                <SelectField
                  label="Measurement unit"
                  value={v.unit}
                  onChange={(x) =>
                    update("unit", x as Unit)
                  }
                >
                  <option value="ft">Feet (ft)</option>
                  <option value="m">Meters (m)</option>
                  <option value="cm">Centimeters (cm)</option>
                  <option value="in">Inches (in)</option>
                </SelectField>
              </div>

              {v.rooms.map((room) => (
                <div className="ec-room" key={room.id}>
                  <TextField
                    label="Area name"
                    value={room.name}
                    onChange={(x) =>
                      updateRoom(room.id, { name: x })
                    }
                  />

                  <NumberField
                    label={`Length (${v.unit})`}
                    value={room.length}
                    min={0.01}
                    onChange={(x) =>
                      updateRoom(room.id, { length: x })
                    }
                  />

                  <NumberField
                    label={`Width (${v.unit})`}
                    value={room.width}
                    min={0.01}
                    onChange={(x) =>
                      updateRoom(room.id, { width: x })
                    }
                  />

                  {/* Spacer matches the input label height */}
                  <div className="ec-room-remove">
                    <div className="ec-label" aria-hidden="true">
                      &nbsp;
                    </div>

                    <button
                      type="button"
                      className="ec-btn ec-btn-danger"
                      disabled={v.rooms.length === 1}
                      onClick={() => removeRoom(room.id)}
                      aria-label={`Remove ${room.name}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div
                className="ec-actions"
                style={{ marginBottom: 18 }}
              >
                <button
                  type="button"
                  className="ec-btn"
                  onClick={addRoom}
                >
                  + Add area
                </button>
              </div>

              <div className="ec-grid">
                <NumberField
                  label={`Other area, e.g. steps (${areaUnit})`}
                  value={v.additionalArea}
                  onChange={(x) =>
                    update("additionalArea", x)
                  }
                  hint={`Enter the area in ${areaUnit}.`}
                />
              </div>

              <label
                className="ec-check"
                style={{ marginTop: 18 }}
              >
                <input
                  type="checkbox"
                  checked={v.coveEnabled}
                  onChange={() =>
                    update("coveEnabled", !v.coveEnabled)
                  }
                />
                <span>Include cove base / wall return</span>
              </label>

              {v.coveEnabled && (
                <div className="ec-grid">
                  <NumberField
                    label={`Cove length (${v.unit})`}
                    value={v.coveLength}
                    onChange={(x) =>
                      update("coveLength", x)
                    }
                    hint="Total linear length along the walls."
                  />

                  <NumberField
                    label="Cove height (inches)"
                    value={v.coveHeight}
                    onChange={(x) =>
                      update("coveHeight", x)
                    }
                    hint="Height is always measured in inches."
                  />
                </div>
              )}
            </section>

            {/* Coating layers */}

            {LAYER_META.map((meta, index) =>
              renderLayer(
                index + 2,
                meta.key,
                meta.title,
                meta.text,
              ),
            )}

            {/* Decorative flake */}

            <section className="ec-card">
              <h3 className="ec-h">
                5. Decorative flake (optional)
              </h3>

              <p className="ec-p">
                Broadcast chips or quartz. Typical rates are
                20 to 30 lb per 100 sq ft; check your product data.
              </p>

              <label className="ec-check">
                <input
                  type="checkbox"
                  checked={v.flakeEnabled}
                  onChange={() =>
                    update("flakeEnabled", !v.flakeEnabled)
                  }
                />
                <span>Include flake / quartz</span>
              </label>

              {v.flakeEnabled && (
                <div className="ec-grid">
                  <NumberField
                    label="Rate (lb / 100 sq ft)"
                    value={v.flakeRate}
                    onChange={(x) =>
                      update("flakeRate", x)
                    }
                  />

                  <NumberField
                    label="Bag size (lb)"
                    value={v.flakeBagSize}
                    min={0.1}
                    onChange={(x) =>
                      update("flakeBagSize", x)
                    }
                  />

                  <NumberField
                    label={`Price per bag (${v.currency})`}
                    value={v.flakeBagPrice}
                    onChange={(x) =>
                      update("flakeBagPrice", x)
                    }
                  />
                </div>
              )}
            </section>

            {/* Surface and costs */}

            <section className="ec-card">
              <h3 className="ec-h">
                6. Surface, waste and extra costs
              </h3>

              <p className="ec-p">
                Planning adjustments, not industry standards.
                Avoid double-counting losses if your coverage
                figure already includes them.
              </p>

              <div className="ec-grid">
                <SelectField
                  label="Surface condition"
                  value={v.surfaceFactor}
                  onChange={(x) =>
                    update("surfaceFactor", Number(x))
                  }
                >
                  <option value="1">
                    Smooth / sealed (0%)
                  </option>
                  <option value="1.05">
                    Normal / prepared (+5%)
                  </option>
                  <option value="1.15">
                    Slightly rough (+15%)
                  </option>
                  <option value="1.25">
                    Rough / textured (+25%)
                  </option>
                  <option value="1.35">
                    Porous / absorbent (+35%)
                  </option>
                </SelectField>

                <NumberField
                  label="Waste allowance (%)"
                  value={v.waste}
                  max={100}
                  onChange={(x) => update("waste", x)}
                  hint="Additional material allowance."
                />

                <SelectField
                  label="Currency"
                  value={v.currency}
                  onChange={(x) => update("currency", x)}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                  <option value="AUD">AUD</option>
                  <option value="CAD">CAD</option>
                  <option value="AED">AED</option>
                </SelectField>

                <NumberField
                  label="Sales tax / GST (%)"
                  value={v.taxRate}
                  onChange={(x) => update("taxRate", x)}
                />

                <NumberField
                  label={`Shipping (${v.currency})`}
                  value={v.shipping}
                  onChange={(x) => update("shipping", x)}
                />

                <NumberField
                  label={`Labor / prep per ${areaUnit}`}
                  value={v.laborRate}
                  onChange={(x) => update("laborRate", x)}
                  hint="Grinding, crack repair and installation."
                />
              </div>
            </section>

            {/* Thickness guide */}

            <section className="ec-card">
              <h3 className="ec-h">Thickness reference</h3>

              <p className="ec-p">
                Coverage alone does not set the finished thickness.
                Check the manufacturer's wet and dry film thickness.
                Theoretical coverage = 1604 × solids ÷ mils
                (sq ft per gallon).
              </p>

              <div className="ec-grid">
                <Metric
                  label="1 mil"
                  value="0.001 in"
                  detail="25.4 microns"
                />

                <Metric
                  label="1 mm"
                  value="1,000 microns"
                  detail="About 39.37 mils"
                />
              </div>
            </section>

            {/* Notes */}

            <section className="ec-card ec-note">
              <h3
                className="ec-h"
                style={{ color: "#92400e" }}
              >
                Estimation notes
              </h3>

              <ul>
                <li>
                  Use coverage from the manufacturer's technical
                  data sheet.
                </li>
                <li>
                  Coverage is entered in sq ft per US gallon per coat.
                </li>
                <li>
                  Kit price should be for the complete mixed kit
                  (Part A + Part B).
                </li>
                <li>
                  Moisture testing, mitigation and concrete repair
                  are not included unless you add them to labor.
                </li>
                <li>
                  Check pot life: large areas may need to be mixed
                  and applied in batches.
                </li>
                <li>
                  All floor dimensions are converted internally
                  before calculating material quantities.
                </li>
              </ul>
            </section>
          </div>

          {/* RIGHT: LIVE RESULTS */}

          <aside className="ec-aside">
            <section className="ec-card">
              <h3 className="ec-h">Material estimate</h3>

              <p className="ec-p">
                Your estimate updates as you change the inputs.
              </p>

              {!valid ? (
                <div className="ec-warn">
                  Enter positive floor dimensions, valid coverage
                  and kit sizes. Keep waste between 0% and 100%,
                  and enable at least one coating layer.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <Metric
                      label="Total floor area"
                      value={`${fmt(toDisplay(calc.area))} ${areaUnit}`}
                      detail={`${fmt(calc.area)} sq ft`}
                      accent
                    />

                    <Metric
                      label="Material required"
                      value={`${fmt(calc.totalRequired)} gal`}
                      detail={`${fmt(
                        calc.totalRequired * LITERS_PER_GALLON,
                      )} liters`}
                    />

                    <Metric
                      label="Product kits to buy"
                      value={`${calc.totalKits}`}
                      detail={`${fmt(
                        calc.totalPurchased,
                      )} gal purchased, ${fmt(calc.extra)} gal spare`}
                    />

                    <Metric
                      label="Estimated total cost"
                      value={money(calc.totalCost)}
                      detail={`${money(
                        calc.costPerArea,
                      )} per ${areaUnit}`}
                      accent
                    />
                  </div>

                  <h4
                    className="ec-h"
                    style={{ marginTop: 22 }}
                  >
                    Breakdown
                  </h4>

                  {LAYER_META.filter(
                    (meta) => v.layers[meta.key].enabled,
                  ).map((meta) => {
                    const data = calc[meta.key];

                    return (
                      <div className="ec-row" key={meta.key}>
                        <div>
                          <strong>{meta.title}</strong>

                          <small>
                            {data.kits} kit
                            {data.kits === 1 ? "" : "s"}
                            {" · "}
                            {fmt(data.coverage)} sq ft/gal
                          </small>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <strong>
                            {fmt(data.required)} gal
                          </strong>

                          <small>
                            {fmt(
                              data.required * LITERS_PER_GALLON,
                            )}{" "}
                            L
                          </small>
                        </div>
                      </div>
                    );
                  })}

                  {v.flakeEnabled && (
                    <div className="ec-row">
                      <div>
                        <strong>Decorative flake</strong>

                        <small>
                          {calc.flakeBags} bag
                          {calc.flakeBags === 1 ? "" : "s"}
                        </small>
                      </div>

                      <strong>
                        {fmt(calc.flakeLb)} lb
                      </strong>
                    </div>
                  )}

                  <h4
                    className="ec-h"
                    style={{ marginTop: 22 }}
                  >
                    Cost summary
                  </h4>

                  <div className="ec-row">
                    <span>Products</span>
                    <strong>{money(calc.productCost)}</strong>
                  </div>

                  {calc.tax > 0 && (
                    <div className="ec-row">
                      <span>Tax ({v.taxRate}%)</span>
                      <strong>{money(calc.tax)}</strong>
                    </div>
                  )}

                  {v.shipping > 0 && (
                    <div className="ec-row">
                      <span>Shipping</span>
                      <strong>{money(v.shipping)}</strong>
                    </div>
                  )}

                  {calc.labor > 0 && (
                    <div className="ec-row">
                      <span>Labor / prep</span>
                      <strong>{money(calc.labor)}</strong>
                    </div>
                  )}

                  <div className="ec-row">
                    <strong>Total</strong>

                    <strong
                      style={{
                        color: "#e94f18",
                        fontSize: 17,
                      }}
                    >
                      {money(calc.totalCost)}
                    </strong>
                  </div>

                  <div
                    className="ec-actions"
                    style={{ marginTop: 16 }}
                  >
                    <button
                      type="button"
                      className="ec-btn ec-btn-primary"
                      onClick={copySummary}
                    >
                      {copied ? "Copied!" : "Copy summary"}
                    </button>

                    <button
                      type="button"
                      className="ec-btn"
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
            This is an approximate material estimate. Actual
            consumption depends on the product, substrate, film
            thickness and application technique. Verify all
            quantities with the manufacturer's technical data
            sheet before purchasing.
          </Result>
        </div>
      </div>
    </ToolShell>
  );
}
