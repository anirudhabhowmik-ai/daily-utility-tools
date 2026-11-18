import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("pdf-to-ppt");

export default function PdfToPptPage() {
  return <PdfToolLandingPage slug="pdf-to-ppt" />;
}
