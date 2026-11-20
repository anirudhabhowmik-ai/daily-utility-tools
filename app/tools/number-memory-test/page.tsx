
import type { Metadata } from "next";
import NumberMemoryTest from "./NumberMemoryTest";

export const metadata: Metadata = {
  title: "Number Memory Test - Test and Improve Your Memory",
  description:
    "Play the free Number Memory Test online. Memorize numbers, challenge yourself with increasing difficulty, improve your memory, and beat your best score.",
  alternates: {
    canonical: "/tools/number-memory-test",
  },
  openGraph: {
    title: "Number Memory Test - Free Online Brain Game",
    description:
      "How many digits can you remember? Play this free number memory game and challenge your brain.",
    url: "/tools/number-memory-test",
    type: "website",
  },
};

export default function NumberMemoryTestPage() {
  return (
    <>
      <NumberMemoryTest />
    </>
  );
}
