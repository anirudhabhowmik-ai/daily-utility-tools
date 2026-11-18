import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("add-watermark");

export default function AddWatermarkPage() {
  return <PdfToolLandingPage slug="add-watermark" />;
}
