import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("rotate-pdf");

export default function RotatePdfPage() {
  return <PdfToolLandingPage slug="rotate-pdf" />;
}
