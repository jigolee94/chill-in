import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { CHILLING_PLACES } from './src/places';
import { distanceMeters } from './src/geo';
import { isFirebaseConfigured, saveMemberStatusToFirestore } from './src/services/firebase';
import {
  getLocalStatus,
  getNickname,
  isLocationSharingOn,
  MemberStatus,
  saveLocalStatus,
  setLocationSharingOn,
  setNickname
} from './src/storage';

const USE_FIREBASE = false; // TODO: Firebase 값 준비 후 true로 바꾸고 실제 기기에서 권한 흐름을 재검증하세요.
const USER_ID = 'local-user-001'; // 실제 서비스에서는 로그인 uid로 교체.
const ARRIVAL_STAY_SECONDS = 90;
const EXIT_STAY_SECONDS = 600;

type NearbyState = {
  placeId: string | null;
  enteredAtMs: number | null;
  exitedAtMs: number | null;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export default function App() {
  const [nickname, setNicknameState] = useState('지고');
  const [sharingOn, setSharingOn] = useState(true);
  const [status, setStatus] = useState<MemberStatus | null>(null);
  const [permissionText, setPermissionText] = useState('권한 확인 전');
  const [currentDistanceText, setCurrentDistanceText] = useState('아직 위치 확인 전');
  const [watching, setWatching] = useState(false);
  const [nearby, setNearby] = useState<NearbyState>({ placeId: null, enteredAtMs: null, exitedAtMs: null });

  const currentPlace = useMemo(() => {
    if (!status?.placeId) return null;
    return CHILLING_PLACES.find((p) => p.id === status.placeId) || null;
  }, [status]);

  useEffect(() => {
    (async () => {
      setNicknameState(await getNickname());
      setSharingOn(await isLocationSharingOn());
      const savedStatus = await getLocalStatus();
      if (savedStatus) setStatus(savedStatus);
      await Notifications.requestPermissionsAsync();
    })();
  }, []);

  const publishStatus = useCallback(async (next: MemberStatus) => {
    setStatus(next);
    await saveLocalStatus(next);

    if (USE_FIREBASE && isFirebaseConfigured) {
      await saveMemberStatusToFirestore(next);
    }
  }, []);

  const sendLocalNotification = async (title: string, body: string) => {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null
    });
  };

  const markArrived = useCallback(
    async (placeId: string, placeName: string) => {
      if (status?.status === 'arrived' && status.placeId === placeId) return;
      const now = new Date().toISOString();
      const next: MemberStatus = {
        userId: USER_ID,
        nickname,
        placeId,
        placeName,
        status: 'arrived',
        arrivedAt: now,
        leftAt: null,
        lastUpdatedAt: now
      };
      await publishStatus(next);
      await sendLocalNotification('칠링 도착', `${nickname}님이 ${placeName} 근처에 도착했어요.`);
    },
    [nickname, publishStatus, status]
  );

  const markAway = useCallback(
    async () => {
      if (status?.status !== 'arrived') return;
      const now = new Date().toISOString();
      const next: MemberStatus = {
        userId: USER_ID,
        nickname,
        placeId: null,
        placeName: null,
        status: 'away',
        arrivedAt: status.arrivedAt,
        leftAt: now,
        lastUpdatedAt: now
      };
      await publishStatus(next);
      await sendLocalNotification('칠링 퇴장', `${nickname}님이 칠링 지점 근처를 벗어났어요.`);
    },
    [nickname, publishStatus, status]
  );

  const evaluateLocation = useCallback(
    async (coords: { latitude: number; longitude: number }) => {
      const distances = CHILLING_PLACES.map((place) => ({
        place,
        distance: distanceMeters(coords, place)
      })).sort((a, b) => a.distance - b.distance);

      const nearest = distances[0];
      setCurrentDistanceText(`${nearest.place.name}까지 약 ${Math.round(nearest.distance)}m`);

      const nowMs = Date.now();
      const inside = distances.find(({ place, distance }) => distance <= place.radiusMeters);

      if (inside) {
        setNearby((prev) => {
          if (prev.placeId !== inside.place.id) {
            return { placeId: inside.place.id, enteredAtMs: nowMs, exitedAtMs: null };
          }
          return { ...prev, exitedAtMs: null };
        });

        const enteredAtMs = nearby.placeId === inside.place.id ? nearby.enteredAtMs : nowMs;
        const stayedSeconds = enteredAtMs ? (nowMs - enteredAtMs) / 1000 : 0;
        if (stayedSeconds >= ARRIVAL_STAY_SECONDS) {
          await markArrived(inside.place.id, inside.place.name);
        }
        return;
      }

      const activePlace = status?.placeId ? CHILLING_PLACES.find((p) => p.id === status.placeId) : null;
      if (status?.status === 'arrived' && activePlace) {
        const distanceFromActive = distanceMeters(coords, activePlace);
        if (distanceFromActive >= activePlace.exitRadiusMeters) {
          setNearby((prev) => ({
            ...prev,
            exitedAtMs: prev.exitedAtMs || nowMs
          }));
          const exitedAtMs = nearby.exitedAtMs || nowMs;
          const outsideSeconds = (nowMs - exitedAtMs) / 1000;
          if (outsideSeconds >= EXIT_STAY_SECONDS) await markAway();
        }
      } else {
        setNearby({ placeId: null, enteredAtMs: null, exitedAtMs: null });
      }
    },
    [markArrived, markAway, nearby, status]
  );

  const startLocation = useCallback(async () => {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') {
      setPermissionText('위치 권한 거부됨');
      Alert.alert('위치 권한 필요', '칠링 도착 체크인을 위해 위치 권한이 필요해요.');
      return;
    }

    const background = await Location.requestBackgroundPermissionsAsync();
    setPermissionText(background.status === 'granted' ? '항상 허용됨' : '앱 사용 중만 허용됨');

    setWatching(true);
    await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000,
        distanceInterval: 25
      },
      (location) => {
        if (!sharingOn) return;
        evaluateLocation(location.coords).catch(console.error);
      }
    );
  }, [evaluateLocation, sharingOn]);

  const saveName = async () => {
    await setNickname(nickname);
    Alert.alert('저장 완료', '닉네임이 저장됐어요.');
  };

  const toggleSharing = async (value: boolean) => {
    setSharingOn(value);
    await setLocationSharingOn(value);
    if (!value) await markAway();
  };

  const manualCheck = async () => {
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await evaluateLocation(location.coords);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>CHILLING</Text>
          <Text style={styles.title}>Crew Check-in</Text>
          <Text style={styles.subtitle}>지점 근처 도착 여부만 공유하는 핵심 멤버용 앱</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>내 상태</Text>
          <Text style={styles.bigStatus}>{status?.status === 'arrived' ? '도착함' : '아직 도착 전'}</Text>
          <Text style={styles.muted}>{currentPlace ? currentPlace.name : currentDistanceText}</Text>
          <Text style={styles.mutedSmall}>
            마지막 업데이트: {status?.lastUpdatedAt ? new Date(status.lastUpdatedAt).toLocaleString() : '없음'}
          </Text>
        </View>

        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>위치 공유</Text>
          <Switch value={sharingOn} onValueChange={toggleSharing} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>닉네임</Text>
          <TextInput value={nickname} onChangeText={setNicknameState} placeholder="닉네임" placeholderTextColor="#777" style={styles.input} />
          <Pressable style={styles.secondaryButton} onPress={saveName}>
            <Text style={styles.lightButtonText}>닉네임 저장</Text>
          </Pressable>
        </View>

        <View style={styles.buttonGroup}>
          <Pressable style={styles.primaryButton} onPress={startLocation}>
            <Text style={styles.buttonText}>{watching ? '위치 감지 실행 중' : '위치 감지 시작'}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={manualCheck}>
            <Text style={styles.lightButtonText}>지금 위치로 체크</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>등록 지점</Text>
          {CHILLING_PLACES.map((place) => (
            <View key={place.id} style={styles.placeItem}>
              <Text style={styles.placeName}>{place.name}</Text>
              <Text style={styles.mutedSmall}>도착 판정 {place.radiusMeters}m / 퇴장 판정 {place.exitRadiusMeters}m</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>권한 상태</Text>
          <Text style={styles.muted}>{permissionText}</Text>
          <Text style={styles.notice}>
            MVP는 정확한 실시간 위치를 공유하지 않고, 지점 근처 도착/퇴장 상태만 저장하도록 설계되어 있어요.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  content: { padding: 20, gap: 16 },
  header: { paddingTop: 16, paddingBottom: 10 },
  logo: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 4 },
  subtitle: { color: '#aaa', fontSize: 14, marginTop: 8 },
  card: { backgroundColor: '#1d1d1d', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#2c2c2c' },
  cardRow: {
    backgroundColor: '#1d1d1d',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 10 },
  bigStatus: { color: '#fff', fontSize: 34, fontWeight: '900', marginBottom: 8 },
  muted: { color: '#bdbdbd', fontSize: 15 },
  mutedSmall: { color: '#888', fontSize: 12, marginTop: 6 },
  notice: { color: '#aaa', fontSize: 13, lineHeight: 20, marginTop: 8 },
  input: {
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12
  },
  buttonGroup: { gap: 10 },
  primaryButton: { backgroundColor: '#fff', paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  secondaryButton: { backgroundColor: '#333', paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#111', fontSize: 16, fontWeight: '800' },
  lightButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  placeItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2b2b2b' },
  placeName: { color: '#fff', fontSize: 15, fontWeight: '700' }
});
