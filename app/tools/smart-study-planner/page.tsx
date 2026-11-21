import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import SmartStudyPlanner from "./SmartStudyPlanner";

export const metadata: Metadata = {
  title: "Smart Study Planner – Free Daily Study Schedule & Task Organizer | ToolsAB",
  description:
    "A free study planner that helps you organize subjects, set deadlines, prioritize tasks and build a realistic daily study schedule. Works entirely in your browser, no account needed.",
  alternates: { canonical: "/tools/smart-study-planner" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<SmartStudyPlanner />}
      title="Smart Study Planner"
      summary="If you have several subjects, assignments and exams competing for your attention, it is hard to know what to study first. This tool helps you list everything you need to do, then automatically builds a realistic daily study plan based on how much time you actually have.

To use it, you add a task for each piece of work you need to finish — one task for 'Chapter 4 revision', another for 'Physics assignment', and so on. For each task you fill in five simple fields: the subject name, the topic or task description, an optional deadline, an estimated number of minutes, and a priority level (High, Medium or Low). When you click Add, the task appears in your list. Then you tell the planner how many minutes you can study today, and it fills that time with the highest-priority, most-urgent unfinished tasks.

Everything is saved in your browser automatically. There is no account, no sign-up, no AI and no data leaves your device."
      highlights={[
        "Add one task per piece of work — a chapter, an assignment, a revision session, an exam prep block.",
        "The Subject box is the broad category: 'Mathematics', 'Biology', 'History'.",
        "The Topic / task box is the specific work: 'Algebra practice', 'Chapter 4 revision', 'Essay draft'.",
        "The Deadline box is optional — leave it blank for tasks with no fixed due date.",
        "The Study time box is your own estimate in minutes (5–1,440). A short revision might be 30; a full assignment might be 120.",
        "The Priority box tells the planner what matters most — High for exams and urgent work, Medium for routine, Low for 'when I get to it'.",
        "Tasks are automatically ranked by priority and deadline, so urgent work floats to the top.",
        "The planner never schedules more than the daily minutes you set.",
        "You can change your daily study allowance any time — the plan recalculates instantly.",
        "Mark each task as Pending, In progress or Completed as you go.",
        "See how much time is planned, how much is left over, and how much estimated work remains.",
        "Overdue tasks are highlighted so you can decide to catch up or reschedule.",
        "Filter your task list by status to focus on what is left.",
        "Everything saves automatically in your browser — no Save button needed.",
        "Works without an account, internet connection after first load, or any external API.",
      ]}
      steps={[
        "Start in the 'Add a study task' section. Each task represents one piece of work you want to complete. Think of it as a sticky note: one task per chapter, one per assignment, one per revision session.",

        "Subject — type the broad category this work belongs to. This is how you would name the class on your timetable. Examples: 'Mathematics', 'Biology', 'History', 'English Literature', 'Computer Science'. You will see this label on every task card later, so keep it short (usually one or two words).",

        "Topic / task — type the specific piece of work inside that subject. This is the detail that makes the task useful. Instead of typing 'Maths' here (that is the subject), type 'Algebra practice — questions 1 to 20' or 'Chapter 5 reading'. The topic is what shows as the big title on each task card, so be specific enough that future-you knows exactly what to do.",

        "Deadline (optional) — if this task has a fixed date it must be finished by, pick it from the calendar. Leave it blank for open-ended work like 'review vocabulary' or 'read one chapter of anything'. Tasks with a deadline get a boost in the automatic ranking — the closer the deadline, the higher they climb. Tasks without a deadline still appear in the plan, just without that urgency boost.",

        "Estimated study time (minutes) — type how many minutes you think this task will realistically take. This is your own estimate, not a countdown timer. Use 30 for a quick revision session, 60 for a normal study block, 120+ for a longer assignment. The allowed range is 5 to 1,440 minutes (that is 24 hours, the maximum any single task can consume). Be honest here — underestimating makes the plan overload the day, overestimating wastes the daily budget on tasks you could finish faster.",

        "Priority — pick High, Medium or Low. This tells the planner how important the task is relative to others. Choose High for exams, submissions and anything time-critical. Choose Medium for routine homework and steady progress. Choose Low for optional reading and tasks that can slide without consequence. Priority is the single biggest factor in the ranking, so do not mark everything High — that defeats the point.",

        "Click 'Add study task'. The task appears at the top of 'My study tasks' and joins the pool the planner considers. Repeat this for every piece of work you have. You can add as many as you like — the planner will handle the ranking.",

        "Scroll down to 'Smart daily study plan'. The first field is 'Plan date'. This is the reference date the planner uses when calculating how many days are left until each task's deadline. Leave it on today for normal use. Change it if you want to preview what the plan would look like tomorrow or next week.",

        "The next field is 'Available study time per day'. Pick how many minutes you can realistically commit today. The dropdown ranges from 30 minutes to 12 hours. This is a hard limit — the planner will never allocate more than this. Pick a number you can actually follow through on; an overly ambitious 8-hour plan that you abandon at hour two is worse than an honest 2-hour plan you complete.",

        "Look at 'Recommended task order'. This is your personalized plan for the date and time you just set. Tasks are ranked by their combined priority score and deadline urgency. High-priority tasks with close deadlines appear first. Each row shows the task name, the subject, and how many minutes the planner has allocated to it.",

        "Notice the number beside each task — that is the allocated time. If a task needs more minutes than the remaining daily budget, the planner gives it whatever is left and shows 'X min left after this plan' in amber. That is your cue that you cannot finish the task in one session — you will need to continue it tomorrow.",

        "Check 'Available time', 'Planned time' and 'Free time remaining'. Available is what you said you had. Planned is how much the planner has allocated to tasks. Free time remaining is what is left over — usually 0 if you have enough tasks, or a positive number if you have nothing left to schedule.",

        "The 'Daily time allocation' progress bar shows the same thing visually. 100% means every minute of your allowance is filled. Anything less than 100% means you have unused study time and could add more tasks.",

        "When you start studying, go to 'My study tasks'. Find the task and change its status dropdown. Pending means 'not started yet'. In progress means 'I am working on it right now'. Completed means 'done — stop showing this in future plans'. The planner removes Completed tasks from the recommended order immediately.",

        "Use the filter dropdown above the task list to show only Pending, only In progress, only Completed, or everything. This helps when you have many tasks and only want to see what is left.",

        "If you no longer need a task — maybe you dropped the subject, or you finished it out of order — click 'Delete task'. It disappears from the list and from future plans.",

        "The 'Study progress' section at the bottom adds everything up: total estimated minutes across all tasks, the portion that is already Completed, and the remaining portion still outstanding. This is useful for seeing how much work is left in the term.",

        "The dashboard at the top shows four numbers at a glance: total tasks, completed, remaining and overdue. Overdue means the deadline has passed and you have not marked the task Completed. Overdue tasks are flagged in red so you can decide to catch up or push the deadline back.",

        "That is it — everything saves automatically. Add tasks as new work appears, update statuses as you finish them, and check the plan each morning to see what to do that day. There is no save button because there is nothing to save — the browser stores your data the moment you type it.",
      ]}
      faqs={[
        {
          question: "What is a smart study planner?",
          answer:
            "It is a free tool that helps you organize everything you need to study and figure out what to work on first. You add each piece of work as a task, give it a subject, a topic, an optional deadline, an estimated time and a priority, and the planner decides which tasks to do today based on what matters most and what is due soonest.",
        },
        {
          question: "How do I use this planner for the first time?",
          answer:
            "Start by adding 3–5 tasks. For each one, type a subject (e.g. 'Mathematics'), a specific topic (e.g. 'Algebra practice'), an estimated number of minutes (e.g. 60) and pick a priority (start with Medium for most tasks, High for anything with a deadline this week). Leave the deadline blank if there is none. Once you have a few tasks, scroll to 'Smart daily study plan', set your daily study time (e.g. 120 minutes), and the recommended order appears automatically.",
        },
        {
          question: "What exactly should I type in the Subject field?",
          answer:
            "The broad category the task belongs to. This is the name you would see on a school timetable. Common examples: 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'English', 'History', 'Computer Science', 'Economics'. You can type anything — for self-study you might use 'Spanish', 'Python', or 'Guitar practice'. The subject becomes a small colored label on each task card, so keep it short (one or two words works best).",
        },
        {
          question: "What exactly should I type in the Topic / task field?",
          answer:
            "The specific piece of work — the thing you will actually do when you sit down to study. Good examples: 'Chapter 4 revision', 'Questions 1–20 from the textbook', 'Write essay outline', 'Memorize 50 vocabulary words', 'Watch lecture 3 and take notes'. Avoid vague entries like 'Maths' or 'Study' — this field is the big title on every task card, so make it specific enough that your future self knows exactly what is involved.",
        },
        {
          question: "What does the Deadline field do, and do I have to fill it in?",
          answer:
            "The deadline is entirely optional. Fill it in when the task has a real due date — an assignment submission, an exam date, a chapter you must finish before the next class. Leave it blank when there is no fixed date, like 'read a chapter of anything' or 'review old notes'. Tasks with a deadline that is close rise in the automatic ranking, so the planner will surface them before tasks with no deadline or a far-off one. Tasks without a deadline are still scheduled — they just do not get the urgency boost.",
        },
        {
          question: "How should I estimate study time in minutes?",
          answer:
            "Type your honest guess of how long the task will take. Short revision or a quick read: 15–30 minutes. A normal homework session: 45–60 minutes. A full assignment, essay or long chapter: 90–180 minutes. The allowed range is 5 to 1,440 minutes. Be realistic — underestimating makes the planner overload your day, overestimating wastes your daily allowance. If you are unsure, add an extra 25–50% as a buffer; studying usually takes longer than we think.",
        },
        {
          question: "What do High, Medium and Low priority actually mean?",
          answer:
            "Priority tells the planner how important each task is relative to the others. High should be reserved for exams, submissions and anything with a real consequence if missed. Medium is your normal homework and steady progress. Low is optional reading and tasks that can slide without harm. The planner adds a fixed score for each level (High = 30, Medium = 20, Low = 10), so a High task will usually appear before a Medium task unless the deadline difference is very large. Do not mark everything High — if everything is urgent, nothing is.",
        },
        {
          question: "How does the automatic ranking actually work?",
          answer:
            "Every unfinished task gets a score. The base score comes from priority (High 30, Medium 20, Low 10). Then a deadline urgency bonus is added — the closer the deadline, the higher the bonus. Tasks with an overdue deadline get the biggest bonus so they surface first. Pinned tasks get a large boost (+100). Daily recurring tasks get a small boost so they appear every day. The planner sorts by score, then by earliest deadline, then by the order you added the tasks. It then allocates your daily minutes to tasks in that order.",
        },
        {
          question: "What does 'Plan date' do — should I change it?",
          answer:
            "Plan date is the reference date the planner uses when calculating 'how many days until each task's deadline'. Leave it on today for normal daily planning. Change it if you want to preview how the plan would look tomorrow or next week — for example, to see what tasks would come up on a busier day. Changing the plan date does not change your tasks; it only changes the preview.",
        },
        {
          question: "Why is the planner showing fewer tasks than I added?",
          answer:
            "Two common reasons. First, tasks marked Completed are excluded from the plan — they are done, so they do not need scheduling. Second, the planner stops allocating once your daily study time is used up. If you added 8 hours of work but set your daily allowance to 2 hours, only 2 hours of tasks will be scheduled. Increase the daily time or mark some tasks Completed to see more.",
        },
        {
          question: "What does 'min left after this plan' in amber mean?",
          answer:
            "It means the task needs more minutes than the planner could allocate today. For example, if a task needs 90 minutes but only 30 are left in your daily allowance, the planner schedules 30 minutes and shows '60 min left after this plan'. That is a signal that you will need to continue this task tomorrow, or that you should increase today's study time if you really need to finish it.",
        },
        {
          question: "What is the difference between Pending, In progress and Completed?",
          answer:
            "Pending means you have not started the task. In progress means you are actively working on it right now. Completed means you have finished it. Only Pending and In progress tasks are scheduled by the planner — Completed tasks are removed from the plan automatically. When you switch a task to Completed, the planner recalculates and may show different tasks next.",
        },
        {
          question: "Why does the dashboard say I have overdue tasks?",
          answer:
            "A task is marked overdue when its deadline has passed but you have not marked it Completed. The dashboard counts these so they do not silently disappear. Overdue tasks get the highest urgency score, so the planner will schedule them first. You can catch up by marking them Completed, or you can change the deadline to a later date if the original date is no longer realistic.",
        },
        {
          question: "How is the 'Overall task completion' percentage calculated?",
          answer:
            "It is completed tasks divided by total tasks, times 100. Every task counts equally — a 5-minute revision session counts the same as a 3-hour assignment. This measures how many tasks you have finished, not how much study time you have done. If you want to see time-based progress, look at the 'Study progress' section which shows estimated minutes completed vs remaining.",
        },
        {
          question: "Can I edit a task after adding it?",
          answer:
            "Yes. On each task card, click the pencil icon (✎) to reopen the editor with all fields pre-filled. Change anything — subject, topic, deadline, minutes, priority, recurrence, notes or tags — and click 'Save changes'. Your previous version is stored in the undo buffer, so you can click 'Undo' to revert if you change your mind.",
        },
        {
          question: "Can I reorder tasks manually?",
          answer:
            "The plan order is calculated automatically — you do not drag tasks into order. But you have two ways to influence it. First, change the priority — High tasks always appear before Medium, which appear before Low. Second, pin a task (the 📌 icon) — pinned tasks jump to the top of the ranking. Use pinning for 'I really need to do this today' cases.",
        },
        {
          question: "What does the notes field do?",
          answer:
            "It is a free-text box that appears as a small gray paragraph below the task title. Use it for anything that helps when you sit down to study — a page number, a specific question to answer, a reminder of which chapter was assigned, a link to reference material. Notes are optional and are not scheduled or counted in any way.",
        },
        {
          question: "What are tags for?",
          answer:
            "Tags are short labels you can search and filter by — for example 'exam-prep', 'week-3', 'revision'. Type them separated by commas in the tags field (e.g. 'algebra, practice, week-3'). They show as small pills below the task. You can search tasks by tag using the search box in the 'All tasks' view.",
        },
        {
          question: "What does recurrence (Once / Daily / Weekly) mean?",
          answer:
            "It controls how often the task appears in your plan. 'Once' means it appears until you complete it. 'Daily' means it appears every day — useful for 'review vocabulary 15 minutes' or 'practice piano'. 'Weekly' means it appears on the same weekday each week — useful for 'Sunday review session' or 'weekly project check-in'. Completing a daily or weekly task logs the session and schedules the next occurrence automatically instead of removing the task.",
        },
        {
          question: "Does the focus timer count toward my study time?",
          answer:
            "Yes. When you start the focus timer for a task and let it finish — or stop it early after at least 1 minute — the elapsed minutes are added to that task's 'tracked minutes'. The planner then schedules less time for it in future days because you have already done some of the work. The tracker also feeds your 7-day study chart and your streak.",
        },
        {
          question: "Does the tool use AI?",
          answer:
            "No. The planner uses simple arithmetic — add up priority points, add a deadline urgency bonus, sort by score. There is no AI, no language model, no cloud service. Everything runs on your device.",
        },
        {
          question: "Will my tasks survive a page refresh?",
          answer:
            "Yes. Everything saves to your browser's localStorage automatically the moment you change anything — no save button needed. Refreshing, closing the tab or reopening the planner later all keep your tasks. The exception is clearing your browser's site data, using a private browsing window, or switching to a different browser or device — those will not show your tasks.",
        },
        {
          question: "Can I use this on my phone?",
          answer:
            "Yes. The layout is responsive and works on phones, tablets and desktop. On a phone the sidebar collapses below the main plan. You can add tasks, change statuses, and start the focus timer by tapping — same as on desktop. Typing long task names on a phone is slower, so it may be easier to add tasks on a computer and check the plan on your phone.",
        },
        {
          question: "Can I export or back up my tasks?",
          answer:
            "Yes. Open 'Backup & data' in the sidebar and click 'Download backup (JSON)'. You get a JSON file with all tasks and settings. Save it somewhere safe. If you ever lose your browser data or move to a new device, click 'Import backup' and select that file to restore everything. The backup includes completed-task history and streak data too.",
        },
        {
          question: "What is the difference between this planner and a Pomodoro timer?",
          answer:
            "A Pomodoro timer helps you focus for a fixed block (typically 25 minutes) with breaks. This planner helps you decide what to work on in the first place — it organizes, ranks and schedules your tasks. The two work well together: use this planner to decide the task, then use the built-in focus timer (in the sidebar) to actually work through it in timed sessions.",
        },
        {
          question: "What happens if I do not finish a task I planned for today?",
          answer:
            "Nothing bad — the task simply stays Pending and shows up in tomorrow's plan. The planner carries unfinished work forward automatically. If a task has been rolling forward for days, that is a signal to either break it into smaller tasks, increase your daily study time, or reconsider whether it is really a priority.",
        },
        {
          question: "Is the daily plan a guaranteed timetable?",
          answer:
            "No. It is a recommendation based on the priorities and deadlines you entered. Your actual study speed, how difficult a topic turns out to be, and interruptions during the day will all affect how long things take. Treat the plan as a starting point — adjust as you learn how long you realistically need for each type of task.",
        },
        {
          question: "Can I plan for multiple subjects at once?",
          answer:
            "Yes — that is exactly what it is designed for. Add separate tasks for each subject (Mathematics revision, Physics exercises, English essay, Biology notes). The planner mixes them all together and ranks across subjects, so you never have to decide manually which subject to prioritize — the score does it for you.",
        },
        {
          question: "Do I need to install anything?",
          answer:
            "No. It runs entirely in your browser at the URL. No download, no extension, no app store. Just open the page. The first load needs internet; after that your tasks live locally and the planner still works even if you go offline.",
        },
      ]}
      note="Plain-English summary: you type in your tasks one by one, filling in the subject (broad category), topic (specific work), optional deadline, estimated minutes and priority. The planner then decides what you should do today based on what is most urgent and important, and never schedules more than the daily study time you set. Everything saves automatically in your browser — no account, no save button, no cloud. If you clear your browser data or switch devices, your tasks will not follow you, so use 'Download backup' regularly if you want to keep a permanent copy. The plan is a recommendation, not a guarantee — adjust it based on how long things actually take for you."
    />
  );
}