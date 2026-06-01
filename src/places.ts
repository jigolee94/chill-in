export type ChillingPlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  exitRadiusMeters: number;
};

// TODO: 실제 칠링 지점 좌표로 바꿔주세요.
// Google Maps / Kakao Map에서 지점 클릭 후 위도, 경도를 복사하면 됩니다.
export const CHILLING_PLACES: ChillingPlace[] = [
  {
    id: 'seongsu',
    name: '칠링 성수점',
    latitude: 37.5446,
    longitude: 127.0558,
    radiusMeters: 70,
    exitRadiusMeters: 110
  },
  {
    id: 'apgujeong',
    name: '칠링 압구정점',
    latitude: 37.5271,
    longitude: 127.0286,
    radiusMeters: 70,
    exitRadiusMeters: 110
  }
];
