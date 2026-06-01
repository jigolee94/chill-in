# Chilling Check-in App MVP

칠링 핵심 멤버가 칠링 지점 근처에 도착했는지만 공유하는 Expo React Native 앱입니다.
Zenly처럼 실시간 이동 경로를 계속 보여주는 앱이 아니라, 지점 반경 안에 들어왔을 때만 `도착함` 상태를 공유하도록 설계했습니다.

## 포함 기능

- 핵심 멤버 닉네임 저장
- 위치 공유 ON/OFF
- 칠링 지점 반경 진입 감지
- 도착 상태 저장
- 퇴장 상태 저장
- 로컬 푸시 알림
- Firebase Firestore 연동 자리 포함
- 칠링 성수점 / 압구정점 샘플 좌표 포함

## 도착/퇴장 판정 방식

GPS는 건물 안이나 지하에서 20~100m 정도 튈 수 있어서 내부 로직은 여유 있게 잡았습니다.

- 도착 판정: 지점 중심 기준 70m 안에 90초 이상 머무르면 도착
- 퇴장 판정: 현재 도착 지점 기준 110m 밖에 10분 이상 있으면 퇴장
- 앱 문구는 “50m 근처 도착”처럼 표현해도 되지만, 실제 로직은 조금 여유 있는 값이 안정적입니다.

## 실행 방법

```bash
npm install
npm run start
```

Expo Go로 테스트할 수 있지만, 백그라운드 위치 권한과 실제 배포 테스트는 개발 빌드가 더 안정적입니다.

```bash
npm run android
# 또는
npm run ios
```

## 지점 좌표 바꾸기

`src/places.ts` 파일에서 실제 칠링 지점 좌표로 바꾸면 됩니다.

```ts
export const CHILLING_PLACES = [
  {
    id: 'seongsu',
    name: '칠링 성수점',
    latitude: 37.5446,
    longitude: 127.0558,
    radiusMeters: 70,
    exitRadiusMeters: 110
  }
];
```

Google Maps나 Kakao Map에서 지점을 찍은 뒤 위도/경도를 복사하면 됩니다.

## Firebase 연결 방법

처음에는 `App.tsx`의 아래 값을 그대로 두면 로컬 테스트만 됩니다.

```ts
const USE_FIREBASE = false;
```

Firebase를 연결하려면:

1. Firebase 콘솔에서 프로젝트 생성
2. 웹앱 추가
3. Firestore Database 생성
4. `src/firebase.ts`의 `firebaseConfig` 값 교체
5. `App.tsx`에서 `USE_FIREBASE = true`로 변경

저장되는 컬렉션:

```text
memberStatuses/{userId}
```

예시 데이터:

```json
{
  "userId": "local-user-001",
  "nickname": "지고",
  "placeId": "seongsu",
  "placeName": "칠링 성수점",
  "status": "arrived",
  "arrivedAt": "2026-05-29T...",
  "leftAt": null,
  "lastUpdatedAt": "2026-05-29T..."
}
```

## 다음에 붙이면 좋은 기능

- 카카오 로그인
- 초대코드 가입
- 관리자 전용 지점 추가 화면
- 핵심 멤버 리스트 화면
- 다른 멤버 도착 푸시 알림
- 위치 기록 자동 삭제 정책
- 앱 내 개인정보/위치정보 동의 화면

## 개인정보 설계 방향

이 앱은 정확한 실시간 좌표를 친구에게 보여주지 않고, 칠링 지점 근처에 있는지 여부만 공유하는 구조가 좋습니다.

추천 정책:

- 실시간 이동 경로 공유 금지
- 도착/퇴장 상태만 공유
- 사용자가 언제든 위치 공유 OFF 가능
- 도착 기록은 일정 기간 후 삭제
- 핵심 멤버 승인제로 운영
