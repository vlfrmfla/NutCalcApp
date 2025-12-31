"use client";
import { createContext, useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { fetchWithAuth } from "@/utils/apiClient";

// 기본 데이터 정의 (로그인 전 표시용)
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
    Mg: 0.40,
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

export const DataContext = createContext();


export function DataProvider({ children }) {
  const [data, setDataState] = useState(initialData);

  // 안전한 데이터 설정 함수
  const setData = (newData) => {
    console.log("=== DataContext setData 호출 ===");
    console.log("새로운 데이터:", newData);
    const processedData = Array.isArray(newData) 
      ? newData.map(item => ({
          ...item,
          date: item.date instanceof Date ? item.date : new Date(item.date || Date.now())
        }))
      : newData;
    console.log("처리된 데이터:", processedData);
    setDataState(processedData);
  };
  const [nutrientData, setNutrientData] = useState(null);

  // 사용자가 선택한 작물, 배지, 조성, 원수, 배액 조성, 중탄산 농도, 인산비료 종류, tank volume
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedSubstrate, setSelectedSubstrate] = useState("");
  const [selectedComposition, setSelectedComposition] = useState("");
  const [selectedWaterSource, setSelectedWaterSource] = useState("");
  const [selectedDrainSource, setSelectedDrainSource] = useState("");
  const [hco3, setHco3] = useState(0.5); // 기본값 0.5
  const [neutralizationType, setNeutralizationType] = useState("질산"); // "질산" 또는 "인산"
  const [phosphateType, setPhosphateType] = useState("제일인산칼륨"); // "제일인산암모늄" 또는 "제일인산칼륨"
  const [tankVolume, setTankVolume] = useState(1000);   // 양액탱크 용량 (L)

  // 사용자 설정: 가이드라인 표시 여부
  const [showGuide, setShowGuide] = useState(true);


  // 로그인 상태에 따른 데이터 로딩
  useEffect(() => {
    const fetchSamples = async () => {
      try {
        console.log("=== DataContext에서 samples 데이터 로딩 ===");
        const rows = await fetchWithAuth("/api/samples");
        console.log("API에서 가져온 데이터:", rows);
        setData(rows);
      } catch (err) {
        console.error("DataContext 데이터 로드 실패:", err.message);
        console.log("더미 데이터 유지");
      }
    };

    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("DataContext 초기 세션:", session?.user?.id || "없음");
      if (session) {
        fetchSamples();
      }
    });

    // 로그인/로그아웃 감지
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("DataContext 세션 변화:", _event, session?.user?.id || "없음");
      if (session) {
        fetchSamples();
      } else {
        // 로그아웃 시 더미 데이터로 리셋
        console.log("로그아웃 - 더미 데이터로 리셋");
        setDataState(initialData);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // nutrientData fetch (앱 시작 시 1회)
  useEffect(() => {
    fetch("/nutrient_solution.json")
      .then(res => res.json())
      .then(setNutrientData);
  }, []);

  // DataContext에서 로컬스토리지에 저장/복원
  useEffect(() => {
    const saved = localStorage.getItem('nutApp_selections');
    if (saved) {
      try {
        const { crop, substrate, composition, waterSource } = JSON.parse(saved);
        // 빈 문자열이 아닌 경우에만 복원
        if (crop) setSelectedCrop(crop);
        if (substrate) setSelectedSubstrate(substrate);
        if (composition) setSelectedComposition(composition);
        if (waterSource) setSelectedWaterSource(waterSource);
      } catch (error) {
        console.error("로컬스토리지 복원 에러:", error);
      }
    }
    // 가이드라인 설정 복원
    const savedGuide = localStorage.getItem('nutApp_showGuide');
    if (savedGuide !== null) {
      setShowGuide(savedGuide === 'true');
    }
  }, []);

  useEffect(() => {
    // 모든 값이 빈 문자열이 아닐 때만 저장
    if (selectedCrop || selectedSubstrate || selectedComposition || selectedWaterSource) {
      localStorage.setItem('nutApp_selections', JSON.stringify({
        crop: selectedCrop,
        substrate: selectedSubstrate,
        composition: selectedComposition,
        waterSource: selectedWaterSource
      }));
    }
  }, [selectedCrop, selectedSubstrate, selectedComposition, selectedWaterSource]);

  // 가이드라인 설정 저장
  useEffect(() => {
    localStorage.setItem('nutApp_showGuide', showGuide.toString());
  }, [showGuide]);

  // 데이터 추가 함수
  const addData = (newEntry) => {
    // 날짜가 없는 경우 현재 날짜를 추가
    const entryWithDate = {
      ...newEntry,
      date: newEntry.date instanceof Date ? newEntry.date : new Date(newEntry.date || Date.now())
    };
    setData([...data, entryWithDate]);
  };

  // 데이터 삭제 함수
  const deleteData = (id) => {
    setData(data.filter((item) => item.id !== id));
  };

  return (
    <DataContext.Provider
      value={{
        data,
        setData, // setData를 외부에서 사용할 수 있도록 추가
        addData,
        deleteData,
        selectedCrop,
        setSelectedCrop,
        selectedSubstrate,
        setSelectedSubstrate,
        selectedComposition,
        setSelectedComposition,
        selectedWaterSource,
        setSelectedWaterSource,
        selectedDrainSource,
        setSelectedDrainSource,
        tankVolume,
        setTankVolume, // ✅ 전역 공유
        nutrientData,
        setNutrientData,
        hco3,
        setHco3,
        neutralizationType,
        setNeutralizationType,
        phosphateType,
        setPhosphateType,
        showGuide,
        setShowGuide,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}