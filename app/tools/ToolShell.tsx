"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = "any",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
}) {
  return (
    <label className="tool-field">
      <span>{label}</span>
      <input
        className="tool-input"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          if (Number.isFinite(next) && next >= min && (max === undefined || next <= max)) {
            onChange(next);
          }
        }}
      />
    </label>
  );
}

export function Result({ children }: { children: ReactNode }) {
  return <div className="tool-result" aria-live="polite">{children}</div>;
}

export function ToolLabel({ children }: { children: ReactNode }) {
  return <label className="tool-field">{children}</label>;
}

export default function ToolShell({
  title,
  onReset,
  children,
}: {
  title: string;
  onReset: () => void;
  children: ReactNode;
}) {
  const [copyLinkMessage, setCopyLinkMessage] = useState("");

  const copyToolLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyLinkMessage("Link copied");
      window.setTimeout(() => setCopyLinkMessage(""), 1800);
    } catch {
      setCopyLinkMessage("Copy is unavailable in this browser");
    }
  };

  const reset = () => {
    setCopyLinkMessage("");
    onReset();
  };

  return (
    <section className="tool-interface" aria-label="Interactive tool">
      <header className="tool-workspace-header">
        <div>
          <p className="tool-workspace-kicker">DAILYTOOLS · BROWSER WORKSPACE</p>
          <h2 className="tool-workspace-title">{title}</h2>
          <p className="tool-workspace-caption">Adjust the inputs, review your result, and export when you are ready.</p>
        </div>
        <div className="tool-workspace-actions">
          <span className="tool-local-badge"><span aria-hidden="true">●</span> Runs locally</span>
          <button type="button" className="tool-secondary-button" onClick={copyToolLink}>{copyLinkMessage || "Copy tool link"}</button>
          <button type="button" className="tool-secondary-button" onClick={reset}>Reset</button>
        </div>
      </header>
      <div className="tool-content-grid">{children}</div>
    </section>
  );
}
