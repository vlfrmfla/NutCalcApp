// 배액(근권) 분석 기반 표준 조성 보정.
// 출처: Bemestings Adviesbasis Substraten (PBG Naaldwijk, 1999) 3장 A.V.W. 방식.
//  1. 배액 EC에서 Na/Cl 영향을 뺀다: EC(v) = EC − 0.1·max(Na, Cl)
//  2. K, Ca, Mg, NO3, SO4, P를 EC(c)/EC(v) 배로 환산한다 (NH4, Na, Cl, HCO3, 미량원소는 환산하지 않음)
//  3. 환산값이 속한 등급에 따라 표준 조성을 보정한다 (다량 mmol/L, 미량 표준 대비 %)
//  4. K, Ca가 모두 정상 등급이면 K/Ca 비율을 검사한다
//  5. 배액 pH·NH4·HCO3 조합에 따라 질산암모늄 추가량과 pH 조치를 안내한다
//  6. 양이온합·음이온합을 표준 조성의 이온합으로 되돌린다 (NH4, P, Cl 고정, K:Ca:Mg와 NO3:SO4 비율 유지)
import { cationMeq, anionMeq, estimateEC } from "./ions.js";
import { normalizeComposition } from "./composition.js";

const EPS = 1e-9;
export const SCALED_IONS = ["K", "Ca", "Mg", "NO3", "SO4", "PO4"];
export const CLASS_LABELS = { "-2": "매우 낮음", "-1": "낮음", "0": "정상", "1": "높음", "2": "매우 높음" };

// upper: 등급 경계. 첫 값은 "미만", 나머지는 "이하". 값이 모든 경계를 넘으면 마지막 등급.
export function classIndex(upper, value) {
  if (!Array.isArray(upper) || upper.length === 0) return 0;
  if (value < upper[0]) return 0;
  for (let i = 1; i < upper.length; i++) if (value <= upper[i]) return i;
  return upper.length;
}

// 등급표에서 보정량을 고른다. lowPH이면 P의 "2+" 단계는 lowPhStep을 쓴다 (* Als pH < 6.5).
export function stepForClass(table, value, { lowPH = false } = {}) {
  const idx = classIndex(table.upper, value);
  const steps = table.steps || [];
  const zeroIdx = steps.indexOf(0);
  let step = steps[Math.min(idx, steps.length - 1)] ?? 0;
  if (lowPH && table.lowPhStep !== undefined && idx === zeroIdx - 1) step = table.lowPhStep;
  return { idx, step, relative: zeroIdx >= 0 ? idx - zeroIdx : 0 };
}

// 배액 pH × NH4 × HCO3 조합 코드 (1999, 3.1 'Waardering en aanpassing pH' 표)
// [NH4 구간][HCO3 구간][pH 구간], 0 = 조치 없음(또는 비현실적 조합)
export const NH4_CODE_TABLE = [
  [[1, 0, 0, 0, 6], [0, 0, 0, 6, 7], [0, 0, 6, 7, 8]], // NH4 < 0.5
  [[1, 0, 0, 0, 6], [0, 0, 0, 0, 6], [0, 0, 0, 6, 7]], // 0.5–1.0
  [[1, 1, 0, 0, 2], [0, 0, 0, 0, 6], [0, 0, 0, 2, 6]], // 1.0–1.5
  [[5, 5, 3, 3, 4], [0, 0, 3, 3, 4], [0, 0, 3, 4, 4]], // 1.5–2.0 이상
];

export const NH4_ADVICE = {
  1: "배액 pH가 낮습니다. 급액 pH를 6.2까지 높이고 질산암모늄을 빼세요. 필요하면 중탄산칼륨을 따로 공급합니다.",
  2: "급액 pH를 낮추되 5.0 아래로는 내리지 마세요.",
  3: "배지 포수 직후라 NH₄가 높습니다. 곧 pH가 내려가므로 추가 조치는 필요 없습니다.",
  4: "NH₄가 높은데 pH도 높습니다. 질산암모늄을 늘리지 말고 급액 pH를 낮추세요 (5.0 이상).",
  5: "NH₄가 높습니다. 당분간 질산암모늄을 모두 빼세요.",
  6: "급액 pH를 낮추고(5.0 이상) 질산암모늄을 추가하세요.",
  7: "급액 pH를 낮추고(5.0 이상) 질산암모늄을 추가하세요.",
  8: "pH를 낮추기 어렵습니다. 급액 pH를 5.0으로 맞추고 질산암모늄을 추가하세요.",
};

export function nh4Combination({ pH, NH4 = 0, HCO3 = 0 }) {
  if (!Number.isFinite(pH)) return { code: 0, advice: "" };
  const phBand = pH <= 5.0 ? 0 : pH <= 5.5 ? 1 : pH <= 6.0 ? 2 : pH <= 6.5 ? 3 : 4;
  const nh4Band = NH4 < 0.5 ? 0 : NH4 < 1.0 ? 1 : NH4 < 1.5 ? 2 : 3;
  const hco3Band = HCO3 < 0.5 ? 0 : HCO3 <= 1.0 ? 1 : 2;
  const code = NH4_CODE_TABLE[nh4Band][hco3Band][phBand];
  return { code, advice: NH4_ADVICE[code] || "" };
}

// 배액 분석값을 작물 기준 EC(c)로 환산. 측정 EC가 있으면 그것을, 없으면 이온 합 추정값을 쓴다.
export function scaleDrainToReference(drain, ecRef) {
  const d = normalizeComposition(drain);
  const ecMeasured = d.EC > 0 ? d.EC : estimateEC(d);
  const ecV = ecMeasured - 0.1 * Math.max(d.Na, d.Cl);
  const factor = ecV > EPS && ecRef > 0 ? ecRef / ecV : 1;
  const scaled = { ...d, EC: ecRef };
  for (const ion of SCALED_IONS) scaled[ion] = d[ion] * factor;
  return { scaled, factor, ecV, ecMeasured };
}

// 양이온합과 음이온합을 referenceSum(meq/L)에 맞춘다. NH4, Na는 고정하고 K:Ca:Mg 비율 유지,
// PO4, Cl, HCO3는 고정하고 NO3:SO4 비율 유지.
export function equalizeIonSums(composition, referenceSum) {
  const c = { ...composition };
  const fixedCat = c.NH4 + c.Na;
  const varCat = c.K + 2 * c.Ca + 2 * c.Mg;
  if (varCat > EPS) {
    const f = (referenceSum - fixedCat) / varCat;
    if (f > 0) {
      c.K *= f;
      c.Ca *= f;
      c.Mg *= f;
    }
  }
  const fixedAn = c.PO4 + c.Cl + c.HCO3;
  const varAn = c.NO3 + 2 * c.SO4;
  if (varAn > EPS) {
    const f = (referenceSum - fixedAn) / varAn;
    if (f > 0) {
      c.NO3 *= f;
      c.SO4 *= f;
    }
  }
  return c;
}

// drain: 배액(근권) 분석값, tables: 작물·재배방식별 보정표(target_drain.json의 한 항목),
// standard: 보정할 표준 조성, drainPH: 배액 pH (없으면 drain.pH)
export function adviseDrainCorrection({ drain, tables, standard, drainPH }) {
  if (!tables) return null;
  const targets = normalizeComposition(tables.targets || {});
  const s = normalizeComposition(standard);
  const d = normalizeComposition(drain);
  const ecRef = tables.ecRef > 0 ? tables.ecRef : estimateEC(targets);
  const { scaled, factor, ecV, ecMeasured } = scaleDrainToReference(d, ecRef);
  const pH = Number.isFinite(drainPH) ? drainPH : d.pH;
  const lowPH = Number.isFinite(pH) && pH < 6.5;

  const corrections = {};
  const classes = {};
  for (const [ion, table] of Object.entries(tables.macro || {})) {
    const r = stepForClass(table, scaled[ion], { lowPH });
    corrections[ion] = r.step;
    classes[ion] = r.relative;
  }

  let kCaApplied = false;
  const kCa = tables.kCa;
  if (kCa && classes.K === 0 && classes.Ca === 0 && scaled.Ca > EPS && scaled.K / scaled.Ca > kCa.factor) {
    corrections.K = (corrections.K || 0) + kCa.deltaK;
    corrections.Ca = (corrections.Ca || 0) + kCa.deltaCa;
    kCaApplied = true;
  }

  for (const [ion, table] of Object.entries(tables.micro || {})) {
    const r = stepForClass(table, d[ion]);
    corrections[ion] = (s[ion] * r.step) / 100;
    classes[ion] = r.relative;
  }

  const combo = nh4Combination({ pH, NH4: d.NH4, HCO3: d.HCO3 });
  const extraNH4 = combo.code >= 6 ? Number(tables.nh4Extra?.[combo.code - 6]) || 0 : 0;
  corrections.NH4 = extraNH4;

  const corrected = { ...s };
  for (const [ion, delta] of Object.entries(corrections)) corrected[ion] = Math.max(0, s[ion] + delta);
  const referenceSum = (cationMeq(s) + anionMeq(s)) / 2;
  const correctedStandard = equalizeIonSums(corrected, referenceSum);

  return {
    source: tables.source,
    targets: { ...targets, EC: ecRef },
    drain: { ...d, EC: ecMeasured },
    scaledDrain: scaled,
    scaleFactor: factor,
    ecRef,
    ecV,
    ecMeasured,
    drainPH: pH,
    classes,
    corrections,
    kCaApplied,
    nh4: { code: combo.code, advice: combo.advice, extra: extraNH4 },
    referenceSum,
    correctedStandard,
  };
}
