"use client";
import { useMemo, useState } from "react";
import ToolShell, { Result, ToolLabel } from "../ToolShell";
type JsonObject = Record<string, unknown>;
type DecodedToken = {
  header: JsonObject;
  payload: JsonObject;
  signature: string;
  signingInput: string;
  algorithm: string;
  raw: string;
  parts: string[];
};
type VerificationResult = {
  signatureValid: boolean;
  claimsValid: boolean;
  messages: string[];
};
// Always create an ArrayBuffer-backed byte array.
// This avoids TypeScript BufferSource errors with newer TypeScript versions.
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
const encoder = new TextEncoder();
function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new Error("Invalid Base64URL characters.");
  }
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
function decodeJsonSegment(segment: string): JsonObject {
  try {
    const bytes = base64UrlToBytes(segment);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed: unknown = JSON.parse(text);
    if (!isJsonObject(parsed)) {
      throw new Error("JWT header and payload must be JSON objects.");
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON objects")) {
      throw error;
    }
    throw new Error("Invalid Base64URL or JSON in JWT header/payload.");
  }
}
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
function encodeJsonSegment(value: JsonObject): string {
  return bytesToBase64Url(encoder.encode(JSON.stringify(value)));
}
function formatDate(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not provided";
  }
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime())
    ? "Invalid timestamp"
    : date.toLocaleString();
}
function getTimestampStatus(
  value: unknown,
  type: "exp" | "nbf" | "iat",
  now: number,
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not provided";
  }
  const date = formatDate(value);
  if (type === "exp") {
    return value <= now ? `Expired (${date})` : `Active until ${date}`;
  }
  if (type === "nbf") {
    return value > now ? `Not active yet (${date})` : `Active since ${date}`;
  }
  return `Issued at ${date}`;
}
function getByteSize(value: string): string {
  const bytes = encoder.encode(value).length;
  if (bytes < 1024) return `${bytes} bytes`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}
function getPemBytes(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s/g, "");
  if (!cleaned || !/^[A-Za-z0-9+/=]+$/.test(cleaned)) {
    throw new Error("Invalid PEM public key format.");
  }
  const binary = atob(cleaned);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return toArrayBuffer(bytes);
}
function getHash(algorithm: string): string {
  const hash = algorithm.slice(-3);
  if (!["256", "384", "512"].includes(hash)) {
    throw new Error(`Unsupported JWT algorithm: ${algorithm}`);
  }
  return `SHA-${hash}`;
}
function getCurve(algorithm: string): string {
  switch (algorithm) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw new Error(`Unsupported ECDSA algorithm: ${algorithm}`);
  }
}
async function importVerificationKey(
  algorithm: string,
  keyText: string,
): Promise<CryptoKey> {
  const hash = getHash(algorithm);
  const isJwk = keyText.trim().startsWith("{");
  let jwk: JsonWebKey | null = null;
  if (isJwk) {
    try {
      jwk = JSON.parse(keyText) as JsonWebKey;
    } catch {
      throw new Error("The JWK key is not valid JSON.");
    }
    if (jwk.kty !== "RSA" && jwk.kty !== "EC") {
      throw new Error(
        "For RSA/ECDSA verification, provide an RSA or EC public JWK.",
      );
    }
    if (jwk.d) {
      throw new Error(
        "This is a private JWK. Remove the private 'd' parameter and use a public JWK.",
      );
    }
  }
  if (algorithm.startsWith("RS") || algorithm.startsWith("PS")) {
    const importAlgorithm: RsaHashedImportParams = {
      name: algorithm.startsWith("PS") ? "RSA-PSS" : "RSASSA-PKCS1-v1_5",
      hash,
    };
    if (jwk) {
      if (jwk.kty !== "RSA") {
        throw new Error(
          "The selected JWT algorithm requires an RSA public key.",
        );
      }
      return crypto.subtle.importKey("jwk", jwk, importAlgorithm, false, [
        "verify",
      ]);
    }
    return crypto.subtle.importKey(
      "spki",
      getPemBytes(keyText),
      importAlgorithm,
      false,
      ["verify"],
    );
  }
  if (algorithm.startsWith("ES")) {
    const importAlgorithm: EcKeyImportParams = {
      name: "ECDSA",
      namedCurve: getCurve(algorithm),
    };
    if (jwk) {
      if (jwk.kty !== "EC") {
        throw new Error(
          "The selected JWT algorithm requires an EC public key.",
        );
      }
      return crypto.subtle.importKey("jwk", jwk, importAlgorithm, false, [
        "verify",
      ]);
    }
    return crypto.subtle.importKey(
      "spki",
      getPemBytes(keyText),
      importAlgorithm,
      false,
      ["verify"],
    );
  }
  throw new Error(`Unsupported asymmetric algorithm: ${algorithm}`);
}
async function verifySignature(
  token: DecodedToken,
  keyText: string,
): Promise<boolean> {
  const { algorithm, signingInput, signature } = token;
  if (!keyText.trim()) {
    throw new Error("Enter the verification key.");
  }
  if (!signature) {
    throw new Error("This token has an empty signature.");
  }
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto is unavailable. Use HTTPS or localhost.");
  }
  const data = toArrayBuffer(encoder.encode(signingInput));
  const signatureBytes = toArrayBuffer(base64UrlToBytes(signature));
  const hash = getHash(algorithm);
  if (algorithm.startsWith("HS")) {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      toArrayBuffer(encoder.encode(keyText)),
      {
        name: "HMAC",
        hash,
      },
      false,
      ["verify"],
    );
    return crypto.subtle.verify("HMAC", cryptoKey, signatureBytes, data);
  }
  const cryptoKey = await importVerificationKey(algorithm, keyText);
  if (algorithm.startsWith("PS")) {
    return crypto.subtle.verify(
      {
        name: "RSA-PSS",
        saltLength: Number(algorithm.slice(-3)) / 8,
      },
      cryptoKey,
      signatureBytes,
      data,
    );
  }
  if (algorithm.startsWith("RS")) {
    return crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      signatureBytes,
      data,
    );
  }
  if (algorithm.startsWith("ES")) {
    return crypto.subtle.verify(
      {
        name: "ECDSA",
        hash,
      },
      cryptoKey,
      signatureBytes,
      data,
    );
  }
  throw new Error(`Signature verification is not supported for ${algorithm}.`);
}
function getSecurityWarnings(token: DecodedToken): string[] {
  const warnings: string[] = [];
  const { header, payload, algorithm } = token;
  if (algorithm === "none") {
    warnings.push(
      "Critical: alg is none. This token has no cryptographic signature protection.",
    );
  }
  if (["HS384", "HS512"].includes(algorithm)) {
    warnings.push(
      `${algorithm} is not automatically unsafe, but security depends on a sufficiently strong secret and correct key management.`,
    );
  }
  if (algorithm === "HS256") {
    warnings.push(
      "HS256 is widely used. Security depends on a sufficiently random, high-entropy secret.",
    );
  }
  if (
    [
      "RS256",
      "RS384",
      "RS512",
      "PS256",
      "PS384",
      "PS512",
      "ES256",
      "ES384",
      "ES512",
    ].includes(algorithm)
  ) {
    warnings.push(
      `${algorithm} is a supported signing algorithm. Verify the signature and key provenance before trusting the token.`,
    );
  }
  if (!("exp" in payload)) {
    warnings.push(
      "No exp claim found. The token has no declared expiration time.",
    );
  }
  if (!("iat" in payload)) {
    warnings.push(
      "No iat claim found. The token does not declare when it was issued.",
    );
  }
  if (!("iss" in payload)) {
    warnings.push("No iss claim found. The token does not declare its issuer.");
  }
  if (!("aud" in payload)) {
    warnings.push(
      "No aud claim found. The token does not declare its intended audience.",
    );
  }
  const sensitiveNames = [
    "password",
    "passwd",
    "secret",
    "access_token",
    "refresh_token",
    "credit_card",
    "card_number",
    "ssn",
    "private_key",
  ];
  const payloadText = JSON.stringify(payload).toLowerCase();
  const detected = sensitiveNames.filter((name) =>
    payloadText.includes(`"${name}"`),
  );
  if (detected.length) {
    warnings.push(
      `Potentially sensitive claim names detected: ${detected.join(", ")}. JWT payloads are encoded, not encrypted.`,
    );
  }
  if (header.crit !== undefined) {
    warnings.push(
      "The header contains a crit parameter. Critical extensions require explicit application support.",
    );
  }
  if (header.jku || header.x5u) {
    warnings.push(
      "The header contains an external key URL. Do not automatically trust remote key locations.",
    );
  }
  if (header.kid !== undefined) {
    warnings.push(
      "A kid (key ID) is present. Make sure your server selects the correct trusted key.",
    );
  }
  if (header.zip !== undefined) {
    warnings.push(
      "A zip header is present. Compression handling must follow the relevant JWT specification.",
    );
  }
  if (token.raw.length > 10000) {
    warnings.push(
      "This is a large JWT. Check whether unusually large claims are necessary.",
    );
  }
  return warnings;
}
function getClaimRows(payload: JsonObject) {
  const labels: Record<string, string> = {
    iss: "Issuer",
    sub: "Subject",
    aud: "Audience",
    exp: "Expiration",
    nbf: "Not Before",
    iat: "Issued At",
    jti: "JWT ID",
  };
  return Object.entries(payload).map(([key, value]) => {
    const isTimestamp = ["exp", "nbf", "iat"].includes(key);
    return {
      key,
      label: labels[key] || "Custom Claim",
      value:
        isTimestamp && typeof value === "number"
          ? `${value} — ${formatDate(value)}`
          : typeof value === "string"
            ? value
            : JSON.stringify(value),
    };
  });
}
const styles = {
  panel: {
    border: "1px solid var(--border, #ddd)",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  } as const,
  pre: {
    whiteSpace: "pre-wrap" as const,
    overflowWrap: "anywhere" as const,
    fontSize: 13,
    lineHeight: 1.6,
    margin: 0,
    marginBottom: 10,
  },
  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: 12,
    borderRadius: 8,
    border: "1px solid var(--border, #ccc)",
    font: "inherit",
  },
  muted: {
    opacity: 0.75,
    fontSize: 13,
  },
};
type IconName = "token" | "copy" | "clear" | "key" | "globe" | "users" | "clock";

function ToolIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  return (
    <svg {...common}>
      {name === "token" && <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M8 10l-2 2 2 2M16 10l2 2-2 2M13 9l-2 6" /></>}
      {name === "copy" && <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>}
      {name === "clear" && <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></>}
      {name === "key" && <><circle cx="8" cy="15" r="5" /><path d="M11.5 11.5 21 2m-4 4 3 3m-6-1 3 3" /></>}
      {name === "globe" && <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>}
      {name === "users" && <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2" /></>}
      {name === "clock" && <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
    </svg>
  );
}

function IconButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="btn"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        width: 40,
        height: 40,
        minWidth: 40,
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <ToolIcon name={icon} size={17} />
    </button>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="btn" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
export default function JwtTool() {
  const [jwt, setJwt] = useState("");
  const [decoded, setDecoded] = useState<DecodedToken | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "decoder" | "claims" | "security" | "verify"
  >("decoder");
  const [keyText, setKeyText] = useState("");
  const [expectedIssuer, setExpectedIssuer] = useState("");
  const [expectedAudience, setExpectedAudience] = useState("");
  const [clockSkew, setClockSkew] = useState("0");
  const [verification, setVerification] = useState<VerificationResult | null>(
    null,
  );
  const [verificationError, setVerificationError] = useState("");
  const [copied, setCopied] = useState("");
  const now = Math.floor(Date.now() / 1000);
  const warnings = useMemo(
    () => (decoded ? getSecurityWarnings(decoded) : []),
    [decoded],
  );
  const claims = useMemo(
    () => (decoded ? getClaimRows(decoded.payload) : []),
    [decoded],
  );
  const reset = () => {
    setJwt("");
    setDecoded(null);
    setError("");
    setActiveTab("decoder");
    setKeyText("");
    setExpectedIssuer("");
    setExpectedAudience("");
    setClockSkew("0");
    setVerification(null);
    setVerificationError("");
    setCopied("");
  };
  const decodeJwt = (value = jwt) => {
    try {
      const raw = value.trim();
      if (!raw) {
        throw new Error("Paste a JWT token first.");
      }
      if (/\s/.test(raw)) {
        throw new Error(
          "The token contains whitespace. Paste the compact JWT without spaces or line breaks.",
        );
      }
      const parts = raw.split(".");
      if (parts.length !== 3) {
        throw new Error(
          "A signed JWT must contain three parts separated by dots.",
        );
      }
      const header = decodeJsonSegment(parts[0]);
      const payload = decodeJsonSegment(parts[1]);
      if (typeof header.alg !== "string") {
        throw new Error("The JWT header does not contain a valid alg value.");
      }
      const token: DecodedToken = {
        header,
        payload,
        signature: parts[2],
        signingInput: `${parts[0]}.${parts[1]}`,
        algorithm: header.alg,
        raw,
        parts,
      };
      setDecoded(token);
      setError("");
      setVerification(null);
      setVerificationError("");
      setActiveTab("decoder");
    } catch (reason) {
      setDecoded(null);
      setVerification(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "The token could not be decoded.",
      );
    }
  };
  const loadSample = () => {
    const header = {
      alg: "none",
      typ: "JWT",
    };
    const payload = {
      sub: "1234567890",
      name: "Demo User",
      role: "developer",
      iss: "https://example.com",
      aud: "toolsab-demo",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const sample = `${encodeJsonSegment(header)}.${encodeJsonSegment(payload)}.`;
    setJwt(sample);
    decodeJwt(sample);
  };
  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      setCopied("Clipboard unavailable");
    }
  };
  const downloadJson = (value: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };
  const verifyToken = async () => {
    if (!decoded) return;
    setVerification(null);
    setVerificationError("");
    try {
      const algorithm = decoded.algorithm;
      if (algorithm === "none") {
        throw new Error(
          "Tokens using alg: none cannot have a verified signature.",
        );
      }
      const signatureValid = await verifySignature(decoded, keyText);
      const messages: string[] = [];
      const skewValue = Number(clockSkew);
      if (!Number.isFinite(skewValue) || skewValue < 0 || skewValue > 86400) {
        throw new Error("Clock skew must be between 0 and 86400 seconds.");
      }
      const payload = decoded.payload;
      const currentTime = Math.floor(Date.now() / 1000);
      let claimsValid = true;
      if (
        typeof payload.exp === "number" &&
        currentTime > payload.exp + skewValue
      ) {
        claimsValid = false;
        messages.push("The token has expired.");
      }
      if (
        typeof payload.nbf === "number" &&
        currentTime + skewValue < payload.nbf
      ) {
        claimsValid = false;
        messages.push("The token is not active yet.");
      }
      if (expectedIssuer.trim() && payload.iss !== expectedIssuer.trim()) {
        claimsValid = false;
        messages.push("Issuer does not match the expected issuer.");
      }
      if (expectedAudience.trim()) {
        const aud = payload.aud;
        const audienceMatches =
          aud === expectedAudience.trim() ||
          (Array.isArray(aud) && aud.includes(expectedAudience.trim()));
        if (!audienceMatches) {
          claimsValid = false;
          messages.push("Audience does not match the expected audience.");
        }
      }
      if (typeof payload.exp !== "number") {
        messages.push("No numeric exp claim is available to check expiration.");
      }
      if (typeof payload.nbf !== "number") {
        messages.push(
          "No numeric nbf claim is available to check activation time.",
        );
      }
      if (!expectedIssuer.trim()) {
        messages.push(
          "Issuer comparison skipped because no expected issuer was entered.",
        );
      }
      if (!expectedAudience.trim()) {
        messages.push(
          "Audience comparison skipped because no expected audience was entered.",
        );
      }
      setVerification({
        signatureValid,
        claimsValid,
        messages,
      });
    } catch (reason) {
      setVerificationError(
        reason instanceof Error ? reason.message : "Verification failed.",
      );
    }
  };
  const tabButton = (tab: typeof activeTab, label: string) => (
    <button
  type="button"
  className="btn"
  onClick={() => setActiveTab(tab)}
  aria-pressed={activeTab === tab}
  style={{
    opacity: 1,
    borderBottom: activeTab === tab
      ? "3px solid #172033"
      : "3px solid transparent",
  }}
>
  {label}
</button>
  );
  return (
    <ToolShell title="JWT Decoder & Security Debugger" onReset={reset}>
      <div style={styles.panel}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <strong>JWT token input</strong>
          <ActionButton onClick={loadSample}>Load demo token</ActionButton>
        </div>

        <ToolLabel>
          Paste your compact JWT
          <div style={{ position: "relative", marginTop: 8 }}>
            <div
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                color: "var(--muted, #778196)",
                pointerEvents: "none",
                zIndex: 1,
              }}
            >
              <ToolIcon name="token" size={19} />
            </div>
            <textarea
              className="tool-input"
              rows={5}
              value={jwt}
              onChange={(event) => {
                setJwt(event.target.value);
                if (error) setError("");
              }}
              onBlur={() => {
                if (jwt.trim()) decodeJwt();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  decodeJwt();
                }
              }}
              placeholder="Paste your JWT token here..."
              spellCheck={false}
              style={{
                ...styles.input,
                paddingLeft: 44,
                paddingTop: 13,
                resize: "vertical",
              }}
            />
          </div>
        </ToolLabel>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 12,
          }}
        >
          <span style={styles.muted}>
            Automatically decodes when you leave the field. Press Ctrl + Enter to decode now.
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <IconButton
              icon="copy"
              label="Copy JWT token"
              disabled={!jwt.trim()}
              onClick={() => copyText(jwt.trim(), "Token copied")}
            />
            <IconButton
              icon="clear"
              label="Clear JWT token"
              disabled={!jwt && !decoded && !error}
              onClick={() => {
                setJwt("");
                setDecoded(null);
                setError("");
                setVerification(null);
                setVerificationError("");
                setCopied("");
                setActiveTab("decoder");
              }}
            />
          </div>
        </div>

        {error && (
          <p role="alert" style={{ color: "crimson", marginTop: 12 }}>
            {error}
          </p>
        )}
      </div>
      {decoded && (
        <>
          <div style={styles.panel}>
            <strong>Token overview</strong>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                marginTop: 12,
              }}
            >
              <div>
                <div style={styles.muted}>Algorithm</div>
                <strong>{decoded.algorithm}</strong>
              </div>
              <div>
                <div style={styles.muted}>Token size</div>
                <strong>{getByteSize(decoded.raw)}</strong>
              </div>
              <div>
                <div style={styles.muted}>Segments</div>
                <strong>{decoded.parts.length}</strong>
              </div>
              <div>
                <div style={styles.muted}>Signature</div>
                <strong>{decoded.signature ? "Present" : "Empty"}</strong>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 16,
            }}
          >
            {tabButton("decoder", "Decoder")}
            {tabButton("claims", "Claims Inspector")}
            {tabButton("security", "Security Analysis")}
            {tabButton("verify", "Signature Verification")}
          </div>
          {activeTab === "decoder" && (
            <>
              <Result>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <strong>Header</strong>
                  <ActionButton
                    onClick={() =>
                      copyText(
                        JSON.stringify(decoded.header, null, 2),
                        "Header copied",
                      )
                    }
                  >
                    Copy header
                  </ActionButton>
                </div>
                <pre style={styles.pre}>
                  {JSON.stringify(decoded.header, null, 2)}
                </pre>
              </Result>
              <Result>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <strong>Payload</strong>
                  <ActionButton
                    onClick={() =>
                      copyText(
                        JSON.stringify(decoded.payload, null, 2),
                        "Payload copied",
                      )
                    }
                  >
                    Copy payload
                  </ActionButton>
                </div>
                <pre style={styles.pre}>
                  {JSON.stringify(decoded.payload, null, 2)}
                </pre>
              </Result>
              <Result>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <strong>Signature (Base64URL)</strong>
                  <ActionButton
                    onClick={() =>
                      copyText(decoded.signature, "Signature copied")
                    }
                  >
                    Copy signature
                  </ActionButton>
                </div>
                <pre style={styles.pre}>
                  {decoded.signature || "(empty signature)"}
                </pre>
              </Result>
              <Result>
                <strong>Signing input</strong>
                <p style={styles.muted}>
                  This exact text is used as the message when verifying the
                  signature.
                </p>
                <pre style={styles.pre}>{decoded.signingInput}</pre>
                <ActionButton
                  onClick={() =>
                    copyText(decoded.signingInput, "Signing input copied")
                  }
                >
                  Copy signing input
                </ActionButton>
              </Result>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 12,
                }}
              >
                <ActionButton
                  onClick={() =>
                    downloadJson(decoded.header, "jwt-header.json")
                  }
                >
                  Download header
                </ActionButton>
                <ActionButton
                  onClick={() =>
                    downloadJson(decoded.payload, "jwt-payload.json")
                  }
                >
                  Download payload
                </ActionButton>
                <ActionButton
                  onClick={() =>
                    downloadJson(
                      {
                        header: decoded.header,
                        payload: decoded.payload,
                      },
                      "jwt-decoded.json",
                    )
                  }
                >
                  Download all decoded data
                </ActionButton>
              </div>
            </>
          )}
          {activeTab === "claims" && (
            <div style={styles.panel}>
              <strong>Claims Inspector</strong>
              <p style={styles.muted}>
                Standard and custom claims found in the payload.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          padding: 8,
                          borderBottom: "1px solid var(--border, #ddd)",
                        }}
                      >
                        Claim
                      </th>
                      <th
                        style={{
                          padding: 8,
                          borderBottom: "1px solid var(--border, #ddd)",
                        }}
                      >
                        Type
                      </th>
                      <th
                        style={{
                          padding: 8,
                          borderBottom: "1px solid var(--border, #ddd)",
                        }}
                      >
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim) => (
                      <tr key={claim.key}>
                        <td
                          style={{
                            padding: 8,
                            borderBottom: "1px solid var(--border, #ddd)",
                          }}
                        >
                          <strong>{claim.key}</strong>
                          <div style={styles.muted}>{claim.label}</div>
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderBottom: "1px solid var(--border, #ddd)",
                          }}
                        >
                          {typeof decoded.payload[claim.key]}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderBottom: "1px solid var(--border, #ddd)",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {claim.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 20 }}>
                <strong>Time claim analysis</strong>
                <p>
                  Expiration (`exp`):{" "}
                  {getTimestampStatus(decoded.payload.exp, "exp", now)}
                </p>
                <p>
                  Not Before (`nbf`):{" "}
                  {getTimestampStatus(decoded.payload.nbf, "nbf", now)}
                </p>
                <p>
                  Issued At (`iat`):{" "}
                  {getTimestampStatus(decoded.payload.iat, "iat", now)}
                </p>
              </div>
              <ActionButton
                onClick={() => downloadJson(decoded.payload, "jwt-claims.json")}
              >
                Download claims
              </ActionButton>
            </div>
          )}
          {activeTab === "security" && (
            <div style={styles.panel}>
              <strong>Security Analysis</strong>
              <p style={styles.muted}>
                These are automated checks, not a complete security audit.
              </p>
              {warnings.length === 0 ? (
                <p>No automated warnings were detected.</p>
              ) : (
                <ul style={{ paddingLeft: 20 }}>
                  {warnings.map((warning, index) => (
                    <li key={index} style={{ marginBottom: 10 }}>
                      {warning}
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ marginTop: 20 }}>
                <strong>Token time status</strong>
                <p>{getTimestampStatus(decoded.payload.exp, "exp", now)}</p>
                <p>{getTimestampStatus(decoded.payload.nbf, "nbf", now)}</p>
                <p>{getTimestampStatus(decoded.payload.iat, "iat", now)}</p>
              </div>
              <div style={{ marginTop: 20 }}>
                <strong>Important security notes</strong>
                <ul style={{ paddingLeft: 20 }}>
                  <li>Decoding does not prove that a token is authentic.</li>
                  <li>JWT payloads are Base64URL-encoded, not encrypted.</li>
                  <li>
                    Never trust claims until the signature and
                    application-specific rules are verified.
                  </li>
                  <li>
                    Never accept an algorithm chosen by an untrusted token
                    without an explicit server-side allowlist.
                  </li>
                  <li>
                    This analyzer does not replace server-side authorization
                    checks.
                  </li>
                </ul>
              </div>
            </div>
          )}
          {activeTab === "verify" && (
            <div style={styles.panel}>
              <strong>Signature Verification</strong>
              <p style={styles.muted}>
                Verify the signature using a trusted secret or public key. The
                key is processed in your browser.
              </p>
              <ToolLabel>
                Secret key or public key
                <div style={{ position: "relative", marginTop: 8 }}>
                  <span style={{ position: "absolute", top: 14, left: 14, color: "var(--muted, #778196)", pointerEvents: "none" }}>
                    <ToolIcon name="key" />
                  </span>
                  <textarea
                    rows={5}
                    value={keyText}
                    onChange={(event) => setKeyText(event.target.value)}
                    placeholder={
                      decoded.algorithm.startsWith("HS")
                        ? "Enter the shared HMAC secret"
                        : "Paste a PEM public key or public JWK JSON"
                    }
                    spellCheck={false}
                    style={{ ...styles.input, paddingLeft: 44 }}
                  />
                </div>
              </ToolLabel>
              <p style={styles.muted}>
                HMAC algorithms use the shared secret as plain text. RSA and
                ECDSA algorithms accept a PEM SubjectPublicKeyInfo public key or
                public JWK. Never enter a production private key here.
              </p>
              <ToolLabel>
                Expected issuer (optional)
                <div style={{ position: "relative", marginTop: 8 }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted, #778196)", pointerEvents: "none" }}>
                    <ToolIcon name="globe" />
                  </span>
                  <input
                    value={expectedIssuer}
                    onChange={(event) => setExpectedIssuer(event.target.value)}
                    placeholder="https://issuer.example.com"
                    style={{ ...styles.input, paddingLeft: 44 }}
                  />
                </div>
              </ToolLabel>
              <ToolLabel>
                Expected audience (optional)
                <div style={{ position: "relative", marginTop: 8 }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted, #778196)", pointerEvents: "none" }}>
                    <ToolIcon name="users" />
                  </span>
                  <input
                    value={expectedAudience}
                    onChange={(event) => setExpectedAudience(event.target.value)}
                    placeholder="your-api"
                    style={{ ...styles.input, paddingLeft: 44 }}
                  />
                </div>
              </ToolLabel>
              <ToolLabel>
                Clock tolerance in seconds
                <div style={{ position: "relative", marginTop: 8 }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted, #778196)", pointerEvents: "none" }}>
                    <ToolIcon name="clock" />
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="86400"
                    value={clockSkew}
                    onChange={(event) => setClockSkew(event.target.value)}
                    style={{ ...styles.input, paddingLeft: 44 }}
                  />
                </div>
              </ToolLabel>
              <div style={{ marginTop: 12 }}>
                <ActionButton onClick={verifyToken}>
                  Verify signature and claims
                </ActionButton>
              </div>
              {verificationError && (
                <p role="alert" style={{ color: "crimson", marginTop: 12 }}>
                  {verificationError}
                </p>
              )}
              {verification && (
                <div style={{ marginTop: 16 }}>
                  <Result>
                    <strong>Signature result</strong>
                    <p>
                      {verification.signatureValid
                        ? "Signature verification passed."
                        : "Signature verification failed."}
                    </p>
                  </Result>
                  <Result>
                    <strong>Claim checks</strong>
                    <p>
                      {verification.claimsValid
                        ? "The configured claim checks passed."
                        : "One or more claim checks failed."}
                    </p>
                  </Result>
                  <Result>
                    <strong>Verification details</strong>
                    <ul style={{ paddingLeft: 20 }}>
                      {verification.messages.map((message, index) => (
                        <li key={index}>{message}</li>
                      ))}
                    </ul>
                  </Result>
                  <p style={styles.muted}>
                    A successful signature check only confirms that the
                    signature matches the supplied key and signing input. It
                    does not establish that the key is trusted or that the user
                    is authorized.
                  </p>
                </div>
              )}
            </div>
          )}
          {copied && (
            <p role="status" style={{ fontSize: 13, marginTop: 12 }}>
              {copied}
            </p>
          )}
        </>
      )}
      <div style={styles.panel}>
        <strong>Privacy and security</strong>
        <p style={styles.muted}>
          Decoding, claim inspection, and signature verification run in your
          browser using the Web Crypto API. This component does not send tokens
          or keys to an application server. Avoid using production credentials
          on shared or compromised devices.
        </p>
        <p style={styles.muted}>
          Signature verification supports HS256/384/512, RS256/384/512,
          PS256/384/512 and ES256/384/512, subject to browser cryptographic
          support and compatible keys.
        </p>
      </div>
    </ToolShell>
  );
}
