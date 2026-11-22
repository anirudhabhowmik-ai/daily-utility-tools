
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import StudyBreakReminder from "./StudyBreakReminder";

export const metadata: Metadata = {
  title: "Study Break Reminder Pro - Pomodoro Focus Timer | ToolsAB",
  description:
    "Free study break reminder with customizable Pomodoro timers, automatic breaks, daily study statistics, session history, sound alerts, and browser notifications.",
  alternates: {
    canonical: "/tools/study-break-reminder",
  },
};

export default function StudyBreakReminderPage() {
  return (
    <ToolLandingPage
      toolContent={<StudyBreakReminder />}
      title="Study Break Reminder Pro"
      summary="Build a consistent study routine with a customizable focus timer and automatic break reminders. Choose a Pomodoro preset, create your own schedule, track study time, review session history, and receive alerts when it is time to rest or return to work."
      highlights={[
        "Classic Pomodoro, Deep Work, and Extended Focus presets.",
        "Custom study, short-break, and long-break durations.",
        "Automatic transitions between focus sessions and breaks.",
        "Configurable long-break frequency.",
        "Pause, resume, restart, and skip controls.",
        "Daily study statistics and completed-session tracking.",
        "Session history with completed and skipped records.",
        "JSON export for session-history backups.",
        "Checkbox-style sound and desktop notification switches.",
        "Adjustable sound volume and keyboard shortcuts.",
        "Automatic local browser storage for settings and history.",
      ]}
      steps={[
        "Choose a preset or configure your study and break durations.",
        "Set how many completed study sessions should trigger a long break.",
        "Select the focus, short-break, or long-break phase.",
        "Click Start timer to begin your session.",
        "Pause, resume, restart, or skip a phase whenever needed.",
        "Enable sound and browser notifications if you want completion alerts.",
        "Review your daily study statistics and saved session history.",
        "Export your history as JSON if you need a separate backup.",
      ]}
      faqs={[
        {
          question: "What is the Pomodoro technique?",
          answer:
            "The Pomodoro technique divides work into focused sessions separated by short breaks. A common schedule is 25 minutes of work followed by a 5-minute break.",
        },
        {
          question: "Can I customize the timer?",
          answer:
            "Yes. You can configure study duration, short-break duration, long-break duration, and how frequently a long break occurs. Durations range from 1 to 180 minutes.",
        },
        {
          question: "What presets are available?",
          answer:
            "The tool includes Classic Pomodoro, Deep Work, and Extended Focus presets. You can also configure your own schedule.",
        },
        {
          question: "How does the long-break schedule work?",
          answer:
            "A long break replaces the short break after the selected number of completed study sessions. Skipped study sessions do not count as completed sessions.",
        },
        {
          question: "Can I pause or skip a session?",
          answer:
            "Yes. You can pause, resume, restart, or skip the current phase. Skipped phases are recorded separately from completed phases.",
        },
        {
          question: "Can I track daily study time?",
          answer:
            "Yes. The dashboard calculates daily study time from your recorded study sessions using your browser's local date.",
        },
        {
          question: "Can I enable sound and desktop notifications?",
          answer:
            "Yes. Use the switch controls to enable or disable completion sounds and desktop notifications. Browser permission is required for desktop notifications.",
        },
        {
          question: "Does the tool save my history?",
          answer:
            "Settings and session history are saved in local browser storage. Export JSON to keep an additional backup.",
        },
        {
          question: "Will the timer work after closing the browser?",
          answer:
            "No. The page must remain open for the timer and alerts to operate. Returning to an open background tab recalculates the countdown using the system clock.",
        },
        {
          question: "Is the Study Break Reminder free?",
          answer:
            "Yes. The timer, presets, statistics, history, sound controls, and JSON export are available free in your browser.",
        },
      ]}
      note="Your settings and history are stored locally in this browser. Export a backup before clearing browser data or switching devices. Keep the page open while the timer is running. Device sleep, browser throttling, and notification permissions can affect alerts."
    />
  );
}
