"use client";  
import { useState, useMemo } from 'react';
import { ResponsiveLine } from '@nivo/line';

export default function LineChartComponent({ data }) {
  console.log("=== LineChartComponent 데이터 확인 ===");
  console.log("받은 data:", data);

  const [hiddenSeries, setHiddenSeries] = useState({}); // 시리즈 표시 여부
  const toggleSeries = (id) => {    //시리즈를 숨기거나 표시하는 함수 
    setHiddenSeries((prev) => ({
      ...prev,
      [id]: !prev[id], // 해당 시리즈가 숨겨져 있으면 표시하고, 아니면 숨기기
    }));
  };

  // EC와 pH 데이터를 분리하여 처리
  const { ecSeries, phSeries, ecRange, phRange } = useMemo(() => {
    if (!data || data.length === 0) return { ecSeries: null, phSeries: null, ecRange: [0, 1], phRange: [0, 14] };

    const ecSeries = data.find(series => series.id === 'EC');
    const phSeries = data.find(series => series.id === 'pH');

    console.log("EC 시리즈:", ecSeries);
    console.log("pH 시리즈:", phSeries);

    // EC 데이터 범위 계산
    const ecValues = ecSeries?.data?.map(d => d.y) || [];
    const ecMin = Math.min(...ecValues) || 0;
    const ecMax = Math.max(...ecValues) || 1;
    const ecRange = [Math.max(0, ecMin - 0.1), ecMax + 0.1];

    // pH 데이터 범위 계산 (일반적으로 0-14)
    const phValues = phSeries?.data?.map(d => d.y) || [];
    const phMin = Math.min(...phValues) || 0;
    const phMax = Math.max(...phValues) || 14;
    const phRange = [Math.max(0, phMin - 0.5), Math.min(14, phMax + 0.5)];

    console.log("EC 범위:", ecRange, "pH 범위:", phRange);

    return {
      ecSeries,
      phSeries,
      ecRange,
      phRange
    };
  }, [data]);

  // 시리즈가 표시되는지 확인하는 함수
  const isSeriesVisible = (series) => {
    return series && !hiddenSeries[series.id] && series.data && series.data.length > 0;
  };

  if (!ecSeries && !phSeries) {
    return <div>데이터가 없습니다.</div>;
  }

  // 모든 시리즈가 숨겨져 있는 경우
  if (!isSeriesVisible(ecSeries) && !isSeriesVisible(phSeries)) {
    return (
      <div style={{ position: 'relative', height: '100%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#666',
          fontSize: '16px'
        }}>
          표시할 데이터를 선택해주세요
        </div>
        
        {/* 범례는 계속 표시 */}
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {data.map((series) => (
            <div 
              key={series.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '5px',
                cursor: 'pointer',
                opacity: hiddenSeries[series.id] ? 0.3 : 1
              }}
              onClick={() => toggleSeries(series.id)}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: series.color,
                  marginRight: '8px'
                }}
              />
              <span style={{ fontSize: '12px', fontWeight: '500' }}>
                {series.id} {series.id === 'EC' ? '(ms/cm)' : ''}
                <span style={{ fontSize: '10px', marginLeft: '4px', color: '#666' }}>
                  ({series.data.length} 포인트)
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* EC 차트 (왼쪽 축) */}
      {isSeriesVisible(ecSeries) && (
        <ResponsiveLine
          data={[ecSeries]}
          margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
          xScale={{ type: 'point' }}
          yScale={{ 
            type: 'linear', 
            min: ecRange[0], 
            max: ecRange[1]
          }}
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
            legend: 'EC (ms/cm)',
            legendOffset: -40,
            legendPosition: 'middle',
            truncateTickAt: 0
          }}
          axisRight={null}
          colors={['hsl(113, 70%, 50%)']}
          pointSize={4}
          pointBorderWidth={2}
          pointBorderColor={{ from: 'serieColor' }}
          useMesh={true}
          enableGridX={false}
          enableGridY={true}
        />
      )}
      
      {/* pH 차트 (오른쪽 축) - 오버레이 */}
      {isSeriesVisible(phSeries) && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
          <ResponsiveLine
            data={[phSeries]}
            margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
            xScale={{ type: 'point' }}
            yScale={{ 
              type: 'linear', 
              min: phRange[0], 
              max: phRange[1]
            }}
            axisBottom={null}
            axisLeft={null}
            axisRight={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'pH',
              legendOffset: 40,
              legendPosition: 'middle',
              truncateTickAt: 0
            }}
            colors={['hsl(200, 70%, 50%)']}
            pointSize={4}
            pointBorderWidth={2}
            pointBorderColor={{ from: 'serieColor' }}
            useMesh={false}
            enableGridX={false}
            enableGridY={false}
          />
        </div>
      )}

      {/* 범례 */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 110,
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 2px rgba(0,0,0,0.1)'
      }}>
        {data.map((series) => (
          <div 
            key={series.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '5px',
              cursor: 'pointer',
              opacity: hiddenSeries[series.id] ? 0.3 : 1
            }}
            onClick={() => toggleSeries(series.id)}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: series.color,
                marginRight: '8px'
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: '500' }}>
              {series.id} {series.id === 'EC' ? '(ms/cm)' : ''}
              <span style={{ fontSize: '10px', marginLeft: '4px', color: '#666' }}>
                ({series.data.length} data points)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
