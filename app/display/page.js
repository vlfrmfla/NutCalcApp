// 파일: app/display/page.js
"use client";
import { useContext, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { DataContext } from "../context/DataContext"; // DataContext 불러오기

const LineChartComponent = dynamic(() => import("../components/LineChartComponent"), {
  ssr: false, // 서버 사이드 렌더링 비활성화
});

export default function DisplayPage() {
  const { data } = useContext(DataContext); // DataContext에서 데이터 불러오기
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (data.length > 0) {
      // 초기 데이터 기반으로 시각화 데이터를 생성
      const transformedData = [
        {
          id: "EC",
          color: "hsl(113, 70%, 50%)",
          data: data.map((entry) => ({
            x: entry.date.toLocaleDateString(), // x축을 날짜로 설정
            y: entry.EC, // y축은 EC 값
          })),
        },
        {
          id: "pH",
          color: "hsl(200, 70%, 50%)",
          data: data.map((entry) => ({
            x: entry.date.toLocaleDateString(),
            y: entry.pH,
          })),
        },
        // 필요에 따라 추가 데이터를 시각화 가능 (예: NH4, NO3 등)
      ];

      setChartData(transformedData);
    }
  }, [data]);

  return (
    <div style={{ height: "500px" }}>
      <h2>양분 변화 시각화</h2>
      {chartData.length > 0 ? (
        <LineChartComponent data={chartData} />
      ) : (
        <p>데이터가 없습니다.</p>
      )}
    </div>
  );
}
