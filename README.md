# Chill in' App MVP

Chill in' 핵심 멤버가 칠링 지점 근처에 도착했는지만 공유하는 Expo React Native 앱입니다.
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

Firebase 프로젝트 값이 비어 있으면 기존 로컬 저장 목업으로 동작합니다.

```ts
const USE_FIREBASE = isFirebaseConfigured;
```

Firebase 연결 준비 파일은 만들어져 있지만, 실제 프로젝트 값은 비워두었습니다. 실제 API key나 secret은 저장소에 커밋하지 마세요.

Firebase를 나중에 연결하려면:

1. Firebase 콘솔에서 프로젝트 생성
2. 웹앱 추가
3. Firestore Database 생성
4. `.env.example`을 `.env`로 복사
5. `.env`에 Firebase 웹앱 config 값 입력
6. Vercel에도 같은 `EXPO_PUBLIC_FIREBASE_*` 환경변수 추가
7. Firebase Authentication에서 Anonymous 로그인을 활성화
8. 실제 기기에서 위치 권한, 알림 권한, 도착/퇴장 저장 흐름 재검증

현재 Firebase 초기화 구조:

```text
.env.example
src/services/firebase.ts
```

`src/services/firebase.ts`는 모든 `EXPO_PUBLIC_FIREBASE_*` 값이 채워진 경우에만 Firebase를 초기화합니다. 값이 비어 있으면 `db`와 `auth`는 `null`이고, 앱은 기존 로컬 저장 목업을 계속 사용합니다.

### 로그인 방식

초기 친구 테스트는 Firebase Anonymous Auth + 닉네임 입력을 사용합니다.

- 친구가 링크 접속
- Firebase가 익명 uid 생성
- 사용자가 닉네임 저장
- `members/{uid}`에 닉네임과 마지막 접속 기록 저장
- 도착/퇴장 시 같은 uid로 `members`, `arrivals` 업데이트

추천 운영 방향:

- MVP 친구 테스트: 익명 로그인 + 닉네임
- 누가 누구인지 더 확실히 알아야 할 때: 전화번호 로그인
- 칠링 멤버 커뮤니티와 자연스럽게 붙일 때: 카카오 로그인 검토
- iOS 앱 배포까지 갈 때: Apple 로그인 추가 검토

### Firestore 데이터 구조 제안

정확한 실시간 좌표를 저장하지 않고, 지점 근처 도착/퇴장 상태만 저장하는 방향입니다.

#### `members/{memberId}`

핵심 멤버의 현재 상태를 빠르게 읽기 위한 문서입니다.

```json
{
  "userId": "member_001",
  "nickname": "지고",
  "currentPlaceId": "seongsu",
  "currentPlaceName": "칠링 성수점",
  "status": "arrived",
  "loginProvider": "anonymous",
  "lastSeenAt": "Firestore serverTimestamp",
  "arrivedAt": "2026-05-29T...",
  "leftAt": null,
  "lastUpdatedAt": "2026-05-29T...",
  "serverUpdatedAt": "Firestore serverTimestamp"
}
```

#### `places/{placeId}`

칠링 지점별 도착/퇴장 판정 기준을 관리하는 문서입니다.

```json
{
  "placeId": "seongsu",
  "name": "칠링 성수점",
  "latitude": 37.5446,
  "longitude": 127.0558,
  "radiusMeters": 70,
  "exitRadiusMeters": 110,
  "isActive": true,
  "updatedAt": "Firestore serverTimestamp"
}
```

#### `arrivals/{arrivalId}`

도착/퇴장 이벤트 히스토리를 남기기 위한 문서입니다. 실시간 이동 경로나 연속 좌표는 저장하지 않습니다.

```json
{
  "arrivalId": "member_001_2026-05-29T...",
  "userId": "member_001",
  "nickname": "지고",
  "placeId": "seongsu",
  "placeName": "칠링 성수점",
  "status": "arrived",
  "arrivedAt": "2026-05-29T...",
  "leftAt": null,
  "createdAt": "2026-05-29T...",
  "serverCreatedAt": "Firestore serverTimestamp"
}
```

TODO:

- Firebase 프로젝트 생성 후 `.env`와 Vercel 환경변수에 실제 config 입력
- Firebase Authentication에서 Anonymous 로그인 활성화
- 친구 테스트 이후 전화번호/카카오 로그인 중 하나로 전환 검토
- `places` 컬렉션에서 지점 목록을 읽도록 `src/places.ts` 대체
- Firestore 보안 규칙에서 승인된 멤버만 읽고 쓸 수 있게 제한
- 도착 기록 자동 삭제 정책 또는 보관 기간 설정

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
