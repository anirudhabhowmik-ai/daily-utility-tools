
import type { Metadata } from "next";
import ColorBlindnessTest from "./ColorBlindnessTest";

export const metadata: Metadata = {
  title: "Color Blindness Test Online – Free Color Vision Test | ToolsAB",
  description:
    "Try this free online color vision test with 10 Ishihara-inspired color plates. Identify hidden numbers, check your score, and learn about color vision screening.",
  keywords: [
    "color blindness test",
    "color vision test",
    "online color blindness test",
    "Ishihara color test",
    "color vision screening",
    "red green color blindness test",
    "free color vision test",
    "color perception test",
  ],
  alternates: {
    canonical: "/tools/color-blindness-test",
  },
  openGraph: {
    title: "Color Blindness Test Online – Free Color Vision Test",
    description:
      "Try 10 colorful dot patterns and see how many hidden numbers you can identify with this free online color vision activity.",
    url: "/tools/color-blindness-test",
    type: "website",
    siteName: "ToolsAB",
  },
  twitter: {
    card: "summary",
    title: "Color Blindness Test Online | ToolsAB",
    description:
      "Identify numbers hidden in colorful dot patterns with this free online color vision activity.",
  },
};

const faqs = [
  {
    question: "What is a color blindness test?",
    answer:
      "A color vision test checks how a person distinguishes colors. Some screening methods use colored dot patterns containing numbers or shapes that may be difficult for people with certain color vision deficiencies to identify.",
  },
  {
    question: "How does this online color test work?",
    answer:
      "This activity displays 10 original, Ishihara-inspired dot patterns. Look at each pattern, choose the number you see, and receive a score after completing all the plates.",
  },
  {
    question: "What is the Ishihara color test?",
    answer:
      "The Ishihara test is a recognized clinical color vision screening method that uses specially designed colored plates. This website uses original, inspired illustrations and is not an official Ishihara test.",
  },
  {
    question: "Can this test diagnose color blindness?",
    answer:
      "No. This activity is not clinically validated and cannot diagnose, confirm, or rule out color vision deficiency. A qualified eye-care professional can perform appropriate testing.",
  },
  {
    question: "What does a low score mean?",
    answer:
      "A low score only means that you had difficulty identifying some patterns in this particular activity. It does not establish that you have color blindness. Screen quality, brightness, and lighting can affect your answers.",
  },
  {
    question: "What are the common types of color vision deficiency?",
    answer:
      "Common types include protan-related and deutan-related red-green color vision deficiencies, as well as tritan-related blue-yellow deficiency. Their effects vary from person to person.",
  },
  {
    question: "Can color blindness be tested online?",
    answer:
      "Online activities can provide an informal experience, but results depend on the device and display. A professional assessment is more appropriate when accurate results are important.",
  },
  {
    question: "Does this test work on mobile phones?",
    answer:
      "Yes. The interface is responsive and can be used on modern phones, tablets, and desktop browsers. However, different screens may display colors differently.",
  },
  {
    question: "Is the color vision test free?",
    answer:
      "Yes. You can complete the activity for free without creating an account or installing software.",
  },
  {
    question: "Can I improve my color vision score?",
    answer:
      "You can become familiar with the patterns through repeated attempts, but practicing this activity does not treat or correct a color vision deficiency.",
  },
];

export default function ColorBlindnessTestPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <ColorBlindnessTest />

      <article className="prose prose-slate mt-12 max-w-none">
        <h2>What Is a Color Blindness Test?</h2>
        <p>
          A color blindness test is designed to explore how people distinguish
          different colors. Some screening methods use colored dot patterns
          containing numbers or shapes. The patterns are created so that
          differences in color perception may make certain figures harder to
          identify.
        </p>
        <p>
          This free online activity uses original Ishihara-inspired
          illustrations. It provides a simple way to explore color perception,
          but it is not an official Ishihara test or a clinically validated
          screening instrument.
        </p>

        <h2>How to Use This Color Vision Test</h2>
        <ol>
          <li>Open the test in a well-lit room.</li>
          <li>Keep your screen brightness at a comfortable, consistent level.</li>
          <li>Look at the colored dot pattern displayed on the screen.</li>
          <li>Select the number you believe you can see.</li>
          <li>Continue through all 10 plates.</li>
          <li>Review your score and the information provided at the end.</li>
        </ol>

        <h2>Understanding Color Vision Deficiency</h2>
        <p>
          Color vision deficiency affects how a person perceives or
          distinguishes certain colors. It is commonly associated with
          differences in the cone cells of the retina, which help the eyes
          detect color.
        </p>

        <h3>Red-Green Color Vision Deficiency</h3>
        <p>
          Red-green color vision deficiency is a common category. Depending
          on the type, distinguishing certain shades of red, green, brown, and
          orange may be more difficult.
        </p>

        <h3>Blue-Yellow Color Vision Deficiency</h3>
        <p>
          Blue-yellow color vision deficiency is less common. It can affect
          the ability to distinguish some shades of blue and yellow.
        </p>

        <h2>Why Screen Conditions Matter</h2>
        <p>
          Online color activities can be affected by display calibration,
          screen brightness, night mode, blue-light filters, browser settings,
          and ambient lighting. Two devices may display the same color
          differently. This is one reason an online score should not be
          treated as a medical result.
        </p>

        <h2>Frequently Asked Questions</h2>
        {faqs.map((faq) => (
          <section key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </section>
        ))}

        <h2>Important Health Information</h2>
        <p>
          This tool is intended for educational use and informal exploration
          only. It cannot diagnose or rule out color vision deficiency. If
          you have concerns about your color perception, or need an accurate
          assessment for work, education, driving, or another purpose, consult
          a qualified eye-care professional.
        </p>
      </article>
    </main>
  );
}
