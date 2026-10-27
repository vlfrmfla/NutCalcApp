"use client";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import "./CompartmentCard.css";

export default function CompartmentCard({ compartment, index, onClick, onEdit, onDelete }) {
  const {
    name,
    crop,
    dailyRecords = [],
  } = compartment;

  // 최신 기록 (날짜 기준)
  const latestRecord = dailyRecords.length > 0
    ? [...dailyRecords].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    : null;

  const fmt = (value, digits) => {
    const n = Number(value);
    return value == null || value === "" || !Number.isFinite(n) ? "-" : n.toFixed(digits);
  };

  // 배액률 계산
  const getDrainRate = () => {
    const supply = Number(latestRecord?.supply_amount);
    const drain = Number(latestRecord?.drain_amount);
    if (!(supply > 0) || !Number.isFinite(drain)) return "-";
    return ((drain / supply) * 100).toFixed(0);
  };

  return (
    <div className="compartment-row" onClick={onClick}>
      <div className="row-header">
        <span className="row-index">{index}</span>
        <div className="row-info">
          <span className="row-name">{name || `Comp ${index}`}</span>
          <span className="row-crop">{crop || "작물 미지정"} · {latestRecord?.date ? `최근 기록 ${latestRecord.date}` : "기록 없음"}</span>
        </div>
        <div className="row-actions">
          <button className="action-btn-sm edit" onClick={onEdit} title="수정">
            <EditIcon style={{ fontSize: 16 }} />
          </button>
          <button className="action-btn-sm delete" onClick={onDelete} title="삭제">
            <DeleteIcon style={{ fontSize: 16 }} />
          </button>
        </div>
      </div>

      <div className="row-metrics">
        <div className="metric-box supply-ec">
          <span className="metric-label">급액EC</span>
          <span className="metric-value">{fmt(latestRecord?.supply_ec, 1)}</span>
          <span className="metric-unit">dS/m</span>
        </div>
        <div className="metric-box supply-ph">
          <span className="metric-label">급액pH</span>
          <span className="metric-value">{fmt(latestRecord?.supply_ph, 1)}</span>
          <span className="metric-unit"></span>
        </div>
        <div className="metric-box drain-ec">
          <span className="metric-label">배액EC</span>
          <span className="metric-value">{fmt(latestRecord?.drain_ec, 1)}</span>
          <span className="metric-unit">dS/m</span>
        </div>
        <div className="metric-box drain-ph">
          <span className="metric-label">배액pH</span>
          <span className="metric-value">{fmt(latestRecord?.drain_ph, 1)}</span>
          <span className="metric-unit"></span>
        </div>
        <div className="metric-box supply-amt">
          <span className="metric-label">급액량</span>
          <span className="metric-value">{fmt(latestRecord?.supply_amount, 0)}</span>
          <span className="metric-unit">L</span>
        </div>
        <div className="metric-box drain-amt">
          <span className="metric-label">배액량</span>
          <span className="metric-value">{fmt(latestRecord?.drain_amount, 0)}</span>
          <span className="metric-unit">L</span>
        </div>
        <div className="metric-box drain-rate">
          <span className="metric-label">배액률</span>
          <span className="metric-value">{getDrainRate()}</span>
          <span className="metric-unit">%</span>
        </div>
      </div>
    </div>
  );
}
