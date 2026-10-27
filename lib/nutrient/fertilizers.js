// 비료 제품 DB. 질량 계산의 단일 기준.
// - molarMass: 제품 화학식 1몰의 질량 (g/mol)
// - purity: 제품 중 유효 성분 비율 (액상 제품의 w/w 농도). 없으면 1.
// - element/content: 킬레이트 철처럼 원소 함량(%)으로 표기되는 제품
// - supplies: 제품 1몰(원소 함량 제품은 원소 1몰)이 공급하는 이온 몰수
// - tank: 기본 탱크. 질산칼륨은 A/B 질량 균형에 따라 나눠 넣는다.
// - form/density: 액상 제품은 부피(L)도 함께 표시한다 (density: kg/L)

export const ATOMIC_MASS = { Fe: 55.845, Mn: 54.938, Zn: 65.38, B: 10.81, Cu: 63.546, Mo: 95.95 };

export const FERTILIZERS = {
  HNO3: {
    name: "질산 (HNO₃ 60%)",
    group: "acid",
    tank: "B",
    form: "liquid",
    molarMass: 63.01,
    purity: 0.6,
    density: 1.37,
    supplies: { NO3: 1 },
  },
  H3PO4: {
    name: "인산 (H₃PO₄ 85%)",
    group: "acid",
    tank: "B",
    form: "liquid",
    molarMass: 97.99,
    purity: 0.85,
    density: 1.685,
    supplies: { PO4: 1 },
  },
  CaNO3_4H2O: {
    name: "질산칼슘 4수염 (Ca(NO₃)₂·4H₂O)",
    tank: "A",
    form: "solid",
    molarMass: 236.15,
    supplies: { Ca: 1, NO3: 2 },
  },
  CaNO3_10H2O: {
    name: "질산칼슘 10수염 (5Ca(NO₃)₂·NH₄NO₃·10H₂O)",
    tank: "A",
    form: "solid",
    molarMass: 1080.6,
    supplies: { Ca: 5, NO3: 11, NH4: 1 },
  },
  CaCl2: {
    name: "염화칼슘 (CaCl₂, 무수)",
    tank: "A",
    form: "solid",
    molarMass: 110.98,
    supplies: { Ca: 1, Cl: 2 },
  },
  NH4NO3: {
    name: "질산암모늄 액상 (N 18%)",
    tank: "A",
    form: "liquid",
    molarMass: 80.04,
    purity: 0.514, // N 18% w/w → NH4NO3 51.4% w/w
    density: 1.24,
    supplies: { NH4: 1, NO3: 1 },
  },
  MgNO3: {
    name: "질산마그네슘 (Mg(NO₃)₂·6H₂O)",
    tank: "A",
    form: "solid",
    molarMass: 256.41,
    supplies: { Mg: 1, NO3: 2 },
  },
  NH4H2PO4: {
    name: "제일인산암모늄 (NH₄H₂PO₄)",
    tank: "B",
    form: "solid",
    molarMass: 115.03,
    supplies: { NH4: 1, PO4: 1 },
  },
  KH2PO4: {
    name: "제일인산칼륨 (KH₂PO₄)",
    tank: "B",
    form: "solid",
    molarMass: 136.09,
    supplies: { K: 1, PO4: 1 },
  },
  KNO3: {
    name: "질산칼륨 (KNO₃)",
    tank: "B",
    splitTank: true,
    form: "solid",
    molarMass: 101.1,
    supplies: { K: 1, NO3: 1 },
  },
  K2SO4: {
    name: "황산칼륨 (K₂SO₄)",
    tank: "B",
    form: "solid",
    molarMass: 174.26,
    supplies: { K: 2, SO4: 1 },
  },
  MgSO4: {
    name: "황산마그네슘 (MgSO₄·7H₂O)",
    tank: "B",
    form: "solid",
    molarMass: 246.47,
    supplies: { Mg: 1, SO4: 1 },
  },
  Fe_DTPA: {
    name: "Fe-DTPA 6% (액상)",
    tank: "A",
    form: "liquid",
    micro: true,
    element: "Fe",
    content: 0.06,
    density: 1.32,
    supplies: { Fe: 1 },
  },
  Fe_EDTA: {
    name: "Fe-EDTA 13%",
    tank: "A",
    form: "solid",
    micro: true,
    element: "Fe",
    content: 0.13,
    supplies: { Fe: 1 },
  },
  Fe_EDDHA: {
    name: "Fe-EDDHA 6%",
    tank: "A",
    form: "solid",
    micro: true,
    element: "Fe",
    content: 0.06,
    supplies: { Fe: 1 },
  },
  MnSO4: {
    name: "황산망간 (MnSO₄·H₂O)",
    tank: "B",
    form: "solid",
    micro: true,
    molarMass: 169.02,
    supplies: { Mn: 1 },
  },
  ZnSO4: {
    name: "황산아연 (ZnSO₄·7H₂O)",
    tank: "B",
    form: "solid",
    micro: true,
    molarMass: 287.56,
    supplies: { Zn: 1 },
  },
  Borax: {
    name: "붕사 (Na₂B₄O₇·10H₂O)",
    tank: "B",
    form: "solid",
    micro: true,
    molarMass: 381.37,
    supplies: { B: 4 },
  },
  CuSO4: {
    name: "황산구리 (CuSO₄·5H₂O)",
    tank: "B",
    form: "solid",
    micro: true,
    molarMass: 249.69,
    supplies: { Cu: 1 },
  },
  NaMoO4: {
    name: "몰리브덴산나트륨 (Na₂MoO₄·2H₂O)",
    tank: "B",
    form: "solid",
    micro: true,
    molarMass: 241.95,
    supplies: { Mo: 1 },
  },
};

export const N_SOURCES = ["4수염", "10수염"];
export const P_SOURCES = ["제일인산칼륨", "제일인산암모늄"];
export const ACID_TYPES = ["질산", "인산"];
export const CL_SOURCES = ["none", "CaCl2"];
export const FE_SOURCES = { "Fe-DTPA": "Fe_DTPA", "Fe-EDTA": "Fe_EDTA", "Fe-EDDHA": "Fe_EDDHA" };
export const MICRO_PRODUCTS = { Mn: "MnSO4", Zn: "ZnSO4", B: "Borax", Cu: "CuSO4", Mo: "NaMoO4" };

// 탱크 표에 보여줄 순서
export const TANK_ORDER = [
  "HNO3", "H3PO4",
  "CaNO3_4H2O", "CaNO3_10H2O", "CaCl2", "NH4NO3", "MgNO3", "KNO3_A",
  "Fe_DTPA", "Fe_EDTA", "Fe_EDDHA",
  "KNO3_B", "KH2PO4", "NH4H2PO4", "MgSO4", "K2SO4",
  "MnSO4", "ZnSO4", "Borax", "CuSO4", "NaMoO4",
];

// 제품 1몰(원소 함량 제품은 원소 1몰)당 제품 질량 (g)
export function gramsPerMole(key) {
  const f = FERTILIZERS[key];
  if (!f) throw new Error(`알 수 없는 비료: ${key}`);
  if (f.element) return ATOMIC_MASS[f.element] / f.content;
  return f.molarMass / (f.purity ?? 1);
}
