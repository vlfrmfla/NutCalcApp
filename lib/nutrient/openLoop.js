// 기준수(원수 또는 배액 혼합수)와 표준 조성으로부터 비료로 추가해야 할 양을 구한다.
import { ALL_IONS, MICRO_IONS, NUTRIENT_MACRO_IONS, estimateEC } from "./ions.js";
import { normalizeComposition } from "./composition.js";

const EPS = 1e-9;
const fmt = (x, d = 2) => Number(x).toFixed(d);

// 배액과 원수를 혼합한 기준수. drainFraction은 0~1 (급액 중 배액 부피 비율).
export function mixWater(rawWater, drain, drainFraction) {
  const f = Math.min(1, Math.max(0, Number(drainFraction) || 0));
  const w = normalizeComposition(rawWater);
  const d = normalizeComposition(drain);
  const out = {};
  for (const ion of ALL_IONS) out[ion] = (1 - f) * w[ion] + f * d[ion];
  out.EC = estimateEC(out);
  if (w.EC !== undefined && d.EC !== undefined) out.ECMeasured = (1 - f) * w.EC + f * d.EC;
  out.drainFraction = f;
  return out;
}

// 추가 필요량 = 표준 − 기준수 (음수는 0으로 막고 경고). HCO3는 산 중화량으로 바꾼다.
export function computeAdditions(standard, baseWater, { hco3Target = 0.5, naLimit = 6, clLimit = 6, supplyCl = false } = {}) {
  const s = normalizeComposition(standard);
  const b = normalizeComposition(baseWater);
  const additions = {};
  const excess = {};
  const warnings = [];

  for (const ion of [...NUTRIENT_MACRO_IONS, ...MICRO_IONS]) {
    const a = s[ion] - b[ion];
    if (a < -EPS) {
      excess[ion] = -a;
      additions[ion] = 0;
    } else {
      additions[ion] = a;
    }
  }
  additions.Na = 0;
  additions.HCO3 = 0;
  const clNeed = s.Cl - b.Cl;
  if (supplyCl) {
    additions.Cl = clNeed > EPS ? clNeed : 0;
  } else {
    additions.Cl = 0;
    if (clNeed > EPS) {
      warnings.push({
        level: "info",
        code: "cl_not_supplied",
        ion: "Cl",
        message: `표준 조성의 Cl ${fmt(s.Cl)} mmol/L는 Cl 비료(염화칼슘)를 쓰지 않는 설정이라 공급하지 않습니다. 그만큼 NO₃가 늘어납니다 (1999 자료: Cl 조정은 NO₃로 상계).`,
      });
    }
  }

  for (const [ion, amount] of Object.entries(excess)) {
    const unit = MICRO_IONS.includes(ion) ? "µmol/L" : "mmol/L";
    warnings.push({
      level: "warning",
      code: "base_exceeds_target",
      ion,
      message: `기준수의 ${ion} ${fmt(b[ion])} ${unit}가 목표 ${fmt(s[ion])}보다 ${fmt(amount)} 높습니다. 비료로는 줄일 수 없어 최종 급액에서 초과됩니다.`,
    });
  }
  if (b.Na > naLimit) {
    warnings.push({ level: "warning", code: "na_high", ion: "Na", message: `기준수 Na가 ${fmt(b.Na)} mmol/L입니다. 작물별 배출 기준(토마토 8, 파프리카 6, 딸기 3 mmol/L)을 확인하세요.` });
  }
  if (b.Cl > clLimit) {
    warnings.push({ level: "warning", code: "cl_high", ion: "Cl", message: `기준수 Cl이 ${fmt(b.Cl)} mmol/L로 높습니다.` });
  }

  const target = Math.max(0, Number(hco3Target) || 0);
  const acidDemand = Math.max(0, b.HCO3 - target);
  const residualHCO3 = b.HCO3 - acidDemand;

  return { additions, excess, acidDemand, residualHCO3, warnings, standard: s, base: b };
}

// 급액 EC 목표에 맞춰 추가량을 비례 조정한다. NH4는 pH 관리용이라 고정한다.
export function scaleToEC(additions, baseWater, supplyEC, { fixedIons = ["NH4"] } = {}) {
  const b = normalizeComposition(baseWater);
  const baseEC = estimateEC(b);
  const fixedPart = {};
  const scalablePart = {};
  for (const [ion, v] of Object.entries(additions)) {
    (fixedIons.includes(ion) ? fixedPart : scalablePart)[ion] = v;
  }
  const fixedEC = estimateEC(fixedPart);
  const scalableEC = estimateEC(scalablePart);
  const warnings = [];

  if (!(supplyEC > 0)) {
    return { additions: { ...additions }, factor: 1, baseEC, fixedEC, scalableEC, warnings };
  }

  const required = supplyEC - baseEC - fixedEC;
  let factor = 1;
  if (scalableEC > EPS) factor = Math.max(0, required / scalableEC);
  if (required < 0) {
    warnings.push({
      level: "warning",
      code: "ec_below_base",
      message: `급액 EC ${fmt(supplyEC)} dS/m는 기준수 EC ${fmt(baseEC)}와 고정 이온(NH₄)만으로도 넘습니다. 비료를 넣지 않아도 목표 EC를 초과합니다.`,
    });
  }
  const scaled = {};
  for (const [ion, v] of Object.entries(additions)) scaled[ion] = fixedIons.includes(ion) ? v : v * factor;
  return { additions: scaled, factor, baseEC, fixedEC, scalableEC, warnings };
}
