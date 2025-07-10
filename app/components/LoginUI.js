"use client";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";

export default function LoginUI() {
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      window.location.reload();
    }
  }, [status]);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(255,255,255,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999
    }}>
      <div style={{
        background: "rgba(255,255,255,0.95)",
        borderRadius: 24,
        boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
        padding: "48px 40px 40px 40px",
        minWidth: 340,
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        <img src="/favicon.ico" alt="로고" style={{ width: 80, height: 80, marginBottom: 20 }} />
        <h2 style={{ marginBottom: 10, fontWeight: 700, fontSize: 28 }}>환영합니다!</h2>
        <p style={{ marginBottom: 32, color: "#666", fontSize: 16, textAlign: "center" }}>
          소셜 계정으로 로그인하여<br />수경재배 양액 계산 서비스를 이용하세요.<br /><br />현재 세부 기능은 개발중인 단계입니다.
        </p>
        <button
          onClick={() => signIn("naver", { callbackUrl: "/" })}
          style={{
            padding: "14px 0",
            width: "100%",
            fontSize: 16,
            background: "#03cf5d",
            color: "#fff",
            border: "none",
            borderRadius: 20,
            cursor: "pointer",
            fontWeight: 600,
            marginBottom: 8,
            boxShadow: "0 2px 8px rgba(15, 175, 87, 0.08)"
          }}
        >
          네이버로 로그인
        </button>
        <button
          onClick={() => signIn("kakao", { callbackUrl: "/" })}
          style={{
            padding: "14px 0",
            width: "100%",
            fontSize: 16,
            background: "#FEE500",
            color: "#191600",
            border: "none",
            borderRadius: 20,
            cursor: "pointer",
            fontWeight: 600,
            marginBottom: 8,
            boxShadow: "0 2px 8px rgba(254, 229, 0, 0.08)"
          }}
        >
          카카오로 로그인
        </button>
      </div>
    </div>
  );
} 