"use client";
import { useState } from "react";
import "./RecordModal.css";

const NUMBER_FIELDS = ["supply_ec", "supply_ph", "drain_ec", "drain_ph", "supply_amount", "drain_amount"];

// 숫자 값을 입력칸 문자열로 (0도 그대로 보이게)
const toInput = (value) => (value == null ? "" : String(value));

// 로컬 기준 오늘 날짜 (YYYY-MM-DD). toISOString()은 UTC라 새벽에 전날이 찍힌다
const localToday = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// 일일 급배액 기록 추가/수정 모달. 대시보드 상세와 급배액 관리 페이지에서 함께 쓴다
export default function RecordModal({ record, compartmentName, onSave, onClose }) {
  const [formData, setFormData] = useState({
    date: record?.date || localToday(),
    supply_ec: toInput(record?.supply_ec),
    supply_ph: toInput(record?.supply_ph),
    drain_ec: toInput(record?.drain_ec),
    drain_ph: toInput(record?.drain_ph),
    supply_amount: toInput(record?.supply_amount),
    drain_amount: toInput(record?.drain_amount),
    memo: record?.memo || "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.date) {
      alert("날짜를 선택해주세요.");
      return;
    }
    const processed = { ...formData };
    for (const field of NUMBER_FIELDS) {
      const n = parseFloat(formData[field]);
      processed[field] = formData[field] !== "" && Number.isFinite(n) ? n : null;
    }
    onSave(record ? { ...record, ...processed } : processed);
  };

  const numberField = (field, label, step, placeholder) => (
    <div className="rm-field">
      <label htmlFor={`rm-${field}`}>{label}</label>
      <input
        id={`rm-${field}`}
        type="number"
        step={step}
        inputMode="decimal"
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="rm-overlay" onClick={onClose}>
      <div className="rm-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 className="rm-title">{record ? "기록 수정" : "새 기록 추가"}</h2>
        {compartmentName && <p className="rm-sub">{compartmentName}</p>}
        <form onSubmit={handleSubmit}>
          <div className="rm-field">
            <label htmlFor="rm-date">날짜</label>
            <input
              id="rm-date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange("date", e.target.value)}
            />
          </div>

          <div className="rm-section rm-section-supply">급액</div>
          <div className="rm-row">
            {numberField("supply_ec", "EC (dS/m)", "0.1", "2.5")}
            {numberField("supply_ph", "pH", "0.1", "5.8")}
            {numberField("supply_amount", "급액량 (L)", "1", "0")}
          </div>

          <div className="rm-section rm-section-drain">배액</div>
          <div className="rm-row">
            {numberField("drain_ec", "EC (dS/m)", "0.1", "3.0")}
            {numberField("drain_ph", "pH", "0.1", "6.0")}
            {numberField("drain_amount", "배액량 (L)", "1", "0")}
          </div>

          <div className="rm-field">
            <label htmlFor="rm-memo">메모</label>
            <textarea
              id="rm-memo"
              value={formData.memo}
              onChange={(e) => handleChange("memo", e.target.value)}
              placeholder="특이사항"
              rows={2}
            />
          </div>

          <div className="rm-actions">
            <button type="button" className="rm-btn-cancel" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="rm-btn-save">
              {record ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
