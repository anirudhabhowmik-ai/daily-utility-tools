import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("split-pdf");

export default function SplitPdfPage() {
  return <PdfToolLandingPage slug="split-pdf" />;
}
