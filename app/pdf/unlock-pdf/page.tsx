import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("unlock-pdf");

export default function UnlockPdfPage() {
  return <PdfToolLandingPage slug="unlock-pdf" />;
}
