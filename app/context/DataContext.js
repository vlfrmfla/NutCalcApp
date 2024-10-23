import { createContext, useState } from "react";

// DataContext 생성
const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [data, setData] = useState([]);

  return (
    <DataContext.Provider value={{ data }}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;
