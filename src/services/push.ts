import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isFirebaseConfigured, saveMemberPushTokenToFirestore } from './firebase';

function getExpoProjectId(): string | null {
  return Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId || null;
}

export async function registerForRemotePushNotifications(userId: string): Promise<string | null> {
  if (!isFirebaseConfigured) return null;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('arrivals', {
      name: '도착 알림',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ffffff'
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  const finalPermission = currentPermission.granted
    ? currentPermission
    : await Notifications.requestPermissionsAsync();

  if (!finalPermission.granted) return null;

  const projectId = getExpoProjectId();
  if (!projectId) {
    console.warn('Expo projectId가 없어 원격 푸시 토큰을 만들 수 없습니다. EAS projectId를 app.json에 추가하세요.');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await saveMemberPushTokenToFirestore(userId, token, Platform.OS);
  return token;
}
