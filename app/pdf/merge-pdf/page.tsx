import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("merge-pdf");

export default function MergePdfPage() {
  return <PdfToolLandingPage slug="merge-pdf" />;
}
