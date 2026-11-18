import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("remove-watermark");

export default function RemoveWatermarkPage() {
  return <PdfToolLandingPage slug="remove-watermark" />;
}
