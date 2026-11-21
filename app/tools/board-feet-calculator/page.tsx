
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import BoardFeetCalculator from "./BoardFeetCalculator";

export const metadata: Metadata = {
  title: "Board Feet Calculator – Lumber Cost & Waste Estimator | ToolsAB",
  description:
    "Calculate board feet for lumber projects with multiple wood types, board dimensions, quantity and waste allowance. Estimate material costs, discounts, sales tax and delivery charges.",
  alternates: { canonical: "/tools/board-feet-calculator" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<BoardFeetCalculator />}
      title="Board Feet Calculator"
      summary="Calculate how much lumber your woodworking or construction project may require. Enter the thickness, width, length and quantity of each lumber type to calculate board feet. Add a waste allowance, enter supplier prices and estimate your material budget with optional discounts, sales tax and delivery charges. You can include multiple wood types in one estimate, duplicate similar items, review a live cost breakdown and export your results as a CSV spreadsheet. Whether you are building furniture, installing trim, making cabinets or planning a DIY project, this calculator helps turn board measurements into a practical lumber purchasing estimate."
      highlights={[
        "Calculate board feet using thickness, width, length and quantity for each lumber item.",
        "Add multiple lumber types to one project estimate, such as oak, pine, maple, walnut or cedar.",
        "Enter a separate name, dimensions, quantity and price for every lumber item.",
        "Calculate the board-foot volume of individual items and the combined project total.",
        "Add a percentage-based waste allowance to account for cutting, trimming and material defects.",
        "Estimate lumber material costs using a price per board foot for each item.",
        "Apply a percentage discount to the combined material subtotal.",
        "Include delivery charges and choose whether delivery is part of the taxable amount.",
        "Calculate estimated sales tax and review the complete project cost breakdown.",
        "Duplicate an existing lumber item when you need another entry with similar dimensions.",
        "Remove unnecessary entries and update measurements or prices as your estimate changes.",
        "See live results for base board feet, waste-adjusted board feet, material subtotal and estimated total cost.",
        "Copy a readable project estimate or download a CSV file containing lumber dimensions, quantities, board feet and costs.",
        "Use the built-in board-foot formula guide to understand how lumber volume is calculated.",
      ]}
      steps={[
        "Start with the Lumber items section. The calculator includes one sample item named Oak lumber. You can edit this entry or use Add lumber to create additional items for your project.",
        "Use Lumber name / wood type to identify the material. Enter a name such as Oak, Pine, Walnut, Maple or Cedar. If your project uses different lumber species or sizes, create a separate item for each one so their measurements and prices can be calculated independently.",
        "Enter Thickness (in) using inches. This is the thickness of one board. For example, enter 1 for a board that is one inch thick or 1.5 for a board that is one and a half inches thick. Use the actual measurement you want to calculate rather than assuming a nominal lumber size is its finished size.",
        "Enter Width (in) using inches. For example, a board that is six inches wide should be entered as 6. The calculator uses this measurement together with thickness and length to determine the volume of each piece.",
        "Enter Length (ft) using feet, not inches. For example, an eight-foot board should be entered as 8. If your measurement is in inches, convert it to feet before entering it. Divide the length in inches by 12 to get the length in feet.",
        "Enter Quantity (pieces) to specify how many identical boards you need. For example, enter 10 if you plan to purchase ten boards with the same thickness, width and length. Quantity must be a whole number of at least one.",
        "Enter Price per board foot ($) using your supplier's price for one board foot of that lumber type. For example, if the supplier charges $5.50 per board foot, enter 5.50. The calculator uses this rate to estimate the material cost of that item.",
        "Check the individual item result beneath the input fields. It displays the base board feet, board feet after the waste allowance and estimated material cost for that lumber entry.",
        "Select + Add lumber to create another entry. This is useful when your project needs different wood species, board dimensions, quantities or prices. Each item is calculated separately and included in the project summary.",
        "Use the duplicate button on an existing lumber card when you need another entry with similar details. The calculator creates a copy of that item and adds the word Copy to its name. You can then edit the copied dimensions, quantity or price.",
        "Use the remove button to delete an item that is no longer required. The calculator keeps at least one lumber item in the list, so the final remaining item cannot be removed.",
        "Open Project cost settings to adjust the purchasing and pricing assumptions for the complete estimate. These settings apply to the combined valid lumber items rather than to just one selected item.",
        "Enter Waste allowance (%) to add extra board feet for cutting, trimming, defects and other material losses. For example, a 10% allowance increases the calculated lumber requirement by 10%. The default value is 10%, and you can enter a value from 0% to 100%.",
        "Enter Discount (%) if your supplier offers a discount on the material subtotal. For example, a 5% discount reduces the combined lumber material cost by 5%. The discount is applied before sales tax and does not reduce the delivery charge.",
        "Enter Sales tax (%) to estimate the tax rate applicable to your purchase. For example, enter 8 if you want to calculate an 8% sales tax. The calculator uses the percentage you enter; it does not look up your local tax rate automatically.",
        "Enter Delivery charge ($) to include transportation or delivery costs in your estimate. Enter 0 if you will collect the lumber yourself or do not want to include a delivery charge.",
        "Enable Include delivery charges in taxable amount if your delivery fee should be included in the amount used to calculate sales tax. Leave it switched off if you want sales tax calculated only on the discounted material subtotal.",
        "Review Project summary to see the total base board feet before waste, required board feet after waste, number of valid lumber items and material subtotal before discount and tax.",
        "Open Detailed cost breakdown to review each part of the estimate. It shows the material subtotal, discount amount, discounted material cost, delivery charge, taxable amount, sales tax and estimated project total.",
        "Check the Estimated total project cost panel for the combined cost of discounted materials, delivery and calculated sales tax. The required board-foot quantity is displayed alongside the estimated cost.",
        "If an item contains invalid dimensions, quantity or price, the calculator displays a warning. Correct the affected item before relying on the final estimate. All entries must have positive thickness, width and length, a whole-number quantity of at least one, and a non-negative price.",
        "If a lumber item has a price of $0, its board feet are still included in the volume calculation. However, that item contributes $0 to the material subtotal. The summary displays a notice when one or more valid items have no price entered.",
        "Select Copy estimate to copy a text summary of the valid lumber items and project cost breakdown. You can paste it into an email, document or project note.",
        "Select Download CSV to save a spreadsheet containing each valid lumber item's name, dimensions, quantity, base board feet, waste-adjusted board feet, price per board foot and material cost. The file also includes the main project totals.",
        "Use the downloaded CSV in spreadsheet applications such as Microsoft Excel or Google Sheets if you want to keep a record, review the itemized estimate or share the calculation with a supplier.",
        "Use the built-in Board feet calculation guide below the calculator to review the formula and measurement units. Before placing an order, compare your estimate with the supplier's actual board dimensions, pricing method and available stock.",
      ]}
      faqs={[
        {
          question: "What is a board foot?",
          answer:
            "A board foot is a unit of lumber volume. It represents a piece of wood measuring 12 inches long, 12 inches wide and 1 inch thick, which equals 144 cubic inches. It is commonly used by lumber suppliers to measure and price wood.",
        },
        {
          question: "What is the board feet formula?",
          answer:
            "The formula used by this calculator is: Board Feet = (Thickness in inches × Width in inches × Length in feet × Quantity) ÷ 12. Thickness and width must be entered in inches, while length must be entered in feet.",
        },
        {
          question: "How many board feet are in a 1 × 6 × 8 board?",
          answer:
            "A board measuring 1 inch thick, 6 inches wide and 8 feet long contains 4 board feet. The calculation is (1 × 6 × 8) ÷ 12 = 4. If you enter a 10% waste allowance, the purchasing estimate becomes 4.4 board feet.",
        },
        {
          question: "How many board feet are in a 2 × 6 × 8 board?",
          answer:
            "Using the dimensions entered in the formula, a board that is 2 inches thick, 6 inches wide and 8 feet long contains 8 board feet. The calculation is (2 × 6 × 8) ÷ 12 = 8. Make sure you use the dimensions relevant to the supplier's pricing method.",
        },
        {
          question: "Can I calculate board feet for multiple boards?",
          answer:
            "Yes. Enter the dimensions and quantity for each lumber item. The calculator multiplies the board-foot volume of one piece by its quantity and adds the results from all valid items to calculate the combined project volume.",
        },
        {
          question: "Can I add different types of wood to one estimate?",
          answer:
            "Yes. Use Add lumber to create separate entries for different wood species or board sizes. For example, you can estimate oak for a tabletop, pine for framing and walnut for decorative trim in the same project. Each item can have its own dimensions, quantity and price per board foot.",
        },
        {
          question: "What is the difference between nominal and actual lumber dimensions?",
          answer:
            "Nominal dimensions are the names used to identify common lumber sizes, such as 2 × 4 or 2 × 6. Actual dimensions are the measurements of the finished board after processing and drying. A board sold as a nominal 2 × 4 is commonly smaller than 2 inches by 4 inches. The correct dimensions to enter depend on how the lumber is measured and priced by your supplier. Check the supplier's specifications before calculating.",
        },
        {
          question: "Should I enter nominal or actual dimensions?",
          answer:
            "Use the dimensions that match the supplier's board-foot measurement and pricing method. Some suppliers calculate using nominal dimensions, while others use actual measurements. If you are estimating the physical volume of finished wood, actual dimensions are generally more useful. Confirm the supplier's method before using the estimate to place an order.",
        },
        {
          question: "Can I enter length in inches?",
          answer:
            "The Length field expects feet. Convert inches to feet before entering the value. For example, 96 inches equals 8 feet, so enter 8. For 72 inches, enter 6.",
        },
        {
          question: "How do I calculate board feet from cubic inches?",
          answer:
            "Divide the volume in cubic inches by 144 to convert it to board feet. One board foot contains 144 cubic inches. This calculator uses the equivalent thickness × width × length formula with inches for thickness and width and feet for length.",
        },
        {
          question: "What is a lumber waste allowance?",
          answer:
            "A waste allowance is extra material included in an estimate to account for cutting, trimming, defects, damaged boards and measurement differences. The appropriate amount depends on the project, board quality, cutting plan and experience of the person doing the work. This calculator applies the selected percentage separately to each lumber item.",
        },
        {
          question: "How does the waste percentage affect board feet?",
          answer:
            "The calculator multiplies each item's base board feet by 1 plus the waste percentage divided by 100. For example, 100 base board feet with a 10% waste allowance becomes 110 board feet. The same allowance is applied to every valid lumber item before the adjusted quantities are added together.",
        },
        {
          question: "Does the waste allowance increase the material cost?",
          answer:
            "Yes. The calculator applies the waste allowance to each item's board-foot quantity before multiplying by its price per board foot. As a result, the material cost estimate includes the extra volume allowed for waste.",
        },
        {
          question: "How is lumber material cost calculated?",
          answer:
            "For each item, the calculator multiplies its waste-adjusted board feet by the price per board foot. It then adds the material costs of all valid items to produce the material subtotal. A price of $0 is allowed, but that item will contribute nothing to the material cost.",
        },
        {
          question: "How is the discount calculated?",
          answer:
            "The discount is calculated as a percentage of the combined material subtotal. For example, if materials cost $500 and you enter a 10% discount, the discount is $50 and the discounted material subtotal becomes $450. Delivery is not discounted.",
        },
        {
          question: "How is sales tax calculated?",
          answer:
            "Sales tax is calculated using the percentage you enter and the applicable taxable amount. By default, the taxable amount is the discounted material subtotal. If Include delivery charges in taxable amount is enabled, the delivery charge is added to that amount before calculating tax.",
        },
        {
          question: "Is delivery included in the sales tax calculation?",
          answer:
            "It depends on the delivery tax switch. When the switch is off, sales tax is calculated on the discounted material subtotal only. When it is on, the delivery charge is added to the taxable amount. Actual delivery tax rules vary by location, so check the rules that apply to your purchase.",
        },
        {
          question: "What is included in the estimated project total?",
          answer:
            "The total is calculated by subtracting the material discount from the material subtotal, adding the delivery charge and then adding the calculated sales tax. The formula is: Grand Total = Discounted Material Subtotal + Delivery Charge + Sales Tax.",
        },
        {
          question: "Does the calculator automatically find lumber prices?",
          answer:
            "No. You must enter the price per board foot for each lumber item based on your supplier's quote. The calculator does not search supplier websites, retrieve live lumber prices or compare local stores.",
        },
        {
          question: "Why does my estimate show a zero material cost?",
          answer:
            "Check the Price per board foot field for each item. If an item's price is set to zero, its volume is still included in the total board feet, but its material cost is zero. Enter the supplier's price to include that item in the material estimate.",
        },
        {
          question: "Why does the calculator show an invalid item warning?",
          answer:
            "An item is invalid if its thickness, width or length is not a positive number, its quantity is not a whole number of at least one, or its price is negative or not a valid number. Correct the affected values to include the item in the estimate.",
        },
        {
          question: "Can I download my lumber estimate?",
          answer:
            "Yes. Select Download CSV to save a spreadsheet with item names, dimensions, quantities, board feet, waste-adjusted board feet, prices and material costs. The file also includes the combined project totals, discount, delivery, sales tax and estimated grand total.",
        },
        {
          question: "Can I copy my lumber estimate?",
          answer:
            "Yes. Select Copy estimate to copy a text summary to your clipboard. It includes the valid lumber items, their dimensions and quantities, board-foot calculations, material costs and the main project cost figures. Your browser may ask for clipboard permission.",
        },
        {
          question: "Does this calculator save my project automatically?",
          answer:
            "The current calculator calculates from the values in the open page, but it does not implement automatic project saving or cloud synchronization. Copy or download your estimate if you want to keep a record before leaving or refreshing the page.",
        },
        {
          question: "Can I use this calculator for woodworking and construction?",
          answer:
            "Yes. It can estimate lumber volume for furniture, cabinetry, shelving, framing, trim, decking and other projects that use board-foot measurements. Always check whether your supplier sells the material using the same dimensions and pricing method used in your estimate.",
        },
        {
          question: "Is a board-foot estimate the same as the number of boards I should buy?",
          answer:
            "No. Board feet measure lumber volume, not the exact number of stock boards required for a cutting plan. The calculator estimates volume based on the dimensions and quantities you enter. You still need to plan board lengths, cutting layouts, grain direction, defects and available stock sizes before ordering.",
        },
        {
          question: "Does the calculator account for different wood grades or moisture content?",
          answer:
            "No. The calculator does not evaluate wood grade, moisture content, drying shrinkage, warping, defects or structural suitability. These factors can affect the amount and type of lumber you should purchase, so review the material specifications separately.",
        },
        {
          question: "Is the lumber cost estimate a final supplier quote?",
          answer:
            "No. It is an estimate based on your entered dimensions, prices, waste allowance, discount, delivery charge and tax rate. Supplier measurement practices, minimum order quantities, stock availability, grading and local taxes may change the final purchase amount.",
        },
      ]}
      note="This calculator estimates lumber volume using the dimensions and quantities you enter. It applies waste to each lumber item before calculating material costs, then applies the discount, delivery and sales tax settings to estimate the project total. The result is a planning estimate, not a cutting layout, supplier quote or structural recommendation. Always confirm nominal versus actual dimensions, the supplier's board-foot pricing method, stock availability and applicable taxes before purchasing lumber."
    />
  );
}
