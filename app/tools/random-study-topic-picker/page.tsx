
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import RandomStudyTopicPicker from "./RandomStudyTopicPicker";

export const metadata: Metadata = {
  title: "Random Study Topic Picker - Choose What to Study | ToolsAB",
  description:
    "Choose your next study topic randomly. Organize subjects, filter by difficulty, avoid repeated topics, and track your study topic selection history.",
  alternates: {
    canonical: "/tools/random-study-topic-picker",
  },
};

export default function RandomStudyTopicPickerPage() {
  return (
    <ToolLandingPage
      toolContent={<RandomStudyTopicPicker />}
      title="Random Study Topic Picker"
      summary="Not sure what to study next? Create a list of study topics, organize them by subject and difficulty, and randomly select your next learning target. Keep track of previous selections and avoid repeating topics until you have explored your list."
      highlights={[
        "Pick a random topic from your own study library.",
        "Organize topics by subject and difficulty level.",
        "Filter topics and search your library.",
        "Exclude previously selected topics to encourage variety.",
        "Review your recent topic selection history.",
        "Export and import your topic library using JSON backups.",
      ]}
      steps={[
        "Add topics to your library. Give each topic a name, subject, and difficulty level.",
        "Use the subject and difficulty filters to narrow down what you want to study.",
        "Enable the option to exclude previously picked topics if you want to prioritize topics you have not selected before.",
        "Click Pick a random topic to get your next study target.",
        "Use the pick history to review your selections. Export a backup if you want to keep a separate copy of your data.",
      ]}
      faqs={[
        {
          question: "How does the random topic picker work?",
          answer:
            "The picker randomly selects one topic from the topics currently matching your search, subject, and difficulty filters. Topics excluded by the repeat-prevention option are not included in the selection.",
        },
        {
          question: "Can I create my own study subjects?",
          answer:
            "Yes. Enter a subject name when adding a topic. You can reuse an existing subject or enter a new one. Your subjects are created automatically from the topics in your library.",
        },
        {
          question: "Can I choose a difficulty level?",
          answer:
            "Yes. Each topic can be marked Beginner, Intermediate, or Advanced. You can filter your library by any of these levels before making a random selection.",
        },
        {
          question: "How does repeat prevention work?",
          answer:
            "When Exclude topics already picked is enabled, topics that appear in your pick history are removed from the available selection pool. Clear your pick history to make those topics available again.",
        },
        {
          question: "Can I edit or delete topics?",
          answer:
            "Yes. Use the Edit and Delete controls beside a topic in your library. Deleting a topic also removes its associated pick history.",
        },
        {
          question: "Can I back up my study topics?",
          answer:
            "Yes. Export backup downloads your topic library and pick history as a JSON file. Import backup restores data from a compatible JSON backup and replaces the data currently in the tool.",
        },
        {
          question: "Does this tool sync across devices?",
          answer:
            "No. Your data is stored locally in the browser. It does not automatically sync between devices or browsers. Export a backup if you need to move your data.",
        },
        {
          question: "Is the Random Study Topic Picker free?",
          answer:
            "Yes. You can add, edit, organize, filter, and randomly select study topics directly in your browser.",
        },
      ]}
      note="Your study topics and pick history stay in your browser. Clearing browser storage or using a different browser may make your saved data unavailable, so export a backup when needed."
    />
  );
}
