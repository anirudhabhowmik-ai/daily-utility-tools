import type { Metadata } from "next";
import BoardBatten from "./BoardBatten";

export const metadata: Metadata = {
  title: "Board and Batten Layout Calculator | DailyTools",
  description: "Plan vertical board-and-batten spacing around wall openings and estimate vertical material needs with an interactive layout preview.",
  alternates: { canonical: "/tools/board-and-batten" },
};

export default function BoardBattenPage() {
  return (
    <article className="animate-fade-in">
      <header style={{ marginTop: "3rem", marginBottom: "2rem" }}>
        <h1>Board and Batten Layout Calculator</h1>
        <p style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>
          Plan vertical batten spacing around doors, windows, and other wall obstacles, then estimate the required vertical material.
        </p>
      </header>

      <div className="ad-slot">
        <span style={{ color: "#94A3B8", fontSize: "0.8rem" }}>Advertisement Space</span>
      </div>

      <BoardBatten />

      <div className="article-content">
        <h2>How the Calculator Works</h2>
        <p>
          Enter the finished wall width and the vertical height that each batten will cover. Set the batten width and the minimum clear gap you want between battens and at wall or opening edges.
        </p>
        <p>
          Add each opening's width, height, distance from the left wall edge, and distance from the floor. An opening that spans the wall's full height divides the horizontal layout into separate segments. Shorter openings interrupt only the battens that cross them, leaving separate pieces above or below the opening. Overlapping openings are combined, and openings extending beyond the wall are clipped to the wall edges.
        </p>

        <h3>Spacing calculation</h3>
        <p>
          For a clear segment of width S, batten width B, and minimum clear gap G, the calculator uses the largest whole number of battens that fits: max(0, floor((S - G) / (B + G))). It then distributes the remaining space evenly, so the actual gap can be larger than the requested minimum. If a segment is narrower than the requested gap, no battens fit there. Partial-height openings split intersecting battens without changing the horizontal spacing pattern.
        </p>
        <p>
          The preview shows the obstacle rectangles and the resulting batten pieces. A batten that crosses an opening is cut at the opening's top and bottom; the calculator does not add installation clearance around the opening. Verify measurements and framing on the wall before cutting.
        </p>
        <h3>Material estimate</h3>
        <p>
          Vertical linear feet is the sum of all batten-piece lengths after openings are subtracted. The 8-foot stock-board estimate packs pieces into stock boards, then adds 10% for waste. A piece longer than 8 feet is counted as multiple stock lengths and must be spliced. Horizontal rails, baseboards, trim, and their waste are not included; this is an estimate, not a complete cut list.
        </p>

        <div className="ad-slot">
          <span style={{ color: "#94A3B8", fontSize: "0.8rem" }}>Advertisement Space</span>
        </div>

        <h2>Before You Cut</h2>
        <h3>Measure from finished edges</h3>
        <p>
          Measure wall width and height after accounting for the surfaces the battens will meet, such as a baseboard or top rail. A nominal 1x4 board is typically 3.5 inches wide; enter the board's actual width.
        </p>
        <h3>Check openings and obstacles</h3>
        <p>
          Enter each opening's dimensions and offsets from the left wall edge and floor. Battens that intersect an opening are split into pieces that stop at its edges; installation may require additional clearance or cutouts.
        </p>
        <h3>Plan horizontal trim separately</h3>
        <p>
          The material estimate does not include top or bottom rails, baseboards, or other trim. Measure and estimate those pieces separately.
        </p>

        <h2>Frequently Asked Questions</h2>
        <h3>What is the best wood for board and batten?</h3>
        <p>
          MDF (Medium Density Fiberboard) is the most popular choice for interior walls because it's cheap, perfectly straight, and paints beautifully. However, if you're doing a bathroom or exterior project, use primed pine or cedar to resist moisture.
        </p>
        <h3>How do I install the boards?</h3>
        <p>
          Use the actual clear gap shown for each segment. Measure that distance from the segment edge to the first batten, then place each following batten after the batten width plus the clear gap. Use a level and confirm all measurements on the wall before cutting.
        </p>
      </div>

      <div className="ad-slot">
        <span style={{ color: "#94A3B8", fontSize: "0.8rem" }}>Advertisement Space</span>
      </div>
    </article>
  );
}