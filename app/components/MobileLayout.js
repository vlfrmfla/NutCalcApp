"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

const NAV_ITEMS = [
  { href: "/", label: "대시보드", match: ["/", "/dashboard"] },
  { href: "/display", label: "급배액 관리" },
  { href: "/select", label: "양액 조성 선택" },
  { href: "/calculate", label: "양액 조성 계산" },
  { href: "/datamanagement", label: "데이터 관리" },
  { href: "/info", label: "사용방법" },
];

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
            {NAV_ITEMS.map((item) => {
              const targets = item.match || [item.href];
              const active = targets.some((t) => pathname === t || (t !== "/" && pathname.startsWith(t + "/")));
              return (
                <li key={item.href} className={active ? "active" : ""}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              );
            })}
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
