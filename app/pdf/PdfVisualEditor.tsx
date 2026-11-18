"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PdfEditElement, PdfEditElementGeometry, PdfEditElementType, PdfEditTool } from "./editElements";

type PdfEditorValues = Record<string, string>;
type Point = { x: number; y: number };
type WatermarkPlacement = Point & { alignment: "center" | "left" | "right" };
type PageSize = { width: number; height: number; renderedWidth: number; renderedHeight: number };
type PdfDocumentMetadata = {
  numPages: number;
  getPage: (page: number) => Promise<{
    getViewport: (options: { scale: number }) => Pick<PageSize, "width" | "height">;
  }>;
};
type DragState =
  | { kind: "move-watermark"; start: Point; origin: Point }
  | { kind: "move-element"; elementId: string; start: Point; origin: Point }
  | { kind: "draw-edit"; tool: "drawing" | "erase"; start: Point; points: Point[] }
  | { kind: "resize-element"; elementId: string; start: Point; origin: Point; size: { width: number; height: number } }
  | { kind: "resize-watermark"; start: Point; widthPercent: number };

type PdfVisualEditorProps = {
  file: File;
  page: number;
  mode: "watermark" | "edit";
  values: PdfEditorValues;
  imageFile?: File | null;
  watermarkPosition: WatermarkPlacement;
  showApplyToAll: boolean;
  onWatermarkPositionChange: (position: WatermarkPlacement) => void;
  onWatermarkImageWidthChange: (widthPercent: number) => void;
  onApplyWatermarkToAll: (position: WatermarkPlacement) => void;
  onPageChange: (page: number) => void;
  editElements: PdfEditElement[];
  selectedEditElementId: string | null;
  editTool: PdfEditTool;
  onSelectEditElement: (id: string | null) => void;
  onUpdateEditElement: (id: string, changes: Partial<PdfEditElement>) => void;
  onCreateEditElement: (type: Extract<PdfEditElementType, "drawing" | "erase">, geometry: PdfEditElementGeometry) => void;
  onEditToolChange: (tool: PdfEditTool) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(min, max), Math.max(min, value));

function serializePath(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function translatePathData(pathData: string, deltaX: number, deltaY: number) {
  return pathData.replace(/([ML])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/gi, (_match, command: string, x: string, y: string) =>
    `${command} ${(Number(x) + deltaX).toFixed(1)} ${(Number(y) + deltaY).toFixed(1)}`,
  );
}

export default function PdfVisualEditor({
  file,
  page,
  mode,
  values,
  imageFile,
  watermarkPosition,
  showApplyToAll,
  onWatermarkPositionChange,
  onWatermarkImageWidthChange,
  onApplyWatermarkToAll,
  onPageChange,
  editElements,
  selectedEditElementId,
  editTool,
  onSelectEditElement,
  onUpdateEditElement,
  onCreateEditElement,
  onEditToolChange,
}: PdfVisualEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [pageSize, setPageSize] = useState<PageSize | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAspect, setImageAspect] = useState(1);
  const [draftPathPoints, setDraftPathPoints] = useState<Point[]>([]);

  const watermarkOpacity = clamp(Number(values.opacity || 0.3), 0, 1);
  const rotation = Number(values.rotation || 0);
  const isImageWatermark = mode === "watermark" && values.type === "image";

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!imageFile) {
      setImageUrl("");
      setImageAspect(1);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth && image.naturalHeight) setImageAspect(image.naturalHeight / image.naturalWidth);
    };
    image.src = url;
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    let disposed = false;
    let destroyDocument: (() => Promise<void>) | null = null;
    setLoading(true);
    setError("");
    setPageCount(0);
    setPdfDocument(null);
    setPageSize(null);

    void (async () => {
      const pdfjs = await import("pdfjs-dist");
      if (disposed) return;
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const data = new Uint8Array(await file.arrayBuffer());
      if (disposed) return;
      const loadingTask = pdfjs.getDocument({ data });
      destroyDocument = () => loadingTask.destroy();
      const document = await loadingTask.promise;
      if (disposed) return;
      setPageCount(document.numPages);
      setPdfDocument(document);
    })().catch((renderError: unknown) => {
      if (disposed) return;
      setLoading(false);
      setError(renderError instanceof Error ? renderError.message : "The PDF page could not be previewed.");
    });

    return () => {
      disposed = true;
      if (destroyDocument) void destroyDocument();
    };
  }, [file]);

  useEffect(() => {
    if (!pdfDocument) return;
    let disposed = false;
    setLoading(true);
    setError("");
    setPageSize(null);
    const requestedPage = Number.isFinite(page) ? Math.trunc(page) : 1;
    const targetPage = clamp(requestedPage, 1, pdfDocument.numPages);
    if (targetPage !== page) onPageChange(targetPage);

    void pdfDocument.getPage(targetPage).then((pdfPage) => {
      if (disposed) return;
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(760 / baseViewport.width, 1.5);
      const viewport = pdfPage.getViewport({ scale });
      setPageSize({
        width: baseViewport.width,
        height: baseViewport.height,
        renderedWidth: viewport.width,
        renderedHeight: viewport.height,
      });
      setLoading(false);
    }).catch((pageError: unknown) => {
      if (disposed) return;
      setLoading(false);
      setError(pageError instanceof Error ? pageError.message : "The PDF page could not be previewed.");
    });

    return () => {
      disposed = true;
    };
  }, [pdfDocument, page]);

  const pagePoint = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pageSize) return { x: 0, y: 0 };
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * pageSize.width, 0, pageSize.width),
      y: clamp(((event.clientY - rect.top) / rect.height) * pageSize.height, 0, pageSize.height),
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pageSize) return;
    const point = pagePoint(event);
    const element = event.target instanceof Element ? event.target : null;
    if (mode === "watermark" && isImageWatermark && element?.closest("[data-resize]")) {
      dragRef.current = {
        kind: "resize-watermark",
        start: point,
        widthPercent: Number(values.widthPercent || 15),
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }
    if (mode === "watermark" && element?.closest("[data-draggable]")) {
      dragRef.current = {
        kind: "move-watermark",
        start: point,
        origin: {
          x: (watermarkPosition.x / 100) * pageSize.width,
          y: (watermarkPosition.y / 100) * pageSize.height,
        },
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    if (mode === "edit" && editTool !== "select") {
      dragRef.current = { kind: "draw-edit", tool: editTool, start: point, points: [point] };
      setDraftPathPoints([point]);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    const resizeId = element?.closest("[data-resize-id]")?.getAttribute("data-resize-id");
    const resizeTarget = resizeId ? editElements.find((item) => item.id === resizeId) : undefined;
    if (mode === "edit" && resizeTarget) {
      onSelectEditElement(resizeTarget.id);
      dragRef.current = {
        kind: "resize-element",
        elementId: resizeTarget.id,
        start: point,
        origin: { x: resizeTarget.x, y: resizeTarget.y },
        size: { width: resizeTarget.width, height: resizeTarget.height },
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    const targetId = element?.closest("[data-element-id]")?.getAttribute("data-element-id");
    const target = targetId ? editElements.find((item) => item.id === targetId) : undefined;
    if (mode === "edit" && target) {
      onSelectEditElement(target.id);
      dragRef.current = {
        kind: "move-element",
        elementId: target.id,
        start: point,
        origin: { x: target.x, y: target.y },
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }
    if (mode === "edit") {
      onSelectEditElement(null);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || !pageSize) return;
    const point = pagePoint(event);
    if (drag.kind === "resize-watermark") {
      const widthPercent = clamp(drag.widthPercent + ((point.x - drag.start.x) / pageSize.width) * 100, 1, 100);
      onWatermarkImageWidthChange(widthPercent);
      return;
    }
    if (drag.kind === "resize-element") {
      const target = editElements.find((item) => item.id === drag.elementId);
      if (!target) return;
      const nextWidth = clamp(drag.size.width + point.x - drag.start.x, 1, pageSize.width - drag.origin.x);
      const nextHeight = clamp(drag.size.height + point.y - drag.start.y, 1, pageSize.height - drag.origin.y);
      onUpdateEditElement(drag.elementId, { width: nextWidth, height: nextHeight });
      return;
    }
    if (drag.kind === "move-watermark") {
      const next = {
        x: clamp(drag.origin.x + point.x - drag.start.x, 0, pageSize.width),
        y: clamp(drag.origin.y + point.y - drag.start.y, 0, pageSize.height),
      };
      onWatermarkPositionChange({
        x: (next.x / pageSize.width) * 100,
        y: (next.y / pageSize.height) * 100,
        alignment: "center",
      });
      return;
    }
    if (drag.kind === "move-element") {
      const target = editElements.find((item) => item.id === drag.elementId);
      if (!target) return;
      const nextX = clamp(drag.origin.x + point.x - drag.start.x, 0, Math.max(0, pageSize.width - target.width));
      const nextY = clamp(drag.origin.y + point.y - drag.start.y, 0, Math.max(0, pageSize.height - target.height));
      const changes: Partial<PdfEditElement> = { x: nextX, y: nextY };
      if (target.type === "drawing") {
        changes.pathData = translatePathData(target.pathData, nextX - drag.origin.x, nextY - drag.origin.y);
      }
      onUpdateEditElement(drag.elementId, changes);
      return;
    }
    if (drag.kind === "draw-edit") {
      const nextPoints = [...drag.points, point];
      drag.points = nextPoints;
      setDraftPathPoints(nextPoints);
    }
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    if (drag?.kind === "draw-edit" && drag.points.length > 1) {
      const left = Math.min(...drag.points.map((point) => point.x));
      const top = Math.min(...drag.points.map((point) => point.y));
      const right = Math.max(...drag.points.map((point) => point.x));
      const bottom = Math.max(...drag.points.map((point) => point.y));
      const geometry: PdfEditElementGeometry = {
        x: left,
        y: top,
        width: Math.max(1, right - left),
        height: Math.max(1, bottom - top),
        ...(drag.tool === "drawing" ? { pathData: serializePath(drag.points) } : {}),
      };
      onCreateEditElement(drag.tool, geometry);
      onEditToolChange("select");
    }
    setDraftPathPoints([]);
    dragRef.current = null;
  };

  const previewX = (watermarkPosition.x / 100) * (pageSize?.width || 0);
  const previewY = (watermarkPosition.y / 100) * (pageSize?.height || 0);
  const imageWidth = (Number(values.widthPercent || 15) / 100) * (pageSize?.width || 0);
  const imageHeight = imageWidth * imageAspect;
  const draftPath = serializePath(draftPathPoints);

  return (
    <section className="pdf-visual-editor" aria-label="PDF visual preview">
      <div className="pdf-visual-editor-toolbar">
        <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>Previous page</button>
        <span>Page {page}{pageCount ? ` of ${pageCount}` : ""}</span>
        <button type="button" onClick={() => onPageChange(Math.min(pageCount || page + 1, page + 1))} disabled={pageCount > 0 && page >= pageCount}>Next page</button>
        {mode === "watermark" && showApplyToAll ? (
          <button type="button" onClick={() => onApplyWatermarkToAll(watermarkPosition)}>
            Apply to all pages
          </button>
        ) : null}
        <span className="pdf-visual-editor-hint">
          {mode === "watermark"
            ? "Drag the watermark to place it on this page."
            : editTool === "drawing"
              ? "Draw on the page. Each stroke is saved as a separate editable item."
              : editTool === "erase"
                ? "Drag over a page area to remove it."
                : "Select an item to move it. Use the toolbar to add, copy, rotate, or delete items."}
        </span>
      </div>
      <div className="pdf-visual-editor-frame">
        <div
          className="pdf-page-canvas"
          style={pageSize ? {
            width: pageSize.renderedWidth,
            aspectRatio: `${pageSize.renderedWidth} / ${pageSize.renderedHeight}`,
          } : undefined}
        >
          {pdfUrl && pageSize ? (
            <iframe
              className="pdf-page-document"
              src={`${pdfUrl}#page=${page}&toolbar=0&navpanes=0&scrollbar=0`}
              title={`PDF page ${page} preview`}
            />
          ) : null}
          {pageSize ? (
            <svg
              ref={svgRef}
              className="pdf-page-overlay"
              viewBox={`0 0 ${pageSize.width} ${pageSize.height}`}
              width={pageSize.renderedWidth}
              height={pageSize.renderedHeight}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {mode === "edit" ? (
                <rect
                  className="pdf-page-interaction-surface"
                  x="0"
                  y="0"
                  width={pageSize.width}
                  height={pageSize.height}
                />
              ) : null}
              {mode === "watermark" ? (
                isImageWatermark && imageUrl ? (
                  <>
                    <image
                      data-draggable="true"
                      href={imageUrl}
                      x={previewX - imageWidth / 2}
                      y={previewY - imageHeight / 2}
                      width={imageWidth}
                      height={imageHeight}
                      opacity={watermarkOpacity}
                      transform={`rotate(${rotation} ${previewX} ${previewY})`}
                      style={{ cursor: "move" }}
                    />
                    <circle
                      className="pdf-editor-resize-handle"
                      data-resize="true"
                      aria-label="Resize image watermark"
                      cx={previewX + imageWidth / 2}
                      cy={previewY + imageHeight / 2}
                      r="7"
                    />
                  </>
                ) : (
                  <text
                    data-draggable="true"
                    x={previewX}
                    y={previewY}
                    textAnchor={watermarkPosition.alignment === "left" ? "start" : watermarkPosition.alignment === "right" ? "end" : "middle"}
                    dominantBaseline="middle"
                    fill={values.color || "#000000"}
                    fillOpacity={watermarkOpacity}
                    fontSize={Number(values.fontSize || 36)}
                    fontFamily={values.fontFamily || "Helvetica"}
                    fontWeight={values.bold === "true" ? "bold" : "normal"}
                    fontStyle={values.italic === "true" ? "italic" : "normal"}
                    textDecoration={values.underline === "true" ? "underline" : "none"}
                    transform={`rotate(${rotation} ${previewX} ${previewY})`}
                    style={{ cursor: "move", userSelect: "none" }}
                  >
                    {values.text || "Watermark"}
                  </text>
                )
              ) : (
                <>
                  {editElements.filter((item) => item.pageNum === page).map((item) => {
                    const selected = item.id === selectedEditElementId;
                    const centerX = item.x + item.width / 2;
                    const centerY = item.y + item.height / 2;
                    const textAnchor = item.textAlign === "center" ? "middle" : item.textAlign === "right" ? "end" : "start";
                    const textX = item.textAlign === "center" ? centerX : item.textAlign === "right" ? item.x + item.width : item.x;
                    return (
                      <g
                        key={item.id}
                        data-element-id={item.id}
                        transform={`rotate(${item.rotation} ${centerX} ${centerY})`}
                        style={{ cursor: "move" }}
                      >
                        {item.type === "text" ? (
                          <text
                            x={textX}
                            y={item.y + item.fontSize}
                            fill={item.color}
                            fontSize={item.fontSize}
                            fontFamily={item.fontFamily}
                            fontWeight={item.fontWeight}
                            fontStyle={item.fontStyle}
                            textAnchor={textAnchor}
                            style={{ userSelect: "none" }}
                          >
                            {item.text.split(/\r?\n/).map((line, index) => (
                              <tspan key={`${item.id}-${index}`} x={textX} dy={index === 0 ? 0 : item.fontSize * 1.2}>
                                {line || " "}
                              </tspan>
                            ))}
                          </text>
                        ) : null}
                        {item.type === "image" && item.imageData ? (
                          <image
                            href={item.imageData}
                            x={item.x}
                            y={item.y}
                            width={item.width}
                            height={item.height}
                            opacity={item.opacity}
                            preserveAspectRatio="none"
                          />
                        ) : null}
                        {item.type === "shape" ? (
                          item.shapeType === "circle" ? (
                            <ellipse
                              cx={centerX}
                              cy={centerY}
                              rx={item.width / 2}
                              ry={item.height / 2}
                              fill={item.fillColor}
                              fillOpacity="0.35"
                              stroke={item.borderColor}
                              strokeWidth={item.borderWidth}
                            />
                          ) : item.shapeType === "line" ? (
                            <line
                              x1={item.x}
                              y1={item.y}
                              x2={item.x + item.width}
                              y2={item.y + item.height}
                              stroke={item.borderColor}
                              strokeWidth={item.borderWidth}
                            />
                          ) : (
                            <rect
                              x={item.x}
                              y={item.y}
                              width={item.width}
                              height={item.height}
                              fill={item.fillColor}
                              fillOpacity="0.35"
                              stroke={item.borderColor}
                              strokeWidth={item.borderWidth}
                            />
                          )
                        ) : null}
                        {item.type === "drawing" ? (
                          <path
                            d={item.pathData}
                            fill="none"
                            stroke={item.color}
                            strokeWidth={item.strokeWidth}
                            strokeDasharray={item.brushStyle === "dashed" ? "8 5" : item.brushStyle === "dotted" ? "2 5" : undefined}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : null}
                        {item.type === "erase" ? (
                          <rect
                            x={item.x}
                            y={item.y}
                            width={item.width}
                            height={item.height}
                            fill="#FFFFFF"
                            fillOpacity="0.8"
                            stroke="#DC2626"
                            strokeDasharray="8 5"
                            strokeWidth="2"
                          />
                        ) : null}
                        {selected ? (
                          <>
                            <rect
                              x={item.x}
                              y={item.y}
                              width={item.width}
                              height={item.height}
                              fill="none"
                              stroke="#2563EB"
                              strokeDasharray="5 4"
                              strokeWidth="1.5"
                              pointerEvents="none"
                            />
                            {["shape", "image", "erase"].includes(item.type) ? (
                              <circle
                                className="pdf-editor-resize-handle"
                                data-resize-id={item.id}
                                aria-label={`Resize ${item.type}`}
                                cx={item.x + item.width}
                                cy={item.y + item.height}
                                r="7"
                              />
                            ) : null}
                          </>
                        ) : null}
                      </g>
                    );
                  })}
                  {editTool === "drawing" && draftPathPoints.length > 1 ? (
                    <path d={draftPath} fill="none" stroke={values.color || "#000000"} strokeWidth={Number(values.strokeWidth || 2)} strokeLinecap="round" strokeLinejoin="round" />
                  ) : null}
                  {editTool === "erase" && draftPathPoints.length > 1 ? (
                    <rect
                      x={Math.min(...draftPathPoints.map((point) => point.x))}
                      y={Math.min(...draftPathPoints.map((point) => point.y))}
                      width={Math.max(1, Math.max(...draftPathPoints.map((point) => point.x)) - Math.min(...draftPathPoints.map((point) => point.x)))}
                      height={Math.max(1, Math.max(...draftPathPoints.map((point) => point.y)) - Math.min(...draftPathPoints.map((point) => point.y)))}
                      fill="#FFFFFF"
                      fillOpacity="0.5"
                      stroke="#DC2626"
                      strokeDasharray="8 5"
                      strokeWidth="2"
                    />
                  ) : null}
                </>
              )}
            </svg>
          ) : null}
        </div>
      </div>
      {loading ? <p className="pdf-visual-editor-message" role="status">Rendering page preview…</p> : null}
      {error ? <p className="pdf-visual-editor-message pdf-visual-editor-error" role="alert">{error}</p> : null}
    </section>
  );
}
