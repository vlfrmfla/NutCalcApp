// 추가 필요량(mmol/L, 미량 µmol/L)으로부터 비료 종류별 투입량과 탱크 구성을 푼다.
// 원칙:
// - 양이온(NH4, K, Ca, Mg)과 PO4, SO4는 정확히 맞추고 NO3는 결과로 나오는 균형 이온이다.
// - 비료량은 절대 음수가 되지 않는다. 맞출 수 없는 경우 대체 비료를 쓰거나 경고를 남긴다.
import { MICRO_IONS } from "./ions.js";
import { FERTILIZERS, FE_SOURCES, MICRO_PRODUCTS, TANK_ORDER, gramsPerMole } from "./fertilizers.js";

const EPS = 1e-9;
const clamp0 = (x) => (x > EPS ? x : 0);
const fmt = (x, d = 2) => Number(x).toFixed(d);

export function solveRecipe(additions = {}, options = {}) {
  const {
    acidDemand = 0,
    nSource = "4수염",
    pSource = "제일인산칼륨",
    acidType = "질산",
    feSource = "Fe-DTPA",
    clSource = "none",
    tankVolume = 1000,
    concentration = 100,
  } = options;

  const need = {};
  for (const ion of ["NH4", "K", "Ca", "Mg", "NO3", "SO4", "PO4", "Cl"]) need[ion] = clamp0(Number(additions[ion]) || 0);
  if (clSource !== "CaCl2") need.Cl = 0;
  const needMicro = {};
  for (const ion of MICRO_IONS) needMicro[ion] = clamp0(Number(additions[ion]) || 0);

  const warnings = [];
  const amounts = {}; // 제품 mmol/L (미량원소 제품은 µmol/L)

  // 1. 산: 중탄산 중화
  const acid = clamp0(acidDemand);
  let HNO3 = 0;
  let H3PO4 = 0;
  if (acidType === "인산") {
    H3PO4 = Math.min(acid, need.PO4);
    HNO3 = clamp0(acid - H3PO4);
    if (HNO3 > EPS) {
      warnings.push({
        level: "info",
        code: "acid_phosphate_limited",
        message: `인산만으로는 중화량 ${fmt(acid)} mmol/L를 채울 수 없어 (PO₄ 목표 ${fmt(need.PO4)}) 나머지 ${fmt(HNO3)} mmol/L는 질산으로 중화합니다.`,
      });
    }
  } else {
    HNO3 = acid;
  }
  let PO4rem = clamp0(need.PO4 - H3PO4);

  // 2. 염소(선택): 염화칼슘 1몰 = Ca 1몰 + Cl 2몰
  let CaCl2 = 0;
  let CaRem = need.Ca;
  if (need.Cl > EPS) {
    CaCl2 = need.Cl / 2;
    if (CaCl2 > need.Ca + EPS) {
      warnings.push({
        level: "warning",
        code: "ca_excess_from_cacl2",
        message: `Cl ${fmt(need.Cl)} mmol/L를 염화칼슘으로 채우면 Ca가 목표보다 ${fmt(CaCl2 - need.Ca)} mmol/L 초과됩니다.`,
      });
    }
    CaRem = clamp0(need.Ca - CaCl2);
  }

  // 3. 칼슘과 그에 딸려오는 NH4
  let CaNO3_4H2O = 0;
  let CaNO3_10H2O = 0;
  let NH4fromCa = 0;
  if (nSource === "10수염") {
    CaNO3_10H2O = CaRem / 5;
    NH4fromCa = CaNO3_10H2O;
  } else {
    CaNO3_4H2O = CaRem;
  }
  let NH4rem = need.NH4 - NH4fromCa;
  if (NH4rem < -EPS) {
    warnings.push({
      level: "warning",
      code: "nh4_excess_from_ca_source",
      message: `10수염은 Ca 5몰당 NH₄ 1몰을 함께 공급하므로 NH₄가 목표보다 ${fmt(-NH4rem)} mmol/L 초과 공급됩니다. NH₄ 목표가 낮은 조성에는 4수염이 맞습니다.`,
    });
    NH4rem = 0;
  }

  // 4. 인산
  let NH4H2PO4 = 0;
  if (pSource === "제일인산암모늄") {
    NH4H2PO4 = Math.min(PO4rem, NH4rem);
    PO4rem = clamp0(PO4rem - NH4H2PO4);
    NH4rem = clamp0(NH4rem - NH4H2PO4);
    if (PO4rem > EPS) {
      warnings.push({
        level: "info",
        code: "p_source_limited_by_nh4",
        message: `제일인산암모늄은 NH₄ 목표(${fmt(need.NH4)} mmol/L) 범위까지만 쓰고, 나머지 PO₄ ${fmt(PO4rem)} mmol/L는 제일인산칼륨으로 공급합니다.`,
      });
    }
  }
  const KH2PO4 = PO4rem;
  const NH4NO3 = NH4rem;

  // 5. 마그네슘과 황
  const MgSO4 = Math.min(need.Mg, need.SO4);
  const MgNO3 = clamp0(need.Mg - MgSO4);
  if (MgNO3 > EPS) {
    warnings.push({
      level: "info",
      code: "mg_nitrate_used",
      message: `SO₄ 목표(${fmt(need.SO4)})가 Mg 목표(${fmt(need.Mg)})보다 작아 Mg ${fmt(MgNO3)} mmol/L는 질산마그네슘으로 공급합니다.`,
    });
  }
  const SO4rem = clamp0(need.SO4 - MgSO4);
  let K2SO4 = SO4rem; // K₂SO₄ 1몰 = SO₄ 1몰, K 2몰

  // 6. 칼륨: 인산칼륨과 황산칼륨으로 공급하고 남는 K는 질산칼륨
  let KNO3 = need.K - KH2PO4 - 2 * K2SO4;
  if (KNO3 < -EPS) {
    const K2SO4max = clamp0((need.K - KH2PO4) / 2);
    const SO4short = K2SO4 - K2SO4max;
    K2SO4 = K2SO4max;
    warnings.push({
      level: "warning",
      code: "so4_shortfall",
      message: `K 목표(${fmt(need.K)} mmol/L) 한도 때문에 황산칼륨을 줄여 SO₄가 ${fmt(SO4short)} mmol/L 부족하게 공급됩니다.`,
    });
    KNO3 = need.K - KH2PO4 - 2 * K2SO4;
    if (KNO3 < -EPS) {
      warnings.push({
        level: "warning",
        code: "k_excess_from_phosphate",
        message: `PO₄를 제일인산칼륨으로 모두 공급하면 K가 목표보다 ${fmt(-KNO3)} mmol/L 초과됩니다.`,
      });
      KNO3 = 0;
    }
  }

  Object.assign(amounts, { HNO3, H3PO4, CaNO3_4H2O, CaNO3_10H2O, CaCl2, NH4NO3, MgNO3, NH4H2PO4, KH2PO4, MgSO4, K2SO4, KNO3 });

  // 7. 미량원소
  const feKey = FE_SOURCES[feSource] || "Fe_DTPA";
  amounts[feKey] = needMicro.Fe / FERTILIZERS[feKey].supplies.Fe;
  for (const [ion, key] of Object.entries(MICRO_PRODUCTS)) {
    amounts[key] = needMicro[ion] / FERTILIZERS[key].supplies[ion];
  }

  // 8. 비료가 실제로 공급하는 이온
  const supplied = {};
  for (const [key, amount] of Object.entries(amounts)) {
    if (amount <= EPS) continue;
    for (const [ion, n] of Object.entries(FERTILIZERS[key].supplies)) {
      supplied[ion] = (supplied[ion] || 0) + n * amount;
    }
  }
  for (const ion of ["NH4", "K", "Ca", "Mg", "NO3", "SO4", "PO4", "Cl", ...MICRO_IONS]) supplied[ion] = supplied[ion] || 0;

  const no3diff = supplied.NO3 - need.NO3;
  if (Math.abs(no3diff) > Math.max(1.0, 0.1 * need.NO3)) {
    warnings.push({
      level: "warning",
      code: "no3_deviation",
      message: `NO₃는 양이온 균형의 결과로 정해지므로 목표 ${fmt(need.NO3)} mmol/L 대비 ${fmt(supplied.NO3)} mmol/L가 공급됩니다 (${no3diff > 0 ? "+" : ""}${fmt(no3diff)}). 조성의 전하 불균형이나 기준수 이온 초과가 원인입니다.`,
    });
  }

  // 9. 원액 탱크 투입량
  const stock = {};
  for (const [key, amount] of Object.entries(amounts)) {
    if (amount <= EPS) continue;
    const f = FERTILIZERS[key];
    const molPerLiter = f.micro ? amount * 1e-6 : amount * 1e-3;
    const molInTank = molPerLiter * concentration * tankVolume;
    const grams = molInTank * gramsPerMole(key);
    const entry = { key, name: f.name, tank: f.tank, form: f.form, micro: !!f.micro, amount, grams, kg: grams / 1000 };
    if (f.density) entry.liters = grams / (f.density * 1000);
    stock[key] = entry;
  }

  // 10. 질산칼륨을 A/B 탱크 질량이 비슷해지도록 나눈다
  if (stock.KNO3) {
    const massOf = (tank) => Object.values(stock).filter((e) => e.key !== "KNO3" && e.tank === tank).reduce((s, e) => s + e.kg, 0);
    const total = stock.KNO3.kg;
    let toA = (massOf("B") + total - massOf("A")) / 2;
    toA = Math.min(total, Math.max(0, toA));
    const share = total > 0 ? toA / total : 0;
    const base = stock.KNO3;
    delete stock.KNO3;
    if (toA > EPS) {
      stock.KNO3_A = { ...base, key: "KNO3_A", name: "질산칼륨 (KNO₃)", tank: "A", kg: toA, grams: toA * 1000, amount: base.amount * share };
    }
    if (total - toA > EPS) {
      stock.KNO3_B = { ...base, key: "KNO3_B", name: "질산칼륨 (KNO₃)", tank: "B", kg: total - toA, grams: (total - toA) * 1000, amount: base.amount * (1 - share) };
    }
  }

  const ordered = TANK_ORDER.filter((k) => stock[k]).map((k) => stock[k]);
  const tanks = {
    A: ordered.filter((e) => e.tank === "A"),
    B: ordered.filter((e) => e.tank === "B"),
  };
  tanks.massA = tanks.A.reduce((s, e) => s + e.kg, 0);
  tanks.massB = tanks.B.reduce((s, e) => s + e.kg, 0);

  return {
    need: { ...need, ...needMicro },
    amounts,
    supplied,
    stock,
    tanks,
    warnings,
    options: { acidDemand: acid, nSource, pSource, acidType, feSource, clSource, tankVolume, concentration },
  };
}
