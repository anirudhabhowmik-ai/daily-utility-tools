
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import StairCarpetCalculator from "./StairCarpetCalculator";

export const metadata: Metadata = {
  title: "Stair Carpet Calculator | Estimate Carpet, Roll Length & Cost | ToolsAB",
  description:
    "Calculate stair carpet area, roll length, carpet strips, pattern allowance, waste, optional padding, and estimated installation costs with this free stair carpet calculator.",
  alternates: { canonical: "/tools/stair-carpet-calculator" },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<StairCarpetCalculator />}
      title="Stair Carpet Calculator"
      summary="Planning to carpet a staircase or install a stair runner? Use this calculator to estimate how much carpet you may need, how long the carpet roll should be, and what your materials and installation could cost. Enter your stair measurements, landing details, carpet roll width, and pricing to get an estimate that updates as you work. No specialist measuring experience is needed to get started."

      highlights={[
        "Estimate carpet area from the number of steps, tread depth, riser height, and stair width.",
        "Include top or intermediate landing runs and additional flat landing areas.",
        "Estimate the number of carpet strips and account for seam overlap when a roll is narrower than the staircase.",
        "Add a pattern repeat allowance for separate carpet cuts.",
        "Include extra carpet for cutting, trimming, and installation waste.",
        "Estimate carpet roll length and the area of material that may need to be purchased.",
        "Optionally include carpet padding, installation labor, other expenses, and tax.",
        "Copy or print the estimate to discuss your material requirements with a carpet supplier or installer.",
      ]}

      steps={[
        "Enter the number of steps in your staircase. Then measure the tread depth, riser height, and overall stair width in inches.",
        "Add the combined landing run if your staircase has intermediate or top/bottom landing sections that continue in the direction of travel. Enter any separate flat landing area in square feet.",
        "Enter the width of the carpet roll you plan to buy. Add a seam overlap allowance if multiple strips will be needed.",
        "If your carpet has a repeating design, enter its pattern repeat and the number of separate cuts that need to be matched.",
        "Choose a waste percentage to allow for trimming, fitting, and material loss. Then enter your carpet price and any optional padding, labor, extra expenses, and tax.",
        "Review the carpet area, estimated roll length, number of strips, purchased material area, and total project cost in the results panel. Change any measurement or price to update the estimate.",
      ]}

      faqs={[
        {
          question: "What does this stair carpet calculator estimate?",
          answer:
            "It estimates the carpet surface area for a straight staircase, additional landing coverage, seam allowance, pattern allowance, and waste. It also estimates the carpet roll length, number of strips, purchased material area, and project cost based on the prices you enter. It is a planning estimate rather than a professional cutting plan.",
        },
        {
          question: "How do I measure the number of steps?",
          answer:
            "Count the individual steps that will receive carpet. Enter the total as a whole number. For example, if your staircase has 12 carpeted steps, enter 12. Do not include a separate landing as a step; enter its dimensions in the landing fields.",
        },
        {
          question: "What is tread depth?",
          answer:
            "The tread is the horizontal surface you place your foot on when walking up or down a staircase. Measure from the front edge of the tread to the back edge where it meets the next riser. Enter this measurement in inches. For example, a tread measuring 10 inches should be entered as 10.",
        },
        {
          question: "What is riser height?",
          answer:
            "The riser is the vertical face between two steps. Measure from the top of one tread to the top of the next tread, following the vertical height of the step. Enter the measurement in inches. A riser measuring 7.5 inches should be entered as 7.5.",
        },
        {
          question: "How do I measure stair width?",
          answer:
            "Measure across the staircase from one side to the other, perpendicular to the direction you walk. Enter the full width in inches if you plan to carpet the entire staircase. If you are installing a narrower runner, enter the width of the area that the carpet is intended to cover. The result is only as accurate as the width you provide.",
        },
        {
          question: "What is the extra nosing allowance per step?",
          answer:
            "Stair nosing is the front edge of a tread, which may project slightly beyond the riser below it. Carpet may need additional length to wrap around this edge. Enter the extra length in inches for each step. Use 0 if your tread measurement already includes the required nosing coverage. If your installer recommends a different allowance for your carpet or stair profile, use that measurement.",
        },
        {
          question: "Should I include the nosing in the tread depth?",
          answer:
            "Measure the tread depth consistently and avoid counting the same nosing length twice. The calculator adds the nosing allowance separately to the tread depth and riser height. If your tread measurement already includes the extra carpet length needed around the nosing, enter 0 for the additional nosing allowance.",
        },
        {
          question: "What is the combined landing run?",
          answer:
            "This is the total length of landing sections measured along the direction of travel. Enter the combined length in inches. For example, if you have two landing sections measuring 24 inches and 36 inches along the carpet route, enter 60 inches. The calculator uses this length with the stair width to estimate landing-run carpet area.",
        },
        {
          question: "What is the additional flat landing area?",
          answer:
            "Use this field for a separate flat area that needs carpet but is not already included in the combined landing run. Enter its total area in square feet, not its length or width. For example, a separate landing measuring 3 feet by 4 feet has an area of 12 square feet. Enter 12. Do not include an area here if you have already counted it in the landing run.",
        },
        {
          question: "What is the difference between landing run and additional landing area?",
          answer:
            "Combined landing run is a length measured in inches and is treated as a section of the carpet route with the same width as the stairs. Additional flat landing area is entered directly in square feet. Use the first field for landing sections that continue along the route, and the second for separate flat areas. This distinction helps prevent double-counting.",
        },
        {
          question: "What carpet roll width should I enter?",
          answer:
            "Enter the actual carpet roll width in inches, based on the product you intend to purchase. A common example is 12 feet, which is 144 inches. Check the supplier's product details because available widths can vary. The calculator uses this measurement to estimate how many strips are needed across the stair width.",
        },
        {
          question: "How do I convert feet into inches?",
          answer:
            "Multiply feet by 12. For example, a 3-foot measurement is 36 inches, and a 12-foot carpet roll is 144 inches. The stair dimensions, landing run, roll width, seam allowance, and pattern repeat fields all use inches.",
        },
        {
          question: "What are carpet strips?",
          answer:
            "Carpet strips are separate lengths or sections of carpet needed to cover the required width. If the carpet roll is wide enough to cover the stair width, the calculator estimates one strip. If the roll is narrower, it estimates multiple strips by dividing the stair width by the roll width and rounding up. Actual strip placement and cutting should be confirmed with your installer.",
        },
        {
          question: "What is the seam overlap allowance?",
          answer:
            "When multiple carpet strips are joined, the installer may need an overlap or extra material at the seams. Enter the additional overlap in inches. The calculator adds a seam-area allowance when more than one strip is required. If one strip covers the full stair width, this allowance does not add to the estimate.",
        },
        {
          question: "What is a carpet pattern repeat?",
          answer:
            "A pattern repeat is the distance before a printed, woven, or textured carpet design starts repeating. For example, a carpet might repeat its design every 18 inches. Check the carpet label or manufacturer's specifications for the repeat measurement and enter it in inches. Enter 0 if the carpet is plain or does not need pattern matching.",
        },
        {
          question: "What is the number of separate pattern cuts?",
          answer:
            "This is the number of separate carpet cuts that need to be aligned with one another for the pattern to look consistent. Enter 1 if no additional matching allowance is needed. If you enter more than 1, the calculator adds one pattern-repeat length for each additional cut. This is a simplified allowance, so complex designs may need a supplier's cutting plan.",
        },
        {
          question: "Why does the calculator add a pattern allowance?",
          answer:
            "Matching a repeating design can require extra carpet because each separate cut may need to start at the correct point in the pattern. The calculator estimates this extra length using the pattern repeat multiplied by the number of cuts beyond the first. It adds that length to the estimated carpet run; it does not create a detailed pattern-matching layout.",
        },
        {
          question: "What is the waste allowance?",
          answer:
            "Waste is extra material set aside for trimming, cutting, fitting, and small installation losses. Enter it as a percentage. For example, 10 means 10% extra. The default is 10%, but the right amount depends on the carpet, stair shape, pattern, and installation method. Ask your carpet supplier or installer if you are unsure.",
        },
        {
          question: "How much waste allowance should I use?",
          answer:
            "There is no single percentage that works for every staircase. A simple straight staircase with plain carpet may need a different allowance from stairs with pattern matching, turns, or unusual shapes. You can start with the calculator's 10% default as a planning assumption, then adjust it based on advice from your installer. The calculator accepts values from 0% to 100%.",
        },
        {
          question: "What is net carpet area?",
          answer:
            "Net carpet area is the estimated surface area before seam and waste allowances. It includes the calculated stair surface, landing-run area, and additional flat landing area. It is useful for understanding the basic area being covered before extra material is added.",
        },
        {
          question: "What does carpet required mean?",
          answer:
            "Carpet required is the calculator's estimated coverage area after adding the seam allowance and your selected waste percentage. It is different from the actual material area purchased because carpet is sold in rolls with fixed widths and lengths.",
        },
        {
          question: "What does estimated roll length mean?",
          answer:
            "Roll length is the estimated linear length of carpet needed from the roll, including the pattern allowance and waste. It is shown in feet and inches. The calculation uses the entered roll width, estimated strips, stair and landing run, and any additional flat landing area.",
        },
        {
          question: "Why can purchased material area be different from carpet required?",
          answer:
            "Carpet required is the estimated coverage area after allowances. Purchased material area is calculated from the full roll width and estimated roll length. Because carpet is purchased in a particular roll width, the purchased area can be higher than the coverage area. The difference is shown as extra roll material.",
        },
        {
          question: "What does extra roll material mean?",
          answer:
            "This is the estimated purchased material area left over after subtracting the carpet-required area from the calculated purchased area. It can help you understand how much extra material may result from buying carpet in the selected roll width. It is an estimate, not a guarantee of usable leftover carpet.",
        },
        {
          question: "How is carpet material cost calculated?",
          answer:
            "Enter the price per square foot in the carpet price field. The calculator multiplies this price by the estimated purchased material area, not just the net stair surface area. This helps account for the roll material estimated for purchase.",
        },
        {
          question: "How do I include carpet padding or underlay?",
          answer:
            "Turn on the Include carpet padding / underlay switch. A padding price field will appear. Enter the padding cost per square foot. The calculator estimates padding cost using the carpet-required area. Whether padding is needed, and which type is suitable, depends on the carpet product and installation instructions.",
        },
        {
          question: "What is installation labor per step?",
          answer:
            "Enter the installation charge for each carpeted step. The calculator multiplies this rate by the number of steps you entered. Use this if your installer charges a fixed amount for each step.",
        },
        {
          question: "What is additional labor per square foot?",
          answer:
            "Some installers charge an additional rate based on the area being covered. Enter that rate in your selected currency per square foot. The calculator multiplies it by the carpet-required area. If your installer does not charge by area, leave this field at 0.",
        },
        {
          question: "Can I use both labor pricing fields?",
          answer:
            "Yes. The calculator adds the per-step labor charge and the per-square-foot labor charge. Use both only if your installer actually charges both types of fees. If the quote already includes one of them, do not enter it again.",
        },
        {
          question: "What should I include in other expenses?",
          answer:
            "Use this field for additional project costs that are not already included in the carpet, padding, or labor prices. Examples may include adhesive, stair rods, transition trims, or other accessories. Enter the total amount in your selected currency.",
        },
        {
          question: "How does the tax or GST field work?",
          answer:
            "Enter the applicable tax rate as a percentage. For example, enter 8 for 8%. The calculator applies this percentage to the subtotal of carpet, padding, labor, and other expenses. Confirm the correct tax treatment for your location and purchase.",
        },
        {
          question: "What does the currency selector do?",
          answer:
            "Choose USD, EUR, GBP, INR, AUD, CAD, or AED to change how estimated prices are displayed. It does not convert prices or apply live exchange rates. Enter all prices in the currency you select.",
        },
        {
          question: "Can I calculate carpet for a stair runner instead of full carpeting?",
          answer:
            "You can enter the width of the runner as the stair width if that is the area you want to estimate. Measure the runner width consistently across the steps and enter the roll width of the product you plan to buy. The estimate still assumes a straightforward layout, so confirm the runner's actual cutting and fitting requirements with your installer.",
        },
        {
          question: "Can I use this calculator for curved or winding stairs?",
          answer:
            "The calculator is designed around a straightforward stair run with consistent tread depth, riser height, and width. Winder steps, curved stairs, spiral stairs, and irregular staircases often need individual measurements and a custom cutting plan. Ask a carpet professional to measure these areas before ordering.",
        },
        {
          question: "What if every step has a different measurement?",
          answer:
            "This calculator uses one tread depth, one riser height, and one stair width for all steps. If your staircase has different-sized or irregular steps, the estimate may not represent the actual material requirement. Measure each unusual step separately and ask your installer to prepare a more detailed estimate.",
        },
        {
          question: "Does the calculator include stair turns and transitions?",
          answer:
            "It does not create a detailed layout for turns, winders, transitions, or unusual stair shapes. These features can affect how carpet is cut and fitted. The estimate should be treated as a starting point for a simple layout, with the final material quantity confirmed on site.",
        },
        {
          question: "Why is my estimated roll length different from the carpet area?",
          answer:
            "Carpet area is measured in square feet, while roll length is measured along the length of the carpet roll. Roll width connects these two measurements. A wider or narrower roll can change the estimated number of strips and the length of material needed.",
        },
        {
          question: "Can I change the measurements after entering them?",
          answer:
            "Yes. The estimate updates automatically whenever you change a measurement, allowance, or price. You can try different roll widths, waste percentages, or pricing values to compare possible project scenarios.",
        },
        {
          question: "Can I copy or print my stair carpet estimate?",
          answer:
            "Yes. Select Copy estimate to copy the measurement and cost summary, which you can paste into a note or message. Select Print to open your browser's print dialog. You can then print the estimate or choose to save it as a PDF.",
        },
        {
          question: "Is this estimate an exact carpet order quantity?",
          answer:
            "No. It is a planning estimate based on the measurements and assumptions entered. It does not replace a site measurement or professional cutting plan. Carpet direction, pattern alignment, usable roll width, stair shape, trimming, and installation technique can all affect the final quantity.",
        },
        {
          question: "What should I check before ordering stair carpet?",
          answer:
            "Confirm the actual dimensions of every step, the carpeted width, roll width, pattern repeat, and any landing or transition requirements. Ask the supplier about usable roll width and pattern matching. If the stairs are irregular or turn, have the installer confirm the cutting plan before you order.",
        },
      ]}

      note="This calculator is intended for estimating a straightforward staircase with consistent step dimensions. It uses inches for stair and roll measurements, square feet for additional flat landing area, and the prices you enter for cost estimates. The roll-length and purchased-area figures are planning estimates, not a final cutting diagram. Winding stairs, irregular steps, carpet direction, pattern matching, seams, and installation methods can change the amount required. Always confirm measurements and the final cutting plan with your carpet supplier or professional installer before ordering."
    />
  );
}
