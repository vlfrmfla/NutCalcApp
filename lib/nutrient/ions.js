// 이온 정의와 전하·EC 추정 유틸리티.
// 농도 단위: 다량원소 mmol/L, 미량원소 µmol/L.

export const MACRO_IONS = ["NH4", "K", "Na", "Ca", "Mg", "NO3", "Cl", "SO4", "PO4", "HCO3"];
export const MICRO_IONS = ["Fe", "Mn", "Zn", "B", "Cu", "Mo"];
export const ALL_IONS = [...MACRO_IONS, ...MICRO_IONS];

// 이온별 전하 (meq 환산용)
export const CATIONS = { NH4: 1, K: 1, Na: 1, Ca: 2, Mg: 2 };
export const ANIONS = { NO3: 1, Cl: 1, SO4: 2, PO4: 1, HCO3: 1 };

// 비료로 공급하는 다량원소 (Na, Cl, HCO3는 공급 대상이 아님)
export const NUTRIENT_MACRO_IONS = ["NH4", "K", "Ca", "Mg", "NO3", "SO4", "PO4"];
export const BALLAST_IONS = ["Na", "Cl"];

// EC 추정: 1 dS/m ≈ 10 meq/L (양이온 합 기준), 즉 (양이온 meq + 음이온 meq) / 20
export const MEQ_PER_DS = 10;

const num = (v) => (Number.isFinite(v) ? v : 0);

export function cationMeq(c = {}) {
  let sum = 0;
  for (const [ion, z] of Object.entries(CATIONS)) sum += z * num(c[ion]);
  return sum;
}

export function anionMeq(c = {}) {
  let sum = 0;
  for (const [ion, z] of Object.entries(ANIONS)) sum += z * num(c[ion]);
  return sum;
}

// 양이온 meq − 음이온 meq. 0이면 전기적으로 중성.
export function chargeBalance(c = {}) {
  return cationMeq(c) - anionMeq(c);
}

// 이온 조성으로부터 EC(dS/m) 추정. exclude로 특정 이온을 제외할 수 있다.
export function estimateEC(c = {}, { exclude = [] } = {}) {
  let meq = 0;
  for (const [ion, z] of Object.entries(CATIONS)) {
    if (!exclude.includes(ion)) meq += z * num(c[ion]);
  }
  for (const [ion, z] of Object.entries(ANIONS)) {
    if (!exclude.includes(ion)) meq += z * num(c[ion]);
  }
  return meq / (2 * MEQ_PER_DS);
}

// a + factorB × b (이온 키만)
export function addCompositions(a = {}, b = {}, factorB = 1) {
  const out = {};
  for (const ion of ALL_IONS) out[ion] = num(a[ion]) + factorB * num(b[ion]);
  return out;
}

export function scaleComposition(c = {}, factor, ions = ALL_IONS) {
  const out = { ...c };
  for (const ion of ions) out[ion] = num(c[ion]) * factor;
  return out;
}

export function pickIons(c = {}, ions = ALL_IONS) {
  const out = {};
  for (const ion of ions) out[ion] = num(c[ion]);
  return out;
}
