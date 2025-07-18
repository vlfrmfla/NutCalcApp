"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function LoginUI() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // 최초 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 세션 변화 감지
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  if (session) {
    // 로그인 상태면 로그인 UI를 숨김
    return null;
  }

  // 테스트용: 로그인 강제 우회 (개발 중에만 사용)
  // return null;

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}`
      }
    });
    if (error) alert(error.message);
  };

  const handleKakaoLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}`
      }
    });
    if (error) alert(error.message);
  };

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(255,255,255,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
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
          onClick={handleGoogleLogin}
          style={{
            padding: "14px 0",
            width: "100%",
            fontSize: 16,
            background: "#fff",
            color: "#222",
            border: "1px solid #ddd",
            borderRadius: 20,
            cursor: "pointer",
            fontWeight: 600,
            marginBottom: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
          }}
        >
          구글로 로그인
        </button>
        <button
          onClick={handleKakaoLogin}
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