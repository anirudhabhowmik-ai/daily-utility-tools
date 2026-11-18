import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("compress-image");

export default function CompressImagePage() {
  return <PdfToolLandingPage slug="compress-image" />;
}
