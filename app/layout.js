"use client";

import localFont from "next/font/local";
import "./globals.css";
import Footer from "./components/Footer";
import Link from "next/link";
import { DataProvider } from "./context/DataContext"; // DataProvider 가져오기

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
});

export default function RootLayout({ children }) {
  return (
    <DataProvider>
      <html lang="en">
        <body className={`${geistSans.variable}`}>
          <div className="layout">
            {/* 사이드바 */}
            <aside className="sidebar">
              <nav>
                <ul>
                  <li>
                    <Link href="/select">양액 조성 선택</Link>
                  </li>
                  <li>
                    <Link href="/calculate">양액 조성 계산</Link>
                  </li>
                  <li>
                    <Link href="/display">배지 조성 변화</Link>
                  </li>
                  <li>
                    <Link href="/datamanagement">데이터 관리</Link>
                  </li>
                  <li>
                    <Link href="/info">사용방법</Link>
                  </li>

                </ul>
              </nav>
            </aside>

            {/* 메인 콘텐츠 */}
            <main className="content">{children}</main>
            
            {/* 푸터 */}
            <Footer />
          </div>
        </body>
      </html>
    </DataProvider>
  );
}
