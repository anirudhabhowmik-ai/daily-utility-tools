"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import type { AdditionalToolKind } from "./config";
import { downloadBlob, FieldGrid, localDateString, NumberField, SelectField, TextField, ToolActions, ToolButton, ToolResult, useLocalStorageState } from "./ui";

type MoneyKind = Extract<
  AdditionalToolKind,
  "cross-marketplace-price-calculator" | "notice-period-date-calculator" | "subscription-cost-visualizer" | "trip-expense-splitter"
>;

type MarketplaceEstimate = { id: string; name: string; feePercent: number; fixedFee: number };

function MarketplaceCalculator() {
  const [cost, setCost] = useState(20);
  const [shipping, setShipping] = useState(5);
  const [packaging, setPackaging] = useState(1);
  const [taxPercent, setTaxPercent] = useState(0);
  const [markupPercent, setMarkupPercent] = useState(30);
  const [currency, setCurrency] = useState("USD");
  const [marketplaces, setMarketplaces] = useState<MarketplaceEstimate[]>([
    { id: "etsy", name: "Etsy sample", feePercent: 9.5, fixedFee: 0.45 },
    { id: "amazon", name: "Amazon sample", feePercent: 15, fixedFee: 0.3 },
    { id: "custom", name: "Other marketplace", feePercent: 10, fixedFee: 0.25 },
  ]);
  const totalCosts = cost + shipping + packaging;

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <TextField label="Currency code" value={currency} onChange={setCurrency} placeholder="USD" />
        <NumberField label="Product cost" value={cost} onChange={setCost} max={100000000} step={0.01} />
        <NumberField label="Shipping cost paid by seller" value={shipping} onChange={setShipping} max={100000000} step={0.01} />
        <NumberField label="Packaging and other costs" value={packaging} onChange={setPackaging} max={100000000} step={0.01} />
        <NumberField label="Tax/reserve rate on sale (%)" value={taxPercent} onChange={setTaxPercent} max={99} step={0.1} />
        <NumberField label="Target markup on costs (%)" value={markupPercent} onChange={setMarkupPercent} max={10000} step={1} />
      </FieldGrid>
      <div className="tool-table-wrap"><table className="tool-data-table">
        <thead><tr><th>Marketplace reference</th><th>Fee (%)</th><th>Fixed fee</th><th>Suggested price</th><th>Est. proceeds after entered costs</th></tr></thead>
        <tbody>{marketplaces.map((marketplace) => {
          const denominator = 1 - marketplace.feePercent / 100 - taxPercent / 100;
          const price = denominator > 0 ? (totalCosts * (1 + markupPercent / 100) + marketplace.fixedFee) / denominator : null;
          const proceeds = price === null ? null : price - price * marketplace.feePercent / 100 - marketplace.fixedFee - price * taxPercent / 100 - totalCosts;
          return <tr key={marketplace.id}>
            <td><input aria-label={`${marketplace.name} name`} className="tool-input" value={marketplace.name} onChange={(event) => {
              const name = event.currentTarget.value;
              setMarketplaces((current) => current.map((item) => item.id === marketplace.id ? { ...item, name } : item));
            }} /></td>
            <td><input aria-label={`${marketplace.name} fee percent`} className="tool-input" type="number" min="0" max="99" step="0.1" value={marketplace.feePercent} onChange={(event) => {
              const feePercent = event.currentTarget.valueAsNumber;
              if (Number.isFinite(feePercent) && feePercent >= 0 && feePercent < 100) setMarketplaces((current) => current.map((item) => item.id === marketplace.id ? { ...item, feePercent } : item));
            }} /></td>
            <td><input aria-label={`${marketplace.name} fixed fee`} className="tool-input" type="number" min="0" step="0.01" value={marketplace.fixedFee} onChange={(event) => {
              const fixedFee = event.currentTarget.valueAsNumber;
              if (Number.isFinite(fixedFee) && fixedFee >= 0) setMarketplaces((current) => current.map((item) => item.id === marketplace.id ? { ...item, fixedFee } : item));
            }} /></td>
            <td>{price === null ? <span className="tool-status-bad">Invalid fee total</span> : `${currency.toUpperCase()} ${price.toFixed(2)}`}</td>
            <td>{proceeds === null ? "—" : `${currency.toUpperCase()} ${proceeds.toFixed(2)}`}</td>
          </tr>;
        })}</tbody>
      </table></div>
      <ToolActions>
        <ToolButton secondary onClick={() => setMarketplaces((current) => [...current, { id: crypto.randomUUID(), name: "Custom marketplace", feePercent: 10, fixedFee: 0.25 }])}>Add marketplace</ToolButton>
        <ToolButton secondary onClick={() => setMarketplaces((current) => current.length > 1 ? current.slice(0, -1) : current)} disabled={marketplaces.length <= 1}>Remove last marketplace</ToolButton>
      </ToolActions>
      <ToolResult>
        <p>Prices use one shared cost, tax-reserve, and target-markup assumption for each marketplace.</p>
        <p className="tool-muted">Fee profiles are editable examples, not current platform quotations. The tax field is a simple percentage reserve and does not calculate tax liability. Enter a matching currency for every amount.</p>
      </ToolResult>
    </div>
  );
}

function NoticeDateCalculator() {
  const [startDate, setStartDate] = useState(localDateString());
  const [days, setDays] = useState(30);
  const [mode, setMode] = useState("calendar");
  const [includeStart, setIncludeStart] = useState(true);
  const [holidayProfile, setHolidayProfile] = useState("none");
  const [holidaysText, setHolidaysText] = useState("");

  const result = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { date: null, error: "Enter a valid start date." };
    const [year, month, day] = startDate.split("-").map(Number);
    const cursor = new Date(year, month - 1, day, 12);
    if (cursor.getFullYear() !== year || cursor.getMonth() !== month - 1 || cursor.getDate() !== day) return { date: null, error: "Enter a valid start date." };
    const starterHolidays: Record<string, string[]> = {
      us: [
        "2026-01-01", "2026-01-19", "2026-02-16", "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07", "2026-10-12", "2026-11-11", "2026-11-26", "2026-12-25",
        "2027-01-01", "2027-01-18", "2027-02-15", "2027-05-31", "2027-06-18", "2027-07-05", "2027-09-06", "2027-10-11", "2027-11-11", "2027-11-25", "2027-12-24",
      ],
      englandWales: [
        "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
        "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28",
      ],
    };
    const enteredHolidays = holidaysText.split(/[\s,;]+/).filter(Boolean);
    const invalidHoliday = enteredHolidays.find((value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return true;
      const [holidayYear, holidayMonth, holidayDay] = value.split("-").map(Number);
      const parsed = new Date(holidayYear, holidayMonth - 1, holidayDay, 12);
      return parsed.getFullYear() !== holidayYear || parsed.getMonth() !== holidayMonth - 1 || parsed.getDate() !== holidayDay;
    });
    if (invalidHoliday) return { date: null, error: `Check holiday date "${invalidHoliday}". Use a real YYYY-MM-DD date.` };
    const holidays = new Set([
      ...(starterHolidays[holidayProfile] ?? []),
      ...enteredHolidays,
    ]);
    if (mode === "calendar") {
      cursor.setDate(cursor.getDate() + days - (includeStart ? 1 : 0));
      return { date: cursor, error: "" };
    }
    let remaining = days;
    if (includeStart) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (cursor.getDay() !== 0 && cursor.getDay() !== 6 && !holidays.has(key)) remaining -= 1;
    }
    let guard = 0;
    while (remaining > 0 && guard < 40000) {
      cursor.setDate(cursor.getDate() + 1);
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (cursor.getDay() !== 0 && cursor.getDay() !== 6 && !holidays.has(key)) remaining -= 1;
      guard += 1;
    }
    return remaining === 0 ? { date: cursor, error: "" } : { date: null, error: "Could not calculate this date range." };
  }, [days, holidayProfile, holidaysText, includeStart, mode, startDate]);

  const dateLabel = result.date?.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <TextField label="Notice start date" type="date" value={startDate} onChange={setStartDate} />
        <NumberField label={mode === "calendar" ? "Notice length (calendar days)" : "Notice length (business days)"} value={days} onChange={setDays} min={1} max={10000} step={1} />
        <SelectField label="Count days as" value={mode} onChange={setMode} options={[{ value: "calendar", label: "Calendar days" }, { value: "business", label: "Business days (Mon–Fri)" }]} />
        <label className="tool-checkbox-field"><input type="checkbox" checked={includeStart} onChange={(event) => setIncludeStart(event.currentTarget.checked)} /><span>Count start date as day 1 when it qualifies</span></label>
      </FieldGrid>
      {mode === "business" && <>
        <SelectField label="Starter holiday calendar (optional)" value={holidayProfile} onChange={setHolidayProfile} options={[
          { value: "none", label: "No starter calendar" },
          { value: "us", label: "US federal holidays, observed (2026–2027 starter)" },
          { value: "englandWales", label: "England and Wales bank holidays (2026–2027 starter)" },
        ]} />
        <label className="tool-field"><span>Additional or adjusted holiday dates (YYYY-MM-DD)</span><textarea className="tool-input tool-textarea" value={holidaysText} onChange={(event) => setHolidaysText(event.currentTarget.value)} placeholder="2026-12-25, 2027-01-01" /></label>
      </>}
      <ToolResult>{result.error ? <p role="alert">{result.error}</p> : <p>Estimated final notice date: <strong>{dateLabel}</strong>.</p>}
        <p className="tool-muted">This counts days using your selected convention; it does not interpret legal, rental, employment, or cancellation terms. Starter calendars cover only 2026–2027 and exclude regional or employer-specific days; verify dates and add local holidays.</p>
      </ToolResult>
    </div>
  );
}

type Frequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
type Subscription = { id: string; name: string; amount: number; frequency: Frequency; nextDate: string };
const frequencyOptions: Array<{ value: Frequency; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];
const emptySubscriptions: Subscription[] = [];

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isSubscription(value: unknown): value is Subscription {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string"
    && typeof item.name === "string"
    && typeof item.amount === "number"
    && Number.isFinite(item.amount)
    && frequencyOptions.some((frequency) => frequency.value === item.frequency)
    && typeof item.nextDate === "string"
    && isValidDateString(item.nextDate);
}

function isSubscriptionList(value: unknown): value is Subscription[] {
  return Array.isArray(value) && value.every(isSubscription);
}

function recurrenceDate(base: Date, frequency: Frequency, occurrence: number) {
  const date = new Date(base);
  if (frequency === "weekly") date.setDate(date.getDate() + 7 * occurrence);
  else if (frequency === "biweekly") date.setDate(date.getDate() + 14 * occurrence);
  else if (frequency === "monthly" || frequency === "quarterly") {
    const months = occurrence * (frequency === "monthly" ? 1 : 3);
    const target = new Date(base.getFullYear(), base.getMonth() + months, 1, 12);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(base.getDate(), lastDay));
    return target;
  } else {
    const target = new Date(base.getFullYear() + occurrence, base.getMonth(), 1, 12);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(base.getDate(), lastDay));
    return target;
  }
  return date;
}

function upcomingRenewalDates(item: Subscription, now = new Date()) {
  const base = new Date(`${item.nextDate}T12:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0);
  const oneYearOut = new Date(today);
  oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
  let occurrence = 0;
  let date = recurrenceDate(base, item.frequency, occurrence);
  while (date < today && occurrence < 10000) {
    occurrence += 1;
    date = recurrenceDate(base, item.frequency, occurrence);
  }
  const dates: Date[] = [];
  while (date <= oneYearOut && dates.length < 60) {
    dates.push(date);
    occurrence += 1;
    date = recurrenceDate(base, item.frequency, occurrence);
  }
  return dates;
}

function SubscriptionVisualizer() {
  const [currency, setCurrency] = useState("USD");
  const [items, setItems, storageError] = useLocalStorageState("dailytools-subscriptions-v1", emptySubscriptions, isSubscriptionList);
  const [paste, setPaste] = useState("");
  const [error, setError] = useState("");

  const monthlyTotal = items.reduce((sum, item) => sum + item.amount * ({ weekly: 52 / 12, biweekly: 26 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 }[item.frequency]), 0);
  function parseLines() {
    const parsed: Subscription[] = [];
    for (const [index, raw] of paste.split(/\r?\n/).entries()) {
      if (!raw.trim()) continue;
      const [name, amountRaw, frequencyRaw, dateRaw] = raw.split(",").map((part) => part.trim());
      const amount = Number(amountRaw);
      const frequency = frequencyOptions.find((item) => item.value === frequencyRaw?.toLowerCase())?.value;
      if (!name || !Number.isFinite(amount) || amount <= 0 || !frequency || !isValidDateString(dateRaw ?? "")) {
        setError(`Line ${index + 1} needs: name,amount,frequency,next-date. Example: Music,9.99,monthly,2026-12-01`);
        return;
      }
      parsed.push({ id: crypto.randomUUID(), name, amount, frequency, nextDate: dateRaw ?? "" });
    }
    setItems((current) => [...current, ...parsed]);
    setPaste("");
    setError("");
  }

  function exportCalendar() {
    const events: string[] = [];
    const now = new Date();
    const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    for (const item of items) {
      for (const renewal of upcomingRenewalDates(item, now)) {
        const date = `${renewal.getFullYear()}${String(renewal.getMonth() + 1).padStart(2, "0")}${String(renewal.getDate()).padStart(2, "0")}`;
        events.push(`BEGIN:VEVENT\r\nUID:${item.id}-${date}@dailytools.local\r\nDTSTAMP:${stamp}\r\nDTSTART;VALUE=DATE:${date}\r\nSUMMARY:${escapeIcs(item.name)} renewal\r\nDESCRIPTION:${escapeIcs(currency.toUpperCase())} ${item.amount.toFixed(2)} (${item.frequency})\r\nEND:VEVENT`);
      }
    }
    const calendar = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//DailyTools//Subscription Renewals//EN\r\n${events.join("\r\n")}\r\nEND:VCALENDAR\r\n`;
    downloadBlob("subscription-renewals.ics", new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
  }

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid><TextField label="Currency code (all amounts should match)" value={currency} onChange={setCurrency} placeholder="USD" /></FieldGrid>
      <label className="tool-field"><span>Paste entries (one per line: name,amount,frequency,next-date)</span><textarea className="tool-input tool-textarea" value={paste} onChange={(event) => setPaste(event.currentTarget.value)} placeholder={"Music,9.99,monthly,2026-12-01\nCloud,24,yearly,2027-02-01"} /></label>
      <ToolActions>
        <ToolButton onClick={parseLines} disabled={!paste.trim()}>Add pasted entries</ToolButton>
        <ToolButton secondary onClick={exportCalendar} disabled={items.length === 0}>Download renewal calendar (.ics)</ToolButton>
        <ToolButton secondary onClick={() => { setItems([]); setError(""); }}>Clear all</ToolButton>
      </ToolActions>
      {(error || storageError) && <ToolResult><p role="alert">{error || storageError}</p></ToolResult>}
      <ToolResult><p>Estimated recurring total: <strong>{currency.toUpperCase()} {monthlyTotal.toFixed(2)} / month</strong> · {currency.toUpperCase()} {(monthlyTotal * 12).toFixed(2)} / year</p></ToolResult>
      {items.length > 0 && <div className="tool-table-wrap"><table className="tool-data-table">
        <thead><tr><th>Subscription</th><th>Amount</th><th>Frequency</th><th>Next renewal</th><th>Est. renewals / year</th><th></th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id}>
          <td><input aria-label="Subscription name" className="tool-input" value={item.name} onChange={(event) => {
            const name = event.currentTarget.value;
            setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, name } : entry));
          }} /></td>
          <td><input aria-label="Subscription amount" className="tool-input" type="number" min="0" step="0.01" value={item.amount} onChange={(event) => { const amount = event.currentTarget.valueAsNumber; if (Number.isFinite(amount) && amount >= 0) setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, amount } : entry)); }} /></td>
          <td><select aria-label="Billing frequency" className="tool-input" value={item.frequency} onChange={(event) => {
            const frequency = frequencyOptions.find((option) => option.value === event.currentTarget.value)?.value;
            if (frequency) setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, frequency } : entry));
          }}>{frequencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></td>
          <td><input aria-label="Next renewal date" className="tool-input" type="date" value={item.nextDate} onChange={(event) => {
            const nextDate = event.currentTarget.value;
            if (isValidDateString(nextDate)) setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, nextDate } : entry));
          }} /></td>
          <td>{upcomingRenewalDates(item).length}</td>
          <td><button className="tool-text-button" type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>Remove</button></td>
        </tr>)}</tbody>
      </table></div>}
      <p className="tool-muted">The list is saved in this browser only. Totals assume a single currency and exclude price changes, tax, and exchange rates.</p>
    </div>
  );
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

type TripExpense = { id: string; description: string; amount: number; paidBy: string; participants: string[] };
type TripState = { travelers: string[]; expenses: TripExpense[]; currency: string };

function encodeTrip(value: TripState) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeTrip(value: string): TripState {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== "object") throw new Error("The shared trip data is invalid.");
  const state = parsed as Partial<TripState>;
  if (!Array.isArray(state.travelers) || state.travelers.length < 1 || state.travelers.length > 20 || !state.travelers.every((name) => typeof name === "string")) throw new Error("The shared trip has an invalid traveler list.");
  if (!Array.isArray(state.expenses) || state.expenses.length > 500 || !state.expenses.every((expense) => expense && typeof expense.id === "string" && typeof expense.description === "string" && Number.isFinite(expense.amount) && expense.amount >= 0 && state.travelers?.includes(expense.paidBy) && Array.isArray(expense.participants) && expense.participants.every((name) => state.travelers?.includes(name)))) throw new Error("The shared trip contains invalid expense data.");
  return { travelers: state.travelers, expenses: state.expenses, currency: typeof state.currency === "string" ? state.currency.slice(0, 8) : "USD" };
}

function TripExpenseSplitter() {
  const [trip, setTrip] = useState<TripState>({ travelers: ["Alex", "Sam", "Jordan"], expenses: [], currency: "USD" });
  const [personInput, setPersonInput] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [paidBy, setPaidBy] = useState("Alex");
  const [participants, setParticipants] = useState<string[]>(["Alex", "Sam", "Jordan"]);
  const [shareLink, setShareLink] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#trip=([A-Za-z0-9_-]+)$/);
    if (!match) return;
    try {
      const loaded = decodeTrip(match[1]);
      startTransition(() => {
        setTrip(loaded);
        setPaidBy(loaded.travelers[0]);
        setParticipants(loaded.travelers);
        setMessage("Trip details were loaded from this link. Anyone with the link can see them.");
      });
    } catch (reason) {
      startTransition(() => setMessage(reason instanceof Error ? reason.message : "The shared trip link could not be read."));
    }
  }, []);

  const balances = useMemo(() => {
    const totals = new Map(trip.travelers.map((name) => [name, 0]));
    for (const expense of trip.expenses) {
      const paid = totals.get(expense.paidBy);
      if (paid === undefined || expense.participants.length === 0) continue;
      totals.set(expense.paidBy, paid + expense.amount);
      const share = expense.amount / expense.participants.length;
      for (const person of expense.participants) {
        const current = totals.get(person);
        if (current !== undefined) totals.set(person, current - share);
      }
    }
    return totals;
  }, [trip]);

  const transfers = useMemo(() => {
    const debtors = Array.from(balances, ([name, balance]) => ({ name, remaining: Math.round(-balance * 100) })).filter((item) => item.remaining > 0).sort((a, b) => b.remaining - a.remaining);
    const creditors = Array.from(balances, ([name, balance]) => ({ name, remaining: Math.round(balance * 100) })).filter((item) => item.remaining > 0).sort((a, b) => b.remaining - a.remaining);
    const result: Array<{ from: string; to: string; amount: number }> = [];
    let debtor = 0;
    let creditor = 0;
    while (debtor < debtors.length && creditor < creditors.length) {
      const cents = Math.min(debtors[debtor].remaining, creditors[creditor].remaining);
      if (cents > 0) result.push({ from: debtors[debtor].name, to: creditors[creditor].name, amount: cents / 100 });
      debtors[debtor].remaining -= cents;
      creditors[creditor].remaining -= cents;
      if (debtors[debtor].remaining === 0) debtor += 1;
      if (creditors[creditor].remaining === 0) creditor += 1;
    }
    return result;
  }, [balances]);

  function addPerson() {
    const name = personInput.trim();
    if (!name || trip.travelers.includes(name) || trip.travelers.length >= 20) return;
    setTrip((current) => ({ ...current, travelers: [...current.travelers, name] }));
    setParticipants((current) => [...current, name]);
    setPersonInput("");
  }

  function addExpense() {
    if (!description.trim() || amount <= 0 || participants.length === 0) {
      setMessage("Enter a description, positive amount, and at least one participant.");
      return;
    }
    setTrip((current) => ({ ...current, expenses: [...current.expenses, { id: crypto.randomUUID(), description: description.trim(), amount, paidBy, participants }] }));
    setDescription("");
    setAmount(0);
    setMessage("");
  }

  function createLink() {
    try {
      const token = encodeTrip(trip);
      const link = `${window.location.origin}${window.location.pathname}#trip=${token}`;
      setShareLink(link);
      setMessage(link.length > 6000 ? "This link is long and may not work in every app. It is not uploaded to a server." : "Share link created. The trip data is stored in the URL fragment.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "A share link could not be created.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      setMessage("Share link copied to clipboard.");
    } catch {
      setMessage("Clipboard access was denied. Select and copy the link from the field.");
    }
  }

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <TextField label="Currency code (all expenses should match)" value={trip.currency} onChange={(currency) => setTrip((current) => ({ ...current, currency: currency.slice(0, 8) }))} />
        <TextField label="Add traveler" value={personInput} onChange={setPersonInput} placeholder="Name" />
      </FieldGrid>
      <ToolActions><ToolButton onClick={addPerson} disabled={!personInput.trim() || trip.travelers.length >= 20}>Add traveler</ToolButton></ToolActions>
      <div className="tool-chip-row">{trip.travelers.map((person) => <span className="tool-chip" key={person}>{person} <button type="button" aria-label={`Remove ${person}`} onClick={() => {
        if (trip.travelers.length <= 1) return;
        setTrip((current) => ({ travelers: current.travelers.filter((name) => name !== person), expenses: current.expenses.filter((expense) => expense.paidBy !== person).map((expense) => ({ ...expense, participants: expense.participants.filter((name) => name !== person) })).filter((expense) => expense.participants.length > 0), currency: current.currency }));
        setParticipants((current) => current.filter((name) => name !== person));
        if (paidBy === person) setPaidBy(trip.travelers.find((name) => name !== person) ?? "");
      }}>×</button></span>)}</div>
      <FieldGrid>
        <TextField label="Expense description" value={description} onChange={setDescription} placeholder="Dinner" />
        <NumberField label={`Amount (${trip.currency.toUpperCase()})`} value={amount} onChange={setAmount} min={0} step={0.01} />
        <SelectField label="Paid by" value={paidBy} onChange={setPaidBy} options={trip.travelers.map((person) => ({ value: person, label: person }))} />
      </FieldGrid>
      <div className="tool-field">
        <span>Split this expense equally between</span>
        <div className="tool-chip-row">{trip.travelers.map((person) => <label className="tool-checkbox-chip" key={person}><input type="checkbox" checked={participants.includes(person)} onChange={(event) => {
          const checked = event.currentTarget.checked;
          setParticipants((current) => checked ? [...current, person] : current.filter((name) => name !== person));
        }} />{person}</label>)}</div>
      </div>
      <ToolActions>
        <ToolButton onClick={addExpense}>Add expense</ToolButton>
        <ToolButton secondary onClick={createLink}>Create share link</ToolButton>
        <ToolButton secondary onClick={() => { setTrip((current) => ({ ...current, expenses: [] })); setShareLink(""); setMessage("Expenses cleared."); }}>Clear expenses</ToolButton>
      </ToolActions>
      {trip.expenses.length > 0 && <div className="tool-table-wrap"><table className="tool-data-table">
        <thead><tr><th>Expense</th><th>Paid by</th><th>Amount</th><th>Split between</th><th></th></tr></thead>
        <tbody>{trip.expenses.map((expense) => <tr key={expense.id}><td>{expense.description}</td><td>{expense.paidBy}</td><td>{trip.currency.toUpperCase()} {expense.amount.toFixed(2)}</td><td>{expense.participants.join(", ")}</td><td><button className="tool-text-button" type="button" onClick={() => setTrip((current) => ({ ...current, expenses: current.expenses.filter((item) => item.id !== expense.id) }))}>Remove</button></td></tr>)}</tbody>
      </table></div>}
      <ToolResult>
        <h3>Balances</h3>
        <ul className="tool-check-list">{trip.travelers.map((person) => <li key={person}>{person}: {trip.currency.toUpperCase()} {(balances.get(person) ?? 0).toFixed(2)} {((balances.get(person) ?? 0) >= 0) ? "to receive" : "to pay"}</li>)}</ul>
        <h3>Suggested reimbursements</h3>
        {transfers.length ? <ul className="tool-check-list">{transfers.map((transfer, index) => <li key={`${transfer.from}-${transfer.to}-${index}`}>{transfer.from} pays {transfer.to} {trip.currency.toUpperCase()} {transfer.amount.toFixed(2)}</li>)}</ul> : <p>All balances are settled.</p>}
        {message && <p role="status">{message}</p>}
      </ToolResult>
      {shareLink && <label className="tool-field"><span>Share link (anyone with this link can read the encoded trip)</span><input className="tool-input" readOnly value={shareLink} onFocus={(event) => event.currentTarget.select()} /><ToolActions><ToolButton secondary onClick={() => { void copyLink(); }}>Copy link</ToolButton></ToolActions></label>}
      <p className="tool-muted">No account or server storage is used. Keep the link private if you do not want others to see the trip details.</p>
    </div>
  );
}

export default function MoneyTools({ kind }: { kind: MoneyKind }) {
  if (kind === "cross-marketplace-price-calculator") return <MarketplaceCalculator />;
  if (kind === "notice-period-date-calculator") return <NoticeDateCalculator />;
  if (kind === "subscription-cost-visualizer") return <SubscriptionVisualizer />;
  return <TripExpenseSplitter />;
}
