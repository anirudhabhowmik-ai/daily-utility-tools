import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import ExamCountdownTracker from "./ExamCountdownTracker";

export const metadata: Metadata = {
  title: "Exam Countdown Tracker – Free Exam Countdown & Prep Planner | ToolsAB",
  description:
    "A free exam countdown tracker with a live seconds-accurate countdown for every exam. Add subjects, dates, times, locations, prep checklists and study targets. No account needed, works entirely in your browser.",
  alternates: {
    canonical: "/tools/exam-countdown-tracker",
  },
};

export default function ExamCountdownTrackerPage() {
  return (
    <ToolLandingPage
      toolContent={<ExamCountdownTracker />}
      title="Exam Countdown Tracker"
      summary="If you have several exams coming up, it is easy to lose track of which one is first and how much time you have left to prepare. This tool gives you one place to see every exam and exactly how long until each one begins.

To use it, click 'New exam' and fill in six simple things: the exam's name (e.g. 'Biology Unit Test'), the subject (e.g. 'Biology'), the type (Exam, Quiz, Assignment, Practical, Other), the date, the start time, and how much prep time you want to put in before it (e.g. 240 minutes = 4 hours). You can also add a location, seat number, weight, priority, reminder window, notes and a checklist of things to do before the exam.

Once saved, the exam appears on the main screen with a live countdown showing days, hours, minutes and seconds — updating every second while you keep the page open. The next exam is shown in a big hero card at the top so you can't miss it. Every time you study, click the +10m / +15m / +25m / +30m / +50m button on that exam's card and the tool logs it, reducing the remaining prep time you need to do. When the remaining time hits zero, the card shows a green 'Prepared ✓' badge.

Everything saves automatically in your browser. No account, no sign-up, no reminders sent, no data leaves your device."
      highlights={[
        "A big hero card at the top shows your next exam with a live countdown to the second.",
        "Add as many exams, quizzes, assignments or practicals as you want — one card each.",
        "Each exam card shows the countdown in days, hours, minutes and seconds, updating every second.",
        "A color-coded urgency badge tells you at a glance if an exam is Today, Tomorrow, in 3 days, or further away.",
        "The 'Target prep time' field lets you say how much study time you want to put in before an exam.",
        "Log study time with one click using +10m / +15m / +25m / +30m / +50m buttons on each exam card.",
        "The remaining prep time automatically reduces as you log study sessions.",
        "A green 'Prepared ✓' badge appears when you reach your target prep time.",
        "An amber 'Behind prep' warning appears if an exam is within 2 days and your target is not met.",
        "A 'Suggested X min/day' line tells you how many minutes you would need to study each day to hit the target.",
        "Add a checklist of things to prepare — 'Print formula sheet', 'Get a good night's sleep', 'Pack pens' — and tick them off.",
        "A weighted grade field lets you mark important exams (e.g. '40% of final grade') so they stand out.",
        "A calendar view shows the whole month with dots on days that have exams — click any day to filter.",
        "Search any exam by name, subject, room, seat or note.",
        "Sort exams by 'Next up' (chronological), 'Highest weight' (heaviest first) or 'Priority'.",
        "Edit or delete any exam any time — with a one-click Undo for mistakes.",
        "Export your full exam list as JSON or CSV, and re-import it on any device.",
        "Everything saves automatically in your browser. No account or internet connection needed after the page loads.",
      ]}
      steps={[
        "Open the tool. If you have never added an exam before, the screen shows an empty state with a button that says 'Add your first exam'. Click it (or click '+ New exam' at the top-right).",

        "Exam name — type what you will recognise later. This is the big title on the exam card. Good examples: 'Semester 2 Final Examination', 'Biology Unit Test — Chapter 4', 'Midterm Practical'. Avoid just typing 'Biology' here (that goes in the next field) — this field is for the specific exam.",

        "Subject — type the broad class this belongs to, the same way it appears on your timetable. Examples: 'Biology', 'Mathematics', 'History', 'Computer Science'. It shows as a small orange label on the exam card and is searchable.",

        "Type — pick one of five options from the dropdown. 'Exam' is the default for full papers. 'Quiz' is for short tests. 'Assignment' is for take-home work with a submission deadline. 'Practical' is for lab sessions or hands-on assessments. 'Other' is a catch-all for anything else. The type only affects the small icon on the card — it does not change the countdown.",

        "Exam date — pick the date from the calendar. Use the date printed on your official exam schedule, not the day you plan to start revising. Example: if your exam is on 15 March 2026, select that date.",

        "Start time — pick the time the exam actually begins, not the reporting time. If your timetable says 'Report at 8:30, exam starts at 9:00', enter 09:00. The countdown targets the start time.",

        "Duration (minutes) — optional. If the exam runs for a fixed length (e.g. 2 hours), enter 120 here. It shows as '⏱ 2 hr' on the card so you can plan your day around it. Leave blank if you do not know or it does not matter.",

        "Weight (% of grade) — optional but useful. If this exam is worth 40% of your final grade, type 40. It shows as a badge on the card and helps sort exams by importance in 'Highest weight' mode. Leave it blank if you do not know or it is a minor quiz.",

        "Target prep time (minutes) — this is the key field that makes the study tracker work. Enter how many minutes you want to study for this exam before the day. For example, if you want to put in 4 hours of study total, type 240. If you do not want to track prep time, leave it as 0. Once set, every time you log study time on this exam, the remaining prep time reduces.",

        "Location — optional. Type the room, building or exam centre from your timetable. Example: 'Room 204', 'Main Hall', 'Building C, 2nd floor'. Shows as '📍 Room 204' on the card.",

        "Seat / desk — optional. If your school assigns a specific seat number, type it here. Example: 'B-12'. It shows as '🪑 B-12' on the card and is handy on exam day.",

        "Priority — pick High, Medium or Low. This is used only for sorting in the 'Priority' view and for the color stripe down the left of the card (red for High, amber for Medium, grey for Low). It does not affect the countdown. Use High for exams you really cannot miss.",

        "Urgency reminder — pick how many days before the exam you want it to be highlighted. If you pick '7 days', the exam's urgency badge will switch from green (plenty of time) to orange as soon as it is 7 days away. 'Off' disables this. It does not send a notification; it only changes the color of the badge.",

        "Notes — optional free text. Use it for anything you want to remember on the exam day: materials to bring, ID number, allowed calculator model, formula sheet, or last-minute revision topics. It shows as an amber box at the bottom of the exam card.",

        "Click 'Add exam'. The new exam appears in the list immediately, with its live countdown already running. If it is the soonest upcoming exam, it will also appear in the big hero card at the top of the screen.",

        "Add your remaining exams by repeating steps 1–14. There is no limit — add all your quizzes, assignments and practicals for the term if you like.",

        "Once you have your exams listed, look at the hero card at the top. It shows your next exam with a big day counter ring, a full days/hours/minutes/seconds countdown, and — if you set a target prep time — a suggestion like 'suggested 35 min/day for the next 7 days' telling you how much you would need to study each day to hit your target.",

        "When you finish a study session, find that exam's card and click one of the quick buttons: +10m, +15m, +25m, +30m or +50m. The minutes are added to that exam's 'Studied' total and subtracted from the 'remaining prep' amount.",

        "If you studied for a different length of time, click the '+ custom' button. A small prompt asks how many minutes to log. Type any number (e.g. 45) and press OK. You can also type a negative number here (e.g. -20) to correct a mistake if you accidentally over-logged.",

        "Watch the progress bar on the exam card. It fills up as your studied time grows. When it reaches 100%, the card shows a green '🎯 Target reached' state and a 'Prepared ✓' badge appears next to the exam type.",

        "If an exam is less than 2 days away and your target prep time is not met, an amber 'Behind prep' badge appears on the card so you know to prioritise it.",

        "Use the checklist area on each exam card to add small to-dos: 'Print formula sheet', 'Pack ID card', 'Review chapter 4 summary'. Tick items off by clicking the checkbox. The checklist progress bar fills up as you tick items. This is separate from the study-time tracker — one is about tasks, the other is about minutes.",

        "Click the '📅 Calendar' tab to see a month view of all exams. Dots under a day mean there is at least one exam that day. Click any day to filter the list to only exams on that day, then click again (or click 'Clear') to see everything again.",

        "Use the filter tabs at the top to switch between 'Upcoming' (default), 'Past' or 'All' exams. The search box lets you find any exam by name, subject, room, seat or note — just start typing.",

        "Use the sort dropdown to change the order: 'Next up' sorts chronologically (soonest first), 'Highest weight' puts the heaviest-grade exams at the top, and 'Priority' groups by High / Medium / Low.",

        "Click the ✎ pencil icon on any exam card to edit every field — including changing the date or target prep time. Click the 🗑 trash icon to delete the exam. A confirm dialog appears first, and after deletion you get a brief Undo button in the notification bar in case you clicked by mistake.",

        "Open 'Show how it works' at the bottom of the page for a refresher on any of this. Everything is explained there in the same plain language.",

        "Use the 'Export JSON' button at the bottom to download a full backup of all your exams and study logs. The 'Export CSV' button downloads a spreadsheet-friendly version. The 'Import' button loads a JSON backup back into the tracker — useful if you switch browsers or devices.",

        "That is it. Everything saves automatically in your browser. No save button. Close the tab and come back any time — your exams and study logs will still be here. Only clearing your browser's site data will remove them, so export a JSON backup occasionally if you want to keep them forever.",
      ]}
      faqs={[
        {
          question: "What is this exam countdown tracker for?",
          answer:
            "It is a free tool that helps you see exactly how much time is left before each of your exams, quizzes and assignments. You add each exam with its date and time, and the tool shows a live countdown that updates every second. You can also track how much study time you have put in and how much prep is still left.",
        },
        {
          question: "How do I use this tool the first time?",
          answer:
            "Click '+ New exam' (or 'Add your first exam' if the list is empty). Fill in the exam name, subject, date and start time — those four are the only required fields. If you want to track prep progress, also enter a 'Target prep time' in minutes (e.g. 240 for 4 hours). Click 'Add exam'. Repeat for each exam. Then use the +10m / +15m / +25m / +30m / +50m buttons on each card whenever you study.",
        },
        {
          question: "What does the 'Exam name' field mean?",
          answer:
            "It is the title of the specific exam — the big bold text that shows on the exam card. Type something you will immediately recognise later, like 'Semester 2 Final Examination' or 'Biology Unit Test — Chapter 4'. Do not put only the subject here (the next field is for the subject). Be specific enough that future-you knows exactly which exam this is.",
        },
        {
          question: "What does the 'Subject' field mean?",
          answer:
            "It is the broad class this exam belongs to, the way it appears on your school timetable. Examples: 'Biology', 'Mathematics', 'English Literature'. It shows as a small orange label on the exam card and is searchable. Keep it short — one or two words works best.",
        },
        {
          question: "What are the 'Type' options (Exam, Quiz, Assignment, Practical, Other)?",
          answer:
            "They are labels that appear as a small icon on the card so you can tell at a glance what kind of assessment it is. Exam is for full papers. Quiz is for short tests. Assignment is for take-home work with a submission deadline. Practical is for lab sessions or hands-on assessments. Other is a catch-all. The type does not change how the countdown works — it is purely a visual label.",
        },
        {
          question: "What date and time should I enter — the reporting time or the exam start time?",
          answer:
            "Enter the actual exam start time, not the reporting time. If your timetable says 'Report at 8:30, exam starts at 9:00', enter 09:00 in the Start time field. The countdown targets the moment the exam begins.",
        },
        {
          question: "What does the 'Weight (% of grade)' field do?",
          answer:
            "It marks how much this exam is worth toward your final grade. If it is worth 40%, type 40. It shows as a badge on the card and lets you sort exams by 'Highest weight' in the sort dropdown. This is optional — leave it blank if you do not know or it is a minor quiz.",
        },
        {
          question: "What does 'Target prep time' mean, and why would I use it?",
          answer:
            "Target prep time is how many minutes you want to study for this exam before the day. If you plan to put in 4 hours of study, type 240. Once you set a target, every time you log study time on this exam, the remaining prep time reduces. The card shows a progress bar filling up toward your target, and a suggested 'X min/day' line telling you how much you would need to study each day to hit it. If you do not want to track prep, leave it as 0 and the study-tracking features are simply hidden for that exam.",
        },
        {
          question: "How do I log study time?",
          answer:
            "On each exam card, there are quick buttons: +10m, +15m, +25m, +30m and +50m. Click one to log that many minutes. For a custom amount, click '+ custom' and type any number when prompted. If you accidentally logged too much, click the '−5m' button to correct by 5 minutes, or use '+ custom' and enter a negative number (e.g. -20) to reduce the total.",
        },
        {
          question: "What is the '−5m' button for?",
          answer:
            "It subtracts 5 minutes from the exam's studied time. Use it to correct a mis-click, or click it several times to reduce the total further. For larger corrections, use '+ custom' and type a negative number like -30.",
        },
        {
          question: "How do I know when I have studied enough?",
          answer:
            "Watch the progress bar on the exam card. When your studied time reaches your target prep time, the bar fills up and a green '🎯 Target reached' state appears with a 'Prepared ✓' badge next to the exam type. If you have not set a target, the bar is hidden and the tool just shows how many minutes you have logged.",
        },
        {
          question: "What does the 'Behind prep' badge mean?",
          answer:
            "It appears on an exam card when the exam is 2 days away or fewer and your studied time is below your target prep time. It is a gentle reminder to prioritise that exam — not an error. It disappears as soon as you either hit your target or the exam date passes.",
        },
        {
          question: "What does the 'Urgency reminder' dropdown do?",
          answer:
            "It controls when the urgency badge on the exam card changes color. If you set it to '7 days', the badge turns from green to orange as soon as the exam is within 7 days away. If you set it to 'Off', the badge stays green until the last day. It does not send a notification — it only changes the badge color.",
        },
        {
          question: "What is the checklist for?",
          answer:
            "The checklist is a to-do list attached to each exam — items like 'Print formula sheet', 'Pack ID card', 'Review chapter 4 summary', 'Get a good night's sleep'. Type an item in the small input under the checklist, press Add, and it appears with a checkbox. Tick items off as you complete them. The checklist progress bar fills up independently of the study-time tracker — one tracks tasks, the other tracks minutes.",
        },
        {
          question: "How does the calendar view work?",
          answer:
            "Click the '📅 Calendar' tab at the top. You see a full month with today highlighted. Days that have at least one exam show a small orange dot with a number. Click any day to filter the list below to only exams on that day. Click the same day again, or click 'Clear', to see everything again. Use the ← and → buttons to change month.",
        },
        {
          question: "How do I sort or filter my exams?",
          answer:
            "Use the filter tabs at the top: 'Upcoming' (default), 'Past', or 'All'. Use the search box to find any exam by name, subject, room, seat or note — just start typing. Use the sort dropdown to change order: 'Next up' (soonest first), 'Highest weight' (heaviest grade first), or 'Priority' (High / Medium / Low).",
        },
        {
          question: "What happens when an exam date passes?",
          answer:
            "The countdown disappears and the card shows 'Exam has passed'. The exam moves into the 'Past' filter tab but is not deleted — you can still view it, edit it, or delete it. This lets you keep a record of past exams and their study logs.",
        },
        {
          question: "Can I edit or delete an exam after saving it?",
          answer:
            "Yes. Click the ✎ pencil icon on any exam card to reopen the editor with all fields pre-filled. Change anything — name, subject, date, target prep time — and click 'Save changes'. Click the 🗑 trash icon to delete; a confirm dialog appears first, and after deletion a brief 'Undo' button appears in the notification bar in case you clicked by mistake.",
        },
        {
          question: "Where are my exams saved?",
          answer:
            "In your browser's local storage on the device you are using. Everything saves automatically the moment you make a change — there is no save button. The data does not go to a server and is not synced to any cloud account. If you clear your browser's site data, use private browsing, or switch to a different browser or device, your exams will not appear there.",
        },
        {
          question: "Can I back up my data or move it to another device?",
          answer:
            "Yes. Click 'Export JSON' at the bottom of the page to download a full backup file containing all your exams, checklists and study logs. Save that file somewhere safe. On any other device, open the tool and click 'Import', select that file, and everything will be restored. There is also an 'Export CSV' button if you want a spreadsheet-friendly version of the exam list.",
        },
        {
          question: "Will the tool send me reminders or notifications?",
          answer:
            "No. The tracker shows a live countdown while the page is open, and it colour-codes urgency badges based on your reminder setting, but it does not send push notifications, emails or calendar alerts. For actual reminders, set an alarm in your phone or add the exam to your calendar app.",
        },
        {
          question: "Does the countdown work if the page is closed?",
          answer:
            "The countdown only ticks while the page is open. But because it compares the exam's date and time against your device's current clock, it always shows the correct remaining time when you reopen the page — even after being closed for days. You do not need to keep the tab open.",
        },
        {
          question: "Does the tool use my local time zone?",
          answer:
            "Yes. All exam dates and times are interpreted using your device's local time zone. If the countdown does not match what you expect, check your phone or computer's clock and time zone settings — the tool will always trust whatever your device says the current time is.",
        },
        {
          question: "Is this exam countdown tracker free?",
          answer:
            "Yes. Completely free, no account, no sign-up, no ads, no data collection. It runs entirely in your browser and stores your exams only on your own device.",
        },
        {
          question: "Is this the same as my school's official timetable?",
          answer:
            "No. This is a personal organiser that you fill in yourself based on your school's official schedule. Always double-check exam dates, start times, locations and seat numbers against the official schedule from your school, college or examination authority. If they change the date at the last minute, update the tool manually.",
        },
      ]}
      note="Plain-English summary: you type in each exam one by one with its name, subject, date and start time, and the tool shows a live countdown to it. If you set a target prep time (e.g. 240 minutes = 4 hours), you can log study sessions with the +10m / +25m / +50m buttons and the remaining prep time reduces automatically. The next exam appears in a big hero card at the top, all exams show in a list, and a calendar view shows the whole month at a glance. Everything saves automatically in your browser — no account, no cloud, no reminders sent. This is a personal organiser, not an official timetable — always verify dates and times with your school."
    />
  );
}