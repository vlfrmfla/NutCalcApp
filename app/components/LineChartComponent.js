// 파일 예: app/components/LineChartComponent.js

"use client";  // 이 컴포넌트를 클라이언트 전용으로 만듭니다.

import { ResponsiveLine } from '@nivo/line';

export default function LineChartComponent({ data }) {
  return (
    <ResponsiveLine
      data={data}
      margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
      xScale={{ type: 'point' }}
      yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: true }}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'transportation',
        legendOffset: 36,
        legendPosition: 'middle',
      }}
    />
  );
}
