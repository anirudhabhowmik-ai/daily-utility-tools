import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("pdf-to-image");

export default function PdfToImagePage() {
  return <PdfToolLandingPage slug="pdf-to-image" />;
}
