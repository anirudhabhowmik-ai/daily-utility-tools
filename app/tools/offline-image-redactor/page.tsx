
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import OfflineRedactorTool from "./OfflineRedactorTool";

export const metadata: Metadata = {
  title: "Free Offline Image Redactor | Blur & Pixelate Images | ToolsAB",
  description:
    "Hide private details in screenshots and photos with this free offline image redactor. Use shapes, brush, blur and pixelation, then download your edited image.",
  alternates: {
    canonical: "/tools/offline-image-redactor",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<OfflineRedactorTool />}
      title="Offline Image Redactor"
      summary="Sometimes a screenshot or photo contains information you do not want everyone to see. It could be your email address, phone number, home address, account details or a face. This free offline image redactor helps you hide those details before sharing an image. Upload an image into the browser, choose a covering tool, and edit the areas you want to protect. Your image is processed on your device rather than uploaded to a remote server. When you finish, download the edited image in PNG, JPG or WebP format."

      highlights={[
        "Edit images directly in your browser without sending them to a server.",
        "Cover private details with rectangles, circles, ellipses and other shapes.",
        "Use the brush tool to cover irregular areas by drawing freehand.",
        "Blur or pixelate selected parts of an image.",
        "Add text labels such as REDACTED to identify hidden information.",
        "Choose mask colors, adjust opacity and customize shape outlines.",
        "Move or delete existing masks without starting your edit again.",
        "Use undo and redo to review previous editing steps.",
        "Zoom in or out to work on small details more comfortably.",
        "Download the finished image as PNG, JPG or WebP.",
      ]}

      steps={[
        "Choose an image from your device using the Choose image to redact field. The tool accepts image files that your browser can open.",
        "Wait for the image to appear in the live canvas. You can see its filename and image dimensions above the preview.",
        "Open the Tools tab and choose how you want to hide the information. For example, select Rectangle for a solid cover, Brush for freehand drawing, Blur for a softened area or Pixelate for a block-style effect.",
        "Move your pointer over the image and drag across the area you want to edit. For the Text tool, click the position where you want the label and enter your text.",
        "Open the Appearance tab to choose a preset color or select your own mask color. Adjust opacity and other available style settings.",
        "Check the edited area carefully. Make sure the original information is no longer readable, especially if you are protecting private or confidential details.",
        "If you need to adjust a mask, choose Select, click the mask and drag it to a new position. You can also delete the selected mask.",
        "Use Undo or Redo to move backward or forward through your recent editing steps. Clear all removes every mask from the image.",
        "Use the zoom buttons to inspect small details. Choose Fit to return to the normal view. You can also hold Ctrl while scrolling to zoom, or use Alt and drag to move around the canvas.",
        "Enter a filename, choose PNG, JPG or WebP, and adjust the quality if you select JPG or WebP.",
        "Click Download redacted image to save the edited image to your device.",
      ]}

      faqs={[
        {
          question: "What is an offline image redactor?",
          answer:
            "An offline image redactor is a browser-based tool for hiding selected parts of an image. You can cover information with solid shapes, draw over it, blur it or turn it into a pixelated area. This tool processes the image locally in your browser, so the image is not sent to a remote server by the redaction workflow.",
        },
        {
          question: "Does this tool upload my image?",
          answer:
            "No. The image editing and export process in this tool runs in your browser. Your selected image is loaded on your device and processed using the browser's image and canvas features. It is not uploaded to a server by this tool.",
        },
        {
          question: "How do I hide text in a screenshot?",
          answer:
            "Upload your screenshot, select Rectangle or Brush, and cover the text you want to hide. You can also use Pixelate or Blur over the selected area. For sensitive information, a fully opaque solid cover is generally the safer choice because blur and pixelation may leave some details recognizable.",
        },
        {
          question: "What is the Select tool used for?",
          answer:
            "The Select tool lets you choose a mask you have already drawn. Click a mask to select it, then drag it to another position. You can also delete the selected mask. This is useful when you want to adjust your work without drawing the mask again.",
        },
        {
          question: "How does the Brush tool work?",
          answer:
            "Choose Brush and drag over the image to draw a freehand mask. It is useful for covering uneven areas that are difficult to fit inside a rectangle or circle. You can change the brush size and mask color in the available settings.",
        },
        {
          question: "How do I use the Rectangle tool?",
          answer:
            "Select Rectangle, place your pointer at one corner of the area you want to cover, and drag to the opposite corner. The tool creates a rectangular mask. You can choose whether the rectangle is filled, outlined or both through the Appearance settings.",
        },
        {
          question: "What is the Rounded tool?",
          answer:
            "The Rounded tool creates a rectangle with curved corners. Select it and drag across the image to draw the shape. It can be useful when you want a softer-looking cover instead of a standard rectangle.",
        },
        {
          question: "What is the difference between Ellipse and Circle?",
          answer:
            "Ellipse creates an oval shape that can be wider or taller. Circle creates a round shape with equal width and height. Both can be used to cover selected areas of an image.",
        },
        {
          question: "How do Triangle and Diamond work?",
          answer:
            "Triangle creates a three-sided shape, while Diamond creates a four-sided diamond shape. Select the tool and drag across the image to set the shape size. These are useful for custom visual marks or covers.",
        },
        {
          question: "What are the Line and Arrow tools used for?",
          answer:
            "Line draws a straight line between the starting point and the point where you release the pointer. Arrow draws a line with an arrowhead. You can adjust the line width. These tools are useful for marking or pointing out parts of an image, but they do not cover an area like a filled rectangle.",
        },
        {
          question: "How do I add a text label?",
          answer:
            "Choose Text and click the place where you want the label. A small dialog will appear where you can enter your text, such as REDACTED or PRIVATE. Select Place label to add it to the image. You can change the font size and color using the available settings.",
        },
        {
          question: "What is the Pixelate tool?",
          answer:
            "Pixelate replaces the details in a selected rectangular area with larger blocks of color. Choose the tool and drag over the area you want to pixelate. The Pixel block size setting controls how large those blocks appear. Larger blocks create a more noticeable pixel effect.",
        },
        {
          question: "What is the Blur tool?",
          answer:
            "Blur softens the details inside a selected rectangular area. Choose Blur and drag over the part of the image you want to soften. The Blur radius setting controls the strength of the effect. A larger radius creates a stronger blur.",
        },
        {
          question: "What does Brush size mean?",
          answer:
            "Brush size controls how thick the freehand brush mark appears. A smaller size is useful for narrow areas, while a larger size covers more space with each stroke. The value is measured in pixels.",
        },
        {
          question: "What is Stroke width?",
          answer:
            "Stroke width controls the thickness of the outline around supported shapes. It also controls the width of the Line and Arrow tools. Increase it for a thicker mark or reduce it for a thinner line.",
        },
        {
          question: "What does Font size change?",
          answer:
            "Font size controls how large your text label appears on the image. Increase it to make the label easier to read or reduce it when you need a smaller label.",
        },
        {
          question: "What is Pixel block size?",
          answer:
            "Pixel block size controls how large the color blocks appear in a pixelated area. A small value creates smaller blocks, while a larger value creates bigger blocks and a more noticeable pixelated effect.",
        },
        {
          question: "What does Blur radius mean?",
          answer:
            "Blur radius controls how strongly the selected area is softened. A low value produces a lighter blur, while a higher value produces a stronger effect. Always inspect the result before sharing the image.",
        },
        {
          question: "What are the Quick colors presets?",
          answer:
            "Quick colors let you choose a mask color without opening the custom color picker. The available choices are Solid black, Dark gray, White and Red stamp. Select the color that works best for the area you are editing.",
        },
        {
          question: "Can I choose my own mask color?",
          answer:
            "Yes. Open the Appearance tab and use the Mask color picker to select a custom color. The selected color is used for new masks and text labels.",
        },
        {
          question: "What does Opacity mean?",
          answer:
            "Opacity controls how solid or transparent a mask looks. At 100%, the mask is fully opaque. At lower values, some of the original image can show through. If you are hiding private information, use 100% opacity and check that the original details cannot be seen.",
        },
        {
          question: "What does the Filled setting do?",
          answer:
            "Filled controls whether a supported shape has a solid color inside it. Turn it on to cover the full shape. Turn it off if you only want an outline, provided the Outline setting is enabled.",
        },
        {
          question: "What does the Outline setting do?",
          answer:
            "Outline adds a visible edge around supported shapes. You can use it with Filled to show both the solid inside and the outline, or turn off Filled to show only the outline. The stroke width controls how thick the edge appears.",
        },
        {
          question: "What is Soft shadow?",
          answer:
            "Soft shadow adds a light shadow around supported brush and shape masks. It is a visual effect that can help a mark stand out from the background. It is not needed for normal privacy redaction.",
        },
        {
          question: "Can I undo or redo an edit?",
          answer:
            "Yes. Use Undo to reverse a recent editing action and Redo to bring it back. You can also use Ctrl+Z to undo and Ctrl+Shift+Z or Ctrl+Y to redo on supported keyboards. The tool keeps a limited history of up to 30 snapshots.",
        },
        {
          question: "Can I delete a mask after drawing it?",
          answer:
            "Yes. Select the Select tool, click the mask you want to remove and choose Delete mask. You can also press Delete or Backspace when a mask is selected. Clear all removes every mask from the current image.",
        },
        {
          question: "How do I zoom in or out?",
          answer:
            "Use the plus and minus buttons above the canvas to change the zoom level. You can also hold Ctrl or Command while scrolling with your mouse or trackpad. The Fit button resets the view to 100% zoom and returns the image to its starting position.",
        },
        {
          question: "How do I move around the image?",
          answer:
            "Hold Alt and drag with the left mouse button, or use the middle mouse button and drag. This moves the canvas view without drawing a new mask. It can help when you are working on a zoomed-in image.",
        },
        {
          question: "What image formats can I export?",
          answer:
            "You can export the edited image as PNG, JPG or WebP. PNG is a good choice when you want a lossless image export. JPG is useful when you want a smaller photo file. WebP is another modern image format that can provide a smaller file size.",
        },
        {
          question: "What does the Quality setting do?",
          answer:
            "The Quality setting is available when you choose JPG or WebP. It controls the export quality, with a higher value generally preserving more image detail and creating a larger file. PNG does not use this quality setting because it is exported as a lossless format.",
        },
        {
          question: "Can I change the exported filename?",
          answer:
            "Yes. Enter the name you want in the Filename field before downloading. The selected export format determines the file extension. The tool adds a safe filename and uses the selected format when saving the image.",
        },
        {
          question: "Does this tool remove image metadata?",
          answer:
            "The tool is designed to edit and export the visible image. It does not provide a separate metadata removal or inspection feature. If your image contains sensitive metadata, such as location or camera information, use a dedicated metadata removal tool before sharing it.",
        },
        {
          question: "Is blur or pixelation enough to protect private information?",
          answer:
            "Not always. Blur and pixelation can make information harder to read, but some details may still be recognizable or recoverable. For important private information, use a fully opaque solid mask that completely covers the content. Review the exported image at full size before sharing it.",
        },
        {
          question: "Can I redact a PDF or Word document?",
          answer:
            "This tool works with images that your browser can open. It does not directly edit PDF or Word files. If you have a scanned document or a screenshot saved as an image, you can open that image here and cover the visible information.",
        },
        {
          question: "Does the tool save my editing project automatically?",
          answer:
            "No. The tool does not provide cloud storage or an account-based project history. Download your edited image before leaving or resetting the page. Your editing history is kept only while the current page session is active.",
        },
        {
          question: "What happens when I click Reset?",
          answer:
            "Reset clears the current image and its masks, restores the default tool settings and returns the workspace to its starting state. Download your edited image before resetting if you want to keep a copy.",
        },
        {
          question: "Why is the download button disabled?",
          answer:
            "You need to choose an image and wait for it to load successfully before downloading. Once the image is ready, the download button becomes available.",
        },
        {
          question: "Can I use this image redactor on a phone?",
          answer:
            "The interface is designed to work in a browser, but drawing and selecting small areas is usually easier with a mouse or trackpad on a desktop. Touchscreen behavior may depend on your device and browser.",
        },
      ]}

      note="Important privacy tip: For sensitive information, use a fully opaque solid mask and cover the entire detail, including surrounding characters when needed. Blur and pixelation may not provide strong protection. Always inspect the exported image at full size before sharing it. This tool edits visible image content but does not separately remove image metadata."
    />
  );
}
