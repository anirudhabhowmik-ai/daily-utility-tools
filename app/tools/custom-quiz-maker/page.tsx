import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import CustomQuizMaker from "./CustomQuizMaker";

export const metadata: Metadata = {
  title: "Custom Quiz Maker - Create and Take Your Own Quizzes | ToolsAB",
  description:
    "Create custom multiple-choice quizzes with your own questions, answer options, explanations, and time limits. Take quizzes, check your score, and review answers for free.",
  alternates: {
    canonical: "/tools/custom-quiz-maker",
  },
};

export default function CustomQuizMakerPage() {
  return (
    <ToolLandingPage
      toolContent={<CustomQuizMaker />}
      title="Free Custom Quiz Maker"
      summary="Create your own multiple-choice quizzes for studying, revision, practice, or fun. Add questions, choose the correct answers, include explanations, and test yourself whenever you are ready. You can also set a time limit and review your results after completing a quiz. Every field, button and screen is explained below in plain language so even a first-time user can get started in a couple of minutes."
      highlights={[
        "Create quizzes with your own questions and answers.",
        "Add between 2 and 6 answer choices per question.",
        "Mark the correct answer for every question with one click.",
        "Include explanations to make revision easier.",
        "Set an optional time limit for each quiz.",
        "View your score and review every answer in detail.",
        "Search your quiz library to find a quiz quickly.",
        "Save quizzes in your browser and export them as JSON files.",
        "Import quizzes from a backup file or by pasting JSON.",
      ]}
      steps={[
        "Open the quiz library: When you first load the tool, you are on the library screen. It shows how many quizzes you have, how many questions they contain, and where your data is stored. From here you can create a quiz, import one, or open an existing quiz.",

        "Create a quiz: Click the “+ Create a quiz” button. A blank quiz opens in the builder with one empty question already prepared for you. You can close or cancel at any time without saving.",

        "Quiz title (required): In the Quiz details card, type a clear name such as “Biology Chapter 4” or “Spanish Verbs – Level 1”. The title appears on the quiz card in your library and at the top of the quiz while you are taking it.",

        "Description (optional): Add a short sentence that explains what the quiz covers, for example “Covers photosynthesis and cellular respiration”. The description appears under the title in your library.",

        "Time limit: Enter how many minutes you want the quiz to last. Type 0 for an untimed quiz. If you set a limit, a countdown timer appears during the quiz and the quiz submits automatically when the timer reaches zero.",

        "Question text: Inside each Question card, type the question you want to ask, for example “What is the chemical symbol for water?”. This field is required before you can save the quiz.",

        "Answer options: Each question starts with four empty option boxes. Type each possible answer in its own box. You can add up to six options using the “+ Add answer option” link, and remove any option using the small × button (at least two options must remain).",

        "Mark the correct answer: Click the small radio circle next to the letter of the correct option. The letter badge (A, B, C, D) is shown next to each option so you can refer to them easily. You must select one correct answer per question before saving.",

        "Explanation (optional): For each question you can add an explanation. This text appears after the quiz is submitted so you can review why the correct answer is right. It is a great place to add a short revision note.",

        "Reorder or remove questions: Use the ↑ and ↓ arrows on a question card to move it up or down. Use the “Remove” button to delete that question. A quiz must always contain at least one question.",

        "Add more questions: Click “+ Add another question” at the bottom of the builder to add a fresh blank question. Each new question begins with four empty options.",

        "Save the quiz: Click “Save quiz” at the bottom of the builder. The tool checks that the title is filled in, every question has text, and every question has at least two filled options plus a valid correct answer. If anything is missing it will show a notice explaining what to fix.",

        "Search your quizzes: On the library screen, use the search box to filter quizzes by title or description. This is useful when you have a long list.",

        "Start a quiz: In your library, click “Start quiz” on any quiz card. The quiz opens in taking mode with one question per screen.",

        "Answer questions: Click any answer option to select it. The selected option turns orange and shows a ✓. You can change your answer any time before submitting.",

        "Navigate questions: Use the Previous and Next buttons to move through the questions, or click the numbered “Jump to a question” buttons at the bottom to go directly to a specific question. Answered questions turn orange in the jump grid so you can see what is still pending.",

        "Timer: If the quiz has a time limit, the remaining time is shown at the top. The timer turns red in the final minute. When it reaches 00:00 the quiz submits automatically and any unanswered questions are marked incorrect.",

        "Submit the quiz: On the last question, click “Submit quiz”. You can also click “Finish quiz now” at any time to submit early. A confirmation message appears first, warning that unanswered questions will be marked incorrect.",

        "Review your results: After submitting, you see your score as a percentage, the number of correct and incorrect answers, and a per-question review. Each question shows every option colour-coded: green for the correct answer, red for a wrong answer you selected, and neutral for unselected options. Your explanation text (if any) appears below each question.",

        "Try again or return to library: On the results screen you can click “Try again” to retake the same quiz, or “Back to quizzes” to return to the library.",

        "Edit an existing quiz: In the library, click “Edit” on a quiz card to reopen it in the builder. You can change any field, including title, description, time limit, questions, options, correct answers, and explanations, then save your changes.",

        "Delete a quiz: Click “Delete” on a quiz card. A confirmation prompt appears. Once confirmed, the quiz is permanently removed from your library.",

        "Export a quiz: Click “Export” on a quiz card to download that quiz as a JSON file. The file name is based on the quiz title. Keep this file as a backup or to move the quiz to another device.",

        "Import a quiz: Click “Import JSON file” to upload a previously exported quiz file, or click “Paste JSON” to paste the contents of an exported file directly into a text box. Imported quizzes are added to your library with fresh IDs and today's creation date, so you never overwrite your existing quizzes.",
      ]}
      faqs={[
        {
          question: "Is this Custom Quiz Maker free to use?",
          answer:
            "Yes. You can create, edit, save, and take quizzes using this tool for free. No account or sign-up is required.",
        },
        {
          question: "How many questions can I add to a quiz?",
          answer:
            "You can add as many questions as you need. Each quiz must contain at least one question, and every question needs at least two answer options.",
        },
        {
          question: "What does the quiz title field do?",
          answer:
            "The quiz title is the name of the quiz shown in your library and at the top of the quiz while you are taking it. It is the only required quiz-level field. Try to make it short and descriptive.",
        },
        {
          question: "What is the quiz description for?",
          answer:
            "The description is an optional short sentence that explains what the quiz covers. It appears under the title on your quiz cards and helps you tell quizzes apart.",
        },
        {
          question: "What does the time limit do?",
          answer:
            "The time limit sets how many minutes the quiz lasts. Type 0 for no limit. When the timer reaches zero the quiz submits automatically, so any unanswered questions are marked incorrect.",
        },
        {
          question: "Can I create multiple-choice questions?",
          answer:
            "Yes. Each question can have between 2 and 6 answer options. Click the radio button beside the correct option when building your quiz. You can add or remove options using the buttons under the options list.",
        },
        {
          question: "How do I mark the correct answer?",
          answer:
            "Each option has a small radio circle and a letter badge (A, B, C, D…). Click the circle next to the answer you want to be correct. The quiz uses this to score your attempts.",
        },
        {
          question: "Can I add explanations to answers?",
          answer:
            "Yes. Every question has an optional explanation field. You can use it to explain the correct answer or add a useful revision note. Explanations appear when you review your results.",
        },
        {
          question: "Can I reorder or delete questions?",
          answer:
            "Yes. Use the ↑ and ↓ buttons on any question to move it up or down, and use the “Remove” button to delete it. A quiz must always contain at least one question.",
        },
        {
          question: "What happens if I leave a question unanswered?",
          answer:
            "Unanswered questions count as incorrect. The results screen marks them clearly with a “You did not answer this question” note so you can see which ones you skipped.",
        },
        {
          question: "How is my quiz score calculated?",
          answer:
            "You receive one point for every correct answer. Your percentage is calculated by dividing your correct answers by the total number of questions and multiplying the result by 100.",
        },
        {
          question: "What do the colours on the results screen mean?",
          answer:
            "Green shows the correct answer. Red shows an option you selected that was wrong. Neutral options were not selected and are neither right nor wrong. This colour coding helps you review your mistakes quickly.",
        },
        {
          question: "Can I navigate freely during a quiz?",
          answer:
            "Yes. You can use Previous/Next buttons or the numbered “Jump to a question” grid to move around. Answered questions are highlighted in the grid so you can see what is left.",
        },
        {
          question: "What does the timer look like?",
          answer:
            "If the quiz has a time limit, the remaining time is shown as MM:SS at the top right. The timer turns red in the final minute. When it reaches 00:00 the quiz is submitted automatically.",
        },
        {
          question: "Where are my quizzes saved?",
          answer:
            "Your quizzes are saved in your browser's local storage. They remain available in that browser unless its stored website data is cleared. They are not automatically synced between different browsers or devices.",
        },
        {
          question: "Can I back up or move my quizzes?",
          answer:
            "Yes. Use the Export option to download a quiz as a JSON file. You can later import that file using the Import JSON file button, or by pasting the JSON into the Paste JSON panel.",
        },
        {
          question: "What is the difference between Import JSON file and Paste JSON?",
          answer:
            "Import JSON file opens a file picker so you can select a previously exported quiz file. Paste JSON opens a text area where you can paste the same JSON directly. Both add the quizzes to your library with fresh IDs.",
        },
        {
          question: "Will importing a quiz overwrite my existing quizzes?",
          answer:
            "No. Imported quizzes are added as new entries with fresh IDs and today’s creation date. Your existing quizzes are preserved.",
        },
        {
          question: "Can I edit a quiz after creating it?",
          answer:
            "Yes. Open Your quizzes and select Edit beside the quiz you want to change. You can update its title, description, questions, answer options, explanations, and time limit.",
        },
        {
          question: "Can I search my quizzes?",
          answer:
            "Yes. Use the search box on the library screen. It filters your quizzes by title and description as you type.",
        },
        {
          question: "Can I use this tool for study and exam practice?",
          answer:
            "Yes. You can create practice quizzes for school subjects, language learning, general knowledge, employee training, or personal revision. It is a flexible way to test what you have learned.",
        },
        {
          question: "Does this tool track my progress over time?",
          answer:
            "No. Each quiz attempt is scored independently, and the tool does not store a history of previous attempts. You can retake a quiz as many times as you like, but only the current result is displayed.",
        },
        {
          question: "Can I take the same quiz multiple times?",
          answer:
            "Yes. On the results screen click “Try again” to restart the quiz from the first question with a fresh set of answers.",
        },
        {
          question: "What happens if I click Cancel while editing a quiz?",
          answer:
            "Changes made in the builder are not saved until you click “Save quiz”. Clicking Cancel returns you to the library and discards any unsaved edits.",
        },
        {
          question: "Is there a limit to how many quizzes I can create?",
          answer:
            "There is no built-in limit. The only practical limit is your browser’s local storage capacity, which is usually a few megabytes — enough for thousands of quiz questions.",
        },
      ]}
      note="Your quizzes are stored locally in your browser. Export important quizzes as JSON files for backup. This tool does not create an online account or automatically sync quizzes across devices."
    />
  );
}