const fs = require('fs').promises;
    // 7. nutrient list to calculate stock solution (g/mol for solid, g/mol and kg/l for liquid nutrients)
    
const HNO3_params = { // YaraTera SALPETERZUUR 38% 
  molarmass: 167,   // g/mol
  density: 1.24     // kg/L
}
const NH4NO3_params = {
  molarmass: 156,
  density: 1.24
}

const CaNO3_4H2O_params = {
  molarmass: 236.2
}

const CaNO3_10H2O_params = {
  molarmass: 1080.5
}

const KH2PO4_params = {
  molarmass: 136.1
}

const MgSO4_params = {
  molarmass: 246.4
}

const K2SO4_params = {
  molarmass: 174.3
}

const KNO3_params = {
  molarmass: 101.1
}

const Fe_DTPA_params = {
  molarmass: 932
}

const MnSO4_params = {
  molarmass: 169
}

const ZnSO4_params = {
  molarmass: 287.5
}

const Borax_params = {
  molarmass: 95.3
}

const CuSO4_params = {
  molarmass: 249.7
}

const NaMoO4_params = {
  molarmass: 241.9
}


class Solution {
  constructor(solutionData) {
    const defaultData = {
      NH4: 0, K: 0, Na: 0, Ca: 0, Mg: 0, NO3: 0, Cl: 0, SO4: 0, PO4: 0, HCO3: 0
    }; // default data if no solution data is provided
    
    Object.assign(this, defaultData, solutionData);
    this.CAT = this.calcCAT();
    this.AN = this.calcAN();
    this.EC_Nut = this.calcECNut();
    this.EC_Calc = this.calcECCalc();
    this.EC_Calc_exNaHCO3 = this.calcECexcludeNaandHCO3();
  }

  calcCAT() {
    return this.NH4 + this.K + this.Na + (this.Ca * 2) + (this.Mg * 2);
  }

  calcAN() {
    return this.NO3 + this.Cl + (this.SO4 * 2) + this.PO4 + this.HCO3;
  }

  calcECNut() {
    return (this.NH4 + this.K + (this.Ca * 2) + (this.Mg * 2) + this.NO3 + this.Cl + (this.SO4 * 2) + this.PO4) / 20;
  }

  calcECCalc() {
    return (this.CAT + this.AN) / 20; // 이미 계산된 CAT과 AN 속성을 사용
  }

  calcECexcludeNaandHCO3() {
    return ((this.CAT + this.AN - this.HCO3 - this. Na)/20)
      
  }

}

////////////////////////////////////////////////
class Adjustment {
  constructor() {
    this.boundaries = {
      K: [3.0, 4.0, 7.1, 9.0],
      Ca: [3.0, 4.0, 7.1, 9.0],
      Mg: [1.5, 2.33, 3.17, 4.0],
      NO3: [6.0, 8.0, 16.1, 18.0],
      SO4: [1.5, 2.33, 3.17, 4.0], 
      PO4: [0.30, 0.60, 1.21, 1.75]
    };

    this.macroAdjustments = {
      // NH4: [0, 0, 0, 0],
      K: [1.25, 0.625, 0, -0.625, -1.25],
      Ca: [0.75, 0.375, 0, -0.375, -0.75],
      Mg: [0.2, 0.1, 0, -0.1, 0.2],
      NO3: [2.25, 1.125, 0, -1.125, -2.25],
      SO4: [0.25, 0.125, 0, -0.125, -0.25],
      PO4: [0.25, 0.125, 0, -0.125, -0.25]
    };

    this.microBoundaries = {
      Fe: [15.0, 20.0, 35.1, 50.0],
      Mn: [1.0, 4.1, 6.0],
      Zn: [2.0, 3.0, 5.1, 8.8],
      B: [5, 10, 26, 30],
      Cu: [0.30, 0.50, 3.01, 4.0]
    };

    this.microAdjustments = {
      Fe: [50, 25, 0, -25, -50],
      Mn: [50, 25, 0, -25, -50],
      Zn: [50, 25, 0, -25, -50],
      B: [50, 25, 0, -25, -50],
      Cu: [50, 25, 0, -25, -50]
    };

  }

  getAdjustmentLevel(boundary, value) {
    let level = boundary.findIndex(bound => value < bound);
    return level === -1 ? boundary.length : level;
  }

  calculateMacroDrainAdjustment(drainCorrection, targetDrain) {
    let corrections = {};
    for (const nutrient of Object.keys(this.boundaries)) {
      if (drainCorrection[nutrient] !== undefined && targetDrain[nutrient] !== undefined) {
        let currentLevel = drainCorrection[nutrient];
        let targetLevel = targetDrain[nutrient];
        let boundary = this.boundaries[nutrient];
        let macroAdjustment = this.macroAdjustments[nutrient];
        
        let currentAdjustmentLevel = this.getAdjustmentLevel(boundary, currentLevel);
        let targetAdjustmentLevel = this.getAdjustmentLevel(boundary, targetLevel);
        
        // 실제로 조정해야 할 인덱스를 계산
        let adjustmentIndex = currentAdjustmentLevel - targetAdjustmentLevel + 2;
        // 배열 범위 내로 인덱스를 제한
        adjustmentIndex = Math.max(0, Math.min(adjustmentIndex, macroAdjustment.length - 1));
        corrections[nutrient] = macroAdjustment[adjustmentIndex];
      }
    }

    const kCaRatio = drainCorrection['K'] / drainCorrection['Ca'];
    if (kCaRatio < 1.5) {
      corrections['K'] = (corrections['K'] || 0) + 0.25; // K 증가
      corrections['Ca'] = (corrections['Ca'] || 0) - 0.125; // Ca 감소
    } else if (kCaRatio > 1.5) {
      corrections['K'] = (corrections['K'] || 0) - 0.5; // K 감소
      corrections['Ca'] = (corrections['Ca'] || 0) + 0.25; // Ca 증가
    }     // 비율이 정확히 1.5일 경우 변경 x

    return corrections; 
  }

  calculateNH4adjust(drainCorrection, targetDrain) {
    let extraNH4 = 0;
    const { NH4, HCO3 } = drainCorrection;
    const { pH } = targetDrain

    if (pH >= 5.5 && HCO3 < 0.5) {
      extraNH4 = 0.4
    } else if (pH >= 5 && NH4 < 0.5 && HCO3 >= 0.5 && HCO3 < 1) {
      extraNH4 = 0.6
    } else if (pH >= 5 && pH < 6 && NH4 < 0.5 && HCO3 > 1) {
      extraNH4 = 0.4
    } else if (pH >= 6 && NH4 < 0.5 && HCO3 > 1) {
      extraNH4 = 0.8
    } 
    return extraNH4  
  }

  calculateMicroDrainAdjustment(drainCorrection, targetDrain, nutrientSolution) {
    let corrections = {};
    for (const nutrient of Object.keys(this.microBoundaries)) {
      if (drainCorrection[nutrient] !== undefined && targetDrain[nutrient] !== undefined) {
        let currentLevel = drainCorrection[nutrient];
        let targetLevel = targetDrain[nutrient];
        let boundary = this.microBoundaries[nutrient];
        let microAdjustment = this.microAdjustments[nutrient];
        
        let currentAdjustmentLevel = this.getAdjustmentLevel(boundary, currentLevel);
        let targetAdjustmentLevel = this.getAdjustmentLevel(boundary, targetLevel);
        
        let adjustmentIndex = currentAdjustmentLevel - targetAdjustmentLevel + 2;

        if(adjustmentIndex < microAdjustment.length) {
          let percentChange = microAdjustment[adjustmentIndex];
          if (nutrientSolution[nutrient] !== undefined) {
            let actualAdjustment = nutrientSolution[nutrient] * (percentChange / 100);
            corrections[nutrient] = actualAdjustment;
          } else {
            corrections[nutrient] = 0;
          }
        }
      }
    }

    return corrections;
  }
    
    calculateTotalAdjustment(drainCorrection, targetDrain, nutrientSolution) {
      const macroCorrections = this.calculateMacroDrainAdjustment(drainCorrection, targetDrain);
      const microCorrections = this.calculateMicroDrainAdjustment(drainCorrection, targetDrain, nutrientSolution);
      const extraNH4 = this.calculateNH4adjust(drainCorrection, targetDrain);
      
      // 'NH4' 수정값을 macroCorrections에 추가합니다.
      if (macroCorrections.hasOwnProperty('NH4')) {
        macroCorrections['NH4'] += extraNH4;
      } else {
        macroCorrections['NH4'] = extraNH4; // 만약 'NH4'가 macroCorrections에 없다면 새로운 속성으로 추가합니다.
      }
      
      const totalCorrections = { ...macroCorrections, ...microCorrections };
      return totalCorrections;
    }
}        

////////////////////////////////////////////////////////////////////////


async function loadSolutionData() {
  try {
    // 데이터 로드 
    const dataNut = await fs.readFile('/Users/phil/vscode/front_dev/solution_calculator/nutrient_solution.json', 'utf-8');
    const dataWater = await fs.readFile('/Users/phil/vscode/front_dev/solution_calculator/raw_water.json', 'utf-8');
    const dataDrain = await fs.readFile('/Users/phil/vscode/front_dev/solution_calculator/drain.json', 'utf-8');
    const dataTargetDrain = await fs.readFile('/Users/phil/vscode/front_dev/solution_calculator/target_drain.json', 'utf-8');
    
    // 파싱
    const jsonNut = JSON.parse(dataNut);      // 이부분은 입력하면서 서버에 저장되도록 설계
    const jsonWater = JSON.parse(dataWater);
    const jsonDrain = JSON.parse(dataDrain);
    const jsonTargetDrain = JSON.parse(dataTargetDrain);

    // 데이터 선택
    const tomatoKoreanSolution = jsonNut["토마토"]["테스트"];
    const Water = jsonWater["김동필"]["240202"]
    const DrainAnalysis = jsonDrain["김동필"]["240202"]
    const TargetDrain = jsonTargetDrain["Tomato"]["4truss_flowering"]

    // Solution 인스턴스를 생성합니다. 생성 시점에 CAT, AN, EC_Nut, EC_Calc 값들이 계산되어 저장
    const solution = new Solution(tomatoKoreanSolution);  // 6 Nutrient solution
    const rawWater = new Solution(Water) // 4 Water analysis 
    const Drain = new Solution(DrainAnalysis) // 7 Drain analysis
    const TD = new Solution(TargetDrain) // 8 Target drain

    // 계산
    // 1. 배액 보정 
    const drainCorrection = Object.keys(TD).reduce((newObj, key) => {
      if (key !== 'EC_Calc_exNaHCO3') {
        newObj[key] = Drain[key] * (TD.EC_Calc / Drain.EC_Calc_exNaHCO3);
      }
      return newObj;
    }, {})

    // 2. 원소별 class 정의 후 계산(adjustment class 활용)
    const corrections = new Adjustment().calculateTotalAdjustment(drainCorrection, TD, solution);

    // 3. Adding NS to correction - rawWater
    let solutionCalc = {};
    for (const nutrient in solution) {
      let calculatedValue = solution[nutrient] + (corrections[nutrient] || 0) - (rawWater[nutrient] || 0);
      // 4. - value to zero excluding the HCO3
      if (nutrient !== 'HCO3') {
        // HCO3를 제외한 나머지 영양소에 대해서만 음수 값을 0으로 처리합니다, 추후 중화처리에 질산을 사용하므로
        solutionCalc[nutrient] = Math.max(0, calculatedValue);
      } else {
        solutionCalc[nutrient] = calculatedValue;
      }
    }
    
    // 5. Electro neutrality
    let tempSol = new Solution(solutionCalc)

    let Diff = tempSol.CAT - tempSol.AN
    let CAT_star = (tempSol.K + tempSol.Ca + tempSol.Mg)
    let EN_K = - (tempSol.K / CAT_star) * Diff
    let EN_Ca = - (tempSol.Ca / CAT_star) * Diff * 2
    
    tempSol.K = tempSol.K + EN_K
    tempSol.Ca = tempSol.Ca + EN_Ca

    // 6. Nutrient calculation
    let fertilizerType = "4수염"; // 또는 "10수염"

    let nut_HNO3, nut_CaNO3, nut_NH4NO3, nut_KNO3, nut_KH2PO4, nut_MgSO4, nut_K2SO4, cal_NO3, cal_K, cal_SO4; // solutions

    if (fertilizerType === "4수염") {
      nut_HNO3 = Math.abs(tempSol.HCO3);                        // (1) 질산 계산 (mmol/L)
      nut_CaNO3 = tempSol.Ca;                                   // (2) CaNO3 계산 4수염
      nut_NH4NO3 = tempSol.NH4;                                 // (3) NH4NO3 계산
      nut_KH2PO4 = tempSol.PO4                                  // (4) KH2PO4
      nut_MgSO4 = tempSol.Mg                                    // (5) MgSO4 (Mg)
      nut_K2SO4 = tempSol.SO4                                   // (6) K2SO4 (SO4)
      nut_KNO3 = tempSol.K - tempSol.PO4 - tempSol.SO4 * 2;     // (7) KNO3 (total K - KH2PO4 - KH2SO4)
      // Calculated ions subjected to...
      cal_NO3 = nut_HNO3 + tempSol.Ca * 2 + tempSol.NH4 + nut_KNO3
      cal_K = tempSol.PO4 + tempSol.SO4 * 2 + nut_KNO3
      cal_SO4 = tempSol.Mg + tempSol.SO4

    } else if (fertilizerType === "10수염") { 
      nut_HNO3 = Math.abs(tempSol.HCO3); // 
      nut_CaNO3 = tempSol.Ca; // 
      nut_NH4NO3 = tempSol.NH4 - tempSol.Ca / 5;
      nut_KH2PO4 = tempSol.PO4                                 
      nut_MgSO4 = tempSol.Mg                                    
      nut_K2SO4 = tempSol.SO4                                   
      nut_KNO3 = tempSol.K - (nut_HNO3 + tempSol.Ca / 5 + nut_NH4NO3 + tempSol.Ca * 2)
      cal_NO3 = nut_HNO3 + tempSol.Ca * 2 + tempSol.NH4 + nut_KNO3
      cal_K = tempSol.PO4 + tempSol.SO4 * 2 + nut_KNO3
      cal_SO4 = tempSol.Mg + tempSol.SO4
      
    }

    // (8) Micronutrients (umol/L)
    let Fe_DTPA = tempSol.Fe      
    let MnSO4 = tempSol.Mn
    let ZnSO4 = tempSol.Zn
    let Borax = tempSol.B
    let CuSO4 = tempSol.Cu
    let NaMoO4 = tempSol.Mo

    
    let control = {
        NH4: nut_NH4NO3, 
        K: cal_K, 
        Na: 0,
        Ca: nut_CaNO3, 
        Mg: nut_MgSO4, 
        NO3: cal_NO3, 
        Cl: 0, 
        SO4: cal_SO4, 
        PO4: nut_KH2PO4, 
        HCO3: tempSol.HCO3,  // 기존 값, 원수 혼합 시 남아있을 수치
        Fe: Fe_DTPA,
        Mn: MnSO4,
        Zn: ZnSO4,
        B: Borax,
        Cu: CuSO4,
        Mo: NaMoO4
      };
    
    let finalSol = new Solution(control)

    // 만약 최종 솔루션을 목표 양액 솔루션과 비교하는 부분을 만들려면 control을 활용



    function calculateFertilizerAmount(nutrientValue, params, isMicroelement = false, isHNO3 = false) {
      let size_stock = 1; // m3
      let stock_conc = 100; // times
    
      let amount;
      if (isHNO3) {
        amount = (nutrientValue * params.molarmass * stock_conc * size_stock) / 1000000 * 1000 / 2;
      } else if (isMicroelement) {
        amount = (nutrientValue * params.molarmass * stock_conc * size_stock) / 1000000 * 1000 / 1000;
      } else {
        amount = (nutrientValue * params.molarmass * stock_conc * size_stock) / 1000000 * 1000;
      }
    
      return amount;
    }
    
    // 각 비료에 대한 계산
    let HNO3_amount = calculateFertilizerAmount(nut_HNO3, HNO3_params, false, true); // HNO3는 예외 처리
    let CaNO3_amount = fertilizerType === "4수염" ? calculateFertilizerAmount(nut_CaNO3, CaNO3_4H2O_params) : calculateFertilizerAmount(nut_CaNO3, CaNO3_10H2O_params);
    let NH4NO3_amount = calculateFertilizerAmount(nut_NH4NO3, NH4NO3_params); 
    let KH2PO4_amount = calculateFertilizerAmount(nut_KH2PO4, KH2PO4_params);
    let MgSO4_amount = calculateFertilizerAmount(nut_MgSO4, MgSO4_params);
    let K2SO4_amount = calculateFertilizerAmount(nut_K2SO4, K2SO4_params);
    let KNO3_amount = calculateFertilizerAmount(nut_KNO3, KNO3_params);

    // 미량 원소 계산
    let Fe_DTPA_amount = calculateFertilizerAmount(Fe_DTPA, Fe_DTPA_params, true);
    let MnSO4_amount = calculateFertilizerAmount(MnSO4, MnSO4_params, true);
    let ZnSO4_amount = calculateFertilizerAmount(ZnSO4, ZnSO4_params, true);
    let Borax_amount = calculateFertilizerAmount(Borax, Borax_params, true);
    let CuSO4_amount = calculateFertilizerAmount(CuSO4, CuSO4_params, true);
    let NaMoO4_amount = calculateFertilizerAmount(NaMoO4, NaMoO4_params, true);

    // 결과 출력
    console.log("A solutions = HNO3:", HNO3_amount.toFixed(2), "CaNO3:", CaNO3_amount.toFixed(2), "NH4NO3:", NH4NO3_amount.toFixed(2));
    console.log("B solutions = KH2PO4:", KH2PO4_amount.toFixed(2), "MgSO4:", MgSO4_amount.toFixed(2), "K2SO4:", K2SO4_amount.toFixed(2), "KNO3:", KNO3_amount.toFixed(2));
    // 나머지 비료 양도 출력

    let A_solution_weight = HNO3_amount + CaNO3_amount + NH4NO3_amount + Fe_DTPA_amount;
    let B_solution_weight = KH2PO4_amount + MgSO4_amount + K2SO4_amount + KNO3_amount + MnSO4_amount + ZnSO4_amount + Borax_amount + CuSO4_amount + NaMoO4_amount;

    console.log("A_solution_weight:", A_solution_weight.toFixed(2))
    console.log("B_solution_weight:", B_solution_weight.toFixed(2))


    return {
      // corrections: corrections,
      // solution: finalSol,
      // rawWater: rawWater,
      // drainCorrection: drainCorrection
    };

  } catch (error) {
    console.error('Error loading the nutrient solutions:', error);
    return { solution: null };


  }
}

loadSolutionData().then(data => {
  console.log('Calculate successfully:', data);

}).catch(error => {
  console.error('Failed to load solution data:', error);
});


