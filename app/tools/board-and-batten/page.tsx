
import type { Metadata } from "next";
import BoardBatten from "./BoardBatten";
import ToolBreadcrumb from "../ToolBreadcrumb";

export const metadata: Metadata = {
  title: "Board and Batten Layout Calculator | Free Wall Planner | ToolsAB",
  description:
    "Plan a board and batten wall with an interactive layout calculator. Set wall dimensions, adjust batten spacing, add doors and windows, and estimate vertical materials.",
  alternates: {
    canonical: "/tools/board-and-batten",
  },
};

export default function BoardBattenPage() {
  return (
    <article className="animate-fade-in">
      <ToolBreadcrumb title="Board and Batten Layout Calculator" />

      <BoardBatten />

      <header className="tool-page-header">
        <p className="tool-page-category">Home Improvement</p>

        <h1>Board and Batten Layout Calculator</h1>

        <p>
          Planning a board and batten wall? This free calculator helps you
          work out where your vertical battens should go, how much space
          to leave between them, and how much vertical material you may
          need. You can also add doors, windows, electrical outlets, and
          other wall obstacles to see how they affect your layout.
        </p>
      </header>

      <div className="article-content">
        <h2>How to Use the Board and Batten Calculator</h2>

        <p>
          You do not need any special construction software to use this
          tool. Start with your wall measurements, enter the size of
          your battens, and adjust the spacing. The layout and material
          estimate update automatically as you change the values.
        </p>

        <h3>Step 1: Choose your measurement unit</h3>

        <p>
          Select the unit you are most comfortable measuring with:
          inches, feet, or centimeters. All measurement fields will
          display the selected unit. You can change units at any time
          without losing your measurements.
        </p>

        <h3>Step 2: Enter your wall dimensions</h3>

        <p>
          Measure the finished wall that you want to cover with board
          and batten. Enter these two measurements:
        </p>

        <ul>
          <li>
            <strong>Wall Width:</strong> The horizontal distance from
            the left edge of the wall to the right edge.
          </li>
          <li>
            <strong>Wall Height:</strong> The vertical distance from
            the bottom of the area you want to cover to the top.
          </li>
        </ul>

        <p>
          If you are installing battens above an existing baseboard,
          measure the height from the top of the baseboard rather than
          from the floor. Likewise, measure to the finished top edge
          where the battens will stop.
        </p>

        <h3>Step 3: Set your batten width and spacing</h3>

        <p>
          These two fields determine how your vertical boards are
          arranged across the wall.
        </p>

        <ul>
          <li>
            <strong>Batten Width:</strong> Enter the actual face width
            of each vertical board. For example, a standard nominal
            1x4 board is usually 3.5 inches wide, not 4 inches.
          </li>
          <li>
            <strong>Minimum Clear Gap:</strong> Enter the smallest open
            space you want between neighboring battens. This is the
            empty space measured from one batten edge to the next
            batten edge, not the distance from center to center.
          </li>
        </ul>

        <p>
          The calculator places as many battens as possible while
          keeping the clear gaps at or above your requested minimum.
          It then distributes the remaining space evenly across the
          segment. Because of this, the actual gap shown in the results
          can be larger than your minimum gap.
        </p>

        <h3>Step 4: Add doors, windows, and other obstacles</h3>

        <p>
          If your wall has openings or objects that vertical battens
          must avoid, click <strong>Add Obstacle</strong>. You can add
          more than one obstacle to the same wall.
        </p>

        <p>
          Choose the type of obstacle from the dropdown:
        </p>

        <ul>
          <li>
            <strong>Window:</strong> For a window opening in the wall.
          </li>
          <li>
            <strong>Door:</strong> For a doorway or door opening.
          </li>
          <li>
            <strong>Light Switch:</strong> For a wall switch.
          </li>
          <li>
            <strong>Electrical Outlet:</strong> For an outlet or
            receptacle.
          </li>
          <li>
            <strong>Custom Obstacle:</strong> For anything else, such
            as a vent, HVAC opening, or another feature.
          </li>
        </ul>

        <p>
          Selecting a preset obstacle type fills in suggested starting
          dimensions. These are only defaults, so measure the actual
          opening or object and change the values before relying on
          the layout.
        </p>

        <h3>Understanding the obstacle fields</h3>

        <ul>
          <li>
            <strong>Label:</strong> Available for custom obstacles.
            Give the obstacle a name, such as HVAC, vent, or cabinet.
          </li>
          <li>
            <strong>Width:</strong> How wide the opening or obstacle
            is from left to right.
          </li>
          <li>
            <strong>Left Edge Offset:</strong> The distance from the
            left edge of the wall to the left edge of the obstacle.
          </li>
          <li>
            <strong>Height:</strong> How tall the opening or obstacle
            is.
          </li>
          <li>
            <strong>Bottom Edge Offset:</strong> The distance from
            the bottom of the wall to the bottom edge of the obstacle.
          </li>
        </ul>

        <p>
          For example, imagine a window that is 36 inches wide and
          48 inches tall. If its left edge is 36 inches from the left
          side of the wall and its bottom edge is 36 inches above the
          floor, enter those measurements in the corresponding fields.
        </p>

        <p>
          You can remove an obstacle using the X button next to its
          dropdown.
        </p>

        <h3>Step 5: Check the layout preview</h3>

        <p>
          The preview gives you a visual idea of how the battens fit
          across your wall. It uses different colors to distinguish
          the wall, vertical battens, and obstacles.
        </p>

        <ul>
          <li>
            <strong>Wall segments:</strong> The available sections of
            the wall where the horizontal batten layout is calculated.
          </li>
          <li>
            <strong>Vertical battens:</strong> The planned vertical
            boards. A batten that intersects an obstacle is divided
            into separate pieces above or below it.
          </li>
          <li>
            <strong>Openings:</strong> The doors, windows, switches,
            outlets, and custom obstacles you entered.
          </li>
        </ul>

        <p>
          A full-height opening, such as a doorway extending from the
          bottom to the top of the wall, divides the wall into separate
          horizontal layout segments. Each segment gets its own
          spacing calculation.
        </p>

        <p>
          A shorter opening, such as a window, does not create a new
          horizontal segment. Instead, the calculator interrupts only
          the battens whose horizontal width overlaps the opening.
          Those battens are represented by separate vertical cut
          pieces above and below the obstacle.
        </p>

        <h3>Step 6: Understand the results</h3>

        <p>
          Once your measurements are valid, the calculator displays
          the layout details and a material estimate.
        </p>

        <ul>
          <li>
            <strong>Segment Layout:</strong> Shows each available
            horizontal wall segment, its starting and ending position,
            the number of batten positions, and the actual clear gap
            calculated for that segment.
          </li>
          <li>
            <strong>Batten Positions:</strong> The total number of
            horizontal batten positions calculated before accounting
            for vertical interruptions from obstacles.
          </li>
          <li>
            <strong>Vertical Cut Pieces:</strong> The number of
            individual vertical pieces after battens are divided
            around openings.
          </li>
          <li>
            <strong>Vertical Linear Feet:</strong> The combined length
            of all vertical batten pieces, expressed in feet.
          </li>
          <li>
            <strong>8-ft Stock Boards:</strong> An estimate of how
            many 8-foot boards may be needed to make the vertical
            pieces, including the additional waste allowance.
          </li>
          <li>
            <strong>Waste Allowance:</strong> The calculator adds
            10% to its estimated stock-board quantity.
          </li>
        </ul>

        <p>
          The calculator attempts to group shorter cut pieces into
          8-foot stock boards. A piece longer than 8 feet is counted
          as multiple stock lengths and will need to be spliced.
          Actual purchasing and cutting requirements may differ.
        </p>

        <h2>Try a Simple Board and Batten Example</h2>

        <p>
          Suppose you want to install vertical battens on a wall that
          is 12 feet wide and 8 feet tall. You plan to use boards
          that are 3.5 inches wide, with a minimum clear gap of
          16 inches.
        </p>

        <p>
          Start by entering the following measurements:
        </p>

        <ul>
          <li>Measurement Unit: Inches</li>
          <li>Wall Width: 144 inches</li>
          <li>Wall Height: 96 inches</li>
          <li>Batten Width: 3.5 inches</li>
          <li>Minimum Clear Gap: 16 inches</li>
        </ul>

        <p>
          Leave the obstacle list empty if your wall has no openings
          or objects to work around. The calculator will show the
          vertical batten layout and estimate the required material.
        </p>

        <p>
          Next, click Add Obstacle if your wall has a window or door.
          Enter its actual dimensions and position to see how the
          vertical pieces change.
        </p>

        <h2>How Is Batten Spacing Calculated?</h2>

        <p>
          The calculator works out the spacing separately for each
          usable horizontal wall segment. It considers the segment
          width, the actual width of each batten, and your requested
          minimum clear gap.
        </p>

        <p>
          It first determines the largest whole number of battens
          that can fit while maintaining the minimum gap. It then
          divides the remaining horizontal space evenly between
          the two wall edges and the gaps between neighboring battens.
        </p>

        <p>
          For example, if a segment has enough room for six battens,
          the calculator distributes the remaining space across
          seven gaps: one at each end and five between the battens.
          The resulting gap is displayed in the Segment Layout.
        </p>

        <p>
          If a segment is too narrow to fit a batten while respecting
          the requested minimum gap, no battens are placed in that
          segment.
        </p>

        <h2>Important Things to Check Before Cutting</h2>

        <h3>Use finished measurements</h3>

        <p>
          Measure the exact area where the battens will be installed.
          Account for baseboards, top rails, existing trim, and other
          surfaces that affect where the boards will start and stop.
          Do not assume the full floor-to-ceiling height is available.
        </p>

        <h3>Measure every obstacle carefully</h3>

        <p>
          Check the width, height, and position of each door, window,
          switch, and outlet. The calculator clips obstacles that
          extend outside the wall dimensions to the wall boundary.
          Overlapping obstacle areas are combined when determining
          the interrupted batten pieces.
        </p>

        <p>
          The calculator does not add extra installation clearance
          around obstacles. You should allow for the real trim,
          electrical fittings, and installation requirements when
          planning your cuts.
        </p>

        <h3>Check the actual board dimensions</h3>

        <p>
          Lumber is often sold using nominal sizes. The actual width
          can be different from the size printed on the label. Use
          the measured face width of the board in the Batten Width
          field.
        </p>

        <h3>Plan horizontal trim separately</h3>

        <p>
          This calculator estimates vertical battens only. It does
          not include horizontal rails, baseboards, top trim,
          decorative moulding, or their associated waste. Measure
          and estimate those materials separately.
        </p>

        <h3>Treat the material estimate as a starting point</h3>

        <p>
          The 8-foot stock-board estimate uses a simplified packing
          calculation and adds 10% for waste. It does not account
          for saw-blade kerf, knots, defects, grain direction, or
          every possible cutting constraint. Check the actual
          cutting plan and buy an appropriate allowance for your
          project.
        </p>

        <h2>Frequently Asked Questions</h2>

        <h3>What is board and batten?</h3>

        <p>
          Board and batten is a wall treatment made using wide
          panels or boards with narrower strips, called battens,
          covering the joints or creating a repeating pattern.
          Vertical battens are commonly used to create a decorative
          panelled look on interior walls and exterior siding.
        </p>

        <h3>What is a good gap between board and batten strips?</h3>

        <p>
          There is no single spacing that works for every wall.
          The right gap depends on the wall size, batten width,
          room style, and the pattern you want. A gap around
          12 to 16 inches is a common starting point for some
          interior designs, but you should test the layout and
          choose a spacing that looks balanced in your room.
        </p>

        <h3>Should the gaps between battens be equal?</h3>

        <p>
          This calculator distributes the available space evenly
          within each horizontal segment. It includes a gap at
          both ends of the segment, so the spacing is balanced
          rather than simply starting with a batten at the wall
          edge.
        </p>

        <h3>What happens if a window or door is in the middle of the wall?</h3>

        <p>
          Add the opening and enter its actual dimensions and
          offsets. The calculator interrupts any batten whose
          horizontal width overlaps the opening. It then estimates
          the separate vertical pieces above and below the opening.
          A full-height opening divides the wall into separate
          layout segments.
        </p>

        <h3>Can I use centimeters or feet instead of inches?</h3>

        <p>
          Yes. Select Inches, Feet, or Centimeters from the
          Measurement Unit control. The calculator converts
          measurements internally, so you can work with the unit
          you prefer.
        </p>

        <h3>Does the calculator include doors, windows, and electrical outlets?</h3>

        <p>
          Yes. You can add windows, doors, light switches,
          electrical outlets, and custom obstacles. Enter their
          width, height, and position to include them in the
          layout calculation.
        </p>

        <h3>Why is the actual gap different from my minimum gap?</h3>

        <p>
          Minimum Clear Gap is a lower limit, not a fixed spacing
          instruction. The calculator chooses the largest whole
          number of battens that fits and then spreads the remaining
          space evenly. The resulting actual gap can therefore be
          larger than the minimum you entered.
        </p>

        <h3>Does the material estimate include horizontal boards?</h3>

        <p>
          No. The estimate covers vertical batten pieces only.
          Horizontal rails, top and bottom trim, baseboards, and
          other decorative pieces are not included.
        </p>

        <h3>Why might the preview disappear for a large layout?</h3>

        <p>
          Very large layouts can contain many batten positions.
          To keep the tool responsive, the calculator limits the
          number of battens shown in the visual preview. The
          material estimate can still be displayed when the
          calculation is within its supported limits.
        </p>

        <h3>Is this calculator a complete cutting plan?</h3>

        <p>
          No. It is a layout and material-planning aid. Always
          verify measurements on the actual wall, check obstacle
          clearances, account for trim and cutting requirements,
          and confirm your final cut list before purchasing or
          cutting lumber.
        </p>
      </div>
    </article>
  );
}
