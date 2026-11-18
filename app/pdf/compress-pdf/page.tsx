import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("compress-pdf");

export default function CompressPdfPage() {
  return <PdfToolLandingPage slug="compress-pdf" />;
}
