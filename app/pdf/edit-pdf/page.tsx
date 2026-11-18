import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("edit-pdf");

export default function EditPdfPage() {
  return <PdfToolLandingPage slug="edit-pdf" />;
}
