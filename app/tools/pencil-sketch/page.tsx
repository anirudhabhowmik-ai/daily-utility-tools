
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import PencilSketchTool from "./PencilSketchTool";

export const metadata: Metadata = {
  title: "Free Pencil Sketch Maker Online – Turn Photos into Drawings | ToolsAB",
  description:
    "Turn your favourite photos into pencil sketches online for free. Upload a picture, create a realistic pencil-style drawing, adjust the effect and download your artwork without installing software.",
  alternates: {
    canonical: "/tools/pencil-sketch",
  },
  openGraph: {
    title: "Free Online Pencil Sketch Maker | ToolsAB",
    description:
      "Convert ordinary photos into beautiful pencil-style drawings. Customize the sketch effect and download your result for free.",
    url: "/tools/pencil-sketch",
    type: "website",
  },
};

export default function PencilSketchPage() {
  return (
    <ToolLandingPage
      toolContent={<PencilSketchTool />}

      title="Free Online Pencil Sketch Maker"

      summary="Have you ever looked at a photograph and wondered how it would look as a hand-drawn pencil portrait? Our free Pencil Sketch Maker lets you create that artistic effect in just a few clicks. Upload a photo from your phone or computer, and the tool will transform it into a black-and-white pencil-style drawing directly in your browser. You can adjust the sketch intensity, compare the result with your original picture and download your finished artwork as a PNG image. No design experience, expensive software or account registration is required."

      highlights={[
        "Turn ordinary photographs into pencil-style drawings without complicated editing software.",
        "Create black-and-white artistic effects from portraits, family pictures, pet photos, landscapes and everyday images.",
        "Adjust the sketch intensity to make your drawing look softer or more pronounced.",
        "Compare your original photograph with the converted pencil sketch before downloading.",
        "Download your finished artwork as a PNG image that you can save, share or use in your creative projects.",
        "Process images directly in your browser without sending your photographs to our server.",
        "Use the tool on desktop computers, laptops, tablets and compatible mobile browsers.",
        "No account, registration, software installation or AI subscription is needed."
      ]}

      steps={[
        "Choose a photograph: Click the Choose Photo button and select an image from your device. You can use a portrait, a picture of your family, a pet photograph or even a landscape.",
        "Let the tool process your image: After selecting your photograph, the tool automatically applies a pencil-sketch effect. Processing happens inside your browser, so you do not need to upload your image to an external editing service.",
        "Adjust the sketch intensity: Use the intensity slider to control the appearance of the drawing. Move it towards the subtle side for a softer effect or towards the strong side for a more noticeable pencil-style appearance.",
        "Compare both versions: Look at the original photograph and the finished sketch side by side. This makes it easier to decide whether you like the result.",
        "Download your artwork: Once you are happy with the result, click Download Pencil Sketch. Your finished image will be saved as a PNG file on your device.",
        "Try another photograph: Want to create another drawing? Select Upload Another Photo and repeat the process with a different image."
      ]}

      faqs={[
        {
          question: "What is a pencil sketch maker?",
          answer:
            "A pencil sketch maker is an image-editing tool that transforms a regular photograph into an image that looks like a pencil drawing. It creates a monochrome artistic effect by processing the tones, brightness and details in the original picture. You can use it to give portraits, pet photographs, landscapes and other pictures a hand-drawn appearance."
        },
        {
          question: "How can I convert a photo into a pencil sketch online?",
          answer:
            "Open the Pencil Sketch Maker on ToolsAB, select a photograph from your device and wait for the conversion to finish. The tool automatically creates a pencil-style version of your image. You can then adjust the sketch intensity and download the finished result as a PNG file. There is no need to install an application."
        },
        {
          question: "Is the Pencil Sketch Maker completely free?",
          answer:
            "Yes. You can use this tool to convert photographs into pencil-style drawings without paying for an image conversion or creating an account. You can upload a supported image, adjust the effect and download the result for free."
        },
        {
          question: "Does this tool use artificial intelligence?",
          answer:
            "No. The current version uses a traditional image-processing technique rather than a generative AI model. It converts the image into grayscale, applies a blur effect and uses a blending technique to create the pencil-style appearance. It does not use an external AI API."
        },
        {
          question: "Will the result look exactly like a real hand-drawn pencil portrait?",
          answer:
            "The tool creates a pencil-style effect, but it cannot guarantee the appearance of artwork drawn by a professional artist. The result depends on the original photograph, including its lighting, contrast, sharpness and details. Some photographs produce a more natural sketch effect than others."
        },
        {
          question: "Can I turn my selfie into a pencil drawing?",
          answer:
            "Yes. You can upload a selfie or portrait photograph and convert it into a black-and-white pencil-style image. Clear photographs with good lighting and visible facial details generally produce more pleasing results."
        },
        {
          question: "Can I convert a pet photo into a pencil sketch?",
          answer:
            "Yes. You can use photographs of dogs, cats, birds and other pets. The tool applies the same pencil-style effect to pet photographs as it does to portraits and other images."
        },
        {
          question: "Can I adjust how strong the pencil effect looks?",
          answer:
            "Yes. After uploading a photograph, use the Sketch Intensity slider. A lower setting creates a more subtle effect, while a higher setting makes the pencil-style appearance more prominent. You can experiment with different settings until you find a result you like."
        },
        {
          question: "Which image formats can I upload?",
          answer:
            "The current tool supports JPG, JPEG, PNG and WebP images. The maximum supported file size is 15 MB per image."
        },
        {
          question: "Can I download my pencil sketch?",
          answer:
            "Yes. Once the conversion is complete, click the Download Pencil Sketch button. Your converted image will be downloaded in PNG format, which is suitable for sharing, printing and further editing."
        },
        {
          question: "Are my uploaded photographs stored on ToolsAB?",
          answer:
            "No. The current version processes your photograph locally in your browser. It does not send your image to the ToolsAB server for conversion. Your original photograph is not uploaded to our image-processing server."
        },
        {
          question: "Does this tool work on mobile phones?",
          answer:
            "Yes. You can open the tool in a compatible mobile browser and select a photograph from your phone. The processing takes place on your device, so the speed may depend on your phone's performance and the size of the photograph."
        },
        {
          question: "Why does my pencil sketch look different from another photograph?",
          answer:
            "Every photograph has different lighting, shadows, contrast and image details. These differences affect how the pencil-sketch effect appears. A clear, well-lit image with visible details will often produce a better result than a very dark, blurry or heavily compressed photograph."
        },
        {
          question: "Can I use the converted sketch for printing?",
          answer:
            "You can download the result as a PNG image and use it in personal creative projects or print it. However, the output resolution is limited by the image-processing size used by the tool, so check the image dimensions before printing at a large size."
        }
      ]}

      note="The Pencil Sketch Maker uses a traditional image-processing technique to create a pencil-style drawing. It does not use generative AI, restore missing image details or reproduce the exact strokes of a human artist. For the best results, start with a clear photograph that has good lighting and visible details. Images are processed locally in your browser, and processing speed depends on your device."
    />
  );
}
