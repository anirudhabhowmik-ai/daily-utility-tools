
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import PetFeedingTracker from "./PetFeedingTracker";

export const metadata: Metadata = {
  title: "Exotic Pet Feeding Tracker | Daily Food Log & History | ToolsAB",
  description:
    "Track exotic pet meals, record food amounts in grams, monitor a veterinarian-provided daily target, review feeding history and export meal records as CSV.",
  alternates: { canonical: "/tools/exotic-pet-nutrition-calculator" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<PetFeedingTracker />}
      title="Exotic Pet Feeding Tracker"
      summary="Keeping a consistent feeding record can make it easier to understand your pet's eating habits and share useful information with a veterinarian. This exotic pet feeding tracker lets you record individual meals, snacks, treats and supplements, enter a daily feeding target recommended by your veterinarian, and compare recorded food amounts with that target. Add the food name, meal time, amount in grams and optional notes for every entry. Review daily totals, check feeding activity over the last 7 or 30 days, browse recent records and export your selected day's log as a CSV spreadsheet. Your records are saved automatically in your browser, so you can return to your feeding history on the same browser and device. The tracker records the information you enter; it does not calculate calorie requirements, determine ideal portions or recommend a diet for any animal."
      highlights={[
        "Create a simple feeding profile by entering your pet's name and selecting the date you want to review.",
        "Enter a daily feeding target in grams based on guidance from your veterinarian.",
        "Record breakfast, lunch, dinner, snacks, treats and supplements separately.",
        "Add a food name, meal time, amount eaten and optional notes to each feeding entry.",
        "Use quick-add buttons for 10 g, 25 g, 50 g or 100 g when entering meal amounts.",
        "Compare the total recorded amount with your manually entered daily target.",
        "See the amount remaining or the amount above your entered target.",
        "Review daily statistics including meal count, average meal amount, largest meal and distinct food names.",
        "Edit an existing meal or delete an entry if you entered the wrong information.",
        "Browse previous and upcoming dates to review feeding records for different days.",
        "Review total recorded amounts and feeding activity across the 7 and 30 calendar days ending on your selected date.",
        "Browse up to the 10 most recent dates that contain feeding records.",
        "Save feeding records automatically in your browser using local storage.",
        "Export the selected day's meal entries as a CSV spreadsheet.",
        "Copy a daily feeding summary that you can share or keep with your pet's records.",
        "Print a feeding report using your browser's print function.",
        "Clear the feeding entries for one selected day or reset the complete tracker when needed.",
      ]}
      steps={[
        "Start in the Feeding dashboard. The tracker has an optional Pet name field and a Tracking date field. Enter your pet's name, such as Bruno, Bella or your animal's usual name. This helps identify the feeding record when you copy or share a daily summary.",
        "Select Tracking date to choose the day for which you want to record or review meals. The tracker initially opens with the current date. You can also use Previous day, Today and Next day to move between dates. The Next day button is disabled when the selected date is today or later.",
        "Find the Daily feeding target section. Enter the amount recommended by your veterinarian in Recommended daily amount (g). For example, if your veterinarian has advised a daily amount of 120 grams, enter 120. This is a reference value supplied by you, not a recommendation calculated by the tool. Enter 0 if you do not want to set a target.",
        "Make sure your target and meal entries use a consistent measurement basis. This tracker adds the gram amounts you enter, including entries categorized as meals, snacks, treats and supplements. It does not convert food weights into calories or distinguish the nutritional contribution of different foods.",
        "Go to Add a meal to record a feeding. Select Meal type from Breakfast, Lunch, Dinner, Snack, Treat or Supplement. These categories help organize your records; they do not change how the amount is calculated.",
        "Enter Meal time using the time field. This records when the food was given or eaten. The current local time is filled in automatically when the tracker opens and when you reset the meal form, but you can change it to the actual feeding time.",
        "Enter Food name to identify what you served. Examples include dry food, pellets, vegetables, fruit, hay or a supplement. This field is optional, but using clear names can make your feeding history more useful.",
        "Enter Amount eaten (g) in grams. For example, enter 25 if your pet ate 25 grams of the food you are recording. Each meal amount must be greater than zero to be saved.",
        "Use the Quick add buttons if you want to increase the current amount without typing the entire value again. The buttons add 10 g, 25 g, 50 g or 100 g to the amount already entered. For example, if the current amount is 20 g and you select +25g, the field becomes 45 g.",
        "Use Notes to record additional details about the feeding. You could write that your pet ate slowly, left some food, refused part of a meal or had food mixed with water. Notes are optional and can contain up to 500 characters.",
        "Select Log this meal to add the entry to the selected date. The meal appears in Meal history, and the daily total and dashboard statistics update automatically. If you are editing an existing entry, the button changes to Save meal changes.",
        "Repeat these steps for every feeding you want to record. You can create separate entries for different foods, meal times, snacks, treats and supplements rather than combining everything into one record.",
        "Review Meal history to see the entries recorded for the selected date. Each entry displays its time, meal category, food name, amount and any notes. Entries are shown with the latest meal time first.",
        "Select Edit beside a meal if you need to correct its food name, amount, category, time or notes. The selected entry is loaded into the meal form. Make your changes and select Save meal changes. You can also select Cancel editing if you do not want to continue.",
        "Select Delete beside a meal to remove that individual entry. If you accidentally delete an entry, it is not available through an undo button, so check the selected record before deleting it.",
        "Look at the Daily overview panel to compare the total recorded food amount with your entered daily target. It displays the amount logged, the target, progress and the amount remaining or above the target.",
        "Review the Daily target progress bar. The percentage is calculated by dividing the logged amount by the daily target and multiplying by 100. The visual bar is capped at 100%, while the displayed percentage can exceed 100% if the recorded amount is higher than the target.",
        "Check the Feeding insights section for the number of meals, average amount per meal, largest individual meal and number of distinct food names recorded for the selected day. The distinct food count is based on food names and does not count meal categories.",
        "Open Feeding reports to review the last 7 days and last 30 days ending on the selected date. These summaries show the total recorded grams, number of meal entries and number of calendar days with at least one recorded entry.",
        "Use Daily history to browse the most recent 10 dates that contain feeding records. Select a date to open its daily overview and meal history. Dates without any recorded meals are not listed in this history.",
        "Select Export meal log (CSV) to download the meal entries for the selected date. The spreadsheet includes the date, time, meal type, food name, amount in grams and notes. It can be opened in Microsoft Excel, Google Sheets or another spreadsheet application.",
        "Select Copy daily summary to copy a readable feeding report to your clipboard. The summary includes the pet name, selected date, daily target, total recorded amount, meal count and individual meal details. You can paste it into a document or share it during a veterinary follow-up.",
        "Select Print feeding report to open your browser's print dialog. You can choose an available printer or use a print-to-PDF option provided by your browser to save a printable record.",
        "Use Clear selected day's log if you want to delete all feeding entries for the currently selected date. The tracker asks you to confirm before deleting those entries. Other dates remain unchanged.",
        "Use the Reset option in the tool shell if you want to clear the complete tracker. This removes the pet name, daily target and all saved meal records from this browser after confirmation. This action should only be used when you intend to start over.",
        "Your feeding information is saved automatically in your browser's local storage as you make changes. You do not need to press a separate Save button. If you want to keep a separate copy or share your records, use the CSV export or copy summary feature.",
      ]}
      faqs={[
        {
          question: "What is an exotic pet feeding tracker?",
          answer:
            "An exotic pet feeding tracker is a record-keeping tool for logging what and how much an animal eats. This tracker lets you record feeding times, food names, meal categories, amounts in grams and optional notes. You can compare the recorded amount with a daily target supplied by your veterinarian.",
        },
        {
          question: "Does this tool calculate how much my exotic pet should eat?",
          answer:
            "No. It does not calculate recommended portions, calorie requirements or nutritional needs. Different species and individual animals have different dietary requirements. Enter a target provided by a veterinarian who is familiar with your pet.",
        },
        {
          question: "Which animals can I use this feeding tracker for?",
          answer:
            "The tracker can be used as a general food-recording tool for different pets, including exotic animals. However, it does not contain species-specific feeding rules or nutritional guidance. Make sure the amount and measurement basis you record are appropriate for your animal and follow advice from a qualified veterinarian.",
        },
        {
          question: "What information should I enter in the daily feeding target?",
          answer:
            "Enter the daily amount recommended by your veterinarian in grams. The target is used only as a comparison value. The tracker does not check whether the amount is suitable for your pet's species, age, size, activity level or health condition.",
        },
        {
          question: "Can I use the tracker without setting a daily target?",
          answer:
            "Yes. Leave the target at 0 if you only want to record feeding activity. The tracker will still calculate the total amount logged, meal count, average meal size and other statistics. Target progress and the remaining amount are not calculated until you enter a target greater than zero.",
        },
        {
          question: "What meal categories are available?",
          answer:
            "You can categorize entries as Breakfast, Lunch, Dinner, Snack, Treat or Supplement. These labels help organize your feeding history. They do not change the amount calculation or provide a nutritional assessment.",
        },
        {
          question: "Can I record different foods separately?",
          answer:
            "Yes. Add a separate entry for each food or feeding you want to track. For example, you can record pellets, vegetables, fruit and supplements as separate entries with their own amounts and times. This makes it easier to review what was recorded during the day.",
        },
        {
          question: "Why does the amount field use grams?",
          answer:
            "The tracker uses grams as its common recording unit so the amounts can be added together. Enter each food amount in grams and use the same measurement basis for the daily target. The tool does not automatically convert ounces, cups, pieces or other units into grams.",
        },
        {
          question: "How is the total daily food amount calculated?",
          answer:
            "The tracker adds the amounts of all meal entries recorded for the selected date. For example, entries of 20 g, 30 g and 15 g produce a daily logged total of 65 g. All meal categories are included in this total, including snacks, treats and supplements.",
        },
        {
          question: "How is daily target progress calculated?",
          answer:
            "Progress is calculated by dividing the total amount logged by the daily target and multiplying the result by 100. For example, if your target is 100 g and you log 75 g, progress is 75%. The visual progress bar stops at 100%, but the displayed percentage can go higher if the logged amount exceeds the target.",
        },
        {
          question: "What does Amount remaining mean?",
          answer:
            "When the logged amount is below your entered target, Amount remaining shows the difference. For example, with a 100 g target and 70 g logged, the remaining amount is 30 g. It is a mathematical comparison, not an instruction to feed more. Follow your veterinarian's guidance when deciding whether to offer additional food.",
        },
        {
          question: "What happens when the recorded amount exceeds the target?",
          answer:
            "The dashboard displays the amount above the entered target and shows an exceeded-target status. It does not automatically recommend reducing the next meal or changing your pet's diet. Use the record as information and consult your veterinarian if you have concerns about feeding amounts.",
        },
        {
          question: "How are average meal and largest meal calculated?",
          answer:
            "Average meal is the total amount logged for the selected date divided by the number of entries. Largest meal is the highest individual amount among those entries. These statistics describe the records you entered; they do not determine whether a meal size is appropriate.",
        },
        {
          question: "What does Food items count mean?",
          answer:
            "Food items counts the number of distinct non-empty food names recorded for the selected date. Names are compared without distinguishing uppercase and lowercase letters. For example, entries named Pellets and pellets count as one distinct food name.",
        },
        {
          question: "Can I add a meal for a previous date?",
          answer:
            "Yes. Use the Tracking date field or Previous day button to select the date you want. Add the meal with its actual time and details. The new entry will be associated with the selected date rather than automatically using today's date.",
        },
        {
          question: "Can I edit or delete a feeding entry?",
          answer:
            "Yes. Select Edit beside an entry to load its details into the form. Update the information and save the changes. Select Delete to remove one entry. You can also clear all entries for the selected date using Clear selected day's log.",
        },
        {
          question: "Does the tracker save my feeding records automatically?",
          answer:
            "Yes. The tracker saves the pet name, daily target and meal entries automatically in your browser's local storage. Your records are intended to remain available when you return using the same browser and device, provided that the browser's stored site data has not been cleared.",
        },
        {
          question: "Are my feeding records stored in an online account?",
          answer:
            "No. This component uses browser local storage and does not implement account-based cloud synchronization. Your records are associated with the browser and device where you use the tracker. They will not automatically appear on another device or in another browser.",
        },
        {
          question: "Will my records disappear if I refresh the page?",
          answer:
            "Normally, no. The tracker saves its pet profile, target and meal records automatically in local storage, so refreshing the page should not remove them. Clearing browser site data, using private browsing or changing devices may make those records unavailable. Export important records as a CSV if you need a separate copy.",
        },
        {
          question: "What is included in the CSV export?",
          answer:
            "The CSV contains the selected day's meal entries with Date, Time, Meal Type, Food, Amount in grams and Notes columns. It exports the individual entries for that date rather than the complete weekly or monthly history.",
        },
        {
          question: "Can I export all my feeding history at once?",
          answer:
            "The current CSV export is for the selected date only. To keep records for multiple dates, select each date and export its meal log separately. The tracker does not currently provide a single all-history export.",
        },
        {
          question: "Can I copy my feeding summary to share with a veterinarian?",
          answer:
            "Yes. Copy daily summary copies the pet name, date, entered target, logged total, meal count and meal details to your clipboard. You can paste the text into an email, document or message. Review the summary before sharing it.",
        },
        {
          question: "Can I print my feeding report?",
          answer:
            "Yes. Select Print feeding report to open your browser's print dialog. From there, you can choose a printer or a PDF option if your browser or operating system provides one. The exact print layout depends on your browser.",
        },
        {
          question: "What do the 7-day and 30-day reports show?",
          answer:
            "The reports summarize the calendar days ending on your currently selected date. They display the total recorded grams, number of meal entries and number of days with at least one entry. They are summaries of recorded amounts, not nutritional evaluations or averages of daily requirements.",
        },
        {
          question: "Why is a day missing from Daily history?",
          answer:
            "Daily history lists up to the 10 most recent dates that contain at least one saved meal entry. A date with no recorded meals will not appear in the list. You can still select an earlier date using the date field or date navigation.",
        },
        {
          question: "Can I clear one day without deleting the rest of my records?",
          answer:
            "Yes. Select the date you want to clear and use Clear selected day's log. After you confirm, only meal entries for that date are removed. Your pet name, daily target and entries from other dates remain saved.",
        },
        {
          question: "What happens when I reset the tracker?",
          answer:
            "Reset clears the pet name, daily target and all meal entries saved by this tracker in the current browser. The tool asks for confirmation before deleting the records. Export any information you want to keep before resetting.",
        },
        {
          question: "Does this tracker calculate calories or nutritional values?",
          answer:
            "No. It records food amounts by weight in grams. It does not know the calorie density, protein, fat, fiber, vitamins, minerals or other nutritional values of the foods you enter. Two foods with the same weight can have very different nutritional content.",
        },
        {
          question: "Does this tool diagnose feeding problems or illness?",
          answer:
            "No. It is not a veterinary diagnostic tool and cannot determine why an animal is eating less, refusing food or changing its eating habits. Contact a qualified veterinarian if you notice appetite changes, unusual behavior or other health concerns.",
        },
        {
          question: "Is this feeding tracker a replacement for veterinary advice?",
          answer:
            "No. It is a record-keeping aid only. Species-specific diets and feeding amounts should be discussed with a veterinarian or qualified exotic-animal specialist who understands your pet's individual needs.",
        },
      ]}
      note="This tracker records the food amounts and feeding details you enter. It does not calculate calories, nutritional requirements, ideal portions or species-specific feeding recommendations. Use a daily target provided by a qualified veterinarian, and keep the target and meal entries on a consistent measurement basis. Records are saved in the current browser's local storage, not synchronized to an online account. Export important records if you need to keep a separate copy. If your pet refuses food, changes its eating habits or shows signs of illness, seek veterinary advice rather than relying on the tracker."
    />
  );
}
