"use client";

import { useState } from "react";
import ToolShell, { Result, ToolLabel } from "../ToolShell";

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default function JwtTool() {
  const [jwt, setJwt] = useState("");
  const [result, setResult] = useState("");
  const [header, setHeader] = useState("");
  const [expiry, setExpiry] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setJwt("");
    setResult("");
    setHeader("");
    setExpiry("");
    setError("");
  };

  const decodeJwt = () => {
    try {
      const parts = jwt.trim().split(".");
      if (parts.length !== 3 || !parts[1]) throw new Error("Enter a three-part JWT.");
      const decodeSegment = (segment: string) => {
        const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
        const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
        if (!isJsonObject(parsed)) throw new Error("JWT header and payload must be JSON objects.");
        return parsed;
      };
      const decodedHeader = decodeSegment(parts[0]);
      const payload = decodeSegment(parts[1]);
      setHeader(JSON.stringify(decodedHeader, null, 2));
      setResult(JSON.stringify(payload, null, 2));
      const expiration = payload.exp;
      setExpiry(
        typeof expiration === "number" && Number.isFinite(expiration)
          ? expiration <= Date.now() / 1000
            ? `Expired ${new Date(expiration * 1000).toLocaleString()}`
            : `Expires ${new Date(expiration * 1000).toLocaleString()}`
          : "No numeric expiration (exp) claim",
      );
      setError("");
    } catch (reason) {
      setHeader("");
      setResult("");
      setExpiry("");
      setError(reason instanceof Error ? reason.message : "The token could not be decoded.");
    }
  };

  return (
    <ToolShell title="Token inspector" onReset={reset}>
      <ToolLabel>JWT<textarea className="tool-input" rows={4} value={jwt} onChange={(event) => setJwt(event.target.value)} placeholder="Paste a three-part token" /></ToolLabel>
      <button type="button" className="btn" onClick={decodeJwt}>Decode payload</button>
      {error && <p role="alert">{error}</p>}
      {expiry && <Result><strong>Expiration:</strong> {expiry}</Result>}
      {header && <Result><strong>Header</strong><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{header}</pre></Result>}
      {result && <Result><strong>Payload</strong><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{result}</pre></Result>}
      <p>Decoding does not verify the signature or establish trust. Do not paste production secrets into a shared device.</p>
    </ToolShell>
  );
}
