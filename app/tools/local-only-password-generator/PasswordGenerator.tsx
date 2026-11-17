"use client";

import { useState } from "react";
import ToolShell, { NumberField, Result } from "../ToolShell";

function secureIndex(limit: number) {
  const range = 0x100000000;
  const threshold = Math.floor(range / limit) * limit;
  const value = new Uint32Array(1);
  do {
    crypto.getRandomValues(value);
  } while (value[0] >= threshold);
  return value[0] % limit;
}

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);
  const [password, setPassword] = useState("");
  const [copyError, setCopyError] = useState("");
  const [copied, setCopied] = useState(false);
  const passwordOptions: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }[] = [
    { label: "Uppercase", checked: useUpper, onChange: setUseUpper },
    { label: "Lowercase", checked: useLower, onChange: setUseLower },
    { label: "Numbers", checked: useNumbers, onChange: setUseNumbers },
    { label: "Symbols", checked: useSymbols, onChange: setUseSymbols },
  ];

  const reset = () => {
    setLength(16);
    setUseUpper(true);
    setUseLower(true);
    setUseNumbers(true);
    setUseSymbols(false);
    setExcludeAmbiguous(true);
    setPassword("");
    setCopyError("");
    setCopied(false);
  };

  const generatePassword = () => {
    const groups = [
      useUpper ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "",
      useLower ? "abcdefghijklmnopqrstuvwxyz" : "",
      useNumbers ? "0123456789" : "",
      useSymbols ? "!@#$%^&*()-_=+[]{}?" : "",
    ]
      .map((group) => (excludeAmbiguous ? group.replace(/[O0Il1]/g, "") : group))
      .filter(Boolean);
    if (!groups.length) {
      setPassword("Select at least one character type.");
      return;
    }
    const alphabet = groups.join("");
    const chars = groups.map((group) => group[secureIndex(group.length)]);
    for (let i = chars.length; i < length; i++) chars.push(alphabet[secureIndex(alphabet.length)]);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = secureIndex(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    setPassword(chars.join(""));
  };

  const copyPassword = async () => {
    if (!password || password.startsWith("Select ")) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setCopyError("");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError("Clipboard access is unavailable. Select and copy the password manually.");
    }
  };

  const characterPoolSize =
    (useUpper ? (excludeAmbiguous ? 24 : 26) : 0)
    + (useLower ? (excludeAmbiguous ? 25 : 26) : 0)
    + (useNumbers ? (excludeAmbiguous ? 8 : 10) : 0)
    + (useSymbols ? 19 : 0);
  const estimatedEntropy = characterPoolSize > 0 ? length * Math.log2(characterPoolSize) : 0;
  const strength = estimatedEntropy < 40 ? "Basic" : estimatedEntropy < 70 ? "Fair" : estimatedEntropy < 100 ? "Strong" : "Very strong";

  return (
    <ToolShell title="Password builder" onReset={reset}>
      <NumberField label="Password length (8–128)" value={length} min={8} onChange={(value) => setLength(Math.min(128, Math.max(8, Math.floor(value))))} />
      <div className="tool-inline-options" aria-label="Common password lengths">
        {[12, 16, 24, 32].map((preset) => <button key={preset} type="button" className="tool-secondary-button" onClick={() => setLength(preset)}>{preset} characters</button>)}
      </div>
      <div className="tool-inline-options">
        {passwordOptions.map(({ checked, onChange, label }) => (
          <label key={label}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /> {label}</label>
        ))}
        <label><input type="checkbox" checked={excludeAmbiguous} onChange={(event) => setExcludeAmbiguous(event.target.checked)} /> Exclude look-alike characters</label>
      </div>
      <button type="button" className="btn" onClick={generatePassword}>Generate password</button>
      {password && <Result><code style={{ overflowWrap: "anywhere" }}>{password}</code><p><button type="button" className="btn" onClick={copyPassword}>{copied ? "Copied" : "Copy"}</button></p>{copyError && <p role="alert">{copyError}</p>}</Result>}
      <div className="tool-strength" role="meter" aria-label="Estimated password strength" aria-valuemin={0} aria-valuemax={128} aria-valuenow={Math.min(128, Math.round(estimatedEntropy))}>
        <div className="tool-strength-track"><span style={{ width: `${Math.min(100, estimatedEntropy / 1.28)}%` }} /></div>
        <span>{strength} · estimated {Math.round(estimatedEntropy)} bits</span>
      </div>
      <p>Generated locally using the browser cryptography API. For important accounts, save the password in a trusted password manager.</p>
    </ToolShell>
  );
}
