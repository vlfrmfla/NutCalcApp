import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const KMA_BASE = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
const HOUR = 60 * 60 * 1000;

// 위도/경도를 기상청 격자좌표로 변환 (Lambert Conformal Conic)
function convertToGrid(lat, lon) {
  const RE = 6371.00877; // 지구 반경(km)
  const GRID = 5.0; // 격자 간격(km)
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

// KST 기준 날짜(YYYYMMDD)와 시(0~23). 서버 시간대와 무관하게 UTC+9로 계산한다.
function kstParts(date) {
  const shifted = new Date(date.getTime() + 9 * HOUR);
  return {
    dateStr: shifted.toISOString().slice(0, 10).replace(/-/g, ''),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    shifted,
  };
}

// 강수형태(PTY) 코드 → 날씨 상태
function weatherFromPTY(pty, rain) {
  switch (pty) {
    case 1: return { main: 'Rain', description: '비' };
    case 2: return { main: 'Rain', description: '비/눈' };
    case 3: return { main: 'Snow', description: '눈' };
    case 5: return { main: 'Drizzle', description: '빗방울' };
    case 6: return { main: 'Rain', description: '빗방울눈날림' };
    case 7: return { main: 'Snow', description: '눈날림' };
    default:
      return rain > 0 ? { main: 'Rain', description: '비' } : { main: 'Clear', description: '맑음' };
  }
}

function buildResult(weatherData, grid, baseTime) {
  const condition = weatherFromPTY(weatherData.pty, weatherData.rain);
  return {
    success: true,
    data: {
      name: '현재위치',
      main: { temp: weatherData.temp ?? 20, humidity: weatherData.humidity ?? 60 },
      weather: [{ main: condition.main, description: condition.description, icon: '10d' }],
      wind: { speed: weatherData.windSpeed ?? 2.0, direction: weatherData.windDirection ?? 0 },
      grid,
      baseTime,
    },
  };
}

// 초단기실황 항목 파싱
function parseObservation(items) {
  const w = { temp: null, humidity: null, rain: 0, windSpeed: null, windDirection: null, pty: 0 };
  for (const item of items) {
    const v = parseFloat(item.obsrValue);
    switch (item.category) {
      case 'T1H': w.temp = v; break;
      case 'REH': w.humidity = v; break;
      case 'RN1': w.rain = v; break;
      case 'WSD': w.windSpeed = v; break;
      case 'VEC': w.windDirection = v; break;
      case 'PTY': w.pty = parseInt(item.obsrValue, 10); break;
    }
  }
  return w;
}

async function fetchKMA(path, params, serviceKey) {
  const query = new URLSearchParams({ numOfRows: '20', pageNo: '1', dataType: 'JSON', ...params }).toString();
  const res = await fetch(`${KMA_BASE}/${path}?serviceKey=${encodeURIComponent(serviceKey)}&${query}`);
  if (!res.ok) throw new Error(`기상청 API 응답 오류: ${res.status}`);
  return res.json();
}

async function fetchObservation(grid, baseDate, baseTime, serviceKey) {
  const data = await fetchKMA('getUltraSrtNcst', { base_date: baseDate, base_time: baseTime, nx: grid.x, ny: grid.y }, serviceKey);
  const header = data?.response?.header;
  if (header?.resultCode !== '00') {
    const err = new Error(`기상청 API 오류: ${header?.resultMsg || 'unknown'}`);
    err.noData = String(header?.resultMsg || '').includes('NO_DATA');
    throw err;
  }
  return parseObservation(data.response.body.items.item);
}

// 단기예보로 현재 시각에 가장 가까운 예보값을 가져온다 (실황이 없을 때)
async function fetchForecast(grid, kst, serviceKey) {
  const forecastTimes = ['0200', '0500', '0800', '1100', '1400', '1700', '2000', '2300'];
  let forecastTime = '0200';
  for (let i = forecastTimes.length - 1; i >= 0; i--) {
    if (kst.hour >= parseInt(forecastTimes[i].slice(0, 2), 10)) {
      forecastTime = forecastTimes[i];
      break;
    }
  }
  let forecastDate = kst.dateStr;
  if (forecastTime === '0200' && kst.hour < 2) {
    forecastDate = kstParts(new Date(kst.shifted.getTime() - 9 * HOUR - 24 * HOUR)).dateStr;
    forecastTime = '2300';
  }

  const data = await fetchKMA('getVilageFcst', { base_date: forecastDate, base_time: forecastTime, nx: grid.x, ny: grid.y }, serviceKey);
  if (data?.response?.header?.resultCode !== '00') throw new Error(`단기예보 API 오류: ${data?.response?.header?.resultMsg}`);
  const items = data.response.body.items.item;

  // 현재 시각(KST)에 가장 가까운 예보 시각
  const nowMinutes = kst.hour * 60 + kst.minute;
  let closest = null;
  let minDiff = Infinity;
  for (const key of new Set(items.map((i) => `${i.fcstDate}_${i.fcstTime}`))) {
    const [date, time] = key.split('_');
    const dayOffset = date === kst.dateStr ? 0 : 24 * 60;
    const diff = Math.abs(dayOffset + parseInt(time.slice(0, 2), 10) * 60 + parseInt(time.slice(2, 4), 10) - nowMinutes);
    if (diff < minDiff) {
      minDiff = diff;
      closest = { date, time };
    }
  }

  const w = { temp: null, humidity: null, rain: 0, windSpeed: null, windDirection: null, pty: 0 };
  for (const item of items) {
    if (item.fcstDate !== closest.date || item.fcstTime !== closest.time) continue;
    switch (item.category) {
      case 'TMP': w.temp = parseFloat(item.fcstValue); break;
      case 'REH': w.humidity = parseFloat(item.fcstValue); break;
      case 'PCP': w.rain = item.fcstValue === '강수없음' ? 0 : parseFloat(item.fcstValue) || 0; break;
      case 'WSD': w.windSpeed = parseFloat(item.fcstValue); break;
      case 'VEC': w.windDirection = parseFloat(item.fcstValue); break;
      case 'PTY': w.pty = parseInt(item.fcstValue, 10); break;
    }
  }
  return buildResult(w, grid, `${closest.date} ${closest.time} (예보)`);
}

const FALLBACK = {
  name: '유성구',
  main: { temp: 23, humidity: 65 },
  weather: [{ main: 'Rain', description: '비', icon: '10d' }],
  wind: { speed: 2.1 },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat'));
  const lon = parseFloat(searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: '위도와 경도가 필요합니다.' }, { status: 400 });
  }

  const serviceKey = process.env.KMA_SERVICE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ success: false, error: 'KMA_SERVICE_KEY 환경변수가 설정되지 않았습니다.', data: FALLBACK });
  }

  const grid = convertToGrid(lat, lon);
  const now = new Date();
  const kst = kstParts(now);

  try {
    // 초단기실황은 매시 10분 이후 해당 정시 데이터가 나온다
    let target = kst.minute < 10 ? kstParts(new Date(now.getTime() - HOUR)) : kst;
    const baseTime = `${String(target.hour).padStart(2, '0')}00`;

    try {
      const w = await fetchObservation(grid, target.dateStr, baseTime, serviceKey);
      return NextResponse.json(buildResult(w, grid, `${target.dateStr} ${baseTime} (실시간)`));
    } catch (err) {
      if (!err.noData) throw err;
      return NextResponse.json(await fetchForecast(grid, kst, serviceKey));
    }
  } catch (error) {
    console.error('기상청 API 오류:', error.message);

    // 몇 시간 전 실황으로 재시도
    for (const hoursBack of [6, 12, 18]) {
      try {
        const retry = kstParts(new Date(now.getTime() - hoursBack * HOUR));
        const baseTime = `${String(retry.hour).padStart(2, '0')}00`;
        const w = await fetchObservation(grid, retry.dateStr, baseTime, serviceKey);
        return NextResponse.json(buildResult(w, grid, `${retry.dateStr} ${baseTime} (${hoursBack}시간 전)`));
      } catch (retryError) {
        // 다음 후보 시도
      }
    }

    return NextResponse.json({ success: false, error: error.message, data: FALLBACK });
  }
}
