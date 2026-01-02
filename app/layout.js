import ClientProviders from "./components/ClientProviders";
import UserStatusBar from "./components/UserStatusBar";
import Footer from "./components/Footer";
import Header from "./components/Header";
import MobileLayout from "./components/MobileLayout";
import LoginUI from "./components/LoginUI";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={`${geistSans.variable}`} style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <ClientProviders>
          <Header />
          <UserStatusBar />
          <div className="layout">
            <MobileLayout>{children}</MobileLayout>
            <Footer />
          </div>
          <LoginUI />
        </ClientProviders>
      </body>
    </html>
  );
}
