"use client";  
import { useState } from 'react';
import { ResponsiveLine } from '@nivo/line';

export default function LineChartComponent({ data }) {

  const [hiddenSeries, setHiddenSeries] = useState({}); // 시리즈 표시 여부
  const toggleSeries = (id) => {    //시리즈를 숨기거나 표시하는 함수 
    setHiddenSeries((prev) => ({
      ...prev,
      [id]: !prev[id], // 해당 시리즈가 숨겨져 있으면 표시하고, 아니면 숨기기
    }));
  };

  const displayedData = data.map((series) => ({ // Legend에서 숨긴 시리즈를 제외하고 데이터를 필터링
    ...series,
    data: hiddenSeries[series.id] ? [] : series.data, // 숨긴 시리즈는 빈 배열로 전달
  }));

  return (
    <ResponsiveLine
      data={displayedData} // 표시할 데이터만 전달
      margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
      xScale={{ type: 'point' }}
      yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: true }}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: '날짜',
        legendOffset: 36,
        legendPosition: 'middle'
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: '이온 농도',
        legendOffset: -40,
        legendPosition: 'middle',
        truncateTickAt: 0
      }}
      legends={[
        {
          anchor: 'bottom-right',
          direction: 'column',
          justify: false,
          translateX: 100,
          translateY: 0,
          itemsSpacing: 0,
          itemDirection: 'left-to-right',
          itemWidth: 80,
          itemHeight: 20,
          itemOpacity: 1,
          symbolSize: 12,
          symbolShape: 'circle',
          symbolBorderColor: 'rgba(0, 0, 0, .5)',
          effects: [
            {
              on: 'hover',
              style: {
                itemBackground: 'rgba(0, 0, 0, .03)',
                itemOpacity: 1,
              }
            }
          ],
          // 클릭 시 시리즈를 숨기거나 표시하는 이벤트 핸들러 추가
          onClick: (datum) => toggleSeries(datum.id),
          // 항목이 숨겨졌는지 여부에 따라 투명도 조정
          itemOpacity: (datum) => hiddenSeries[datum.id] ? 0.3 : 1,
          symbolOpacity: (datum) => hiddenSeries[datum.id] ? 0.3 : 1,
        }
      ]}
    />
  );
}
