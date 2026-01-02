"use client";

import { useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import ScienceIcon from "@mui/icons-material/Science";
import CalculateIcon from "@mui/icons-material/Calculate";
import StorageIcon from "@mui/icons-material/Storage";
import SettingsIcon from "@mui/icons-material/Settings";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import "./info.css";

export default function InfoPage() {
  const [openSections, setOpenSections] = useState({
    overview: true,
    dashboard: false,
    display: false,
    select: false,
    calculate: false,
    datamanagement: false,
    settings: false,
    tips: false,
    reference: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="info-container">
      <h1 className="info-main-title">사용 가이드</h1>
      <p className="info-subtitle">
        순환식 수경재배 양액관리 웹 애플리케이션 사용방법을 안내합니다.
      </p>

      {/* 앱 개요 */}
      <Section
        title="앱 개요"
        icon={<TipsAndUpdatesIcon className="info-section-icon" />}
        isOpen={openSections.overview}
        onToggle={() => toggleSection("overview")}
      >
        <div className="info-overview-box">
          <p className="info-overview-text">
            이 애플리케이션은 <strong>수경재배 농가</strong>의 양액 관리를 돕기 위해 개발되었습니다.
          </p>
          <ul className="info-feature-list">
            <li><strong>대시보드</strong>: 재배 구역(컴파트먼트)별 급배액 데이터를 한눈에 관리</li>
            <li><strong>급배액 관리</strong>: EC, pH, 급배액량 추이를 차트로 시각화</li>
            <li><strong>양액 조성 선택</strong>: 작물별 표준 양액 조성 검색 및 목표 조성 계산</li>
            <li><strong>양액 조성 계산</strong>: 비료 투입량 자동 계산 (A/B 탱크 구성)</li>
            <li><strong>데이터 관리</strong>: 원수/배액 분석 데이터 저장 및 관리</li>
          </ul>
        </div>
      </Section>

      {/* 대시보드 */}
      <Section
        title="대시보드"
        icon={<DashboardIcon className="info-section-icon" />}
        isOpen={openSections.dashboard}
        onToggle={() => toggleSection("dashboard")}
      >
        <h4 className="info-step-title">컴파트먼트 관리</h4>
        <p className="info-description">
          컴파트먼트는 온실 내 재배 구역을 의미합니다. 각 구역별로 독립적인 급배액 데이터를 관리할 수 있습니다.
        </p>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">1. 컴파트먼트 추가</h5>
          <ul className="info-step-list">
            <li>오른쪽 상단의 <strong>&quot;+ 컴파트먼트 추가&quot;</strong> 버튼 클릭</li>
            <li>컴파트먼트 이름 입력 (예: Compartment 1, 딸기 1동)</li>
            <li>재배 작물 선택 (선택 사항)</li>
          </ul>
        </div>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">2. 일일 기록 입력</h5>
          <ul className="info-step-list">
            <li>컴파트먼트 카드를 <strong>클릭</strong>하여 상세 페이지로 이동</li>
            <li>날짜 선택 후 급액 EC/pH, 배액 EC/pH, 급액량, 배액량 입력</li>
            <li>배액률은 자동 계산됩니다 (배액량 ÷ 급액량 × 100)</li>
            <li>메모란에 특이사항 기록 가능</li>
          </ul>
        </div>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">3. 데이터 내보내기</h5>
          <ul className="info-step-list">
            <li>상세 페이지에서 <strong>&quot;CSV 다운로드&quot;</strong> 버튼 클릭</li>
            <li>전체 기록이 Excel에서 열 수 있는 CSV 파일로 저장됩니다</li>
          </ul>
        </div>

        <div className="info-tip-box">
          <strong>Tip:</strong> 카드 우측의 수정/삭제 아이콘으로 컴파트먼트 정보를 편집할 수 있습니다.
        </div>
      </Section>

      {/* 급배액 관리 */}
      <Section
        title="급배액 관리"
        icon={<ShowChartIcon className="info-section-icon" />}
        isOpen={openSections.display}
        onToggle={() => toggleSection("display")}
      >
        <p className="info-description">
          대시보드에 입력된 급배액 데이터를 차트로 시각화하여 추이를 분석합니다.
        </p>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">차트 구성</h5>
          <ul className="info-step-list">
            <li><strong>EC/pH 차트</strong>: 배액 EC(좌측 축)와 pH(우측 축)를 이중 축으로 표시</li>
            <li><strong>급배액량/배액률 차트</strong>: 급액량, 배액량(좌측 축, L)과 배액률(우측 축, %)을 표시</li>
          </ul>
        </div>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">차트 사용법</h5>
          <ul className="info-step-list">
            <li><strong>범례 클릭</strong>: 특정 데이터 시리즈를 숨기거나 표시</li>
            <li><strong>마우스 호버</strong>: 해당 날짜의 상세 수치 확인</li>
            <li>각 컴파트먼트별로 개별 차트가 표시됩니다</li>
          </ul>
        </div>

        <div className="info-tip-box">
          <strong>Tip:</strong> 급배액 데이터가 없으면 차트가 표시되지 않습니다. 먼저 대시보드에서 데이터를 입력하세요.
        </div>
      </Section>

      {/* 양액 조성 선택 */}
      <Section
        title="양액 조성 선택"
        icon={<ScienceIcon className="info-section-icon" />}
        isOpen={openSections.select}
        onToggle={() => toggleSection("select")}
      >
        <p className="info-description">
          작물별 표준 양액 조성을 선택하고, 원수 조성을 고려한 목표 조성을 계산합니다.
        </p>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">1. 순환 방식 선택</h5>
          <ul className="info-step-list">
            <li><strong>비순환식</strong>: 배액을 배출하는 방식 (기본)</li>
            <li><strong>순환식</strong>: 배액을 재활용하는 방식 (개발 중)</li>
          </ul>
        </div>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">2. 조성 선택 단계</h5>
          <ol className="info-step-list">
            <li><strong>작물 선택</strong>: 재배할 작물 선택 (토마토, 파프리카, 딸기 등)</li>
            <li><strong>배지 선택</strong>: 사용하는 배지 종류 선택 (암면, 코코피트 등)</li>
            <li><strong>표준 양액 조성</strong>: 생육 단계에 맞는 양액 조성 선택</li>
            <li><strong>원수 조성</strong>: 데이터 관리에서 입력한 원수 데이터 선택</li>
          </ol>
        </div>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">3. 결과 확인</h5>
          <p className="info-step-description">
            선택이 완료되면 아래 테이블에서 확인할 수 있습니다:
          </p>
          <ul className="info-step-list">
            <li><strong>표준 조성</strong>: 선택한 작물의 기준 양액 조성</li>
            <li><strong>원수 조성</strong>: 사용하는 원수의 이온 농도</li>
            <li><strong>목표 조성</strong>: 표준 조성 - 원수 조성 (비료로 보충해야 할 양)</li>
          </ul>
        </div>

        <div className="info-warning-box">
          <WarningAmberIcon style={{ fontSize: 18, marginRight: 6 }} />
          <span>원수를 먼저 선택해야 목표 조성이 계산됩니다. 원수 데이터가 없다면 데이터 관리에서 먼저 입력하세요.</span>
        </div>
      </Section>

      {/* 양액 조성 계산 */}
      <Section
        title="양액 조성 계산"
        icon={<CalculateIcon className="info-section-icon" />}
        isOpen={openSections.calculate}
        onToggle={() => toggleSection("calculate")}
      >
        <p className="info-description">
          양액 조성 선택에서 설정한 목표 조성을 바탕으로 실제 비료 투입량을 계산합니다.
        </p>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">1. 비료 종류 선택</h5>
          <ul className="info-step-list">
            <li><strong>질소비료</strong>: 4수염 또는 10수염 질산칼슘 선택</li>
            <li><strong>인산비료</strong>: 제일인산칼륨 또는 제일인산암모늄 선택</li>
            <li><strong>Fe 비료</strong>: DTPA, EDTA, EDDHA 중 선택</li>
            <li><strong>중화 방식</strong>: 질산(60%) 또는 인산(85.5%) 선택</li>
          </ul>
        </div>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">2. 설정값 입력</h5>
          <ul className="info-step-list">
            <li><strong>중탄산(HCO₃⁻) 목표값</strong>: 배양액 내 목표 HCO₃ 농도 (기본: 0.5 mmol/L)</li>
            <li><strong>급액 EC</strong>: 목표 급액 EC (원수 + 목표 조성에서 자동 계산)</li>
            <li><strong>농도</strong>: 원액 희석 배율 (50배, 100배, 200배)</li>
            <li><strong>양액탱크 용량</strong>: A, B 탱크 용량 (L)</li>
          </ul>
        </div>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">3. 계산 결과</h5>
          <p className="info-step-description">
            &quot;계산하기&quot; 버튼을 누르면:
          </p>
          <ul className="info-step-list">
            <li>상단 테이블에서 목표 조성과 비료 계산 결과 비교 확인</li>
            <li><strong>A Tank 구성</strong>: 질산칼슘, 질산칼륨, 질산암모늄, Fe 비료 투입량</li>
            <li><strong>B Tank 구성</strong>: 인산칼륨, 황산마그네슘, 황산칼륨, 미량원소 투입량</li>
          </ul>
        </div>

        <div className="info-tip-box">
          <strong>Tip:</strong> 비교(%) 행에서 파란색은 부족, 빨간색은 과다를 의미합니다. 100%에 가까울수록 목표에 정확합니다.
        </div>
      </Section>

      {/* 데이터 관리 */}
      <Section
        title="데이터 관리"
        icon={<StorageIcon className="info-section-icon" />}
        isOpen={openSections.datamanagement}
        onToggle={() => toggleSection("datamanagement")}
      >
        <p className="info-description">
          원수, 배액 등의 양액 분석 데이터를 저장하고 관리합니다. 저장된 데이터는 양액 조성 선택에서 사용됩니다.
        </p>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">1. 데이터 입력 방법</h5>
          <ul className="info-step-list">
            <li><strong>직접 입력</strong>: 각 이온 농도를 수동으로 입력</li>
            <li><strong>Excel 업로드</strong>: 분석 성적서 Excel 파일 자동 파싱</li>
          </ul>
        </div>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">2. 단위 설정</h5>
          <ul className="info-step-list">
            <li><strong>몰 단위</strong>: 다량원소 mmol/L, 미량원소 μmol/L (기본값, 권장)</li>
            <li><strong>질량 단위</strong>: mg/L로 입력 시 자동 변환 저장</li>
          </ul>
        </div>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">3. 데이터 관리</h5>
          <ul className="info-step-list">
            <li><strong>수정/삭제 모드</strong>: 버튼 클릭 후 각 행의 수정/삭제 아이콘 활성화</li>
            <li><strong>CSV 다운로드</strong>: 전체 데이터를 CSV 파일로 내보내기</li>
          </ul>
        </div>

        <div className="info-tip-box">
          <strong>Tip:</strong> 샘플명을 비워두면 선택한 날짜 또는 오늘 날짜가 자동으로 입력됩니다.
        </div>
      </Section>

      {/* 내 설정 */}
      <Section
        title="내 설정"
        icon={<SettingsIcon className="info-section-icon" />}
        isOpen={openSections.settings}
        onToggle={() => toggleSection("settings")}
      >
        <p className="info-description">
          화면 상단의 &quot;내 정보 관리&quot; 메뉴에서 개인 설정을 변경할 수 있습니다.
        </p>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">설정 가능 항목</h5>
          <ul className="info-step-list">
            <li><strong>사용 가이드 표시</strong>: 대시보드, 급배액 관리 페이지의 가이드 패널 표시/숨김</li>
            <li><strong>계정 정보</strong>: 이메일, 로그인 상태 확인</li>
          </ul>
        </div>

        <div className="info-tip-box">
          <strong>Tip:</strong> 앱 사용에 익숙해지면 가이드를 숨겨 화면을 더 넓게 사용할 수 있습니다.
        </div>
      </Section>

      {/* 참고 자료 */}
      <Section
        title="참고 자료"
        icon={<TipsAndUpdatesIcon className="info-section-icon" />}
        isOpen={openSections.reference}
        onToggle={() => toggleSection("reference")}
      >
        <div className="info-step-box">
          <h5 className="info-step-subtitle">배액 배출 기준 (네덜란드)</h5>
          <p className="info-step-description">
            배출수의 Na 수치 기준 (mmol/L):
          </p>
          <div className="info-reference-table">
            <table className="info-table">
              <tbody>
                <tr>
                  <td className="info-table-cell"><strong>토마토</strong></td>
                  <td className="info-table-cell">8</td>
                  <td className="info-table-cell"><strong>고추</strong></td>
                  <td className="info-table-cell">6</td>
                  <td className="info-table-cell"><strong>가지</strong></td>
                  <td className="info-table-cell">6</td>
                </tr>
                <tr>
                  <td className="info-table-cell"><strong>애호박</strong></td>
                  <td className="info-table-cell">6</td>
                  <td className="info-table-cell"><strong>멜론</strong></td>
                  <td className="info-table-cell">6</td>
                  <td className="info-table-cell"><strong>딸기</strong></td>
                  <td className="info-table-cell">3</td>
                </tr>
                <tr>
                  <td className="info-table-cell"><strong>장미</strong></td>
                  <td className="info-table-cell">4</td>
                  <td className="info-table-cell"><strong>거베라</strong></td>
                  <td className="info-table-cell">4</td>
                  <td className="info-table-cell"><strong>백합</strong></td>
                  <td className="info-table-cell">3</td>
                </tr>
                <tr>
                  <td className="info-table-cell"><strong>기타 작물</strong></td>
                  <td className="info-table-cell">5</td>
                  <td className="info-table-cell"><strong>양상추</strong></td>
                  <td className="info-table-cell">5</td>
                  <td className="info-table-cell"><strong>난</strong></td>
                  <td className="info-table-cell">0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="info-step-box">
          <h5 className="info-step-subtitle">일반적인 급액 관리 기준</h5>
          <ul className="info-step-list">
            <li><strong>급액 EC</strong>: 작물별 상이, 일반적으로 1.5~3.0 dS/m</li>
            <li><strong>급액 pH</strong>: 5.5~6.5 범위 유지 권장</li>
            <li><strong>배액률</strong>: 일반적으로 20~40% 권장 (계절, 작물에 따라 조정)</li>
          </ul>
        </div>
      </Section>

      <footer className="info-footer">
        <p>문의사항이나 개선 제안은 관리자에게 연락해주세요.</p>
      </footer>
    </div>
  );
}

// 섹션 컴포넌트
function Section({ title, icon, isOpen, onToggle, children }) {
  return (
    <div className="info-section">
      <button className="info-section-header" onClick={onToggle}>
        <div className="info-section-title-wrap">
          {icon}
          <span className="info-section-title">{title}</span>
        </div>
        {isOpen ? (
          <ExpandLessIcon className="info-expand-icon" />
        ) : (
          <ExpandMoreIcon className="info-expand-icon" />
        )}
      </button>
      {isOpen && <div className="info-section-content">{children}</div>}
    </div>
  );
}
