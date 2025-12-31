"use client";
import { useState, useEffect, useContext } from "react";
import { DataContext } from "../context/DataContext";
import { supabase } from "@/utils/supabaseClient";
import CompartmentCard from "../components/CompartmentCard";
import AddIcon from "@mui/icons-material/Add";
import "./dashboard.css";

export default function DashboardPage() {
  const { nutrientData } = useContext(DataContext);
  const [compartments, setCompartments] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCompartment, setEditingCompartment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 컴파트먼트 데이터 로드
  useEffect(() => {
    const loadCompartments = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data, error } = await supabase
            .from("compartments")
            .select("*")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: true });

          if (error) throw error;
          setCompartments(data || []);
        }
      } catch (err) {
        console.error("컴파트먼트 로드 실패:", err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadCompartments();

    // 로그인 상태 변화 감지
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
      if (!session) return;

      const { data, error } = await supabase
        .from("compartments")
        .insert([{ ...newCompartment, user_id: session.user.id }])
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
        .update(updatedCompartment)
        .eq("id", updatedCompartment.id);

      if (error) throw error;
      setCompartments(compartments.map(c =>
        c.id === updatedCompartment.id ? updatedCompartment : c
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

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>재배 섹터 대시보드</h1>
        <p className="dashboard-subtitle">각 컴파트먼트의 작물 및 양액 현황을 관리합니다</p>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <p>로딩 중...</p>
        </div>
      ) : (
        <div className="compartments-grid">
          {compartments.map((compartment, index) => (
            <CompartmentCard
              key={compartment.id}
              compartment={compartment}
              index={index + 1}
              onEdit={() => setEditingCompartment(compartment)}
              onDelete={() => handleDeleteCompartment(compartment.id)}
            />
          ))}

          {/* 컴파트먼트 추가 카드 */}
          <div
            className="add-compartment-card"
            onClick={() => setIsAddModalOpen(true)}
          >
            <AddIcon style={{ fontSize: 48, color: "#999" }} />
            <span>컴파트먼트 추가</span>
          </div>
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
    substrate: compartment?.substrate || "",
    ec_target: compartment?.ec_target || 2.5,
    ph_target: compartment?.ph_target || 5.8,
    supply_amount: compartment?.supply_amount || 0,
    drain_amount: compartment?.drain_amount || 0,
    ec_current: compartment?.ec_current || 0,
    ph_current: compartment?.ph_current || 0,
  });

  const crops = nutrientData ? Object.keys(nutrientData) : [];
  const substrates = formData.crop && nutrientData?.[formData.crop]
    ? Object.keys(nutrientData[formData.crop])
    : [];

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // 작물 변경 시 배지 초기화
      ...(field === "crop" ? { substrate: "" } : {})
    }));
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

          <div className="form-row">
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

            <div className="form-group">
              <label>배지</label>
              <select
                value={formData.substrate}
                onChange={e => handleChange("substrate", e.target.value)}
                disabled={!formData.crop}
              >
                <option value="">선택하세요</option>
                {substrates.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section-title">목표값</div>
          <div className="form-row">
            <div className="form-group">
              <label>목표 EC (dS/m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.ec_target}
                onChange={e => handleChange("ec_target", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="form-group">
              <label>목표 pH</label>
              <input
                type="number"
                step="0.1"
                value={formData.ph_target}
                onChange={e => handleChange("ph_target", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="form-section-title">현재 측정값</div>
          <div className="form-row">
            <div className="form-group">
              <label>현재 EC (dS/m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.ec_current}
                onChange={e => handleChange("ec_current", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="form-group">
              <label>현재 pH</label>
              <input
                type="number"
                step="0.1"
                value={formData.ph_current}
                onChange={e => handleChange("ph_current", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>급액량 (L)</label>
              <input
                type="number"
                step="0.1"
                value={formData.supply_amount}
                onChange={e => handleChange("supply_amount", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="form-group">
              <label>배액량 (L)</label>
              <input
                type="number"
                step="0.1"
                value={formData.drain_amount}
                onChange={e => handleChange("drain_amount", parseFloat(e.target.value) || 0)}
              />
            </div>
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
