import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import VocabularyBuilder from "./VocabularyBuilder";

export const metadata: Metadata = {
  title: "Free Vocabulary Builder – Learn and Practise New Words | ToolsAB",
  description:
    "Build your English vocabulary with a free online vocabulary builder. Save words, meanings, examples, synonyms, and practise using flashcards and quizzes.",
  alternates: {
    canonical: "/tools/vocabulary-builder",
  },
};

export default function VocabularyBuilderPage() {
  return (
    <ToolLandingPage
      toolContent={<VocabularyBuilder />}
      title="Free Vocabulary Builder"
      summary="This free vocabulary builder is a simple place to keep every English word you want to learn. Instead of writing words on scraps of paper or in a notebook you never open again, you can save each word here with its meaning, an example sentence, synonyms, antonyms, and your own notes. When you have a few words saved, you can practise them with flashcards and take multiple-choice quizzes to see what you actually remember. You do not need to sign up, log in, or connect to any dictionary service — everything you save stays in your own browser, and you can export a backup whenever you like."
      highlights={[
        "Save each word with its meaning, an example sentence, synonyms, antonyms, and personal notes — so you always have the full picture in one place.",
        "Sort words into categories like Daily English, Academic, Business, IELTS, or TOEFL to keep different study goals separate.",
        "Mark every word as New, Learning, or Mastered so you can see at a glance which words still need work.",
        "Review your words with interactive flashcards that hide the meaning until you are ready to check yourself.",
        "Test yourself with multiple-choice quizzes built from your own saved vocabulary — up to ten questions per quiz.",
        "Set a small daily goal and watch your progress grow, along with a streak counter that rewards regular practice.",
        "Search, filter, edit, and delete words at any time — your library stays tidy as it grows.",
        "Export your whole collection as a JSON file and import it on another device or browser.",
        "No registration, no external dictionary API, and no cost — just open the tool and start adding words.",
      ]}
      steps={[
        "Click the Add a word button in the top-right corner to open the vocabulary form.",
        "Type the English word you want to learn, then enter its meaning. These two fields are required — everything else is optional.",
        "Add an example sentence so you can see how the word is used in real, everyday English.",
        "If you like, fill in synonyms, antonyms, a personal note, and pick a category such as Daily English, Academic, or IELTS.",
        "Choose a learning status — New if you have just added it, Learning if you are still working on it, or Mastered if you feel confident.",
        "Click Save word and the word appears in your personal library straight away.",
        "Use the search box and the status, category, and sort filters to find any word you have already saved.",
        "Switch to Flashcards to hide and reveal meanings, then grade yourself as Need practice, Getting there, or I know it.",
        "Open Practice quiz to answer multiple-choice questions based on your saved words — you need at least four words to start.",
        "Set your daily goal, and use Export vocabulary whenever you want to download a JSON backup of your collection.",
      ]}
      faqs={[
        {
          question: "What is a vocabulary builder?",
          answer:
            "A vocabulary builder is a learning tool that helps you collect, organize, and practise new words. Instead of relying on memory alone, you save each word with its meaning and examples, then review it regularly. Over time this repeated contact helps the words stick, and you can see clearly which ones you have mastered and which still need work.",
        },
        {
          question: "Is this vocabulary builder free?",
          answer:
            "Yes, it is completely free. You do not need to pay, sign up, or create an account. Your saved words are stored locally in your browser, which means the tool works without any server connection and your data stays on your own device.",
        },
        {
          question: "Can I add my own English words and meanings?",
          answer:
            "Absolutely. You can add any word you want to learn and enter its meaning yourself, along with an example sentence, synonyms, antonyms, a category, and personal notes. This is useful because you can use definitions from your favourite dictionary, textbook, or class notes rather than relying on an automatic source.",
        },
        {
          question: "How do vocabulary flashcards work?",
          answer:
            "Flashcards show you a saved word without displaying its meaning immediately. Try to recall the meaning from memory, then reveal the answer to check yourself. After that, you grade yourself: Need practice if you struggled, Getting there if you were close, or I know it if you were confident. Your grade updates the word's status so your library stays accurate.",
        },
        {
          question: "How many words do I need to start a quiz?",
          answer:
            "You need at least four saved vocabulary words to start a multiple-choice quiz, because each question needs three wrong options alongside the correct answer. Each quiz contains up to ten questions selected from your word collection, so the more words you save, the more varied your quizzes become.",
        },
        {
          question: "What is the difference between New, Learning, and Mastered?",
          answer:
            "New means you have added the word but have not practised it much yet. Learning means you are still working on remembering it and may need a few more reviews. Mastered means you feel confident about its meaning. You can change a word's status at any time, either from the word card in your library or by grading yourself during a flashcard session.",
        },
        {
          question: "Can I use this tool for IELTS and TOEFL preparation?",
          answer:
            "Yes. You can create separate categories for IELTS, TOEFL, academic vocabulary, business English, or any other study purpose. Add words from your study materials, past papers, or reading practice, then practise them with flashcards and quizzes. Keeping exam words in their own category makes it easy to focus on exactly what you need.",
        },
        {
          question: "Will my vocabulary be available on another device?",
          answer:
            "Your vocabulary is stored in the browser on the device where you use the tool, so it does not automatically sync between devices. To move your collection, export your words as a JSON file and then import that backup on the other device. Duplicate words are skipped automatically during import, so you will not end up with repeats.",
        },
        {
          question: "Does the tool automatically provide word meanings?",
          answer:
            "No. You enter the meanings and examples yourself. This is intentional: it lets you use definitions from your preferred dictionary, textbook, or study materials, and writing the meaning in your own words is itself a powerful way to remember it. The tool does not connect to any external dictionary service.",
        },
        {
          question: "Does the daily goal send reminders?",
          answer:
            "No. The daily goal simply displays how many words you marked as Mastered today compared with your target, so you can see your progress at a glance. It does not send notifications, emails, or reminders — you decide when to come back and practise.",
        },
      ]}
      note="Your vocabulary is stored in your browser, not in an online account. Clearing browser data or using a different device may make your saved words unavailable. Export a JSON backup regularly if you want to keep a copy."
    />
  );
}