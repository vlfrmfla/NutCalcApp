"use client";
import { createContext, useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/utils/supabaseClient";
import { fetchWithAuth } from "@/utils/apiClient";

// 로그인 전 표시용 더미 샘플
const initialData = [
  {
    id: 1,
    analysis: "더미데이터(로그인필요)",
    date: new Date(),
    EC: 0.21,
    pH: 7.76,
    NH4: 0,
    NO3: 0.57,
    PO4: 0,
    K: 0.12,
    Ca: 0.29,
    Mg: 0.4,
    SO4: 0.35,
    Cl: 0.46,
    Na: 0,
    HCO3: 0,
    Fe: 0,
    Mn: 0,
    B: 0,
    Zn: 0,
    Cu: 0,
    Mo: 0,
  },
];

const SELECTION_KEY = "nutApp_selections";
const SETTINGS_KEY = "nutApp_calcSettings";
const GUIDE_KEY = "nutApp_showGuide";

export const DEFAULT_SETTINGS = {
  recirculationMode: "비순환식", // "비순환식" | "순환식"
  drainMixRatio: 30, // 순환식: 급액 중 배액 비율 (%)
  applyDrainCorrection: false, // 순환식: 배액 분석 기반 표준 조성 보정
  hco3Target: 0.5, // 급액에 남길 HCO3 (mmol/L)
  neutralizationType: "질산", // "질산" | "인산"
  phosphateType: "제일인산칼륨", // "제일인산칼륨" | "제일인산암모늄"
  nitrogenSource: "4수염", // "4수염" | "10수염"
  feSource: "Fe-DTPA", // "Fe-DTPA" | "Fe-EDTA" | "Fe-EDDHA"
  clSource: "none", // "none" | "CaCl2" (표준 조성의 Cl을 염화칼슘으로 공급)
  concentration: 100, // 원액 농축 배율
  tankVolume: 1000, // 원액 탱크 용량 (L)
  supplyEC: null, // 급액 EC (dS/m). null이면 자동
};

export const DataContext = createContext();

function withDate(item) {
  return { ...item, date: item.date instanceof Date ? item.date : new Date(item.date || Date.now()) };
}

export function DataProvider({ children }) {
  const [data, setDataState] = useState(initialData);
  const [nutrientData, setNutrientData] = useState(null);
  const [targetDrainData, setTargetDrainData] = useState(null);

  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedSubstrate, setSelectedSubstrate] = useState("");
  const [selectedComposition, setSelectedComposition] = useState("");
  const [selectedWaterSourceId, setSelectedWaterSourceId] = useState("");
  const [selectedDrainSourceId, setSelectedDrainSourceId] = useState("");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showGuide, setShowGuide] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const setData = useCallback((rows) => {
    setDataState(Array.isArray(rows) ? rows.map(withDate) : rows);
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  // 로그인 상태에 따라 샘플 데이터 로드
  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const rows = await fetchWithAuth("/api/samples");
        setData(rows);
      } catch (err) {
        console.error("샘플 데이터 로드 실패:", err.message);
      }
    };

    // onAuthStateChange는 구독 직후 INITIAL_SESSION을 보내므로 getSession을 따로 부르지 않는다
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setDataState(initialData);
        return;
      }
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") fetchSamples();
    });

    return () => listener?.subscription.unsubscribe();
  }, [setData]);

  // 표준 조성과 목표 배액 데이터 (앱 시작 시 1회)
  useEffect(() => {
    fetch("/nutrient_solution.json")
      .then((res) => res.json())
      .then(setNutrientData)
      .catch((err) => console.error("표준 조성 로드 실패:", err));
    fetch("/target_drain.json")
      .then((res) => res.json())
      .then(setTargetDrainData)
      .catch((err) => console.error("목표 배액 로드 실패:", err));
  }, []);

  // 로컬스토리지 복원 (1회)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SELECTION_KEY) || "{}");
      if (saved.crop) setSelectedCrop(saved.crop);
      if (saved.substrate) setSelectedSubstrate(saved.substrate);
      if (saved.composition) setSelectedComposition(saved.composition);
      if (saved.waterSourceId) setSelectedWaterSourceId(String(saved.waterSourceId));
      if (saved.drainSourceId) setSelectedDrainSourceId(String(saved.drainSourceId));
      const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
      if (savedSettings && typeof savedSettings === "object") {
        setSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
      }
      const savedGuide = localStorage.getItem(GUIDE_KEY);
      if (savedGuide !== null) setShowGuide(savedGuide === "true");
    } catch (err) {
      console.error("로컬스토리지 복원 실패:", err);
    }
    setHydrated(true);
  }, []);

  // 복원이 끝난 뒤에만 저장 (기본값으로 덮어쓰기 방지)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        SELECTION_KEY,
        JSON.stringify({
          crop: selectedCrop,
          substrate: selectedSubstrate,
          composition: selectedComposition,
          waterSourceId: selectedWaterSourceId,
          drainSourceId: selectedDrainSourceId,
        })
      );
    } catch (err) {
      console.error("로컬스토리지 저장 실패:", err);
    }
  }, [hydrated, selectedCrop, selectedSubstrate, selectedComposition, selectedWaterSourceId, selectedDrainSourceId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      localStorage.setItem(GUIDE_KEY, showGuide.toString());
    } catch (err) {
      console.error("로컬스토리지 저장 실패:", err);
    }
  }, [hydrated, settings, showGuide]);

  // 파생값
  const compositionDetails = useMemo(
    () => nutrientData?.[selectedCrop]?.[selectedSubstrate]?.[selectedComposition] || null,
    [nutrientData, selectedCrop, selectedSubstrate, selectedComposition]
  );
  const waterSource = useMemo(
    () => data.find((d) => String(d.id) === String(selectedWaterSourceId)) || null,
    [data, selectedWaterSourceId]
  );
  const drainSource = useMemo(
    () => data.find((d) => String(d.id) === String(selectedDrainSourceId)) || null,
    [data, selectedDrainSourceId]
  );
  // 작물별 배액 보정표 { naMax, 비순환식: {...}, 순환식: {...} }
  const drainTables = useMemo(() => targetDrainData?.[selectedCrop] || null, [targetDrainData, selectedCrop]);

  const value = useMemo(
    () => ({
      data,
      setData,
      nutrientData,
      targetDrainData,
      selectedCrop,
      setSelectedCrop,
      selectedSubstrate,
      setSelectedSubstrate,
      selectedComposition,
      setSelectedComposition,
      selectedWaterSourceId,
      setSelectedWaterSourceId,
      selectedDrainSourceId,
      setSelectedDrainSourceId,
      settings,
      updateSettings,
      showGuide,
      setShowGuide,
      compositionDetails,
      waterSource,
      drainSource,
      drainTables,
    }),
    [
      data, setData, nutrientData, targetDrainData,
      selectedCrop, selectedSubstrate, selectedComposition,
      selectedWaterSourceId, selectedDrainSourceId,
      settings, updateSettings, showGuide,
      compositionDetails, waterSource, drainSource, drainTables,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
