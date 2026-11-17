import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import TokenCostCalculator from "./TokenCostCalculator";

export const metadata: Metadata = {
  title: "LLM Token Cost Calculator | DailyTools",
  description: "Estimate token usage and approximate AI model costs for prompts, chat sessions, and long-form generation tasks.",
  alternates: { canonical: "/tools/llm-token-cost-calculator" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<TokenCostCalculator />}
      title="LLM Token Cost Calculator"
      summary="Estimate prompt size, output length, and approximate AI model costs before starting a long conversation or generation task."
      highlights={[
        "Useful for budgeting AI projects and comparing model pricing.",
        "Helps estimate how much input and output text will cost at a given token rate.",
        "Good for quick planning, not for exact billing statements from your provider.",
      ]}
      steps={[
        "Enter the model name or pricing assumptions relevant to your workflow.",
        "Input the expected prompt length and estimated output length.",
        "Review the calculated total tokens and estimated spend.",
        "Use the estimate to plan prompts and compare model choices.",
      ]}
      faqs={[
        {
          question: "Is this the exact cost from my AI provider?",
          answer: "It is an estimate. Each provider may apply different pricing, context windows, cached prompt logic, or usage tiers. Always check the provider's official pricing page for your exact billing details.",
        },
        {
          question: "What is a token?",
          answer: "A token is a unit of text used by language models. Roughly speaking, more text means more tokens and usually more cost, especially for long inputs or large outputs.",
        },
        {
          question: "Why does output length matter?",
          answer: "Many models price both input and output separately. A longer completion can increase the final cost just as much as a large prompt, so it is important to consider both.",
        },
      ]}
      note="Use this tool as a planning estimate, especially when comparing models or running AI experiments that need a rough budget before launch."
    />
  );
}
