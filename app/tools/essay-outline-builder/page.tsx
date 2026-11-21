
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import EssayOutlineBuilder from "./EssayOutlineBuilder";

export const metadata: Metadata = {
  title: "Essay Outline Builder - Create an Essay Plan Online | ToolsAB",
  description:
    "Create a clear essay outline with free templates for argumentative, persuasive, research, descriptive, narrative, and other essays. Organize sections, add notes, track progress, and export your outline.",
  alternates: {
    canonical: "/tools/essay-outline-builder",
  },
};

export default function EssayOutlineBuilderPage() {
  return (
    <ToolLandingPage
      toolContent={<EssayOutlineBuilder />}
      title="Free Essay Outline Builder"
      summary="Plan your essay before you start writing with this free Essay Outline Builder. Choose a ready-made structure for an argumentative, persuasive, compare-and-contrast, expository, narrative, descriptive, cause-and-effect, or research essay. Add your topic, thesis statement, main sections, supporting ideas, and notes in one organized workspace. You can create multiple outlines, track your planning progress, and download your work as a TXT, Markdown, or JSON file."
      highlights={[
        "Create structured outlines for different types of academic essays.",
        "Choose from argumentative, persuasive, compare-and-contrast, expository, narrative, descriptive, cause-and-effect, research, and five-paragraph essay templates.",
        "Start with a blank outline when you prefer to plan your own structure.",
        "Add your essay title, topic, target audience, and thesis statement.",
        "Create main sections and add smaller subsections to organize your ideas.",
        "Write notes under each section to keep evidence, examples, explanations, and reminders together.",
        "Select, edit, duplicate, and delete sections as your essay plan develops.",
        "Drag a section onto another section to place it inside as a subsection.",
        "Mark sections as complete and see your outline planning progress.",
        "Search section headings and notes to find information quickly.",
        "Create and manage multiple essay outlines in one workspace.",
        "Download an individual outline as TXT, Markdown, or JSON.",
        "Import JSON outlines and download a backup of all your projects.",
        "Automatically save your work in your current browser without creating an account.",
      ]}
      steps={[
        "Choose an essay template: Click Create New Essay or New Essay Outline. Select a structure such as Argumentative Essay, Persuasive Essay, Research Essay, or Five-Paragraph Essay. Choose Blank Essay Outline if you want to build your own structure.",
        "Enter your essay title: Find the Essay title field and enter a name that describes your assignment. For example, you could write 'The Impact of Social Media on Students'.",
        "Describe your topic: In the Essay topic field, briefly explain what you plan to discuss. This helps you keep your writing focused.",
        "Identify your audience: Use the Target audience field to describe who will read your essay. For example, your audience might be high school students, college students, teachers, or the general public.",
        "Write your thesis statement: Use the Thesis statement / Main idea field to record the main point or argument your essay will develop. A clear thesis helps guide the rest of your outline.",
        "Review your sections: The Your essay structure area contains the main headings and subsections from your selected template. For example, an argumentative essay may include an Introduction, Main Arguments, Counterargument and Rebuttal, and Conclusion.",
        "Add a main section: Click Add Section to create another main heading. You can use headings such as Background, Discussion, Examples, or Recommendations.",
        "Add a subsection: Select a section and click Add Subsection, or use the plus button beside a heading. Subsections help divide a large topic into smaller points.",
        "Edit a heading: Click a section in the outline. The Edit selected section panel will appear below it. Enter your preferred heading in the Section heading field.",
        "Add supporting notes: Use Notes and supporting ideas to record evidence, examples, statistics, explanations, quotations, or reminders for that section. These notes help you remember what to include when writing the actual essay.",
        "Organize your outline: Drag one section and drop it onto another section to place it inside as a subsection. This is useful when you want to group related ideas together.",
        "Track your planning progress: Use the circle or checkmark beside a section to mark it complete or incomplete. The progress bar shows the percentage of sections you have marked as complete.",
        "Find a section: Enter a heading or word from your notes in the search box above the outline. Matching sections will remain visible while you search.",
        "Manage your essay projects: Use My Essays on the left to switch between outlines. The rename, duplicate, and delete controls beside each project help you manage your work.",
        "Download your outline: Choose TXT for a simple text file, Markdown for a document with heading levels, or JSON for a structured backup that can be imported later.",
        "Import or back up your work: Click Import JSON to add an existing outline or backup. Click Download All Outlines to save all your current projects in one JSON backup file.",
      ]}
      faqs={[
        {
          question: "What is an essay outline?",
          answer:
            "An essay outline is a plan that organizes the main ideas of an essay before you write it. It usually contains an introduction, body sections, supporting points, and a conclusion. An outline helps you arrange your thoughts and avoid leaving out important information.",
        },
        {
          question: "How does an Essay Outline Builder work?",
          answer:
            "Choose an essay template, enter your topic and thesis statement, and organize your ideas into sections and subsections. You can add notes to each section, mark planning tasks complete, and download your finished outline.",
        },
        {
          question: "Is this Essay Outline Builder free?",
          answer:
            "Yes. You can create, edit, organize, import, and export essay outlines with this free online tool.",
        },
        {
          question: "Which essay templates are available?",
          answer:
            "The builder includes templates for argumentative, persuasive, compare-and-contrast, expository, narrative, descriptive, cause-and-effect, research, and five-paragraph essays. You can also start with a blank outline.",
        },
        {
          question: "What is a thesis statement?",
          answer:
            "A thesis statement is the main idea or central argument of your essay. It tells readers what your essay will explain, discuss, or support. Your body sections should develop and support this main idea.",
        },
        {
          question: "What should I write in the essay topic field?",
          answer:
            "Write a short description of the subject you plan to discuss. For example, if your essay is about online education, your topic could be 'The benefits and challenges of online learning for college students'.",
        },
        {
          question: "What is the difference between a section and a subsection?",
          answer:
            "A section is a main part of your essay outline, such as Introduction or Main Arguments. A subsection is a smaller point inside a section. For example, a Main Arguments section might contain separate subsections for Argument 1, Argument 2, and Argument 3.",
        },
        {
          question: "Can I create my own essay structure?",
          answer:
            "Yes. Select Blank Essay Outline to begin without pre-filled sections. You can then add, edit, duplicate, and delete headings and subsections to create a structure that suits your assignment.",
        },
        {
          question: "Can I add notes and research ideas?",
          answer:
            "Yes. Select a section and use the Notes and supporting ideas field to record facts, examples, statistics, quotations, explanations, or reminders. These notes stay connected to the section where you added them.",
        },
        {
          question: "Can I move sections around?",
          answer:
            "You can drag one section and drop it onto another section to make it a subsection. This builder currently supports moving sections into other sections; it does not provide free drag-and-drop sorting between sibling sections.",
        },
        {
          question: "What does the progress percentage mean?",
          answer:
            "The progress percentage shows how many outline sections you have marked as complete compared with the total number of sections. It tracks your planning progress, not the quality or completion of the final essay.",
        },
        {
          question: "Can I create more than one essay outline?",
          answer:
            "Yes. You can create and manage multiple essay outlines in the My Essays area. Select a project to continue working on it.",
        },
        {
          question: "Can I download my essay outline?",
          answer:
            "Yes. You can download an individual outline as a TXT, Markdown, or JSON file. TXT is useful for simple text, Markdown preserves heading levels, and JSON is useful for structured backups and importing.",
        },
        {
          question: "Can I import an existing outline?",
          answer:
            "Yes. Use Import JSON to select a JSON outline file or a backup created by this tool. Imported outlines are added to your workspace as separate projects.",
        },
        {
          question: "Where are my essay outlines saved?",
          answer:
            "Your outlines are saved automatically in the local storage of your current browser. You do not need to create an account or press a Save button.",
        },
        {
          question: "Can I access my outlines on another device?",
          answer:
            "Your outlines do not automatically sync between devices or browsers. Download a JSON backup from your current device and import it on the other device to continue working.",
        },
        {
          question: "Does this tool write the essay for me?",
          answer:
            "No. The Essay Outline Builder helps you plan and organize your own ideas. It does not automatically generate a complete essay or verify your research. You should write your essay in your own words and check your sources.",
        },
      ]}
      note="Your outlines are stored in your current browser. They are not automatically synced to other devices. Clearing browser data may remove locally saved outlines, so download the JSON backup regularly if your work is important. This tool helps organize your essay plan; it does not replace your assignment instructions, research, source checking, or your own writing."
    />
  );
}
