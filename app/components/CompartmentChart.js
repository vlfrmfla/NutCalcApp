"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ResponsiveLine } from "@nivo/line";
import AddIcon from "@mui/icons-material/Add";
import "./CompartmentChart.css";

const MARGIN = { top: 20, right: 60, bottom: 58, left: 60 }; // 아래 여백: 기울인 날짜 라벨이 축 제목과 겹치지 않게
const SUPPLY_COLOR = "#1e88e5"; // 급액: 파란색
const DRAIN_COLOR = "#fb8c00"; // 배액: 주황색
const RATE_COLOR = "#8e24aa"; // 배액률: 보라색

const fixed1 = (v) => v.toFixed(1);
const liters = (v) => `${Math.round(v)} L`;
const percent = (v) => `${Math.round(v)}%`;

// 차트 시리즈 정의. 실선 = EC/양, 점선 = pH/배액률(오른쪽 축)
const EC_SERIES = [
  { id: "급액 EC", field: "supply_ec", color: SUPPLY_COLOR, format: fixed1 },
  { id: "배액 EC", field: "drain_ec", color: DRAIN_COLOR, format: fixed1 },
];
const PH_SERIES = [
  { id: "급액 pH", field: "supply_ph", color: SUPPLY_COLOR, dashed: true, format: fixed1 },
  { id: "배액 pH", field: "drain_ph", color: DRAIN_COLOR, dashed: true, format: fixed1 },
];
const VOLUME_SERIES = [
  { id: "급액량", field: "supply_amount", color: SUPPLY_COLOR, format: liters },
  { id: "배액량", field: "drain_amount", color: DRAIN_COLOR, format: liters },
];
const RATE_SERIES = [{ id: "배액률", field: "drain_rate", color: RATE_COLOR, dashed: true, format: percent }];

const toNumber = (v) => {
  const n = Number(v);
  return v == null || v === "" || !Number.isFinite(n) ? null : n;
};

// "YYYY-MM-DD" → 축 라벨. 여러 해에 걸치면 연도도 붙인다
function dateLabel(date, withYear) {
  const parts = String(date).split("-").map(Number);
  const [y, m, d] = parts.length === 3 && parts.every(Number.isFinite)
    ? parts
    : [new Date(date).getFullYear(), new Date(date).getMonth() + 1, new Date(date).getDate()];
  return withYear ? `${String(y).slice(2)}/${m}/${d}` : `${m}/${d}`;
}

// 날짜별 한 행으로 정리 (같은 날짜가 여러 개면 마지막 기록 사용)
function buildRows(records) {
  const byDate = new Map();
  for (const r of records) if (r?.date) byDate.set(r.date, r);
  const dates = [...byDate.keys()].sort();
  const withYear = new Set(dates.map((d) => String(d).slice(0, 4))).size > 1;
  return dates.map((date) => {
    const r = byDate.get(date);
    const supply = toNumber(r.supply_amount);
    const drain = toNumber(r.drain_amount);
    return {
      date,
      label: dateLabel(date, withYear),
      supply_ec: toNumber(r.supply_ec),
      supply_ph: toNumber(r.supply_ph),
      drain_ec: toNumber(r.drain_ec),
      drain_ph: toNumber(r.drain_ph),
      supply_amount: supply,
      drain_amount: drain,
      drain_rate: supply > 0 && drain != null ? Math.round((drain / supply) * 100) : null,
    };
  });
}

// 모든 시리즈가 같은 날짜 축을 쓰도록 값이 없는 날은 y: null (선이 끊긴다)
const makeSeries = (defs, rows) =>
  defs.map((s) => ({
    ...s,
    data: rows.map((row) => ({ x: row.label, y: row[s.field] })),
    hasData: rows.some((row) => row[s.field] != null),
  }));

const valuesOf = (seriesList) => seriesList.flatMap((s) => s.data.map((d) => d.y).filter((y) => y != null));

function paddedRange(seriesList, fallback, pad, [lo, hi]) {
  const values = valuesOf(seriesList);
  if (values.length === 0) return fallback;
  return [Math.max(lo, Math.min(...values) - pad), Math.min(hi, Math.max(...values) + pad)];
}

function zeroBasedRange(seriesList, fallbackMax, factor, cap) {
  const values = valuesOf(seriesList);
  if (values.length === 0) return [0, fallbackMax];
  const max = Math.max(...values);
  const upper = cap != null && max <= cap ? Math.min(cap, max * factor) : max * factor;
  return [0, Math.max(10, upper)];
}

// 오른쪽 축 시리즈용 점선 레이어 (nivo Lines 레이어와 같은 방식, strokeDasharray만 추가)
const DashedLines = ({ series, lineGenerator }) =>
  series.map((s) => (
    <path
      key={s.id}
      d={lineGenerator(s.data.map((d) => d.position))}
      fill="none"
      stroke={s.color}
      strokeWidth={2}
      strokeDasharray="6 4"
    />
  ));

function Swatch({ color, dashed }) {
  return <span className="chart-legend-swatch" style={{ borderTopColor: color, borderTopStyle: dashed ? "dashed" : "solid" }} />;
}

// 날짜 하나의 모든 값을 보여 주는 툴팁
function RowTooltip({ row, defs }) {
  if (!row) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{row.date}</div>
      {defs.map((s) => (
        <div key={s.id} className="chart-tooltip-row">
          <Swatch color={s.color} dashed={s.dashed} />
          <span className="chart-tooltip-label">{s.id}</span>
          <strong>{row[s.field] == null ? "-" : s.format(row[s.field])}</strong>
        </div>
      ))}
    </div>
  );
}

function Legend({ series, hidden, onToggle }) {
  return (
    <div className="chart-legend">
      {series.map((s) => (
        <div
          key={s.id}
          className="chart-legend-item"
          style={{ opacity: hidden[s.id] || !s.hasData ? 0.35 : 1, cursor: s.hasData ? "pointer" : "default" }}
          title={s.hasData ? "클릭하면 표시/숨김" : "기록 없음"}
          onClick={() => s.hasData && onToggle(s.id)}
        >
          <Swatch color={s.color} dashed={s.dashed} />
          <span className="chart-legend-text">{s.id}</span>
        </div>
      ))}
    </div>
  );
}

// 왼쪽 축(실선) 차트 + 오른쪽 축(점선) 오버레이로 이루어진 이중 축 차트
function DualAxisChart({ title, leftDefs, rightDefs, rows, leftLegend, rightLegend, leftRange, rightRange }) {
  const [hidden, setHidden] = useState({});
  const toggle = (id) => setHidden((prev) => ({ ...prev, [id]: !prev[id] }));

  const left = useMemo(() => makeSeries(leftDefs, rows), [leftDefs, rows]);
  const right = useMemo(() => makeSeries(rightDefs, rows), [rightDefs, rows]);
  const rowsByLabel = useMemo(() => new Map(rows.map((row) => [row.label, row])), [rows]);

  const visibleLeft = left.filter((s) => s.hasData && !hidden[s.id]);
  const visibleRight = right.filter((s) => s.hasData && !hidden[s.id]);
  const allDefs = [...leftDefs, ...rightDefs];

  return (
    <div className="chart-box">
      <div className="chart-box-head">
        <h5 className="chart-box-title">{title}</h5>
        <Legend series={[...left, ...right]} hidden={hidden} onToggle={toggle} />
      </div>
      <div className="chart-area">
        <ResponsiveLine
          data={visibleLeft}
          margin={MARGIN}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: leftRange(visibleLeft)[0], max: leftRange(visibleLeft)[1] }}
          axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: -45, legend: "날짜", legendOffset: 50, legendPosition: "middle" }}
          axisLeft={{ tickSize: 5, tickPadding: 5, legend: leftLegend, legendOffset: -45, legendPosition: "middle" }}
          axisRight={null}
          colors={{ datum: "color" }}
          lineWidth={2}
          pointSize={6}
          pointBorderWidth={2}
          pointBorderColor={{ from: "serieColor" }}
          enableGridX={false}
          enableSlices="x"
          sliceTooltip={({ slice }) => <RowTooltip row={rowsByLabel.get(slice.points[0]?.data?.x)} defs={allDefs} />}
        />
        {visibleRight.length > 0 && (
          <div className="chart-overlay">
            <ResponsiveLine
              data={visibleRight}
              margin={MARGIN}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: rightRange(visibleRight)[0], max: rightRange(visibleRight)[1] }}
              axisBottom={null}
              axisLeft={null}
              axisRight={{ tickSize: 5, tickPadding: 5, legend: rightLegend, legendOffset: 45, legendPosition: "middle" }}
              colors={{ datum: "color" }}
              layers={["axes", DashedLines, "points"]}
              pointSize={6}
              pointBorderWidth={2}
              pointBorderColor={{ from: "serieColor" }}
              isInteractive={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const ecRange = (s) => paddedRange(s, [0, 5], 0.5, [0, Infinity]);
const phRange = (s) => paddedRange(s, [4, 8], 0.5, [0, 14]);
const volumeRange = (s) => zeroBasedRange(s, 100, 1.1);
const rateRange = (s) => zeroBasedRange(s, 100, 1.2, 100);

export default function CompartmentChart({ compartment, onAddRecord }) {
  const records = compartment.daily_records || [];
  const rows = useMemo(() => buildRows(records), [records]);
  const latest = rows[rows.length - 1];

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4 className="chart-title">{compartment.name}</h4>
        {compartment.crop && <span className="chart-crop-tag">{compartment.crop}</span>}
        <span className="chart-meta">{latest ? `기록 ${records.length}건 · 최근 ${latest.date}` : "기록 없음"}</span>
        <div className="chart-header-actions">
          <Link href={`/dashboard/${compartment.id}`} className="chart-link-btn">기록 보기</Link>
          {onAddRecord && (
            <button type="button" className="chart-add-btn" onClick={onAddRecord}>
              <AddIcon style={{ fontSize: 16 }} /> 기록 추가
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="chart-no-data">기록된 데이터가 없습니다. &apos;기록 추가&apos;로 급액·배액 EC/pH와 급배액량을 남겨 보세요.</p>
      ) : (
        <div className="charts-wrapper">
          <DualAxisChart
            title="급액·배액 EC / pH"
            leftDefs={EC_SERIES}
            rightDefs={PH_SERIES}
            rows={rows}
            leftLegend="EC (dS/m)"
            rightLegend="pH"
            leftRange={ecRange}
            rightRange={phRange}
          />
          <DualAxisChart
            title="급배액량 / 배액률"
            leftDefs={VOLUME_SERIES}
            rightDefs={RATE_SERIES}
            rows={rows}
            leftLegend="급배액량 (L)"
            rightLegend="배액률 (%)"
            leftRange={volumeRange}
            rightRange={rateRange}
          />
        </div>
      )}
    </div>
  );
}
