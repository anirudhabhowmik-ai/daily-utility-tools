import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("crop-pdf");

export default function CropPdfPage() {
  return <PdfToolLandingPage slug="crop-pdf" />;
}
