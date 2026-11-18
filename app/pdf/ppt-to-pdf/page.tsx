import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("ppt-to-pdf");

export default function PptToPdfPage() {
  return <PdfToolLandingPage slug="ppt-to-pdf" />;
}
