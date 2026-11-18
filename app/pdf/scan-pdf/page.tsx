import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("scan-pdf");

export default function ScanPdfPage() {
  return <PdfToolLandingPage slug="scan-pdf" />;
}
