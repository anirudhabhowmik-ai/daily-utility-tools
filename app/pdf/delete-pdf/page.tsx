import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("delete-pdf");

export default function DeletePdfPage() {
  return <PdfToolLandingPage slug="delete-pdf" />;
}
