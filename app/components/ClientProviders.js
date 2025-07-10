"use client";
import { DataProvider } from "../context/DataContext";

export default function ClientProviders({ children }) {
  return (
    <DataProvider>
      {children}
    </DataProvider>
  );
} 