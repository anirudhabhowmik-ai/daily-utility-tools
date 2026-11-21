import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import SyllabusProgressTracker from "./SyllabusProgressTracker";

export const metadata: Metadata = {
  title: "Syllabus Progress Tracker - Track Study and Exam Preparation | ToolsAB",
  description:
    "Track your syllabus progress with subjects, chapters, study priorities, and target dates. Organize your exam preparation and see how much you have completed with this free tracker.",
  alternates: {
    canonical: "/tools/syllabus-progress-tracker",
  },
};

export default function SyllabusProgressTrackerPage() {
  return (
    <ToolLandingPage
      toolContent={<SyllabusProgressTracker />}
      title="Free Syllabus Progress Tracker"
      summary="Keep your exam preparation organized by tracking subjects, chapters, and individual topics in one place. Create separate study plans, update the status of each topic, set priorities and target dates, and see your overall syllabus completion percentage. Whether you are preparing for school exams, college tests, competitive exams, or a personal learning goal, this tracker helps you understand what you have finished and what still needs attention. Every field and button is explained below in plain language, so even a first-time user can get started in a few minutes."
      highlights={[
        "Create separate study plans for different exams or courses",
        "Organize your syllabus into subjects and individual topics",
        "Track each topic as Not Started, In Progress, or Completed",
        "Set High, Medium, or Low priority for individual topics",
        "Add optional target dates and personal notes to topics",
        "See instant subject-wise and overall progress rings",
        "A Today Focus list shows what is overdue, due soon, or high priority",
        "Paste a whole list of topics at once instead of typing them one by one",
        "Search and filter topics by name, subject, status, and priority",
        "Earn XP, levels, and badges as you build good study habits",
        "Duplicate a plan to reuse it next term with progress reset",
        "Export and import study plans as JSON, or export topics as CSV",
      ]}
      steps={[
        "Open the dashboard: When you first load the tool, you are on the dashboard. It shows your level, XP progress, current study streak, badges earned, how many plans you have, how many topics you have completed, and how many topics are overdue.",

        "Create a plan: Click the “+ Create study plan” button to start a new plan. Each plan usually represents one exam, course, or learning goal, for example “Class 12 Final Exam” or “Biology Revision”.",

        "Study plan name (required): Type a clear name for the plan. This is the only required text field and appears at the top of the plan card on your dashboard. You can change it at any time.",

        "Description (optional): Add a short sentence about what the plan covers, for example “Covers chapters 1–12 of the biology textbook”. It appears under the plan name on the dashboard card.",

        "Exam date (optional): Pick the date of your exam. When set, the tracker shows a countdown, colours the plan card red if the exam is within 7 days, yellow within 21 days, and green otherwise, and computes a daily study pace so you know how many topics you need to cover per day to finish on time.",

        "Study pace insight: Right below the exam date, the tool tells you how many topics you should complete per day (or per week) to finish every topic before the exam. It updates automatically as you add topics or change statuses.",

        "Add a subject: Click “+ Add subject” to add a new subject such as Mathematics, Physics, or History. Each subject groups its own topics and has its own progress bar.",

        "Subject name (required): Type the subject name. Subjects with no name but with topics inside will block you from saving the plan, so make sure every subject that has topics also has a name.",

        "Add topics: Under each subject, click “+ Add topic” to add a topic, chapter, or chapter section. Each topic has its own name, status, priority, optional target date, and optional notes.",

        "Topic name (required for it to be counted): Type the topic name, for example “Chapter 4: Photosynthesis”. Blank topic rows are ignored when calculating progress, saving, and exporting — they simply act as placeholders.",

        "Topic status: Each topic has three statuses. Not Started means you have not begun. In Progress means you are currently studying it. Completed means you have finished it. Only Completed topics count toward the progress percentage.",

        "Topic priority: Choose High, Medium, or Low priority. Priority does not affect the progress percentage, but High priority topics appear in the dashboard’s Today Focus list even if they have no target date, so you always see what matters most.",

        "Topic target date (optional): Pick a date when you want to finish this topic. If the date passes and the topic is still not completed, it shows up as “Overdue” on the dashboard and gets a red badge in the plan, so you can act on it.",

        "Topic notes (optional): Add a short reminder, for example “Revisit domain and range problems” or “Ask teacher about section 3”. Notes are searchable from the filter panel and appear in the topic row for reference.",

        "Mark all done: If every topic in a subject is already studied, click “Mark all done” to set all named topics in that subject to Completed in one click. You still need to click Save study plan to keep the change.",

        "Paste topics (bulk add): Instead of typing topics one by one, click “⚡ Paste topics” under any subject and paste a whole list — one topic per line. Bullets and numbers are removed automatically, so you can paste straight from your syllabus document.",

        "Expand / collapse all: Use the “Expand all” and “Collapse all” buttons above the subjects to quickly scan or hide all topic details in a long plan.",

        "Progress overview: The editor shows a ring chart with your overall completion percentage, the number of completed, in-progress, and not-started topics, and per-subject progress bars so you can see exactly which subject needs more attention.",

        "Find and filter topics: Use the search box and the Status, Priority, Subject, and Sort dropdowns to narrow the list of topics. The “Hide completed topics” switch removes finished topics so you only see what is still left to study.",

        "Quick status change from the filter list: Every topic that appears in the filtered list has its own status dropdown. Change it there without scrolling to the topic card in the editor.",

        "Jump to a topic: In the filtered list, click “Edit” on any topic to jump back to that topic card in the editor. The subject expands automatically and the topic scrolls into view.",

        "Save study plan: Click the “Save study plan” button at the bottom. The tool validates that every subject with topics has a name and that the plan itself has a name. Any errors are shown in a notice at the top.",

        "Unsaved-changes indicator: The bottom bar shows “Unsaved changes” or “No changes yet”. If you try to leave the editor with unsaved changes, a confirmation dialog appears — choose Leave or Keep editing.",

        "Today focus (dashboard): When you return to the dashboard, the Today Focus card lists up to six topics that need your attention — overdue first, then due today, then due soon, then high-priority, then in-progress. Each row has a Start or Mark done button so you can progress without opening the plan.",

        "Recent activity and upcoming exams: The dashboard also shows your last few completions and the countdown to each upcoming exam, so you always have context when you open the tool.",

        "Badges and XP: Completing topics earns XP, which unlocks levels (Freshman through Dean). Completing plans, setting exam dates, favouriting plans, building streaks, and finishing every topic in a plan each unlock a badge, shown on the dashboard.",

        "Duplicate a plan: From a plan card, click “Duplicate” to create a copy with progress reset to Not Started. This is useful for reusing the same syllabus for the next term.",

        "Favorite a plan: Click the star on any plan card to pin it to the top of the list. Favourites are not just cosmetic — the “Favorited” badge tracks it.",

        "Delete a plan: Click Delete on a plan card. A confirmation dialog warns that every subject and topic will be removed. Export first if you want a backup.",

        "Export a plan: Click Export on a plan card or in the editor toolbar to download the plan as a JSON file. This file can be re-imported on any device.",

        "Export topics as CSV: Inside the editor, click “Export CSV” to download a spreadsheet of every named topic with its subject, status, priority, target date, and notes. Useful for printing or sharing.",

        "Backup all / Import JSON: The dashboard’s “Backup all” button downloads every plan into one JSON file. Use “Import JSON file” or “Paste JSON” to restore a previous backup. Imported plans are added as new entries, never overwriting existing ones.",

        "Dark mode: Click the 🌙 / ☀️ button in the top right to switch between light and dark themes. Your choice is remembered on this device.",

        "Clear activity: In the dashboard’s Recent activity card, click Clear to remove the activity feed and reset your streak. This does not affect your plans.",
      ]}
      faqs={[
        {
          question: "What is a syllabus progress tracker?",
          answer:
            "A syllabus progress tracker helps you organize your study material and monitor how much you have completed. You can divide a syllabus into subjects and topics, update their study status, and check your overall progress.",
        },
        {
          question: "Is this syllabus tracker free?",
          answer:
            "Yes. You can create and manage study plans, add subjects and topics, track progress, and export your plans without paying or creating an account.",
        },
        {
          question: "What is a study plan and why do I need more than one?",
          answer:
            "A study plan is one group of subjects and topics for one exam, course, or goal. Use separate plans when you are preparing for different exams at the same time, so you can track each one separately and see its own progress and countdown.",
        },
        {
          question: "What does the study plan name field do?",
          answer:
            "The plan name is the label shown on the dashboard card and at the top of the editor. It is the only required text field for the plan. Keep it short and specific so you can find the right plan quickly.",
        },
        {
          question: "What is the plan description for?",
          answer:
            "The description is an optional short sentence about what the plan covers. It appears under the plan name on the dashboard card, which helps you distinguish plans with similar names.",
        },
        {
          question: "What does the exam date do?",
          answer:
            "The exam date is optional. When set, the tracker shows a countdown, colours the plan card based on urgency (red within 7 days, yellow within 21 days, green otherwise), and calculates the number of topics you need to complete per day (or per week) to be ready on time.",
        },
        {
          question: "What is the study pace insight?",
          answer:
            "It is an automatic calculation that tells you how many topics per day (or how many days per topic) you need to average before the exam. It updates every time you add a topic or change a status, so you always have an honest snapshot of how realistic your timeline is.",
        },
        {
          question: "What does the subject name field do?",
          answer:
            "The subject name groups topics within a plan, such as Mathematics, Physics, or History. Each subject has its own progress bar. Subjects with topics but no name are blocked from saving so you do not end up with unnamed groups.",
        },
        {
          question: "What does the topic name field do?",
          answer:
            "The topic name is the chapter or section you want to study. Only named topics are counted toward progress, saving, exporting, and the dashboard totals. Blank topic rows are ignored everywhere so you can safely leave spare rows without inflating your counts.",
        },
        {
          question: "What do the three topic statuses mean?",
          answer:
            "Not Started means you have not begun studying the topic. In Progress means you are currently learning or revising it. Completed means you have finished studying it. Only Completed topics count toward the progress percentage.",
        },
        {
          question: "Can I set priorities for chapters?",
          answer:
            "Yes. Every topic has High, Medium, and Low priority options. Priority does not affect the progress percentage, but High priority topics are always shown in the dashboard’s Today Focus list, even without a target date.",
        },
        {
          question: "Can I add deadlines for individual topics?",
          answer:
            "Yes. Each topic has an optional target date. When the date passes and the topic is not completed, the tracker marks it as overdue on the dashboard and shows a red badge in the plan. The tracker does not send notifications.",
        },
        {
          question: "What is the topic notes field for?",
          answer:
            "Notes are an optional reminder shown in the topic row and searchable from the filter panel. Use them for revision reminders, page numbers, or questions you want to revisit.",
        },
        {
          question: "How is syllabus completion percentage calculated?",
          answer:
            "The tracker divides the number of named topics marked Completed by the total number of named topics in the plan, then multiplies by 100. Blank topic rows are excluded, so your percentage always reflects real work.",
        },
        {
          question: "How does the Today Focus list choose which topics to show?",
          answer:
            "It ranks unfinished topics by urgency: overdue first, then due today, then due within three days, then high priority, then in-progress. It shows the top six so you always have a short, actionable list.",
        },
        {
          question: "What does the “Paste topics” button do?",
          answer:
            "It lets you paste a whole list of topics at once, one per line. Bullets and numbers are stripped automatically, so you can copy straight from your syllabus document without cleaning it up first.",
        },
        {
          question: "What does “Mark all done” do?",
          answer:
            "It sets every named topic in a subject to Completed in a single click. Blank rows are left untouched. You still need to click Save study plan to keep the change.",
        },
        {
          question: "What does the “Hide completed topics” switch do?",
          answer:
            "It hides topics already marked Completed from the search and filter results so you only see what is still left to study. It does not change their status or your progress percentage.",
        },
        {
          question: "What do the Export and Import options do?",
          answer:
            "Export downloads a JSON file of a plan or of every plan (Backup all). Import restores a previously exported file. Imported plans are added as new entries with fresh IDs, so your existing plans are never overwritten.",
        },
        {
          question: "What is the “Export CSV” button for?",
          answer:
            "It downloads a spreadsheet of every named topic in the current plan with its subject, status, priority, target date, and notes. Useful for printing, sharing with a tutor, or importing into other tools.",
        },
        {
          question: "What are XP, levels, and badges?",
          answer:
            "They are small rewards that encourage consistent tracking. You earn XP for creating plans, completing topics, and keeping high-priority topics moving. XP unlocks levels (Freshman through Dean). Badges unlock for specific milestones like your first plan, a 3-day streak, or finishing every topic in a plan.",
        },
        {
          question: "What does the study streak mean?",
          answer:
            "A streak counts how many consecutive days in a row you completed at least one topic (or triggered an activity like milestone completion). It resets if you skip a day, which is a gentle nudge to keep going.",
        },
        {
          question: "What happens if I duplicate a plan?",
          answer:
            "Duplication creates a new plan with the same subjects and topics but with every topic reset to Not Started. Use it for next term or for a slightly different exam.",
        },
        {
          question: "Can I use this tool for competitive exam preparation?",
          answer:
            "Yes. You can organize preparation for competitive exams, entrance tests, school examinations, college courses, and professional learning. Create subjects and add the relevant chapters or topics under each one.",
        },
        {
          question: "Does the tracker save my progress automatically?",
          answer:
            "Yes. Changes are saved in your browser's local storage the moment you click Save study plan. Dashboard-level actions like quick Start / Mark done buttons are saved immediately. Your plans are not synchronized across devices, so export important plans as JSON backups.",
        },
        {
          question: "Can I edit a subject or topic after adding it?",
          answer:
            "Yes. Open the plan and change the subject name, topic name, status, priority, target date, or notes. You can also add and remove subjects and topics at any time.",
        },
        {
          question: "What happens if I close the editor with unsaved changes?",
          answer:
            "The tool shows a confirmation dialog with two options: Leave (discard the changes) or Keep editing. Nothing is saved until you click Save study plan, so you are never surprised by accidental changes.",
        },
        {
          question: "Can I use this tool offline?",
          answer:
            "Once the page is loaded, everything runs in your browser and no server is contacted, so the tracker continues to work even without an internet connection. Your data still lives only in this browser.",
        },
        {
          question: "Is dark mode remembered?",
          answer:
            "Yes. Your choice between light and dark theme is saved in local storage on this device and restored the next time you open the tool.",
        },
        {
          question: "Does this tracker create a study timetable?",
          answer:
            "No. This tool focuses on syllabus organization and completion tracking. It helps you see what is finished and what remains and gives you a daily pace estimate, but it does not automatically create a daily timetable or schedule study sessions.",
        },
      ]}
      note="Your study plans are stored locally in your browser. This tool does not provide cloud synchronization, automatic reminders, or a daily study timetable. Export important plans as JSON files to keep backups."
    />
  );
}