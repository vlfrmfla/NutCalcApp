"use client";

import localFont from "next/font/local";
import "./globals.css";
import Link from "next/link";
import { useState } from "react";
import { DataProvider } from "./context/DataContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
});

export default function RootLayout({ children }) {
  return (
    <DataProvider>
      <html lang="en">
        <body className={geistSans.variable}>
          <div className="layout">
            <aside className="sidebar">
              <nav>
                <ul>
                  <li>
                    <Link href="/inputdata">데이터 관리</Link>
                  </li>
                  <li>
                    <Link href="/calculate">양액 조성 계산</Link>
                  </li>
                  <li>
                    <Link href="/guide">배지 조성 변화</Link>
                  </li>
                </ul>
              </nav>
            </aside>
            <main className="content">{children}</main>
          </div>
        </body>
      </html>
    </DataProvider>
  );
}
