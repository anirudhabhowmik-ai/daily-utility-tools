import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("extract-pdf");

export default function ExtractPdfPage() {
  return <PdfToolLandingPage slug="extract-pdf" />;
}
