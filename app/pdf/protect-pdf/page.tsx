import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("protect-pdf");

export default function ProtectPdfPage() {
  return <PdfToolLandingPage slug="protect-pdf" />;
}
