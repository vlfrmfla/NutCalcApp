// utils/calculation.js

const fertilizerParams = {
  HNO3: { molarmass: 167, density: 1.24 },
  NH4NO3: { molarmass: 156, density: 1.24 },
  CaNO3_4H2O: { molarmass: 236.2 },
  CaNO3_10H2O: { molarmass: 1080.5 },
  KH2PO4: { molarmass: 136.1 },
  MgSO4: { molarmass: 246.4 },
  K2SO4: { molarmass: 174.3 },
  KNO3: { molarmass: 101.1 },
  Fe_DTPA: { molarmass: 932 },
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
      const base = solution[key] || 0;
      const water = rawWater[key] || 0;
      result[key] = key !== "HCO3" ? Math.max(0, base - water) : base - water;
    }
    return result;
  }
}
export function calculateFertilizers(reqIon, type = "4수염", FeType = "Fe-DTPA", options = {}) {
  const { tankVolume = 100, concentration = 100 } = options;
  const result = {
    fertilizers: {},
    ions: {},
    gramsPerLiter: {},
    kgPerStock: {},
  };

  const abs = Math.abs;
  let fert = {};

  if (type === "4수염") {
    const K2SO4_SO4 = reqIon.SO4 - reqIon.Mg;
    const caFertKey = "CaNO3_4H2O";
    fert = {
      HNO3: abs(reqIon.HCO3),
      [caFertKey]: reqIon.Ca,  // ✅ key를 동적으로 설정
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
    const HNO3 = abs(reqIon.HCO3);
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

  const traceElements = ["Fe", "Mn", "B", "Zn", "Cu", "Mo"];
  for (const el of traceElements) {
    if (reqIon[el] !== undefined) {
      result.ions[el] = reqIon[el];
    }
  }

  if (reqIon.Fe) {
    const feKey = FeType === "Fe-EDTA" ? "Fe_EDTA" : "Fe_DTPA";
    fert[feKey] = reqIon.Fe;
  }

  result.fertilizers = fert;
  result.kgPerStock = {};

  // kg/stock calc
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

  // trace element fertilizers g/stock 계산
  for (const el of traceElements) {
    const mmol = reqIon[el];
    let fertKey;

    // 원소에 대응하는 비료 키 매핑
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

    if (fertKey && fertilizerParams[fertKey]?.molarmass) {
      const mass =
        ((mmol * fertilizerParams[fertKey].molarmass) / 1000) *
        tankVolume *
        concentration;
      result.microFertgPerStock[fertKey] = mass;
    }
  }

  return result;
}

export { fertilizerParams };
