import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import PasswordGenerator from "./PasswordGenerator";

export const metadata: Metadata = {
  title: "Local-Only Password Generator | DailyTools",
  description: "Generate strong passwords in your browser with custom length, symbols, and character rules.",
  alternates: { canonical: "/tools/local-only-password-generator" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<PasswordGenerator />}
      title="Local-Only Password Generator"
      summary="Create strong, unique passwords in your browser without sending your preferences or outputs to a remote service."
      highlights={[
        "Choose password length, casing, and symbol rules to match your website or app requirements.",
        "Helpful for generating one-time secure passwords and account backups for personal use.",
        "Runs entirely in the browser, which helps keep generated secrets private and local.",
      ]}
      steps={[
        "Choose your password length and character rules.",
        "Pick whether you want uppercase, lowercase, numbers, and symbols.",
        "Generate a password and copy it into the relevant account or vault.",
        "Create a new one whenever you need to rotate or replace an old password.",
      ]}
      faqs={[
        {
          question: "Does the generator store my password?",
          answer: "No. The password is generated in the browser and is not stored by the site unless you copy it elsewhere such as a password manager or notes app.",
        },
        {
          question: "Can I create passwords that match a service's rules?",
          answer: "Yes. Most generators allow you to adjust length and character choices to match common password requirements for websites and apps.",
        },
        {
          question: "Is this better than a password manager?",
          answer: "A generator is useful for creating strong passwords, but a dedicated password manager is still the best way to save and organize them securely.",
        },
      ]}
      note="A long, random password is usually stronger than a memorable one. Store complex passwords in a trusted password manager and avoid reusing them across multiple accounts."
    />
  );
}
