export type PdfEditElementType = "text" | "shape" | "image" | "drawing" | "erase";
export type PdfEditTool = "select" | "drawing" | "erase";

export type PdfEditElement = {
  id: string;
  pageNum: number;
  type: PdfEditElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  color: string;
  shapeType: string;
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  imageData: string;
  opacity: number;
  pathData: string;
  strokeWidth: number;
  brushStyle: string;
};

export type PdfEditElementGeometry = Pick<PdfEditElement, "x" | "y" | "width" | "height"> & {
  pathData?: string;
};
