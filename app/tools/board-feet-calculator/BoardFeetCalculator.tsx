"use client";

import { useMemo, useState } from "react";
import ToolShell, { NumberField, Result } from "../ToolShell";

type LumberItem = {
  id: number;
  name: string;
  thickness: number;
  width: number;
  length: number;
  quantity: number;
  price: number;
};

const createItem = (id: number): LumberItem => ({
  id,
  name: `Lumber ${id}`,
  thickness: 1,
  width: 6,
  length: 8,
  quantity: 1,
  price: 0,
});

const money = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

const formatNumber = (value: number) =>
  value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

export default function BoardFeetCalculator() {
  const [items, setItems] = useState<LumberItem[]>([
    {
      id: 1,
      name: "Oak lumber",
      thickness: 1,
      width: 6,
      length: 8,
      quantity: 1,
      price: 0,
    },
  ]);

  const [nextId, setNextId] = useState(2);
  const [waste, setWaste] = useState(10);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [delivery, setDelivery] = useState(0);
  const [includeDeliveryTax, setIncludeDeliveryTax] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [message, setMessage] = useState("");

  const updateItem = (
    id: number,
    updates: Partial<LumberItem>
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
    setMessage("");
  };

  const addItem = () => {
    setItems((current) => [...current, createItem(nextId)]);
    setNextId((current) => current + 1);
    setMessage("");
  };

  const removeItem = (id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setMessage("");
  };

  const duplicateItem = (item: LumberItem) => {
    setItems((current) => [
      ...current,
      {
        ...item,
        id: nextId,
        name: `${item.name} (Copy)`,
      },
    ]);
    setNextId((current) => current + 1);
    setMessage("");
  };

  const calculations = useMemo(() => {
    const lines = items.map((item) => {
      const valid =
        Number.isFinite(item.thickness) &&
        Number.isFinite(item.width) &&
        Number.isFinite(item.length) &&
        Number.isFinite(item.quantity) &&
        Number.isFinite(item.price) &&
        item.thickness > 0 &&
        item.width > 0 &&
        item.length > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity >= 1 &&
        item.price >= 0;

      // Board feet = (T × W × L × Qty) / 12
      // T, W in inches; L in feet
      const boardFeet = valid
        ? (item.thickness * item.width * item.length * item.quantity) / 12
        : 0;

      // Waste is applied per line, then summed
      const adjustedBoardFeet = boardFeet * (1 + waste / 100);

      const materialCost = adjustedBoardFeet * item.price;

      return {
        ...item,
        valid,
        boardFeet,
        adjustedBoardFeet,
        materialCost,
      };
    });

    const validLines = lines.filter((line) => line.valid);

    const totalBoardFeet = validLines.reduce(
      (sum, line) => sum + line.boardFeet,
      0
    );

    const totalWithWaste = validLines.reduce(
      (sum, line) => sum + line.adjustedBoardFeet,
      0
    );

    const materialSubtotal = validLines.reduce(
      (sum, line) => sum + line.materialCost,
      0
    );

    const discountAmount = materialSubtotal * (discount / 100);
    const discountedSubtotal = Math.max(0, materialSubtotal - discountAmount);

    // Delivery is only taxed if includeDeliveryTax is true
    const taxableAmount =
      discountedSubtotal + (includeDeliveryTax ? delivery : 0);

    const taxAmount = taxableAmount * (tax / 100);

    // Grand total = discounted materials + delivery + tax
    const grandTotal = discountedSubtotal + delivery + taxAmount;

    const unpricedCount = validLines.filter(
      (line) => line.price === 0
    ).length;

    return {
      lines,
      totalBoardFeet,
      totalWithWaste,
      materialSubtotal,
      discountAmount,
      discountedSubtotal,
      taxableAmount,
      taxAmount,
      grandTotal,
      unpricedCount,
      invalidCount: lines.length - validLines.length,
      validCount: validLines.length,
    };
  }, [items, waste, discount, tax, delivery, includeDeliveryTax]);

  const canCalculate =
    calculations.validCount > 0 &&
    calculations.invalidCount === 0 &&
    Number.isFinite(calculations.grandTotal);

  const reset = () => {
    setItems([
      {
        id: 1,
        name: "Oak lumber",
        thickness: 1,
        width: 6,
        length: 8,
        quantity: 1,
        price: 0,
      },
    ]);
    setNextId(2);
    setWaste(10);
    setDiscount(0);
    setTax(0);
    setDelivery(0);
    setIncludeDeliveryTax(false);
    setShowDetails(true);
    setMessage("");
  };

  const getEstimateText = () => {
    const rows = calculations.lines
      .filter((line) => line.valid)
      .map(
        (line) =>
          `${line.name}: ${line.thickness}" x ${line.width}" x ${line.length}' | Qty: ${line.quantity} | Board Feet: ${formatNumber(line.boardFeet)} | With Waste: ${formatNumber(line.adjustedBoardFeet)} | Cost: ${money(line.materialCost)}`
      );

    return [
      "LUMBER PROJECT ESTIMATE",
      "=======================",
      "",
      ...rows,
      "",
      `Total Lumber Items: ${calculations.validCount}`,
      `Base Board Feet: ${formatNumber(calculations.totalBoardFeet)}`,
      `Waste Allowance: ${waste}%`,
      `Required Board Feet: ${formatNumber(calculations.totalWithWaste)}`,
      `Material Subtotal: ${money(calculations.materialSubtotal)}`,
      `Discount (${discount}%): -${money(calculations.discountAmount)}`,
      `Delivery: ${money(delivery)}`,
      `Sales Tax (${tax}%): ${money(calculations.taxAmount)}`,
      `GRAND TOTAL: ${money(calculations.grandTotal)}`,
      "",
      "Estimate based on entered dimensions and pricing.",
      "Verify actual dimensions and supplier pricing before ordering.",
    ].join("\n");
  };

  const copyEstimate = async () => {
    if (!canCalculate) return;

    try {
      await navigator.clipboard.writeText(getEstimateText());
      setMessage("Estimate copied successfully.");
    } catch {
      setMessage("Unable to copy. Please check browser permissions.");
    }
  };

  const downloadCSV = () => {
    if (!canCalculate) return;

    const csvRows = [
      [
        "Lumber Name",
        "Thickness (in)",
        "Width (in)",
        "Length (ft)",
        "Quantity",
        "Board Feet",
        "Waste Adjusted Board Feet",
        "Price Per Board Foot",
        "Material Cost",
      ],
      ...calculations.lines
        .filter((line) => line.valid)
        .map((line) => [
          line.name,
          line.thickness,
          line.width,
          line.length,
          line.quantity,
          line.boardFeet.toFixed(2),
          line.adjustedBoardFeet.toFixed(2),
          line.price.toFixed(2),
          line.materialCost.toFixed(2),
        ]),
      [],
      ["Base Board Feet", calculations.totalBoardFeet.toFixed(2)],
      ["Board Feet With Waste", calculations.totalWithWaste.toFixed(2)],
      ["Material Subtotal", calculations.materialSubtotal.toFixed(2)],
      ["Discount", calculations.discountAmount.toFixed(2)],
      ["Delivery", delivery.toFixed(2)],
      ["Sales Tax", calculations.taxAmount.toFixed(2)],
      ["Grand Total", calculations.grandTotal.toFixed(2)],
    ];

    const csv = csvRows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");
            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "lumber-project-estimate.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setMessage("CSV estimate downloaded.");
  };

  return (
    <ToolShell title="Professional Lumber Estimator" onReset={reset} wide>
      <div className="lumber-tool">

        {/* INTRO */}

        <div className="lumber-intro">
          <div>
            <h2>Project Lumber Estimator</h2>
            <p>
              Calculate board feet, estimate lumber requirements,
              compare material costs, and prepare your project budget.
            </p>
          </div>
          <span className="lumber-pro-badge">PRO ESTIMATOR</span>
        </div>

        {/* MAIN TWO COLUMN GRID */}

        <div className="lumber-main-grid">

          {/* LEFT COLUMN: INPUTS */}

          <div className="lumber-left-column">

            <div className="lumber-section-heading">
              <div>
                <h3>Lumber items</h3>
                <p>Add all the lumber types required for your project.</p>
              </div>

              <button
                type="button"
                className="lumber-primary-button"
                onClick={addItem}
              >
                + Add lumber
              </button>
            </div>

            <div className="lumber-items">
              {items.map((item, index) => {
                const result = calculations.lines.find(
                  (line) => line.id === item.id
                );

                return (
                  <div className="lumber-item-card" key={item.id}>
                    <div className="lumber-item-header">
                      <div className="lumber-item-title">
                        <span className="lumber-item-number">
                          {index + 1}
                        </span>
                        <div>
                          <strong>
                            {item.name || `Lumber ${index + 1}`}
                          </strong>
                          <small>
                            {result?.valid
                              ? `${formatNumber(result.boardFeet)} board feet`
                              : "Check dimensions and quantity"}
                          </small>
                        </div>
                      </div>

                      <div className="lumber-item-actions">
                        <button
                          type="button"
                          className="lumber-icon-button"
                          onClick={() => duplicateItem(item)}
                          title="Duplicate item"
                          aria-label="Duplicate item"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="8" y="8" width="12" height="12" rx="2" />
                            <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          className="lumber-icon-button lumber-delete"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="lumber-name-field">
                      <label htmlFor={`lumber-name-${item.id}`}>
                        Lumber name / wood type
                      </label>
                      <input
                        id={`lumber-name-${item.id}`}
                        type="text"
                        value={item.name}
                        maxLength={60}
                        placeholder="e.g. Oak, Pine, Walnut"
                        onChange={(e) =>
                          updateItem(item.id, { name: e.target.value })
                        }
                      />
                    </div>

                    <div className="lumber-field-grid">
                      <NumberField
                        label="Thickness (in)"
                        value={item.thickness}
                        min={0.01}
                        onChange={(value) =>
                          updateItem(item.id, { thickness: value })
                        }
                      />

                      <NumberField
                        label="Width (in)"
                        value={item.width}
                        min={0.01}
                        onChange={(value) =>
                          updateItem(item.id, { width: value })
                        }
                      />

                      <NumberField
                        label="Length (ft)"
                        value={item.length}
                        min={0.01}
                        onChange={(value) =>
                          updateItem(item.id, { length: value })
                        }
                      />

                      <NumberField
                        label="Quantity (pieces)"
                        value={item.quantity}
                        min={1}
                        onChange={(value) =>
                          updateItem(item.id, {
                            quantity: Math.max(1, Math.floor(value)),
                          })
                        }
                      />

                      <NumberField
                        label="Price per board foot ($)"
                        value={item.price}
                        min={0}
                        onChange={(value) =>
                          updateItem(item.id, { price: value })
                        }
                      />
                    </div>

                    {result?.valid && (
                      <div className="lumber-item-result">
                        <div>
                          <span>Board feet</span>
                          <strong>
                            {formatNumber(result.boardFeet)} BF
                          </strong>
                        </div>
                        <div>
                          <span>With waste</span>
                          <strong>
                            {formatNumber(result.adjustedBoardFeet)} BF
                          </strong>
                        </div>
                        <div>
                          <span>Material cost</span>
                          <strong>{money(result.materialCost)}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* PROJECT SETTINGS */}

            <div className="lumber-section-heading lumber-settings-heading">
              <div>
                <h3>Project cost settings</h3>
                <p>Adjust purchasing allowances and additional charges.</p>
              </div>
            </div>

            <div className="lumber-settings-card">
              <div className="lumber-field-grid">
                <NumberField
                  label="Waste allowance (%)"
                  value={waste}
                  min={0}
                  max={100}
                  onChange={(value) =>
                    setWaste(Math.min(100, Math.max(0, value)))
                  }
                />

                <NumberField
                  label="Discount (%)"
                  value={discount}
                  min={0}
                  max={100}
                  onChange={(value) =>
                    setDiscount(Math.min(100, Math.max(0, value)))
                  }
                />

                <NumberField
                  label="Sales tax (%)"
                  value={tax}
                  min={0}
                  max={100}
                  onChange={(value) =>
                    setTax(Math.min(100, Math.max(0, value)))
                  }
                />

                <NumberField
                  label="Delivery charge ($)"
                  value={delivery}
                  min={0}
                  onChange={(value) =>
                    setDelivery(Math.max(0, value))
                  }
                />
              </div>

              {/* TOGGLE SWITCH (replaces checkbox) */}
              <label className="lumber-switch">
                <input
                  type="checkbox"
                  checked={includeDeliveryTax}
                  onChange={(e) =>
                    setIncludeDeliveryTax(e.target.checked)
                  }
                />
                <span className="lumber-switch-track" aria-hidden="true">
                  <span className="lumber-switch-thumb" />
                </span>
                <span>Include delivery charges in taxable amount</span>
              </label>
            </div>

          </div>

          {/* RIGHT COLUMN: LIVE RESULTS */}

          <aside className="lumber-right-column">

            <div className="lumber-result-header">
              <div>
                <h3>Project summary</h3>
                <p>Your live lumber and cost estimate.</p>
              </div>
              <span className="lumber-live-indicator">
                <span /> LIVE
              </span>
            </div>

            {calculations.invalidCount > 0 && (
              <div className="lumber-warning" role="alert">
                {calculations.invalidCount} item(s) contain invalid
                values. Please correct the dimensions, quantity, or price.
              </div>
            )}

            <div className="lumber-summary-grid">
              <div className="lumber-summary-card">
                <span>Base board feet</span>
                <strong>
                  {formatNumber(calculations.totalBoardFeet)}
                </strong>
                <small>Before waste</small>
              </div>

              <div className="lumber-summary-card lumber-highlight">
                <span>Required board feet</span>
                <strong>
                  {formatNumber(calculations.totalWithWaste)}
                </strong>
                <small>Including {waste}% waste</small>
              </div>

              <div className="lumber-summary-card">
                <span>Lumber items</span>
                <strong>{calculations.validCount}</strong>
                <small>Different product lines</small>
              </div>

              <div className="lumber-summary-card">
                <span>Material subtotal</span>
                <strong>{money(calculations.materialSubtotal)}</strong>
                <small>Before discount and tax</small>
              </div>
            </div>

            {/* COST BREAKDOWN */}

            <div className="lumber-cost-card">
              <button
                type="button"
                className="lumber-breakdown-toggle"
                onClick={() => setShowDetails((value) => !value)}
                aria-expanded={showDetails}
              >
                <strong>Detailed cost breakdown</strong>
                <span>
                  {showDetails ? "− Hide details" : "+ Show details"}
                </span>
              </button>

              {showDetails && (
                <div className="lumber-cost-details">
                  <div className="lumber-cost-row">
                    <span>Material subtotal</span>
                    <strong>{money(calculations.materialSubtotal)}</strong>
                  </div>

                  <div className="lumber-cost-row">
                    <span>Discount ({discount}%)</span>
                    <strong className="lumber-negative">
                      -{money(calculations.discountAmount)}
                    </strong>
                  </div>

                  <div className="lumber-cost-row">
                    <span>Discounted material cost</span>
                    <strong>
                      {money(calculations.discountedSubtotal)}
                    </strong>
                  </div>

                  <div className="lumber-cost-row">
                    <span>Delivery charge</span>
                    <strong>{money(delivery)}</strong>
                  </div>

                  <div className="lumber-cost-row">
                    <span>Taxable amount</span>
                    <strong>{money(calculations.taxableAmount)}</strong>
                  </div>

                  <div className="lumber-cost-row">
                    <span>Sales tax ({tax}%)</span>
                    <strong>{money(calculations.taxAmount)}</strong>
                  </div>

                  <div className="lumber-cost-row lumber-cost-total">
                    <span>Estimated project total</span>
                    <strong>{money(calculations.grandTotal)}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* FINAL RESULT */}

            <div className="lumber-final-result">
              <span>Estimated total project cost</span>
              <strong>{money(calculations.grandTotal)}</strong>
              <p>
                Purchasing requirement:{" "}
                <b>
                  {formatNumber(calculations.totalWithWaste)} board feet
                </b>
              </p>

              {calculations.unpricedCount > 0 && (
                <small>
                  {calculations.unpricedCount} item(s) have no price
                  entered. The final cost excludes those items.
                </small>
              )}
            </div>

            {/* EXPORT ACTIONS */}

            <div className="lumber-export-card">
              <h3>Export your estimate</h3>
              <p>Keep a copy of your project calculation.</p>

              <button
                type="button"
                className="lumber-primary-button lumber-action-button"
                onClick={copyEstimate}
                disabled={!canCalculate}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="8" y="8" width="12" height="12" rx="2" />
                  <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
                </svg>
                Copy estimate
              </button>

              <button
                type="button"
                className="lumber-secondary-button lumber-action-button"
                onClick={downloadCSV}
                disabled={!canCalculate}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4" />
                </svg>
                Download CSV
              </button>

              {message && (
                <p className="lumber-message" role="status">
                  {message}
                </p>
              )}
            </div>

          </aside>
        </div>

        {/* EDUCATIONAL GUIDE */}

        <div className="lumber-guide">
          <h3>Board feet calculation guide</h3>

          <p>
            One board foot represents a volume of wood measuring
            12 inches × 12 inches × 1 inch.
          </p>

          <div className="lumber-formula">
            Board Feet = (Thickness × Width × Length × Quantity) ÷ 12
          </div>

          <p>
            Thickness and width must be entered in inches, while
            length must be entered in feet.
          </p>

          <h4>Important lumber purchasing tips</h4>

          <ul>
            <li>
              <strong>Actual vs nominal dimensions:</strong> Lumber
              sold as 2×6 may have smaller finished dimensions.
              Enter actual measurements for accurate volume estimates.
            </li>
            <li>
              <strong>Waste allowance:</strong> Account for cutting,
              trimming, defects, and project-specific requirements.
            </li>
            <li>
              <strong>Supplier pricing:</strong> Confirm whether
              your supplier charges by actual board feet, nominal
              dimensions, or another pricing method.
            </li>
            <li>
              <strong>Wood selection:</strong> Different species
              have different prices, densities, and availability.
            </li>
          </ul>
        </div>

        <p className="lumber-disclaimer">
          Estimates are for planning purposes. Actual supplier
          measurements, grading, pricing, taxes, and ordering
          requirements may vary.
        </p>

        <Result>
          <strong>
            {formatNumber(calculations.totalBoardFeet)} board feet
          </strong>{" "}
          before waste, and{" "}
          <strong>
            {formatNumber(calculations.totalWithWaste)} board feet
          </strong>{" "}
          including your waste allowance.
          {canCalculate && (
            <>
              {" "}The estimated project cost is{" "}
              <strong>{money(calculations.grandTotal)}</strong>.
            </>
          )}
        </Result>

      </div>

      <style jsx>{`
        .lumber-tool {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          gap: 22px;
          color: inherit;
          min-width: 0;
          width: 100%;
          container-type: inline-size;
        }

        .lumber-intro {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 12px;
          background: var(--surface, #fff);
        }

        .lumber-intro h2 {
          font-size: 21px;
          margin: 0 0 7px;
          font-weight: 750;
        }

        .lumber-intro p,
        .lumber-section-heading p,
        .lumber-result-header p {
          font-size: 13px;
          line-height: 1.6;
          margin: 0;
          color: var(--muted, #64748b);
        }

        .lumber-pro-badge {
          flex-shrink: 0;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .6px;
          padding: 7px 10px;
          border-radius: 6px;
          color: #1d4ed8;
          background: #eff6ff;
        }

        /* LEFT RIGHT GRID */

        .lumber-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 22px;
          align-items: start;
          width: 100%;
          min-width: 0;
        }

        .lumber-left-column,
        .lumber-right-column {
          display: flex;
          flex-direction: column;
          gap: 17px;
          min-width: 0;
          width: 100%;
        }

        .lumber-right-column {
          gap: 16px;
        }

        @container (min-width: 900px) {
          .lumber-main-grid {
            grid-template-columns: minmax(0, 1fr) 340px;
          }

          .lumber-right-column {
            position: sticky;
            top: 16px;
          }
        }

        .lumber-section-heading,
        .lumber-result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .lumber-section-heading h3,
        .lumber-result-header h3 {
          font-size: 17px;
          font-weight: 750;
          margin: 0 0 5px;
        }

        .lumber-primary-button,
        .lumber-secondary-button {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          border-radius: 8px;
          padding: 10px 15px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: .18s ease;
        }

        .lumber-primary-button {
          color: white;
          background: #172033;
          border: 1px solid #172033;
        }

        .lumber-primary-button:hover {
          background: #263650;
        }

        .lumber-secondary-button {
          color: #172033;
          background: white;
          border: 1px solid #cbd5e1;
        }

        .lumber-secondary-button:hover {
          background: #f1f5f9;
        }

        .lumber-primary-button:disabled,
        .lumber-secondary-button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .lumber-primary-button svg,
        .lumber-secondary-button svg,
        .lumber-icon-button svg {
          width: 17px;
          height: 17px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .lumber-items {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .lumber-item-card,
        .lumber-settings-card {
          padding: 18px;
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 11px;
          background: var(--surface, #fff);
          min-width: 0;
        }

        .lumber-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .lumber-item-title {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .lumber-item-number {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 8px;
          color: #1d4ed8;
          background: #eff6ff;
          font-weight: 800;
          font-size: 13px;
        }

        .lumber-item-title strong,
        .lumber-item-title small {
          display: block;
        }

        .lumber-item-title strong {
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .lumber-item-title small {
          color: var(--muted, #64748b);
          font-size: 11px;
          margin-top: 3px;
        }

        .lumber-item-actions {
          display: flex;
          gap: 5px;
          flex-shrink: 0;
        }

        .lumber-icon-button {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border, #e5e7eb);
          background: transparent;
          border-radius: 7px;
          color: inherit;
          cursor: pointer;
        }

        .lumber-icon-button:hover {
          background: var(--surface-hover, #f1f5f9);
        }

        .lumber-icon-button:disabled {
          opacity: .35;
          cursor: not-allowed;
        }

        .lumber-delete {
          color: #dc2626;
        }

        .lumber-name-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 17px;
        }

        .lumber-name-field label {
          font-size: 12px;
          font-weight: 650;
        }

        .lumber-name-field input {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 10px 12px;
          border: 1px solid var(--border, #d1d5db);
          border-radius: 7px;
          background: var(--input-bg, #fff);
          color: inherit;
          font-size: 14px;
          outline: none;
        }

        .lumber-name-field input:focus {
          border-color: #ff5a1f;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, .12);
        }

        .lumber-field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          min-width: 0;
        }

        .lumber-item-result {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 18px;
          padding: 13px;
          border-radius: 8px;
          background: var(--surface-secondary, #f8fafc);
        }

        .lumber-item-result div {
          min-width: 0;
        }

        .lumber-item-result span,
        .lumber-item-result strong {
          display: block;
        }

        .lumber-item-result span {
          color: var(--muted, #64748b);
          font-size: 11px;
          margin-bottom: 5px;
        }

        .lumber-item-result strong {
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .lumber-settings-heading {
          margin-top: 2px;
        }

        /* TOGGLE SWITCH */

        .lumber-switch {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 17px;
          font-size: 12px;
          font-weight: 650;
          color: var(--muted, #475569);
          cursor: pointer;
          user-select: none;
          width: fit-content;
        }

        .lumber-switch input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
          pointer-events: none;
        }

        .lumber-switch-track {
          position: relative;
          flex-shrink: 0;
          width: 44px;
          height: 26px;
          border-radius: 999px;
          background: #cbd5e1;
          border: 1px solid #cbd5e1;
          transition: background .2s ease, border-color .2s ease, box-shadow .2s ease;
        }

        .lumber-switch-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, .25);
          transition: transform .2s ease;
        }

        .lumber-switch input:checked + .lumber-switch-track {
          background: #ff5a1f;
          border-color: #ff5a1f;
          box-shadow: 0 2px 6px rgba(37, 99, 235, .25);
        }

        .lumber-switch input:checked + .lumber-switch-track .lumber-switch-thumb {
          transform: translateX(18px);
        }

        .lumber-switch input:focus-visible + .lumber-switch-track {
          outline: 3px solid rgba(37, 99, 235, .25);
          outline-offset: 2px;
        }

        /* RIGHT COLUMN SUMMARY */

        .lumber-live-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .5px;
          color: #15803d;
          background: #f0fdf4;
          border-radius: 20px;
          padding: 6px 9px;
          flex-shrink: 0;
        }

        .lumber-live-indicator > span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
        }

        .lumber-summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .lumber-summary-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
          padding: 15px 12px;
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 10px;
          background: var(--surface, #fff);
        }

        .lumber-summary-card span {
          font-size: 11px;
          color: var(--muted, #64748b);
        }

        .lumber-summary-card strong {
          font-size: clamp(17px, 2vw, 23px);
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .lumber-summary-card small {
          font-size: 10px;
          color: var(--muted, #64748b);
        }

        .lumber-highlight {
          border-color: #93c5fd;
          background: #eff6ff;
          color: #172033;
        }

        .lumber-highlight span,
        .lumber-highlight small {
          color: #475569;
        }

        .lumber-cost-card,
        .lumber-export-card {
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 10px;
          padding: 16px;
          background: var(--surface, #fff);
          min-width: 0;
        }

        .lumber-breakdown-toggle {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          padding: 2px 0;
          text-align: left;
        }

        .lumber-breakdown-toggle strong {
          font-size: 14px;
        }

        .lumber-breakdown-toggle span {
          color: #ff5a1f;
          font-size: 12px;
          font-weight: 650;
        }

        .lumber-cost-details {
          margin-top: 16px;
          border-top: 1px solid var(--border, #e5e7eb);
          padding-top: 8px;
        }

        .lumber-cost-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 0;
          font-size: 12px;
          border-bottom: 1px solid var(--border, #e5e7eb);
        }

        .lumber-cost-row span {
          color: var(--muted, #64748b);
        }

        .lumber-cost-row strong {
          text-align: right;
          overflow-wrap: anywhere;
        }

        .lumber-negative {
          color: #16a34a;
        }

        .lumber-cost-total {
          border-bottom: 0;
          padding-top: 16px;
          font-weight: 800;
        }

        .lumber-cost-total strong {
          font-size: 17px;
          color: #ff5a1f;
        }

        .lumber-final-result {
          padding: 21px 16px;
          border-radius: 11px;
          background: #172033;
          color: white;
          text-align: center;
        }

        .lumber-final-result > span {
          display: block;
          font-size: 12px;
          color: #cbd5e1;
        }

        .lumber-final-result > strong {
          display: block;
          font-size: clamp(25px, 3vw, 34px);
          font-weight: 850;
          margin: 9px 0;
          overflow-wrap: anywhere;
        }

        .lumber-final-result p {
          font-size: 12px;
          color: #cbd5e1;
          margin: 0;
        }

        .lumber-final-result small {
          display: block;
          color: #fde68a;
          margin-top: 10px;
          font-size: 11px;
        }

        .lumber-export-card h3 {
          font-size: 14px;
          margin: 0 0 5px;
        }

        .lumber-export-card > p {
          font-size: 11px;
          color: var(--muted, #64748b);
          margin: 0 0 13px;
        }

        .lumber-action-button {
          width: 100%;
          margin-top: 9px;
        }

        .lumber-message {
          margin: 10px 0 0;
          font-size: 12px;
          color: #16a34a;
          font-weight: 650;
        }

        .lumber-warning {
          padding: 12px 14px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #9a3412;
          border-radius: 8px;
          font-size: 12px;
        }

        /* GUIDE */

        .lumber-guide {
          padding: 19px;
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 10px;
          background: var(--surface, #fff);
        }

        .lumber-guide h3 {
          font-size: 16px;
          margin: 0 0 9px;
        }

        .lumber-guide h4 {
          font-size: 13px;
          margin: 19px 0 8px;
        }

        .lumber-guide p,
        .lumber-guide li {
          color: var(--muted, #64748b);
          font-size: 12px;
          line-height: 1.75;
        }

        .lumber-guide ul {
          padding-left: 19px;
          margin-bottom: 0;
        }

        .lumber-formula {
          padding: 13px;
          border-radius: 7px;
          background: var(--surface-secondary, #f1f5f9);
          font-size: 13px;
          font-weight: 750;
          text-align: center;
          overflow-wrap: anywhere;
          margin: 12px 0;
        }

        .lumber-disclaimer {
          color: var(--muted, #64748b);
          font-size: 11px;
          line-height: 1.6;
          margin: 0;
        }

        /* RESPONSIVE FIXES */

        @media (max-width: 520px) {
          .lumber-field-grid {
            grid-template-columns: 1fr;
          }

          .lumber-summary-grid {
            grid-template-columns: 1fr;
          }

          .lumber-item-result {
            grid-template-columns: 1fr;
          }

          .lumber-intro {
            flex-direction: column;
          }

          .lumber-section-heading {
            align-items: flex-start;
          }

          .lumber-primary-button {
            padding: 9px 11px;
            font-size: 12px;
          }

          .lumber-item-card,
          .lumber-settings-card {
            padding: 13px;
          }

          .lumber-item-result {
            gap: 6px;
            padding: 10px;
          }

          .lumber-item-result strong {
            font-size: 11px;
          }

          .lumber-item-result span {
            font-size: 10px;
          }

          .lumber-summary-card {
            padding: 12px;
          }

          .lumber-cost-card,
          .lumber-export-card {
            padding: 13px;
          }
        }
      `}</style>
    </ToolShell>
  );
}