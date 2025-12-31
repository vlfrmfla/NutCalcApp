"use client";
import { useContext } from "react";
import { DataContext } from "../context/DataContext";
import SettingsIcon from "@mui/icons-material/Settings";
import "./settings.css";

export default function SettingsPage() {
  const { showGuide, setShowGuide } = useContext(DataContext);

  return (
    <div className="settings-container">
      <div className="settings-header">
        <SettingsIcon style={{ fontSize: 24, color: "#667eea" }} />
        <h1>내 설정</h1>
      </div>

      <div className="settings-section">
        <h2>화면 표시 설정</h2>

        <div className="setting-item">
          <div className="setting-info">
            <h3>사용 가이드 표시</h3>
            <p>대시보드와 급배액 관리 페이지에서 사용 가이드 버튼을 표시합니다.</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showGuide}
              onChange={(e) => setShowGuide(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-info-box">
        <p>설정은 자동으로 저장됩니다.</p>
      </div>
    </div>
  );
}
