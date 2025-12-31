import ClientProviders from "./components/ClientProviders";
import UserStatusBar from "./components/UserStatusBar";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Link from "next/link";
import LoginUI from "./components/LoginUI";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable}`} style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <ClientProviders>
          <Header />
          <UserStatusBar />
          <div className="layout">
            {/* 사이드바 */}
            <aside className="sidebar">
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
            {/* 푸터 */}
            <Footer />
          </div>
          <LoginUI />
        </ClientProviders>
      </body>
    </html>
  );
}
