
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import DistractionLogTracker from "./DistractionLogTracker";

export const metadata: Metadata = {
  title: "Distraction Log Tracker – Track Interruptions & Focus Time | ToolsAB",
  description:
    "Find out what keeps interrupting your work or study time. Log distractions, track time lost, identify common triggers, and review your distraction patterns with this free browser-based tool.",
  alternates: {
    canonical: "/tools/distraction-log-tracker",
  },
};

export default function DistractionLogTrackerPage() {
  return (
    <ToolLandingPage
      toolContent={<DistractionLogTracker />}
      title="Distraction Log Tracker"
      summary="Ever sit down to study or work, only to find yourself checking your phone, browsing social media, or switching between tasks? It can be difficult to understand where your focus goes during the day. This distraction log tracker gives you a simple place to record interruptions, note how much time they take, and look for patterns that may be getting in your way."
      highlights={[
        "Record the things that interrupt your work, study, or daily routine.",
        "Choose a distraction category such as phone use, social media, noise, or multitasking.",
        "Write down what triggered the interruption, from boredom and stress to an unexpected interruption.",
        "Add the time you spent away from your original task.",
        "Include a short note when you want to remember what happened.",
        "See how many distractions you have logged and how much time they added up to.",
        "Check your average time lost per distraction and your most frequently logged category.",
        "Review a category breakdown to see which interruptions appear most often.",
        "Search your records and filter them by category or date range.",
        "Edit or delete an entry if you need to correct your log.",
        "Export your records as CSV or JSON for a backup or further analysis.",
        "Keep your records saved in your browser without creating an account.",
      ]}
      steps={[
        "When something interrupts your work or study session, open the tracker and choose Log distraction.",
        "Select what distracted you, such as your phone, social media, noise, or another interruption.",
        "Choose the trigger that best describes why it happened.",
        "Enter approximately how many minutes you spent away from your original task.",
        "Add an optional note if you want to remember the situation.",
        "Save the entry and continue recording distractions whenever they happen.",
        "After a few days, review your totals and category breakdown to see which interruptions occur most often.",
      ]}
      faqs={[
        {
          question: "What is a distraction log?",
          answer:
            "A distraction log is a record of the interruptions that take you away from a task. It can help you notice recurring habits, common triggers, and situations that make it harder to concentrate.",
        },
        {
          question: "Who can use this distraction tracker?",
          answer:
            "Students, remote workers, freelancers, and anyone trying to understand their daily work or study habits can use it to keep track of interruptions.",
        },
        {
          question: "What kinds of distractions can I record?",
          answer:
            "You can record phone use, social media, messaging, noise, interruptions from other people, multitasking, tiredness, unplanned browsing, and other distractions.",
        },
        {
          question: "Can I record what caused a distraction?",
          answer:
            "Yes. You can select a trigger such as boredom, stress, habit, curiosity, low energy, or procrastination. You can also add notes to describe what happened.",
        },
        {
          question: "How do I calculate time lost?",
          answer:
            "Enter an estimate of the number of minutes you spent away from your original task for each distraction. The tracker adds those durations together and calculates the average for the entries currently shown.",
        },
        {
          question: "Can I see my distraction patterns over time?",
          answer:
            "Yes. You can filter your records by today, the last 7 days, the last 30 days, or all time. The category breakdown helps you see which types of distractions appear most often in the selected view.",
        },
        {
          question: "Can I edit or delete a distraction entry?",
          answer:
            "Yes. Each entry has options to edit its details or delete it if you no longer need it.",
        },
        {
          question: "Can I export my distraction log?",
          answer:
            "Yes. Export your records as a CSV file, which can be opened in spreadsheet software, or as a JSON file for a structured backup.",
        },
        {
          question: "Are my records saved automatically?",
          answer:
            "Yes. The tracker saves your entries in your browser using local storage. You can close the page and return later using the same browser, as long as its site data has not been cleared.",
        },
        {
          question: "Will my distraction log sync across devices?",
          answer:
            "No. This version stores records in the browser where you use the tool. It does not automatically sync between devices or browsers. You can export your records if you want to keep a separate copy.",
        },
        {
          question: "Do I need to create an account?",
          answer:
            "No account is required. You can start recording distractions directly in your browser.",
        },
      ]}
      note="The time-loss figures are based on the durations you enter, so they are estimates rather than automatically measured screen or app usage. Your records are stored locally in your browser. Export a backup before clearing browser data or changing devices."
    />
  );
}
