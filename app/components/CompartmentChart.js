"use client";
import { useMemo, useState } from "react";
import { ResponsiveLine } from "@nivo/line";

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
      <div style={styles.container}>
        <div style={styles.header}>
          <h4 style={styles.title}>{compartment.name}</h4>
          {compartment.crop && <span style={styles.cropTag}>{compartment.crop}</span>}
        </div>
        <p style={styles.noData}>기록된 데이터가 없습니다.</p>
      </div>
    );
  }

  const showEc = !hiddenEcPh["배액 EC"] && ecData[0].data.length > 0;
  const showPh = !hiddenEcPh["배액 pH"] && phData[0].data.length > 0;
  const showSupply = !hiddenVolume["급액량"] && volumeData[0].data.length > 0;
  const showDrain = !hiddenVolume["배액량"] && volumeData[1].data.length > 0;
  const showRate = !hiddenVolume["배액률"] && rateData[0].data.length > 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h4 style={styles.title}>{compartment.name}</h4>
        {compartment.crop && <span style={styles.cropTag}>{compartment.crop}</span>}
      </div>

      <div style={styles.chartsWrapper}>
        {/* 배액 EC / pH 차트 (Dual Axis) */}
        <div style={styles.chartBox}>
          <h5 style={styles.chartTitle}>배액 EC / pH</h5>
          <div style={styles.chartArea}>
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
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
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
            <div style={styles.legend}>
              {[...ecData, ...phData].map((series) => (
                <div
                  key={series.id}
                  style={{
                    ...styles.legendItem,
                    opacity: hiddenEcPh[series.id] ? 0.3 : 1,
                  }}
                  onClick={() => toggleEcPh(series.id)}
                >
                  <div style={{ ...styles.legendDot, backgroundColor: series.color }} />
                  <span style={styles.legendText}>{series.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 급배액량 / 배액률 차트 (Dual Axis) */}
        <div style={styles.chartBox}>
          <h5 style={styles.chartTitle}>급배액량 / 배액률</h5>
          <div style={styles.chartArea}>
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
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
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
            <div style={styles.legend}>
              {[...volumeData, ...rateData].map((series) => (
                <div
                  key={series.id}
                  style={{
                    ...styles.legendItem,
                    opacity: hiddenVolume[series.id] ? 0.3 : 1,
                  }}
                  onClick={() => toggleVolume(series.id)}
                >
                  <div style={{ ...styles.legendDot, backgroundColor: series.color }} />
                  <span style={styles.legendText}>{series.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.06)",
    padding: "20px",
    marginBottom: "24px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },
  title: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "#333",
  },
  cropTag: {
    padding: "4px 10px",
    background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 500,
    color: "#2e7d32",
  },
  noData: {
    color: "#888",
    textAlign: "center",
    padding: "40px 0",
  },
  chartsWrapper: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  chartBox: {
    background: "#f8f9fa",
    borderRadius: "8px",
    padding: "16px",
  },
  chartTitle: {
    margin: "0 0 12px 0",
    fontSize: "13px",
    fontWeight: 600,
    color: "#555",
  },
  chartArea: {
    height: "280px",
    position: "relative",
  },
  legend: {
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "rgba(255, 255, 255, 0.95)",
    padding: "8px 10px",
    borderRadius: "6px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    zIndex: 10,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    marginBottom: "4px",
    cursor: "pointer",
    fontSize: "11px",
  },
  legendDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    marginRight: "6px",
  },
  legendText: {
    fontWeight: 500,
    color: "#333",
  },
};
