
import type { Metadata } from "next";
import PomodoroStudyTimer from "./PomodoroStudyTimer";

export const metadata: Metadata = {
  title: "Free Pomodoro Study Timer – Focus & Break Timer | ToolsAB",
  description:
    "Use this free Pomodoro timer to organize focused study sessions and breaks. Customize focus periods, set short and long breaks, and track completed sessions.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PomodoroStudyTimerPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <header className="mx-auto max-w-3xl text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-600">
          Free Focus & Productivity Tool
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Pomodoro Study Timer
        </h1>

        <p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-300">
          Break your study time into manageable focus sessions with planned
          breaks in between. Choose your own timer durations, keep track of
          completed sessions and build a routine that works for you.
        </p>
      </header>

      <PomodoroStudyTimer />

      <article className="mx-auto max-w-4xl space-y-10 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            What is the Pomodoro technique?
          </h2>

          <p className="mt-4 leading-8">
            The Pomodoro technique is a time-management approach that divides
            work into focused intervals separated by short breaks. A common
            starting point is 25 minutes of focused work followed by a
            5-minute break. After several focus sessions, a longer break can
            help you step away before starting another round.
          </p>

          <p className="mt-4 leading-8">
            The idea is simple: instead of looking at a large task and
            wondering how long it will take, you commit to one manageable
            period of focused work. When the timer ends, you take a break or
            move to the next part of your routine.
          </p>

          <p className="mt-4 leading-8">
            There is no single schedule that works for everyone. Some people
            prefer shorter intervals, while others find longer focus periods
            more comfortable. This timer lets you adjust the durations to
            suit your work and study habits.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            How to use this Pomodoro timer
          </h2>

          <ol className="mt-4 list-decimal space-y-3 pl-6 leading-7">
            <li>
              <strong>Choose your timer settings.</strong> Start with a
              25-minute focus period and a 5-minute short break, or select
              durations that fit your routine.
            </li>
            <li>
              <strong>Pick one task.</strong> Decide what you want to work on
              before starting the timer. A specific task makes it easier to
              stay on track.
            </li>
            <li>
              <strong>Start the focus session.</strong> Work on the selected
              task until the countdown finishes. Avoid switching between
              unrelated activities.
            </li>
            <li>
              <strong>Take your break.</strong> When a focus session ends,
              choose Start break and step away for a little while.
            </li>
            <li>
              <strong>Repeat the cycle.</strong> Continue with another focus
              session after your break. A longer break becomes available
              after your chosen number of completed focus sessions.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Features of this online Pomodoro timer
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Custom focus duration
              </h3>
              <p className="mt-2 text-sm leading-7">
                Adjust your focus period from 5 to 90 minutes instead of
                being limited to one fixed timer.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Short and long breaks
              </h3>
              <p className="mt-2 text-sm leading-7">
                Set different break lengths and choose how many focus sessions
                you want to complete before a longer break.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Pause and resume
              </h3>
              <p className="mt-2 text-sm leading-7">
                Pause the countdown when necessary and resume the remaining
                time without restarting the entire session.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Focus cycle progress
              </h3>
              <p className="mt-2 text-sm leading-7">
                See how many focus sessions you have completed in your
                current cycle and when your next long break is due.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Session summary
              </h3>
              <p className="mt-2 text-sm leading-7">
                Keep a count of completed focus sessions and view an
                estimated total focus time.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Browser-based saving
              </h3>
              <p className="mt-2 text-sm leading-7">
                Your timer settings and current progress are saved locally,
                so you can return to the same browser later.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            What timer settings should you use?
          </h2>

          <p className="mt-4 leading-8">
            If you are new to this method, a 25-minute focus session followed
            by a 5-minute break is a practical place to begin. It gives you a
            clear amount of time to work without requiring a long commitment.
          </p>

          <p className="mt-4 leading-8">
            If you are reading a chapter, solving a difficult problem or
            working on a project that needs more concentration, you may
            prefer a longer focus period. For smaller tasks or days when it
            is difficult to concentrate, shorter intervals may feel more
            manageable.
          </p>

          <p className="mt-4 leading-8">
            Try a schedule for a few days and notice how it feels. The most
            useful timer is one that supports your routine rather than
            creating unnecessary pressure.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Practical ways to make focus sessions useful
          </h2>

          <ul className="mt-4 list-disc space-y-3 pl-6 leading-7">
            <li>
              Write down one clear task before each focus session.
            </li>
            <li>
              Keep your phone and unrelated notifications out of reach when
              possible.
            </li>
            <li>
              If another task comes to mind, write it down and return to your
              current work.
            </li>
            <li>
              Use breaks to stretch, drink water or take a short walk.
            </li>
            <li>
              Avoid treating a missed session as a failure. Adjust the
              schedule and continue when you are ready.
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
                Is this Pomodoro timer free?
              </h3>
              <p className="mt-2 leading-7">
                Yes. You can use the focus timer, customize durations, take
                breaks and track completed focus sessions without creating an
                account.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                What is a good Pomodoro timer schedule?
              </h3>
              <p className="mt-2 leading-7">
                A commonly used starting schedule is 25 minutes of focus
                followed by a 5-minute break. After four focus sessions, many
                people take a longer break. You can adjust the schedule
                depending on your needs.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Can I change the focus duration?
              </h3>
              <p className="mt-2 leading-7">
                Yes. You can choose a focus duration between 5 and 90 minutes.
                Pause the active timer before changing the settings.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Does the timer automatically start the next break?
              </h3>
              <p className="mt-2 leading-7">
                No. When a countdown finishes, the timer stops and displays a
                completion message. You can then choose when to start your
                next break or focus session.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Will the timer continue if I refresh the page?
              </h3>
              <p className="mt-2 leading-7">
                The running timer's deadline is saved in your browser. When
                you return or refresh the page, the remaining time is
                calculated from that saved deadline.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Does this timer need an account?
              </h3>
              <p className="mt-2 leading-7">
                No. The timer works in your browser and saves its settings
                locally. It does not provide automatic cloud synchronization.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                What happens if I clear browser data?
              </h3>
              <p className="mt-2 leading-7">
                Your locally saved timer settings and progress may be
                deleted when you clear site data or browser storage. They
                are not backed up to an online account.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Start with one focused session
          </h2>

          <p className="mt-2 leading-7 text-gray-700 dark:text-gray-300">
            You do not need to plan an entire day before getting started.
            Choose one task, set a comfortable focus period and begin. Once
            you find a rhythm that works, you can build a more consistent
            routine around it.
          </p>
        </section>
      </article>
    </main>
  );
}
