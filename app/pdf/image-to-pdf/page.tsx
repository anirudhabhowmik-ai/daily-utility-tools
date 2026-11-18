import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("image-to-pdf");

export default function ImageToPdfPage() {
  return <PdfToolLandingPage slug="image-to-pdf" />;
}
