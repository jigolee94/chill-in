import AsyncStorage from '@react-native-async-storage/async-storage';

export type MemberStatus = {
  userId: string;
  nickname: string;
  placeId: string | null;
  placeName: string | null;
  status: 'away' | 'arrived';
  arrivedAt: string | null;
  leftAt: string | null;
  lastUpdatedAt: string;
};

const STATUS_KEY = 'chilling.memberStatus';
const NICKNAME_KEY = 'chilling.nickname';
const SHARE_KEY = 'chilling.locationSharing';

export async function getNickname(): Promise<string> {
  return (await AsyncStorage.getItem(NICKNAME_KEY)) || '지고';
}

export async function setNickname(nickname: string) {
  await AsyncStorage.setItem(NICKNAME_KEY, nickname.trim() || '지고');
}

export async function isLocationSharingOn(): Promise<boolean> {
  const value = await AsyncStorage.getItem(SHARE_KEY);
  return value === null ? true : value === 'true';
}

export async function setLocationSharingOn(on: boolean) {
  await AsyncStorage.setItem(SHARE_KEY, String(on));
}

export async function getLocalStatus(): Promise<MemberStatus | null> {
  const raw = await AsyncStorage.getItem(STATUS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveLocalStatus(status: MemberStatus) {
  await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(status));
}
