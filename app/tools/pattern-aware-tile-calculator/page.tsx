
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import TileCalculator from "./TileCalculator";

export const metadata: Metadata = {
  title: "Pattern-Aware Tile Calculator | Tiles, Grout & Cost | ToolsAB",
  description:
    "Calculate how many floor tiles, boxes, grout bags and adhesive bags you need. Estimate tile waste and installation costs for multiple rooms.",
  alternates: {
    canonical: "/tools/pattern-aware-tile-calculator",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<TileCalculator />}
      title="Pattern-Aware Tile Calculator"
      summary="Planning a tile installation project? Use this calculator to estimate the number of tiles and boxes you may need, along with grout, adhesive and other project costs. Add multiple rooms, choose your tile size and installation pattern, and include extra material for cuts and breakage. It is useful for planning a new floor or replacing tiles in an existing room."

      highlights={[
        "Add multiple rooms or floor sections to calculate the total area.",
        "Choose straight, offset, diagonal or herringbone tile patterns.",
        "Estimate tile quantities and complete boxes using the coverage on the tile packaging.",
        "Calculate approximate grout requirements using tile size, thickness and joint width.",
        "Estimate adhesive bags using the coverage stated by the manufacturer.",
        "Include material prices, labor, underlayment, delivery and tax in your budget.",
        "Copy or print your estimate for easy reference when buying materials.",
      ]}

      steps={[
        "Choose the unit you want to use for room measurements: feet, meters, centimeters or inches.",
        "Enter the name, length and width of your first room. Use Add another area to include more rooms or sections.",
        "Enter any area that should not be tiled in Excluded area. Use Additional area for extra sections that need tiles.",
        "Choose the tile measurement unit, then enter the length, width and thickness of your tile.",
        "Enter the grout joint width you plan to use. This is the gap between two tiles.",
        "Choose your installation pattern. Add an extra waste percentage for cutting, breakage and fitting.",
        "Enter the coverage of one tile box as shown on its packaging. You can also enter the number of tiles per box and its price.",
        "Enter your grout bag size, price and the extra grout allowance you want to include.",
        "Enter the adhesive coverage per bag, bag weight and price from the product packaging.",
        "Add labor, underlayment, floor preparation, delivery and tax if you want to estimate the project cost.",
        "Check the results to see the estimated tile quantity, boxes, grout bags, adhesive bags and total cost. You can copy or print the estimate.",
      ]}

      faqs={[
        {
          question: "How do I measure a room for tiles?",
          answer:
            "Measure the length and width of the floor. Make sure both measurements use the same unit. For a simple rectangular room, multiply the length by the width to get the floor area. If your project includes several rooms, add each one separately using Add another area. The calculator combines their measurements.",
        },
        {
          question: "What is the Room measurement unit?",
          answer:
            "This setting tells the calculator how you measured your rooms. Choose feet, meters, centimeters or inches. For example, if your room is 15 feet long and 12 feet wide, select Feet and enter 15 and 12. Use the same selected unit for every room.",
        },
        {
          question: "What is Area name used for?",
          answer:
            "Enter a name that helps you recognize each room or section, such as Kitchen, Bathroom, Living Room or Hallway. The name appears in the result breakdown, making it easier to check the measurements for each area.",
        },
        {
          question: "How do Length and Width work?",
          answer:
            "Length is the measurement from one end of the room to the other. Width is the measurement across the room. Enter both measurements for every room. The calculator multiplies them to find the room area.",
        },
        {
          question: "What does Add another area do?",
          answer:
            "Use this button when your project covers more than one room or floor section. For example, you can add the kitchen, dining room and hallway separately. The calculator adds all these areas together before estimating materials. You can remove an area if you added it by mistake.",
        },
        {
          question: "What is Excluded area?",
          answer:
            "Enter the floor area that will not receive tiles. This could include a section that will remain uncovered or an area finished with a different material. The calculator subtracts this value from the combined room area. Enter it using the selected room area unit.",
        },
        {
          question: "What is Additional area?",
          answer:
            "Use this field for extra floor sections that need tiles but are not included in your room measurements. For example, you might use it for a small entrance section or another area connected to the main room. Enter the total extra area, not its length or width.",
        },
        {
          question: "What is the Tile measurement unit?",
          answer:
            "This setting controls the unit used for tile length and width. You can choose inches, centimeters or millimeters. Select the unit that matches the measurements on your tile packaging or product details.",
        },
        {
          question: "How do I enter Tile length and Tile width?",
          answer:
            "Enter the length and width of one tile. For example, if your tile measures 12 inches by 24 inches, select Inches, enter 12 for length and 24 for width. The calculator uses these measurements to estimate the face area of one tile and the theoretical number of individual tiles.",
        },
        {
          question: "What is Tile thickness?",
          answer:
            "Tile thickness is how thick one tile is from its front surface to its back. Enter the value in millimeters. You can usually find this information in the product specifications. The calculator uses tile thickness when estimating grout consumption.",
        },
        {
          question: "What is Grout joint width?",
          answer:
            "This is the gap between neighboring tiles that will be filled with grout. Enter the planned gap in millimeters. For example, if you plan to leave a 3 mm gap between tiles, enter 3. A wider joint generally requires more grout.",
        },
        {
          question: "Which installation patterns can I choose?",
          answer:
            "The calculator includes four patterns. Straight or grid places tiles in even rows. Offset or brick shifts each row to create a brick-like look. Diagonal places tiles at an angle, while herringbone uses a repeating zigzag arrangement. The calculator adds a different estimated waste allowance for each pattern.",
        },
        {
          question: "Does the selected pattern change the tile estimate?",
          answer:
            "Yes. Different patterns can create different amounts of cutting waste. The calculator uses an estimated pattern allowance of 0% for straight, 10% for offset, 15% for diagonal and 20% for herringbone. These are planning allowances, not exact cutting measurements.",
        },
        {
          question: "What is Additional tile waste?",
          answer:
            "This is an extra percentage added to allow for broken tiles, cuts, mistakes and fitting around room edges. Enter a percentage that suits your project. The calculator combines this value with the selected pattern allowance. A complicated room shape or many corners may need more extra material.",
        },
        {
          question: "Why is the combined waste percentage different?",
          answer:
            "The calculator compounds the pattern allowance and your additional waste percentage instead of simply adding them. For example, a 10% pattern allowance and 10% additional waste produce a combined allowance of 21%. This extra area is used when estimating the tile purchase quantity.",
        },
        {
          question: "What is Coverage per box?",
          answer:
            "This is the floor area that one complete box of tiles can cover. Check the tile box or manufacturer's product details and enter the coverage in square feet. The calculator uses this value to estimate how many complete boxes you need and always rounds the box quantity up.",
        },
        {
          question: "What does Tiles per box mean?",
          answer:
            "Enter the number of individual tiles inside one box if the packaging provides this information. This field is optional. If you do not know the number, leave it at 0. When you enter a value, the calculator checks whether the tile dimensions and box coverage are reasonably consistent.",
        },
        {
          question: "What is Price per box?",
          answer:
            "Enter the price of one complete tile box. The calculator multiplies this price by the number of boxes required to estimate the tile material cost. Leave the price at 0 if you only want to calculate quantities.",
        },
        {
          question: "What does Currency change?",
          answer:
            "Choose the currency you want to see in the cost estimate, such as USD, INR, EUR or GBP. This changes the currency symbol and number formatting. It does not convert prices between currencies, so enter all project prices in the currency you select.",
        },
        {
          question: "How does the calculator estimate grout?",
          answer:
            "The calculator uses the tile length, tile width, tile thickness and grout joint width to estimate grout consumption. It then adds your grout waste allowance and rounds the required quantity up to complete bags. This is an approximate formula, so actual usage may differ depending on the grout product and joint shape.",
        },
        {
          question: "What is Grout waste allowance?",
          answer:
            "This is extra grout to allow for mixing losses, application waste and small differences during installation. Enter a percentage above the estimated grout requirement. For example, entering 10% adds a 10% allowance to the calculated grout quantity.",
        },
        {
          question: "What is Grout bag size?",
          answer:
            "Enter the weight of one grout bag in kilograms. For example, if you are buying 5 kg bags, enter 5. The calculator uses this value to round the estimated grout requirement up to complete bags.",
        },
        {
          question: "What is Grout price per bag?",
          answer:
            "Enter the price of one grout bag. The calculator multiplies this amount by the estimated number of bags to calculate the grout cost.",
        },
        {
          question: "What is Coverage per adhesive bag?",
          answer:
            "This is the floor area one bag of adhesive can cover. Check the adhesive manufacturer's instructions because coverage can vary depending on the product, trowel size, tile type and floor condition. Enter the coverage in square feet. The calculator uses it to estimate the number of bags required.",
        },
        {
          question: "What is Adhesive bag size?",
          answer:
            "Enter the weight of one adhesive bag in kilograms. This is displayed in your estimate for reference. The number of bags is calculated using the coverage per bag, not the bag weight.",
        },
        {
          question: "What is Adhesive price per bag?",
          answer:
            "Enter the price of one complete adhesive bag. The calculator multiplies this value by the estimated number of bags to calculate the adhesive cost.",
        },
        {
          question: "How is the adhesive quantity calculated?",
          answer:
            "The calculator divides the net floor area by the coverage stated for one adhesive bag, then rounds up to a whole bag. It uses the actual area being tiled, not the extra tile purchase area added for cutting and breakage.",
        },
        {
          question: "What is Labor per area?",
          answer:
            "Enter the installation labor price for one selected area unit. For example, if your room measurement unit is feet, enter the labor price per square foot. If you select meters, enter the price per square meter. The calculator multiplies the rate by the net floor area.",
        },
        {
          question: "What is Underlayment per area?",
          answer:
            "Enter the underlayment material cost for each selected area unit. Underlayment may be needed to prepare or improve the floor before tiles are installed. The calculator multiplies this rate by the net floor area.",
        },
        {
          question: "What is Floor preparation cost?",
          answer:
            "Enter a fixed estimated amount for preparing the floor. This could include cleaning, leveling, repairing cracks or removing old flooring. This amount is added directly to the project cost.",
        },
        {
          question: "What is Delivery cost?",
          answer:
            "Enter the expected delivery charge for bringing tiles and other materials to your location. This is added to the project subtotal.",
        },
        {
          question: "What is Sales tax or GST?",
          answer:
            "Enter the tax percentage that applies to your project costs. The calculator applies this percentage to the subtotal, which includes the entered material, labor, preparation and delivery costs.",
        },
        {
          question: "What does Net floor area mean?",
          answer:
            "Net floor area is the combined area of all rooms, minus the excluded area, plus any additional area. It represents the floor space included in the tile installation estimate.",
        },
        {
          question: "What does Area to purchase mean?",
          answer:
            "This is the net floor area after adding the selected pattern allowance and additional tile waste. It is the estimated area you should plan to buy tiles for, rather than just the exact floor area.",
        },
        {
          question: "Why does the calculator show an estimated individual tile count?",
          answer:
            "It divides the area to purchase by the face area of one tile and rounds the result up. This gives a theoretical tile count. It is not a room-by-room cutting plan, so actual tile placement, edge cuts and layout decisions may change the number needed.",
        },
        {
          question: "Why does the calculator round tile boxes and material bags up?",
          answer:
            "Tiles, grout and adhesive are normally sold in complete boxes or bags. If your project needs part of another package, you generally need to buy the next complete package. The calculator rounds these quantities up to avoid showing an amount that cannot be purchased as a complete package.",
        },
        {
          question: "What is Spare coverage?",
          answer:
            "Spare coverage is the estimated area left over after buying the required complete tile boxes. It is calculated from the purchased box coverage minus the area needed after waste allowances.",
        },
        {
          question: "Why does the calculator show a packaging warning?",
          answer:
            "If you enter both the tile dimensions and the number of tiles per box, the calculator can estimate how much area those tiles should cover. It compares that result with the coverage you entered from the packaging. If the difference is too large, check the tile size, tile count and manufacturer's box coverage.",
        },
        {
          question: "Can I use this calculator for bathroom walls or backsplashes?",
          answer:
            "The calculator can estimate a rectangular tiled surface if you enter its measurements as room length and width. However, the current tool is designed around floor-area planning. Wall openings, windows, doors, trim and detailed wall layouts may need to be measured and adjusted separately.",
        },
        {
          question: "Does this calculator create an exact tile cutting plan?",
          answer:
            "No. It estimates quantities using the total area and tile size. It does not arrange individual tiles in a room or calculate every edge cut. A detailed layout plan is useful for complex rooms, diagonal designs, herringbone patterns and areas with many corners.",
        },
        {
          question: "Are the grout and adhesive estimates exact?",
          answer:
            "No. They are planning estimates. Grout use depends on the actual joint depth, joint width, grout type and installation technique. Adhesive use depends on the product, trowel size, tile back and floor condition. Always check the manufacturer's coverage information before buying.",
        },
        {
          question: "Can I copy or print my tile estimate?",
          answer:
            "Yes. Select Copy estimate to copy the calculation summary. Select Print estimate to open your browser's print option. You can print the estimate or save it as a PDF using your browser's print settings.",
        },
        {
          question: "Why is the estimated project cost showing zero?",
          answer:
            "The calculator starts with material prices and other costs set to zero. Enter the price per tile box, grout bag and adhesive bag, along with any labor, underlayment, preparation, delivery and tax amounts you want to include.",
        },
      ]}

      note="This calculator is designed for early project planning. Tile quantities are based on area and manufacturer box coverage, not an exact cutting layout. Grout consumption is an approximate estimate, and adhesive quantities depend on the coverage you enter. Check product instructions and confirm measurements with your installer before ordering materials."
    />
  );
}
