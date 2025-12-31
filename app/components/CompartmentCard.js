"use client";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import OpacityIcon from "@mui/icons-material/Opacity";
import ScienceIcon from "@mui/icons-material/Science";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import "./CompartmentCard.css";

export default function CompartmentCard({ compartment, index, onEdit, onDelete }) {
  const {
    name,
    crop,
    substrate,
    ec_target,
    ph_target,
    ec_current,
    ph_current,
    supply_amount,
    drain_amount,
  } = compartment;

  // EC 상태 체크 (목표값 대비 ±0.3 이내면 정상)
  const getEcStatus = () => {
    if (!ec_current || !ec_target) return "neutral";
    const diff = Math.abs(ec_current - ec_target);
    if (diff <= 0.3) return "good";
    if (diff <= 0.5) return "warning";
    return "danger";
  };

  // pH 상태 체크 (목표값 대비 ±0.3 이내면 정상)
  const getPhStatus = () => {
    if (!ph_current || !ph_target) return "neutral";
    const diff = Math.abs(ph_current - ph_target);
    if (diff <= 0.3) return "good";
    if (diff <= 0.5) return "warning";
    return "danger";
  };

  // 배액률 계산
  const getDrainRate = () => {
    if (!supply_amount || supply_amount === 0) return 0;
    return ((drain_amount / supply_amount) * 100).toFixed(1);
  };

  return (
    <div className="compartment-card">
      <div className="card-header">
        <div className="card-title">
          <span className="card-index">{index}</span>
          <h3>{name || `Compartment ${index}`}</h3>
        </div>
        <div className="card-actions">
          <button className="action-btn edit" onClick={onEdit} title="수정">
            <EditIcon fontSize="small" />
          </button>
          <button className="action-btn delete" onClick={onDelete} title="삭제">
            <DeleteIcon fontSize="small" />
          </button>
        </div>
      </div>

      <div className="card-crop-info">
        <LocalFloristIcon className="crop-icon" />
        <div className="crop-details">
          <span className="crop-name">{crop || "미설정"}</span>
          <span className="substrate-name">{substrate || "-"}</span>
        </div>
      </div>

      <div className="card-metrics">
        <div className={`metric-item ${getEcStatus()}`}>
          <div className="metric-header">
            <ScienceIcon className="metric-icon" />
            <span className="metric-label">EC</span>
          </div>
          <div className="metric-values">
            <span className="metric-current">{ec_current?.toFixed(1) || "-"}</span>
            <span className="metric-unit">dS/m</span>
          </div>
          <div className="metric-target">
            목표: {ec_target?.toFixed(1) || "-"}
          </div>
        </div>

        <div className={`metric-item ${getPhStatus()}`}>
          <div className="metric-header">
            <OpacityIcon className="metric-icon" />
            <span className="metric-label">pH</span>
          </div>
          <div className="metric-values">
            <span className="metric-current">{ph_current?.toFixed(1) || "-"}</span>
            <span className="metric-unit"></span>
          </div>
          <div className="metric-target">
            목표: {ph_target?.toFixed(1) || "-"}
          </div>
        </div>
      </div>

      <div className="card-water-info">
        <div className="water-item supply">
          <WaterDropIcon className="water-icon" />
          <div className="water-details">
            <span className="water-label">급액량</span>
            <span className="water-value">{supply_amount?.toFixed(1) || 0} L</span>
          </div>
        </div>
        <div className="water-item drain">
          <WaterDropIcon className="water-icon" />
          <div className="water-details">
            <span className="water-label">배액량</span>
            <span className="water-value">{drain_amount?.toFixed(1) || 0} L</span>
          </div>
        </div>
        <div className="water-item rate">
          <div className="water-details">
            <span className="water-label">배액률</span>
            <span className="water-value">{getDrainRate()}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
