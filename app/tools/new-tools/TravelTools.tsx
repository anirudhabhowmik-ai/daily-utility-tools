"use client";

import { useMemo, useState } from "react";
import type { AdditionalToolKind } from "./config";
import { FieldGrid, localDateString, NumberField, SelectField, TextField, ToolResult } from "./ui";

type TravelKind = Extract<
  AdditionalToolKind,
  "plug-voltage-checker" | "cabin-bag-size-checker" | "jet-lag-planner" | "time-zone-overlap-finder"
>;

type ElectricalProfile = {
  voltageMin: number;
  voltageMax: number;
  hzMin: number;
  hzMax: number;
  plugs: string[];
};

const electrical: Record<string, ElectricalProfile> = {
  "United States": { voltageMin: 120, voltageMax: 120, hzMin: 60, hzMax: 60, plugs: ["A", "B"] },
  Canada: { voltageMin: 120, voltageMax: 120, hzMin: 60, hzMax: 60, plugs: ["A", "B"] },
  "United Kingdom": { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["G"] },
  Ireland: { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["G"] },
  Australia: { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["I"] },
  "New Zealand": { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["I"] },
  Japan: { voltageMin: 100, voltageMax: 100, hzMin: 50, hzMax: 60, plugs: ["A", "B"] },
  India: { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["C", "D", "M"] },
  France: { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["C", "E"] },
  Germany: { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["C", "F"] },
  Italy: { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["C", "F", "L"] },
  Spain: { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["C", "F"] },
  China: { voltageMin: 220, voltageMax: 220, hzMin: 50, hzMax: 50, plugs: ["A", "C", "I"] },
  Brazil: { voltageMin: 127, voltageMax: 220, hzMin: 60, hzMax: 60, plugs: ["C", "N"] },
  "South Africa": { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["C", "M", "N"] },
  Thailand: { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["A", "B", "C", "O"] },
  Mexico: { voltageMin: 127, voltageMax: 127, hzMin: 60, hzMax: 60, plugs: ["A", "B"] },
  Singapore: { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["G"] },
  "United Arab Emirates": { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["G"] },
  "South Korea": { voltageMin: 220, voltageMax: 220, hzMin: 60, hzMax: 60, plugs: ["C", "F"] },
  Switzerland: { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["C", "J"] },
  Portugal: { voltageMin: 230, voltageMax: 230, hzMin: 50, hzMax: 50, plugs: ["C", "F"] },
};

const zones = [
  { city: "New York", zone: "America/New_York" },
  { city: "Los Angeles", zone: "America/Los_Angeles" },
  { city: "Chicago", zone: "America/Chicago" },
  { city: "Toronto", zone: "America/Toronto" },
  { city: "Vancouver", zone: "America/Vancouver" },
  { city: "Mexico City", zone: "America/Mexico_City" },
  { city: "Sao Paulo", zone: "America/Sao_Paulo" },
  { city: "London", zone: "Europe/London" },
  { city: "Dublin", zone: "Europe/Dublin" },
  { city: "Paris", zone: "Europe/Paris" },
  { city: "Berlin", zone: "Europe/Berlin" },
  { city: "Helsinki", zone: "Europe/Helsinki" },
  { city: "Dubai", zone: "Asia/Dubai" },
  { city: "Mumbai", zone: "Asia/Kolkata" },
  { city: "Singapore", zone: "Asia/Singapore" },
  { city: "Bangkok", zone: "Asia/Bangkok" },
  { city: "Hong Kong", zone: "Asia/Hong_Kong" },
  { city: "Tokyo", zone: "Asia/Tokyo" },
  { city: "Seoul", zone: "Asia/Seoul" },
  { city: "Sydney", zone: "Australia/Sydney" },
  { city: "Auckland", zone: "Pacific/Auckland" },
];

const airlineLimits = [
  { airline: "Ryanair", item: "Cabin bag", length: 55, width: 40, height: 20, weight: 10, url: "https://help.ryanair.com/hc/en-gb/categories/12489112419089-Bag-Rules" },
  { airline: "easyJet", item: "Small cabin bag", length: 45, width: 36, height: 20, weight: null, url: "https://www.easyjet.com/en/help/baggage/cabin-bag-and-hold-luggage" },
  { airline: "British Airways", item: "Cabin bag", length: 56, width: 45, height: 25, weight: 23, url: "https://www.britishairways.com/content/information/baggage-essentials" },
  { airline: "Lufthansa", item: "Carry-on bag", length: 55, width: 40, height: 23, weight: 8, url: "https://www.lufthansa.com/gb/en/carry-on-baggage" },
  { airline: "Air Canada", item: "Standard article", length: 55, width: 40, height: 23, weight: null, url: "https://www.aircanada.com/ca/en/aco/home/plan/baggage/carry-on.html" },
  { airline: "Emirates", item: "Economy cabin bag", length: 55, width: 38, height: 20, weight: 7, url: "https://www.emirates.com/english/before-you-fly/baggage/cabin-baggage-rules/" },
  { airline: "Qatar Airways", item: "Economy cabin bag", length: 50, width: 37, height: 25, weight: 7, url: "https://www.qatarairways.com/en/baggage/allowance.html" },
];

function localParts(date: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

function zoneOffset(date: Date, zone: string) {
  const parts = localParts(date, zone);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - date.getTime();
}

function localToUtc(dateTime: string, zone: string) {
  const [date, time] = dateTime.split("T");
  if (!date || !time) throw new Error("Enter a valid local date and time.");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  let timestamp = Date.UTC(year, month - 1, day, hour, minute);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    timestamp = Date.UTC(year, month - 1, day, hour, minute) - zoneOffset(new Date(timestamp), zone);
  }
  return new Date(timestamp);
}

function formatTime(date: Date, zone: string) {
  return new Intl.DateTimeFormat(undefined, { timeZone: zone, weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function PlugChecker() {
  const countries = Object.keys(electrical);
  const [home, setHome] = useState("United States");
  const [destination, setDestination] = useState("United Kingdom");
  const [plug, setPlug] = useState("A");
  const [rating, setRating] = useState("100-240V 50/60Hz");
  const target = electrical[destination];
  const source = electrical[home];
  const voltageMatch = rating.match(/(\d{2,3})\s*(?:-|to|–)\s*(\d{2,3})\s*V|(\d{2,3})\s*V/i);
  const frequencyMatch = rating.match(/(\d{2})(?:\s*[-/]\s*(\d{2}))?\s*Hz/i);
  const deviceVoltageMin = voltageMatch ? Number(voltageMatch[1] ?? voltageMatch[3]) : null;
  const deviceVoltageMax = voltageMatch ? Number(voltageMatch[2] ?? voltageMatch[3]) : null;
  const deviceHz = frequencyMatch ? [Number(frequencyMatch[1]), Number(frequencyMatch[2] ?? frequencyMatch[1])] : null;
  const voltageOkay = deviceVoltageMin !== null && deviceVoltageMax !== null
    && deviceVoltageMin <= target.voltageMin && deviceVoltageMax >= target.voltageMax;
  const frequencyOkay = deviceHz !== null && deviceHz[0] <= target.hzMin && deviceHz[1] >= target.hzMax;
  const adapterNeeded = !target.plugs.includes(plug);

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <SelectField label="Home country" value={home} onChange={(value) => {
          setHome(value);
          setPlug(electrical[value].plugs[0]);
        }} options={countries.map((country) => ({ value: country, label: country }))} />
        <SelectField label="Destination" value={destination} onChange={setDestination} options={countries.map((country) => ({ value: country, label: country }))} />
        <SelectField label="Device plug type" value={plug} onChange={setPlug} options={"A B C D E F G H I J K L M N O".split(" ").map((type) => ({ value: type, label: `Type ${type}` }))} />
        <TextField label="Device input rating (as printed)" value={rating} onChange={setRating} placeholder="For example, 100-240V 50/60Hz" />
      </FieldGrid>
      <ToolResult>
        <p><strong>{destination}</strong>: {target.voltageMin === target.voltageMax ? `${target.voltageMin} V` : `${target.voltageMin}-${target.voltageMax} V`} · {target.hzMin === target.hzMax ? `${target.hzMin} Hz` : `${target.hzMin}-${target.hzMax} Hz`} · Type {target.plugs.join(", ")}</p>
        <ul className="tool-check-list">
          <li>{adapterNeeded ? `A Type ${plug}-to-${target.plugs.join("/")} plug adapter is likely needed.` : `Type ${plug} is listed among the destination's common plug types.`}</li>
          <li>{voltageOkay ? "The listed device voltage range covers the destination supply." : voltageMatch ? "The listed device voltage range does not cover the full destination supply range. Do not connect it without appropriate, correctly rated equipment." : "Could not read a voltage range from that rating. Check the device label manually."}</li>
          <li>{frequencyOkay ? "The listed device frequency range covers the destination supply." : frequencyMatch ? "The device frequency rating may not match the destination supply." : "Frequency rating was not detected; confirm it on the device label."}</li>
        </ul>
        <p className="tool-muted">Common supply where you selected home: {source.voltageMin}-{source.voltageMax} V, {source.hzMin}-{source.hzMax} Hz. Country supplies can vary.</p>
      </ToolResult>
    </div>
  );
}

function CabinBagChecker() {
  const [length, setLength] = useState(50);
  const [width, setWidth] = useState(35);
  const [height, setHeight] = useState(20);
  const [weight, setWeight] = useState(7);
  const [customName, setCustomName] = useState("My airline");
  const [customLength, setCustomLength] = useState(55);
  const [customWidth, setCustomWidth] = useState(40);
  const [customHeight, setCustomHeight] = useState(23);
  const [customWeight, setCustomWeight] = useState(8);
  const rows = [
    ...airlineLimits.map((limit) => ({ ...limit, custom: false })),
    { airline: customName || "Custom airline", item: "Custom reference", length: customLength, width: customWidth, height: customHeight, weight: customWeight || null, url: "", custom: true },
  ];

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <NumberField label="Bag length (cm)" value={length} onChange={setLength} max={250} step={0.1} />
        <NumberField label="Bag width (cm)" value={width} onChange={setWidth} max={250} step={0.1} />
        <NumberField label="Bag height (cm)" value={height} onChange={setHeight} max={250} step={0.1} />
        <NumberField label="Packed weight (kg)" value={weight} onChange={setWeight} max={100} step={0.1} />
      </FieldGrid>
      <details className="tool-editable-limits">
        <summary>Edit a custom airline limit</summary>
        <FieldGrid>
          <TextField label="Airline or rule name" value={customName} onChange={setCustomName} />
          <NumberField label="Length (cm)" value={customLength} onChange={setCustomLength} max={250} step={0.1} />
          <NumberField label="Width (cm)" value={customWidth} onChange={setCustomWidth} max={250} step={0.1} />
          <NumberField label="Height (cm)" value={customHeight} onChange={setCustomHeight} max={250} step={0.1} />
          <NumberField label="Weight limit (kg; 0 means no limit)" value={customWeight} onChange={setCustomWeight} max={100} step={0.1} />
        </FieldGrid>
      </details>
      <div className="tool-table-wrap">
        <table className="tool-data-table">
          <thead><tr><th>Reference</th><th>Maximum size (L × W × H)</th><th>Weight</th><th>Comparison</th></tr></thead>
          <tbody>{rows.map((row) => {
            const bagDimensions = [length, width, height].sort((a, b) => b - a);
            const limitDimensions = [row.length, row.width, row.height].sort((a, b) => b - a);
            const dimensionsFit = bagDimensions.every((dimension, index) => dimension <= limitDimensions[index]);
            const weightFit = row.weight === null || weight <= row.weight;
            return (
              <tr key={row.airline}>
                <td>{row.custom || !row.url ? row.airline : <a href={row.url} target="_blank" rel="noreferrer">{row.airline}</a>}<small>{row.item}</small></td>
                <td>{row.length} × {row.width} × {row.height} cm</td>
                <td>{row.weight === null ? "No limit shown" : `${row.weight} kg`}</td>
                <td><span className={dimensionsFit && weightFit ? "tool-status-good" : "tool-status-warn"}>{dimensionsFit && weightFit ? "Fits reference" : "Check bag size/weight"}</span></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <ToolResult><p>Measure the bag including wheels, handles, and any bulges. Airline allowances can differ by ticket, route, aircraft, and item category; confirm the official rules before departure.</p></ToolResult>
    </div>
  );
}

function JetLagPlanner() {
  const today = localDateString();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDateString(tomorrowDate);
  const [origin, setOrigin] = useState("America/New_York");
  const [destination, setDestination] = useState("Europe/London");
  const [departure, setDeparture] = useState(`${today}T18:00`);
  const [arrival, setArrival] = useState(`${tomorrow}T06:00`);
  const [days, setDays] = useState(4);
  let error = "";
  let departureUtc: Date | null = null;
  let arrivalUtc: Date | null = null;
  let hourDifference = 0;
  try {
    departureUtc = localToUtc(departure, origin);
    arrivalUtc = localToUtc(arrival, destination);
    if (arrivalUtc <= departureUtc) error = "Arrival must be after departure. Check both local date and time entries.";
    hourDifference = Math.round((zoneOffset(arrivalUtc, destination) - zoneOffset(departureUtc, origin)) / 3600000);
  } catch {
    error = "Enter valid departure and arrival dates and times.";
  }
  const eastbound = hourDifference > 0;
  const list = useMemo(() => {
    if (error || !departureUtc || !arrivalUtc) return [];
    const plan = [];
    for (let day = 1; day <= days; day += 1) {
      const shift = Math.min(Math.abs(hourDifference), day);
      const bedtime = ((23 * 60 - (eastbound ? shift : -shift) * 60) % 1440 + 1440) % 1440;
      const wake = (bedtime + 8 * 60) % 1440;
      plan.push({
        label: `Day ${day} before departure`,
        sleep: `${String(Math.floor(bedtime / 60)).padStart(2, "0")}:${String(bedtime % 60).padStart(2, "0")} – ${String(Math.floor(wake / 60)).padStart(2, "0")}:${String(wake % 60).padStart(2, "0")} at home`,
        light: eastbound ? "Prefer outdoor light earlier in your day; keep late evening dim." : "Prefer outdoor light later in your day; keep early morning light moderate.",
      });
    }
    plan.push({
      label: "Travel day",
      sleep: `Flight duration estimate: ${Math.max(0, (arrivalUtc.getTime() - departureUtc.getTime()) / 3600000).toFixed(1)} hours`,
      light: "Set your watch to destination time and, if practical, sleep during the destination's usual night.",
    });
    for (let day = 1; day <= 3; day += 1) {
      plan.push({
        label: `Destination day ${day}`,
        sleep: "Aim for a consistent local bedtime and a full night of sleep.",
        light: eastbound ? "Get daylight earlier in the local day and dim lights near bedtime." : "Get daylight later in the local day and keep the evening routine consistent.",
      });
    }
    return plan;
  }, [arrivalUtc, days, departureUtc, eastbound, error, hourDifference]);

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <SelectField label="Departure city time zone" value={origin} onChange={setOrigin} options={zones.map((city) => ({ value: city.zone, label: `${city.city} (${city.zone})` }))} />
        <SelectField label="Arrival city time zone" value={destination} onChange={setDestination} options={zones.map((city) => ({ value: city.zone, label: `${city.city} (${city.zone})` }))} />
        <TextField label="Departure date and local time" type="datetime-local" value={departure} onChange={setDeparture} />
        <TextField label="Arrival date and local time" type="datetime-local" value={arrival} onChange={setArrival} />
        <NumberField label="Days to prepare" value={days} onChange={setDays} min={1} max={7} step={1} />
      </FieldGrid>
      {error ? <ToolResult><p role="alert">{error}</p></ToolResult> : <ToolResult>
        <p>The destination is about <strong>{Math.abs(hourDifference)} hours {eastbound ? "ahead" : hourDifference < 0 ? "behind" : "offset from"}</strong> the departure time zone for this trip.</p>
        <ol className="tool-schedule-list">{list.map((item) => <li key={item.label}><strong>{item.label}</strong><span>{item.sleep}</span><span>{item.light}</span></li>)}</ol>
        <p className="tool-muted">General planning only. Light timing is approximate and can be mistimed; consult a clinician for health concerns or if you use sleep medication.</p>
      </ToolResult>}
    </div>
  );
}

function localMinutes(date: Date, zone: string) {
  const parts = localParts(date, zone);
  return parts.hour * 60 + parts.minute;
}

function OverlapFinder() {
  const [cityZones, setCityZones] = useState(["America/New_York", "Europe/London", "Europe/Paris"]);
  const [date, setDate] = useState(localDateString());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const overlap = useMemo(() => {
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    if (end <= start) {
      return { segments: [], error: "Workday end must be later than its start on the same local day." };
    }
    try {
      const startUtc = localToUtc(`${date}T00:00`, cityZones[0]);
      const nextDate = new Date(`${date}T12:00:00Z`);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      const nextDateString = nextDate.toISOString().slice(0, 10);
      const endUtc = localToUtc(`${nextDateString}T00:00`, cityZones[0]);
      const working = [];
      for (let time = startUtc.getTime(); time < endUtc.getTime(); time += 15 * 60 * 1000) {
        const instant = new Date(time);
        if (cityZones.every((zone) => {
          const minutes = localMinutes(instant, zone);
          return minutes >= start && minutes < end;
        })) working.push(instant);
      }
      const groups: Date[][] = [];
      for (const instant of working) {
        const current = groups[groups.length - 1];
        if (current && instant.getTime() - current[current.length - 1].getTime() === 15 * 60 * 1000) current.push(instant);
        else groups.push([instant]);
      }
      return { segments: groups.map((group) => ({ start: group[0], end: new Date(group[group.length - 1].getTime() + 15 * 60 * 1000) })), error: "" };
    } catch {
      return { segments: [], error: "Please enter a valid date and select supported time zones." };
    }
  }, [cityZones, date, endTime, startTime]);
  const { segments, error } = overlap;

  function setZone(index: number, zone: string) {
    setCityZones((current) => current.map((value, i) => i === index ? zone : value));
  }

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        {cityZones.map((zone, index) => (
          <div className="tool-inline-field" key={`${index}-${zone}`}>
            <SelectField label={`City ${index + 1} time zone`} value={zone} onChange={(value) => setZone(index, value)} options={zones.map((city) => ({ value: city.zone, label: `${city.city} (${city.zone})` }))} />
            {cityZones.length > 3 && <button className="tool-text-button" type="button" onClick={() => setCityZones((current) => current.filter((_, i) => i !== index))}>Remove</button>}
          </div>
        ))}
        <TextField label="Reference date" type="date" value={date} onChange={setDate} />
        <TextField label="Local workday starts" type="time" value={startTime} onChange={setStartTime} />
        <TextField label="Local workday ends" type="time" value={endTime} onChange={setEndTime} />
      </FieldGrid>
      <div className="tool-action-row">
        <button className="tool-secondary-button" type="button" disabled={cityZones.length >= 5} onClick={() => setCityZones((current) => [...current, "Europe/Paris"])}>Add city ({cityZones.length}/5)</button>
      </div>
      {error ? <ToolResult><p role="alert">{error}</p></ToolResult> : <ToolResult>
        {segments.length ? <ul className="tool-schedule-list">{segments.map((segment) => <li key={segment.start.toISOString()}>
          <strong>{formatTime(segment.start, cityZones[0])} – {formatTime(segment.end, cityZones[0])} reference</strong>
          {cityZones.map((zone) => <span key={zone}>{zones.find((city) => city.zone === zone)?.city ?? zone}: {formatTime(segment.start, zone)} – {formatTime(segment.end, zone)}</span>)}
        </li>)}</ul> : <p>No shared working window was found in the selected date range. Try adjusting the workday hours or city set.</p>}
        <p className="tool-muted">The selected date is interpreted in the first city&apos;s time zone. Daylight-saving changes come from your browser&apos;s time-zone data.</p>
      </ToolResult>}
    </div>
  );
}

export default function TravelTools({ kind }: { kind: TravelKind }) {
  if (kind === "plug-voltage-checker") return <PlugChecker />;
  if (kind === "cabin-bag-size-checker") return <CabinBagChecker />;
  if (kind === "jet-lag-planner") return <JetLagPlanner />;
  return <OverlapFinder />;
}
