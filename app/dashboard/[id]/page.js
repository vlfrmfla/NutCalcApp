"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import "./detail.css";

export default function CompartmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const compartmentId = params.id;

  const [compartment, setCompartment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Supabase에서 컴파트먼트 로드
  useEffect(() => {
    const loadCompartment = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/dashboard");
          return;
        }

        const { data, error } = await supabase
          .from("compartments")
          .select("*")
          .eq("id", compartmentId)
          .eq("user_id", session.user.id)
          .single();

        if (error) throw error;
        setCompartment(data);
      } catch (err) {
        console.error("컴파트먼트 로드 실패:", err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadCompartment();
  }, [compartmentId, router]);

  // daily_records 저장
  const saveRecords = async (newRecords) => {
    try {
      const { error } = await supabase
        .from("compartments")
        .update({ daily_records: newRecords })
        .eq("id", compartmentId);

      if (error) throw error;
      setCompartment({ ...compartment, daily_records: newRecords });
    } catch (err) {
      console.error("저장 실패:", err.message);
      alert("저장에 실패했습니다.");
    }
  };

  // 기록 추가
  const handleAddRecord = (newRecord) => {
    const recordWithId = {
      ...newRecord,
      id: Date.now().toString(),
    };
    const currentRecords = compartment.daily_records || [];
    saveRecords([...currentRecords, recordWithId]);
    setIsAddModalOpen(false);
  };

  // 기록 수정
  const handleEditRecord = (updatedRecord) => {
    const currentRecords = compartment.daily_records || [];
    const newRecords = currentRecords.map(r =>
      r.id === updatedRecord.id ? updatedRecord : r
    );
    saveRecords(newRecords);
    setEditingRecord(null);
  };

  // 기록 삭제
  const handleDeleteRecord = (recordId) => {
    if (!confirm("이 기록을 삭제하시겠습니까?")) return;
    const currentRecords = compartment.daily_records || [];
    saveRecords(currentRecords.filter(r => r.id !== recordId));
  };

  // CSV 다운로드
  const handleDownloadCSV = () => {
    const records = compartment.daily_records || [];
    if (records.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }

    // 날짜순 정렬
    const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));

    // CSV 헤더
    const headers = ["날짜", "급액EC", "급액pH", "배액EC", "배액pH", "급액량", "배액량", "배액률", "메모"];

    // CSV 데이터 생성
    const csvRows = [
      headers.join(","),
      ...sortedRecords.map(record => {
        const drainRate = (record.supply_amount != null && record.supply_amount > 0 && record.drain_amount != null)
          ? ((record.drain_amount / record.supply_amount) * 100).toFixed(0)
          : "";
        return [
          record.date,
          record.supply_ec ?? "",
          record.supply_ph ?? "",
          record.drain_ec ?? "",
          record.drain_ph ?? "",
          record.supply_amount ?? "",
          record.drain_amount ?? "",
          drainRate,
          `"${(record.memo || "").replace(/"/g, '""')}"` // 메모에 쉼표가 있을 수 있으므로 따옴표 처리
        ].join(",");
      })
    ];

    const csvContent = "\uFEFF" + csvRows.join("\n"); // BOM 추가 (한글 인코딩)
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${compartment.name}_급배액기록.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="detail-container">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!compartment) {
    return (
      <div className="detail-container">
        <p>컴파트먼트를 찾을 수 없습니다.</p>
        <button onClick={() => router.push("/dashboard")}>돌아가기</button>
      </div>
    );
  }

  const dailyRecords = compartment.daily_records || [];

  return (
    <div className="detail-container">
      <div className="detail-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => router.push("/dashboard")}>
            <ArrowBackIcon style={{ fontSize: 18 }} />
          </button>
          <div className="compartment-info">
            <h1>{compartment.name}</h1>
            {compartment.crop && <span className="crop-tag">{compartment.crop}</span>}
          </div>
        </div>
        <div className="header-actions">
          <button className="download-btn" onClick={handleDownloadCSV}>
            <DownloadIcon style={{ fontSize: 18 }} /> CSV 다운로드
          </button>
          <button className="add-btn" onClick={() => setIsAddModalOpen(true)}>
            <AddIcon style={{ fontSize: 18 }} /> 기록 추가
          </button>
        </div>
      </div>

      <div className="records-section">
        {dailyRecords.length === 0 ? (
          <div className="empty-records">
            <p>아직 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="records-table-wrapper">
            <table className="records-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>급액EC</th>
                  <th>급액pH</th>
                  <th>배액EC</th>
                  <th>배액pH</th>
                  <th>급액량</th>
                  <th>배액량</th>
                  <th>배액률</th>
                  <th>메모</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {dailyRecords
                  .slice()
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(record => {
                    const drainRate = (record.supply_amount != null && record.supply_amount > 0 && record.drain_amount != null)
                      ? ((record.drain_amount / record.supply_amount) * 100).toFixed(0)
                      : null;
                    return (
                      <tr key={record.id}>
                        <td className="date-cell">{new Date(record.date).toLocaleDateString("ko-KR")}</td>
                        <td>{record.supply_ec?.toFixed(1) || "-"}</td>
                        <td>{record.supply_ph?.toFixed(1) || "-"}</td>
                        <td>{record.drain_ec?.toFixed(1) || "-"}</td>
                        <td>{record.drain_ph?.toFixed(1) || "-"}</td>
                        <td>{record.supply_amount != null ? record.supply_amount.toFixed(1) : "-"}</td>
                        <td>{record.drain_amount != null ? record.drain_amount.toFixed(1) : "-"}</td>
                        <td>{drainRate != null ? `${drainRate}%` : "-"}</td>
                        <td className="memo-cell">{record.memo || "-"}</td>
                        <td>
                          <div className="record-actions">
                            <button
                              className="icon-btn edit"
                              onClick={() => setEditingRecord(record)}
                            >
                              <EditIcon style={{ fontSize: 16 }} />
                            </button>
                            <button
                              className="icon-btn delete"
                              onClick={() => handleDeleteRecord(record.id)}
                            >
                              <DeleteIcon style={{ fontSize: 16 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 기록 추가/수정 모달 */}
      {(isAddModalOpen || editingRecord) && (
        <RecordModal
          record={editingRecord}
          onSave={editingRecord ? handleEditRecord : handleAddRecord}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingRecord(null);
          }}
        />
      )}
    </div>
  );
}

// 기록 추가/수정 모달
function RecordModal({ record, onSave, onClose }) {
  const [formData, setFormData] = useState({
    date: record?.date || new Date().toISOString().split("T")[0],
    supply_ec: record?.supply_ec || "",
    supply_ph: record?.supply_ph || "",
    drain_ec: record?.drain_ec || "",
    drain_ph: record?.drain_ph || "",
    supply_amount: record?.supply_amount || "",
    drain_amount: record?.drain_amount || "",
    memo: record?.memo || "",
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const processedData = {
      ...formData,
      supply_ec: formData.supply_ec !== "" ? parseFloat(formData.supply_ec) : null,
      supply_ph: formData.supply_ph !== "" ? parseFloat(formData.supply_ph) : null,
      drain_ec: formData.drain_ec !== "" ? parseFloat(formData.drain_ec) : null,
      drain_ph: formData.drain_ph !== "" ? parseFloat(formData.drain_ph) : null,
      supply_amount: formData.supply_amount !== "" ? parseFloat(formData.supply_amount) : null,
      drain_amount: formData.drain_amount !== "" ? parseFloat(formData.drain_amount) : null,
    };
    onSave(record ? { ...record, ...processedData } : processedData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>{record ? "기록 수정" : "새 기록 추가"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>날짜</label>
            <input
              type="date"
              value={formData.date}
              onChange={e => handleChange("date", e.target.value)}
            />
          </div>

          <div className="form-section-label">급액</div>
          <div className="form-row">
            <div className="form-group">
              <label>EC (dS/m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.supply_ec}
                onChange={e => handleChange("supply_ec", e.target.value)}
                placeholder="2.5"
              />
            </div>
            <div className="form-group">
              <label>pH</label>
              <input
                type="number"
                step="0.1"
                value={formData.supply_ph}
                onChange={e => handleChange("supply_ph", e.target.value)}
                placeholder="5.8"
              />
            </div>
            <div className="form-group">
              <label>급액량 (L)</label>
              <input
                type="number"
                step="1"
                value={formData.supply_amount}
                onChange={e => handleChange("supply_amount", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-section-label">배액</div>
          <div className="form-row">
            <div className="form-group">
              <label>EC (dS/m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.drain_ec}
                onChange={e => handleChange("drain_ec", e.target.value)}
                placeholder="3.0"
              />
            </div>
            <div className="form-group">
              <label>pH</label>
              <input
                type="number"
                step="0.1"
                value={formData.drain_ph}
                onChange={e => handleChange("drain_ph", e.target.value)}
                placeholder="6.0"
              />
            </div>
            <div className="form-group">
              <label>배액량 (L)</label>
              <input
                type="number"
                step="1"
                value={formData.drain_amount}
                onChange={e => handleChange("drain_amount", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label>메모</label>
            <textarea
              value={formData.memo}
              onChange={e => handleChange("memo", e.target.value)}
              placeholder="특이사항"
              rows={2}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-save">
              {record ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
