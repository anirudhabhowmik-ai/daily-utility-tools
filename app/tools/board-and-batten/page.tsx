import type { Metadata } from "next";
import BoardBatten from "./BoardBatten";

export const metadata: Metadata = {
  title: "Advanced Board and Batten Calculator (Windows & Doors) | DailyTools",
  description: "Calculate exact board and batten spacing with doors, windows, and openings. Get a full cut list, material estimate, and visual layout preview for free.",
  alternates: { canonical: "/tools/board-and-batten" },
};

export default function BoardBattenPage() {
  return (
    <article className="animate-fade-in">
      <header style={{ marginTop: "3rem", marginBottom: "2rem" }}>
        <h1>Advanced Board and Batten Calculator</h1>
        <p style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>
          Calculate exact spacing, deduct windows and doors, and get a complete material cut list for your DIY accent wall.
        </p>
      </header>

      <div className="ad-slot">
        <span style={{ color: "#94A3B8", fontSize: "0.8rem" }}>Advertisement Space</span>
      </div>

      <BoardBatten />

      <div className="article-content">
        <h2>Why Most Calculators Fail (And Why This One Doesn't)</h2>
        <p>
          If you've looked at other board and batten calculators online, you've probably noticed a huge flaw: they assume your wall is completely blank. In reality, walls have doors, windows, light switches, and outlets. 
        </p>
        <p>
          I built this calculator because I was frustrated with doing the math manually. When you have a window in the middle of a wall, you can't just run a batten through it. You have to split the wall into "segments" and calculate the spacing for each section independently. This tool does exactly that. It automatically detects your openings, splits the wall, and calculates the optimal gap for every single section.
        </p>

        <h2>How to Use the Advanced Features</h2>
        <h3>1. Measure Your Wall Segments</h3>
        <p>
          Before entering numbers, measure the total width of your wall. Then, measure the distance from the left corner to the edge of your first window or door. Note the width of the opening. Repeat this for all openings. 
        </p>
        <h3>2. Enter Your Target Gap</h3>
        <p>
          Instead of guessing how many battens you need, enter your desired gap (usually between 12 and 20 inches). The calculator will tell you exactly how many battens fit in each segment. 
        </p>
        <h3>3. Review the Material List</h3>
        <p>
          The tool automatically calculates the total linear feet of batten material required, and tells you how many standard 8-foot boards to buy, including a 10% waste factor for cuts and mistakes.
        </p>

        <div className="ad-slot">
          <span style={{ color: "#94A3B8", fontSize: "0.8rem" }}>Advertisement Space</span>
        </div>

        <h2>Common Board and Batten Mistakes</h2>
        <h3>1. Ignoring the Board Width</h3>
        <p>
          A standard 1x4 MDF board is actually 3.5 inches wide. If you use 1x6 boards, they are 5.5 inches wide. This width matters because it eats into the total wall space. The calculator handles this automatically, but if you do the math manually, remember to subtract the board width from the wall space before dividing by the number of gaps.
        </p>
        <h3>2. Not Accounting for Outlets</h3>
        <p>
          You can't put a batten directly over an electrical outlet. If your batten layout clashes with an outlet, you may need to shift the entire layout left or right, or add a small trim piece around the outlet. Our calculator lets you add outlets as "openings" to avoid this problem.
        </p>
        <h3>3. Forgetting the Baseboard</h3>
        <p>
          If you have a baseboard, your vertical battens will sit on top of it. Your horizontal top rail should be measured from the top of the baseboard to the ceiling. This doesn't affect horizontal spacing, but it matters for cutting your vertical boards.
        </p>

        <h2>Frequently Asked Questions</h2>
        <h3>What is the best wood for board and batten?</h3>
        <p>
          MDF (Medium Density Fiberboard) is the most popular choice for interior walls because it's cheap, perfectly straight, and paints beautifully. However, if you're doing a bathroom or exterior project, use primed pine or cedar to resist moisture.
        </p>
        <h3>How do I install the boards?</h3>
        <p>
          Start by attaching your top horizontal rail. Then, measure in from the wall edge using the "gap" number from the calculator to place your first batten. Use a level to make sure it's perfectly plumb. Then, measure from the edge of that batten by the gap amount to place the next one. 
        </p>
      </div>

      <div className="ad-slot">
        <span style={{ color: "#94A3B8", fontSize: "0.8rem" }}>Advertisement Space</span>
      </div>
    </article>
  );
}