
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import GravelCalculator from "./GravelCalculator";

export const metadata: Metadata = {
  title: "French Drain Gravel Calculator | Gravel, Bags & Cost | ToolsAB",
  description:
    "Calculate how much gravel a French drain needs. Estimate trench volume, subtract pipe displacement, work out bag quantities, gravel weight, filter fabric and material cost.",
  alternates: {
    canonical: "/tools/french-drain-gravel-calculator",
  },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<GravelCalculator />}
      title="French Drain Gravel Calculator"
      summary="Planning a French drain? Estimate the gravel needed for your trench before ordering materials. Enter your trench dimensions, pipe size and gravel layers to calculate the order quantity, bag count, approximate weight, filter fabric and optional material cost."

      highlights={[
        "Calculate gravel volume using your trench length, width, gravel base and cover depth.",
        "Subtract the volume occupied by the drainage pipe to get a more useful gravel estimate.",
        "Choose common gravel types or enter your own bulk density for a custom material.",
        "Estimate the number of bags and the approximate total gravel weight.",
        "Include separate allowances for compaction and material waste.",
        "Estimate filter fabric and optional material cost using your supplier's prices.",
        "Switch between feet, inches and metric measurements.",
        "View a trench cross-section diagram and copy your estimate for later reference.",
      ]}

      steps={[
        "Choose your preferred measurement unit: Feet, Inches or Metric.",
        "Enter the trench length and width. These measurements describe the horizontal size of the trench.",
        "Select a pipe size or enter the pipe's actual outside diameter. The calculator uses the outside diameter, not just the nominal pipe size.",
        "Enter the gravel depth below the pipe and the gravel depth above it. The total trench depth is calculated automatically by adding these two measurements and the pipe diameter.",
        "Choose a gravel type from the available options. You can also select Other / custom and enter a material name and its bulk density.",
        "Set your waste and compaction allowances. These percentages increase the calculated gravel quantity to help with ordering.",
        "Enter the bag size printed on your gravel packaging if you want to estimate how many bags to buy.",
        "If you want a price estimate, select whether your supplier charges by the bag, weight or volume. Choose a currency and enter the price.",
        "Review the results on the right side of the calculator. You can see the gravel order quantity, bag count, weight, filter fabric estimate and optional cost.",
        "Use Copy summary to copy the main measurements and results for your project notes.",
      ]}

      faqs={[
        {
          question: "How much gravel do I need for a French drain?",
          answer:
            "It depends on the trench length, width, pipe diameter, and how much gravel you plan to place below and above the pipe. Enter those measurements in the calculator to estimate the gravel volume. The result also includes your selected compaction and waste allowances.",
        },
        {
          question: "Does this calculator subtract the drainage pipe?",
          answer:
            "Yes. It calculates the rectangular trench volume and subtracts the volume of a round pipe running along the full trench length. This gives an estimate of the space available for gravel rather than counting the pipe as gravel.",
        },
        {
          question: "Do I need to enter the total trench depth?",
          answer:
            "No. The total depth is calculated automatically. Enter the gravel depth below the pipe, the pipe's outside diameter, and the gravel depth above the pipe. The calculator adds these three measurements together.",
        },
        {
          question: "What is the difference between nominal pipe size and outside diameter?",
          answer:
            "Nominal pipe size is the trade size used to identify a pipe. It is not always the same as its actual outside diameter. The calculator's common pipe-size buttons use approximate outside diameters. Check your pipe specifications and enter the actual outside diameter when possible.",
        },
        {
          question: "Which gravel type should I choose?",
          answer:
            "The calculator includes common options such as washed 3/4-inch stone, pea gravel, drain rock, river rock and crushed stone. The correct material depends on your drainage design, soil conditions and local recommendations. If you are using a different material, select Other / custom and enter its bulk density from your supplier.",
        },
        {
          question: "What does bulk density mean?",
          answer:
            "Bulk density is the approximate weight of a loose material for a given volume. For example, it tells you how much a cubic foot of gravel weighs. Different stone types and suppliers can have different densities, so the preset values are estimates. Use your supplier's figure when available.",
        },
        {
          question: "What is the compaction allowance?",
          answer:
            "The compaction allowance adds an extra percentage to the calculated gravel volume for settling or placement adjustments. It is a planning allowance, not a measurement of the actual compaction that will happen at your site.",
        },
        {
          question: "What is the waste allowance?",
          answer:
            "The waste allowance adds extra material to your order estimate. It can help account for handling losses, uneven trench dimensions and small adjustments during installation. The default is 10%, but you can change it to suit your project.",
        },
        {
          question: "How does the calculator estimate the number of bags?",
          answer:
            "It divides the gravel order volume by the volume of one bag and rounds up to the next whole bag. Check the volume printed on your packaging and enter that value in the Bag size field.",
        },
        {
          question: "How is gravel weight calculated?",
          answer:
            "The calculator multiplies the estimated order volume by the selected bulk density. The result is an approximate weight, so the actual delivery weight can vary with stone type, moisture and supplier measurements.",
        },
        {
          question: "Does the calculator estimate filter fabric?",
          answer:
            "Yes. It estimates fabric for the trench floor and both side walls, with an additional one-foot allowance across the fabric width for overlap. It also applies your selected waste percentage. The result is a planning estimate; actual fabric requirements depend on the installation method and how the fabric is folded and joined.",
        },
        {
          question: "Can I calculate the cost of my gravel?",
          answer:
            "Yes. Enter the supplier's price and choose whether it is charged per bag, per ton or tonne, or per cubic yard or cubic metre. Select the matching currency symbol. The calculator uses your estimated quantity to work out an approximate material cost.",
        },
        {
          question: "Does changing the currency convert the price?",
          answer:
            "No. Changing the currency symbol only changes how the result is displayed. It does not convert exchange rates. Enter a price that is already in the currency you select.",
        },
        {
          question: "Can I use this calculator with metric measurements?",
          answer:
            "Yes. Select Metric to enter trench measurements in metres, gravel bag size in cubic metres and bulk density in kilograms per cubic metre. The calculator converts the values internally and displays the results using metric units.",
        },
        {
          question: "Does this calculator design the complete French drain?",
          answer:
            "No. It estimates gravel quantities and related materials for a straight, rectangular trench with a round pipe along its full length. It does not design the pipe slope, determine the correct drainage route, assess soil conditions, select fittings or check local building requirements. Those details should be planned separately.",
        },
        {
          question: "Are the results exact?",
          answer:
            "No. They are estimates based on the dimensions and assumptions entered. Real trenches may have uneven sides or changing depths, and gravel density can vary. Measure the site carefully and confirm material quantities with your supplier before ordering.",
        },
      ]}

      note="This calculator is a material-planning aid, not a drainage design tool. It assumes a straight rectangular trench and a round pipe running along its full length. Actual gravel and filter fabric requirements depend on site conditions, installation details and local drainage recommendations. Confirm pipe dimensions, material density and bag volume with your supplier."
    />
  );
}
