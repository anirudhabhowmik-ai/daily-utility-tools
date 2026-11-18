import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("pdf-to-pdfa");

export default function PdfToPdfaPage() {
  return <PdfToolLandingPage slug="pdf-to-pdfa" />;
}
