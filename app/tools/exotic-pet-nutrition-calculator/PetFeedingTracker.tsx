
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ToolShell, { NumberField } from "../ToolShell";

/* =========================================================
   Types
========================================================= */

type MealType =
  | "Breakfast"
  | "Lunch"
  | "Dinner"
  | "Snack"
  | "Treat"
  | "Supplement";

type MealEntry = {
  id: number;
  date: string;
  time: string;
  type: MealType;
  food: string;
  amount: number;
  notes: string;
};

type SavedData = {
  version: number;
  petName: string;
  target: number;
  meals: MealEntry[];
};

const STORAGE_KEY = "pet-feeding-tracker-pro-v2";

const MEAL_TYPES: MealType[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Treat",
  "Supplement",
];

const EMPTY_DATA: SavedData = {
  version: 2,
  petName: "",
  target: 0,
  meals: [],
};

/* =========================================================
   Helpers
========================================================= */

function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shiftDate(dateString: string, amount: number): string {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return localDateString(date);
}

function currentTimeString(): string {
  const date = new Date();

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function formatDate(dateString: string): string {
  if (!dateString) return "";

  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(dateString: string): string {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function formatTime(time: string): string {
  if (!time) return "";

  const [hours, minutes] = time.split(":").map(Number);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return time;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function roundAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatAmount(value: number): string {
  return roundAmount(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T12:00:00`);

  return (
    !Number.isNaN(date.getTime()) &&
    localDateString(date) === value
  );
}

function isValidTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  );
}

function isMealType(value: unknown): value is MealType {
  return (
    typeof value === "string" &&
    MEAL_TYPES.includes(value as MealType)
  );
}

function validateMeal(value: unknown): MealEntry | null {
  if (!value || typeof value !== "object") return null;

  const meal = value as Record<string, unknown>;

  if (
    typeof meal.id !== "number" ||
    !Number.isSafeInteger(meal.id) ||
    meal.id < 0
  ) {
    return null;
  }

  if (!isValidDate(meal.date) || !isValidTime(meal.time)) {
    return null;
  }

  if (
    typeof meal.amount !== "number" ||
    !Number.isFinite(meal.amount) ||
    meal.amount <= 0
  ) {
    return null;
  }

  if (
    typeof meal.food !== "string" ||
    typeof meal.notes !== "string" ||
    !isMealType(meal.type)
  ) {
    return null;
  }

  return {
    id: meal.id,
    date: meal.date,
    time: meal.time,
    type: meal.type,
    food: meal.food.slice(0, 100),
    amount: roundAmount(meal.amount),
    notes: meal.notes.slice(0, 500),
  };
}

function validateSavedData(value: unknown): SavedData {
  if (!value || typeof value !== "object") {
    return EMPTY_DATA;
  }

  const data = value as Record<string, unknown>;

  const petName =
    typeof data.petName === "string"
      ? data.petName.slice(0, 50)
      : "";

  const target =
    typeof data.target === "number" &&
    Number.isFinite(data.target) &&
    data.target >= 0
      ? roundAmount(data.target)
      : 0;

  const meals = Array.isArray(data.meals)
    ? data.meals
        .map(validateMeal)
        .filter((meal): meal is MealEntry => meal !== null)
    : [];

  // Protect against duplicate IDs in malformed saved data.
  const uniqueMeals = Array.from(
    new Map(meals.map((meal) => [meal.id, meal])).values()
  );

  return {
    version: 2,
    petName,
    target,
    meals: uniqueMeals,
  };
}

function escapeCsv(value: string | number): string {
  const text = String(value);

  // Protect spreadsheet users from formula injection.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

  return `"${safe.replace(/"/g, '""')}"`;
}

function getDateRange(date: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) =>
    shiftDate(date, -(days - 1 - index))
  );
}

/* =========================================================
   Component
========================================================= */

export default function PetFeedingTracker() {
  const nextId = useRef(1);

  const [ready, setReady] = useState(false);

  const [petName, setPetName] = useState("");
  const [target, setTarget] = useState(0);
  const [meals, setMeals] = useState<MealEntry[]>([]);

  const [selectedDate, setSelectedDate] = useState("");

  const [food, setFood] = useState("");
  const [amount, setAmount] = useState(0);
  const [mealType, setMealType] = useState<MealType>("Breakfast");
  const [mealTime, setMealTime] = useState("");
  const [notes, setNotes] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  /* ---------------------------------------------------------
     Load saved data after mount
  --------------------------------------------------------- */

  useEffect(() => {
    const today = localDateString();

    setSelectedDate(today);
    setMealTime(currentTimeString());

    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = validateSavedData(JSON.parse(saved));

        setPetName(parsed.petName);
        setTarget(parsed.target);
        setMeals(parsed.meals);

        const largestId = parsed.meals.reduce(
          (largest, meal) => Math.max(largest, meal.id),
          0
        );

        nextId.current = largestId + 1;
      }
    } catch {
      // Continue with an empty tracker if storage is unavailable.
    }

    setReady(true);
  }, []);

  /* ---------------------------------------------------------
     Auto-save
  --------------------------------------------------------- */

  useEffect(() => {
    if (!ready) return;

    const data: SavedData = {
      version: 2,
      petName,
      target: roundAmount(target),
      meals,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // The tool remains usable if storage is unavailable.
    }
  }, [ready, petName, target, meals]);

  /* ---------------------------------------------------------
     Daily calculations
  --------------------------------------------------------- */

  const todaysMeals = useMemo(
    () => meals.filter((meal) => meal.date === selectedDate),
    [meals, selectedDate]
  );

  const loggedAmount = useMemo(
    () =>
      roundAmount(
        todaysMeals.reduce((total, meal) => total + meal.amount, 0)
      ),
    [todaysMeals]
  );

  const difference = roundAmount(target - loggedAmount);

  const remaining = Math.max(0, difference);
  const overTarget = Math.max(0, -difference);

  const rawProgress =
    target > 0 ? (loggedAmount / target) * 100 : 0;

  const progress = clampPercentage(rawProgress);

  const mealCount = todaysMeals.length;

  const averageMeal =
    mealCount > 0 ? roundAmount(loggedAmount / mealCount) : 0;

  const largestMeal =
    mealCount > 0
      ? Math.max(...todaysMeals.map((meal) => meal.amount))
      : 0;

  const uniqueFoods = new Set(
    todaysMeals
      .map((meal) => meal.food.trim().toLowerCase())
      .filter(Boolean)
  ).size;

  const targetReached = target > 0 && difference <= 0 && difference >= -0.005;

  /* ---------------------------------------------------------
     Weekly and monthly summaries
  --------------------------------------------------------- */

  const weeklyDates = useMemo(
    () => getDateRange(selectedDate, 7),
    [selectedDate]
  );

  const monthlyDates = useMemo(
    () => getDateRange(selectedDate, 30),
    [selectedDate]
  );

  const weeklyMeals = useMemo(
    () => meals.filter((meal) => weeklyDates.includes(meal.date)),
    [meals, weeklyDates]
  );

  const monthlyMeals = useMemo(
    () => meals.filter((meal) => monthlyDates.includes(meal.date)),
    [meals, monthlyDates]
  );

  const weeklyTotal = roundAmount(
    weeklyMeals.reduce((total, meal) => total + meal.amount, 0)
  );

  const monthlyTotal = roundAmount(
    monthlyMeals.reduce((total, meal) => total + meal.amount, 0)
  );

  const weeklyDays = new Set(weeklyMeals.map((meal) => meal.date)).size;

  const monthlyDays = new Set(monthlyMeals.map((meal) => meal.date)).size;

  const dailyHistory = useMemo(() => {
    const grouped = new Map<string, number>();

    meals.forEach((meal) => {
      grouped.set(
        meal.date,
        roundAmount((grouped.get(meal.date) || 0) + meal.amount)
      );
    });

    return Array.from(grouped.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
  }, [meals]);

  /* ---------------------------------------------------------
     Form helpers
  --------------------------------------------------------- */

  const resetForm = () => {
    setFood("");
    setAmount(0);
    setMealType("Breakfast");
    setMealTime(currentTimeString());
    setNotes("");
    setEditingId(null);
  };

  const addOrUpdateMeal = () => {
    if (!Number.isFinite(amount) || amount <= 0 || !selectedDate) {
      return;
    }

    const entry: MealEntry = {
      id: editingId ?? nextId.current++,
      date: selectedDate,
      time: isValidTime(mealTime) ? mealTime : currentTimeString(),
      type: mealType,
      food: food.trim().slice(0, 100),
      amount: roundAmount(amount),
      notes: notes.trim().slice(0, 500),
    };

    if (editingId !== null) {
      setMeals((current) =>
        current.map((meal) => (meal.id === editingId ? entry : meal))
      );
    } else {
      setMeals((current) => [...current, entry]);
    }

    resetForm();
  };

  const editMeal = (meal: MealEntry) => {
    setEditingId(meal.id);
    setSelectedDate(meal.date);
    setFood(meal.food);
    setAmount(meal.amount);
    setMealType(meal.type);
    setMealTime(meal.time);
    setNotes(meal.notes);
  };

  const removeMeal = (id: number) => {
    setMeals((current) => current.filter((meal) => meal.id !== id));

    if (editingId === id) {
      resetForm();
    }
  };

  const clearDay = () => {
    if (todaysMeals.length === 0) return;

    const confirmed = window.confirm(
      `Delete all ${todaysMeals.length} meal entries for ${formatDate(
        selectedDate
      )}?`
    );

    if (!confirmed) return;

    setMeals((current) =>
      current.filter((meal) => meal.date !== selectedDate)
    );

    resetForm();
  };

  const addQuickAmount = (value: number) => {
    setAmount((current) => roundAmount(Math.max(0, current + value)));
  };

  /* ---------------------------------------------------------
     Date navigation
  --------------------------------------------------------- */

  const changeDate = (amountOfDays: number) => {
    setSelectedDate((current) => shiftDate(current, amountOfDays));
    resetForm();
  };

  const goToToday = () => {
    setSelectedDate(localDateString());
    resetForm();
  };

  /* ---------------------------------------------------------
     CSV export
  --------------------------------------------------------- */

  const exportMealLog = () => {
    if (todaysMeals.length === 0) return;

    const sortedMeals = [...todaysMeals].sort((a, b) =>
      a.time.localeCompare(b.time)
    );

    const rows = [
      [
        "Date",
        "Time",
        "Meal Type",
        "Food",
        "Amount (g)",
        "Notes",
      ].join(","),

      ...sortedMeals.map((meal) =>
        [
          escapeCsv(meal.date),
          escapeCsv(meal.time),
          escapeCsv(meal.type),
          escapeCsv(meal.food),
          meal.amount.toFixed(2),
          escapeCsv(meal.notes),
        ].join(",")
      ),
    ];

    const blob = new Blob(["\uFEFF" + rows.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pet-feeding-log-${selectedDate}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ---------------------------------------------------------
     Copy daily summary
  --------------------------------------------------------- */

  const copySummary = async () => {
    const sortedMeals = [...todaysMeals].sort((a, b) =>
      a.time.localeCompare(b.time)
    );

    const summary = [
      "PET FEEDING SUMMARY",
      `Pet: ${petName.trim() || "My Pet"}`,
      `Date: ${formatDate(selectedDate)}`,
      `Daily target: ${target > 0 ? `${formatAmount(target)} g` : "Not set"}`,
      `Total logged: ${formatAmount(loggedAmount)} g`,
      `Meals logged: ${mealCount}`,
      target > 0
        ? difference >= 0
          ? `Remaining: ${formatAmount(remaining)} g`
          : `Over target: ${formatAmount(overTarget)} g`
        : "",
      "",
      "MEAL DETAILS",
      ...sortedMeals.map(
        (meal) =>
          `${formatTime(meal.time)} | ${meal.type} | ${
            meal.food || "Meal"
          } | ${formatAmount(meal.amount)} g${
            meal.notes ? ` | ${meal.notes}` : ""
          }`
      ),
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      window.alert(
        "Unable to copy automatically. Please use your browser's copy permissions."
      );
    }
  };

  /* ---------------------------------------------------------
     Full reset
  --------------------------------------------------------- */

  const reset = () => {
    const confirmed =
      meals.length === 0 ||
      window.confirm(
        "Reset the entire tracker? This will delete the saved pet profile and all meal records from this browser."
      );

    if (!confirmed) return;

    setPetName("");
    setTarget(0);
    setMeals([]);
    setSelectedDate(localDateString());

    nextId.current = 1;

    resetForm();

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
  };

  /* ---------------------------------------------------------
     Render
  --------------------------------------------------------- */

  return (
    <ToolShell title="Pet feeding tracker" onReset={reset} wide>
      <div className="pft-wrapper">
        {/* =================================================
            PROFILE
        ================================================= */}

        <section className="pft-profile">
          <div className="pft-profile-heading">
            <div>
              <span className="pft-eyebrow">PET CARE MANAGEMENT</span>
              <h2>Feeding dashboard</h2>
              <p>Track meals, monitor daily intake and review feeding history.</p>
            </div>

            <div className="pft-pet-icon" aria-hidden="true">
              🐾
            </div>
          </div>

          <div className="pft-profile-grid">
            <label className="pft-field">
              <span>Pet name</span>
              <input
                className="tool-input"
                value={petName}
                onChange={(event) => setPetName(event.target.value)}
                placeholder="e.g. Bruno"
                maxLength={50}
              />
            </label>

            <label className="pft-field">
              <span>Tracking date</span>
              <input
                className="tool-input"
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  if (!isValidDate(event.target.value)) return;
                  setSelectedDate(event.target.value);
                  resetForm();
                }}
              />
            </label>
          </div>

          <div className="pft-date-navigation">
            <button type="button" onClick={() => changeDate(-1)}>
              ← Previous day
            </button>

            <button type="button" onClick={goToToday}>
              Today
            </button>

            <button
              type="button"
              onClick={() => changeDate(1)}
              disabled={selectedDate >= localDateString()}
            >
              Next day →
            </button>
          </div>
        </section>

        {/* =================================================
            MAIN GRID
        ================================================= */}

        <div className="pft-main-grid">
          {/* LEFT COLUMN */}

          <div className="pft-left-column">
            {/* Daily target */}

            <section className="pft-card">
              <div className="pft-section-heading">
                <div>
                  <span className="pft-step">01</span>
                  <h3>Daily feeding target</h3>
                </div>

                <span className="pft-tag">GRAMS (g)</span>
              </div>

              <p className="pft-muted">
                Enter the daily amount recommended for your pet. Use the same
                measurement basis for the target and the meal entries.
              </p>

              <NumberField
                label="Recommended daily amount (g)"
                value={target}
                min={0}
                onChange={(value) =>
                  setTarget(
                    Number.isFinite(value) ? Math.max(0, value) : 0
                  )
                }
              />

              <div className="pft-target-note">
                <span>Your entered daily target</span>
                <strong>
                  {target > 0 ? `${formatAmount(target)} g` : "Not set"}
                </strong>
              </div>
            </section>

            {/* Meal form */}

            <section className="pft-card">
              <div className="pft-section-heading">
                <div>
                  <span className="pft-step">02</span>
                  <h3>{editingId !== null ? "Edit meal" : "Add a meal"}</h3>
                </div>

                {editingId !== null && (
                  <button
                    type="button"
                    className="pft-text-button"
                    onClick={resetForm}
                  >
                    Cancel editing
                  </button>
                )}
              </div>

              <div className="pft-form-grid">
                <label className="pft-field">
                  <span>Meal type</span>
                  <select
                    className="tool-input"
                    value={mealType}
                    onChange={(event) =>
                      setMealType(event.target.value as MealType)
                    }
                  >
                    {MEAL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="pft-field">
                  <span>Meal time</span>
                  <input
                    className="tool-input"
                    type="time"
                    value={mealTime}
                    onChange={(event) => setMealTime(event.target.value)}
                  />
                </label>
              </div>

              <label className="pft-field">
                <span>Food name</span>
                <input
                  className="tool-input"
                  value={food}
                  onChange={(event) => setFood(event.target.value)}
                  placeholder="e.g. Dry food, chicken, vegetables"
                  maxLength={100}
                />
              </label>

              <div className="pft-amount-section">
                <NumberField
                  label="Amount eaten (g)"
                  value={amount}
                  min={0}
                  onChange={(value) =>
                    setAmount(
                      Number.isFinite(value) ? Math.max(0, value) : 0
                    )
                  }
                />

                <div className="pft-quick-amounts">
                  <span>Quick add</span>

                  {[10, 25, 50, 100].map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => addQuickAmount(value)}
                    >
                      +{value}g
                    </button>
                  ))}
                </div>
              </div>

              <label className="pft-field">
                <span>Notes (optional)</span>
                <textarea
                  className="tool-input pft-textarea"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="e.g. Ate slowly, left some food, mixed with water..."
                  rows={3}
                  maxLength={500}
                />
              </label>

              <button
                type="button"
                className="btn pft-submit-button"
                onClick={addOrUpdateMeal}
                disabled={
                  !selectedDate ||
                  !Number.isFinite(amount) ||
                  amount <= 0
                }
              >
                {editingId !== null ? "Save meal changes" : "+ Log this meal"}
              </button>

              {editingId !== null && (
                <p className="pft-edit-hint">
                  You are editing an existing meal entry.
                </p>
              )}
            </section>

            {/* Meal log */}

            <section className="pft-card pft-log-card">
              <div className="pft-section-heading pft-log-heading">
                <div>
                  <span className="pft-step">03</span>
                  <h3>Meal history</h3>
                  <p>{formatDate(selectedDate)}</p>
                </div>

                <span className="pft-count-badge">
                  {mealCount} {mealCount === 1 ? "meal" : "meals"}
                </span>
              </div>

              {todaysMeals.length === 0 ? (
                <div className="pft-empty">
                  <div className="pft-empty-icon">🍽️</div>
                  <strong>No meals logged yet</strong>
                  <p>
                    Add your first meal using the form above. Your entries
                    will appear here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="pft-meal-list">
                    {[...todaysMeals]
                      .sort((a, b) => b.time.localeCompare(a.time))
                      .map((meal) => (
                        <div className="pft-meal-item" key={meal.id}>
                          <div className="pft-meal-time">
                            <span>{formatTime(meal.time)}</span>
                            <small>{meal.type}</small>
                          </div>

                          <div className="pft-meal-info">
                            <strong>{meal.food || meal.type}</strong>
                            {meal.notes && <p>{meal.notes}</p>}
                          </div>

                          <div className="pft-meal-amount">
                            <strong>{formatAmount(meal.amount)} g</strong>

                            <div className="pft-meal-actions">
                              <button
                                type="button"
                                onClick={() => editMeal(meal)}
                                aria-label={`Edit ${meal.food || meal.type}`}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="pft-delete-action"
                                onClick={() => removeMeal(meal.id)}
                                aria-label={`Delete ${meal.food || meal.type}`}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="pft-log-footer">
                    <span>Total food logged</span>
                    <strong>{formatAmount(loggedAmount)} g</strong>
                  </div>
                </>
              )}
            </section>

            {/* Weekly / monthly overview */}

            <section className="pft-card">
              <div className="pft-section-heading">
                <div>
                  <span className="pft-step">04</span>
                  <h3>Feeding reports</h3>
                </div>
              </div>

              <p className="pft-muted">
                Activity summaries based on the seven and thirty calendar days
                ending on your selected date.
              </p>

              <div className="pft-report-grid">
                <div className="pft-report-box">
                  <span>Last 7 days</span>
                  <strong>{formatAmount(weeklyTotal)} g</strong>
                  <small>
                    {weeklyMeals.length} meals · {weeklyDays} active days
                  </small>
                </div>

                <div className="pft-report-box">
                  <span>Last 30 days</span>
                  <strong>{formatAmount(monthlyTotal)} g</strong>
                  <small>
                    {monthlyMeals.length} meals · {monthlyDays} active days
                  </small>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN */}

          <aside className="pft-right-column">
            {/* Daily dashboard */}

            <section className="pft-card pft-summary-card">
              <div className="pft-summary-top">
                <div>
                  <span className="pft-eyebrow">DAILY OVERVIEW</span>
                  <h3>{petName.trim() || "Your pet"}</h3>
                  <p>{formatDate(selectedDate)}</p>
                </div>

                <span className="pft-summary-paw">🐾</span>
              </div>

              <div className="pft-progress-section">
                <div className="pft-progress-label">
                  <span>Daily target progress</span>
                  <strong>
                    {target > 0 ? `${Math.round(rawProgress)}%` : "—"}
                  </strong>
                </div>

                <div
                  className="pft-progress-track"
                  role="progressbar"
                  aria-label="Daily feeding target progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div
                    className="pft-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="pft-progress-values">
                  <span>{formatAmount(loggedAmount)} g logged</span>
                  <span>
                    {target > 0
                      ? `${formatAmount(target)} g target`
                      : "Target not set"}
                  </span>
                </div>
              </div>

              <div className="pft-main-result">
                <span>
                  {target <= 0
                    ? "Total food logged"
                    : difference < -0.005
                    ? "Amount over target"
                    : "Amount remaining"}
                </span>

                <strong>
                  {target > 0
                    ? `${formatAmount(
                        difference < -0.005 ? overTarget : remaining
                      )} g`
                    : `${formatAmount(loggedAmount)} g`}
                </strong>

                {target > 0 && (
                  <small>
                    {difference < -0.005
                      ? "Logged amount is above the entered target"
                      : "Based on your entered daily target"}
                  </small>
                )}
              </div>

              {target > 0 && (
                <div
                  className={`pft-status ${
                    difference < -0.005
                      ? "pft-status-warning"
                      : targetReached
                      ? "pft-status-complete"
                      : "pft-status-neutral"
                  }`}
                >
                  <span className="pft-status-dot" />

                  {difference < -0.005
                    ? "Entered target exceeded"
                    : targetReached
                    ? "Entered target reached"
                    : "Target not yet reached"}
                </div>
              )}
            </section>

            {/* Statistics */}

            <section className="pft-card">
              <div className="pft-section-heading">
                <div>
                  <span className="pft-eyebrow">TODAY&apos;S STATISTICS</span>
                  <h3>Feeding insights</h3>
                </div>
              </div>

              <div className="pft-stats-grid">
                <div className="pft-stat">
                  <span>Meals logged</span>
                  <strong>{mealCount}</strong>
                </div>

                <div className="pft-stat">
                  <span>Average meal</span>
                  <strong>{formatAmount(averageMeal)} g</strong>
                </div>

                <div className="pft-stat">
                  <span>Largest meal</span>
                  <strong>{formatAmount(largestMeal)} g</strong>
                </div>

                <div className="pft-stat">
                  <span>Food items</span>
                  <strong>{uniqueFoods}</strong>
                </div>
              </div>
            </section>

            {/* Recent history */}

            <section className="pft-card">
              <div className="pft-section-heading">
                <div>
                  <span className="pft-eyebrow">RECENT ACTIVITY</span>
                  <h3>Daily history</h3>
                </div>
              </div>

              {dailyHistory.length === 0 ? (
                <p className="pft-muted">
                  Your feeding history will appear here after you log a meal.
                </p>
              ) : (
                <div className="pft-history-list">
                  {dailyHistory.map((day) => (
                    <button
                      type="button"
                      key={day.date}
                      className={`pft-history-item ${
                        day.date === selectedDate
                          ? "pft-history-active"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedDate(day.date);
                        resetForm();
                      }}
                    >
                      <span>
                        <strong>{formatShortDate(day.date)}</strong>
                        <small>
                          {
                            meals.filter(
                              (meal) => meal.date === day.date
                            ).length
                          }{" "}
                          meals
                        </small>
                      </span>

                      <strong>{formatAmount(day.total)} g</strong>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Export actions */}

            <section className="pft-card pft-actions-card">
              <div className="pft-section-heading">
                <div>
                  <span className="pft-eyebrow">YOUR RECORDS</span>
                  <h3>Export and share</h3>
                </div>
              </div>

              <p>
                Save or share your feeding information for the selected day.
              </p>

              <button
                type="button"
                className="pft-action-button pft-primary-action"
                onClick={exportMealLog}
                disabled={todaysMeals.length === 0}
              >
                <span>↓</span>
                Export meal log (CSV)
              </button>

              <button
                type="button"
                className="pft-action-button"
                onClick={copySummary}
                disabled={todaysMeals.length === 0}
              >
                <span>▣</span>
                {copied ? "Summary copied!" : "Copy daily summary"}
              </button>

              <button
                type="button"
                className="pft-action-button"
                onClick={() => window.print()}
                disabled={todaysMeals.length === 0}
              >
                <span>⎙</span>
                Print feeding report
              </button>

              <button
                type="button"
                className="pft-clear-button"
                onClick={clearDay}
                disabled={todaysMeals.length === 0}
              >
                Clear selected day&apos;s log
              </button>
            </section>
          </aside>
        </div>

        {/* =================================================
            DISCLAIMER
        ================================================= */}

        <section className="pft-disclaimer">
          <div className="pft-disclaimer-icon">ⓘ</div>

          <div>
            <strong>Important feeding information</strong>
            <p>
              This tracker records the amounts you enter. It does not
              calculate nutritional requirements, ideal portions, or calorie
              needs. Food weight is not the same as calorie intake, and
              different foods have different nutritional values. Follow
              species-specific feeding guidance from your veterinarian.
            </p>
          </div>
        </section>
      </div>

      {/* =====================================================
          STYLES
      ===================================================== */}

      <style jsx>{`
        .pft-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          min-width: 0;
          color: var(--tool-text, inherit);
        }

        .pft-profile,
        .pft-card {
          min-width: 0;
          padding: 20px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 14px;
          background: var(--tool-card, #fff);
        }

        .pft-profile {
          background: var(--tool-surface, #f8fafc);
        }

        .pft-profile-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 20px;
        }

        .pft-eyebrow {
          display: block;
          margin-bottom: 7px;
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
        }

        .pft-profile-heading h2 {
          margin: 0;
          font-size: 22px;
          line-height: 1.3;
          font-weight: 750;
        }

        .pft-profile-heading p,
        .pft-summary-top p {
          margin: 5px 0 0;
          color: var(--tool-muted, #64748b);
          font-size: 13px;
          line-height: 1.5;
        }

        .pft-pet-icon,
        .pft-summary-paw {
          display: grid;
          flex: 0 0 auto;
          place-items: center;
          width: 48px;
          height: 48px;
          border-radius: 13px;
          background: var(--tool-surface, #f1f5f9);
          font-size: 25px;
        }

        .pft-profile-grid,
        .pft-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .pft-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
          margin-bottom: 15px;
          font-size: 13px;
          font-weight: 650;
        }

        .pft-field > span {
          color: var(--tool-text, inherit);
        }

        .pft-field :global(.tool-input) {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
        }

        .pft-textarea {
          min-height: 78px;
          resize: vertical;
          font: inherit;
        }

        .pft-date-navigation {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 3px;
        }

        .pft-date-navigation button {
          padding: 7px 11px;
          border: 1px solid var(--tool-border, #e2e8f0);
          border-radius: 7px;
          background: var(--tool-card, #fff);
          color: var(--tool-text, inherit);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .pft-date-navigation button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Main grid */

        .pft-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(290px, 0.85fr);
          align-items: start;
          gap: 20px;
          width: 100%;
          min-width: 0;
        }

        .pft-left-column,
        .pft-right-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }

        .pft-right-column {
          position: sticky;
          top: 18px;
        }

        /* Section headings */

        .pft-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 15px;
        }

        .pft-section-heading > div {
          min-width: 0;
        }

        .pft-section-heading h3,
        .pft-actions-card h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 750;
        }

        .pft-section-heading p {
          margin: 5px 0 0;
          color: var(--tool-muted, #64748b);
          font-size: 12px;
        }

        .pft-step {
          display: inline-grid;
          place-items: center;
          width: 23px;
          height: 23px;
          margin-right: 8px;
          border-radius: 7px;
          background: var(--tool-surface, #f1f5f9);
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          font-weight: 800;
          vertical-align: 2px;
        }

        .pft-tag,
        .pft-count-badge {
          padding: 6px 10px;
          border-radius: 20px;
          background: var(--tool-surface, #f1f5f9);
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          font-weight: 750;
          white-space: nowrap;
        }

        .pft-muted {
          margin: 0 0 15px;
          color: var(--tool-muted, #64748b);
          font-size: 13px;
          line-height: 1.6;
        }

        .pft-target-note {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-top: 5px;
          padding: 12px;
          border-radius: 9px;
          background: var(--tool-surface, #f8fafc);
          font-size: 13px;
        }

        .pft-target-note span {
          color: var(--tool-muted, #64748b);
        }

        .pft-quick-amounts {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          margin: -5px 0 16px;
        }

        .pft-quick-amounts span {
          margin-right: 2px;
          color: var(--tool-muted, #64748b);
          font-size: 11px;
        }

        .pft-quick-amounts button {
          padding: 6px 9px;
          border: 1px solid var(--tool-border, #e2e8f0);
          border-radius: 7px;
          background: var(--tool-surface, #f8fafc);
          color: var(--tool-text, inherit);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .pft-quick-amounts button:hover {
          border-color: var(--tool-primary, #64748b);
        }

        .pft-submit-button {
          width: 100%;
          min-height: 43px;
        }

        .pft-submit-button:disabled,
        .pft-action-button:disabled,
        .pft-clear-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .pft-text-button {
          border: 0;
          background: transparent;
          color: var(--tool-primary, #2563eb);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .pft-edit-hint {
          margin: 10px 0 0;
          color: var(--tool-muted, #64748b);
          font-size: 12px;
        }

        /* Summary */

        .pft-summary-card {
          background: var(--tool-surface, #f8fafc);
        }

        .pft-summary-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .pft-summary-top h3 {
          margin: 0;
          font-size: 21px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .pft-summary-paw {
          width: 43px;
          height: 43px;
          font-size: 22px;
        }

        .pft-progress-section {
          margin-top: 25px;
        }

        .pft-progress-label,
        .pft-progress-values {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .pft-progress-label {
          margin-bottom: 10px;
          font-size: 12px;
          font-weight: 650;
        }

        .pft-progress-label strong {
          font-size: 14px;
        }

        .pft-progress-track {
          height: 11px;
          overflow: hidden;
          border-radius: 20px;
          background: var(--tool-border, #e2e8f0);
        }

        .pft-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: var(--tool-primary, #2563eb);
          transition: width 0.25s ease;
        }

        .pft-progress-values {
          margin-top: 8px;
          color: var(--tool-muted, #64748b);
          font-size: 10px;
        }

        .pft-main-result {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 23px;
          padding: 17px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 11px;
          background: var(--tool-card, #fff);
        }

        .pft-main-result span {
          color: var(--tool-muted, #64748b);
          font-size: 12px;
        }

        .pft-main-result strong {
          font-size: 29px;
          line-height: 1.2;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .pft-main-result small {
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          line-height: 1.5;
        }

        .pft-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 13px;
          font-size: 11px;
          font-weight: 700;
        }

        .pft-status-dot {
          width: 8px;
          height: 8px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #94a3b8;
        }

        .pft-status-complete .pft-status-dot {
          background: #16a34a;
        }

        .pft-status-warning .pft-status-dot {
          background: #d97706;
        }

        .pft-status-neutral {
          color: var(--tool-muted, #64748b);
        }

        .pft-status-complete {
          color: #16a34a;
        }

        .pft-status-warning {
          color: #d97706;
        }

        /* Statistics */

        .pft-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .pft-stat {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
          padding: 13px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 10px;
          background: var(--tool-surface, #f8fafc);
        }

        .pft-stat span {
          color: var(--tool-muted, #64748b);
          font-size: 11px;
        }

        .pft-stat strong {
          font-size: 18px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        /* Meal log */

        .pft-log-heading {
          align-items: flex-start;
        }

        .pft-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 28px 12px;
          text-align: center;
        }

        .pft-empty-icon {
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          margin-bottom: 12px;
          border-radius: 15px;
          background: var(--tool-surface, #f1f5f9);
          font-size: 25px;
        }

        .pft-empty strong {
          font-size: 14px;
        }

        .pft-empty p {
          max-width: 290px;
          margin: 7px 0 0;
          color: var(--tool-muted, #64748b);
          font-size: 12px;
          line-height: 1.6;
        }

        .pft-meal-list {
          display: flex;
          flex-direction: column;
        }

        .pft-meal-item {
          display: grid;
          grid-template-columns: 82px minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid var(--tool-border, #e5e7eb);
        }

        .pft-meal-item:first-child {
          padding-top: 4px;
        }

        .pft-meal-time {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pft-meal-time span {
          font-size: 12px;
          font-weight: 750;
        }

        .pft-meal-time small {
          color: var(--tool-muted, #64748b);
          font-size: 10px;
        }

        .pft-meal-info {
          min-width: 0;
        }

        .pft-meal-info strong {
          display: block;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .pft-meal-info p {
          margin: 5px 0 0;
          color: var(--tool-muted, #64748b);
          font-size: 11px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .pft-meal-amount {
          text-align: right;
        }

        .pft-meal-amount > strong {
          font-size: 13px;
          white-space: nowrap;
        }

        .pft-meal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 6px;
        }

        .pft-meal-actions button {
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--tool-primary, #2563eb);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .pft-meal-actions .pft-delete-action {
          color: #dc2626;
        }

        .pft-log-footer {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding-top: 15px;
          font-size: 13px;
        }

        .pft-log-footer span {
          color: var(--tool-muted, #64748b);
        }

        .pft-log-footer strong {
          font-size: 15px;
        }

        /* Reports */

        .pft-report-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .pft-report-box {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
          padding: 14px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 10px;
          background: var(--tool-surface, #f8fafc);
        }

        .pft-report-box span {
          color: var(--tool-muted, #64748b);
          font-size: 11px;
        }

        .pft-report-box strong {
          font-size: 20px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .pft-report-box small {
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          line-height: 1.5;
        }

        /* History */

        .pft-history-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .pft-history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 11px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 9px;
          background: var(--tool-card, #fff);
          color: var(--tool-text, inherit);
          text-align: left;
          cursor: pointer;
        }

        .pft-history-item > span {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .pft-history-item strong {
          font-size: 12px;
        }

        .pft-history-item small {
          color: var(--tool-muted, #64748b);
          font-size: 10px;
        }

        .pft-history-active {
          border-color: var(--tool-primary, #64748b);
          background: var(--tool-surface, #f8fafc);
        }

        /* Export actions */

        .pft-actions-card > p {
          margin: 0 0 14px;
          color: var(--tool-muted, #64748b);
          font-size: 12px;
          line-height: 1.6;
        }

        .pft-action-button {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          min-height: 40px;
          margin-top: 8px;
          padding: 10px 12px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 8px;
          background: var(--tool-card, #fff);
          color: var(--tool-text, inherit);
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .pft-action-button span {
          width: 17px;
          text-align: center;
          font-size: 16px;
        }

        .pft-primary-action {
          border-color: var(--tool-primary, #64748b);
          background: var(--tool-primary, #334155);
          color: white;
        }

        .pft-clear-button {
          display: block;
          width: 100%;
          margin-top: 14px;
          padding: 8px;
          border: 0;
          background: transparent;
          color: #dc2626;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        /* Disclaimer */

        .pft-disclaimer {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 11px;
          background: var(--tool-surface, #f8fafc);
        }

        .pft-disclaimer-icon {
          display: grid;
          flex: 0 0 auto;
          place-items: center;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: var(--tool-card, #fff);
          font-weight: 800;
        }

        .pft-disclaimer strong {
          font-size: 12px;
        }

        .pft-disclaimer p {
          margin: 5px 0 0;
          color: var(--tool-muted, #64748b);
          font-size: 11px;
          line-height: 1.7;
        }

        /* Tablet */

        @media (max-width: 850px) {
          .pft-main-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .pft-right-column {
            position: static;
          }
        }

        /* Mobile */

        @media (max-width: 540px) {
          .pft-profile,
          .pft-card {
            padding: 15px;
          }

          .pft-profile-grid,
          .pft-form-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 0;
          }

          .pft-profile-heading h2 {
            font-size: 19px;
          }

          .pft-date-navigation {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .pft-date-navigation button {
            padding: 8px 4px;
            font-size: 10px;
          }

          .pft-meal-item {
            grid-template-columns: 65px minmax(0, 1fr);
            gap: 9px;
          }

          .pft-meal-amount {
            grid-column: 2;
            display: flex;
            justify-content: space-between;
            align-items: center;
            text-align: left;
          }

          .pft-meal-actions {
            margin-top: 0;
          }

          .pft-progress-values {
            font-size: 9px;
          }

          .pft-main-result strong {
            font-size: 26px;
          }

          .pft-report-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        /* Printable report */

        @media print {
          :global(body) {
            background: white !important;
            color: black !important;
          }

          .pft-profile,
          .pft-left-column > section:not(.pft-log-card),
          .pft-actions-card,
          .pft-disclaimer,
          .pft-date-navigation,
          .pft-meal-actions {
            display: none !important;
          }

          .pft-wrapper {
            gap: 10px;
          }

          .pft-main-grid {
            display: block !important;
          }

          .pft-left-column,
          .pft-right-column {
            display: block !important;
          }

          .pft-right-column {
            position: static !important;
          }

          .pft-summary-card,
          .pft-log-card {
            display: block !important;
            margin-bottom: 12px;
            border: 1px solid #ccc !important;
            background: white !important;
            color: black !important;
            break-inside: avoid;
          }

          .pft-meal-item {
            break-inside: avoid;
          }

          .pft-meal-info p,
          .pft-meal-time small,
          .pft-progress-values,
          .pft-main-result small {
            color: #444 !important;
          }

          .pft-progress-fill {
            background: #555 !important;
          }
        }
      `}</style>
    </ToolShell>
  );
}
