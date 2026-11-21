
import type { Metadata } from "next";
import FlashcardMaker from "./FlashcardMaker";

export const metadata: Metadata = {
  title: "Free Online Flashcard Maker – Create and Study Flashcards | ToolsAB",
  description:
    "Create free online flashcards for studying, revision and memorisation. Add questions and answers, flip cards, track what you know and export your flashcard deck.",
  alternates: {
    canonical: "/tools/flashcard-maker",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function FlashcardMakerPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold text-blue-600">
          Free Student Productivity Tool
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Online Flashcard Maker
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Turn your notes into simple question-and-answer flashcards. Create
          your own study deck, test your memory, mark the topics you know and
          return to the cards that need more practice.
        </p>
      </header>

      <FlashcardMaker />

      <article className="mt-14 space-y-10 text-slate-700">
        <section>
          <h2 className="text-2xl font-bold text-slate-900">
            Make your own flashcards for studying
          </h2>

          <p className="mt-3 leading-7">
            Flashcards are a practical way to review information without
            repeatedly reading the same page of notes. Each card has a prompt
            on one side and an answer on the other. You try to remember the
            answer before revealing it, which gives you an opportunity to
            check what you actually know.
          </p>

          <p className="mt-3 leading-7">
            With the ToolsAB Flashcard Maker, you can build a personal deck
            around a subject, chapter, language or topic. Add as many
            question-and-answer cards as you need, then use the study area to
            work through them at your own pace.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900">
            How to use this flashcard maker
          </h2>

          <ol className="mt-4 list-decimal space-y-3 pl-6 leading-7">
            <li>
              <strong>Write a question:</strong> Enter a term, question,
              definition prompt or fact on the front of the card.
            </li>
            <li>
              <strong>Add the answer:</strong> Write the information you want
              to remember on the back.
            </li>
            <li>
              <strong>Add the card:</strong> Save it to your personal deck.
            </li>
            <li>
              <strong>Test yourself:</strong> Select a card and try to answer
              the question before revealing the back.
            </li>
            <li>
              <strong>Review your knowledge:</strong> Mark the card as Known
              or Needs Review, then continue through the deck.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900">
            What can you use flashcards for?
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">
                Language learning
              </h3>
              <p className="mt-2 text-sm leading-6">
                Practise vocabulary, translations, phrases and grammar rules
                by putting a word on one side and its meaning on the other.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">
                School and college subjects
              </h3>
              <p className="mt-2 text-sm leading-6">
                Review scientific terms, historical dates, mathematical
                definitions and important concepts from your lessons.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">
                Exam preparation
              </h3>
              <p className="mt-2 text-sm leading-6">
                Break a large topic into smaller questions so you can test
                your understanding one fact at a time.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">
                Everyday learning
              </h3>
              <p className="mt-2 text-sm leading-6">
                Remember names, abbreviations, technical terms, useful facts
                and information from books or personal notes.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900">
            Features of the ToolsAB flashcard maker
          </h2>

          <ul className="mt-4 list-disc space-y-3 pl-6 leading-7">
            <li>
              <strong>Custom cards:</strong> Write your own questions and
              answers instead of relying on a fixed set of examples.
            </li>
            <li>
              <strong>Flip to reveal:</strong> Hide the answer until you are
              ready to check it.
            </li>
            <li>
              <strong>Knowledge tracking:</strong> Mark cards as Known or
              Needs Review to organise your revision.
            </li>
            <li>
              <strong>Deck filters:</strong> Focus on all cards, new cards,
              known cards or cards that need another look.
            </li>
            <li>
              <strong>Shuffle:</strong> Change the order of your cards to
              practise recalling information without depending on a fixed
              sequence.
            </li>
            <li>
              <strong>Import and export:</strong> Save a JSON backup of your
              deck and import it again when needed.
            </li>
            <li>
              <strong>Automatic local saving:</strong> Your cards are saved
              in your browser so they remain available when you return using
              the same browser and device.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900">
            Tips for getting more from flashcards
          </h2>

          <p className="mt-3 leading-7">
            Keep each card focused on one idea. A short, clear question is
            generally easier to practise than a question containing several
            unrelated facts. If an answer becomes too long, consider splitting
            it into multiple cards.
          </p>

          <p className="mt-3 leading-7">
            Try to recall the answer before flipping the card. Reading the
            answer immediately can feel familiar, but attempting to retrieve
            it from memory gives you a better indication of whether you have
            learned it.
          </p>

          <p className="mt-3 leading-7">
            Spend extra time on cards marked Needs Review. You do not need to
            make every card perfect in one sitting. Regular, manageable
            revision sessions can make it easier to revisit information over
            time.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900">
            Frequently asked questions
          </h2>

          <div className="mt-5 space-y-5">
            <div>
              <h3 className="font-semibold text-slate-900">
                Is this online flashcard maker free?
              </h3>
              <p className="mt-2 leading-7">
                Yes. You can create, edit, study and organise flashcards with
                this free tool.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Do I need to create an account?
              </h3>
              <p className="mt-2 leading-7">
                No account is required. You can start creating cards directly
                in your browser.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Where are my flashcards saved?
              </h3>
              <p className="mt-2 leading-7">
                Your flashcards are stored locally in your browser. They are
                not automatically uploaded to an online account or synced
                between devices.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Can I use the same flashcards on another device?
              </h3>
              <p className="mt-2 leading-7">
                Yes. Export your deck as a JSON file, move that file to the
                other device and use the import option there.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                What does Needs Review mean?
              </h3>
              <p className="mt-2 leading-7">
                It marks a card that you want to practise again. You can
                filter your deck to show these cards and give them extra
                attention.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Will my cards remain if I clear browser data?
              </h3>
              <p className="mt-2 leading-7">
                Clearing site data or browser storage can remove locally
                saved cards. Export a backup before clearing browser data or
                changing devices.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 pt-7">
          <h2 className="text-2xl font-bold text-slate-900">
            Start building your study deck
          </h2>
          <p className="mt-3 leading-7">
            A useful flashcard deck does not need to be complicated. Start
            with a few questions from a topic you are learning, test yourself
            and add more cards as you progress. The ToolsAB Flashcard Maker
            gives you a simple place to create and review those cards.
          </p>
        </section>
      </article>
    </main>
  );
}
