"use client";

import { useRef, useState } from "react";
import ToolShell, { NumberField, Result, ToolLabel } from "../ToolShell";

type MealEntry = { id: number; amount: number; time: string; food: string };

export default function PetFeedingTracker() {
  const nextMealId = useRef(0);
  const [target, setTarget] = useState(0);
  const [amount, setAmount] = useState(0);
  const [food, setFood] = useState("");
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const loggedAmount = meals.reduce((total, meal) => total + meal.amount, 0);
  const difference = target - loggedAmount;
  const progress = target > 0 ? (loggedAmount / target) * 100 : 0;

  const reset = () => {
    setTarget(0);
    setAmount(0);
    setFood("");
    setMeals([]);
    nextMealId.current = 0;
  };

  const addMeal = () => {
    if (amount <= 0) return;
    setMeals((current) => [
      ...current,
      {
        id: nextMealId.current++,
        amount,
        time: new Date().toLocaleTimeString(),
        food: food.trim(),
      },
    ]);
    setAmount(0);
    setFood("");
  };

  const exportMealLog = () => {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [
      ["Time", "Food", "Amount (g)"].join(","),
      ...meals.map((meal) => [
        escapeCsv(meal.time),
        escapeCsv(meal.food),
        meal.amount.toFixed(1),
      ].join(",")),
    ];
    const url = URL.createObjectURL(new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "pet-feeding-log.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <ToolShell title="Feeding tracker" onReset={reset}>
      <NumberField label="Daily amount recommended by your veterinarian (g)" value={target} min={0.01} onChange={setTarget} />
      <ToolLabel>Food item or note (optional)<input className="tool-input" value={food} onChange={(event) => setFood(event.target.value)} placeholder="e.g. pellets, greens, supplement" /></ToolLabel>
      <NumberField label="Amount in this meal (g)" value={amount} min={0.01} onChange={setAmount} />
      <button type="button" className="btn" onClick={addMeal} disabled={amount <= 0}>Log meal</button>
      {target > 0
        ? <Result>Today&apos;s logged amount: <strong>{loggedAmount.toFixed(1)} g</strong> ({Math.max(0, progress).toFixed(0)}% of the entered target). {difference >= 0 ? `${difference.toFixed(1)} g remaining` : `${Math.abs(difference).toFixed(1)} g over target`}.</Result>
        : <Result>Today&apos;s logged amount: <strong>{loggedAmount.toFixed(1)} g</strong>. Enter a feeding target from your veterinarian to see a comparison.</Result>}
      {target > 0 && <div className="tool-progress" role="progressbar" aria-label="Amount logged toward daily target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, progress))}><span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>}
      {meals.length > 0 && <div className="tool-meal-log">
        <div className="tool-log-heading"><strong>Today&apos;s meal log</strong><div className="tool-inline-options"><button type="button" className="tool-secondary-button" onClick={exportMealLog}>Export CSV</button><button type="button" className="tool-secondary-button" onClick={() => setMeals([])}>Clear log</button></div></div>
        <ul>{meals.map((meal) => <li key={meal.id}><span className="tool-meal-detail"><strong>{meal.food || "Meal"}</strong><small>{meal.time}</small></span><strong>{meal.amount.toFixed(1)} g</strong><button type="button" className="tool-remove-button" aria-label={`Remove ${meal.amount} gram meal`} onClick={() => setMeals((current) => current.filter((entry) => entry.id !== meal.id))}>Remove</button></li>)}</ul>
      </div>}
      <p>This is a tracking aid only. It does not calculate dietary needs or recommend portions; species-specific nutrition should be discussed with an exotic-animal veterinarian.</p>
    </ToolShell>
  );
}
