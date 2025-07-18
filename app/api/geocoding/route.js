import { NextResponse } from 'next/server';

// 격자 좌표별 지역명 매핑 (주요 도시들)
const GRID_TO_REGION = {
  // 서울
  '60_127': '서울특별시',
  '60_126': '서울특별시',
  '61_126': '서울특별시',
  '61_127': '서울특별시',
  
  // 부산
  '98_76': '부산광역시',
  '99_76': '부산광역시',
  '97_75': '부산광역시',
  
  // 대구
  '89_90': '대구광역시',
  '90_91': '대구광역시',
  
  // 인천
  '55_124': '인천광역시',
  '56_124': '인천광역시',
  
  // 광주
  '58_74': '광주광역시',
  '59_74': '광주광역시',
  
  // 대전
  '67_100': '대전광역시 유성구',
  '68_100': '대전광역시',
  '67_101': '대전광역시',
  
  // 울산
  '102_84': '울산광역시',
  '103_84': '울산광역시',
  
  // 세종
  '66_103': '세종특별자치시',
  '67_103': '세종특별자치시',
  
  // 경기도 주요 지역
  '60_120': '경기도 수원시',
  '59_119': '경기도 수원시',
  '61_121': '경기도 성남시',
  '57_126': '경기도 부천시',
  '56_125': '경기도 안양시',
};

// 위도/경도를 기상청 격자좌표로 변환하는 함수
function convertToGrid(lat, lon) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + (lat) * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  return { x, y };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lon = parseFloat(searchParams.get('lon'));
    const searchAddress = searchParams.get('address'); // 주소 검색 추가

    // 주소로 좌표 검색
    if (searchAddress) {
      try {
        // 카카오 REST API로 주소 검색
        const KAKAO_API_KEY = '09e9d799bee81eb350d56445e90d05b1';
        
        if (KAKAO_API_KEY) {
          const kakaoResponse = await fetch(
            `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(searchAddress)}`,
            {
              headers: {
                'Authorization': `KakaoAK ${KAKAO_API_KEY}`
              }
            }
          );
          
          if (kakaoResponse.ok) {
            const kakaoData = await kakaoResponse.json();
            if (kakaoData.documents && kakaoData.documents.length > 0) {
              const result = kakaoData.documents[0];
              return NextResponse.json({
                success: true,
                coordinates: {
                  lat: parseFloat(result.y),
                  lon: parseFloat(result.x)
                },
                address: result.address_name,
                roadAddress: result.road_address?.address_name
              });
            }
          }
        }
        
        // 카카오 API 실패 시 기본 주소 매핑
        const addressMapping = {
          '서울': { lat: 37.5665, lon: 126.9780, name: '서울특별시' },
          '부산': { lat: 35.1796, lon: 129.0756, name: '부산광역시' },
          '대구': { lat: 35.8714, lon: 128.6014, name: '대구광역시' },
          '인천': { lat: 37.4563, lon: 126.7052, name: '인천광역시' },
          '광주': { lat: 35.1595, lon: 126.8526, name: '광주광역시' },
          '대전': { lat: 36.3504, lon: 127.3845, name: '대전광역시' },
          '울산': { lat: 35.5384, lon: 129.3114, name: '울산광역시' },
          '세종': { lat: 36.4800, lon: 127.2890, name: '세종특별자치시' }
        };
        
        for (const [key, value] of Object.entries(addressMapping)) {
          if (searchAddress.includes(key)) {
            return NextResponse.json({
              success: true,
              coordinates: { lat: value.lat, lon: value.lon },
              address: value.name
            });
          }
        }
        
        return NextResponse.json({
          success: false,
          error: '주소를 찾을 수 없습니다.'
        });
        
      } catch (error) {
        console.error('주소 검색 오류:', error);
        return NextResponse.json({
          success: false,
          error: '주소 검색 중 오류가 발생했습니다.'
        });
      }
    }

    // 좌표로 주소 검색 (기존 로직)
    if (!lat || !lon) {
      return NextResponse.json(
        { success: false, error: '위도와 경도 또는 주소가 필요합니다.' },
        { status: 400 }
      );
    }

    // 격자 좌표를 이용한 지역명 찾기
    const grid = convertToGrid(lat, lon);
    const gridKey = `${grid.x}_${grid.y}`;
    
    let address = GRID_TO_REGION[gridKey];
    
    if (!address) {
      // 주변 격자 검색
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const nearbyKey = `${grid.x + dx}_${grid.y + dy}`;
          if (GRID_TO_REGION[nearbyKey]) {
            address = GRID_TO_REGION[nearbyKey];
            break;
          }
        }
        if (address) break;
      }
    }
    
    // 지역별 분류
    if (!address) {
      if (lat >= 37.4 && lat <= 37.7 && lon >= 126.7 && lon <= 127.2) {
        address = '서울특별시';
      } else if (lat >= 35.0 && lat <= 35.3 && lon >= 128.9 && lon <= 129.3) {
        address = '부산광역시';
      } else if (lat >= 35.7 && lat <= 36.0 && lon >= 128.5 && lon <= 128.8) {
        address = '대구광역시';
      } else if (lat >= 37.2 && lat <= 37.6 && lon >= 126.4 && lon <= 126.8) {
        address = '인천광역시';
      } else if (lat >= 35.1 && lat <= 35.3 && lon >= 126.7 && lon <= 127.0) {
        address = '광주광역시';
      } else if (lat >= 36.2 && lat <= 36.5 && lon >= 127.2 && lon <= 127.6) {
        address = '대전광역시';
      } else if (lat >= 35.4 && lat <= 35.7 && lon >= 129.1 && lon <= 129.5) {
        address = '울산광역시';
      } else if (lat >= 36.4 && lat <= 36.6 && lon >= 127.2 && lon <= 127.4) {
        address = '세종특별자치시';
      } else if (lat >= 36.8 && lat <= 38.3 && lon >= 126.3 && lon <= 128.0) {
        address = '경기도';
      } else if (lat >= 36.6 && lat <= 37.9 && lon >= 127.0 && lon <= 129.4) {
        address = '강원도';
      } else if (lat >= 35.6 && lat <= 37.0 && lon >= 126.1 && lon <= 129.3) {
        address = '충청남도';
      } else if (lat >= 36.0 && lat <= 37.2 && lon >= 127.6 && lon <= 129.0) {
        address = '충청북도';
      } else if (lat >= 34.7 && lat <= 36.0 && lon >= 126.0 && lon <= 127.8) {
        address = '전라남도';
      } else if (lat >= 35.4 && lat <= 36.3 && lon >= 126.6 && lon <= 127.9) {
        address = '전라북도';
      } else if (lat >= 35.4 && lat <= 36.8 && lon >= 128.1 && lon <= 129.6) {
        address = '경상북도';
      } else if (lat >= 34.6 && lat <= 36.0 && lon >= 127.7 && lon <= 129.6) {
        address = '경상남도';
      } else if (lat >= 33.1 && lat <= 33.6 && lon >= 126.1 && lon <= 126.9) {
        address = '제주특별자치도';
      } else {
        address = '현재위치';
      }
    }

    console.log(`좌표 ${lat}, ${lon} -> 격자 ${grid.x}, ${grid.y} -> 주소: ${address}`);

    return NextResponse.json({
      success: true,
      address: address,
      coordinates: { lat, lon },
      grid: grid
    });

  } catch (error) {
    console.error('지오코딩 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      address: '현재위치'
    });
  }
} 