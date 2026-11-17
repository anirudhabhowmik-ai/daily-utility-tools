"use client";

import { useId, useState, type ChangeEvent, type DragEvent } from "react";

type FileUploadFieldProps = {
  label: string;
  accept?: string;
  helperText?: string;
  onFileSelect: (file: File | null) => void;
};

export default function FileUploadField({
  label,
  accept,
  helperText = "Your file stays on this device.",
  onFileSelect,
}: FileUploadFieldProps) {
  const inputId = useId();
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);

  const selectFile = (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    onFileSelect(file);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.currentTarget.files?.[0] ?? null);
    event.currentTarget.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files[0] ?? null);
  };

  return (
    <div className="tool-field tool-file-field">
      <span className="tool-file-label">{label}</span>
      <label
        className={`tool-file-dropzone${dragging ? " is-dragging" : ""}`}
        htmlFor={inputId}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={handleDragOver}
        onDragLeave={(event) => {
          const target = event.relatedTarget;
          if (!(target instanceof Node) || !event.currentTarget.contains(target)) {
            setDragging(false);
          }
        }}
        onDrop={handleDrop}
      >
        <input
          id={inputId}
          className="tool-file-native-input"
          type="file"
          accept={accept}
          aria-label={label}
          aria-describedby={`${inputId}-helper`}
          onChange={handleChange}
        />
        <span className="tool-file-upload-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v4A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-4" />
          </svg>
        </span>
        <span className="tool-file-copy">
          <strong title={fileName || undefined}>{fileName || "Drop your file here"}</strong>
          <span>{fileName ? "File selected - choose another to replace it." : "or browse from your device"}</span>
        </span>
        <span className="tool-file-browse" aria-hidden="true">{fileName ? "Change file" : "Browse files"}</span>
      </label>
      <span id={`${inputId}-helper`} className="tool-file-helper">{helperText}</span>
    </div>
  );
}
