
import type { Metadata } from "next";
import FocusTest from "./FocusTest";

export const metadata: Metadata = {
  title: "Focus and Concentration Test Online – Free Attention Game | ToolsAB",
  description:
    "Try this free online focus and concentration test. Find matching symbols in timed grids, improve attention to detail, and track your accuracy across three challenge rounds.",
  keywords: [
    "focus test",
    "concentration test",
    "focus and concentration test",
    "attention test online",
    "attention to detail test",
    "concentration game",
    "focus game",
    "visual attention test",
    "free brain games",
  ],
  alternates: {
    canonical: "/tools/focus-test",
  },
  openGraph: {
    title: "Focus and Concentration Test Online | ToolsAB",
    description:
      "Challenge your attention with three timed symbol-search rounds. Find matching symbols, avoid mistakes, and check your score.",
    url: "/tools/focus-test",
    type: "website",
    siteName: "ToolsAB",
  },
  twitter: {
    card: "summary",
    title: "Focus and Concentration Test | ToolsAB",
    description:
      "Play a free timed concentration game and test your attention to detail.",
  },
};

const faqs = [
  {
    question: "What is a focus and concentration test?",
    answer:
      "A focus and concentration test is an activity designed to challenge your ability to pay attention to specific information while ignoring distractions. This game uses visual symbol-search challenges to test attention to detail.",
  },
  {
    question: "How does this concentration test work?",
    answer:
      "The game has three rounds. Each round displays a grid containing a target symbol and similar-looking distractors. Find every matching symbol before the 25-second timer runs out.",
  },
  {
    question: "How many rounds are in this focus test?",
    answer:
      "There are three rounds. The first round uses a 5-by-5 grid, the second uses a 6-by-6 grid, and the final round uses a 7-by-7 grid.",
  },
  {
    question: "How is the focus test score calculated?",
    answer:
      "You earn 10 points for every correct selection and lose 2 points for every incorrect selection. The final score cannot go below zero.",
  },
  {
    question: "What does accuracy mean in this game?",
    answer:
      "Accuracy is calculated by dividing correct selections by the total number of selections, including incorrect ones, and multiplying by 100. It reflects your accuracy within this game, not a clinical measurement.",
  },
  {
    question: "Can I improve my concentration with this game?",
    answer:
      "You can practice visual scanning and attention to detail by replaying the game. However, playing this activity does not guarantee improvements in concentration or treat any attention-related condition.",
  },
  {
    question: "Does this test measure ADHD?",
    answer:
      "No. This is an informal visual attention game, not an ADHD screening or diagnostic assessment. Only a qualified healthcare professional can assess ADHD using appropriate clinical methods.",
  },
  {
    question: "Is this focus test suitable for children?",
    answer:
      "The symbol-search activity is simple to understand, but it is not a standardized assessment for children. Children should use it as a casual game rather than as a measure of their cognitive abilities.",
  },
  {
    question: "Does the focus test work on mobile devices?",
    answer:
      "Yes. The interface adjusts to mobile phones, tablets, and desktop screens. A larger screen may make the symbol grids easier to use.",
  },
  {
    question: "Is the concentration test free?",
    answer:
      "Yes. You can play the test for free without creating an account, installing an application, or connecting to an external service.",
  },
];

export default function FocusTestPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <FocusTest />

      <article className="prose prose-slate mt-12 max-w-none">
        <h2>What Is a Focus and Concentration Test?</h2>
        <p>
          A focus and concentration test is an activity that challenges your
          ability to pay attention to specific information while ignoring
          distractions. Visual attention activities often involve finding
          particular letters, numbers, shapes, or symbols among similar
          alternatives.
        </p>
        <p>
          This free online concentration game uses timed symbol-search
          challenges. You must identify matching symbols in increasingly
          larger grids while avoiding incorrect selections.
        </p>

        <h2>How to Play the Focus Test</h2>
        <ol>
          <li>Start the test to enter the first challenge round.</li>
          <li>Look at the target symbol displayed above the grid.</li>
          <li>Find and select every matching symbol in the grid.</li>
          <li>Avoid selecting symbols that look similar but are different.</li>
          <li>Complete all three rounds to see your final results.</li>
        </ol>

        <h2>Understanding the Three Challenge Rounds</h2>
        <p>
          Each round introduces a larger grid and a different type of symbol.
          Every round has a 25-second time limit.
        </p>

        <div className="not-prose my-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold">Round</th>
                <th className="px-4 py-3 font-semibold">Grid size</th>
                <th className="px-4 py-3 font-semibold">Targets</th>
                <th className="px-4 py-3 font-semibold">Time limit</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200">
                <td className="px-4 py-3">Round 1</td>
                <td className="px-4 py-3">5 × 5</td>
                <td className="px-4 py-3">6</td>
                <td className="px-4 py-3">25 seconds</td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="px-4 py-3">Round 2</td>
                <td className="px-4 py-3">6 × 6</td>
                <td className="px-4 py-3">9</td>
                <td className="px-4 py-3">25 seconds</td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="px-4 py-3">Round 3</td>
                <td className="px-4 py-3">7 × 7</td>
                <td className="px-4 py-3">12</td>
                <td className="px-4 py-3">25 seconds</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>How Is Your Score Calculated?</h2>
        <p>
          The game uses a straightforward scoring system that rewards correct
          selections and deducts points for mistakes.
        </p>

        <ul>
          <li>Correct selection: +10 points</li>
          <li>Incorrect selection: −2 points</li>
          <li>Minimum final score: 0 points</li>
        </ul>

        <p>
          Your accuracy is calculated using the following formula:
        </p>

        <div className="not-prose my-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="font-semibold text-slate-800">
            Accuracy = (Correct Selections ÷ Total Selections) × 100
          </p>
        </div>

        <p>
          The game also displays your best score, which is saved locally in
          your browser when local storage is available.
        </p>

        <h2>Practical Tips for the Challenge</h2>
        <ul>
          <li>Read the target symbol carefully before selecting anything.</li>
          <li>Scan the grid systematically instead of jumping randomly.</li>
          <li>Pay attention to similar-looking distractor symbols.</li>
          <li>Try to balance speed with accuracy.</li>
          <li>Take a short break if you feel tired or distracted.</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        {faqs.map((faq) => (
          <section key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </section>
        ))}

        <h2>Important Information</h2>
        <p>
          This tool is an informal brain game for entertainment and practice.
          Its score is based only on performance in this particular activity.
          It is not a standardized psychological test, a medical assessment,
          or a diagnostic tool for attention-related conditions.
        </p>
      </article>
    </main>
  );
}
