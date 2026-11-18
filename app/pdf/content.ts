import type { Metadata } from "next";
import { getPdfTool } from "./catalog";

export type PdfEditorialContent = {
  summary: string;
  highlights: string[];
  steps: string[];
  note: string;
  faqs: Array<{ question: string; answer: string }>;
};

export const PDF_EDITORIAL_CONTENT: Record<string, PdfEditorialContent> = {
  "add-watermark": {
    summary: "Add a light text or image mark to a PDF when you need to label a draft, identify a copy, or show who prepared a document. Preview the result before sharing it, since a watermark can cover important text.",
    highlights: [
      "Choose text or an image and set its opacity, size, rotation, and page range.",
      "The service combines uploaded PDFs into one output before adding the watermark.",
      "A watermark is a visible label, not encryption or access control.",
    ],
    steps: [
      "Select one or more PDF files. They are processed in the order selected.",
      "Choose a text watermark or provide an image, then adjust the available settings.",
      "Set the first and last pages, or leave the last page at zero to include every page.",
      "Process the files and review the downloaded PDF before sending it to anyone.",
    ],
    note: "Use a modest opacity so the mark does not make the document hard to read. A watermark does not stop someone from copying or editing the PDF; use password protection when access restrictions are needed.",
    faqs: [
      { question: "Can I watermark only part of a PDF?", answer: "Yes. Set a first page and a last page. The last-page value of zero means the watermark is applied through the end of the document." },
      { question: "Can I use a logo as the watermark?", answer: "Yes. Choose the image option and upload an image file. The result can vary with the image's aspect ratio and transparency." },
      { question: "Does a watermark protect confidential information?", answer: "No. It labels a document but does not encrypt it. Do not rely on a watermark to control access to sensitive files." },
    ],
  },
  "remove-watermark": {
    summary: "Review detected text and graphic elements in a PDF and choose which ones to remove. Detection can include ordinary document content, so inspect each selection before submitting the removal.",
    highlights: [
      "The detector lists possible elements and the page where each one appears.",
      "You choose the items to remove rather than deleting every detected item automatically.",
      "The tool is intended for documents you own or are authorized to modify.",
    ],
    steps: [
      "Choose the PDF you are allowed to edit.",
      "Select Detect possible watermarks and wait for the service to return candidate items.",
      "Review the page and text shown for each item, then select only the marks you mean to remove.",
      "Process the selection and check the downloaded file for missing or changed content.",
    ],
    note: "A PDF may contain text or graphics that resemble a watermark but are part of the original page. Keep an untouched copy and compare the result before relying on it.",
    faqs: [
      { question: "Will detection identify only watermarks?", answer: "No. It identifies candidate text and graphics. Review the list carefully because ordinary page content may also be detected." },
      { question: "Can every kind of watermark be removed?", answer: "No. Results depend on how the watermark was added. Marks embedded into a scanned page image may require image editing rather than PDF element removal." },
      { question: "May I remove a watermark from any PDF?", answer: "Only remove marks from documents you own or have permission to change. A watermark may communicate rights, ownership, or a document's status." },
    ],
  },
  "compress-pdf": {
    summary: "Make a PDF smaller when it is difficult to email, upload, or store. Compression can reduce image detail, so compare the result with your original if the document needs to remain clear when printed.",
    highlights: [
      "Useful for image-heavy PDFs that exceed an upload or email size limit.",
      "The service reduces embedded image resolution and recompresses document data.",
      "Small, text-only PDFs may not shrink much.",
    ],
    steps: [
      "Choose the PDF you want to reduce.",
      "Start compression and wait for the service to finish processing.",
      "Download the compressed copy and compare its size with the original.",
      "Open a few pages at normal viewing size and check that text and images are still legible.",
    ],
    note: "Keep the original file. Compression is not a substitute for keeping a high-quality master copy, especially for printing, archiving, or detailed diagrams.",
    faqs: [
      { question: "Why did my PDF barely get smaller?", answer: "A PDF that is mostly text or already compressed may have little redundant data to remove." },
      { question: "Can compression affect image quality?", answer: "Yes. Image-heavy files can lose detail when their images are downsampled or recompressed." },
      { question: "Should I use the compressed copy as my only copy?", answer: "Keep the original whenever quality matters. Review the compressed file before deleting or replacing anything." },
    ],
  },
  "compress-image": {
    summary: "Create a smaller JPEG from an image when you need a lighter file for a form, message, or website. JPEG compression can soften fine detail, particularly in text and sharp edges.",
    highlights: [
      "Designed for common image uploads such as photographs and screenshots.",
      "The output is a JPEG, which is widely supported by browsers and devices.",
      "A smaller output is not always visually identical to the source.",
    ],
    steps: [
      "Choose the image you want to compress.",
      "Submit it to the processing service.",
      "Download the compressed JPEG when processing finishes.",
      "Check that important text, edges, and colors remain clear enough for your use.",
    ],
    note: "Keep a copy of the original image, especially if you may need to edit it again. JPEG is a lossy format and is not ideal for graphics that need transparency.",
    faqs: [
      { question: "Will the compressed image keep transparency?", answer: "No. The output is JPEG, which does not support a transparent background." },
      { question: "Does compression always reduce file size?", answer: "It commonly helps with large photographs. An image that is already optimized may see only a small reduction." },
      { question: "Can I use the output for print?", answer: "Check its pixel dimensions and quality for your intended print size. A smaller file may not retain enough detail for large prints." },
    ],
  },
  "crop-pdf": {
    summary: "Adjust the visible page area of a PDF by entering a crop rectangle in PDF points. Apply the same crop to every page or target one page.",
    highlights: [
      "Apply one crop rectangle to every page or select a specific page.",
      "Enter the left and top offsets, width, and height in PDF points (72 points equal one inch).",
      "Cropping changes the visible page bounds; it is not a secure way to erase information.",
    ],
    steps: [
      "Keep an original copy of the PDF before making crop changes.",
      "Choose whether to crop every page or one page, then enter the crop rectangle.",
      "Use coordinates and dimensions that fit the document's page size.",
      "Process the file and verify the visible bounds on representative pages.",
    ],
    note: "Cropping is not redaction: hidden content may remain in the PDF and could still be recovered. Use a proper redaction workflow for information that must be permanently removed.",
    faqs: [
      { question: "What is a PDF point?", answer: "A PDF point is a unit used to describe page size; in the common 72-points-per-inch convention, 72 points equal one inch." },
      { question: "Can I crop different pages differently?", answer: "This form applies one crop rectangle to all pages or to a single selected page. Different rectangles on multiple pages are not yet available." },
      { question: "Does cropping remove the hidden parts of a page?", answer: "Not necessarily. A crop can hide content without deleting it, so do not use it to conceal sensitive information." },
    ],
  },
  "delete-pdf": {
    summary: "Remove unwanted pages from a PDF by entering page numbers or ranges. This is useful for dropping blank scans or pages that should not be included in a copy you share.",
    highlights: [
      "Enter page numbers as a comma-separated list, such as 2,4-6.",
      "The page numbers refer to the PDF's page order, not printed page labels.",
      "The original upload is not changed by creating the output file.",
    ],
    steps: [
      "Open the PDF and note the page numbers you want removed.",
      "Choose the file and enter the page numbers or ranges.",
      "Submit the request and download the new PDF.",
      "Check the first and last pages around each removed range to confirm the result.",
    ],
    note: "PDF viewers may show printed page labels that differ from the actual page index. Use the viewer's page counter to avoid deleting the wrong pages.",
    faqs: [
      { question: "How do I enter several pages?", answer: "Separate individual pages and ranges with commas, for example 2,4-6,9." },
      { question: "Can I undo a deletion?", answer: "The service returns a new file, but it does not restore deleted pages inside that output. Keep your original PDF so you can create another version." },
      { question: "Are printed page numbers used?", answer: "No. Enter the page positions in the PDF file, counted from the first page." },
    ],
  },
  "edit-pdf": {
    summary: "Add text, a shape, an image, or a coordinate-defined path to a PDF page, or cover a selected page area in a new copy.",
    highlights: [
      "Choose text, a shape, an image, a path, or an area to cover. Drawing paths use page coordinates.",
      "Set the page number and position in PDF points from the page's top-left corner.",
      "Review the new copy to check the placement and appearance.",
    ],
    steps: [
      "Keep an unchanged copy of your document.",
      "Choose the PDF and select the edit type.",
      "Set the page, placement, and edit options. Add an image file when using the image option.",
      "Submit the file and review the new PDF before sharing it.",
    ],
    note: "This tool adds annotations and covers selected areas; it does not rewrite existing PDF text. Covered content may still be recoverable from the original, so do not treat this as secure redaction. Do not upload sensitive documents unless you are comfortable with the configured processing service.",
    faqs: [
      { question: "Can I edit existing PDF text here?", answer: "No. This tool adds new annotations or covers a selected area; it does not rewrite existing PDF text." },
      { question: "How are positions measured?", answer: "Enter offsets and dimensions in PDF points from the page's top-left corner. Page sizes vary, so review the result before sharing it." },
      { question: "Will the source PDF be overwritten?", answer: "No. The service returns a processed copy. Keep the original in case you need to make a different edit." },
    ],
  },
  "excel-to-pdf": {
    summary: "Convert an Excel workbook to PDF when you need a view-only copy for printing or sharing. Spreadsheet print areas, scaling, and page orientation affect how rows and columns are split across pages.",
    highlights: [
      "Accepts Excel workbook files and can process more than one file in a request.",
      "A PDF is convenient for viewing but does not preserve spreadsheet formulas as editable formulas.",
      "Check print layout before sharing a large or wide worksheet.",
    ],
    steps: [
      "Set a print area and page orientation in your spreadsheet if the layout matters.",
      "Choose one or more workbook files.",
      "Submit them to the conversion service and download the resulting PDF.",
      "Review page breaks, column widths, and any hidden rows or sheets in the output.",
    ],
    note: "Spreadsheet software can paginate the same workbook differently depending on fonts, paper size, and print settings. Always inspect the generated PDF before treating it as a final report.",
    faqs: [
      { question: "Will formulas remain editable in the PDF?", answer: "No. The PDF is a presentation copy. Keep the workbook if you need to edit formulas or data." },
      { question: "Why is my worksheet spread across many pages?", answer: "The print area, paper size, orientation, and scaling settings determine pagination. Adjust those in the workbook and convert again." },
      { question: "Can several files be converted together?", answer: "Yes, this page accepts multiple spreadsheet files. The service returns the conversion result for the request." },
    ],
  },
  "extract-pdf": {
    summary: "Create a smaller PDF containing only the pages you need. Page ranges are useful for sharing a chapter, a form section, or selected pages from a longer report.",
    highlights: [
      "Accepts individual page numbers and ranges such as 1,3-5.",
      "The selected pages are kept in the original order.",
      "Useful for making a focused copy without changing the source document.",
    ],
    steps: [
      "Use the PDF viewer's page counter to identify the pages to keep.",
      "Choose the file and enter the page numbers or ranges.",
      "Submit the request and download the extracted PDF.",
      "Confirm that the first and last selected pages are present and in the expected order.",
    ],
    note: "Page labels printed on a document can differ from its PDF page positions. Check the viewer's page counter before entering a range.",
    faqs: [
      { question: "Can I extract non-consecutive pages?", answer: "Yes. Separate page numbers and ranges with commas, for example 1,4,7-9." },
      { question: "Does extraction delete pages from my original?", answer: "No. It creates a separate file and leaves your original unchanged." },
      { question: "Can I change the order of the extracted pages?", answer: "This extraction endpoint keeps the selected pages in their original order. Use the organize tool for a custom sequence." },
    ],
  },
  "html-to-pdf": {
    summary: "Save a public web page or uploaded HTML as a PDF for reading, sharing, or record keeping. The page may look different in print than it does in a browser window.",
    highlights: [
      "Accepts a public web address or uploaded HTML files.",
      "Lets you choose page width and a margin preset.",
      "The rendered output depends on the page's fonts, images, and print styles.",
    ],
    steps: [
      "Enter a public web address or select local HTML files.",
      "Choose a page width and margin setting.",
      "Start conversion and wait for the browser-rendering service to finish.",
      "Review page breaks, images, and long sections in the downloaded PDF.",
    ],
    note: "Only submit a URL you are authorized to access. Some pages require sign-in, load content after a delay, or block automated rendering, so their PDF may be incomplete.",
    faqs: [
      { question: "Can I convert a private page behind a login?", answer: "The service cannot use your browser's signed-in session. A public page is more likely to render successfully." },
      { question: "Why are some images missing?", answer: "A page may load images slowly, restrict automated requests, or reference resources that are not publicly reachable." },
      { question: "Will the PDF look exactly like the website?", answer: "Not always. Print styles, responsive layouts, and page breaks can change how a web page is rendered." },
    ],
  },
  "image-to-pdf": {
    summary: "Place several image files into one PDF when you want to keep photos or scanned pages together. The order of the selected images determines their order in the document.",
    highlights: [
      "Accepts common browser-supported image formats.",
      "Combines selected images into a single PDF.",
      "A clear, evenly lit scan usually produces a more readable result.",
    ],
    steps: [
      "Choose the images you want to include, in the intended page order.",
      "Check the selected file list before submitting.",
      "Create and download the PDF.",
      "Open the result and confirm that each image is upright and readable.",
    ],
    note: "Large images can make a large PDF. If the file will be printed, check page size and image resolution in a PDF viewer before sharing it.",
    faqs: [
      { question: "Can I combine several images?", answer: "Yes. Select multiple images; they are placed into the PDF in their selected order." },
      { question: "Can I reorder pages after choosing images?", answer: "The current interface uses selection order. Choose files in the order you want them to appear." },
      { question: "Why does the PDF look blurry?", answer: "The original image may have low resolution or may be out of focus. A PDF cannot restore details that were not present in the image." },
    ],
  },
  "merge-pdf": {
    summary: "Combine PDF files into one document when several related files need to be reviewed or shared together. The output follows the order in which the files are selected.",
    highlights: [
      "Combines multiple PDFs into a single file.",
      "Keeps each document's pages in their existing sequence.",
      "A useful final check is to confirm bookmarks and page order in the merged copy.",
    ],
    steps: [
      "Choose the PDF files you want to combine in the correct order.",
      "Submit the files to the processing service.",
      "Download the merged PDF.",
      "Review the page transitions and total length before sharing it.",
    ],
    note: "The merged document may contain metadata or information from every source file. Check the final PDF for pages you did not intend to include.",
    faqs: [
      { question: "Can I change the order of the files?", answer: "The result follows the order selected in the upload dialog. If order matters, select the files in sequence." },
      { question: "Does merging change the original PDFs?", answer: "No. The service creates a new file and does not overwrite your source files." },
      { question: "Can I merge password-protected files?", answer: "A protected file may need to be unlocked first. The service will report an error if it cannot read a selected PDF." },
    ],
  },
  "ocr-pdf": {
    summary: "Run optical character recognition on a scanned PDF so that image-based pages can contain searchable text. OCR is most effective when scans are straight, sharp, and high contrast.",
    highlights: [
      "Accepts a language code such as eng or hin.",
      "OCR can make scanned words searchable, but it may misread unusual fonts or poor scans.",
      "The output is a new PDF; keep your original scan for comparison.",
    ],
    steps: [
      "Choose the scanned PDF.",
      "Enter the language code that best matches the document text.",
      "Submit the file and allow the OCR service time to process each page.",
      "Search for a few known words in the result and correct important text using a suitable editor.",
    ],
    note: "OCR creates a text layer based on visual recognition; it is not a certified transcription. Check names, amounts, dates, and other details before relying on extracted text.",
    faqs: [
      { question: "Why does OCR take time?", answer: "The service examines page images and recognizes text, so processing can take longer for large documents or high-resolution scans." },
      { question: "Can OCR read handwriting?", answer: "This tool is designed for printed text. Handwriting recognition is less reliable and may not be supported." },
      { question: "Will the recognized text be perfect?", answer: "No. Scan quality, language, fonts, and page layout all affect recognition. Review important text against the original." },
    ],
  },
  "organize-pdf": {
    summary: "Reorder, rotate, and remove pages from a PDF, or insert blank pages before creating a new copy.",
    highlights: [
      "Pages are listed in their current order and can be moved or rotated.",
      "Remove pages you do not need or insert blank pages between existing pages.",
      "The original upload remains unchanged.",
    ],
    steps: [
      "Choose a PDF and wait for its page list to load.",
      "Move, rotate, remove, or add blank pages as needed.",
      "Submit the new page order to the service.",
      "Review the resulting document from beginning to end.",
    ],
    note: "Removed pages will not appear in the output. Keep your original PDF if you may need to restore them.",
    faqs: [
      { question: "Can I rotate a page?", answer: "Yes. Use the rotate control on a page to turn it 90 degrees at a time." },
      { question: "Can I insert a blank page?", answer: "Yes. Use Add blank beside a page to insert a blank page immediately after it." },
      { question: "What happens to pages I remove?", answer: "Removed pages are left out of the new PDF. The uploaded original is not changed." },
    ],
  },
  "page-number": {
    summary: "Add a simple page-number label to a PDF for easier referencing in meetings, printouts, or review notes. You can set the starting number and choose which pages receive a label.",
    highlights: [
      "Choose font, size, color, and a starting number.",
      "Use a page range when a cover or title page should remain unnumbered.",
      "A custom text pattern can include the page number and total page count.",
    ],
    steps: [
      "Select the PDF you want to number.",
      "Choose the first and last pages and the number to start with.",
      "Set the font and color, then submit the file.",
      "Check the output to make sure numbers are visible and do not cover existing text.",
    ],
    note: "The current form uses the service's default placement. For documents with content near the page edges, review each page before printing.",
    faqs: [
      { question: "Can I leave the cover page unnumbered?", answer: "Yes. Set the first page to 2 or to whichever page should receive the first label." },
      { question: "Can the numbering start at a number other than one?", answer: "Yes. Set the starting number in the form." },
      { question: "Can I add a total-page label?", answer: "The custom text option supports {n} for the current number and {total} for the document's page count." },
    ],
  },
  "pdf-to-excel": {
    summary: "A PDF-to-spreadsheet workflow is useful when a report contains tables that need further review. The current processing backend does not provide this conversion endpoint, so this page does not claim to create an Excel file.",
    highlights: [
      "Scanned tables usually need OCR before their rows and columns can be interpreted.",
      "PDF tables may not contain the same structure as the original spreadsheet.",
      "The current backend must add a PDF-to-Excel endpoint before this feature can run.",
    ],
    steps: [
      "Keep the source PDF and check whether it contains selectable text or only a scan.",
      "When conversion is available, choose the pages that contain the tables you need.",
      "Compare the converted cells with the original document, especially totals and dates.",
      "Correct column boundaries and number formats before using the data for analysis.",
    ],
    note: "This route is intentionally marked unavailable until a conversion endpoint is configured. Do not rely on the current page to produce a file.",
    faqs: [
      { question: "Can I convert a PDF to Excel here now?", answer: "Not yet. The backend connected to this site does not currently register a PDF-to-Excel conversion route." },
      { question: "Why can table conversion need manual review?", answer: "PDFs primarily describe page appearance. A converter may need to infer rows, columns, and cell relationships from that layout." },
      { question: "What should I check in a converted workbook?", answer: "Verify row alignment, decimal points, dates, totals, and any cells that span multiple columns." },
    ],
  },
  "pdf-to-image": {
    summary: "Render PDF pages as image files when you need to place a page in a presentation, message, or image editor. Higher resolution can improve detail but also creates larger files and takes more time.",
    highlights: [
      "Choose PNG, JPG, or WebP output and select specific pages or a range.",
      "Resolution affects both image dimensions and processing time.",
      "Multiple rendered pages are returned together in a ZIP file.",
    ],
    steps: [
      "Choose the PDF and select the image format.",
      "Set a resolution appropriate for screen viewing or print.",
      "Enter all pages or a specific page selection.",
      "Download and inspect the resulting image or ZIP archive.",
    ],
    note: "For ordinary screen sharing, a moderate resolution is often sufficient. Use a higher setting only when small details need to remain legible.",
    faqs: [
      { question: "Which format should I choose?", answer: "JPG is useful for photographs and smaller files, PNG keeps sharp edges, and WebP can offer a compact modern image." },
      { question: "Why is a high-DPI conversion slow?", answer: "The renderer creates more pixels per page, increasing processing and output size." },
      { question: "How are several pages delivered?", answer: "When more than one page is selected, the service packages the images in a ZIP file." },
    ],
  },
  "pdf-to-pdfa": {
    summary: "Create a searchable, archival-style PDF/A copy by applying OCR to scanned pages. PDF/A conversion can help with long-term document workflows, but the result should still be checked against the source.",
    highlights: [
      "Supports language codes such as eng and eng+hin.",
      "The page reports OCR progress while the backend processes the job.",
      "The service returns a separate PDF/A file for download.",
    ],
    steps: [
      "Choose the PDF and enter the language or languages present in its text.",
      "Start the job and watch the page progress indicator.",
      "Download the completed file when processing finishes.",
      "Open the PDF/A copy and confirm that pages, images, and searchable text are present.",
    ],
    note: "OCR may misread low-quality scans, and conversion alone does not guarantee that a document satisfies every archival or legal requirement. Confirm any requirements with the organization receiving the file.",
    faqs: [
      { question: "What does OCR add to a scanned PDF?", answer: "It adds a searchable text layer based on the visible page image. The page image itself is generally retained." },
      { question: "Why does the tool ask for language codes?", answer: "The OCR engine uses language data to recognize character shapes and words. Choose languages that match the document." },
      { question: "Does PDF/A guarantee archival compliance?", answer: "No. It creates a PDF/A-formatted output, but your workflow may have additional validation or retention requirements." },
    ],
  },
  "pdf-to-ppt": {
    summary: "Turn PDF pages into a PowerPoint presentation when you need to discuss or present the pages as slides. The conversion mode affects whether the service prioritizes text or page appearance.",
    highlights: [
      "Offers automatic, text, and image-oriented conversion modes.",
      "Image-based slides can preserve appearance but may not be editable as individual objects.",
      "Text extraction depends on the source PDF containing usable text.",
    ],
    steps: [
      "Choose the PDF and select the conversion mode that fits your goal.",
      "Automatic mode checks for selectable text. For a scanned PDF, choose Image or OCR.",
      "Submit the file and download the PowerPoint output.",
      "Review slide layout, text order, and images in a presentation application.",
    ],
    note: "PDF and PowerPoint use different layout models. Expect to make adjustments to spacing, fonts, or slide breaks after conversion.",
    faqs: [
      { question: "Will every slide be editable?", answer: "Not necessarily. Image-based conversion can preserve the page's look while leaving its contents as a single image." },
      { question: "Why did text appear out of order?", answer: "PDFs store text by position, not always by reading order. Complex layouts can be reconstructed imperfectly." },
      { question: "Which mode should I start with?", answer: "Automatic is a reasonable starting point. Compare text and image modes if the first result does not fit your needs." },
    ],
  },
  "pdf-to-word": {
    summary: "A PDF-to-Word conversion can help when a document needs substantial text editing. The current backend does not provide this conversion endpoint, so this page explains the workflow but does not produce a Word file.",
    highlights: [
      "Text-based PDFs are generally easier to convert than scans.",
      "Tables, columns, and positioned text may need manual repair after conversion.",
      "A conversion endpoint must be added to the backend before this page can process files.",
    ],
    steps: [
      "Keep an original copy of the PDF.",
      "When conversion is available, select the document and choose an output format.",
      "Open the resulting document in a word processor and inspect its layout.",
      "Compare important text, tables, and page breaks with the original PDF.",
    ],
    note: "The current backend does not register PDF-to-Word conversion. This page is marked unavailable rather than generating a misleading sample download.",
    faqs: [
      { question: "Can this page convert my PDF to Word now?", answer: "Not yet. The connected backend does not currently expose a PDF-to-Word endpoint." },
      { question: "Will the Word file look exactly like the PDF?", answer: "PDF and Word handle layout differently. Even with a converter, complex pages commonly need adjustment." },
      { question: "What about scanned documents?", answer: "Scans need OCR before their text can be edited. Recognition quality depends on scan clarity and language." },
    ],
  },
  "ppt-to-pdf": {
    summary: "Export a PowerPoint presentation to PDF for consistent viewing and printing. A PDF is convenient for sharing slides, but animations and some interactive elements are not carried over.",
    highlights: [
      "Accepts PowerPoint presentation files.",
      "The conversion service can process more than one presentation in a request.",
      "Slide size, embedded fonts, and media can affect the final pages.",
    ],
    steps: [
      "Check slide size and remove any presentation-only notes you do not want to share.",
      "Choose the PowerPoint file or files.",
      "Submit them to the conversion service and download the PDF.",
      "Review slide order, fonts, and embedded images in the output.",
    ],
    note: "If a slide uses animation, only a static view is represented in the PDF. Keep the presentation file when transitions or editable objects are needed.",
    faqs: [
      { question: "Are animations included in the PDF?", answer: "No. PDF pages are static; animations and transitions from the presentation are not preserved." },
      { question: "Can multiple presentations be converted?", answer: "Yes. The page accepts multiple files, and the service returns a PDF conversion result." },
      { question: "Why did a font change?", answer: "The font may not be embedded in the presentation or available to the conversion environment. Check the exported pages before sharing." },
    ],
  },
  "protect-pdf": {
    summary: "Add password protection to a PDF before sharing it with a person who should know the password. Encryption is only one part of document security; send the password through a separate trusted channel.",
    highlights: [
      "Applies a password using the PDF service.",
      "Use a unique password that is not reused for other accounts.",
      "Anyone with access to the password may be able to open the protected file.",
    ],
    steps: [
      "Choose the PDF you want to protect.",
      "Enter a strong, unique password and keep it somewhere safe.",
      "Submit the file and download the protected copy.",
      "Test the file with the password before sending it to its intended recipient.",
    ],
    note: "Do not forget the password: recovery may not be possible. For sensitive documents, confirm the encryption requirements of the recipient or organization.",
    faqs: [
      { question: "How should I share the password?", answer: "Use a separate trusted channel rather than placing the password in the same message as the PDF." },
      { question: "Can I recover a forgotten password?", answer: "This tool does not provide password recovery. Keep a safe record of credentials needed to access important files." },
      { question: "Does password protection prevent screenshots or copying?", answer: "No. It can restrict opening the file, but it cannot prevent an authorized viewer from capturing information they can see." },
    ],
  },
  "rotate-pdf": {
    summary: "Rotate every page of a PDF in quarter-turn increments when scans or exported pages are sideways or upside down. Check mixed-orientation documents before applying one rotation to all pages.",
    highlights: [
      "Applies a selected 90°, 180°, or 270° rotation to each page.",
      "The current control rotates every page by the same amount.",
      "The output is a new PDF, leaving the source unchanged.",
    ],
    steps: [
      "Choose the PDF and inspect whether its pages share the same orientation issue.",
      "Select the rotation direction that will make the pages upright.",
      "Submit the file and download the rotated copy.",
      "Check pages with a different orientation before replacing the original.",
    ],
    note: "If the document contains both portrait and landscape pages, rotating every page the same way may make some pages harder to read. The current interface does not select individual pages.",
    faqs: [
      { question: "Can I rotate only one page?", answer: "The current interface applies the selected angle to every page. Individual-page rotation is not available on this page yet." },
      { question: "Does rotation change the page content?", answer: "It changes the page orientation in the output PDF; it does not rewrite the text itself." },
      { question: "What if the PDF has mixed orientations?", answer: "Review the document first. A single rotation setting may not suit every page in a mixed-orientation file." },
    ],
  },
  "scan-pdf": {
    summary: "Improve the contrast and clarity of a document photo, then download it as an image or PDF. The current tool enhances the full image and does not provide corner adjustment or OCR.",
    highlights: [
      "Accepts an image captured by a phone or camera.",
      "Can return a cleaned image or a PDF, depending on the selected format.",
      "The service adjusts image appearance but does not crop or perspective-correct the page.",
    ],
    steps: [
      "Photograph the page in focus with even lighting.",
      "Choose the image and select the desired output format.",
      "Submit the photo for image enhancement.",
      "Check the output for clarity and compare it with the original.",
    ],
    note: "Avoid strong glare and heavy shadows. For important records, compare the output with the original photo and retain the original until the result is verified.",
    faqs: [
      { question: "Does this tool crop the page or detect its corners?", answer: "Not currently. It enhances the full image, so crop the photo before uploading if you need to remove the background." },
      { question: "Can the scanner restore blurry text?", answer: "Enhancement can improve contrast but cannot reliably recover details that were out of focus or missing from the photo." },
      { question: "Can I extract text with OCR?", answer: "No. This page enhances an image and does not run OCR. Use the OCR PDF tool for a PDF when you need searchable text." },
      { question: "Can I save the result as a PDF?", answer: "Yes. Choose PDF as the output format before submitting the image." },
    ],
  },
  "split-pdf": {
    summary: "Separate a PDF into one file per page and download the pages together as a ZIP archive. This is useful when each page needs to be handled or sent independently.",
    highlights: [
      "Creates a separate PDF for every page.",
      "Packages the page files into a ZIP download.",
      "The page order follows the original document.",
    ],
    steps: [
      "Choose the PDF you want to divide.",
      "Submit it to the processing service.",
      "Download and extract the ZIP archive.",
      "Open a few page files to confirm that the split is complete.",
    ],
    note: "This endpoint splits every page; it does not currently create custom page groups. For selected pages, use the extract tool instead.",
    faqs: [
      { question: "Can I split only a chosen range?", answer: "This tool creates one PDF for each page in the document. Use page extraction when you only need selected pages." },
      { question: "Why is the result a ZIP file?", answer: "A ZIP archive keeps all of the individual page PDFs together in one download." },
      { question: "Will the source file change?", answer: "No. The service returns separate files and does not alter your original PDF." },
    ],
  },
  "unlock-pdf": {
    summary: "Remove a PDF password when you know the password and have permission to create an unprotected copy. A successfully unlocked file may be easier to share, so store it carefully.",
    highlights: [
      "Requires the current PDF password when the document is protected.",
      "Only use this on files you own or are authorized to modify.",
      "The output may no longer require a password to open.",
    ],
    steps: [
      "Confirm you are allowed to change the document's protection.",
      "Choose the PDF and enter its current password.",
      "Submit the request and download the unlocked copy.",
      "Store and share the new file with the same care as the original information.",
    ],
    note: "Removing a password reduces one layer of protection. If you need to keep access limited, use a protected copy and share its password separately.",
    faqs: [
      { question: "Can I unlock a file without its password?", answer: "No. This workflow is for documents you can legitimately open and are authorized to modify." },
      { question: "Will the unlocked file still be private?", answer: "The file may open without a password. Anyone who obtains it may be able to read it, so share it carefully." },
      { question: "Does unlocking change the original?", answer: "No. The service returns a separate output file." },
    ],
  },
  "word-to-pdf": {
    summary: "Convert a Word document to PDF when you need a stable copy for reading, review, or printing. Page layout can change with fonts, margins, and print settings, so inspect the exported file.",
    highlights: [
      "Accepts Word document files and can process more than one file.",
      "A PDF is convenient to distribute but does not retain editable Word structure.",
      "Check headers, footers, tables, and page breaks after conversion.",
    ],
    steps: [
      "Save the document and check its page layout in Word or a compatible editor.",
      "Choose the Word file or files to convert.",
      "Submit the files and download the resulting PDF.",
      "Open the PDF and review fonts, tables, page numbering, and any images.",
    ],
    note: "If the document uses custom fonts or complex layout elements, the conversion may differ from the original application. Keep the editable Word file as your source.",
    faqs: [
      { question: "Will comments and tracked changes appear?", answer: "Their handling depends on the document's settings and the conversion environment. Review the PDF and remove private comments before sharing." },
      { question: "Can I edit the PDF like a Word document?", answer: "A PDF is primarily a fixed-layout format. Keep the Word file for substantial text edits." },
      { question: "Can I convert several Word files together?", answer: "Yes. This page accepts multiple Word files in one request." },
    ],
  },
};

export function getPdfPageMetadata(slug: string): Metadata {
  const tool = getPdfTool(slug);
  const content = PDF_EDITORIAL_CONTENT[slug];
  if (!tool || !content) return {};
  return {
    title: `${tool.title} | ToolsAB PDF tools`,
    description: content.summary,
    alternates: { canonical: `/pdf/${slug}` },
  };
}
