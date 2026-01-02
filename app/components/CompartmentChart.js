"use client";
import { useMemo, useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import "./CompartmentChart.css";

export default function CompartmentChart({ compartment }) {
  const [hiddenEcPh, setHiddenEcPh] = useState({});
  const [hiddenVolume, setHiddenVolume] = useState({});

  const { ecData, phData, volumeData, rateData, hasData } = useMemo(() => {
    const records = compartment.daily_records || [];

    if (records.length === 0) {
      return { ecData: [], phData: [], volumeData: [], rateData: [], hasData: false };
    }

    // 날짜순 정렬 (오래된 것부터)
    const sortedRecords = [...records].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    // 배액 EC 데이터 (왼쪽 축)
    const ecData = [
      {
        id: "배액 EC",
        color: "#ff9800",
        data: sortedRecords
          .filter((r) => r.drain_ec != null)
          .map((r) => ({
            x: formatDate(r.date),
            y: r.drain_ec,
          })),
      },
    ];

    // 배액 pH 데이터 (오른쪽 축)
    const phData = [
      {
        id: "배액 pH",
        color: "#4caf50",
        data: sortedRecords
          .filter((r) => r.drain_ph != null)
          .map((r) => ({
            x: formatDate(r.date),
            y: r.drain_ph,
          })),
      },
    ];

    // 급액량, 배액량 데이터 (왼쪽 축)
    const volumeData = [
      {
        id: "급액량",
        color: "#2196f3",
        data: sortedRecords
          .filter((r) => r.supply_amount != null)
          .map((r) => ({
            x: formatDate(r.date),
            y: r.supply_amount,
          })),
      },
      {
        id: "배액량",
        color: "#f44336",
        data: sortedRecords
          .filter((r) => r.drain_amount != null)
          .map((r) => ({
            x: formatDate(r.date),
            y: r.drain_amount,
          })),
      },
    ];

    // 배액률 데이터 (오른쪽 축)
    const rateData = [
      {
        id: "배액률",
        color: "#9c27b0",
        data: sortedRecords
          .filter((r) => r.supply_amount != null && r.supply_amount > 0 && r.drain_amount != null)
          .map((r) => ({
            x: formatDate(r.date),
            y: Math.round((r.drain_amount / r.supply_amount) * 100),
          })),
      },
    ];

    const hasData = ecData[0].data.length > 0 || phData[0].data.length > 0 ||
                    volumeData.some((d) => d.data.length > 0) || rateData[0].data.length > 0;

    return { ecData, phData, volumeData, rateData, hasData };
  }, [compartment.daily_records]);

  // EC 범위 계산
  const ecRange = useMemo(() => {
    const values = ecData[0]?.data?.map(d => d.y) || [];
    if (values.length === 0) return [0, 5];
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [Math.max(0, min - 0.5), max + 0.5];
  }, [ecData]);

  // pH 범위 계산
  const phRange = useMemo(() => {
    const values = phData[0]?.data?.map(d => d.y) || [];
    if (values.length === 0) return [4, 8];
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [Math.max(0, min - 0.5), Math.min(14, max + 0.5)];
  }, [phData]);

  // 급배액량 범위 계산
  const volumeRange = useMemo(() => {
    const values = [...(volumeData[0]?.data?.map(d => d.y) || []), ...(volumeData[1]?.data?.map(d => d.y) || [])];
    if (values.length === 0) return [0, 100];
    const max = Math.max(...values);
    return [0, max * 1.1];
  }, [volumeData]);

  // 배액률 범위 계산
  const rateRange = useMemo(() => {
    const values = rateData[0]?.data?.map(d => d.y) || [];
    if (values.length === 0) return [0, 100];
    const max = Math.max(...values);
    return [0, Math.min(100, max * 1.2)];
  }, [rateData]);

  const toggleEcPh = (id) => {
    setHiddenEcPh(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleVolume = (id) => {
    setHiddenVolume(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!hasData) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h4 className="chart-title">{compartment.name}</h4>
          {compartment.crop && <span className="chart-crop-tag">{compartment.crop}</span>}
        </div>
        <p className="chart-no-data">기록된 데이터가 없습니다.</p>
      </div>
    );
  }

  const showEc = !hiddenEcPh["배액 EC"] && ecData[0].data.length > 0;
  const showPh = !hiddenEcPh["배액 pH"] && phData[0].data.length > 0;
  const showSupply = !hiddenVolume["급액량"] && volumeData[0].data.length > 0;
  const showDrain = !hiddenVolume["배액량"] && volumeData[1].data.length > 0;
  const showRate = !hiddenVolume["배액률"] && rateData[0].data.length > 0;

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h4 className="chart-title">{compartment.name}</h4>
        {compartment.crop && <span className="chart-crop-tag">{compartment.crop}</span>}
      </div>

      <div className="charts-wrapper">
        {/* 배액 EC / pH 차트 (Dual Axis) */}
        <div className="chart-box">
          <h5 className="chart-box-title">배액 EC / pH</h5>
          <div className="chart-area">
            {/* EC 차트 (왼쪽 축) */}
            {showEc && (
              <ResponsiveLine
                data={ecData}
                margin={{ top: 20, right: 60, bottom: 50, left: 60 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: ecRange[0], max: ecRange[1] }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  legend: "날짜",
                  legendOffset: 40,
                  legendPosition: "middle",
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  legend: "EC (dS/m)",
                  legendOffset: -45,
                  legendPosition: "middle",
                }}
                axisRight={null}
                colors={["#ff9800"]}
                pointSize={6}
                pointBorderWidth={2}
                pointBorderColor={{ from: "serieColor" }}
                useMesh={true}
                enableGridX={false}
              />
            )}
            {/* pH 차트 (오른쪽 축) - 오버레이 */}
            {showPh && (
              <div className="chart-overlay">
                <ResponsiveLine
                  data={phData}
                  margin={{ top: 20, right: 60, bottom: 50, left: 60 }}
                  xScale={{ type: "point" }}
                  yScale={{ type: "linear", min: phRange[0], max: phRange[1] }}
                  axisBottom={null}
                  axisLeft={null}
                  axisRight={{
                    tickSize: 5,
                    tickPadding: 5,
                    legend: "pH",
                    legendOffset: 45,
                    legendPosition: "middle",
                  }}
                  colors={["#4caf50"]}
                  pointSize={6}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: "serieColor" }}
                  useMesh={false}
                  enableGridX={false}
                  enableGridY={false}
                />
              </div>
            )}
            {/* 범례 */}
            <div className="chart-legend">
              {[...ecData, ...phData].map((series) => (
                <div
                  key={series.id}
                  className="chart-legend-item"
                  style={{ opacity: hiddenEcPh[series.id] ? 0.3 : 1 }}
                  onClick={() => toggleEcPh(series.id)}
                >
                  <div className="chart-legend-dot" style={{ backgroundColor: series.color }} />
                  <span className="chart-legend-text">{series.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 급배액량 / 배액률 차트 (Dual Axis) */}
        <div className="chart-box">
          <h5 className="chart-box-title">급배액량 / 배액률</h5>
          <div className="chart-area">
            {/* 급배액량 차트 (왼쪽 축) */}
            {(showSupply || showDrain) && (
              <ResponsiveLine
                data={volumeData.filter((d, i) =>
                  (i === 0 && showSupply) || (i === 1 && showDrain)
                )}
                margin={{ top: 20, right: 60, bottom: 50, left: 60 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: volumeRange[0], max: volumeRange[1] }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  legend: "날짜",
                  legendOffset: 40,
                  legendPosition: "middle",
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  legend: "급배액량 (L)",
                  legendOffset: -45,
                  legendPosition: "middle",
                }}
                axisRight={null}
                colors={{ datum: "color" }}
                pointSize={6}
                pointBorderWidth={2}
                pointBorderColor={{ from: "serieColor" }}
                useMesh={true}
                enableGridX={false}
              />
            )}
            {/* 배액률 차트 (오른쪽 축) - 오버레이 */}
            {showRate && (
              <div className="chart-overlay">
                <ResponsiveLine
                  data={rateData}
                  margin={{ top: 20, right: 60, bottom: 50, left: 60 }}
                  xScale={{ type: "point" }}
                  yScale={{ type: "linear", min: rateRange[0], max: rateRange[1] }}
                  axisBottom={null}
                  axisLeft={null}
                  axisRight={{
                    tickSize: 5,
                    tickPadding: 5,
                    legend: "배액률 (%)",
                    legendOffset: 45,
                    legendPosition: "middle",
                  }}
                  colors={["#9c27b0"]}
                  pointSize={6}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: "serieColor" }}
                  useMesh={false}
                  enableGridX={false}
                  enableGridY={false}
                />
              </div>
            )}
            {/* 범례 */}
            <div className="chart-legend">
              {[...volumeData, ...rateData].map((series) => (
                <div
                  key={series.id}
                  className="chart-legend-item"
                  style={{ opacity: hiddenVolume[series.id] ? 0.3 : 1 }}
                  onClick={() => toggleVolume(series.id)}
                >
                  <div className="chart-legend-dot" style={{ backgroundColor: series.color }} />
                  <span className="chart-legend-text">{series.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
