
import type { Metadata } from "next";
import SequenceMemoryTest from "./SequenceMemoryTest";

export const metadata: Metadata = {
  title: "Sequence Memory Test – Free Online Sequence Game | ToolsAB",
  description:
    "Test your sequence memory with this free online brain game. Watch the tiles light up, repeat the pattern in order, and challenge yourself across easy, medium, and hard levels.",
  keywords: [
    "sequence memory test",
    "sequence memory game",
    "online memory game",
    "pattern memory test",
    "number sequence memory game",
    "brain training game",
    "free sequence game",
    "memory challenge",
  ],
  alternates: {
    canonical: "/tools/sequence-memory-test",
  },
  openGraph: {
    title: "Sequence Memory Test – Free Online Brain Game",
    description:
      "How long can you remember a growing sequence? Play this free online sequence memory game and challenge yourself.",
    url: "/tools/sequence-memory-test",
    siteName: "ToolsAB",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Sequence Memory Test | ToolsAB",
    description:
      "Watch, remember, and repeat. Challenge your sequence memory with this free online game.",
  },
};

const faqs = [
  {
    question: "What is a sequence memory test?",
    answer:
      "A sequence memory test is a game in which you observe a series of visual signals and try to reproduce them in the same order. As the game progresses, the sequence becomes longer and more challenging to remember.",
  },
  {
    question: "How do I play the Sequence Memory Test?",
    answer:
      "Choose a difficulty and start the game. Watch the tiles light up one after another. When the playback finishes, click the tiles in exactly the same order. Complete the sequence to advance to the next round.",
  },
  {
    question: "Does the sequence get longer?",
    answer:
      "Yes. Every time you correctly repeat a sequence, the game adds one new tile. You must remember the previous steps as well as the new one.",
  },
  {
    question: "What are the different difficulty levels?",
    answer:
      "Easy uses a 3 by 3 board, Medium uses a 4 by 4 board, and Hard uses a 5 by 5 board. The available board size changes the number of possible tiles in each game.",
  },
  {
    question: "How is the score calculated?",
    answer:
      "You earn points when you complete a round successfully. The points for each completed round are calculated as 10 plus twice the current level. Your score increases as you progress.",
  },
  {
    question: "What happens if I select the wrong tile?",
    answer:
      "A wrong selection costs one life. If you still have lives remaining, the game plays the same sequence again so you can retry. The game ends when all three lives are used.",
  },
  {
    question: "Is my best score saved?",
    answer:
      "Yes. Your personal best is saved in your browser using local storage. It stays on the same browser and device unless you clear the site's stored data or use a different browser.",
  },
  {
    question: "Can I play the game on a mobile phone?",
    answer:
      "Yes. The game board and controls are designed to adapt to smaller screens. You can tap the tiles on a phone or tablet, or use a mouse on a computer.",
  },
  {
    question: "Does this game measure intelligence or diagnose memory problems?",
    answer:
      "No. This is an informal memory exercise for entertainment and practice. It is not a standardized cognitive assessment, intelligence test, or medical diagnostic tool.",
  },
];

export default function SequenceMemoryTestPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <SequenceMemoryTest />

      <article className="mx-auto mt-14 max-w-4xl space-y-10 text-slate-700">
        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            What Is a Sequence Memory Test?
          </h2>
          <p className="leading-7">
            A sequence memory test is a simple interactive exercise that
            challenges you to remember information in a particular order. In
            this game, tiles light up one at a time to create a visual pattern.
            Your task is to observe the pattern and repeat it in exactly the
            same order.
          </p>
          <p className="mt-3 leading-7">
            The sequence becomes longer after each successful round. This
            gradually increases the challenge because you need to remember
            both the earlier tiles and each new addition.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            How to Play the Sequence Memory Game
          </h2>
          <ol className="list-decimal space-y-2 pl-6 leading-7">
            <li>Choose Easy, Medium, or Hard difficulty.</li>
            <li>Select Start Game to begin a new sequence.</li>
            <li>Watch carefully as the tiles light up in order.</li>
            <li>Wait until the sequence playback is complete.</li>
            <li>Click the same tiles in the same order.</li>
            <li>Complete each round to add another tile to the sequence.</li>
          </ol>
          <p className="mt-3 leading-7">
            You have three lives. A wrong tile selection uses one life, and
            the current sequence is replayed if you still have lives remaining.
            The game ends when all your lives are used.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            Choose Your Difficulty Level
          </h2>
          <p className="mb-4 leading-7">
            Pick a board size that feels comfortable. You can try a smaller
            board first and move to a larger one as you become familiar with
            the game.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[320px] border-collapse text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-900">
                    Difficulty
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-900">
                    Board size
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-900">
                    Challenge
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">Easy</td>
                  <td className="px-4 py-3">3 × 3</td>
                  <td className="px-4 py-3">9 possible tiles</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">Medium</td>
                  <td className="px-4 py-3">4 × 4</td>
                  <td className="px-4 py-3">16 possible tiles</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">Hard</td>
                  <td className="px-4 py-3">5 × 5</td>
                  <td className="px-4 py-3">25 possible tiles</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            How the Sequence Memory Score Works
          </h2>
          <p className="leading-7">
            Every completed round earns points based on the current level.
            The scoring formula is:
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
            For example, completing level 1 earns 12 points, while completing
            level 5 earns 20 points. Your personal best is stored locally in
            your browser so you can try to beat it in a future session.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            Tips for Remembering Longer Sequences
          </h2>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>
              <strong>Focus on the order:</strong> Remembering which tile
              appeared first is just as important as remembering the tiles
              themselves.
            </li>
            <li>
              <strong>Break the sequence into groups:</strong> Try remembering
              a few tiles at a time instead of treating the entire sequence as
              one long pattern.
            </li>
            <li>
              <strong>Look for visual patterns:</strong> Notice whether tiles
              appear near each other or in a recognizable arrangement.
            </li>
            <li>
              <strong>Avoid rushing:</strong> Watch the full playback before
              making your first selection.
            </li>
            <li>
              <strong>Practise consistently:</strong> Short, regular sessions
              can help you become more familiar with this type of memory
              challenge.
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
            Try Another Brain Game
          </h2>
          <p className="leading-7">
            Explore more interactive challenges on ToolsAB, including number
            memory, visual memory, reaction speed, and typing speed tests.
            Each game offers a different way to challenge yourself.
          </p>
        </section>
      </article>
    </main>
  );
}
