
import type { Metadata } from "next";
import WordMemoryTest from "./WordMemoryTest";

export const metadata: Metadata = {
  title: "Word Memory Test – Free Online Word Memory Game | ToolsAB",
  description:
    "Play this free Word Memory Test online. Memorize a list of words, identify the original words, and challenge yourself with increasing difficulty levels.",
  keywords: [
    "word memory test",
    "word memory game",
    "word memorization test",
    "online memory game",
    "memory training game",
    "word recall test",
    "brain memory game",
    "free memory test",
  ],
  alternates: {
    canonical: "/tools/word-memory-test",
  },
  openGraph: {
    title: "Word Memory Test – Free Online Memory Game",
    description:
      "How many words can you remember? Play this free word memory game and test your ability to recognize words after they disappear.",
    url: "/tools/word-memory-test",
    siteName: "ToolsAB",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Word Memory Test | ToolsAB",
    description:
      "Memorize words, recognize the original list, and challenge yourself with this free online memory game.",
  },
};

const faqs = [
  {
    question: "What is a Word Memory Test?",
    answer:
      "A Word Memory Test is a simple memory game in which you study a list of words and then try to recognize the original words from a larger selection. It challenges your ability to remember and recognize written information.",
  },
  {
    question: "How do I play this Word Memory Game?",
    answer:
      "Start the game and memorize the words displayed on the screen. When the words disappear, select the original words from the available choices. Select the complete original list and submit your answer to advance.",
  },
  {
    question: "How many words do I need to remember?",
    answer:
      "The number depends on your difficulty level and progress. Easy starts with three words, Medium starts with four, and Hard starts with five. The number of words increases as you advance through the game.",
  },
  {
    question: "How much time do I get to memorize the words?",
    answer:
      "The memorization time depends on the selected difficulty. Easy gives you six seconds, Medium gives you five seconds, and Hard gives you four seconds to study the list.",
  },
  {
    question: "What happens if I choose the wrong words?",
    answer:
      "An incorrect selection costs one life. If you still have lives remaining, the original word list is shown again so you can try the same round once more. The game ends after all three lives are used.",
  },
  {
    question: "How is the score calculated?",
    answer:
      "Each correctly completed round earns points using the formula 10 plus twice the current level. For example, completing level one earns 12 points, while completing level five earns 20 points.",
  },
  {
    question: "Does the game save my best score?",
    answer:
      "Yes. Your personal best score is saved in your browser using local storage. It is associated with the browser and device you use, not an online account.",
  },
  {
    question: "Can I play the Word Memory Test on a mobile phone?",
    answer:
      "Yes. The game layout adapts to smaller screens, and you can select words by tapping the options on your phone or tablet.",
  },
  {
    question: "Is this a medical memory assessment?",
    answer:
      "No. This is an informal word recognition game intended for entertainment and practice. It is not a standardized cognitive assessment or a medical test.",
  },
  {
    question: "How can I get better at remembering words?",
    answer:
      "Try grouping related words, creating a mental picture for each word, and repeating the list silently. Focus on the complete list rather than rushing through individual words.",
  },
];

export default function WordMemoryTestPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <WordMemoryTest />

      <article className="mx-auto mt-14 max-w-4xl space-y-10 text-slate-700">
        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            What Is a Word Memory Test?
          </h2>
          <p className="leading-7">
            A Word Memory Test is an interactive exercise that challenges you
            to remember written words after a short viewing period. You first
            study a list of words and then identify those same words from a
            selection containing both original words and new alternatives.
          </p>
          <p className="mt-3 leading-7">
            Unlike a simple word matching activity, this game asks you to
            recognize the complete original list. As you progress, the number
            of words increases, making each round more challenging.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            How to Play the Word Memory Game
          </h2>
          <ol className="list-decimal space-y-2 pl-6 leading-7">
            <li>Choose Easy, Medium, or Hard difficulty.</li>
            <li>Start the game to display your first list of words.</li>
            <li>Read and memorize every word before the timer ends.</li>
            <li>Wait for the original list to disappear.</li>
            <li>Select the words you remember from the available choices.</li>
            <li>Select exactly the same number of words as the original list.</li>
            <li>Submit your answer to check whether you remembered them all.</li>
          </ol>
          <p className="mt-3 leading-7">
            A correct answer earns points and takes you to the next level. An
            incorrect answer uses one life, and the same round is presented
            again if you have lives remaining.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            Choose Your Difficulty Level
          </h2>
          <p className="mb-4 leading-7">
            The game offers three difficulty levels. Each level starts with a
            different number of words and a different memorization period.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[380px] border-collapse text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-900">
                    Difficulty
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-900">
                    Starting words
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-900">
                    Memorization time
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">Easy</td>
                  <td className="px-4 py-3">3 words</td>
                  <td className="px-4 py-3">6 seconds</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">Medium</td>
                  <td className="px-4 py-3">4 words</td>
                  <td className="px-4 py-3">5 seconds</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">Hard</td>
                  <td className="px-4 py-3">5 words</td>
                  <td className="px-4 py-3">4 seconds</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 leading-7">
            Every two successful levels add another word to the list, until
            the maximum word count for the selected difficulty is reached.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            How the Word Memory Score Works
          </h2>
          <p className="leading-7">
            You earn points by correctly identifying every word in the
            original list. The points awarded increase with your current
            level.
          </p>
          <div className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-sm font-semibold text-slate-500">
              POINTS PER COMPLETED ROUND
            </p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              10 + (Current Level × 2)
            </p>
          </div>
          <p className="leading-7">
            For example, completing level one earns 12 points. Completing
            level five earns 20 points. An incorrect answer does not award
            points and costs one life.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            Tips for Remembering Words
          </h2>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>
              <strong>Group related words:</strong> Try creating small
              categories for words that have something in common.
            </li>
            <li>
              <strong>Create mental pictures:</strong> Imagine a visual
              representation of each word to make it easier to recall.
            </li>
            <li>
              <strong>Repeat the list silently:</strong> Briefly repeat the
              words in your mind while they are displayed.
            </li>
            <li>
              <strong>Pay attention to every word:</strong> Avoid focusing
              only on the first or last words in the list.
            </li>
            <li>
              <strong>Take your time when selecting:</strong> Review your
              choices before submitting your answer.
            </li>
            <li>
              <strong>Practise regularly:</strong> Repeat the game and observe
              how your scores change across sessions.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-5 text-2xl font-bold tracking-tight text-slate-900">
            Frequently Asked Questions
          </h2>
          <div className="space-y-5">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="border-b border-slate-200 pb-5"
              >
                <h3 className="mb-2 text-base font-semibold text-slate-900">
                  {faq.question}
                </h3>
                <p className="leading-7">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <h2 className="mb-2 text-xl font-bold text-slate-900">
            Explore More Free Brain Games
          </h2>
          <p className="leading-7">
            Try other interactive challenges on ToolsAB, including the
            Visual Memory Test, Sequence Memory Test, Number Memory Test,
            Reaction Speed Test, and Typing Speed Test. Each game offers a
            different type of challenge.
          </p>
        </section>
      </article>
    </main>
  );
}
