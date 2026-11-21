
import type { Metadata } from "next";
import MentalMathChallenge from "./MentalMathChallenge";

export const metadata: Metadata = {
  title: "Mental Math Challenge – Free Online Math Game | ToolsAB",
  description:
    "Play the free Mental Math Challenge online. Solve addition, subtraction, multiplication, and division questions in 60 seconds. Choose easy, medium, or hard and track your score.",
  keywords: [
    "mental math challenge",
    "mental math game",
    "online math challenge",
    "math speed test",
    "mental arithmetic test",
    "quick math game",
    "math practice online",
    "addition and subtraction game",
    "multiplication practice game",
    "division practice",
    "free math games",
  ],
  alternates: {
    canonical: "/tools/mental-math-challenge",
  },
  openGraph: {
    title: "Mental Math Challenge – Free Online Math Game",
    description:
      "How many math questions can you solve in 60 seconds? Challenge yourself with three difficulty levels and track your personal best.",
    url: "/tools/mental-math-challenge",
    type: "website",
    siteName: "ToolsAB",
  },
  twitter: {
    card: "summary",
    title: "Mental Math Challenge | ToolsAB",
    description:
      "Practice quick mental arithmetic with this free 60-second online math challenge.",
  },
};

const faqs = [
  {
    question: "What is a mental math challenge?",
    answer:
      "A mental math challenge is an activity that involves solving arithmetic problems without relying on a calculator. It can include addition, subtraction, multiplication, and division questions.",
  },
  {
    question: "How does this online mental math game work?",
    answer:
      "Choose a difficulty level and start the 60-second challenge. The game generates arithmetic questions, and you enter your answer to receive points for correct responses.",
  },
  {
    question: "How long does each challenge last?",
    answer:
      "Each game lasts 60 seconds. You can answer as many questions as possible before the timer reaches zero.",
  },
  {
    question: "What difficulty levels are available?",
    answer:
      "Easy includes addition and subtraction with smaller numbers. Medium introduces multiplication and division. Hard uses larger numbers and more challenging multiplication and division problems.",
  },
  {
    question: "How is the mental math score calculated?",
    answer:
      "Each correct answer earns 10 points, while each incorrect answer deducts 2 points. The score cannot fall below zero.",
  },
  {
    question: "Are division questions always whole numbers?",
    answer:
      "Yes. The game generates division questions using a dividend that is an exact multiple of the divisor, so every division answer is a whole number.",
  },
  {
    question: "Can I use a calculator?",
    answer:
      "You can use a calculator if you want, but the activity is designed for mental arithmetic practice. Try solving the questions in your head for a more challenging experience.",
  },
  {
    question: "Does the game save my best score?",
    answer:
      "Yes. The game saves your best score separately for each difficulty level using your browser's local storage. The score is stored on your device rather than on a server.",
  },
  {
    question: "Can children use this mental math game?",
    answer:
      "The easy difficulty may be suitable for basic arithmetic practice, depending on the learner's age and math experience. It is a casual practice game, not a formal educational assessment.",
  },
  {
    question: "Is the mental math challenge free?",
    answer:
      "Yes. The game is free to use and does not require an account, installation, or external API.",
  },
];

export default function MentalMathChallengePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <MentalMathChallenge />

      <article className="prose prose-slate mt-12 max-w-none">
        <h2>What Is a Mental Math Challenge?</h2>
        <p>
          Mental math is the process of solving mathematical problems in your
          head without depending on a calculator or written calculations. It
          involves using number relationships, arithmetic operations, and
          calculation strategies to find answers.
        </p>
        <p>
          This free online mental math challenge gives you 60 seconds to solve
          as many randomly generated arithmetic questions as possible. You
          can choose from three difficulty levels and track your score after
          every attempt.
        </p>

        <h2>How to Play the Mental Math Game</h2>
        <ol>
          <li>Choose Easy, Medium, or Hard difficulty.</li>
          <li>Start the 60-second timer.</li>
          <li>Read the arithmetic question displayed on the screen.</li>
          <li>Enter your answer and submit it.</li>
          <li>Review the feedback and move to the next question.</li>
          <li>Check your final score when the timer ends.</li>
        </ol>

        <h2>Available Difficulty Levels</h2>
        <div className="not-prose my-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[430px] text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold">Difficulty</th>
                <th className="px-4 py-3 font-semibold">Operations</th>
                <th className="px-4 py-3 font-semibold">Question style</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200">
                <td className="px-4 py-3">Easy</td>
                <td className="px-4 py-3">Addition, subtraction</td>
                <td className="px-4 py-3">Smaller numbers</td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="px-4 py-3">Medium</td>
                <td className="px-4 py-3">All four operations</td>
                <td className="px-4 py-3">Moderate numbers</td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="px-4 py-3">Hard</td>
                <td className="px-4 py-3">All four operations</td>
                <td className="px-4 py-3">Larger and more challenging numbers</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>How the Scoring System Works</h2>
        <p>
          The challenge rewards correct answers and deducts a small number of
          points for incorrect responses.
        </p>
        <ul>
          <li>Correct answer: +10 points</li>
          <li>Incorrect answer: −2 points</li>
          <li>Minimum score: 0 points</li>
        </ul>

        <p>
          Your accuracy is calculated using the following formula:
        </p>
        <div className="not-prose my-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="font-semibold text-slate-800">
            Accuracy = (Correct Answers ÷ Total Answers) × 100
          </p>
        </div>

        <h2>Tips for Practicing Mental Arithmetic</h2>
        <ul>
          <li>Start with smaller calculations and gradually increase difficulty.</li>
          <li>Break larger addition problems into smaller parts.</li>
          <li>Use multiplication facts to solve related division questions.</li>
          <li>Check the sign and operation before entering an answer.</li>
          <li>Focus on accuracy before trying to increase your speed.</li>
          <li>Practice regularly without putting unnecessary pressure on yourself.</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        {faqs.map((faq) => (
          <section key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </section>
        ))}

        <h2>Practice at Your Own Pace</h2>
        <p>
          Mental Math Challenge is a casual arithmetic practice game for
          people who want to work with numbers in a quick, interactive format.
          Its scores reflect performance in this game and should not be
          treated as a measure of intelligence or mathematical ability.
        </p>
      </article>
    </main>
  );
}
