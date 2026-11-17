import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import ScopeGuard from "./ScopeGuard";

export const metadata: Metadata = {
  title: "Freelancer Scope Guard | DailyTools",
  description: "Track project scope, change requests, and delivery priorities to keep freelance work on budget and on time.",
  alternates: { canonical: "/tools/freelancer-scope-guard" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<ScopeGuard />}
      title="Freelancer Scope Guard"
      summary="Use a simple scope checklist to define work, document assumptions, and limit the risk of unpaid change requests on freelance projects."
      highlights={[
        "Keeps project requirements, deliverables, and assumptions visible in one place.",
        "Helpful for tracking revisions, extra tasks, and client feedback before they escalate.",
        "A practical planning aid for designers, developers, writers, and consultants.",
      ]}
      steps={[
        "List the core deliverables and the timeline for each item.",
        "Add assumptions, exclusions, and approval checkpoints to the project brief.",
        "Track any requested changes and compare them against the original scope.",
        "Prioritize what is included and what should be treated as a separate paid item.",
      ]}
      faqs={[
        {
          question: "Why is scope tracking important?",
          answer: "Without clear boundaries, even small requests can pile up and create extra work that was never agreed to. A simple scope document helps protect both the client and the freelancer.",
        },
        {
          question: "Does this replace a formal contract?",
          answer: "No. This tool is a helpful planning and tracking aid, but a written agreement or contract remains the best way to define legal terms, revisions, and payment milestones.",
        },
        {
          question: "What should be treated as an extra charge?",
          answer: "Anything outside the agreed scope, such as reorganizing a large amount of work, new asset requirements, or turnaround changes, should normally be discussed and priced separately before proceeding.",
        },
      ]}
      note="Good scope management is about clarity, not restriction. Good communication makes it easier to protect quality, timeline, and budget without making the project feel rigid or impersonal."
    />
  );
}
