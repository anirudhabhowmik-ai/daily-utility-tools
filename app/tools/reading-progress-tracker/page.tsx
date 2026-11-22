
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import ReadingProgressTracker from "./ReadingProgressTracker";

export const metadata: Metadata = {
  title: "Free Reading Progress Tracker - Track Books, Pages & Goals | ToolsAB",
  description:
    "Organize your reading list, track book pages, log reading sessions, save notes, set daily page goals, and understand your reading habits with this free online reading tracker.",
  alternates: {
    canonical: "/tools/reading-progress-tracker",
  },
};

export default function ReadingProgressTrackerPage() {
  return (
    <ToolLandingPage
      toolContent={<ReadingProgressTracker />}
      title="Free Reading Progress Tracker"

      summary="Have you ever started several books and then forgotten which page you reached? Or wanted to build a daily reading habit but struggled to see how much you were actually reading? This free Reading Progress Tracker gives you one place to organize your books, record your progress, save reading notes, and keep an eye on your daily goals. Add books you plan to read, track the ones you are currently reading, and keep a record of the books you finish. You can also record how many pages you read during each session and how much time you spent reading. Your library is saved in your browser, so you can return to it without creating an account."

      highlights={[
        "Create a personal library with multiple books, authors, categories, and descriptions.",
        "Record the total page count and current page for every book.",
        "See each book's reading progress as an automatically calculated percentage.",
        "Organize books into Want to Read, Currently Reading, On Hold, and Completed statuses.",
        "Update your reading status and current page directly from a book card.",
        "Set a daily page target and see how many pages remain to reach it.",
        "Record individual reading sessions with pages read, time spent, and personal notes.",
        "Keep notes and highlights attached to a specific book and page number.",
        "Search your library by book title, author, or category.",
        "Filter books by reading status or category and sort them in different ways.",
        "Review your total reading activity, completed books, reading time, and seven-day reading chart.",
        "Export your complete library as a JSON backup or download a CSV summary.",
        "Import a JSON backup to restore your library in another browser.",
        "Save your reading information automatically in your browser without creating an account.",
      ]}

      steps={[
        "Start by clicking Add a Book. You can find this button near the top of the tracker or inside the My Library section.",
        "Enter the book title. This is the only text field that identifies the book and is required before you can save it.",
        "Add the author's name if you want to keep track of who wrote the book. You can leave this field empty if you do not know the author.",
        "Choose a category such as Fiction, Non-fiction, Fantasy, Science Fiction, Mystery, Romance, Biography, Business, Self-help, Science, History, Technology, Education, or Other. Categories make it easier to organize and filter your library.",
        "Choose a reading status. Select Want to Read for a book you have not started, Currently Reading for a book you are reading now, On Hold for a book you have temporarily paused, or Completed for a book you have finished.",
        "Enter the book's Total Pages. Check the printed book or your digital reader for the full page count. This field is required and accepts a whole number from 1 to 100,000.",
        "Enter the Current Page if you have already started the book. Use 0 if you have not started reading yet. The current page cannot be greater than the total page count.",
        "Optionally add a Book Cover Image URL. Paste a direct HTTP or HTTPS image address if you want to display the cover. Leave it empty if you do not have an image link.",
        "Choose Your Rating by selecting one to five stars. This is your personal rating of the book. Select the same rating again to clear it.",
        "Use the Description field to write a short summary, personal reminder, or reason you want to read the book. This field is optional.",
        "Click Add Book to save a new entry. If you are editing an existing book, click Save Changes instead. Your book will appear in My Library.",
        "Use the current-page field on a book card when you want to correct or update your reading position directly. Enter the page number you have reached and use its update button.",
        "For a more detailed reading record, open a book by clicking its card. Select Log Reading to record a reading session instead of only changing the current page.",
        "Choose a book in the reading session form. The tracker displays how many pages remain in that book so you can check your progress before saving.",
        "Enter Pages Read to record how many pages you completed during that session. For example, enter 15 if you read fifteen pages.",
        "Enter Reading Time in minutes. For example, enter 30 if you spent half an hour reading. The tracker accepts a whole number from 1 to 1,440 minutes.",
        "Optionally add a Session Note. You could write which chapter you finished, what you learned, or anything you want to remember about that reading session.",
        "Click Save Session. The tracker adds those pages to the book's current page, records the session date, and updates the book's reading status when appropriate.",
        "Set your Daily Target in the goal panel. Enter the number of pages you want to read each day and click Save. The allowed range is 1 to 10,000 pages.",
        "Log your reading sessions regularly to see your daily goal progress. The goal panel uses pages recorded in sessions for the current day.",
        "Open a book's details to add Notes and Highlights. Enter the page number where the idea appears, write your note, and click Save Note.",
        "Use My Library to search, filter, and sort your books. You can find books by title, author, or category, filter by status or category, and sort by recent updates, title, progress, page count, or date added.",
        "Open Reading Sessions to review the sessions you have recorded. You can see the date, book title, pages read, time spent, and session note. You can also delete an individual session.",
        "Open Statistics to review your recorded reading activity, including total pages logged in sessions, total reading time, average pages per session, and your average session length.",
        "Check the seven-day reading chart to compare the pages recorded on each of the last seven days. The library overview shows how many books belong to each reading status.",
        "Use Export JSON backup to download your complete reading library, including book details, sessions, notes, and your daily goal. Keep this file somewhere safe.",
        "Use Import JSON backup when you want to restore a previously exported library. Choose the JSON file and confirm the import. Importing replaces the current library, so export your existing data first if you want to keep it.",
        "Use Export CSV when you want a spreadsheet-friendly summary of your books. The CSV includes book details, page progress, status, rating, recorded session pages, and reading minutes.",
      ]}

      faqs={[
        {
          question: "What is a reading progress tracker?",
          answer:
            "A reading progress tracker is a simple way to organize books and keep a record of how much you have read. This tool lets you save book details, update page numbers, record reading sessions, set daily page goals, and review your reading activity.",
        },
        {
          question: "How do I add my first book?",
          answer:
            "Click Add a Book and enter the book title and total number of pages. You can also add the author, category, current page, reading status, cover image, rating, and description. Click Add Book to save it to your library.",
        },
        {
          question: "Which book details are required?",
          answer:
            "The book title and total page count are required. The author, category selection, reading status, current page, cover image URL, rating, and description help you organize your library but do not all need to be filled in.",
        },
        {
          question: "What does the Total Pages field mean?",
          answer:
            "Total Pages means the complete page count of the book you are tracking. For example, if your book has 320 pages, enter 320. The tracker uses this number to calculate your reading completion percentage.",
        },
        {
          question: "What should I enter in Current Page?",
          answer:
            "Enter the page number you have reached so far. If you have not started the book, enter 0. For a 320-page book where you have reached page 80, enter 80. The tracker calculates your progress automatically.",
        },
        {
          question: "How is reading progress calculated?",
          answer:
            "The tracker divides your current page by the book's total page count and converts the result into a percentage. For example, reaching page 80 in a 320-page book gives you 25% progress.",
        },
        {
          question: "What is the difference between updating a page and logging a reading session?",
          answer:
            "Updating the current page changes your reading position directly. Logging a reading session records how many pages you read, how many minutes you spent, and an optional note. Session records are also used for daily goals and reading statistics.",
        },
        {
          question: "How do I record the pages I read today?",
          answer:
            "Open Reading Sessions and click Log a Session, or open a book and choose Log Reading. Select the book, enter the number of pages read and the time spent in minutes, then click Save Session.",
        },
        {
          question: "Does the tracker automatically update my current page after a session?",
          answer:
            "Yes. When you save a reading session, the number of pages in that session is added to the book's existing current page. The tracker then updates its progress percentage and reading status.",
        },
        {
          question: "What happens when I finish a book?",
          answer:
            "When the current page reaches the total page count through a page update or a reading session, the book is marked Completed. You can also select Completed as its reading status manually.",
        },
        {
          question: "What do the four reading statuses mean?",
          answer:
            "Want to Read means you plan to read the book later. Currently Reading means you are actively reading it. On Hold means you have paused it for now. Completed means you have finished it.",
        },
        {
          question: "Can I track several books at the same time?",
          answer:
            "Yes. You can add as many books as you need, manage each book separately, and use the search and filter controls to find the ones you want to update.",
        },
        {
          question: "What is the daily reading goal?",
          answer:
            "The daily reading goal is the number of pages you want to read in one day. Enter your target in the Daily target field and click Save. The tracker compares that target with the pages recorded in your reading sessions today.",
        },
        {
          question: "Why is my daily goal not increasing when I update Current Page?",
          answer:
            "The daily goal is calculated from saved reading sessions, not from direct current-page changes. To count pages toward today's goal, use Log a Session and save the pages you read.",
        },
        {
          question: "Can I set a small daily reading goal?",
          answer:
            "Yes. You can set a target as low as one page per day. Choose a realistic goal that fits your schedule and update it whenever your reading routine changes.",
        },
        {
          question: "What is a reading session note?",
          answer:
            "A session note is an optional reminder attached to a reading session. You can use it to record the chapter you finished, an idea you found interesting, or something you want to revisit.",
        },
        {
          question: "How do I save notes or highlights from a book?",
          answer:
            "Open a book from your library. In the Notes and Highlights section, enter the page number and write your note or highlight. Click Save Note to attach it to that book.",
        },
        {
          question: "Can I add more than one note to a book?",
          answer:
            "Yes. You can save multiple notes for the same book. Each note keeps its page number and creation date, and you can delete individual notes when you no longer need them.",
        },
        {
          question: "Can I search for a book by its author?",
          answer:
            "Yes. Use the search field in My Library. It searches book titles, author names, and categories, so you can find a book without scrolling through the entire list.",
        },
        {
          question: "How do the book filters work?",
          answer:
            "The status filter shows books with a selected reading status, such as Currently Reading or Completed. The category filter narrows the list to a selected subject or genre. You can use both filters together.",
        },
        {
          question: "How can I sort my reading list?",
          answer:
            "Choose Recently updated to see books you have changed most recently, Title A–Z to sort alphabetically, Highest progress to see the most completed books first, Most pages to sort by total book length, or Oldest added to see books you entered earliest.",
        },
        {
          question: "What information appears in the dashboard?",
          answer:
            "The dashboard shows your total number of books, the number currently being read, completed books, and pages recorded through reading sessions. It also displays today's reading goal progress.",
        },
        {
          question: "What does Pages Read mean in the dashboard?",
          answer:
            "Pages Read is the total number of pages recorded across your saved reading sessions. It is not calculated by adding the current page of every book.",
        },
        {
          question: "What do the reading statistics show?",
          answer:
            "The Statistics section shows total pages logged in sessions, total reading time, average pages per session, and average session duration. It also includes a seven-day chart and a breakdown of books by reading status.",
        },
        {
          question: "Can I delete a reading session?",
          answer:
            "Yes. Open Reading Sessions and use the delete button beside the session you want to remove. The tracker recalculates the book's page progress using its remaining sessions.",
        },
        {
          question: "Can I edit or delete a book?",
          answer:
            "Yes. Open the book's details and choose Edit Book to change its information. Use the delete option on its book card to remove it. Deleting a book also deletes its associated reading sessions and notes.",
        },
        {
          question: "Can I add my own book cover?",
          answer:
            "Yes. Add a direct image address in the Book Cover Image URL field. The address must use HTTP or HTTPS. If the image cannot be loaded, the tracker displays a default cover instead.",
        },
        {
          question: "What is the difference between JSON and CSV export?",
          answer:
            "JSON backup is designed to preserve your reading library so it can be imported again later. CSV is designed for viewing your book information in spreadsheet applications. CSV export is a summary and is not the backup format used by the import feature.",
        },
        {
          question: "How do I move my reading library to another device?",
          answer:
            "On your original device, click Export JSON backup and save the downloaded file. Open the tracker on the other device, choose Import JSON backup, select that file, and confirm the import. Your library does not sync automatically between devices.",
        },
        {
          question: "Will importing a backup delete my existing books?",
          answer:
            "Yes. Importing a JSON backup replaces the library currently stored in the browser. Export your existing library first if you want to keep a separate copy.",
        },
        {
          question: "Where is my reading information stored?",
          answer:
            "Your reading information is saved in your browser's local storage on the device and browser you are using. It is not automatically synchronized with another device or browser.",
        },
        {
          question: "Will my reading list remain if I close the browser?",
          answer:
            "Your library is saved automatically in browser storage, so it should remain available when you return using the same browser and device. Clearing site data, using private browsing, or changing browsers can make the saved information unavailable. Keep a JSON backup for safety.",
        },
        {
          question: "Do I need to create an account?",
          answer:
            "No. You can use the tracker without registering or signing in. Your reading library is stored locally in your browser.",
        },
        {
          question: "Is the Reading Progress Tracker free?",
          answer:
            "Yes. The Reading Progress Tracker is free to use and does not require an account.",
        },
        {
          question: "Can I use this tool on a mobile phone?",
          answer:
            "Yes. You can open the tracker in a modern mobile browser. The layout is designed to adapt to smaller screens, although adding and reviewing a large library may be more comfortable on a larger display.",
        },
      ]}

      note="Your reading library is stored in your browser using local storage. It does not automatically sync across devices. Export a JSON backup before clearing browser data or moving to another device. Importing a backup replaces the library currently in the browser. The tracker helps you organize your own reading activity; it does not provide, download, or reproduce copyrighted books."
    />
  );
}
