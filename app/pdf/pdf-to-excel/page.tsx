import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("pdf-to-excel");

export default function PdfToExcelPage() {
  return <PdfToolLandingPage slug="pdf-to-excel" />;
}
