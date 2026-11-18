import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("ocr-pdf");

export default function OcrPdfPage() {
  return <PdfToolLandingPage slug="ocr-pdf" />;
}
