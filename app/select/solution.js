export const compoundInfo = {
  HNO3: { molarmass: 167, density: 1.24 },   // YaraTera SALPETERZUUR 38%
  NH4NO3: { molarmass: 156, density: 1.24 },
  CaNO34H2O: { molarmass: 236.2 },
  CaNO310H2O: { molarmass: 1080.5 },
  KH2PO4: { molarmass: 136.1 },
  MgSO4: { molarmass: 246.4 },
  K2SO4: { molarmass: 174.3 },
  KNO3: { molarmass: 101.1 },
  FeDTPA: { molarmass: 932 },
  FeEDTA: { molarmass: 367.05 }, 
  MnSO4: { molarmass: 169 },
  ZnSO4: { molarmass: 287.5 },
  Borax: { molarmass: 95.3 },
  CuSO4: { molarmass: 249.7 },
  NaMoO4: { molarmass: 241.9 }
};

export function calculateSolutionInfo(solutionData) {
  const defaultData = {
    NH4: 0, K: 0, Na: 0, Ca: 0, Mg: 0, NO3: 0, Cl: 0, SO4: 0, PO4: 0, HCO3: 0
  };

  const solution = { ...defaultData, ...solutionData };
  const CAT = solution.NH4 + solution.K + solution.Na + (solution.Ca * 2) + (solution.Mg * 2);
  const AN = solution.NO3 + solution.Cl + (solution.SO4 * 2) + solution.PO4 + solution.HCO3;
  const EC_Nut = (solution.NH4 + solution.K + (solution.Ca * 2) + (solution.Mg * 2) + solution.NO3 + solution.Cl + (solution.SO4 * 2) + solution.PO4) / 20;
  const EC_Calc = (CAT + AN) / 20;
  const EC_Calc_exNaHCO3 = (CAT + AN - solution.HCO3 - solution.Na) / 20;

  return {
    ...solution,
    CAT,
    AN,
    EC_Nut,
    EC_Calc,
    EC_Calc_exNaHCO3
  };
}

export function calculateClosedSolution(solution, drain, rawWater, TD) {
  const drainCorrection = Object.keys(TD).reduce((newObj, key) => {
    if (key !== 'EC_Calc_exNaHCO3') {
      newObj[key] = drain[key] * (TD.EC_Calc / drain.EC_Calc_exNaHCO3);
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
    
  let updatedSolution = new calculateSolutionInfo(solutionCalc)
  let Diff = updatedSolution.CAT - updatedSolution.AN
  let CAT_star = (updatedSolution.K + updatedSolution.Ca + updatedSolution.Mg)
  let EN_K = - (updatedSolution.K / CAT_star) * Diff
  let EN_Ca = - (updatedSolution.Ca / CAT_star) * Diff * 2
  updatedSolution.K = updatedSolution.K + EN_K
  updatedSolution.Ca = updatedSolution.Ca + EN_Ca

  return {...updatedSolution}
}


export function calculateNutrient(solution, NFertType, KFertType) {
  let amountHNO3, amountCaNO3, amount5CaNO3, amountNH4NO3, amountKNO3, amountKH2PO4, amountMgSO4, amountK2SO4, calNO3, calK, calSO4; // solutions

  if (NFertType === "4수염") {
    amountHNO3 = Math.abs(solution.HCO3);                        // (1) 질산 계산 (mmol/L)
    amountCaNO3 = solution.Ca;                                   // (2) CaNO3 계산 4수염
    amountNH4NO3 = solution.NH4;                                 // (3) NH4NO3 계산
    amountKH2PO4 = solution.PO4                                  // (4) KH2PO4
    amountMgSO4 = solution.Mg                                    // (5) MgSO4 (Mg)
    amountK2SO4 = solution.SO4                                   // (6) K2SO4 (SO4)
    amountKNO3 = solution.K - solution.PO4 - solution.SO4 * 2;     // (7) KNO3 (total K - KH2PO4 - KH2SO4)

    calNO3 = amountHNO3 + amountCaNO3 * 2 + amountNH4NO3 + amountKNO3
    calK = amountKH2PO4 + amountK2SO4 * 2 + amountKNO3
    calSO4 = amountMgSO4 + amountK2SO4

  } else if (NFertType === "10수염") {
    amountHNO3 = Math.abs(solution.HCO3); // 
    amount5CaNO3 = solution.Ca; // 
    amountNH4NO3 = solution.NH4 - solution.Ca / 5;
    amountKH2PO4 = solution.PO4
    amountMgSO4 = solution.Mg
    amountK2SO4 = solution.SO4
    amountKNO3 = solution.K - (amountHNO3 + solution.Ca / 5 + amountNH4NO3 + solution.Ca * 2)

    calNO3 = amountHNO3 + amount5CaNO3 * 11 + amountNH4NO3 + amountKNO3
    calK = amountKH2PO4 + amountK2SO4 * 2 + amountKNO3
    calSO4 = amountMgSO4 + amountK2SO4
  }

  // (8) Micronutrients (umol/L)
  let Fe = solution.Fe
  let MnSO4 = solution.Mn
  let ZnSO4 = solution.Zn
  let Borax = solution.B
  let CuSO4 = solution.Cu
  let NaMoO4 = solution.Mo
  let aimedSol = {
    NH4: amountNH4NO3,
    K: calK,
    Na: 0,
    Ca: amountCaNO3,
    Mg: amountMgSO4,
    NO3: calNO3,
    Cl: 0,
    SO4: calSO4,
    PO4: amountKH2PO4,
    HCO3: solution.HCO3,  // 기존 값, 원수 혼합 시 남아있을 수치
    Fe: Fe,
    Mn: MnSO4,
    Zn: ZnSO4,
    B: Borax,
    Cu: CuSO4,
    Mo: NaMoO4
  };
    
  let aimedSolInfo = new calculateSolutionInfo(aimedSol) // 만약 계산값 비교할거면 사용
  return { ...aimedSolInfo }
}

export function calculateFertilizerAmount(nutrientValue, params, isMicroelement = false, isHNO3 = false) {
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

export default { compoundInfo, calculateSolutionInfo, calculateClosedSolution, calculateNutrient, calculateFertilizerAmount };

