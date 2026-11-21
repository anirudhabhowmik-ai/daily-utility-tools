
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import TokenCostCalculator from "./TokenCostCalculator";

export const metadata: Metadata = {
  title: "AI API Cost Calculator – Estimate LLM Token Pricing | ToolsAB",
  description:
    "Estimate AI API costs for input and output tokens, cached prompts, images, audio, video, embeddings and tool calls. Plan monthly usage, budgets and model comparisons.",
  alternates: { canonical: "/tools/llm-token-cost-calculator" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<TokenCostCalculator />}
      title="AI API Cost Calculator"
      summary="Plan your AI application expenses before you start building or scaling. Estimate the cost of text prompts, generated responses, cached tokens, images, audio, video, embeddings and tool calls. Enter your own provider rates and expected usage to see an estimated cost per request, daily average, monthly spending and yearly projection. You can also compare another model and check whether your planned usage fits your budget."
      highlights={[
        "Estimate input and output token costs using character counts or exact token counts from your API usage data.",
        "Enter your own AI provider, model name, currency and pricing rates instead of relying on fixed provider prices.",
        "Include regular input tokens, cached input tokens and generated output tokens in the text cost estimate.",
        "Account for additional usage such as image generation or processing, audio tokens, video minutes, embeddings and separately billed tool calls.",
        "Estimate monthly API spending using expected application requests, retry overhead and additional per-request charges.",
        "Track your estimated budget usage, remaining budget, daily average and yearly cost projection.",
        "Compare the text pricing of an alternative model using the same estimated input and output usage.",
        "Copy a complete cost report containing your assumptions, usage estimates, pricing inputs and calculated results.",
      ]}
      steps={[
        "Start with Provider and model details. Enter the name of your AI provider and the model you plan to use. These names are for your own reference; the calculator does not automatically detect the model or download its pricing.",
        "Choose a currency from USD, EUR, GBP or INR. Enter every price in the selected currency. Changing the currency changes the displayed symbol only; it does not convert prices using an exchange rate.",
        "Go to Text token usage and choose Estimate from characters if you know approximately how long your prompt and response will be. Enter the prompt characters, expected response characters and characters-per-token estimate.",
        "Your prompt estimate should account for the complete input sent to the model, including system instructions, conversation history and the latest user message. Your output estimate represents the response you expect the model to generate.",
        "If you already know the token counts from API usage records, select Enter exact tokens instead. Enter the input and output tokens expected for one application request.",
        "Open Text API pricing and enter the input price, output price and cached input price per one million tokens. Use the rates for the specific model and pricing tier you want to estimate.",
        "If you expect some input tokens to qualify for prompt or input caching, enter the estimated cached input percentage. The calculator applies the cached rate to that share of input tokens and the regular input rate to the rest.",
        "You can select Budget example, Mid-range example or Premium example to load illustrative text pricing rates. These are sample assumptions, not verified or live prices for a particular AI provider.",
        "If your application uses images, enter the average number of billable images per request and the price per image. Use a rate appropriate for your image generation or image processing operation.",
        "For audio workloads, enter the expected audio input and output tokens per request, along with the corresponding prices per one million audio tokens. If your provider bills audio by seconds, minutes or another unit, account for that cost under additional charges instead.",
        "For video processing, enter the video minutes used by an average request and the applicable price per minute. If billing is based on frames, tokens or another unit, convert the expected usage into an equivalent cost before entering it.",
        "For embedding workloads, enter the number of embedding tokens per request and the price per one million embedding tokens. Keep this usage separate from normal conversational input tokens to avoid counting it twice.",
        "Under Tool calls and web search, enter the number of separately billable tool calls per request and the price per 1,000 calls. Only include charges that are not already covered by another pricing field.",
        "In Monthly usage and budget planning, enter the number of application requests you expect to make each month. This means requests from your application, not individual tokens or tool calls.",
        "Enter the number of days you want to use for the daily average, your monthly spending budget and any additional cost per request that has not been included in the other sections.",
        "If your application sometimes retries failed or incomplete requests, enter an estimated retry overhead percentage. For example, 10% means the calculator assumes an average of 1.1 billed attempts for each application request.",
        "Enable Compare another text model if you want to compare a second model. Enter its name and separate input, cached input and output rates. The calculator keeps the same estimated usage and non-text charges for both models.",
        "Review the live results on the right. Check the estimated monthly API cost, effective cost per request, daily average, yearly projection and detailed cost breakdown.",
        "Use the Monthly budget tracker to see how much of your planned budget the estimate would use and whether the projected spending exceeds your limit.",
        "When you are satisfied with your assumptions, select Copy complete cost report to copy the inputs and calculated results for your own records or project planning.",
      ]}
      faqs={[
        {
          question: "What does an AI API cost calculator do?",
          answer:
            "An AI API cost calculator estimates how much it may cost to use a language model or other AI API. It uses your expected usage and entered pricing rates to calculate costs for input tokens, generated output, cached input and additional billable operations. This calculator also projects daily, monthly and yearly spending based on your expected application requests.",
        },
        {
          question: "What is an LLM token?",
          answer:
            "A token is a small unit of text that a language model processes or generates. A token can represent a complete short word, part of a longer word, punctuation or another piece of text. Token counts depend on the model's tokenizer, language and content. This is why two prompts with similar character counts may use different numbers of tokens.",
        },
        {
          question: "How does character-to-token estimation work?",
          answer:
            "The calculator divides the number of characters by your chosen characters-per-token value and rounds the result up to a whole token. For example, using an estimate of four characters per token, a 4,000-character prompt is estimated at 1,000 input tokens. This is only a rough planning method, not an exact tokenizer result. Code, punctuation and non-English text may produce different token counts.",
        },
        {
          question: "Should I use character estimates or exact token counts?",
          answer:
            "Use character estimates when you are planning a new application and do not yet have API usage data. Choose exact tokens when you already have token counts from provider usage records or a tokenizer compatible with your model. Exact usage data generally produces a more useful estimate than a general character conversion.",
        },
        {
          question: "What is the difference between input and output token pricing?",
          answer:
            "Input tokens are the text sent to the model, including instructions, conversation history and user messages. Output tokens are the text generated by the model. Providers often charge different rates for these two categories, so enter their respective prices separately.",
        },
        {
          question: "What are cached input tokens?",
          answer:
            "Some AI providers offer reduced prices for eligible input tokens that can be reused through a prompt or input caching feature. The cached input percentage tells this calculator what share of your input tokens should use the cached rate. Actual eligibility, cache rules and discounts depend on your provider and model.",
        },
        {
          question: "Does this calculator show live OpenAI, Anthropic or Google prices?",
          answer:
            "No. You enter the provider's prices yourself. The provider and model fields are labels for your estimate; the calculator does not connect to provider accounts, fetch current pricing or verify the rates you enter. Check the official pricing and billing documentation for the model you use.",
        },
        {
          question: "Can I calculate image generation or image processing costs?",
          answer:
            "Yes. Enter the average number of billable images per application request and the price of one image. This provides a simple per-image estimate. Some providers use more detailed pricing based on resolution, quality, dimensions or image input processing, so use an appropriate effective rate for your particular operation.",
        },
        {
          question: "Can I estimate audio and video API costs?",
          answer:
            "Yes. Audio usage can be entered as input and output tokens with separate rates per million tokens. Video usage can be entered as minutes per request with a price per minute. If your provider uses seconds, frames, characters, tasks or another billing unit, convert that usage into an equivalent cost or include it under additional charges.",
        },
        {
          question: "What are embedding tokens?",
          answer:
            "Embedding tokens are the text tokens processed by an embedding model to produce numerical representations of text. These representations are commonly used in semantic search, document retrieval and retrieval-augmented generation systems. This calculator provides a separate embedding section so you can include that expense in your estimate.",
        },
        {
          question: "How are tool calls and web search costs calculated?",
          answer:
            "Enter the number of separately billed tool calls per application request and the price per 1,000 calls. The calculator divides the call count by 1,000 and multiplies it by your entered rate. Some providers include certain tool operations in another charge or use different pricing units, so check your provider's billing rules before entering a rate.",
        },
        {
          question: "How does retry overhead affect the estimated cost?",
          answer:
            "Retry overhead represents additional average billed attempts. For example, 10% retry overhead means the calculator assumes 1.1 attempts per application request. It applies this multiplier to the entire estimated request cost, assuming each additional attempt repeats the same usage. Actual charges may be lower or higher if failed attempts use different amounts of resources or are not billed.",
        },
        {
          question: "How is the monthly AI API cost calculated?",
          answer:
            "The calculator first estimates the cost of one request by adding text, image, audio, video, embedding, tool and additional charges. It then applies the retry overhead multiplier to calculate the effective request cost. Finally, it multiplies that amount by your expected monthly application requests. The daily average uses your selected number of days, while the yearly projection multiplies the monthly estimate by 12.",
        },
        {
          question: "How does the alternative model comparison work?",
          answer:
            "The comparison uses the same estimated input tokens, output tokens and cached input percentage for both models. You enter a separate input, cached input and output rate for the alternative model. Image, audio, video, embedding, tool and additional per-request charges remain unchanged in the comparison. The result is a pricing comparison based on your assumptions, not a test of model quality or performance.",
        },
        {
          question: "Does selecting INR, EUR or GBP convert the prices automatically?",
          answer:
            "No. Currency selection changes the currency symbol and formatting only. If you select INR, for example, you must enter all pricing rates and your budget in rupees. The calculator does not retrieve exchange rates or convert amounts between currencies.",
        },
        {
          question: "Why might my actual AI API bill differ from this estimate?",
          answer:
            "Actual charges can differ because of tokenizer behavior, system prompts, conversation history, cached-token eligibility, image resolution, audio duration, video processing, model-specific pricing tiers, tool billing, retries, minimum charges, taxes and other provider rules. The estimate also depends on the usage and prices you enter. Compare your results with actual provider usage records and invoices.",
        },
        {
          question: "Can I use this calculator for a production AI application?",
          answer:
            "Yes, it can help with early budgeting, capacity planning and comparing pricing assumptions before deployment. For production planning, use measured token counts and actual usage records whenever possible. Keep some budget available for usage variations and charges that may not be represented by your estimates.",
        },
        {
          question: "Does the calculator send my API key or prompts to an AI provider?",
          answer:
            "This calculator does not ask for an API key or actual prompt content. You enter usage estimates and pricing assumptions manually. Its calculations run in your browser, and the report is prepared from the values you enter. It does not connect to an AI provider to make API requests.",
        },
        {
          question: "Can I save or share my cost estimate?",
          answer:
            "Use Copy complete cost report to copy the current configuration and calculated results as text. You can then paste the report into a document, spreadsheet, project note or message. The calculator does not provide an account-based cloud history of your estimates.",
        },
        {
          question: "Is this an official AI provider billing calculator?",
          answer:
            "No. It is an independent planning tool that uses the prices and usage assumptions you provide. It does not replace an official provider pricing page, usage dashboard or invoice. Always verify current rates and billing rules with your provider.",
        },
      ]}
      note="This calculator provides configurable estimates, not official billing totals. Its accuracy depends on the prices and usage assumptions you enter. Character-based token counts are approximate, currency selection does not perform exchange-rate conversion, and retry overhead assumes additional attempts repeat the same usage. Avoid counting the same charge in multiple sections, and verify current pricing, usage records, cache eligibility and billing rules with your AI provider before making budget decisions."
    />
  );
}
