import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import StudyHabitTracker from "./StudyHabitTracker";

export const metadata: Metadata = {
  title: "Study Habit Tracker – Build Better Study Habits | ToolsAB",
  description:
    "Track your daily study habits, check off completed activities, monitor streaks and review your weekly consistency with this free study habit tracker.",
  alternates: {
    canonical: "/tools/study-habit-tracker",
  },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<StudyHabitTracker />}
      title="Free Study Habit Tracker"
      summary="Good study results often come from small actions repeated consistently. This free study habit tracker helps you create a personal study routine, record completed habits, monitor your streaks and review your progress over time. Add activities such as reading, revising notes or practising questions, then check them off as you complete them. Every button and field is explained below in plain language, so even a first-time user can get started in a minute."
      highlights={[
        "Create and manage your own study habits.",
        "Set a daily target time for each habit.",
        "Choose how often each habit should appear (daily, weekdays, weekends, weekly or specific days).",
        "Give each habit an icon and colour so it is easy to recognise at a glance.",
        "Mark habits as completed for individual dates.",
        "View current and best completion streaks.",
        "Review your consistency across a seven-day week and a full month.",
        "Forgive a missed day to protect a streak without faking a check-in.",
        "Search, filter and sort your habit list.",
        "Export or import a backup, and undo your last change.",
        "Save your tracking history in your browser without creating an account.",
      ]}
      steps={[
        "Open the Add-habit form: Click the “+ New habit” button in the top toolbar. A pop-up form appears with all the fields explained below. You can close it any time with the × button, the Cancel button, or the Escape key.",

        "Habit name (required): Type a short, clear name for the activity you want to do regularly — for example “Read 10 pages”, “Revise biology notes” or “Solve 5 maths problems”. This is the only field you must fill in. The name can be up to 60 characters.",

        "Choose an icon: Pick a small emoji from the icon grid (📚 📖 ✏️ 🎯 🧠 🌱 💡 🔬 🎨 🎵 💪 🧘 📝 🗂️ ⚡ 🏆). The icon appears next to the habit name in your daily list, so you can recognise it quickly.",

        "Choose a colour: Pick one of the eight colour dots. The colour becomes the left border of that habit card, which helps you tell habits apart at a glance. Clicking a colour does not change anything else.",

        "Category: Choose what kind of activity this is — Study, Reading, Practice, Revision, Health or Other. The category appears as a small badge next to the habit name and is used by the “All categories” filter on the Today view.",

        "Target time (minutes): Enter how many minutes you would like to spend on this habit each day. This is a personal goal, not a timer — the tracker does not start or stop any clock. You can enter anything from 1 to 1,440 minutes (24 hours). The Today view adds up these targets so you can see total planned minutes versus completed minutes.",

        "Frequency: Choose how often the habit should appear in your daily checklist. “Every day” shows it every day; “Weekdays” shows it Monday to Friday; “Weekends” shows it Saturday and Sunday; “Once a week” shows it on one weekday you pick; “Specific days” lets you tick any combination of days.",

        "Weekly day (only for “Once a week”): A row of day buttons appears. Click the day of the week you want this habit to appear on. Your choice is highlighted.",

        "Custom days (only for “Specific days”): A row of day buttons appears. Click each day you want to include; click again to remove it. You must select at least one day, otherwise the form will warn you.",

        "Note (optional): Add a short reminder or reason — for example “Before dinner” or “Focus on weak topics”. The note appears under the habit name in your daily list and is searchable. It can be up to 200 characters.",

        "Save the habit: Click “Add habit” (or “Save changes” when editing). The habit is added to your Today checklist and saved in your browser. Click Cancel or × if you change your mind — nothing is saved.",

        "Pick a date (Today view): Use the ← and → arrows beside the date box to step one day back or forward, click the date box to jump to any past date, or click the “Today” button to return to today. Future dates are disabled because you cannot check in ahead of time.",

        "Check off a habit: On the Today view, click the round circle to the left of a habit when you finish it. It turns green with a tick. Click again to undo the check-in. The progress card at the top updates instantly with the number completed, the percentage and the total minutes.",

        "Complete all: If several habits are still pending, the “✓ Complete all” button marks every remaining scheduled habit as done in one click. It is hidden when nothing is left to do.",

        "Filters (All / Pending / Done): These three tabs above the list narrow what you see. “All” shows every scheduled habit; “Pending” shows only ones you have not done yet; “Done” shows only completed ones.",

        "Category filter: The dropdown next to the tabs lets you show only habits from one category (for example only Reading or only Health). Choose “All categories” to see everything again.",

        "Search box: Type any word from a habit name or note to filter the list instantly. Press the / key anywhere on the page to jump straight into the search box.",

        "Sort dropdown: Choose “Newest” to see recently added habits first, “Name A–Z” for alphabetical order, “Highest streak” to put the longest current streak on top, or “Best streak” to sort by the longest streak ever recorded.",

        "Streak badges on each habit: “🔥 N current” is how many consecutive scheduled days you have completed up to the selected date (forgiven days count as protected but not as real check-ins). “🏆 N best” is the longest streak ever recorded for that habit.",

        "Habit action buttons: The ✎ pencil edits the habit (same form as before). The ⏸ pause button archives it — it disappears from your daily checklist but its history is kept, and you can restore it from the “Show archived habits” link. The × deletes the habit and its check-in history after a confirmation prompt.",

        "Week view: Click the “Week” tab to see a bar chart of the current week (Monday to Sunday). Each bar shows how many habits were completed out of how many were scheduled that day, and the percentage. Click any day column to jump back to that day in the Today view.",

        "Month view: Click the “Month” tab to see a calendar of the selected month. Days are highlighted green when every scheduled habit was completed. Use the ← and → buttons to change month. Click any day to open it in the Today view.",

        "Insights view: Click the “Insights” tab to see four summary cards — your 30-day real completion rate, your number of perfect days, your strongest weekday, and your total real check-ins (forgiven days are excluded). Below them is a ranked list of habits by completion rate over the last 30 days, plus a form to forgive a missed day.",

        "Forgive a missed day: In the Insights tab, open the “Forgive a missed day” card. Pick a habit, pick a past date, and click “Forgive missed day”. The day is marked as forgiven, which protects a streak, but it is not counted as a real check-in in any rate.",

        "Show or hide archived habits: If you have archived habits, a small “Show archived habits (N)” button appears under the date bar. Click it to reveal the list; click “Restore” beside any habit to bring it back into your daily checklist.",

        "Backup and restore: At the bottom of the page, “Export JSON” downloads a full backup file you can keep or move to another browser. “Export CSV” downloads a spreadsheet-friendly summary of your habits and streaks. “Import backup” lets you restore a previously exported JSON file — this replaces your current tracker, so you will be asked to confirm.",

        "Undo: The “↶ Undo” button at the bottom reverses your last change (adding, editing, deleting, checking in, forgiving, importing or resetting). The same Undo link also appears inside the green confirmation message. Only the most recent action can be undone.",

        "Keyboard shortcuts (optional): Press N anywhere (outside a text field) to open the New habit form, press / to focus the search box, and press T to jump back to today’s date.",
      ]}
      faqs={[
        {
          question: "What is a study habit tracker?",
          answer:
            "A study habit tracker is a simple way to record learning activities you want to do regularly. You can use it to monitor routines such as reading, revision, vocabulary practice, note-taking and solving questions. Checking off each activity helps you see how consistently you follow your study routine.",
        },
        {
          question: "How do I create a study habit?",
          answer:
            "Click “+ New habit”, type a short name such as “Read 20 minutes”, set a target time in minutes, pick an icon, colour, category and frequency, then click “Add habit”. The habit appears in your Today checklist immediately.",
        },
        {
          question: "What does the habit name field do?",
          answer:
            "The habit name is the label shown in your daily list and in all reports. It is the only required field and can be up to 60 characters. Keep it short and specific, like “Revise chemistry notes”, so it is easy to scan.",
        },
        {
          question: "What is the icon for?",
          answer:
            "The icon is a small emoji shown next to the habit name. It is purely visual — it helps you recognise habits at a glance, especially when you have several of them.",
        },
        {
          question: "What is the colour for?",
          answer:
            "The colour becomes the left border of that habit’s card. It is purely visual, useful for grouping similar habits (for example all reading habits in blue).",
        },
        {
          question: "What are the habit categories for?",
          answer:
            "Categories (Study, Reading, Practice, Revision, Health, Other) label each habit and power the “All categories” filter on the Today view. They do not change any calculation.",
        },
        {
          question: "What does target time mean?",
          answer:
            "Target time is your personal goal in minutes for that habit each day. The tracker does not time you. It simply adds up the targets of scheduled habits so you can see planned minutes versus completed minutes on the Today view.",
        },
        {
          question: "What do the frequency options mean?",
          answer:
            "“Every day” schedules the habit every day. “Weekdays” schedules Monday to Friday. “Weekends” schedules Saturday and Sunday. “Once a week” schedules it on one weekday you choose. “Specific days” lets you tick any combination of days. Only scheduled days count toward streaks and completion rates.",
        },
        {
          question: "What is the weekly day picker for?",
          answer:
            "It only appears when you choose “Once a week”. Click the day you want the habit to appear on. That day becomes the habit’s anchor day for streak calculations.",
        },
        {
          question: "What are custom days for?",
          answer:
            "They only appear when you choose “Specific days”. Tick every weekday you want the habit to appear on (for example Monday, Wednesday and Friday). You must pick at least one.",
        },
        {
          question: "What is the note field for?",
          answer:
            "The note is an optional short reminder or reason shown under the habit name. It is searchable, so you can use the search box to find habits by keyword from the note.",
        },
        {
          question: "What do the All, Pending and Done filters do?",
          answer:
            "They narrow the Today list. “All” shows every scheduled habit, “Pending” shows only ones you have not checked off yet, and “Done” shows only completed ones. They do not affect your stats.",
        },
        {
          question: "What does the category filter do?",
          answer:
            "It shows only habits from the category you pick. Choose “All categories” to see everything again.",
        },
        {
          question: "What does the search box do?",
          answer:
            "It filters the habit list by text match against the habit name and note. Press / anywhere outside a text field to focus it quickly.",
        },
        {
          question: "What does the sort dropdown do?",
          answer:
            "It controls the order of habits in the list: newest first, alphabetical, highest current streak, or best recorded streak.",
        },
        {
          question: "How are study streaks calculated?",
          answer:
            "A streak counts consecutive scheduled days on which you marked a habit as completed (or forgave it). Non-scheduled days are skipped. If you miss a scheduled day that is neither completed nor forgiven, the streak resets. The best streak is the longest run ever recorded.",
        },
        {
          question: "What does “forgive a missed day” do?",
          answer:
            "It marks a past scheduled day as protected without pretending you studied. Forgiven days preserve your streak but are excluded from completion rates, perfect days and total check-ins. Use it for genuine exceptions like illness or travel.",
        },
        {
          question: "What do the Week, Month and Insights tabs show?",
          answer:
            "Week shows a bar chart of completion for Monday to Sunday. Month shows a calendar with completed days highlighted. Insights shows 30-day rates, perfect days, your strongest weekday, total real check-ins, a habit ranking, and the forgive tool.",
        },
        {
          question: "What do the pencil, pause and × buttons on a habit do?",
          answer:
            "Pencil edits the habit, pause archives it (hidden from the daily list but kept, restorable from “Show archived habits”), and × deletes it and its history after a confirmation prompt.",
        },
        {
          question: "Can I track different subjects?",
          answer:
            "Yes. Create separate habits for different subjects or activities — for example English reading, mathematics practice, science revision and programming exercises as individual habits.",
        },
        {
          question: "Does the tracker measure my actual study time?",
          answer:
            "No. The target time is a goal you enter yourself. The tracker records whether you completed a habit; it does not run a timer or measure how long you actually studied.",
        },
        {
          question: "Can I view my previous study progress?",
          answer:
            "Yes. Use the ← arrow or the date box to open any past date and see which habits you marked. The Week and Month tabs also let you click any day to jump to it.",
        },
        {
          question: "What do Export JSON, Export CSV and Import backup do?",
          answer:
            "Export JSON downloads a complete backup of your habits and history. Export CSV downloads a spreadsheet-friendly summary. Import backup restores a previously exported JSON file and replaces your current tracker after confirmation.",
        },
        {
          question: "What does Undo do?",
          answer:
            "Undo reverses your most recent change — adding, editing, deleting, checking in, forgiving, importing or resetting. Only one step can be undone at a time.",
        },
        {
          question: "Are there keyboard shortcuts?",
          answer:
            "Yes. Press N to open the New habit form, / to focus the search box, and T to jump back to today. Shortcuts are ignored while you are typing in a field or while the pop-up form is open.",
        },
        {
          question: "Where is my study habit data saved?",
          answer:
            "Your habits and daily check-ins are stored in your browser’s local storage on your current device. There is no account or cloud synchronization. Clearing browser data or switching devices may make your saved history unavailable, so export a backup if you want to keep a copy.",
        },
        {
          question: "Is this study habit tracker free?",
          answer:
            "Yes. You can add habits, record daily check-ins, view streaks and review weekly consistency without paying or creating an account.",
        },
      ]}
      note="This tracker is a personal organization tool, not an automatic study timer or a substitute for a formal learning plan. Check-ins are entered manually, and your data stays in the browser storage on your device. Forgiven days protect streaks but do not count as real check-ins in any statistic."
    />
  );
}