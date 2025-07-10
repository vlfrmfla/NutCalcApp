// utils/apiClient.js
import { supabase } from "@/utils/supabaseClient";

export async function fetchWithAuth(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("JWT 없음: 로그인 먼저 하세요");

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${session.access_token}`,
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const error = await res.text();
    console.error(`API 요청 실패 (${res.status}):`, error);
    throw new Error(`API 요청 실패 (${res.status})`);
  }
  return res.json();
}
