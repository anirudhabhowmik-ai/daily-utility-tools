import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import CornellNotesGenerator from "./CornellNotesGenerator";

export const metadata: Metadata = {
  title:
    "Free Cornell Notes Generator – Create and Organize Study Notes | ToolsAB",
  description:
    "Create structured Cornell notes online with cue questions, detailed notes, and summaries. Edit multiple study documents, practise with study mode, and print or save notes as PDF.",
  alternates: {
    canonical: "/tools/cornell-notes-generator",
  },
};

export default function CornellNotesGeneratorPage() {
  return (
    <ToolLandingPage
      toolContent={<CornellNotesGenerator />}
      title="Free Cornell Notes Generator"
      summary="Take better notes, study smarter, and remember more using the proven Cornell method. This tool gives you a clean, structured layout divided into three easy sections: a cue column for questions and keywords, a wide notes column for your detailed explanations, and a summary box at the bottom to lock in the main ideas. You can create unlimited note documents for different classes, switch to Study Mode to test your memory, and export a clean PDF when it's time to revise. Everything saves automatically right in your browser—no sign-up required."
      highlights={[
        "Effortlessly structure your notes using the classic Cornell layout.",
        "Type your questions and memory triggers in the left-hand Cue column.",
        "Record the bulk of your lesson details, facts, and examples in the right-hand Notes column.",
        "Capture the big picture by writing a brief summary at the bottom of the page.",
        "Keep your classes and subjects organized with unlimited separate documents.",
        "Easily add, delete, edit, or move rows up and down as your notes grow.",
        "Test yourself using Study Mode, which hides your notes so you can practise recalling the answers.",
        "Save a clean, professional-looking PDF of your notes with a single click.",
        "Never worry about losing your work—your notes save automatically in your browser.",
        "Back up your study materials or move them to a new computer using simple JSON import and export files.",
        "Completely free to use with no account or registration needed.",
      ]}
      steps={[
        "Click the '+ New notes' button to start a fresh document.",
        "Fill in the top fields: give your notes a Topic/Title (e.g., 'Photosynthesis'), add the Course/Subject (e.g., 'Biology'), and confirm the Date.",
        "Start writing in the right-hand 'Notes' column. This is where you put the main lesson details, definitions, facts, and examples.",
        "After class, use the left-hand 'Cues / Questions' column. Here, write short keywords, memory triggers, or questions that link to the notes next to them.",
        "Need more space? Click '+ Add cue and notes row' to create a new pair of columns.",
        "Use the small ↑ and ↓ arrows to reorder your rows, or click the '×' to delete a row you don't need.",
        "Scroll to the bottom and write a 'Summary' in your own words. What is the absolute most important thing to remember from this page?",
        "Toggle '🎴 Study mode' when it's time to revise. Your notes will hide, leaving only your questions. Try to answer them out loud, then click 'Reveal notes' to check if you were right.",
        "Click '📄 Save as PDF' whenever you want to download a beautifully formatted, printable copy of your notes.",
        "Use the '📁 My documents' button to search, switch between, or delete your different note documents.",
        "Keep your work safe by clicking '⬇ Export all notes' to download a backup file, or '⬆ Import JSON' to bring notes in from another device.",
      ]}
      faqs={[
        {
          question: "What exactly is the Cornell note-taking method?",
          answer:
            "It's a highly effective, structured way to take notes that forces you to think about the material in three ways. You divide your page into three sections: Notes (recording the facts), Cues (asking questions), and a Summary (synthesizing the big picture). This structure makes it much easier to review and remember what you learned.",
        },
        {
          question: "How should I use the Notes, Cues, and Summary fields?",
          answer:
            "During a lecture or reading, write all the heavy details in the right-hand 'Notes' field. Later, pull the most important keywords and questions from those notes and put them in the left-hand 'Cues' field. Finally, at the bottom, write a few sentences in the 'Summary' field that explain the entire page's topic in your own words.",
        },
        {
          question: "What is Study Mode and how does it work?",
          answer:
            "Study Mode is a built-in flashcard system. When you turn it on, the tool hides all the detailed text in your Notes column, leaving only your Cues and Questions visible. Read the question, try to answer it from memory, and then click 'Reveal notes' to see if you got it right.",
        },
        {
          question: "Will I lose my notes if I close my browser?",
          answer:
            "No. Your notes are saved automatically to your browser's local storage every time you type. As long as you use the same browser on the same device, your notes will be right where you left them.",
        },
        {
          question:
            "How do I get my notes onto another device (like my phone or a new laptop)?",
          answer:
            "Because browser storage is local to one device, you need to move the file manually. Scroll down to the 'Backup and restore' section, click '⬇ Export all notes', and save the JSON file. Email that file to yourself, open this tool on your new device, and click '⬆ Import JSON' to load them.",
        },
        {
          question: "How does the 'Save as PDF' button work?",
          answer:
            "It uses a built-in PDF generator to take a high-quality snapshot of your Cornell notes. It automatically forces the background to a clean white and formats the page so it prints perfectly, regardless of whether you are using Light or Dark mode. It won't include the buttons or the website menus—just your notes.",
        },
        {
          question: "Can I print my notes instead of saving a PDF?",
          answer:
            "Yes! If you prefer a physical copy, save your notes as a PDF using the button, and then open that PDF file on your computer and print it from there. This ensures the layout is perfectly preserved.",
        },
        {
          question: "Is this really free?",
          answer:
            "Absolutely. You can create, edit, organize, study, and download your Cornell notes without ever creating an account, providing an email, or paying a subscription fee.",
        },
      ]}
      note="Privacy First: Your notes are stored 100% locally in your browser. We don't have a server, we don't have an account system, and we cannot see your study materials. Because of this, clearing your browser's cache or using Incognito mode will erase your notes—so we highly recommend exporting a JSON backup to your computer if you want a permanent copy."
    />
  );
}
