
// const mat = warehouse.materials[matName];
// const businessFactor = this.getBusinessFactor(office); //Business employee productivity
      const businessProd = 1 + office.employeeProd[EmployeePositions.Business];
      return calculateEffectWithFactors(n: businessProd, expFac: 0.26, linearFac: 10e3);
          // -- exp must be > 0 && < 1
          // -- linearFac must be > 1
          // employeeProd is calculateProductivity for each employee, and is the hardest
          // * look in Employee.ts - line 88, each takes employee value + multipliers
          //    for corporation upgrades and industry research
          //    * Base is mor * hap * ene * 1e-6
          //    * Multipliers added for stat ratios for each position, i.e. 
                    // case EmployeePositions.Operations:
                    //   prodMult = 0.6 * effInt + 0.1 * effCha + this.exp + 0.5 * effCre + effEff;
//            | Cha | Cre | Int | Eff | exp |
// Position   |------------------------------ 
// Operations | 0.1 | 0.5 | 0.6 | 1.0 | 1.0 |
// Engineer   | 0.1 |   0 | 1.0 | 1.0 | 1.5 |
// Business   | 1.0 |   0 | 0.4 |   0 | 0.5 | 
// Management | 2.0 | 1.0 |   0 | 0.7 | 1.0 |
// RandD      |   0 | 1.0 | 1.5 | 0.5 | 0.8 |
          // then take prodBase * multiplier to get employeeProd

// const advertisingFactor = this.getAdvertisingFactors()[0]; //Awareness + popularity
// const marketFactor = this.getMarketFactor(mat); //Competition + demand
// const markupLimit = mat.getMarkupLimit();
//      return this.qlt / this.mku;

function calculateBestMarketPrice(mat, quantity) {
  const prod = mat.prd;
  quantity = quantity || prod

  // mat.bCost is the displayed 'Market Price' - the buy price
  // corporation.getSalesMultiplier is corporation..upgradeMultipliers[8]; -- from sales bots?
  // industry.getSalesMultiplier is from division research tree - salesMult

  // Reverse engineer the 'maxSell' formula
  // 1. Set 'maxSell' = prod
  // 2. Substitute formula for 'markup'
  // 3. Solve for 'sCost'
  const numerator = markupLimit;
  const sqrtNumerator = quantity;
  const sqrtDenominator =
    (mat.qlt + 0.001) *
    marketFactor *
    businessFactor *
    corporation.getSalesMultiplier() *
    advertisingFactor *
    this.getSalesMultiplier();
  const denominator = Math.sqrt(sqrtNumerator / sqrtDenominator);
  let optimalPrice;
  if (sqrtDenominator === 0 || denominator === 0) {
    if (sqrtNumerator === 0) {
      optimalPrice = 0; // No production
    } else {
      optimalPrice = mat.bCost + markupLimit;
      console.warn(`In Corporation, found illegal 0s when trying to calculate MarketTA2 sale cost`);
    }
  } else {
    optimalPrice = numerator / denominator + mat.bCost;
  }
}
