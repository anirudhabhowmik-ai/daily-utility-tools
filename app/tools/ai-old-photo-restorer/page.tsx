
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import AiOldPhotoRestorer from "./ai-old-photo-restorer";

export const metadata: Metadata = {
  title: "Free AI Old Photo Enhancer | Improve Old Photos Online | ToolsAB",
  description:
    "Enhance old and low-resolution photos online with AI. Upload a JPG, PNG or WebP image and improve its resolution directly in your browser. No paid API required.",
  alternates: {
    canonical: "/tools/ai-old-photo-restorer",
  },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<AiOldPhotoRestorer />}
      title="AI Old Photo Restorer"
      summary="Give your old photographs a new life. Upload an old, blurry or low-resolution image and use AI-powered image enhancement to improve its resolution. Processing runs in your browser, so your photo does not need to be uploaded to an AI processing server."
      highlights={[
        "AI-powered image super-resolution using a browser-compatible model.",
        "No paid AI API or per-image server processing charge.",
        "Upload JPG, JPEG, PNG and WebP images.",
        "Preview the original and enhanced photographs side by side.",
        "Download your enhanced result directly to your device.",
        "Your uploaded photo is processed locally in your browser.",
        "No account or registration required.",
      ]}
      steps={[
        "Open the AI Old Photo Restorer on ToolsAB.",
        "Select an old or low-resolution photograph from your computer or mobile device.",
        "Wait for the original photograph to appear in the preview area.",
        "Click the Enhance Photo with AI button to start processing.",
        "On the first use, the browser downloads the AI model. This may take some time depending on your internet connection.",
        "Once the model is ready, it processes your photograph using your device.",
        "Compare the original photograph with the enhanced result.",
        "Click Download Enhanced Photo to save the result to your device.",
      ]}
      faqs={[
        {
          question: "Is this AI photo enhancer free?",
          answer:
            "Yes. The current version is free to use and does not require a paid AI API. Your device performs the AI processing in the browser.",
        },
        {
          question: "Do I need to create an account?",
          answer:
            "No. You can upload and enhance a photograph without creating an account.",
        },
        {
          question: "Are my photographs uploaded to a server?",
          answer:
            "The current AI processing runs in your browser. The selected photograph is processed locally rather than being sent to an AI processing server. The AI model itself is downloaded from its model host when needed.",
        },
        {
          question: "Can this tool colorize black-and-white photographs?",
          answer:
            "Not yet. The current version uses an AI super-resolution model to improve image resolution. Black-and-white photo colorization will require a separate compatible AI model.",
        },
        {
          question: "Can it repair scratches and damaged faces?",
          answer:
            "The current version does not remove scratches or repair damaged faces. Those features require additional image restoration models.",
        },
        {
          question: "Why does the first enhancement take longer?",
          answer:
            "The AI model needs to be downloaded into your browser the first time you use it. The download can take some time, depending on your internet connection and the model size. Subsequent uses may be faster if the browser cache is available.",
        },
        {
          question: "Does it work on mobile phones?",
          answer:
            "It may work on modern mobile browsers, but performance depends on the phone's memory, processor and browser support. Larger photographs may take longer to process.",
        },
        {
          question: "Will AI restore every detail in an old photograph?",
          answer:
            "No. AI enhancement can improve image resolution, but it cannot guarantee recovery of details that are completely missing from the original photograph.",
        },
      ]}
      note="The current version focuses on AI super-resolution. Colorization, scratch removal, face restoration and advanced photo repair are separate features that can be added after testing compatible browser-based models."
    />
  );
}
