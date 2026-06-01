export type Place = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  exitRadiusMeters: number;
};

const EXIT_RADIUS_BUFFER_METERS = 40;

function withExitRadius(place: Omit<Place, 'exitRadiusMeters'>): Place {
  return {
    ...place,
    exitRadiusMeters: place.radiusMeters + EXIT_RADIUS_BUFFER_METERS
  };
}

export const places: Place[] = [
  withExitRadius({
    id: 'hannam',
    name: '칠링 한남',
    address: '서울특별시 용산구 이태원로54가길 14, 1층',
    latitude: 37.541239,
    longitude: 126.992416,
    radiusMeters: 100
  }),
  withExitRadius({
    id: 'yeonnam',
    name: '칠링 연남',
    address: '서울특별시 마포구 동교로46길 42-5, 신박사빌딩 3층 루프탑',
    latitude: 37.561886,
    longitude: 126.926738,
    radiusMeters: 100
  }),
  withExitRadius({
    id: 'magok',
    name: '칠링 마곡',
    address: '서울특별시 강서구 마곡중앙6로 70, 매그넘797 건물 313호',
    latitude: 37.559916,
    longitude: 126.834361,
    radiusMeters: 100
  }),
  withExitRadius({
    id: 'sinsa',
    name: '칠링 신사',
    address: '서울특별시 강남구 신사동 509-5, 101호',
    latitude: 37.520397,
    longitude: 127.022267,
    radiusMeters: 100
  }),
  withExitRadius({
    id: 'bangbae',
    name: '칠링 방배',
    address: '서울특별시 서초구 방배로13길 28, 2층 5호',
    latitude: 37.4816,
    longitude: 126.99796,
    radiusMeters: 100
  }),
  withExitRadius({
    id: 'seongsu',
    name: '칠링 성수',
    address: '서울특별시 성동구 왕십리로14길 19-2, 2층',
    latitude: 37.540382,
    longitude: 127.06262,
    radiusMeters: 100
  }),
  withExitRadius({
    id: 'euljiro',
    name: '칠링 을지로',
    address: '서울특별시 중구 충무로9길 12, 402호',
    latitude: 37.567029,
    longitude: 126.991812,
    radiusMeters: 100
  }),
  withExitRadius({
    id: 'apgujeong',
    name: '칠링 압구정로데오',
    address: '서울특별시 강남구 도산대로49길 41, 3층',
    latitude: 37.525708,
    longitude: 127.036902,
    radiusMeters: 100
  }),
  withExitRadius({
    id: 'unni',
    name: '칠링 운니',
    address: '서울특별시 종로구 삼일대로32길 45, 2층 좌측 A호',
    latitude: 37.575655,
    longitude: 126.989495,
    radiusMeters: 100
  }),
  withExitRadius({
    id: 'jamsil',
    name: '칠링 잠실',
    address: '서울특별시 송파구 오금로11길 29, 2층 201호',
    latitude: 37.515455,
    longitude: 127.10997,
    radiusMeters: 100
  }),
  withExitRadius({
    id: 'yeouido',
    name: '칠링 여의도',
    address: '서울특별시 영등포구 여의대방로65길 20, 지하 2층 B201호',
    latitude: 37.520184,
    longitude: 126.929448,
    radiusMeters: 100
  })
];

export const CHILLING_PLACES = places;
