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
  const [isMobile, setIsMobile] = useState(false);

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
    if (showModal && session) {
      setLoading(true);
      setError(null);
      // user_profiles에서 정보 조회
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (error && error.code !== 'PGRST116') { // not found is ok
          setError('프로필 정보를 불러오지 못했습니다.');
        } else if (data) {
          setUserInfo({
            name: data.name || '',
            nickname: data.nickname || '',
            birthyear: data.birthyear || '',
          });
          setEditInfo({
            name: data.name || '',
            nickname: data.nickname || '',
            birthyear: data.birthyear || '',
          });
        } else {
          setUserInfo({ name: '', nickname: '', birthyear: '' });
          setEditInfo({ name: '', nickname: '', birthyear: '' });
        }
        setLoading(false);
      };
      fetchProfile();
    }
  }, [showModal, session]);

  useEffect(() => {
    if (!showModal) {
      setEditInfo(userInfo);
      setError(null);
    }
  }, [showModal]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!session) return null;

  const user = session.user;

  const handleChange = e => {
    setEditInfo({ ...editInfo, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      // 닉네임 변경 이력 기록
      if (userInfo.nickname && userInfo.nickname !== editInfo.nickname) {
        await supabase.from('nickname_history').insert({
          user_id: session.user.id,
          previous_nickname: userInfo.nickname,
          changed_at: new Date().toISOString(),
        });
      }
      // user_profiles upsert (allow empty fields)
      const { error } = await supabase.from('user_profiles').upsert({
        id: session.user.id,
        email: session.user.email,
        name: editInfo.name || '',
        nickname: editInfo.nickname || '',
        birthyear: editInfo.birthyear || '',
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setUserInfo(editInfo);
      setShowModal(false);
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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
        <span style={{ fontWeight: 500 }}>
          {userInfo.nickname && userInfo.nickname.trim() !== '' ? userInfo.nickname : (user?.email || user?.name)}
        </span>
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
      {showModal && (
        <>
          {/* Modal Overlay */}
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1999
          }} onClick={() => setShowModal(false)} />
          {/* Modal Responsive Position */}
          {isMobile ? (
            <div style={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
            }}>
              <div style={{
                background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '0 0 20px 0', minWidth: 0, width: '92vw', maxWidth: 340, pointerEvents: 'auto', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 8px', boxSizing: 'border-box', overflow: 'auto', maxHeight: '96vh'
              }}>
                <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: 'pointer', transition: 'color 0.2s', zIndex: 1 }} aria-label="닫기" title="닫기"
                  onMouseOver={e => e.currentTarget.style.color = '#222'}
                  onMouseOut={e => e.currentTarget.style.color = '#888'}
                >×</button>
                <div style={{ padding: '24px 0 0 0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {loading ? <div style={{ textAlign: 'center', color: '#888', fontSize: 15, margin: '32px 0' }}>로딩 중...</div> : (
                    <form onSubmit={e => { e.preventDefault(); handleSave(); }} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ marginBottom: 14, width: '92%', marginLeft: 'auto', marginRight: 'auto' }}>
                        <label style={{ fontWeight: 500, color: '#345', fontSize: 14, width: '100%' }}>이메일
                          <input type="text" value={session.user.email} disabled style={{ width: '100%', marginTop: 4, background: '#f5f7fa', border: '1px solid #e0eaff', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#888', boxSizing: 'border-box' }} />
                        </label>
                      </div>
                      <div style={{ marginBottom: 14, width: '92%', marginLeft: 'auto', marginRight: 'auto' }}>
                        <label style={{ fontWeight: 500, color: '#345', fontSize: 14, width: '100%' }}>닉네임
                          <input name="nickname" value={editInfo.nickname} onChange={handleChange} placeholder="닉네임 입력" maxLength={16} style={{ width: '100%', marginTop: 4, background: '#f5f7fa', border: '1px solid #e0eaff', borderRadius: 10, padding: '11px 14px', fontSize: 14, boxSizing: 'border-box' }} />
                        </label>
                      </div>
                      <div style={{ marginBottom: 14, width: '92%', marginLeft: 'auto', marginRight: 'auto' }}>
                        <label style={{ fontWeight: 500, color: '#345', fontSize: 14, width: '100%' }}>이름
                          <input name="name" value={editInfo.name} onChange={handleChange} placeholder="이름 입력" maxLength={16} style={{ width: '100%', marginTop: 4, background: '#f5f7fa', border: '1px solid #e0eaff', borderRadius: 10, padding: '11px 14px', fontSize: 14, boxSizing: 'border-box' }} />
                        </label>
                      </div>
                      <div style={{ marginBottom: 14, width: '92%', marginLeft: 'auto', marginRight: 'auto' }}>
                        <label style={{ fontWeight: 500, color: '#345', fontSize: 14, width: '100%' }}>출생년도
                          <input name="birthyear" value={editInfo.birthyear} onChange={handleChange} placeholder="예: 1990" maxLength={4} style={{ width: '100%', marginTop: 4, background: '#f5f7fa', border: '1px solid #e0eaff', borderRadius: 10, padding: '11px 14px', fontSize: 14, boxSizing: 'border-box' }} />
                        </label>
                      </div>
                      {error && <div style={{ color: '#e74c3c', background: '#fbeaea', borderRadius: 6, padding: '7px 10px', marginBottom: 12, fontSize: 13, width: '92%', textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>{error}</div>}
                      <div style={{ display: 'flex', gap: 18, marginTop: 10, width: '92%', marginLeft: 'auto', marginRight: 'auto', justifyContent: 'center' }}>
                        <button type="submit" style={{ flex: 1, background: '#4a7cff', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 0', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 2px 8px rgba(74,124,255,0.08)', transition: 'background 0.2s', minWidth: 0, maxWidth: '48%' }}
                          onMouseOver={e => e.currentTarget.style.background = '#295ed9'}
                          onMouseOut={e => e.currentTarget.style.background = '#4a7cff'}
                        >저장</button>
                        <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: '#fff', color: '#4a7cff', border: '1.5px solid #4a7cff', borderRadius: 8, padding: '11px 0', fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'background 0.2s, color 0.2s', minWidth: 0, maxWidth: '48%' }}
                          onMouseOver={e => { e.currentTarget.style.background = '#e0eaff'; e.currentTarget.style.color = '#295ed9'; }}
                          onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#4a7cff'; }}
                        >취소</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              position: 'fixed', top: 80, right: 40, zIndex: 2000, boxSizing: 'border-box', maxWidth: '100vw', width: 340, background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '0 0 20px 0', overflow: 'auto', maxHeight: '96vh', display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>
              <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: 'pointer', transition: 'color 0.2s', zIndex: 1 }} aria-label="닫기" title="닫기"
                onMouseOver={e => e.currentTarget.style.color = '#222'}
                onMouseOut={e => e.currentTarget.style.color = '#888'}
              >×</button>
              <div style={{ padding: '24px 0 0 0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {loading ? <div style={{ textAlign: 'center', color: '#888', fontSize: 15, margin: '32px 0' }}>로딩 중...</div> : (
                  <form onSubmit={e => { e.preventDefault(); handleSave(); }} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ marginBottom: 14, width: '92%', marginLeft: 'auto', marginRight: 'auto' }}>
                      <label style={{ fontWeight: 500, color: '#345', fontSize: 14, width: '100%' }}>이메일 (초기 닉네임)
                        <input type="text" value={session.user.email} disabled style={{ width: '100%', marginTop: 4, background: '#f5f7fa', border: '1px solid #e0eaff', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#888', boxSizing: 'border-box' }} />
                      </label>
                    </div>
                    <div style={{ marginBottom: 14, width: '92%', marginLeft: 'auto', marginRight: 'auto' }}>
                      <label style={{ fontWeight: 500, color: '#345', fontSize: 14, width: '100%' }}>닉네임
                        <input name="nickname" value={editInfo.nickname} onChange={handleChange} placeholder="닉네임 입력" maxLength={16} style={{ width: '100%', marginTop: 4, background: '#f5f7fa', border: '1px solid #e0eaff', borderRadius: 10, padding: '11px 14px', fontSize: 14, boxSizing: 'border-box' }} />
                      </label>
                    </div>
                    <div style={{ marginBottom: 14, width: '92%', marginLeft: 'auto', marginRight: 'auto' }}>
                      <label style={{ fontWeight: 500, color: '#345', fontSize: 14, width: '100%' }}>이름
                        <input name="name" value={editInfo.name} onChange={handleChange} placeholder="이름 입력" maxLength={16} style={{ width: '100%', marginTop: 4, background: '#f5f7fa', border: '1px solid #e0eaff', borderRadius: 10, padding: '11px 14px', fontSize: 14, boxSizing: 'border-box' }} />
                      </label>
                    </div>
                    <div style={{ marginBottom: 14, width: '92%', marginLeft: 'auto', marginRight: 'auto' }}>
                      <label style={{ fontWeight: 500, color: '#345', fontSize: 14, width: '100%' }}>출생년도
                        <input name="birthyear" value={editInfo.birthyear} onChange={handleChange} placeholder="예: 1990" maxLength={4} style={{ width: '100%', marginTop: 4, background: '#f5f7fa', border: '1px solid #e0eaff', borderRadius: 10, padding: '11px 14px', fontSize: 14, boxSizing: 'border-box' }} />
                      </label>
                    </div>
                    {error && <div style={{ color: '#e74c3c', background: '#fbeaea', borderRadius: 6, padding: '7px 10px', marginBottom: 12, fontSize: 13, width: '92%', textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>{error}</div>}
                    <div style={{ display: 'flex', gap: 18, marginTop: 10, width: '92%', marginLeft: 'auto', marginRight: 'auto', justifyContent: 'center' }}>
                      <button type="submit" style={{ flex: 1, background: '#4a7cff', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 0', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 2px 8px rgba(74,124,255,0.08)', transition: 'background 0.2s', minWidth: 0, maxWidth: '48%' }}
                        onMouseOver={e => e.currentTarget.style.background = '#295ed9'}
                        onMouseOut={e => e.currentTarget.style.background = '#4a7cff'}
                      >저장</button>
                      <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: '#fff', color: '#4a7cff', border: '1.5px solid #4a7cff', borderRadius: 8, padding: '11px 0', fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'background 0.2s, color 0.2s', minWidth: 0, maxWidth: '48%' }}
                        onMouseOver={e => { e.currentTarget.style.background = '#e0eaff'; e.currentTarget.style.color = '#295ed9'; }}
                        onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#4a7cff'; }}
                      >취소</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
} 