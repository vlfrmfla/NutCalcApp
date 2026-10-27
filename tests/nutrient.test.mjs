import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  estimateEC, chargeBalance, cationMeq, anionMeq,
  normalizeComposition, toNumber, validateComposition,
  gramsPerMole, FERTILIZERS,
  solveRecipe, computeAdditions, scaleToEC, mixWater,
  adviseDrainCorrection, classIndex, stepForClass, nh4Combination, scaleDrainToReference, equalizeIonSums,
  computeSupplyPlan,
} from "../lib/nutrient/index.js";

const nutrientData = JSON.parse(readFileSync(new URL("../public/nutrient_solution.json", import.meta.url), "utf-8"));
const targetDrainData = JSON.parse(readFileSync(new URL("../public/target_drain.json", import.meta.url), "utf-8"));

// 1999 자료 3.2.2 A 토마토 표준양액(EC 2.6). 라이브러리 테스트는 데이터 파일과 독립적으로 이 값을 쓴다.
const TOMATO = { EC: 2.6, pH: 5.3, NH4: 1.2, NO3: 16, PO4: 1.5, K: 9.5, Ca: 5.4, Mg: 2.4, SO4: 4.4, Cl: 0, Na: 0, HCO3: 0, Fe: 15, Mn: 10, B: 30, Zn: 5, Cu: 0.75, Mo: 0.5 };
const CLEAN_WATER = { EC: 0.21, pH: 7.76, NH4: 0, NO3: 0.57, PO4: 0, K: 0.12, Ca: 0.29, Mg: 0.4, SO4: 0.35, Cl: 0.46, Na: 0, HCO3: 0, Fe: 0, Mn: 0, B: 0, Zn: 0, Cu: 0, Mo: 0 };
const HARD_WATER = { ...CLEAN_WATER, HCO3: 2.0, Na: 1.5, Cl: 1.2, Ca: 1.0, Mg: 0.8 };
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (±${tol})`);

test("ions: 토마토 표준양액은 전하 균형이 맞고 EC는 2.63", () => {
  near(chargeBalance(TOMATO), 0);
  near(estimateEC(TOMATO), 2.63, 1e-6);
  near(cationMeq(TOMATO), 26.3);
  near(anionMeq(TOMATO), 26.3);
});

test("composition: 문자열 값과 별칭 키를 정규화한다", () => {
  assert.equal(toNumber("<2.0"), 0);
  assert.equal(toNumber("-"), 0);
  assert.equal(toNumber("1,234.5"), 1234.5);
  const c = normalizeComposition({ P: 1.5, S: 2, Na: "<2.0", EC: "-", pH: 5.5 });
  assert.equal(c.PO4, 1.5);
  assert.equal(c.SO4, 2);
  assert.equal(c.Na, 0);
  assert.equal(c.EC, undefined);
  assert.equal(c.pH, 5.5);
});

test("composition: 전하 불균형 조성을 잡아낸다", () => {
  const ok = validateComposition(TOMATO);
  assert.ok(!ok.issues.some((i) => i.code === "charge_imbalance"));
  // 예전 배지채움 값(양이온 16.6 / 음이온 26.8 meq)
  const bad = validateComposition({ NH4: 0.2, NO3: 14.5, PO4: 1.5, K: 6.65, Ca: 3.4, Mg: 1.45, SO4: 5.4 });
  assert.ok(bad.issues.some((i) => i.code === "charge_imbalance" && i.level === "error"));
  const missing = validateComposition({ NH4: 1, NO3: 10, K: 5, Ca: 3, Mg: 1, SO4: 1 });
  assert.ok(missing.issues.some((i) => i.code === "missing_ion" && i.ion === "PO4"));
});

test("fertilizers: 제품 질량은 순도와 원소 함량을 반영한다", () => {
  near(gramsPerMole("HNO3"), 63.01 / 0.6, 1e-9);
  near(gramsPerMole("Fe_DTPA"), 55.845 / 0.06, 1e-9);
  near(gramsPerMole("Borax"), 381.37, 1e-9);
  near(gramsPerMole("NH4NO3"), 80.04 / 0.514, 1e-9);
});

test("recipe: 토마토/깨끗한 원수의 기본 처방", () => {
  const open = computeAdditions(TOMATO, CLEAN_WATER, { hco3Target: 0.5 });
  assert.equal(open.acidDemand, 0);
  const r = solveRecipe(open.additions, { acidDemand: open.acidDemand });
  near(r.amounts.CaNO3_4H2O, 5.11, 1e-9);
  near(r.amounts.NH4NO3, 1.2, 1e-9);
  near(r.amounts.KH2PO4, 1.5, 1e-9);
  near(r.amounts.MgSO4, 2.0, 1e-9);
  near(r.amounts.K2SO4, 2.05, 1e-9);
  near(r.amounts.KNO3, 3.78, 1e-9);
  near(r.supplied.K, 9.38, 1e-9);
  near(r.supplied.NO3, 15.2, 1e-9);
  for (const v of Object.values(r.amounts)) assert.ok(v >= 0 && Number.isFinite(v));
  assert.ok(!r.warnings.some((w) => w.level === "warning"), JSON.stringify(r.warnings));
});

test("recipe: 붕사는 B 4몰당 1몰, 질산은 60% 제품 질량과 부피", () => {
  const r = solveRecipe({ B: 30 }, { acidDemand: 1.0, tankVolume: 1000, concentration: 100 });
  near(r.stock.Borax.grams, (30e-6 * 100 * 1000 / 4) * 381.37, 1e-6);
  near(r.stock.HNO3.kg, (0.001 * 100 * 1000 * 63.01) / 0.6 / 1000, 1e-9);
  near(r.stock.HNO3.liters, r.stock.HNO3.kg / 1.37, 1e-9);
});

test("recipe: SO4 < Mg 이면 질산마그네슘을 쓰고 음수가 없다", () => {
  const r = solveRecipe({ NH4: 1.2, K: 9.38, Ca: 5.11, Mg: 2.0, NO3: 15.43, SO4: 0.65, PO4: 1.5 });
  near(r.amounts.MgSO4, 0.65, 1e-9);
  near(r.amounts.MgNO3, 1.35, 1e-9);
  assert.equal(r.amounts.K2SO4, 0);
  for (const v of Object.values(r.amounts)) assert.ok(v >= 0);
  near(r.supplied.Mg, 2.0, 1e-9);
  near(r.supplied.SO4, 0.65, 1e-9);
  assert.ok(r.warnings.some((w) => w.code === "mg_nitrate_used"));
});

test("recipe: K가 부족하면 황산칼륨을 줄이고 SO4 부족을 경고한다", () => {
  const r = solveRecipe({ NH4: 1.2, K: 3.88, Ca: 5.11, Mg: 2.0, NO3: 15.43, SO4: 4.05, PO4: 1.5 });
  assert.equal(r.amounts.KNO3, 0);
  near(r.amounts.K2SO4, (3.88 - 1.5) / 2, 1e-9);
  near(r.supplied.K, 3.88, 1e-9);
  assert.ok(r.warnings.some((w) => w.code === "so4_shortfall"));
  for (const v of Object.values(r.amounts)) assert.ok(v >= 0);
});

test("recipe: 10수염에서 NH4 목표가 Ca/5보다 작으면 초과 경고", () => {
  const r = solveRecipe({ NH4: 0.2, K: 9.38, Ca: 5.11, Mg: 2.0, NO3: 15.43, SO4: 4.05, PO4: 1.5 }, { nSource: "10수염" });
  assert.equal(r.amounts.NH4NO3, 0);
  near(r.supplied.NH4, 5.11 / 5, 1e-9);
  near(r.supplied.Ca, 5.11, 1e-9);
  assert.ok(r.warnings.some((w) => w.code === "nh4_excess_from_ca_source"));
});

test("recipe: 인산 중화는 KH2PO4를 줄이고 K는 KNO3로 보충한다", () => {
  const r = solveRecipe({ NH4: 1.2, K: 9.38, Ca: 5.11, Mg: 2.0, NO3: 15.43, SO4: 4.05, PO4: 1.5 }, { acidDemand: 1.0, acidType: "인산" });
  near(r.amounts.H3PO4, 1.0, 1e-9);
  near(r.amounts.KH2PO4, 0.5, 1e-9);
  assert.equal(r.amounts.HNO3, 0);
  near(r.supplied.PO4, 1.5, 1e-9);
  near(r.supplied.K, 9.38, 1e-9);
  near(r.amounts.KNO3, 9.38 - 0.5 - 2 * 2.05, 1e-9);
});

test("recipe: 제일인산암모늄은 NH4 한도까지 쓰고 나머지는 인산칼륨", () => {
  const r = solveRecipe({ NH4: 1.2, K: 9.38, Ca: 5.11, Mg: 2.0, NO3: 15.43, SO4: 4.05, PO4: 1.5 }, { pSource: "제일인산암모늄" });
  near(r.amounts.NH4H2PO4, 1.2, 1e-9);
  near(r.amounts.KH2PO4, 0.3, 1e-9);
  assert.equal(r.amounts.NH4NO3, 0);
  near(r.supplied.NH4, 1.2, 1e-9);
  near(r.supplied.PO4, 1.5, 1e-9);
});

test("recipe: 질산칼륨 분배로 A/B 탱크 질량이 같아진다", () => {
  const open = computeAdditions(TOMATO, CLEAN_WATER);
  const r = solveRecipe(open.additions);
  assert.ok(r.stock.KNO3_A && r.stock.KNO3_B);
  near(r.tanks.massA, r.tanks.massB, 1e-9);
  assert.equal(r.tanks.A.some((e) => e.key === "HNO3"), false);
});

test("openLoop: 중탄산 중화량, 초과 이온, Na 경고", () => {
  const open = computeAdditions(TOMATO, HARD_WATER, { hco3Target: 0.5 });
  near(open.acidDemand, 1.5, 1e-9);
  near(open.residualHCO3, 0.5, 1e-9);
  assert.equal(open.additions.Na, 0);
  assert.equal(open.additions.Cl, 0);
  const strawberry = nutrientData["딸기"]["코이어배지"]["일본야마자키"];
  const open2 = computeAdditions(strawberry, { ...CLEAN_WATER, Mg: 1.5, Ca: 2.5 });
  assert.equal(open2.additions.Mg, 0);
  assert.ok(open2.warnings.some((w) => w.code === "base_exceeds_target" && w.ion === "Mg"));
  const open3 = computeAdditions(TOMATO, { ...CLEAN_WATER, Na: 7 });
  assert.ok(open3.warnings.some((w) => w.code === "na_high"));
});

test("openLoop: EC 연동은 NH4를 고정하고 나머지를 비례 조정한다", () => {
  const open = computeAdditions(TOMATO, CLEAN_WATER);
  const scaled = scaleToEC(open.additions, CLEAN_WATER, 2.0);
  near(scaled.additions.NH4, open.additions.NH4, 1e-9);
  near(scaled.additions.K / open.additions.K, scaled.factor, 1e-9);
  const supply = { ...CLEAN_WATER };
  for (const [ion, v] of Object.entries(scaled.additions)) supply[ion] = (supply[ion] || 0) + v;
  near(estimateEC(supply), 2.0, 1e-9);
});

test("openLoop: 배액 혼합은 부피 비율대로 섞인다", () => {
  const mixed = mixWater(CLEAN_WATER, TOMATO, 0.3);
  near(mixed.K, 0.7 * 0.12 + 0.3 * 9.5, 1e-9);
  near(mixed.NO3, 0.7 * 0.57 + 0.3 * 16, 1e-9);
});

test("drainCorrection: 등급 경계는 첫 값 미만, 나머지 이하", () => {
  const upper = [5.0, 6.4, 10.0, 13.0];
  assert.equal(classIndex(upper, 4.9), 0);
  assert.equal(classIndex(upper, 5.0), 1);
  assert.equal(classIndex(upper, 6.4), 1);
  assert.equal(classIndex(upper, 6.45), 2);
  assert.equal(classIndex(upper, 10.0), 2);
  assert.equal(classIndex(upper, 10.1), 3);
  assert.equal(classIndex(upper, 13.0), 3);
  assert.equal(classIndex(upper, 13.1), 4);
  const mg = { upper: [2.7, 6.5], steps: [0.5, 0, -0.25] };
  assert.deepEqual(stepForClass(mg, 1.0), { idx: 0, step: 0.5, relative: -1 });
  assert.deepEqual(stepForClass(mg, 7.0), { idx: 2, step: -0.25, relative: 1 });
  const p = { upper: [0.7, 2.0], steps: [0.25, 0, -0.25], lowPhStep: 0.5 };
  assert.equal(stepForClass(p, 0.5).step, 0.25);
  assert.equal(stepForClass(p, 0.5, { lowPH: true }).step, 0.5);
});

test("drainCorrection: 1999 자료 부록 예제(토마토, 자유배액)를 재현한다", () => {
  // Bijlage Tabel 1: 근권 분석 EC 5.2, pH 7, NH4 0.1, K 6.2, Na 4.9, Ca 12.1, Mg 7.5, NO3 17.1, Cl 9.7,
  // SO4 11, HCO3 0.5, P 0.75, Fe 26.3, Mn 9.3, Zn 9.9, B 5, Cu 1.2, Mo 1.1 → EC(c) 3.7 환산 후 보정
  const mat = { EC: 5.2, pH: 7, NH4: 0.1, K: 6.2, Na: 4.9, Ca: 12.1, Mg: 7.5, NO3: 17.1, Cl: 9.7, SO4: 11, HCO3: 0.5, PO4: 0.75, Fe: 26.3, Mn: 9.3, Zn: 9.9, B: 5, Cu: 1.2, Mo: 1.1 };
  const tables = targetDrainData["토마토"]["비순환식"];
  const { scaled, factor, ecV } = scaleDrainToReference(mat, tables.ecRef);
  near(ecV, 5.2 - 0.97, 1e-9);
  near(factor, 3.7 / 4.23, 1e-9);
  near(scaled.K, 5.4, 0.05);
  near(scaled.Ca, 10.6, 0.05);
  near(scaled.Mg, 6.6, 0.05);
  near(scaled.NO3, 15.0, 0.05);
  near(scaled.SO4, 9.6, 0.05);
  near(scaled.PO4, 0.66, 0.01);
  assert.equal(scaled.NH4, 0.1, "NH4는 환산하지 않는다");
  assert.equal(scaled.Fe, 26.3, "미량원소는 환산하지 않는다");

  const a = adviseDrainCorrection({ drain: mat, tables, standard: TOMATO });
  near(a.corrections.K, 1.5, 1e-9);
  near(a.corrections.Ca, 0, 1e-9);
  near(a.corrections.Mg, -0.25, 1e-9);
  near(a.corrections.NO3, 1.5, 1e-9);
  near(a.corrections.SO4, -1.0, 1e-9);
  near(a.corrections.PO4, 0.25, 1e-9);
  near(a.corrections.NH4, 0.6, 1e-9); // pH 7, NH4 < 0.5, HCO3 0.5–1.0 → 조합 7 → b = 0.6
  assert.equal(a.nh4.code, 7);
  near(a.corrections.B, TOMATO.B * 0.5, 1e-9); // B 5 → 등급 1 → +50%
  near(a.corrections.Mn, 0, 1e-9);
  near(a.corrections.Zn, 0, 1e-9);
  near(a.corrections.Cu, 0, 1e-9);
  near(a.corrections.Mo, 0, 1e-9);
  assert.equal(a.kCaApplied, false);
  // 이온합은 표준 조성(26.3 meq)으로 되돌아오고 NH4·P는 고정
  near(cationMeq(a.correctedStandard), 26.3, 1e-9);
  near(anionMeq(a.correctedStandard), 26.3, 1e-9);
  near(a.correctedStandard.NH4, 1.2 + 0.6, 1e-9);
  near(a.correctedStandard.PO4, 1.75, 1e-9);
  assert.ok(a.correctedStandard.K > TOMATO.K, "K는 표준보다 높아야 한다");
  assert.ok(a.correctedStandard.SO4 < TOMATO.SO4, "SO4는 표준보다 낮아야 한다");
  // K:Ca:Mg 비율 유지
  const c = a.correctedStandard;
  near(c.K / c.Ca, (TOMATO.K + 1.5) / TOMATO.Ca, 1e-9);
});

test("drainCorrection: K/Ca 비율 규칙은 둘 다 정상 등급일 때만, pH 조합표, 폐쇄계 표", () => {
  const tables = targetDrainData["토마토"]["순환식"];
  // K 9.0, Ca 8.0 (둘 다 정상), K/Ca 1.125 > 1.1 → -1.0 K, +0.5 Ca (gesloten)
  const drain = { EC: 3.7, pH: 5.5, NH4: 0.1, K: 9.0, Ca: 8.0, Mg: 4.0, NO3: 20, SO4: 5, PO4: 1.0, HCO3: 0.2, Fe: 25, Mn: 7, Zn: 7, B: 50, Cu: 0.7, Mo: 0.5 };
  const a = adviseDrainCorrection({ drain, tables, standard: TOMATO });
  assert.equal(a.kCaApplied, true);
  near(a.corrections.K, -1.0, 1e-9);
  near(a.corrections.Ca, 0.5, 1e-9);
  assert.equal(a.nh4.code, 0);
  for (const ion of ["Fe", "Mn", "Zn", "B", "Cu", "Mo"]) assert.ok(Number.isFinite(a.corrections[ion]));

  // Mg 매우 높음(폐쇄계 4−: 0.5), Mn 낮음(2+: +25%)
  const a2 = adviseDrainCorrection({ drain: { ...drain, Mg: 9, Mn: 1 }, tables, standard: TOMATO });
  near(a2.corrections.Mg, -0.5, 1e-9);
  near(a2.corrections.Mn, TOMATO.Mn * 0.25, 1e-9);

  assert.equal(nh4Combination({ pH: 7.0, NH4: 0.1, HCO3: 1.5 }).code, 8);
  assert.equal(nh4Combination({ pH: 5.8, NH4: 0.1, HCO3: 1.5 }).code, 6);
  assert.equal(nh4Combination({ pH: 4.8, NH4: 0.1, HCO3: 0.2 }).code, 1);
  assert.equal(nh4Combination({ pH: 7.0, NH4: 1.8, HCO3: 0.2 }).code, 4);
  assert.equal(nh4Combination({ pH: 5.8, NH4: 0.1, HCO3: 0.2 }).code, 0);
  assert.equal(nh4Combination({ pH: undefined, NH4: 0.1, HCO3: 2 }).code, 0);

  const eq = equalizeIonSums({ NH4: 1.2, K: 11, Na: 0, Ca: 5.4, Mg: 2.4, NO3: 16, Cl: 0, SO4: 4.4, PO4: 1.5, HCO3: 0 }, 26.3);
  near(cationMeq(eq), 26.3, 1e-9);
  near(anionMeq(eq), 26.3, 1e-9);
  near(eq.K / eq.Ca, 11 / 5.4, 1e-9);
});

test("pipeline: 비순환식 기본 EC는 기준수 + 표준 조성 EC", () => {
  const plan = computeSupplyPlan({ standard: TOMATO, rawWater: CLEAN_WATER });
  near(plan.supplyEC, plan.defaultSupplyEC, 1e-9);
  near(plan.ecFactor, 1, 1e-9);
  near(plan.final.K, 9.5, 1e-9);
  near(plan.final.Ca, 5.4, 1e-9);
  near(plan.final.EC, plan.supplyEC, 0.05);
  assert.ok(plan.recipe.tanks.A.length > 0 && plan.recipe.tanks.B.length > 0);
});

test("pipeline: 순환식에서 배액이 표준 조성과 같고 100% 재사용이면 추가량이 0", () => {
  const plan = computeSupplyPlan({ standard: TOMATO, rawWater: CLEAN_WATER, drain: TOMATO, mode: "순환식", drainMixRatio: 100 });
  for (const ion of ["K", "Ca", "Mg", "NO3", "SO4", "PO4", "NH4"]) near(plan.additions[ion], 0, 1e-9);
  assert.equal(plan.recipe.tanks.A.length + plan.recipe.tanks.B.length, 0);
});

test("pipeline: 보정 적용 시 모드에 맞는 표가 쓰이고 보정된 표준은 전하가 맞는다", () => {
  const drain = { EC: 3.7, pH: 6.3, NH4: 0.1, K: 3, Ca: 9, Mg: 4, NO3: 20, SO4: 5, PO4: 1.0, HCO3: 0.3, Fe: 25, Mn: 7, Zn: 7, B: 50, Cu: 0.7, Mo: 0.5 };
  const closed = computeSupplyPlan({
    standard: TOMATO, rawWater: CLEAN_WATER, drain, mode: "순환식", drainMixRatio: 30,
    drainTables: targetDrainData["토마토"], applyDrainCorrection: true,
  });
  assert.ok(closed.advice);
  assert.equal(closed.advice.source, targetDrainData["토마토"]["순환식"].source);
  near(closed.advice.corrections.K, 4.0, 1e-9); // 폐쇄계 1+
  near(chargeBalance(closed.effectiveStandard), 0, 1e-9);
  assert.ok(closed.effectiveStandard.K > TOMATO.K, "K should be raised when drain K is low");

  const open = computeSupplyPlan({
    standard: TOMATO, rawWater: CLEAN_WATER, drain, mode: "비순환식",
    drainTables: targetDrainData["토마토"], applyDrainCorrection: true,
  });
  assert.ok(open.advice);
  near(open.advice.corrections.K, 3.0, 1e-9); // 자유배액 1+
  near(open.base.K, CLEAN_WATER.K, 1e-9, "비순환식은 배액을 섞지 않는다");

  const none = computeSupplyPlan({ standard: TOMATO, rawWater: CLEAN_WATER, drain, mode: "순환식", drainMixRatio: 30, drainTables: null, applyDrainCorrection: true });
  assert.equal(none.advice, null);
});

test("recipe: 2020 자료 토마토(불활성 배지) A/B 탱크 처방을 재현한다", () => {
  // Nutrient Solutions for Greenhouse Crops v4 p.53: Ca(NO3)2 solid 106 kg, KNO3 23+20 kg, CaCl2 6 kg,
  // Fe 6% 1396 g, KH2PO4 17 kg, MgSO4 59 kg, K2SO4 35 kg, MAP 3 kg, Borax 287 g, Na-molybdate 12 g (1000 L, 100배)
  const standard = { NH4: 1.2, K: 9.5, Ca: 5.4, Mg: 2.4, NO3: 15, Cl: 1, SO4: 4.4, PO4: 1.5, Fe: 15, Mn: 10, Zn: 5, B: 30, Cu: 0.75, Mo: 0.5 };
  const pure = { NH4: 0, K: 0, Ca: 0, Mg: 0, NO3: 0, Cl: 0, SO4: 0, PO4: 0, HCO3: 0, Na: 0 };
  const plan = computeSupplyPlan({ standard, rawWater: pure, nSource: "10수염", pSource: "제일인산암모늄", clSource: "CaCl2" });
  const kg = (k) => plan.recipe.stock[k]?.kg ?? 0;
  near(kg("CaNO3_10H2O"), 106, 1.0);
  near(kg("CaCl2"), 6, 1.0);
  near(kg("NH4H2PO4"), 3, 1.0);
  near(kg("KH2PO4"), 17, 1.0);
  near(kg("MgSO4"), 59, 1.0);
  near(kg("K2SO4"), 35, 1.0);
  near(kg("KNO3_A") + kg("KNO3_B"), 43, 1.0);
  near(plan.recipe.stock.Fe_DTPA.grams, 1396, 2);
  near(plan.recipe.stock.Borax.grams, 287, 2);
  near(plan.recipe.stock.NaMoO4.grams, 12, 0.5);
  near(plan.final.Cl, 1.0, 1e-9);
  near(plan.final.Ca, 5.4, 1e-9);
  assert.ok(!plan.warnings.some((w) => w.code === "cl_not_supplied"));
});

test("openLoop: Cl 비료를 쓰지 않으면 표준의 Cl은 안내만 하고 NO3가 그만큼 늘어난다", () => {
  const standard = { NH4: 1.2, K: 9.5, Ca: 5.4, Mg: 2.4, NO3: 15, Cl: 1, SO4: 4.4, PO4: 1.5 };
  const pure = { NH4: 0, K: 0, Ca: 0, Mg: 0, NO3: 0, Cl: 0, SO4: 0, PO4: 0, HCO3: 0, Na: 0 };
  const plan = computeSupplyPlan({ standard, rawWater: pure });
  assert.ok(plan.warnings.some((w) => w.code === "cl_not_supplied"));
  near(plan.final.Cl, 0, 1e-9);
  near(plan.final.NO3, 16, 1e-9);
  assert.equal(plan.recipe.stock.CaCl2, undefined);
});

test("데이터: 토마토 정식초기(Start)는 2020 자료 유기배지 표준 + Start 조정과 같다", () => {
  const c = nutrientData["토마토"]["코이어배지"]["정식초기(Start)"];
  assert.deepEqual(
    { NH4: c.NH4, K: c.K, Ca: c.Ca, Mg: c.Mg, NO3: c.NO3, Cl: c.Cl, SO4: c.SO4, PO4: c.PO4, Fe: c.Fe, B: c.B },
    { NH4: 1 - 1, K: 9.3 - 1, Ca: 5.5 + 0.5, Mg: 2.4 + 0.5, NO3: 14.8, Cl: 1, SO4: 4.4, PO4: 1.5, Fe: 30 + 10, B: 30 + 10 }
  );
  near(chargeBalance(c), 0, 1e-9);
});

test("데이터: 토마토 표준양액은 2020 자료 유기배지/불활성 배지 표준과 같다", () => {
  const organic = nutrientData["토마토"]["코이어배지"]["표준양액"];
  assert.deepEqual(
    { NH4: organic.NH4, K: organic.K, Ca: organic.Ca, Mg: organic.Mg, NO3: organic.NO3, Cl: organic.Cl, SO4: organic.SO4, PO4: organic.PO4, Fe: organic.Fe, B: organic.B, EC: organic.EC },
    { NH4: 1, K: 9.3, Ca: 5.5, Mg: 2.4, NO3: 14.8, Cl: 1, SO4: 4.4, PO4: 1.5, Fe: 30, B: 30, EC: 2.6 }
  );
  const inert = nutrientData["토마토"]["암면배지"]["표준양액"];
  assert.deepEqual(
    { NH4: inert.NH4, K: inert.K, Ca: inert.Ca, Mg: inert.Mg, NO3: inert.NO3, Cl: inert.Cl, Fe: inert.Fe },
    { NH4: 1.2, K: 9.5, Ca: 5.4, Mg: 2.4, NO3: 15, Cl: 1, Fe: 15 }
  );
});

test("데이터: 토마토 화방별 조성은 1999 자료 생육단계 코드를 표준에 적용한 값이다", () => {
  const g = nutrientData["토마토"]["코이어배지"];
  const std = g["표준양액"];
  const d = (name) => ({ K: +(g[name].K - std.K).toFixed(3), Ca: +(g[name].Ca - std.Ca).toFixed(3), Mg: +(g[name].Mg - std.Mg).toFixed(3), NO3: +(g[name].NO3 - std.NO3).toFixed(3) });
  assert.deepEqual(d("1화방개화"), { K: -1, Ca: 0.5, Mg: 0.5, NO3: 1 });
  assert.deepEqual(d("3화방개화"), { K: 0.5, Ca: -0.125, Mg: -0.125, NO3: 0 });
  assert.deepEqual(d("5화방개화"), { K: 1.75, Ca: -0.625, Mg: -0.25, NO3: 0 });
  assert.deepEqual(d("10화방개화"), { K: 0.5, Ca: -0.125, Mg: -0.125, NO3: 0 });
  assert.deepEqual(d("12화방개화"), { K: 0, Ca: 0, Mg: 0, NO3: 0 });
  for (const name of Object.keys(g)) near(chargeBalance(g[name]), 0, 1e-6);
});

test("데이터: 모든 표준 조성은 전하 균형이 맞고 출처가 있다", () => {
  let count = 0;
  for (const [crop, substrates] of Object.entries(nutrientData)) {
    for (const [substrate, comps] of Object.entries(substrates)) {
      for (const [name, comp] of Object.entries(comps)) {
        const v = validateComposition(comp);
        assert.ok(!v.issues.some((i) => i.code === "charge_imbalance"), `${crop}/${substrate}/${name} 전하 불균형`);
        count += 1;
      }
    }
  }
  assert.ok(count >= 130, `조성 수 ${count}`);
  // 2020/1999 자료에서 옮긴 조성에는 출처가 있다
  assert.ok(nutrientData["오이"]["암면배지"]["표준양액"]._source.includes("2020"));
  assert.ok(nutrientData["오이"]["코이어배지"]["네덜란드PBG(비순환식)"]._source.includes("1999"));
});

test("데이터: 배액 보정표 구조가 일관된다", () => {
  for (const [crop, entry] of Object.entries(targetDrainData)) {
    if (crop.startsWith("_")) continue;
    for (const mode of ["비순환식", "순환식"]) {
      const t = entry[mode];
      assert.ok(t && t.ecRef > 0, `${crop}/${mode}: ecRef`);
      for (const [ion, table] of Object.entries({ ...t.macro, ...t.micro })) {
        assert.equal(table.steps.length, table.upper.length + 1, `${crop}/${mode}/${ion}: steps vs upper`);
        assert.equal(table.steps.filter((x) => x === 0).length, 1, `${crop}/${mode}/${ion}: exactly one zero step`);
        for (let i = 1; i < table.upper.length; i++) assert.ok(table.upper[i] > table.upper[i - 1], `${crop}/${mode}/${ion}: upper ascending`);
      }
      assert.equal(t.nh4Extra.length, 3);
    }
  }
});

test("데이터: 모든 표준 조성이 기본 원수로 음수 없이 계산된다", () => {
  for (const [crop, substrates] of Object.entries(nutrientData)) {
    for (const [substrate, comps] of Object.entries(substrates)) {
      for (const [name, comp] of Object.entries(comps)) {
        const plan = computeSupplyPlan({ standard: comp, rawWater: HARD_WATER, nSource: "10수염", acidType: "인산" });
        for (const e of [...plan.recipe.tanks.A, ...plan.recipe.tanks.B]) {
          assert.ok(Number.isFinite(e.kg) && e.kg > 0, `${crop}/${substrate}/${name}: ${e.key} = ${e.kg}`);
        }
        assert.ok(Number.isFinite(plan.final.EC), `${crop}/${substrate}/${name}: EC NaN`);
      }
    }
  }
});
