
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import CoatingCalculator from "./CoatingCalculator";

export const metadata: Metadata = {
  title: "Epoxy Floor Coating Calculator | Estimate Materials & Costs | ToolsAB",
  description:
    "Calculate epoxy primer, base coat, topcoat, decorative flakes, coating kits and project costs. Learn how to enter floor dimensions, coverage, film thickness, waste and other settings.",
  alternates: {
    canonical: "/tools/epoxy-floor-coating-calculator",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<CoatingCalculator />}

      title="Epoxy Floor Coating Calculator"

      summary="Planning an epoxy floor coating project but unsure how much material to buy? This calculator helps you estimate the quantity of primer, epoxy base coat, protective topcoat and decorative flakes required for your floor. You can enter multiple rooms, choose your measurement units, include cove base areas and calculate material using either manufacturer coverage or film thickness. It also helps estimate complete product kits, leftover material, waste allowance, labor, shipping, tax and total project cost. Follow the field-by-field guide below if this is your first time using an epoxy coating calculator."

      highlights={[
        "Calculate floor area for one room or several separate rooms.",
        "Enter measurements in feet, meters, centimeters or inches.",
        "Include additional areas such as steps and other measured floor sections.",
        "Estimate coating quantities for cove base and wall returns.",
        "Calculate primer, epoxy base coat and protective topcoat separately.",
        "Choose manufacturer coverage or theoretical coverage based on dry film thickness and volume solids.",
        "Set the number of coats, kit size and price for each coating product.",
        "Estimate decorative flake or quartz quantities using a broadcast rate.",
        "Apply a surface condition adjustment and additional waste allowance.",
        "Estimate product costs, tax, shipping and installation labor.",
        "View material requirements in gallons and liters, along with the number of kits to purchase.",
        "Copy or print your project estimate for reference."
      ]}

      steps={[
        "Start by selecting your measurement unit. Choose feet, meters, centimeters or inches. Use the same unit for all room dimensions in this project.",
        "Under Floor Areas, enter the name, length and width of your first room. For example, if your garage is 20 feet long and 12 feet wide, enter 20 as the length and 12 as the width.",
        "If your project includes another room, click Add Area. Enter its name, length and width. Repeat this for every separate section you want to coat.",
        "Use the Other Area field for additional measured surfaces such as steps or small sections that are not already included in your room measurements. Enter the area in the selected square unit, not as a length.",
        "If you need to coat a cove base or wall return, enable Include cove base / wall return. Enter the total length of the cove and its height in inches.",
        "Configure the Epoxy Primer section. Decide whether your coating system requires primer, enable the layer, enter the number of coats and select a coverage calculation method.",
        "Choose Manufacturer Coverage if you have the product's coverage rate from its technical data sheet. Choose Film Thickness if you know the required dry film thickness in mils and the product's volume solids percentage.",
        "Repeat the process for the Epoxy Base Coat and Protective Topcoat. Each layer can have its own number of coats, coverage rate, thickness, solids percentage, kit size and price.",
        "If you are using decorative flakes or quartz, enable the optional flake section. Enter the application rate in pounds per 100 square feet, the weight of each bag and its price.",
        "Open Surface, Waste and Extra Costs. Select a surface condition, enter a waste allowance and choose the currency you want to use for displaying the estimate.",
        "Enter the sales tax or GST percentage, shipping charge and labor rate if you want to include these costs. Make sure your labor rate is based on the selected area unit.",
        "Review the Material Estimate panel. Check the total floor area, required gallons, liters, kit count, spare material and estimated cost.",
        "Use Copy Summary to copy the calculation details or Print to print the estimate. Check the manufacturer's technical data sheet before purchasing the materials."
      ]}

      faqs={[
        {
          question: "What does this epoxy floor coating calculator do?",
          answer:
            "This calculator estimates the coating materials and project costs for an epoxy floor. It can calculate primer, epoxy base coat and topcoat separately. It also supports multiple floor areas, cove base calculations, decorative flakes, coating thickness, manufacturer coverage, waste allowance, kit quantities and additional costs. The result is a planning estimate, not a guaranteed measurement of actual material consumption."
        },
        {
          question: "How do I start using the calculator?",
          answer:
            "Start with the Floor Areas section. Choose your measurement unit and enter the length and width of your floor. Add more rooms if needed. Then configure each coating layer using the coverage information from its manufacturer's technical data sheet. If you are unsure about a setting, leave optional layers disabled until you have confirmed which products your coating system requires."
        },
        {
          question: "How do I measure a rectangular floor?",
          answer:
            "Measure the length and width of the floor and multiply them. For example, a room that is 20 feet long and 12 feet wide has an area of 240 square feet. If the room has an irregular shape, divide it into smaller rectangular sections, calculate each section separately and add the areas together."
        },
        {
          question: "What does Measurement Unit mean?",
          answer:
            "Measurement Unit determines how you enter the length and width of each room. You can select feet, meters, centimeters or inches. The calculator converts the measurements internally into square feet before performing the coating calculations. Additional Area uses the corresponding square unit, such as square feet when feet are selected."
        },
        {
          question: "What should I enter in Area Name?",
          answer:
            "Area Name is simply a label to help you identify each floor section. You can use names such as Main Garage, Basement, Workshop, Utility Room or Storage Area. It does not affect the calculation. Clear names make it easier to organize a project with multiple rooms."
        },
        {
          question: "What should I enter in Length and Width?",
          answer:
            "Enter the measured length and width of the room using your selected measurement unit. For example, if you selected feet, enter both dimensions in feet. If you selected meters, enter both in meters. The calculator multiplies these dimensions to determine the area of that room. Enter positive measurements greater than zero."
        },
        {
          question: "Why is there an Add Area button?",
          answer:
            "Add Area lets you include another room or floor section without calculating everything manually. For example, a garage and a connected storage room can be entered separately. The calculator calculates each room's area and adds them together. You can remove an area if you added it by mistake, provided at least one area remains."
        },
        {
          question: "What is the Other Area field used for?",
          answer:
            "Use Other Area when you have additional surfaces that you have already measured as an area but do not want to enter as a separate rectangular room. Examples may include measured steps, small landings or other sections. Enter the total area in the square unit corresponding to your selected measurement unit. Do not enter a linear measurement here, and avoid including an area that is already counted in one of your rooms."
        },
        {
          question: "What is Include Cove Base / Wall Return?",
          answer:
            "This option adds the coated vertical surface around the bottom of a wall or floor edge to the project area. Enable it if your epoxy system will also cover a cove base or wall return. Enter the total linear length of the cove and its height in inches. The calculator estimates the surface area by multiplying the length by the height. This simplified method does not model curved transitions or complex profiles."
        },
        {
          question: "What should I enter for Cove Length?",
          answer:
            "Enter the total length of the cove base or wall return that will receive the coating. The length uses your selected measurement unit. If several walls have cove base, add their lengths together before entering the total. For example, if three wall sections measure 10, 12 and 8 feet, enter 30 when the selected unit is feet."
        },
        {
          question: "What should I enter for Cove Height?",
          answer:
            "Enter the vertical height of the cove base in inches. This field always uses inches, even when the main measurement unit is meters or feet. For example, a four-inch cove base should be entered as 4. The calculator converts this height into feet when calculating the additional surface area."
        },
        {
          question: "What is the Epoxy Primer layer?",
          answer:
            "Primer is a preparatory coating used when required by the selected epoxy system. It may help the coating bond to a properly prepared substrate and can affect how the surface absorbs the following coat. Enable this layer only if your product system calls for a primer. Use the coverage or thickness information for the actual primer you plan to purchase."
        },
        {
          question: "What does Include This Layer mean?",
          answer:
            "Each coating section has its own Include This Layer switch. Turn it on when that product will be part of your project. Turn it off when the coating system does not require that layer. Disabled layers are excluded from the material and cost calculations. At least one coating layer must be enabled to produce a valid estimate."
        },
        {
          question: "What does Number of Coats mean?",
          answer:
            "Number of Coats is how many times you plan to apply that particular product. For example, if the manufacturer recommends two epoxy base coats, enter 2 in the Epoxy Base Coat section. Primer and topcoat may have different coat requirements. Always follow the product's application instructions instead of assuming every layer needs the same number of coats."
        },
        {
          question: "What is the Coverage Method field?",
          answer:
            "Coverage Method determines how the calculator estimates material consumption. Manufacturer Coverage uses the coverage rate supplied for the product. Film Thickness calculates theoretical coverage from dry film thickness and volume solids. Use the first method when you have a reliable coverage figure from the product data sheet. Use the second when you have the required thickness and volume solids information."
        },
        {
          question: "What is Manufacturer Coverage?",
          answer:
            "Manufacturer Coverage is the area one gallon of product can cover for one coat. Enter the value in square feet per gallon per coat. For example, if the technical data sheet states 250 square feet per gallon per coat, enter 250. The calculator uses that figure together with your floor area, number of coats and waste allowance to estimate the required gallons. Make sure the coverage figure applies to the product and application thickness you intend to use."
        },
        {
          question: "Where can I find the coverage rate?",
          answer:
            "Look at the product's technical data sheet, product specification sheet or manufacturer's application guide. Search for coverage rate, theoretical coverage or recommended spread rate. Check whether the figure is stated per gallon, per coat and at a particular film thickness. Do not use a coverage figure from a different product or assume that all epoxy coatings have the same coverage."
        },
        {
          question: "What does Film Thickness mean?",
          answer:
            "Film Thickness lets you estimate theoretical coverage based on the desired dry coating thickness. This method requires the dry film thickness in mils and the product's volume solids percentage. A mil is one-thousandth of an inch. One mil equals 0.001 inch or 25.4 microns. Enter the specified dry film thickness per coat, not the total thickness of all coats combined."
        },
        {
          question: "What should I enter in Dry Film per Coat (mils)?",
          answer:
            "Enter the dry film thickness that one coat is expected to leave after curing or drying, measured in mils. For example, if the product specification calls for a dry film thickness of 8 mils per coat, enter 8. If you are applying two coats, enter 8 for the per-coat thickness and set Number of Coats to 2. The calculator accounts for the coat count separately."
        },
        {
          question: "What is Volume Solids (%)?",
          answer:
            "Volume solids represent the percentage of the applied coating volume that remains as a solid film after the liquid components evaporate or the coating cures, according to the product's test method. Enter the percentage stated in the manufacturer's technical data sheet. For example, a product with 80% volume solids should be entered as 80, not 0.80. The calculator uses this value to estimate theoretical coverage from the dry film thickness."
        },
        {
          question: "How does the thickness method calculate coverage?",
          answer:
            "The calculator uses the theoretical formula: Coverage in square feet per US gallon = 1604 × (Volume Solids ÷ 100) ÷ Dry Film Thickness in mils. For example, a coating with 100% volume solids and a dry film thickness of 8 mils has a theoretical coverage of about 200.5 square feet per gallon. Real application coverage can be lower because of substrate profile, losses, absorption and application conditions."
        },
        {
          question: "What is Kit Size (gallons)?",
          answer:
            "Kit Size is the total volume of the complete product kit you purchase, expressed in gallons. For example, if a primer is sold as a three-gallon kit, enter 3. The calculator rounds the required material up to complete kits. Make sure the value represents the total mixed kit volume rather than the volume of Part A or Part B alone."
        },
        {
          question: "What is Price per Kit?",
          answer:
            "Enter the purchase price of one complete kit for the selected coating layer. If one three-gallon epoxy kit costs 150 in your chosen currency, enter 150. The calculator multiplies the price by the number of complete kits required. Enter the price for the entire mixed kit, including all components needed to prepare it."
        },
        {
          question: "Why are primer, epoxy and topcoat calculated separately?",
          answer:
            "Different coating products can have different coverage rates, thickness requirements, kit sizes and prices. Calculating each layer separately gives a more useful estimate than treating the whole coating system as one product. It also helps you understand how much of each material you may need to order."
        },
        {
          question: "What is Decorative Flake or Quartz?",
          answer:
            "Decorative flakes and quartz are materials broadcast over a coating to create a textured or decorative floor finish. They are optional and are not required for every epoxy project. Enable this section only if your selected coating system uses these materials. The calculator estimates the weight and number of bags based on your chosen application rate."
        },
        {
          question: "What does Rate (lb / 100 sq ft) mean?",
          answer:
            "This is the amount of decorative flake or quartz you intend to use for every 100 square feet of floor area. For example, a rate of 25 means 25 pounds of material per 100 square feet. The calculator scales this rate to your project area. Actual usage depends on chip size, desired broadcast density, material and installation technique, so use the recommendation for your selected system."
        },
        {
          question: "What is Bag Size (lb)?",
          answer:
            "Bag Size is the weight of one bag of decorative flake or quartz, measured in pounds. If each bag contains 40 pounds, enter 40. The calculator divides the estimated material requirement by the bag size and rounds up to the next complete bag."
        },
        {
          question: "What is Price per Bag?",
          answer:
            "Enter the purchase price of one complete decorative flake or quartz bag. The calculator multiplies this amount by the estimated number of bags required and includes the result in the product cost."
        },
        {
          question: "What does Surface Condition mean?",
          answer:
            "Surface Condition applies a planning multiplier to the measured project area before coating quantities are calculated. The available choices range from smooth or sealed to porous or absorbent surfaces. For example, the normal prepared option adds 5%, while the rough or textured option adds 25%. These are simplified estimating allowances, not guaranteed consumption rates. The actual coating requirement depends on the concrete profile, porosity, preparation and coating system."
        },
        {
          question: "What is Waste Allowance (%)?",
          answer:
            "Waste Allowance adds extra material to the calculated requirement. It can account for mixing residue, application tools, container losses, small spills and other practical losses. For example, a 10% allowance means the calculator adds 10% to the estimated material requirement for each enabled coating layer. The appropriate allowance depends on the job. Avoid double-counting waste if the coverage figure already includes an allowance."
        },
        {
          question: "What does Currency change?",
          answer:
            "Currency changes how estimated prices and costs are displayed. You can select USD, EUR, GBP, INR, AUD, CAD or AED. It does not convert prices between currencies. Enter all kit prices, flake prices, shipping and labor costs in the currency you select. For example, if you select INR, enter your prices in Indian rupees."
        },
        {
          question: "What is Sales Tax / GST (%)?",
          answer:
            "Enter the percentage of tax you want to include in the estimate. The calculator applies this percentage to the product cost, which includes the coating kits and decorative flake bags. For example, entering 10 applies a 10% tax to the estimated product cost. Actual tax treatment can vary by location and product, so verify the applicable tax rules before using this as a final quotation."
        },
        {
          question: "What should I enter for Shipping?",
          answer:
            "Enter the estimated delivery or transportation charge for your materials. The value should be in the currency selected in the calculator. Shipping is added directly to the project total and is not included in the product tax calculation."
        },
        {
          question: "What is Labor / Prep per square unit?",
          answer:
            "This is the estimated labor and preparation cost for each square unit of floor area. The unit follows your selected measurement system. For example, if you selected feet, enter a labor rate per square foot. If you selected meters, enter a rate per square meter. The calculator multiplies the rate by the measured project area in that unit. Include grinding, crack repair or other work in this rate if you want those costs represented."
        },
        {
          question: "What does the Total Floor Area result show?",
          answer:
            "Total Floor Area is the combined area of your rooms, additional area and enabled cove base. It is displayed in your selected square unit, with the equivalent area in square feet underneath. This is the measured project area before the surface condition adjustment."
        },
        {
          question: "What does Material Required mean?",
          answer:
            "Material Required is the total calculated gallons for all enabled coating layers after applying the surface adjustment, coat count and waste allowance. The result is also converted into liters for easier reference. This is the quantity required, not necessarily the amount you must purchase in complete kits."
        },
        {
          question: "What does Product Kits to Buy mean?",
          answer:
            "This result adds the complete kit quantities required for the enabled coating layers. Each layer is rounded up independently because primer, base coat and topcoat may be sold in different kit sizes. The purchased gallons show the combined volume of all kits, while the spare material figure represents the difference between purchased volume and calculated coating requirements."
        },
        {
          question: "Why is there spare material?",
          answer:
            "Spare material is the difference between the total volume of complete kits purchased and the calculated material requirement. For example, if the calculator estimates 5 gallons but the available kit sizes require you to purchase 6 gallons, the difference is 1 gallon. This is a mathematical estimate and does not mean every layer can share leftover material with another layer."
        },
        {
          question: "What does Estimated Total Cost include?",
          answer:
            "The total cost includes the estimated price of all enabled coating kits, decorative flake bags if selected, tax on the calculated product cost, shipping and labor. The final amount is based entirely on the prices and rates you enter. It does not automatically retrieve live supplier prices or currency exchange rates."
        },
        {
          question: "What does Cost per Area mean?",
          answer:
            "Cost per Area divides the estimated total project cost by the measured floor area in your selected square unit. It provides a simple way to compare estimates for different project sizes. The result is only as reliable as the material prices, labor rates and other costs entered."
        },
        {
          question: "What is the Thickness Reference section?",
          answer:
            "The thickness reference provides quick conversions for coating measurements. One mil equals 0.001 inch or 25.4 microns. One millimeter equals 1,000 microns or approximately 39.37 mils. These conversions can help you understand thickness values shown on coating product specifications."
        },
        {
          question: "Can I use this calculator for a garage floor?",
          answer:
            "Yes. You can enter the garage dimensions, add separate sections if necessary and configure the coating layers specified by your garage floor coating system. Include primer, base coat, decorative flakes and topcoat only when they are part of the product system you plan to use."
        },
        {
          question: "Can I use this calculator for a basement or workshop?",
          answer:
            "Yes. It can be used for basements, workshops, utility rooms and other floor coating projects. Measure each area and use the coverage and thickness information for the products you intend to apply. Make sure the coating is suitable for the substrate and environmental conditions."
        },
        {
          question: "Can I copy or print my estimate?",
          answer:
            "Yes. Select Copy Summary to copy the project estimate as text. Select Print to open your browser's print dialog. You can then print the information or choose a PDF destination if your browser supports it."
        },
        {
          question: "Does the calculator save my project?",
          answer:
            "The current calculator works with the values entered in your browser and does not provide an online project account or cloud storage. Copy or print your estimate if you want to keep a record of your calculations."
        },
        {
          question: "Is this estimate a final material order?",
          answer:
            "No. It is a preliminary estimate based on your inputs. Actual material usage can change because of surface preparation, concrete porosity, temperature, application technique, film thickness and product formulation. Confirm the quantities, coverage, mixing instructions and application requirements using the manufacturer's technical data sheet before ordering."
        }
      ]}

      note="For a useful estimate, measure every floor section carefully and use product-specific information rather than generic coverage assumptions. The calculator's surface factors and waste allowance are planning adjustments, not manufacturer guarantees. Confirm the required primer, coat count, dry film thickness, volume solids, mixing ratio and coverage rate with the technical data sheet for each product. Actual material usage can vary with concrete condition, preparation and application technique."
    />
  );
}
