"use client";
import { createContext, useState } from "react";

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

  // 사용자가 선택한 작물, 배지, 조성, 원수, 배액
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedSubstrate, setSelectedSubstrate] = useState("");
  const [selectedComposition, setSelectedComposition] = useState("");
  const [selectedWaterSource, setSelectedWaterSource] = useState("");
  const [selectedDrainSource, setSelectedDrainSource] = useState("");

  // ✅ 양액탱크 용량 (L)
  const [tankVolume, setTankVolume] = useState(100);

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
      }}
    >
      {children}
    </DataContext.Provider>
  );
}