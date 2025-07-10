"use client";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function UserStatusBar() {
  const { data: session, status } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: '', nickname: '', birthyear: '' });
  const [editInfo, setEditInfo] = useState({ name: '', nickname: '', birthyear: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (showModal) {
      setLoading(true);
      setError(null);
      fetch("/api/user/me")
        .then(res => {
          if (!res.ok) throw new Error("회원정보를 불러올 수 없습니다.");
          return res.json();
        })
        .then(data => {
          setUserInfo(data);
          setEditInfo(data);
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [showModal]);

  // 모달이 닫힐 때마다 editInfo를 userInfo로 초기화
  useEffect(() => {
    if (!showModal) {
      setEditInfo(userInfo);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal]);

  if (status !== "authenticated") return null;

  const user = session.user;

  const handleChange = e => {
    setEditInfo({ ...editInfo, [e.target.name]: e.target.value });
  };

  // TODO: 회원정보 수정 API 연동 필요
  const handleSave = () => {
    setUserInfo(editInfo);
    setShowModal(false);
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
        {user?.image && (
          <img src={user.image} alt="프로필" style={{ width: 32, height: 32, borderRadius: "50%" }} />
        )}
        <span style={{ fontWeight: 500 }}>{user?.email || user?.name}</span>
        <button onClick={() => setShowModal(true)} style={{
          background: "#e0eaff",
          border: "none",
          borderRadius: 6,
          padding: "4px 12px",
          cursor: "pointer"
        }}>내 정보 관리</button>
        <button onClick={() => signOut()} style={{
          background: "#eee",
          border: "none",
          borderRadius: 6,
          padding: "4px 12px",
          cursor: "pointer"
        }}>로그아웃</button>
      </div>
      {showModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
            padding: 32,
            minWidth: 320,
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            <h3 style={{ marginBottom: 24 }}>내 정보 관리</h3>
            {loading ? <div>로딩 중...</div> : error ? <div style={{ color: 'red' }}>{error}</div> : (
              <>
                <label style={{ width: "100%", marginBottom: 12 }}>
                  이름
                  <input name="name" value={editInfo.name || ''} onChange={handleChange} style={{ width: "100%", padding: 6, marginTop: 4, borderRadius: 6, border: "1px solid #ccc" }} />
                </label>
                <label style={{ width: "100%", marginBottom: 12 }}>
                  별명
                  <input name="nickname" value={editInfo.nickname || ''} onChange={handleChange} style={{ width: "100%", padding: 6, marginTop: 4, borderRadius: 6, border: "1px solid #ccc" }} />
                </label>
                <label style={{ width: "100%", marginBottom: 24 }}>
                  출생연도
                  <input name="birthyear" value={editInfo.birthyear || ''} onChange={handleChange} style={{ width: "100%", padding: 6, marginTop: 4, borderRadius: 6, border: "1px solid #ccc" }} />
                </label>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={handleSave} style={{ background: "#03c75a", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontWeight: 600 }}>저장</button>
                  <button onClick={() => setShowModal(false)} style={{ background: "#eee", border: "none", borderRadius: 6, padding: "8px 20px" }}>닫기</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
} 