
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import ScopeGuard from "./ScopeGuard";

export const metadata: Metadata = {
  title: "Freelancer Scope Guard – Project Scope Tracker | ToolsAB",
  description:
    "Organize freelance project deliverables, exclusions, assumptions and change requests. Track approvals, estimate project hours, identify scope risks and export project scope reports.",
  alternates: { canonical: "/tools/freelancer-scope-guard" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<ScopeGuard />}
      title="Freelancer Scope Guard"
      summary="Keep freelance projects organized by documenting exactly what is included, what is excluded and what may require additional work. Freelancer Scope Guard helps you create a project scope register, track approval status, assign priorities, estimate working hours and monitor change requests. Add project details, use ready-made website or software templates, review automatic project insights and export your scope document as PDF, CSV, Markdown or plain text. Your project information is automatically saved in your browser, so you can continue working without creating an account."
      highlights={[
        "Create a clear project scope register for freelance websites, software, design, marketing and consulting projects.",
        "Organize work into four sections: deliverables, exclusions, assumptions and change requests.",
        "Record a title, description, approval status, priority and estimated working hours for every scope item.",
        "Track pending, agreed and completed work without losing sight of outstanding requirements.",
        "Use ready-made website design and software development templates to add common project items quickly.",
        "Monitor high-priority pending items, approaching deadlines, overdue approvals and potential scope creep.",
        "See total deliverables hours, approved change-request hours and combined planned project hours.",
        "Calculate a confirmation progress percentage based on items marked agreed or completed.",
        "Search project items, filter by section or status and sort by creation date, priority, estimated hours or status.",
        "Approve all currently visible pending items together or remove completed items from the register.",
        "Export project information as PDF, CSV, Markdown or plain text for sharing, record keeping and further editing.",
        "Automatically save project details and scope items in your browser's local storage without requiring an account.",
      ]}
      steps={[
        "Start with Project details. Enter a Project name so you can identify the work you are tracking. For example, use Business website redesign, Mobile application development or Company branding project.",
        "Enter the Client / company name to identify the person or organization requesting the work. This field is useful when you manage projects for multiple clients.",
        "Enter the Project owner, such as your name or the person responsible for managing the work. This helps identify who is coordinating the project.",
        "Choose a Project type from the available options: Website, Software development, Mobile application, Marketing campaign, Design project or Consulting. This field describes the type of project; it does not automatically change the calculations or templates.",
        "Select the Target deadline using the date field. The dashboard uses this date to show how many calendar days remain or whether the deadline has passed.",
        "Move to Build your scope to add the individual tasks and requirements that make up your project. Each entry becomes a separate item in the scope register.",
        "Choose a Scope section for the item. Select Deliverables for work that is included in the agreed project, Exclusions for work that is not included, Assumptions for conditions or expectations, or Change requests for additional or modified requirements.",
        "Enter an Item title that clearly identifies the work. Examples include Homepage design, Contact form setup, User authentication, Logo design or Database schema.",
        "Use Description / details to explain exactly what the item means. Include useful information such as the expected result, features, limitations, revision boundaries or client responsibilities. Clear descriptions make it easier to understand what was originally planned.",
        "Choose an Approval status. Pending means the item has not yet been confirmed, Agreed means it has been accepted, and Completed means the work has been finished. You can update the status later from the scope register.",
        "Set the Priority to Low, Medium or High. Use High for important or time-sensitive requirements, Medium for normal project work and Low for less urgent items. Priority helps you organize work and identify high-priority items that are still pending.",
        "Enter Estimated effort (hours) to record how much working time the item may require. You can use decimal values, such as 2.5 hours. Enter 0 for items that do not need a time estimate, such as a simple exclusion or assumption.",
        "Select Add scope item to save the entry. The item appears in the Scope register, and the dashboard updates its counts and calculations automatically. An item title is required; the description and other fields can be left at their default values.",
        "If you need to change an existing entry, use its edit button in the Scope register. The item details will return to the form. Update the fields and select Save changes, or choose Cancel to leave the edit without saving it.",
        "Use the delete button on an item when you no longer need it. Deleting an item removes it from the project register. This action is not reversible through an undo feature.",
        "Use the Scope breakdown cards to view Deliverables, Exclusions, Assumptions or Change requests separately. Each card displays the number of items in that section. Select a card to filter the register, or select it again to return to all sections.",
        "If you are starting a website project, select the Web Design template. It adds example entries for Homepage Design, Contact Form Setup, Copywriting and Client Feedback. These are editable starting points, not mandatory requirements.",
        "For a software project, select the Software template. It includes example entries for User Authentication, Database Schema, Third-party API Fees and a Mobile App Version change request.",
        "Templates add only entries that do not already exist with the same section and title, ignoring differences in title capitalization. Newly added template entries begin with Pending status. Existing matching items are not overwritten.",
        "Open the Scope register to review all saved items. The displayed count tells you how many entries match your current filters compared with the total number of project items.",
        "Use the Search items field to find a particular requirement by its title or description. The search is useful when your project contains many deliverables and change requests.",
        "Choose a status filter to display All Statuses, Pending, Agreed or Completed items. You can combine this with a section filter to narrow down the register further.",
        "Use the section filter to show all sections or only one category, such as Deliverables or Change requests. The search, status and section filters work together.",
        "Choose a sorting option to organize the results. Newest first sorts by creation date, By Priority places High items before Medium and Low, By Hours places the largest estimates first, and By Status groups Pending before Agreed and Completed.",
        "Change an item's status directly from its status dropdown in the register. For example, update a Pending deliverable to Agreed after it has been confirmed with the client, then mark it Completed when the work is finished.",
        "Select Agree visible to change all Pending items currently displayed in the filtered register to Agreed. This action respects your current search and filters; it does not change hidden items or already completed items.",
        "Select Clear completed to remove all items marked Completed from the project register. This is useful for keeping the active list shorter, but it permanently removes those entries from the saved project data.",
        "Review the Live Dashboard to see the total number of tracked scope items, Agreed items, Pending items, Completed items and planned hours. These figures update as you add, edit or change the status of items.",
        "Check Smart insights for automatically generated warnings and information based on your project data. The tool can flag high-priority pending items, pending approvals near a deadline, overdue pending items, substantial approved change-request effort and projects without any exclusions.",
        "Use the Progress & timeline section to check your confirmation percentage and deadline information. The confirmation percentage counts both Agreed and Completed items as confirmed, divided by the total number of items.",
        "Review the effort breakdown to understand how much estimated work is assigned to original Deliverables and approved Change requests. The Total Planned figure combines deliverable hours with change-request hours that are no longer Pending.",
        "Open Export & share when you want to save a copy of your project scope. Choose CSV for spreadsheet applications, Markdown for documentation, Plain Text for a simple readable document or PDF for a formatted report.",
        "Select Export CSV to download a spreadsheet containing the project name, client, section, title, description, status, priority and estimated hours for each item.",
        "Select Export Markdown to download a structured document with project information, confirmation progress and separate sections for deliverables, exclusions, assumptions and change requests. Completed entries appear with checked task markers, while agreed entries use a separate marker.",
        "Select Export Plain Text to download a readable project scope document with project information, a status summary and all four scope sections. This format is useful for simple notes and text editors.",
        "Select Download PDF to create a formatted A4 project scope report. The PDF includes project information, summary statistics, each scope section and the details of its items. Wait for the export to finish before closing the page.",
        "Your project information and scope items are automatically saved in your browser's local storage. You do not need to press a separate Save button. Reopening the tool in the same browser profile allows it to load the saved project data.",
        "Use Reset in the tool's main toolbar only when you want to clear the project and start again. Confirm the reset when prompted. This removes the saved project data from this tool's local storage and resets the project details, items and filters.",
      ]}
      faqs={[
        {
          question: "What is a project scope tracker?",
          answer:
            "A project scope tracker is a place to record the work that belongs to a project, the work that is excluded, the assumptions behind the plan and any additional requests that arise later. It helps freelancers and project managers keep requirements visible and understand when new requests may change the original agreement.",
        },
        {
          question: "Who should use Freelancer Scope Guard?",
          answer:
            "Freelance web developers, designers, software developers, writers, marketing professionals, consultants and independent project managers can use it to organize project requirements. It is also useful for small teams that need a straightforward way to track deliverables and changes.",
        },
        {
          question: "What are deliverables?",
          answer:
            "Deliverables are the specific products, tasks or results that you have agreed to provide as part of a project. Examples include a website homepage, a contact form, a logo design, a mobile app login screen or a written report. Recording each deliverable separately makes the expected work easier to understand.",
        },
        {
          question: "What are project exclusions?",
          answer:
            "Exclusions describe work that is not part of the agreed project. For example, a website project might exclude copywriting, ongoing maintenance, paid stock images or additional language versions. Documenting exclusions helps prevent misunderstandings about what the original project price or timeline covers.",
        },
        {
          question: "What are project assumptions?",
          answer:
            "Assumptions are conditions or expectations that the project plan depends on. Examples include the client supplying website content on time, providing access to required accounts or giving feedback within an agreed period. If an assumption changes, the project schedule or required effort may also change.",
        },
        {
          question: "How should I record a change request?",
          answer:
            "Choose Change requests in the Scope section field, give the request a clear title and explain what has changed in the description. Set its priority, status and estimated hours. Keep it Pending until it has been discussed and agreed. You can then update its status as the request moves forward.",
        },
        {
          question: "What is the difference between Pending, Agreed and Completed?",
          answer:
            "Pending means the item has not been confirmed. Agreed means it has been accepted as part of the project plan. Completed means the work has been finished. These statuses help distinguish between proposed work, confirmed work and finished work.",
        },
        {
          question: "Does marking a change request as Agreed automatically update the project price?",
          answer:
            "No. The tool tracks estimated hours, status and project scope, but it does not calculate additional fees, change invoices or update a contract. Discuss the price and delivery impact with your client separately before accepting extra work.",
        },
        {
          question: "How does the project progress percentage work?",
          answer:
            "The confirmation percentage is calculated by counting all items marked Agreed or Completed, dividing that number by the total number of scope items and multiplying by 100. Pending items are not counted as confirmed. This measures scope confirmation, not the percentage of actual project work completed.",
        },
        {
          question: "Why does the progress percentage increase when I mark an item Agreed?",
          answer:
            "Agreed items count as confirmed in the progress calculation, just like Completed items. The percentage is designed to show how much of your project scope has been confirmed, not how much development or delivery work has been finished.",
        },
        {
          question: "How are planned project hours calculated?",
          answer:
            "Planned hours combine all estimated hours from Deliverables with the estimated hours of Change requests whose status is Agreed or Completed. Pending change requests are excluded from this figure. Hours recorded under Exclusions and Assumptions are not included in the planned-hours total.",
        },
        {
          question: "What does the high-priority warning mean?",
          answer:
            "The dashboard displays a warning when one or more items have High priority and Pending status. This helps you notice important requirements that still need confirmation. It is a reminder based on your entries, not an automatic assessment of the project's full risk.",
        },
        {
          question: "How does the deadline warning work?",
          answer:
            "The tool compares your target deadline with the current calendar date. If the deadline is within seven days and pending items remain, it displays a warning. If the deadline has passed while items are still pending, it displays an overdue warning. The calculation uses whole calendar days rather than working days.",
        },
        {
          question: "What does the scope creep warning mean?",
          answer:
            "The tool compares approved change-request hours with original deliverable hours. It displays a warning when approved change-request hours reach at least 50% of deliverable hours. This is a simple indicator that additional work may be becoming substantial; it does not automatically mean that a project is over budget.",
        },
        {
          question: "Why does the tool recommend adding exclusions?",
          answer:
            "If your register contains items but no exclusions, the dashboard displays a reminder to define what is not included. Exclusions can help clarify responsibilities and reduce disagreements about additional work. You can add them using the Exclusions section.",
        },
        {
          question: "What happens when I use the Agree visible button?",
          answer:
            "The button changes every Pending item currently visible in the Scope register to Agreed. It respects your active search, section and status filters. Items hidden by those filters remain unchanged.",
        },
        {
          question: "Can I use the website and software project templates?",
          answer:
            "Yes. The Web Design template provides sample homepage design, contact form, copywriting and client feedback entries. The Software template provides sample authentication, database schema, third-party API fee and mobile app change-request entries. You can edit or delete these examples to match your actual project.",
        },
        {
          question: "Can I search and sort my project scope items?",
          answer:
            "Yes. Search checks item titles and descriptions. You can filter by project section and status, then sort by newest first, priority, estimated hours or status. These controls can be combined to find the entries you need.",
        },
        {
          question: "Can I export my project scope to Excel?",
          answer:
            "You can export the scope register as a CSV file, which can be opened in spreadsheet applications such as Microsoft Excel and Google Sheets. The CSV contains project name, client, section, title, description, status, priority and estimated hours.",
        },
        {
          question: "Can I download a PDF project scope document?",
          answer:
            "Yes. Select Download PDF in the Export & share section. The tool generates an A4 report with project details, summary statistics and the items grouped under Deliverables, Exclusions, Assumptions and Change requests. PDF generation requires the browser to complete the export process.",
        },
        {
          question: "What is the difference between CSV, Markdown and plain text exports?",
          answer:
            "CSV is designed for spreadsheet applications and keeps the project items in columns. Markdown creates a structured document with headings and task markers, which is useful for documentation tools. Plain text creates a simple readable report that can be opened in basic text editors.",
        },
        {
          question: "Are my project details saved automatically?",
          answer:
            "Yes. The tool automatically saves project information and scope items in your browser's local storage. When you revisit the tool using the same browser profile, it attempts to restore the saved project. You do not need to create an account or manually save each change.",
        },
        {
          question: "Are project details uploaded to a server?",
          answer:
            "This component saves project details in the browser's local storage and does not implement a remote project-storage service or account-based synchronization. Your saved project is associated with the browser profile and device where you entered it. Avoid relying on this local copy as your only backup; export important project documents regularly.",
        },
        {
          question: "Can I access my saved project from another computer?",
          answer:
            "No automatic cloud synchronization is provided. Local storage belongs to the browser profile on the device where the project was created. To use the information elsewhere, export a copy of the project and keep it in a location you can access from your other device.",
        },
        {
          question: "What happens if I clear my browser data?",
          answer:
            "Clearing site data or browser storage can remove the project information saved by this tool. Export important project details as PDF, CSV, Markdown or plain text before clearing browser data or changing devices.",
        },
        {
          question: "Does Reset delete the saved project?",
          answer:
            "Yes. After you confirm the reset, the tool clears the project details and scope items and removes its saved project entry from local storage. This action cannot be undone, so export a backup first if you may need the information later.",
        },
        {
          question: "Does this tool replace a freelance contract?",
          answer:
            "No. Freelancer Scope Guard is a project planning and tracking tool, not a contract generator or legal service. Use a suitable written agreement to define payment terms, intellectual property, responsibilities, revision limits, deadlines and the process for approving additional work.",
        },
        {
          question: "Does the tool calculate project costs or client invoices?",
          answer:
            "No. You can estimate working hours, but the tool does not include hourly rates, project fees, budgets, taxes, invoices or payment tracking. Use the estimated hours as planning information and calculate pricing separately.",
        },
        {
          question: "Can multiple people edit the same project at the same time?",
          answer:
            "The current tool stores project information locally in one browser profile. It does not provide shared workspaces, user accounts, real-time collaboration or multi-user editing. If several people need to work on the scope, share an exported document and agree on how updates will be managed.",
        },
      ]}
      note="A clear project scope makes it easier to discuss expectations before work begins. Add specific deliverables, document exclusions and assumptions, and record new requests before treating them as approved work. The dashboard provides planning indicators based on the information you enter; it does not replace a client agreement, legal contract, budget review or professional project assessment. Export important records regularly because project data is stored locally in your browser rather than synchronized to a cloud account."
    />
  );
}
