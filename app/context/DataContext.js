"use client";
import { createContext, useState, useEffect } from "react";

// 기본 데이터 정의
const initialData = [
  {
    id: 1,
    analysis: "원수(default)",
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
  const [data, setData] = useState(initialData);
  const [nutrientData, setNutrientData] = useState(null);

  // 사용자가 선택한 작물, 배지, 조성, 원수, 배액 조성, 중탄산 농도, 인산비료 종류, tank volume 
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedSubstrate, setSelectedSubstrate] = useState("");
  const [selectedComposition, setSelectedComposition] = useState("");
  const [selectedWaterSource, setSelectedWaterSource] = useState("");
  const [selectedDrainSource, setSelectedDrainSource] = useState("");
  const [hco3, setHco3] = useState(0.5); // 기본값 0.5
  const [neutralizationType, setNeutralizationType] = useState("질산"); // "질산" 또는 "인산"
  const [phosphateType, setPhosphateType] = useState("제일인산암모늄"); // "제일인산암모늄" 또는 "제일인산칼륨"
  const [tankVolume, setTankVolume] = useState(1000);   // 양액탱크 용량 (L)


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

  // 데이터 추가 함수
  const addData = (newEntry) => {
    setData([...data, newEntry]);
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
      }}
    >
      {children}
    </DataContext.Provider>
  );
}