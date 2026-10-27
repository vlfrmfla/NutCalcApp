// 조성 데이터 정규화와 검증.
import { ALL_IONS, NUTRIENT_MACRO_IONS, cationMeq, anionMeq, estimateEC } from "./ions.js";

// 분석성적서나 과거 데이터에서 쓰이는 다른 키 이름 → 표준 키
export const KEY_ALIASES = {
  P: "PO4",
  S: "SO4",
  N: "NO3",
  "NO3-N": "NO3",
  "NH4-N": "NH4",
  "PO4-P": "PO4",
  "SO4-S": "SO4",
  H2PO4: "PO4",
};

// "<2.0"(검출한계 미만), "-", "" 은 0으로, 숫자 문자열은 숫자로.
export function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;
  const s = String(value).trim();
  if (s === "" || s === "-" || s === "–" || s === "—") return 0;
  if (/^[<≤]/.test(s)) return 0;
  const n = parseFloat(s.replace(/[^0-9.eE+-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// 숫자면 그대로, 아니면 undefined (EC, pH 같은 선택 항목용)
function optionalNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (value == null || value === "") return undefined;
  const n = parseFloat(String(value).replace(/[^0-9.eE+-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

// 모든 이온 키를 숫자로 채운 조성 객체를 반환. EC, pH는 있으면 숫자로, 없으면 undefined.
export function normalizeComposition(raw = {}) {
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const ion = KEY_ALIASES[key] || key;
    if (ALL_IONS.includes(ion)) out[ion] = toNumber(value);
  }
  for (const ion of ALL_IONS) if (out[ion] === undefined) out[ion] = 0;
  const ec = optionalNumber(raw.EC);
  const ph = optionalNumber(raw.pH);
  if (ec !== undefined) out.EC = ec;
  if (ph !== undefined) out.pH = ph;
  return out;
}

// 표준 조성 데이터 검증: 키 누락, 문자열 값, 전하 불균형, 표기 EC 불일치를 보고한다.
export function validateComposition(raw = {}, { tolerance = 1.0 } = {}) {
  const issues = [];
  const presentKeys = new Set(Object.keys(raw).map((k) => KEY_ALIASES[k] || k));

  for (const ion of NUTRIENT_MACRO_IONS) {
    if (!presentKeys.has(ion)) {
      issues.push({ level: "error", code: "missing_ion", ion, message: `${ion} 값이 없습니다. 0으로 계산됩니다.` });
    }
  }
  for (const [key, value] of Object.entries(raw)) {
    const ion = KEY_ALIASES[key] || key;
    if (ALL_IONS.includes(ion) && typeof value !== "number") {
      issues.push({ level: "warning", code: "non_numeric", ion, message: `${key} 값 "${value}"은 숫자가 아니라 ${toNumber(value)}으로 처리됩니다.` });
    }
    if (KEY_ALIASES[key]) {
      issues.push({ level: "warning", code: "alias_key", ion, message: `키 "${key}"는 "${ion}"으로 해석했습니다.` });
    }
  }

  const composition = normalizeComposition(raw);
  const cat = cationMeq(composition);
  const an = anionMeq(composition);
  const diff = cat - an;
  if (Math.abs(diff) > tolerance) {
    issues.push({
      level: Math.abs(diff) > 2 * tolerance ? "error" : "warning",
      code: "charge_imbalance",
      message: `양이온 ${cat.toFixed(2)} meq/L, 음이온 ${an.toFixed(2)} meq/L로 전하 차이가 ${diff.toFixed(2)} meq/L입니다. NO₃ 공급량이 목표와 크게 달라집니다.`,
    });
  }
  const ecEstimated = estimateEC(composition);
  if (composition.EC !== undefined && composition.EC > 0 && Math.abs(ecEstimated - composition.EC) / composition.EC > 0.25) {
    issues.push({
      level: "warning",
      code: "ec_mismatch",
      message: `표기 EC ${composition.EC} dS/m와 이온 합으로 추정한 EC ${ecEstimated.toFixed(2)} dS/m의 차이가 큽니다.`,
    });
  }

  return { composition, cationMeq: cat, anionMeq: an, chargeBalance: diff, ecEstimated, issues };
}
