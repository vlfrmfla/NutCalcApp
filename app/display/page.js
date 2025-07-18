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
      // 날짜 형식을 안전하게 처리하는 함수
      const formatDate = (dateValue) => {
        if (!dateValue) return new Date().toLocaleDateString();
        
        // 이미 Date 객체인 경우
        if (dateValue instanceof Date) {
          return dateValue.toLocaleDateString();
        }
        
        // 문자열인 경우 Date 객체로 변환
        if (typeof dateValue === 'string') {
          const date = new Date(dateValue);
          return isNaN(date.getTime()) ? new Date().toLocaleDateString() : date.toLocaleDateString();
        }
        
        // 그 외의 경우 현재 날짜 사용
        return new Date().toLocaleDateString();
      };

      // 초기 데이터 기반으로 시각화 데이터를 생성
      const transformedData = [
        {
          id: "EC",
          color: "hsl(113, 70%, 50%)",
          data: data.map((entry) => ({
            x: formatDate(entry.date), // x축을 날짜로 설정
            y: entry.EC, // y축은 EC 값
          })),
        },
        {
          id: "pH",
          color: "hsl(200, 70%, 50%)",
          data: data.map((entry) => ({
            x: formatDate(entry.date),
            y: entry.pH,
          })),
        },
        // 필요에 따라 추가 데이터를 시각화 가능 (예: NH4, NO3 등)
      ];


      setChartData(transformedData);
    }
  }, [data]);

  return (
    <div style={{ padding: "24px" }}>
      <h3 style={{ color:"#2e2e2e", margin: "0 0 16px 0" }}>근권부 EC, pH 변화</h3>
      <div style={{ height: "600px" }}>
        {chartData.length > 0 ? (
          <LineChartComponent data={chartData} />
        ) : (
          <p>데이터가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
