"use client";
import { SessionProvider } from "next-auth/react";
import { DataProvider } from "../context/DataContext";

export default function ClientProviders({ children }) {
  return (
    <DataProvider>
      <SessionProvider>
        {children}
      </SessionProvider>
    </DataProvider>
  );
} 