
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import LectureNoteOrganizer from "./LectureNoteOrganizer";

export const metadata: Metadata = {
  title: "Lecture Note Organizer – Keep Your Study Notes Organized | ToolsAB",
  description:
    "Keep all your lecture notes in one place. Write notes, organize them by subject, add tags, find important information, and export your notes whenever you need them.",
  alternates: {
    canonical: "/tools/lecture-note-organizer",
  },
};

export default function LectureNoteOrganizerPage() {
  return (
    <ToolLandingPage
      toolContent={<LectureNoteOrganizer />}
      title="Lecture Note Organizer"
      summary="Ever struggled to find notes from an old class or remember where you saved an important topic? This lecture note organizer makes it easier to keep everything together. Write down what you learn, organize notes by subject, add useful tags, and find them again whenever you need them."
      highlights={[
        "Keep all your lecture notes together instead of searching through different files.",
        "Create new notes, update existing ones, or make a copy when you need it.",
        "Organize your notes by subject so your study material stays easy to manage.",
        "Add tags to remember important topics and find related notes more easily.",
        "Pin the notes you use most often so they are always easy to find.",
        "Move older notes to the archive without having to delete them.",
        "Search your notes and use filters to find what you are looking for.",
        "Check the word count and estimated reading time of your notes.",
        "Copy your notes or save them as Markdown files for use elsewhere.",
        "Export your notes together as a JSON file to keep a backup.",
        "Your notes are saved automatically in your browser while you work.",
      ]}
      steps={[
        "Start by creating a new note for a lecture, class, or topic.",
        "Give your note a title and add details such as the subject, lecturer, and date.",
        "Write your lecture notes in the editor. You can come back and update them whenever you want.",
        "Add tags to make related topics easier to find later.",
        "Pin important notes or archive older ones to keep your workspace tidy.",
        "When you need an old note, use the search and filters to find it.",
        "Copy or export your notes whenever you want to use them outside the organizer.",
      ]}
      faqs={[
        {
          question: "What can I use this lecture note organizer for?",
          answer:
            "You can use it to write and organize notes from college lectures, online classes, training sessions, meetings, or personal study. It gives you one place to keep your written notes.",
        },
        {
          question: "Do I need to create an account?",
          answer:
            "No. You can start writing and organizing your notes without creating an account.",
        },
        {
          question: "Are my notes saved automatically?",
          answer:
            "Yes. Your notes are saved in your browser using local storage, so you do not have to download them every time you make a change.",
        },
        {
          question: "Can I organize notes for different subjects?",
          answer:
            "Yes. You can add a subject to each note and use the available filters to find notes from a particular subject.",
        },
        {
          question: "Can I add tags to my notes?",
          answer:
            "Yes. Add your own tags to notes to make topics easier to identify and find later.",
        },
        {
          question: "What is the difference between pinning and archiving a note?",
          answer:
            "Pinning helps you keep frequently used notes close at hand. Archiving moves notes out of your active workspace while keeping them available in the archive.",
        },
        {
          question: "Can I download or export my notes?",
          answer:
            "Yes. You can export an individual note as a Markdown file or export your complete notes collection as a JSON file. You can also copy note content.",
        },
        {
          question: "Can I use my notes on another computer or phone?",
          answer:
            "Your notes are saved in the browser where you created them. They do not automatically sync between devices or browsers. Export your notes if you want to move or back them up elsewhere.",
        },
        {
          question: "Will my notes disappear if I clear browser data?",
          answer:
            "They may. Clearing your browser's site data can remove locally saved notes, so it is a good idea to export a backup from time to time.",
        },
        {
          question: "Is this tool free to use?",
          answer:
            "Yes. You can use the lecture note organizer in your browser without creating an account.",
        },
      ]}
      note="Your notes stay in your browser rather than being synced to an online account. If they are important, export a backup before clearing browser data or switching devices."
    />
  );
}
