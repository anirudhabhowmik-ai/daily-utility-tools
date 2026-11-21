
import type { Metadata } from "next";
import ReactionSpeedTest from "./ReactionSpeedTest";

export const metadata: Metadata = {
  title: "Reaction Time Test Online - Free Reaction Speed Test | toolsAB",
  description:
    "Test your reaction speed online for free. Measure your reaction time in milliseconds with five rounds and track your personal best.",
  alternates: {
    canonical: "/tools/reaction-speed-test",
  },
};

export default function ReactionSpeedTestPage() {
  return (
    <>
      <ReactionSpeedTest />

      <article className="tool-content">
        <h1>Free Online Reaction Time Test</h1>

        <p>
          Test how quickly you can react with this free online reaction
          speed test. Wait for the screen to turn green and click as
          quickly as possible. Your reaction time is measured in
          milliseconds.
        </p>

        <h2>How to Use the Reaction Speed Test</h2>

        <ol>
          <li>Tap on blue color arena, where it's written "Ready when you are" (or press Space / Enter) to begin.</li>
          <li>Wait for the red screen to turn green.</li>
          <li>Click immediately when the screen turns green.</li>
          <li>Complete all five rounds to calculate your average.</li>
        </ol>

        <h2>What Is Reaction Time?</h2>

        <p>
          Reaction time is the amount of time it takes to respond to
          a stimulus. In this game, the stimulus is the screen turning
          green, and your response is clicking the screen.
        </p>

        <h2>Frequently Asked Questions</h2>

        <h3>What is a good reaction time?</h3>
        <p>
          Reaction times vary with age, attention, practice, device
          hardware and other factors. This game is intended for
          entertainment and personal comparison, not medical assessment.
        </p>

        <h3>Is this reaction test free?</h3>
        <p>
          Yes. You can play without registering or creating an account.
        </p>

        <h3>Are my results saved?</h3>
        <p>
          Your personal best is saved locally in your browser when
          local storage is available.
        </p>
      </article>
    </>
  );
}
