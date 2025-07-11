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
  Fe_DTPA: { molarmass: 932 },
  Fe_EDTA: { molarmass: 446.17 },
  MnSO4: { molarmass: 169 },
  ZnSO4: { molarmass: 287.5 },
  Borax: { molarmass: 95.3 },
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
    const NH4NO3 = reqIon.NH4 - reqIon.Ca / 5;
    const { neutralizeAmount: HNO3 } = pHNeutralization({ HCO3: reqIon.HCO3, targetHCO3: 0.5 });
    const KNO3 = reqIon.K - (HNO3 + reqIon.Ca / 5 + NH4NO3 + reqIon.Ca * 2);
    const caFertKey = "CaNO3_10H2O";

    fert = {
      HNO3,
      [caFertKey]: reqIon.Ca,
      NH4NO3,
      KH2PO4: reqIon.PO4,
      MgSO4: reqIon.Mg,
      K2SO4: reqIon.SO4,
      KNO3,
    };

    result.ions = {
      NH4: reqIon.NH4,
      NO3: HNO3 + reqIon.Ca * 2 + reqIon.NH4 + KNO3,
      PO4: reqIon.PO4,
      K: reqIon.PO4 + reqIon.SO4 * 2 + KNO3,
      Ca: reqIon.Ca,
      Mg: reqIon.Mg,
      SO4: reqIon.Mg + reqIon.SO4,
      HCO3: reqIon.HCO3,
    };
  }

  // ✅ 미량원소 처리
  const traceElements = ["Fe", "Mn", "B", "Zn", "Cu", "Mo"];
  for (const el of traceElements) {
    const umol = reqIon[el];
    if (!umol) continue;
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
        fertKey = FeType === "Fe-EDTA" ? "Fe_EDTA" : "Fe_DTPA";
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

    const param = fertilizerParams[fertKey];
    if (param?.molarmass) {
      const mol = umol * 1e-6;
      const g = mol * param.molarmass * tankVolume * concentration;
      result.microFertgPerStock[fertKey] = g;
    }
  }

  // ✅ A/B Tank 균형 조정
  const aTankKeys = [
    "HNO3",
    type === "4수염" ? "CaNO3_4H2O" : "CaNO3_10H2O",
    "NH4NO3",
    FeType === "Fe-EDTA" ? "Fe_EDTA" : "Fe_DTPA",
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

