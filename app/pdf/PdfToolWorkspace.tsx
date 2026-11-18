"use client";

import { useEffect, useId, useState, type DragEvent, type FormEvent } from "react";
import type { PdfField, PdfTool } from "./catalog";
import PdfVisualEditor from "./PdfVisualEditor";
import type { PdfEditElement, PdfEditElementGeometry, PdfEditElementType, PdfEditTool } from "./editElements";

type DetectedWatermark = {
  id: string;
  page: number;
  type: string;
  text?: string;
  fullText?: string;
  bbox?: number[];
};

type PdfOutput = {
  url: string;
  filename: string;
  mediaType: string;
};

type OrganizerItem =
  | { type: "page"; pageIndex: number; fileIndex: number; pageNumber: number; rotation: number }
  | { type: "blank"; id: string; rotation: number };

type WatermarkPlacement = { x: number; y: number; alignment: "center" | "left" | "right" };

const WATERMARK_PRESETS: Record<string, WatermarkPlacement> = {
  center: { x: 50, y: 50, alignment: "center" },
  "top-left": { x: 5, y: 10, alignment: "left" },
  "top-right": { x: 95, y: 10, alignment: "right" },
  "bottom-left": { x: 5, y: 90, alignment: "left" },
  "bottom-right": { x: 95, y: 90, alignment: "right" },
};

function watermarkPageKey(file: File, page: number) {
  return JSON.stringify([file.name, file.size, file.lastModified, page]);
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_PDF_API_BASE_URL || "").trim().replace(/\/+$/, "");

async function fetchPdfApi(path: string, init?: RequestInit) {
  if (!API_BASE_URL) {
    throw new Error("The PDF service URL is not configured. Set NEXT_PUBLIC_PDF_API_BASE_URL and restart the frontend.");
  }
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch (requestError) {
    if (requestError instanceof TypeError) {
      throw new Error(
        `Cannot reach the PDF service at ${API_BASE_URL}. Check that NEXT_PUBLIC_PDF_API_BASE_URL points to a running backend and that its TLS certificate is valid.`,
      );
    }
    throw requestError;
  }
}

function PdfFilePicker({
  label,
  accept,
  multiple = false,
  files,
  onChange,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const selectFiles = (selectedFiles: File[]) => onChange(multiple ? selectedFiles : selectedFiles.slice(0, 1));
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    selectFiles(Array.from(event.dataTransfer.files));
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
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
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
          multiple={multiple}
          aria-label={label}
          onChange={(event) => {
            selectFiles(Array.from(event.currentTarget.files || []));
            event.currentTarget.value = "";
          }}
        />
        <span className="tool-file-upload-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v4A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-4" />
            </svg>
        </span>
        <span className="tool-file-copy">
            <strong title={files.length ? files.map((file) => file.name).join(", ") : undefined}>
              {files.length ? files.length === 1 ? files[0].name : `${files.length} files selected` : multiple ? "Drop your files here" : "Drop your file here"}
            </strong>
            <span>{files.length ? files.map((file) => file.name).join(", ") : "or browse from your device"}</span>
          </span>
        <span className="tool-file-browse" aria-hidden="true">{files.length ? "Change files" : "Browse files"}</span>
      </label>
    </div>
  );
}

function PdfFilePreview({ file, page = 1 }: { file: File; page?: number }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return <iframe className="pdf-document-preview" src={`${url}#page=${page}&toolbar=0`} title={`Preview of ${file.name}, page ${page}`} />;
  }
  if (file.type.startsWith("image/")) {
    return <img className="pdf-image-preview" src={url} alt={`Preview of ${file.name}`} />;
  }
  return <p className="pdf-preview-unavailable">A preview is not available for this file type.</p>;
}

function isFieldVisible(field: PdfField, values: Record<string, string>) {
  if (field.name === "color" && values.annotationType === "drawing") return true;
  return !field.visibleWhen || values[field.visibleWhen.field] === field.visibleWhen.value;
}

function appendFields(
  formData: FormData,
  fields: PdfField[],
  values: Record<string, string>,
  extraFiles: Record<string, File | null>,
) {
  for (const field of fields) {
    if (!isFieldVisible(field, values)) continue;
    if (field.type === "file") {
      const file = extraFiles[field.name];
      if (file) formData.append(field.name, file);
    } else {
      formData.append(field.name, values[field.name] ?? field.defaultValue ?? "");
    }
  }
}

async function getErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await response.json() as { error?: string; message?: string };
    return body.error || body.message || `Request failed (${response.status})`;
  }
  const text = await response.text();
  return text || `Request failed (${response.status})`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read the selected image."));
    };
    reader.onerror = () => reject(reader.error || new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function newEditElementId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makePdfEditElement(
  type: PdfEditElementType,
  pageNum: number,
  values: Record<string, string>,
  imageData = "",
  geometry?: PdfEditElementGeometry,
): PdfEditElement {
  const numberValue = (name: string, fallback: number) => {
    const number = Number(values[name]);
    return Number.isFinite(number) ? number : fallback;
  };
  return {
    id: newEditElementId(),
    pageNum,
    type,
    x: geometry?.x ?? numberValue("x", 72),
    y: geometry?.y ?? numberValue("y", 72),
    width: geometry?.width ?? numberValue("width", 240),
    height: geometry?.height ?? numberValue("height", 100),
    rotation: 0,
    text: values.text || (type === "text" ? "Text" : ""),
    fontFamily: values.fontFamily || "Arial",
    fontSize: numberValue("fontSize", 20),
    fontWeight: values.fontWeight || "normal",
    fontStyle: values.fontStyle || "normal",
    textAlign: values.textAlign || "left",
    color: values.color || "#000000",
    shapeType: values.shapeType || "rectangle",
    fillColor: values.fillColor || "#4f46e5",
    borderColor: values.borderColor || "#1e3a8a",
    borderWidth: numberValue("borderWidth", 2),
    imageData,
    opacity: numberValue("opacity", 1),
    pathData: geometry?.pathData ?? values.pathData ?? "",
    strokeWidth: numberValue("strokeWidth", 2),
    brushStyle: values.brushStyle || "solid",
  };
}

function editElementFormValues(element: PdfEditElement) {
  return {
    annotationType: element.type,
    pageNum: String(element.pageNum),
    x: String(element.x),
    y: String(element.y),
    width: String(element.width),
    height: String(element.height),
    text: element.text,
    fontFamily: element.fontFamily,
    fontSize: String(element.fontSize),
    fontWeight: element.fontWeight,
    fontStyle: element.fontStyle,
    textAlign: element.textAlign,
    color: element.color,
    shapeType: element.shapeType,
    fillColor: element.fillColor,
    borderColor: element.borderColor,
    borderWidth: String(element.borderWidth),
    opacity: String(element.opacity),
    pathData: element.pathData,
    strokeWidth: String(element.strokeWidth),
    brushStyle: element.brushStyle,
  };
}

function updateEditElementField(element: PdfEditElement, name: string, value: string): PdfEditElement {
  switch (name) {
    case "x": return { ...element, x: Number(value) };
    case "y": return { ...element, y: Number(value) };
    case "width": return { ...element, width: Number(value) };
    case "height": return { ...element, height: Number(value) };
    case "text": return { ...element, text: value };
    case "fontFamily": return { ...element, fontFamily: value };
    case "fontSize": return { ...element, fontSize: Number(value) };
    case "fontWeight": return { ...element, fontWeight: value };
    case "fontStyle": return { ...element, fontStyle: value };
    case "textAlign": return { ...element, textAlign: value };
    case "color": return { ...element, color: value };
    case "shapeType": return { ...element, shapeType: value };
    case "fillColor": return { ...element, fillColor: value };
    case "borderColor": return { ...element, borderColor: value };
    case "borderWidth": return { ...element, borderWidth: Number(value) };
    case "opacity": return { ...element, opacity: Number(value) };
    case "pathData": return { ...element, pathData: value };
    case "strokeWidth": return { ...element, strokeWidth: Number(value) };
    case "brushStyle": return { ...element, brushStyle: value };
    default: return element;
  }
}

export default function PdfToolWorkspace({ tool }: { tool: PdfTool }) {
  const [files, setFiles] = useState<File[]>([]);
  const [extraFiles, setExtraFiles] = useState<Record<string, File | null>>({});
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries((tool.fields || []).map((field) => [field.name, field.defaultValue || ""])),
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [output, setOutput] = useState<PdfOutput | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewPage, setPreviewPage] = useState(1);
  const [watermarkPositions, setWatermarkPositions] = useState<Record<string, WatermarkPlacement>>({});
  const [applyAllWatermarkPosition, setApplyAllWatermarkPosition] = useState<WatermarkPlacement | null>(null);
  const [watermarks, setWatermarks] = useState<DetectedWatermark[]>([]);
  const [selectedWatermarks, setSelectedWatermarks] = useState<Set<string>>(new Set());
  const [organizerItems, setOrganizerItems] = useState<OrganizerItem[]>([]);
  const [organizerLoading, setOrganizerLoading] = useState(false);
  const [editElements, setEditElements] = useState<PdfEditElement[]>([]);
  const [selectedEditElementId, setSelectedEditElementId] = useState<string | null>(null);
  const [editTool, setEditTool] = useState<PdfEditTool>("select");
  const previewFile = files[previewIndex];
  const selectedEditElement = editElements.find((element) => element.id === selectedEditElementId);
  const previewWatermarkPosition = previewFile
    ? watermarkPositions[watermarkPageKey(previewFile, previewPage)]
      || applyAllWatermarkPosition
      || WATERMARK_PRESETS[values.position]
      || WATERMARK_PRESETS.center
    : applyAllWatermarkPosition || WATERMARK_PRESETS[values.position] || WATERMARK_PRESETS.center;
  const hasWatermarkPositionChanges = Boolean(applyAllWatermarkPosition) || Object.keys(watermarkPositions).length > 0;

  useEffect(() => {
    if (tool.flow !== "organize-pdf" || !files.length) {
      setOrganizerItems([]);
      setOrganizerLoading(false);
      return;
    }

    let cancelled = false;
    setOrganizerLoading(true);
    setOrganizerItems([]);
    setStatus("Reading PDF pages…");

    Promise.all(files.map(async (file) => {
      const body = new FormData();
      body.append("file", file);
      const response = await fetchPdfApi("/pdf-page-count", { method: "POST", body });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const result = await response.json() as { pages?: number };
      if (!result.pages || result.pages < 1) throw new Error(`Could not read the page count for ${file.name}.`);
      return result.pages;
    })).then((pageCounts) => {
      if (cancelled) return;
      let globalPageIndex = 0;
      const items = pageCounts.flatMap((pageCount, fileIndex) =>
        Array.from({ length: pageCount }, (_, index) => ({
          type: "page" as const,
          pageIndex: globalPageIndex++,
          fileIndex,
          pageNumber: index + 1,
          rotation: 0,
        })),
      );
      setOrganizerItems(items);
      setStatus(`${items.length} page${items.length === 1 ? "" : "s"} ready to organize.`);
      setError("");
    }).catch((requestError: unknown) => {
      if (cancelled) return;
      setError(requestError instanceof Error ? requestError.message : "Could not read the PDF pages.");
      setStatus("");
    }).finally(() => {
      if (!cancelled) setOrganizerLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [files, tool.flow]);

  useEffect(() => {
    if (!output) return;
    return () => URL.revokeObjectURL(output.url);
  }, [output]);

  const handleFileChange = (selectedFiles: File[]) => {
    setFiles((currentFiles) => {
      if (!tool.multiple) return selectedFiles;
      const combined = [...currentFiles];
      for (const file of selectedFiles) {
        const alreadyAdded = combined.some((existing) =>
          existing.name === file.name
          && existing.size === file.size
          && existing.lastModified === file.lastModified,
        );
        if (!alreadyAdded) combined.push(file);
      }
      return combined;
    });
    setWatermarks([]);
    setSelectedWatermarks(new Set());
    if (tool.slug === "edit-pdf") {
      setEditElements([]);
      setSelectedEditElementId(null);
      setEditTool("select");
    }
    setPreviewIndex(0);
    setPreviewPage(1);
    setOrganizerItems([]);
    setOutput(null);
    setError("");
  };

  const updateValue = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (tool.slug === "edit-pdf" && name === "pageNum") {
      setSelectedEditElementId(null);
      setEditTool("select");
    } else if (tool.slug === "edit-pdf" && selectedEditElementId && name !== "annotationType") {
      const numericField = ["x", "y", "width", "height", "fontSize", "borderWidth", "opacity", "strokeWidth"].includes(name);
      if (!numericField || (value.trim() && Number.isFinite(Number(value)))) {
        setEditElements((current) => current.map((element) => (
          element.id === selectedEditElementId ? updateEditElementField(element, name, value) : element
        )));
      }
    }
    if (tool.slug === "add-watermark" && name === "position" && value !== "custom") {
      const position = WATERMARK_PRESETS[value] || WATERMARK_PRESETS.center;
      if (previewFile) {
        setWatermarkPositions((current) => ({
          ...current,
          [watermarkPageKey(previewFile, previewPage)]: position,
        }));
      }
    }
  };

  const changePreviewPage = (page: number) => {
    setPreviewPage(page);
    if (tool.slug === "edit-pdf") {
      setSelectedEditElementId(null);
      setEditTool("select");
      setValues((current) => ({ ...current, pageNum: String(page) }));
    }
  };

  const selectEditElement = (id: string | null) => {
    setSelectedEditElementId(id);
    setEditTool("select");
    const element = editElements.find((item) => item.id === id);
    if (element) setValues((current) => ({ ...current, ...editElementFormValues(element) }));
  };

  const addEditElement = async (
    type: PdfEditElementType,
    geometry?: PdfEditElementGeometry,
  ) => {
    if (type === "image" && !extraFiles.imageFile) {
      setValues((current) => ({ ...current, annotationType: "image" }));
      setError("Choose an image file below, then select Add image again.");
      return;
    }
    let imageData = "";
    if (type === "image" && extraFiles.imageFile) {
      try {
        imageData = await readFileAsDataUrl(extraFiles.imageFile);
      } catch (readError) {
        setError(readError instanceof Error ? readError.message : "Could not read the selected image.");
        return;
      }
    }
    const pageNum = Number(values.pageNum || 1);
    const selected = editElements.find((item) => item.id === selectedEditElementId);
    const nextValues = selected && !geometry
      ? { ...values, x: String(Number(values.x || 72) + 24), y: String(Number(values.y || 72) + 24) }
      : values;
    const editElement = makePdfEditElement(type, pageNum, nextValues, imageData, geometry);
    setEditElements((current) => [...current, editElement]);
    setSelectedEditElementId(editElement.id);
    setEditTool("select");
    setValues((current) => ({ ...current, ...editElementFormValues(editElement) }));
    setError("");
    setStatus(`${type === "erase" ? "Erase area" : type[0].toUpperCase() + type.slice(1)} added to page ${pageNum}.`);
  };

  const activateEditTool = (nextTool: PdfEditTool) => {
    setSelectedEditElementId(null);
    setEditTool(nextTool);
    setValues((current) => ({ ...current, annotationType: nextTool === "select" ? current.annotationType : nextTool }));
    setError("");
  };

  const copySelectedEditElement = () => {
    const selected = editElements.find((item) => item.id === selectedEditElementId);
    if (!selected) return;
    const offset = 24;
    const copy: PdfEditElement = {
      ...selected,
      id: newEditElementId(),
      x: selected.x + offset,
      y: selected.y + offset,
      pathData: selected.type === "drawing"
        ? selected.pathData.replace(/([ML])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/gi, (_match, command: string, x: string, y: string) =>
          `${command} ${(Number(x) + offset).toFixed(1)} ${(Number(y) + offset).toFixed(1)}`,
        )
        : selected.pathData,
    };
    setEditElements((current) => [...current, copy]);
    setSelectedEditElementId(copy.id);
    setValues((current) => ({ ...current, ...editElementFormValues(copy) }));
  };

  const rotateSelectedEditElement = () => {
    if (!selectedEditElementId) return;
    setEditElements((current) => current.map((element) => (
      element.id === selectedEditElementId
        ? { ...element, rotation: (element.rotation + 15) % 360 }
        : element
    )));
  };

  const deleteSelectedEditElement = () => {
    if (!selectedEditElementId) return;
    setEditElements((current) => current.filter((element) => element.id !== selectedEditElementId));
    setSelectedEditElementId(null);
    setEditTool("select");
    setStatus("Selected item removed.");
  };

  const moveOrganizerItem = (index: number, offset: number) => {
    setOrganizerItems((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addBlankPageAfter = (index: number) => {
    setOrganizerItems((current) => {
      const next = [...current];
      next.splice(index + 1, 0, { type: "blank", id: `blank-${Date.now()}-${index}`, rotation: 0 });
      return next;
    });
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    setOutput({ url, filename: name, mediaType: blob.type });
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const detectWatermarks = async () => {
    if (!files[0]) {
      setError("Choose a PDF before detecting watermarks.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Detecting possible watermarks…");
    try {
      const body = new FormData();
      body.append("file", files[0]);
      const response = await fetchPdfApi("/detect-watermarks", { method: "POST", body });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const result = await response.json() as { items?: DetectedWatermark[] };
      setWatermarks(result.items || []);
      setSelectedWatermarks(new Set());
      setStatus(`Detected ${result.items?.length || 0} possible items. Select only the watermarks you have permission to remove.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Watermark detection failed.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  const processPdfA = async (formData: FormData) => {
    if (!tool.endpoint) throw new Error("The OCR endpoint is not configured.");
    const response = await fetchPdfApi(tool.endpoint, { method: "POST", body: formData });
    if (!response.ok) throw new Error(await getErrorMessage(response));
    const job = await response.json() as { job_id: string; filename?: string };
    if (!job.job_id) throw new Error("The OCR service did not return a job ID.");
    setStatus("OCR job queued…");

    for (let attempt = 0; attempt < 1200; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
      const progressResponse = await fetchPdfApi(`/pdfa-ocr/progress/${encodeURIComponent(job.job_id)}`);
      if (!progressResponse.ok) throw new Error(await getErrorMessage(progressResponse));
      const progress = await progressResponse.json() as { status: string; current_page?: number; total_pages?: number; error?: string };
      if (progress.status === "error") throw new Error(progress.error || "OCR processing failed.");
      if (progress.status === "done") {
        const downloadResponse = await fetchPdfApi(`/pdfa-ocr/download/${encodeURIComponent(job.job_id)}`);
        if (!downloadResponse.ok) throw new Error(await getErrorMessage(downloadResponse));
        const blob = await downloadResponse.blob();
        downloadBlob(blob, job.filename || "searchable.pdf");
        setStatus("Done. Your PDF download has started.");
        return;
      }
      setStatus(`OCR in progress: ${progress.current_page || 0} of ${progress.total_pages || "?"} pages…`);
    }
    throw new Error("OCR is taking longer than expected. You can try again later.");
  };

  const processPdfToPowerPoint = async (formData: FormData, file: File) => {
    if (!tool.endpoint) throw new Error("The PowerPoint endpoint is not configured.");
    const checkForm = new FormData();
    checkForm.append("file", file);
    const checkResponse = await fetchPdfApi("/check-pdf-text", { method: "POST", body: checkForm });
    if (!checkResponse.ok) throw new Error(await getErrorMessage(checkResponse));
    const checkResult = await checkResponse.json() as { hasText?: boolean };
    const requestedMode = values.mode || "auto";

    if (requestedMode === "auto" && !checkResult.hasText) {
      throw new Error("This PDF appears to be scanned. Choose Image or OCR mode and try again.");
    }

    formData.set("mode", requestedMode);
    formData.set("has_text", String(requestedMode === "text" || (requestedMode === "auto" && checkResult.hasText)));
    setStatus("Starting PowerPoint conversion…");

    const response = await fetchPdfApi(tool.endpoint, { method: "POST", body: formData });
    if (!response.ok) throw new Error(await getErrorMessage(response));
    if (!response.body) throw new Error("The PowerPoint service did not return a progress stream.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: { blob: Blob; filename: string } | null = null;

    const processLine = (line: string): { blob: Blob; filename: string } | null => {
      if (!line.startsWith("data:")) return null;
      const raw = line.slice(5).trim();
      if (!raw) return null;
      let event: { type?: string; msg?: string; page?: number; total?: number; file?: string; filename?: string };
      try {
        event = JSON.parse(raw);
      } catch {
        throw new Error("The PowerPoint service returned an invalid progress event.");
      }

      if (event.type === "progress") {
        setStatus(event.msg || `Converting page ${event.page || 0} of ${event.total || "?"}…`);
      } else if (event.type === "error") {
        throw new Error(event.msg || "PowerPoint conversion failed.");
      } else if (event.type === "done") {
        if (!event.file) {
          throw new Error("The PowerPoint service completed without returning a file.");
        }
        const binary = atob(event.file);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        return {
          blob: new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }),
          filename: event.filename || `${file.name.replace(/\.pdf$/i, "")}.pptx`,
        };
      }
      return null;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const lineResult = processLine(line.trim());
        if (lineResult) result = lineResult;
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      const lineResult = processLine(buffer.trim());
      if (lineResult) result = lineResult;
    }
    if (!result) throw new Error("The PowerPoint service ended before returning a presentation.");
    downloadBlob(result.blob, result.filename);
    setStatus("Done. Your presentation download has started.");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tool.endpoint) return;
    const hasHtmlUrl = tool.slug === "html-to-pdf" && Boolean(values.url?.trim());
    if (!files.length && !hasHtmlUrl) {
      setError("Choose a file to continue.");
      return;
    }
    if (tool.minFiles && files.length < tool.minFiles) {
      setError(`Choose at least ${tool.minFiles} files to continue.`);
      return;
    }
    const missingRequiredField = (tool.fields || []).find((field) => (
      isFieldVisible(field, values)
      && field.required
      && !(tool.slug === "edit-pdf" && field.name === "imageFile")
      && (field.type === "file" ? !extraFiles[field.name] : !values[field.name]?.trim())
    ));
    if (missingRequiredField) {
      setError(`${missingRequiredField.label} is required.`);
      return;
    }
    if (tool.flow === "remove-watermark" && !selectedWatermarks.size) {
      setError("Detect and select at least one watermark first.");
      return;
    }
    if (tool.slug === "edit-pdf") {
      if (!editElements.length) {
        setError("Add at least one text, shape, image, drawing, or erase area before applying edits.");
        return;
      }
      if (!Number.isInteger(Number(values.pageNum)) || Number(values.pageNum) < 1) {
        setError("Choose a valid page number.");
        return;
      }
      const invalidElement = editElements.find((element) => (
        !Number.isInteger(element.pageNum)
        || element.pageNum < 1
        || ![element.x, element.y, element.width, element.height, element.rotation].every(Number.isFinite)
        || element.x < 0
        || element.y < 0
        || element.width <= 0
        || element.height <= 0
        || (element.type === "text" && !element.text.trim())
        || (element.type === "text" && (!Number.isFinite(element.fontSize) || element.fontSize <= 0))
        || (element.type === "shape" && (!Number.isFinite(element.borderWidth) || element.borderWidth < 0))
        || (element.type === "image" && !element.imageData)
        || (element.type === "drawing" && !element.pathData.trim())
        || (element.type === "drawing" && (!Number.isFinite(element.strokeWidth) || element.strokeWidth <= 0))
        || (element.type === "image" && (!Number.isFinite(element.opacity) || element.opacity < 0 || element.opacity > 1))
      ));
      if (invalidElement) {
        setError("Check each added item: it needs a valid page, position, size, and content.");
        return;
      }
    }
    if (tool.flow === "organize-pdf" && (!organizerItems.length || organizerLoading)) {
      setError(organizerLoading ? "Wait for the PDF pages to finish loading." : "Choose a PDF with pages to organize.");
      return;
    }
    if (tool.slug === "add-watermark") {
      const opacity = Number(values.opacity);
      if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
        setError("Opacity must be between 0 and 1.");
        return;
      }
      if (values.type === "text" && (!Number.isFinite(Number(values.fontSize)) || Number(values.fontSize) < 8 || Number(values.fontSize) > 200)) {
        setError("Font size must be between 8 and 200.");
        return;
      }
      if (values.type === "image" && (!Number.isFinite(Number(values.widthPercent)) || Number(values.widthPercent) <= 0 || Number(values.widthPercent) > 100)) {
        setError("Image width must be greater than 0 and no more than 100% of the page.");
        return;
      }
    }
    if (tool.slug === "crop-pdf") {
      const numericFields = ["x", "y", "width", "height", ...(values.mode === "selected" ? ["page"] : [])];
      const hasInvalidNumber = numericFields.some((name) => !Number.isFinite(Number(values[name])));
      const nonPositiveFields = ["width", "height"];
      const negativeOffset = ["x", "y"].some((name) => Number(values[name]) < 0);
      if (hasInvalidNumber || negativeOffset || nonPositiveFields.some((name) => Number(values[name]) <= 0)) {
        setError("Enter valid positive page, width, height, and size values.");
        return;
      }
    }

    setBusy(true);
    setError("");
    setStatus("Processing your file…");
    setOutput(null);

    try {
      const body = new FormData();
      let cropPageCounts: number[] = [];
      for (const file of files) body.append(tool.fileKey, file);
      if (!["crop-pdf", "edit-pdf"].includes(tool.slug) && tool.flow !== "organize-pdf") {
        appendFields(body, tool.fields || [], values, extraFiles);
      }
      if (tool.slug === "crop-pdf" && (values.mode === "selected" || files.length > 1)) {
        cropPageCounts = await Promise.all(files.map(async (file) => {
          const countForm = new FormData();
          countForm.append("file", file);
          const countResponse = await fetchPdfApi("/pdf-page-count", { method: "POST", body: countForm });
          if (!countResponse.ok) throw new Error(await getErrorMessage(countResponse));
          const countResult = await countResponse.json() as { pages?: number };
          if (!countResult.pages || countResult.pages < 1) throw new Error(`Could not read the page count for ${file.name}.`);
          return countResult.pages;
        }));
        const requestedPage = Number(values.page);
        if (values.mode === "selected" && cropPageCounts.some((pageCount) => requestedPage > pageCount)) {
          throw new Error("The selected page number must exist in every uploaded PDF.");
        }
      } else if (tool.slug === "edit-pdf") {
        const countForm = new FormData();
        countForm.append("file", files[0]);
        const countResponse = await fetchPdfApi("/pdf-page-count", { method: "POST", body: countForm });
        if (!countResponse.ok) throw new Error(await getErrorMessage(countResponse));
        const countResult = await countResponse.json() as { pages?: number };
        const pageCount = countResult.pages;
        if (!pageCount || Number(values.pageNum) > pageCount || editElements.some((element) => element.pageNum > pageCount)) {
          throw new Error(`The PDF has ${countResult.pages || 0} pages. Choose a page within that range.`);
        }
      }
      if (tool.slug === "add-watermark") {
        const pageCounts = await Promise.all(files.map(async (file) => {
          const countForm = new FormData();
          countForm.append("file", file);
          const countResponse = await fetchPdfApi("/pdf-page-count", { method: "POST", body: countForm });
          if (!countResponse.ok) throw new Error(await getErrorMessage(countResponse));
          const countResult = await countResponse.json() as { pages?: number };
          if (!countResult.pages || countResult.pages < 1) throw new Error(`Could not read the page count for ${file.name}.`);
          return countResult.pages;
        }));
        const totalPages = pageCounts.reduce((total, count) => total + count, 0);
        const pageStart = Number(values.pageStart);
        const pageEnd = Number(values.pageEnd);
        if (!Number.isInteger(pageStart) || pageStart < 1 || pageStart > totalPages) {
          throw new Error(`The first page must be between 1 and ${totalPages}.`);
        }
        if (!Number.isInteger(pageEnd) || pageEnd < 0 || (pageEnd > 0 && pageEnd < pageStart)) {
          throw new Error("The last page must be 0 (all pages) or greater than or equal to the first page.");
        }
        let pageNum = 0;
        const positions = pageCounts.flatMap((pageCount, fileIndex) =>
          Array.from({ length: pageCount }, (_, index) => {
            const file = files[fileIndex];
            const position = watermarkPositions[watermarkPageKey(file, index + 1)]
              || applyAllWatermarkPosition
              || WATERMARK_PRESETS[values.position]
              || WATERMARK_PRESETS.center;
            pageNum += 1;
            return {
              pageNum,
              left: `${position.x}%`,
              top: `${position.y}%`,
              rotation: Number(values.rotation || 0),
              position: values.type === "text" ? position.alignment : "center",
              ...(values.type === "image" ? { widthPercent: Number(values.widthPercent) } : {}),
            };
          }),
        );
        body.set("positions", JSON.stringify(positions));
      }
      if (tool.flow === "remove-watermark") {
        body.set("watermarks", JSON.stringify(watermarks.filter((item) => selectedWatermarks.has(item.id))));
      }
      if (tool.slug === "crop-pdf") {
        const box = {
          x: Number(values.x),
          y: Number(values.y),
          width: Number(values.width),
          height: Number(values.height),
        };
        const cropData = files.length > 1
          ? cropPageCounts.map((pageCount) => ({
            boxes: values.mode === "selected"
              ? [{ page: Number(values.page), ...box }]
              : Array.from({ length: pageCount }, (_, index) => ({ page: index + 1, ...box })),
          }))
          : values.mode === "selected"
            ? { mode: "selected", boxes: [{ page: Number(values.page), ...box }] }
            : { mode: "all", boxes: [box] };
        body.set("cropData", JSON.stringify(cropData));
      }
      if (tool.slug === "edit-pdf") {
        const pages = new Map<number, {
          pageNum: number;
          annotations: Record<string, unknown>[];
          deletedRegions: Array<{ x: number; y: number; width: number; height: number }>;
        }>();
        for (const element of editElements) {
          let pageData = pages.get(element.pageNum);
          if (!pageData) {
            pageData = { pageNum: element.pageNum, annotations: [], deletedRegions: [] };
            pages.set(element.pageNum, pageData);
          }
          if (element.type === "erase") {
            pageData.deletedRegions.push({
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
            });
            continue;
          }
          pageData.annotations.push({
            type: element.type,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            rotation: element.rotation,
            ...(element.type === "text" ? {
              text: element.text.trim(),
              fontSize: element.fontSize,
              color: element.color,
              fontFamily: element.fontFamily,
              fontWeight: element.fontWeight,
              fontStyle: element.fontStyle,
              textAlign: element.textAlign,
            } : {}),
            ...(element.type === "shape" ? {
              shapeType: element.shapeType,
              fillColor: element.fillColor,
              borderColor: element.borderColor,
              borderWidth: element.borderWidth,
            } : {}),
            ...(element.type === "image" ? {
              imageData: element.imageData,
              opacity: element.opacity,
            } : {}),
            ...(element.type === "drawing" ? {
              pathData: element.pathData,
              color: element.color,
              strokeWidth: element.strokeWidth,
              brushStyle: element.brushStyle,
            } : {}),
          });
        }
        body.set("annotations", JSON.stringify(Array.from(pages.values()).map((pageData) => ({
          pageNum: pageData.pageNum,
          annotations: pageData.annotations,
          ...(pageData.deletedRegions.length ? { deletedRegions: pageData.deletedRegions } : {}),
        }))));
      }
      if (tool.flow === "organize-pdf") {
        body.set("layout", JSON.stringify(organizerItems.map((item) => item.type === "page"
          ? { type: "page", pageIndex: item.pageIndex, rotation: item.rotation }
          : { type: "blank", rotation: item.rotation },
        )));
      }
      if (tool.slug === "rotate-pdf") {
        const pageCounts = await Promise.all(files.map(async (file) => {
          const countRequest = new FormData();
          countRequest.append("file", file);
          const countResponse = await fetchPdfApi("/pdf-page-count", { method: "POST", body: countRequest });
          if (!countResponse.ok) throw new Error(await getErrorMessage(countResponse));
          const result = await countResponse.json() as { pages?: number };
          if (!result.pages || result.pages < 1) throw new Error("Could not read the PDF page count.");
          return result.pages;
        }));
        const angle = Number(values.rotateDegrees || 0);
        body.delete("rotateDegrees");
        body.set("rotations", JSON.stringify(pageCounts.flatMap((pageCount) => Array(pageCount).fill(angle))));
      }

      if (tool.flow === "pdfa") {
        await processPdfA(body);
        return;
      }
      if (tool.slug === "pdf-to-ppt") {
        await processPdfToPowerPoint(body, files[0]);
        return;
      }

      const response = await fetchPdfApi(tool.endpoint, { method: "POST", body });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      if ((response.headers.get("content-type") || "").includes("application/json")) {
        const result = await response.json() as { error?: string; message?: string };
        throw new Error(result.error || result.message || "The processing service returned no file.");
      }
      const blob = await response.blob();
      const fileName = response.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/i)?.[1]
        || `${tool.slug}-result`;
      downloadBlob(blob, fileName);
      setStatus("Done. Your download has started.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The file could not be processed.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="tool-interface pdf-workspace" aria-label={`${tool.title} workspace`}>
        <div className="tool-workspace-header">
          <div>
            <p className="tool-workspace-kicker">PDF WORKSPACE</p>
            <h2 className="tool-workspace-title">{tool.title}</h2>
            <p className="tool-workspace-caption">Choose a file and adjust the available options.</p>
          </div>
          <span className="pdf-upload-badge">PDF service</span>
        </div>

        {tool.unavailableMessage ? (
          <div className="pdf-unavailable" role="status">{tool.unavailableMessage}</div>
        ) : (
          <form className="pdf-form" onSubmit={submit}>
            <PdfFilePicker
              label={tool.fileLabel}
              accept={tool.accept}
              multiple={tool.multiple}
              files={files}
              onChange={handleFileChange}
            />
            {tool.minFiles ? (
              <p className="pdf-file-requirement">Select at least {tool.minFiles} PDFs. Their order below is the merge order.</p>
            ) : null}
            {files.length ? (
              <div className="pdf-source-panel">
                <div className="pdf-source-list" aria-label="Selected files">
                  {files.map((file, index) => (
                    <div className="pdf-source-file" key={`${file.name}-${file.size}-${file.lastModified}`}>
                      <button
                        className="pdf-source-select"
                        type="button"
                        aria-pressed={previewIndex === index}
                        onClick={() => {
                          setPreviewIndex(index);
                          setPreviewPage(1);
                        }}
                      >
                        <span className="pdf-source-file-name">{file.name}</span>
                        <small>{(file.size / (1024 * 1024)).toFixed(2)} MB</small>
                      </button>
                      {tool.multiple ? (
                        <span className="pdf-source-actions">
                          <button
                            type="button"
                            aria-label={`Move ${file.name} earlier`}
                            disabled={index === 0}
                            onClick={() => {
                              setFiles((current) => {
                                const next = [...current];
                                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                return next;
                              });
                              setPreviewIndex((current) => current === index ? index - 1 : current === index - 1 ? index : current);
                              setPreviewPage(1);
                            }}
                          >↑</button>
                          <button
                            type="button"
                            aria-label={`Move ${file.name} later`}
                            disabled={index === files.length - 1}
                            onClick={() => {
                              setFiles((current) => {
                                const next = [...current];
                                [next[index], next[index + 1]] = [next[index + 1], next[index]];
                                return next;
                              });
                              setPreviewIndex((current) => current === index ? index + 1 : current === index + 1 ? index : current);
                              setPreviewPage(1);
                            }}
                          >↓</button>
                          <button
                            type="button"
                            aria-label={`Remove ${file.name}`}
                            onClick={() => {
                              setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
                              setPreviewIndex((current) => Math.max(0, current > index ? current - 1 : current));
                              setOutput(null);
                            }}
                          >×</button>
                        </span>
                      ) : (
                        <button
                          className="pdf-source-remove"
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => {
                            setFiles([]);
                            setPreviewIndex(0);
                            setOutput(null);
                            setEditElements([]);
                            setSelectedEditElementId(null);
                            setEditTool("select");
                          }}
                        >×</button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="pdf-source-preview">
                  <p>Preview: {files[previewIndex]?.name}</p>
                  {tool.slug === "edit-pdf" ? (
                    <div className="pdf-edit-toolbar" role="toolbar" aria-label="PDF edit items">
                      <button type="button" onClick={() => activateEditTool("select")} aria-pressed={editTool === "select"}>Select</button>
                      <button type="button" onClick={() => void addEditElement("text")}>Add text</button>
                      <button type="button" onClick={() => void addEditElement("shape")}>Add shape</button>
                      <button type="button" onClick={() => void addEditElement("image")}>Add image</button>
                      <button type="button" onClick={() => activateEditTool("drawing")} aria-pressed={editTool === "drawing"}>Draw</button>
                      <button type="button" onClick={() => activateEditTool("erase")} aria-pressed={editTool === "erase"}>Erase area</button>
                      <span className="pdf-edit-item-count">
                        {editElements.filter((item) => item.pageNum === Number(values.pageNum || 1)).length} items on this page
                      </span>
                      <button type="button" disabled={!selectedEditElement || selectedEditElement.type === "erase"} onClick={rotateSelectedEditElement}>Rotate 15°</button>
                      <button type="button" disabled={!selectedEditElement} onClick={copySelectedEditElement}>Copy</button>
                      <button type="button" disabled={!selectedEditElement} onClick={deleteSelectedEditElement}>Delete</button>
                    </div>
                  ) : null}
                  {files[previewIndex] && (tool.slug === "add-watermark" || tool.slug === "edit-pdf") ? (
                    <PdfVisualEditor
                      file={files[previewIndex]}
                      page={tool.slug === "edit-pdf" ? Number(values.pageNum || 1) : previewPage}
                      mode={tool.slug === "add-watermark" ? "watermark" : "edit"}
                      values={values}
                      imageFile={tool.slug === "add-watermark" ? extraFiles.image : extraFiles.imageFile}
                      watermarkPosition={previewWatermarkPosition}
                      showApplyToAll={hasWatermarkPositionChanges}
                      onWatermarkPositionChange={(position) => {
                        if (files[previewIndex]) {
                          setWatermarkPositions((current) => ({
                            ...current,
                            [watermarkPageKey(files[previewIndex], previewPage)]: position,
                          }));
                        }
                        setValues((current) => ({ ...current, position: "custom" }));
                      }}
                      onWatermarkImageWidthChange={(widthPercent) => updateValue("widthPercent", widthPercent.toFixed(1))}
                      onApplyWatermarkToAll={(position) => {
                        setWatermarkPositions({});
                        setApplyAllWatermarkPosition(position);
                        setValues((current) => ({ ...current, position: "custom" }));
                        setStatus(`Applied the page ${previewPage} watermark position to all pages.`);
                      }}
                      onPageChange={changePreviewPage}
                      editElements={editElements}
                      selectedEditElementId={selectedEditElementId}
                      editTool={editTool}
                      onSelectEditElement={selectEditElement}
                      onUpdateEditElement={(id, changes) => {
                        const selected = editElements.find((item) => item.id === id);
                        if (selected) setValues((current) => ({ ...current, ...editElementFormValues({ ...selected, ...changes }) }));
                        setEditElements((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
                      }}
                      onCreateEditElement={(type, geometry) => void addEditElement(type, geometry)}
                      onEditToolChange={activateEditTool}
                    />
                  ) : files[previewIndex] ? (
                    <PdfFilePreview file={files[previewIndex]} page={previewPage} />
                  ) : null}
                </div>
              </div>
            ) : null}

            {tool.flow === "organize-pdf" ? (
              <section className="pdf-organizer" aria-label="PDF page organizer">
                <div className="pdf-organizer-header">
                  <div>
                    <h3>Page order</h3>
                    <p>Move pages, rotate them, remove pages, or insert a blank page.</p>
                  </div>
                  {organizerLoading ? <span>Loading pages…</span> : <span>{organizerItems.length} pages</span>}
                </div>
                {organizerItems.length ? (
                  <ol className="pdf-organizer-list">
                    {organizerItems.map((item, index) => (
                      <li className="pdf-organizer-item" key={item.type === "page" ? `page-${item.pageIndex}` : item.id}>
                        {item.type === "page" ? (
                          <button
                            className="pdf-organizer-preview"
                            type="button"
                            onClick={() => {
                              setPreviewIndex(item.fileIndex);
                              setPreviewPage(item.pageNumber);
                            }}
                          >
                            <strong>Page {item.pageNumber}</strong>
                            <small>{files[item.fileIndex]?.name}</small>
                          </button>
                        ) : (
                          <span className="pdf-organizer-blank">Blank page</span>
                        )}
                        {item.rotation ? <span className="pdf-organizer-rotation">{item.rotation}°</span> : null}
                        <div className="pdf-organizer-actions">
                          <button type="button" aria-label="Move page earlier" disabled={index === 0} onClick={() => moveOrganizerItem(index, -1)}>↑</button>
                          <button type="button" aria-label="Move page later" disabled={index === organizerItems.length - 1} onClick={() => moveOrganizerItem(index, 1)}>↓</button>
                          <button
                            type="button"
                            aria-label="Rotate page 90 degrees"
                            onClick={() => setOrganizerItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, rotation: (entry.rotation + 90) % 360 } : entry))}
                          >↻</button>
                          <button type="button" onClick={() => addBlankPageAfter(index)}>Add blank</button>
                          <button
                            type="button"
                            aria-label={item.type === "page" ? "Remove page" : "Remove blank page"}
                            onClick={() => setOrganizerItems((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                          >Remove</button>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="pdf-organizer-empty">{organizerLoading ? "Reading the PDF page count." : "Choose a PDF to load its pages."}</p>
                )}
              </section>
            ) : null}

            {tool.fields?.length ? (
              <div className="pdf-options-grid">
                {tool.fields.map((field) => (
                  (tool.slug === "edit-pdf" && field.name === "annotationType") || !isFieldVisible(field, values) ? null
                  : field.type === "radio" ? (
                    <fieldset className="pdf-radio-field" key={field.name}>
                      <legend>{field.label}</legend>
                      <div className="pdf-radio-options">
                        {(field.options || []).map((option) => (
                          <label key={option.value}>
                            <input
                              type="radio"
                              name={field.name}
                              value={option.value}
                              checked={values[field.name] === option.value}
                              onChange={() => updateValue(field.name, option.value)}
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )
                  : field.type === "file" ? (
                    <div className="pdf-extra-file-field" key={field.name}>
                      <PdfFilePicker
                        label={field.label}
                        accept={field.accept || ""}
                        files={[extraFiles[field.name]].filter((file): file is File => file !== null && file !== undefined)}
                        onChange={(selectedFiles) => {
                          setExtraFiles((current) => ({ ...current, [field.name]: selectedFiles[0] || null }));
                        }}
                      />
                      {field.helper ? <small>{field.helper}</small> : null}
                    </div>
                  ) : field.type === "checkbox" ? (
                    <label className="pdf-checkbox-field" key={field.name}>
                      <input
                        type="checkbox"
                        checked={values[field.name] === "true"}
                        onChange={(event) => updateValue(field.name, String(event.currentTarget.checked))}
                      />
                      <span>{field.label}</span>
                    </label>
                  ) : field.type === "select" ? (
                    <label className="tool-field" key={field.name}>
                      <span>{field.label}</span>
                      <select className="tool-input" value={values[field.name] ?? field.defaultValue ?? ""} onChange={(event) => updateValue(field.name, event.currentTarget.value)}>
                        {(field.options || []).map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                      </select>
                      {field.helper ? <small>{field.helper}</small> : null}
                    </label>
                  ) : field.type === "textarea" ? (
                    <label className="tool-field pdf-wide-field" key={field.name}>
                      <span>{field.label}</span>
                      <textarea className="tool-input" rows={4} value={values[field.name] ?? ""} onChange={(event) => updateValue(field.name, event.currentTarget.value)} />
                      {field.helper ? <small>{field.helper}</small> : null}
                    </label>
                  ) : (
                    <label className="tool-field" key={field.name}>
                      <span>{field.label}</span>
                      <input className="tool-input" type={field.type} value={values[field.name] ?? ""} onChange={(event) => updateValue(field.name, event.currentTarget.value)} />
                      {field.helper ? <small>{field.helper}</small> : null}
                    </label>
                  )
                ))}
              </div>
            ) : null}

            {tool.flow === "remove-watermark" ? (
              <div className="pdf-watermark-panel">
                <p>Detection highlights possible text and graphics. Review the list carefully and select only watermarks you own or are authorized to remove.</p>
                <button className="tool-secondary-button" type="button" disabled={busy || !files.length} onClick={detectWatermarks}>
                  {busy ? "Working…" : "Detect possible watermarks"}
                </button>
                {watermarks.length ? (
                  <div className="pdf-detected-items">
                    {watermarks.map((item) => (
                      <label key={item.id}>
                        <input
                          type="checkbox"
                          checked={selectedWatermarks.has(item.id)}
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            setSelectedWatermarks((current) => {
                              const next = new Set(current);
                              if (checked) next.add(item.id);
                              else next.delete(item.id);
                              return next;
                            });
                          }}
                        />
                        <span>Page {item.page}: {item.fullText || item.text || item.type}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="pdf-submit-row">
              <button className="btn pdf-submit-button" type="submit" disabled={busy || organizerLoading || !tool.endpoint}>
                {busy ? "Processing…" : tool.slug === "add-watermark" ? "Apply watermark" : tool.slug === "edit-pdf" ? "Apply edits" : "Process file"}
              </button>
              {status ? <p className="pdf-status" role="status">{status}</p> : null}
            </div>
            {error ? <p className="pdf-error" role="alert">{error}</p> : null}
            {output ? (
              <section className="pdf-output-preview" aria-label="Processed file preview">
                <div className="pdf-output-header">
                  <div>
                    <h3>Result preview</h3>
                    <p>{output.filename}</p>
                  </div>
                  <a className="pdf-download-link" href={output.url} download={output.filename}>Download again</a>
                </div>
                {output.mediaType.includes("application/pdf") || output.filename.toLowerCase().endsWith(".pdf") ? (
                  <iframe className="pdf-document-preview" src={output.url} title={`Preview of ${output.filename}`} />
                ) : output.mediaType.startsWith("image/") ? (
                  <img className="pdf-image-preview" src={output.url} alt={`Preview of ${output.filename}`} />
                ) : (
                  <p className="pdf-preview-unavailable">This format does not support an in-page preview. Use Download to open the result.</p>
                )}
              </section>
            ) : null}
          </form>
        )}
      </section>
      <p className="pdf-privacy-note">
        File processing is handled by the PDF service, not solely in your browser. Review the
        service’s privacy terms before uploading sensitive documents.
      </p>
    </>
  );
}
