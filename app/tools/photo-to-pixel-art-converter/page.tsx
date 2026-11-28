
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import PhotoToPixelArt from "./PhotoToPixelArt";

export const metadata: Metadata = {
  title: "Photo to Pixel Art Converter – Free Online Pixel Art Maker | ToolsAB",
  description:
    "Turn photos into pixel art online for free. Choose retro palettes, adjust pixel size, apply dithering and download high-quality PNG images. No upload required.",
  alternates: {
    canonical: "/tools/photo-to-pixel-art",
  },
};

export default function PhotoToPixelArtPage() {
  return (
    <ToolLandingPage
      toolContent={<PhotoToPixelArt />}
      title="Photo to Pixel Art Converter"
      summary="Transform ordinary photos into retro-inspired pixel art directly in your browser. Choose from classic gaming palettes, adjust pixel size, experiment with dithering and export your finished artwork as a PNG."
      highlights={[
        "Convert photos into pixel art without uploading them to a server.",
        "Choose from Retro, PICO-8, Game Boy, Commodore 64, CGA and other palettes.",
        "Adjust pixel size, brightness, contrast and saturation.",
        "Use Floyd–Steinberg or Bayer dithering for different retro effects.",
        "Compare your original photo with the pixel-art result.",
        "Download your artwork as a PNG at different sizes.",
      ]}
      steps={[
        "Upload a JPG, PNG, WebP or another image format supported by your browser.",
        "Choose a pixel size and select Smooth or Sharp sampling.",
        "Pick a colour palette or try one of the quick styles.",
        "Adjust dithering, brightness, contrast and saturation until you like the result.",
        "Compare the original and converted image using the preview slider.",
        "Choose an export size and download your pixel art as a PNG.",
      ]}
      faqs={[
        {
          question: "Is this photo to pixel art converter free?",
          answer:
            "Yes. You can use the converter and its available editing features without creating an account or paying for a subscription.",
        },
        {
          question: "Are my photos uploaded to a server?",
          answer:
            "No. Image processing takes place in your browser. The tool does not send your selected image to a ToolsAB image-processing server.",
        },
        {
          question: "What image formats can I use?",
          answer:
            "You can select image formats supported by your browser, including common formats such as JPG, PNG and WebP. The maximum file size is 15 MB.",
        },
        {
          question: "What is pixel size?",
          answer:
            "Pixel size controls how many pixels are used to represent the original image. Larger values create a chunkier, more retro appearance, while smaller values preserve more detail.",
        },
        {
          question: "What does dithering do?",
          answer:
            "Dithering arranges available palette colours in patterns to create the appearance of extra shades. Floyd–Steinberg diffusion spreads colour errors between nearby pixels, while Bayer dithering uses a repeating ordered pattern.",
        },
        {
          question: "Can I use a Game Boy or PICO-8 palette?",
          answer:
            "Yes. Select Game Boy for a four-shade green appearance or PICO-8 for a colourful fantasy-console-inspired result.",
        },
        {
          question: "Can I download a high-resolution pixel art image?",
          answer:
            "Yes. You can export at the original photo dimensions or choose a pixel-art enlargement such as 1×, 2×, 4×, 8× or 16×. Export dimensions are limited to protect browser memory.",
        },
        {
          question: "Does the tool work on mobile devices?",
          answer:
            "It works in modern mobile browsers that support the required image and canvas features. Very large images may take longer to process on phones and tablets.",
        },
      ]}
      note="Image processing happens locally in your browser. Very large images or high-resolution exports may use significant device memory, so performance can vary between devices."
    />
  );
}
