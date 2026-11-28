
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import StarCounterTool from "./StarCounterTool";

export const metadata: Metadata = {
  title: "Star Counter - How Many Stars Can You See Tonight? | ToolsAB",
  description:
    "Use our free star counter to estimate how many stars may be visible in your night sky. Explore the effects of light pollution, cloud cover, and moonlight on stargazing.",
  alternates: {
    canonical: "/tools/star-counter",
  },
};

export default function StarCounterPage() {
  return (
    <ToolLandingPage
      toolContent={<StarCounterTool />}
      title="Star Counter - Estimate Visible Stars Tonight"
      summary="Curious about how many stars you can see from your location tonight? Use this free star counter to explore estimated night sky visibility. Select your light pollution level, adjust cloud cover and moonlight, and see how observing conditions may affect the number of visible stars."
      highlights={[
        "Estimate how many stars may be visible to the naked eye.",
        "Explore all nine levels of the Bortle light pollution scale.",
        "Adjust cloud cover to understand its effect on night sky visibility.",
        "Change moonlight brightness to compare different observing conditions.",
        "Enter your city or use your browser location.",
        "See an estimated star count and a visibility rating.",
        "Compare dark rural skies with bright suburban and urban skies.",
        "Get instant results when you change observing conditions.",
        "Use the calculator directly in your browser without creating an account.",
        "No paid API, registration, or image upload required.",
      ]}
      steps={[
        "Enter your city or use the location button to identify your observing area.",
        "Choose the Bortle sky class that most closely matches the light pollution around you.",
        "Adjust the cloud cover slider based on the current sky conditions.",
        "Set the moonlight brightness to represent the amount of light coming from the Moon.",
        "View the estimated number of visible stars and the visibility rating.",
        "Change the conditions to compare how different environments affect stargazing.",
      ]}
      faqs={[
        {
          question: "How many stars can you see with the naked eye?",
          answer:
            "Under exceptionally dark skies, people with good eyesight may see a few thousand stars across the entire sky. In bright cities, artificial lighting makes many faint stars difficult to see, so the visible number can be much lower.",
        },
        {
          question: "Does this tool show the exact number of stars above my city?",
          answer:
            "No. This version provides an approximate estimate based on typical visibility under different Bortle sky classes, with simplified adjustments for cloud cover and moonlight. It does not count individual stars in real time.",
        },
        {
          question: "What is the Bortle scale?",
          answer:
            "The Bortle scale is a nine-level system for describing night sky darkness and light pollution. Class 1 represents exceptionally dark skies, while Class 9 represents heavily light-polluted inner-city skies.",
        },
        {
          question: "Which Bortle class is best for stargazing?",
          answer:
            "Bortle Class 1 and Class 2 provide some of the darkest observing conditions. They are excellent for seeing faint stars, the Milky Way, and other night sky objects.",
        },
        {
          question: "Does cloud cover affect the number of visible stars?",
          answer:
            "Yes. Clouds can block starlight and reduce visibility. Thick cloud cover can prevent you from seeing stars altogether, while thin clouds and haze can make faint stars harder to distinguish.",
        },
        {
          question: "Does moonlight affect stargazing?",
          answer:
            "Yes. A bright Moon increases the brightness of the night sky, making faint stars less visible. A clear night around the new Moon is generally better for observing faint stars.",
        },
        {
          question: "Can I check star visibility for my city?",
          answer:
            "You can enter your city or use your browser's location feature to identify your observing area. However, the current version does not automatically retrieve your city's light pollution or live weather conditions.",
        },
        {
          question: "Why can I see fewer stars in a city?",
          answer:
            "Streetlights, buildings, advertisements, vehicles, and other artificial light sources brighten the sky. This effect, known as light pollution, reduces the contrast between stars and the background sky.",
        },
        {
          question: "Is this star counter free?",
          answer:
            "Yes. The calculator is free to use in your browser. It does not require an account, subscription, or paid API.",
        },
      ]}
      note="The star count is an educational estimate, not a real-time astronomical measurement. Actual visibility depends on your exact observing position, horizon, eyesight, atmospheric transparency, local lighting, clouds, and Moon position. The location button identifies your browser location but does not automatically determine your sky conditions."
    />
  );
}
