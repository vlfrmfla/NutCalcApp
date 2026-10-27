import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 격자 좌표별 지역명 (카카오 API를 쓸 수 없을 때의 대략적인 대체값)
const GRID_TO_REGION = {
  '60_127': '서울특별시', '60_126': '서울특별시', '61_126': '서울특별시', '61_127': '서울특별시',
  '98_76': '부산광역시', '99_76': '부산광역시', '97_75': '부산광역시',
  '89_90': '대구광역시', '90_91': '대구광역시',
  '55_124': '인천광역시', '56_124': '인천광역시',
  '58_74': '광주광역시', '59_74': '광주광역시',
  '67_100': '대전광역시 유성구', '68_100': '대전광역시', '67_101': '대전광역시',
  '102_84': '울산광역시', '103_84': '울산광역시',
  '66_103': '세종특별자치시', '67_103': '세종특별자치시',
  '60_120': '경기도 수원시', '59_119': '경기도 수원시', '61_121': '경기도 성남시',
  '57_126': '경기도 부천시', '56_125': '경기도 안양시',
};

const REGION_BOXES = [
  [37.4, 37.7, 126.7, 127.2, '서울특별시'],
  [35.0, 35.3, 128.9, 129.3, '부산광역시'],
  [35.7, 36.0, 128.5, 128.8, '대구광역시'],
  [37.2, 37.6, 126.4, 126.8, '인천광역시'],
  [35.1, 35.3, 126.7, 127.0, '광주광역시'],
  [36.2, 36.5, 127.2, 127.6, '대전광역시'],
  [35.4, 35.7, 129.1, 129.5, '울산광역시'],
  [36.4, 36.6, 127.2, 127.4, '세종특별자치시'],
  [36.8, 38.3, 126.3, 128.0, '경기도'],
  [36.6, 37.9, 127.0, 129.4, '강원도'],
  [35.6, 37.0, 126.1, 129.3, '충청남도'],
  [36.0, 37.2, 127.6, 129.0, '충청북도'],
  [34.7, 36.0, 126.0, 127.8, '전라남도'],
  [35.4, 36.3, 126.6, 127.9, '전라북도'],
  [35.4, 36.8, 128.1, 129.6, '경상북도'],
  [34.6, 36.0, 127.7, 129.6, '경상남도'],
  [33.1, 33.6, 126.1, 126.9, '제주특별자치도'],
];

const CITY_COORDS = {
  서울: { lat: 37.5665, lon: 126.978, name: '서울특별시' },
  부산: { lat: 35.1796, lon: 129.0756, name: '부산광역시' },
  대구: { lat: 35.8714, lon: 128.6014, name: '대구광역시' },
  인천: { lat: 37.4563, lon: 126.7052, name: '인천광역시' },
  광주: { lat: 35.1595, lon: 126.8526, name: '광주광역시' },
  대전: { lat: 36.3504, lon: 127.3845, name: '대전광역시' },
  울산: { lat: 35.5384, lon: 129.3114, name: '울산광역시' },
  세종: { lat: 36.48, lon: 127.289, name: '세종특별자치시' },
};

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
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    x: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    y: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}

async function kakaoFetch(url) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('카카오 API 오류:', err.message);
    return null;
  }
}

// 좌표 → 상세 주소 (카카오 역지오코딩)
async function reverseGeocode(lat, lon) {
  const data = await kakaoFetch(`https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lon}&y=${lat}&input_coord=WGS84`);
  const doc = data?.documents?.[0];
  if (!doc) return null;
  if (doc.road_address) {
    const r = doc.road_address;
    return `${r.region_1depth_name} ${r.region_2depth_name} ${r.region_3depth_name} ${r.road_name} ${r.main_building_no}${r.sub_building_no ? '-' + r.sub_building_no : ''}`.trim();
  }
  if (doc.address) {
    const a = doc.address;
    return `${a.region_1depth_name} ${a.region_2depth_name} ${a.region_3depth_name} ${a.main_address_no}${a.sub_address_no ? '-' + a.sub_address_no : ''}`.trim();
  }
  return null;
}

// 격자/위경도 범위로 대략적인 지역명
function approximateRegion(lat, lon) {
  const grid = convertToGrid(lat, lon);
  let address = GRID_TO_REGION[`${grid.x}_${grid.y}`];
  if (!address) {
    outer: for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const hit = GRID_TO_REGION[`${grid.x + dx}_${grid.y + dy}`];
        if (hit) { address = hit; break outer; }
      }
    }
  }
  if (!address) {
    const box = REGION_BOXES.find(([la1, la2, lo1, lo2]) => lat >= la1 && lat <= la2 && lon >= lo1 && lon <= lo2);
    address = box ? box[4] : '현재위치';
  }
  return { address, grid };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lon = parseFloat(searchParams.get('lon'));
    const searchAddress = searchParams.get('address');

    // 주소 → 좌표
    if (searchAddress) {
      const data = await kakaoFetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(searchAddress)}`);
      const doc = data?.documents?.[0];
      if (doc) {
        return NextResponse.json({
          success: true,
          coordinates: { lat: parseFloat(doc.y), lon: parseFloat(doc.x) },
          address: doc.address_name,
          roadAddress: doc.road_address?.address_name,
        });
      }
      const city = Object.entries(CITY_COORDS).find(([key]) => searchAddress.includes(key));
      if (city) {
        return NextResponse.json({ success: true, coordinates: { lat: city[1].lat, lon: city[1].lon }, address: city[1].name });
      }
      return NextResponse.json({ success: false, error: '주소를 찾을 수 없습니다.' });
    }

    // 좌표 → 주소
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ success: false, error: '위도와 경도 또는 주소가 필요합니다.' }, { status: 400 });
    }
    const detailed = await reverseGeocode(lat, lon);
    const approx = approximateRegion(lat, lon);
    return NextResponse.json({
      success: true,
      address: detailed || approx.address,
      coordinates: { lat, lon },
      grid: approx.grid,
    });
  } catch (error) {
    console.error('지오코딩 오류:', error.message);
    return NextResponse.json({ success: false, error: error.message, address: '현재위치' });
  }
}
