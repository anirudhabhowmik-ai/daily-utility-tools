
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import LocalOnlyPasswordGenerator from "./LocalOnlyPasswordGenerator";

export const metadata: Metadata = {
  title: "Free Local-Only Password Generator | ToolsAB",
  description:
    "Create random passwords from 8 to 128 characters. Choose uppercase letters, lowercase letters, numbers, and symbols with this free browser-based password generator.",
  alternates: {
    canonical: "/tools/local-only-password-generator",
  },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<LocalOnlyPasswordGenerator />}
      title="Free Local-Only Password Generator"
      summary="Create a random password in seconds without having to think of complicated character combinations yourself. Choose the length, select the character types you want to include, and generate a password directly in your browser. Your generated password is not uploaded to a remote password-generation service by this tool."

      highlights={[
        "Generate passwords between 8 and 128 characters long.",
        "Choose uppercase letters, lowercase letters, numbers, and special symbols.",
        "Exclude commonly confused characters such as O, 0, I, l, and 1.",
        "Use quick length options to create passwords without manually entering a number.",
        "Check an estimated password strength based on the selected length and character pool.",
        "Generate passwords locally in your browser using its cryptographic random number generator.",
      ]}

      steps={[
        "Set your password length: Enter a number between 8 and 128 in the Password length field. A longer password generally offers more possible combinations and can be harder to guess. If you do not want to enter a number manually, use one of the Quick length buttons: 12, 16, 24, or 32.",
        "Choose uppercase letters: Turn on the Uppercase switch if you want capital letters such as A, B, C, and D in your password. This adds more possible characters to the password.",
        "Choose lowercase letters: Turn on the Lowercase switch to include small letters such as a, b, c, and d. Keeping both uppercase and lowercase enabled gives the generator more character choices.",
        "Choose numbers: Turn on the Numbers switch if you want digits from 0 to 9. Numbers can make your password combination more varied.",
        "Choose symbols: Turn on the Symbols switch to include special characters such as !, @, #, $, %, and other supported symbols. Some websites have restrictions on which symbols they accept, so check the account's password rules before using this option.",
        "Exclude look-alike characters: Keep this option enabled if you find it difficult to distinguish similar-looking characters. It removes O, 0, I, l, and 1 from the available character choices. Turn it off if you want those characters included.",
        "Generate your password: Click Generate password after choosing your settings. The tool creates a random password using the selected character types. At least one character from each selected type is included.",
        "Copy your password: When the password appears, click Copy to place it on your clipboard. If clipboard access is unavailable in your browser, you can select the displayed password and copy it manually.",
        "Check the estimated strength: The indicator below the generator shows an estimated strength level and entropy in bits. This estimate changes when you adjust the password length or character options. It is a guide, not a guarantee of how secure an account will be.",
      ]}

      faqs={[
        {
          question: "How do I use this password generator?",
          answer:
            "Choose a password length, select the character types you want, and decide whether to exclude look-alike characters. Then click Generate password. Your new password will appear below the button, where you can copy it.",
        },
        {
          question: "What password length should I choose?",
          answer:
            "A longer password generally provides more possible combinations. For everyday accounts, consider using at least 16 characters when the website allows it. You can choose any length from 8 to 128 characters with this tool, depending on the service's requirements.",
        },
        {
          question: "What do uppercase and lowercase letters mean?",
          answer:
            "Uppercase letters are capital letters such as A, B, and C. Lowercase letters are small letters such as a, b, and c. You can enable both options to allow the generator to use both types.",
        },
        {
          question: "What happens when I enable Numbers?",
          answer:
            "The generator can include digits from 0 to 9 in the password. If Exclude look-alike characters is enabled, the digits 0 and 1 are removed because they can be confused with letters.",
        },
        {
          question: "What are symbols in a password?",
          answer:
            "Symbols are special characters such as !, @, #, $, %, and other punctuation marks. Enabling this option gives the generator additional character choices. However, some websites do not accept every special character, so check their password requirements first.",
        },
        {
          question: "What does Exclude look-alike characters do?",
          answer:
            "This option removes five characters that can be difficult to tell apart in some fonts: uppercase O, zero (0), uppercase I, lowercase l, and number one (1). It can make a password easier to read and type manually.",
        },
        {
          question: "Can I use more than one character type?",
          answer:
            "Yes. You can enable uppercase letters, lowercase letters, numbers, and symbols together. The generator includes at least one character from every selected type and fills the remaining positions using the combined character pool.",
        },
        {
          question: "Why does the tool ask me to select a character type?",
          answer:
            "At least one character type must be enabled before a password can be generated. If all four character switches are turned off, the tool will ask you to select at least one option.",
        },
        {
          question: "What does the password strength indicator mean?",
          answer:
            "The indicator estimates the number of possible combinations based on your selected password length and available character pool. It displays an approximate entropy value in bits and a label such as Basic, Fair, Strong, or Very strong. It is an estimate rather than a complete security assessment.",
        },
        {
          question: "Is my generated password uploaded or stored?",
          answer:
            "The password is generated in your browser using the browser's cryptographic random number generator. This tool's password-generation code does not send the generated password to a remote password-generation service. If you copy it, it will be placed on your device's clipboard.",
        },
        {
          question: "Can I use the same password for multiple accounts?",
          answer:
            "It is better to use a different password for every account. If one website experiences a data breach, reusing that password elsewhere could put your other accounts at risk.",
        },
        {
          question: "Should I save my generated password?",
          answer:
            "Yes. Store it in a trusted password manager rather than an ordinary text file, email, or unprotected note. A password manager can help you keep unique passwords organized without having to remember each one.",
        },
        {
          question: "Is this password generator a replacement for a password manager?",
          answer:
            "No. This tool helps you create random passwords, but it does not provide secure password storage, automatic form filling, or account management. Use a trusted password manager to store and organize your passwords.",
        },
        {
          question: "Why can't I copy my password?",
          answer:
            "Clipboard access depends on your browser and its security settings. If the Copy button does not work, select the generated password manually and use your browser's copy shortcut. Clipboard access generally requires a secure website connection.",
        },
      ]}

      note="For better account security, use a unique password for every service and save it in a trusted password manager. Before using a generated password, check that it meets the website's length and character requirements. Never share your passwords with anyone."
    />
  );
}
