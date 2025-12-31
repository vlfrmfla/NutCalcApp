// 파일: app/display/page.js
"use client";
import { useEffect, useState, useContext } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/utils/supabaseClient";
import { DataContext } from "../context/DataContext";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

const CompartmentChart = dynamic(() => import("../components/CompartmentChart"), {
  ssr: false,
});

export default function DisplayPage() {
  const { showGuide } = useContext(DataContext);
  const [compartments, setCompartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    const loadCompartments = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setCompartments([]);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("compartments")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setCompartments(data || []);
      } catch (err) {
        console.error("컴파트먼트 로드 실패:", err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadCompartments();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadCompartments();
      } else {
        setCompartments([]);
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: "24px" }}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (compartments.length === 0) {
    return (
      <div style={{ padding: "24px" }}>
        <p style={{ color: "#666" }}>등록된 컴파트먼트가 없습니다. 대시보드에서 컴파트먼트를 추가해주세요.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      {/* 접을 수 있는 가이드 패널 */}
      {showGuide && (
        <div style={styles.guideContainer}>
          <button
            style={styles.guideToggle}
            onClick={() => setIsGuideOpen(!isGuideOpen)}
          >
            <HelpOutlineIcon style={{ fontSize: 16, marginRight: 6 }} />
            <span>사용 가이드</span>
            {isGuideOpen ? (
              <ExpandLessIcon style={{ fontSize: 18, marginLeft: "auto" }} />
            ) : (
              <ExpandMoreIcon style={{ fontSize: 18, marginLeft: "auto" }} />
            )}
          </button>
          {isGuideOpen && (
            <div style={styles.guideContent}>
              <h4 style={styles.guideTitle}>급배액 관리 차트 안내</h4>
              <ul style={styles.guideList}>
                <li><strong>배액 EC / pH 차트</strong>: 배액의 EC(왼쪽 축)와 pH(오른쪽 축)를 이중 축으로 표시합니다.</li>
                <li><strong>급배액량 / 배액률 차트</strong>: 급액량과 배액량(왼쪽 축, L), 배액률(오른쪽 축, %)을 표시합니다.</li>
                <li><strong>범례 클릭</strong>: 각 시리즈를 클릭하여 표시/숨김을 전환할 수 있습니다.</li>
                <li><strong>데이터 입력</strong>: 대시보드에서 컴파트먼트를 클릭하여 일일 기록을 추가/수정할 수 있습니다.</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {compartments.map((compartment) => (
        <CompartmentChart key={compartment.id} compartment={compartment} />
      ))}
    </div>
  );
}

const styles = {
  guideContainer: {
    marginBottom: "20px",
  },
  guideToggle: {
    display: "flex",
    alignItems: "center",
    padding: "10px 14px",
    background: "#f8f9fa",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#555",
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "fit-content",
  },
  guideContent: {
    marginTop: "12px",
    padding: "16px 20px",
    background: "#f8f9fa",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#444",
    lineHeight: 1.6,
  },
  guideTitle: {
    margin: "0 0 12px 0",
    fontSize: "14px",
    fontWeight: 600,
    color: "#333",
  },
  guideList: {
    margin: 0,
    paddingLeft: "20px",
  },
};
