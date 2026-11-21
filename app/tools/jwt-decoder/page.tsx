
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import JwtTool from "./JwtTool";

export const metadata: Metadata = {
  title: "Free JWT Decoder & Validator | ToolsAB",
  description:
    "Decode JWT tokens, inspect claims, analyze security warnings, and verify signatures using this free browser-based JWT debugger.",
  alternates: {
    canonical: "/tools/jwt-decoder",
  },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<JwtTool />}
      title="Free JWT Decoder & Security Debugger"
      summary="A JSON Web Token (JWT) can contain useful information about a user's identity, permissions, and authentication session. This tool helps you understand that information without manually decoding the token. Paste a JWT to inspect its header, payload, signature, and claims. You can also review security warnings and verify supported signatures using a shared secret or public key. The tool processes your token and verification key in your browser."

      highlights={[
        "Decode compact JWT tokens into readable header, payload, and signature sections.",
        "Inspect standard claims such as issuer, subject, audience, expiration, and issued-at time.",
        "View Unix timestamps as readable dates to understand when a token expires or becomes active.",
        "Review automated security warnings about missing claims, sensitive-looking data, and token header parameters.",
        "Verify supported HMAC, RSA, RSA-PSS, and ECDSA signatures using compatible keys.",
        "Compare the token's issuer and audience with values expected by your application.",
        "Adjust clock tolerance to account for small time differences between systems.",
        "Copy decoded information or download token data as JSON files.",
        "Use a sample JWT to explore the tool without preparing your own token.",
        "Decode and verify tokens locally in your browser without sending them to an application server.",
      ]}

      steps={[
        "Paste your JWT token: Copy the complete compact JWT from your application, API response, browser developer tools, or debugging environment. Paste it into the JWT token input field. A typical signed JWT contains three sections separated by dots: header.payload.signature. Avoid adding spaces or line breaks.",
        "Use the demo token: If you are new to JWTs, click Load demo token. The tool will insert an example token so you can explore the different sections and tabs. This sample uses alg: none and has an empty signature. It is intended only for learning and decoding, not for successful signature verification.",
        "Understand automatic decoding: After pasting a token, move away from the input field to trigger decoding. You can also press Ctrl + Enter on Windows or Linux, or Command + Enter on Mac. If the token is malformed or does not contain the expected three sections, the tool displays an error explaining the problem.",
        "Check the Token Overview: Once decoding succeeds, the overview displays four details. Algorithm shows the algorithm declared in the JWT header. Token Size shows the token's size in bytes or KB. Segments shows how many dot-separated sections the token contains. Signature indicates whether the signature section contains data.",
        "Explore the Decoder tab: This tab displays the JWT's three main parts separately. Header contains token metadata, Payload contains the claims, and Signature shows the encoded signature. Each section has its own copy button. You can also copy the signing input or download the decoded header, payload, or combined data as JSON.",
        "Understand the Header: The header commonly contains alg, which identifies the declared signing algorithm, and typ, which identifies the token type. It may also contain kid, a key identifier used by applications to select a verification key. These values come from the token and should not automatically be trusted.",
        "Understand the Payload: The payload contains claims, which are pieces of information carried by the token. Examples include a user ID, username, role, issuer, audience, and expiration time. JWT payloads are Base64URL-encoded, not encrypted. Anyone who has a regular signed JWT can generally decode and read its payload.",
        "Use the Claims Inspector tab: Open Claims Inspector to see the payload information in a table. Each row shows the claim name, its description, data type, and value. Standard claims are identified by their familiar names, while application-specific fields are shown as custom claims.",
        "Learn the common JWT claims: iss means Issuer, the system that created the token. sub means Subject, usually the user or entity the token refers to. aud means Audience, the application or service for which the token is intended. exp means Expiration, the time after which the token should no longer be accepted. nbf means Not Before, the time before which the token should not be accepted. iat means Issued At, the time the token was created. jti means JWT ID, a unique identifier for the token.",
        "Check the Time Claim Analysis: The tool converts numeric exp, nbf, and iat values from Unix timestamps into readable dates. It also indicates whether a token appears expired, is not active yet, or is active according to those timestamps and the browser's current time. This is useful when troubleshooting expired sessions and authentication errors.",
        "Review Security Analysis: Open Security Analysis to see automated warnings based on the token's algorithm, header, and payload. The tool can identify missing exp, iat, iss, or aud claims, an alg value of none, potentially sensitive claim names, external key URLs, and other notable header parameters. These are helpful indicators for debugging, but they do not constitute a complete security audit.",
        "Open Signature Verification: Select Signature Verification when you want to check whether the token's signature matches a verification key. The key you enter depends on the algorithm. HMAC algorithms require the shared secret used to sign the token. RSA and ECDSA algorithms require a compatible public key in PEM SubjectPublicKeyInfo format or public JWK JSON.",
        "Enter the Secret Key or Public Key: For HS256, HS384, and HS512, enter the shared HMAC secret as plain text. For RS256, RS384, RS512, PS256, PS384, PS512, ES256, ES384, and ES512, provide the corresponding public key. You can use a PEM public key or public JWK JSON. Do not enter a production private key. The tool does not need a private key to verify an asymmetric signature.",
        "Enter the Expected Issuer (optional): If your application expects tokens from a particular identity provider or authentication server, enter its expected issuer value. For example, this might be https://issuer.example.com. The tool compares your entry with the token's iss claim. The comparison requires an exact match. Leave this field empty to skip the issuer comparison.",
        "Enter the Expected Audience (optional): The audience identifies the application or service that should accept the token. Enter the expected audience, such as your-api, to compare it with the token's aud claim. The tool checks for an exact match against a string audience or an item in an audience array. Leave this field empty if you do not want to perform this comparison.",
        "Set Clock Tolerance in Seconds: This field allows a small difference between the clocks of the system that issued the token and the system checking it. For example, enter 60 to allow a 60-second tolerance when checking expiration and not-before time. Enter 0 for no additional tolerance. The accepted range is 0 to 86,400 seconds.",
        "Click Verify Signature and Claims: After entering the required key and any optional issuer or audience values, click Verify signature and claims. The tool reports the signature result separately from the configured claim checks. This distinction is important: a matching signature does not automatically mean that every claim is valid or that the token should be trusted.",
        "Understand the Verification Results: Signature verification passed means the signature matches the supplied key and signing input. Signature verification failed means the check did not match. Claim checks passed means the configured expiration, activation, issuer, and audience checks passed. Read the verification details for messages about skipped checks or problems.",
        "Copy or Download Results: Use the copy buttons to copy the complete token, header, payload, signature, or signing input. The download options let you save the header, payload, claims, or combined decoded information as JSON files for further inspection.",
        "Clear Your Workspace: Use the clear button beside the token input to remove the current token and its displayed results. The Reset option in the tool shell returns the entire tool, including verification settings, to its initial state.",
      ]}

      faqs={[
        {
          question: "What is a JWT?",
          answer:
            "JWT stands for JSON Web Token. It is a compact format used to transfer information between applications and services. JWTs are commonly used in authentication systems and APIs to carry information such as user identifiers, permissions, issuer details, and expiration times.",
        },
        {
          question: "How do I decode a JWT token?",
          answer:
            "Paste your complete JWT into the token input field. The tool attempts to decode it automatically when you leave the field. You can also press Ctrl + Enter on Windows or Linux, or Command + Enter on Mac. The decoded header, payload, and signature will appear in the Decoder tab.",
        },
        {
          question: "Does decoding a JWT verify its signature?",
          answer:
            "No. Decoding only makes the token's header and payload readable. It does not prove that the token came from a trusted source or that its contents have not been changed. Use the Signature Verification tab with the correct key to check the cryptographic signature.",
        },
        {
          question: "What are the three parts of a JWT?",
          answer:
            "A typical signed JWT has three parts separated by dots. The header describes the token and its declared signing algorithm. The payload contains claims or information about the token. The signature is used to check whether the token matches the signing key.",
        },
        {
          question: "Is a JWT encrypted?",
          answer:
            "A regular signed JWT is encoded, not encrypted. Its header and payload can generally be read by anyone who has the token. Avoid placing passwords, private keys, or other confidential information in a regular JWT payload. Encrypted JWTs use a different format and are not handled by this tool as ordinary three-part signed tokens.",
        },
        {
          question: "What does the alg field mean?",
          answer:
            "The alg field identifies the signing algorithm declared in the JWT header. Common values include HS256, RS256, PS256, and ES256. This value is provided by the token itself and should not be blindly trusted. Applications should enforce an explicit allowlist of permitted algorithms.",
        },
        {
          question: "What is the difference between HS256 and RS256?",
          answer:
            "HS256 uses a shared secret for signing and verification. RS256 uses an RSA private key to sign a token and the corresponding public key to verify it. With RS256, services can verify signatures without having access to the private signing key.",
        },
        {
          question: "Which JWT algorithms does this tool support?",
          answer:
            "The tool supports HS256, HS384, HS512, RS256, RS384, RS512, PS256, PS384, PS512, ES256, ES384, and ES512. Successful verification also depends on browser Web Crypto support and providing a compatible key in the expected format.",
        },
        {
          question: "What is the difference between decoding and signature verification?",
          answer:
            "Decoding reads the header and payload so you can inspect their contents. Signature verification checks whether the signature matches the signing input and the supplied key. Both are useful for debugging, but neither replaces the complete validation and authorization process performed by your application.",
        },
        {
          question: "What does the exp claim mean?",
          answer:
            "The exp claim represents the token's expiration time as a Unix timestamp. A token should generally not be accepted after this time. The tool converts a numeric exp value into a readable date and indicates whether it appears expired.",
        },
        {
          question: "What do iss and aud mean?",
          answer:
            "The iss claim identifies the issuer that created the token. The aud claim identifies the intended recipient or application. During verification, you can enter expected values to check whether these claims match what your application expects.",
        },
        {
          question: "What is clock tolerance?",
          answer:
            "Clock tolerance allows a small time difference between systems when checking time-based claims. For example, 60 seconds allows a one-minute tolerance when checking expiration and activation time. This can help when servers do not have perfectly synchronized clocks.",
        },
        {
          question: "What does alg: none mean?",
          answer:
            "The none algorithm indicates that the token does not have cryptographic signature protection. This tool displays a warning for such tokens and does not allow them to pass signature verification. Do not use unsigned tokens as proof of identity or authorization.",
        },
        {
          question: "Why does my JWT signature verification fail?",
          answer:
            "Common causes include using the wrong secret or public key, selecting a token that was changed after signing, providing an incompatible key format, or using a key that does not match the declared algorithm. Make sure you have the original complete token and the correct verification key.",
        },
        {
          question: "Can I use a private key for signature verification?",
          answer:
            "For the RSA and ECDSA algorithms supported by this tool, verification uses a public key, not a private key. The tool accepts a PEM SubjectPublicKeyInfo public key or public JWK JSON. Private JWKs containing the d parameter are rejected. Never paste a production private key into a debugging tool.",
        },
        {
          question: "What is a JWK?",
          answer:
            "JWK stands for JSON Web Key. It is a JSON format for representing cryptographic keys. This tool accepts public RSA or EC JWK data for asymmetric signature verification. The key must match the selected JWT algorithm.",
        },
        {
          question: "Does the tool send my JWT or verification key to a server?",
          answer:
            "The decoding, claim inspection, and signature verification logic in this component runs in your browser. It does not send the token or verification key to an application server. However, avoid using sensitive production credentials on shared or compromised devices.",
        },
        {
          question: "Can I use this tool for production authentication decisions?",
          answer:
            "Use it for development, debugging, and inspection, not as a replacement for backend security controls. Your application must independently verify signatures, enforce allowed algorithms, validate issuer and audience, check time-based claims, and apply its own authorization rules before accepting a token.",
        },
        {
          question: "What does the Load demo token button do?",
          answer:
            "It inserts a sample JWT containing example user and time claims. It is designed to help beginners explore the decoder, claims inspector, and security analysis tabs. The sample uses an unsigned token with alg: none, so it cannot be used to demonstrate successful signature verification.",
        },
      ]}

      note="Important: A decoded JWT is not automatically authentic or safe to use. Always verify its signature with a trusted key, enforce an approved signing algorithm, validate issuer and audience, check expiration and activation times, and perform authorization checks on your backend. Never share production tokens, HMAC secrets, or private keys."
    />
  );
}
