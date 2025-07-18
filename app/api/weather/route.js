import { NextResponse } from 'next/server';

// 위도/경도를 기상청 격자좌표로 변환하는 함수
function convertToGrid(lat, lon) {
  const RE = 6371.00877; // 지구 반경(km)
  const GRID = 5.0; // 격자 간격(km)
  const SLAT1 = 30.0; // 투영 위도1(degree)
  const SLAT2 = 60.0; // 투영 위도2(degree)
  const OLON = 126.0; // 기준점 경도(degree)
  const OLAT = 38.0; // 기준점 위도(degree)
  const XO = 43; // 기준점 X좌표(GRID)
  const YO = 136; // 기준점 Y좌표(GRID)

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

    if (!lat || !lon) {
      return NextResponse.json(
        { error: '위도와 경도가 필요합니다.' },
        { status: 400 }
      );
    }

    // 위도/경도를 격자좌표로 변환
    const grid = convertToGrid(lat, lon);
    console.log(`위치 정보: 위도=${lat}, 경도=${lon}, 격자좌표 X=${grid.x}, Y=${grid.y}`);
    
    // 현재 시간 정보
    const now = new Date();
    const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // KST 시간
    
    // 기상청 초단기실황 API: 매시각 10분 이후에 해당 시간 데이터 호출 가능
    // 예: 07:10 이후에 07:00 데이터 조회 가능
    let targetHour = kstNow.getHours();
    let targetDate = new Date(kstNow);
    
    // 현재 시간이 10분 이전이면 이전 시간 데이터 조회
    if (kstNow.getMinutes() < 10) {
      targetHour -= 1;
      if (targetHour < 0) {
        targetHour = 23;
        targetDate = new Date(targetDate.getTime() - (24 * 60 * 60 * 1000));
      }
    }
    
    // 06시 이전 시간은 데이터가 없으므로 06시로 조정 (기본 발표시각)
    if (targetHour < 6) {
      targetHour = 6;
    }
    
    const baseDate = targetDate.toISOString().slice(0, 10).replace(/-/g, '');
    const baseTime = targetHour.toString().padStart(2, '0') + '00'; // 정시로 고정

    console.log(`시간 정보: 현재시간=${kstNow.toISOString()}, 조회날짜=${baseDate}, 조회시간=${baseTime}`);

    // 기상청 API 호출
    const API_KEY = '1baqqTx2eJomne2p7N%2FYKNSyUMnbqwb9kHYLvDXhdv9d4ONBQfN45Z6A6%2BVOT6AvHKRQUIChzxpIirX8LTQJlQ%3D%3D';
    const apiUrl = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${API_KEY}&numOfRows=10&pageNo=1&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${grid.x}&ny=${grid.y}`;
    
    console.log('기상청 API 요청 URL:', apiUrl);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`기상청 API 응답 오류: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('기상청 API 응답:', JSON.stringify(data, null, 2));
    
    if (data.response.header.resultCode !== '00') {
      console.log(`초단기실황 API 오류: ${data.response.header.resultMsg}`);
      
      // NO_DATA 오류인 경우 단기예보 API 시도
      if (data.response.header.resultMsg.includes('NO_DATA')) {
        console.log('단기예보 API로 재시도...');
        
        // 단기예보는 하루 8회 발표: 02, 05, 08, 11, 14, 17, 20, 23시
        const forecastTimes = ['0200', '0500', '0800', '1100', '1400', '1700', '2000', '2300'];
        const currentHour = kstNow.getHours();
        
        // 현재 시간보다 이전의 가장 최근 발표 시간 찾기
        let forecastTime = '0200'; // 기본값
        for (let i = forecastTimes.length - 1; i >= 0; i--) {
          const hour = parseInt(forecastTimes[i].substring(0, 2));
          if (currentHour >= hour) {
            forecastTime = forecastTimes[i];
            break;
          }
        }
        
        // 찾지 못한 경우 (새벽 시간) 전날 23시 데이터 사용
        let forecastDate = baseDate;
        if (forecastTime === '0200' && currentHour < 2) {
          const yesterday = new Date(kstNow.getTime() - (24 * 60 * 60 * 1000));
          forecastDate = yesterday.toISOString().slice(0, 10).replace(/-/g, '');
          forecastTime = '2300';
        }
        
        const forecastUrl = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${API_KEY}&numOfRows=20&pageNo=1&dataType=JSON&base_date=${forecastDate}&base_time=${forecastTime}&nx=${grid.x}&ny=${grid.y}`;
        
        const forecastResponse = await fetch(forecastUrl);
        if (forecastResponse.ok) {
          const forecastData = await forecastResponse.json();
          console.log('단기예보 API 응답:', JSON.stringify(forecastData, null, 2));
          
          if (forecastData.response.header.resultCode === '00') {
            // 단기예보 데이터를 사용
            const forecastItems = forecastData.response.body.items.item;
            const weatherData = {
              temp: null,
              humidity: null,
              rain: 0,
              windSpeed: null,
              pty: 0 // 강수형태 추가
            };
            
            // 현재 시간에 가장 가까운 예보 데이터 찾기
            const currentDateTime = new Date(kstNow);
            let closestTime = null;
            let minTimeDiff = Infinity;
            
            // 모든 예보 시간 중에서 현재 시간에 가장 가까운 시간 찾기
            const uniqueTimes = [...new Set(forecastItems.map(item => `${item.fcstDate}_${item.fcstTime}`))];
            
            uniqueTimes.forEach(timeStr => {
              const [date, time] = timeStr.split('_');
              const year = parseInt(date.substring(0, 4));
              const month = parseInt(date.substring(4, 6)) - 1; // 월은 0부터 시작
              const day = parseInt(date.substring(6, 8));
              const hour = parseInt(time.substring(0, 2));
              const minute = parseInt(time.substring(2, 4));
              
              const forecastDateTime = new Date(year, month, day, hour, minute);
              const timeDiff = Math.abs(currentDateTime - forecastDateTime);
              
              if (timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff;
                closestTime = { date, time };
              }
            });
            
            console.log(`가장 가까운 예보 시간: ${closestTime.date} ${closestTime.time}`);
            
            forecastItems.forEach(item => {
              if (item.fcstDate === closestTime.date && item.fcstTime === closestTime.time) {
                switch (item.category) {
                  case 'TMP': // 1시간 기온
                    weatherData.temp = parseFloat(item.fcstValue);
                    break;
                  case 'REH': // 습도
                    weatherData.humidity = parseFloat(item.fcstValue);
                    break;
                  case 'PCP': // 1시간 강수량
                    weatherData.rain = item.fcstValue === '강수없음' ? 0 : parseFloat(item.fcstValue);
                    break;
                  case 'WSD': // 풍속
                    weatherData.windSpeed = parseFloat(item.fcstValue);
                    break;
                  case 'PTY': // 강수형태
                    weatherData.pty = parseInt(item.fcstValue);
                    break;
                }
              }
            });
            
            // PTY(강수형태)에 따른 날씨 상태 결정
            let weatherCondition = 'Clear';
            let weatherDescription = '맑음';
            
            switch (weatherData.pty) {
              case 0: // 없음
                weatherCondition = 'Clear';
                weatherDescription = '맑음';
                break;
              case 1: // 비
                weatherCondition = 'Rain';
                weatherDescription = '비';
                break;
              case 2: // 비/눈
                weatherCondition = 'Rain';
                weatherDescription = '비/눈';
                break;
              case 3: // 눈
                weatherCondition = 'Snow';
                weatherDescription = '눈';
                break;
              case 5: // 빗방울
                weatherCondition = 'Drizzle';
                weatherDescription = '빗방울';
                break;
              case 6: // 빗방울눈날림
                weatherCondition = 'Rain';
                weatherDescription = '빗방울눈날림';
                break;
              case 7: // 눈날림
                weatherCondition = 'Snow';
                weatherDescription = '눈날림';
                break;
              default:
                // PTY가 0이고 강수량이 있는 경우 비로 처리
                if (weatherData.rain > 0) {
                  weatherCondition = 'Rain';
                  weatherDescription = '비';
                }
                break;
            }
            
            const result = {
              success: true,
              data: {
                name: '현재위치',
                main: { 
                  temp: weatherData.temp || 20, 
                  humidity: weatherData.humidity || 60 
                },
                weather: [{ 
                  main: weatherCondition, 
                  description: weatherDescription, 
                  icon: '10d' 
                }],
                wind: { 
                  speed: weatherData.windSpeed || 2.0,
                  direction: 0
                },
                grid: grid,
                baseTime: `${closestTime.date} ${closestTime.time} (예보)`
              }
            };
            
            return NextResponse.json(result);
          }
        }
      }
      
      throw new Error(`기상청 API 오류: ${data.response.header.resultMsg}`);
    }

    const items = data.response.body.items.item;
    const weatherData = {
      temp: null,
      humidity: null,
      rain: 0,
      windSpeed: null,
      windDirection: null,
      pty: 0 // 강수형태 추가
    };
    
    items.forEach(item => {
      switch (item.category) {
        case 'T1H': // 기온
          weatherData.temp = parseFloat(item.obsrValue);
          break;
        case 'REH': // 습도
          weatherData.humidity = parseFloat(item.obsrValue);
          break;
        case 'RN1': // 1시간 강수량
          weatherData.rain = parseFloat(item.obsrValue);
          break;
        case 'WSD': // 풍속
          weatherData.windSpeed = parseFloat(item.obsrValue);
          break;
        case 'VEC': // 풍향
          weatherData.windDirection = parseFloat(item.obsrValue);
          break;
        case 'PTY': // 강수형태
          weatherData.pty = parseInt(item.obsrValue);
          break;
      }
    });
    
    // PTY(강수형태)에 따른 날씨 상태 결정
    let weatherCondition = 'Clear';
    let weatherDescription = '맑음';
    
    switch (weatherData.pty) {
      case 0: // 없음
        weatherCondition = 'Clear';
        weatherDescription = '맑음';
        break;
      case 1: // 비
        weatherCondition = 'Rain';
        weatherDescription = '비';
        break;
      case 2: // 비/눈
        weatherCondition = 'Rain';
        weatherDescription = '비/눈';
        break;
      case 3: // 눈
        weatherCondition = 'Snow';
        weatherDescription = '눈';
        break;
      case 5: // 빗방울
        weatherCondition = 'Drizzle';
        weatherDescription = '빗방울';
        break;
      case 6: // 빗방울눈날림
        weatherCondition = 'Rain';
        weatherDescription = '빗방울눈날림';
        break;
      case 7: // 눈날림
        weatherCondition = 'Snow';
        weatherDescription = '눈날림';
        break;
      default:
        // PTY가 0이고 강수량이 있는 경우 비로 처리
        if (weatherData.rain > 0) {
          weatherCondition = 'Rain';
          weatherDescription = '비';
        }
        break;
    }
    
    const result = {
      success: true,
      data: {
        name: '현재위치',
        main: { 
          temp: weatherData.temp || 20, 
          humidity: weatherData.humidity || 60 
        },
        weather: [{ 
          main: weatherCondition, 
          description: weatherDescription, 
          icon: '10d' 
        }],
        wind: { 
          speed: weatherData.windSpeed || 2.0,
          direction: weatherData.windDirection || 0
        },
        grid: grid,
        baseTime: `${baseDate} ${baseTime} (실시간)`
      }
    };
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('기상청 API 오류:', error);
    
    // 오류 발생 시 더 많은 시간 후보로 재시도
    try {
      const retryHours = [6, 12, 18]; // 6시간 전, 12시간 전, 18시간 전 시도
      
      for (const hoursBack of retryHours) {
        const retryDate = new Date(kstNow.getTime() - (hoursBack * 60 * 60 * 1000));
        const retryBaseDate = retryDate.toISOString().slice(0, 10).replace(/-/g, '');
        const retryBaseTime = retryDate.getHours().toString().padStart(2, '0') + '00';
        
        const retryUrl = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${API_KEY}&numOfRows=10&pageNo=1&dataType=JSON&base_date=${retryBaseDate}&base_time=${retryBaseTime}&nx=${grid.x}&ny=${grid.y}`;
        
        console.log(`${hoursBack}시간 전 데이터로 재시도: ${retryBaseDate} ${retryBaseTime}`);
        
        const retryResponse = await fetch(retryUrl);
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          if (retryData.response.header.resultCode === '00') {
            console.log('재시도 성공!');
            // 성공한 경우 원래 로직으로 처리
            const items = retryData.response.body.items.item;
            const weatherData = {
              temp: null,
              humidity: null,
              rain: 0,
              windSpeed: null,
              pty: 0 // 강수형태 추가
            };
            
            items.forEach(item => {
              switch (item.category) {
                case 'T1H': weatherData.temp = parseFloat(item.obsrValue); break;
                case 'REH': weatherData.humidity = parseFloat(item.obsrValue); break;
                case 'RN1': weatherData.rain = parseFloat(item.obsrValue); break;
                case 'WSD': weatherData.windSpeed = parseFloat(item.obsrValue); break;
                case 'PTY': weatherData.pty = parseInt(item.obsrValue); break;
              }
            });
            
            // PTY(강수형태)에 따른 날씨 상태 결정
            let weatherCondition = 'Clear';
            let weatherDescription = '맑음';
            
            switch (weatherData.pty) {
              case 0: // 없음
                weatherCondition = 'Clear';
                weatherDescription = '맑음';
                break;
              case 1: // 비
                weatherCondition = 'Rain';
                weatherDescription = '비';
                break;
              case 2: // 비/눈
                weatherCondition = 'Rain';
                weatherDescription = '비/눈';
                break;
              case 3: // 눈
                weatherCondition = 'Snow';
                weatherDescription = '눈';
                break;
              case 5: // 빗방울
                weatherCondition = 'Drizzle';
                weatherDescription = '빗방울';
                break;
              case 6: // 빗방울눈날림
                weatherCondition = 'Rain';
                weatherDescription = '빗방울눈날림';
                break;
              case 7: // 눈날림
                weatherCondition = 'Snow';
                weatherDescription = '눈날림';
                break;
              default:
                // PTY가 0이고 강수량이 있는 경우 비로 처리
                if (weatherData.rain > 0) {
                  weatherCondition = 'Rain';
                  weatherDescription = '비';
                }
                break;
            }
            
            return NextResponse.json({
              success: true,
              data: {
                name: '현재위치',
                main: { 
                  temp: weatherData.temp || 20, 
                  humidity: weatherData.humidity || 60 
                },
                weather: [{ 
                  main: weatherCondition, 
                  description: weatherDescription, 
                  icon: '10d' 
                }],
                wind: { 
                  speed: weatherData.windSpeed || 2.0,
                  direction: 0
                },
                grid: grid,
                baseTime: `${retryBaseDate} ${retryBaseTime} (${hoursBack}시간 전)`
              }
            });
          }
        }
      }
    } catch (retryError) {
      console.error('재시도도 실패:', retryError);
    }
    
    // 모든 시도 실패 시 기본값 반환
    return NextResponse.json({
      success: false,
      error: error.message,
      data: {
        name: '유성구',
        main: { temp: 23, humidity: 65 },
        weather: [{ main: 'Rain', description: '비', icon: '10d' }],
        wind: { speed: 2.1 }
      }
    });
  }
} 