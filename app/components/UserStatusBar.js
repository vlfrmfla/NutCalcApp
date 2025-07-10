"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function UserStatusBar() {
  const [session, setSession] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: '', nickname: '', birthyear: '' });
  const [editInfo, setEditInfo] = useState({ name: '', nickname: '', birthyear: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Supabase Auth 세션 감지
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (showModal) {
      setLoading(true);
      setError(null);
      // TODO: Supabase 기반 사용자 정보 API로 교체 필요
      setLoading(false);
    }
  }, [showModal]);

  useEffect(() => {
    if (!showModal) {
      setEditInfo(userInfo);
      setError(null);
    }
  }, [showModal]);

  if (!session) return null;

  const user = session.user;

  const handleChange = e => {
    setEditInfo({ ...editInfo, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    setUserInfo(editInfo);
    setShowModal(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <>
      <div style={{
        position: "fixed",
        top: 16,
        right: 24,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "rgba(255,255,255,0.95)",
        borderRadius: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        padding: "6px 16px",
        zIndex: 1000
      }}>
        {user?.user_metadata?.avatar_url && (
          <img src={user.user_metadata.avatar_url} alt="프로필" style={{ width: 32, height: 32, borderRadius: "50%" }} />
        )}
        <span style={{ fontWeight: 500 }}>{user?.email || user?.name}</span>
        <button onClick={() => setShowModal(true)} style={{
          background: "#e0eaff",
          border: "none",
          borderRadius: 6,
          padding: "4px 12px",
          cursor: "pointer"
        }}>내 정보 관리</button>
        <button onClick={handleLogout} style={{
          background: "#eee",
          border: "none",
          borderRadius: 6,
          padding: "4px 12px",
          cursor: "pointer"
        }}>로그아웃</button>
      </div>
    </>
  );
} 