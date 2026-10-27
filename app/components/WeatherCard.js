'use client';
import { useState, useEffect } from 'react';
import styles from './WeatherCard.module.css';

export default function WeatherCard() {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // 위도/경도를 상세주소로 변환 (서버 라우트가 카카오 API를 호출한다)
  const getAddressFromCoords = async (lat, lon) => {
    try {
      const response = await fetch(`/api/geocoding?lat=${lat}&lon=${lon}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.address) return data.address;
      }
      return '현재위치';
    } catch (error) {
      console.error('주소 변환 오류:', error);
      return '현재위치';
    }
  };

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);



  // 위치 및 날씨 정보 가져오기
  useEffect(() => {
    const getLocationAndWeather = async () => {
      try {
        // 위치 정보 가져오기
        if (!navigator.geolocation) {
          throw new Error('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
              // 주소 정보 가져오기
              const address = await getAddressFromCoords(latitude, longitude);
              
              // 우리 API route를 통해 기상청 데이터 가져오기
              const weatherResponse = await fetch(
                `/api/weather?lat=${latitude}&lon=${longitude}`
              );
              
              if (!weatherResponse.ok) {
                throw new Error('날씨 API 응답 오류');
              }
              
              const data = await weatherResponse.json();
              
              if (data.success) {
                setWeather(data.data);
                setLocation(address);
                setLoading(false);
              } else {
                throw new Error(data.error || '날씨 데이터 오류');
              }
            } catch (err) {
              console.error('날씨 API 에러:', err);
              // 데모 데이터 사용
              setWeather({
                name: '유성구',
                main: { temp: 23, humidity: 65 },
                weather: [{ main: 'Rain', description: '비', icon: '10d' }],
                wind: { speed: 2.1 }
              });
              setLocation('유성구');
              setLoading(false);
            }
          },
          (error) => {
            console.error('위치 정보 에러:', error);
            setError(error?.code === 1 ? '위치 정보 사용을 허용하면 현재 위치의 날씨가 표시됩니다.' : '위치 정보를 가져오지 못했습니다.');
            setLoading(false);
          },
          { timeout: 15000, maximumAge: 600000 }
        );
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    getLocationAndWeather();
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // 풍향 각도를 방향으로 변환하는 함수
  const getWindDirection = (degree) => {
    if (!degree && degree !== 0) return '-';
    
    const directions = [
      '북', '북북동', '북동', '동북동',
      '동', '동남동', '남동', '남남동',
      '남', '남남서', '남서', '서남서',
      '서', '서북서', '북서', '북북서'
    ];
    
    const index = Math.round(degree / 22.5) % 16;
    return directions[index];
  };

  const getWeatherIcon = (weatherMain) => {
    switch (weatherMain) {
      case 'Clear': return '☀️';
      case 'Clouds': return '☁️';
      case 'Rain': return '🌧️';
      case 'Snow': return '❄️';
      case 'Thunderstorm': return '⛈️';
      case 'Drizzle': return '🌦️';
      case 'Mist':
      case 'Fog': return '🌫️';
      default: return '🌤️';
    }
  };

  let weatherBody;
  if (loading) {
    weatherBody = <div className={styles.status}>날씨 정보를 불러오는 중...</div>;
  } else if (error) {
    weatherBody = <div className={styles.status}>{error}</div>;
  } else {
    weatherBody = (
      <>
        <div className={styles.weatherSection}>
          <span className={styles.weatherIcon}>{getWeatherIcon(weather?.weather?.[0]?.main)}</span>
          <span className={styles.temperature}>{Math.round(weather?.main?.temp)}°</span>
          <span className={styles.weatherDescription}>{weather?.weather?.[0]?.description}</span>
        </div>
        <div className={styles.additionalInfo}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>습도</span>
            <span className={styles.infoValue}>{weather?.main?.humidity}%</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>풍속</span>
            <span className={styles.infoValue}>{weather?.wind?.speed} m/s</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>풍향</span>
            <span className={styles.infoValue}>{getWindDirection(weather?.wind?.direction)}</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={styles.weatherCard}>
      <div className={styles.timeSection}>
        <div className={styles.time}>{formatTime(currentTime)}</div>
        <div className={styles.dateRow}>
          <span>{formatDate(currentTime)}</span>
          {location && <span className={styles.location}>📍 {location}</span>}
        </div>
      </div>
      {weatherBody}
    </div>
  );
}
