
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import MindMapMaker from "./MindMapMaker";

export const metadata: Metadata = {
  title: "Free Online Mind Map Maker – Create and Organize Ideas | ToolsAB",
  description:
    "Create mind maps online to organize ideas, brainstorm topics, and plan projects. Add branches, customize colours, rearrange topics, and export or print your mind maps for free.",
  alternates: {
    canonical: "/tools/mind-map-maker",
  },
};

export default function MindMapMakerPage() {
  return (
    <ToolLandingPage
      toolContent={<MindMapMaker />}
      title="Free Online Mind Map Maker"
      summary="Turn your ideas into an organized visual map with this free online mind map maker. Start with a central topic, add branches and subtopics, and arrange related ideas in a visual workspace. Customize branch colours, move topics around, collapse sections, and search for specific ideas. Your mind maps are saved automatically in your browser, with options to export JSON backups or print them as PDF."
      highlights={[
        "Create multiple mind maps for different subjects, projects, and brainstorming sessions.",
        "Start with a central idea and build branches with unlimited subtopics.",
        "Add sibling topics and organize related ideas into branches.",
        "Edit topic names directly from the topic editor.",
        "Customize individual topic colours to distinguish categories and ideas.",
        "Drag and reposition topics to arrange your mind map.",
        "Move around the canvas by dragging its background.",
        "Zoom in and out to work with larger mind maps.",
        "Collapse and expand branches to focus on selected topics.",
        "Search topic names to find ideas in your mind map.",
        "Undo and redo recent editing changes.",
        "Automatically save mind maps in your browser.",
        "Import and export mind maps using JSON files.",
        "Export all your maps as a backup.",
        "Print your mind map or save it as a PDF using your browser.",
        "No account, external API, or subscription required.",
      ]}
      steps={[
        "Open the mind map maker. A new map with a central topic will be created automatically.",
        "Click the mind map name at the top to give your map a meaningful title.",
        "Select the Central Idea topic on the workspace.",
        "Click Add subtopic to create your first branch.",
        "Select the new branch and add more subtopics to develop your ideas.",
        "Use Add sibling to create another topic at the same level as the selected branch.",
        "Select any topic and edit its name in the Edit selected topic panel.",
        "Choose a colour to distinguish different branches or categories.",
        "Drag a topic to reposition it on the workspace. Drag the background to move around the canvas.",
        "Use the zoom controls to get a closer or wider view of your mind map.",
        "Select a topic with subtopics and use Collapse branches to hide its children. Select Expand branches to show them again.",
        "Enter a keyword in Find a topic to search for matching topic names.",
        "Use Undo and Redo to move backward or forward through recent editing changes.",
        "Click New map to create another mind map. Use My maps to switch between your saved maps.",
        "Choose Export JSON to download the current map, or Backup all to export your complete collection.",
        "Use Import JSON to add previously exported maps.",
        "Click Print / PDF to print your mind map or save it as a PDF.",
      ]}
      faqs={[
        {
          question: "What is a mind map?",
          answer:
            "A mind map is a visual way to organize information around one central idea. Related topics are connected through branches, and each branch can contain additional subtopics. Mind maps help make relationships between ideas easier to understand.",
        },
        {
          question: "How do I create a mind map?",
          answer:
            "Start with a central topic, select it, and click Add subtopic to create your first branch. Select each new topic to add further subtopics. You can rename topics, choose colours, and move them around the workspace.",
        },
        {
          question: "Can I add multiple levels of branches?",
          answer:
            "Yes. You can add subtopics to existing subtopics, allowing you to build multiple levels of detail under your central idea.",
        },
        {
          question: "What is the difference between a subtopic and a sibling topic?",
          answer:
            "A subtopic is a new branch connected underneath the selected topic. A sibling topic is another topic at the same level as the selected branch, sharing the same parent.",
        },
        {
          question: "Can I change the colours of mind map topics?",
          answer:
            "Yes. Select a topic and choose one of the available colours in the editor panel. You can use different colours to separate categories, subjects, or groups of ideas.",
        },
        {
          question: "Can I move topics around?",
          answer:
            "Yes. Drag and drop individual topics to change their positions. You can also drag the empty canvas area to move around the workspace.",
        },
        {
          question: "What does collapse branches do?",
          answer:
            "Collapsing a branch temporarily hides its child topics and subtopics. This helps you focus on one part of a large mind map. You can expand the branch again whenever you need to see the hidden topics.",
        },
        {
          question: "Can I create multiple mind maps?",
          answer:
            "Yes. Use New map to create separate mind maps for different subjects, study notes, business ideas, or projects. The My maps section lets you switch between them.",
        },
        {
          question: "Can I undo changes?",
          answer:
            "Yes. Use Undo to restore a previous editing state and Redo to reapply a change. These controls cover recent editing operations within your current browser session.",
        },
        {
          question: "Can I export my mind map?",
          answer:
            "Yes. Export JSON downloads the current mind map as a JSON file. Backup all downloads your complete collection. You can import previously exported JSON files into the tool.",
        },
        {
          question: "Can I print a mind map or save it as PDF?",
          answer:
            "Yes. Click Print / PDF to open your browser's print dialog. You can select a printer or choose Save as PDF. Landscape orientation is used for printing.",
        },
        {
          question: "Are my mind maps saved automatically?",
          answer:
            "Yes. Your maps are automatically saved in your browser's local storage as you make changes. They are not stored in an online account and do not automatically sync between devices.",
        },
        {
          question: "Is this mind map maker free?",
          answer:
            "Yes. You can create, edit, organize, save, import, export, and print mind maps without creating an account or paying for a subscription.",
        },
      ]}
      note="Mind maps are stored locally in your current browser. Clearing browser data may remove saved maps, so export JSON backups regularly. Imported maps are added to your existing collection."
    />
  );
}
