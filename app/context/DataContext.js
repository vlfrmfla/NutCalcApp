"use client";
import { createContext, useState } from "react";

// 기본 데이터 정의
const initialData = [
  {
    id: 1,
    analysis: "원수",
    date: new Date(),
    EC: 2.6,
    pH: 5.5,
    NH4: 1.2,
    NO3: 13.75,
    PO4: 1.5,
    K: 9.5,
    Ca: 5.4,
    Mg: 2.4,
    SO4: 4.4,
    Cl: 2.25,
    Na: 0,
    HCO3: 0,
    Fe: 15,
    Mn: 10,
    B: 30,
    Zn: 5,
    Cu: 0.75,
    Mo: 0.5,
  },
];

export const DataContext = createContext();

export function DataProvider({ children }) {
  const [data, setData] = useState(initialData);

  const addData = (newEntry) => {
    setData([...data, newEntry]);
  };

  const deleteData = (id) => {
    setData(data.filter(item => item.id !== id));
  };

  return (
    <DataContext.Provider value={{ data, addData, deleteData }}>
      {children}
    </DataContext.Provider>
  );
}
