"use client";

import { useState } from "react";
import ToolShell, { NumberField, Result } from "../ToolShell";

export default function TokenCostCalculator() {
  const [promptChars, setPromptChars] = useState(4000);
  const [outputChars, setOutputChars] = useState(2000);
  const [inputRate, setInputRate] = useState(3);
  const [outputRate, setOutputRate] = useState(15);
  const [monthlyRequests, setMonthlyRequests] = useState(100);
  const inputTokens = Math.ceil(promptChars / 4);
  const outputTokens = Math.ceil(outputChars / 4);
  const requestCost = (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000;

  const reset = () => {
    setPromptChars(4000);
    setOutputChars(2000);
    setInputRate(3);
    setOutputRate(15);
    setMonthlyRequests(100);
  };

  return (
    <ToolShell title="AI cost planner" onReset={reset}>
      <NumberField label="Prompt size (characters)" value={promptChars} onChange={setPromptChars} />
      <NumberField label="Expected response (characters)" value={outputChars} onChange={setOutputChars} />
      <NumberField label="Input price per 1M tokens ($)" value={inputRate} onChange={setInputRate} />
      <NumberField label="Output price per 1M tokens ($)" value={outputRate} onChange={setOutputRate} />
      <NumberField label="Expected requests per month" value={monthlyRequests} min={1} onChange={(value) => setMonthlyRequests(Math.floor(value))} />
      <Result>Estimated tokens per request: {inputTokens.toLocaleString()} input + {outputTokens.toLocaleString()} output. Approximate request cost: <strong>${requestCost.toFixed(6)}</strong>. At {monthlyRequests.toLocaleString()} requests/month: <strong>${(requestCost * monthlyRequests).toFixed(2)}/month</strong>.</Result>
      <p>Token counts are approximated as four characters per token. Replace the sample rates with your provider&apos;s current prices.</p>
    </ToolShell>
  );
}
