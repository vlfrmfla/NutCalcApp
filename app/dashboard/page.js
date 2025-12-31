"use client";
import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { DataContext } from "../context/DataContext";
import { supabase } from "@/utils/supabaseClient";
import CompartmentCard from "../components/CompartmentCard";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import "./dashboard.css";

export default function DashboardPage() {
  const router = useRouter();
  const { nutrientData, showGuide } = useContext(DataContext);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [compartments, setCompartments] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCompartment, setEditingCompartment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Supabase에서 컴파트먼트 로드
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

  useEffect(() => {
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

  // 컴파트먼트 추가
  const handleAddCompartment = async (newCompartment) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("로그인이 필요합니다.");
        return;
      }

      const { data, error } = await supabase
        .from("compartments")
        .insert([{
          user_id: session.user.id,
          name: newCompartment.name,
          crop: newCompartment.crop,
          daily_records: [],
        }])
        .select()
        .single();

      if (error) throw error;
      setCompartments([...compartments, data]);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error("컴파트먼트 추가 실패:", err.message);
      alert("컴파트먼트 추가에 실패했습니다.");
    }
  };

  // 컴파트먼트 수정
  const handleEditCompartment = async (updatedCompartment) => {
    try {
      const { error } = await supabase
        .from("compartments")
        .update({
          name: updatedCompartment.name,
          crop: updatedCompartment.crop,
        })
        .eq("id", updatedCompartment.id);

      if (error) throw error;
      setCompartments(compartments.map(c =>
        c.id === updatedCompartment.id ? { ...c, ...updatedCompartment } : c
      ));
      setEditingCompartment(null);
    } catch (err) {
      console.error("컴파트먼트 수정 실패:", err.message);
      alert("컴파트먼트 수정에 실패했습니다.");
    }
  };

  // 컴파트먼트 삭제
  const handleDeleteCompartment = async (id) => {
    if (!confirm("정말로 이 컴파트먼트를 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("compartments")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setCompartments(compartments.filter(c => c.id !== id));
    } catch (err) {
      console.error("컴파트먼트 삭제 실패:", err.message);
      alert("컴파트먼트 삭제에 실패했습니다.");
    }
  };

  // 컴파트먼트 클릭 시 상세 페이지로 이동
  const handleCardClick = (compartmentId) => {
    router.push(`/dashboard/${compartmentId}`);
  };

  return (
    <div className="dashboard-container">
      {/* 접을 수 있는 가이드 패널 */}
      {showGuide && (
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
              <h4 className="guide-title">대시보드 사용 안내</h4>
              <ul className="guide-list">
                <li><strong>컴파트먼트 추가</strong>: 오른쪽 상단 버튼을 클릭하여 새 컴파트먼트(재배 구역)를 등록합니다.</li>
                <li><strong>컴파트먼트 클릭</strong>: 컴파트먼트를 클릭하면 일일 급배액 기록을 추가/관리할 수 있습니다.</li>
                <li><strong>수정/삭제</strong>: 각 컴파트먼트 오른쪽의 아이콘을 클릭하여 수정하거나 삭제합니다.</li>
                <li><strong>급배액 관리</strong>: 왼쪽 메뉴의 &apos;급배액 관리&apos;에서 차트로 데이터를 확인할 수 있습니다.</li>
              </ul>
              <p className="guide-tip">💡 가이드는 &apos;내 설정&apos; 메뉴에서 숨길 수 있습니다.</p>
            </div>
          )}
        </div>
      )}

      <div className="dashboard-header">
        <button className="add-btn" onClick={() => setIsAddModalOpen(true)}>
          <AddIcon style={{ fontSize: 18 }} /> 컴파트먼트 추가
        </button>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <p>로딩 중...</p>
        </div>
      ) : compartments.length === 0 ? (
        <div className="empty-state">
          <p>등록된 컴파트먼트가 없습니다.</p>
        </div>
      ) : (
        <div className="compartments-list">
          {compartments.map((compartment, index) => (
            <CompartmentCard
              key={compartment.id}
              compartment={{
                ...compartment,
                dailyRecords: compartment.daily_records || [],
              }}
              index={index + 1}
              onClick={() => handleCardClick(compartment.id)}
              onEdit={(e) => {
                e.stopPropagation();
                setEditingCompartment(compartment);
              }}
              onDelete={(e) => {
                e.stopPropagation();
                handleDeleteCompartment(compartment.id);
              }}
            />
          ))}
        </div>
      )}

      {/* 추가/수정 모달 */}
      {(isAddModalOpen || editingCompartment) && (
        <CompartmentModal
          compartment={editingCompartment}
          nutrientData={nutrientData}
          onSave={editingCompartment ? handleEditCompartment : handleAddCompartment}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingCompartment(null);
          }}
        />
      )}
    </div>
  );
}

// 컴파트먼트 추가/수정 모달
function CompartmentModal({ compartment, nutrientData, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: compartment?.name || "",
    crop: compartment?.crop || "",
  });

  const crops = nutrientData ? Object.keys(nutrientData) : [];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("컴파트먼트 이름을 입력해주세요.");
      return;
    }
    onSave(compartment ? { ...compartment, ...formData } : formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>{compartment ? "컴파트먼트 수정" : "새 컴파트먼트 추가"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>컴파트먼트 이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleChange("name", e.target.value)}
              placeholder="예: Compartment 1"
            />
          </div>

          <div className="form-group">
            <label>작물</label>
            <select
              value={formData.crop}
              onChange={e => handleChange("crop", e.target.value)}
            >
              <option value="">선택하세요</option>
              {crops.map(crop => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-save">
              {compartment ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
