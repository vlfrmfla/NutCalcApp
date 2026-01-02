"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

export default function MobileLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // 페이지 이동 시 사이드바 닫기
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // ESC 키로 사이드바 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 사이드바 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  return (
    <>
      {/* 오버레이 */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "active" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* 사이드바 */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <nav>
          <ul>
            <li><Link href="/dashboard">대시보드</Link></li>
            <li><Link href="/display">급배액 관리</Link></li>
            <li><Link href="/select">양액 조성 선택</Link></li>
            <li><Link href="/calculate">양액 조성 계산</Link></li>
            <li><Link href="/datamanagement">데이터 관리</Link></li>
            <li><Link href="/info">사용방법</Link></li>
          </ul>
        </nav>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="content">{children}</main>

      {/* 모바일 메뉴 버튼 */}
      <button
        className="mobile-menu-btn"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label={isSidebarOpen ? "메뉴 닫기" : "메뉴 열기"}
      >
        {isSidebarOpen ? (
          <CloseIcon style={{ fontSize: 24 }} />
        ) : (
          <MenuIcon style={{ fontSize: 24 }} />
        )}
      </button>
    </>
  );
}
