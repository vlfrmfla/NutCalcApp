// 파일 예: app/display/page.js

import dynamic from 'next/dynamic';

const LineChartComponent = dynamic(() => import('../components/LineChartComponent'), {
  ssr: false,  // 이 부분이 중요합니다. 서버 사이드 렌더링을 비활성화합니다.
});

export default function DisplayPage() {
  const data = [
    {
      id: 'japan',
      color: 'hsl(113, 70%, 50%)',
      data: [
        { x: 'plane', y: 213 },
        { x: 'helicopter', y: 120 },
        { x: 'boat', y: 97 },
      ],
    },
    // 더 많은 데이터...
  ];

  return (
    <div style={{ height: '500px' }}>
      <h2>양분 변화 시각화 (개발 중)</h2>
      <LineChartComponent data={data} />
    </div>
  );
}
