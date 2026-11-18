import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("pdf-to-word");

export default function PdfToWordPage() {
  return <PdfToolLandingPage slug="pdf-to-word" />;
}
