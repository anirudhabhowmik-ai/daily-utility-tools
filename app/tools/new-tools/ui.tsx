"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode, SetStateAction } from "react";
import FileUploadField from "../FileUploadField";

const fieldClass = "tool-field";
const storageEventPrefix = "dailytools-local-storage:";
const storageErrorPrefix = "\0storage-error:";

function getLocalStorageSnapshot(key: string) {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Browser storage is unavailable.";
    return `${storageErrorPrefix}${message}`;
  }
}

function subscribeToLocalStorage(key: string, callback: () => void) {
  const eventName = `${storageEventPrefix}${key}`;
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(eventName, callback);
  };
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  validate: (value: unknown) => value is T,
): [T, (action: SetStateAction<T>) => void, string] {
  const subscribe = useCallback((callback: () => void) => subscribeToLocalStorage(key, callback), [key]);
  const getSnapshot = useCallback(() => getLocalStorageSnapshot(key), [key]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const parsed = useMemo(() => {
    if (!snapshot) return { value: initialValue, error: "" };
    if (snapshot.startsWith(storageErrorPrefix)) return { value: initialValue, error: snapshot.slice(storageErrorPrefix.length) };
    try {
      const value: unknown = JSON.parse(snapshot);
      if (!validate(value)) return { value: initialValue, error: "Saved browser data has an unexpected format." };
      return { value, error: "" };
    } catch (reason) {
      return { value: initialValue, error: reason instanceof Error ? reason.message : "Saved browser data could not be read." };
    }
  }, [initialValue, snapshot, validate]);
  const [writeError, setWriteError] = useState("");

  const setValue = useCallback((action: SetStateAction<T>) => {
    const value = typeof action === "function"
      ? (action as (previous: T) => T)(parsed.value)
      : action;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      setWriteError("");
      window.dispatchEvent(new Event(`${storageEventPrefix}${key}`));
    } catch (reason) {
      setWriteError(reason instanceof Error ? `Browser storage could not be updated: ${reason.message}` : "Browser storage could not be updated.");
    }
  }, [key, parsed.value]);

  return [parsed.value, setValue, writeError || parsed.error];
}

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
    <label className={fieldClass}>
      <span>{label}</span>
      <input
        className="tool-input"
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const value = event.currentTarget.valueAsNumber;
          if (Number.isFinite(value) && value >= min && (max === undefined || value <= max)) onChange(value);
        }}
      />
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date" | "time" | "datetime-local";
}) {
  return (
    <label className={fieldClass}>
      <span>{label}</span>
      <input
        className="tool-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className={fieldClass}>
      <span>{label}</span>
      <select className="tool-input" value={value} onChange={(event) => onChange(event.currentTarget.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function FileField({
  label,
  accept,
  helperText,
  onChange,
}: {
  label: string;
  accept?: string;
  helperText?: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <FileUploadField label={label} accept={accept} helperText={helperText} onFileSelect={onChange} />
  );
}

export function ToolButton({
  children,
  onClick,
  disabled,
  secondary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <button
      type="button"
      className={secondary ? "tool-secondary-button" : "btn"}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function ToolResult({ children }: { children: ReactNode }) {
  return <div className="tool-result" aria-live="polite">{children}</div>;
}

export function ToolActions({ children }: { children: ReactNode }) {
  return <div className="tool-action-row">{children}</div>;
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string, type = "image/png") {
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(filename, blob);
  }, type);
}

export function loadLocalImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be opened by the browser."));
    };
    image.src = url;
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="new-tool-grid">{children}</div>;
}
