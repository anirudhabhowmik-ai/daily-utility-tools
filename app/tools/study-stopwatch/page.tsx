
import type { Metadata } from "next";
import StudyStopwatch from "./StudyStopwatch";

export const metadata: Metadata = {
  title: "Free Study Stopwatch & Tracker – Track Study Hours | ToolsAB",
  description:
    "Track your study time with a free online study stopwatch. Organize sessions by subject, set daily study goals, review your progress and export your study history.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function StudyStopwatchPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <header className="mx-auto max-w-3xl text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-600">
          Free Student Productivity Tool
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Study Stopwatch & Time Tracker
        </h1>

        <p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-300">
          Keep track of the time you spend studying, one session at a time.
          Choose a subject, start the stopwatch and build a clearer picture
          of your daily study routine. No account or sign-up is required.
        </p>
      </header>

      <StudyStopwatch />

      <article className="mx-auto max-w-4xl space-y-10 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Make your study time easier to manage
          </h2>

          <p className="mt-4 leading-8">
            It is easy to sit at a desk for several hours and still be unsure
            how much time you actually spent studying. A break, a quick
            message or a change of subject can make the day feel busy without
            giving you a clear record of your progress.
          </p>

          <p className="mt-4 leading-8">
            A study stopwatch gives you a simple way to measure focused study
            sessions. Instead of estimating your hours at the end of the day,
            you can start the timer when you begin and finish the session when
            you are done. Over time, these records can help you understand
            your habits and plan your schedule more realistically.
          </p>

          <p className="mt-4 leading-8">
            The ToolsAB Study Stopwatch is designed for students who want a
            straightforward way to record their study hours without creating
            an account or installing an application.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            How to use the study stopwatch
          </h2>

          <ol className="mt-4 list-decimal space-y-3 pl-6 leading-7">
            <li>
              <strong>Choose a subject.</strong> Select a subject such as
              Mathematics, Science, English or Programming. You can also
              enter your own subject name.
            </li>
            <li>
              <strong>Start the timer.</strong> Select Start studying when
              you begin your work. The stopwatch records the time that passes.
            </li>
            <li>
              <strong>Pause when needed.</strong> If you take a break, pause
              the timer. You can resume the same session later.
            </li>
            <li>
              <strong>Finish your session.</strong> When you finish studying,
              select Finish session to save the recorded time under the
              selected subject.
            </li>
            <li>
              <strong>Review your progress.</strong> Check your daily study
              total, subject breakdown and completed session history.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Features of this study time tracker
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Stopwatch with pause and resume
              </h3>
              <p className="mt-2 text-sm leading-7">
                Start a study session, pause it when you need a break and
                resume without losing the time already recorded.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Subject-wise tracking
              </h3>
              <p className="mt-2 text-sm leading-7">
                Record different sessions for subjects such as Mathematics,
                Science, History or any custom subject you choose.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Daily study goals
              </h3>
              <p className="mt-2 text-sm leading-7">
                Set a daily target and see how much of it you have completed.
                The progress display updates as you record study time.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Study session history
              </h3>
              <p className="mt-2 text-sm leading-7">
                Review your recently completed sessions and remove entries
                that you no longer want to keep.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                CSV export
              </h3>
              <p className="mt-2 text-sm leading-7">
                Download your saved session records as a CSV file that can
                be opened in spreadsheet applications.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Browser-based storage
              </h3>
              <p className="mt-2 text-sm leading-7">
                Your settings and saved sessions stay in your browser's
                local storage. You do not need to register or sign in.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Why track study hours?
          </h2>

          <p className="mt-4 leading-8">
            Tracking study hours is not about making every minute productive.
            It is about understanding how you use your time. A record of
            completed sessions can help you notice patterns that are
            difficult to remember from day to day.
          </p>

          <p className="mt-4 leading-8">
            For example, you may discover that you usually spend more time on
            one subject than you expected, or that shorter sessions fit your
            routine better than long study blocks. You can use that
            information when planning the next day's work.
          </p>

          <p className="mt-4 leading-8">
            Remember that time alone does not measure learning. Understanding
            a topic, practising questions and reviewing mistakes are also
            important. Use the stopwatch as a record of your effort, not as
            a replacement for meaningful study.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tips for building a realistic study routine
          </h2>

          <ul className="mt-4 list-disc space-y-3 pl-6 leading-7">
            <li>
              Start with a daily goal that fits around your classes, work and
              other responsibilities.
            </li>
            <li>
              Record each subject separately so you can see where your time
              goes.
            </li>
            <li>
              Take breaks when you need them instead of trying to study
              continuously.
            </li>
            <li>
              Review your study history at the end of the week and adjust
              your schedule if necessary.
            </li>
            <li>
              Focus on completing useful tasks, not just increasing the
              number of hours on the timer.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Frequently asked questions
          </h2>

          <div className="mt-5 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Is this study stopwatch free?
              </h3>
              <p className="mt-2 leading-7">
                Yes. You can use the study stopwatch, record sessions, set
                daily goals and export your study history without paying or
                creating an account.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Do I need to create an account?
              </h3>
              <p className="mt-2 leading-7">
                No. The tool works directly in your web browser. Your study
                records are saved in that browser rather than in an online
                account.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Will my timer continue if I refresh the page?
              </h3>
              <p className="mt-2 leading-7">
                The current timer state is saved in your browser. If you
                refresh the page while a session is running, the timer
                calculates the elapsed time from its saved start time when
                you return.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Can I track more than one subject?
              </h3>
              <p className="mt-2 leading-7">
                Yes. Finish one session and select another subject before
                starting the next one. Each completed session is recorded
                separately.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Where are my study records stored?
              </h3>
              <p className="mt-2 leading-7">
                The tool uses your browser's local storage. Your records are
                not automatically shared between devices or browsers. They
                may be lost if you clear your browser data, use private
                browsing or remove the site's stored data. Export your
                sessions regularly if you want a separate copy.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Can I use this tool on my phone?
              </h3>
              <p className="mt-2 leading-7">
                Yes. The page is designed to adjust to smaller screens, so
                you can use it from a supported mobile browser as well as
                from a desktop computer.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Does more study time always mean better results?
              </h3>
              <p className="mt-2 leading-7">
                Not necessarily. The stopwatch measures time, not
                understanding. Combine regular study sessions with practice,
                revision and breaks that help you stay focused.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            A simple way to keep your study routine on track
          </h2>

          <p className="mt-2 leading-7 text-gray-700 dark:text-gray-300">
            You do not need a complicated system to begin tracking your
            study time. Choose a subject, start a session and review your
            progress regularly. Small, consistent steps can make it easier
            to understand and improve your daily routine.
          </p>
        </section>
      </article>
    </main>
  );
}
