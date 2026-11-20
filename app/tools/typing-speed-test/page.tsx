
import type { Metadata } from "next";
import TypingSpeedTest from "./TypingSpeedTest";

export const metadata: Metadata = {
  title: "Typing Speed Test – Check Your WPM Online Free | ToolsAB",
  description:
    "Take a free online typing speed test to measure your words per minute (WPM), typing accuracy, and errors. Choose a 15, 30, 60, or 120-second test and improve your typing skills.",
  keywords: [
    "typing speed test",
    "typing test",
    "typing speed test online",
    "WPM test",
    "words per minute test",
    "typing accuracy test",
    "free typing test",
    "online keyboard test",
    "typing practice",
  ],
  alternates: {
    canonical: "/tools/typing-speed-test",
  },
  openGraph: {
    title: "Free Typing Speed Test – Measure Your WPM | ToolsAB",
    description:
      "Find out how fast and accurately you type. Take a free timed typing test and check your WPM, accuracy, and errors.",
    url: "/tools/typing-speed-test",
    siteName: "ToolsAB",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Typing Speed Test – Free Online WPM Test",
    description:
      "Test your typing speed and accuracy with free 15, 30, 60, and 120-second typing challenges.",
  },
};

const faqs = [
  {
    question: "What is a typing speed test?",
    answer:
      "A typing speed test measures how quickly you can type a passage of text. Results are commonly displayed in words per minute (WPM), along with typing accuracy and the number of incorrect characters.",
  },
  {
    question: "What does WPM mean in typing?",
    answer:
      "WPM stands for words per minute. A common typing-test convention treats five characters, including spaces, as one standard word. The number of correctly typed characters is divided by five and then adjusted for the time taken.",
  },
  {
    question: "How is typing speed calculated?",
    answer:
      "This test calculates WPM using correctly typed characters divided by five, then divided by the elapsed time in minutes. This provides a character-based typing speed estimate using the standard five-character word convention.",
  },
  {
    question: "How is typing accuracy calculated?",
    answer:
      "Accuracy is calculated by dividing correctly typed characters by the total number of characters you entered, then multiplying the result by 100. For example, 95 correct characters out of 100 entered gives 95% accuracy.",
  },
  {
    question: "What is a good typing speed?",
    answer:
      "Typing speed varies depending on experience, keyboard familiarity, and the type of text. Rather than comparing yourself with a single target, focus on gradually improving both your speed and accuracy.",
  },
  {
    question: "Which typing test duration should I choose?",
    answer:
      "A 15-second test is useful for a quick challenge. A 30-second test gives you a little more time to settle into a rhythm. A 60-second test offers a longer sample, while a 120-second test can help you assess consistency over a longer period.",
  },
  {
    question: "Does this typing test count incorrect characters?",
    answer:
      "Yes. Incorrect characters are highlighted in the passage and included in the error count. Only correctly typed characters contribute to the WPM calculation.",
  },
  {
    question: "Can I use this typing speed test on a mobile phone?",
    answer:
      "Yes. The typing test works in modern mobile browsers. However, typing speed results can differ between a physical keyboard and a phone's touchscreen keyboard.",
  },
  {
    question: "Is my typing speed saved?",
    answer:
      "Your best WPM result is saved locally in your browser. It is not connected to an online account or a server. Clearing the website's local storage or switching browsers may remove or change the saved result.",
  },
  {
    question: "How can I improve my typing speed?",
    answer:
      "Practise regularly, learn the correct finger positions, avoid looking at the keyboard, and focus on accuracy before increasing speed. Consistent practice can help you become more comfortable with typing.",
  },
  {
    question: "Is this a professional typing certification test?",
    answer:
      "No. This is an informal practice tool for personal use. Its results are useful for tracking your progress but are not an official typing certificate or a standardized employment assessment.",
  },
];

export default function TypingSpeedTestPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <TypingSpeedTest />

      <article className="mx-auto mt-14 max-w-4xl space-y-10 text-slate-700">
        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            What Is a Typing Speed Test?
          </h2>
          <p className="leading-7">
            A typing speed test is an online exercise that measures how
            quickly and accurately you can type text using a keyboard. It
            usually reports your speed in words per minute (WPM), along with
            your accuracy and typing errors.
          </p>
          <p className="mt-3 leading-7">
            This free typing test gives you a passage to reproduce within a
            selected time limit. As you type, the tool highlights correct and
            incorrect characters so you can see how closely your input matches
            the original passage.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            How to Use This Free Typing Test
          </h2>
          <ol className="list-decimal space-y-2 pl-6 leading-7">
            <li>Choose a test duration: 15, 30, 60, or 120 seconds.</li>
            <li>Read the sample passage before you begin.</li>
            <li>Click inside the typing area.</li>
            <li>Start typing the passage. The timer begins automatically.</li>
            <li>Watch your WPM, accuracy, and error count update.</li>
            <li>When the timer ends or you complete the passage, review your results.</li>
            <li>Try another passage or repeat the test to improve your score.</li>
          </ol>
          <p className="mt-3 leading-7">
            You do not need to create an account. Your personal best is stored
            in your browser, allowing you to compare results on the same
            device and browser.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            What Does WPM Mean?
          </h2>
          <p className="leading-7">
            WPM means words per minute. It is one of the most commonly used
            measurements for typing speed. Since words have different lengths,
            typing tests commonly use a standard convention in which five
            characters count as one word.
          </p>
          <p className="mt-3 leading-7">
            For example, if you correctly type 250 characters in one minute,
            your calculated speed is 50 WPM. This makes it easier to compare
            typing performance across passages with different words.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            How Is Typing Speed Calculated?
          </h2>
          <p className="leading-7">
            This tool uses correctly typed characters to calculate your WPM.
            The calculation follows the standard five-character word
            convention.
          </p>
          <div className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-center text-sm font-semibold text-slate-500">
              TYPING SPEED FORMULA
            </p>
            <p className="mt-3 text-center text-lg font-bold text-slate-900">
              WPM = Correct Characters ÷ 5 ÷ Time in Minutes
            </p>
          </div>
          <p className="leading-7">
            For example, typing 300 correct characters in one minute gives a
            speed of 60 WPM. Incorrect characters are excluded from the
            correct-character count.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            Understanding Typing Accuracy
          </h2>
          <p className="leading-7">
            Typing accuracy measures the percentage of your entered
            characters that match the corresponding characters in the sample
            passage. A higher accuracy percentage means fewer typing mistakes.
          </p>
          <div className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-center text-sm font-semibold text-slate-500">
              ACCURACY FORMULA
            </p>
            <p className="mt-3 text-center text-lg font-bold text-slate-900">
              Accuracy = (Correct Characters ÷ Total Typed Characters) × 100
            </p>
          </div>
          <p className="leading-7">
            For example, if 95 out of 100 typed characters are correct, your
            accuracy is 95%. Improving accuracy is important because typing
            quickly is less useful when it produces frequent errors.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            Choosing the Right Test Duration
          </h2>
          <p className="mb-4 leading-7">
            Different time limits provide different kinds of typing
            challenges. Choose one that matches your available time and
            practice goals.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[320px] border-collapse text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-900">
                    Duration
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-900">
                    Best for
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">15 seconds</td>
                  <td className="px-4 py-3">Quick typing challenge</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">30 seconds</td>
                  <td className="px-4 py-3">Short practice session</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">60 seconds</td>
                  <td className="px-4 py-3">General typing assessment</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">120 seconds</td>
                  <td className="px-4 py-3">Longer typing practice</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            Practical Tips to Improve Your Typing Speed
          </h2>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>
              <strong>Learn proper finger placement:</strong> Become familiar
              with the home row keys and the correct finger positions.
            </li>
            <li>
              <strong>Prioritize accuracy:</strong> Build reliable typing
              habits before trying to type faster.
            </li>
            <li>
              <strong>Practise regularly:</strong> Short, consistent sessions
              can help you develop familiarity with the keyboard.
            </li>
            <li>
              <strong>Maintain a comfortable posture:</strong> Keep your
              shoulders relaxed and position your keyboard comfortably.
            </li>
            <li>
              <strong>Watch the text:</strong> Practise reading ahead rather
              than looking down at the keyboard for every character.
            </li>
            <li>
              <strong>Track your progress:</strong> Repeat tests and compare
              your WPM and accuracy over time.
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
            Continue exploring the interactive brain games available on
            ToolsAB. Try the Reaction Speed Test, Number Memory Test, Visual
            Memory Test, and Sequence Memory Test for more challenges.
          </p>
        </section>
      </article>
    </main>
  );
}
