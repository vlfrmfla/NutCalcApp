// 파일: app/display/page.js
"use client";
import { useEffect, useState, useContext } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/utils/supabaseClient";
import { DataContext } from "../context/DataContext";
import RecordModal from "../components/RecordModal";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import "./display.css";

const CompartmentChart = dynamic(() => import("../components/CompartmentChart"), {
  ssr: false,
});

export default function DisplayPage() {
  const { showGuide } = useContext(DataContext);
  const [compartments, setCompartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [recordTargetId, setRecordTargetId] = useState(null); // 기록을 추가할 컴파트먼트 id

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

  const recordTarget = compartments.find((c) => c.id === recordTargetId) || null;

  // 이 페이지에서 바로 일일 기록 추가 (대시보드 상세와 같은 daily_records 구조)
  const handleAddRecord = async (newRecord) => {
    if (!recordTarget) return;
    const newRecords = [...(recordTarget.daily_records || []), { ...newRecord, id: Date.now().toString() }];
    try {
      const { error } = await supabase
        .from("compartments")
        .update({ daily_records: newRecords })
        .eq("id", recordTarget.id);

      if (error) throw error;
      setCompartments((prev) =>
        prev.map((c) => (c.id === recordTarget.id ? { ...c, daily_records: newRecords } : c))
      );
      setRecordTargetId(null);
    } catch (err) {
      console.error("기록 저장 실패:", err.message);
      alert("기록 저장에 실패했습니다.");
    }
  };

  const totalRecords = compartments.reduce((n, c) => n + (c.daily_records?.length || 0), 0);

  return (
    <div className="display-container">
      <div className="display-header">
        <h1>급배액 관리</h1>
        <p className="display-subtitle">
          {isLoading
            ? "불러오는 중..."
            : compartments.length === 0
              ? "컴파트먼트별 급액·배액 EC/pH와 급배액량 추이를 차트로 봅니다."
              : `${compartments.length}개 컴파트먼트 · 기록 ${totalRecords}건 · 급액·배액 EC/pH와 급배액량 추이`}
        </p>
      </div>

      {/* 접을 수 있는 가이드 패널 */}
      {showGuide && !isLoading && compartments.length > 0 && (
        <div className="guide-container">
          <button
            className="guide-toggle"
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
            <div className="guide-content">
              <h4 className="guide-title">급배액 관리 차트 안내</h4>
              <ul className="guide-list">
                <li><strong>EC / pH 차트</strong>: 급액(파란색)과 배액(주황색)의 EC는 실선(왼쪽 축), pH는 점선(오른쪽 축)으로 표시합니다.</li>
                <li><strong>급배액량 / 배액률 차트</strong>: 급액량과 배액량(왼쪽 축, L)은 실선, 배액률(오른쪽 축, %)은 점선으로 표시합니다.</li>
                <li><strong>범례 클릭</strong>: 각 시리즈를 클릭하여 표시/숨김을 전환할 수 있습니다. 차트 위에 마우스를 올리면 그 날짜의 값이 모두 보입니다.</li>
                <li><strong>기록 추가</strong>: 각 컴파트먼트의 &apos;기록 추가&apos; 버튼으로 급액·배액 EC/pH와 급배액량을 바로 입력합니다. 수정·삭제는 &apos;기록 보기&apos;(컴파트먼트 상세)에서 합니다.</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="display-loading">로딩 중...</p>
      ) : compartments.length === 0 ? (
        <p className="display-empty">등록된 컴파트먼트가 없습니다. 대시보드에서 컴파트먼트를 추가해주세요.</p>
      ) : (
        compartments.map((compartment) => (
          <CompartmentChart
            key={compartment.id}
            compartment={compartment}
            onAddRecord={() => setRecordTargetId(compartment.id)}
          />
        ))
      )}

      {recordTarget && (
        <RecordModal
          compartmentName={recordTarget.name}
          onSave={handleAddRecord}
          onClose={() => setRecordTargetId(null)}
        />
      )}
    </div>
  );
}
