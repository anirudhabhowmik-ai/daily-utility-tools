
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import StudyGroupSessionPlanner from "./StudyGroupSessionPlanner";

export const metadata: Metadata = {
  title: "Study Group Session Planner – Organize Group Study | ToolsAB",
  description:
    "Plan study group meetings, organize participants, set topics and agendas, and keep track of follow-up tasks. A free study session planner that saves your plans in your browser.",
  alternates: {
    canonical: "/tools/study-group-session-planner",
  },
};

export default function StudyGroupSessionPlannerPage() {
  return (
    <ToolLandingPage
      toolContent={<StudyGroupSessionPlanner />}
      title="Study Group Session Planner"
      summary="Getting a group together to study is one thing. Deciding what everyone should work on is another. This planner helps you arrange study sessions, keep track of who's taking part, and decide what you want to cover before the group meets. You can also save notes and follow-up tasks so everyone knows what to work on next."
      highlights={[
        "Plan study meetings with a title, subject, date, start time, and duration.",
        "Add the name of the person leading each session.",
        "Keep a list of classmates or group members attending the session.",
        "Write down the chapters, subjects, or questions you want to discuss.",
        "Prepare an agenda so the group has a clear plan for the meeting.",
        "Add notes about preparation, discussions, or anything worth remembering.",
        "Keep track of tasks the group should complete before meeting again.",
        "Mark sessions as upcoming, completed, or cancelled.",
        "See how many sessions you have planned and how many are completed.",
        "Search your saved sessions and filter them by subject or status.",
        "Open a session to review its participants, topics, agenda, and notes.",
        "Export your study plans as CSV or JSON files.",
        "Save your plans automatically in your browser without creating an account.",
      ]}
      steps={[
        "Start by choosing Plan a session and give your meeting a title.",
        "Enter the subject, date, start time, and how long you expect the session to last.",
        "Add the group leader and the names of the people taking part.",
        "Write down the topics you want to study together.",
        "Prepare a simple agenda to decide how you will use your time.",
        "Add any notes or tasks that the group should remember.",
        "Save the session and open its details whenever you need to review the plan.",
        "After the meeting, update its status and record any tasks for your next session.",
      ]}
      faqs={[
        {
          question: "What is a study group session planner?",
          answer:
            "It is a simple planning tool for organizing group study meetings. You can schedule sessions, list participants, decide what to study, prepare an agenda, and keep notes for future meetings.",
        },
        {
          question: "Can I plan multiple study sessions?",
          answer:
            "Yes. You can create as many study session records as you need and keep them together in your planner.",
        },
        {
          question: "Can I add classmates or group members?",
          answer:
            "Yes. Enter participant names in the session form, separated by commas. You can also assign a session leader.",
        },
        {
          question: "Can I create an agenda for each meeting?",
          answer:
            "Yes. Add agenda items one per line so your group has a clear order for discussing topics. You can also include suggested time allocations in the text.",
        },
        {
          question: "Can I add topics and follow-up tasks?",
          answer:
            "Yes. Each session has separate sections for study topics and action items. Use them to record what the group plans to cover and what members should do before the next meeting.",
        },
        {
          question: "Can I mark a session as completed or cancelled?",
          answer:
            "Yes. You can choose Upcoming, Completed, or Cancelled when creating or editing a session. You can also change the status directly from a saved session.",
        },
        {
          question: "Can I find sessions for a particular subject?",
          answer:
            "Yes. Use the subject filter to narrow your list. You can also search session titles, participant names, topics, agendas, and notes.",
        },
        {
          question: "Can I export my study plans?",
          answer:
            "Yes. You can export all saved sessions as a CSV file for spreadsheet applications or as a JSON file for a structured backup.",
        },
        {
          question: "Are my study sessions saved automatically?",
          answer:
            "Yes. Saved sessions are stored in your browser using local storage. They remain available in the same browser unless its site data is cleared.",
        },
        {
          question: "Can my group members access the same planner?",
          answer:
            "This version is designed for individual planning. It does not provide shared online access, invitations, or automatic syncing between group members. You can export your plan and share the exported file separately.",
        },
        {
          question: "Can I use this planner for online study meetings?",
          answer:
            "Yes. You can use it to organize online or in-person study sessions. Add meeting details to the notes field if you want to keep a video meeting link or other joining information with your plan.",
        },
        {
          question: "Do I need to create an account?",
          answer:
            "No. You can create and manage study plans directly in your browser without signing up.",
        },
      ]}
      note="This planner organizes your study sessions locally in your browser. It does not send invitations, create calendar events, or synchronize plans with other participants. Export your plans if you want to share or back them up."
    />
  );
}
