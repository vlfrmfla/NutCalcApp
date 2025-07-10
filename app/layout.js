import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import ClientProviders from "./components/ClientProviders";
import UserStatusBar from "./components/UserStatusBar";
import Footer from "./components/Footer";
import Link from "next/link";
import LoginUI from "./components/LoginUI";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
});

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${geistSans.variable}`} style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <ClientProviders>
          <div style={{ position: "relative" }}>
            {/* 뒷배경: 앱 전체 */}
            <div
              style={{
                filter: !session ? "blur(0.5px)" : "none",
                transition: "filter 0.3s",
                pointerEvents: session ? "auto" : "none",
              }}
            >
              <UserStatusBar />
              <div className="layout">
                {/* 사이드바 */}
                <aside className="sidebar">
                  <nav>
                    <ul>
                      <li><Link href="/select">양액 조성 선택</Link></li>
                      <li><Link href="/calculate">양액 조성 계산</Link></li>
                      <li><Link href="/display">배지 조성 변화</Link></li>
                      <li><Link href="/datamanagement">데이터 관리</Link></li>
                      <li><Link href="/info">사용방법</Link></li>
                    </ul>
                  </nav>
                </aside>
                {/* 메인 콘텐츠 */}
                <main className="content">{children}</main>
                {/* 푸터 */}
                <Footer />
              </div>
            </div>
            {/* 밝은 회색 오버레이 */}
            {!session && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(80,80,80,0.)", // 밝은 회색, 투명도 0.5
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              />
            )}
            {/* 로그인 UI */}
            {!session && <LoginUI />}
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
