import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import JwtTool from "./JwtTool";

export const metadata: Metadata = {
  title: "JWT Decoder | ToolsAB",
  description: "Decode JWT payloads in the browser to inspect claims, expiry, and token structure without revealing secrets.",
  alternates: { canonical: "/tools/jwt-decoder" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<JwtTool />}
      title="JWT Decoder"
      summary="Decode JSON Web Tokens in the browser to check common claims such as expiration, audience, and issuer without sending secrets to a remote server."
      highlights={[
        "Inspect JWT payloads quickly during backend debugging and API troubleshooting.",
        "View claim data such as exp, iat, nbf, aud, and iss in a readable format.",
        "Helpful for confirming whether a token is expired, malformed, or missing expected claims.",
      ]}
      steps={[
        "Paste a JWT string into the input field.",
        "Review the decoded header and payload sections.",
        "Check the common claims to understand who issued the token and when it expires.",
        "Use the decoded output to troubleshoot authorization or API errors.",
      ]}
      faqs={[
        {
          question: "Does this verify the token signature?",
          answer: "This tool decodes the token payload, but it does not replace a proper server-side signature verification step. The full integrity check should still happen on the backend with the correct secret or public key.",
        },
        {
          question: "Why are JWTs useful for debugging?",
          answer: "JWTs often contain the identity, role, and time-based claims used by API gateways and web applications. Decoding them helps confirm whether the token carries the expected information.",
        },
        {
          question: "Can I use this for production security checks?",
          answer: "It is useful for quick testing and troubleshooting, but production security decisions should be based on validated backend checks and your application's authentication rules.",
        },
      ]}
      note="A decoded JWT is not the same as a trusted token. Always validate the signature and the audience, issuer, and expiry rules on the server before trusting any claims."
    />
  );
}
