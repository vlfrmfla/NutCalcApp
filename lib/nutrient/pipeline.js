// 표준 조성 + 기준수 + 설정 → 추가량, EC 연동, 비료 처방, 최종 급액 조성까지 한 번에 계산.
import { addCompositions, estimateEC } from "./ions.js";
import { normalizeComposition } from "./composition.js";
import { mixWater, computeAdditions, scaleToEC } from "./openLoop.js";
import { solveRecipe } from "./recipe.js";
import { adviseDrainCorrection } from "./drainCorrection.js";

export function computeSupplyPlan({
  standard,
  rawWater,
  drain = null,
  mode = "비순환식",
  drainMixRatio = 0, // 급액 중 배액 비율 (%)
  drainTables = null, // target_drain.json의 작물 항목 { naMax, 비순환식: {...}, 순환식: {...} }
  applyDrainCorrection = false,
  drainPH,
  hco3Target = 0.5,
  supplyEC = null, // null이면 기준수 + 표준 조성 EC를 그대로 쓴다
  nSource = "4수염",
  pSource = "제일인산칼륨",
  acidType = "질산",
  feSource = "Fe-DTPA",
  clSource = "none",
  tankVolume = 1000,
  concentration = 100,
}) {
  const std = normalizeComposition(standard);
  const recirculating = mode === "순환식" && !!drain;

  // 1. 기준수
  let base = normalizeComposition(rawWater);
  let baseLabel = "원수";
  if (recirculating) {
    base = mixWater(rawWater, drain, drainMixRatio / 100);
    baseLabel = `혼합수 (배액 ${Math.round(drainMixRatio)}%)`;
  }

  // 2. 배액(근권) 분석 기반 보정 (선택). 비순환식은 자유배액 표, 순환식은 폐쇄계 표를 쓴다.
  let advice = null;
  let effectiveStandard = std;
  const tables = drainTables?.[mode] || null;
  if (applyDrainCorrection && drain && tables) {
    advice = adviseDrainCorrection({ drain, tables, standard: std, drainPH });
    effectiveStandard = advice.correctedStandard;
  }

  // 3. 추가 필요량
  const naLimit = drainTables?.naMax > 0 ? drainTables.naMax : 6;
  const open = computeAdditions(effectiveStandard, base, { hco3Target, naLimit, supplyCl: clSource === "CaCl2" });

  // 4. 급액 EC 연동
  const defaultSupplyEC = estimateEC(base) + estimateEC(open.additions);
  const targetEC = supplyEC > 0 ? supplyEC : defaultSupplyEC;
  const scaled = scaleToEC(open.additions, base, targetEC);

  // 5. 비료 처방
  const recipe = solveRecipe(scaled.additions, {
    acidDemand: open.acidDemand,
    nSource,
    pSource,
    acidType,
    feSource,
    clSource,
    tankVolume,
    concentration,
  });

  // 6. 최종 급액 조성 = 중화 후 기준수 + 비료 공급 이온
  const baseAfterAcid = { ...base, HCO3: open.residualHCO3 };
  const final = addCompositions(baseAfterAcid, recipe.supplied);
  final.EC = estimateEC(final);
  if (std.pH !== undefined) final.pH = std.pH;

  // 비교 기준: 기준수 + EC 연동된 추가량
  const target = addCompositions(baseAfterAcid, scaled.additions);
  target.EC = estimateEC(target);

  return {
    mode: recirculating ? "순환식" : "비순환식",
    baseLabel,
    base,
    standard: std,
    effectiveStandard,
    advice,
    additions: open.additions,
    excess: open.excess,
    acidDemand: open.acidDemand,
    residualHCO3: open.residualHCO3,
    scaledAdditions: scaled.additions,
    ecFactor: scaled.factor,
    baseEC: scaled.baseEC,
    defaultSupplyEC,
    supplyEC: targetEC,
    recipe,
    target,
    final,
    warnings: [...open.warnings, ...scaled.warnings, ...recipe.warnings],
  };
}
