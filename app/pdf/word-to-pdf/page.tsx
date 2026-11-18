import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("word-to-pdf");

export default function WordToPdfPage() {
  return <PdfToolLandingPage slug="word-to-pdf" />;
}
