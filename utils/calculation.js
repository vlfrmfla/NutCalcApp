// utils/calculation.js

const fertilizerParams = {
  HNO3: { molarmass: 167, density: 1.24 },
  H3PO4: { molarmass: 97.99, density: 1.69},
  NH4NO3: { molarmass: 156, density: 1.24 },
  CaNO3_4H2O: { molarmass: 236.2 },
  CaNO3_10H2O: { molarmass: 1080.5 },
  KH2PO4: { molarmass: 136.1 },
  MgSO4: { molarmass: 246.4 },
  K2SO4: { molarmass: 174.3 },
  KNO3: { molarmass: 101.1 },
  Fe_DTPA: { molarmass: 932, density: 1.32 }, // 액상, 밀도 1.29~1.35 g/cm³
  Fe_EDTA: { molarmass: 446.17 }, // 고형
  Fe_EDDHA: { molarmass: 433.1 }, // 고형
  MnSO4: { molarmass: 169 },
  ZnSO4: { molarmass: 287.5 },
  Borax: { molarmass: 95.3 }, // 붕산나트륨 1mol = 4mol B 함축
  CuSO4: { molarmass: 249.7 },
  NaMoO4: { molarmass: 241.9 },
};

export class Solution {
  constructor(data = {}) {
    const defaults = {
      NH4: 0,
      K: 0,
      Na: 0,
      Ca: 0,
      Mg: 0,
      NO3: 0,
      Cl: 0,
      SO4: 0,
      PO4: 0,
      HCO3: 0,
    };
    Object.assign(this, defaults, data);
    this.CAT = this.calcCAT();
    this.AN = this.calcAN();
    this.EC_Nut = this.calcECNut();
    this.EC_Calc = this.calcECCalc();
    this.EC_Calc_exNaHCO3 = this.calcECexcludeNaandHCO3();
  }

  calcCAT() {
    return this.NH4 + this.K + this.Na + this.Ca * 2 + this.Mg * 2;
  }

  calcAN() {
    return this.NO3 + this.Cl + this.SO4 * 2 + this.PO4 + this.HCO3;
  }

  calcECNut() {
    return (this.CAT + this.AN) / 20;
  }

  calcECCalc() {
    return (this.CAT + this.AN) / 20;
  }

  calcECexcludeNaandHCO3() {
    return (this.CAT + this.AN - this.HCO3 - this.Na) / 20;
  }
}

export class Adjustment {
  static getDrainCorrection(drain, targetDrain) {
    return Object.keys(targetDrain).reduce((result, key) => {
      if (key !== "EC_Calc_exNaHCO3" && drain.EC_Calc_exNaHCO3 !== 0) {
        result[key] =
          drain[key] * (targetDrain.EC_Calc / drain.EC_Calc_exNaHCO3);
      } else {
        result[key] = 0;
      }
      return result;
    }, {});
  }

  static getCorrections(drainCorrection, targetDrain, nutrientSolution) {
    return Object.keys(nutrientSolution).reduce((result, key) => {
      result[key] = (targetDrain[key] || 0) - (drainCorrection[key] || 0);
      return result;
    }, {});
  }

  static applyCorrections(baseSolution, corrections, rawWater) {
    const result = {};
    for (const key of Object.keys(baseSolution)) {
      const calculated =
        (baseSolution[key] || 0) +
        (corrections[key] || 0) -
        (rawWater[key] || 0);
      result[key] = key !== "HCO3" ? Math.max(0, calculated) : calculated;
    }
    return result;
  }

  static calculateOpenLoop(solution, rawWater) {
    const result = {};
    for (const key of Object.keys(solution)) {
      if (key === 'pH') {
        // pH는 빼지 않고 solution의 값을 그대로 사용
        result[key] = solution[key];
      } else {
        const base = solution[key] || 0;
        const water = rawWater[key] || 0;
        result[key] = base - water;
      }
    }
    return result;
  }
}
export function calculateFertilizers(
  reqIon,
  type = "4수염",
  FeType = "Fe-DTPA",
  options = {}
) {
  console.log("=== calculateFertilizers 함수 시작 ===");
  console.log("type:", type);
  console.log("FeType:", FeType);
  console.log("reqIon.HCO3 (목표조성):", reqIon.HCO3);
  
  // options에서 값 추출
  const { tankVolume = 1000, concentration = 100 } = options;
  console.log("tankVolume:", tankVolume);
  console.log("concentration:", concentration);
  
  // 목표조성 HCO3가 음수면 절대값으로 중화량 계산
  const neutralizeAmount = reqIon.HCO3 < 0 ? Math.abs(reqIon.HCO3) : 0;
  
  console.log("neutralizeAmount (중화해야 할 mol):", neutralizeAmount);

  const result = {
    fertilizers: {},
    ions: {},
    gramsPerLiter: {},
    kgPerStock: {},
    microFertgPerStock: {},
  };

  const abs = Math.abs;
  let fert = {};

  if (type === "4수염") {
    const K2SO4_SO4 = reqIon.SO4 - reqIon.Mg;
    const caFertKey = "CaNO3_4H2O";
    fert = {
      HNO3: neutralizeAmount, // 계산된 중화량 사용
      [caFertKey]: reqIon.Ca,
      NH4NO3: reqIon.NH4,
      KH2PO4: reqIon.PO4,
      MgSO4: reqIon.Mg,
      K2SO4: K2SO4_SO4,
      KNO3: reqIon.K - reqIon.PO4 - K2SO4_SO4 * 2,
    };

    result.ions = {
      NH4: reqIon.NH4,
      NO3: fert.HNO3 + reqIon.Ca * 2 + reqIon.NH4 + fert.KNO3,
      PO4: reqIon.PO4,
      K: reqIon.PO4 + K2SO4_SO4 * 2 + fert.KNO3,
      Ca: reqIon.Ca,
      Mg: reqIon.Mg,
      SO4: reqIon.Mg + K2SO4_SO4,
      HCO3: reqIon.HCO3,
    };
  } else if (type === "10수염") {
    // caFertKey 정의 (10수염에서는 CaNO3_10H2O 사용)
    const caFertKey = "CaNO3_10H2O";

    // HNO3는 neutralizeAmount로 정의 (위 4수염과 동일하게 중화량 사용)
    const HNO3 = neutralizeAmount;

    // 10수염 사용량: 5Ca(NO₃)₂·NH₄NO₃·10H₂O이므로 1몰당 Ca 5몰 공급
    const CaNO3_10H2O_amount = reqIon.Ca / 5;
    
    // NH4NO3_from_10수염: 10수염 1mol당 NH4NO3 1mol 공급 (5몰 Ca당 1몰 NH4)
    const NH4NO3_from_10수염 = CaNO3_10H2O_amount;
    const NH4NO3_additional = Math.max(reqIon.NH4 - NH4NO3_from_10수염, 0);

    // 황산칼륨 계산: 황산마그네슘 하고 남은 SO4만큼 황산칼륨
    const K2SO4_SO4 = reqIon.SO4 - reqIon.Mg;

    // NO3 계산 (각 공급원의 NO3 기여)
    const NO3_from_HNO3 = HNO3;
    // 10수염에서: 5Ca(NO₃)₂ × 2 + NH₄NO₃ × 1 = 11 NO3 per 10수염 1몰
    const NO3_from_CaNO3 = CaNO3_10H2O_amount * 11; // 10수염 1몰당 NO3 11몰
    const NO3_from_NH4NO3 = NH4NO3_additional;
    
    // K 계산 (각 공급원의 K 기여)
    const K_from_KH2PO4 = reqIon.PO4;        // 1KH2PO4 → 1K
    const K_from_K2SO4 = K2SO4_SO4 * 2;      // 1K2SO4 → 2K, K2SO4_SO4만큼만 사용
    const K_required = reqIon.K;
    const KNO3 = K_required - (K_from_KH2PO4 + K_from_K2SO4);

    fert = {
      HNO3,
      [caFertKey]: CaNO3_10H2O_amount, // 실제 10수염 사용량
      NH4NO3: NH4NO3_additional,
      KH2PO4: reqIon.PO4,
      MgSO4: reqIon.Mg,
      K2SO4: K2SO4_SO4,
      KNO3,
    };

    result.ions = {
      NH4: NH4NO3_from_10수염 + NH4NO3_additional,
      NO3: NO3_from_HNO3 + NO3_from_CaNO3 + NO3_from_NH4NO3 + KNO3,
      PO4: reqIon.PO4,
      K: K_from_KH2PO4 + K_from_K2SO4 + KNO3,
      Ca: reqIon.Ca, // 5몰 Ca per 10수염 1몰이므로 총 Ca는 여전히 reqIon.Ca
      Mg: reqIon.Mg,
      SO4: reqIon.Mg + K2SO4_SO4,
      HCO3: reqIon.HCO3,
    };
  }

  // ✅ 미량원소 처리
  const traceElements = ["Fe", "Mn", "B", "Zn", "Cu", "Mo"];
  for (const el of traceElements) {
    const umol = reqIon[el];
    if (!umol) continue;
    // ✅ 미량원소를 ions에 추가 (비료에서 그대로 공급되므로 목표값과 동일)
    result.ions[el] = umol;
  }

  result.fertilizers = fert;
  result.kgPerStock = {};

  // ✅ macro 비료 kg 계산
  for (const [key, mol] of Object.entries(fert)) {
    const param = fertilizerParams[key];
    if (param?.molarmass) {
      const kg =
        ((mol * param.molarmass) / 1_000_000) * tankVolume * concentration;
      result.kgPerStock[key] = kg;
      
      // 액상 비료의 경우 부피 계산 추가
      if (param.density) {
        const g = kg * 1000; // kg → g
        const volumeL = g / (param.density * 1000); // g → L 변환
        result.kgPerStock[key + "_volume"] = volumeL;
        result.kgPerStock[key + "_mass"] = kg; // 원래 질량값 보존
        console.log(`${key} 액상 - 부피: ${volumeL.toFixed(3)}L, 질량: ${kg.toFixed(3)}kg`);
      }
    } else {
      result.kgPerStock[key] = 0;
    }
  }
  // 3. 최종 질산(HNO3) kg 값 확인
  // (kgPerStock 계산 이후에 위치해야 함)
  console.log("result.kgPerStock.HNO3 (필요한 질산 kg):", result.kgPerStock.HNO3);

  // ✅ 미량원소 g 계산
  for (const el of traceElements) {
    const umol = reqIon[el];
    let fertKey;
    switch (el) {
      case "Fe":
        if (FeType === "Fe-EDTA") {
          fertKey = "Fe_EDTA";
        } else if (FeType === "Fe-EDDHA") {
          fertKey = "Fe_EDDHA";
        } else {
          fertKey = "Fe_DTPA"; // 기본값
        }
        break;
      case "Mn":
        fertKey = "MnSO4";
        break;
      case "B":
        fertKey = "Borax";
        break;
      case "Zn":
        fertKey = "ZnSO4";
        break;
      case "Cu":
        fertKey = "CuSO4";
        break;
      case "Mo":
        fertKey = "NaMoO4";
        break;
      default:
        fertKey = null;
    }

    console.log(`미량원소 ${el}: fertKey=${fertKey}, umol=${umol}`);
    
    const param = fertilizerParams[fertKey];
    if (param?.molarmass) {
      const mol = umol * 1e-6;
      let g = mol * param.molarmass * tankVolume * concentration;
      
      // 붕산(Borax)의 경우 1mol에 4mol B가 함축되어 있으므로 1/4로 보정
      if (el === "B") {
        g = g / 4;
      }
      
      console.log(`${fertKey} 계산 결과: ${g.toFixed(2)}g`);
      
      // 액상 미량원소 비료의 경우 밀도 고려한 부피 계산 추가
      if (param.density) {
        const volumeL = g / (param.density * 1000); // g → L 변환 (밀도 g/cm³ = g/mL)
        const molPerL = mol * concentration / volumeL; // mol/L 농도
        console.log(`${fertKey} 액상 - 부피: ${volumeL.toFixed(3)}L, 질량: ${g.toFixed(2)}g`);
        
        // 액상 정보를 결과에 추가
        result.microFertgPerStock[fertKey + "_volume"] = volumeL;
        result.microFertgPerStock[fertKey + "_mass"] = g; // 원래 질량값 보존
      }
      
      result.microFertgPerStock[fertKey] = g;
    } else {
      console.log(`경고: ${fertKey}에 대한 파라미터를 찾을 수 없습니다.`);
    }
  }

  // ✅ A/B Tank 균형 조정
  let feKey;
  if (FeType === "Fe-EDTA") {
    feKey = "Fe_EDTA";
  } else if (FeType === "Fe-EDDHA") {
    feKey = "Fe_EDDHA";
  } else {
    feKey = "Fe_DTPA";
  }
  
  const aTankKeys = [
    "HNO3",
    type === "4수염" ? "CaNO3_4H2O" : "CaNO3_10H2O",
    "NH4NO3",
    feKey,
    "KNO3_A",
  ];
  const bTankKeys = [
    "KNO3",
    "KH2PO4",
    "MgSO4",
    "K2SO4",
    "MnSO4",
    "ZnSO4",
    "Borax",
    "CuSO4",
    "NaMoO4",
  ];

  let A_mass = 0;
  let B_mass = 0;

  for (const key of aTankKeys) {
    const kg = result.kgPerStock[key];
    const g = result.microFertgPerStock[key];
    A_mass += kg !== undefined ? kg : g !== undefined ? g / 1000 : 0;
  }

  for (const key of bTankKeys) {
    const kg = result.kgPerStock[key];
    const g = result.microFertgPerStock[key];
    B_mass += kg !== undefined ? kg : g !== undefined ? g / 1000 : 0;
  }

  const totalKNO3 = result.kgPerStock["KNO3"] || 0;
  const shiftAmount = Math.max(0, Math.min(totalKNO3, (B_mass - A_mass) / 2));
  
  result.kgPerStock["KNO3_A"] = shiftAmount;
  result.kgPerStock["KNO3_B"] = totalKNO3 - shiftAmount;
  delete result.kgPerStock["KNO3"];

  return result;
}

export { fertilizerParams };

// ✅ 실제 조성 계산 함수 추가
export function calculateActualComposition(targetComposition, targetEC, actualEC) {
  if (!targetComposition || !targetEC || !actualEC || targetEC === 0) {
    return targetComposition;
  }
  
  const ecRatio = actualEC / targetEC;
  const actualComposition = { ...targetComposition };
  
  // 미량원소는 EC 비례로 직접 조정
  const traceElements = ["Fe", "Mn", "B", "Zn", "Cu", "Mo"];
  for (const el of traceElements) {
    if (actualComposition[el] !== undefined) {
      actualComposition[el] = targetComposition[el] * ecRatio;
    }
  }
  
  // 다량원소는 AN/CAT 균형을 고려하여 조정
  const macroElements = ["NH4", "K", "Na", "Ca", "Mg", "NO3", "Cl", "SO4", "PO4"];
  
  // 기본 다량원소 비례 조정
  for (const el of macroElements) {
    if (actualComposition[el] !== undefined) {
      actualComposition[el] = targetComposition[el] * ecRatio;
    }
  }
  
  // AN/CAT 균형 확인 및 조정
  const solution = new Solution(actualComposition);
  const catTotal = solution.calcCAT();
  const anTotal = solution.calcAN();
  
  // EC 계산
  actualComposition.EC = (catTotal + anTotal) / 20;
  actualComposition.EC_Calc = actualComposition.EC;
  
  return actualComposition;
}

// ✅ EC 기반 조성 스케일링 함수
export function scaleCompositionByEC(baseComposition, targetEC) {
  if (!baseComposition || !targetEC) {
    return baseComposition;
  }
  
  const baseSolution = new Solution(baseComposition);
  const baseEC = baseSolution.calcECNut();
  
  if (baseEC === 0) {
    return baseComposition;
  }
  
  const scaleFactor = targetEC / baseEC;
  const scaledComposition = {};
  
  // 모든 이온 농도를 스케일링
  Object.keys(baseComposition).forEach(key => {
    if (typeof baseComposition[key] === 'number' && key !== 'pH') {
      scaledComposition[key] = baseComposition[key] * scaleFactor;
    } else {
      scaledComposition[key] = baseComposition[key];
    }
  });
  
  return scaledComposition;
}

export function pHNeutralization({ HCO3, targetHCO3 = -0.5 }) {
  // HCO3: 원수의 HCO3 값 (예: -1.04)
  // targetHCO3: 남겨둘 목표값 (기본 -0.5, 약간의 염기성)
  // 중화해야 할 양 = targetHCO3 - HCO3
  const neutralizeAmount = targetHCO3 - HCO3;
  return {
    neutralizeAmount: Math.max(0, neutralizeAmount), // 음수면 0으로 처리
    message: `중탄산 ${neutralizeAmount.toFixed(2)}만큼 질산으로 중화`
  };
}

