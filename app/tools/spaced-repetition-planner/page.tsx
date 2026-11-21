import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import SpacedRepetitionPlanner from "./SpacedRepetitionPlanner";

export const metadata: Metadata = {
  title: "Free Spaced Repetition Planner | ToolsAB",
  description:
    "Plan study revisions with a free spaced repetition planner. Schedule review sessions, track completed revisions, and organize learning topics.",
  alternates: {
    canonical: "/tools/spaced-repetition-planner",
  },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<SpacedRepetitionPlanner />}
      title="Free Spaced Repetition Planner"
      summary="Organize your study topics and plan when to review them. Add a topic, choose when you first learned it, and the planner creates a revision schedule for you. Every field and button is explained below in plain language, so even a first-time user can get started in a minute."
      highlights={[
        "Automatically create revision sessions at 1, 3, 7, 14, 30, and 60 days.",
        "Adjust the schedule with Easy, Medium or Hard difficulty scaling.",
        "Customise the revision intervals for each topic if you prefer.",
        "See which revisions are due today or overdue at a glance.",
        "Rate each review as Again, Hard, Good or Easy to track retention.",
        "Track completed sessions, on-time performance and overall learning progress.",
        "Organize topics by subject, search, filter and sort your learning list.",
        "Save your topics in your browser, export a backup, and undo your last change.",
      ]}
      steps={[
        "Add a new topic: Click the “+ Add topic” button at the top right. A pop-up form appears with every field explained below. You can close it at any time with the × button, the Cancel button, or the Escape key.",

        "Topic name (required): Type a short, clear title for what you are learning — for example “Photosynthesis”, “Past simple tense” or “Binary search algorithm”. This is the only field you must fill in. The name can be up to 120 characters and appears everywhere the topic is listed.",

        "Subject: Choose the subject this topic belongs to — General, Mathematics, Science, History, Language, Programming, Exam Preparation or Other. The subject is shown as a small badge on the topic card and powers the “All subjects” filter in your learning list. It does not change any calculation.",

        "Difficulty: Pick Easy, Medium or Hard. This scales the revision intervals so the planner matches how hard the topic feels to you: Easy stretches intervals by ×1.5 (fewer reviews, spread further apart), Medium keeps the standard schedule, and Hard shortens intervals by ×0.6 (more frequent reviews). The effect is shown live in the “Your revision schedule” preview below.",

        "Date first learned (required when creating a topic): Pick the date you first studied this material. Every revision date is calculated from this day. The picker does not allow future dates, because you cannot schedule reviews for something you have not learned yet. This field is hidden when you edit an existing topic so that your revision history is preserved.",

        "Notes (optional): Add a short reminder or description — for example “Focus on the light-dependent reactions” or “Chapter 4, pages 82–96”. Notes appear under the topic name on the card and are searchable. They can be up to 2,000 characters.",

        "Revision intervals (days after learning): This is the heart of the planner. By default you get six intervals — Day 1, Day 3, Day 7, Day 14, Day 30 and Day 60 — measured in days after the learning date. You can change any number in the list, remove an interval with the × button (at least one must remain), add a new one with “+ Add interval”, or restore the defaults with “Reset to defaults”. The intervals are always sorted from smallest to largest, and the difficulty multiplier is applied on top of them.",

        "Schedule preview: At the bottom of the form, the “Your revision schedule” box shows the final list of dates the planner will create, including the difficulty scaling. Check this before saving — it is exactly what will appear on the topic card after you click Create schedule.",

        "Save the topic: Click “Create schedule” (or “Save changes” when editing). The topic is added to your list with all its revision sessions, and your data is saved in your browser. Click Cancel or × if you change your mind — nothing is saved. If you edit a topic and do not change the intervals or difficulty, your existing check-ins are kept.",

        "Statistics row at the top: Four cards summarise your planner at a glance. “Total topics” counts your topics, “Due today” counts revision sessions scheduled for today, “Overdue revisions” counts unfinished sessions whose date has already passed, and “Completed revisions” counts every session you have marked done.",

        "Overall revision progress: The progress bar shows the percentage of all revision sessions you have completed across every topic. Below it, “Complete all due today” marks every session scheduled for today as done in one click, and “Show analytics” opens a detailed panel.",

        "Analytics panel (optional): When you click “Show analytics”, you see four summary numbers — on-time completions (finished on or before the due date), late completions, your retention score (share of reviews you rated Good or Easy), and the average number of days late. Below those, a rating breakdown shows how many reviews you gave each rating, and a “By subject” section shows completion progress for each subject.",

        "Today's revision sessions: This card lists every revision session scheduled for today, grouped by topic. Each row shows the topic name, subject and interval (for example “Day 7 revision”). To record a review, click one of the four rating buttons — Again, Hard, Good or Easy. Rating a session automatically marks it as completed and feeds your retention score.",

        "Search box: Type any word from a topic name, subject or note to filter the list instantly. Press the / key anywhere outside a text field to jump straight into the search box.",

        "Subject filter: Use the “All subjects” dropdown to show only topics from one subject. Choose “All subjects” again to see everything.",

        "Sort dropdown: Choose the order of the topic list. “Next due date” puts the topic with the nearest upcoming revision on top (default). “Newest created” shows recently added topics first. “Title A–Z” sorts alphabetically. “Most progress” puts topics you have completed most of at the top. “Most overdue” puts topics with the most overdue sessions first.",

        "Filter tabs: The row of pill buttons under the controls narrows which topics are shown. “All topics” shows everything, “Due today” shows only topics with at least one session due today, “Overdue” shows topics with at least one session past its date, “Upcoming” shows topics with future sessions, and “Completed” shows only topics where every session is finished. Filters and search combine, so you can, for example, search “chapter 4” and filter by “Overdue”.",

        "Topic card: Each topic is shown as a card with a subject badge, difficulty badge, title, learning date, notes and action buttons. The coloured badges help you tell Easy, Medium and Hard topics apart at a glance.",

        "Topic action buttons: “Edit” reopens the form so you can change the name, subject, notes, difficulty or intervals. “Delete” permanently removes the topic and its revision history after a confirmation prompt.",

        "Progress bar on a topic: Shows how many of that topic's revision sessions you have completed (for example “3/6 revisions completed · 50%”).",

        "Next revision line: The grey strip under the progress bar shows the date of the next unfinished session, with a red “Overdue” tag if it is past due or a green “Today” tag if it is due today. When every session is finished, it reads “All revision sessions completed”.",

        "Revision session cards: The grid below shows each revision session for the topic. Each card displays the interval (“Day 7”), the status (Completed, Overdue, Due today, or a relative phrase like “In 4 days”), the due date, and two buttons: “Mark done” (or “Undo” if already completed) and “+1 day” to postpone an unfinished session by one day. Completed sessions with a rating show the rating in the status line (for example “Completed (good)”); click “Undo” to remove a completion.",

        "“+1 day” postponement: Moves an unfinished session one day later. If the original date is already in the past, the new date is calculated from today, so postponing an overdue session always moves it forward rather than keeping it in the past.",

        "Undo: The “↶ Undo” button at the bottom, the Undo link inside the toast, and the U keyboard shortcut all reverse your most recent change (add, edit, delete, toggle, rate, postpone, import or reset). Only the latest action can be undone.",

        "How does spaced repetition work? section: Click this bar to expand a short explanation of spaced repetition and the default 1/3/7/14/30/60-day schedule, including what the difficulty multiplier does and how ratings feed the retention score.",

        "Backup and restore: At the bottom of the page, “Export backup” downloads a full JSON file of your topics and revision history that you can keep or move to another browser. “Import backup” lets you restore a previously exported JSON file — this replaces your current planner, so you will be asked to confirm. “Clear planner” deletes all topics and history after a confirmation prompt.",

        "Keyboard shortcuts (optional): Press N anywhere outside a text field to open the Add-topic form, press / to focus the search box, and press U to undo the last change. Shortcuts are ignored while a text field is focused or while the pop-up form is open.",
      ]}
      faqs={[
        {
          question: "What is spaced repetition?",
          answer:
            "Spaced repetition is a learning technique that involves reviewing information at planned intervals. Instead of studying the same material repeatedly in one sitting, you return to it over time to help strengthen your memory.",
        },
        {
          question: "How do I add a topic?",
          answer:
            "Click “+ Add topic”, type a topic name, pick a subject, difficulty and learning date, and click “Create schedule”. The planner generates revision sessions for you automatically. Only the topic name and learning date are required.",
        },
        {
          question: "What is the topic name field for?",
          answer:
            "The topic name is the title shown on the topic card and in every list. It is the only required text field and can be up to 120 characters. Keep it short and specific, like “Photosynthesis” or “Binary search”, so it is easy to scan.",
        },
        {
          question: "What does the subject field do?",
          answer:
            "Subject groups your topics (Mathematics, Science, History, Language, Programming, Exam Preparation, Other). It is shown as a badge on each topic card and powers the subject filter. It does not change any calculation.",
        },
        {
          question: "What does the difficulty setting do?",
          answer:
            "Difficulty scales the revision intervals. Easy multiplies intervals by 1.5 (fewer, more spaced-out reviews), Medium keeps the standard schedule, and Hard multiplies by 0.6 (more frequent reviews). The schedule preview updates live so you can see the effect before saving.",
        },
        {
          question: "What is the learning date for?",
          answer:
            "The learning date is the day you first studied the topic. Every revision date is calculated from it. Future dates are not allowed. When you edit a topic, this field is hidden so your existing revision history is not disturbed.",
        },
        {
          question: "What is the notes field for?",
          answer:
            "Notes are an optional reminder or description shown under the topic name. They are searchable, so you can use the search box to find topics by keyword. The limit is 2,000 characters.",
        },
        {
          question: "How are revision dates calculated?",
          answer:
            "By default the planner uses six intervals — 1, 3, 7, 14, 30 and 60 days after the learning date. You can customise these per topic, and the difficulty multiplier is applied on top. The schedule preview in the form shows the final dates before you save.",
        },
        {
          question: "Can I customise the revision intervals?",
          answer:
            "Yes. In the Add/Edit form you can change any interval, remove one with ×, add a new one with “+ Add interval”, or restore the defaults with “Reset to defaults”. At least one interval must remain, and the list is always sorted from smallest to largest.",
        },
        {
          question: "Can I change a revision date?",
          answer:
            "Yes. Click “+1 day” on an unfinished revision to move its date one day later. If the original date is already in the past, the new date is calculated from today.",
        },
        {
          question: "What do the rating buttons Again / Hard / Good / Easy do?",
          answer:
            "They mark a revision as completed and record how well you remembered the material. Good and Easy count as successful recall in the retention score; Again and Hard count as weaker recall. You can undo a rating at any time.",
        },
        {
          question: "What do the four statistics cards show?",
          answer:
            "Total topics counts your topics, Due today counts revision sessions scheduled for today, Overdue revisions counts unfinished sessions whose date has passed, and Completed revisions counts every session you have marked done.",
        },
        {
          question: "What does the analytics panel show?",
          answer:
            "It shows on-time vs late completions, your retention score (share of Good/Easy ratings), average days late, a breakdown by rating, and per-subject completion progress.",
        },
        {
          question: "What do the All / Due today / Overdue / Upcoming / Completed filters do?",
          answer:
            "They narrow the topic list. “All topics” shows everything, “Due today” shows topics with a session due today, “Overdue” shows topics with at least one past-due session, “Upcoming” shows topics with future sessions, and “Completed” shows only fully finished topics. Filters combine with search and the subject filter.",
        },
        {
          question: "What does the sort dropdown do?",
          answer:
            "It orders the topic list by next due date, newest created, title A–Z, most progress, or most overdue sessions.",
        },
        {
          question: "What does the search box do?",
          answer:
            "It filters topics by text match against the title, subject or notes. Press / anywhere outside a text field to focus it quickly.",
        },
        {
          question: "What do the Edit and Delete buttons on a topic do?",
          answer:
            "Edit reopens the form so you can change the name, subject, notes, difficulty or intervals while keeping your check-ins (unless you change intervals or difficulty). Delete permanently removes the topic and its revision history after confirmation.",
        },
        {
          question: "What does “+1 day” do?",
          answer:
            "It postpones an unfinished revision by one day. If the session is already overdue, the new date is calculated from today, so it always moves forward.",
        },
        {
          question: "What happens if I miss a revision?",
          answer:
            "The planner marks an unfinished session as overdue once its date has passed. You can still mark it complete, rate it, or postpone it by one day. Overdue sessions appear in the “Overdue” filter and the “Overdue revisions” statistic.",
        },
        {
          question: "What does Undo do?",
          answer:
            "Undo reverses your most recent change — adding, editing, deleting, marking done, rating, postponing, importing or resetting. Only one step can be undone at a time. Use the button, the link in the toast, or press U.",
        },
        {
          question: "Can I use this planner for different subjects?",
          answer:
            "Yes. Use the Subject field to group topics under Mathematics, Science, History, Language, Programming, Exam Preparation or Other, and filter by subject in the topic list.",
        },
        {
          question: "What do the backup buttons do?",
          answer:
            "“Export backup” downloads a JSON file containing your topics and revision history. “Import backup” restores a previously exported file and replaces your current planner after confirmation. “Clear planner” deletes all topics and history after confirmation.",
        },
        {
          question: "Are there keyboard shortcuts?",
          answer:
            "Yes. Press N to open the Add-topic form, / to focus the search box, and U to undo the last change. Shortcuts are ignored while typing in a field or while the pop-up form is open.",
        },
        {
          question: "Where is my study data saved?",
          answer:
            "Your topics and revision history are saved in your browser's local storage. They are not automatically synchronized between devices. Export a JSON backup if you want to keep a separate copy.",
        },
      ]}
      note="The revision intervals are general suggestions, not a guaranteed learning formula. Adjust your study schedule according to your memory, subject and learning goals. Forgiven sessions do not exist in this planner — every completion is real — and your data stays in the browser storage on your device."
    />
  );
}